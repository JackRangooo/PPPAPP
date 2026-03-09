import { type FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { LogIn, Mail } from 'lucide-react';
import { motion } from 'motion/react';
import clsx from 'clsx';

import { useAuth } from '../App';
import Logo from '../components/Logo';
import { useTranslation } from '../i18n';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const { user, signIn, theme, language } = useAuth();
  const t = useTranslation(language);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sentEmail, setSentEmail] = useState('');

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError(t('login.emailRequired'));
      return;
    }

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError(t('login.invalidEmail'));
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await signIn(normalizedEmail);
      setSentEmail(normalizedEmail);
    } catch (submitError) {
      console.error('Error sending sign-in link', submitError);
      setError(t('login.failed'));
    } finally {
      setSubmitting(false);
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
          'absolute inset-0 opacity-30 blur-[100px]',
          theme === 'dark'
            ? 'bg-[radial-gradient(circle_at_50%_30%,_#064e3b_0%,_transparent_60%)]'
            : 'bg-[radial-gradient(circle_at_50%_30%,_#10b981_0%,_transparent_60%)]',
        )}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center max-w-sm w-full"
      >
        <div
          className={clsx(
            'w-24 h-24 rounded-3xl flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(16,185,129,0.2)]',
            theme === 'dark'
              ? 'bg-emerald-500/10 border border-emerald-500/20'
              : 'bg-emerald-50 border border-emerald-200',
          )}
        >
          <Logo className={clsx('w-14 h-14', theme === 'dark' ? 'text-emerald-400' : 'text-emerald-500')} />
        </div>

        <h1 className={clsx('text-4xl font-bold tracking-tighter mb-3 text-center', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
          PingProPrivate
        </h1>
        <p className={clsx('text-center mb-10 font-medium', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500')}>
          {t('login.subtitle')}
        </p>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <label className="block space-y-2">
            <span className={clsx('text-sm font-semibold', theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700')}>
              {t('login.emailLabel')}
            </span>
            <div
              className={clsx(
                'flex items-center gap-3 px-4 py-4 rounded-2xl border transition-colors',
                theme === 'dark'
                  ? 'bg-zinc-900/60 border-white/10 text-white'
                  : 'bg-white border-zinc-200 text-zinc-900 shadow-sm',
              )}
            >
              <Mail className="w-5 h-5 text-emerald-500" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t('login.emailPlaceholder')}
                className={clsx(
                  'flex-1 bg-transparent outline-none placeholder:text-zinc-500',
                  theme === 'dark' ? 'text-white' : 'text-zinc-900',
                )}
                autoComplete="email"
              />
            </div>
          </label>

          {error ? <p className="text-sm font-medium text-red-500">{error}</p> : null}

          {sentEmail ? (
            <div
              className={clsx(
                'rounded-2xl border p-4 text-sm font-medium',
                theme === 'dark'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-700',
              )}
            >
              <div className="font-bold mb-1">{t('login.sentTitle')}</div>
              <div>{t('login.sentBody', { email: sentEmail })}</div>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className={clsx(
              'w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-semibold text-lg transition-colors active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed',
              theme === 'dark'
                ? 'bg-white text-zinc-950 hover:bg-zinc-200'
                : 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-md',
            )}
          >
            <LogIn className="w-5 h-5" />
            {submitting ? t('login.sending') : t('login.submit')}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

