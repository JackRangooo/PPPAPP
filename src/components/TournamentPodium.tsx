import { Crown, Medal, Trophy } from 'lucide-react';
import clsx from 'clsx';

import type { Language, Theme } from '../types';

export type TournamentPodiumEntry = {
  id: string;
  name: string;
  avatarUrl: string;
  label: 'champion' | 'runnerUp' | 'thirdPlace';
};

export type TournamentStandingEntry = {
  id: string;
  name: string;
  avatarUrl: string;
  matchesPlayed: number;
  rank: number;
};

type TournamentPodiumProps = {
  theme: Theme;
  language: Language;
  entries: TournamentPodiumEntry[];
  standings: TournamentStandingEntry[];
};

const copy = {
  en: {
    title: 'Podium',
    champion: 'Champion',
    runnerUp: 'Runner-up',
    thirdPlace: 'Third Place',
    others: 'Other Finishers',
    matchesPlayed: 'matches',
  },
  zh: {
    title: '领奖台',
    champion: '冠军',
    runnerUp: '亚军',
    thirdPlace: '季军',
    others: '其余选手',
    matchesPlayed: '场',
  },
} as const;

const podiumMeta = {
  champion: {
    height: 'h-40',
    crown: 'text-amber-400',
    base: 'from-amber-200 via-yellow-300 to-amber-500',
    ring: 'ring-amber-400/50',
    icon: Trophy,
  },
  runnerUp: {
    height: 'h-32',
    crown: 'text-slate-300',
    base: 'from-slate-200 via-slate-300 to-slate-500',
    ring: 'ring-slate-300/50',
    icon: Medal,
  },
  thirdPlace: {
    height: 'h-24',
    crown: 'text-orange-400',
    base: 'from-orange-200 via-amber-300 to-orange-500',
    ring: 'ring-orange-400/50',
    icon: Medal,
  },
} as const;

const podiumOrder: Array<TournamentPodiumEntry['label']> = ['runnerUp', 'champion', 'thirdPlace'];

export default function TournamentPodium({
  theme,
  language,
  entries,
  standings,
}: TournamentPodiumProps) {
  const ui = copy[language];
  const labels = {
    champion: ui.champion,
    runnerUp: ui.runnerUp,
    thirdPlace: ui.thirdPlace,
  } as const;

  const orderedEntries = podiumOrder
    .map((label) => entries.find((entry) => entry.label === label))
    .filter((entry): entry is TournamentPodiumEntry => Boolean(entry));

  return (
    <div className={clsx('rounded-[2rem] border p-5 sm:p-6', theme === 'dark' ? 'bg-zinc-900/60 border-white/5' : 'bg-white border-zinc-200 shadow-sm')}>
      <div className="flex items-center gap-2 mb-5">
        <Trophy className="h-5 w-5 text-amber-500" />
        <h2 className={clsx('text-lg font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
          {ui.title}
        </h2>
      </div>

      <div className="grid grid-cols-3 items-end gap-3">
        {orderedEntries.map((entry) => {
          const meta = podiumMeta[entry.label];
          const Icon = meta.icon;

          return (
            <div key={entry.id} className="text-center">
              <div className="relative mx-auto mb-3 w-fit">
                <img
                  src={entry.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.name)}&background=random`}
                  alt={entry.name}
                  className={clsx('h-20 w-20 rounded-full object-cover ring-4', meta.ring, theme === 'dark' ? 'border-4 border-zinc-900' : 'border-4 border-white')}
                  referrerPolicy="no-referrer"
                />
                <div className={clsx('absolute -top-4 left-1/2 -translate-x-1/2', meta.crown)}>
                  <Crown className="h-6 w-6 fill-current" />
                </div>
              </div>
              <div className={clsx('mb-2 truncate text-sm font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                {entry.name}
              </div>
              <div
                className={clsx(
                  'relative flex items-center justify-center rounded-t-[1.5rem] bg-gradient-to-b px-3 pb-4 pt-5 text-center',
                  meta.height,
                  meta.base,
                )}
              >
                <div className="absolute inset-x-3 top-2 h-5 rounded-full bg-white/35 blur-xl" />
                <div className="relative z-10">
                  <Icon className="mx-auto h-6 w-6 text-zinc-950" />
                  <div className="mt-2 text-[11px] font-black uppercase tracking-[0.16em] text-zinc-950">
                    {labels[entry.label]}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {standings.length > 0 ? (
        <div className="mt-6 space-y-3">
          <div className={clsx('text-xs font-black uppercase tracking-[0.18em]', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
            {ui.others}
          </div>
          {standings.map((entry) => (
            <div
              key={entry.id}
              className={clsx(
                'flex items-center justify-between gap-4 rounded-2xl border px-4 py-3',
                theme === 'dark' ? 'bg-zinc-950/70 border-white/5' : 'bg-zinc-50 border-zinc-200',
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className={clsx('w-9 text-sm font-black', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
                  #{entry.rank}
                </div>
                <img
                  src={entry.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.name)}&background=random`}
                  alt={entry.name}
                  className="h-10 w-10 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <div className={clsx('truncate font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                    {entry.name}
                  </div>
                  <div className={clsx('text-xs', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
                    {entry.matchesPlayed} {ui.matchesPlayed}
                  </div>
                </div>
              </div>
              <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-emerald-500">
                {entry.matchesPlayed}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
