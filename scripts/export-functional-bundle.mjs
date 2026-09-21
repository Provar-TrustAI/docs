#!/usr/bin/env node
// FUN-4922 — export the Functional docs bundle for the FT API.
//
// Walks functional/**/*.mdx, strips Mintlify JSX components down to plain
// markdown, and writes one .md per page plus an index.json + BUNDLE.json
// manifest to dist/functional-bundle/. The FT repo's
// scripts/vendor-docs-bundle.sh fetches this output (via the
// `functional-bundle` CI artifact, or by running this script locally
// against a pinned docs commit) and vendors it into the FT API image so the
// `functional_guide` / `functional_docs_search` MCP tools can serve it.
//
// No dependencies beyond Node's own stdlib — frontmatter is a flat
// key: "value" shape in every functional/ page today, so a hand-rolled
// parser is enough; see parseFrontmatter() below.

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const REPO_ROOT = path.resolve(__dirname, "..");
export const FUNCTIONAL_DIR = path.join(REPO_ROOT, "functional");
export const OUT_DIR = path.join(REPO_ROOT, "dist", "functional-bundle");

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

/** Recursively list every *.mdx file under `dir`, sorted for determinism. */
export function walkMdxFiles(dir) {
  const entries = readdirSync(dir, { recursive: true, withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".mdx")) {
      // node's recursive readdirSync reports `entry.path`/`entry.parentPath`
      // depending on version; fall back between the two for portability.
      const parent = entry.parentPath ?? entry.path;
      files.push(path.join(parent, entry.name));
    }
  }
  files.sort();
  return files;
}

// ---------------------------------------------------------------------------
// Frontmatter
// ---------------------------------------------------------------------------

/**
 * Split a raw .mdx file into its frontmatter block (kept byte-for-byte, for
 * pass-through into the bundle) and a parsed key/value map, plus the body
 * that follows.
 *
 * Every functional/ page's frontmatter today is a flat set of
 * `key: "quoted string"` (or occasionally bare) lines — no lists, no nested
 * maps — so this intentionally does not pull in a full YAML parser.
 */
export function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return { frontmatterText: "", data: {}, body: raw };
  }
  const [full, block] = match;
  const data = {};
  for (const line of block.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    const [, key, rawValue] = kv;
    let value = rawValue.trim();
    if (value.startsWith('"')) {
      try {
        value = JSON.parse(value);
      } catch {
        // Leave as the raw (still-quoted) string if it isn't valid JSON —
        // better to surface an odd value than to throw on a whole page.
      }
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  }
  return {
    frontmatterText: full.replace(/\r?\n?$/, "\n"),
    data,
    body: raw.slice(full.length),
  };
}

// ---------------------------------------------------------------------------
// Fenced code protection
// ---------------------------------------------------------------------------

// Anchored to line-start so a fence nested inside a JSX component's indented
// children (e.g. inside <Tab>) is captured together with that indentation —
// dedentFenceBlock() below then strips it uniformly, including the closing
// fence line, rather than leaving a partially-indented block behind.
const CODE_FENCE_RE = /^[ \t]*```[\s\S]*?^[ \t]*```/gm;

function dedentFenceBlock(block) {
  const lines = block.split("\n");
  let minIndent = Infinity;
  for (const line of lines) {
    if (!line.trim()) continue;
    minIndent = Math.min(minIndent, line.match(/^[ \t]*/)[0].length);
  }
  if (!Number.isFinite(minIndent) || minIndent === 0) return block;
  return lines.map((l) => l.slice(minIndent)).join("\n");
}

function protectCodeFences(text) {
  const blocks = [];
  const protectedText = text.replace(CODE_FENCE_RE, (block) => {
    const token = `\u0000CODEBLOCK${blocks.length}\u0000`;
    blocks.push(dedentFenceBlock(block));
    return token;
  });
  return { protectedText, blocks };
}

function restoreCodeFences(text, blocks) {
  return text.replace(/\u0000CODEBLOCK(\d+)\u0000/g, (_, i) => blocks[Number(i)]);
}

// ---------------------------------------------------------------------------
// JSX component stripping
// ---------------------------------------------------------------------------

// Only these tag names are treated as JSX components to parse/transform.
// Anything else (including stray "<placeholder>" angle-bracket prose that
// isn't a real component and has no matching close tag) is left as literal
// text, which keeps the tree-builder from ever hunting for a close tag that
// doesn't exist.
const KNOWN_COMPONENTS = new Set([
  "Note",
  "Warning",
  "Tip",
  "Info",
  "Tabs",
  "Tab",
  "Card",
  "CardGroup",
  "Accordion",
  "AccordionGroup",
  // Recognized so a future functional/ page that uses them still gets a
  // sane (if generic) conversion instead of leaking raw JSX — see the
  // passthrough branch in renderNode() and the "findings" it reports.
  "Frame",
  "Steps",
  "Step",
  "CodeGroup",
  "Expandable",
  "Columns",
  "Column",
]);

