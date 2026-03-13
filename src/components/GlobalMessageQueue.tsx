import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Clock3,
  Loader2,
  MessageSquareMore,
  Send,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import clsx from 'clsx';
import { useLocation } from 'react-router-dom';

import { useAuth } from '../App';
import {
  changeMatchStatus,
  getReadableErrorMessage,
  listTournaments,
  listUserActiveCasualMatches,
  saveTournamentProgress,
  submitMatchScore,
} from '../lib/api';
import {
  createCompletionTimeline,
  getFinalizedTournamentState,
  setTournamentMatchReady,
  sortTournamentTimeline,
  submitTournamentMatchScore,
} from '../lib/tournamentBracket';
import { subscribeToTable } from '../lib/supabase';
import type { Language, Match, Tournament, TournamentBracketMatch } from '../types';

type ScoreDraft = {
  myScore: string;
  opponentScore: string;
};

type QueueItem =
  | {
      key: string;
      kind: 'casual';
      match: Match;
      title: string;
      subtitle: string;
      avatarUrl: string;
      state: 'incoming' | 'outgoing' | 'score' | 'waiting';
      myConfirmed: boolean;
      opponentConfirmed: boolean;
      updatedAt: string;
    }
  | {
      key: string;
      kind: 'tournament';
      tournament: Tournament;
      match: TournamentBracketMatch;
      title: string;
      subtitle: string;
      avatarUrl: string;
      state: 'ready' | 'waiting_ready' | 'score' | 'waiting';
      myConfirmed: boolean;
      opponentConfirmed: boolean;
      myReady: boolean;
      updatedAt: string;
    };

const copy = {
  en: {
    title: 'Message Queue',
    subtitle: 'Handle match actions from anywhere.',
    empty: 'No active match messages.',
    casual: 'Ranked',
    tournament: 'Professional',
    accept: 'Accept',
    decline: 'Decline',
    cancel: 'Cancel',
    ready: 'I am Ready',
    submit: 'Submit Score',
    resubmit: 'Update Score',
    submitted: 'Submitted',
    scoreEditable: 'You already submitted. You can still change the score before your opponent confirms.',
    waitingForOpponent: 'Waiting for your opponent.',
    waitingForReady: 'You are ready. Waiting for your opponent.',
    opponentSubmitted: 'Your opponent already submitted a result.',
    enterScores: 'Enter the final score. Ties are not allowed.',
    yourScore: 'You',
    theirScore: 'Opponent',
    open: 'Messages',
    challengerWaiting: 'Challenge sent',
    challengerIncoming: 'Challenge received',
    tournamentReady: 'Professional match ready',
    tournamentLive: 'Professional score pending',
    tournamentWaiting: 'Professional bracket pending',
    scoreMismatch: 'The two score submissions did not match and were reset.',
    scoreSubmitted: 'Score submitted. Waiting for confirmation.',
    scoreCompleted: 'Result confirmed.',
    actionFailed: 'Action failed.',
    tournamentReadyDone: 'You are ready. Waiting for your opponent.',
    tournamentReadyLive: 'Both players are ready. You can submit the final score.',
    opponentPending: 'Opponent pending',
    bracketPending: 'Your slot is locked in. Waiting for the previous match to decide your opponent.',
  },
  zh: {
    title: '消息队列',
    subtitle: '无论在哪个页面，都可以在这里处理比赛消息。',
    empty: '当前没有待处理的比赛消息。',
    casual: '排位赛',
    tournament: '职业赛',
    accept: '接受',
    decline: '拒绝',
    cancel: '取消',
    ready: '我已就绪',
    submit: '提交比分',
    resubmit: '重新提交比分',
    submitted: '已提交',
    scoreEditable: '你已经提交过比分，但在对手确认前仍然可以修改并重新提交。',
    waitingForOpponent: '等待对手处理。',
    waitingForReady: '你已就绪，等待对手确认。',
    opponentSubmitted: '对手已经提交了结果。',
    enterScores: '请输入最终比分，不能平局。',
    yourScore: '你',
    theirScore: '对手',
    open: '消息',
    challengerWaiting: '挑战已发出',
    challengerIncoming: '收到挑战',
    tournamentReady: '职业赛待就绪',
    tournamentLive: '职业赛待提交比分',
    tournamentWaiting: '职业赛待补全对手',
    scoreMismatch: '双方提交结果不一致，比分已重置。',
    scoreSubmitted: '比分已提交，等待对手确认。',
    scoreCompleted: '结果已确认。',
    actionFailed: '操作失败。',
    tournamentReadyDone: '你已就绪，等待对手确认。',
    tournamentReadyLive: '双方都已就绪，可以提交最终比分了。',
    opponentPending: '对手待定',
    bracketPending: '你的签位已经确定，正在等待上一场比赛决出对手。',
  },
} as const;

