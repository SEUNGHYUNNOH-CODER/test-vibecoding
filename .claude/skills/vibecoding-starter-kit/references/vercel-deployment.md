# Vercel Deployment (Beginner Walkthrough)

A click-by-click guide for deploying your Vibecoding app to Vercel and connecting it to Supabase. Written for users who have **never deployed to Vercel before**.

## What is Vercel?

Vercel is a hosting platform for frontend frameworks. For this stack:

- It runs your **Next.js app** (Server Components, Server Actions, API routes)
- It auto-deploys every time you `git push`
- It gives every Pull Request a **preview URL** so you can test before merging
- The free tier is generous for personal projects

## Prerequisites

Before starting, you need:

- ✅ Your project pushed to a **GitHub repository** (private or public, both work)
- ✅ A working **Supabase project** (see `supabase-setup.md`)
- ✅ Local dev running: `pnpm dev` boots without errors
- ✅ Local build passes: `pnpm build` completes

If `pnpm build` fails locally, **fix it before deploying**. Vercel will fail too with the same error and you'll waste a deploy.

## Step 1: Create a Vercel Account

1. Go to **https://vercel.com**
2. Click **Sign Up** (top right)
3. Choose **Continue with GitHub** (matches your code source)
4. Authorize Vercel to read your repos
5. Pick the **Hobby (Free)** plan when prompted

## Step 2: Push Your Code to GitHub

If you haven't yet:

```bash
# In your project root
git init
git add .
git commit -m "initial commit"

# Create a new repo on https://github.com/new (don't add a README)
# Then connect:
git remote add origin git@github.com:YOUR_USERNAME/my-app.git
git branch -M main
git push -u origin main
```

Make sure **`.env` is gitignored** before pushing. Verify:
```bash
cat .gitignore | grep "\.env"
# Should show: .env, .env.local, .env*.local
```

If `.env` got committed by mistake:
1. Remove the file: `git rm --cached .env`
2. Add to `.gitignore`
3. Commit: `git commit -m "remove .env from repo"`
4. **Rotate every secret** in that file — assume they're compromised. Reset DB password in Supabase, regenerate API keys.

## Step 3: Import the Project to Vercel

1. Vercel dashboard → **Add New** (top right) → **Project**
2. Under **Import Git Repository**, find your repo
   - If you don't see it: click **Adjust GitHub App Permissions** → grant access to the specific repo
3. Click **Import**

You'll land on the **Configure Project** screen.

## Step 4: Configure Build Settings

Vercel auto-detects Next.js. Verify these defaults:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Next.js |
| **Root Directory** | `./` (or `frontend/` if monorepo — see below) |
| **Build Command** | `next build` (or `pnpm build`) |
| **Output Directory** | `.next` (auto) |
| **Install Command** | `pnpm install` |
| **Node.js Version** | 20.x or higher |

### Monorepo Note

If your Next.js app is in a subdirectory (e.g. `frontend/`):

1. Click **Edit** next to **Root Directory**
2. Select your subdirectory (e.g. `frontend`)
3. Vercel will run all commands from that directory

## Step 5: Add Environment Variables (Critical Step)

Click **Environment Variables** to expand the section. Add **four** variables:

### Variable 1: NEXT_PUBLIC_SUPABASE_URL

- **Key**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: paste from Supabase Dashboard → Project Settings → API → Project URL
- **Environments**: ✅ Production, ✅ Preview, ✅ Development (all three)
- Click **Add**

### Variable 2: NEXT_PUBLIC_SUPABASE_ANON_KEY

- **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: paste from Supabase Dashboard → Project Settings → API → anon public key
- **Environments**: ✅ Production, ✅ Preview, ✅ Development
- Click **Add**

### Variable 3: SUPABASE_SERVICE_ROLE_KEY

