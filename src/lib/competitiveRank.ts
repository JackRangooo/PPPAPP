import type { Language } from '../types';

export const STAR_SHIELD_CAP = 10;

const DIVISIONS = [
  { minStars: 0, title: { en: 'Onyx Cadet', zh: '黑曜新锋' } },
  { minStars: 10, title: { en: 'Emerald Vanguard', zh: '翡翠先锋' } },
  { minStars: 20, title: { en: 'Azure Marshal', zh: '苍穹统领' } },
  { minStars: 30, title: { en: 'Solar Regent', zh: '曜金执政' } },
  { minStars: 40, title: { en: 'Crimson Axiom', zh: '绯焰律者' } },
  { minStars: 50, title: { en: 'Celestial Lancer', zh: '天穹骑士' } },
  { minStars: 60, title: { en: 'Imperium Prime', zh: '帝曜统帅' } },
  { minStars: 70, title: { en: 'Mythic Paragon', zh: '神谕典范' } },
  { minStars: 80, title: { en: 'Astral Sovereign', zh: '星穹君主' } },
  { minStars: 90, title: { en: 'Eternal Crown', zh: '永恒冕境' } },
  { minStars: 100, title: { en: 'Transcendent Apex', zh: '超越天巅' } },
] as const;

export const getCompetitiveDivision = (stars: number, language: Language) => {
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
