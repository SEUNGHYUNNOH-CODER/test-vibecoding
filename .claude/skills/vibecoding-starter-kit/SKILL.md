---
name: vibecoding-starter-kit
description: Full-stack starter kit for shipping Next.js 16 + Drizzle ORM + Supabase apps to Vercel quickly. Opinionated stack with App Router, React 19, TypeScript strict, Tailwind CSS 4, shadcn/ui, postgres-js Drizzle adapter, Supabase Auth/Storage/RLS, design.md as design system source of truth, and Vercel deployment. Next.js 16 specifics covered - Turbopack default, async params/cookies/headers, cacheComponents config. Use when bootstrapping a new full-stack project, scaffolding CRUD features, wiring Supabase to Drizzle, defining a design system, building API routes/server actions, or deploying to Vercel. Triggers - "vibecoding", "starter kit", "Next.js + Supabase", "Drizzle + Supabase", "Vercel deploy", "full-stack scaffold", "design.md", "shadcn 세팅", "프로젝트 초기 세팅", "DB 스키마", "supabase auth Next.js".
---

# Vibecoding Starter Kit

Opinionated full-stack starter for Next.js 16 + Drizzle ORM + Supabase, deployed on Vercel. Optimized for fast iteration with a clean architecture that scales from prototype to production.

## Stack at a Glance

| Layer | Tech | Why |
|-------|------|-----|
| Framework | Next.js 16 (App Router, Turbopack default) | Server Components, Route Handlers, Server Actions, async Request APIs |
| Runtime | React 19 + TypeScript strict | Modern hooks, type safety |
| Database | Supabase Postgres (via Drizzle ORM + `postgres-js`) | Type-safe SQL, SSL pooled connections |
| ORM | Drizzle ORM 0.45+ | Lightweight, edge-compatible, schema-first |
| Auth | Supabase Auth (`@supabase/ssr`) | Cookie-based sessions, social/OAuth/email |
| Storage | Supabase Storage | Direct upload, signed URLs |
| Styling | Tailwind CSS 4 + shadcn/ui (new-york) | CSS variables, no config file, accessible Radix primitives |
| Forms | Manual `useState` + Zod validation | Minimal deps, full control |
| Data fetching | Server Components + `useFetch` SWR-like hook | Cache + dedup on client, RSC on server |
| Deployment | Vercel | Edge runtime, env management, preview URLs |
| Design source | `design.md` at repo root | Single source for tokens, theming, voice |

## Primary Use Case: Build a New Project From Zero

This skill is designed to **walk a user end-to-end through creating a brand-new full-stack app**, from `pnpm create` to a live URL on Vercel — even if they have **never used Supabase or Vercel before**. The deployment guides are written click-by-click for absolute beginners.

Use this skill when the user says any of:
- "Build me a new app"
- "Start a project with [Next.js / Supabase / Drizzle]"
- "Set up the boilerplate"
- "Deploy this to Vercel"
- "Vibecoding 시작" / "프로젝트 처음부터"

Also useful for: adding a new feature to an existing Vibecoding project, defining `design.md`, wiring auth, configuring Vercel/Supabase env vars.

## Autonomous Execution Rule (Critical)

**When the user says "프로젝트 셋업 해줘", "set up the project", "start a new app", or any equivalent — execute the entire setup pipeline without asking clarifying questions.** Use the defaults below. Only stop for user input at the **two unavoidable external gates** (Supabase signup + Vercel signup).

### Defaults (Apply Without Asking)

| Decision | Default |
|----------|---------|
| Project name | Use folder name from `pwd`, or ask user only if running outside a clear project root |
| Package manager | `pnpm` |
| TypeScript | strict |
| ESLint | enabled |
| Tailwind | yes (Tailwind 4) |
| App Router | yes |
| `src/` directory | yes |
| Import alias | `@/*` → `./src/*` |
| Turbopack | on (Next.js 16 default; opt out per-script with `--webpack` only if a plugin breaks) |
| shadcn/ui style | new-york |
| shadcn/ui base color | neutral |
| CSS variables | yes |
| ID strategy | `cuid2` from `@paralleldrive/cuid2` |
| FK strategy | indexed string columns (no FK constraints) |
| Auth | Supabase email/password (OAuth providers added on request) |
| DB pooler mode | Transaction mode (port 6543) with `prepare: false` |
| Region | Korea/Asia → Seoul; otherwise ask once |
| Initial shadcn components | button, input, label, card, dialog, select, textarea, badge, alert, skeleton |
| Dark mode | included via `next-themes` |
| Migration strategy | `db:push` for prototype; switch to `db:generate` + `db:migrate` later |
| Initial git commit | yes, message `chore: initial vibecoding scaffold` |

If a default doesn't fit, the user will tell you. **Don't preemptively ask.**

