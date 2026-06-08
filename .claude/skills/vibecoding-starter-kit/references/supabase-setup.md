# Supabase Setup (From Zero)

A click-by-click guide to creating a Supabase project, getting the keys you need, and wiring it into the Vibecoding stack. Written for users who have **never used Supabase before**.

## What is Supabase?

Supabase is an open-source backend-as-a-service. For this stack, you'll use it for three things:

1. **Postgres database** — Drizzle ORM connects to it
2. **Authentication** — email/password, OAuth (Google, GitHub, Kakao), magic links
3. **Storage** — file uploads (images, attachments)

The free tier is generous: 500 MB DB, 50,000 monthly active users, 1 GB storage. Enough for prototyping.

## Step 1: Create a Supabase Account

1. Go to **https://supabase.com**
2. Click **Start your project** (top right)
3. Sign in with **GitHub** (recommended — simplifies later integrations)
4. Authorize Supabase to access your GitHub account

## Step 2: Create a New Project

1. Once logged in, you'll see the dashboard at `https://supabase.com/dashboard`
2. Click **New project**
3. Pick or create an **organization**:
   - For personal projects: use the auto-created one named after your GitHub handle
   - For team work: create a new org with a meaningful name
4. Fill in project details:
   - **Name**: e.g. `my-app` (this becomes part of your project URL)
   - **Database Password**: click **Generate a password**, then **save it somewhere safe** (1Password, .env, anywhere private). You will need this for `DATABASE_URL`. **Supabase does not show it again.**
   - **Region**: pick the one closest to your users (e.g. `Northeast Asia (Seoul)` for Korea, `US East (N. Virginia)` for US)
   - **Pricing Plan**: **Free** is fine to start
5. Click **Create new project**
6. Wait ~2 minutes for the project to provision. The dashboard will show a progress spinner.

## Step 3: Collect the Three Critical Keys

Once the project is ready, you need to grab three values for your `.env` file. They live in **Project Settings → API**.

Click the gear icon (⚙️) in the bottom-left, then **API**.

You'll see two sections: **Project URL** and **Project API keys**.

### A. NEXT_PUBLIC_SUPABASE_URL

- Find: **Project URL** section
- Looks like: `https://abcdefghijk.supabase.co`
- Copy → paste into `.env` as `NEXT_PUBLIC_SUPABASE_URL=`

### B. NEXT_PUBLIC_SUPABASE_ANON_KEY

- Find: **Project API keys** → row labeled **anon** **public**
- Long JWT starting with `eyJ...`
- Click **Reveal** then copy
- Paste into `.env` as `NEXT_PUBLIC_SUPABASE_ANON_KEY=`
- ✅ This key is **safe to expose** to the browser — it's protected by Row Level Security policies

### C. SUPABASE_SERVICE_ROLE_KEY

- Find: **Project API keys** → row labeled **service_role** **secret**
- Click **Reveal** then copy
- Paste into `.env` as `SUPABASE_SERVICE_ROLE_KEY=`
- ⚠️ **NEVER expose this to the browser**. It bypasses Row Level Security and has full admin access. Only use it in Server Actions / Route Handlers when you genuinely need admin operations.

## Step 4: Get the DATABASE_URL (for Drizzle)

This is what `postgres-js` will connect to.

1. Still in **Project Settings**, click **Database** (left sidebar, under "Configuration")
2. Scroll to **Connection string** section
3. You'll see tabs: **URI**, **PSQL**, **.NET**, etc. — stick with **URI**
4. There are **two connection modes**. You want **Transaction** mode (port `6543`):

   ```
   postgresql://postgres.PROJECT_REF:[YOUR-PASSWORD]@aws-0-REGION.pooler.supabase.com:6543/postgres
   ```

5. Replace `[YOUR-PASSWORD]` with the database password you saved in Step 2
6. Paste into `.env` as `DATABASE_URL=`

**Why Transaction mode (6543) and not Session mode (5432)?**

- Transaction mode pools connections — works on serverless (Vercel)
- Session mode is for long-lived clients (e.g., a Postgres client on your laptop)
- Drizzle on Vercel must use Transaction mode + `prepare: false`

## Step 5: Verify the Connection Locally

In your project root, run:

```bash
pnpm db:push
```

This pushes your Drizzle schema to Supabase. You should see:

```
[✓] Pulling schema from database...
[✓] Changes applied
```

If it errors with `password authentication failed`, double-check the password in your `DATABASE_URL`.

If it errors with `prepared statement already exists`, your `db/index.ts` is missing `prepare: false`. Fix it.

After success, open **Supabase Dashboard → Table Editor**. You should see your tables (`Profile`, `Post`, etc.) listed.

## Step 6: Configure Authentication

The default email/password auth works out of the box. To enable it (or other providers):

1. **Supabase Dashboard → Authentication → Providers**
2. Email is **enabled** by default. Click it to configure:
   - **Confirm email**: leave **on** for production. Toggle **off** for fast local testing.
   - **Secure email change**: leave **on**
