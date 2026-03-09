import React from 'react';

export default function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* P1 (Back) */}
      <g className="opacity-30" transform="translate(-10, 0)">
        <path d="M30 90 L30 20 A 25 25 0 0 1 30 70" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="42" cy="45" r="5" fill="currentColor" />
      </g>
      {/* P2 (Middle) */}
      <g className="opacity-60" transform="translate(10, 0)">
        <path d="M30 90 L30 20 A 25 25 0 0 1 30 70" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="42" cy="45" r="5" fill="currentColor" />
      </g>
      {/* P3 (Front) */}
      <g className="opacity-100" transform="translate(30, 0)">
        <path d="M30 90 L30 20 A 25 25 0 0 1 30 70" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="42" cy="45" r="5" fill="currentColor" />
      </g>
    </svg>
  );
}
