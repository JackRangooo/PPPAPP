import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Swords, Trophy } from 'lucide-react';
import clsx from 'clsx';
import CasualMatch from './CasualMatch';
import Tournaments from './Tournaments';
import { useAuth } from '../App';
import { useTranslation } from '../i18n';

export default function Play() {
  const location = useLocation();
  const { theme, language } = useAuth();
  const t = useTranslation(language);
  const [activeTab, setActiveTab] = useState<'casual' | 'ranked'>(
    location.state?.tab === 'ranked' ? 'ranked' : 'casual'
  );
  const [search, setSearch] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <header
        className="-mx-4 sticky z-40 pb-3 pt-1 md:mx-0 md:pt-0"
        style={{ top: 'max(env(safe-area-inset-top), 0.35rem)' }}
      >
        <div
          className={clsx(
            'relative overflow-hidden border px-4 py-4 backdrop-blur-[26px] backdrop-saturate-150 md:rounded-[2rem] md:border',
            'rounded-b-[2rem] border-x-0 border-t-0',
            theme === 'dark'
              ? 'border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.92),rgba(10,13,21,0.82))] shadow-[0_18px_40px_rgba(2,6,23,0.28),inset_0_1px_0_rgba(255,255,255,0.12)]'
              : 'border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(244,247,255,0.78))] shadow-[0_16px_32px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.92)]',
          )}
        >
          <span
            className={clsx(
              'pointer-events-none absolute inset-x-10 top-1 h-8 rounded-full blur-2xl',
              theme === 'dark'
                ? 'bg-[linear-gradient(90deg,rgba(16,185,129,0.16),rgba(255,255,255,0.08),rgba(245,158,11,0.16))]'
                : 'bg-[linear-gradient(90deg,rgba(16,185,129,0.12),rgba(255,255,255,0.88),rgba(245,158,11,0.12))]',
            )}
          />
          <div className="relative">
            <h1 className={clsx("mb-4 text-3xl font-bold tracking-tight", theme === 'dark' ? "text-white" : "text-zinc-900")}>{t('nav.play')}</h1>
            <div className={clsx(
              "flex rounded-2xl border p-1",
              theme === 'dark' ? "border-white/10 bg-zinc-950/55" : "border-zinc-200 bg-white/80 shadow-sm"
            )}>
              <button
                onClick={() => setActiveTab('casual')}
                className={clsx(
                  'relative flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all',
                  activeTab === 'casual'
                    ? (theme === 'dark' ? 'text-zinc-950' : 'text-white')
                    : (theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900')
                )}
              >
                {activeTab === 'casual' && (
                  <motion.div layoutId="play-tab-bg" className="absolute inset-0 rounded-xl bg-emerald-500 shadow-[0_10px_24px_rgba(16,185,129,0.3)]" />
                )}
                <span className="relative z-10 flex items-center gap-2"><Swords className="h-4 w-4" /> {t('play.casual')}</span>
              </button>
              <button
                onClick={() => setActiveTab('ranked')}
                className={clsx(
                  'relative flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all',
                  activeTab === 'ranked'
                    ? (theme === 'dark' ? 'text-zinc-950' : 'text-white')
                    : (theme === 'dark' ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900')
                )}
              >
                {activeTab === 'ranked' && (
                  <motion.div layoutId="play-tab-bg" className="absolute inset-0 rounded-xl bg-amber-500 shadow-[0_10px_24px_rgba(245,158,11,0.3)]" />
                )}
                <span className="relative z-10 flex items-center gap-2"><Trophy className="h-4 w-4" /> {t('play.ranked')}</span>
              </button>
            </div>

            {activeTab === 'casual' ? (
              <div className="mt-4 space-y-3">
                <div className={clsx('flex items-center gap-2 text-sm font-black tracking-[0.16em] uppercase', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                  <Search className="h-4 w-4 text-emerald-500" />
                  {t('play.findOpponents')}
                </div>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder={t('play.searchPlaceholder')}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className={clsx(
                      'w-full rounded-2xl border py-4 pl-12 pr-4 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50',
                      theme === 'dark'
                        ? 'border-white/10 bg-zinc-950/55 text-white placeholder:text-zinc-600'
                        : 'border-zinc-200 bg-white/85 text-zinc-900 placeholder:text-zinc-400 shadow-sm',
                    )}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="relative">
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
