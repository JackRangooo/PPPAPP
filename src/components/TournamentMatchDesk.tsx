import {
  AlertCircle,
  Check,
  Loader2,
  ShieldCheck,
  Swords,
  Trophy,
  XCircle,
} from 'lucide-react';
import clsx from 'clsx';

import type { Language, Theme, TournamentBracketMatch } from '../types';

type TournamentMatchDeskProps = {
  theme: Theme;
  language: Language;
  match: TournamentBracketMatch | null;
  currentUserId: string | null;
  myScore: string;
  opponentScore: string;
  busy: boolean;
  onMyScoreChange: (value: string) => void;
  onOpponentScoreChange: (value: string) => void;
  onReady: () => void;
  onSubmitScore: () => void;
  onForfeit: () => void;
};

const copy = {
  en: {
    title: 'Match Desk',
    waiting: 'Pick a tournament match to see its current state.',
    readyTitle: 'Ready Check',
    readyAction: 'Ready',
    waitingForReady: 'You are ready. Waiting for your opponent.',
    opponentReady: 'Your opponent is ready. Confirm when you are ready to play.',
    bothReady: 'Both players are ready. Submit the final score after the match.',
    scoreTitle: 'Score Verification',
    scoreHint: 'Enter the final score for both players. Scores cannot end in a tie.',
    yourScore: 'Your Score',
    theirScore: 'Opponent Score',
    submit: 'Submit Score',
    forfeit: 'Forfeit',
    scoreSubmitted: 'Score Submitted',
    waitingForConfirm: 'Waiting for your opponent to submit the same result.',
    opponentSubmitted: 'Your opponent has already submitted a score. Enter the same final result to confirm it.',
    completed: 'Match Completed',
    walkover: 'Walkover',
    victory: 'You advanced from this match.',
    defeat: 'You were eliminated in this match.',
    you: 'You',
    outsiderHint: 'You are not one of the players in this match.',
    status: {
      waiting: 'Waiting',
      pending: 'Ready',
      ongoing: 'Live',
      waiting_confirmation: 'Confirm',
      completed: 'Done',
      walkover: 'Walkover',
    },
  },
  zh: {
    title: '比赛操作台',
    waiting: '选择一场比赛后，可以在这里查看当前状态。',
    readyTitle: '准备就绪',
    readyAction: '我已就绪',
    waitingForReady: '你已准备就绪，等待对手确认。',
    opponentReady: '对手已经准备好了，你确认后就可以开赛。',
    bothReady: '双方都已准备就绪，打完后提交最终比分即可。',
    scoreTitle: '比分核验',
    scoreHint: '请输入双方最终比分，不能打平。',
    yourScore: '你的比分',
    theirScore: '对手比分',
    submit: '提交并核验',
    forfeit: '本场退赛',
    scoreSubmitted: '比分已提交',
    waitingForConfirm: '等待对手提交同样的最终比分。',
    opponentSubmitted: '对手已经提交了比分，输入同样的最终结果即可完成核验。',
    completed: '比赛已完成',
    walkover: '轮空晋级',
    victory: '你已从本场晋级。',
    defeat: '你在本场被淘汰。',
    you: '你',
    outsiderHint: '你不是这场比赛的参赛者。',
    status: {
      waiting: '待定',
      pending: '待就绪',
      ongoing: '进行中',
      waiting_confirmation: '待确认',
      completed: '已完成',
      walkover: '轮空',
    },
  },
} as const;

const statusToneClasses: Record<TournamentBracketMatch['status'], string> = {
  waiting: 'border-zinc-500/20 bg-zinc-500/10 text-zinc-400',
  pending: 'border-amber-500/25 bg-amber-500/10 text-amber-500',
  ongoing: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-500',
  waiting_confirmation: 'border-sky-500/25 bg-sky-500/10 text-sky-500',
  completed: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-500',
  walkover: 'border-violet-500/25 bg-violet-500/10 text-violet-500',
};