const TAG_RE = /<(\/?)([A-Za-z][A-Za-z0-9]*)((?:\s+[^<>]*?)?)\s*(\/?)>/g;

function parseAttrs(attrString) {
  const attrs = {};
  const attrRe = /([a-zA-Z:_][\w:-]*)(?:=(?:"([^"]*)"|'([^']*)'|\{([^}]*)\}))?/g;
  let m;
  while ((m = attrRe.exec(attrString))) {
    const [, name, dq, sq, expr] = m;
    attrs[name] = dq ?? sq ?? expr ?? true;
  }
  return attrs;
}

/**
 * Parse `text` (with fenced code already protected) into a tree of
 * { tag, attrs, children } element nodes interleaved with raw text strings,
 * rooted at a synthetic "root" node. Only tags in KNOWN_COMPONENTS are
 * treated as structural; everything else is left as text.
 */
function parseJsxTree(text) {
  const root = { tag: "root", attrs: {}, children: [] };
  const stack = [root];
  let lastIndex = 0;
  let m;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(text))) {
    const [full, closingSlash, tagName, attrString, selfClosingSlash] = m;
    const textBefore = text.slice(lastIndex, m.index);
    lastIndex = m.index + full.length;

    if (!KNOWN_COMPONENTS.has(tagName)) {
      // Not a component we track — keep the raw tag text as literal prose,
      // merged with the text that preceded it.
      stack[stack.length - 1].children.push(textBefore + full);
      continue;
    }

    if (textBefore) stack[stack.length - 1].children.push(textBefore);

    if (closingSlash) {
      // Close tag — pop back to (and including) the matching open tag if
      // one is on the stack; otherwise ignore the stray close.
      const idx = stack.map((n) => n.tag).lastIndexOf(tagName);
      if (idx > 0) stack.length = idx;
      continue;
    }

    const node = { tag: tagName, attrs: parseAttrs(attrString), children: [] };
    stack[stack.length - 1].children.push(node);
    if (!selfClosingSlash) stack.push(node);
  }
  const tail = text.slice(lastIndex);
  if (tail) stack[stack.length - 1].children.push(tail);
  return root;
}

const LABELS = { Note: "Note", Warning: "Warning", Tip: "Tip", Info: "Info" };

/** Components explicitly speced by FUN-4922; anything else in
 * KNOWN_COMPONENTS falls through to the generic passthrough below and is
 * recorded in `findings` for the build report. */
const SPECED_COMPONENTS = new Set([
  "Note",
  "Warning",
  "Tip",
  "Info",
  "Tabs",
  "Tab",
  "Card",
  "CardGroup",
  // Not named in the FUN-4922 spec, but two of the six shipped pages
  // (common-pitfalls, why-needs-review) use AccordionGroup/Accordion — see
  // README "Findings" note. Treated like Tabs/Tab: wrapper dropped, each
  // item's content kept under a bold title.
  "Accordion",
  "AccordionGroup",
]);

export const findings = new Set();

function renderChildren(children) {
  return children.map(renderNode).join("");
}

/** Mintlify source indents a JSX component's children for readability
 * (e.g. everything inside `<Accordion>...</Accordion>`). Strip that common
 * leading whitespace so it doesn't turn into an accidental markdown code
 * block once the wrapper tags are dropped. */
function dedent(text) {
  const lines = text.split("\n");
  let minIndent = Infinity;
  for (const line of lines) {
    if (!line.trim()) continue;
    minIndent = Math.min(minIndent, line.match(/^[ \t]*/)[0].length);
  }
  if (!Number.isFinite(minIndent) || minIndent === 0) return text;
  return lines.map((l) => l.slice(minIndent)).join("\n");
}

function blockquote(label, inner) {
  const body = inner.trim();
  const withLabel = body ? `**${label}:** ${body}` : `**${label}:**`;
  return (
    withLabel
      .split("\n")
      .map((line) => (line.length ? `> ${line}` : ">"))
      .join("\n") + "\n"
  );
}

function renderNode(node) {
  if (typeof node === "string") return node;
  const inner = dedent(renderChildren(node.children));

  switch (node.tag) {
    case "Note":
    case "Warning":
    case "Tip":
    case "Info":
      return "\n" + blockquote(LABELS[node.tag], inner) + "\n";
    case "Tabs":
    case "AccordionGroup":
      return inner;
    case "Tab":
    case "Accordion": {
      const title = node.attrs.title || "";
      return `\n**${title}**\n\n${inner.trim()}\n`;
    }
    case "CardGroup":
      return inner;
    case "Card": {
      const title = node.attrs.title || "";
      const href = node.attrs.href;
      const body = inner.trim().replace(/\s*\n\s*/g, " ");
      const link = href ? `[${title}](${href})` : title;
      return `\n- ${link}${body ? `: ${body}` : ""}`;
    }
    default:
      // Any other whitelisted-but-not-speced component: drop the tags,
      // keep the content, and flag it so the export report can call it out.
      if (!SPECED_COMPONENTS.has(node.tag)) findings.add(node.tag);
      return inner;
  }
}

