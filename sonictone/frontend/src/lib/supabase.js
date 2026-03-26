/**
 * supabase.js
 * -----------
 * Initializes and exports the Supabase client used throughout the app.
 *
 * ⚠️  VERCEL DEPLOYMENT: You MUST add these two environment variables in your
 *     Vercel project dashboard → Settings → Environment Variables:
 *       VITE_SUPABASE_URL       = your Supabase project URL
 *       VITE_SUPABASE_ANON_KEY  = your Supabase anon/public key
 *
 *     These values live in frontend/.env.local for local development,
 *     but that file is NOT committed to git (it's in .gitignore).
 *
 * Vite exposes only variables prefixed with VITE_ to the browser bundle.
 */

import { createClient } from '@supabase/supabase-js'

// Read credentials from Vite env at build time
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Warn loudly in console but do NOT throw — throwing here crashes the entire
// React tree before it can mount, causing a blank/white screen on Vercel
// when the env vars are missing from the project settings.
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '[SonicTone] Missing Supabase env vars!\n' +
    'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your Vercel ' +
    'project environment variables (Settings → Environment Variables).\n' +
    'For local dev, add them to frontend/.env.local'
  )
}

// Export a single shared Supabase client instance
// createClient is safe to call even with undefined values — it will simply
// fail on the first network request, making errors visible in the UI rather
// than causing a silent blank screen.
export const supabase = createClient(
  SUPABASE_URL  ?? '',
  SUPABASE_ANON_KEY ?? ''
)