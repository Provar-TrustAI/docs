# Capture backlog

Blocked and pending demo captures. Nothing here is reader-visible; a page gets its heading back
only when a clean recording exists. See `demo-tooling.md` for how captures are produced and hosted.

---

## D1 — Agentforce admin-authorize round trip

**Target page:** `get-started/connect-your-agentforce-agent.mdx`. The page carries a commented-out
video slot where the `## Watch the connection end to end` section goes; the heading itself stays cut
until this clears, so the page never renders an empty section. Slug `d1-salesforce-authorize`, per
`pipeline/README.md`.

**Status: BLOCKED — not PENDING. No capture pass can clear it.**

The admin-authorize round trip cannot be recorded by the capture harness. Only the first leg is
drivable without a live org — the org-URL field, the Sandbox caution, the authorize button, and the
status line that replaces it. Everything past that (the Salesforce approve screen, the automatic
return, the agent list, the three-check readout) is gated on a real administrator consenting in a
real Salesforce org: the callback needs a genuine single-use OAuth code and the server hands it to
the internal gateway, which deploys metadata into the org. There is no local stub for either, and
the connect flow is unavailable altogether unless the deployment has been provisioned for it. The
hand-off also opens in a new tab, so the harness records it to a second file — the one moment worth
showing is never in the same frame as the rest.

The one already-bootstrapped org on the dev instance is a real sandbox, so its frames carry a real
host, admin username, org id, and External Client App name, and cannot be used either.

Re-attempt only as a hand recording against a disposable sandbox whose identifiers are safe to
publish. Do not stage or composite the hand-off, and do not ship the first leg on its own: it ends
on a promise the video cannot keep.

### Shot list

One continuous take, 1280x800, light theme, at `v2026.08.03.2`, settings path (not chat), against a
disposable sandbox provisioned for publication.

1. Project Settings → Connection tab → **Add connection**. Show the picker with all four platforms
   in shipped order (AWS Bedrock AgentCore, Salesforce Agentforce, Claude Managed Agent,
   Conversational HTTP agent); pick **Salesforce Agentforce**.
2. The create form: breadcrumb `Connections > Add > Salesforce Agentforce`, the **New connection**
   heading with its platform chip, exactly two fields. Type a **Connection Name** ("Agentforce
   Sandbox") and the disposable org URL — type it, never accept a prefill. Hold on the echoed host
   line and the Sandbox caution.
3. Click **Authorize in Salesforce with an administrator account**. Show the status line replacing
   the button, with **Cancel** as the only other control.
4. The Salesforce tab: the login, then the approve screen with the requested access. This is the
   beat the demo exists for — do not crop it away.
5. The automatic return: the Salesforce tab closing itself and the original form advancing unaided.
   Hold long enough that a reader believes it.
6. Step 2 of the wizard: the "Salesforce org connected" header, the agent list arriving populated
   with the found-agents count, one agent picked by name; leave **Run agent as** on its default.
7. **Save changes** → **Test Connection**: the three ordered checks, one line each, ending on
   **Connection verified**. If the sandbox can produce it, capture a second short take of the amber
   partial state with its list of things to finish.
8. The **Connection** tab row for the saved connection. (Lifecycle **Connected** and the sign-in
   label **Admin authorization** are on Workspace Settings → **Connections**, not this row — if you
   want them on camera, that is a separate short take.)

### Must not survive into a published frame

Provision the sandbox so the take is clean in-camera; cropping the viewport is fine, painting over
a security surface is not.

- The org My Domain / instance host anywhere, including the Salesforce tab's address bar
- The authorizing administrator's username, email, display name, and avatar
- The org id, and any Salesforce session id or `code`/`state` value during the return hop
- The deployed External Client App name
- Agent names and connection/project UUIDs belonging to anything real
- The TrustAI top-bar identity and browser chrome

### When a clean recording exists

Drop the file at `images/demos/d1-salesforce-authorize.mp4`, then replace the commented-out video
slot on the page with:

```mdx
## Watch the connection end to end

The whole connection recorded end to end, from the empty **Connection** tab to **Connection verified**.

<video controls muted playsInline className="w-full rounded-xl" src="/images/demos/d1-salesforce-authorize.mp4"></video>
```
