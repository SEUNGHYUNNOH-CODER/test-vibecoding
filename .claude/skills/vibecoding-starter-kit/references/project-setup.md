# Project Setup

Bootstrap a brand-new Vibecoding project from zero. Run these steps in order.

## 1. Scaffold Next.js

Next.js 16 ships Turbopack as the **default bundler** — no `--turbopack` flag needed. Use this command:

```bash
pnpm create next-app@latest my-app \
  --typescript \
  --eslint \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*"
cd my-app
```

Verify Next.js 16+ and React 19+:
```bash
cat package.json | grep -E '"(next|react)":'
# Expect: "next": "^16.x.x", "react": "^19.x.x"
```

If `next` is < 16:
```bash
pnpm add next@latest react@latest react-dom@latest
pnpm add -D @types/react@latest @types/react-dom@latest
```

If migrating from Next.js 14/15, run the async-request-api codemod after upgrading:
```bash
npx @next/codemod@latest next-async-request-api .
```

This rewrites synchronous `cookies()` / `headers()` / `params` access into the now-required async form (Next.js 16 hard-removes the sync access path).

### Build script note (optional)

If you hit a Turbopack incompatibility with a specific webpack plugin, you can opt out **per script**:

```json
{
  "scripts": {
    "build": "next build --webpack"
  }
}
```

Default is fine for most projects — keep Turbopack on unless something breaks.

## 2. Required Dependencies

```bash
# Database + ORM
pnpm add drizzle-orm postgres @paralleldrive/cuid2
pnpm add -D drizzle-kit

# Supabase (auth, storage)
pnpm add @supabase/supabase-js @supabase/ssr

# Validation
pnpm add zod

# UI primitives (shadcn/ui base)
pnpm add clsx tailwind-merge class-variance-authority lucide-react
pnpm add tw-animate-css

# Date utils (used widely)
pnpm add date-fns
```

Optional (add when needed):
```bash
# Forms (skip if doing manual validation)
pnpm add react-hook-form @hookform/resolvers

# Tables
pnpm add @tanstack/react-table

# Charts
pnpm add recharts
```

## 3. tsconfig.json

Confirm these settings exist:

```json
{
  "compilerOptions": {
    "strict": true,
    "moduleResolution": "bundler",
    "paths": { "@/*": ["./src/*"] },
    "jsx": "react-jsx"
  }
}
```

## 4. next.config.ts

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
```

## 5. Initialize shadcn/ui

```bash
pnpm dlx shadcn@latest init
```

Choose:
- Style: **new-york**
- Base color: **neutral**
- CSS variables: **yes**

This creates `components.json` and updates `src/app/globals.css` with CSS variable tokens.

Add starter components:
```bash
pnpm dlx shadcn@latest add button input card dialog label select
```

## 6. Environment Files

Create `.env` (gitignored) and `.env.example` (committed):

```env
# .env.example - copy to .env and fill in real values

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # server-only, never expose

# Drizzle (Supabase Postgres pooled connection)
# Use the Supabase "Transaction" mode pooler URL (port 6543)
DATABASE_URL=postgresql://postgres.PROJECT:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres
```

Add `.env` to `.gitignore` (Next.js does this by default).

## 7. Package Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:migrate": "drizzle-kit migrate"
  }
}
```

## 8. Folder Skeleton

```bash
mkdir -p src/lib/db src/lib/supabase src/lib/validators src/hooks src/types
mkdir -p src/components/ui
mkdir -p "src/app/(auth)/login" "src/app/(auth)/signup"
mkdir -p "src/app/(app)/dashboard"
mkdir -p src/app/api
```

## 9. Copy Boilerplate from Assets

From `.claude/skills/vibecoding-starter-kit/assets/` copy these files:

| Asset | Destination |
|-------|-------------|
| `design.md` | `./design.md` |
| `globals.css` | `src/app/globals.css` (overwrite shadcn defaults to match design.md) |
| `drizzle.config.ts` | `./drizzle.config.ts` |
| `db-index.ts` | `src/lib/db/index.ts` |
| `db-schema-example.ts` | `src/lib/db/schema.ts` |
| `supabase-server.ts` | `src/lib/supabase/server.ts` |
| `supabase-client.ts` | `src/lib/supabase/client.ts` |
| `supabase-middleware.ts` | `src/lib/supabase/middleware.ts` |
| `middleware.ts` | `src/middleware.ts` |
| `useFetch.ts` | `src/hooks/useFetch.ts` |
| `env.example` | `.env.example` |

## 10. Verify Build

```bash
pnpm dev
# Should boot at http://localhost:3000 with no errors
```

```bash
pnpm build
# Should complete without TypeScript errors
```

## Gates Before Moving On

- [ ] `pnpm dev` boots without errors
- [ ] `pnpm build` completes
- [ ] `@/` import alias resolves
- [ ] `.env.example` committed, `.env` gitignored
- [ ] `design.md` exists at repo root
- [ ] shadcn/ui initialized, `components.json` exists

Next: [design-md-guide.md](design-md-guide.md) to define the design system.
