import clsx from 'clsx';

import type { Language, Theme, Trophy as TrophyType } from '../types';
import PrizeIcon from './PrizeIcon';

type TrophyBadgeProps = {
  trophy: TrophyType;
  theme: Theme;
  language: Language;
};

const rankMeta = {
  1: {
    labelEn: 'Champion',
    labelZh: '冠军',
    shell: 'from-amber-100 via-yellow-200 to-orange-300',
    line: 'border-amber-300/80',
    text: 'text-amber-950',
    chip: 'bg-amber-950 text-amber-100',
  },
  2: {
    labelEn: 'Runner-Up',
    labelZh: '亚军',
    shell: 'from-slate-100 via-slate-200 to-zinc-300',
    line: 'border-slate-300/90',
    text: 'text-slate-900',
    chip: 'bg-slate-900 text-slate-100',
  },
  3: {
    labelEn: 'Third',
    labelZh: '季军',
    shell: 'from-orange-100 via-amber-200 to-orange-300',
    line: 'border-orange-300/80',
    text: 'text-orange-950',
    chip: 'bg-orange-950 text-orange-100',
  },
} as const;

export default function TrophyBadge({ trophy, theme, language }: TrophyBadgeProps) {
  const meta = rankMeta[trophy.rank as 1 | 2 | 3] ?? rankMeta[3];
  const rankLabel = language === 'zh' ? meta.labelZh : meta.labelEn;

  return (
    <div
      className={clsx(
        'relative h-full w-full overflow-hidden rounded-[1.2rem] border p-3 text-left',
        `bg-gradient-to-br ${meta.shell} ${meta.line}`,
        theme === 'dark'
          ? 'shadow-[0_18px_35px_rgba(0,0,0,0.34)]'
          : 'shadow-[0_14px_30px_rgba(15,23,42,0.12)]',
      )}
    >
      <div className="absolute inset-x-0 top-0 h-12 bg-white/30 blur-2xl" />
      <div className="relative z-10 flex h-full flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-3">
          <PrizeIcon rank={trophy.rank} className="h-12 w-12 shrink-0" />
          <span className={clsx('rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]', meta.chip)}>
            {rankLabel}
          </span>
        </div>

        <div className={clsx('rounded-2xl border border-black/8 bg-white/35 p-3 backdrop-blur-sm', meta.text)}>
          <div className="text-[11px] font-black leading-tight line-clamp-2">{trophy.name}</div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] opacity-80 line-clamp-2">
            {trophy.tournamentName}
          </div>
        </div>
      </div>
    </div>
  );
}
