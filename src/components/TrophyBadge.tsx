import { Award, Crown, Medal } from 'lucide-react';
import clsx from 'clsx';

import type { Language, Theme, Trophy as TrophyType } from '../types';

type TrophyBadgeProps = {
  trophy: TrophyType;
  theme: Theme;
  language: Language;
};

const getRankMeta = (rank: number, language: Language) => {
  if (rank === 1) {
    return {
      label: language === 'zh' ? '金' : 'Gold',
      icon: Crown,
      shell: 'from-amber-300/85 via-yellow-200/75 to-orange-300/80 border-amber-300/70',
      iconWrap: 'bg-white/80 border-amber-200/80 text-amber-500',
      badge: 'bg-amber-950/90 text-amber-100 border-amber-300/30',
    };
  }

  if (rank === 2) {
    return {
      label: language === 'zh' ? '银' : 'Silver',
      icon: Medal,
      shell: 'from-slate-200/90 via-zinc-100/85 to-slate-300/80 border-slate-300/80',
      iconWrap: 'bg-white/80 border-slate-200/80 text-slate-500',
      badge: 'bg-slate-900/90 text-slate-100 border-slate-300/30',
    };
  }

  return {
    label: language === 'zh' ? '铜' : 'Bronze',
    icon: Award,
    shell: 'from-orange-300/85 via-amber-200/80 to-amber-400/75 border-orange-300/70',
    iconWrap: 'bg-white/80 border-orange-200/80 text-orange-600',
    badge: 'bg-orange-950/90 text-orange-100 border-orange-300/30',
  };
};

export default function TrophyBadge({ trophy, theme, language }: TrophyBadgeProps) {
  const meta = getRankMeta(trophy.rank, language);
  const Icon = meta.icon;

  return (
    <div
      className={clsx(
        'relative h-full w-full overflow-hidden rounded-[1.15rem] border p-3 text-left',
        theme === 'dark'
          ? `bg-gradient-to-br ${meta.shell} shadow-[0_18px_35px_rgba(0,0,0,0.28)]`
          : `bg-gradient-to-br ${meta.shell} shadow-[0_12px_28px_rgba(15,23,42,0.12)]`,
      )}
    >
      <div className="absolute inset-x-0 top-0 h-10 bg-white/20 blur-2xl" />
      <div className="relative z-10 flex h-full flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className={clsx('flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm', meta.iconWrap)}>
            <Icon className="h-5 w-5" />
          </div>
          <span className={clsx('rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]', meta.badge)}>
            {meta.label}
          </span>
        </div>
        <div>
          <div className={clsx('min-h-[2.6rem] text-[11px] font-black leading-tight', theme === 'dark' ? 'text-zinc-950' : 'text-zinc-900')}>
            {trophy.name}
          </div>
          <div className={clsx('mt-1 text-[10px] font-semibold leading-tight', theme === 'dark' ? 'text-zinc-800/80' : 'text-zinc-700')}>
            {trophy.tournamentName}
          </div>
        </div>
      </div>
    </div>
  );
}
