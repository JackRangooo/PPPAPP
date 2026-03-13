import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import clsx from 'clsx';

import TournamentBracket from './TournamentBracket';
import type { Language, Theme, Tournament, TournamentBracketMatch } from '../types';

type TournamentBracketDialogProps = {
  open: boolean;
  theme: Theme;
  language: Language;
  tournament: Tournament | null;
  currentUserId: string | null;
  selectedMatch: TournamentBracketMatch | null;
  emptyLabel: string;
  cancelledLabel: string;
  title: string;
  closeLabel: string;
  canManageScores: boolean;
  adminScoreBusy: boolean;
  adminScoreTitle: string;
  adminScoreHint: string;
  adminScoreSubmitLabel: string;
  onClose: () => void;
  onSelectMatch: (match: TournamentBracketMatch) => void;
  onAdminSubmitScore: (matchId: string, player1Score: number, player2Score: number) => void;
};

const copy = {
  en: {
    viewerHint: 'Compact bracket view. Scroll inside the viewer to follow every matchup.',
    selectedMatch: 'Selected Match',
    waitingPlayers: 'Both players must be assigned before an admin can settle this match.',
    adminOnly: 'Root admins can settle the selected bracket match directly from here.',
    player1: 'Player 1',
    player2: 'Player 2',
    submitHint: 'Saving here will immediately settle the bracket slot.',
    enterScore: 'Enter a non-tied final score for both players.',
    noneSelected: 'Select a match node to inspect it here.',
    notAvailable: 'This match is already settled.',
    unknown: 'TBD',
    score: 'Score',
    bestOf: 'Best of',
    waiting: 'Waiting',
    pending: 'Ready',
    ongoing: 'Live',
    waiting_confirmation: 'Confirm',
    completed: 'Done',
    walkover: 'Walkover',
    final: 'Grand Final',
    third_place: 'Third Place Match',
    semifinal: 'Semifinal',
    quarterfinal: 'Qualifier',
  },
  zh: {
    viewerHint: '对阵表已改成紧凑模式，直接在窗口内横向或纵向滑动即可查看完整签表。',
    selectedMatch: '当前选中比赛',
    waitingPlayers: '要先让双方球员进入这个签位，管理员才能直接录入比分。',
    adminOnly: 'root 管理员可以在这里直接结算当前选中的对阵。',
    player1: '选手 1',
    player2: '选手 2',
    submitHint: '在这里保存最终比分后，这场对阵会立刻完成结算。',
    enterScore: '请输入不相同的最终比分。',
    noneSelected: '先在对阵表里点选一场比赛。',
    notAvailable: '这场比赛已经结算完成。',
    unknown: '待定',
    score: '比分',
    bestOf: '赛制',
    waiting: '待定',
    pending: '待就绪',
    ongoing: '进行中',
    waiting_confirmation: '待确认',
    completed: '已完成',
    walkover: '轮空',
    final: '决赛',
    third_place: '季军赛',
    semifinal: '半决赛',
    quarterfinal: '资格赛',
  },
} as const;

const getSourceLabel = (language: Language, source: string | null) => {
  if (!source) {
    return '';
  }

  if (language === 'en') {
    return source;
  }

  const winnerMatch = source.match(/^Winner of (.+)$/);
  if (winnerMatch) {
    return `${winnerMatch[1]}胜者`;
  }

  const loserMatch = source.match(/^Loser of (.+)$/);
  if (loserMatch) {
    return `${loserMatch[1]}败者`;
  }

  return source
    .replace(/^Grand Final$/, '决赛')
    .replace(/^Third Place Match$/, '季军赛')
    .replace(/^Semifinal (\d+)$/, '半决赛 $1')
    .replace(/^(Quarterfinal|Qualifier|Play-In) (\d+)$/, '资格赛 $2');
};

