import { APP_SESSION_STORAGE_KEY, supabase } from './supabase';
import type {
  AppSession,
  AuthPayload,
  Language,
  Match,
  ShopProduct,
  SubmitMatchScoreResult,
  Theme,
  Tournament,
  TournamentBracket,
  TournamentBracketMatch,
  TournamentMatchComment,
  TournamentTimelineEvent,
  UserProfile,
} from '../types';

const DEFAULT_SHOWCASE = [
  { slotId: 1, trophyId: null },
  { slotId: 2, trophyId: null },
  { slotId: 3, trophyId: null },
];

const DEFAULT_INVENTORY = {
  trophies: [],
  titles: ['Novice Player'],
  items: [],
};

const DEFAULT_THEME: Theme = 'dark';
const DEFAULT_LANGUAGE: Language = 'en';
const DEFAULT_TOURNAMENT_BRACKET: TournamentBracket = {
  size: 0,
  matches: [],
};

type RpcError = {
  message: string;
  details?: string | null;
  hint?: string | null;
};

const getErrorMessage = (error: RpcError | null, fallback = 'Something went wrong.') => {
  if (!error) {
    return fallback;
  }

  const parts = [error.message, error.details, error.hint]
    .map((part) => part?.trim())
    .filter((part, index, items): part is string => Boolean(part) && items.indexOf(part) === index);

  return parts.join(' ') || fallback;
};

const maybeThrow = (error: RpcError | null) => {
  if (error) {
    throw new Error(getErrorMessage(error));
  }
};

const callRpc = async <T>(functionName: string, params?: Record<string, unknown>) => {
  const { data, error } = await supabase.rpc(functionName, params);
  maybeThrow(error);
  return data as T;
};

