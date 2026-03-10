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
  onClose: () => void;
  onSelectMatch: (match: TournamentBracketMatch) => void;
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
  onClose,
  onSelectMatch,
}: TournamentBracketDialogProps) {
  return (
    <AnimatePresence>
      {tournament && open ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/75 backdrop-blur-md" />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            className={clsx('relative z-10 flex h-[90vh] w-full max-w-[1400px] flex-col overflow-hidden rounded-[2rem] border', theme === 'dark' ? 'bg-zinc-950 border-white/10' : 'bg-white border-zinc-200 shadow-2xl')}
          >
            <div className={clsx('flex items-center justify-between border-b px-5 py-4', theme === 'dark' ? 'border-white/10' : 'border-zinc-200')}>
              <div>
                <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-500">{title}</div>
                <div className={clsx('mt-1 text-lg font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                  {tournament.name}
                </div>
              </div>
              <button
                onClick={onClose}
                className={clsx('rounded-2xl border px-4 py-2 text-sm font-bold transition-colors', theme === 'dark' ? 'border-white/10 bg-zinc-900 text-white hover:bg-zinc-800' : 'border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50')}
              >
                <span className="inline-flex items-center gap-2">
                  <X className="h-4 w-4" />
                  {closeLabel}
                </span>
              </button>
            </div>

            <div className="flex-1 overflow-auto p-5">
              {tournament.status === 'registration' ? (
                <div className={clsx('rounded-2xl border p-6 text-center', theme === 'dark' ? 'bg-zinc-950/60 border-white/5' : 'bg-zinc-50 border-zinc-200')}>
                  <p className="font-medium text-zinc-500">{emptyLabel}</p>
                </div>
              ) : tournament.status === 'cancelled' ? (
                <div className={clsx('rounded-2xl border p-6 text-center', theme === 'dark' ? 'bg-zinc-950/60 border-white/5' : 'bg-zinc-50 border-zinc-200')}>
                  <p className="font-medium text-zinc-500">{cancelledLabel}</p>
                </div>
              ) : (
                <TournamentBracket
                  matches={tournament.bracket.matches}
                  selectedMatchId={selectedMatch?.id ?? null}
                  currentUserId={currentUserId}
                  theme={theme}
                  language={language}
                  onSelectMatch={onSelectMatch}
                />
              )}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
