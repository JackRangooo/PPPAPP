import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
  );
}

export const APP_SESSION_STORAGE_KEY = 'pppapp.session';
export const APP_POLL_INTERVAL_MS = 15000;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const subscribeToTable = (
  _table: 'profiles' | 'matches' | 'tournaments',
  onChange: () => void,
  _filter?: string,
) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const runRefresh = () => {
    onChange();
  };

  const intervalId = window.setInterval(runRefresh, APP_POLL_INTERVAL_MS);
  const handleFocus = () => runRefresh();
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      runRefresh();
    }
  };

  window.addEventListener('focus', handleFocus);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    window.clearInterval(intervalId);
    window.removeEventListener('focus', handleFocus);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
};
