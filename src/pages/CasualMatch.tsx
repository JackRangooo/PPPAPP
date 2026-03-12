import { useEffect, useState } from 'react';
import { Star, Swords } from 'lucide-react';
import clsx from 'clsx';

import { useAuth } from '../App';
import { createCasualMatch, listProfiles } from '../lib/api';
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
          {filteredUsers.map((currentUser) => (
            <div
              key={currentUser.uid}
              className={clsx(
                'flex items-center justify-between gap-4 rounded-2xl border p-4 transition-colors',
                theme === 'dark' ? 'border-white/5 bg-zinc-900/30 hover:bg-zinc-800/30' : 'border-zinc-200 bg-white shadow-sm hover:bg-zinc-50',
              )}
            >
              <div className="flex min-w-0 items-center gap-4">
                <img
                  src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName)}&background=random`}
                  alt={currentUser.displayName}
                  className="h-12 w-12 shrink-0 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <div className={clsx('truncate text-lg font-bold', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                    {currentUser.displayName}
                  </div>
                  <div className="mt-1 truncate text-xs font-medium text-zinc-500">
                    @{currentUser.nickname}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1.5 text-lg font-black text-emerald-500">
                    <span>{currentUser.casualStars}</span>
                    <Star className="h-4 w-4 fill-current" />
                  </div>
                  <div className="text-[10px] font-medium text-zinc-500">{t('profile.stars')}</div>
                </div>
                <button
                  onClick={() => void handleChallenge(currentUser)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 transition-colors hover:bg-emerald-500 hover:text-zinc-950"
                >
                  <Swords className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
          {filteredUsers.length === 0 ? (
            <div className="py-8 text-center font-medium text-zinc-500">{t('play.noPlayers')}</div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
