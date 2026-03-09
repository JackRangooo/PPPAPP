import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Search, Star, Swords } from 'lucide-react';
import clsx from 'clsx';

import { useAuth } from '../App';
import { createCasualMatch, listProfiles, listUserActiveCasualMatches } from '../lib/api';
import { subscribeToTable } from '../lib/supabase';
import type { Match, UserProfile } from '../types';
import { useTranslation } from '../i18n';

export default function CasualMatch() {
  const { userProfile, theme, language } = useAuth();
  const t = useTranslation(language);
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [pendingMatches, setPendingMatches] = useState<Match[]>([]);

  useEffect(() => {
    if (!userProfile) return;

    const loadUsers = async () => {
      try {
        setUsers(await listProfiles(userProfile.uid));
      } catch (error) {
        console.error('Failed to load users', error);
      }
    };

    const loadMatches = async () => {
      try {
        setPendingMatches(await listUserActiveCasualMatches(userProfile.uid));
      } catch (error) {
        console.error('Failed to load matches', error);
      }
    };

    void loadUsers();
    void loadMatches();

    const stopUsers = subscribeToTable('profiles', () => {
      void loadUsers();
    });
    const stopMatches = subscribeToTable('matches', () => {
      void loadMatches();
    });

    return () => {
      stopUsers();
      stopMatches();
    };
  }, [userProfile]);

  const handleChallenge = async (opponent: UserProfile) => {
    try {
      await createCasualMatch(opponent.uid);
      alert(t('play.challengeSent', { name: opponent.displayName }));
    } catch (error) {
      console.error('Error creating match', error);
      alert(t('play.challengeFailed'));
    }
  };

  const filteredUsers = users.filter((currentUser) =>
    currentUser.displayName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-8">
      {pendingMatches.length > 0 ? (
        <section>
          <h2 className={clsx('text-lg font-bold mb-4 flex items-center gap-2', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
            <Clock className="w-5 h-5 text-amber-500" /> {t('play.activeChallenges')}
          </h2>
          <div className="space-y-3">
            {pendingMatches.map((match) => {
              const isChallenger = match.player1Id === userProfile?.uid;
              const opponentName = isChallenger ? match.player2Name : match.player1Name;

              return (
                <div
                  key={match.id}
                  className={clsx(
                    'border rounded-2xl p-4 flex items-center justify-between transition-colors gap-4',
                    theme === 'dark' ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-zinc-200 shadow-sm',
                  )}
                >
                  <div>
                    <div className={clsx('font-bold', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                      {isChallenger ? t('play.waitingFor', { name: opponentName }) : t('play.challengedYou', { name: opponentName })}
                    </div>
                    <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mt-1">
                      {t(`match.status.${match.status}`)}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/match/${match.id}`)}
                    className={clsx(
                      'px-4 py-2 rounded-xl text-sm font-bold transition-colors shrink-0',
                      theme === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900',
                    )}
                  >
                    {t('play.view')}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className={clsx('text-lg font-bold mb-4 flex items-center gap-2', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
          <Search className="w-5 h-5 text-emerald-500" /> {t('play.findOpponents')}
        </h2>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder={t('play.searchPlaceholder')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={clsx(
              'w-full border rounded-2xl py-4 pl-12 pr-4 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50',
              theme === 'dark' ? 'bg-zinc-900/50 border-white/10 text-white placeholder:text-zinc-600' : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 shadow-sm',
            )}
          />
        </div>

        <div className="space-y-3">
          {filteredUsers.map((currentUser) => (
            <div
              key={currentUser.uid}
              className={clsx(
                'border rounded-2xl p-4 flex items-center justify-between transition-colors gap-4',
                theme === 'dark' ? 'bg-zinc-900/30 border-white/5 hover:bg-zinc-800/30' : 'bg-white border-zinc-200 hover:bg-zinc-50 shadow-sm',
              )}
            >
              <div className="flex items-center gap-4 min-w-0">
                <img
                  src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName)}&background=random`}
                  alt={currentUser.displayName}
                  className="w-12 h-12 rounded-full shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <div className={clsx('font-bold text-lg truncate', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                    {currentUser.displayName}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-500 font-medium">
                    <Star className="w-4 h-4 text-emerald-500 fill-current" />
                    {currentUser.casualStars} {t('profile.stars')}
                  </div>
                </div>
              </div>
              <button
                onClick={() => void handleChallenge(currentUser)}
                className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center hover:bg-emerald-500 hover:text-zinc-950 transition-colors shrink-0"
              >
                <Swords className="w-5 h-5" />
              </button>
            </div>
          ))}
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 font-medium">{t('play.noPlayers')}</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
