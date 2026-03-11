import { useEffect, useState } from 'react';
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

type ScreenOrientationWithLock = ScreenOrientation & {
  lock?: (
    orientation:
      | 'any'
      | 'natural'
      | 'landscape'
      | 'portrait'
      | 'portrait-primary'
      | 'portrait-secondary'
      | 'landscape-primary'
      | 'landscape-secondary',
  ) => Promise<void>;
  unlock?: () => void;
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
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!open || typeof window === 'undefined') {
      return;
    }

    const syncViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };

    syncViewport();
    window.addEventListener('resize', syncViewport);

    return () => {
      window.removeEventListener('resize', syncViewport);
    };
  }, [open]);

  const isPortraitMobile =
    viewport.width > 0 && viewport.width < 820 && viewport.height > viewport.width;

  useEffect(() => {
    if (!open || typeof window === 'undefined') {
      return;
    }

    const orientation = window.screen?.orientation as ScreenOrientationWithLock | undefined;
    const shouldLockLandscape = window.innerWidth < 820;

    if (!shouldLockLandscape || !orientation?.lock) {
      return;
    }

    orientation.lock('landscape').catch(() => undefined);

    return () => {
      orientation.unlock?.();
    };
  }, [open]);

  const mobileHint =
    language === 'zh'
      ? '已按横向长图模式优化，可在窗口内拖动查看完整对阵'
      : 'Optimized for landscape viewing. Drag inside the viewer to explore the bracket.';
  const rotatedWidth = Math.max(viewport.height - 112, 540);
  const rotatedHeight = Math.max(viewport.width - 24, 320);

  const bracketCanvas = (
    <div className="h-full overflow-auto rounded-[1.35rem]" style={{ touchAction: 'pan-x pan-y' }}>
      <div className="min-w-max pb-8">
        <TournamentBracket
          matches={tournament?.bracket.matches ?? []}
          selectedMatchId={selectedMatch?.id ?? null}
          currentUserId={currentUserId}
          theme={theme}
          language={language}
          onSelectMatch={onSelectMatch}
        />
      </div>
    </div>
  );

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
                <div
                  className={clsx(
                    'mt-1 truncate text-lg font-black sm:text-2xl',
                    theme === 'dark' ? 'text-white' : 'text-zinc-900',
                  )}
                >
                  {tournament.name}
                </div>
                <div className={clsx('mt-1 text-xs font-medium', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
                  {mobileHint}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
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
                    'h-full rounded-[1.85rem] border p-2.5 sm:p-4',
                    theme === 'dark' ? 'border-white/6 bg-zinc-900/60' : 'border-zinc-200 bg-zinc-50',
                  )}
                  style={{ touchAction: 'none' }}
                >
                  <div className="relative h-full overflow-hidden rounded-[1.35rem]" style={{ touchAction: 'none' }}>
                    {isPortraitMobile ? (
                      <div className="absolute inset-0 overflow-hidden" style={{ touchAction: 'none' }}>
                        <div
                          className={clsx(
                            'absolute left-1/2 top-1/2 overflow-hidden rounded-[1.75rem] border p-2.5 shadow-[0_26px_70px_rgba(2,6,23,0.34)]',
                            theme === 'dark' ? 'border-white/8 bg-zinc-950/95' : 'border-zinc-200 bg-white',
                          )}
                          style={{
                            width: `${rotatedWidth}px`,
                            height: `${rotatedHeight}px`,
                            transform: 'translate(-50%, -50%) rotate(90deg)',
                            touchAction: 'none',
                          }}
                        >
                          {bracketCanvas}
                        </div>
                      </div>
                    ) : (
                      bracketCanvas
                    )}
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
