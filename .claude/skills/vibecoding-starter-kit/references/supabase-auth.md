# Supabase Auth in Next.js App Router

Set up cookie-based Supabase Auth using `@supabase/ssr`. This is the only supported pattern for Next.js 16 App Router (the older `@supabase/auth-helpers-nextjs` is deprecated).

## Three-Client Architecture

You will create **three** Supabase clients, each scoped to a specific runtime:

| Client | File | Runs in | Purpose |
|--------|------|---------|---------|
| Server | `src/lib/supabase/server.ts` | Server Components, Route Handlers, Server Actions | Read/refresh session via Next.js cookies API |
| Browser | `src/lib/supabase/client.ts` | Client Components | Sign-in flows, real-time subscriptions |
| Middleware | `src/lib/supabase/middleware.ts` | Edge middleware | Refresh session on every request |

**Never import the browser client in a Server Component.** Importing the server client in a Client Component will fail at build time (it uses `next/headers`).

## 1. Install

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

## 2. Server Client

`src/lib/supabase/server.ts`:

```ts
import { createServerClient as createSSRClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerClient() {
  const cookieStore = await cookies();

  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — ignore.
            // Middleware will refresh the cookies on the next request.
          }
        },
      },
    },
  );
}
```

## 3. Browser Client

`src/lib/supabase/client.ts`:

```ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

## 4. Middleware Helper

`src/lib/supabase/middleware.ts`:

```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // CRITICAL: Do not remove this. Refreshes expired access tokens.
  // Always use getUser() — it re-validates with the auth server.
  await supabase.auth.getUser();

  return supabaseResponse;
}
```

## 5. Root Middleware

`src/middleware.ts`:

```ts
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image, favicon.ico
     * - public assets (svg, png, jpg, jpeg, gif, webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

## 6. Auth Pages (Server Actions)

`src/app/(auth)/login/page.tsx`:

```tsx
import { login, signup } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  return (
    <form className="mx-auto max-w-sm space-y-4 p-6">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required />
      </div>
      <div className="flex gap-2">
        <Button formAction={login}>Sign in</Button>
        <Button formAction={signup} variant="outline">
          Sign up
        </Button>
      </div>
    </form>
  );
}
```

`src/app/(auth)/login/actions.ts`:

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

export async function login(formData: FormData) {
  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signup(formData: FormData) {
  const supabase = await createServerClient();
  const { error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect('/login?message=Check your email to confirm');
}

export async function logout() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
```

## 7. Protected Route Group

`src/app/(app)/layout.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <>{children}</>;
}
```

Any page under `src/app/(app)/` is now auth-gated.

## 8. OAuth Callback Route

For social providers (Google, GitHub, Kakao, etc.), add `src/app/auth/callback/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
```

Configure the redirect URL in Supabase Dashboard → Auth → URL Configuration:
- Site URL: `https://your-app.vercel.app`
- Redirect URLs: `https://your-app.vercel.app/auth/callback`, `http://localhost:3000/auth/callback`

## 9. Sync auth.users → profiles Table

When a user signs up, mirror their record into your Drizzle `profiles` table. Two approaches:

**Approach A: Database trigger (recommended for production)**

In Supabase SQL Editor:

```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into "Profile" (id, email, created_at, updated_at)
  values (new.id, new.email, now(), now());
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

**Approach B: Server Action after signup**

```ts
import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';

// After successful signUp:
await db.insert(profiles).values({ id: user.id, email: user.email! });
```

Approach A is more reliable (atomic with the signup transaction).

## 10. Reading the Current User

In a **Server Component**:

```tsx
import { createServerClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return <h1>Hello {user?.email}</h1>;
}
```

In a **Client Component**:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export function UserBadge() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return <span>{user?.email ?? 'Guest'}</span>;
}
```

## Critical Rules

1. **Always `getUser()`, never `getSession()`** for auth gating on the server. `getSession()` reads the cookie without re-validating; an attacker could forge it.
2. **Always include the root `middleware.ts`**. Without it, sessions silently expire after the access token TTL (~1 hour).
3. **`getAll`/`setAll` cookie pattern only**. The single-cookie API is deprecated and breaks in Next.js 16.
4. **Anon key is public**, service role key is secret. Never use the service role key in any code that ships to the client bundle.
5. **OAuth callback must match exactly** in Supabase Dashboard. Trailing slashes count.

## Reference

- `@supabase/ssr` docs: https://supabase.com/docs/guides/auth/server-side/nextjs
- App Router auth guide: https://supabase.com/docs/guides/auth/server-side/creating-a-client