const getPlayerLabel = (language: Language, match: TournamentBracketMatch, slot: 1 | 2) => {
  const copyBlock = copy[language];
  const name = slot === 1 ? match.player1Name : match.player2Name;
  const source = slot === 1 ? match.player1Source : match.player2Source;
  return name || getSourceLabel(language, source) || copyBlock.unknown;
};

const getMatchLabel = (language: Language, match: TournamentBracketMatch) => {
  const copyBlock = copy[language];

  if (match.stage === 'final') {
    return copyBlock.final;
  }

  if (match.stage === 'third_place') {
    return copyBlock.third_place;
  }

  if (match.stage === 'semifinal') {
    return language === 'zh' ? `半决赛 ${match.slot}` : `Semifinal ${match.slot}`;
  }

  return language === 'zh' ? `资格赛 ${match.slot}` : `Qualifier ${match.slot}`;
};

export default function TournamentBracketDialog({
  open,
  theme,
  language,
  tournament,
  currentUserId,
  selectedMatch,
  emptyLabel,
  cancelledLabel,
  title,
  closeLabel,
  canManageScores,
  adminScoreBusy,
  adminScoreTitle,
  adminScoreHint,
  adminScoreSubmitLabel,
  onClose,
  onSelectMatch,
  onAdminSubmitScore,
}: TournamentBracketDialogProps) {
  const ui = copy[language];
  const [player1Score, setPlayer1Score] = useState('');
  const [player2Score, setPlayer2Score] = useState('');

  useEffect(() => {
    if (!selectedMatch) {
      setPlayer1Score('');
      setPlayer2Score('');
      return;
    }

    setPlayer1Score(
      typeof selectedMatch.player1Score === 'number' ? String(selectedMatch.player1Score) : '',
    );
    setPlayer2Score(
      typeof selectedMatch.player2Score === 'number' ? String(selectedMatch.player2Score) : '',
    );
  }, [selectedMatch]);

  const selectedMatchMeta = useMemo(() => {
    if (!selectedMatch) {
      return null;
    }

    return {
      label: getMatchLabel(language, selectedMatch),
      player1Label: getPlayerLabel(language, selectedMatch, 1),
      player2Label: getPlayerLabel(language, selectedMatch, 2),
      statusLabel: ui[selectedMatch.status],
      canAdminScore:
        canManageScores &&
        selectedMatch.status !== 'completed' &&
        selectedMatch.status !== 'walkover' &&
        Boolean(selectedMatch.player1Id && selectedMatch.player2Id),
      isSettled:
        selectedMatch.status === 'completed' || selectedMatch.status === 'walkover',
    };
  }, [canManageScores, language, selectedMatch, ui]);

  const handleAdminSubmit = () => {
    if (!selectedMatch || !selectedMatchMeta?.canAdminScore) {
      return;
    }

    const nextPlayer1Score = Number(player1Score);
    const nextPlayer2Score = Number(player2Score);
    if (
      !Number.isInteger(nextPlayer1Score) ||
      !Number.isInteger(nextPlayer2Score) ||
      nextPlayer1Score < 0 ||
      nextPlayer2Score < 0 ||
      nextPlayer1Score === nextPlayer2Score
    ) {
      window.alert(ui.enterScore);
      return;
    }

    onAdminSubmitScore(selectedMatch.id, nextPlayer1Score, nextPlayer2Score);
  };

  return (
    <AnimatePresence>
      {tournament && open ? (
        <div className="fixed inset-0 z-[120] p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/82 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            className={clsx(
              'relative z-10 flex h-screen w-screen flex-col overflow-hidden sm:mx-auto sm:h-[92vh] sm:max-w-[1680px] sm:rounded-[2rem] sm:border',
              theme === 'dark'
                ? 'bg-zinc-950 sm:border-white/10'
                : 'bg-white sm:border-zinc-200 sm:shadow-2xl',
            )}
          >
            <div
              className={clsx(
                'flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-6',
                theme === 'dark' ? 'border-white/10' : 'border-zinc-200',
              )}
            >
              <div className="min-w-0">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-500">{title}</div>
                <div className={clsx('mt-1 truncate text-lg font-black sm:text-2xl', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                  {tournament.name}
                </div>
                <div className={clsx('mt-1 text-xs font-medium', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
                  {ui.viewerHint}
                </div>
              </div>

              <button
                onClick={onClose}
                className={clsx(
                  'rounded-2xl border px-4 py-2 text-sm font-bold transition-colors',
                  theme === 'dark'
                    ? 'border-white/10 bg-zinc-900 text-white hover:bg-zinc-800'
                    : 'border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50',
                )}
              >
                <span className="inline-flex items-center gap-2">
                  <X className="h-4 w-4" />
                  {closeLabel}
                </span>
              </button>
            </div>

            <div className="flex-1 overflow-hidden px-3 pb-3 pt-4 sm:px-5 sm:pb-5">
              {tournament.status === 'registration' ? (
                <div className={clsx('rounded-2xl border p-6 text-center', theme === 'dark' ? 'border-white/5 bg-zinc-950/60' : 'border-zinc-200 bg-zinc-50')}>
                  <p className="font-medium text-zinc-500">{emptyLabel}</p>
                </div>
              ) : tournament.status === 'cancelled' ? (
                <div className={clsx('rounded-2xl border p-6 text-center', theme === 'dark' ? 'border-white/5 bg-zinc-950/60' : 'border-zinc-200 bg-zinc-50')}>
                  <p className="font-medium text-zinc-500">{cancelledLabel}</p>
                </div>
              ) : (
                <div className="h-full overflow-y-auto pr-1">
                  <div className="flex min-h-full flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-4">
                    <div className={clsx('min-h-[24rem] rounded-[1.85rem] border p-2.5 sm:p-4 lg:min-h-0 lg:h-full', theme === 'dark' ? 'border-white/6 bg-zinc-900/60' : 'border-zinc-200 bg-zinc-50')}>
                      <div className="h-full overflow-auto rounded-[1.35rem]" style={{ touchAction: 'pan-x pan-y' }}>
                        <div className="min-w-max pb-4 pr-3">
                          <TournamentBracket
                            matches={tournament.bracket.matches}
                            selectedMatchId={selectedMatch?.id ?? null}
                            currentUserId={currentUserId}
                            theme={theme}
                            language={language}
                            onSelectMatch={onSelectMatch}
                          />
                        </div>
                      </div>
                    </div>

                    <aside className={clsx('rounded-[1.6rem] border p-4', theme === 'dark' ? 'border-white/8 bg-zinc-900/72' : 'border-zinc-200 bg-white shadow-sm')}>
                      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-500">{ui.selectedMatch}</div>
                      {selectedMatch && selectedMatchMeta ? (
                        <div className="mt-3 space-y-3">
                          <div className={clsx('rounded-[1.3rem] border p-3', theme === 'dark' ? 'border-white/6 bg-zinc-950/80' : 'border-zinc-200 bg-zinc-50')}>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className={clsx('text-sm font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                                  {selectedMatchMeta.label}
                                </div>
                                <div className={clsx('mt-1 text-xs', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
                                  {ui.bestOf} BO{selectedMatch.bestOf}
                                </div>
                              </div>
                              <div className={clsx('rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em]', theme === 'dark' ? 'border-white/10 bg-white/5 text-zinc-300' : 'border-zinc-200 bg-white text-zinc-700')}>
                                {selectedMatchMeta.statusLabel}
                              </div>
                            </div>

                            <div className="mt-3 space-y-2">
                              <div className={clsx('flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5', theme === 'dark' ? 'border-white/6 bg-zinc-900' : 'border-zinc-200 bg-white')}>
                                <div className="min-w-0 text-sm font-bold text-white/90 dark:text-white">
                                  {selectedMatchMeta.player1Label}
                                </div>
                                <div className={clsx('shrink-0 text-base font-black', theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700')}>
                                  {typeof selectedMatch.player1Score === 'number' ? selectedMatch.player1Score : '-'}
                                </div>
                              </div>
                              <div className={clsx('flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5', theme === 'dark' ? 'border-white/6 bg-zinc-900' : 'border-zinc-200 bg-white')}>
                                <div className="min-w-0 text-sm font-bold text-white/90 dark:text-white">
                                  {selectedMatchMeta.player2Label}
                                </div>
                                <div className={clsx('shrink-0 text-base font-black', theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700')}>
                                  {typeof selectedMatch.player2Score === 'number' ? selectedMatch.player2Score : '-'}
                                </div>
                              </div>
                            </div>
                          </div>

                          {canManageScores ? (
                            <div className={clsx('rounded-[1.3rem] border p-3.5', theme === 'dark' ? 'border-white/6 bg-zinc-950/80' : 'border-zinc-200 bg-zinc-50')}>
                              <div className="text-sm font-black text-emerald-500">{adminScoreTitle}</div>
                              <p className={clsx('mt-2 text-xs leading-5', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600')}>
                                {selectedMatchMeta.canAdminScore ? ui.submitHint : selectedMatchMeta.isSettled ? ui.notAvailable : ui.waitingPlayers}
                              </p>
                              <p className={clsx('mt-2 text-xs leading-5', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
                                {adminScoreHint}
                              </p>

                              <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-3">
                                <label className="text-center">
                                  <span className={clsx('mb-2 block truncate text-[11px] font-black uppercase tracking-[0.16em]', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
                                    {selectedMatchMeta.player1Label || ui.player1}
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    inputMode="numeric"
                                    value={player1Score}
                                    disabled={!selectedMatchMeta.canAdminScore || adminScoreBusy}
                                    onChange={(event) => setPlayer1Score(event.target.value)}
                                    className={clsx('h-14 w-full rounded-2xl border text-center text-xl font-black focus:border-emerald-500 focus:outline-none', theme === 'dark' ? 'border-white/10 bg-zinc-900 text-white disabled:opacity-50' : 'border-zinc-200 bg-white text-zinc-900 disabled:opacity-50')}
                                  />
                                </label>
                                <div className={clsx('pb-4 text-lg font-black', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>-</div>
                                <label className="text-center">
                                  <span className={clsx('mb-2 block truncate text-[11px] font-black uppercase tracking-[0.16em]', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
                                    {selectedMatchMeta.player2Label || ui.player2}
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    inputMode="numeric"
                                    value={player2Score}
                                    disabled={!selectedMatchMeta.canAdminScore || adminScoreBusy}
                                    onChange={(event) => setPlayer2Score(event.target.value)}
                                    className={clsx('h-14 w-full rounded-2xl border text-center text-xl font-black focus:border-emerald-500 focus:outline-none', theme === 'dark' ? 'border-white/10 bg-zinc-900 text-white disabled:opacity-50' : 'border-zinc-200 bg-white text-zinc-900 disabled:opacity-50')}
                                  />
                                </label>
                              </div>

                              <button
                                type="button"
                                onClick={handleAdminSubmit}
                                disabled={!selectedMatchMeta.canAdminScore || adminScoreBusy}
                                className="mt-4 w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-zinc-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {adminScoreSubmitLabel}
                              </button>
                            </div>
                          ) : (
                            <div className={clsx('rounded-[1.3rem] border p-3 text-xs leading-5', theme === 'dark' ? 'border-white/6 bg-zinc-950/80 text-zinc-400' : 'border-zinc-200 bg-zinc-50 text-zinc-600')}>
                              {ui.adminOnly}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className={clsx('mt-3 rounded-[1.3rem] border p-4 text-sm', theme === 'dark' ? 'border-white/6 bg-zinc-950/80 text-zinc-400' : 'border-zinc-200 bg-zinc-50 text-zinc-600')}>
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                            <span>{ui.noneSelected}</span>
                          </div>
                        </div>
                      )}
                    </aside>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
