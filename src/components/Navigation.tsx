import { NavLink } from 'react-router-dom';
import { Home, Swords, User, Award } from 'lucide-react';
import clsx from 'clsx';

import { useAuth } from '../App';
import Logo from './Logo';
import { useTranslation } from '../i18n';

export default function Navigation() {
  const { theme, language } = useAuth();
  const t = useTranslation(language);

  const links = [
    { to: '/', icon: Home, label: t('nav.dashboard') },
    { to: '/play', icon: Swords, label: t('nav.play') },
    { to: '/leaderboard', icon: Award, label: t('nav.rankings') },
    { to: '/profile', icon: User, label: t('nav.profile') },
  ];

  return (
    <>
      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-[120] md:hidden">
        <div
          className="pointer-events-auto mx-auto mb-3 w-[min(94vw,26rem)] rounded-[2rem] border p-2 backdrop-blur-[30px] backdrop-saturate-150"
          style={{ marginBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
        >
          <div
            className={clsx(
              'relative overflow-hidden rounded-[1.6rem] border',
              theme === 'dark'
                ? 'border-white/12 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))] shadow-[0_20px_50px_rgba(0,0,0,0.38)]'
                : 'border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(255,255,255,0.62))] shadow-[0_20px_50px_rgba(15,23,42,0.12)]',
            )}
          >
            <div
              className={clsx(
                'pointer-events-none absolute inset-x-6 top-1 h-9 rounded-full blur-2xl',
                theme === 'dark' ? 'bg-white/20' : 'bg-white/90',
              )}
            />
            <div
              className={clsx(
                'pointer-events-none absolute inset-0',
                theme === 'dark'
                  ? 'bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_55%)]'
                  : 'bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),transparent_55%)]',
              )}
            />

            <ul className="relative grid grid-cols-4 gap-1">
              {links.map(({ to, icon: Icon, label }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      clsx(
                        'flex min-h-[4.4rem] flex-col items-center justify-center rounded-[1.3rem] px-2 py-2 transition-all',
                        isActive
                          ? theme === 'dark'
                            ? 'bg-white/10 text-emerald-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                            : 'bg-white/80 text-emerald-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]'
                          : theme === 'dark'
                            ? 'text-zinc-400 hover:bg-white/5 hover:text-white'
                            : 'text-zinc-500 hover:bg-white/55 hover:text-zinc-900',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={clsx(
                            'mb-1.5 flex h-9 w-9 items-center justify-center rounded-full transition-all',
                            isActive
                              ? theme === 'dark'
                                ? 'bg-emerald-500/14 text-emerald-400'
                                : 'bg-emerald-500/12 text-emerald-600'
                              : 'bg-transparent',
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="text-[10px] font-semibold tracking-[0.12em]">{label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </nav>

      <nav
        className={clsx(
          'fixed bottom-0 left-0 top-0 hidden w-64 flex-col border-r p-6 md:flex',
          theme === 'dark' ? 'border-white/5 bg-zinc-900/50' : 'border-zinc-200 bg-white',
        )}
      >
        <div className="mb-12 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500">
            <Logo className="h-6 w-6 text-zinc-950" />
          </div>
          <h1 className={clsx('text-xl font-bold tracking-tight', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
            PingProPrivate
          </h1>
        </div>
        <ul className="flex flex-col gap-2">
          {links.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-4 rounded-xl px-4 py-3 transition-all',
                    isActive
                      ? 'bg-emerald-500/10 font-medium text-emerald-500'
                      : clsx(
                          'hover:bg-zinc-500/5',
                          theme === 'dark'
                            ? 'text-zinc-400 hover:text-zinc-200'
                            : 'text-zinc-600 hover:text-zinc-900',
                        ),
                  )
                }
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
