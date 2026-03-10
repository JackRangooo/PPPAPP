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
    casual: 'Casual',
    tournament: 'Tournament',
    accept: 'Accept',
    decline: 'Decline',
    cancel: 'Cancel',
    ready: 'I am Ready',
    submit: 'Submit Score',
    submitted: 'Submitted',
    waitingForOpponent: 'Waiting for your opponent.',
    waitingForReady: 'You are ready. Waiting for your opponent.',
    opponentSubmitted: 'Your opponent already submitted a result.',
    enterScores: 'Enter the final score. Ties are not allowed.',
    yourScore: 'You',
    theirScore: 'Opponent',
    open: 'Messages',
    challengerWaiting: 'Challenge sent',
    challengerIncoming: 'Challenge received',
    tournamentReady: 'Tournament match ready',
    tournamentLive: 'Tournament score pending',
    scoreMismatch: 'The two score submissions did not match and were reset.',
    scoreSubmitted: 'Score submitted. Waiting for confirmation.',
    scoreCompleted: 'Result confirmed.',
    actionFailed: 'Action failed.',
    tournamentReadyDone: 'You are ready. Waiting for your opponent.',
    tournamentReadyLive: 'Both players are ready. You can submit the final score.',
    opponentPending: 'Opponent pending',
  },
  zh: {
    title: '消息队列',
    subtitle: '无论在哪个页面，都可以在这里处理比赛消息。',
    empty: '当前没有待处理的比赛消息。',
    casual: '娱乐局',
    tournament: '锦标赛',
    accept: '接受',
    decline: '拒绝',
    cancel: '取消',
    ready: '我已就绪',
    submit: '提交比分',
    submitted: '已提交',
    waitingForOpponent: '等待对手处理。',
    waitingForReady: '你已就绪，等待对手确认。',
    opponentSubmitted: '对手已经提交了结果。',
    enterScores: '请输入最终比分，不能平局。',
    yourScore: '你',
    theirScore: '对手',
    open: '消息',
    challengerWaiting: '挑战已发出',
    challengerIncoming: '收到挑战',
    tournamentReady: '锦标赛待就绪',
    tournamentLive: '锦标赛待提交比分',
    scoreMismatch: '双方提交结果不一致，比分已重置。',
    scoreSubmitted: '比分已提交，等待对手确认。',
    scoreCompleted: '结果已确认。',
    actionFailed: '操作失败。',
    tournamentReadyDone: '你已就绪，等待对手确认。',
    tournamentReadyLive: '双方都已就绪，可以提交最终比分了。',
    opponentPending: '对手待定',
  },
} as const;

const bubbleTheme = {
  dark: {
    shell:
      'border-white/10 bg-zinc-900/55 text-white shadow-[0_24px_60px_rgba(0,0,0,0.42)]',
    panel:
      'border-white/10 bg-zinc-900/52 text-white shadow-[0_30px_90px_rgba(0,0,0,0.45)]',
    card: 'border-white/8 bg-zinc-950/48',
    button: 'border-white/10 bg-white/5 hover:bg-white/10',
    muted: 'text-zinc-400',
    input: 'border-white/10 bg-zinc-950/70 text-white',
  },
  light: {
    shell:
      'border-white/70 bg-white/65 text-zinc-900 shadow-[0_24px_60px_rgba(15,23,42,0.14)]',
    panel:
      'border-white/80 bg-white/72 text-zinc-900 shadow-[0_30px_90px_rgba(15,23,42,0.16)]',
    card: 'border-white/80 bg-white/60',
    button: 'border-zinc-200/80 bg-white/70 hover:bg-white',
    muted: 'text-zinc-500',
    input: 'border-zinc-200 bg-white/90 text-zinc-900',
  },
} as const;

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
  if (match.status === 'pending') {
    state = myReady ? 'waiting_ready' : 'ready';
  } else if (match.status === 'ongoing' || match.status === 'waiting_confirmation') {
    state = 'score';
  }

  return {
    key: `tournament:${match.id}`,
    kind: 'tournament',
    tournament,
    match,
    title: `${tournament.name} · ${matchLabel}`,
    subtitle: state === 'score' ? ui.tournamentLive : ui.tournamentReady,
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
  const ui = copy[language];
  const tones = bubbleTheme[theme];
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
    const refresh = async () => {
      const [nextMatches, nextTournaments] = await Promise.all([
        listUserActiveCasualMatches(userProfile.uid),
        listTournaments(),
      ]);
      if (!active) {
        return;
      }
      setCasualMatches(nextMatches);
      setTournaments(nextTournaments);
    };

    void refresh();

    const stopMatches = subscribeToTable('matches', () => void refresh());
    const stopTournaments = subscribeToTable('tournaments', () => void refresh());

    return () => {
      active = false;
      stopMatches();
      stopTournaments();
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
              (match.status === 'pending' ||
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
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={clsx(
          'fixed bottom-24 right-4 z-[130] flex h-16 w-16 items-center justify-center rounded-[1.7rem] border backdrop-blur-2xl transition-all hover:-translate-y-0.5 md:bottom-8 md:right-8',
          tones.shell,
        )}
      >
        <MessageSquareMore className="h-6 w-6" />
        {queueItems.length > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-500 px-1 text-[11px] font-black text-zinc-950">
            {queueItems.length}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            className={clsx(
              'fixed bottom-44 right-4 z-[129] w-[min(92vw,420px)] overflow-hidden rounded-[2rem] border backdrop-blur-[28px] md:bottom-28 md:right-8',
              tones.panel,
            )}
          >
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

            <div className="max-h-[68vh] space-y-3 overflow-y-auto p-4">
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
                              ? ui.scoreSubmitted
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
                                disabled={busy || item.myConfirmed}
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
                                disabled={busy || item.myConfirmed}
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

                          {item.myConfirmed ? (
                            <div
                              className={clsx(
                                'flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm',
                                tones.button,
                                tones.muted,
                              )}
                            >
                              <Check className="h-4 w-4 text-emerald-500" />
                              {ui.waitingForOpponent}
                            </div>
                          ) : (
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
                              {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : ui.submit}
                            </button>
                          )}
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
