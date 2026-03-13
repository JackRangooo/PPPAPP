import type { Language } from '../types';

export const STAR_SHIELD_CAP = 10;

const DIVISIONS = [
  { minStars: 0, title: { en: 'Onyx Cadet', zh: 'Onyx Cadet' } },
  { minStars: 10, title: { en: 'Emerald Vanguard', zh: 'Emerald Vanguard' } },
  { minStars: 20, title: { en: 'Azure Marshal', zh: 'Azure Marshal' } },
  { minStars: 30, title: { en: 'Solar Regent', zh: 'Solar Regent' } },
  { minStars: 40, title: { en: 'Crimson Axiom', zh: 'Crimson Axiom' } },
  { minStars: 50, title: { en: 'Celestial Lancer', zh: 'Celestial Lancer' } },
  { minStars: 60, title: { en: 'Imperium Prime', zh: 'Imperium Prime' } },
  { minStars: 70, title: { en: 'Mythic Paragon', zh: 'Mythic Paragon' } },
  { minStars: 80, title: { en: 'Astral Sovereign', zh: 'Astral Sovereign' } },
  { minStars: 90, title: { en: 'Eternal Crown', zh: 'Eternal Crown' } },
  { minStars: 100, title: { en: 'Transcendent Apex', zh: 'Transcendent Apex' } },
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
