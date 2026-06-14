# Deploy GMAT Prep — first-time, step by step

Goal: a clickable, shareable URL with accounts. Stack: **GitHub** (code) → **Vercel** (hosting) → **Supabase** (database + auth). All three have a free tier that's plenty. ~30–40 min.

> Nothing here pushes secrets: `.env.local` is git-ignored. `.env.example` only contains the *local* demo keys (public).

---

## Step 1 — Put the code on GitHub

1. Create an account: https://github.com/signup
2. Create a **new empty repo** (no README, no .gitignore): https://github.com/new — name `gmat-prep`, Private is fine.
3. In a terminal, from `~/gmat-prep`, connect and push **main**:
   ```bash
   git remote add origin https://github.com/<your-username>/gmat-prep.git
   git push -u origin main
   ```
   When prompted: **username** = your GitHub username, **password** = a **Personal Access Token** (not your login password).
   Create one: https://github.com/settings/tokens → *Generate new token (classic)* → check scope **`repo`** → generate → copy → paste as the password.

✅ Done when your code shows on github.com.

---

## Step 2 — Create the Supabase project (database + auth)

1. Sign up (use **Continue with GitHub** — fastest): https://supabase.com
2. **New project** → name it, pick a region near you, set a strong DB password (save it). Wait ~2 min.
3. **Project Settings → API** — copy these three (used in Steps 3 & 4):
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ secret — server only)
4. **Apply the schema** — open **SQL Editor → New query**, paste the entire contents of [`supabase/hosted-setup.sql`](supabase/hosted-setup.sql), click **Run**.
   *(Tracked alternative if you prefer the CLI: `npx supabase login` → `npx supabase link --project-ref <ref>` → `npx supabase db push`.)*
5. **Enable auth** — Authentication → Providers:
   - **Email**: ON (powers the magic link)
   - **Anonymous sign-ins**: ON (guest mode)
   - Email sending: the built-in works for testing; add SMTP later for real volume.

✅ Done when Table Editor shows `questions`, `study_plans`, etc.

---

## Step 3 — Seed the content into the hosted DB

From `~/gmat-prep`, one command (uses your hosted keys inline — does **not** touch your local `.env.local`):
```bash
NEXT_PUBLIC_SUPABASE_URL="https://<ref>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<your service_role key>" \
npm run seed
```
✅ Done when it prints `Seed complete — 2 groups, 23 questions, 14 learn articles.`

---

## Step 4 — Deploy on Vercel

1. Sign up with **Continue with GitHub**: https://vercel.com
2. **Add New → Project** → import your `gmat-prep` repo. Framework auto-detects as Next.js.
3. Expand **Environment Variables** and add the three from Step 2.3:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. **Deploy**. You'll get a URL like `https://gmat-prep-xxxx.vercel.app`.

✅ Done when the URL opens the app.

---

## Step 5 — Point Supabase auth at the live URL

Supabase → Authentication → **URL Configuration**:
- **Site URL**: `https://<your-app>.vercel.app`
- **Redirect URLs** (add both):
  - `https://<your-app>.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback` (so local sign-in still works)

✅ Save.

---

## Step 6 — Verify end-to-end

Open the Vercel URL → take the diagnostic → set a goal → **Account → enter your email** → click the link in your inbox → you're signed in and your plan/history follow you. Try it from your phone too.

---

## After this

- **Auto-deploy:** every `git push` to `main` redeploys automatically.
- **Custom domain:** Vercel → Settings → Domains.
- **Updating content:** edit `/content`, re-run the Step 3 seed command, and `git push`.