const mapProfile = (row: any): UserProfile => ({
  uid: row.id,
  nickname: row.nickname ?? row.display_name ?? 'player',
  email: row.email ?? '',
  displayName: row.display_name ?? row.nickname ?? 'Player',
  photoURL: row.avatar_url ?? '',
  casualStars: row.casual_stars ?? 0,
  casualWins: row.casual_wins ?? 0,
  casualLosses: row.casual_losses ?? 0,
  rankedPoints: row.ranked_points ?? 0,
  rankedWins: row.ranked_wins ?? 0,
  rankedLosses: row.ranked_losses ?? 0,
  averageRank: row.average_rank ?? 0,
  tournamentsPlayed: row.tournaments_played ?? 0,
  coins: row.coins ?? 0,
  inventory: {
    trophies: Array.isArray(row.inventory?.trophies) ? row.inventory.trophies : [],
    titles:
      Array.isArray(row.inventory?.titles) && row.inventory.titles.length > 0
        ? row.inventory.titles
        : DEFAULT_INVENTORY.titles,
    items:
      Array.isArray(row.inventory?.items) && row.inventory.items.length > 0
        ? row.inventory.items
            .map((item: any) => ({
              productId: item.productId ?? item.product_id ?? '',
              name: item.name ?? item.productId ?? item.product_id ?? 'Item',
              description: item.description ?? '',
              kind: item.kind ?? 'card',
              quantity: Number(item.quantity ?? 0),
              priceCoins: Number(item.priceCoins ?? item.price_coins ?? 0),
              effectHint: item.effectHint ?? item.effect_hint ?? '',
              effectStatus: item.effectStatus ?? item.effect_status ?? 'coming_soon',
            }))
            .filter((item: UserProfile['inventory']['items'][number]) => item.productId && item.quantity > 0)
        : DEFAULT_INVENTORY.items,
  },
  showcase: Array.isArray(row.showcase) && row.showcase.length > 0 ? row.showcase : DEFAULT_SHOWCASE,
  selectedTitle: row.selected_title ?? 'Novice Player',
  theme: row.theme ?? DEFAULT_THEME,
  language: row.language ?? DEFAULT_LANGUAGE,
  isRoot: Boolean(row.is_root),
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

const mapTournamentBracketMatch = (row: any): TournamentBracketMatch => ({
  id: row.id,
  stage: row.stage,
  round: row.round ?? 0,
  slot: row.slot ?? 0,
  label: row.label ?? 'Match',
  bestOf: row.bestOf ?? 1,
  status: row.status ?? 'waiting',
  player1Id: row.player1Id ?? null,
  player1Name: row.player1Name ?? '',
  player1AvatarUrl: row.player1AvatarUrl ?? '',
  player1Source: row.player1Source ?? null,
  player2Id: row.player2Id ?? null,
  player2Name: row.player2Name ?? '',
  player2AvatarUrl: row.player2AvatarUrl ?? '',
  player2Source: row.player2Source ?? null,
  player1Score: typeof row.player1Score === 'number' ? row.player1Score : null,
  player2Score: typeof row.player2Score === 'number' ? row.player2Score : null,
  player1Confirmed: Boolean(row.player1Confirmed),
  player2Confirmed: Boolean(row.player2Confirmed),
  winnerId: row.winnerId ?? null,
  resolution: row.resolution ?? null,
  nextMatchId: row.nextMatchId ?? null,
  nextSlot: row.nextSlot ?? null,
  loserNextMatchId: row.loserNextMatchId ?? null,
  loserNextSlot: row.loserNextSlot ?? null,
});

const mapTournamentTimelineEvent = (row: any): TournamentTimelineEvent => ({
  id: row.id,
  type: row.type,
  title: row.title ?? '',
  description: row.description ?? '',
  createdAt: row.createdAt ?? row.created_at ?? new Date().toISOString(),
  tournamentId: row.tournamentId ?? row.tournament_id ?? '',
  matchId: row.matchId ?? row.match_id ?? null,
});

const mapTournament = (row: any): Tournament => ({
  id: row.id,
  name: row.name ?? 'Weekly Championship',
  status: row.status ?? 'registration',
  startDate: row.start_date ?? new Date().toISOString(),
  endDate: row.end_date ?? new Date().toISOString(),
  participants: Array.isArray(row.participants) ? row.participants : [],
  winnerId: row.winner_id ?? null,
  runnerUpId: row.runner_up_id ?? null,
  thirdPlaceId: row.third_place_id ?? null,
  adminUserId: row.admin_user_id ?? null,
  format: row.format ?? 'single_elimination_third',
  bracket:
    row.bracket && Array.isArray(row.bracket.matches)
      ? {
          size: Number(row.bracket.size ?? 0),
          matches: row.bracket.matches.map(mapTournamentBracketMatch),
        }
      : DEFAULT_TOURNAMENT_BRACKET,
  timeline: Array.isArray(row.timeline) ? row.timeline.map(mapTournamentTimelineEvent) : [],
  createdAt: row.created_at ?? new Date().toISOString(),
  updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
});

const mapTournamentComment = (row: any): TournamentMatchComment => ({
  id: row.id,
  tournamentId: row.tournament_id ?? row.tournamentId,
  matchId: row.match_id ?? row.matchId,
  userId: row.user_id ?? row.userId,
  authorName: row.author_name ?? row.authorName ?? 'Player',
  authorAvatarUrl: row.author_avatar_url ?? row.authorAvatarUrl ?? '',
  body: row.body ?? '',
  createdAt: row.created_at ?? row.createdAt ?? new Date().toISOString(),
});

const mapShopProduct = (row: any): ShopProduct => ({
  id: row.id,
  name: row.name ?? row.id ?? 'Item',
  description: row.description ?? '',
  kind: row.kind ?? 'card',
  priceCoins: Number(row.price_coins ?? row.priceCoins ?? 0),
  effectHint: row.effect_hint ?? row.effectHint ?? '',
  effectStatus: row.effect_status ?? row.effectStatus ?? 'coming_soon',
});

const mapSession = (row: any): AppSession => ({
  token: row.token,
  userId: row.user_id ?? row.userId,
  nickname: row.nickname,
  expiresAt: row.expires_at ?? row.expiresAt,
});

const mapAuthPayload = (payload: any): AuthPayload => ({
  session: mapSession(payload.session),
  profile: mapProfile(payload.profile),
});

const mapSubmitResult = (payload: any): SubmitMatchScoreResult => ({
  result: payload?.result ?? 'waiting',
  match: mapMatch(payload?.match ?? payload),
});

const readStoredSession = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(APP_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as AppSession;
  } catch {
    return null;
  }
};

const requireSessionToken = () => {
  const session = readStoredSession();
  if (!session?.token) {
    throw new Error('Please sign in again.');
  }
  return session.token;
};

export const getStoredSession = () => readStoredSession();

export const storeSession = (session: AppSession) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(APP_SESSION_STORAGE_KEY, JSON.stringify(session));
};

