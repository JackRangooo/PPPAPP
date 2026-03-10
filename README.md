# PingProPrivate

PingProPrivate now runs as a Vite frontend deployed on Vercel with Supabase as the hosted database/API layer.
The app no longer depends on Firebase, Google Cloud, Google OAuth, or email magic-link login.

## Local setup

1. Install dependencies:
   `npm install`
2. Create a Supabase project.
3. In the Supabase SQL editor, run [`supabase/schema.sql`](./supabase/schema.sql).
4. Copy [.env.example](./.env.example) to `.env.local` and set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Start the app:
   `npm run dev`

## Auth model

The app now uses nickname + password authentication backed by Supabase Postgres RPCs.
Passwords are stored as hashes in the `profiles.password_hash` column and browser login state is kept in a long-lived app session token saved locally.

Current product flow:

- show a splash/logo animation on launch
- restore the local session if one is still valid
- otherwise send the user to the login/register screen
- register with nickname + password and sign in immediately
- keep the device signed in until the user logs out or the session expires

## Database model

Main tables created by [`supabase/schema.sql`](./supabase/schema.sql):

- `profiles`
- `matches`
- `tournaments`
- `app_sessions`

The SQL file also sets up:

- nickname/password auth RPCs
- custom session restore/logout RPCs
- match and tournament RPCs
- row-level security with RPC-only access
- starter weekly tournament data

## Deploy to Vercel

1. Create a new Vercel project from this codebase.
2. Use the default Vite build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
3. Add the same environment variables used locally:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. `vercel.json` already contains the SPA rewrite needed for client-side routes.

## Migration notes

- Existing email magic-link users from the earlier Supabase Auth version may already have profile rows but no local password yet.
- Those users should either register a fresh nickname/password account or be migrated manually by assigning a `nickname` and `password_hash` in Supabase.
- After updating the SQL schema, re-run the app so the new RPC layer and stored-session flow are used end to end.
