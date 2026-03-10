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
export type TournamentStatus = 'registration' | 'ongoing' | 'completed';

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

export interface Inventory {
  trophies: Trophy[];
  titles: string[];
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
  inventory: Inventory;
  showcase: ShowcaseSlot[];
  selectedTitle: string | null;
  theme: Theme;
  language: Language;
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

export interface Tournament {
  id: string;
  name: string;
  status: TournamentStatus;
  startDate: string;
  endDate: string;
  participants: string[];
  winnerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitMatchScoreResult {
  result: 'waiting' | 'completed' | 'reset';
  match: Match;
}

export interface AuthPayload {
  session: AppSession;
  profile: UserProfile;
}