### What Skill Auto-Executes

Run these without asking, in order:

1. `pnpm create next-app@latest <name> --typescript --eslint --tailwind --app --src-dir --import-alias "@/*"` (Turbopack on by default in Next.js 16)
2. Install all required deps (drizzle, postgres, @supabase/ssr, cuid2, zod, clsx, tailwind-merge, cva, lucide-react, tw-animate-css, date-fns, next-themes)
3. `pnpm dlx shadcn@latest init` with new-york + neutral defaults (use a non-interactive flag if available; otherwise pipe defaults)
4. Add initial shadcn components in batch
5. Create folder skeleton (`src/lib/db`, `src/lib/supabase`, `src/lib/validators`, `src/hooks`, `src/types`, `src/components/ui`, route groups)
6. Copy every `assets/` template into the right location (see Templates table)
7. Patch `tsconfig.json`, `next.config.ts`, `package.json` scripts
8. Create `.env.example`, write a `.env` skeleton with `TODO_FILL_ME` placeholders
9. `git init` (if not a repo) and make initial commit
10. Run `pnpm install` and `pnpm build` to verify nothing is broken
11. Print a numbered checklist of remaining manual steps (see below)

### What Requires User Action (Stop and Ask)

These cannot be automated — always pause and give exact instructions:

- **Supabase signup + project creation** → wait for user to confirm `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`. Reference: [supabase-setup.md](references/supabase-setup.md).
- **GitHub repo creation + push** → user clicks "New repo" then runs `git remote add` (skill provides exact commands).
- **Vercel signup + project import** → user clicks through dashboard. Reference: [vercel-deployment.md](references/vercel-deployment.md).
- **Pasting env vars into Vercel** → only the user can paste secrets into Vercel's UI.
- **OAuth provider setup** (Google/GitHub/Kakao Cloud) → user must register in those dashboards.

For each user-action gate, **print the exact next command or click path**, then stop and wait.

### Decision Heuristic When Skill Triggered

```
User says "프로젝트 셋업" / "set up project" / equivalent
↓
Is there an existing Next.js project here?
├─ NO  → Run full auto-pipeline (steps 1-11). Stop at Supabase gate.
└─ YES → Identify what's missing (Drizzle? Supabase? design.md?) and add only that.
         Do not re-scaffold. Do not overwrite user files.
```

## The 7-Phase New-Project Flow

For a brand-new project, work through these phases **sequentially**. The skill auto-executes phases 2-6 (code-side); phases 1 and 7 require user action at the external dashboard.

| # | Phase | Reference | Beginner-friendly? |
|---|-------|-----------|---------------------|
| 1 | Create the Supabase project (signup, get keys) | [references/supabase-setup.md](references/supabase-setup.md) | ✅ Click-by-click |
| 2 | Bootstrap the Next.js project locally | [references/project-setup.md](references/project-setup.md) | ✅ All commands listed |
| 3 | Define `design.md` (design system) | [references/design-md-guide.md](references/design-md-guide.md) | Template provided |
| 4 | Wire Drizzle ORM to Supabase | [references/drizzle-supabase.md](references/drizzle-supabase.md) | Copy-paste configs |
| 5 | Add Supabase Auth to App Router | [references/supabase-auth.md](references/supabase-auth.md) | Three-client pattern |
| 6 | Build the first CRUD feature | [references/feature-recipe.md](references/feature-recipe.md) | Schema → UI walkthrough |
| 7 | Deploy to Vercel + connect Supabase | [references/vercel-deployment.md](references/vercel-deployment.md) | ✅ Click-by-click |

**Phases 1 and 7 are the most beginner-heavy** — read them in full before starting. They include screenshots of dashboard locations, every env var to set, and common error fixes.

For an existing project, jump straight to the relevant reference file.

## When to Use This Skill (Trigger Patterns)

- Bootstrapping a new full-stack app from scratch
- Adding a new feature module (schema → API → UI)
- Wiring Supabase Auth into Next.js App Router
- Defining the `design.md` design system
- Setting up Drizzle migrations against Supabase
- Configuring Vercel deployment + environment variables
- Adding shadcn/ui components and Tailwind 4 tokens
- The user is unfamiliar with Supabase or Vercel and needs hand-holding

## Project Structure (Target)

