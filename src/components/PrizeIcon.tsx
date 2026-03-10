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
    ribbon: '#dc2626',
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

const RankEmblem = ({ rank, color }: { rank: number; color: string }) => {
  if (rank === 1) {
    return (
      <path
        d="M48 28L51.4 34.9L59 36L53.5 41.1L54.8 48.2L48 44.5L41.2 48.2L42.5 41.1L37 36L44.6 34.9L48 28Z"
        fill={color}
      />
    );
  }

  if (rank === 2) {
    return <path d="M48 28L56 36L48 44L40 36L48 28Z" fill={color} />;
  }

  return <circle cx="48" cy="36" r="6" fill={color} />;
};

export default function PrizeIcon({ rank, className }: PrizeIconProps) {
  const palette = rankPalette[rank as 1 | 2 | 3] ?? rankPalette[3];

  return (
    <div
      className={clsx(
        'rounded-[1.6rem] bg-gradient-to-br p-2 shadow-[0_16px_30px_rgba(15,23,42,0.18)]',
        palette.shell,
        className,
      )}
    >
      <svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
        <path d="M29 16H67V29C67 42.2548 58.2548 53 45 53H51C37.7452 53 29 42.2548 29 29V16Z" fill={palette.fill} stroke={palette.stroke} strokeWidth="4" strokeLinejoin="round" />
        <path d="M22 20H29V26C29 32.6274 23.6274 38 17 38H12V30C12 24.4772 16.4772 20 22 20Z" fill={palette.accent} stroke={palette.stroke} strokeWidth="4" />
        <path d="M74 20H67V26C67 32.6274 72.3726 38 79 38H84V30C84 24.4772 79.5228 20 74 20Z" fill={palette.accent} stroke={palette.stroke} strokeWidth="4" />
        <path d="M39 53H57V63H39V53Z" fill={palette.accent} stroke={palette.stroke} strokeWidth="4" />
        <path d="M34 72C34 67.5817 37.5817 64 42 64H54C58.4183 64 62 67.5817 62 72V78H34V72Z" fill={palette.fill} stroke={palette.stroke} strokeWidth="4" />
        <path d="M34 63L28 80H36L40 63H34Z" fill={palette.ribbon} opacity="0.92" />
        <path d="M62 63L68 80H60L56 63H62Z" fill={palette.ribbon} opacity="0.92" />
        <circle cx="48" cy="36" r="11" fill={palette.accent} fillOpacity="0.92" />
        <RankEmblem rank={rank} color={palette.stroke} />
        <path d="M35 19H61" stroke="white" strokeOpacity="0.42" strokeWidth="4" strokeLinecap="round" />
        <path d="M39 59H57" stroke={palette.stroke} strokeWidth="3" strokeLinecap="round" opacity="0.3" />
      </svg>
    </div>
  );
}
