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
      {/* Mobile Navigation */}
      <nav className={clsx(
        "md:hidden fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t z-50",
        theme === 'dark' ? "bg-zinc-900/80 border-white/10" : "bg-white/80 border-zinc-200"
      )}>
        <ul className="flex justify-around items-center h-16 px-2">
          {links.map(({ to, icon: Icon, label }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                className={({ isActive }) =>
                  clsx(
                    'flex flex-col items-center justify-center w-full h-14 rounded-xl transition-all',
                    isActive ? 'text-emerald-500' : 'text-zinc-500 hover:text-zinc-400'
                  )
                }
              >
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-[9px] font-medium uppercase tracking-wider">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Desktop Navigation */}
      <nav className={clsx(
        "hidden md:flex flex-col fixed top-0 left-0 bottom-0 w-64 border-r p-6",
        theme === 'dark' ? "bg-zinc-900/50 border-white/5" : "bg-white border-zinc-200"
      )}>
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
            <Logo className="w-6 h-6 text-zinc-950" />
          </div>
          <h1 className={clsx("text-xl font-bold tracking-tight", theme === 'dark' ? "text-white" : "text-zinc-900")}>PingProPrivate</h1>
        </div>
        <ul className="flex flex-col gap-2">
          {links.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-4 px-4 py-3 rounded-xl transition-all',
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-500 font-medium'
                      : clsx('hover:bg-zinc-500/5', theme === 'dark' ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-600 hover:text-zinc-900')
                  )
                }
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