export const clearStoredSession = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(APP_SESSION_STORAGE_KEY);
};

export const getReadableErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

export const registerWithPassword = async (nickname: string, password: string) => {
  const data = await callRpc<any>('register_with_password', {
    p_nickname: nickname,
    p_password: password,
  });
  return mapAuthPayload(data);
};

export const loginWithPassword = async (nickname: string, password: string) => {
  const data = await callRpc<any>('login_with_password', {
    p_nickname: nickname,
    p_password: password,
  });
  return mapAuthPayload(data);
};

export const restoreSession = async (sessionToken: string) => {
  const data = await callRpc<any>('restore_password_session', {
    p_session_token: sessionToken,
  });

  if (!data) {
    return null;
  }

  return mapAuthPayload(data);
};

export const logoutSession = async (sessionToken: string) => {
  await callRpc('logout_password_session', {
    p_session_token: sessionToken,
  });
};

export const fetchProfile = async (_userId?: string) => {
  const data = await callRpc<any>('get_current_profile', {
    p_session_token: requireSessionToken(),
  });
  return data ? mapProfile(data) : null;
};

export const fetchPlayerProfile = async (userId: string) => {
  const data = await callRpc<any>('get_player_profile', {
    p_session_token: requireSessionToken(),
    p_user_id: userId,
  });
  return data ? mapProfile(data) : null;
};

export const updateProfilePreferences = async (values: {
  theme?: Theme;
  language?: Language;
  selectedTitle?: string;
  showcase?: UserProfile['showcase'];
}) => {
  const data = await callRpc<any>('update_profile_preferences', {
    p_session_token: requireSessionToken(),
    p_theme: values.theme ?? null,
    p_language: values.language ?? null,
    p_selected_title: typeof values.selectedTitle === 'undefined' ? null : values.selectedTitle,
    p_showcase: typeof values.showcase === 'undefined' ? null : values.showcase,
  });
  return mapProfile(data);
};

export const updateProfileDisplayName = async (displayName: string) => {
  const data = await callRpc<any>('rename_profile_display_name', {
    p_session_token: requireSessionToken(),
    p_display_name: displayName,
  });
  return mapProfile(data);
};

export const listProfiles = async (excludeUserId?: string) => {
  const data = await callRpc<any[]>('list_profiles_for_user', {
    p_session_token: requireSessionToken(),
    p_search: null,
    p_limit: 200,
  });
  return (data ?? []).map(mapProfile).filter((profile) => profile.uid !== excludeUserId);
};

export const searchProfiles = async (searchTerm: string, excludeUserId?: string) => {
  const data = await callRpc<any[]>('list_profiles_for_user', {
    p_session_token: requireSessionToken(),
    p_search: searchTerm,
    p_limit: 5,
  });
  return (data ?? []).map(mapProfile).filter((profile) => profile.uid !== excludeUserId);
};

export const listLeaderboardProfiles = async () => {
  const data = await callRpc<any[]>('list_leaderboard_profiles', {
    p_session_token: requireSessionToken(),
  });
  return (data ?? []).map(mapProfile);
};

export const listUserRecentMatches = async (_userId?: string, limit = 8) => {
  const data = await callRpc<any[]>('list_recent_matches_for_user', {
    p_session_token: requireSessionToken(),
    p_limit: limit,
  });
  return (data ?? []).map(mapMatch);
};

export const listUserActiveCasualMatches = async (_userId?: string) => {
  const data = await callRpc<any[]>('list_active_casual_matches_for_user', {
    p_session_token: requireSessionToken(),
  });
  return (data ?? []).map(mapMatch);
};

export const fetchMatch = async (matchId: string) => {
  const data = await callRpc<any>('get_match_for_user', {
    p_session_token: requireSessionToken(),
    p_match_id: matchId,
  });
  return data ? mapMatch(data) : null;
};

export const createCasualMatch = async (opponentId: string) => {
  const data = await callRpc<any>('create_match_request', {
    p_session_token: requireSessionToken(),
    p_match_type: 'casual',
    p_opponent_id: opponentId,
  });
  return mapMatch(data);
};

