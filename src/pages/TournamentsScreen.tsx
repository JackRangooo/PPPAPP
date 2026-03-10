import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  Calendar,
  ChevronRight,
  MessageSquare,
  Shield,
  Sparkles,
  Trophy as TrophyIcon,
  Users,
} from 'lucide-react';
import clsx from 'clsx';

import { useAuth } from '../App';
import TournamentBracketDialog from '../components/TournamentBracketDialog';
import TournamentMatchDesk from '../components/TournamentMatchDesk';
import TournamentPodium from '../components/TournamentPodium';
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
  setTournamentMatchReady,
  sortTournamentTimeline,
  submitTournamentMatchScore,
} from '../lib/tournamentBracket';
import { buildTournamentPreviewCard, getTournamentPodiumData, upsertTournament } from '../lib/tournamentPresentation';
import { subscribeToTable } from '../lib/supabase';
import type { Tournament, TournamentBracketMatch, TournamentMatchComment, UserProfile } from '../types';
import { useTranslation } from '../i18n';

type TournamentLane = 'registration' | 'ongoing' | 'preview';

const copy = {
  en: {
    hub: 'Ranked Tournament Hub',
    registrationTab: 'Registration',
    ongoingTab: 'Ongoing',
    previewTab: 'Upcoming',
    createTournament: 'Publish Admin Tournament',
    createTournamentBlocked: 'One admin tournament can stay active at a time.',
    startTournament: 'Generate Bracket',
    cancelTournament: 'Cancel Tournament',
    forceSettle: 'Force Settle',
    noRegistration: 'No tournaments are collecting signups right now.',
    noOngoing: 'No tournaments are live right now.',
    previewTitle: 'Next Week System Cup',
    previewDescription: 'Preview of the next system tournament lane.',
    systemSource: 'System',
    adminSource: 'Admin',
    viewBracket: 'View Bracket',
    bracketTitle: 'Live Bracket',
    closeBracket: 'Close Bracket',
    bracketHint: 'Bracket opens in a horizontal viewer once the event begins.',
    rootOnly: 'Root admin controls publish / bracket generation / cancel / emergency settlement.',
    participants: 'Players',
    registeredListTitle: 'Registered Players',
    matchComments: 'Match Comments',
    commentPlaceholder: 'Leave a comment after the match...',
    postComment: 'Post Comment',
    noComments: 'No comments yet.',
    commentsLocked: 'Comments open after the match is finished.',
    noBracket: 'Generate the bracket once registration is complete.',
    tournamentCancelled: 'This tournament was cancelled.',
    matchAlert: 'Your next tournament set is ready.',
    matchAlertSubtitle: 'Use the same ready + score verification flow as a casual match.',
    minPlayersHint: 'Need at least 4 players and at most 8 players.',
    registrationClosed: 'Registration closes once the bracket is generated.',
    createSuccess: 'Tournament created.',
    startSuccess: 'Bracket generated.',
    cancelSuccess: 'Tournament cancelled.',
    commentSuccess: 'Comment posted.',
    readyPending: 'You are marked ready. Waiting for your opponent.',
    readyOngoing: 'Both players are ready. Match desk is now live.',
    submitWaiting: 'Result saved. Waiting for your opponent to confirm.',
    submitReset: 'The two submissions did not match, so this result was reset.',
    submitCompleted: 'Match result confirmed and bracket updated.',
    forfeitConfirm: 'Forfeit this match and send your opponent forward?',
    cancelConfirm: 'Cancel this tournament? This cannot be undone.',
    startConfirm: 'Generate the bracket and lock registration?',
    noProfileForBracket: 'Some participant profiles are still missing. Refresh and try again.',
    noScoreTie: 'Enter a valid BO result. BO1 should be 1:0, BO3 should be 2:0 or 2:1.',
  },
  zh: {
    hub: '排位赛事大厅',
    registrationTab: '报名中',
    ongoingTab: '开展中',
    previewTab: '未开始',
    createTournament: '发布管理员赛事',
    createTournamentBlocked: '同一时间只保留一个管理员赛事。',
    startTournament: '生成对阵表',
    cancelTournament: '取消锦标赛',
    forceSettle: '强制结算',
    noRegistration: '当前没有正在报名的赛事。',
    noOngoing: '当前没有正在进行的赛事。',
    previewTitle: '下周系统赛预览',
    previewDescription: '这里展示下一周系统赛事的预览卡。',
    systemSource: '系统发布',
    adminSource: '管理员发布',
    viewBracket: '查看对阵表',
    bracketTitle: '实时对阵表',
    closeBracket: '关闭对阵表',
    bracketHint: '开赛后，对阵表会以横向模式展开查看。',
    rootOnly: '发布 / 生成对阵 / 取消 / 紧急结算由 root 管理员控制。',
    participants: '球员',
    registeredListTitle: '已报名球员',
    matchComments: '比赛评论',
    commentPlaceholder: '比赛结束后在这里留言...',
    postComment: '发布评论',
    noComments: '还没有评论。',
    commentsLocked: '比赛结束后才能评论。',
    noBracket: '报名完成后，由管理员生成正式对阵表。',
    tournamentCancelled: '这场锦标赛已取消。',
    matchAlert: '你的下一场锦标赛已经排好。',
    matchAlertSubtitle: '当前比赛会按娱乐赛的逻辑走准备就绪和比分核验流程。',
    minPlayersHint: '至少 4 人、最多 8 人后才能正式开赛。',
    registrationClosed: '正式生成对阵后将停止报名。',
    createSuccess: '锦标赛已创建。',
    startSuccess: '对阵表已生成。',
    cancelSuccess: '锦标赛已取消。',
    commentSuccess: '评论已发布。',
    readyPending: '你已准备就绪，等待对手确认。',
    readyOngoing: '双方都已就绪，可以开始比赛并按娱乐赛流程核验比分。',
    submitWaiting: '赛果已提交，等待对手确认。',
    submitReset: '双方提交不一致，本场结果已重置。',
    submitCompleted: '赛果已确认，对阵表已更新。',
    forfeitConfirm: '确认退赛并让对手直接晋级吗？',
    cancelConfirm: '确认取消这场锦标赛吗？此操作无法撤销。',
    startConfirm: '确认生成对阵表并锁定报名吗？',
    noProfileForBracket: '部分参赛者资料还没同步到前端，请刷新后重试。',
    noScoreTie: '请输入合法赛果。BO1 用 1:0，BO3 用 2:0 或 2:1。',
  },
} as const;