- **Key**: `SUPABASE_SERVICE_ROLE_KEY`
- **Value**: paste from Supabase Dashboard → Project Settings → API → service_role secret key
- **Environments**: ✅ Production, ✅ Preview (NOT Development — use a different mock for local)
- ⚠️ **Sensitive**: enable the **Sensitive** toggle if Vercel offers it
- Click **Add**

### Variable 4: DATABASE_URL

- **Key**: `DATABASE_URL`
- **Value**: paste from Supabase Dashboard → Project Settings → Database → Connection string (Transaction mode, port 6543), with your saved DB password substituted in
- **Environments**: ✅ Production, ✅ Preview, ✅ Development
- ⚠️ Sensitive
- Click **Add**

### Optional Variable: NEXT_PUBLIC_SITE_URL

If your code references the site URL anywhere (e.g. for email links):

- **Key**: `NEXT_PUBLIC_SITE_URL`
- **Value**: leave blank for now — you'll set it after the first deploy reveals your URL
- **Environments**: Production, Preview, Development

## Step 6: Deploy

1. Click **Deploy** at the bottom
2. Vercel runs `pnpm install`, `pnpm build`, then deploys
3. Watch the build log scroll. First deploy usually takes 2-4 minutes
4. On success, you'll see **🎉 Congratulations!** and your live URL:
   `https://my-app-xxxx.vercel.app`

If the build fails, check the log:

| Error | Fix |
|-------|-----|
| `DATABASE_URL is not defined` | Variable not added in Step 5; redo and redeploy |
| `Cannot find module 'X'` | Missing dependency; `pnpm add X` locally, push |
| `Type error: ...` | TypeScript error caught by build; fix locally first |
| `prepared statement "..." already exists` | `db/index.ts` missing `prepare: false`; fix and push |

## Step 7: Update Supabase URL Configuration

Now that you have a production URL, update Supabase to allow auth callbacks to it.

1. Open **Supabase Dashboard → Authentication → URL Configuration**
2. **Site URL**: change to `https://my-app-xxxx.vercel.app`
3. **Redirect URLs**: add these lines (keep existing ones):
   ```
   https://my-app-xxxx.vercel.app/**
   https://*-my-app-xxxx.vercel.app/**
   ```
   (The second line whitelists preview deployment URLs.)
4. Click **Save**

If you set up OAuth (Google/GitHub/Kakao), also update the callback URL in those provider dashboards.

## Step 8: Test the Production Deployment

1. Open your Vercel URL in an **incognito window** (avoid stale dev cookies)
2. Sign up for a new account
3. Confirm via email link — should redirect to your production site
4. Open the dashboard / protected route — should work
5. Open Supabase Dashboard → Authentication → Users — your new user should be there

If signup hangs or redirects to localhost:
- Re-check Step 7: Site URL must match exactly, including `https://`
- Hard-refresh the browser (Vercel may have cached an old deploy)

## Step 9: Set the Custom Site URL Variable

Now that you know your URL:

1. Vercel Dashboard → your project → **Settings** → **Environment Variables**
2. Find `NEXT_PUBLIC_SITE_URL` (or add if missing)
3. **Production** value: `https://my-app-xxxx.vercel.app`
4. **Preview** value: leave blank or use `${VERCEL_URL}` placeholder
5. **Redeploy** to apply: Deployments tab → ⋯ on latest → **Redeploy**

## Step 10: Add a Custom Domain (Optional)

1. Vercel Dashboard → your project → **Settings** → **Domains**
2. Type your domain (e.g. `my-app.com`) → **Add**
3. Vercel shows DNS records to set up:
   - For apex domain: an A record pointing to Vercel's IP
   - For subdomain (e.g. `app.my-app.com`): a CNAME pointing to `cname.vercel-dns.com`
4. Add these records at your DNS registrar (Cloudflare, Namecheap, GoDaddy, etc.)
5. DNS propagation takes 5 minutes to a few hours
6. Once Vercel shows ✅ **Valid Configuration**, your custom domain is live
7. **Update Supabase URL Configuration again** with the custom domain
8. **Update `NEXT_PUBLIC_SITE_URL`** in Vercel env vars to the custom domain
9. Redeploy

