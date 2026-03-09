import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Activity, ArrowRight, Search, Star, Swords, Trophy, User, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import clsx from 'clsx';

import { useAuth } from '../App';
import { listUserRecentMatches, searchProfiles } from '../lib/api';
import { subscribeToTable } from '../lib/supabase';
import type { Match, UserProfile } from '../types';
import { useTranslation } from '../i18n';

export default function Dashboard() {
  const { userProfile, theme, language } = useAuth();
  const t = useTranslation(language);
  const navigate = useNavigate();
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!userProfile) return;

    const loadRecentMatches = async () => {
      try {
        setRecentMatches(await listUserRecentMatches(userProfile.uid));
      } catch (error) {
        console.error('Failed to load recent matches', error);
      }
    };

    void loadRecentMatches();
    return subscribeToTable('matches', () => {
      void loadRecentMatches();
    });
  }, [userProfile]);

  useEffect(() => {
    if (!userProfile) return;

    const timeoutId = window.setTimeout(async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);

      try {
        setSearchResults(await searchProfiles(searchQuery.trim(), userProfile.uid));
      } catch (error) {
        console.error('Search error', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery, userProfile]);

  if (!userProfile) return null;

  const winRate =
    userProfile.casualWins + userProfile.casualLosses > 0
      ? Math.round((userProfile.casualWins / (userProfile.casualWins + userProfile.casualLosses)) * 100)
      : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className={clsx('text-3xl font-bold tracking-tight mb-1', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
            {t('dashboard.welcome')}, {userProfile.displayName.split(' ')[0]}
          </h1>
          <p className="text-zinc-400 font-medium">{t('dashboard.readyForNextMatch')}</p>
        </div>
        <Link to="/profile" className={clsx('w-12 h-12 rounded-full overflow-hidden border-2 shrink-0', theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200')}>
          <img
            src={userProfile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.displayName)}&background=random`}
            alt="Avatar"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </Link>
      </header>

      <div className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder={t('dashboard.searchPlayers')}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className={clsx(
              'w-full border rounded-2xl py-4 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all',
              theme === 'dark'
                ? 'bg-zinc-900/50 border-white/5 text-white placeholder:text-zinc-600'
                : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 shadow-sm',
            )}
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-emerald-500"
            >
              <X className="w-5 h-5" />
            </button>
          ) : null}
        </div>

        <AnimatePresence>
          {searchQuery.length >= 2 ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={clsx(
                'absolute top-full left-0 right-0 mt-2 border rounded-2xl shadow-2xl z-50 overflow-hidden',
                theme === 'dark' ? 'bg-zinc-900 border-white/10' : 'bg-white border-zinc-200',
              )}
            >
              {isSearching ? (
                <div className="p-4 text-center text-zinc-500 text-sm font-medium">{t('dashboard.searching')}</div>
              ) : searchResults.length > 0 ? (
                <div className={clsx('divide-y', theme === 'dark' ? 'divide-white/5' : 'divide-zinc-100')}>
                  {searchResults.map((result) => (
                    <button
                      key={result.uid}
                      onClick={() => {
                        navigate(`/player/${result.uid}`);
                        setSearchQuery('');
                      }}
                      className={clsx(
                        'w-full flex items-center gap-3 p-4 transition-colors text-left',
                        theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-zinc-50',
                      )}
                    >
                      <img
                        src={result.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(result.displayName)}&background=random`}
                        alt={result.displayName}
                        className={clsx('w-10 h-10 rounded-full border', theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200')}
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className={clsx('font-bold', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                          {result.displayName}
                        </div>
                        <div className="text-xs text-zinc-500">{result.selectedTitle || t('profile.novicePlayer')}</div>
                      </div>
                      <User className="w-4 h-4 text-zinc-400 ml-auto" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-zinc-500 text-sm font-medium">{t('dashboard.noPlayersFound')}</div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className={clsx('border rounded-3xl p-5 flex flex-col justify-between relative overflow-hidden', theme === 'dark' ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-zinc-200 shadow-sm')}>
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Star className="w-16 h-16 text-emerald-500" />
          </div>
          <div className="flex items-center gap-2 text-emerald-500 mb-4">
            <Star className="w-4 h-4 fill-current" />
            <span className="text-xs font-bold uppercase tracking-wider">{t('dashboard.casual')}</span>
          </div>
          <div>
            <div className={clsx('text-4xl font-bold mb-1', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
              {userProfile.casualStars}
            </div>
            <div className="text-sm text-zinc-500 font-medium">{t('profile.stars')}</div>
          </div>
        </div>

        <div className={clsx('border rounded-3xl p-5 flex flex-col justify-between relative overflow-hidden', theme === 'dark' ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-zinc-200 shadow-sm')}>
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Activity className="w-16 h-16 text-blue-500" />
          </div>
          <div className="flex items-center gap-2 text-blue-500 mb-4">
            <Activity className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">{t('leaderboard.winRate')}</span>
          </div>
          <div>
            <div className={clsx('text-4xl font-bold mb-1', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
              {winRate}%
            </div>
            <div className="text-sm text-zinc-500 font-medium">{userProfile.casualWins}W - {userProfile.casualLosses}L</div>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <Link to="/play" state={{ tab: 'casual' }} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-2xl p-4 flex items-center justify-center gap-2 font-bold transition-colors shadow-sm">
          <Swords className="w-5 h-5" />
          {t('play.casual')}
        </Link>
        <Link
          to="/play"
          state={{ tab: 'ranked' }}
          className={clsx(
            'flex-1 rounded-2xl p-4 flex items-center justify-center gap-2 font-bold transition-colors shadow-sm',
            theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-zinc-900 hover:bg-zinc-800 text-white',
          )}
        >
          <Trophy className="w-5 h-5" />
          {t('play.ranked')}
        </Link>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className={clsx('text-lg font-bold', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
            {t('dashboard.recentMatches')}
          </h2>
          <Link to="/profile" className="text-sm text-emerald-500 font-medium flex items-center gap-1 hover:text-emerald-400">
            {t('dashboard.viewAll')} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {recentMatches.length === 0 ? (
          <div className={clsx('border rounded-2xl p-8 text-center', theme === 'dark' ? 'bg-zinc-900/30 border-white/5' : 'bg-white border-zinc-200 shadow-sm')}>
            <p className="text-zinc-500 font-medium">{t('dashboard.noMatches')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentMatches.map((match) => {
              const isPlayer1 = match.player1Id === userProfile.uid;
              const opponentName = isPlayer1 ? match.player2Name : match.player1Name;
              const opponentPhoto = isPlayer1 ? match.player2Photo : match.player1Photo;
              const myScore = isPlayer1 ? match.player1Score : match.player2Score;
              const opponentScore = isPlayer1 ? match.player2Score : match.player1Score;
              const isWinner = match.winnerId === userProfile.uid;
              const isCompleted = match.status === 'completed';

              return (
                <Link
                  key={match.id}
                  to={`/match/${match.id}`}
                  className={clsx(
                    'block border rounded-2xl p-4 transition-colors',
                    theme === 'dark' ? 'bg-zinc-900/50 border-white/5 hover:bg-zinc-800/50' : 'bg-white border-zinc-200 hover:bg-zinc-50 shadow-sm',
                  )}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={opponentPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(opponentName)}&background=random`}
                        alt={opponentName}
                        className="w-10 h-10 rounded-full shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <div className={clsx('font-bold truncate', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                          {opponentName}
                        </div>
                        <div className="text-xs text-zinc-500 font-medium">
                          {match.type === 'casual' ? t('play.casual') : t('play.ranked')} - {formatDistanceToNow(new Date(match.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                    </div>

                    {isCompleted ? (
                      <div className="text-right shrink-0">
                        <div className={`font-bold text-lg ${isWinner ? 'text-emerald-500' : 'text-red-500'}`}>
                          {myScore} - {opponentScore}
                        </div>
                        <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                          {isWinner ? t('dashboard.victory') : t('dashboard.defeat')}
                        </div>
                      </div>
                    ) : (
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-amber-500 uppercase tracking-wider">
                          {t(`match.status.${match.status}`)}
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
