import clsx from 'clsx';
import { Trophy } from 'lucide-react';

import type { Language, ShowcaseSlot, Theme, Trophy as TrophyType } from '../types';
import PrizeIcon from './PrizeIcon';
import TrophyBadge from './TrophyBadge';

type TrophyShowcaseCabinetProps = {
  language: Language;
  theme: Theme;
  slots: ShowcaseSlot[];
  trophies: TrophyType[];
  displayMode?: 'icon' | 'badge';
  onSelectTrophy?: (trophy: TrophyType) => void;
  onEmptySlotClick?: () => void;
};

const copy = {
  en: {
    empty: 'Empty slot',
    hint: 'Tap to place a trophy.',
  },
  zh: {
    empty: '空展示位',
    hint: '点击空位可放入奖杯。',
  },
} as const;

export default function TrophyShowcaseCabinet({
  language,
  theme,
  slots,
  trophies,
  displayMode = 'icon',
  onSelectTrophy,
  onEmptySlotClick,
}: TrophyShowcaseCabinetProps) {
  const ui = copy[language];

  return (
    <div>
      <div
        className={clsx(
          'relative overflow-hidden rounded-t-[2rem] border-x-8 border-t-8 px-4 pb-4 pt-5 shadow-2xl sm:px-6 sm:pt-6',
          theme === 'dark' ? 'border-zinc-800 bg-zinc-900/80' : 'border-zinc-300 bg-zinc-100',
        )}
      >
        <div
          className={clsx(
            'pointer-events-none absolute inset-x-6 top-3 h-10 rounded-full blur-2xl',
            theme === 'dark' ? 'bg-white/10' : 'bg-white/60',
          )}
        />

        <div className="relative z-10 grid grid-cols-3 gap-3 sm:gap-4">
          {slots.map((slot) => {
            const trophy = trophies.find((currentTrophy) => currentTrophy.id === slot.trophyId) ?? null;
            const isInteractive = Boolean((trophy && onSelectTrophy) || (!trophy && onEmptySlotClick));

            return (
              <button
                key={slot.slotId}
                type="button"
                disabled={!isInteractive}
                onClick={
                  trophy
                    ? () => onSelectTrophy?.(trophy)
                    : () => onEmptySlotClick?.()
                }
                className={clsx(
                  'group relative aspect-square overflow-hidden rounded-2xl border-2 border-dashed transition-all',
                  theme === 'dark' ? 'bg-zinc-950/40' : 'bg-white/80',
                  trophy
                    ? theme === 'dark'
                      ? 'border-amber-500/30 hover:border-amber-500/60'
                      : 'border-amber-500/35 hover:border-amber-500/70 shadow-sm'
                    : theme === 'dark'
                      ? 'border-white/6 hover:border-white/12 hover:bg-zinc-950/65'
                      : 'border-zinc-200 hover:border-zinc-300 hover:bg-white',
                  isInteractive ? 'cursor-pointer hover:-translate-y-0.5' : 'cursor-default',
                )}
              >
                {trophy ? (
                  <div className="h-full w-full p-2">
                    {displayMode === 'badge' ? (
                      <TrophyBadge trophy={trophy} theme={theme} language={language} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-[1.15rem]">
                        <PrizeIcon rank={trophy.rank} className="h-full w-full" />
                      </div>
                    )}
                    {displayMode === 'icon' ? (
                      <div
                        className={clsx(
                          'pointer-events-none absolute inset-x-3 bottom-3 rounded-xl border px-2 py-1.5 text-center backdrop-blur-sm',
                          theme === 'dark'
                            ? 'border-white/8 bg-zinc-950/72 text-white'
                            : 'border-white/80 bg-white/78 text-zinc-900',
                        )}
                      >
                        <div className="line-clamp-1 text-[11px] font-black leading-tight">{trophy.name}</div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 px-3 text-center">
                    <div
                      className={clsx(
                        'flex h-14 w-14 items-center justify-center rounded-full border border-dashed transition-colors',
                        theme === 'dark'
                          ? 'border-white/10 bg-white/5 text-zinc-600 group-hover:text-zinc-400'
                          : 'border-zinc-300 bg-zinc-50 text-zinc-400 group-hover:text-zinc-500',
                      )}
                    >
                      <Trophy className="h-6 w-6" />
                    </div>
                    <div className={clsx('text-xs font-bold leading-5', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
                      {onEmptySlotClick ? ui.hint : ui.empty}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className={clsx('relative z-10 mt-4 h-4 rounded-full shadow-inner', theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-300')} />
      </div>

      <div
        className={clsx(
          'h-5 rounded-b-[2rem] border-x-8 border-b-8 shadow-xl',
          theme === 'dark' ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-300 bg-zinc-200',
        )}
      />
    </div>
  );
}
