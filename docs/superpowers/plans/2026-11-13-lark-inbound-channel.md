# Lark inbound channel: plan

Status: proposed, not started. Phase 1 (bots use Lark through the official MCP
server) is done in [docs/lark.md](../../lark.md).

## Goal

People in Lark (international, `open.larksuite.com`) message an ACGSBot bot in
a DM or @mention it in a group. The bot runs a turn and replies in the same
Lark thread.

## Scope

- One Lark custom app per bot, or one app routed by chat to a bot (decide in
  step 1).
- Text in and out. Lark rich text and cards go out only as plain Markdown at
  first.
- Out of scope: Feishu China tenants (the code is the same with another base
  URL, but testing is separate), file attachments, interactive cards.

## Steps

1. **Design (opus planner + security review).** Choose between Lark event
   delivery modes. A *long-connection* WebSocket from the ACGSBot server needs
   no public URL and suits desktop installs. An *HTTP event subscription* needs
   a public HTTPS endpoint and suits Team Cloud and servers. Map Lark
   `open_id` / `union_id` to ACGSBot people, and decide which bot answers in a
   chat.
2. **Inbound verifier (fail-closed).** If the HTTP mode is chosen, verify the
   `X-Lark-Signature` header (SHA-256 over timestamp, nonce, encrypt key and
   body) and decrypt with the Encrypt Key (AES-256-CBC). Reject replays older
   than five minutes and duplicate `event_id`s. Answer the `url_verification`
   challenge only after the token check. Use unit tests with Lark's published
   vectors.
3. **Dispatcher wiring.** Register the route or WebSocket client in the real
   server path (`server/index.ts` / routes). Add a dispatcher-level test that
   posts a signed event through the server and asserts that a bot turn starts.
   A handler test alone does not prove the wiring
   (`~/.claude/rules/review-handler-wiring.md`).
4. **Reply path.** Send `im/v1/messages` replies with a tenant token cached
   until it expires. Retry with backoff when Lark returns a rate limit. Never
   echo secrets, and reuse `shared/redact.ts`.
5. **Settings UI.** Add a per-bot *Connect Lark* card with App ID, App Secret
   and Encrypt Key, stored like other connector secrets, plus a test button.
   The card shows the event URL or the connection state.
6. **Verification.** Use an isolated fixture (`docs/verification/README.md`)
   and a fake Lark server that sends signed events. Then do one manual run
   against a sandbox tenant.

## Open questions

- Which ACGSBot people may a Lark user act as? Default: Lark messages run as
  the bot's owner and need approval for write tools.
- Is this for desktop installs, Team Cloud, or both? This decides step 1.