const bubbleTheme = {
  dark: {
    shell:
      'border-white/16 bg-[linear-gradient(135deg,rgba(56,78,112,0.4),rgba(19,27,43,0.22)_52%,rgba(10,14,23,0.28))] text-white shadow-[0_28px_70px_rgba(2,6,23,0.38),inset_0_1px_0_rgba(255,255,255,0.24),inset_0_-1px_0_rgba(255,255,255,0.05)]',
    panel:
      'border-white/16 bg-[linear-gradient(135deg,rgba(64,86,122,0.44),rgba(21,31,51,0.24)_52%,rgba(10,14,23,0.34))] text-white shadow-[0_32px_96px_rgba(2,6,23,0.42),inset_0_1px_0_rgba(255,255,255,0.24),inset_0_-1px_0_rgba(255,255,255,0.05)]',
    card: 'border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.11),rgba(255,255,255,0.035))] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]',
    button: 'border-white/14 bg-white/10 hover:bg-white/16',
    muted: 'text-zinc-300',
    input: 'border-white/14 bg-white/10 text-white',
    shine: 'bg-[linear-gradient(90deg,rgba(255,255,255,0.34),rgba(255,255,255,0.08),rgba(255,255,255,0.26))]',
    glow: 'bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.18),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.16),transparent_36%),radial-gradient(circle_at_center,rgba(167,139,250,0.1),transparent_45%)]',
  },
  light: {
    shell:
      'border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.36),rgba(232,239,255,0.22)_52%,rgba(220,246,238,0.2))] text-zinc-900 shadow-[0_24px_60px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.88),inset_0_-1px_0_rgba(148,163,184,0.16)]',
    panel:
      'border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.42),rgba(232,239,255,0.24)_52%,rgba(220,246,238,0.22))] text-zinc-900 shadow-[0_28px_80px_rgba(15,23,42,0.16),inset_0_1px_0_rgba(255,255,255,0.92),inset_0_-1px_0_rgba(148,163,184,0.16)]',
    card: 'border-white/55 bg-[linear-gradient(135deg,rgba(255,255,255,0.34),rgba(241,245,255,0.2))] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]',
    button: 'border-white/60 bg-white/30 hover:bg-white/42',
    muted: 'text-zinc-500',
    input: 'border-white/55 bg-white/44 text-zinc-900',
    shine: 'bg-[linear-gradient(90deg,rgba(255,255,255,0.96),rgba(255,255,255,0.44),rgba(255,255,255,0.84))]',
    glow: 'bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.16),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_34%),radial-gradient(circle_at_center,rgba(192,132,252,0.09),transparent_42%)]',
  },
} as const;

const POLL_MS = 1200;

const casualStatusTone = {
  incoming: 'bg-emerald-500/12 text-emerald-500',
  outgoing: 'bg-amber-500/12 text-amber-500',
  score: 'bg-sky-500/12 text-sky-500',
  waiting: 'bg-zinc-500/12 text-zinc-400',
} as const;

const tournamentStatusTone = {
  ready: 'bg-amber-500/12 text-amber-500',
  waiting_ready: 'bg-amber-500/12 text-amber-500',
  score: 'bg-emerald-500/12 text-emerald-500',
  waiting: 'bg-zinc-500/12 text-zinc-400',
} as const;

const localizeLegacyMatchLabel = (language: Language, label: string) => {
  if (language === 'en') {
    return label;
  }

  if (label === 'Grand Final') {
    return '决赛';
  }

  if (label === 'Third Place Match') {
    return '季军赛';
  }

  const quarterMatch = label.match(/^(Quarterfinal|Qualifier|Play-In)\s+(\d+)$/);
  if (quarterMatch) {
    const stageText =
      quarterMatch[1] === 'Quarterfinal'
        ? '四分之一决赛'
        : quarterMatch[1] === 'Play-In'
          ? '附加赛'
          : '资格赛';
    return `${stageText} ${quarterMatch[2]}`;
  }

  const semifinalMatch = label.match(/^Semifinal\s+(\d+)$/);
  if (semifinalMatch) {
    return `半决赛 ${semifinalMatch[1]}`;
  }

  return label;
};

