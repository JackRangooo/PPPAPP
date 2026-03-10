import clsx from 'clsx';
import { Trophy } from 'lucide-react';

import type { Language, ShowcaseSlot, Theme, Trophy as TrophyType } from '../types';
import PrizeIcon from './PrizeIcon';

type TrophyShowcaseCabinetProps = {
  language: Language;
  theme: Theme;
  slots: ShowcaseSlot[];
  trophies: TrophyType[];
  onSelectTrophy?: (trophy: TrophyType) => void;
  onEmptySlotClick?: () => void;
};

const copy = {
  en: {
    empty: 'Empty pedestal',
    hint: 'Tap a pedestal to place a trophy.',
  },
  zh: {
    empty: '空展示位',
    hint: '点击展示位可以放入奖杯。',
  },
} as const;

export default function TrophyShowcaseCabinet({
  language,
  theme,
  slots,
  trophies,
  onSelectTrophy,
  onEmptySlotClick,
}: TrophyShowcaseCabinetProps) {
  const ui = copy[language];

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-[2.5rem] p-4 shadow-[0_30px_70px_rgba(15,23,42,0.22)]',
        theme === 'dark'
          ? 'bg-gradient-to-b from-[#4b2f22] via-[#241711] to-[#140c08]'
          : 'bg-gradient-to-b from-[#d8b287] via-[#b5825b] to-[#845638]',
      )}
    >
      <div className={clsx('absolute inset-[14px] rounded-[2rem] border', theme === 'dark' ? 'border-white/10 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.14),_rgba(255,255,255,0.03)_36%,_rgba(0,0,0,0.18)_100%)]' : 'border-white/60 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.88),_rgba(255,255,255,0.46)_35%,_rgba(148,163,184,0.18)_100%)]')} />
      <div className="absolute inset-x-10 top-4 h-6 rounded-full bg-white/20 blur-2xl" />
      <div className="relative z-10 grid gap-4 md:grid-cols-3">
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
                'relative min-h-[240px] rounded-[2rem] border px-4 pb-6 pt-8 text-center transition-all',
                theme === 'dark'
                  ? 'border-white/8 bg-black/25'
                  : 'border-white/55 bg-white/35',
                isInteractive ? 'cursor-pointer hover:-translate-y-1 hover:shadow-[0_24px_40px_rgba(15,23,42,0.16)]' : 'cursor-default',
              )}
            >
              <div className="absolute left-1/2 top-4 h-20 w-20 -translate-x-1/2 rounded-full bg-white/25 blur-2xl" />
              <div className="absolute bottom-10 left-4 right-4 h-2 rounded-full bg-black/20 shadow-inner" />
              <div className={clsx('absolute bottom-4 left-1/2 h-6 w-[70%] -translate-x-1/2 rounded-[1.4rem] border', theme === 'dark' ? 'border-white/10 bg-zinc-900/85' : 'border-amber-200 bg-amber-50/90')} />
              <div className={clsx('absolute bottom-7 left-1/2 h-10 w-[42%] -translate-x-1/2 rounded-t-[1.3rem] border', theme === 'dark' ? 'border-white/10 bg-zinc-950/90' : 'border-amber-200 bg-white/85')} />

              {trophy ? (
                <div className="relative z-10 flex h-full flex-col items-center justify-end gap-4">
                  <PrizeIcon rank={trophy.rank} className="h-32 w-32 md:h-36 md:w-36" />
                  <div className={clsx('w-full rounded-[1.4rem] border px-4 py-3 backdrop-blur-sm', theme === 'dark' ? 'border-white/8 bg-zinc-950/70 text-white' : 'border-white/70 bg-white/70 text-zinc-900')}>
                    <div className="text-sm font-black leading-tight line-clamp-2">{trophy.name}</div>
                    <div className={clsx('mt-1 text-[11px] font-bold uppercase tracking-[0.16em] line-clamp-2', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500')}>
                      {trophy.tournamentName}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative z-10 flex h-full flex-col items-center justify-end gap-4 text-zinc-500">
                  <div className={clsx('flex h-28 w-28 items-center justify-center rounded-full border border-dashed', theme === 'dark' ? 'border-white/10 bg-white/5' : 'border-zinc-300 bg-white/55')}>
                    <Trophy className={clsx('h-10 w-10', theme === 'dark' ? 'text-zinc-600' : 'text-zinc-400')} />
                  </div>
                  <div className={clsx('w-full rounded-[1.4rem] border px-4 py-3 text-sm font-bold', theme === 'dark' ? 'border-white/8 bg-zinc-950/55 text-zinc-500' : 'border-white/70 bg-white/65 text-zinc-500')}>
                    {onEmptySlotClick ? ui.hint : ui.empty}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div className={clsx('relative z-10 mt-4 h-6 rounded-[1.4rem] border', theme === 'dark' ? 'border-white/10 bg-black/35' : 'border-white/60 bg-white/45')} />
    </div>
  );
}
