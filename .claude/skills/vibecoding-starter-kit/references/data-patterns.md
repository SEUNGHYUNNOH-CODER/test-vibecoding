# Data Patterns

How to fetch and mutate data in a Vibecoding app. Pick the simplest pattern that solves the problem.

## Decision Tree

```
Need data on a page?
├─ Static or per-request data on initial render?
│  └─ Server Component + Drizzle directly  ← DEFAULT
├─ Per-user with auth gating?
│  └─ Server Component + supabase.auth.getUser() + Drizzle
├─ Frequently-updating data, polling, or pagination on client?
│  └─ Client Component + useFetch hook
├─ Real-time updates from DB changes?
│  └─ Client Component + Supabase Realtime subscription
└─ External API consumer needs data?
   └─ Route Handler (/api/*/route.ts) + JSON response
```

## Pattern 1: Server Component + Drizzle (Default)

Use this for 80% of pages. Zero client JS for data, sub-100ms TTFB on Vercel.

```tsx
// src/app/(app)/posts/page.tsx
import { desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { posts } from '@/lib/db/schema';

export default async function PostsPage() {
  const allPosts = await db
    .select()
    .from(posts)
    .orderBy(desc(posts.createdAt))
    .limit(50);

  return <PostList posts={allPosts} />;
}
```

For parallel fetches:
```tsx
const [latestPosts, postCount, authors] = await Promise.all([
  db.select().from(posts).limit(10),
  db.select({ count: count() }).from(posts),
  db.selectDistinct({ id: posts.profileId }).from(posts),
]);
```

## Pattern 2: Mutation via Server Action

For forms and any data change initiated by user interaction. Server Actions integrate with `<form>` natively and support optimistic updates.

See `references/feature-recipe.md` § 3 for the canonical Server Action pattern with `requireUser()`, Zod validation, and `revalidatePath`.

Key points:
- Always validate input with Zod.
- Always check auth via `supabase.auth.getUser()`.
- Always call `revalidatePath` (or `revalidateTag`) after mutating.
- Return `{ error: ... }` for validation failures; throw for unexpected errors.

## Pattern 3: Client useFetch Hook

When you need:
- Tabs/filters that change without a full page navigation
- Polling, manual refetch, optimistic updates
- Sharing fetched data across multiple Client Components

The `useFetch` hook (in `assets/useFetch.ts`) provides SWR-like behavior: cache, deduplication, stale-while-revalidate.

```tsx
'use client';

import { useFetchWithDeps, invalidateCache } from '@/hooks/useFetch';

export function PostList({ filter }: { filter: string }) {
  const { data, error, isLoading, refetch } = useFetchWithDeps(
    ['posts', filter],
    () => fetch(`/api/posts?filter=${filter}`).then((r) => r.json()),
    { staleTime: 30_000 },
  );

  if (isLoading) return <Skeleton />;
  if (error) return <p className="text-destructive">{error.message}</p>;

  return <ul>{data?.posts.map((p) => <li key={p.id}>{p.title}</li>)}</ul>;
}
```

After a mutation:
```tsx
await deletePostAction(id);
invalidateCache('posts'); // Re-fetches all useFetch keys starting with "posts"
```

## Pattern 4: Route Handler (External API)

When the data needs to be consumed by something other than a Next.js component (mobile app, third-party service, webhook).

```ts
// src/app/api/posts/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { posts } from '@/lib/db/schema';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100);

  const data = await db.select().from(posts).limit(limit);
  return NextResponse.json({ data });
}
```

For public endpoints, skip the auth check but **rate-limit** (Vercel KV, Upstash, or `@vercel/firewall`).

## Pattern 5: Supabase Realtime

For live updates (chat, presence, collaborative editing). Realtime works through the Supabase JS client, not Drizzle.

```tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Post } from '@/lib/db/schema';

export function LivePosts({ initialPosts }: { initialPosts: Post[] }) {
  const [posts, setPosts] = useState(initialPosts);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('post-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Post' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPosts((prev) => [payload.new as Post, ...prev]);
          }
          // handle UPDATE / DELETE similarly
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return <ul>{posts.map((p) => <li key={p.id}>{p.title}</li>)}</ul>;
}
```

Enable Realtime per-table in **Supabase Dashboard → Database → Replication**.

## Loading & Error States

### loading.tsx (route-level)
```tsx
// src/app/(app)/posts/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="container space-y-4 py-8">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );
}
```

### error.tsx (route-level)
```tsx
// src/app/(app)/posts/error.tsx
'use client';

import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container py-12 text-center">
      <h2 className="mb-2 text-xl font-bold">Something went wrong</h2>
      <p className="mb-4 text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```

### Suspense boundaries (in-component)
```tsx
import { Suspense } from 'react';

<Suspense fallback={<Skeleton className="h-32" />}>
  <SlowDataComponent />
</Suspense>
```

## Caching

Server Component fetches are **not cached** by default in Next.js 16 (the cache opts changed). To cache:

```ts
// Inside a Server Component or Server Action
import { unstable_cache } from 'next/cache';

const getPosts = unstable_cache(
  async () => db.select().from(posts).limit(50),
  ['posts-latest'],
  { revalidate: 60, tags: ['posts'] },
);
```

Invalidate:
```ts
import { revalidateTag } from 'next/cache';
revalidateTag('posts');
```

For dynamic per-request data (e.g., personalized content), don't cache — fetch on each request.

## Mutation Patterns Summary

| Source | Best for | Key tools |
|--------|----------|-----------|
| `<form action={serverAction}>` | Most form submissions | `useTransition`, `revalidatePath` |
| `useFormState` (React 19 `useActionState`) | Forms with stateful errors | `useActionState` |
| Client `fetch('/api/...')` | Optimistic UI, complex client flows | `useFetch.mutate`, `invalidateCache` |
| Supabase Realtime | Live collaboration | `supabase.channel(...)` |

## Anti-Patterns

- ❌ `useEffect` + `fetch` for data that could be Server-Component-rendered
- ❌ Client Component importing `@/lib/db` (build will fail)
- ❌ Forgetting `revalidatePath` after a Server Action mutation (UI shows stale data)
- ❌ Trusting `getSession()` for auth gating instead of `getUser()`
- ❌ Long-lived Drizzle clients in Edge runtime (use `max: 1` in `postgres()` config)
- ❌ Putting business logic in Route Handlers when Server Actions would do (more boilerplate, less type safety)