export default function TournamentsScreen() {
  const { userProfile, theme, language } = useAuth();
  const t = useTranslation(language);
  const ui = copy[language];
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, UserProfile>>({});
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [comments, setComments] = useState<TournamentMatchComment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [myScore, setMyScore] = useState('');
  const [opponentScore, setOpponentScore] = useState('');
  const [lane, setLane] = useState<TournamentLane>('registration');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [bracketOpen, setBracketOpen] = useState(false);

  useEffect(() => {
    const refresh = async () => {
      const [nextTournaments, profiles] = await Promise.all([listTournaments(), listProfiles()]);
      const nextProfiles = profiles.reduce<Record<string, UserProfile>>((accumulator, profile) => {
        accumulator[profile.uid] = profile;
        return accumulator;
      }, {});
      if (userProfile) nextProfiles[userProfile.uid] = userProfile;
      setTournaments(nextTournaments);
      setProfilesById(nextProfiles);
    };

    void refresh().finally(() => setLoading(false));
    const stopTournaments = subscribeToTable('tournaments', () => void refresh());
    const stopProfiles = subscribeToTable('profiles', () => void refresh());
    return () => {
      stopTournaments();
      stopProfiles();
    };
  }, [userProfile]);

  const registrationTournaments = useMemo(() => tournaments.filter((tournament) => tournament.status === 'registration'), [tournaments]);
  const ongoingTournaments = useMemo(() => tournaments.filter((tournament) => tournament.status === 'ongoing'), [tournaments]);
  const activeTournaments = useMemo(() => tournaments.filter((tournament) => tournament.status === 'registration' || tournament.status === 'ongoing'), [tournaments]);
  const pastTournaments = useMemo(() => tournaments.filter((tournament) => tournament.status === 'completed' || tournament.status === 'cancelled'), [tournaments]);
  const visibleTournaments = lane === 'registration' ? registrationTournaments : lane === 'ongoing' ? ongoingTournaments : [];
  const featuredTournament = lane === 'preview'
    ? null
    : visibleTournaments.find((tournament) => tournament.id === selectedTournamentId) ?? visibleTournaments[0] ?? activeTournaments[0] ?? null;
  const selectedMatch = featuredTournament?.bracket.matches.find((match) => match.id === selectedMatchId) ?? featuredTournament?.bracket.matches.find((match) => userProfile && (match.player1Id === userProfile.uid || match.player2Id === userProfile.uid)) ?? featuredTournament?.bracket.matches[0] ?? null;
  const myActiveMatch = featuredTournament?.bracket.matches.find((match) => userProfile && (match.player1Id === userProfile.uid || match.player2Id === userProfile.uid) && (match.status === 'pending' || match.status === 'ongoing' || match.status === 'waiting_confirmation')) ?? null;
  const deskMatch = myActiveMatch ?? selectedMatch;
  const previewCard = useMemo(() => buildTournamentPreviewCard(ui.previewTitle, ui.previewDescription), [ui.previewDescription, ui.previewTitle]);
  const canManageTournament = Boolean(userProfile?.isRoot);
  const hasActiveAdminTournament = activeTournaments.some((tournament) => tournament.source === 'admin');

  useEffect(() => {
    if (lane !== 'preview') {
      setSelectedTournamentId((current) => visibleTournaments.find((tournament) => tournament.id === current)?.id ?? visibleTournaments[0]?.id ?? activeTournaments[0]?.id ?? null);
    }
  }, [activeTournaments, lane, visibleTournaments]);

  useEffect(() => {
    if (!featuredTournament || !selectedMatch || (selectedMatch.status !== 'completed' && selectedMatch.status !== 'walkover')) {
      setComments([]);
      return;
    }

    const loadComments = async () => {
      setComments(await listTournamentMatchComments(featuredTournament.id, selectedMatch.id));
    };

    void loadComments();
  }, [featuredTournament, selectedMatch]);

  const replaceTournament = (nextTournament: Tournament) => setTournaments((current) => upsertTournament(current, nextTournament));
  const persistBracketUpdate = async (tournament: Tournament, match: TournamentBracketMatch, nextBracket: Tournament['bracket'], nextTimeline: Tournament['timeline']) => {
    const finalized = getFinalizedTournamentState(nextBracket);
    const completionTimeline = finalized.status === 'completed' ? createCompletionTimeline(tournament, nextBracket) : [];
    return saveTournamentProgress({
      tournamentId: tournament.id,
      matchId: match.id,
      bracket: nextBracket,
      timeline: sortTournamentTimeline([...completionTimeline, ...nextTimeline]),
      status: finalized.status,
      winnerId: finalized.winnerId,
      runnerUpId: finalized.runnerUpId,
      thirdPlaceId: finalized.thirdPlaceId,
    });
  };

  const handleStartTournament = async (tournament: Tournament) => {
    const participants = tournament.participants.map((id) => profilesById[id]).filter((profile): profile is UserProfile => Boolean(profile));
    if (participants.length !== tournament.participants.length) return window.alert(ui.noProfileForBracket);
    const generated = createTournamentBracket(tournament, participants);
    const updated = await startTournament(tournament.id, generated.bracket, sortTournamentTimeline([...generated.timeline, ...tournament.timeline]));
    replaceTournament(updated);
    setBracketOpen(true);
    setLane('ongoing');
    window.alert(ui.startSuccess);
  };

  const handleDeskReady = async () => {
    if (!featuredTournament || !deskMatch || !userProfile) return;
    const result = setTournamentMatchReady(featuredTournament, featuredTournament.bracket, deskMatch.id, userProfile.uid);
    const updated = await persistBracketUpdate(featuredTournament, deskMatch, result.bracket, [...result.timeline, ...featuredTournament.timeline]);
    replaceTournament(updated);
    window.alert(result.result === 'ongoing' ? ui.readyOngoing : ui.readyPending);
  };

  const handleDeskSubmit = async () => {
    if (!featuredTournament || !deskMatch || !userProfile) return;
    const myValue = Number(myScore);
    const opponentValue = Number(opponentScore);
    if (!Number.isFinite(myValue) || !Number.isFinite(opponentValue)) return window.alert(ui.noScoreTie);
    const result = submitTournamentMatchScore(featuredTournament, featuredTournament.bracket, deskMatch.id, userProfile.uid, myValue, opponentValue);
    const updated = await persistBracketUpdate(featuredTournament, deskMatch, result.bracket, [...result.timeline, ...featuredTournament.timeline]);
    replaceTournament(updated);
    setMyScore('');
    setOpponentScore('');
    window.alert(result.result === 'waiting' ? ui.submitWaiting : result.result === 'reset' ? ui.submitReset : ui.submitCompleted);
  };

  const handleDeskForfeit = async () => {
    if (!featuredTournament || !deskMatch || !userProfile || !window.confirm(ui.forfeitConfirm)) return;
    const result = forfeitTournamentMatch(featuredTournament, featuredTournament.bracket, deskMatch.id, userProfile.uid);
    const updated = await persistBracketUpdate(featuredTournament, deskMatch, result.bracket, [...result.timeline, ...featuredTournament.timeline]);
    replaceTournament(updated);
    setMyScore('');
    setOpponentScore('');
  };

  if (loading) return <div className="py-12 text-center text-zinc-500 font-medium">{t('play.loadingTournaments')}</div>;

  const podium = featuredTournament ? getTournamentPodiumData(featuredTournament, profilesById) : { podiumEntries: [], standings: [] };

  return (
    <div className="space-y-8 pb-12">
      <section className={clsx('rounded-[2rem] border p-5 sm:p-6', theme === 'dark' ? 'bg-zinc-900/60 border-white/5' : 'bg-white border-zinc-200 shadow-sm')}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-amber-500"><Sparkles className="h-4 w-4" />{ui.hub}</div>
            <h2 className={clsx('mt-4 text-2xl font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>{ui.hub}</h2>
            <p className={clsx('mt-2 max-w-2xl text-sm leading-6', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600')}>{ui.rootOnly}</p>
          </div>
          {canManageTournament ? <button onClick={() => void createTournament().then((created) => { replaceTournament(created); setSelectedTournamentId(created.id); window.alert(ui.createSuccess); }).catch((error) => window.alert(getReadableErrorMessage(error, ui.createTournament)))} disabled={busy || hasActiveAdminTournament} className="rounded-2xl bg-amber-500 px-5 py-3 font-black text-zinc-950 transition-colors hover:bg-amber-400 disabled:opacity-60">{ui.createTournament}</button> : null}
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {([
            ['registration', ui.registrationTab, registrationTournaments.length],
            ['ongoing', ui.ongoingTab, ongoingTournaments.length],
            ['preview', ui.previewTab, 1],
          ] as const).map(([id, label, count]) => (
            <button key={id} onClick={() => setLane(id)} className={clsx('rounded-2xl border px-4 py-4 text-left transition-all', lane === id ? theme === 'dark' ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-emerald-300 bg-emerald-50' : theme === 'dark' ? 'border-white/6 bg-zinc-950/60' : 'border-zinc-200 bg-zinc-50')}>
              <div className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">{label}</div>
              <div className={clsx('mt-2 text-3xl font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>{count}</div>
            </button>
          ))}
        </div>
      </section>

      {lane === 'preview' ? (
        <div className={clsx('rounded-[2rem] border p-6', theme === 'dark' ? 'bg-zinc-900/55 border-white/5' : 'bg-white border-zinc-200 shadow-sm')}>
          <div className="inline-flex rounded-full bg-sky-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-sky-500">{ui.previewTab}</div>
          <h3 className={clsx('mt-4 text-2xl font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>{previewCard.title}</h3>
          <p className={clsx('mt-2 text-sm leading-6', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600')}>{previewCard.description}</p>
          <div className="mt-4 inline-flex rounded-full bg-amber-500/10 px-4 py-2 text-sm font-black text-amber-500">{format(previewCard.startDate, 'MMM d')} - {format(previewCard.endDate, 'MMM d')}</div>
        </div>
      ) : visibleTournaments.length === 0 ? (
        <div className={clsx('rounded-[2rem] border p-8 text-center text-sm font-medium', theme === 'dark' ? 'bg-zinc-900/45 border-white/5 text-zinc-500' : 'bg-white border-zinc-200 text-zinc-500 shadow-sm')}>{lane === 'registration' ? ui.noRegistration : ui.noOngoing}</div>
      ) : (
        <div className="space-y-6">
          {visibleTournaments.map((tournament) => <button key={tournament.id} type="button" onClick={() => setSelectedTournamentId(tournament.id)} className={clsx('w-full rounded-[1.8rem] border p-5 text-left transition-all', featuredTournament?.id === tournament.id ? theme === 'dark' ? 'bg-zinc-900/70 border-emerald-500/30 ring-2 ring-emerald-500/40' : 'bg-zinc-50 border-emerald-300 ring-2 ring-emerald-500/20' : theme === 'dark' ? 'bg-zinc-900/45 border-white/5 hover:bg-zinc-900/70' : 'bg-white border-zinc-200 hover:bg-zinc-50 shadow-sm')}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className={clsx('rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em]', tournament.source === 'admin' ? 'bg-sky-500/10 text-sky-500' : 'bg-emerald-500/10 text-emerald-500')}>{tournament.source === 'admin' ? ui.adminSource : ui.systemSource}</div>
                <div className={clsx('mt-3 text-xl font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>{tournament.name || t('play.weeklyChampionship')}</div>
              </div>
              <div className={clsx('inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold', theme === 'dark' ? 'bg-zinc-950 text-zinc-300' : 'bg-zinc-100 text-zinc-700')}><Users className="h-4 w-4" />{tournament.participants.length} {ui.participants}</div>
            </div>
          </button>)}

          {featuredTournament ? (
            <>
              <section className={clsx('rounded-[2.25rem] border p-6 relative overflow-hidden', theme === 'dark' ? 'bg-zinc-900/60 border-white/5' : 'bg-white border-zinc-200 shadow-sm')}>
                <div className="absolute right-0 top-0 p-6 opacity-10"><TrophyIcon className="h-32 w-32 text-amber-500" /></div>
                <div className="relative z-10 space-y-5">
                  <h3 className={clsx('text-3xl font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>{featuredTournament.name}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-zinc-500"><div className="inline-flex items-center gap-1"><Calendar className="h-4 w-4" />{format(new Date(featuredTournament.startDate), 'MMM d')} - {format(new Date(featuredTournament.endDate), 'MMM d')}</div><div className="inline-flex items-center gap-1"><Shield className="h-4 w-4" />{ui.bracketHint}</div></div>
                  <div className={clsx('rounded-2xl border p-4 text-sm font-medium', theme === 'dark' ? 'bg-zinc-950/50 border-white/5 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-600')}>{ui.minPlayersHint}<div className="mt-1">{ui.registrationClosed}</div></div>
                  <div className="flex flex-wrap gap-3">
                    {featuredTournament.status === 'registration' ? <button onClick={() => void registerForTournament(featuredTournament.id).then(replaceTournament)} disabled={busy || featuredTournament.participants.includes(userProfile?.uid || '')} className="rounded-xl bg-amber-500 px-8 py-3 font-bold text-zinc-950 transition-colors hover:bg-amber-400 disabled:opacity-50">{featuredTournament.participants.includes(userProfile?.uid || '') ? t('play.registered') : t('play.joinTournament')}</button> : null}
                    {featuredTournament.status !== 'registration' ? <button onClick={() => setBracketOpen(true)} className={clsx('rounded-xl border px-6 py-3 font-bold transition-colors', theme === 'dark' ? 'bg-zinc-950 border-white/10 text-white hover:bg-zinc-900' : 'bg-white border-zinc-200 text-zinc-900 hover:bg-zinc-50')}>{ui.viewBracket}</button> : null}
                    {canManageTournament && featuredTournament.status === 'registration' ? <button onClick={() => void handleStartTournament(featuredTournament)} className="rounded-xl bg-emerald-500 px-6 py-3 font-bold text-zinc-950 transition-colors hover:bg-emerald-400">{ui.startTournament}</button> : null}
                    {canManageTournament && featuredTournament.status !== 'completed' && featuredTournament.status !== 'cancelled' ? <button onClick={() => void cancelTournament(featuredTournament.id).then((updated) => { replaceTournament(updated); window.alert(ui.cancelSuccess); })} className={clsx('rounded-xl border px-6 py-3 font-bold transition-colors', theme === 'dark' ? 'bg-zinc-900 border-white/10 text-white hover:bg-zinc-800' : 'bg-white border-zinc-200 text-zinc-900 hover:bg-zinc-50')}>{ui.cancelTournament}</button> : null}
                    {canManageTournament && featuredTournament.status === 'ongoing' ? <button onClick={() => void endTournament(featuredTournament.id).then(replaceTournament)} className={clsx('rounded-xl border px-6 py-3 font-bold transition-colors', theme === 'dark' ? 'bg-zinc-800 border-white/10 text-white hover:bg-zinc-700' : 'bg-zinc-200 border-zinc-200 text-zinc-900 hover:bg-zinc-300')}>{ui.forceSettle}</button> : null}
                  </div>
                </div>
              </section>

              {myActiveMatch ? <section className={clsx('rounded-[2rem] border p-5', theme === 'dark' ? 'bg-zinc-900/55 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200 shadow-sm')}><div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-500">{ui.matchAlert}</div><div className={clsx('mt-2 text-sm leading-6', theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700')}>{ui.matchAlertSubtitle}</div></section> : null}

              <section className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className={clsx('rounded-[2rem] border p-5', theme === 'dark' ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-zinc-200 shadow-sm')}><div className="mb-4 flex items-center gap-2"><Users className="h-5 w-5 text-amber-500" /><h2 className={clsx('text-lg font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>{ui.registeredListTitle}</h2></div><div className="flex flex-wrap gap-2">{featuredTournament.participants.map((participantId) => { const profile = profilesById[participantId]; if (!profile) return null; return <div key={profile.uid} className={clsx('inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold', theme === 'dark' ? 'bg-zinc-950/70 border-white/5 text-zinc-200' : 'bg-zinc-50 border-zinc-200 text-zinc-700')}><img src={profile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName)}&background=random`} alt={profile.displayName} className="h-6 w-6 rounded-full object-cover" referrerPolicy="no-referrer" /><span>{profile.displayName}</span></div>; })}</div></div>
                <TournamentPodium theme={theme} language={language} entries={podium.podiumEntries} standings={podium.standings} />
              </section>

              <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <TournamentMatchDesk theme={theme} language={language} match={deskMatch} currentUserId={userProfile?.uid ?? null} myScore={myScore} opponentScore={opponentScore} busy={busy} onMyScoreChange={setMyScore} onOpponentScoreChange={setOpponentScore} onReady={() => void handleDeskReady()} onSubmitScore={() => void handleDeskSubmit()} onForfeit={() => void handleDeskForfeit()} />
                <div className={clsx('rounded-[2rem] border p-5', theme === 'dark' ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-zinc-200 shadow-sm')}><div className="mb-4 flex items-center gap-2"><MessageSquare className="h-5 w-5 text-sky-500" /><h2 className={clsx('text-lg font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>{ui.matchComments}</h2></div>{selectedMatch && (selectedMatch.status === 'completed' || selectedMatch.status === 'walkover') ? <div className="space-y-4"><div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">{comments.length > 0 ? comments.map((comment) => <div key={comment.id} className={clsx('rounded-2xl border px-4 py-3', theme === 'dark' ? 'bg-zinc-950/70 border-white/5' : 'bg-zinc-50 border-zinc-200')}><div className="mb-2 flex items-center justify-between gap-3"><div className={clsx('font-bold', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>{comment.authorName}</div><div className="text-xs font-medium text-zinc-500">{format(new Date(comment.createdAt), 'MMM d, HH:mm')}</div></div><div className={clsx('text-sm leading-6', theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700')}>{comment.body}</div></div>) : <div className="text-zinc-500 font-medium">{ui.noComments}</div>}</div><div className="space-y-3"><textarea value={commentBody} onChange={(event) => setCommentBody(event.target.value)} placeholder={ui.commentPlaceholder} rows={4} className={clsx('w-full resize-none rounded-2xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500/30', theme === 'dark' ? 'bg-zinc-950 border-white/10 text-white placeholder:text-zinc-600' : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400')} /><button onClick={() => void createTournamentMatchComment(featuredTournament.id, selectedMatch.id, commentBody.trim()).then((created) => { setComments((current) => [...current, created]); setCommentBody(''); window.alert(ui.commentSuccess); })} disabled={!commentBody.trim()} className="rounded-2xl bg-sky-500 px-5 py-3 font-bold text-zinc-950 transition-colors hover:bg-sky-400 disabled:opacity-50">{ui.postComment}</button></div></div> : <div className={clsx('rounded-2xl border p-4 text-sm font-medium', theme === 'dark' ? 'bg-zinc-950/60 border-white/5 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-500')}>{ui.commentsLocked}</div>}</div>
              </section>
            </>
          ) : null}
        </div>
      )}

      <section>
        <h2 className={clsx('mb-4 text-lg font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>{t('play.pastTournaments')}</h2>
        <div className="space-y-3">{pastTournaments.map((tournament) => <div key={tournament.id} className={clsx('flex items-center justify-between rounded-2xl border p-4 transition-colors', theme === 'dark' ? 'bg-zinc-900/30 border-white/5 hover:bg-zinc-800/30' : 'bg-white border-zinc-200 hover:bg-zinc-50 shadow-sm')}><div><div className={clsx('font-bold', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>{tournament.name}</div><div className="mt-1 text-xs font-medium text-zinc-500">{tournament.participants.length} {t('play.participants')}</div></div><ChevronRight className="h-5 w-5 text-zinc-400" /></div>)}</div>
      </section>

      <TournamentBracketDialog open={bracketOpen} theme={theme} language={language} tournament={featuredTournament} currentUserId={userProfile?.uid ?? null} selectedMatch={selectedMatch} emptyLabel={ui.noBracket} cancelledLabel={ui.tournamentCancelled} title={ui.bracketTitle} closeLabel={ui.closeBracket} onClose={() => setBracketOpen(false)} onSelectMatch={(match) => setSelectedMatchId(match.id)} />
    </div>
  );
}
