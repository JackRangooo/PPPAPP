import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Calendar, ChevronRight, MessageSquare, Shield, Sparkles, Trophy as TrophyIcon, Users } from 'lucide-react';
import clsx from 'clsx';

import { useAuth } from '../App';
import TournamentBracketDialog from '../components/TournamentBracketDialog';
import TournamentPodium from '../components/TournamentPodium';
import { cancelTournament, createTournament, createTournamentMatchComment, endTournament, getReadableErrorMessage, listProfiles, listTournamentMatchComments, listTournaments, registerForTournament, startTournament } from '../lib/api';
import { createTournamentBracket, sortTournamentTimeline } from '../lib/tournamentBracket';
import { buildTournamentPreviewCard, getTournamentPodiumData, upsertTournament } from '../lib/tournamentPresentation';
import { subscribeToTable } from '../lib/supabase';
import type { Tournament, TournamentMatchComment, UserProfile } from '../types';
import { useTranslation } from '../i18n';

type TournamentLane = 'registration' | 'ongoing' | 'preview';

const copy = {
  en: {
    hub: 'Ranked Tournament Hub',
    hubSubtitle: 'System and admin tournaments can run side by side. Pick a lane and jump in.',
    registrationTab: 'Registration',
    ongoingTab: 'Live',
    previewTab: 'Upcoming',
    registrationHint: 'Open for signups',
    ongoingHint: 'Bracket in progress',
    previewHint: 'Next week preview',
    createTournament: 'Publish Admin Tournament',
    createTournamentBlocked: 'An admin tournament is already active.',
    startTournament: 'Generate Bracket',
    cancelTournament: 'Cancel Tournament',
    forceSettle: 'Force Settle',
    noRegistration: 'No tournaments are collecting signups right now.',
    noOngoing: 'No tournaments are live right now.',
    previewTitle: 'Next Week System Cup',
    previewDescription: 'Preview the next scheduled system tournament.',
    previewBadge: 'Preview',
    systemSource: 'System',
    adminSource: 'Admin',
    viewBracket: 'Open Bracket',
    bracketTitle: 'Live Bracket',
    closeBracket: 'Close',
    bracketHint: 'The bracket opens in a landscape-style viewer. Drag inside the window to see the full bracket.',
    rootOnly: 'Publishing, bracket generation, cancel, and emergency settlement are root-only actions.',
    participants: 'Players',
    registeredListTitle: 'Registered Players',
    matchComments: 'Match Comments',
    commentPlaceholder: 'Leave a comment after the match...',
    postComment: 'Post Comment',
    noComments: 'No comments yet.',
    commentsLocked: 'Comments unlock after the match is completed.',
    noBracket: 'Generate the bracket once registration is complete.',
    tournamentCancelled: 'This tournament was cancelled.',
    minPlayersHint: 'Need at least 4 players and at most 8 players before the event can start.',
    registrationClosed: 'Registration closes as soon as the bracket is generated.',
    createSuccess: 'Tournament created.',
    startSuccess: 'Bracket generated.',
    cancelSuccess: 'Tournament cancelled.',
    settleSuccess: 'Tournament settled.',
    commentSuccess: 'Comment posted.',
    cancelConfirm: 'Cancel this tournament? This cannot be undone.',
    startConfirm: 'Generate the bracket and lock registration?',
    settleConfirm: 'Force settle this tournament now?',
    noProfileForBracket: 'Some participant profiles are still missing. Refresh and try again.',
    noPreviewCta: 'System tournaments refresh weekly.',
    cardSummaryRegistration: 'Single-elimination bracket with a third-place match.',
    cardSummaryOngoing: 'Bracket is live. Open the viewer to track advancement.',
  },
  zh: {
    hub: '排位赛事大厅',
    hubSubtitle: '系统赛和管理员赛可以同时存在，先选分区，再进入对应赛事。',
    registrationTab: '报名中',
    ongoingTab: '开展中',
    previewTab: '未开始',
    registrationHint: '当前可报名',
    ongoingHint: '对阵进行中',
    previewHint: '下周预览',
    createTournament: '发布管理员赛事',
    createTournamentBlocked: '当前已经有管理员赛事在进行中。',
    startTournament: '生成对阵表',
    cancelTournament: '取消锦标赛',
    forceSettle: '紧急结算',
    noRegistration: '当前没有正在报名的赛事。',
    noOngoing: '当前没有正在进行的赛事。',
    previewTitle: '下周系统赛预览',
    previewDescription: '这里会展示下一周系统锦标赛的预览信息。',
    previewBadge: '预览',
    systemSource: '系统发布',
    adminSource: '管理员发布',
    viewBracket: '打开对阵表',
    bracketTitle: '实时对阵表',
    closeBracket: '关闭',
    bracketHint: '对阵表会优先按横向长图模式查看，直接在窗口内拖动即可浏览完整对阵。',
    rootOnly: '发布、生成对阵、取消和紧急结算都由 root 管理员控制。',
    participants: '球员',
    registeredListTitle: '已报名球员',
    matchComments: '比赛评论',
    commentPlaceholder: '比赛结束后在这里留言...',
    postComment: '发布评论',
    noComments: '还没有评论。',
    commentsLocked: '只有比赛完成后才能评论。',
    noBracket: '报名结束后，由管理员生成正式对阵表。',
    tournamentCancelled: '这场锦标赛已取消。',
    minPlayersHint: '至少 4 人、最多 8 人后才能正式开赛。',
    registrationClosed: '正式生成对阵后将停止报名。',
    createSuccess: '赛事已创建。',
    startSuccess: '对阵表已生成。',
    cancelSuccess: '赛事已取消。',
    settleSuccess: '赛事已完成结算。',
    commentSuccess: '评论已发布。',
    cancelConfirm: '确认取消这场锦标赛吗？此操作无法撤销。',
    startConfirm: '确认生成对阵表并关闭报名吗？',
    settleConfirm: '确认现在紧急结算这场锦标赛吗？',
    noProfileForBracket: '部分参赛者资料还没同步到前端，请刷新后再试。',
    noPreviewCta: '系统赛会按周自动刷新。',
    cardSummaryRegistration: '正式单败淘汰赛，包含季军赛。',
    cardSummaryOngoing: '对阵已经开始，打开对阵表即可查看实时晋级。',
  },
} as const;

