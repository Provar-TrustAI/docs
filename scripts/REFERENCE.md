# Prepare a unified reference candidate

Run `pnpm generate:reference --source-root <accepted-trustai-checkout>` from this repository. First generate the source checkout's `services/api/openapi.json` using its canonical `pnpm gen` command. The source checkout must contain its committed `services/api/tests/mcp/tool_list.json`, whose existing tests compare it with the server's actual tool listing. Both input hashes must match `scripts/reference-allowlist.json`.

The generator writes one coherent JSON candidate to `dist/reference-candidate/reference.json`. It does not update the current `api-reference/openapi.json`, site navigation, or publish to Mintlify. An alternate `--output` must stay under `dist/reference-candidate/` and end in `.json`. The directory is already gitignored. Review the candidate and its source revision before creating any public reference change; a development revision does not establish a supported deployed release.

For inspection, extract the two projections into that same ignored candidate directory:

```bash
python3 - <<'PY'
import json
from pathlib import Path
root = Path('dist/reference-candidate')
candidate = json.loads((root / 'reference.json').read_text())
for key, filename in [('openapi', 'openapi.json'), ('mcp_tools', 'mcp-tools.json')]:
    (root / filename).write_text(json.dumps(candidate[key], indent=2) + '\n')
PY
```

The single candidate file is the atomic preparation unit. These inspection copies are not an atomic publication. The docs PR and commit record the change; no separate publication receipt or release manifest is introduced. Docs-only corrections do not require a product deployment.

## Candidate scope for review

The initial source is `trustai@44db56ef9afbe7986110cccdae474c1ae99b7e0b`. The initial proposed projection includes only `getMe`, `listProjects`, and `getProject`, plus their three existing read tools. These expose the signed-in person's identity and the projects their grants permit them to list and open. Their canonical DTOs contain profile/membership fields and project id, name and kind fields; the selected closure contains no connector secrets, billing supplier facts, private authoring prompts or operator commands. Preserve the canonical wire fields and schemas. This bounded candidate is prepared for owner review; selection does not establish external public classification or a supported deployment.

Every other current operation and tool is explicitly withheld in the allowlist. Sign-in callbacks, MCP token credentials, connector setup/probes, workspace governance, invitations, teams, guide content and access-management tools await their owners' public classification. Withholding a route from this candidate does not withdraw it from the current release reference. Consuming existing tool metadata for documentation changes no MCP implementation or MCP ticket.

The allowlist records both exact artifact hashes and the selected/excluded inventories. It is not an approval to publish a whole source tree. A changed input hash, new unknown operation/tool, duplicate inventory, or selected internal route refuses generation. To extend the scope, review the accepted source, field privacy and deployment posture, then update the selected/excluded names and both hashes together. Do not regenerate the allowlist automatically as part of generation.

The existing sanitizer owns free-text rewriting in descriptions, summaries and titles. Wire keys, enum values and references remain intact; only the selected operations and their reachable component closure are retained. External and missing references, explicit private markers, internal-route citations that survive sanitization, and machine-local paths are refused. Inputs are the two fixed canonical files under the supplied source root; symlinked inputs are refused. Unrelated private files are never opened or copied. The complete candidate is validated and staged before one atomic replacement; a failed preparation keeps the previous candidate unchanged.

Run the independent standard-library tests with `python3 -m unittest discover -s scripts -p 'test_generate_reference.py'`. The existing FT bundle tests and exporter remain separate. Mintlify deployment branch confirmation and a supported unified release are still required before registering any candidate in the public site. Existing legacy vocabulary and navigation remain unchanged.
