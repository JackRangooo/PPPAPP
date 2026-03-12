import {
  Award,
  Crown,
  Flame,
  Gem,
  Medal,
  Shield,
  Sparkles,
  Star,
  Sun,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import clsx from 'clsx';

import type { Theme } from '../types';
import type { CompetitiveDivision } from '../lib/competitiveRank';

interface CompetitiveDivisionBadgeProps {
  division: CompetitiveDivision;
  stars: number;
  starsLabel: string;
  theme: Theme;
  size?: 'compact' | 'full';
  align?: 'left' | 'right' | 'center';
  hideTitle?: boolean;
}

const EMBLEMS: Array<{
  icon: LucideIcon;
  darkShell: string;
  lightShell: string;
  glow: string;
  accent: string;
}> = [
  {
    icon: Shield,
    darkShell: 'border-slate-500/30 bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.3),rgba(15,23,42,0.94)_72%)] text-slate-100',
    lightShell: 'border-slate-300 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(226,232,240,0.92)_74%)] text-slate-700',
    glow: 'bg-slate-400/24',
    accent: 'bg-slate-200/60',
  },
  {
    icon: Star,
    darkShell: 'border-emerald-500/28 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.32),rgba(6,24,20,0.96)_72%)] text-emerald-200',
    lightShell: 'border-emerald-200 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(209,250,229,0.94)_74%)] text-emerald-700',
    glow: 'bg-emerald-400/28',
    accent: 'bg-emerald-200/70',
  },
  {
    icon: Sparkles,
    darkShell: 'border-cyan-500/28 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.34),rgba(8,23,34,0.96)_72%)] text-cyan-200',
    lightShell: 'border-cyan-200 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(224,242,254,0.94)_74%)] text-cyan-700',
    glow: 'bg-cyan-400/28',
    accent: 'bg-cyan-100/72',
  },
  {
    icon: Sun,
    darkShell: 'border-amber-500/30 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.34),rgba(39,21,6,0.96)_72%)] text-amber-200',
    lightShell: 'border-amber-200 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(254,243,199,0.94)_74%)] text-amber-700',
    glow: 'bg-amber-400/28',
    accent: 'bg-amber-100/72',
  },
  {
    icon: Flame,
    darkShell: 'border-orange-500/30 bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.34),rgba(44,16,10,0.96)_72%)] text-orange-200',
    lightShell: 'border-orange-200 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(255,237,213,0.94)_74%)] text-orange-700',
    glow: 'bg-orange-400/28',
    accent: 'bg-orange-100/72',
  },
  {
    icon: Gem,
    darkShell: 'border-fuchsia-500/30 bg-[radial-gradient(circle_at_top,rgba(217,70,239,0.34),rgba(42,10,36,0.96)_72%)] text-fuchsia-200',
    lightShell: 'border-fuchsia-200 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(250,232,255,0.94)_74%)] text-fuchsia-700',
    glow: 'bg-fuchsia-400/28',
    accent: 'bg-fuchsia-100/72',
  },
  {
    icon: Award,
    darkShell: 'border-violet-500/30 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.34),rgba(24,12,42,0.96)_72%)] text-violet-200',
    lightShell: 'border-violet-200 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(237,233,254,0.94)_74%)] text-violet-700',
    glow: 'bg-violet-400/28',
    accent: 'bg-violet-100/72',
  },
  {
    icon: Medal,
    darkShell: 'border-rose-500/30 bg-[radial-gradient(circle_at_top,rgba(244,63,94,0.34),rgba(45,11,25,0.96)_72%)] text-rose-200',
    lightShell: 'border-rose-200 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(255,228,230,0.94)_74%)] text-rose-700',
    glow: 'bg-rose-400/28',
    accent: 'bg-rose-100/72',
  },
  {
    icon: Zap,
    darkShell: 'border-sky-500/30 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.34),rgba(8,18,46,0.96)_72%)] text-sky-200',
    lightShell: 'border-sky-200 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(219,234,254,0.94)_74%)] text-sky-700',
    glow: 'bg-sky-400/30',
    accent: 'bg-sky-100/74',
  },
  {
    icon: Crown,
    darkShell: 'border-yellow-400/34 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.4),rgba(54,34,4,0.98)_72%)] text-yellow-100',
    lightShell: 'border-yellow-200 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(254,249,195,0.96)_74%)] text-yellow-700',
    glow: 'bg-yellow-300/32',
    accent: 'bg-yellow-100/78',
  },
  {
    icon: Trophy,
    darkShell: 'border-white/36 bg-[radial-gradient(circle_at_top,rgba(253,224,71,0.42),rgba(67,20,7,0.92)_34%,rgba(23,25,37,0.98)_76%)] text-white',
    lightShell: 'border-white bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(254,240,138,0.96)_40%,rgba(254,226,226,0.9)_78%)] text-zinc-900',
    glow: 'bg-[radial-gradient(circle,rgba(253,224,71,0.42),rgba(244,114,182,0.16),transparent_72%)]',
    accent: 'bg-white/80',
  },
] as const;

const sizeStyles = {
  compact: {
    wrapper: 'w-[6.75rem]',
    emblem: 'h-[4.9rem] w-[4.9rem]',
    icon: 'h-7 w-7',
    title: 'text-[10px]',
    stars: 'text-[10px]',
    accent: 'h-1.5 w-9',
  },
  full: {
    wrapper: 'w-[8rem]',
    emblem: 'h-[6.2rem] w-[6.2rem]',
    icon: 'h-8 w-8',
    title: 'text-xs',
    stars: 'text-[11px]',
    accent: 'h-2 w-12',
  },
} as const;

export default function CompetitiveDivisionBadge({
  division,
  stars,
  starsLabel,
  theme,
  size = 'compact',
  align = 'right',
  hideTitle = false,
}: CompetitiveDivisionBadgeProps) {
  const emblem = EMBLEMS[Math.min(division.index, EMBLEMS.length - 1)];
  const Icon = emblem.icon;
  const styles = sizeStyles[size];
  const alignClass = align === 'left' ? 'items-start text-left' : align === 'center' ? 'items-center text-center' : 'items-end text-right';

  return (
    <div className={clsx('flex flex-col gap-1.5', styles.wrapper, alignClass)}>
      <div className="relative">
        <div className={clsx('absolute inset-0 rounded-[1.75rem] blur-xl', emblem.glow)} />
        <div
          className={clsx(
            'relative flex items-center justify-center overflow-hidden rounded-[1.75rem] border shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_16px_24px_rgba(2,6,23,0.2)]',
            styles.emblem,
            theme === 'dark' ? emblem.darkShell : emblem.lightShell,
          )}
        >
          <span className="pointer-events-none absolute inset-x-3 top-2 h-4 rounded-full bg-white/25 blur-xl" />
          <span className="pointer-events-none absolute inset-x-4 bottom-3 h-5 rounded-full bg-black/20 blur-2xl" />
          <span className="pointer-events-none absolute inset-2 rounded-[1.2rem] border border-white/12" />
          <span className="pointer-events-none absolute inset-x-4 top-3 h-px bg-white/35" />
          <span className={clsx('absolute bottom-2 rounded-full blur-sm', styles.accent, emblem.accent)} />
          <Icon className={clsx('relative z-10 drop-shadow-[0_2px_8px_rgba(0,0,0,0.28)]', styles.icon)} />
          {division.index >= 6 ? <Sparkles className="absolute right-2 top-2 h-3.5 w-3.5 text-white/85" /> : null}
          {division.index >= 8 ? <Star className="absolute left-2 bottom-2 h-3 w-3 fill-current text-white/80" /> : null}
          {division.index >= 10 ? <Crown className="absolute left-2 top-2 h-4 w-4 text-white/90" /> : null}
        </div>
      </div>

      {hideTitle ? null : (
        <div
          className={clsx(
            'font-black uppercase tracking-[0.18em] leading-tight',
            styles.title,
            theme === 'dark' ? 'text-zinc-100' : 'text-zinc-800',
          )}
        >
          {division.title}
        </div>
      )}

      <div className={clsx('inline-flex items-center gap-1 font-medium', styles.stars, theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
        <Star className="h-3 w-3 fill-emerald-500 text-emerald-500" />
        <span>{stars}</span>
        <span>{starsLabel}</span>
      </div>
    </div>
  );
}
