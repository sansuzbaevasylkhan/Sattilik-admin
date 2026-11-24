# Sattilik Admin

Next.js admin panel for the Sattilik platform (drivers, orders, payouts, dashboard).

## Tech stack

- Next.js 16 (App Router) + React 19
- TypeScript, Tailwind CSS v4
- `@base-ui/react` for accessible UI primitives
- Supabase (Postgres + Auth + Realtime)
- Leaflet / Recharts

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

   Then fill in the Supabase values from
   [Supabase Dashboard → Project Settings → API](https://supabase.com/dashboard).

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Supabase schema

Run the SQL in `sql/admin-supplemental.sql` against your Supabase project
**once** before the first deploy. This creates the `payments` and
`admin_settings` tables, seeds the default commission, and enables
realtime on `orders`.

## Deploy to Vercel

1. Push this repository to GitHub (already configured as
   `https://github.com/sansuzbaevasylkhan/sattilik-admin.git`).
2. In [Vercel](https://vercel.com/new), click **"Add New Project"** and
   import the `sattilik-admin` repository.
3. In **Environment Variables**, add:

   | Name                              | Value                                  |
   | --------------------------------- | -------------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`        | your Supabase project URL              |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | your Supabase anon key                 |

4. Click **Deploy**. Vercel will detect Next.js automatically and run
   `next build`. Subsequent pushes to `main` will redeploy automatically.

## Learn more

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