3. To add **Google OAuth** (optional):
   - Toggle **Google** to enabled
   - Follow the prompt to create a Google Cloud OAuth client (Supabase shows the exact callback URL to register)
   - Paste your Google **Client ID** and **Client Secret**
4. To add **GitHub OAuth** (optional):
   - Toggle **GitHub** to enabled
   - Create an OAuth app at https://github.com/settings/developers
   - Authorization callback URL: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
   - Paste **Client ID** and **Client Secret**

### URL Configuration (Critical)

**Authentication → URL Configuration**:

- **Site URL**: where users get redirected after auth.
  - Local dev: `http://localhost:3000`
  - Production: `https://your-app.vercel.app`
- **Redirect URLs** (whitelist — paste each on a new line):
  ```
  http://localhost:3000/**
  https://your-app.vercel.app/**
  https://*-your-app.vercel.app/**
  ```
  The `**` at the end allows any sub-path. The `*-your-app.vercel.app` line whitelists Vercel preview deployments.

Without these, OAuth and email links will redirect to the wrong place and fail.

## Step 7: Set Up the Profile Sync Trigger (Recommended)

When a user signs up, Supabase creates a row in `auth.users`. You usually want a corresponding row in your own `Profile` table. Add a database trigger:

1. **Supabase Dashboard → SQL Editor**
2. Click **New query**, paste:

   ```sql
   create or replace function public.handle_new_user()
   returns trigger as $$
   begin
     insert into "Profile" (id, email, created_at, updated_at)
     values (new.id, new.email, now(), now());
     return new;
   end;
   $$ language plpgsql security definer;

   drop trigger if exists on_auth_user_created on auth.users;
   create trigger on_auth_user_created
     after insert on auth.users
     for each row execute procedure public.handle_new_user();
   ```

3. Click **Run** (bottom right)
4. You should see `Success. No rows returned`

Now every signup automatically creates a profile row.

## Step 8: Enable Row Level Security (Recommended)

By default, Supabase tables are accessible only via the service role key. The anon key is blocked. To allow safe client-side reads:

1. **Supabase Dashboard → Authentication → Policies**
2. Find your table (e.g. `Post`)
3. Click **Enable RLS**
4. Click **New policy** → **Get started quickly** → pick a template:
   - **Enable read access for all users** — public posts
   - **Enable insert for authenticated users only** — must be logged in to post
   - **Enable update for users based on user_id** — users can only edit their own posts (set the column name to `profile_id`)

For the Vibecoding stack default, **the Drizzle client uses the database role and bypasses RLS**. RLS is still useful as defense-in-depth — keep it on.

## Step 9: Set Up Storage (Optional)

For file uploads (avatars, post images):

1. **Supabase Dashboard → Storage**
2. Click **New bucket**
3. Name: `avatars` (or whatever you need)
4. **Public bucket**: enable if files should be readable without auth
5. Click **Create bucket**

Upload from a Server Action:

```ts
'use server';

import { createServerClient } from '@/lib/supabase/server';

export async function uploadAvatar(formData: FormData) {
  const file = formData.get('file') as File;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const path = `${user.id}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true });

  if (error) return { error: error.message };

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return { url: data.publicUrl };
}
```

## Step 10: Verify Everything Works

Quick smoke test:

```bash
# 1. Start the dev server
pnpm dev

# 2. Open http://localhost:3000/signup
# 3. Create an account with a real email
# 4. Check your inbox for the confirmation link
# 5. Click confirm — should redirect to your site
# 6. Check Supabase Dashboard → Authentication → Users — should see your user
# 7. Check Supabase Dashboard → Table Editor → Profile — should see a matching row (if you set up the trigger)
```

## Common Pitfalls

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Invalid login credentials` on signup | Email confirmation required but inbox unchecked | Confirm email, or disable "Confirm email" in Auth settings for local dev |
| Email confirmation link redirects to localhost from production | Site URL not updated | Set production URL in Authentication → URL Configuration |
| `password authentication failed` | DB password wrong in DATABASE_URL | Reset password in Project Settings → Database, update .env |
| `relation "public.Post" does not exist` | Schema not pushed | `pnpm db:push` |
| `prepared statement already exists` | Drizzle config missing `prepare: false` | Edit `src/lib/db/index.ts` |
| OAuth redirects to login page after authorize | Callback URL not registered with provider | Copy exact URL from Supabase auth settings → Google/GitHub/etc. |

## Where to Find Things in the Supabase Dashboard

| What you need | Where it lives |
|---------------|----------------|
| API keys, project URL | Project Settings → API |
| Database connection strings | Project Settings → Database |
| Browse tables | Table Editor |
| Run SQL queries | SQL Editor |
| Auth users | Authentication → Users |
| Auth settings, OAuth providers | Authentication → Providers + URL Configuration |
| RLS policies | Authentication → Policies |
| File buckets | Storage |
| Realtime config | Database → Replication |
| Project logs | Logs (left sidebar, near bottom) |

---

**Next**: Once Supabase is connected and `pnpm db:push` works, move to [feature-recipe.md](feature-recipe.md) to build your first CRUD feature, then [vercel-deployment.md](vercel-deployment.md) to deploy.
