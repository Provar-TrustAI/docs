// Unit tests for scripts/export-functional-bundle.mjs — run with:
//   node --test scripts/export-functional-bundle.test.mjs
// (also wired up as `pnpm test:functional-bundle`). Node's built-in test
// runner only — no new dependency to exercise a hand-rolled converter.

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseFrontmatter,
  convertBody,
  stripImports,
  selfCheck,
  walkMdxFiles,
  FUNCTIONAL_DIR,
} from "./export-functional-bundle.mjs";

test("parseFrontmatter extracts a flat key/value map and keeps the raw block", () => {
  const raw = `---
title: "Hello \\"World\\""
agent_topic: "hello"
read_when: "Always."
---

Body text.
`;
  const { frontmatterText, data, body } = parseFrontmatter(raw);
  assert.equal(data.title, 'Hello "World"');
  assert.equal(data.agent_topic, "hello");
  assert.equal(data.read_when, "Always.");
  assert.match(frontmatterText, /^---\n/);
  assert.match(frontmatterText, /\n---\n$/);
  assert.equal(body.trim(), "Body text.");
});

test("parseFrontmatter handles a page with no frontmatter block", () => {
  const { frontmatterText, data, body } = parseFrontmatter("Just body text.\n");
  assert.equal(frontmatterText, "");
  assert.deepEqual(data, {});
  assert.equal(body, "Just body text.\n");
});

test("stripImports removes snippet import lines and leaves prose alone", () => {
  const body = `import { DeprecatedNotice } from "/snippets/deprecated-notice.mdx";

Some text that mentions import elsewhere is untouched.
`;
  const out = stripImports(body);
  assert.doesNotMatch(out, /^import /m);
  assert.match(out, /mentions import elsewhere/);
});

test("convertBody turns Note/Warning/Tip/Info into a bold-labeled blockquote", () => {
  for (const tag of ["Note", "Warning", "Tip", "Info"]) {
    const out = convertBody(`<${tag}>\n  Some guidance.\n</${tag}>\n`);
    assert.match(out, new RegExp(`^> \\*\\*${tag}:\\*\\* Some guidance\\.$`, "m"));
    assert.doesNotMatch(out, new RegExp(`</?${tag}>`));
  }
});

test("convertBody drops the Tabs wrapper and bolds each tab's title", () => {
  const out = convertBody(
    `<Tabs>\n  <Tab title="Claude Code">\n    Do the Claude Code thing.\n  </Tab>\n  <Tab title="Codex">\n    Do the Codex thing.\n  </Tab>\n</Tabs>\n`,
  );
  assert.doesNotMatch(out, /<\/?Tabs>|<\/?Tab[ >]/);
  assert.match(out, /\*\*Claude Code\*\*/);
  assert.match(out, /Do the Claude Code thing\./);
  assert.match(out, /\*\*Codex\*\*/);
  assert.match(out, /Do the Codex thing\./);
});

test("convertBody drops Card/CardGroup chrome but keeps link text and href", () => {
  const out = convertBody(
    `<CardGroup cols={2}>\n  <Card title="First" icon="rocket" href="/concepts/first">\n    First body.\n  </Card>\n</CardGroup>\n`,
  );
  assert.doesNotMatch(out, /<\/?Card|<\/?CardGroup/);
  assert.match(out, /\[First\]\(\/concepts\/first\): First body\./);
});

test("convertBody preserves fenced code blocks verbatim (modulo JSX indentation)", () => {
  const out = convertBody('Some text.\n\n```json\n{ "a": 1 }\n```\n\nMore text.\n');
  assert.match(out, /```json\n\{ "a": 1 \}\n```/);
});

test("convertBody dedents a fenced code block nested inside a Tab", () => {
  const out = convertBody(
    '<Tabs>\n  <Tab title="X">\n    ```bash\n    echo hi\n    ```\n  </Tab>\n</Tabs>\n',
  );
  assert.match(out, /^```bash$/m);
  assert.match(out, /^echo hi$/m);
  assert.match(out, /^```$/m);
});

test("convertBody leaves a non-component angle-bracket placeholder untouched", () => {
  const out = convertBody("Point it at <your-workspace-url>/v1/mcp/.\n");
  assert.match(out, /<your-workspace-url>/);
});

test("selfCheck flags a duplicate agent_topic", () => {
  const errors = selfCheck([
    { agent_topic: "dup", read_when: "x", source_path: "a.mdx" },
    { agent_topic: "dup", read_when: "y", source_path: "b.mdx" },
  ]);
  assert.ok(errors.some((e) => e.includes('agent_topic "dup" is not unique')));
});

test("selfCheck flags an empty read_when", () => {
  const errors = selfCheck([{ agent_topic: "ok", read_when: "   ", source_path: "a.mdx" }]);
  assert.ok(errors.some((e) => e.includes("empty or missing read_when")));
});

test("selfCheck is clean for unique topics with non-empty read_when", () => {
  const errors = selfCheck([
    { agent_topic: "a", read_when: "always", source_path: "a.mdx" },
    { agent_topic: "b", read_when: "sometimes", source_path: "b.mdx" },
  ]);
  assert.deepEqual(errors, []);
});

test("the real functional/ tree passes its own self-check (integration)", () => {
  const files = walkMdxFiles(FUNCTIONAL_DIR);
  assert.ok(files.length > 0, "expected at least one functional/**/*.mdx page");
});
