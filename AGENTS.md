# AGENTS.md — ContentSmith

## Architecture

- **npm workspaces monorepo** managed by **Turbo**.
- Two Next.js 14 apps:
  - `apps/studio` — content editor (port 3000), i18n via `next-intl`, uses `@contentsmith/database` + `@contentsmith/validation` + `@contentsmith/ui`. Routes live under `src/app/[locale]/`.
  - `apps/gm-panel` — GM/admin panel (port 3001), **NO i18n**, has its **own** Drizzle schema in `src/server/schema.ts` (not a shared package). Connects to the game DB via `GAME_DATABASE_URL`.
- Three shared packages under `packages/`:
  - `@contentsmith/database` — Drizzle ORM schema + `createDb()` factory. Migrations in `drizzle/`. Shared by `studio`.
  - `@contentsmith/validation` — Zod schemas. Must be built before `studio` (Turbo handles this).
  - `@contentsmith/ui` — shared UI components (consumed as source; no build output, `transpilePackages` in Next.js).
- tRPC v10 everywhere. `studio` uses NextAuth with RBAC; `gm-panel` has no auth layer.

## Commands

```bash
npm run dev          # turbo dev (all apps + packages)
npm run build        # turbo build
npm run lint         # turbo lint (depends on ^build)
npm run type-check   # turbo type-check (depends on ^build)
npm run db:migrate   # run Drizzle migrations (packages/database)
npm run db:studio    # open Drizzle Studio
```

Run a single workspace:
```bash
npm run build --workspace=@contentsmith/database
npm run dev --workspace=@contentsmith/studio
npm run lint --workspace=@contentsmith/studio
```

Run a single test: **no test framework configured** — there are no test scripts or test files.

## Docker

| Command | What it does |
|---|---|
| `npm run docker:dev` | Just the studio container (host network → uses local DB). Simplest way to dev with Docker. |
| `npm run docker:dev-full` | studio + postgres + redis (everything containerized). |
| `npm run docker:prod` | All services: postgres + redis + studio + gm-panel. Uses multi-stage `runner` target. |

**Note:** `docker-compose.yml` references a `Dockerfile.gm` for gm-panel that does not exist in the repo.

## Database & Migrations

- Config: `packages/database/drizzle.config.ts` — reads `DATABASE_URL` from env, outputs to `./drizzle`.
- Generate migrations: `cd packages/database && npm run generate` (drizzle-kit generate).
- Apply migrations: `npm run db:migrate` (runs `tsx src/migrate.ts` which reads from `drizzle/` folder).
- The GM panel's schema (`apps/gm-panel/src/server/schema.ts`) is a **partial mirror** of the game DB. It is not tied to `@contentsmith/database` and has no migration tooling — it is read-only introspection.

## Dev Auth Bypass

In `NODE_ENV=development`, the studio API uses `devProcedure` / `devRequirePermission` instead of `protectedProcedure` / `requirePermission`. This skips auth entirely. See `apps/studio/src/server/trpc.ts:73-123`. Production routes go through NextAuth + RBAC.

## Environment Variables

Copy `.env.example` → `.env`. Key vars:

| Variable | Used by |
|---|---|
| `DATABASE_URL` | studio + database package |
| `GAME_DATABASE_URL` | gm-panel (separate game DB) |
| `NEXTAUTH_SECRET` | studio auth |
| `NEXTAUTH_URL` | studio auth |
| `POSTGRES_*` | Docker compose services |

## Build Order

Packages (`database`, `validation`) must build before apps. Turbo enforces this via `dependsOn: ["^build"]`, but if you bypass Turbo, build packages first:
```bash
npm run build --workspace=@contentsmith/database
npm run build --workspace=@contentsmith/validation
npm run build --workspace=@contentsmith/studio
```

## Key Conventions

- Next.js App Router with `[locale]` dynamic segment on studio only. All page files live inside `src/app/[locale]/(dashboard)/` or `src/app/[locale]/(fullscreen)/`.
- The `@contentsmith/ui` package exports from `src/index.ts` directly (no `dist/`). Next.js `transpilePackages` handles it.
- No CI/CD, no pre-commit hooks, no test framework.
- Server-side DB is always accessed via tRPC context (never imported directly in React components).
