import type {
  Tournament,
  TournamentBracket,
  TournamentBracketMatch,
  TournamentMatchStatus,
  TournamentTimelineEvent,
  TournamentStage,
  UserProfile,
} from '../types';

type SubmitTournamentScoreResult = {
  bracket: TournamentBracket;
  result: 'waiting' | 'completed' | 'reset';
  timeline: TournamentTimelineEvent[];
};

type ForfeitTournamentMatchResult = {
  bracket: TournamentBracket;
  timeline: TournamentTimelineEvent[];
};

type FinalizedTournamentState = {
  status: Tournament['status'];
  winnerId: string | null;
  runnerUpId: string | null;
  thirdPlaceId: string | null;
};

const STAGE_LABELS: Record<TournamentStage, string> = {
  quarterfinal: 'Quarterfinal',
  semifinal: 'Semifinal',
  final: 'Grand Final',
  third_place: 'Third Place Match',
};

const createEvent = (
  tournamentId: string,
  type: TournamentTimelineEvent['type'],
  title: string,
  description: string,
  matchId: string | null = null,
): TournamentTimelineEvent => ({
  id: crypto.randomUUID(),
  type,
  title,
  description,
  createdAt: new Date().toISOString(),
  tournamentId,
  matchId,
});

const getRequiredWins = (bestOf: number) => Math.max(1, Math.ceil(bestOf / 2));

const validateScore = (bestOf: number, player1Score: number, player2Score: number) => {
  const requiredWins = getRequiredWins(bestOf);
  if (player1Score === player2Score) {
    return false;
  }

  if (player1Score < 0 || player2Score < 0) {
    return false;
  }

  const maxScore = Math.max(player1Score, player2Score);
  const minScore = Math.min(player1Score, player2Score);
  return maxScore === requiredWins && minScore >= 0 && minScore < requiredWins;
};

const cloneBracket = (bracket: TournamentBracket): TournamentBracket => ({
  size: bracket.size,
  matches: bracket.matches.map((match) => ({ ...match })),
});

const getStageDisplayLabel = (stage: TournamentStage, slot: number) => {
  if (stage === 'quarterfinal') {
    return `Quarterfinal ${slot}`;
  }

  if (stage === 'semifinal') {
    return `Semifinal ${slot}`;
  }

  if (stage === 'final') {
    return 'Grand Final';
  }

  return 'Third Place Match';
};

const createBracketMatch = (params: {
  stage: TournamentStage;
  round: number;
  slot: number;
  bestOf: number;
  player1?: UserProfile | null;
  player2?: UserProfile | null;
  player1Source?: string | null;
  player2Source?: string | null;
  nextMatchId?: string | null;
  nextSlot?: 1 | 2 | null;
  loserNextMatchId?: string | null;
  loserNextSlot?: 1 | 2 | null;
}): TournamentBracketMatch => {
  const player1 = params.player1 ?? null;
  const player2 = params.player2 ?? null;

  return {
    id: crypto.randomUUID(),
    stage: params.stage,
    round: params.round,
    slot: params.slot,
    label: getStageDisplayLabel(params.stage, params.slot),
    bestOf: params.bestOf,
    status: player1 && player2 ? 'ready' : player1 || player2 ? 'ready' : 'waiting',
    player1Id: player1?.uid ?? null,
    player1Name: player1?.displayName ?? '',
    player1AvatarUrl: player1?.photoURL ?? '',
    player1Source: params.player1Source ?? null,
    player2Id: player2?.uid ?? null,
    player2Name: player2?.displayName ?? '',
    player2AvatarUrl: player2?.photoURL ?? '',
    player2Source: params.player2Source ?? null,
    player1Score: null,
    player2Score: null,
    player1Confirmed: false,
    player2Confirmed: false,
    winnerId: null,
    resolution: null,
    nextMatchId: params.nextMatchId ?? null,
    nextSlot: params.nextSlot ?? null,
    loserNextMatchId: params.loserNextMatchId ?? null,
    loserNextSlot: params.loserNextSlot ?? null,
  };
};

