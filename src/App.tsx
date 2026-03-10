import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';

import Navigation from './components/Navigation';
import SplashScreen from './components/SplashScreen';
import Dashboard from './pages/Dashboard';
import Leaderboard from './pages/Leaderboard';
import Login from './pages/Login';
import MatchDetails from './pages/MatchDetails';
import Play from './pages/Play';
import PlayerProfile from './pages/PlayerProfile';
import Profile from './pages/Profile';
import {
  clearStoredSession,
  getStoredSession,
  loginWithPassword,
  logoutSession,
  registerWithPassword,
  restoreSession,
  storeSession,
  updateProfilePreferences,
} from './lib/api';
import type { AppSession, Language, Theme, UserProfile } from './types';

interface AuthContextType {
  user: AppSession | null;
  userProfile: UserProfile | null;
  loading: boolean;
  booting: boolean;
  theme: Theme;
  language: Language;
  toggleTheme: () => Promise<void>;
  setLanguage: (lang: Language) => Promise<void>;
  syncProfile: (profile: UserProfile) => void;
  signIn: (nickname: string, password: string) => Promise<void>;
  signUp: (nickname: string, password: string) => Promise<void>;
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

const applyProfileState = (
  profile: UserProfile | null,
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>,
  setTheme: React.Dispatch<React.SetStateAction<Theme>>,
  setLanguageState: React.Dispatch<React.SetStateAction<Language>>,
) => {
  if (!profile) {
    setUserProfile(null);
    setTheme('dark');
    setLanguageState('en');
    applyThemeToDocument('dark');
    return;
  }

  setUserProfile(profile);
  setTheme(profile.theme);
  setLanguageState(profile.language);
  applyThemeToDocument(profile.theme);
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AppSession | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [booting, setBooting] = useState(true);
  const [theme, setTheme] = useState<Theme>('dark');
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    let active = true;

    const hydrateSignedOutState = () => {
      if (!active) return;
      clearStoredSession();
      setUser(null);
      applyProfileState(null, setUserProfile, setTheme, setLanguageState);
    };

    const hydrateSignedInState = (session: AppSession, profile: UserProfile) => {
      if (!active) return;
      storeSession(session);
      setUser(session);
      applyProfileState(profile, setUserProfile, setTheme, setLanguageState);
    };

    const initialize = async () => {
      const splashDelay = new Promise((resolve) => window.setTimeout(resolve, 1200));
      const storedSession = getStoredSession();

      try {
        if (storedSession?.token) {
          const restored = await restoreSession(storedSession.token);
          if (restored) {
            hydrateSignedInState(restored.session, restored.profile);
          } else {
            hydrateSignedOutState();
          }
        } else {
          hydrateSignedOutState();
        }
      } catch (error) {
        console.error('Failed to restore local session', error);
        hydrateSignedOutState();
      } finally {
        await splashDelay;
        if (active) {
          setLoading(false);
          setBooting(false);
        }
      }
    };

    void initialize();

    return () => {
      active = false;
    };
  }, []);

  const toggleTheme = async () => {
    if (!userProfile) return;

    const nextTheme: Theme = userProfile.theme === 'dark' ? 'light' : 'dark';
    const previousProfile = userProfile;

    applyProfileState({ ...userProfile, theme: nextTheme }, setUserProfile, setTheme, setLanguageState);

    try {
      const updatedProfile = await updateProfilePreferences({ theme: nextTheme });
      applyProfileState(updatedProfile, setUserProfile, setTheme, setLanguageState);
    } catch (error) {
      console.error('Failed to update theme', error);
      applyProfileState(previousProfile, setUserProfile, setTheme, setLanguageState);
      throw error;
    }
  };

  const setLanguage = async (lang: Language) => {
    if (!userProfile) return;

    const previousProfile = userProfile;
    applyProfileState({ ...userProfile, language: lang }, setUserProfile, setTheme, setLanguageState);

    try {
      const updatedProfile = await updateProfilePreferences({ language: lang });
      applyProfileState(updatedProfile, setUserProfile, setTheme, setLanguageState);
    } catch (error) {
      console.error('Failed to update language', error);
      applyProfileState(previousProfile, setUserProfile, setTheme, setLanguageState);
      throw error;
    }
  };

  const syncProfile = (profile: UserProfile) => {
    applyProfileState(profile, setUserProfile, setTheme, setLanguageState);
  };

  const signIn = async (nickname: string, password: string) => {
    setLoading(true);
    try {
      const payload = await loginWithPassword(nickname, password);
      storeSession(payload.session);
      setUser(payload.session);
      applyProfileState(payload.profile, setUserProfile, setTheme, setLanguageState);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (nickname: string, password: string) => {
    setLoading(true);
    try {
      const payload = await registerWithPassword(nickname, password);
      storeSession(payload.session);
      setUser(payload.session);
      applyProfileState(payload.profile, setUserProfile, setTheme, setLanguageState);
    } finally {
      setLoading(false);
    }
  };

  const logOut = async () => {
    const currentToken = user?.token;
    setLoading(true);

    try {
      if (currentToken) {
        await logoutSession(currentToken);
      }
    } finally {
      clearStoredSession();
      setUser(null);
      applyProfileState(null, setUserProfile, setTheme, setLanguageState);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        booting,
        theme,
        language,
        toggleTheme,
        setLanguage,
        syncProfile,
        signIn,
        signUp,
        logOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

const BusyScreen = () => {
  const { theme } = useAuth();

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
};

const MissingProfileState = () => {
  const { theme, logOut, language } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div
        className={clsx(
          'max-w-md w-full rounded-[2rem] border p-8 text-center',
          theme === 'dark' ? 'bg-zinc-900/60 border-white/10' : 'bg-white border-zinc-200 shadow-sm',
        )}
      >
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-5">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className={clsx('text-2xl font-bold mb-3', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
          {language === 'zh' ? '资料暂时不可用' : 'Profile unavailable'}
        </h1>
        <p className={clsx('text-sm font-medium mb-6', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500')}>
          {language === 'zh'
            ? '我们没能恢复你的资料。请重新登录一次，系统会重新同步账号数据。'
            : 'We could not restore your player profile. Sign out once and sign back in to resync your account.'}
        </p>
        <button
          onClick={() => {
            void logOut();
          }}
          className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 py-4 font-bold transition-colors"
        >
          {language === 'zh' ? '返回登录页' : 'Back to sign in'}
        </button>
      </div>
    </div>
  );
};

const ProtectedRoute = () => {
  const { user, loading, userProfile } = useAuth();

  if (loading) {
    return <BusyScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!userProfile) {
    return <MissingProfileState />;
  }

  return <Outlet />;
};

const Layout = () => {
  const { theme, userProfile } = useAuth();

  if (!userProfile) {
    return <MissingProfileState />;
  }

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

const AppRoutes = () => {
  const { booting, theme } = useAuth();

  if (booting) {
    return <SplashScreen theme={theme} />;
  }

  return (
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
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
