import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
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
    viewerHint: 'Compact bracket view. Drag inside this window to inspect the full tree.',
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
    panelAction: 'Match Details',
  },
  zh: {
    viewerHint: '这是紧凑版对阵表，可在窗口内拖动查看完整签表。',
    selectedMatch: '当前选中比赛',
    waitingPlayers: '需要先让双方球员进入这个签位，管理员才能直接录入比分。',
    adminOnly: '只有 root 管理员可以在这里直接结算当前选中的对阵。',
    player1: '选手 1',
    player2: '选手 2',
    submitHint: '在这里保存最终比分后，这场对阵会立即完成结算。',
    enterScore: '请输入不相同的最终比分。',
    noneSelected: '先在对阵表里选中一场比赛。',
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
    panelAction: '比赛详情',
  },
} as const;

const getSourceLabel = (language: Language, source: string | null) => {
  if (!source) {
    return '';
  }

  if (language === 'en') {
    return source;
  }

  const normalize = (value: string) =>
    value
      .replace(/^Grand Final$/, '决赛')
      .replace(/^Third Place Match$/, '季军赛')
      .replace(/^Semifinal (\d+)$/, '半决赛 $1')
      .replace(/^(Quarterfinal|Qualifier|Play-In) (\d+)$/, '资格赛 $2');

  const winnerMatch = source.match(/^Winner of (.+)$/);
  if (winnerMatch) {
    return `${normalize(winnerMatch[1])}胜者`;
  }

  const loserMatch = source.match(/^Loser of (.+)$/);
  if (loserMatch) {
    return `${normalize(loserMatch[1])}败者`;
  }

  return normalize(source);
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

    setPlayer1Score(typeof selectedMatch.player1Score === 'number' ? String(selectedMatch.player1Score) : '');
    setPlayer2Score(typeof selectedMatch.player2Score === 'number' ? String(selectedMatch.player2Score) : '');
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
      isSettled: selectedMatch.status === 'completed' || selectedMatch.status === 'walkover',
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

  const renderSelectedMatchPanel = (compact: boolean) => {
    if (!selectedMatch || !selectedMatchMeta) {
      return (
        <div className={clsx('rounded-[1.2rem] border p-3.5', theme === 'dark' ? 'border-white/6 bg-zinc-950/80' : 'border-zinc-200 bg-zinc-50')}>
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-500">{ui.selectedMatch}</div>
          <p className={clsx('mt-2 text-sm', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500')}>{ui.noneSelected}</p>
        </div>
      );
    }

    return (
      <div className={clsx('rounded-[1.2rem] border p-3.5', theme === 'dark' ? 'border-white/6 bg-zinc-950/82' : 'border-zinc-200 bg-zinc-50')}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-500">
              {compact ? ui.panelAction : ui.selectedMatch}
            </div>
            <div className={clsx('mt-1.5 text-sm font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
              {selectedMatchMeta.label}
            </div>
            <div className={clsx('mt-1 text-[11px]', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
              {ui.bestOf} BO{selectedMatch.bestOf}
            </div>
          </div>
          <div className={clsx('rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em]', theme === 'dark' ? 'border-white/10 bg-white/5 text-zinc-300' : 'border-zinc-200 bg-white text-zinc-700')}>
            {selectedMatchMeta.statusLabel}
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <div className={clsx('flex items-center justify-between gap-3 rounded-2xl border px-3 py-2', theme === 'dark' ? 'border-white/6 bg-zinc-900' : 'border-zinc-200 bg-white')}>
            <div className={clsx('min-w-0 truncate text-sm font-bold', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
              {selectedMatchMeta.player1Label}
            </div>
            <div className={clsx('shrink-0 text-sm font-black', theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700')}>
              {typeof selectedMatch.player1Score === 'number' ? selectedMatch.player1Score : '-'}
            </div>
          </div>
          <div className={clsx('flex items-center justify-between gap-3 rounded-2xl border px-3 py-2', theme === 'dark' ? 'border-white/6 bg-zinc-900' : 'border-zinc-200 bg-white')}>
            <div className={clsx('min-w-0 truncate text-sm font-bold', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
              {selectedMatchMeta.player2Label}
            </div>
            <div className={clsx('shrink-0 text-sm font-black', theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700')}>
              {typeof selectedMatch.player2Score === 'number' ? selectedMatch.player2Score : '-'}
            </div>
          </div>
        </div>

        {canManageScores ? (
          <div className={clsx('mt-3 rounded-[1rem] border p-3', theme === 'dark' ? 'border-white/6 bg-zinc-900/78' : 'border-zinc-200 bg-white')}>
            <div className="text-sm font-black text-emerald-500">{adminScoreTitle}</div>
            <p className={clsx('mt-2 text-xs leading-5', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600')}>
              {selectedMatchMeta.canAdminScore
                ? ui.submitHint
                : selectedMatchMeta.isSettled
                  ? ui.notAvailable
                  : ui.waitingPlayers}
            </p>
            <p className={clsx('mt-1.5 text-xs leading-5', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
              {adminScoreHint}
            </p>

            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2.5">
              <label className="text-center">
                <span className={clsx('mb-1.5 block truncate text-[10px] font-black uppercase tracking-[0.14em]', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
                  {selectedMatchMeta.player1Label || ui.player1}
                </span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={player1Score}
                  disabled={!selectedMatchMeta.canAdminScore || adminScoreBusy}
                  onChange={(event) => setPlayer1Score(event.target.value)}
                  className={clsx('h-11 w-full rounded-2xl border text-center text-lg font-black focus:border-emerald-500 focus:outline-none', theme === 'dark' ? 'border-white/10 bg-zinc-950 text-white disabled:opacity-50' : 'border-zinc-200 bg-white text-zinc-900 disabled:opacity-50')}
                />
              </label>
              <div className={clsx('pb-2.5 text-base font-black', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>-</div>
              <label className="text-center">
                <span className={clsx('mb-1.5 block truncate text-[10px] font-black uppercase tracking-[0.14em]', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
                  {selectedMatchMeta.player2Label || ui.player2}
                </span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={player2Score}
                  disabled={!selectedMatchMeta.canAdminScore || adminScoreBusy}
                  onChange={(event) => setPlayer2Score(event.target.value)}
                  className={clsx('h-11 w-full rounded-2xl border text-center text-lg font-black focus:border-emerald-500 focus:outline-none', theme === 'dark' ? 'border-white/10 bg-zinc-950 text-white disabled:opacity-50' : 'border-zinc-200 bg-white text-zinc-900 disabled:opacity-50')}
                />
              </label>
            </div>

            <button
              type="button"
              onClick={handleAdminSubmit}
              disabled={!selectedMatchMeta.canAdminScore || adminScoreBusy}
              className="mt-3 w-full rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-black text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-60"
            >
              {adminScoreBusy ? '...' : adminScoreSubmitLabel}
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  const showMobilePanel = Boolean(selectedMatch);

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
              'relative z-10 flex h-screen w-screen flex-col overflow-hidden sm:mx-auto sm:h-[92vh] sm:max-w-[1480px] sm:rounded-[2rem] sm:border',
              theme === 'dark'
                ? 'bg-zinc-950 sm:border-white/10'
                : 'bg-white sm:border-zinc-200 sm:shadow-2xl',
            )}
          >
            <div
              className={clsx(
                'flex items-start justify-between gap-3 border-b px-4 py-3 sm:px-5',
                theme === 'dark' ? 'border-white/10' : 'border-zinc-200',
              )}
            >
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-500">{title}</div>
                <div className={clsx('mt-1 truncate text-base font-black sm:text-2xl', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                  {tournament.name}
                </div>
                <div className={clsx('mt-1 hidden text-[11px] font-medium sm:block', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
                  {ui.viewerHint}
                </div>
              </div>

              <button
                onClick={onClose}
                className={clsx(
                  'rounded-2xl border px-3 py-2 text-sm font-bold transition-colors',
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

            <div className="flex-1 overflow-hidden px-2.5 pb-2.5 pt-3 sm:px-5 sm:pb-5">
              {tournament.status === 'registration' ? (
                <div className={clsx('rounded-2xl border p-6 text-center', theme === 'dark' ? 'border-white/5 bg-zinc-950/60' : 'border-zinc-200 bg-zinc-50')}>
                  <p className="font-medium text-zinc-500">{emptyLabel}</p>
                </div>
              ) : tournament.status === 'cancelled' ? (
                <div className={clsx('rounded-2xl border p-6 text-center', theme === 'dark' ? 'border-white/5 bg-zinc-950/60' : 'border-zinc-200 bg-zinc-50')}>
                  <p className="font-medium text-zinc-500">{cancelledLabel}</p>
                </div>
              ) : (
                <div className="flex h-full flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-4">
                  <div className={clsx('min-h-0 flex-1 rounded-[1.4rem] border p-2 sm:p-3', theme === 'dark' ? 'border-white/6 bg-zinc-900/60' : 'border-zinc-200 bg-zinc-50')}>
                    <div className="h-full overflow-auto rounded-[1.15rem] overscroll-contain" style={{ touchAction: 'pan-x pan-y' }}>
                      <div className="min-w-max pb-2 pr-2 sm:pb-3 sm:pr-3">
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

                  <aside className="hidden lg:block">{renderSelectedMatchPanel(false)}</aside>

                  {showMobilePanel ? <div className="lg:hidden">{renderSelectedMatchPanel(true)}</div> : null}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