const assignPlayerToMatch = (
  bracket: TournamentBracket,
  matchId: string,
  slot: 1 | 2,
  player: Pick<UserProfile, 'uid' | 'displayName' | 'photoURL'>,
) => {
  const target = bracket.matches.find((match) => match.id === matchId);
  if (!target) {
    return;
  }

  if (slot === 1) {
    target.player1Id = player.uid;
    target.player1Name = player.displayName;
    target.player1AvatarUrl = player.photoURL;
    target.player1Source = null;
  } else {
    target.player2Id = player.uid;
    target.player2Name = player.displayName;
    target.player2AvatarUrl = player.photoURL;
    target.player2Source = null;
  }

  if (target.status !== 'completed' && target.status !== 'walkover') {
    target.status = target.player1Id && target.player2Id ? 'ready' : 'waiting';
  }
};

const finalizeMatch = (
  tournament: Tournament,
  bracket: TournamentBracket,
  matchId: string,
  winnerSlot: 1 | 2,
  resolution: 'normal' | 'walkover',
  timeline: TournamentTimelineEvent[],
) => {
  const match = bracket.matches.find((current) => current.id === matchId);
  if (!match) {
    return;
  }

  const loserSlot: 1 | 2 = winnerSlot === 1 ? 2 : 1;
  const winnerId = winnerSlot === 1 ? match.player1Id : match.player2Id;
  const winnerName = winnerSlot === 1 ? match.player1Name : match.player2Name;
  const winnerAvatarUrl = winnerSlot === 1 ? match.player1AvatarUrl : match.player2AvatarUrl;
  const loserId = loserSlot === 1 ? match.player1Id : match.player2Id;
  const loserName = loserSlot === 1 ? match.player1Name : match.player2Name;
  const loserAvatarUrl = loserSlot === 1 ? match.player1AvatarUrl : match.player2AvatarUrl;

  if (!winnerId) {
    return;
  }

  match.winnerId = winnerId;
  match.player1Confirmed = true;
  match.player2Confirmed = true;
  match.status = resolution === 'walkover' ? 'walkover' : 'completed';
  match.resolution = resolution;

  if (resolution === 'walkover' && match.player1Score === null && match.player2Score === null) {
    const wins = getRequiredWins(match.bestOf);
    if (winnerSlot === 1) {
      match.player1Score = wins;
      match.player2Score = 0;
    } else {
      match.player1Score = 0;
      match.player2Score = wins;
    }
  }

  if (match.nextMatchId && match.nextSlot) {
    assignPlayerToMatch(
      bracket,
      match.nextMatchId,
      match.nextSlot,
      {
        uid: winnerId,
        displayName: winnerName,
        photoURL: winnerAvatarUrl,
      },
    );
  }

  if (match.loserNextMatchId && match.loserNextSlot && loserId) {
    assignPlayerToMatch(
      bracket,
      match.loserNextMatchId,
      match.loserNextSlot,
      {
        uid: loserId,
        displayName: loserName,
        photoURL: loserAvatarUrl,
      },
    );
  }

  const title = resolution === 'walkover' ? `${winnerName} advanced by walkover` : `${winnerName} won ${match.label}`;
  const description =
    resolution === 'walkover'
      ? `${winnerName} moved on from ${match.label} without playing.`
      : `${winnerName} beat ${loserName || 'their opponent'} in ${match.label}.`;

  timeline.unshift(createEvent(tournament.id, resolution === 'walkover' ? 'walkover' : 'match_completed', title, description, match.id));
};