/** Strip a page's leading `import ... from "...";` lines (Mintlify snippet
 * imports — meaningless outside the MDX build). */
export function stripImports(body) {
  return body.replace(/^import\s+.*?;\s*$/gm, "");
}

/** Convert one page's MDX body (post-frontmatter) to plain markdown. */
export function convertBody(rawBody) {
  const withoutImports = stripImports(rawBody);
  const { protectedText, blocks } = protectCodeFences(withoutImports);
  const tree = parseJsxTree(protectedText);
  const rendered = renderChildren(tree.children);
  const restored = restoreCodeFences(rendered, blocks);
  return restored
    .replace(/[ \t]+$/gm, "") // trailing whitespace per line
    .replace(/\n{3,}/g, "\n\n") // collapse runaway blank lines
    .trim();
}

// ---------------------------------------------------------------------------
// Self-check
// ---------------------------------------------------------------------------

/** Every page under functional/ must have a unique agent_topic and a
 * non-empty read_when. Returns a list of error strings (empty = clean). */
export function selfCheck(entries) {
  const errors = [];
  const byTopic = new Map();
  for (const entry of entries) {
    if (!entry.agent_topic) {
      errors.push(`${entry.source_path}: missing agent_topic in frontmatter`);
      continue;
    }
    if (!byTopic.has(entry.agent_topic)) byTopic.set(entry.agent_topic, []);
    byTopic.get(entry.agent_topic).push(entry.source_path);

    if (!entry.read_when || !String(entry.read_when).trim()) {
      errors.push(`${entry.source_path}: empty or missing read_when in frontmatter`);
    }
  }
  for (const [topic, sources] of byTopic) {
    if (sources.length > 1) {
      errors.push(`agent_topic "${topic}" is not unique — used by: ${sources.join(", ")}`);
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Bundle build
// ---------------------------------------------------------------------------

function docsCommit() {
  try {
    return execSync("git rev-parse HEAD", { cwd: REPO_ROOT }).toString().trim();
  } catch {
    return "unknown";
  }
}

export function buildEntry(filePath) {
  const raw = readFileSync(filePath, "utf8");
  const { frontmatterText, data, body } = parseFrontmatter(raw);
  const markdownBody = convertBody(body);
  const sourcePath = path.relative(REPO_ROOT, filePath).split(path.sep).join("/");
  const agentTopic = data.agent_topic;
  const outFile = agentTopic ? `${agentTopic}.md` : `${path.basename(filePath, ".mdx")}.md`;
  const content = `${frontmatterText}\n${markdownBody}\n`;
  return {
    entry: {
      agent_topic: agentTopic ?? null,
      title: data.title ?? null,
      description: data.description ?? null,
      read_when: data.read_when ?? null,
      path: outFile,
      source_path: sourcePath,
    },
    outFile,
    content,
  };
}

export function run() {
  const files = walkMdxFiles(FUNCTIONAL_DIR);
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const entries = [];
  for (const filePath of files) {
    const { entry, outFile, content } = buildEntry(filePath);
    writeFileSync(path.join(OUT_DIR, outFile), content, "utf8");
    entries.push(entry);
  }

  entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  writeFileSync(path.join(OUT_DIR, "index.json"), JSON.stringify(entries, null, 2) + "\n", "utf8");

  const bundleMeta = {
    docs_commit: docsCommit(),
    generated_at: new Date().toISOString(),
    page_count: entries.length,
  };
  writeFileSync(path.join(OUT_DIR, "BUNDLE.json"), JSON.stringify(bundleMeta, null, 2) + "\n", "utf8");

  const errors = selfCheck(entries);

  console.log(`Exported ${entries.length} page(s) to ${path.relative(REPO_ROOT, OUT_DIR)}/`);
  console.log(`docs_commit: ${bundleMeta.docs_commit}`);
  if (findings.size > 0) {
    console.warn(
      `Generic-passthrough components used (in KNOWN_COMPONENTS but not the FUN-4922 spec list): ${[...findings].join(", ")}`,
    );
  }
  if (errors.length > 0) {
    console.error("\nSelf-check FAILED:");
    for (const e of errors) console.error(`  - ${e}`);
    process.exitCode = 1;
  } else {
    console.log("Self-check passed: every functional/ page has a unique agent_topic and a non-empty read_when.");
  }

  return { entries, bundleMeta, errors };
}

const isMain = (() => {
  try {
    return import.meta.url === pathToFileURL(process.argv[1]).href;
  } catch {
    return false;
  }
})();

if (isMain) {
  run();
}
