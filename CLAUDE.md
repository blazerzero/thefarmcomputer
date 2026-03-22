# The Farm Computer

## Environment Configuration

This project is optimized for a Node 24 environment and has not yet been confirmed to work in Node 25 and beyond.

## Registering Discord Slash Commands

When adding a new slash command to `scripts/register-commands.ts`, always include these two fields:

```ts
integration_types: [0, 1], // Guild Install + User Install
contexts: [0, 1, 2],       // Guild channels, bot DMs, and private DMs
```

- `integration_types`: `0` = Guild Install, `1` = User Install. Both are needed to support private DMs (context `2`).
- `contexts`: `0` = guild channel, `1` = bot DM, `2` = private channel/DM.

Omitting these can cause Discord to register the command with unexpected defaults, resulting in "Unknown Integration" errors and the command not appearing in Server Settings → Integrations.

After registering, run `yarn register-manual` to push the commands to Discord. Global commands can take a few minutes to propagate.

## Web Query API

Every new slash command must also be supported in `src/web.ts`. When implementing a new command:

1. Import the handler at the top of `src/web.ts`
2. Add a `case` for it in the `switch` block, constructing a `makeInteraction(...)` call with the appropriate options
3. Add the command name to the error string in the `default` case

Omitting this means the web frontend (`/api/query`) won't support the command.
