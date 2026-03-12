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

import type { CompetitiveDivision } from '../lib/competitiveRank';
import type { Theme } from '../types';

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
  darkColor: string;
  lightColor: string;
  glow: string;
}> = [
  { icon: Shield, darkColor: 'text-slate-200', lightColor: 'text-slate-600', glow: 'bg-slate-400/28' },
  { icon: Star, darkColor: 'text-emerald-200', lightColor: 'text-emerald-600', glow: 'bg-emerald-400/28' },
  { icon: Sparkles, darkColor: 'text-cyan-200', lightColor: 'text-cyan-600', glow: 'bg-cyan-400/28' },
  { icon: Sun, darkColor: 'text-amber-200', lightColor: 'text-amber-600', glow: 'bg-amber-400/28' },
  { icon: Flame, darkColor: 'text-orange-200', lightColor: 'text-orange-600', glow: 'bg-orange-400/28' },
  { icon: Gem, darkColor: 'text-fuchsia-200', lightColor: 'text-fuchsia-600', glow: 'bg-fuchsia-400/28' },
  { icon: Award, darkColor: 'text-violet-200', lightColor: 'text-violet-600', glow: 'bg-violet-400/28' },
  { icon: Medal, darkColor: 'text-rose-200', lightColor: 'text-rose-600', glow: 'bg-rose-400/28' },
  { icon: Zap, darkColor: 'text-sky-200', lightColor: 'text-sky-600', glow: 'bg-sky-400/28' },
  { icon: Crown, darkColor: 'text-yellow-200', lightColor: 'text-yellow-600', glow: 'bg-yellow-300/30' },
  { icon: Trophy, darkColor: 'text-white', lightColor: 'text-zinc-800', glow: 'bg-[radial-gradient(circle,rgba(253,224,71,0.5),rgba(244,114,182,0.18),transparent_72%)]' },
] as const;

const sizeStyles = {
  compact: {
    wrapper: 'gap-2',
    emblem: 'h-9 w-9',
    icon: 'h-5 w-5',
    title: 'text-[11px]',
    stars: 'text-[10px]',
    marker: 'h-2.5 w-2.5',
  },
  full: {
    wrapper: 'gap-3',
    emblem: 'h-12 w-12',
    icon: 'h-6 w-6',
    title: 'text-xs',
    stars: 'text-[11px]',
    marker: 'h-3 w-3',
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
  const alignClass = align === 'left' ? 'justify-start text-left' : align === 'center' ? 'justify-center text-center' : 'justify-end text-right';

  return (
    <div className={clsx('inline-flex items-center', styles.wrapper, alignClass)}>
      <div className={clsx('relative flex items-center justify-center shrink-0', styles.emblem)}>
        <span className={clsx('absolute inset-0 rounded-full blur-lg', emblem.glow)} />
        <Icon className={clsx('relative z-10 drop-shadow-[0_2px_10px_rgba(0,0,0,0.24)]', styles.icon, theme === 'dark' ? emblem.darkColor : emblem.lightColor)} />
        {division.index >= 6 ? (
          <Sparkles className={clsx('absolute right-0 top-0 text-white/90', styles.marker)} />
        ) : null}
        {division.index >= 8 ? (
          <Star className={clsx('absolute bottom-0 left-0 fill-current text-emerald-400', styles.marker)} />
        ) : null}
        {division.index >= 10 ? (
          <Crown className={clsx('absolute -top-0.5 left-1/2 -translate-x-1/2 text-yellow-200', styles.marker)} />
        ) : null}
      </div>

      <div className="min-w-0">
        {hideTitle ? null : (
          <div className={clsx('truncate font-bold leading-tight', styles.title, theme === 'dark' ? 'text-zinc-100' : 'text-zinc-800')}>
            {division.title}
          </div>
        )}
        <div className={clsx('inline-flex items-center gap-1 font-medium', styles.stars, theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
          <Star className="h-3 w-3 fill-emerald-500 text-emerald-500" />
          <span>{stars}</span>
          <span>{starsLabel}</span>
        </div>
      </div>
    </div>
  );
}
