import { Minus, Plus, RotateCcw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
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

const zoomStep = 0.1;
const minZoom = 0.65;
const maxZoom = 1.3;

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
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!open) {
      return;
    }

    setZoom(window.innerWidth < 640 ? 0.78 : 1);
  }, [open]);

  const zoomLabel = `${Math.round(zoom * 100)}%`;

  return (
    <AnimatePresence>
      {tournament && open ? (
        <div className="fixed inset-0 z-[120] p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/78 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            className={clsx(
              'relative z-10 flex h-screen w-screen flex-col overflow-hidden sm:mx-auto sm:h-[90vh] sm:max-w-[1600px] sm:rounded-[2rem] sm:border',
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
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div
                  className={clsx(
                    'inline-flex items-center gap-1 rounded-2xl border px-2 py-2',
                    theme === 'dark'
                      ? 'border-white/10 bg-zinc-900'
                      : 'border-zinc-200 bg-zinc-50',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setZoom((current) => Math.max(minZoom, Number((current - zoomStep).toFixed(2))))}
                    className={clsx(
                      'rounded-xl p-2 transition-colors',
                      theme === 'dark' ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-700 hover:bg-white',
                    )}
                    aria-label="Zoom out"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(window.innerWidth < 640 ? 0.78 : 1)}
                    className={clsx(
                      'rounded-xl px-3 py-2 text-xs font-black uppercase tracking-[0.18em] transition-colors',
                      theme === 'dark' ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-700 hover:bg-white',
                    )}
                  >
                    <RotateCcw className="mr-1 inline h-3.5 w-3.5" />
                    {zoomLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom((current) => Math.min(maxZoom, Number((current + zoomStep).toFixed(2))))}
                    className={clsx(
                      'rounded-xl p-2 transition-colors',
                      theme === 'dark' ? 'text-zinc-300 hover:bg-zinc-800' : 'text-zinc-700 hover:bg-white',
                    )}
                    aria-label="Zoom in"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
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
            </div>

            <div className="flex-1 overflow-hidden px-3 pb-3 pt-4 sm:px-5 sm:pb-5">
              {tournament.status === 'registration' ? (
                <div
                  className={clsx(
                    'rounded-2xl border p-6 text-center',
                    theme === 'dark' ? 'border-white/5 bg-zinc-950/60' : 'border-zinc-200 bg-zinc-50',
                  )}
                >
                  <p className="font-medium text-zinc-500">{emptyLabel}</p>
                </div>
              ) : tournament.status === 'cancelled' ? (
                <div
                  className={clsx(
                    'rounded-2xl border p-6 text-center',
                    theme === 'dark' ? 'border-white/5 bg-zinc-950/60' : 'border-zinc-200 bg-zinc-50',
                  )}
                >
                  <p className="font-medium text-zinc-500">{cancelledLabel}</p>
                </div>
              ) : (
                <div
                  className={clsx(
                    'h-full rounded-[1.75rem] border p-3 sm:p-4',
                    theme === 'dark'
                      ? 'border-white/6 bg-zinc-900/60'
                      : 'border-zinc-200 bg-zinc-50',
                  )}
                >
                  <div
                    className="h-full overflow-auto rounded-[1.35rem]"
                    style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
                  >
                    <div
                      className="origin-top-left pb-6"
                      style={{
                        transform: `scale(${zoom})`,
                        width: `calc(100% / ${zoom})`,
                      }}
                    >
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
              )}
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
