# Drizzle ORM + Supabase

Set up Drizzle ORM against a Supabase Postgres database with `postgres-js`. This config works on Vercel Edge runtime and Node.js.

## Why postgres-js (not pg)

- Smaller bundle, edge-compatible
- Native pooling support
- Required when targeting Vercel Edge runtime
- Compatible with Supabase's pgBouncer transaction-mode pooler

## 1. Get Your Supabase Connection String

In the Supabase Dashboard → Project Settings → Database:

- **Transaction mode** (port `6543`): Use this for serverless / edge. Pooled, but no prepared statements.
- **Session mode** (port `5432`): Use for migrations, long connections.

For the app runtime, use **Transaction mode** (`6543`).
For `drizzle-kit push` / `migrate`, also Transaction mode works fine in most cases.

Format:
```
postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres
```

Save as `DATABASE_URL` in `.env`.

## 2. Drizzle Config

`drizzle.config.ts`:

```ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Enable when adopting RLS-aware policies through Drizzle
  // entities: { roles: true },
});
```

## 3. Drizzle Client

`src/lib/db/index.ts`:

```ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// CRITICAL: prepare: false is required for pgBouncer transaction mode
// Prepared statements break across pooled connections
const client = postgres(connectionString, {
  prepare: false,
  // Optional: limit connections per Lambda/edge instance
  max: 1,
});

export const db = drizzle(client, { schema });
export type DB = typeof db;
```

## 4. Schema Patterns

`src/lib/db/schema.ts`:

```ts
import { pgTable, text, timestamp, integer, boolean, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

// User profile (mirrors Supabase auth.users via id column)
export const profiles = pgTable(
  'Profile',
  {
    id: text('id').primaryKey(), // matches Supabase auth.users.id (uuid stored as text)
    email: text('email').notNull(),
    displayName: text('display_name'),
    avatarUrl: text('avatar_url'),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (t) => ({
    emailIdx: uniqueIndex('profile_email_idx').on(t.email),
  }),
);

// Posts owned by a profile (no FK — indexed string column convention)
export const posts = pgTable(
  'Post',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    profileId: text('profile_id').notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    published: boolean('published').notNull().default(false),
    metadata: jsonb('metadata').$type<{ tags?: string[]; readingTime?: number }>(),
    createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => new Date()),
  },
  (t) => ({
    profileIdx: index('post_profile_idx').on(t.profileId),
    publishedIdx: index('post_published_idx').on(t.published, t.createdAt),
  }),
);

// Inferred types for end-to-end type safety
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
```

## 5. Push Schema to Supabase

For prototyping (no migration files):

```bash
pnpm db:push
```

This applies the schema diff directly to Supabase. Drizzle will prompt before destructive changes.

For production (with migration history):

```bash
pnpm db:generate   # creates SQL files in ./drizzle/
pnpm db:migrate    # applies them in order
```

Commit `./drizzle/*.sql` files. Never edit them after they've been applied to a remote.

## 6. Drizzle Studio (Local DB Browser)

```bash
pnpm db:studio
```

Opens an interactive browser at `https://local.drizzle.studio` connected to your Supabase DB.

## 7. Query Patterns

### Simple Select
```ts
import { db } from '@/lib/db';
import { posts } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

const allPosts = await db.select().from(posts).orderBy(desc(posts.createdAt));

const userPosts = await db
  .select()
  .from(posts)
  .where(eq(posts.profileId, userId))
  .limit(20);
```

### Insert
```ts
const [created] = await db
  .insert(posts)
  .values({ profileId: userId, title, content })
  .returning();
```

### Update
```ts
const [updated] = await db
  .update(posts)
  .set({ title, content })
  .where(eq(posts.id, postId))
  .returning();
```

### Delete (Soft Preferred)
```ts
// Hard delete
await db.delete(posts).where(eq(posts.id, postId));

// Soft delete (add deletedAt column to schema, then)
await db
  .update(posts)
  .set({ deletedAt: new Date() })
  .where(eq(posts.id, postId));
```

### Transactions
```ts
await db.transaction(async (tx) => {
  const [post] = await tx.insert(posts).values({ ... }).returning();
  await tx.insert(auditLog).values({ action: 'create_post', refId: post.id });
});
```

### Relational Query API (when relations are defined)
```ts
import { relations } from 'drizzle-orm';

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(profiles, {
    fields: [posts.profileId],
    references: [profiles.id],
  }),
}));

// Then:
const postsWithAuthor = await db.query.posts.findMany({
  with: { author: true },
  orderBy: (p, { desc }) => [desc(p.createdAt)],
});
```

## 8. Server Actions Pattern

Always validate input with Zod before hitting Drizzle:

```ts
'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { posts } from '@/lib/db/schema';
import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const CreatePostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
});

export async function createPost(formData: FormData) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const parsed = CreatePostSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten() };
  }

  const [post] = await db
    .insert(posts)
    .values({ profileId: user.id, ...parsed.data })
    .returning();

  revalidatePath('/dashboard/posts');
  return { post };
}
```

## 9. RLS Compatibility

If using Supabase RLS, the **Drizzle client uses the database role**, which bypasses RLS by default (it connects as the `postgres` user via the pooler). Two approaches:

**Option A: Trust application layer (default in this stack)**
- Enforce auth + ownership checks in Server Actions / Route Handlers (using `supabase.auth.getUser()`).
- Keep RLS enabled but treat it as a defense-in-depth layer for direct DB access.

**Option B: Use anon key with RLS enforcement**
- Connect Drizzle through the Supabase JS client's PostgREST endpoint instead.
- More overhead, but RLS policies fully apply. Rarely worth it.

This stack defaults to **Option A**. Document the choice in `design.md` or `ARCHITECTURE.md`.

## Common Pitfalls

| Symptom | Cause | Fix |
|---------|-------|-----|
| `prepared statement "..." already exists` | Using pgBouncer transaction mode with `prepare: true` | `postgres(url, { prepare: false })` |
| Edge function fails with `pg` import | `pg` doesn't run on edge | Use `drizzle-orm/postgres-js`, not `drizzle-orm/node-postgres` |
| `db.select()` returns empty in production | Connection pooling killed the query mid-flight | Use `max: 1` and Transaction mode pooler URL |
| Migration drops a column unexpectedly | Renamed in schema.ts but Drizzle sees it as drop+add | Use `pnpm db:generate` and review the SQL before applying |
| RLS blocks all queries when using Supabase JS | Using anon key without `auth.uid()` matching | Drop down to Drizzle (Option A) or fix the policy |

## Reference

- Drizzle docs: https://orm.drizzle.team
- Supabase + Drizzle official guide: https://supabase.com/docs/guides/database/drizzle
- pgBouncer modes: https://supabase.com/docs/guides/database/connecting-to-postgres
