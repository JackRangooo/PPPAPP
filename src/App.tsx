import React, { createContext, startTransition, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import Leaderboard from './pages/Leaderboard';
import Login from './pages/Login';
import MatchDetails from './pages/MatchDetails';
import Play from './pages/Play';
import PlayerProfile from './pages/PlayerProfile';
import Profile from './pages/Profile';
import { ensureProfile, fetchProfile, updateProfilePreferences } from './lib/api';
import { subscribeToTable, supabase } from './lib/supabase';
import type { Language, Theme, UserProfile } from './types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  theme: Theme;
  language: Language;
  toggleTheme: () => Promise<void>;
  setLanguage: (lang: Language) => Promise<void>;
  signIn: (email: string) => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const applyThemeToDocument = (theme: Theme) => {
  if (theme === 'light') {
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.remove('light');
  }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<Theme>('dark');
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    let active = true;
    let stopProfileSubscription: (() => void) | null = null;

    const applySignedOutState = () => {
      if (!active) return;
      setUser(null);
      setUserProfile(null);
      setTheme('dark');
      setLanguageState('en');
      applyThemeToDocument('dark');
      setLoading(false);
      stopProfileSubscription?.();
      stopProfileSubscription = null;
    };

    const refreshProfile = async (userId: string) => {
      const profile = await fetchProfile(userId);
      if (!active) return;

      if (profile) {
        setUserProfile(profile);
        setTheme(profile.theme);
        setLanguageState(profile.language);
        applyThemeToDocument(profile.theme);
      } else {
        setUserProfile(null);
        setTheme('dark');
        setLanguageState('en');
        applyThemeToDocument('dark');
      }
    };

    const syncSignedInState = async (currentUser: User) => {
      if (!active) return;
      setUser(currentUser);
      setLoading(true);

      try {
        await ensureProfile(currentUser);
        await refreshProfile(currentUser.id);

        stopProfileSubscription?.();
        stopProfileSubscription = subscribeToTable(
          'profiles',
          () => {
            void refreshProfile(currentUser.id).catch((error) => {
              console.error('Failed to refresh profile', error);
            });
          },
          `id=eq.${currentUser.id}`,
        );
      } catch (error) {
        console.error('Failed to load profile', error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void supabase.auth.getSession().then(({ data }) => {
      const currentUser = data.session?.user ?? null;
      if (currentUser) {
        void syncSignedInState(currentUser);
      } else {
        applySignedOutState();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      startTransition(() => {
        const currentUser = session?.user ?? null;
        if (currentUser) {
          void syncSignedInState(currentUser);
        } else {
          applySignedOutState();
        }
      });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
      stopProfileSubscription?.();
    };
  }, []);

  const toggleTheme = async () => {
    if (!user || !userProfile) return;
    const newTheme: Theme = theme === 'dark' ? 'light' : 'dark';

    setTheme(newTheme);
    setUserProfile({ ...userProfile, theme: newTheme });
    applyThemeToDocument(newTheme);
    await updateProfilePreferences(user.id, { theme: newTheme });
  };

  const setLanguage = async (lang: Language) => {
    if (!user || !userProfile) return;
    setLanguageState(lang);
    setUserProfile({ ...userProfile, language: lang });
    await updateProfilePreferences(user.id, { language: lang });
  };

  const signIn = async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      throw error;
    }
  };

  const logOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, theme, language, toggleTheme, setLanguage, signIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};

const ProtectedRoute = () => {
  const { user, loading, theme } = useAuth();

  if (loading) {
    return (
      <div
        className={clsx(
          'min-h-screen flex items-center justify-center transition-colors duration-300',
          theme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900',
        )}
      >
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

const Layout = () => {
  const { theme } = useAuth();

  return (
    <div
      className={clsx(
        'min-h-screen font-sans pb-20 md:pb-0 md:pl-64 transition-colors duration-300',
        theme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900',
      )}
    >
      <Navigation />
      <main className="max-w-3xl mx-auto p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/play" element={<Play />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/player/:uid" element={<PlayerProfile />} />
              <Route path="/match/:id" element={<MatchDetails />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}