const autoResolveWalkovers = (
  tournament: Tournament,
  bracket: TournamentBracket,
  timeline: TournamentTimelineEvent[],
) => {
  let changed = true;

  while (changed) {
    changed = false;

    for (const match of bracket.matches) {
      if (match.status === 'completed' || match.status === 'walkover') {
        continue;
      }

      const hasPlayer1 = Boolean(match.player1Id);
      const hasPlayer2 = Boolean(match.player2Id);
      const player1MissingIsBye = !hasPlayer1 && !match.player1Source;
      const player2MissingIsBye = !hasPlayer2 && !match.player2Source;

      if (hasPlayer1 && player2MissingIsBye) {
        finalizeMatch(tournament, bracket, match.id, 1, 'walkover', timeline);
        changed = true;
        break;
      }

      if (hasPlayer2 && player1MissingIsBye) {
        finalizeMatch(tournament, bracket, match.id, 2, 'walkover', timeline);
        changed = true;
        break;
      }
    }
  }
};

export const createTournamentBracket = (
  tournament: Tournament,
  participants: UserProfile[],
): { bracket: TournamentBracket; timeline: TournamentTimelineEvent[] } => {
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  const size = shuffled.length <= 4 ? 4 : 8;
  const seedLayout = size === 8 ? [0, 4, 6, 2, 3, 7, 5, 1] : [0, 2, 3, 1];
  const slots = Array.from({ length: size }, () => null as UserProfile | null);

  shuffled.slice(0, size).forEach((player, index) => {
    slots[seedLayout[index]] = player;
  });

  const semifinal1 = crypto.randomUUID();
  const semifinal2 = crypto.randomUUID();
  const finalId = crypto.randomUUID();
  const thirdPlaceId = crypto.randomUUID();

  const matches: TournamentBracketMatch[] = [];

  if (size === 8) {
    const quarterfinalLabels = ['Quarterfinal 1', 'Quarterfinal 2', 'Quarterfinal 3', 'Quarterfinal 4'];
    const quarterfinals = [
      createBracketMatch({
        stage: 'quarterfinal',
        round: 1,
        slot: 1,
        bestOf: 1,
        player1: slots[0],
        player2: slots[1],
        nextMatchId: semifinal1,
        nextSlot: 1,
      }),
      createBracketMatch({
        stage: 'quarterfinal',
        round: 1,
        slot: 2,
        bestOf: 1,
        player1: slots[2],
        player2: slots[3],
        nextMatchId: semifinal1,
        nextSlot: 2,
      }),
      createBracketMatch({
        stage: 'quarterfinal',
        round: 1,
        slot: 3,
        bestOf: 1,
        player1: slots[4],
        player2: slots[5],
        nextMatchId: semifinal2,
        nextSlot: 1,
      }),
      createBracketMatch({
        stage: 'quarterfinal',
        round: 1,
        slot: 4,
        bestOf: 1,
        player1: slots[6],
        player2: slots[7],
        nextMatchId: semifinal2,
        nextSlot: 2,
      }),
    ].map((match, index) => ({ ...match, label: quarterfinalLabels[index] }));

    matches.push(...quarterfinals);
  }

  const semifinalPlayers =
    size === 4
      ? [
          [slots[0], slots[1]],
          [slots[2], slots[3]],
        ]
      : [
          [null, null],
          [null, null],
        ];

  matches.push(
    {
      ...createBracketMatch({
        stage: 'semifinal',
        round: size === 4 ? 1 : 2,
        slot: 1,
        bestOf: 1,
        player1: semifinalPlayers[0][0],
        player2: semifinalPlayers[0][1],
        player1Source: size === 8 ? 'Winner of Quarterfinal 1' : null,
        player2Source: size === 8 ? 'Winner of Quarterfinal 2' : null,
        nextMatchId: finalId,
        nextSlot: 1,
        loserNextMatchId: thirdPlaceId,
        loserNextSlot: 1,
      }),
      id: semifinal1,
      label: 'Semifinal 1',
    },
    {
      ...createBracketMatch({
        stage: 'semifinal',
        round: size === 4 ? 1 : 2,
        slot: 2,
        bestOf: 1,
        player1: semifinalPlayers[1][0],
        player2: semifinalPlayers[1][1],
        player1Source: size === 8 ? 'Winner of Quarterfinal 3' : null,
        player2Source: size === 8 ? 'Winner of Quarterfinal 4' : null,
        nextMatchId: finalId,
        nextSlot: 2,
        loserNextMatchId: thirdPlaceId,
        loserNextSlot: 2,
      }),
      id: semifinal2,
      label: 'Semifinal 2',
    },
    {
      ...createBracketMatch({
        stage: 'final',
        round: size === 4 ? 2 : 3,
        slot: 1,
        bestOf: 3,
        player1Source: 'Winner of Semifinal 1',
        player2Source: 'Winner of Semifinal 2',
      }),
      id: finalId,
      label: 'Grand Final',
    },
    {
      ...createBracketMatch({
        stage: 'third_place',
        round: size === 4 ? 2 : 3,
        slot: 1,
        bestOf: 3,
        player1Source: 'Loser of Semifinal 1',
        player2Source: 'Loser of Semifinal 2',
      }),
      id: thirdPlaceId,
      label: 'Third Place Match',
    },
  );

  const bracket: TournamentBracket = {
    size,
    matches,
  };

  const timeline: TournamentTimelineEvent[] = [
    createEvent(
      tournament.id,
      'tournament_started',
      `${tournament.name} is live`,
      `${participants.length} players entered a ${size}-slot bracket.`,
    ),
  ];

  autoResolveWalkovers(tournament, bracket, timeline);

  return { bracket, timeline };
};

