import clsx from 'clsx';

type PrizeIconProps = {
  rank: number;
  className?: string;
};

const rankPalette = {
  1: {
    shell: 'from-amber-200 via-yellow-300 to-orange-400',
    stroke: '#7c2d12',
    fill: '#fbbf24',
    accent: '#fef3c7',
    ribbon: '#ef4444',
  },
  2: {
    shell: 'from-slate-100 via-slate-300 to-zinc-400',
    stroke: '#334155',
    fill: '#cbd5e1',
    accent: '#f8fafc',
    ribbon: '#2563eb',
  },
  3: {
    shell: 'from-orange-200 via-amber-400 to-orange-600',
    stroke: '#7c2d12',
    fill: '#d97706',
    accent: '#ffedd5',
    ribbon: '#16a34a',
  },
} as const;

export default function PrizeIcon({ rank, className }: PrizeIconProps) {
  const palette = rankPalette[rank as 1 | 2 | 3] ?? rankPalette[3];

  if (rank === 2) {
    return (
      <div className={clsx('rounded-[1.5rem] bg-gradient-to-br p-2 shadow-[0_16px_30px_rgba(15,23,42,0.18)]', palette.shell, className)}>
        <svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
          <path d="M28 10H42L34 36H18L28 10Z" fill={palette.ribbon} />
          <path d="M54 10H68L78 36H62L54 10Z" fill={palette.ribbon} />
          <circle cx="48" cy="53" r="24" fill={palette.fill} stroke={palette.stroke} strokeWidth="4" />
          <circle cx="48" cy="53" r="16" fill={palette.accent} fillOpacity="0.55" />
          <path d="M48 39L52.1 47.4L61.4 48.7L54.7 55.2L56.3 64.4L48 60L39.7 64.4L41.3 55.2L34.6 48.7L43.9 47.4L48 39Z" fill={palette.stroke} />
        </svg>
      </div>
    );
  }

  return (
    <div className={clsx('rounded-[1.5rem] bg-gradient-to-br p-2 shadow-[0_16px_30px_rgba(15,23,42,0.18)]', palette.shell, className)}>
      <svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
        <path
          d="M27 18H69V32C69 44.1503 59.1503 54 47 54H49C36.8497 54 27 44.1503 27 32V18Z"
          fill={palette.fill}
          stroke={palette.stroke}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path d="M21 22H27V27C27 33.6274 21.6274 39 15 39H12V31C12 26.0294 16.0294 22 21 22Z" fill={palette.accent} stroke={palette.stroke} strokeWidth="4" />
        <path d="M75 22H69V27C69 33.6274 74.3726 39 81 39H84V31C84 26.0294 79.9706 22 75 22Z" fill={palette.accent} stroke={palette.stroke} strokeWidth="4" />
        <path d="M38 54H58V66H38V54Z" fill={palette.accent} stroke={palette.stroke} strokeWidth="4" />
        <path d="M30 74C30 69.5817 33.5817 66 38 66H58C62.4183 66 66 69.5817 66 74V78H30V74Z" fill={palette.fill} stroke={palette.stroke} strokeWidth="4" />
        <circle cx="48" cy="36" r="8" fill={palette.accent} fillOpacity="0.8" />
      </svg>
    </div>
  );
}