```
my-app/
├── design.md                    # Design system source of truth
├── drizzle.config.ts
├── next.config.ts
├── components.json              # shadcn/ui config
├── tsconfig.json                # paths: { "@/*": ["./src/*"] }
├── .env                         # local secrets (gitignored)
├── .env.example                 # committed template
├── drizzle/                     # generated migrations
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── globals.css          # Tailwind 4 @theme + design tokens
    │   ├── (auth)/              # Public auth routes group
    │   │   ├── login/page.tsx
    │   │   └── signup/page.tsx
    │   ├── (app)/               # Protected routes group
    │   │   ├── layout.tsx       # Server-side auth guard
    │   │   └── dashboard/page.tsx
    │   └── api/
    │       └── [resource]/route.ts
    ├── components/
    │   ├── ui/                  # shadcn/ui primitives
    │   └── [feature]/           # Feature-scoped components
    ├── lib/
    │   ├── db/
    │   │   ├── index.ts         # Drizzle client
    │   │   └── schema.ts        # Tables + relations
    │   ├── supabase/
    │   │   ├── server.ts        # Server-side client (cookies)
    │   │   ├── client.ts        # Browser client
    │   │   └── middleware.ts    # Session refresh
    │   ├── utils.ts             # cn() helper
    │   └── validators/          # Zod schemas
    ├── hooks/
    │   └── useFetch.ts          # SWR-like client cache
    ├── types/
    └── middleware.ts            # Supabase session refresh
```

## Core Conventions

### Imports
- `@/` alias points to `src/` (configured in `tsconfig.json`).
- Type-only imports: `import type { User } from '@/types'`.
- Server-only modules import from `@/lib/supabase/server`; never from `@/lib/supabase/client`.

### Server vs Client Components
- **Server Components by default**. Add `'use client'` only when you need state, effects, event handlers, or browser APIs.
- Fetch data directly in async Server Components; pass to Client Components via props.
- Mutations: prefer **Server Actions** for forms, **Route Handlers** (`/api/*/route.ts`) for external API surface.

### Database Access
- Drizzle client lives in `@/lib/db`. **Never** import it from a Client Component.
- Schema-first: define tables in `src/lib/db/schema.ts`, run `pnpm db:push` against Supabase.
- Use `drizzle-kit push` for prototype; switch to `drizzle-kit generate` + migrations before production.

### IDs
- Default to `cuid2` from `@paralleldrive/cuid2` for primary keys (URL-safe, sortable, no DB extension required).
- Switch to `uuid` only if RLS policies key off `auth.uid()` directly.

### No Foreign Keys (Optional Convention)
- Prefer **indexed string columns** over FK constraints. RLS + application logic enforces integrity. Easier migrations, better edge compatibility.
- If FKs are needed, declare via `references()` in schema and let Drizzle generate them.

### Styling
- Tailwind CSS 4 — **no `tailwind.config.js`**. Tokens live in `globals.css` under `@theme inline`.
- All design tokens (colors, spacing, radii, fonts) are mirrored between `design.md` and `globals.css`.
- Use `cn()` from `@/lib/utils` for conditional classes.
- shadcn/ui: `npx shadcn@latest add <component>` — components live in `src/components/ui/`.

### Auth
- `@supabase/ssr` for cookie-based sessions. Three clients: `server.ts` (RSC + Route Handlers), `client.ts` (browser), `middleware.ts` (session refresh).
- Protected route groups use `(app)/layout.tsx` to call `supabase.auth.getUser()` and `redirect('/login')` on failure.
- **Never** trust `supabase.auth.getSession()` on the server — always use `getUser()` (it re-validates with the auth server).

## Detailed Guides

Load these reference files **only when you need them**. Each is self-contained and assumes you've read this SKILL.md.

| When you need to... | Load |
|---------------------|------|
| Create a Supabase project from zero (signup, keys, auth config) | [references/supabase-setup.md](references/supabase-setup.md) |
| Bootstrap a brand-new Next.js project | [references/project-setup.md](references/project-setup.md) |
| Define the design system | [references/design-md-guide.md](references/design-md-guide.md) |
| Set up Drizzle ORM against Supabase | [references/drizzle-supabase.md](references/drizzle-supabase.md) |
| Wire Supabase Auth into App Router | [references/supabase-auth.md](references/supabase-auth.md) |
| Add a CRUD feature end-to-end | [references/feature-recipe.md](references/feature-recipe.md) |
| Deploy to Vercel (beginner walkthrough) | [references/vercel-deployment.md](references/vercel-deployment.md) |
| Style with shadcn/ui + Tailwind 4 | [references/shadcn-tailwind.md](references/shadcn-tailwind.md) |
| Pick the right data-fetching pattern | [references/data-patterns.md](references/data-patterns.md) |

## Templates (Copy-Paste Starting Points)

The `assets/` directory holds drop-in templates:

- `assets/design.md` — design system template with tokens + voice
- `assets/globals.css` — Tailwind 4 token mapping (matches design.md)
- `assets/env.example` — required env var template
- `assets/drizzle.config.ts` — Drizzle config for Supabase
- `assets/supabase-server.ts`, `assets/supabase-client.ts`, `assets/supabase-middleware.ts` — three-client Supabase setup
- `assets/db-index.ts`, `assets/db-schema-example.ts` — Drizzle client + sample schema
- `assets/middleware.ts` — Next.js root middleware for session refresh
- `assets/useFetch.ts` — SWR-like client hook with cache + dedup

