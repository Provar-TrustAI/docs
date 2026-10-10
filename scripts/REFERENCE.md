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

The source is `trustai@44db56ef9afbe7986110cccdae474c1ae99b7e0b`. The proposed projection includes 30 REST operations across signed-in identity, projects, project access, workspace membership and invitations, teams, and connectors. The three existing read tool metadata entries remain unchanged. The projection preserves canonical request/response DTOs and their complete reachable schemas, including nullability, constraints, enums, concurrency and idempotency parameters. Selection prepares a reviewable candidate; it does not establish a supported deployed release or availability of a particular connector adapter.

Schema field names and declarations are contract metadata. Actual emails, names, tenant/project/member identifiers, access rosters, customer org targets, configuration, probe details and setup effects are personal or customer data and are never copied into examples. Connector secret slots declare names, not secret values; public configuration is separate from protected secret storage, and setup effects are non-secret records. Transient callback code/state and authorization URLs are represented only by their canonical schema shapes, never captured values or provider-specific credential examples. Public configuration remains role-restricted as the producer specifies.

The allowlist explicitly withholds `startSignIn`, `finishSignIn` and `signOut`: these redirect/session workflows contain provider vocabulary outside the current docs vocabulary and credential-bearing runtime URLs or inputs. They need a separate auth documentation decision; this preparation does not extend the legacy sanitizer or author provider setup instructions. `getHealth` is withheld because non-`/v1/` roots are outside publication policy. The three MCP token operations and the existing excluded tool metadata remain outside this work's scope. Withholding an operation from this candidate does not withdraw it from the current release reference. Consuming existing tool metadata changes no MCP implementation or MCP ticket.

The allowlist records both exact artifact hashes and the selected/excluded inventories. It is not an approval to publish a whole source tree. A changed input hash, new unknown operation/tool, duplicate inventory, or selected internal route refuses generation. To extend the scope, review the accepted source, field privacy and deployment posture, then update the selected/excluded names and both hashes together. Do not regenerate the allowlist automatically as part of generation.

The existing sanitizer owns free-text rewriting in descriptions, summaries and titles. Wire keys, enum values and references remain intact; only the selected operations and their reachable component closure are retained. External and missing references, explicit private markers, internal-route citations that survive sanitization, and machine-local paths are refused. Inputs are the two fixed canonical files under the supplied source root; symlinked inputs are refused. Unrelated private files are never opened or copied. The complete candidate is validated and staged before one atomic replacement; a failed preparation keeps the previous candidate unchanged.

Run the independent standard-library tests with `python3 -m unittest discover -s scripts -p 'test_generate_reference.py'`. The existing FT bundle tests and exporter remain separate. Mintlify deployment branch confirmation and a supported unified release are still required before registering any candidate in the public site. Existing legacy vocabulary and navigation remain unchanged.
