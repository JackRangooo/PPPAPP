import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Swords, Trophy } from 'lucide-react';
import clsx from 'clsx';

import CasualMatch from './CasualMatch';
import Tournaments from './Tournaments';
import SportToggle from '../components/SportToggle';
import { useAuth } from '../App';
import { getSportShortLabel } from '../lib/sports';
import { useTranslation } from '../i18n';

export default function Play() {
  const location = useLocation();
  const { theme, language, sport, setSport } = useAuth();
  const t = useTranslation(language);
  const [activeTab, setActiveTab] = useState<'casual' | 'ranked'>(
    location.state?.tab === 'ranked' ? 'ranked' : 'casual',
  );
  const [search, setSearch] = useState('');
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollTop(window.scrollY || document.documentElement.scrollTop || 0);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const compact = scrollTop > 18;
  const hideSearch = scrollTop > 64;
  const hidden = scrollTop > 210;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <header
        className={clsx(
          '-mx-4 -mt-4 sticky top-0 z-40 pb-1 transition-all duration-300 md:mx-0 md:mt-0',
          hidden ? 'pointer-events-none -translate-y-[calc(100%+0.75rem)] opacity-0' : 'translate-y-0 opacity-100',
        )}
      >
        <div
          className={clsx(
            'relative overflow-hidden border px-4 backdrop-blur-[24px] backdrop-saturate-150 transition-all duration-300 md:rounded-[2rem] md:border',
            'rounded-b-[1.45rem] border-x-0 border-t-0',
            compact ? 'pb-2.5' : 'pb-3.5',
            theme === 'dark'
              ? 'border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.88),rgba(10,13,21,0.76))] shadow-[0_14px_30px_rgba(2,6,23,0.22),inset_0_1px_0_rgba(255,255,255,0.12)]'
              : 'border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(244,247,255,0.8))] shadow-[0_12px_24px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.92)]',
          )}
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.25rem)' }}
        >
          <span
            className={clsx(
              'pointer-events-none absolute inset-x-10 top-1 h-6 rounded-full blur-2xl',
              theme === 'dark'
                ? 'bg-[linear-gradient(90deg,rgba(16,185,129,0.14),rgba(255,255,255,0.06),rgba(59,130,246,0.1))]'
                : 'bg-[linear-gradient(90deg,rgba(16,185,129,0.08),rgba(255,255,255,0.84),rgba(59,130,246,0.08))]',
            )}
          />

          <div className="relative">
            <div className={clsx('mb-2.5 flex items-end justify-between gap-4', compact ? 'items-center' : 'items-end')}>
              <div>
                <h1 className={clsx(compact ? 'text-[1.75rem]' : 'text-[2rem]', 'font-bold tracking-tight', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                  {t('nav.play')}
                </h1>
                <p className={clsx('mt-0.5 text-xs font-medium', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500')}>
                  {getSportShortLabel(sport, language)}
                </p>
              </div>
            </div>

            <div
              className={clsx(
                'overflow-hidden transition-all duration-300',
                compact ? 'mb-2 max-h-11 opacity-100' : 'mb-3 max-h-14 opacity-100',
              )}
            >
              <SportToggle sport={sport} onChange={setSport} theme={theme} language={language} />
            </div>

            <div className={clsx('flex rounded-2xl border p-1', theme === 'dark' ? 'border-white/10 bg-zinc-950/55' : 'border-zinc-200 bg-white/80 shadow-sm')}>
              <button
                onClick={() => setActiveTab('casual')}
                className={clsx(
                  'relative flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-bold transition-all',
                  activeTab === 'casual'
                    ? theme === 'dark'
                      ? 'text-zinc-950'
                      : 'text-white'
                    : theme === 'dark'
                      ? 'text-zinc-400 hover:text-white'
                      : 'text-zinc-500 hover:text-zinc-900',
                )}
              >
                {activeTab === 'casual' ? (
                  <motion.div layoutId="play-tab-bg" className="absolute inset-0 rounded-xl bg-emerald-500 shadow-[0_8px_20px_rgba(16,185,129,0.24)]" />
                ) : null}
                <span className="relative z-10 flex items-center gap-2">
                  <Swords className="h-4 w-4" />
                  {t('play.casual')}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('ranked')}
                className={clsx(
                  'relative flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-bold transition-all',
                  activeTab === 'ranked'
                    ? theme === 'dark'
                      ? 'text-zinc-950'
                      : 'text-white'
                    : theme === 'dark'
                      ? 'text-zinc-400 hover:text-white'
                      : 'text-zinc-500 hover:text-zinc-900',
                )}
              >
                {activeTab === 'ranked' ? (
                  <motion.div layoutId="play-tab-bg" className="absolute inset-0 rounded-xl bg-amber-500 shadow-[0_8px_20px_rgba(245,158,11,0.24)]" />
                ) : null}
                <span className="relative z-10 flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  {t('play.ranked')}
                </span>
              </button>
            </div>

            {activeTab === 'casual' ? (
              <div
                className={clsx(
                  'overflow-hidden transition-all duration-300',
                  hideSearch ? 'mt-0 max-h-0 opacity-0' : 'mt-2.5 max-h-24 opacity-100',
                )}
              >
                <div className="space-y-2">
                  <div className={clsx('flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em]', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                    <Search className="h-4 w-4 text-emerald-500" />
                    {t('play.findOpponents')}
                  </div>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      placeholder={t('play.searchPlaceholder')}
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      className={clsx(
                        'w-full rounded-2xl border py-3 pl-11 pr-4 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/40',
                        theme === 'dark'
                          ? 'border-white/10 bg-zinc-950/55 text-white placeholder:text-zinc-600'
                          : 'border-zinc-200 bg-white/85 text-zinc-900 placeholder:text-zinc-400 shadow-sm',
                      )}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="relative pb-4">
        <AnimatePresence mode="wait">
          {activeTab === 'casual' ? (
            <motion.div
              key="casual"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <CasualMatch search={search} />
            </motion.div>
          ) : (
            <motion.div
              key="ranked"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Tournaments />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </motion.div>
  );
}
