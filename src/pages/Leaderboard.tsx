import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Award, Medal, Star, Trophy } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import clsx from 'clsx';

import { useAuth } from '../App';
import { listLeaderboardProfiles } from '../lib/api';
import { subscribeToTable } from '../lib/supabase';
import type { UserProfile } from '../types';
import { useTranslation } from '../i18n';

type SortOption = 'stars' | 'points' | 'winrate';

export default function Leaderboard() {
  const { userProfile, theme, language } = useAuth();
  const t = useTranslation(language);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('stars');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setUsers(await listLeaderboardProfiles());
      } catch (error) {
        console.error('Failed to load leaderboard', error);
      } finally {
        setLoading(false);
      }
    };

    void loadUsers();
    return subscribeToTable('profiles', () => {
      void loadUsers();
    });
  }, []);

  const leaderboardUsers = users.map((currentUser) => {
    const totalGames = currentUser.casualWins + currentUser.casualLosses;
    const winRate = totalGames > 0 ? Math.round((currentUser.casualWins / totalGames) * 100) : 0;
    return {
      ...currentUser,
      totalGames,
      winRate,
    };
  });

  const sortedUsers = [...leaderboardUsers].sort((left, right) => {
    if (sortBy === 'stars') {
      if (right.casualStars === left.casualStars) return right.winRate - left.winRate;
      return right.casualStars - left.casualStars;
    }

    if (sortBy === 'points') {
      if (right.rankedPoints === left.rankedPoints) return right.winRate - left.winRate;
      return right.rankedPoints - left.rankedPoints;
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
    if (index === 0) return <Medal className={clsx('w-6 h-6', theme === 'dark' ? 'text-yellow-400' : 'text-yellow-500')} />;
    if (index === 1) return <Medal className={clsx('w-6 h-6', theme === 'dark' ? 'text-zinc-300' : 'text-zinc-400')} />;
    if (index === 2) return <Medal className="w-6 h-6 text-amber-600" />;
    return <span className={clsx('text-lg font-bold w-6 text-center', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400')}>{index + 1}</span>;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <header>
        <h1 className={clsx('text-3xl font-bold tracking-tight mb-2 flex items-center gap-3', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
          <Award className="w-8 h-8 text-emerald-500" /> {t('nav.leaderboard')}
        </h1>
        <p className={clsx('font-medium', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500')}>
          {t('leaderboard.subtitle')}
        </p>
      </header>

      <div className={clsx('flex p-1 rounded-2xl border', theme === 'dark' ? 'bg-zinc-900/80 backdrop-blur-md border-white/10' : 'bg-white border-zinc-200 shadow-sm')}>
        <button
          onClick={() => setSortBy('stars')}
          className={clsx(
            'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all',
            sortBy === 'stars'
              ? 'bg-emerald-500 text-zinc-950 shadow-lg'
              : theme === 'dark'
                ? 'text-zinc-400 hover:text-white'
                : 'text-zinc-500 hover:text-zinc-900',
          )}
        >
          <Star className={clsx('w-4 h-4', sortBy === 'stars' ? 'fill-zinc-950' : '')} />
          {t('leaderboard.stars')}
        </button>
        <button
          onClick={() => setSortBy('points')}
          className={clsx(
            'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all',
            sortBy === 'points'
              ? 'bg-amber-500 text-zinc-950 shadow-lg'
              : theme === 'dark'
                ? 'text-zinc-400 hover:text-white'
                : 'text-zinc-500 hover:text-zinc-900',
          )}
        >
          <Trophy className="w-4 h-4" />
          {t('leaderboard.points')}
        </button>
        <button
          onClick={() => setSortBy('winrate')}
          className={clsx(
            'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all',
            sortBy === 'winrate'
              ? 'bg-blue-500 text-zinc-950 shadow-lg'
              : theme === 'dark'
                ? 'text-zinc-400 hover:text-white'
                : 'text-zinc-500 hover:text-zinc-900',
          )}
        >
          <Activity className="w-4 h-4" />
          {t('leaderboard.winRate')}
        </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-zinc-500 font-medium">{t('leaderboard.loading')}</div>
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
                    'flex items-center justify-between p-4 rounded-2xl border transition-all',
                    isMe
                      ? theme === 'dark'
                        ? 'bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/50'
                        : 'bg-emerald-50 border-emerald-200 ring-1 ring-emerald-300 shadow-sm'
                      : getRankColor(index),
                  )}
                >
                  <Link to={`/player/${currentUser.uid}`} className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex items-center justify-center w-8">{getRankIcon(index)}</div>
                    <img
                      src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName)}&background=random`}
                      alt={currentUser.displayName}
                      className={clsx('w-12 h-12 rounded-full border-2 shrink-0', theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200')}
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <div className={clsx('font-bold text-lg flex items-center gap-2', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                        <span className="truncate">{currentUser.displayName}</span>
                        {isMe ? <span className="text-[10px] bg-emerald-500 text-zinc-950 px-2 py-0.5 rounded-full uppercase tracking-wider">{t('leaderboard.you')}</span> : null}
                      </div>
                      <div className={clsx('text-xs font-medium', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500')}>
                        {currentUser.totalGames} {t('leaderboard.matchesPlayed')}
                      </div>
                    </div>
                  </Link>

                  <div className="text-right shrink-0">
                    {sortBy === 'stars' ? (
                      <div className="flex items-center gap-1.5 text-xl font-black text-emerald-500">
                        {currentUser.casualStars} <Star className="w-5 h-5 fill-current" />
                      </div>
                    ) : null}
                    {sortBy === 'points' ? (
                      <div className="flex items-center gap-1.5 text-xl font-black text-amber-500">
                        {currentUser.rankedPoints} <Trophy className="w-5 h-5" />
                      </div>
                    ) : null}
                    {sortBy === 'winrate' ? (
                      <div className="flex items-center gap-1.5 text-xl font-black text-blue-500">
                        {currentUser.winRate}% <Activity className="w-5 h-5" />
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
