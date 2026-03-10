import { type FormEvent, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { KeyRound, LogIn, UserRound } from 'lucide-react';
import { motion } from 'motion/react';
import clsx from 'clsx';

import { useAuth } from '../App';
import Logo from '../components/Logo';
import { useTranslation } from '../i18n';

const NICKNAME_MIN_LENGTH = 3;
const PASSWORD_MIN_LENGTH = 8;

type AuthMode = 'login' | 'register';

export default function Login() {
  const { user, signIn, signUp, theme, language, loading } = useAuth();
  const t = useTranslation(language);
  const [mode, setMode] = useState<AuthMode>('login');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  if (user) {
    return <Navigate to="/" replace />;
  }

  const submitLabel = useMemo(() => {
    if (loading && mode === 'login') return t('login.loggingIn');
    if (loading && mode === 'register') return t('login.creatingAccount');
    return mode === 'login' ? t('login.loginAction') : t('login.registerAction');
  }, [loading, mode, t]);

  const validate = () => {
    const trimmedNickname = nickname.trim();

    if (!trimmedNickname) {
      return t('login.nicknameRequired');
    }

    if (trimmedNickname.length < NICKNAME_MIN_LENGTH) {
      return t('login.nicknameTooShort', { min: String(NICKNAME_MIN_LENGTH) });
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      return t('login.passwordTooShort', { min: String(PASSWORD_MIN_LENGTH) });
    }

    if (mode === 'register' && password !== confirmPassword) {
      return t('login.passwordMismatch');
    }

    return '';
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');

    try {
      if (mode === 'login') {
        await signIn(nickname.trim(), password);
      } else {
        await signUp(nickname.trim(), password);
      }
    } catch (submitError) {
      console.error('Authentication failed', submitError);
      setError(mode === 'login' ? t('login.loginFailed') : t('login.registerFailed'));
    }
  };

  return (
    <div
      className={clsx(
        'min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-300',
        theme === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50',
      )}
    >
      <div
        className={clsx(
          'absolute inset-0 opacity-40 blur-[110px]',
          theme === 'dark'
            ? 'bg-[radial-gradient(circle_at_20%_20%,_#064e3b_0%,_transparent_35%),radial-gradient(circle_at_80%_80%,_#78350f_0%,_transparent_25%)]'
            : 'bg-[radial-gradient(circle_at_20%_20%,_#10b981_0%,_transparent_32%),radial-gradient(circle_at_80%_80%,_#f59e0b_0%,_transparent_22%)]',
        )}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center max-w-md w-full"
      >
        <div
          className={clsx(
            'w-24 h-24 rounded-3xl flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(16,185,129,0.2)]',
            theme === 'dark'
              ? 'bg-emerald-500/10 border border-emerald-500/20'
              : 'bg-white border border-emerald-200',
          )}
        >
          <Logo className={clsx('w-14 h-14', theme === 'dark' ? 'text-emerald-400' : 'text-emerald-500')} />
        </div>

        <h1 className={clsx('text-4xl font-bold tracking-tighter mb-3 text-center', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
          PingProPrivate
        </h1>
        <p className={clsx('text-center mb-8 font-medium', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500')}>
          {t('login.subtitle')}
        </p>

        <div className={clsx('w-full p-1 rounded-2xl border mb-6', theme === 'dark' ? 'bg-zinc-900/80 border-white/10' : 'bg-white border-zinc-200 shadow-sm')}>
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={clsx(
                'py-3 rounded-xl text-sm font-bold transition-all',
                mode === 'login'
                  ? 'bg-emerald-500 text-zinc-950'
                  : theme === 'dark'
                    ? 'text-zinc-400 hover:text-white'
                    : 'text-zinc-500 hover:text-zinc-900',
              )}
            >
              {t('login.loginTab')}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={clsx(
                'py-3 rounded-xl text-sm font-bold transition-all',
                mode === 'register'
                  ? 'bg-amber-500 text-zinc-950'
                  : theme === 'dark'
                    ? 'text-zinc-400 hover:text-white'
                    : 'text-zinc-500 hover:text-zinc-900',
              )}
            >
              {t('login.registerTab')}
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <label className="block space-y-2">
            <span className={clsx('text-sm font-semibold', theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700')}>
              {t('login.nicknameLabel')}
            </span>
            <div
              className={clsx(
                'flex items-center gap-3 px-4 py-4 rounded-2xl border transition-colors',
                theme === 'dark'
                  ? 'bg-zinc-900/60 border-white/10 text-white'
                  : 'bg-white border-zinc-200 text-zinc-900 shadow-sm',
              )}
            >
              <UserRound className="w-5 h-5 text-emerald-500" />
              <input
                type="text"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder={t('login.nicknamePlaceholder')}
                className={clsx(
                  'flex-1 bg-transparent outline-none placeholder:text-zinc-500',
                  theme === 'dark' ? 'text-white' : 'text-zinc-900',
                )}
                autoComplete="username"
                maxLength={24}
              />
            </div>
          </label>

          <label className="block space-y-2">
            <span className={clsx('text-sm font-semibold', theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700')}>
              {t('login.passwordLabel')}
            </span>
            <div
              className={clsx(
                'flex items-center gap-3 px-4 py-4 rounded-2xl border transition-colors',
                theme === 'dark'
                  ? 'bg-zinc-900/60 border-white/10 text-white'
                  : 'bg-white border-zinc-200 text-zinc-900 shadow-sm',
              )}
            >
              <KeyRound className="w-5 h-5 text-emerald-500" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={t('login.passwordPlaceholder')}
                className={clsx(
                  'flex-1 bg-transparent outline-none placeholder:text-zinc-500',
                  theme === 'dark' ? 'text-white' : 'text-zinc-900',
                )}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
          </label>

          {mode === 'register' ? (
            <label className="block space-y-2">
              <span className={clsx('text-sm font-semibold', theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700')}>
                {t('login.confirmPasswordLabel')}
              </span>
              <div
                className={clsx(
                  'flex items-center gap-3 px-4 py-4 rounded-2xl border transition-colors',
                  theme === 'dark'
                    ? 'bg-zinc-900/60 border-white/10 text-white'
                    : 'bg-white border-zinc-200 text-zinc-900 shadow-sm',
                )}
              >
                <KeyRound className="w-5 h-5 text-amber-500" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder={t('login.confirmPasswordPlaceholder')}
                  className={clsx(
                    'flex-1 bg-transparent outline-none placeholder:text-zinc-500',
                    theme === 'dark' ? 'text-white' : 'text-zinc-900',
                  )}
                  autoComplete="new-password"
                />
              </div>
            </label>
          ) : null}

          {error ? <p className="text-sm font-medium text-red-500">{error}</p> : null}

          <div
            className={clsx(
              'rounded-2xl border p-4 text-sm font-medium',
              theme === 'dark'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700',
            )}
          >
            <div className="font-bold mb-1">{t('login.localFirstTitle')}</div>
            <div>{t(mode === 'login' ? 'login.loginHint' : 'login.registerHint')}</div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={clsx(
              'w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-semibold text-lg transition-colors active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed',
              mode === 'login'
                ? theme === 'dark'
                  ? 'bg-white text-zinc-950 hover:bg-zinc-200'
                  : 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-md'
                : 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400 shadow-md',
            )}
          >
            <LogIn className="w-5 h-5" />
            {submitLabel}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

