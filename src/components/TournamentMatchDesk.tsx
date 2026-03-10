import { AlertCircle, Check, Loader2, ShieldCheck, Trophy, XCircle } from 'lucide-react';
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
    waiting: 'Select a match to inspect the current state.',
    readyTitle: 'Ready Check',
    readyAction: 'I am ready',
    waitingForReady: 'You are ready. Waiting for your opponent to confirm.',
    opponentReady: 'Your opponent is ready. Confirm when you are set.',
    bothReady: 'Both players are ready. Report the score after the set.',
    scoreTitle: 'Score Verification',
    yourScore: 'Your Score',
    theirScore: 'Their Score',
    submit: 'Submit & Verify',
    forfeit: 'Forfeit Match',
    scoreSubmitted: 'Score Submitted',
    waitingForConfirm: 'Waiting for your opponent to confirm the same score.',
    opponentSubmitted: 'Your opponent has already submitted a score. Enter the final score to verify the result.',
    completed: 'Match Completed',
    walkover: 'Walkover',
    victory: 'You advanced from this match.',
    defeat: 'This match was lost.',
    you: 'You',
  },
  zh: {
    title: '比赛操作台',
    waiting: '点选一场比赛后，可在这里查看当前状态。',
    readyTitle: '准备就绪',
    readyAction: '我已就绪',
    waitingForReady: '你已准备就绪，等待对手确认。',
    opponentReady: '对手已经准备好了，你确认后即可开赛。',
    bothReady: '双方都已就绪，打完后按正常流程提交比分。',
    scoreTitle: '比分核验',
    yourScore: '你的比分',
    theirScore: '对手比分',
    submit: '提交并核验',
    forfeit: '本场退赛',
    scoreSubmitted: '比分已提交',
    waitingForConfirm: '等待对手提交同样的比分结果。',
    opponentSubmitted: '对手已经提交了比分，请输入最终比分完成核验。',
    completed: '比赛已完成',
    walkover: '轮空晋级',
    victory: '你已从本场晋级。',
    defeat: '你在本场被淘汰。',
    you: '你',
  },
} as const;

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
      <div className={clsx('rounded-3xl border p-6 text-sm font-medium', theme === 'dark' ? 'bg-zinc-900/50 border-white/5 text-zinc-400' : 'bg-white border-zinc-200 text-zinc-500 shadow-sm')}>
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
  const opponentConfirmed = isPlayer1 ? match.player2Confirmed : match.player1Confirmed;
  const myFinalScore = isPlayer1 ? match.player1Score : match.player2Score;
  const opponentFinalScore = isPlayer1 ? match.player2Score : match.player1Score;
  const iWon = Boolean(match.winnerId && currentUserId && match.winnerId === currentUserId);

  return (
    <div className={clsx('rounded-[2rem] border p-6 sm:p-8', theme === 'dark' ? 'bg-zinc-900/60 border-white/5' : 'bg-white border-zinc-200 shadow-sm')}>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
          <Trophy className="h-6 w-6" />
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

      <div className={clsx('rounded-[1.75rem] border p-5 relative overflow-hidden', theme === 'dark' ? 'bg-zinc-950/80 border-white/6' : 'bg-zinc-50 border-zinc-200')}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.14),transparent_70%)]" />
        <div className="relative z-10 flex items-center justify-between gap-4">
          {[
            { name: isMine ? ui.you : match.player1Name || match.player1Source || '-', avatar: match.player1AvatarUrl, ready: match.player1Ready, score: match.player1Score },
            { name: isMine ? opponentName || match.player2Source || '-' : match.player2Name || match.player2Source || '-', avatar: isMine ? opponentAvatar : match.player2AvatarUrl, ready: isMine ? opponentReady : match.player2Ready, score: isMine ? opponentFinalScore : match.player2Score },
          ].map((player, index) => (
            <div key={`${match.id}-${index}`} className="min-w-0 flex-1 text-center">
              <img
                src={player.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=random`}
                alt={player.name}
                className={clsx('mx-auto h-20 w-20 rounded-full object-cover shadow-xl', theme === 'dark' ? 'border-4 border-zinc-900' : 'border-4 border-white')}
                referrerPolicy="no-referrer"
              />
              <div className={clsx('mt-3 truncate text-lg font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                {player.name}
              </div>
              <div className={clsx('mt-1 text-xs font-bold uppercase tracking-[0.16em]', player.ready ? 'text-emerald-500' : theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
                {player.ready ? ui.readyTitle : ''}
              </div>
              {(match.status === 'completed' || match.status === 'walkover') && typeof player.score === 'number' ? (
                <div className="mt-3 text-3xl font-black text-emerald-500">{player.score}</div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {!isMine ? (
        <div className={clsx('mt-5 rounded-2xl border p-4 text-sm font-medium', theme === 'dark' ? 'bg-zinc-950/60 border-white/5 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-500')}>
          {ui.waiting}
        </div>
      ) : null}

      {isMine && match.status === 'pending' ? (
        <div className="mt-6 space-y-4">
          <div className={clsx('rounded-2xl border p-4 text-sm font-medium', theme === 'dark' ? 'bg-zinc-950/70 border-white/5 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-700')}>
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
              className="rounded-2xl bg-emerald-500 py-4 font-black text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {myReady ? ui.waitingForReady : ui.readyAction}
              </span>
            </button>
            <button
              onClick={onForfeit}
              disabled={busy}
              className={clsx('rounded-2xl border py-4 font-bold transition-colors', theme === 'dark' ? 'border-white/10 bg-zinc-950 text-white hover:bg-zinc-900' : 'border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50')}
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
        <div className="mt-6 space-y-6">
          <div>
            <h3 className={clsx('text-lg font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
              {ui.scoreTitle}
            </h3>
            <p className={clsx('mt-1 text-sm', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
              {match.status === 'waiting_confirmation'
                ? myConfirmed
                  ? ui.waitingForConfirm
                  : ui.opponentSubmitted
                : ui.bothReady}
            </p>
          </div>

          {myConfirmed ? (
            <div className="text-center py-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                <Check className="h-8 w-8 text-emerald-500" />
              </div>
              <p className={clsx('font-medium text-lg mb-2', theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700')}>
                {ui.scoreSubmitted}
              </p>
              <p className={clsx(theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
                {ui.waitingForConfirm}
              </p>
            </div>
          ) : (
            <>
              {opponentConfirmed ? (
                <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-500">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <p className="text-sm font-medium">{ui.opponentSubmitted}</p>
                </div>
              ) : null}

              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <label className="mb-3 block text-sm font-bold uppercase tracking-wider text-zinc-500">{ui.yourScore}</label>
                  <input
                    type="number"
                    min="0"
                    max={match.bestOf === 3 ? '2' : '1'}
                    value={myScore}
                    onChange={(event) => onMyScoreChange(event.target.value)}
                    className={clsx('h-24 w-24 rounded-2xl border-2 text-center text-4xl font-black transition-colors focus:border-emerald-500 focus:outline-none', theme === 'dark' ? 'border-zinc-800 bg-zinc-950 text-white' : 'border-zinc-200 bg-zinc-50 text-zinc-900')}
                  />
                </div>
                <div className={clsx('mt-8 text-3xl font-black', theme === 'dark' ? 'text-zinc-700' : 'text-zinc-300')}>-</div>
                <div className="text-center">
                  <label className="mb-3 block text-sm font-bold uppercase tracking-wider text-zinc-500">{ui.theirScore}</label>
                  <input
                    type="number"
                    min="0"
                    max={match.bestOf === 3 ? '2' : '1'}
                    value={opponentScore}
                    onChange={(event) => onOpponentScoreChange(event.target.value)}
                    className={clsx('h-24 w-24 rounded-2xl border-2 text-center text-4xl font-black transition-colors focus:border-emerald-500 focus:outline-none', theme === 'dark' ? 'border-zinc-800 bg-zinc-950 text-white' : 'border-zinc-200 bg-zinc-50 text-zinc-900')}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={onSubmitScore}
                  disabled={busy}
                  className="rounded-2xl bg-emerald-500 py-4 font-black text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-60"
                >
                  {busy ? '...' : ui.submit}
                </button>
                <button
                  onClick={onForfeit}
                  disabled={busy}
                  className={clsx('rounded-2xl border py-4 font-bold transition-colors', theme === 'dark' ? 'border-white/10 bg-zinc-950 text-white hover:bg-zinc-900' : 'border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50')}
                >
                  {ui.forfeit}
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {isMine && (match.status === 'completed' || match.status === 'walkover') ? (
        <div className={clsx('mt-6 rounded-3xl border p-8 text-center', theme === 'dark' ? 'border-emerald-500/20 bg-zinc-950/70' : 'border-emerald-200 bg-emerald-50')}>
          <Trophy className="mx-auto mb-4 h-16 w-16 text-emerald-500" />
          <h3 className={clsx('text-2xl font-black mb-2', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
            {match.status === 'walkover' ? ui.walkover : ui.completed}
          </h3>
          <div className="mb-4 text-4xl font-black tracking-tighter text-emerald-500">
            {typeof myFinalScore === 'number' ? myFinalScore : '-'} - {typeof opponentFinalScore === 'number' ? opponentFinalScore : '-'}
          </div>
          <p className={clsx('font-medium', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600')}>
            {iWon ? ui.victory : ui.defeat}
          </p>
        </div>
      ) : null}
    </div>
  );
}
