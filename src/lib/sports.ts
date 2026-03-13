import type { Language, Sport, SportStats, SportStatsMap, UserProfile } from '../types';

export const SPORTS: Sport[] = ['table_tennis', 'badminton'];
export const DEFAULT_SPORT: Sport = 'table_tennis';
export const SPORT_STORAGE_KEY = 'pingpro.activeSport';

export const createEmptySportStats = (): SportStats => ({
  casualStars: 0,
  casualWins: 0,
  casualLosses: 0,
  rankedPoints: 0,
  rankedWins: 0,
  rankedLosses: 0,
  averageRank: 0,
  tournamentsPlayed: 0,
});

export const createDefaultStatsBySport = (): SportStatsMap => ({
  table_tennis: createEmptySportStats(),
  badminton: createEmptySportStats(),
});

export const isSport = (value: unknown): value is Sport => value === 'table_tennis' || value === 'badminton';

const sanitizeStatsEntry = (value: unknown): SportStats => {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const base = createEmptySportStats();

  return {
    casualStars: Number(source.casualStars ?? base.casualStars) || 0,
    casualWins: Number(source.casualWins ?? base.casualWins) || 0,
    casualLosses: Number(source.casualLosses ?? base.casualLosses) || 0,
    rankedPoints: Number(source.rankedPoints ?? base.rankedPoints) || 0,
    rankedWins: Number(source.rankedWins ?? base.rankedWins) || 0,
    rankedLosses: Number(source.rankedLosses ?? base.rankedLosses) || 0,
    averageRank: Number(source.averageRank ?? base.averageRank) || 0,
    tournamentsPlayed: Number(source.tournamentsPlayed ?? base.tournamentsPlayed) || 0,
  };
};

export const buildStatsBySport = (
  value: unknown,
  legacyTableTennis?: Partial<SportStats>,
): SportStatsMap => {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const next = createDefaultStatsBySport();

  SPORTS.forEach((sport) => {
    next[sport] = sanitizeStatsEntry(source[sport]);
  });

  if (legacyTableTennis) {
    next.table_tennis = {
      ...next.table_tennis,
      casualStars: Number(legacyTableTennis.casualStars ?? next.table_tennis.casualStars) || 0,
      casualWins: Number(legacyTableTennis.casualWins ?? next.table_tennis.casualWins) || 0,
      casualLosses: Number(legacyTableTennis.casualLosses ?? next.table_tennis.casualLosses) || 0,
      rankedPoints: Number(legacyTableTennis.rankedPoints ?? next.table_tennis.rankedPoints) || 0,
      rankedWins: Number(legacyTableTennis.rankedWins ?? next.table_tennis.rankedWins) || 0,
      rankedLosses: Number(legacyTableTennis.rankedLosses ?? next.table_tennis.rankedLosses) || 0,
      averageRank: Number(legacyTableTennis.averageRank ?? next.table_tennis.averageRank) || 0,
      tournamentsPlayed: Number(legacyTableTennis.tournamentsPlayed ?? next.table_tennis.tournamentsPlayed) || 0,
    };
  }

  return next;
};

export const getSportStats = (profile: Pick<UserProfile, 'statsBySport'>, sport: Sport): SportStats => {
  return profile.statsBySport[sport] ?? createEmptySportStats();
};

export const getSportLabel = (sport: Sport, language: Language) => {
  if (language === 'zh') {
    return sport === 'table_tennis' ? '乒乓球' : '羽毛球';
  }

  return sport === 'table_tennis' ? 'Table Tennis' : 'Badminton';
};

export const getSportShortLabel = (sport: Sport, language: Language) => {
  if (language === 'zh') {
    return sport === 'table_tennis' ? '乒乓' : '羽毛球';
  }

  return sport === 'table_tennis' ? 'Ping Pong' : 'Badminton';
};

export const getSportAccent = (sport: Sport) => {
  return sport === 'table_tennis'
    ? {
        solid: 'bg-emerald-500 text-zinc-950',
        soft: 'bg-emerald-500/12 text-emerald-500',
        ring: 'ring-emerald-500/35',
      }
    : {
        solid: 'bg-sky-500 text-zinc-950',
        soft: 'bg-sky-500/12 text-sky-500',
        ring: 'ring-sky-500/35',
      };
};
