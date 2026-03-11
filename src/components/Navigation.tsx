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
          className={clsx(
            'pointer-events-auto relative w-full overflow-hidden rounded-t-[2rem] border-x border-t px-3 pt-2 backdrop-blur-[30px] backdrop-saturate-150',
            theme === 'dark'
              ? 'border-white/10 bg-[linear-gradient(180deg,rgba(47,63,92,0.32),rgba(14,18,28,0.94)_36%,rgba(8,10,16,0.98))] shadow-[0_-18px_40px_rgba(2,6,23,0.24),inset_0_1px_0_rgba(255,255,255,0.14)]'
              : 'border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.44),rgba(245,247,255,0.78)_36%,rgba(244,244,245,0.98))] shadow-[0_-10px_28px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.88)]',
          )}
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.45rem)' }}
        >
          <span
            className={clsx(
              'pointer-events-none absolute inset-x-8 top-1 h-8 rounded-full blur-2xl',
              theme === 'dark'
                ? 'bg-[linear-gradient(90deg,rgba(255,255,255,0.26),rgba(255,255,255,0.06),rgba(255,255,255,0.22))]'
                : 'bg-[linear-gradient(90deg,rgba(255,255,255,0.94),rgba(255,255,255,0.38),rgba(255,255,255,0.84))]',
            )}
          />
          <span
            className={clsx(
              'pointer-events-none absolute inset-0',
              theme === 'dark'
                ? 'bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.14),transparent_32%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_32%)]'
                : 'bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.12),transparent_32%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.1),transparent_32%)]',
            )}
          />
          <ul className="grid grid-cols-4 gap-1">
            {links.map(({ to, icon: Icon, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    clsx(
                      'flex min-h-[4.35rem] flex-col items-center justify-center rounded-[1.2rem] px-2 py-2 transition-all',
                      isActive
                        ? theme === 'dark'
                          ? 'bg-white/9 text-emerald-400'
                          : 'bg-white text-emerald-600 shadow-[0_6px_16px_rgba(15,23,42,0.08)]'
                        : theme === 'dark'
                          ? 'text-zinc-400 hover:bg-white/4 hover:text-white'
                          : 'text-zinc-500 hover:bg-white/70 hover:text-zinc-900',
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