const badgeStyles = { system: 'bg-emerald-500/12 text-emerald-500', admin: 'bg-sky-500/12 text-sky-500' } as const;

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
  const [lane, setLane] = useState<TournamentLane>('registration');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [bracketOpen, setBracketOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const [nextTournaments, profiles] = await Promise.all([listTournaments(), listProfiles()]);
      if (!active) return;
      const nextProfiles = profiles.reduce<Record<string, UserProfile>>((accumulator, profile) => {
        accumulator[profile.uid] = profile;
        return accumulator;
      }, {});
      if (userProfile) nextProfiles[userProfile.uid] = userProfile;
      setTournaments(nextTournaments);
      setProfilesById(nextProfiles);
    };
    void refresh().finally(() => {
      if (active) setLoading(false);
    });
    const stopTournaments = subscribeToTable('tournaments', () => void refresh());
    const stopProfiles = subscribeToTable('profiles', () => void refresh());
    return () => {
      active = false;
      stopTournaments();
      stopProfiles();
    };
  }, [userProfile]);

  const registrationTournaments = useMemo(() => tournaments.filter((tournament) => tournament.status === 'registration'), [tournaments]);
  const ongoingTournaments = useMemo(() => tournaments.filter((tournament) => tournament.status === 'ongoing'), [tournaments]);
  const activeTournaments = useMemo(() => tournaments.filter((tournament) => tournament.status === 'registration' || tournament.status === 'ongoing'), [tournaments]);
  const pastTournaments = useMemo(() => tournaments.filter((tournament) => tournament.status === 'completed' || tournament.status === 'cancelled'), [tournaments]);
  const visibleTournaments = lane === 'registration' ? registrationTournaments : lane === 'ongoing' ? ongoingTournaments : [];
  const previewCard = useMemo(() => buildTournamentPreviewCard(ui.previewTitle, ui.previewDescription), [ui.previewDescription, ui.previewTitle]);
  const featuredTournament = lane === 'preview' ? null : visibleTournaments.find((tournament) => tournament.id === selectedTournamentId) ?? visibleTournaments[0] ?? activeTournaments[0] ?? null;
  const selectedMatch = featuredTournament?.bracket.matches.find((match) => match.id === selectedMatchId) ?? featuredTournament?.bracket.matches.find((match) => userProfile && (match.player1Id === userProfile.uid || match.player2Id === userProfile.uid)) ?? featuredTournament?.bracket.matches[0] ?? null;
  const canManageTournament = Boolean(userProfile?.isRoot);
  const hasActiveAdminTournament = activeTournaments.some((tournament) => tournament.source === 'admin');

  useEffect(() => {
    if (lane === 'preview') return;
    setSelectedTournamentId((current) => visibleTournaments.find((tournament) => tournament.id === current)?.id ?? visibleTournaments[0]?.id ?? activeTournaments[0]?.id ?? null);
  }, [activeTournaments, lane, visibleTournaments]);

  useEffect(() => {
    if (!featuredTournament) {
      setSelectedMatchId(null);
      return;
    }
    setSelectedMatchId((current) => {
      if (current && featuredTournament.bracket.matches.some((match) => match.id === current)) return current;
      return featuredTournament.bracket.matches[0]?.id ?? null;
    });
  }, [featuredTournament]);

  useEffect(() => {
    if (!featuredTournament || !selectedMatch || (selectedMatch.status !== 'completed' && selectedMatch.status !== 'walkover')) {
      setComments([]);
      return;
    }
    let active = true;
    const loadComments = async () => {
      const nextComments = await listTournamentMatchComments(featuredTournament.id, selectedMatch.id);
      if (active) setComments(nextComments);
    };
    void loadComments();
    return () => {
      active = false;
    };
  }, [featuredTournament, selectedMatch]);

  const replaceTournament = (nextTournament: Tournament) => setTournaments((current) => upsertTournament(current, nextTournament));
  const runMutation = async (fallbackMessage: string, action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      window.alert(getReadableErrorMessage(error, fallbackMessage));
    } finally {
      setBusy(false);
    }
  };

  const handleCreateTournament = async () => runMutation(ui.createTournament, async () => {
    const created = await createTournament();
    replaceTournament(created);
    setSelectedTournamentId(created.id);
    setLane(created.status === 'ongoing' ? 'ongoing' : 'registration');
    window.alert(ui.createSuccess);
  });

  const handleRegister = async (tournamentId: string) => runMutation(t('play.registerFailed'), async () => {
    const updated = await registerForTournament(tournamentId);
    replaceTournament(updated);
    window.alert(t('play.registerSuccess'));
  });

  const handleStartTournament = async (tournament: Tournament) => runMutation(ui.startTournament, async () => {
    if (!window.confirm(ui.startConfirm)) return;
    const participants = tournament.participants.map((id) => profilesById[id]).filter((profile): profile is UserProfile => Boolean(profile));
    if (participants.length !== tournament.participants.length) {
      window.alert(ui.noProfileForBracket);
      return;
    }
    const generated = createTournamentBracket(tournament, participants);
    const updated = await startTournament(tournament.id, generated.bracket, sortTournamentTimeline([...generated.timeline, ...tournament.timeline]));
    replaceTournament(updated);
    setLane('ongoing');
    setSelectedTournamentId(updated.id);
    setBracketOpen(true);
    window.alert(ui.startSuccess);
  });

  const handleCancelTournament = async (tournament: Tournament) => runMutation(ui.cancelTournament, async () => {
    if (!window.confirm(ui.cancelConfirm)) return;
    replaceTournament(await cancelTournament(tournament.id));
    window.alert(ui.cancelSuccess);
  });

  const handleForceSettle = async (tournament: Tournament) => runMutation(ui.forceSettle, async () => {
    if (!window.confirm(ui.settleConfirm)) return;
    replaceTournament(await endTournament(tournament.id));
    window.alert(ui.settleSuccess);
  });

  const handlePostComment = async () => {
    if (!featuredTournament || !selectedMatch || !commentBody.trim()) return;
    await runMutation(ui.commentSuccess, async () => {
      const created = await createTournamentMatchComment(featuredTournament.id, selectedMatch.id, commentBody.trim());
      setComments((current) => [...current, created]);
      setCommentBody('');
      window.alert(ui.commentSuccess);
    });
  };

  if (loading) return <div className="py-12 text-center font-medium text-zinc-500">{t('play.loadingTournaments')}</div>;

  const podium = featuredTournament ? getTournamentPodiumData(featuredTournament, profilesById) : { podiumEntries: [], standings: [] };
  const laneOptions = [
    { id: 'registration' as const, label: ui.registrationTab, hint: ui.registrationHint, count: registrationTournaments.length },
    { id: 'ongoing' as const, label: ui.ongoingTab, hint: ui.ongoingHint, count: ongoingTournaments.length },
    { id: 'preview' as const, label: ui.previewTab, hint: ui.previewHint, count: 1 },
  ];
  const shouldShowTournamentPicker = visibleTournaments.length > 1;
  const formatDateLabel = (value: string | Date) => format(new Date(value), language === 'zh' ? 'M月d日' : 'MMM d');

  const renderTournamentCard = (tournament: Tournament) => {
    const isSelected = featuredTournament?.id === tournament.id;
    const isRegistration = tournament.status === 'registration';
    const cardSummary = isRegistration ? ui.cardSummaryRegistration : ui.cardSummaryOngoing;

    return (
      <button key={tournament.id} type="button" onClick={() => setSelectedTournamentId(tournament.id)} className={clsx('w-full overflow-hidden rounded-[2rem] border text-left transition-all', isSelected ? theme === 'dark' ? 'border-amber-500/35 bg-[linear-gradient(135deg,rgba(120,53,15,0.45),rgba(17,24,39,0.92))] shadow-[0_18px_40px_rgba(245,158,11,0.12)]' : 'border-amber-300 bg-[linear-gradient(135deg,rgba(255,237,213,1),rgba(255,255,255,1))] shadow-[0_18px_40px_rgba(245,158,11,0.12)]' : theme === 'dark' ? 'border-white/5 bg-zinc-900/45 hover:border-amber-500/20 hover:bg-zinc-900/75' : 'border-zinc-200 bg-white hover:border-amber-200 hover:bg-amber-50/40 shadow-sm')}>
        <div className="relative p-5">
          <div className="pointer-events-none absolute right-4 top-2 opacity-[0.08]"><TrophyIcon className="h-24 w-24 text-amber-500" /></div>
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className={clsx('rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em]', badgeStyles[tournament.source])}>{tournament.source === 'admin' ? ui.adminSource : ui.systemSource}</span>
              <span className="rounded-full bg-amber-500/12 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-amber-500">{isRegistration ? ui.registrationTab : ui.ongoingTab}</span>
            </div>
            <div className={clsx('mt-4 text-2xl font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>{tournament.name || t('play.weeklyChampionship')}</div>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm font-medium text-zinc-500">
              <div className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" />{formatDateLabel(tournament.startDate)} - {formatDateLabel(tournament.endDate)}</div>
              <div className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" />{tournament.participants.length} {ui.participants}</div>
            </div>
            <div className={clsx('mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium', theme === 'dark' ? 'bg-zinc-950/75 text-zinc-100' : 'bg-zinc-950 text-zinc-100')}><Shield className="h-4 w-4 text-emerald-500" /><span>{cardSummary}</span></div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/12 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-amber-500"><Sparkles className="h-4 w-4" />{ui.hub}</div>
          <h2 className={clsx('mt-4 text-3xl font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>{ui.hub}</h2>
          <p className={clsx('mt-2 max-w-2xl text-sm leading-6', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600')}>{ui.hubSubtitle}</p>
          <p className={clsx('mt-2 max-w-2xl text-sm leading-6', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>{ui.rootOnly}</p>
        </div>
        {canManageTournament ? <button onClick={() => void handleCreateTournament()} disabled={busy || hasActiveAdminTournament} title={hasActiveAdminTournament ? ui.createTournamentBlocked : ui.createTournament} className="rounded-2xl bg-amber-500 px-5 py-3 font-black text-zinc-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60">{ui.createTournament}</button> : null}
      </section>

      <section className={clsx('rounded-[2rem] border p-2', theme === 'dark' ? 'border-white/5 bg-zinc-900/55' : 'border-zinc-200 bg-white shadow-sm')}>
        <div className="grid grid-cols-3 gap-2">
          {laneOptions.map((option) => (
            <button key={option.id} type="button" onClick={() => setLane(option.id)} className={clsx('rounded-[1.5rem] px-3 py-3 text-left transition-all sm:px-4', lane === option.id ? theme === 'dark' ? 'bg-[linear-gradient(135deg,rgba(245,158,11,0.28),rgba(120,53,15,0.5))] text-white shadow-[0_12px_24px_rgba(245,158,11,0.12)]' : 'bg-[linear-gradient(135deg,rgba(255,237,213,1),rgba(254,215,170,0.95))] text-zinc-900 shadow-[0_10px_20px_rgba(245,158,11,0.12)]' : theme === 'dark' ? 'bg-zinc-950/70 text-zinc-300 hover:bg-zinc-900' : 'bg-zinc-50 text-zinc-700 hover:bg-amber-50')}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-black">{option.label}</div>
                  <div className={clsx('mt-1 text-xs', lane === option.id ? 'text-inherit/80' : 'text-zinc-500')}>{option.hint}</div>
                </div>
                <span className={clsx('flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-black', lane === option.id ? 'bg-zinc-950/90 text-amber-400' : theme === 'dark' ? 'bg-zinc-900 text-zinc-200' : 'bg-white text-zinc-700')}>{option.count}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {lane === 'preview' ? (
        <section className={clsx('relative overflow-hidden rounded-[2.2rem] border p-6', theme === 'dark' ? 'border-amber-500/25 bg-[linear-gradient(135deg,rgba(120,53,15,0.4),rgba(17,24,39,0.94))]' : 'border-amber-200 bg-[linear-gradient(135deg,rgba(255,237,213,1),rgba(255,255,255,1))] shadow-sm')}>
          <div className="pointer-events-none absolute right-4 top-2 opacity-[0.08]"><TrophyIcon className="h-32 w-32 text-amber-500" /></div>
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex rounded-full bg-amber-500/12 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-amber-500">{ui.previewBadge}</div>
            <h3 className={clsx('mt-4 text-3xl font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>{previewCard.title}</h3>
            <p className={clsx('mt-3 text-sm leading-6', theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700')}>{previewCard.description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-medium text-zinc-500"><div className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" />{formatDateLabel(previewCard.startDate)} - {formatDateLabel(previewCard.endDate)}</div></div>
            <div className={clsx('mt-5 rounded-[1.5rem] border px-4 py-4 text-sm font-medium leading-6', theme === 'dark' ? 'border-white/8 bg-zinc-950/60 text-zinc-300' : 'border-zinc-200 bg-white/70 text-zinc-700')}>{ui.noPreviewCta}</div>
          </div>
        </section>
      ) : visibleTournaments.length === 0 ? (
        <section className={clsx('rounded-[2rem] border p-8 text-center text-sm font-medium', theme === 'dark' ? 'border-white/5 bg-zinc-900/45 text-zinc-500' : 'border-zinc-200 bg-white text-zinc-500 shadow-sm')}>{lane === 'registration' ? ui.noRegistration : ui.noOngoing}</section>
      ) : (
        <div className="space-y-6">
          {shouldShowTournamentPicker ? (
            <div className="space-y-4">{visibleTournaments.map((tournament) => renderTournamentCard(tournament))}</div>
          ) : null}
          {featuredTournament ? (
            <>
              <section className={clsx('relative overflow-hidden rounded-[2.25rem] border p-6', theme === 'dark' ? 'border-amber-500/20 bg-[linear-gradient(135deg,rgba(120,53,15,0.4),rgba(17,24,39,0.94))]' : 'border-amber-200 bg-[linear-gradient(135deg,rgba(255,237,213,1),rgba(255,255,255,1))] shadow-sm')}>
                <div className="pointer-events-none absolute right-4 top-0 opacity-[0.08]"><TrophyIcon className="h-36 w-36 text-amber-500" /></div>
                <div className="relative z-10 space-y-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={clsx('rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em]', badgeStyles[featuredTournament.source])}>{featuredTournament.source === 'admin' ? ui.adminSource : ui.systemSource}</span>
                    <span className="rounded-full bg-amber-500/12 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-amber-500">{featuredTournament.status === 'registration' ? ui.registrationTab : ui.ongoingTab}</span>
                  </div>
                  <div>
                    <h3 className={clsx('text-3xl font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>{featuredTournament.name}</h3>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm font-medium text-zinc-500">
                      <div className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" />{formatDateLabel(featuredTournament.startDate)} - {formatDateLabel(featuredTournament.endDate)}</div>
                      <div className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" />{featuredTournament.participants.length} {ui.participants}</div>
                    </div>
                  </div>
                  <div className={clsx('rounded-[1.6rem] border px-4 py-4 text-sm font-medium leading-6', theme === 'dark' ? 'border-white/8 bg-zinc-950/65 text-zinc-300' : 'border-zinc-200 bg-white/75 text-zinc-700')}>
                    <div>{ui.minPlayersHint}</div>
                    <div className="mt-1">{ui.registrationClosed}</div>
                    <div className="mt-1">{ui.bracketHint}</div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {featuredTournament.status === 'registration' ? <button onClick={() => void handleRegister(featuredTournament.id)} disabled={busy || featuredTournament.participants.includes(userProfile?.uid || '')} className="rounded-2xl bg-amber-500 px-6 py-3 font-black text-zinc-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60">{featuredTournament.participants.includes(userProfile?.uid || '') ? t('play.registered') : t('play.joinTournament')}</button> : <button onClick={() => setBracketOpen(true)} className={clsx('rounded-2xl border px-6 py-3 font-black transition-colors', theme === 'dark' ? 'border-white/10 bg-zinc-950 text-white hover:bg-zinc-900' : 'border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50')}>{ui.viewBracket}</button>}
                    {canManageTournament && featuredTournament.status === 'registration' ? <button onClick={() => void handleStartTournament(featuredTournament)} disabled={busy} className="rounded-2xl bg-emerald-500 px-6 py-3 font-black text-zinc-950 transition-colors hover:bg-emerald-400 disabled:opacity-60">{ui.startTournament}</button> : null}
                    {canManageTournament && featuredTournament.status !== 'completed' && featuredTournament.status !== 'cancelled' ? <button onClick={() => void handleCancelTournament(featuredTournament)} disabled={busy} className={clsx('rounded-2xl border px-6 py-3 font-black transition-colors', theme === 'dark' ? 'border-white/10 bg-zinc-900 text-white hover:bg-zinc-800' : 'border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50')}>{ui.cancelTournament}</button> : null}
                    {canManageTournament && featuredTournament.status === 'ongoing' ? <button onClick={() => void handleForceSettle(featuredTournament)} disabled={busy} className={clsx('rounded-2xl border px-6 py-3 font-black transition-colors', theme === 'dark' ? 'border-white/10 bg-zinc-800 text-white hover:bg-zinc-700' : 'border-zinc-200 bg-zinc-100 text-zinc-900 hover:bg-zinc-200')}>{ui.forceSettle}</button> : null}
                  </div>
                </div>
              </section>
              <section className={clsx('rounded-[2rem] border p-5', theme === 'dark' ? 'border-white/5 bg-zinc-900/50' : 'border-zinc-200 bg-white shadow-sm')}>
                <div className="mb-4 flex items-center gap-2"><MessageSquare className="h-5 w-5 text-sky-500" /><h2 className={clsx('text-lg font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>{ui.matchComments}</h2></div>
                {selectedMatch && (selectedMatch.status === 'completed' || selectedMatch.status === 'walkover') ? (
                  <div className="space-y-4">
                    <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
                      {comments.length > 0 ? comments.map((comment) => <div key={comment.id} className={clsx('rounded-2xl border px-4 py-3', theme === 'dark' ? 'border-white/5 bg-zinc-950/70' : 'border-zinc-200 bg-zinc-50')}><div className="mb-2 flex items-center justify-between gap-3"><div className={clsx('font-bold', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>{comment.authorName}</div><div className="text-xs font-medium text-zinc-500">{format(new Date(comment.createdAt), language === 'zh' ? 'M月d日 HH:mm' : 'MMM d, HH:mm')}</div></div><div className={clsx('text-sm leading-6', theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700')}>{comment.body}</div></div>) : <div className="font-medium text-zinc-500">{ui.noComments}</div>}
                    </div>
                    <div className="space-y-3">
                      <textarea value={commentBody} onChange={(event) => setCommentBody(event.target.value)} placeholder={ui.commentPlaceholder} rows={4} className={clsx('w-full resize-none rounded-2xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500/30', theme === 'dark' ? 'border-white/10 bg-zinc-950 text-white placeholder:text-zinc-600' : 'border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400')} />
                      <button onClick={() => void handlePostComment()} disabled={!commentBody.trim() || busy} className="rounded-2xl bg-sky-500 px-5 py-3 font-bold text-zinc-950 transition-colors hover:bg-sky-400 disabled:opacity-50">{ui.postComment}</button>
                    </div>
                  </div>
                ) : <div className={clsx('rounded-2xl border p-4 text-sm font-medium', theme === 'dark' ? 'border-white/5 bg-zinc-950/60 text-zinc-400' : 'border-zinc-200 bg-zinc-50 text-zinc-500')}>{ui.commentsLocked}</div>}
              </section>
            </>
          ) : null}
        </div>
      )}

      <section>
        <h2 className={clsx('mb-4 text-lg font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>{t('play.pastTournaments')}</h2>
        {pastTournaments.length > 0 ? <div className="space-y-3">{pastTournaments.map((tournament) => <div key={tournament.id} className={clsx('flex items-center justify-between rounded-2xl border p-4 transition-colors', theme === 'dark' ? 'border-white/5 bg-zinc-900/30 hover:bg-zinc-800/30' : 'border-zinc-200 bg-white hover:bg-zinc-50 shadow-sm')}><div><div className={clsx('font-bold', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>{tournament.name}</div><div className="mt-1 text-xs font-medium text-zinc-500">{tournament.participants.length} {t('play.participants')}</div></div><ChevronRight className="h-5 w-5 text-zinc-400" /></div>)}</div> : <div className="rounded-2xl border border-dashed border-zinc-300/40 px-4 py-6 text-center text-sm font-medium text-zinc-500">{t('play.noPastTournaments')}</div>}
      </section>

      <TournamentBracketDialog open={bracketOpen} theme={theme} language={language} tournament={featuredTournament} currentUserId={userProfile?.uid ?? null} selectedMatch={selectedMatch} emptyLabel={ui.noBracket} cancelledLabel={ui.tournamentCancelled} title={ui.bracketTitle} closeLabel={ui.closeBracket} onClose={() => setBracketOpen(false)} onSelectMatch={(match) => setSelectedMatchId(match.id)} />
    </div>
  );
}

