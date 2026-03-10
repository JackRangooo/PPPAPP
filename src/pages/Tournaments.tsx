import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  Calendar,
  ChevronRight,
  Flag,
  MessageSquare,
  PlayCircle,
  Shield,
  Trophy as TrophyIcon,
  Users,
} from 'lucide-react';
import clsx from 'clsx';

import { useAuth } from '../App';
import TournamentBracket from '../components/TournamentBracket';
import {
  cancelTournament,
  createTournament,
  createTournamentMatchComment,
  endTournament,
  getReadableErrorMessage,
  listProfiles,
  listTournamentMatchComments,
  listTournaments,
  registerForTournament,
  saveTournamentProgress,
  startTournament,
} from '../lib/api';
import {
  createCompletionTimeline,
  createTournamentBracket,
  forfeitTournamentMatch,
  getFinalizedTournamentState,
  sortTournamentTimeline,
  submitTournamentMatchScore,
} from '../lib/tournamentBracket';
import { subscribeToTable } from '../lib/supabase';
import type { Tournament, TournamentBracketMatch, TournamentMatchComment, UserProfile } from '../types';
import { useTranslation } from '../i18n';

const copy = {
  en: {
    createTournament: 'Create Tournament',
    startTournament: 'Start Bracket',
    cancelTournament: 'Cancel Tournament',
    forceSettle: 'Force Settle',
    minPlayersHint: 'Need at least 4 players and at most 8 players.',
    bracketTitle: 'Live Bracket',
    matchDesk: 'Match Desk',
    scoreLine: 'Score line',
    submitScore: 'Submit Result',
    forfeit: 'Forfeit Match',
    matchComments: 'Match Comments',
    commentPlaceholder: 'Leave a comment after the match...',
    postComment: 'Post Comment',
    noComments: 'No comments yet.',
    noBracket: 'The bracket will appear once the root admin starts the event.',
    rootOnly: 'Root admin controls start / cancel / emergency settlement.',
    registrationClosed: 'Registration is closed once the bracket starts.',
    noTournamentYet: 'No tournament exists yet. The root admin can create one from here.',
    commentsLocked: 'Comments open after the match is finished.',
    waitingForSelection: 'Choose a match node to inspect the players, status, and discussion.',
    tournamentCancelled: 'This tournament was cancelled.',
    podium: 'Podium',
    champion: 'Champion',
    runnerUp: 'Runner-up',
    thirdPlace: 'Third Place',
    participants: 'Players',
    rootBadge: 'Root Only',
    submitWaiting: 'Result saved. Waiting for your opponent to confirm.',
    submitReset: 'The two submissions did not match, so this result was reset.',
    submitCompleted: 'Match result confirmed and bracket updated.',
    forfeitConfirm: 'Forfeit this match and send your opponent forward?',
    cancelConfirm: 'Cancel this tournament? This cannot be undone.',
    startConfirm: 'Start the tournament and lock the bracket?',
    createSuccess: 'Tournament created.',
    startSuccess: 'Bracket started.',
    cancelSuccess: 'Tournament cancelled.',
    commentSuccess: 'Comment posted.',
    noProfileForBracket: 'Some participant profiles are still missing. Refresh and try again.',
    noScoreTie: 'Enter a valid BO result. BO1 should be 1:0, BO3 should be 2:0 or 2:1.',
    awaitingAction: 'This match is waiting for both players.',
    registeredListTitle: 'Registered Players',
    startedByRoot: 'Official single-elimination bracket with a third-place match.',
  },
  zh: {
    createTournament: '创建锦标赛',
    startTournament: '开始对阵',
    cancelTournament: '取消锦标赛',
    forceSettle: '强制结算',
    minPlayersHint: '至少 4 人、最多 8 人后才能正式开赛。',
    bracketTitle: '实时对阵表',
    matchDesk: '比赛操作台',
    scoreLine: '比分录入',
    submitScore: '提交赛果',
    forfeit: '本场退赛',
    matchComments: '比赛评论',
    commentPlaceholder: '比赛结束后在这里留言...',
    postComment: '发布评论',
    noComments: '还没有评论。',
    noBracket: 'root 管理员开始锦标赛后，这里会出现正式对阵表。',
    rootOnly: '开始 / 取消 / 紧急结算由 root 管理员控制。',
    registrationClosed: '开始生成对阵后将停止报名。',
    noTournamentYet: '当前还没有锦标赛，root 管理员可以在这里创建。',
    commentsLocked: '比赛结束后才能评论。',
    waitingForSelection: '点选一个对阵节点，就能查看状态、比分和讨论区。',
    tournamentCancelled: '这场锦标赛已取消。',
    podium: '领奖台',
    champion: '冠军',
    runnerUp: '亚军',
    thirdPlace: '季军',
    participants: '球员',
    rootBadge: '仅 root',
    submitWaiting: '赛果已提交，等待对手确认。',
    submitReset: '双方提交不一致，本场结果已重置。',
    submitCompleted: '赛果已确认，对阵表已更新。',
    forfeitConfirm: '确认退赛并让对手直接晋级吗？',
    cancelConfirm: '确认取消这场锦标赛吗？此操作无法撤销。',
    startConfirm: '确认开始锦标赛并锁定对阵吗？',
    createSuccess: '锦标赛已创建。',
    startSuccess: '正式对阵已开始。',
    cancelSuccess: '锦标赛已取消。',
    commentSuccess: '评论已发布。',
    noProfileForBracket: '部分参赛者资料还没同步到前端，请刷新后重试。',
    noScoreTie: '请输入合法赛果。BO1 用 1:0，BO3 用 2:0 或 2:1。',
    awaitingAction: '这场比赛仍在等待双方就位。',
    registeredListTitle: '已报名球员',
    startedByRoot: '正式单败淘汰赛，包含季军赛。',
  },
} as const;

