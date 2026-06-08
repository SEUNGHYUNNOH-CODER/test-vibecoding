# Feature Recipe (CRUD End-to-End)

A repeatable workflow for adding a new resource to the app. Example: adding a `posts` feature.

## Order of Operations

```
1. Schema (Drizzle)            → src/lib/db/schema.ts
2. Validators (Zod)            → src/lib/validators/post.ts
3. Server Actions / Routes     → src/app/api/posts/route.ts OR actions.ts
4. Server Component (list)     → src/app/(app)/posts/page.tsx
5. Client Component (form)     → src/components/posts/PostForm.tsx
6. Detail page                 → src/app/(app)/posts/[id]/page.tsx
7. Mutations (revalidate)      → wired through Server Actions
```

Each step compiles and runs before moving to the next.

## 1. Schema

Add to `src/lib/db/schema.ts`:

```ts
import { pgTable, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const posts = pgTable(
  'Post',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    profileId: text('profile_id').notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    published: boolean('published').notNull().default(false),
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
  }),
);

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
```

Push:
```bash
pnpm db:push
```

## 2. Validators

`src/lib/validators/post.ts`:

```ts
import { z } from 'zod';

export const CreatePostSchema = z.object({
  title: z.string().min(1, 'Title required').max(200),
  content: z.string().min(1, 'Content required').max(10000),
  published: z.boolean().default(false),
});

export const UpdatePostSchema = CreatePostSchema.partial();

export type CreatePostInput = z.infer<typeof CreatePostSchema>;
export type UpdatePostInput = z.infer<typeof UpdatePostSchema>;
```

## 3. Server Actions

`src/app/(app)/posts/actions.ts`:

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { posts } from '@/lib/db/schema';
import { createServerClient } from '@/lib/supabase/server';
import { CreatePostSchema, UpdatePostSchema } from '@/lib/validators/post';

async function requireUser() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

export async function createPost(formData: FormData) {
  const user = await requireUser();

  const parsed = CreatePostSchema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
    published: formData.get('published') === 'on',
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const [post] = await db
    .insert(posts)
    .values({ profileId: user.id, ...parsed.data })
    .returning();

  revalidatePath('/posts');
  redirect(`/posts/${post.id}`);
}

export async function updatePost(id: string, formData: FormData) {
  const user = await requireUser();

  const parsed = UpdatePostSchema.safeParse({
    title: formData.get('title') ?? undefined,
    content: formData.get('content') ?? undefined,
    published: formData.get('published') === 'on',
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const [updated] = await db
    .update(posts)
    .set(parsed.data)
    .where(and(eq(posts.id, id), eq(posts.profileId, user.id)))
    .returning();

  if (!updated) return { error: { _form: ['Not found or not yours'] } };

  revalidatePath('/posts');
  revalidatePath(`/posts/${id}`);
  return { post: updated };
}

export async function deletePost(id: string) {
  const user = await requireUser();
  await db
    .delete(posts)
    .where(and(eq(posts.id, id), eq(posts.profileId, user.id)));
  revalidatePath('/posts');
}
```

## 4. List Page (Server Component)

`src/app/(app)/posts/page.tsx`:

```tsx
import { desc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { db } from '@/lib/db';
import { posts } from '@/lib/db/schema';
import { createServerClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function PostsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const myPosts = await db
    .select()
    .from(posts)
    .where(eq(posts.profileId, user!.id))
    .orderBy(desc(posts.createdAt));

  return (
    <div className="container space-y-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Posts</h1>
        <Button asChild>
          <Link href="/posts/new">New post</Link>
        </Button>
      </div>

      {myPosts.length === 0 ? (
        <p className="text-muted-foreground">No posts yet.</p>
      ) : (
        <div className="grid gap-4">
          {myPosts.map((post) => (
            <Card key={post.id}>
              <CardHeader>
                <CardTitle>
                  <Link href={`/posts/${post.id}`} className="hover:underline">
                    {post.title}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {post.published ? 'Published' : 'Draft'} · {post.createdAt.toLocaleDateString()}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

## 5. Form (Client Component)

`src/components/posts/PostForm.tsx`:

```tsx
'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import type { Post } from '@/lib/db/schema';

interface Props {
  post?: Post;
  action: (formData: FormData) => Promise<{ error?: Record<string, string[]> } | void>;
}

export function PostForm({ post, action }: Props) {
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setErrors({});
    startTransition(async () => {
      const result = await action(formData);
      if (result?.error) setErrors(result.error);
    });
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          defaultValue={post?.title}
          className={cn(errors.title && 'border-destructive')}
        />
        {errors.title && <p className="text-sm text-destructive">{errors.title[0]}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Content</Label>
        <textarea
          id="content"
          name="content"
          rows={10}
          defaultValue={post?.content}
          className={cn(
            'w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
            errors.content && 'border-destructive',
          )}
        />
        {errors.content && <p className="text-sm text-destructive">{errors.content[0]}</p>}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="published" defaultChecked={post?.published} />
        Publish immediately
      </label>

      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {post ? 'Save changes' : 'Create post'}
      </Button>
    </form>
  );
}
```

## 6. New + Detail Pages

`src/app/(app)/posts/new/page.tsx`:

```tsx
import { PostForm } from '@/components/posts/PostForm';
import { createPost } from '../actions';

export default function NewPostPage() {
  return (
    <div className="container max-w-2xl space-y-6 py-8">
      <h1 className="text-2xl font-bold">New post</h1>
      <PostForm action={createPost} />
    </div>
  );
}
```

`src/app/(app)/posts/[id]/page.tsx`:

```tsx
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { posts } from '@/lib/db/schema';
import { PostForm } from '@/components/posts/PostForm';
import { updatePost } from '../actions';

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [post] = await db.select().from(posts).where(eq(posts.id, id));
  if (!post) notFound();

  const action = updatePost.bind(null, post.id);

  return (
    <div className="container max-w-2xl space-y-6 py-8">
      <h1 className="text-2xl font-bold">{post.title}</h1>
      <PostForm post={post} action={action} />
    </div>
  );
}
```

## 7. Optional: Route Handler (External API)

If you need a JSON API (e.g., for a mobile client), expose a Route Handler instead of (or in addition to) Server Actions.

`src/app/api/posts/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { posts } from '@/lib/db/schema';
import { createServerClient } from '@/lib/supabase/server';
import { CreatePostSchema } from '@/lib/validators/post';

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const data = await db
    .select()
    .from(posts)
    .orderBy(desc(posts.createdAt))
    .limit(50);
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const parsed = CreatePostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [post] = await db
    .insert(posts)
    .values({ profileId: user.id, ...parsed.data })
    .returning();
  return NextResponse.json({ post }, { status: 201 });
}
```

## Checklist Before Marking Feature Done

- [ ] Schema pushed (`pnpm db:push` succeeded)
- [ ] Zod validator covers all input shapes
- [ ] Server Action enforces `requireUser()` + ownership check
- [ ] List page uses Server Component (no `useEffect` fetch)
- [ ] Form errors render inline, not as a generic alert
- [ ] `revalidatePath` called after every mutation
- [ ] No client component imports `@/lib/db` (will fail build)
- [ ] `pnpm build` passes
- [ ] Manual smoke test: create → list → edit → delete
