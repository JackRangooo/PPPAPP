import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';
import {
  Activity,
  ArrowRight,
  Loader2,
  Radio,
  Search,
  Star,
  Swords,
  Trash2,
  Trophy,
  User,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import clsx from 'clsx';

import { useAuth } from '../App';
import ActivityHeatmap from '../components/ActivityHeatmap';
import SportToggle from '../components/SportToggle';
import {
  adminDeleteMatch,
  adminDeleteTournamentTimelineEvent,
  getReadableErrorMessage,
  listTournaments,
  listUserRecentMatches,
  searchProfiles,
} from '../lib/api';
import { getCompetitiveDivision } from '../lib/competitiveRank';
import { getSportLabel, getSportStats } from '../lib/sports';
import { subscribeToTable } from '../lib/supabase';
import type { Match, TournamentTimelineEvent, UserProfile } from '../types';
import { useTranslation } from '../i18n';

const ACTIVITY_MATCH_LIMIT = 1000;

const localizeBracketLabel = (language: 'en' | 'zh', value: string) => {
  if (language === 'en') {
    return value;
  }

  return value
    .replace(/^Grand Final$/, '决赛')
    .replace(/^Third Place Match$/, '季军赛')
    .replace(/^Semifinal (\d+)$/, '半决赛 $1')
    .replace(/^(Quarterfinal|Qualifier|Play-In) (\d+)$/, '资格赛 $2');
};

const localizeTimelineTitle = (language: 'en' | 'zh', title: string) => {
  if (language === 'en') {
    return title;
  }

  const championMatch = title.match(/^(.+) won (.+)$/);
  if (championMatch) {
    return `${championMatch[1]} 赢下了 ${championMatch[2]}`;
  }

  const cancelledMatch = title.match(/^(.+) was cancelled$/);
  if (cancelledMatch) {
    return `${cancelledMatch[1]} 已取消`;
  }

  const liveMatch = title.match(/^(.+) is live$/);
  if (liveMatch) {
    return `${liveMatch[1]} 已开赛`;
  }

  const readyMatch = title.match(/^(.+) is ready$/);
  if (readyMatch) {
    return `${localizeBracketLabel(language, readyMatch[1])} 已就绪`;
  }

  const walkoverMatch = title.match(/^(.+) moved on from (.+) with a walkover$/);
  if (walkoverMatch) {
    return `${walkoverMatch[1]} 在 ${localizeBracketLabel(language, walkoverMatch[2])} 中轮空晋级`;
  }

  const completedMatch = title.match(/^(.+) beat (.+) in (.+)$/);
  if (completedMatch) {
    return `${completedMatch[1]} 在 ${localizeBracketLabel(language, completedMatch[3])} 中击败了 ${completedMatch[2]}`;
  }

  return localizeBracketLabel(language, title);
};

const localizeTimelineDescription = (language: 'en' | 'zh', description: string) => {
  if (language === 'en') {
    return description;
  }

  const readyMatch = description.match(/^(.+) and (.+) are ready to play\.$/);
  if (readyMatch) {
    return `${readyMatch[1]} 和 ${readyMatch[2]} 都已准备就绪。`;
  }

  const walkoverMatch = description.match(/^(.+) moved on from (.+) with a walkover\.$/);
  if (walkoverMatch) {
    return `${walkoverMatch[1]} 在 ${localizeBracketLabel(language, walkoverMatch[2])} 中因轮空晋级。`;
  }

  const completedMatch = description.match(/^(.+) beat (.+) in (.+)\.$/);
  if (completedMatch) {
    return `${completedMatch[1]} 在 ${localizeBracketLabel(language, completedMatch[3])} 中击败了 ${completedMatch[2]}`;
  }

  const championMatch = description.match(/^(.+) is the new champion, and (.+) claimed third place\.$/);
  if (championMatch) {
    return `${championMatch[1]} 成为本届冠军，${championMatch[2]} 获得季军。`;
  }

  if (description === 'The root admin closed this event before it finished.') {
    return '管理员在赛事完成前关闭了本场赛事。';
  }

  return localizeBracketLabel(language, description);
};

const formatRelativeTime = (language: 'en' | 'zh', value: string) =>
  formatDistanceToNow(new Date(value), {
    addSuffix: true,
    locale: language === 'zh' ? zhCN : enUS,
  });

export default function Dashboard() {
  const { userProfile, theme, language, sport, setSport } = useAuth();
  const t = useTranslation(language);
  const navigate = useNavigate();
  const [activityMatches, setActivityMatches] = useState<Match[]>([]);
  const [feedEvents, setFeedEvents] = useState<TournamentTimelineEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [deletingFeedId, setDeletingFeedId] = useState<string | null>(null);
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile) {
      setActivityMatches([]);
      return;
    }

    let active = true;

    const loadMatches = async () => {
      try {
        const matches = await listUserRecentMatches(userProfile.uid, ACTIVITY_MATCH_LIMIT, sport);
        if (active) {
          setActivityMatches(matches);
        }
      } catch (error) {
        console.error('Failed to load match activity', error);
      }
    };

    void loadMatches();
    return subscribeToTable('matches', () => {
      void loadMatches();
    });
  }, [sport, userProfile]);

  useEffect(() => {
    if (!userProfile) {
      setFeedEvents([]);
      return;
    }

    let active = true;

    const loadFeed = async () => {
      try {
        const tournaments = await listTournaments(sport);
        const nextEvents = tournaments
          .flatMap((tournament) => tournament.timeline)
          .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
          .slice(0, 8);

        if (active) {
          setFeedEvents(nextEvents);
        }
      } catch (error) {
        console.error('Failed to load tournament feed', error);
      }
    };

    void loadFeed();
    return subscribeToTable('tournaments', () => {
      void loadFeed();
    });
  }, [sport, userProfile]);

  useEffect(() => {
    if (!userProfile) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

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

  if (!userProfile) {
    return null;
  }

  const sportLabel = getSportLabel(sport, language);
  const currentStats = getSportStats(userProfile, sport);
  const recentMatches = activityMatches.slice(0, 8);
  const displayName = (userProfile.displayName || userProfile.nickname || 'Player').trim();
  const firstName = displayName ? displayName.split(/\s+/)[0] : 'Player';
  const winRate =
    currentStats.casualWins + currentStats.casualLosses > 0
      ? Math.round((currentStats.casualWins / (currentStats.casualWins + currentStats.casualLosses)) * 100)
      : 0;
  const division = getCompetitiveDivision(currentStats.casualStars, language);
  const isRoot = Boolean(userProfile.isRoot);
  const liveFeed = feedEvents.slice(0, 6);

  const adminCopy =
    language === 'zh'
      ? {
          deleteFeed: '删除简讯',
          deleteFeedConfirm: '确认删除这条赛事简讯吗？',
          deleteFeedFailed: '删除赛事简讯失败。',
          deleteMatch: '删除比赛',
          deleteMatchConfirm: '确认删除这条最近比赛吗？',
          deleteMatchFailed: '删除最近比赛失败。',
        }
      : {
          deleteFeed: 'Delete Feed',
          deleteFeedConfirm: 'Delete this tournament feed item?',
          deleteFeedFailed: 'Failed to delete this feed item.',
          deleteMatch: 'Delete Match',
          deleteMatchConfirm: 'Delete this recent match?',
          deleteMatchFailed: 'Failed to delete this recent match.',
        };

  const feedTitle = language === 'zh' ? `${sportLabel}赛事简讯` : `${sportLabel} Tournament Feed`;
  const feedEmpty = language === 'zh' ? '开赛、晋级和夺冠等动态会显示在这里。' : 'Bracket starts, advances, and title wins will show up here.';

  const refreshMatches = async () => {
    setActivityMatches(await listUserRecentMatches(userProfile.uid, ACTIVITY_MATCH_LIMIT, sport));
  };

  const refreshFeed = async () => {
    const tournaments = await listTournaments(sport);
    const nextEvents = tournaments
      .flatMap((tournament) => tournament.timeline)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 8);
    setFeedEvents(nextEvents);
  };

  const handleDeleteFeedEvent = async (event: TournamentTimelineEvent) => {
    if (!isRoot || deletingFeedId) {
      return;
    }

    if (!window.confirm(adminCopy.deleteFeedConfirm)) {
      return;
    }

    setDeletingFeedId(event.id);
    try {
      await adminDeleteTournamentTimelineEvent(event.tournamentId, event.id);
      await refreshFeed();
    } catch (error) {
      window.alert(getReadableErrorMessage(error, adminCopy.deleteFeedFailed));
    } finally {
      setDeletingFeedId(null);
    }
  };

  const handleDeleteRecentMatch = async (matchId: string) => {
    if (!isRoot || deletingMatchId) {
      return;
    }

    if (!window.confirm(adminCopy.deleteMatchConfirm)) {
      return;
    }

    setDeletingMatchId(matchId);
    try {
      await adminDeleteMatch(matchId);
      await refreshMatches();
    } catch (error) {
      window.alert(getReadableErrorMessage(error, adminCopy.deleteMatchFailed));
    } finally {
      setDeletingMatchId(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className={clsx('mb-1 text-3xl font-bold tracking-tight', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
            {t('dashboard.welcome')}, {firstName}
          </h1>
          <p className="font-medium text-zinc-400">{t('dashboard.readyForNextMatch')}</p>
        </div>
        <Link to="/profile" className={clsx('h-12 w-12 shrink-0 overflow-hidden rounded-full border-2', theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200')}>
          <img
            src={userProfile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.displayName || userProfile.nickname)}&background=random`}
            alt="Avatar"
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        </Link>
      </header>

      <SportToggle sport={sport} onChange={setSport} theme={theme} language={language} />

      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          placeholder={t('dashboard.searchPlayers')}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className={clsx(
            'w-full rounded-2xl border py-4 pl-12 pr-12 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50',
            theme === 'dark'
              ? 'border-white/5 bg-zinc-900/50 text-white placeholder:text-zinc-600'
              : 'border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 shadow-sm',
          )}
        />
        {searchQuery ? (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-emerald-500"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}

        <AnimatePresence>
          {searchQuery.length >= 2 ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={clsx(
                'absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border shadow-2xl',
                theme === 'dark' ? 'border-white/10 bg-zinc-900' : 'border-zinc-200 bg-white',
              )}
            >
              {isSearching ? (
                <div className="p-4 text-center text-sm font-medium text-zinc-500">{t('dashboard.searching')}</div>
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
                        'flex w-full items-center gap-3 p-4 text-left transition-colors',
                        theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-zinc-50',
                      )}
                    >
                      <img
                        src={result.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(result.displayName || result.nickname)}&background=random`}
                        alt={result.displayName}
                        className={clsx('h-10 w-10 rounded-full border object-cover', theme === 'dark' ? 'border-zinc-800' : 'border-zinc-200')}
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className={clsx('font-bold', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                          {result.displayName}
                        </div>
                        <div className="text-xs text-zinc-500">{result.selectedTitle || t('profile.novicePlayer')}</div>
                      </div>
                      <User className="ml-auto h-4 w-4 text-zinc-400" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-sm font-medium text-zinc-500">{t('dashboard.noPlayersFound')}</div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className={clsx('relative flex flex-col justify-between overflow-hidden rounded-3xl border p-5', theme === 'dark' ? 'border-white/5 bg-zinc-900/50' : 'border-zinc-200 bg-white shadow-sm')}>
          <div className="absolute right-0 top-0 p-4 opacity-10">
            <Star className="h-16 w-16 text-emerald-500" />
          </div>
          <div className="mb-4 flex items-center gap-2 text-emerald-500">
            <Star className="h-4 w-4 fill-current" />
            <span className="text-xs font-bold uppercase tracking-wider">{t('dashboard.casual')}</span>
          </div>
          <div>
            <div className={clsx('mb-1 text-4xl font-bold', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
              {currentStats.casualStars}
            </div>
            <div className="text-sm font-medium text-zinc-500">{t('profile.stars')}</div>
            <div className="mt-2 text-[11px] font-black uppercase tracking-[0.16em] text-amber-500">{division.title}</div>
          </div>
        </div>

        <div className={clsx('relative flex flex-col justify-between overflow-hidden rounded-3xl border p-5', theme === 'dark' ? 'border-white/5 bg-zinc-900/50' : 'border-zinc-200 bg-white shadow-sm')}>
          <div className="absolute right-0 top-0 p-4 opacity-10">
            <Activity className="h-16 w-16 text-blue-500" />
          </div>
          <div className="mb-4 flex items-center gap-2 text-blue-500">
            <Activity className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">{t('leaderboard.winRate')}</span>
          </div>
          <div>
            <div className={clsx('mb-1 text-4xl font-bold', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
              {winRate}%
            </div>
            <div className="text-sm font-medium text-zinc-500">
              {currentStats.casualWins}W - {currentStats.casualLosses}L
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <Link to="/play" state={{ tab: 'casual' }} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-500 p-4 font-bold text-zinc-950 shadow-sm transition-colors hover:bg-emerald-400">
          <Swords className="h-5 w-5" />
          {t('play.casual')}
        </Link>
        <Link
          to="/play"
          state={{ tab: 'ranked' }}
          className={clsx(
            'flex flex-1 items-center justify-center gap-2 rounded-2xl p-4 font-bold shadow-sm transition-colors',
            theme === 'dark' ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-zinc-900 text-white hover:bg-zinc-800',
          )}
        >
          <Trophy className="h-5 w-5" />
          {t('play.ranked')}
        </Link>
      </div>

      <ActivityHeatmap matches={activityMatches} theme={theme} language={language} />

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className={clsx('flex items-center gap-2 text-lg font-bold', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
            <Radio className="h-5 w-5 text-sky-500" /> {feedTitle}
          </h2>
        </div>

        {liveFeed.length === 0 ? (
          <div className={clsx('rounded-2xl border p-8 text-center', theme === 'dark' ? 'border-white/5 bg-zinc-900/30' : 'border-zinc-200 bg-white shadow-sm')}>
            <p className="font-medium text-zinc-500">{feedEmpty}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {liveFeed.map((event) => {
              const isDeleting = deletingFeedId === event.id;

              return (
                <div
                  key={event.id}
                  className={clsx(
                    'rounded-2xl border p-4 transition-colors',
                    theme === 'dark' ? 'border-white/5 bg-zinc-900/50' : 'border-zinc-200 bg-white shadow-sm',
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className={clsx('mb-1 font-bold', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                        {localizeTimelineTitle(language, event.title)}
                      </div>
                      <div className={clsx('text-sm leading-6', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600')}>
                        {localizeTimelineDescription(language, event.description)}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="text-xs font-medium text-zinc-500">{formatRelativeTime(language, event.createdAt)}</div>
                      {isRoot ? (
                        <button
                          type="button"
                          onClick={() => void handleDeleteFeedEvent(event)}
                          disabled={Boolean(deletingFeedId)}
                          aria-label={adminCopy.deleteFeed}
                          className={clsx(
                            'inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors',
                            theme === 'dark'
                              ? 'border-white/10 bg-zinc-950/80 text-zinc-300 hover:border-red-500/30 hover:text-red-400'
                              : 'border-zinc-200 bg-white text-zinc-500 hover:border-red-200 hover:text-red-500',
                            deletingFeedId ? 'cursor-not-allowed opacity-60' : '',
                          )}
                        >
                          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className={clsx('text-lg font-bold', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
            {t('dashboard.recentMatches')}
          </h2>
          <Link to="/profile" className="flex items-center gap-1 text-sm font-medium text-emerald-500 transition-colors hover:text-emerald-400">
            {t('dashboard.viewAll')} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {recentMatches.length === 0 ? (
          <div className={clsx('rounded-2xl border p-8 text-center', theme === 'dark' ? 'border-white/5 bg-zinc-900/30' : 'border-zinc-200 bg-white shadow-sm')}>
            <p className="font-medium text-zinc-500">{t('dashboard.noMatches')}</p>
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
              const isDeleting = deletingMatchId === match.id;

              return (
                <div key={match.id} className="relative">
                  <Link
                    to={`/match/${match.id}`}
                    className={clsx(
                      'block rounded-2xl border p-4 transition-colors',
                      isRoot ? 'pr-16' : '',
                      theme === 'dark' ? 'border-white/5 bg-zinc-900/50 hover:bg-zinc-800/50' : 'border-zinc-200 bg-white shadow-sm hover:bg-zinc-50',
                    )}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <img
                          src={opponentPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(opponentName)}&background=random`}
                          alt={opponentName}
                          className="h-10 w-10 shrink-0 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <div className={clsx('truncate font-bold', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                            {opponentName}
                          </div>
                          <div className="text-xs font-medium text-zinc-500">
                            {match.type === 'casual' ? t('play.casual') : t('play.ranked')} 路 {formatRelativeTime(language, match.createdAt)}
                          </div>
                        </div>
                      </div>

                      {isCompleted ? (
                        <div className="shrink-0 text-right">
                          <div className={`text-lg font-bold ${isWinner ? 'text-emerald-500' : 'text-red-500'}`}>
                            {myScore} - {opponentScore}
                          </div>
                          <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                            {isWinner ? t('dashboard.victory') : t('dashboard.defeat')}
                          </div>
                        </div>
                      ) : (
                        <div className="shrink-0 text-right">
                          <div className="text-sm font-bold uppercase tracking-wider text-amber-500">{t(`match.status.${match.status}`)}</div>
                        </div>
                      )}
                    </div>
                  </Link>
                  {isRoot ? (
                    <button
                      type="button"
                      onClick={() => void handleDeleteRecentMatch(match.id)}
                      disabled={Boolean(deletingMatchId)}
                      aria-label={adminCopy.deleteMatch}
                      className={clsx(
                        'absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors',
                        theme === 'dark'
                          ? 'border-white/10 bg-zinc-950/80 text-zinc-300 hover:border-red-500/30 hover:text-red-400'
                          : 'border-zinc-200 bg-white text-zinc-500 hover:border-red-200 hover:text-red-500',
                        deletingMatchId ? 'cursor-not-allowed opacity-60' : '',
                      )}
                    >
                      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}







