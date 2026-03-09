import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Calendar, ChevronRight, Medal, Trophy as TrophyIcon, Users } from 'lucide-react';
import clsx from 'clsx';

import { useAuth } from '../App';
import { endTournament, listTournaments, registerForTournament } from '../lib/api';
import { subscribeToTable } from '../lib/supabase';
import type { Tournament } from '../types';
import { useTranslation } from '../i18n';

export default function Tournaments() {
  const { userProfile, theme, language } = useAuth();
  const t = useTranslation(language);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTournaments = async () => {
      try {
        setTournaments(await listTournaments());
      } catch (error) {
        console.error('Failed to load tournaments', error);
      } finally {
        setLoading(false);
      }
    };

    void loadTournaments();
    return subscribeToTable('tournaments', () => {
      void loadTournaments();
    });
  }, []);

  const getTournamentStatusLabel = (status: Tournament['status']) => {
    if (status === 'registration') return t('play.registrationOpen');
    if (status === 'ongoing') return t('match.status.ongoing');
    return t('match.status.completed');
  };

  const handleRegister = async (tournamentId: string) => {
    try {
      await registerForTournament(tournamentId);
      alert(t('play.registerSuccess'));
    } catch (error) {
      console.error('Error registering', error);
      alert(t('play.registerFailed'));
    }
  };

  const handleEndTournament = async (tournament: Tournament) => {
    if (!window.confirm(t('play.endTournamentConfirm'))) return;

    try {
      await endTournament(tournament.id);
      alert(t('play.endTournamentSuccess'));
    } catch (error) {
      console.error('Error ending tournament', error);
      alert(t('play.endTournamentFailed'));
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-zinc-500 font-medium">{t('play.loadingTournaments')}</div>;
  }

  const featuredTournament = tournaments[0];
  const pastTournaments = tournaments.slice(1);

  return (
    <div className="space-y-8">
      <section>
        <h2 className={clsx('text-lg font-bold mb-4', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
          {t('play.thisWeek')}
        </h2>

        {featuredTournament ? (
          <div className={clsx('border rounded-3xl p-6 relative overflow-hidden', theme === 'dark' ? 'bg-gradient-to-br from-amber-500/20 to-zinc-900/50 border-amber-500/30' : 'bg-gradient-to-br from-amber-50 to-white border-amber-200 shadow-sm')}>
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <Medal className="w-32 h-32 text-amber-500" />
            </div>

            <div className="relative z-10">
              <div className={clsx('inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4', theme === 'dark' ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600')}>
                {getTournamentStatusLabel(featuredTournament.status)}
              </div>

              <h3 className={clsx('text-2xl font-black mb-2', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                {featuredTournament.name || t('play.weeklyChampionship')}
              </h3>
              <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500 font-medium mb-6">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(featuredTournament.startDate), 'MMM d')} - {format(new Date(featuredTournament.endDate), 'MMM d')}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {featuredTournament.participants?.length || 0} {t('play.registered')}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {featuredTournament.status === 'registration' ? (
                  <button
                    onClick={() => void handleRegister(featuredTournament.id)}
                    disabled={featuredTournament.participants?.includes(userProfile?.uid || '')}
                    className="bg-amber-500 hover:bg-amber-400 text-zinc-950 px-8 py-3 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {featuredTournament.participants?.includes(userProfile?.uid || '') ? t('play.registered') : t('play.joinTournament')}
                  </button>
                ) : null}

                {featuredTournament.status === 'ongoing' ? (
                  <div className={clsx('border rounded-xl p-4 text-center flex-1', theme === 'dark' ? 'bg-zinc-900/80 border-white/5' : 'bg-zinc-50 border-zinc-200')}>
                    <p className={clsx('font-medium', theme === 'dark' ? 'text-zinc-300' : 'text-zinc-600')}>
                      {t('play.tournamentOngoing')}
                    </p>
                  </div>
                ) : null}

                {featuredTournament.status !== 'completed' ? (
                  <button
                    onClick={() => void handleEndTournament(featuredTournament)}
                    className={clsx('px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2', theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-900')}
                  >
                    <TrophyIcon className="w-4 h-4" /> {t('play.endAndAward')}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className={clsx('border rounded-2xl p-8 text-center', theme === 'dark' ? 'bg-zinc-900/30 border-white/5' : 'bg-white border-zinc-200 shadow-sm')}>
            <p className="text-zinc-500 font-medium">{t('play.noActiveTournaments')}</p>
          </div>
        )}
      </section>

      <section>
        <h2 className={clsx('text-lg font-bold mb-4', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
          {t('play.pastTournaments')}
        </h2>
        <div className="space-y-3">
          {pastTournaments.map((tournament) => (
            <div
              key={tournament.id}
              className={clsx('border rounded-2xl p-4 flex items-center justify-between transition-colors cursor-pointer', theme === 'dark' ? 'bg-zinc-900/30 border-white/5 hover:bg-zinc-800/30' : 'bg-white border-zinc-200 hover:bg-zinc-50 shadow-sm')}
            >
              <div>
                <div className={clsx('font-bold', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                  {t('play.weekOf')} {format(new Date(tournament.startDate), 'MMM d, yyyy')}
                </div>
                <div className="text-xs text-zinc-500 font-medium mt-1">
                  {tournament.participants?.length || 0} {t('play.participants')} - {getTournamentStatusLabel(tournament.status)}
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
    </div>
  );
}
