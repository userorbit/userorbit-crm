# Contributing

UserOrbit CRM is a Cloudflare Workers and D1 application. Keep contributions small, product-focused, and easy for self-hosters to review.

## Local setup

```sh
npm install
npm run db:create
npm run db:migrate:local
npm run dev
```

Copy `.dev.vars.example` to `.dev.vars` and set a long `CRM_API_TOKEN` before opening `/app`.

## Development checks

Run these before opening a pull request:

```sh
node --check src/worker.js
node --check src/ui.js
npm run db:migrate:local
```

If a change touches user workflows, verify the Worker locally in a browser and include the tested URL or API command in the PR notes.

## Product priorities

- Preserve self-hosting simplicity.
- Keep the agent API documented and stable.
- Make team/workspace behavior explicit in every feature that stores CRM data.
- Prefer Cloudflare-native primitives before adding external services.
- Avoid sending real email in tests unless the setup is explicitly configured for that.