const localizeBracketSource = (language: Language, source: string | null) => {
  if (!source) {
    return '';
  }

  if (language === 'en') {
    return source;
  }

  const winnerMatch = source.match(/^Winner of (.+)$/);
  if (winnerMatch) {
    return `${localizeLegacyMatchLabel(language, winnerMatch[1])}胜者`;
  }

  const loserMatch = source.match(/^Loser of (.+)$/);
  if (loserMatch) {
    return `${localizeLegacyMatchLabel(language, loserMatch[1])}败者`;
  }

  return localizeLegacyMatchLabel(language, source);
};

const getLocalizedMatchLabel = (language: Language, match: TournamentBracketMatch) => {
  if (match.stage === 'final') {
    return language === 'zh' ? '决赛' : 'Grand Final';
  }

  if (match.stage === 'third_place') {
    return language === 'zh' ? '季军赛' : 'Third Place Match';
  }

  if (match.stage === 'semifinal') {
    return language === 'zh' ? `半决赛 ${match.slot}` : `Semifinal ${match.slot}`;
  }

  return language === 'zh' ? `资格赛 ${match.slot}` : `Qualifier ${match.slot}`;
};

const buildCasualQueueItem = (match: Match, userId: string, ui: typeof copy.en): QueueItem => {
  const isPlayer1 = match.player1Id === userId;
  const incoming = match.status === 'pending' && !isPlayer1;
  const outgoing = match.status === 'pending' && isPlayer1;
  const score = match.status === 'ongoing';
  const opponentName = isPlayer1 ? match.player2Name : match.player1Name;
  const opponentPhoto = isPlayer1 ? match.player2Photo : match.player1Photo;
  const myConfirmed = isPlayer1 ? match.player1Confirmed : match.player2Confirmed;
  const opponentConfirmed = isPlayer1 ? match.player2Confirmed : match.player1Confirmed;

  return {
    key: `casual:${match.id}`,
    kind: 'casual',
    match,
    title: opponentName,
    subtitle: incoming ? ui.challengerIncoming : outgoing ? ui.challengerWaiting : ui.enterScores,
    avatarUrl:
      opponentPhoto ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(opponentName)}&background=random`,
    state: incoming ? 'incoming' : outgoing ? 'outgoing' : score ? 'score' : 'waiting',
    myConfirmed,
    opponentConfirmed,
    updatedAt: match.updatedAt,
  };
};

const buildTournamentQueueItem = (
  tournament: Tournament,
  match: TournamentBracketMatch,
  userId: string,
  language: Language,
  ui: typeof copy.en,
): QueueItem => {
  const isPlayer1 = match.player1Id === userId;
  const opponentName = isPlayer1
    ? match.player2Name || localizeBracketSource(language, match.player2Source) || ui.opponentPending
    : match.player1Name || localizeBracketSource(language, match.player1Source) || ui.opponentPending;
  const opponentAvatarUrl = isPlayer1 ? match.player2AvatarUrl : match.player1AvatarUrl;
  const myReady = isPlayer1 ? match.player1Ready : match.player2Ready;
  const myConfirmed = isPlayer1 ? match.player1Confirmed : match.player2Confirmed;
  const opponentConfirmed = isPlayer1 ? match.player2Confirmed : match.player1Confirmed;
  const matchLabel = getLocalizedMatchLabel(language, match);

  let state: QueueItem['state'] = 'waiting';
  let subtitle: string = ui.bracketPending;
  if (match.status === 'pending') {
    state = myReady ? 'waiting_ready' : 'ready';
    subtitle = ui.tournamentReady;
  } else if (match.status === 'ongoing' || match.status === 'waiting_confirmation') {
    state = 'score';
    subtitle = ui.tournamentLive;
  }

  return {
    key: `tournament:${match.id}`,
    kind: 'tournament',
    tournament,
    match,
    title: `${tournament.name} · ${matchLabel}`,
    subtitle,
    avatarUrl:
      opponentAvatarUrl ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(opponentName)}&background=random`,
    state,
    myConfirmed,
    opponentConfirmed,
    myReady,
    updatedAt: tournament.updatedAt,
  };
};