## How Continuous Deployment Works

Once connected:

```
git push origin main           → triggers Production deploy
git push origin feature/foo    → triggers Preview deploy with unique URL
Open a Pull Request            → Vercel comments with the Preview URL
Merge the PR to main           → Production deploys automatically
```

Every deployment is permanent and addressable. To roll back:
- Vercel Dashboard → Deployments → find a previous good one → ⋯ → **Promote to Production**

## Database Migrations on Deploy

Two strategies — pick one:

### Strategy A: Manual Push (simpler, prototype-only)

You run `pnpm db:push` locally before deploying. Easy but error-prone — easy to ship code that expects a column the DB doesn't have.

### Strategy B: Migrations as Build Step (recommended for production)

Generate SQL migration files and run them during the Vercel build:

1. Generate migrations once you have a stable schema:
   ```bash
   pnpm db:generate
   git add drizzle/
   git commit -m "add migration"
   ```
2. Update `package.json` build script:
   ```json
   "scripts": {
     "build": "drizzle-kit migrate && next build"
   }
   ```
3. Push. Vercel will run migrations before building. If a migration fails, the build fails — bad code never deploys.

## Monitoring and Logs

Vercel Dashboard → your project → **Logs** tab shows:

- Real-time function invocations (Server Actions, Route Handlers)
- `console.log` / `console.error` output
- Build logs from the most recent deploy
- Edge function logs if you set `runtime = 'edge'`

For long-term log retention:
- **Pro plan**: 30 days
- **Hobby**: 1 hour

For real production monitoring, add **Sentry**:
```bash
pnpm add @sentry/nextjs
pnpm dlx @sentry/wizard@latest -i nextjs
```

## Cost Awareness (Hobby Plan)

| Limit | Free Hobby |
|-------|-----------|
| Bandwidth | 100 GB/month |
| Function invocations | 100k/month |
| Function execution time | Up to 60s per call |
| Build hours | 6,000 minutes/month |
| Team members | 1 (you) |

Most personal projects stay well under these. If you exceed:
- Vercel emails you a warning at 80%
- Some features pause until next month or you upgrade to **Pro** ($20/month)

## Common Failures & Fixes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Build: `DATABASE_URL is not defined` | Env var not added | Vercel Settings → Env Vars → add → Redeploy |
| Build: `prepared statement already exists` | `db/index.ts` missing `prepare: false` | Add `{ prepare: false }` to `postgres()` call |
| OAuth redirects to localhost in prod | Supabase Site URL still points to localhost | Update Site URL in Supabase Auth settings |
| Cookies not persisting after login | `src/middleware.ts` missing or matcher wrong | Verify file exists and matcher includes routes |
| 500 error on Server Actions | Wrong Supabase keys for environment | Re-check env vars; service_role key needed for some operations |
| Page shows old data | Forgot `revalidatePath` after mutation | Add `revalidatePath('/posts')` after every DB write |
| Service role key leaked | Used `NEXT_PUBLIC_` prefix by mistake | Remove `NEXT_PUBLIC_`, regenerate key in Supabase, redeploy |
| Build fails with `Module not found: X` | Dependency in `dependencies` not `devDependencies` (or vice versa) | Move it; reinstall; push |

## Quick Reference

**Vercel CLI** (optional, useful for local testing):
```bash
pnpm i -g vercel
vercel link        # link this folder to a Vercel project
vercel env pull    # pull env vars to .env.local
vercel             # deploy a preview from your machine
vercel --prod      # deploy to production from your machine
```

**Manual redeploy without code change**:
- Vercel Dashboard → Deployments → ⋯ on latest → **Redeploy**

**Disable auto-deploy on push**:
- Settings → Git → **Ignored Build Step**: add a script that returns 0 to skip

---

**Done.** Your app is live, auto-deploys on every push, and is connected to Supabase. Next: monitor with `qa` skill or set up Sentry for error tracking.