const statusOrder: Record<Tournament['status'], number> = {
  registration: 0,
  ongoing: 1,
  completed: 2,
  cancelled: 3,
};

const upsertTournament = (tournaments: Tournament[], nextTournament: Tournament) => {
  const withoutCurrent = tournaments.filter((tournament) => tournament.id !== nextTournament.id);
  return [...withoutCurrent, nextTournament].sort((left, right) => {
    const statusDelta = statusOrder[left.status] - statusOrder[right.status];
    if (statusDelta !== 0) {
      return statusDelta;
    }
    return new Date(right.startDate).getTime() - new Date(left.startDate).getTime();
  });
};

const getPodiumName = (tournament: Tournament, profilesById: Record<string, UserProfile>) => {
  const finalMatch = tournament.bracket.matches.find((match) => match.stage === 'final');
  const thirdPlaceMatch = tournament.bracket.matches.find((match) => match.stage === 'third_place');

  return {
    champion:
      (tournament.winnerId && profilesById[tournament.winnerId]?.displayName) ||
      (finalMatch?.winnerId === finalMatch?.player1Id ? finalMatch?.player1Name : finalMatch?.player2Name) ||
      '-',
    runnerUp:
      (tournament.runnerUpId && profilesById[tournament.runnerUpId]?.displayName) ||
      (finalMatch
        ? finalMatch.winnerId === finalMatch.player1Id
          ? finalMatch.player2Name
          : finalMatch.player1Name
        : '') ||
      '-',
    thirdPlace:
      (tournament.thirdPlaceId && profilesById[tournament.thirdPlaceId]?.displayName) ||
      (thirdPlaceMatch?.winnerId === thirdPlaceMatch?.player1Id
        ? thirdPlaceMatch?.player1Name
        : thirdPlaceMatch?.player2Name) ||
      '-',
  };
};