Copy these verbatim and customize. They are tested against the stack in this skill.

## Anti-Patterns (Do Not Do This)

| ❌ Wrong | ✅ Right |
|----------|---------|
| Import `@/lib/db` in a Client Component | Use Server Action or Route Handler; pass data via props |
| `supabase.auth.getSession()` on server for auth gating | `supabase.auth.getUser()` — re-validates with auth server |
| Hardcoded colors in components (`bg-[#C6FF00]`) | Tailwind token (`bg-primary`) backed by `design.md` |
| `useEffect` + `fetch` for every list | Server Component + RSC fetch, or `useFetch` hook |
| `process.env.DATABASE_URL` exposed to client | Keep server-only; expose only `NEXT_PUBLIC_*` vars |
| Skipping `middleware.ts` for Supabase | Sessions silently expire — always include it |
| Drizzle `prepare: true` on Supabase pgBouncer | `postgres(url, { prepare: false })` — pgBouncer transaction mode breaks prepared statements |
| `tailwind.config.js` in Tailwind 4 project | Use `@theme inline` in `globals.css` |
| Editing `src/components/ui/*` shadcn files for theming | Edit CSS variables in `globals.css` instead |

## Core Principles

1. **Server-first**: Server Components and Server Actions by default; ship less JS to the client.
2. **Type-safe end-to-end**: Drizzle infers DB types → Zod validates input → TypeScript across the stack.
3. **Single source of truth**: `design.md` defines tokens; `globals.css` mirrors them; components consume only via Tailwind classes.
4. **Edge-compatible**: `postgres-js` over Supabase pooler works on Vercel Edge runtime.
5. **Progressive disclosure**: Start simple (RSC + Server Actions), add `useFetch` only when client interactivity demands it.
6. **One config file per concern**: `drizzle.config.ts`, `next.config.ts`, `components.json` — no overlapping configs.
7. **Secrets stay server-side**: `DATABASE_URL`, service role keys never reach the client bundle.

## Integration with Other Skills

- **vercel-react-best-practices**: Apply for performance optimization patterns (memo, useTransition, derived state).
- **supabase-postgres-best-practices**: Apply for query optimization, indexing, RLS design.
- **frontend-design** / **design-consultation**: Use to bootstrap `design.md` from scratch.
- **shadcn-tailwind** patterns: Reused from `nextjs-frontend-guidelines` skill where applicable.

---

**Stack target**: Next.js 16.x + React 19 + Drizzle 0.45+ + Supabase + Tailwind 4 + Vercel
**Last updated**: 2026-05-07

## Next.js 16 Breaking Changes (Critical — This Skill Already Handles These)

Next.js 16 is **not** the Next.js you may know from training data. Read this before writing any code:

### 1. Async Request APIs (Hard Removal in 16)

`cookies()`, `headers()`, `draftMode()` from `next/headers` are **fully async**. Synchronous access throws.

```ts
// ❌ Next.js 14 / early 15
const token = cookies().get('token');

// ✅ Next.js 16 (REQUIRED)
const cookieStore = await cookies();
const token = cookieStore.get('token');
```

### 2. Async params and searchParams

`page.tsx`, `layout.tsx`, `route.ts`, `default.tsx`, `generateMetadata`, `generateViewport`, `opengraph-image`, `twitter-image`, `icon`, `apple-icon` — all receive `Promise<...>` for `params` and `searchParams`.

```ts
// ✅ Next.js 16
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { id } = await params;
  const { q } = await searchParams;
}

// Or use the new PageProps helper:
export default async function Page(props: PageProps<'/blog/[slug]'>) {
  const { slug } = await props.params;
}
```

### 3. Turbopack Is Default

No more `--turbopack` flag. Strip it from `package.json` scripts.

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

To opt out for a specific build (e.g., webpack-only plugin), use `--webpack`:
```json
"build": "next build --webpack"
```

### 4. `cacheComponents` Replaces Experimental Cache Flags

`experimental.dynamicIO` and `experimental.useCache` are deprecated. Use the top-level `cacheComponents` option:

```ts
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
};

export default nextConfig;
```

### 5. Codemod for Migration

If migrating from 14/15:
```bash
npx @next/codemod@latest next-async-request-api .
```

This rewrites sync `cookies()`/`headers()`/`params` access into async form.

### Verification

Whenever this skill runs, confirm:
```bash
cat package.json | grep '"next":'
# Must show 16.x or newer. If 15.x, the user should upgrade or accept stale docs.
```

If user is on Next.js 15, the async params/cookies guidance still works (it was opt-in there). The Turbopack default and `cacheComponents` config only apply to 16.