export const submitTournamentMatchScore = (
  tournament: Tournament,
  bracket: TournamentBracket,
  matchId: string,
  actorUserId: string,
  myScore: number,
  opponentScore: number,
): SubmitTournamentScoreResult => {
  const nextBracket = cloneBracket(bracket);
  const nextTimeline: TournamentTimelineEvent[] = [];
  const match = nextBracket.matches.find((current) => current.id === matchId);

  if (!match) {
    throw new Error('Tournament match not found.');
  }

  if (match.status !== 'ready' && match.status !== 'waiting_confirmation') {
    throw new Error('This match cannot accept scores right now.');
  }

  const actorSlot = match.player1Id === actorUserId ? 1 : match.player2Id === actorUserId ? 2 : null;
  if (!actorSlot) {
    throw new Error('You are not part of this tournament match.');
  }

  const canonicalPlayer1Score = actorSlot === 1 ? myScore : opponentScore;
  const canonicalPlayer2Score = actorSlot === 1 ? opponentScore : myScore;

  if (!validateScore(match.bestOf, canonicalPlayer1Score, canonicalPlayer2Score)) {
    throw new Error(match.bestOf === 1 ? 'Use a BO1 result like 1:0.' : 'Use a BO3 result like 2:0 or 2:1.');
  }

  const counterpartConfirmed = actorSlot === 1 ? match.player2Confirmed : match.player1Confirmed;
  if (!counterpartConfirmed) {
    match.player1Score = canonicalPlayer1Score;
    match.player2Score = canonicalPlayer2Score;
    match.player1Confirmed = actorSlot === 1 ? true : match.player1Confirmed;
    match.player2Confirmed = actorSlot === 2 ? true : match.player2Confirmed;
    match.status = 'waiting_confirmation';

    return {
      bracket: nextBracket,
      result: 'waiting',
      timeline: nextTimeline,
    };
  }

  if (
    canonicalPlayer1Score === match.player1Score &&
    canonicalPlayer2Score === match.player2Score
  ) {
    match.player1Score = canonicalPlayer1Score;
    match.player2Score = canonicalPlayer2Score;
    match.player1Confirmed = true;
    match.player2Confirmed = true;

    const winnerSlot: 1 | 2 = canonicalPlayer1Score > canonicalPlayer2Score ? 1 : 2;
    finalizeMatch(tournament, nextBracket, match.id, winnerSlot, 'normal', nextTimeline);
    autoResolveWalkovers(tournament, nextBracket, nextTimeline);

    return {
      bracket: nextBracket,
      result: 'completed',
      timeline: nextTimeline,
    };
  }

  match.player1Score = null;
  match.player2Score = null;
  match.player1Confirmed = false;
  match.player2Confirmed = false;
  match.status = 'ready';

  return {
    bracket: nextBracket,
    result: 'reset',
    timeline: nextTimeline,
  };
};

