import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type {
  Language,
  Match,
  SubmitMatchScoreResult,
  Theme,
  Tournament,
  UserProfile,
} from '../types';

const PROFILE_SELECT = `
  id,
  email,
  display_name,
  avatar_url,
  casual_stars,
  casual_wins,
  casual_losses,
  ranked_points,
  ranked_wins,
  ranked_losses,
  average_rank,
  tournaments_played,
  inventory,
  showcase,
  selected_title,
  theme,
  language,
  created_at,
  updated_at
`;

const MATCH_SELECT = `
  id,
  player1_id,
  player2_id,
  player1_name,
  player2_name,
  player1_photo,
  player2_photo,
  player1_score,
  player2_score,
  player1_confirmed,
  player2_confirmed,
  status,
  type,
  winner_id,
  created_at,
  updated_at
`;

const TOURNAMENT_SELECT = `
  id,
  name,
  status,
  start_date,
  end_date,
  participants,
  winner_id,
  created_at,
  updated_at
`;

const DEFAULT_SHOWCASE = [
  { slotId: 1, trophyId: null },
  { slotId: 2, trophyId: null },
  { slotId: 3, trophyId: null },
];

const DEFAULT_INVENTORY = {
  trophies: [],
  titles: ['Novice Player'],
};

const DEFAULT_THEME: Theme = 'dark';
const DEFAULT_LANGUAGE: Language = 'en';

const mapProfile = (row: any): UserProfile => ({
  uid: row.id,
  email: row.email ?? '',
  displayName: row.display_name ?? 'Player',
  photoURL: row.avatar_url ?? '',
  casualStars: row.casual_stars ?? 0,
  casualWins: row.casual_wins ?? 0,
  casualLosses: row.casual_losses ?? 0,
  rankedPoints: row.ranked_points ?? 0,
  rankedWins: row.ranked_wins ?? 0,
  rankedLosses: row.ranked_losses ?? 0,
  averageRank: row.average_rank ?? 0,
  tournamentsPlayed: row.tournaments_played ?? 0,
  inventory: {
    trophies: Array.isArray(row.inventory?.trophies) ? row.inventory.trophies : [],
    titles:
      Array.isArray(row.inventory?.titles) && row.inventory.titles.length > 0
        ? row.inventory.titles
        : DEFAULT_INVENTORY.titles,
  },
  showcase: Array.isArray(row.showcase) && row.showcase.length > 0 ? row.showcase : DEFAULT_SHOWCASE,
  selectedTitle: row.selected_title ?? 'Novice Player',
  theme: row.theme ?? DEFAULT_THEME,
  language: row.language ?? DEFAULT_LANGUAGE,
  createdAt: row.created_at ?? new Date().toISOString(),
  updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
});

const mapMatch = (row: any): Match => ({
  id: row.id,
  player1Id: row.player1_id,
  player2Id: row.player2_id,
  player1Name: row.player1_name,
  player2Name: row.player2_name,
  player1Photo: row.player1_photo ?? '',
  player2Photo: row.player2_photo ?? '',
  player1Score: row.player1_score,
  player2Score: row.player2_score,
  player1Confirmed: Boolean(row.player1_confirmed),
  player2Confirmed: Boolean(row.player2_confirmed),
  status: row.status,
  type: row.type,
  winnerId: row.winner_id,
  createdAt: row.created_at ?? new Date().toISOString(),
  updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
});

const mapTournament = (row: any): Tournament => ({
  id: row.id,
  name: row.name ?? 'Weekly Championship',
  status: row.status ?? 'registration',
  startDate: row.start_date ?? new Date().toISOString(),
  endDate: row.end_date ?? new Date().toISOString(),
  participants: Array.isArray(row.participants) ? row.participants : [],
  winnerId: row.winner_id,
  createdAt: row.created_at ?? new Date().toISOString(),
  updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
});

const mapSubmitResult = (payload: any): SubmitMatchScoreResult => ({
  result: payload?.result ?? 'waiting',
  match: mapMatch(payload?.match ?? payload),
});

const maybeThrow = (error: { message: string } | null) => {
  if (error) {
    throw new Error(error.message);
  }
};

export const ensureProfile = async (user: User) => {
  const { error } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: user.email ?? '',
    },
    {
      onConflict: 'id',
      ignoreDuplicates: true,
    },
  );

  maybeThrow(error);
};

export const fetchProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', userId)
    .maybeSingle();

  maybeThrow(error);
  return data ? mapProfile(data) : null;
};

export const fetchPlayerProfile = async (userId: string) => fetchProfile(userId);

