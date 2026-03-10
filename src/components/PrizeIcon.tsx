import clsx from 'clsx';

type PrizeIconProps = {
  rank: number;
  className?: string;
};

const rankPalette = {
  1: {
    frame: 'from-amber-200 via-yellow-300 to-orange-400',
    stroke: '#6b2f0d',
    cupTop: '#fef3c7',
    cupMid: '#fbbf24',
    cupBottom: '#d97706',
    gem: '#fff8dc',
    ribbon: '#dc2626',
  },
  2: {
    frame: 'from-slate-100 via-slate-300 to-zinc-400',
    stroke: '#334155',
    cupTop: '#f8fafc',
    cupMid: '#cbd5e1',
    cupBottom: '#94a3b8',
    gem: '#ffffff',
    ribbon: '#2563eb',
  },
  3: {
    frame: 'from-orange-200 via-amber-300 to-orange-500',
    stroke: '#7c2d12',
    cupTop: '#ffedd5',
    cupMid: '#fb923c',
    cupBottom: '#c2410c',
    gem: '#fff7ed',
    ribbon: '#16a34a',
  },
} as const;

const RankGlyph = ({ rank, color }: { rank: number; color: string }) => {
  if (rank === 1) {
    return <path d="M48 31L50.6 36.2L56.2 37L52.1 40.9L53.1 46.6L48 43.7L42.9 46.6L43.9 40.9L39.8 37L45.4 36.2L48 31Z" fill={color} />;
  }

  if (rank === 2) {
    return <path d="M48 31L54 37L48 43L42 37L48 31Z" fill={color} />;
  }

  return <circle cx="48" cy="37" r="5.2" fill={color} />;
};

export default function PrizeIcon({ rank, className }: PrizeIconProps) {
  const palette = rankPalette[rank as 1 | 2 | 3] ?? rankPalette[3];

  return (
    <div
      className={clsx(
        'rounded-[1.5rem] bg-gradient-to-br p-2 shadow-[0_18px_34px_rgba(15,23,42,0.24)]',
        palette.frame,
        className,
      )}
    >
      <svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
        <defs>
          <linearGradient id={`cup-${rank}`} x1="24" y1="16" x2="70" y2="78" gradientUnits="userSpaceOnUse">
            <stop stopColor={palette.cupTop} />
            <stop offset="0.52" stopColor={palette.cupMid} />
            <stop offset="1" stopColor={palette.cupBottom} />
          </linearGradient>
          <radialGradient id={`shine-${rank}`} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(37 26) rotate(53.4) scale(31.4 27.8)">
            <stop stopColor="white" stopOpacity="0.68" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>

        <path d="M27 16H69V28C69 42.35 59.6 53 48 53C36.4 53 27 42.35 27 28V16Z" fill={`url(#cup-${rank})`} stroke={palette.stroke} strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M21 21H27V27C27 34.18 21.18 40 14 40H10V32C10 25.92 14.92 21 21 21Z" fill={palette.gem} stroke={palette.stroke} strokeWidth="3.5" />
        <path d="M75 21H69V27C69 34.18 74.82 40 82 40H86V32C86 25.92 81.08 21 75 21Z" fill={palette.gem} stroke={palette.stroke} strokeWidth="3.5" />
        <path d="M40 52H56V62H40V52Z" fill={palette.gem} stroke={palette.stroke} strokeWidth="3.5" />
        <path d="M33 72C33 67.03 37.03 63 42 63H54C58.97 63 63 67.03 63 72V79H33V72Z" fill={`url(#cup-${rank})`} stroke={palette.stroke} strokeWidth="3.5" />
        <path d="M34 63L28.5 80H35.5L40 63H34Z" fill={palette.ribbon} opacity="0.95" />
        <path d="M62 63L67.5 80H60.5L56 63H62Z" fill={palette.ribbon} opacity="0.95" />
        <path d="M30 20H66" stroke="white" strokeOpacity="0.36" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M27 16H69V28C69 42.35 59.6 53 48 53C36.4 53 27 42.35 27 28V16Z" fill={`url(#shine-${rank})`} />
        <circle cx="48" cy="37" r="11.5" fill={palette.gem} fillOpacity="0.95" />
        <circle cx="48" cy="37" r="11.5" stroke={palette.stroke} strokeWidth="3.2" />
        <RankGlyph rank={rank} color={palette.stroke} />
        <path d="M39 58H57" stroke={palette.stroke} strokeWidth="2.8" strokeLinecap="round" opacity="0.28" />
      </svg>
    </div>
  );
}
