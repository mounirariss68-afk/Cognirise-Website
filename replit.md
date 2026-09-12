# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Editorial approval from chat

- An explicit user instruction in this project chat to publish specific content constitutes editorial review and approval of that content. Do not require the user to repeat that approval in the CMS.
- Record that chat authorization through the supported publication/audit process, without inventing a separate reviewer or additional confirmations. Scope approval to the requested content and destinations; preserve unrelated pending edits.
- Approval does not waive authorization, required data, publication integrity, or media-rights checks. Explain genuine blockers rather than silently bypassing them. This is not blanket approval of future content or an instruction to publish anything without a specific request.

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

- Never present the UAE and Saudi Arabia together in website or CMS copy. UAE editions may mention only the UAE; Saudi editions may mention only Saudi Arabia. Other markets must use their own or neutral copy.
- An explicit instruction from the project owner in chat to publish content constitutes their editorial review and approval for that requested publication; do not require duplicate manual review or approval in the CMS. This does not waive revision-conflict checks, immutable media pins, market-delivery validation, or honest publication audit attribution.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- **Required for case-study image work:** Read [`docs/case-study-image-design-guide.md`](docs/case-study-image-design-guide.md) before creating, selecting, editing, or exporting case-study artwork. Follow its versioned visual rules, provenance requirements, and generation-receipt checklist.