export const changeMatchStatus = async (
  matchId: string,
  action: 'accept' | 'decline' | 'cancel',
) => {
  const data = await callRpc<any>('change_match_status', {
    p_session_token: requireSessionToken(),
    p_action: action,
    p_match_id: matchId,
  });
  return mapMatch(data);
};

export const submitMatchScore = async (
  matchId: string,
  myScore: number,
  opponentScore: number,
) => {
  const data = await callRpc<any>('submit_match_score', {
    p_session_token: requireSessionToken(),
    p_match_id: matchId,
    p_my_score: myScore,
    p_opponent_score: opponentScore,
  });
  return mapSubmitResult(data);
};

export const listTournaments = async () => {
  const data = await callRpc<any[]>('list_tournaments_for_user', {
    p_session_token: requireSessionToken(),
  });
  return (data ?? []).map(mapTournament);
};

export const createTournament = async (name?: string) => {
  const data = await callRpc<any>('create_tournament', {
    p_session_token: requireSessionToken(),
    p_name: name ?? null,
  });
  return mapTournament(data);
};

export const registerForTournament = async (tournamentId: string) => {
  const data = await callRpc<any>('register_for_tournament', {
    p_session_token: requireSessionToken(),
    p_tournament_id: tournamentId,
  });
  return mapTournament(data);
};

export const startTournament = async (
  tournamentId: string,
  bracket: TournamentBracket,
  timeline: TournamentTimelineEvent[],
) => {
  const data = await callRpc<any>('start_tournament', {
    p_session_token: requireSessionToken(),
    p_tournament_id: tournamentId,
    p_bracket: bracket,
    p_timeline: timeline,
  });
  return mapTournament(data);
};

export const saveTournamentProgress = async (params: {
  tournamentId: string;
  matchId: string;
  bracket: TournamentBracket;
  timeline: TournamentTimelineEvent[];
  status: Tournament['status'];
  winnerId?: string | null;
  runnerUpId?: string | null;
  thirdPlaceId?: string | null;
}) => {
  const data = await callRpc<any>('save_tournament_progress', {
    p_session_token: requireSessionToken(),
    p_tournament_id: params.tournamentId,
    p_match_id: params.matchId,
    p_bracket: params.bracket,
    p_timeline: params.timeline,
    p_status: params.status,
    p_winner_id: params.winnerId ?? null,
    p_runner_up_id: params.runnerUpId ?? null,
    p_third_place_id: params.thirdPlaceId ?? null,
  });
  return mapTournament(data);
};

export const cancelTournament = async (tournamentId: string) => {
  const data = await callRpc<any>('cancel_tournament', {
    p_session_token: requireSessionToken(),
    p_tournament_id: tournamentId,
  });
  return mapTournament(data);
};

export const endTournament = async (tournamentId: string) => {
  const data = await callRpc<any>('end_tournament', {
    p_session_token: requireSessionToken(),
    p_tournament_id: tournamentId,
  });
  return mapTournament(data);
};

export const listTournamentMatchComments = async (tournamentId: string, matchId: string) => {
  const data = await callRpc<any[]>('list_tournament_match_comments', {
    p_session_token: requireSessionToken(),
    p_tournament_id: tournamentId,
    p_match_id: matchId,
  });
  return (data ?? []).map(mapTournamentComment);
};

export const createTournamentMatchComment = async (
  tournamentId: string,
  matchId: string,
  body: string,
) => {
  const data = await callRpc<any>('create_tournament_match_comment', {
    p_session_token: requireSessionToken(),
    p_tournament_id: tournamentId,
    p_match_id: matchId,
    p_body: body,
  });
  return mapTournamentComment(data);
};

export const listShopProducts = async () => {
  const data = await callRpc<any[]>('list_shop_products_for_user', {
    p_session_token: requireSessionToken(),
  });
  return (data ?? []).map(mapShopProduct);
};

export const purchaseShopItem = async (productId: string) => {
  const data = await callRpc<any>('purchase_shop_item', {
    p_session_token: requireSessionToken(),
    p_product_id: productId,
    p_quantity: 1,
  });
  return mapProfile(data);
};

export const adminResetUserProgress = async (userId: string) => {
  const data = await callRpc<any>('admin_reset_user_progress', {
    p_session_token: requireSessionToken(),
    p_user_id: userId,
  });
  return mapProfile(data);
};
