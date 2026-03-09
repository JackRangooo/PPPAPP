# PingProPrivate

This project has been migrated away from Firebase and now uses:

- Vercel for frontend hosting
- Supabase for auth, database, and realtime updates

## Local setup

1. Install dependencies:
   `npm install`
2. Create a Supabase project.
3. In the Supabase SQL editor, run [`supabase/schema.sql`](./supabase/schema.sql).
4. In Supabase Auth settings, add these redirect URLs:
   - `http://localhost:3000`
   - your Vercel production URL
5. Copy [.env.example](./.env.example) to `.env.local` and set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Start the app:
   `npm run dev`

## Auth model

The app now uses Supabase email magic-link login.
On first login, a profile row is created automatically by the SQL trigger.
Users can rename themselves inside the app after signing in.

## Database model

Main tables created by [`supabase/schema.sql`](./supabase/schema.sql):

- `profiles`
- `matches`
- `tournaments`

The SQL file also sets up:

- Row Level Security policies
- match/tournament RPC functions
- realtime publication entries
- a starter weekly tournament row

## Deploy to Vercel

1. Create a new Vercel project from this codebase.
2. Use the default Vite build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
3. Add the same environment variables used locally:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. After the first deploy, add the final Vercel URL to Supabase Auth redirect URLs.

`vercel.json` includes an SPA rewrite so routes like `/match/:id` work on refresh.

## Migration notes

- Firebase SDK usage has been removed from the app code.
- Google Sign-In has been replaced with Supabase email login.
- Firebase config/rules files are no longer needed after this migration.