export default function Tournaments() {
  const { userProfile, theme, language } = useAuth();
  const t = useTranslation(language);
  const ui = copy[language];
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [comments, setComments] = useState<TournamentMatchComment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [myScore, setMyScore] = useState('');
  const [opponentScore, setOpponentScore] = useState('');
  const [busy, setBusy] = useState(false);

  const loadTournaments = async () => {
    setTournaments(await listTournaments());
  };

  const loadProfiles = async () => {
    const profiles = await listProfiles();
    const nextProfilesById = profiles.reduce<Record<string, UserProfile>>((accumulator, profile) => {
      accumulator[profile.uid] = profile;
      return accumulator;
    }, {});

    if (userProfile) {
      nextProfilesById[userProfile.uid] = userProfile;
    }

    setProfilesById(nextProfilesById);
  };

  useEffect(() => {
    const refresh = async () => {
      try {
        await Promise.all([loadTournaments(), loadProfiles()]);
      } catch (error) {
        console.error('Failed to load tournaments', error);
      } finally {
        setLoading(false);
      }
    };

    void refresh();

    const stopTournaments = subscribeToTable('tournaments', () => {
      void loadTournaments();
    });
    const stopProfiles = subscribeToTable('profiles', () => {
      void loadProfiles();
    });

    return () => {
      stopTournaments();
      stopProfiles();
    };
  }, [userProfile]);

  const featuredTournament = useMemo(
    () =>
      tournaments.find((tournament) => tournament.status === 'registration' || tournament.status === 'ongoing') ||
      tournaments[0] ||
      null,
    [tournaments],
  );

  const pastTournaments = useMemo(() => {
    if (!featuredTournament) {
      return tournaments;
    }

    return tournaments.filter((tournament) => tournament.id !== featuredTournament.id);
  }, [featuredTournament, tournaments]);

  const canManageTournament = Boolean(userProfile?.isRoot);

  const selectedMatch = useMemo(() => {
    if (!featuredTournament) {
      return null;
    }

    return (
      featuredTournament.bracket.matches.find((match) => match.id === selectedMatchId) ||
      featuredTournament.bracket.matches.find(
        (match) => userProfile && (match.player1Id === userProfile.uid || match.player2Id === userProfile.uid),
      ) ||
      featuredTournament.bracket.matches[0] ||
      null
    );
  }, [featuredTournament, selectedMatchId, userProfile]);

  useEffect(() => {
    if (!selectedMatch) {
      setComments([]);
      setCommentBody('');
      return;
    }

    setSelectedMatchId(selectedMatch.id);
  }, [selectedMatch?.id]);

  useEffect(() => {
    const loadComments = async () => {
      if (!featuredTournament || !selectedMatch) {
        return;
      }

      if (selectedMatch.status !== 'completed' && selectedMatch.status !== 'walkover') {
        setComments([]);
        return;
      }

      try {
        setComments(await listTournamentMatchComments(featuredTournament.id, selectedMatch.id));
      } catch (error) {
        console.error('Failed to load tournament comments', error);
      }
    };

    void loadComments();
    const intervalId = window.setInterval(() => {
      void loadComments();
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [featuredTournament?.id, selectedMatch?.id, selectedMatch?.status]);

  const participantProfiles = featuredTournament
    ? featuredTournament.participants
        .map((participantId) => profilesById[participantId])
        .filter((profile): profile is UserProfile => Boolean(profile))
    : [];

  const selectedMatchIsMine = Boolean(
    userProfile && selectedMatch && (selectedMatch.player1Id === userProfile.uid || selectedMatch.player2Id === userProfile.uid),
  );

  const getTournamentStatusLabel = (status: Tournament['status']) => {
    if (status === 'registration') return t('play.registrationOpen');
    if (status === 'ongoing') return t('match.status.ongoing');
    if (status === 'cancelled') return ui.tournamentCancelled;
    return t('match.status.completed');
  };

  const resetMatchInputs = () => {
    setMyScore('');
    setOpponentScore('');
  };

  const replaceTournament = (nextTournament: Tournament) => {
    setTournaments((current) => upsertTournament(current, nextTournament));
  };

  const handleCreateTournament = async () => {
    setBusy(true);
    try {
      const created = await createTournament();
      replaceTournament(created);
      alert(ui.createSuccess);
    } catch (error) {
      console.error('Error creating tournament', error);
      alert(getReadableErrorMessage(error, ui.createTournament));
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (tournamentId: string) => {
    setBusy(true);
    try {
      const updated = await registerForTournament(tournamentId);
      replaceTournament(updated);
      alert(t('play.registerSuccess'));
    } catch (error) {
      console.error('Error registering', error);
      alert(getReadableErrorMessage(error, t('play.registerFailed')));
    } finally {
      setBusy(false);
    }
  };

  const handleStartTournament = async (tournament: Tournament) => {
    if (!window.confirm(ui.startConfirm)) return;

    const readyParticipants = tournament.participants
      .map((participantId) => profilesById[participantId])
      .filter((profile): profile is UserProfile => Boolean(profile));

    if (readyParticipants.length !== tournament.participants.length) {
      alert(ui.noProfileForBracket);
      return;
    }

    setBusy(true);
    try {
      const generated = createTournamentBracket(tournament, readyParticipants);
      const updated = await startTournament(
        tournament.id,
        generated.bracket,
        sortTournamentTimeline([...generated.timeline, ...tournament.timeline]),
      );
      replaceTournament(updated);
      resetMatchInputs();
      alert(ui.startSuccess);
    } catch (error) {
      console.error('Error starting tournament', error);
      alert(getReadableErrorMessage(error, ui.startTournament));
    } finally {
      setBusy(false);
    }
  };

  const handleCancelTournament = async (tournament: Tournament) => {
    if (!window.confirm(ui.cancelConfirm)) return;

    setBusy(true);
    try {
      const updated = await cancelTournament(tournament.id);
      replaceTournament(updated);
      alert(ui.cancelSuccess);
    } catch (error) {
      console.error('Error cancelling tournament', error);
      alert(getReadableErrorMessage(error, ui.cancelTournament));
    } finally {
      setBusy(false);
    }
  };

  const handleEmergencySettlement = async (tournament: Tournament) => {
    if (!window.confirm(t('play.endTournamentConfirm'))) return;

    setBusy(true);
    try {
      const updated = await endTournament(tournament.id);
      replaceTournament(updated);
      alert(t('play.endTournamentSuccess'));
    } catch (error) {
      console.error('Error ending tournament', error);
      alert(getReadableErrorMessage(error, t('play.endTournamentFailed')));
    } finally {
      setBusy(false);
    }
  };

  const persistBracketUpdate = async (
    tournament: Tournament,
    match: TournamentBracketMatch,
    nextBracket: Tournament['bracket'],
    nextTimeline: Tournament['timeline'],
  ) => {
    const finalized = getFinalizedTournamentState(nextBracket);
    const completionTimeline = finalized.status === 'completed' ? createCompletionTimeline(tournament, nextBracket) : [];
    const updated = await saveTournamentProgress({
      tournamentId: tournament.id,
      matchId: match.id,
      bracket: nextBracket,
      timeline: sortTournamentTimeline([...completionTimeline, ...nextTimeline]),
      status: finalized.status,
      winnerId: finalized.winnerId,
      runnerUpId: finalized.runnerUpId,
      thirdPlaceId: finalized.thirdPlaceId,
    });
    replaceTournament(updated);
    return updated;
  };

  const handleSubmitTournamentScore = async () => {
    if (!featuredTournament || !selectedMatch || !userProfile) return;

    const myValue = Number(myScore);
    const opponentValue = Number(opponentScore);
    if (!Number.isFinite(myValue) || !Number.isFinite(opponentValue)) {
      alert(ui.noScoreTie);
      return;
    }

    setBusy(true);
    try {
      const result = submitTournamentMatchScore(
        featuredTournament,
        featuredTournament.bracket,
        selectedMatch.id,
        userProfile.uid,
        myValue,
        opponentValue,
      );

      await persistBracketUpdate(
        featuredTournament,
        selectedMatch,
        result.bracket,
        [...result.timeline, ...featuredTournament.timeline],
      );

      resetMatchInputs();
      alert(result.result === 'waiting' ? ui.submitWaiting : result.result === 'reset' ? ui.submitReset : ui.submitCompleted);
    } catch (error) {
      console.error('Error submitting tournament score', error);
      alert(getReadableErrorMessage(error, ui.noScoreTie));
    } finally {
      setBusy(false);
    }
  };

  const handleForfeitMatch = async () => {
    if (!featuredTournament || !selectedMatch || !userProfile) return;
    if (!window.confirm(ui.forfeitConfirm)) return;

    setBusy(true);
    try {
      const result = forfeitTournamentMatch(featuredTournament, featuredTournament.bracket, selectedMatch.id, userProfile.uid);
      await persistBracketUpdate(
        featuredTournament,
        selectedMatch,
        result.bracket,
        [...result.timeline, ...featuredTournament.timeline],
      );
      resetMatchInputs();
    } catch (error) {
      console.error('Error forfeiting tournament match', error);
      alert(getReadableErrorMessage(error, ui.forfeit));
    } finally {
      setBusy(false);
    }
  };

  const handleCreateComment = async () => {
    if (!featuredTournament || !selectedMatch || !commentBody.trim()) return;

    setBusy(true);
    try {
      const created = await createTournamentMatchComment(featuredTournament.id, selectedMatch.id, commentBody.trim());
      setComments((current) => [...current, created]);
      setCommentBody('');
      alert(ui.commentSuccess);
    } catch (error) {
      console.error('Error posting comment', error);
      alert(getReadableErrorMessage(error, ui.commentsLocked));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-zinc-500 font-medium">{t('play.loadingTournaments')}</div>;
  }

  if (!featuredTournament) {
    return (
      <div className="space-y-6">
        <div className={clsx('border rounded-3xl p-8 text-center', theme === 'dark' ? 'bg-zinc-900/30 border-white/5' : 'bg-white border-zinc-200 shadow-sm')}>
          <p className="text-zinc-500 font-medium mb-4">{ui.noTournamentYet}</p>
          {canManageTournament ? (
            <button
              onClick={() => void handleCreateTournament()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 px-6 py-3 font-bold transition-colors"
            >
              <PlayCircle className="w-4 h-4" /> {ui.createTournament}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const podium = getPodiumName(featuredTournament, profilesById);

  return (
    <div className="space-y-8">
      <section>
        <h2 className={clsx('text-lg font-bold mb-4', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
          {t('play.thisWeek')}
        </h2>

        <div className={clsx('border rounded-3xl p-6 relative overflow-hidden', theme === 'dark' ? 'bg-gradient-to-br from-amber-500/15 to-zinc-900/70 border-amber-500/25' : 'bg-gradient-to-br from-amber-50 to-white border-amber-200 shadow-sm')}>
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <TrophyIcon className="w-32 h-32 text-amber-500" />
          </div>

          <div className="relative z-10 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className={clsx('inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4', theme === 'dark' ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700')}>
                  {getTournamentStatusLabel(featuredTournament.status)}
                  {canManageTournament ? <span className="rounded-full bg-black/10 px-2 py-0.5">{ui.rootBadge}</span> : null}
                </div>
                <h3 className={clsx('text-2xl font-black mb-2', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                  {featuredTournament.name || t('play.weeklyChampionship')}
                </h3>
                <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500 font-medium">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(featuredTournament.startDate), 'MMM d')} - {format(new Date(featuredTournament.endDate), 'MMM d')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {featuredTournament.participants.length} {ui.participants}
                  </div>
                  <div className="flex items-center gap-1 text-emerald-500">
                    <Shield className="w-4 h-4" /> {ui.startedByRoot}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 justify-end">
                {featuredTournament.status === 'registration' ? (
                  <button
                    onClick={() => void handleRegister(featuredTournament.id)}
                    disabled={busy || featuredTournament.participants.includes(userProfile?.uid || '')}
                    className="bg-amber-500 hover:bg-amber-400 text-zinc-950 px-8 py-3 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {featuredTournament.participants.includes(userProfile?.uid || '') ? t('play.registered') : t('play.joinTournament')}
                  </button>
                ) : null}

                {canManageTournament ? (
                  <>
                    {featuredTournament.status === 'registration' ? (
                      <button
                        onClick={() => void handleStartTournament(featuredTournament)}
                        disabled={busy || featuredTournament.participants.length < 4}
                        className="px-6 py-3 rounded-xl font-bold transition-colors bg-emerald-500 hover:bg-emerald-400 text-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {ui.startTournament}
                      </button>
                    ) : null}

                    {featuredTournament.status !== 'completed' && featuredTournament.status !== 'cancelled' ? (
                      <button
                        onClick={() => void handleCancelTournament(featuredTournament)}
                        disabled={busy}
                        className={clsx('px-6 py-3 rounded-xl font-bold transition-colors border', theme === 'dark' ? 'bg-zinc-900 border-white/10 text-white hover:bg-zinc-800' : 'bg-white border-zinc-200 text-zinc-900 hover:bg-zinc-50')}
                      >
                        {ui.cancelTournament}
                      </button>
                    ) : null}

                    {featuredTournament.status === 'ongoing' ? (
                      <button
                        onClick={() => void handleEmergencySettlement(featuredTournament)}
                        disabled={busy}
                        className={clsx('px-6 py-3 rounded-xl font-bold transition-colors border', theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700 text-white border-white/10' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-900 border-zinc-200')}
                      >
                        {ui.forceSettle}
                      </button>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>

            <div className={clsx('rounded-2xl border p-4 text-sm font-medium', theme === 'dark' ? 'bg-zinc-950/50 border-white/5 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-600')}>
              <div>{ui.minPlayersHint}</div>
              <div className="mt-1">{ui.rootOnly}</div>
              <div className="mt-1">{ui.registrationClosed}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_360px]">
        <div className={clsx('border rounded-3xl p-5 md:p-6', theme === 'dark' ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-zinc-200 shadow-sm')}>
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h2 className={clsx('text-lg font-bold', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                {ui.bracketTitle}
              </h2>
              <p className={clsx('text-sm font-medium mt-1', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
                {featuredTournament.status === 'registration' ? ui.noBracket : ui.waitingForSelection}
              </p>
            </div>
          </div>

          {featuredTournament.status === 'registration' ? (
            <div className={clsx('rounded-2xl border p-6 text-center', theme === 'dark' ? 'bg-zinc-950/60 border-white/5' : 'bg-zinc-50 border-zinc-200')}>
              <p className="text-zinc-500 font-medium">{ui.noBracket}</p>
            </div>
          ) : featuredTournament.status === 'cancelled' ? (
            <div className={clsx('rounded-2xl border p-6 text-center', theme === 'dark' ? 'bg-zinc-950/60 border-white/5' : 'bg-zinc-50 border-zinc-200')}>
              <p className="text-zinc-500 font-medium">{ui.tournamentCancelled}</p>
            </div>
          ) : (
            <TournamentBracket
              matches={featuredTournament.bracket.matches}
              selectedMatchId={selectedMatch?.id ?? null}
              currentUserId={userProfile?.uid ?? null}
              theme={theme}
              language={language}
              onSelectMatch={(match) => setSelectedMatchId(match.id)}
            />
          )}
        </div>

        <div className="space-y-6">
          <div className={clsx('border rounded-3xl p-5', theme === 'dark' ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-zinc-200 shadow-sm')}>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-amber-500" />
              <h2 className={clsx('text-lg font-bold', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                {ui.registeredListTitle}
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {participantProfiles.map((profile) => (
                <div
                  key={profile.uid}
                  className={clsx('inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold', theme === 'dark' ? 'bg-zinc-950/70 border-white/5 text-zinc-200' : 'bg-zinc-50 border-zinc-200 text-zinc-700')}
                >
                  <img
                    src={profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName)}&background=random`}
                    alt={profile.displayName}
                    className="w-6 h-6 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                  <span>{profile.displayName}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={clsx('border rounded-3xl p-5', theme === 'dark' ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-zinc-200 shadow-sm')}>
            <div className="flex items-center gap-2 mb-4">
              <TrophyIcon className="w-5 h-5 text-amber-500" />
              <h2 className={clsx('text-lg font-bold', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                {ui.podium}
              </h2>
            </div>
            <div className="space-y-3">
              {[
                { label: ui.champion, value: podium.champion },
                { label: ui.runnerUp, value: podium.runnerUp },
                { label: ui.thirdPlace, value: podium.thirdPlace },
              ].map((row) => (
                <div
                  key={row.label}
                  className={clsx('rounded-2xl border px-4 py-3 flex items-center justify-between gap-4', theme === 'dark' ? 'bg-zinc-950/70 border-white/5' : 'bg-zinc-50 border-zinc-200')}
                >
                  <span className={clsx('text-sm font-bold uppercase tracking-[0.14em]', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
                    {row.label}
                  </span>
                  <span className={clsx('font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className={clsx('border rounded-3xl p-5', theme === 'dark' ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-zinc-200 shadow-sm')}>
          <div className="flex items-center gap-2 mb-4">
            <Flag className="w-5 h-5 text-emerald-500" />
            <h2 className={clsx('text-lg font-bold', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
              {ui.matchDesk}
            </h2>
          </div>

          {selectedMatch ? (
            <div className="space-y-4">
              <div className={clsx('rounded-2xl border p-4', theme === 'dark' ? 'bg-zinc-950/70 border-white/5' : 'bg-zinc-50 border-zinc-200')}>
                <div className={clsx('text-sm font-black mb-3', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                  {selectedMatch.label}
                </div>
                <div className="space-y-2">
                  {[1, 2].map((slot) => {
                    const label = slot === 1 ? selectedMatch.player1Name || selectedMatch.player1Source || '-' : selectedMatch.player2Name || selectedMatch.player2Source || '-';
                    const score = slot === 1 ? selectedMatch.player1Score : selectedMatch.player2Score;
                    const isWinner = selectedMatch.winnerId && (slot === 1 ? selectedMatch.player1Id : selectedMatch.player2Id) === selectedMatch.winnerId;
                    return (
                      <div key={slot} className={clsx('rounded-2xl px-4 py-3 flex items-center justify-between gap-4', theme === 'dark' ? 'bg-zinc-900 border border-white/5' : 'bg-white border border-zinc-200')}>
                        <span className={clsx('font-bold', isWinner ? 'text-emerald-500' : theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                          {label}
                        </span>
                        <span className={clsx('text-xl font-black', theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700')}>
                          {typeof score === 'number' ? score : '-'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedMatchIsMine && featuredTournament.status === 'ongoing' && (selectedMatch.status === 'ready' || selectedMatch.status === 'waiting_confirmation') ? (
                <div className="space-y-4">
                  <div>
                    <div className={clsx('text-sm font-bold mb-2', theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700')}>
                      {ui.scoreLine}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        min="0"
                        max={selectedMatch.bestOf === 3 ? '2' : '1'}
                        value={myScore}
                        onChange={(event) => setMyScore(event.target.value)}
                        className={clsx('rounded-2xl border px-4 py-4 text-center text-2xl font-black focus:outline-none focus:ring-2 focus:ring-emerald-500/40', theme === 'dark' ? 'bg-zinc-950 border-white/10 text-white' : 'bg-white border-zinc-200 text-zinc-900')}
                      />
                      <input
                        type="number"
                        min="0"
                        max={selectedMatch.bestOf === 3 ? '2' : '1'}
                        value={opponentScore}
                        onChange={(event) => setOpponentScore(event.target.value)}
                        className={clsx('rounded-2xl border px-4 py-4 text-center text-2xl font-black focus:outline-none focus:ring-2 focus:ring-emerald-500/40', theme === 'dark' ? 'bg-zinc-950 border-white/10 text-white' : 'bg-white border-zinc-200 text-zinc-900')}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => void handleSubmitTournamentScore()}
                      disabled={busy}
                      className="rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 py-4 font-bold transition-colors disabled:opacity-50"
                    >
                      {ui.submitScore}
                    </button>
                    <button
                      onClick={() => void handleForfeitMatch()}
                      disabled={busy}
                      className={clsx('rounded-2xl py-4 font-bold transition-colors border disabled:opacity-50', theme === 'dark' ? 'bg-zinc-950 border-white/10 text-white hover:bg-zinc-900' : 'bg-white border-zinc-200 text-zinc-900 hover:bg-zinc-50')}
                    >
                      {ui.forfeit}
                    </button>
                  </div>
                </div>
              ) : (
                <div className={clsx('rounded-2xl border p-4 text-sm font-medium', theme === 'dark' ? 'bg-zinc-950/60 border-white/5 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-500')}>
                  {ui.awaitingAction}
                </div>
              )}
            </div>
          ) : (
            <div className="text-zinc-500 font-medium">{ui.waitingForSelection}</div>
          )}
        </div>

        <div className={clsx('border rounded-3xl p-5', theme === 'dark' ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-zinc-200 shadow-sm')}>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-sky-500" />
            <h2 className={clsx('text-lg font-bold', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
              {ui.matchComments}
            </h2>
          </div>

          {selectedMatch && (selectedMatch.status === 'completed' || selectedMatch.status === 'walkover') ? (
            <div className="space-y-4">
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {comments.length > 0 ? (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className={clsx('rounded-2xl border px-4 py-3', theme === 'dark' ? 'bg-zinc-950/70 border-white/5' : 'bg-zinc-50 border-zinc-200')}
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className={clsx('font-bold', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                          {comment.authorName}
                        </div>
                        <div className="text-xs text-zinc-500 font-medium">
                          {format(new Date(comment.createdAt), 'MMM d, HH:mm')}
                        </div>
                      </div>
                      <div className={clsx('text-sm leading-6', theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700')}>
                        {comment.body}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-zinc-500 font-medium">{ui.noComments}</div>
                )}
              </div>

              <div className="space-y-3">
                <textarea
                  value={commentBody}
                  onChange={(event) => setCommentBody(event.target.value)}
                  placeholder={ui.commentPlaceholder}
                  rows={4}
                  className={clsx('w-full rounded-2xl border px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/30', theme === 'dark' ? 'bg-zinc-950 border-white/10 text-white placeholder:text-zinc-600' : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400')}
                />
                <button
                  onClick={() => void handleCreateComment()}
                  disabled={busy || !commentBody.trim()}
                  className="rounded-2xl bg-sky-500 hover:bg-sky-400 text-zinc-950 px-5 py-3 font-bold transition-colors disabled:opacity-50"
                >
                  {ui.postComment}
                </button>
              </div>
            </div>
          ) : (
            <div className={clsx('rounded-2xl border p-4 text-sm font-medium', theme === 'dark' ? 'bg-zinc-950/60 border-white/5 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-500')}>
              {ui.commentsLocked}
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className={clsx('text-lg font-bold mb-4', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
          {t('play.pastTournaments')}
        </h2>
        <div className="space-y-3">
          {pastTournaments.map((tournament) => (
            <div
              key={tournament.id}
              className={clsx('border rounded-2xl p-4 flex items-center justify-between transition-colors', theme === 'dark' ? 'bg-zinc-900/30 border-white/5 hover:bg-zinc-800/30' : 'bg-white border-zinc-200 hover:bg-zinc-50 shadow-sm')}
            >
              <div>
                <div className={clsx('font-bold', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                  {t('play.weekOf')} {format(new Date(tournament.startDate), 'MMM d, yyyy')}
                </div>
                <div className="text-xs text-zinc-500 font-medium mt-1">
                  {tournament.participants.length} {t('play.participants')} - {getTournamentStatusLabel(tournament.status)}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-400" />
            </div>
          ))}
          {pastTournaments.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 font-medium">{t('play.noPastTournaments')}</div>
          ) : null}
        </div>
      </section>

      {canManageTournament && !tournaments.some((tournament) => tournament.status === 'registration' || tournament.status === 'ongoing') ? (
        <div className="flex justify-end">
          <button
            onClick={() => void handleCreateTournament()}
            disabled={busy}
            className="rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 px-6 py-3 font-bold transition-colors disabled:opacity-50"
          >
            {ui.createTournament}
          </button>
        </div>
      ) : null}
    </div>
  );
}

