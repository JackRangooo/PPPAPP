import clsx from 'clsx';

import { getSportAccent, getSportLabel, SPORTS } from '../lib/sports';
import type { Language, Sport, Theme } from '../types';

type SportToggleProps = {
  sport: Sport;
  onChange: (sport: Sport) => void;
  theme: Theme;
  language: Language;
  className?: string;
};

export default function SportToggle({ sport, onChange, theme, language, className }: SportToggleProps) {
  return (
    <div
      className={clsx(
        'grid grid-cols-2 gap-2 rounded-2xl border p-1.5',
        theme === 'dark' ? 'border-white/10 bg-zinc-950/55' : 'border-zinc-200 bg-white/85 shadow-sm',
        className,
      )}
    >
      {SPORTS.map((currentSport) => {
        const accent = getSportAccent(currentSport);
        const active = currentSport === sport;

        return (
          <button
            key={currentSport}
            type="button"
            onClick={() => onChange(currentSport)}
            className={clsx(
              'rounded-xl px-4 py-3 text-sm font-black transition-all',
              active
                ? clsx(accent.solid, 'shadow-[0_10px_24px_rgba(15,23,42,0.18)]')
                : theme === 'dark'
                  ? 'text-zinc-300 hover:bg-white/5 hover:text-white'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
            )}
          >
            {getSportLabel(currentSport, language)}
          </button>
        );
      })}
    </div>
  );
}
