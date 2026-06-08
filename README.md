# Vibecoding Starterkit

Next.js 16 풀스택 스타터킷. Claude Code 스킬/에이전트 기본 설정 포함.

## 기술 스택

| 영역         | 기술                                                                              |
| ------------ | --------------------------------------------------------------------------------- |
| **Framework**| Next.js 16 (App Router), React 19, TypeScript                                     |
| **Styling**  | Tailwind CSS 4, shadcn/ui, Pretendard                                             |
| **DB / ORM** | PostgreSQL (Supabase), Drizzle ORM, postgres-js                                   |
| **Auth**     | Supabase Auth (`@supabase/ssr`)                                                   |
| **Tooling**  | pnpm, ESLint 9, drizzle-kit                                                       |

## 구조

```
vibecoding-starterkit/
├── app/              # Next.js 16 풀스택 (pnpm)
│   ├── src/
│   │   ├── app/      # App Router
│   │   ├── components/
│   │   ├── hooks/
│   │   └── lib/
│   ├── DESIGN.md     # 디자인 시스템
│   └── drizzle.config.ts
└── .claude/          # Claude Code skills & agents
```

## 빠른 시작

```bash
cd app
pnpm install
pnpm dev    # http://localhost:3000
```

### DB

```bash
pnpm db:push       # 스키마 푸시
pnpm db:generate   # 마이그레이션 생성
pnpm db:migrate    # 마이그레이션 적용
pnpm db:studio     # Drizzle Studio
```

자세한 내용은 `app/` 하위 문서 참고 (`AGENTS.md`, `DESIGN.md`).
