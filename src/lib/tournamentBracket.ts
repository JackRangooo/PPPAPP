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

type AdminResolveTournamentScoreResult = {
  bracket: TournamentBracket;
  result: 'completed';
  timeline: TournamentTimelineEvent[];
};

type ForfeitTournamentMatchResult = {
  bracket: TournamentBracket;
  timeline: TournamentTimelineEvent[];
};

type SetTournamentMatchReadyResult = {
  bracket: TournamentBracket;
  timeline: TournamentTimelineEvent[];
  result: 'pending' | 'ongoing';
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

const validateScore = (_bestOf: number, player1Score: number, player2Score: number) => {
  if (player1Score === player2Score) {
    return false;
  }

  if (player1Score < 0 || player2Score < 0) {
    return false;
  }

  if (!Number.isInteger(player1Score) || !Number.isInteger(player2Score)) {
    return false;
  }

  return true;
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
  label?: string;
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
  const hasResolvedPlayers = Boolean(player1?.uid && player2?.uid);
  const hasPendingSource = Boolean(params.player1Source || params.player2Source);
  const hasWalkoverCandidate = Boolean((player1?.uid || player2?.uid) && !hasPendingSource);

  return {
    id: crypto.randomUUID(),
    stage: params.stage,
    round: params.round,
    slot: params.slot,
    label: params.label ?? getStageDisplayLabel(params.stage, params.slot),
    bestOf: params.bestOf,
    status: hasResolvedPlayers || hasWalkoverCandidate ? 'pending' : 'waiting',
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
    player1Ready: false,
    player2Ready: false,
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
    target.player1Ready = false;
    target.player2Ready = false;
    target.player1Confirmed = false;
    target.player2Confirmed = false;
    target.player1Score = null;
    target.player2Score = null;
    target.winnerId = null;
    target.resolution = null;
    target.status = target.player1Id && target.player2Id ? 'pending' : 'waiting';
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
  match.player1Ready = true;
  match.player2Ready = true;
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
  const seeds = Array.from({ length: size }, (_, index) => shuffled[index] ?? null);

  const semifinal1 = crypto.randomUUID();
  const semifinal2 = crypto.randomUUID();
  const finalId = crypto.randomUUID();
  const thirdPlaceId = crypto.randomUUID();

  const matches: TournamentBracketMatch[] = [];

  const semifinalSlots = {
    1: {
      player1: null as UserProfile | null,
      player2: null as UserProfile | null,
      player1Source: null as string | null,
      player2Source: null as string | null,
    },
    2: {
      player1: null as UserProfile | null,
      player2: null as UserProfile | null,
      player1Source: null as string | null,
      player2Source: null as string | null,
    },
  };

  if (size === 4) {
    semifinalSlots[1].player1 = seeds[0];
    semifinalSlots[1].player2 = seeds[3];
    semifinalSlots[2].player1 = seeds[1];
    semifinalSlots[2].player2 = seeds[2];
  } else {
    const quarterfinalBlueprints = [
      { slot: 1, player1: seeds[0], player2: seeds[7], semifinal: 1 as const, nextSlot: 1 as const },
      { slot: 2, player1: seeds[3], player2: seeds[4], semifinal: 1 as const, nextSlot: 2 as const },
      { slot: 3, player1: seeds[2], player2: seeds[5], semifinal: 2 as const, nextSlot: 1 as const },
      { slot: 4, player1: seeds[1], player2: seeds[6], semifinal: 2 as const, nextSlot: 2 as const },
    ];

    const quarterfinals = quarterfinalBlueprints
      .map((blueprint) => {
        const hasPlayer1 = Boolean(blueprint.player1?.uid);
        const hasPlayer2 = Boolean(blueprint.player2?.uid);

        if (hasPlayer1 && hasPlayer2) {
          return createBracketMatch({
            stage: 'quarterfinal',
            round: 1,
            slot: blueprint.slot,
            bestOf: 1,
            player1: blueprint.player1,
            player2: blueprint.player2,
            nextMatchId: blueprint.semifinal === 1 ? semifinal1 : semifinal2,
            nextSlot: blueprint.nextSlot,
          });
        }

        const directPlayer = blueprint.player1 ?? blueprint.player2;
        if (!directPlayer) {
          return null;
        }

        if (blueprint.nextSlot === 1) {
          semifinalSlots[blueprint.semifinal].player1 = directPlayer;
        } else {
          semifinalSlots[blueprint.semifinal].player2 = directPlayer;
        }

        return null;
      })
      .filter((match): match is TournamentBracketMatch => Boolean(match))
      .sort((left, right) => left.slot - right.slot);

    const quarterfinalLabelBase = participants.length === 8 ? 'Quarterfinal' : participants.length === 5 ? 'Play-In' : 'Qualifier';
    quarterfinals.forEach((match, index) => {
      match.label = quarterfinals.length === 1 ? quarterfinalLabelBase : `${quarterfinalLabelBase} ${index + 1}`;

      const semifinal = match.nextMatchId === semifinal1 ? semifinalSlots[1] : semifinalSlots[2];
      if (match.nextSlot === 1) {
        semifinal.player1Source = `Winner of ${match.label}`;
      } else {
        semifinal.player2Source = `Winner of ${match.label}`;
      }
    });

    matches.push(...quarterfinals);
  }

  matches.push(
    {
      ...createBracketMatch({
        stage: 'semifinal',
        round: size === 4 ? 1 : 2,
        slot: 1,
        bestOf: 1,
        player1: semifinalSlots[1].player1,
        player2: semifinalSlots[1].player2,
        player1Source: semifinalSlots[1].player1Source,
        player2Source: semifinalSlots[1].player2Source,
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
        player1: semifinalSlots[2].player1,
        player2: semifinalSlots[2].player2,
        player1Source: semifinalSlots[2].player1Source,
        player2Source: semifinalSlots[2].player2Source,
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

export const setTournamentMatchReady = (
  tournament: Tournament,
  bracket: TournamentBracket,
  matchId: string,
  actorUserId: string,
): SetTournamentMatchReadyResult => {
  const nextBracket = cloneBracket(bracket);
  const nextTimeline: TournamentTimelineEvent[] = [];
  const match = nextBracket.matches.find((current) => current.id === matchId);

  if (!match) {
    throw new Error('Tournament match not found.');
  }

  if (match.status !== 'pending' && match.status !== 'ongoing') {
    throw new Error('This match cannot be readied right now.');
  }

  if (!match.player1Id || !match.player2Id) {
    throw new Error('This match is still waiting for players.');
  }

  const actorSlot = match.player1Id === actorUserId ? 1 : match.player2Id === actorUserId ? 2 : null;
  if (!actorSlot) {
    throw new Error('You are not part of this tournament match.');
  }

  if (actorSlot === 1) {
    match.player1Ready = true;
  } else {
    match.player2Ready = true;
  }

  if (match.player1Ready && match.player2Ready) {
    match.status = 'ongoing';
    match.player1Confirmed = false;
    match.player2Confirmed = false;
    match.player1Score = null;
    match.player2Score = null;
    nextTimeline.unshift(
      createEvent(
        tournament.id,
        'match_ready',
        `${match.label} is ready`,
        `${match.player1Name || 'Player 1'} and ${match.player2Name || 'Player 2'} are ready to play.`,
        match.id,
      ),
    );

    return {
      bracket: nextBracket,
      timeline: nextTimeline,
      result: 'ongoing',
    };
  }

  return {
    bracket: nextBracket,
    timeline: nextTimeline,
    result: 'pending',
  };
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

  if (match.status !== 'ongoing' && match.status !== 'waiting_confirmation') {
    throw new Error('This match cannot accept scores right now.');
  }

  if (!match.player1Ready || !match.player2Ready) {
    throw new Error('Both players must be ready before reporting scores.');
  }

  const actorSlot = match.player1Id === actorUserId ? 1 : match.player2Id === actorUserId ? 2 : null;
  if (!actorSlot) {
    throw new Error('You are not part of this tournament match.');
  }

  const canonicalPlayer1Score = actorSlot === 1 ? myScore : opponentScore;
  const canonicalPlayer2Score = actorSlot === 1 ? opponentScore : myScore;

  if (!validateScore(match.bestOf, canonicalPlayer1Score, canonicalPlayer2Score)) {
    throw new Error('Enter the final score for both players. Scores cannot be tied.');
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
  match.status = 'ongoing';

  return {
    bracket: nextBracket,
    result: 'reset',
    timeline: nextTimeline,
  };
};

export const adminResolveTournamentMatchScore = (
  tournament: Tournament,
  bracket: TournamentBracket,
  matchId: string,
  player1Score: number,
  player2Score: number,
): AdminResolveTournamentScoreResult => {
  const nextBracket = cloneBracket(bracket);
  const nextTimeline: TournamentTimelineEvent[] = [];
  const match = nextBracket.matches.find((current) => current.id === matchId);

  if (!match) {
    throw new Error('Tournament match not found.');
  }

  if (match.status === 'completed' || match.status === 'walkover') {
    throw new Error('This match is already finished.');
  }

  if (!match.player1Id || !match.player2Id) {
    throw new Error('Both players must be assigned before scoring this match.');
  }

  if (!validateScore(match.bestOf, player1Score, player2Score)) {
    throw new Error('Enter the final score for both players. Scores cannot be tied.');
  }

  match.player1Ready = true;
  match.player2Ready = true;
  match.player1Confirmed = true;
  match.player2Confirmed = true;
  match.player1Score = player1Score;
  match.player2Score = player2Score;

  const winnerSlot: 1 | 2 = player1Score > player2Score ? 1 : 2;
  finalizeMatch(tournament, nextBracket, match.id, winnerSlot, 'normal', nextTimeline);
  autoResolveWalkovers(tournament, nextBracket, nextTimeline);

  return {
    bracket: nextBracket,
    result: 'completed',
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
    case 'ongoing':
      return 'emerald';
    case 'pending':
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