export default function TournamentMatchDesk({
  theme,
  language,
  match,
  currentUserId,
  myScore,
  opponentScore,
  busy,
  onMyScoreChange,
  onOpponentScoreChange,
  onReady,
  onSubmitScore,
  onForfeit,
}: TournamentMatchDeskProps) {
  const ui = copy[language];

  if (!match) {
    return (
      <div
        className={clsx(
          'rounded-[2rem] border p-5 text-sm font-medium',
          theme === 'dark'
            ? 'border-white/5 bg-zinc-900/55 text-zinc-400'
            : 'border-zinc-200 bg-white text-zinc-500 shadow-sm',
        )}
      >
        {ui.waiting}
      </div>
    );
  }

  const isPlayer1 = currentUserId === match.player1Id;
  const isMine = Boolean(currentUserId && (currentUserId === match.player1Id || currentUserId === match.player2Id));
  const myName = isPlayer1 ? match.player1Name : match.player2Name;
  const opponentName = isPlayer1 ? match.player2Name : match.player1Name;
  const myAvatar = isPlayer1 ? match.player1AvatarUrl : match.player2AvatarUrl;
  const opponentAvatar = isPlayer1 ? match.player2AvatarUrl : match.player1AvatarUrl;
  const myReady = isPlayer1 ? match.player1Ready : match.player2Ready;
  const opponentReady = isPlayer1 ? match.player2Ready : match.player1Ready;
  const myConfirmed = isPlayer1 ? match.player1Confirmed : match.player2Confirmed;
  const myFinalScore = isPlayer1 ? match.player1Score : match.player2Score;
  const opponentFinalScore = isPlayer1 ? match.player2Score : match.player1Score;
  const iWon = Boolean(match.winnerId && currentUserId && match.winnerId === currentUserId);

  const playerCards = [
    {
      key: 'me',
      label: isMine ? ui.you : match.player1Name || match.player1Source || '-',
      name: isMine ? myName || ui.you : match.player1Name || match.player1Source || '-',
      avatar: isMine ? myAvatar : match.player1AvatarUrl,
      ready: isMine ? myReady : match.player1Ready,
      score: isMine ? myFinalScore : match.player1Score,
    },
    {
      key: 'opponent',
      label: isMine ? opponentName || match.player2Source || '-' : match.player2Name || match.player2Source || '-',
      name: isMine ? opponentName || match.player2Source || '-' : match.player2Name || match.player2Source || '-',
      avatar: isMine ? opponentAvatar : match.player2AvatarUrl,
      ready: isMine ? opponentReady : match.player2Ready,
      score: isMine ? opponentFinalScore : match.player2Score,
    },
  ];

  return (
    <div
      className={clsx(
        'rounded-[2rem] border p-5 sm:p-6',
        theme === 'dark'
          ? 'border-white/5 bg-zinc-900/60'
          : 'border-zinc-200 bg-white shadow-sm',
      )}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-500">
            <Swords className="h-5 w-5" />
          </div>
          <div>
            <h2 className={clsx('text-xl font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
              {ui.title}
            </h2>
            <div className={clsx('text-sm font-medium', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
              {match.label}
            </div>
          </div>
        </div>

        <div
          className={clsx(
            'rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.18em]',
            statusToneClasses[match.status],
          )}
        >
          {ui.status[match.status]}
        </div>
      </div>

      <div
        className={clsx(
          'relative overflow-hidden rounded-[1.75rem] border p-4 sm:p-5',
          theme === 'dark'
            ? 'border-white/6 bg-zinc-950/75'
            : 'border-zinc-200 bg-zinc-50',
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(16,185,129,0.12),transparent_65%)]" />
        <div className="relative z-10 grid gap-3 sm:grid-cols-2">
          {playerCards.map((player) => (
            <div
              key={player.key}
              className={clsx(
                'rounded-[1.5rem] border p-4',
                theme === 'dark'
                  ? 'border-white/6 bg-zinc-900/70'
                  : 'border-zinc-200 bg-white/85',
              )}
            >
              <div className="flex items-center gap-3">
                <img
                  src={player.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=random`}
                  alt={player.name}
                  className={clsx(
                    'h-16 w-16 rounded-full object-cover shadow-lg',
                    theme === 'dark' ? 'border-4 border-zinc-900' : 'border-4 border-white',
                  )}
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <div className={clsx('truncate text-lg font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                    {player.label || '-'}
                  </div>
                  <div
                    className={clsx(
                      'mt-1 text-xs font-black uppercase tracking-[0.18em]',
                      player.ready
                        ? 'text-emerald-500'
                        : theme === 'dark'
                          ? 'text-zinc-500'
                          : 'text-zinc-500',
                    )}
                  >
                    {player.ready ? ui.readyTitle : ''}
                  </div>
                </div>
              </div>

              {(match.status === 'completed' || match.status === 'walkover') && typeof player.score === 'number' ? (
                <div className="mt-4 text-right text-3xl font-black text-emerald-500">{player.score}</div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {!isMine ? (
        <div
          className={clsx(
            'mt-4 rounded-2xl border px-4 py-3 text-sm font-medium',
            theme === 'dark'
              ? 'border-white/5 bg-zinc-950/65 text-zinc-400'
              : 'border-zinc-200 bg-zinc-50 text-zinc-500',
          )}
        >
          {ui.outsiderHint}
        </div>
      ) : null}

      {isMine && match.status === 'pending' ? (
        <div className="mt-5 space-y-4">
          <div
            className={clsx(
              'rounded-2xl border px-4 py-3 text-sm font-medium leading-6',
              theme === 'dark'
                ? 'border-white/5 bg-zinc-950/70 text-zinc-300'
                : 'border-zinc-200 bg-zinc-50 text-zinc-700',
            )}
          >
            {!myReady
              ? opponentReady
                ? ui.opponentReady
                : ui.readyTitle
              : opponentReady
                ? ui.bothReady
                : ui.waitingForReady}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={onReady}
              disabled={busy || myReady}
              className="rounded-2xl bg-emerald-500 px-5 py-4 font-black text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {myReady ? ui.waitingForReady : ui.readyAction}
              </span>
            </button>

            <button
              onClick={onForfeit}
              disabled={busy}
              className={clsx(
                'rounded-2xl border px-5 py-4 font-bold transition-colors',
                theme === 'dark'
                  ? 'border-white/10 bg-zinc-950 text-white hover:bg-zinc-900'
                  : 'border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50',
              )}
            >
              <span className="inline-flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                {ui.forfeit}
              </span>
            </button>
          </div>
        </div>
      ) : null}

      {isMine && (match.status === 'ongoing' || match.status === 'waiting_confirmation') ? (
        <div className="mt-5 space-y-5">
          <div className="space-y-1">
            <h3 className={clsx('text-lg font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
              {ui.scoreTitle}
            </h3>
            <p className={clsx('text-sm leading-6', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
              {match.status === 'waiting_confirmation'
                ? myConfirmed
                  ? ui.waitingForConfirm
                  : ui.opponentSubmitted
                : ui.scoreHint}
            </p>
          </div>

          {myConfirmed ? (
            <div className="rounded-[1.75rem] border border-emerald-500/20 bg-emerald-500/8 px-5 py-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20">
                <Check className="h-7 w-7 text-emerald-500" />
              </div>
              <p className={clsx('text-lg font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                {ui.scoreSubmitted}
              </p>
              <p className={clsx('mt-2 text-sm', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600')}>
                {ui.waitingForConfirm}
              </p>
            </div>
          ) : (
            <>
              {match.status === 'waiting_confirmation' ? (
                <div className="flex items-start gap-3 rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sky-500">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <p className="text-sm font-medium leading-6">{ui.opponentSubmitted}</p>
                </div>
              ) : null}

              <div className="rounded-[1.75rem] border border-white/0 bg-transparent">
                <div className="mx-auto grid max-w-[420px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-3 sm:gap-5">
                  <label className="text-center">
                    <span className="mb-3 block text-sm font-bold text-zinc-500">{ui.yourScore}</span>
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={myScore}
                      onChange={(event) => onMyScoreChange(event.target.value)}
                      className={clsx(
                        'h-24 w-full rounded-[1.6rem] border-2 text-center text-4xl font-black transition-colors focus:border-emerald-500 focus:outline-none',
                        theme === 'dark'
                          ? 'border-zinc-800 bg-zinc-950 text-white'
                          : 'border-zinc-200 bg-zinc-50 text-zinc-900',
                      )}
                    />
                  </label>

                  <div className={clsx('pb-7 text-3xl font-black', theme === 'dark' ? 'text-zinc-700' : 'text-zinc-300')}>
                    -
                  </div>

                  <label className="text-center">
                    <span className="mb-3 block text-sm font-bold text-zinc-500">{ui.theirScore}</span>
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={opponentScore}
                      onChange={(event) => onOpponentScoreChange(event.target.value)}
                      className={clsx(
                        'h-24 w-full rounded-[1.6rem] border-2 text-center text-4xl font-black transition-colors focus:border-emerald-500 focus:outline-none',
                        theme === 'dark'
                          ? 'border-zinc-800 bg-zinc-950 text-white'
                          : 'border-zinc-200 bg-zinc-50 text-zinc-900',
                      )}
                    />
                  </label>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={onSubmitScore}
                  disabled={busy}
                  className="rounded-2xl bg-emerald-500 px-5 py-4 font-black text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-60"
                >
                  <span className="inline-flex items-center gap-2">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {ui.submit}
                  </span>
                </button>

                <button
                  onClick={onForfeit}
                  disabled={busy}
                  className={clsx(
                    'rounded-2xl border px-5 py-4 font-bold transition-colors',
                    theme === 'dark'
                      ? 'border-white/10 bg-zinc-950 text-white hover:bg-zinc-900'
                      : 'border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50',
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    {ui.forfeit}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {isMine && (match.status === 'completed' || match.status === 'walkover') ? (
        <div
          className={clsx(
            'mt-5 rounded-[1.9rem] border p-6 text-center',
            theme === 'dark'
              ? 'border-emerald-500/20 bg-zinc-950/70'
              : 'border-emerald-200 bg-emerald-50',
          )}
        >
          <Trophy className="mx-auto mb-3 h-14 w-14 text-emerald-500" />
          <h3 className={clsx('text-2xl font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
            {match.status === 'walkover' ? ui.walkover : ui.completed}
          </h3>
          <div className="mt-3 text-4xl font-black tracking-tight text-emerald-500">
            {typeof myFinalScore === 'number' ? myFinalScore : '-'} - {typeof opponentFinalScore === 'number' ? opponentFinalScore : '-'}
          </div>
          <p className={clsx('mt-3 font-medium', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600')}>
            {iWon ? ui.victory : ui.defeat}
          </p>
        </div>
      ) : null}
    </div>
  );
}
