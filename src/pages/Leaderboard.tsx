import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Award, Medal, Star, Trophy } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import clsx from 'clsx';

import { useAuth } from '../App';
import CompetitiveDivisionBadge from '../components/CompetitiveDivisionBadge';
import SportToggle from '../components/SportToggle';
import { listLeaderboardProfiles } from '../lib/api';
import { getCompetitiveDivision } from '../lib/competitiveRank';
import { getSportLabel, getSportStats } from '../lib/sports';
import { subscribeToTable } from '../lib/supabase';
import type { UserProfile } from '../types';
import { useTranslation } from '../i18n';

type SortOption = 'stars' | 'points' | 'winrate';

export default function Leaderboard() {
  const { userProfile, theme, language, sport, setSport } = useAuth();
  const t = useTranslation(language);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('stars');
  const [loading, setLoading] = useState(true);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollTop(window.scrollY || document.documentElement.scrollTop || 0);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let active = true;

    const loadUsers = async () => {
      try {
        const nextUsers = await listLeaderboardProfiles(sport);
        if (active) {
          setUsers(nextUsers);
        }
      } catch (error) {
        console.error('Failed to load leaderboard', error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    setLoading(true);
    void loadUsers();

    return subscribeToTable('profiles', () => {
      void loadUsers();
    });
  }, [sport]);

  const leaderboardUsers = useMemo(
    () =>
      users.map((currentUser) => {
        const sportStats = getSportStats(currentUser, sport);
        const totalGames = sportStats.casualWins + sportStats.casualLosses;
        const winRate = totalGames > 0 ? Math.round((sportStats.casualWins / totalGames) * 100) : 0;
        const division = getCompetitiveDivision(sportStats.casualStars, language);

        return {
          ...currentUser,
          sportStats,
          totalGames,
          winRate,
          division,
        };
      }),
    [language, sport, users],
  );

  const sortedUsers = [...leaderboardUsers].sort((left, right) => {
    if (sortBy === 'stars') {
      if (right.sportStats.casualStars === left.sportStats.casualStars) return right.winRate - left.winRate;
      return right.sportStats.casualStars - left.sportStats.casualStars;
    }

    if (sortBy === 'points') {
      if (right.sportStats.rankedPoints === left.sportStats.rankedPoints) return right.winRate - left.winRate;
      return right.sportStats.rankedPoints - left.sportStats.rankedPoints;
    }

    if (right.winRate === left.winRate) return right.totalGames - left.totalGames;
    return right.winRate - left.winRate;
  });

  const getRankColor = (index: number) => {
    if (index === 0) {
      return theme === 'dark'
        ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
        : 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }

    if (index === 1) {
      return theme === 'dark'
        ? 'text-zinc-300 bg-zinc-300/10 border-zinc-300/20'
        : 'text-zinc-600 bg-zinc-50 border-zinc-200';
    }

    if (index === 2) {
      return theme === 'dark'
        ? 'text-amber-600 bg-amber-600/10 border-amber-600/20'
        : 'text-amber-700 bg-amber-50 border-amber-200';
    }

    return theme === 'dark'
      ? 'text-zinc-500 bg-zinc-900/50 border-white/5'
      : 'text-zinc-600 bg-white border-zinc-200 shadow-sm';
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Medal className={clsx('h-6 w-6', theme === 'dark' ? 'text-yellow-400' : 'text-yellow-500')} />;
    if (index === 1) return <Medal className={clsx('h-6 w-6', theme === 'dark' ? 'text-zinc-300' : 'text-zinc-400')} />;
    if (index === 2) return <Medal className="h-6 w-6 text-amber-600" />;
    return <span className={clsx('w-6 text-center text-lg font-bold', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400')}>{index + 1}</span>;
  };

  const compact = scrollTop > 18;
  const hidden = scrollTop > 210;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
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
                ? 'bg-[linear-gradient(90deg,rgba(16,185,129,0.12),rgba(255,255,255,0.06),rgba(59,130,246,0.1))]'
                : 'bg-[linear-gradient(90deg,rgba(16,185,129,0.08),rgba(255,255,255,0.9),rgba(59,130,246,0.08))]',
            )}
          />

          <div className="relative">
            <div className="mb-2.5">
              <h1 className={clsx('mb-0.5 flex items-center gap-2.5 font-bold tracking-tight', compact ? 'text-[1.75rem]' : 'text-[2rem]', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                <Award className="h-7 w-7 text-emerald-500" />
                {t('nav.leaderboard')}
              </h1>
              <p className={clsx('text-xs font-medium', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500')}>
                {t('leaderboard.subtitle')} ¡¤ {getSportLabel(sport, language)}
              </p>
            </div>

            <div className={clsx('mb-2 overflow-hidden transition-all duration-300', compact ? 'max-h-11 opacity-100' : 'max-h-14 opacity-100')}>
              <SportToggle sport={sport} onChange={setSport} theme={theme} language={language} />
            </div>

            <div className={clsx('flex rounded-2xl border p-1', theme === 'dark' ? 'border-white/10 bg-zinc-950/55' : 'border-zinc-200 bg-white/80 shadow-sm')}>
              <button
                onClick={() => setSortBy('stars')}
                className={clsx(
                  'flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-bold transition-all',
                  sortBy === 'stars'
                    ? 'bg-emerald-500 text-zinc-950 shadow-lg'
                    : theme === 'dark'
                      ? 'text-zinc-400 hover:text-white'
                      : 'text-zinc-500 hover:text-zinc-900',
                )}
              >
                <Star className={clsx('h-4 w-4', sortBy === 'stars' ? 'fill-zinc-950' : '')} />
                {t('leaderboard.stars')}
              </button>
              <button
                onClick={() => setSortBy('points')}
                className={clsx(
                  'flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-bold transition-all',
                  sortBy === 'points'
                    ? 'bg-amber-500 text-zinc-950 shadow-lg'
                    : theme === 'dark'
                      ? 'text-zinc-400 hover:text-white'
                      : 'text-zinc-500 hover:text-zinc-900',
                )}
              >
                <Trophy className="h-4 w-4" />
                {t('leaderboard.points')}
              </button>
              <button
                onClick={() => setSortBy('winrate')}
                className={clsx(
                  'flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-bold transition-all',
                  sortBy === 'winrate'
                    ? 'bg-blue-500 text-zinc-950 shadow-lg'
                    : theme === 'dark'
                      ? 'text-zinc-400 hover:text-white'
                      : 'text-zinc-500 hover:text-zinc-900',
                )}
              >
                <Activity className="h-4 w-4" />
                {t('leaderboard.winRate')}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-3 pb-3">
        {loading ? (
          <div className="py-12 text-center font-medium text-zinc-500">{t('leaderboard.loading')}</div>
        ) : sortedUsers.length === 0 ? (
          <div className={clsx('rounded-2xl border p-8 text-center font-medium', theme === 'dark' ? 'border-white/5 bg-zinc-900/30 text-zinc-500' : 'border-zinc-200 bg-white text-zinc-500 shadow-sm')}>
            {t('leaderboard.empty')}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {sortedUsers.map((currentUser, index) => {
              const isMe = currentUser.uid === userProfile?.uid;

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, type: 'spring', bounce: 0.3 }}
                  key={currentUser.uid}
                  className={clsx(
                    'flex items-center justify-between rounded-2xl border p-4 transition-all',
                    isMe
                      ? theme === 'dark'
                        ? 'border-emerald-500/30 bg-emerald-500/10 ring-1 ring-emerald-500/50'
                        : 'border-emerald-200 bg-emerald-50 ring-1 ring-emerald-300 shadow-sm'
                      : getRankColor(index),
                  )}
                >
                  <Link to={`/player/${currentUser.uid}`} className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="flex w-8 items-center justify-center">{getRankIcon(index)}</div>
                    <img
                      src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName)}&background=random`}
                      alt={currentUser.displayName}
                      className={clsx('h-12 w-12 shrink-0 rounded-full border-2 object-cover object-center', theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200')}
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <div className={clsx('flex items-center gap-2 text-lg font-bold', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                        <span className="truncate">{currentUser.displayName}</span>
                        {isMe ? <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-950">{t('leaderboard.you')}</span> : null}
                      </div>
                      <div className={clsx('text-xs font-medium', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500')}>
                        {currentUser.totalGames} {t('leaderboard.matchesPlayed')}
                      </div>
                    </div>
                  </Link>

                  <div className="flex shrink-0 flex-col items-end gap-1.5 text-right">
                    <CompetitiveDivisionBadge
                      division={currentUser.division}
                      stars={currentUser.sportStats.casualStars}
                      starsLabel={t('profile.stars')}
                      theme={theme}
                      size="compact"
                      align="right"
                      hideTitle
                    />
                    {sortBy === 'points' ? (
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-sm font-black text-amber-500">
                        {currentUser.sportStats.rankedPoints} <Trophy className="h-5 w-5" />
                      </div>
                    ) : null}
                    {sortBy === 'winrate' ? (
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-sm font-black text-blue-500">
                        {currentUser.winRate}% <Activity className="h-5 w-5" />
                      </div>
                    ) : null}
                    {sortBy === 'stars' ? (
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-black text-emerald-500">
                        {currentUser.sportStats.casualStars} <Star className="h-5 w-5 fill-current" />
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}
