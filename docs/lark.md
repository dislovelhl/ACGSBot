# Connect Lark (Feishu)

ACGSBot bots use Lark through the official Lark/Feishu OpenAPI MCP server,
[`@larksuiteoapi/lark-mcp`](https://www.npmjs.com/package/@larksuiteoapi/lark-mcp),
added as a custom MCP server (see [custom-mcp-servers.md](custom-mcp-servers.md)).
No ACGSBot code is involved: the server runs on your computer and talks to
Lark's OpenAPI with your own app's credentials.

This gives bots tools; it does not let people in Lark chat with a bot. That
inbound channel is a separate, planned feature.

## 1. Create a Lark app

1. Open the [Lark Developer Console](https://open.larksuite.com/app) and create
   a **Custom App** for your tenant. (Feishu China tenants use
   `https://open.feishu.cn/app` and the Feishu domain below.)
2. Under **Add features**, enable **Bot** if bots should post messages.
3. Under **Permissions & Scopes**, grant only what the team needs, for example:
   - messaging: `im:message`, `im:message:send_as_bot`, `im:chat:readonly`
   - documents: `docx:document:readonly`, `wiki:wiki:readonly`
   - Bitable: `bitable:app`
4. Publish a version so the tenant admin approves the scopes, and add the bot
   to each chat it should post in.
5. Copy the **App ID** and **App Secret** from **Credentials & Basic Info**.

## 2. Add the server in ACGSBot

Open **Plugins → MCP servers → Add server** and paste:

```json
{
  "mcpServers": {
    "lark": {
      "command": "npx",
      "args": ["-y", "@larksuiteoapi/lark-mcp@0.5.1", "mcp"],
      "env": {
        "APP_ID": "YOUR_APP_ID",
        "APP_SECRET": "YOUR_APP_SECRET",
        "LARK_DOMAIN": "https://open.larksuite.com",
        "LARK_TOKEN_MODE": "tenant_access_token"
      }
    }
  }
}
```

ACGSBot never saves the placeholders. It asks for the App ID and App Secret
and stores them with the server's other keys. Pass the secret through `env`,
not through the `-s` flag, because command-line arguments are visible to every
process on the machine. For a Feishu China tenant, set `LARK_DOMAIN` to
`https://open.feishu.cn`.

When the server is added it is tested and reports *Connected: 19 tools* with the
default preset. Those tools cover messages and chats (`im_v1_*`), Bitable
(`bitable_v1_*`), documents (`docx_*`), Wiki (`wiki_*`), Drive sharing
(`drive_v1_permissionMember_create`) and user ID lookup
(`contact_v3_user_batchGetId`). To choose a different tool set, add
`"LARK_TOOLS": "preset.default"` or a comma-separated list of tool names (see
the package's README).

## Safety

- `im_v1_message_create` posts as your app and `drive_v1_permissionMember_create`
  shares files. Keep **approval** on *ask* for bots that hold these tools. The
  ACGS team packages in `packages/acgs/` suggest *ask* for every bot.
- Tenant tokens act as the app, not as a person. Use `user_access_token` mode
  (`--oauth`) only when actions must be taken as the signed-in person.
- Rotate the App Secret in the developer console if it is ever exposed, then
  use **Fix the keys** on the server row.
