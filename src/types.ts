export type Language = 'en' | 'zh';
export type Theme = 'dark' | 'light';
export type MatchStatus =
  | 'pending'
  | 'accepted'
  | 'ongoing'
  | 'completed'
  | 'declined'
  | 'cancelled';
export type MatchType = 'casual' | 'ranked';
export type TournamentStatus = 'registration' | 'ongoing' | 'completed' | 'cancelled';
export type TournamentSource = 'system' | 'admin';
export type TournamentStage = 'quarterfinal' | 'semifinal' | 'third_place' | 'final';
export type TournamentMatchStatus =
  | 'waiting'
  | 'pending'
  | 'ongoing'
  | 'waiting_confirmation'
  | 'completed'
  | 'walkover';

export interface AppSession {
  token: string;
  userId: string;
  nickname: string;
  expiresAt: string;
}

export interface Trophy {
  id: string;
  name: string;
  tournamentName: string;
  rank: number;
  date: string;
}

export interface ShowcaseSlot {
  slotId: number;
  trophyId: string | null;
}

export type InventoryItemKind = 'card';

export interface InventoryItem {
  productId: string;
  name: string;
  description: string;
  kind: InventoryItemKind;
  quantity: number;
  priceCoins: number;
  effectHint: string;
  effectStatus: 'coming_soon' | 'active';
}

export interface Inventory {
  trophies: Trophy[];
  titles: string[];
  items: InventoryItem[];
}

export interface UserProfile {
  uid: string;
  nickname: string;
  email: string;
  displayName: string;
  photoURL: string;
  casualStars: number;
  casualWins: number;
  casualLosses: number;
  rankedPoints: number;
  rankedWins: number;
  rankedLosses: number;
  averageRank: number;
  tournamentsPlayed: number;
  coins: number;
  inventory: Inventory;
  showcase: ShowcaseSlot[];
  selectedTitle: string | null;
  theme: Theme;
  language: Language;
  isRoot: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Match {
  id: string;
  player1Id: string;
  player2Id: string;
  player1Name: string;
  player2Name: string;
  player1Photo: string;
  player2Photo: string;
  player1Score: number | null;
  player2Score: number | null;
  player1Confirmed: boolean;
  player2Confirmed: boolean;
  status: MatchStatus;
  type: MatchType;
  winnerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TournamentBracketMatch {
  id: string;
  stage: TournamentStage;
  round: number;
  slot: number;
  label: string;
  bestOf: number;
  status: TournamentMatchStatus;
  player1Id: string | null;
  player1Name: string;
  player1AvatarUrl: string;
  player1Source: string | null;
  player2Id: string | null;
  player2Name: string;
  player2AvatarUrl: string;
  player2Source: string | null;
  player1Score: number | null;
  player2Score: number | null;
  player1Ready: boolean;
  player2Ready: boolean;
  player1Confirmed: boolean;
  player2Confirmed: boolean;
  winnerId: string | null;
  resolution: 'normal' | 'walkover' | null;
  nextMatchId: string | null;
  nextSlot: 1 | 2 | null;
  loserNextMatchId: string | null;
  loserNextSlot: 1 | 2 | null;
}

export interface TournamentBracket {
  size: number;
  matches: TournamentBracketMatch[];
}

export interface TournamentTimelineEvent {
  id: string;
  type:
    | 'registration_opened'
    | 'tournament_started'
    | 'match_ready'
    | 'match_completed'
    | 'walkover'
    | 'tournament_cancelled'
    | 'tournament_completed';
  title: string;
  description: string;
  createdAt: string;
  tournamentId: string;
  matchId: string | null;
}

export interface Tournament {
  id: string;
  name: string;
  status: TournamentStatus;
  source: TournamentSource;
  startDate: string;
  endDate: string;
  participants: string[];
  winnerId: string | null;
  runnerUpId: string | null;
  thirdPlaceId: string | null;
  adminUserId: string | null;
  format: string;
  bracket: TournamentBracket;
  timeline: TournamentTimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface TournamentMatchComment {
  id: string;
  tournamentId: string;
  matchId: string;
  userId: string;
  authorName: string;
  authorAvatarUrl: string;
  body: string;
  createdAt: string;
}

export interface SubmitMatchScoreResult {
  result: 'waiting' | 'completed' | 'reset';
  match: Match;
}

export interface AuthPayload {
  session: AppSession;
  profile: UserProfile;
}

export interface ShopProduct {
  id: string;
  name: string;
  description: string;
  kind: InventoryItemKind;
  priceCoins: number;
  effectHint: string;
  effectStatus: 'coming_soon' | 'active';
}