export default function GlobalMessageQueue() {
  const { userProfile, theme, language } = useAuth();
  const location = useLocation();
  const ui = copy[language];
  const tones = bubbleTheme[theme];
  const badgeRing = theme === 'dark' ? 'ring-zinc-950/88' : 'ring-white/95';
  const [open, setOpen] = useState(false);
  const [casualMatches, setCasualMatches] = useState<Match[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ScoreDraft>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile) {
      setCasualMatches([]);
      setTournaments([]);
      return;
    }

    let active = true;
    let refreshing = false;

    const refresh = async () => {
      if (!active || refreshing) {
        return;
      }

      refreshing = true;

      try {
        const [nextMatches, nextTournaments] = await Promise.all([
          listUserActiveCasualMatches(userProfile.uid),
          listTournaments(),
        ]);
        if (!active) {
          return;
        }
        setCasualMatches(nextMatches);
        setTournaments(nextTournaments);
      } finally {
        refreshing = false;
      }
    };

    const refreshSoon = () => {
      void refresh();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshSoon();
      }
    };

    refreshSoon();

    const intervalId = window.setInterval(refreshSoon, POLL_MS);
    const stopMatches = subscribeToTable('matches', refreshSoon);
    const stopTournaments = subscribeToTable('tournaments', refreshSoon);
    window.addEventListener('focus', refreshSoon);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      stopMatches();
      stopTournaments();
      window.removeEventListener('focus', refreshSoon);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [userProfile]);

  const queueItems = useMemo(() => {
    if (!userProfile) {
      return [];
    }

    const casualItems = casualMatches.map((match) =>
      buildCasualQueueItem(match, userProfile.uid, ui),
    );
    const tournamentItems = tournaments
      .filter((tournament) => tournament.status === 'ongoing')
      .flatMap((tournament) =>
        tournament.bracket.matches
          .filter(
            (match) =>
              (match.player1Id === userProfile.uid || match.player2Id === userProfile.uid) &&
              (match.status === 'waiting' ||
                match.status === 'pending' ||
                match.status === 'ongoing' ||
                match.status === 'waiting_confirmation'),
          )
          .map((match) =>
            buildTournamentQueueItem(tournament, match, userProfile.uid, language, ui),
          ),
      );

    return [...casualItems, ...tournamentItems].sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    );
  }, [casualMatches, language, tournaments, ui, userProfile]);

  useEffect(() => {
    setDrafts((current) => {
      const next: Record<string, ScoreDraft> = {};

      queueItems.forEach((item) => {
        const previous = current[item.key];
        if (
          item.kind === 'casual' &&
          item.match.status === 'ongoing' &&
          item.myConfirmed &&
          item.match.player1Score !== null &&
          item.match.player2Score !== null &&
          userProfile
        ) {
          const isPlayer1 = item.match.player1Id === userProfile.uid;
          next[item.key] = {
            myScore: String(isPlayer1 ? item.match.player1Score : item.match.player2Score),
            opponentScore: String(isPlayer1 ? item.match.player2Score : item.match.player1Score),
          };
          return;
        }

        if (
          item.kind === 'tournament' &&
          item.myConfirmed &&
          item.match.status === 'waiting_confirmation' &&
          item.match.player1Score !== null &&
          item.match.player2Score !== null &&
          userProfile
        ) {
          const isPlayer1 = item.match.player1Id === userProfile.uid;
          next[item.key] = {
            myScore: String(isPlayer1 ? item.match.player1Score : item.match.player2Score),
            opponentScore: String(isPlayer1 ? item.match.player2Score : item.match.player1Score),
          };
          return;
        }

        next[item.key] = previous ?? { myScore: '', opponentScore: '' };
      });

      return next;
    });
  }, [queueItems, userProfile]);

  useEffect(() => {
    if (queueItems.length === 0) {
      setOpen(false);
    }
  }, [queueItems.length]);

  useEffect(() => {
    setOpen(false);
  }, [location.hash, location.pathname, location.search]);

  if (!userProfile) {
    return null;
  }

  const updateDraft = (key: string, field: keyof ScoreDraft, value: string) => {
    setDrafts((current) => ({
      ...current,
      [key]: {
        ...(current[key] ?? { myScore: '', opponentScore: '' }),
        [field]: value,
      },
    }));
  };

  const runAction = async (key: string, fallback: string, action: () => Promise<void>) => {
    setBusyKey(key);
    try {
      await action();
    } catch (error) {
      window.alert(getReadableErrorMessage(error, fallback));
    } finally {
      setBusyKey(null);
    }
  };

  const handleCasualAction = async (
    item: Extract<QueueItem, { kind: 'casual' }>,
    action: 'accept' | 'decline' | 'cancel',
  ) =>
    runAction(item.key, ui.actionFailed, async () => {
      await changeMatchStatus(item.match.id, action);
    });

  const handleCasualSubmit = async (item: Extract<QueueItem, { kind: 'casual' }>) => {
    const draft = drafts[item.key] ?? { myScore: '', opponentScore: '' };
    const myValue = Number(draft.myScore);
    const opponentValue = Number(draft.opponentScore);

    if (!Number.isFinite(myValue) || !Number.isFinite(opponentValue) || myValue === opponentValue) {
      window.alert(ui.enterScores);
      return;
    }

    await runAction(item.key, ui.actionFailed, async () => {
      const result = await submitMatchScore(item.match.id, myValue, opponentValue);
      if (result.result === 'reset') {
        setDrafts((current) => ({
          ...current,
          [item.key]: { myScore: '', opponentScore: '' },
        }));
        window.alert(ui.scoreMismatch);
        return;
      }

      window.alert(result.result === 'completed' ? ui.scoreCompleted : ui.scoreSubmitted);
    });
  };

  const persistTournamentUpdate = async (
    tournament: Tournament,
    match: TournamentBracketMatch,
    nextBracket: Tournament['bracket'],
    nextTimeline: Tournament['timeline'],
  ) => {
    const finalized = getFinalizedTournamentState(nextBracket);
    const completionTimeline =
      finalized.status === 'completed' ? createCompletionTimeline(tournament, nextBracket) : [];

    return saveTournamentProgress({
      tournamentId: tournament.id,
      matchId: match.id,
      bracket: nextBracket,
      timeline: sortTournamentTimeline([...completionTimeline, ...nextTimeline]),
      status: finalized.status,
      winnerId: finalized.winnerId,
      runnerUpId: finalized.runnerUpId,
      thirdPlaceId: finalized.thirdPlaceId,
    });
  };

  const handleTournamentReady = async (item: Extract<QueueItem, { kind: 'tournament' }>) =>
    runAction(item.key, ui.actionFailed, async () => {
      const result = setTournamentMatchReady(
        item.tournament,
        item.tournament.bracket,
        item.match.id,
        userProfile.uid,
      );

      await persistTournamentUpdate(
        item.tournament,
        item.match,
        result.bracket,
        [...result.timeline, ...item.tournament.timeline],
      );

      window.alert(result.result === 'ongoing' ? ui.tournamentReadyLive : ui.tournamentReadyDone);
    });

  const handleTournamentSubmit = async (item: Extract<QueueItem, { kind: 'tournament' }>) => {
    const draft = drafts[item.key] ?? { myScore: '', opponentScore: '' };
    const myValue = Number(draft.myScore);
    const opponentValue = Number(draft.opponentScore);

    if (!Number.isFinite(myValue) || !Number.isFinite(opponentValue) || myValue === opponentValue) {
      window.alert(ui.enterScores);
      return;
    }

    await runAction(item.key, ui.actionFailed, async () => {
      const result = submitTournamentMatchScore(
        item.tournament,
        item.tournament.bracket,
        item.match.id,
        userProfile.uid,
        myValue,
        opponentValue,
      );

      await persistTournamentUpdate(
        item.tournament,
        item.match,
        result.bracket,
        [...result.timeline, ...item.tournament.timeline],
      );

      if (result.result === 'reset') {
        setDrafts((current) => ({
          ...current,
          [item.key]: { myScore: '', opponentScore: '' },
        }));
        window.alert(ui.scoreMismatch);
        return;
      }

      window.alert(result.result === 'completed' ? ui.scoreCompleted : ui.scoreSubmitted);
    });
  };

  return (
    <>
      <div
        className={clsx(
          'fixed right-4 z-[130] md:bottom-8 md:right-8',
          'bottom-[calc(env(safe-area-inset-bottom)+7.25rem)]',
        )}
      >
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className={clsx(
            'relative flex h-[4.35rem] w-[4.35rem] items-center justify-center overflow-hidden rounded-[1.8rem] border backdrop-blur-[36px] backdrop-saturate-150 transition-all hover:-translate-y-0.5',
            tones.shell,
          )}
        >
          <span className={clsx('pointer-events-none absolute inset-x-3 top-1 h-7 rounded-full opacity-90 blur-2xl', tones.shine)} />
          <span className={clsx('pointer-events-none absolute inset-0 rounded-[1.8rem]', tones.glow)} />
          <MessageSquareMore className="relative z-10 h-6 w-6" />
        </button>
        {queueItems.length > 0 ? (
          <span className={clsx('absolute -right-1.5 -top-1.5 z-10 flex h-6 min-w-[1.65rem] items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-black text-zinc-950 ring-[3px] shadow-[0_10px_24px_rgba(16,185,129,0.28)]', badgeRing)}>
            {queueItems.length > 99 ? '99+' : queueItems.length}
          </span>
        ) : null}
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            className={clsx(
              'fixed right-4 z-[129] flex h-[min(34rem,calc(100vh-10.5rem))] w-[min(92vw,420px)] flex-col overflow-hidden rounded-[2rem] border backdrop-blur-[36px] backdrop-saturate-150 md:bottom-28 md:right-8',
              'bottom-[calc(env(safe-area-inset-bottom)+12.2rem)]',
              tones.panel,
            )}
          >
            <span className={clsx('pointer-events-none absolute inset-x-10 top-2 h-12 rounded-full opacity-90 blur-3xl', tones.shine)} />
            <span className={clsx('pointer-events-none absolute inset-0 rounded-[2rem]', tones.glow)} />
            <div className={clsx('border-b px-5 py-4', theme === 'dark' ? 'border-white/10' : 'border-white/60')}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-500">
                    {ui.open}
                  </div>
                  <div className="mt-1 text-lg font-black">{ui.title}</div>
                  <div className={clsx('mt-1 text-sm', tones.muted)}>{ui.subtitle}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className={clsx('rounded-2xl border p-2 transition-colors', tones.button)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {queueItems.length > 0 ? (
                queueItems.map((item) => {
                  const busy = busyKey === item.key;
                  const draft = drafts[item.key] ?? { myScore: '', opponentScore: '' };

                  return (
                    <div key={item.key} className={clsx('rounded-[1.6rem] border p-4', tones.card)}>
                      <div className="mb-3 flex items-start gap-3">
                        <img
                          src={item.avatarUrl}
                          alt={item.title}
                          className="h-12 w-12 shrink-0 rounded-full object-cover object-center ring-2 ring-white/10"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={clsx(
                                'rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em]',
                                item.kind === 'casual'
                                  ? casualStatusTone[item.state]
                                  : tournamentStatusTone[item.state],
                              )}
                            >
                              {item.kind === 'casual' ? ui.casual : ui.tournament}
                            </span>
                            <span
                              className={clsx(
                                'rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em]',
                                tones.button,
                              )}
                            >
                              {item.state === 'incoming'
                                ? ui.challengerIncoming
                                : item.state === 'outgoing'
                                  ? ui.challengerWaiting
                                  : item.state === 'waiting'
                                    ? ui.tournamentWaiting
                                  : item.state === 'ready' || item.state === 'waiting_ready'
                                    ? ui.tournamentReady
                                    : ui.tournamentLive}
                            </span>
                          </div>
                          <div className="mt-2 truncate text-base font-black">{item.title}</div>
                          <div className={clsx('mt-1 text-sm leading-5', tones.muted)}>{item.subtitle}</div>
                        </div>
                      </div>

                      {item.kind === 'casual' && item.state === 'incoming' ? (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => void handleCasualAction(item, 'decline')}
                            disabled={busy}
                            className={clsx(
                              'rounded-2xl border px-4 py-3 text-sm font-black transition-colors',
                              tones.button,
                            )}
                          >
                            {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : ui.decline}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleCasualAction(item, 'accept')}
                            disabled={busy}
                            className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-60"
                          >
                            {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : ui.accept}
                          </button>
                        </div>
                      ) : null}

                      {item.kind === 'casual' && item.state === 'outgoing' ? (
                        <div className="flex items-center justify-between gap-3">
                          <div className={clsx('flex items-center gap-2 text-sm', tones.muted)}>
                            <Clock3 className="h-4 w-4 text-amber-500" />
                            {ui.waitingForOpponent}
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleCasualAction(item, 'cancel')}
                            disabled={busy}
                            className={clsx(
                              'rounded-2xl border px-4 py-3 text-sm font-black transition-colors',
                              tones.button,
                            )}
                          >
                            {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : ui.cancel}
                          </button>
                        </div>
                      ) : null}

                      {item.kind === 'tournament' && item.state === 'ready' ? (
                        <button
                          type="button"
                          onClick={() => void handleTournamentReady(item)}
                          disabled={busy}
                          className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-60"
                        >
                          {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : ui.ready}
                        </button>
                      ) : null}

                      {item.kind === 'tournament' && item.state === 'waiting_ready' ? (
                        <div
                          className={clsx(
                            'flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm',
                            tones.button,
                            tones.muted,
                          )}
                        >
                          <CheckCheck className="h-4 w-4 text-amber-500" />
                          {ui.waitingForReady}
                        </div>
                      ) : null}

                      {item.kind === 'tournament' && item.state === 'waiting' ? (
                        <div
                          className={clsx(
                            'flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm',
                            tones.button,
                            tones.muted,
                          )}
                        >
                          <Clock3 className="h-4 w-4 text-amber-500" />
                          {ui.bracketPending}
                        </div>
                      ) : null}

                      {(item.kind === 'casual' && item.state === 'score') ||
                      (item.kind === 'tournament' && item.state === 'score') ? (
                        <div className="space-y-3">
                          <div className={clsx('flex items-center gap-2 text-sm', tones.muted)}>
                            {item.opponentConfirmed ? (
                              <Bell className="h-4 w-4 text-sky-500" />
                            ) : (
                              <Send className="h-4 w-4 text-emerald-500" />
                            )}
                            {item.myConfirmed
                              ? item.opponentConfirmed
                                ? ui.opponentSubmitted
                                : ui.scoreEditable
                              : item.opponentConfirmed
                                ? ui.opponentSubmitted
                                : ui.enterScores}
                          </div>
                          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-3">
                            <label className="text-center">
                              <span
                                className={clsx(
                                  'mb-2 block text-xs font-black uppercase tracking-[0.18em]',
                                  tones.muted,
                                )}
                              >
                                {ui.yourScore}
                              </span>
                              <input
                                type="number"
                                min="0"
                                inputMode="numeric"
                                value={draft.myScore}
                                disabled={busy}
                                onChange={(event) => updateDraft(item.key, 'myScore', event.target.value)}
                                className={clsx(
                                  'h-16 w-full rounded-2xl border text-center text-2xl font-black focus:border-emerald-500 focus:outline-none',
                                  tones.input,
                                )}
                              />
                            </label>
                            <div className={clsx('pb-5 text-xl font-black', tones.muted)}>-</div>
                            <label className="text-center">
                              <span
                                className={clsx(
                                  'mb-2 block text-xs font-black uppercase tracking-[0.18em]',
                                  tones.muted,
                                )}
                              >
                                {ui.theirScore}
                              </span>
                              <input
                                type="number"
                                min="0"
                                inputMode="numeric"
                                value={draft.opponentScore}
                                disabled={busy}
                                onChange={(event) =>
                                  updateDraft(item.key, 'opponentScore', event.target.value)
                                }
                                className={clsx(
                                  'h-16 w-full rounded-2xl border text-center text-2xl font-black focus:border-emerald-500 focus:outline-none',
                                  tones.input,
                                )}
                              />
                            </label>
                          </div>

                          {item.myConfirmed && !item.opponentConfirmed ? (
                            <div
                              className={clsx(
                                'flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm',
                                tones.button,
                                tones.muted,
                              )}
                            >
                              <Check className="h-4 w-4 text-emerald-500" />
                              {ui.scoreEditable}
                            </div>
                          ) : null}

                          <button
                            type="button"
                            onClick={() =>
                              void (item.kind === 'casual'
                                ? handleCasualSubmit(item)
                                : handleTournamentSubmit(item))
                            }
                            disabled={busy}
                            className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-60"
                          >
                            {busy ? (
                              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                            ) : item.myConfirmed && !item.opponentConfirmed ? (
                              ui.resubmit
                            ) : (
                              ui.submit
                            )}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div className={clsx('rounded-[1.6rem] border px-4 py-8 text-center text-sm', tones.card, tones.muted)}>
                  {ui.empty}
                </div>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}


