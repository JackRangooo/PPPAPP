import { useEffect, useState } from 'react';
import { Star, Swords } from 'lucide-react';
import clsx from 'clsx';

import { useAuth } from '../App';
import { createCasualMatch, listProfiles } from '../lib/api';
import { getCompetitiveDivision } from '../lib/competitiveRank';
import { subscribeToTable } from '../lib/supabase';
import type { UserProfile } from '../types';
import { useTranslation } from '../i18n';

interface CasualMatchProps {
  search: string;
}

export default function CasualMatch({ search }: CasualMatchProps) {
  const { userProfile, theme, language } = useAuth();
  const t = useTranslation(language);
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!userProfile) return;

    const loadUsers = async () => {
      try {
        setUsers(await listProfiles(userProfile.uid));
      } catch (error) {
        console.error('Failed to load users', error);
      }
    };

    void loadUsers();

    const stopUsers = subscribeToTable('profiles', () => {
      void loadUsers();
    });

    return () => {
      stopUsers();
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
      <section>
        <div className="space-y-3">
          {filteredUsers.map((currentUser) => {
            const division = getCompetitiveDivision(currentUser.casualStars, language);

            return (
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
                    className="w-12 h-12 rounded-full shrink-0 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0">
                    <div className={clsx('font-bold text-lg truncate', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                      {currentUser.displayName}
                    </div>
                    <div className="mt-1 truncate text-xs font-semibold uppercase tracking-[0.14em] text-amber-500">
                      {division.title}
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
            );
          })}
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 font-medium">{t('play.noPlayers')}</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