export const forfeitTournamentMatch = (
  tournament: Tournament,
  bracket: TournamentBracket,
  matchId: string,
  actorUserId: string,
): ForfeitTournamentMatchResult => {
  const nextBracket = cloneBracket(bracket);
  const nextTimeline: TournamentTimelineEvent[] = [];
  const match = nextBracket.matches.find((current) => current.id === matchId);

  if (!match) {
    throw new Error('Tournament match not found.');
  }

  if (match.status === 'completed' || match.status === 'walkover') {
    throw new Error('This match is already finished.');
  }

  if (match.player1Id !== actorUserId && match.player2Id !== actorUserId) {
    throw new Error('Only a player in this match can forfeit it.');
  }

  const winnerSlot: 1 | 2 = match.player1Id === actorUserId ? 2 : 1;
  finalizeMatch(tournament, nextBracket, match.id, winnerSlot, 'walkover', nextTimeline);
  autoResolveWalkovers(tournament, nextBracket, nextTimeline);

  return {
    bracket: nextBracket,
    timeline: nextTimeline,
  };
};

export const getFinalizedTournamentState = (
  bracket: TournamentBracket,
): FinalizedTournamentState => {
  const finalMatch = bracket.matches.find((match) => match.stage === 'final');
  const thirdPlaceMatch = bracket.matches.find((match) => match.stage === 'third_place');

  const finalDone = finalMatch && (finalMatch.status === 'completed' || finalMatch.status === 'walkover');
  const thirdDone =
    thirdPlaceMatch &&
    (thirdPlaceMatch.status === 'completed' || thirdPlaceMatch.status === 'walkover');

  if (!finalDone || !thirdDone) {
    return {
      status: 'ongoing',
      winnerId: null,
      runnerUpId: null,
      thirdPlaceId: null,
    };
  }

  const winnerId = finalMatch.winnerId;
  const runnerUpId =
    finalMatch.winnerId === finalMatch.player1Id ? finalMatch.player2Id : finalMatch.player1Id;
  const thirdPlaceId = thirdPlaceMatch.winnerId;

  return {
    status: 'completed',
    winnerId: winnerId ?? null,
    runnerUpId: runnerUpId ?? null,
    thirdPlaceId: thirdPlaceId ?? null,
  };
};

export const createCompletionTimeline = (
  tournament: Tournament,
  bracket: TournamentBracket,
): TournamentTimelineEvent[] => {
  const finalMatch = bracket.matches.find((match) => match.stage === 'final');
  const thirdPlaceMatch = bracket.matches.find((match) => match.stage === 'third_place');

  if (!finalMatch?.winnerId || !thirdPlaceMatch?.winnerId) {
    return [];
  }

  const championName = finalMatch.winnerId === finalMatch.player1Id ? finalMatch.player1Name : finalMatch.player2Name;
  const thirdPlaceName =
    thirdPlaceMatch.winnerId === thirdPlaceMatch.player1Id
      ? thirdPlaceMatch.player1Name
      : thirdPlaceMatch.player2Name;

  return [
    createEvent(
      tournament.id,
      'tournament_completed',
      `${championName} won ${tournament.name}`,
      `${championName} is the new champion, and ${thirdPlaceName} claimed third place.`,
      finalMatch.id,
    ),
  ];
};

export const sortTournamentTimeline = (timeline: TournamentTimelineEvent[]) => {
  return [...timeline].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
};

export const getTournamentMatchStatusTone = (status: TournamentMatchStatus) => {
  switch (status) {
    case 'ready':
      return 'emerald';
    case 'waiting_confirmation':
      return 'amber';
    case 'completed':
    case 'walkover':
      return 'sky';
    default:
      return 'zinc';
  }
};

export const getTournamentStageHeading = (stage: TournamentStage) => STAGE_LABELS[stage];