export const updateProfilePreferences = async (
  userId: string,
  values: {
    theme?: Theme;
    language?: Language;
    selectedTitle?: string;
    showcase?: UserProfile['showcase'];
  },
) => {
  const updates: Record<string, unknown> = {};

  if (values.theme) updates.theme = values.theme;
  if (values.language) updates.language = values.language;
  if (typeof values.selectedTitle !== 'undefined') updates.selected_title = values.selectedTitle;
  if (typeof values.showcase !== 'undefined') updates.showcase = values.showcase;

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select(PROFILE_SELECT)
    .single();

  maybeThrow(error);
  return mapProfile(data);
};

export const updateProfileDisplayName = async (userId: string, displayName: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ display_name: displayName })
    .eq('id', userId)
    .select(PROFILE_SELECT)
    .single();

  maybeThrow(error);

  const { error: authError } = await supabase.auth.updateUser({
    data: { display_name: displayName },
  });

  maybeThrow(authError);
  return mapProfile(data);
};

export const listProfiles = async (excludeUserId?: string) => {
  let query = supabase.from('profiles').select(PROFILE_SELECT).order('display_name');

  if (excludeUserId) {
    query = query.neq('id', excludeUserId);
  }

  const { data, error } = await query;
  maybeThrow(error);
  return (data ?? []).map(mapProfile);
};

export const searchProfiles = async (searchTerm: string, excludeUserId?: string) => {
  let query = supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .ilike('display_name', `%${searchTerm}%`)
    .order('display_name')
    .limit(5);

  if (excludeUserId) {
    query = query.neq('id', excludeUserId);
  }

  const { data, error } = await query;
  maybeThrow(error);
  return (data ?? []).map(mapProfile);
};

export const listLeaderboardProfiles = async () => {
  const { data, error } = await supabase.from('profiles').select(PROFILE_SELECT);
  maybeThrow(error);
  return (data ?? []).map(mapProfile);
};

export const listUserRecentMatches = async (userId: string) => {
  const { data, error } = await supabase
    .from('matches')
    .select(MATCH_SELECT)
    .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(25);

  maybeThrow(error);

  return (data ?? [])
    .map(mapMatch)
    .filter((match) => ['accepted', 'completed', 'ongoing'].includes(match.status))
    .slice(0, 5);
};

export const listUserActiveCasualMatches = async (userId: string) => {
  const { data, error } = await supabase
    .from('matches')
    .select(MATCH_SELECT)
    .eq('type', 'casual')
    .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  maybeThrow(error);

  return (data ?? [])
    .map(mapMatch)
    .filter((match) => ['pending', 'accepted', 'ongoing'].includes(match.status));
};

export const fetchMatch = async (matchId: string) => {
  const { data, error } = await supabase
    .from('matches')
    .select(MATCH_SELECT)
    .eq('id', matchId)
    .maybeSingle();

  maybeThrow(error);
  return data ? mapMatch(data) : null;
};

export const createCasualMatch = async (opponentId: string) => {
  const { data, error } = await supabase.rpc('create_match_request', {
    p_match_type: 'casual',
    p_opponent_id: opponentId,
  });

  maybeThrow(error);
  return mapMatch(data);
};

export const changeMatchStatus = async (
  matchId: string,
  action: 'accept' | 'decline' | 'cancel',
) => {
  const { data, error } = await supabase.rpc('change_match_status', {
    p_action: action,
    p_match_id: matchId,
  });

  maybeThrow(error);
  return mapMatch(data);
};

export const submitMatchScore = async (
  matchId: string,
  myScore: number,
  opponentScore: number,
) => {
  const { data, error } = await supabase.rpc('submit_match_score', {
    p_match_id: matchId,
    p_my_score: myScore,
    p_opponent_score: opponentScore,
  });

  maybeThrow(error);
  return mapSubmitResult(data);
};

export const listTournaments = async () => {
  const { data, error } = await supabase
    .from('tournaments')
    .select(TOURNAMENT_SELECT)
    .order('created_at', { ascending: false })
    .limit(10);

  maybeThrow(error);
  return (data ?? []).map(mapTournament);
};

export const registerForTournament = async (tournamentId: string) => {
  const { data, error } = await supabase.rpc('register_for_tournament', {
    p_tournament_id: tournamentId,
  });

  maybeThrow(error);
  return mapTournament(data);
};

export const endTournament = async (tournamentId: string) => {
  const { data, error } = await supabase.rpc('end_tournament', {
    p_tournament_id: tournamentId,
  });

  maybeThrow(error);
  return mapTournament(data);
};
