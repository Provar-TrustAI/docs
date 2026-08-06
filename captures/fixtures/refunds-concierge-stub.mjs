/**
 * A stub agent-under-test for the Playground captures.
 *
 * The Playground is the one docs surface that CANNOT be screenshotted from
 * seed data: every shot needs a connected agent that actually replies, because
 * the save-as-scenario action only unlocks after a real user turn AND a real
 * agent turn, and History only lists runs that produced turns. The
 * `acme-refunds-csat` seed connects no runnable agent.
 *
 * So this file is the agent. It speaks the `conversational_http` connector's
 * AG-UI SSE dialect (the same one `services/gateway/src/providers/
 * conversational_http.py` parses), which means the product drives it through
 * the exact same path it drives a customer's HTTP agent through — nothing about
 * the Playground is stubbed, only the far end of the connection.
 *
 * It emits more than text: a `CUSTOM route_decision` event and a tool call per
 * turn, so the transcript carries the "Routed to" / "Tool used" inline peek the
 * concepts page describes rather than bare bubbles.
 *
 *   node captures/fixtures/refunds-concierge-stub.mjs        # serves :8397
 *
 * Then register it as a connection (once per stack):
 *
 *   curl -X POST localhost:8000/v1/connect/hosts?project_id=<id> -H 'content-type: application/json' \
 *     -d '{"name":"Refunds Concierge","platform_type":"conversational_http",
 *          "platform_config":{"base_url":"http://host.docker.internal:8397",
 *            "endpoint_path":"/agui/run","health_path":"/health",
 *            "auth_mode":"none","preset":"generic","mode":"act","request_timeout":300}}'
 *
 * `host.docker.internal` — the API and gateway run in Docker; localhost inside
 * those containers is not this machine.
 */
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.STUB_PORT ?? 8397);

/**
 * Replies keyed on what the user actually said. The Playground streams these
 * token-by-token, so a reply that ignored the question would read as obviously
 * canned in a screenshot of the transcript.
 */
const REPLIES = [
  {
    match: /(how long|when|timeline|typically take|should it land|haven't seen|hasn't|not arrived yet)/i,
    route: "Refunds & Returns",
    tool: { name: "lookup_return", input: { order_ref: "AC-40119", channel: "web" }, output: { status: "received_at_warehouse", scanned_on: "2026-07-29" } },
    text: "Thanks for waiting — I can see your return was scanned into our warehouse on 29 July. Refunds go back to the original card 7 to 10 business days after that scan, so yours is due by 12 August. You'll get a text the moment the credit posts.",
  },
  {
    match: /(doesn't arrive|does not arrive|still nothing|escalate|what happens if|eleven days|11 days|past that)/i,
    route: "Refunds & Returns",
    tool: { name: "check_refund_status", input: { order_ref: "AC-40119" }, output: { state: "pending_issuer", days_elapsed: 11 } },
    text: "If it's past the 10th business day I raise it with the payments team the same day — you don't need to chase it. I've flagged this one now, and you'll hear back within one business day with either a posted credit or a trace reference for your bank.",
  },
  {
    match: /.*/,
    route: "General Support",
    tool: { name: "lookup_customer", input: { email: "j.okafor@example.com" }, output: { tier: "returning", open_cases: 1 } },
    text: "Happy to help with that. I can look up any order placed on this account, check where a refund has got to, or start a return if the item is still inside its 60-day window — which would you like?",
  },
];

function lastUserText(body) {
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "user") return String(messages[i].content ?? "");
  }
  return "";
}

function pickReply(text) {
  return REPLIES.find((reply) => reply.match.test(text)) ?? REPLIES[REPLIES.length - 1];
}

const server = createServer((req, res) => {
  if (req.url?.startsWith("/health")) {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }
  if (!req.url?.startsWith("/agui/run")) {
    res.writeHead(404).end();
    return;
  }

  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    let body = {};
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      /* an unparseable body still gets the fallback reply */
    }
    const reply = pickReply(lastUserText(body));
    const threadId = String(body.threadId ?? randomUUID());
    const runId = String(body.runId ?? randomUUID());
    const messageId = randomUUID();
    const toolCallId = randomUUID();

    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    });
    const send = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

    send({ type: "RUN_STARTED", threadId, runId });
    // The connector turns this into a `route` agent step — the transcript's
    // "Routed to" peek.
    send({ type: "CUSTOM", name: "route_decision", value: { target: reply.route } });
    send({ type: "TOOL_CALL_START", toolCallId, toolCallName: reply.tool.name });
    send({ type: "TOOL_CALL_ARGS", toolCallId, delta: JSON.stringify(reply.tool.input) });
    send({ type: "TOOL_CALL_END", toolCallId });
    send({ type: "TOOL_CALL_RESULT", toolCallId, content: JSON.stringify(reply.tool.output) });
    send({ type: "TEXT_MESSAGE_START", messageId, role: "assistant" });
    // Stream in sentence-sized deltas so the reply visibly types in, the way a
    // real connected agent's does.
    for (const part of reply.text.split(/(?<=\. )/)) {
      send({ type: "TEXT_MESSAGE_CONTENT", messageId, delta: part });
    }
    send({ type: "TEXT_MESSAGE_END", messageId });
    send({ type: "RUN_FINISHED", threadId, runId });
    res.end();
  });
});

server.listen(PORT, () => {
  process.stdout.write(`refunds-concierge stub listening on :${PORT}\n`);
});
