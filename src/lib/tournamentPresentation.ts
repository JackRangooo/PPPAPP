import { addWeeks, endOfWeek, startOfWeek } from 'date-fns';

import type { Tournament, UserProfile } from '../types';
import type { TournamentPodiumEntry, TournamentStandingEntry } from '../components/TournamentPodium';

export type TournamentPreviewCard = {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
};

export const tournamentStatusOrder: Record<Tournament['status'], number> = {
  registration: 0,
  ongoing: 1,
  completed: 2,
  cancelled: 3,
};

export const tournamentSourceOrder: Record<Tournament['source'], number> = {
  system: 0,
  admin: 1,
};

export const upsertTournament = (tournaments: Tournament[], nextTournament: Tournament) => {
  const withoutCurrent = tournaments.filter((tournament) => tournament.id !== nextTournament.id);
  return [...withoutCurrent, nextTournament].sort((left, right) => {
    const statusDelta = tournamentStatusOrder[left.status] - tournamentStatusOrder[right.status];
    if (statusDelta !== 0) {
      return statusDelta;
    }

    const sourceDelta = tournamentSourceOrder[left.source] - tournamentSourceOrder[right.source];
    if (sourceDelta !== 0) {
      return sourceDelta;
    }

    return new Date(right.startDate).getTime() - new Date(left.startDate).getTime();
  });
};

export const buildTournamentPreviewCard = (
  title: string,
  description: string,
): TournamentPreviewCard => {
  const nextStart = startOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 });
  const nextEnd = endOfWeek(nextStart, { weekStartsOn: 1 });

  return {
    id: 'system-preview-next-week',
    title,
    description,
    startDate: nextStart,
    endDate: nextEnd,
  };
};

const getParticipantSnapshot = (
  tournament: Tournament,
  participantId: string,
  profilesById: Record<string, UserProfile>,
) => {
  const profile = profilesById[participantId];
  if (profile) {
    return {
      id: participantId,
      name: profile.displayName,
      avatarUrl: profile.photoURL,
    };
  }

  const matchReference = tournament.bracket.matches.find(
    (match) => match.player1Id === participantId || match.player2Id === participantId,
  );
  const isPlayer1 = matchReference?.player1Id === participantId;

  return {
    id: participantId,
    name: isPlayer1 ? matchReference?.player1Name || 'Player' : matchReference?.player2Name || 'Player',
    avatarUrl: isPlayer1 ? matchReference?.player1AvatarUrl || '' : matchReference?.player2AvatarUrl || '',
  };
};

export const getTournamentPodiumData = (
  tournament: Tournament,
  profilesById: Record<string, UserProfile>,
) => {
  const participationCounts = new Map<string, number>();

  tournament.bracket.matches.forEach((match) => {
    if (match.status !== 'completed' && match.status !== 'walkover') {
      return;
    }

    if (match.player1Id) {
      participationCounts.set(match.player1Id, (participationCounts.get(match.player1Id) ?? 0) + 1);
    }

    if (match.player2Id) {
      participationCounts.set(match.player2Id, (participationCounts.get(match.player2Id) ?? 0) + 1);
    }
  });

  const podiumEntries: TournamentPodiumEntry[] = [
    { id: tournament.winnerId ?? '', label: 'champion' },
    { id: tournament.runnerUpId ?? '', label: 'runnerUp' },
    { id: tournament.thirdPlaceId ?? '', label: 'thirdPlace' },
  ]
    .filter((entry): entry is { id: string; label: TournamentPodiumEntry['label'] } => Boolean(entry.id))
    .map((entry) => {
      const snapshot = getParticipantSnapshot(tournament, entry.id, profilesById);
      return {
        id: snapshot.id,
        name: snapshot.name,
        avatarUrl: snapshot.avatarUrl,
        label: entry.label,
      };
    });

  const podiumIds = new Set(podiumEntries.map((entry) => entry.id));
  const remainingPlayers = tournament.participants
    .filter((participantId) => !podiumIds.has(participantId))
    .map((participantId) => {
      const snapshot = getParticipantSnapshot(tournament, participantId, profilesById);
      return {
        id: snapshot.id,
        name: snapshot.name,
        avatarUrl: snapshot.avatarUrl,
        matchesPlayed: participationCounts.get(participantId) ?? 0,
      };
    })
    .sort((left, right) => {
      if (right.matchesPlayed !== left.matchesPlayed) {
        return right.matchesPlayed - left.matchesPlayed;
      }

      return left.name.localeCompare(right.name);
    });

  let lastMatchesPlayed: number | null = null;
  let lastRank = 4;
  const standings: TournamentStandingEntry[] = remainingPlayers.map((entry, index) => {
    if (lastMatchesPlayed === null || entry.matchesPlayed !== lastMatchesPlayed) {
      lastRank = index + 4;
      lastMatchesPlayed = entry.matchesPlayed;
    }

    return {
      ...entry,
      rank: lastRank,
    };
  });

  return {
    podiumEntries,
    standings,
  };
};
