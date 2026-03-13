import type { Language } from '../types';

export const STAR_SHIELD_CAP = 10;

const DIVISIONS = [
  { minStars: 0, title: { en: 'Onyx Cadet', zh: '黑曜新锋' } },
  { minStars: 10, title: { en: 'Emerald Vanguard', zh: '翡翠先驱' } },
  { minStars: 20, title: { en: 'Azure Marshal', zh: '苍穹执锋' } },
  { minStars: 30, title: { en: 'Solar Regent', zh: '曜日统领' } },
  { minStars: 40, title: { en: 'Crimson Axiom', zh: '绯焰法则' } },
  { minStars: 50, title: { en: 'Celestial Lancer', zh: '天穹枪骑' } },
  { minStars: 60, title: { en: 'Imperium Prime', zh: '帝阙首席' } },
  { minStars: 70, title: { en: 'Mythic Paragon', zh: '神话圣裁' } },
  { minStars: 80, title: { en: 'Astral Sovereign', zh: '星穹君临' } },
  { minStars: 90, title: { en: 'Eternal Crown', zh: '永恒冠冕' } },
  { minStars: 100, title: { en: 'Transcendent Apex', zh: '超越之巅' } },
] as const;

export interface CompetitiveDivision {
  index: number;
  title: string;
  minStars: number;
  nextTitle: string;
  nextStars: number | null;
  starsIntoDivision: number;
  starsRemaining: number;
  shielded: boolean;
}

export const getCompetitiveDivision = (stars: number, language: Language): CompetitiveDivision => {
  const safeStars = Math.max(0, Math.floor(Number.isFinite(stars) ? stars : 0));
  const index = Math.min(Math.floor(safeStars / 10), DIVISIONS.length - 1);
  const current = DIVISIONS[index];
  const next = DIVISIONS[index + 1] ?? null;

  return {
    index,
    title: current.title[language],
    minStars: current.minStars,
    nextTitle: next ? next.title[language] : current.title[language],
    nextStars: next?.minStars ?? null,
    starsIntoDivision: safeStars - current.minStars,
    starsRemaining: next ? Math.max(next.minStars - safeStars, 0) : 0,
    shielded: safeStars <= STAR_SHIELD_CAP,
  };
};
