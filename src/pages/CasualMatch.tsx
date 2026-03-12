import { useEffect, useState } from 'react';
import { Search, Star, Swords } from 'lucide-react';
import clsx from 'clsx';

import { useAuth } from '../App';
import { createCasualMatch, listProfiles } from '../lib/api';
import { subscribeToTable } from '../lib/supabase';
import type { UserProfile } from '../types';
import { useTranslation } from '../i18n';

export default function CasualMatch() {
  const { userProfile, theme, language } = useAuth();
  const t = useTranslation(language);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');

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
        <div
          className="-mx-4 sticky z-30 px-4 pb-4 pt-1 md:mx-0 md:px-0"
          style={{ top: 'calc(env(safe-area-inset-top) + 8.75rem)' }}
        >
          <div
            className={clsx(
              'relative overflow-hidden rounded-[1.85rem] border px-4 py-4 backdrop-blur-[24px] backdrop-saturate-150',
              theme === 'dark'
                ? 'border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.92),rgba(10,13,21,0.84))] shadow-[0_14px_32px_rgba(2,6,23,0.24),inset_0_1px_0_rgba(255,255,255,0.12)]'
                : 'border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(244,247,255,0.78))] shadow-[0_14px_28px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.92)]',
            )}
          >
            <span
              className={clsx(
                'pointer-events-none absolute inset-x-10 top-1 h-8 rounded-full blur-2xl',
                theme === 'dark'
                  ? 'bg-[linear-gradient(90deg,rgba(16,185,129,0.18),rgba(255,255,255,0.08),rgba(16,185,129,0.12))]'
                  : 'bg-[linear-gradient(90deg,rgba(16,185,129,0.1),rgba(255,255,255,0.92),rgba(16,185,129,0.08))]',
              )}
            />
            <div className="relative">
              <h2 className={clsx('mb-4 flex items-center gap-2 text-lg font-bold', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                <Search className="h-5 w-5 text-emerald-500" /> {t('play.findOpponents')}
              </h2>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder={t('play.searchPlaceholder')}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className={clsx(
                    'w-full rounded-2xl border py-4 pl-12 pr-4 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50',
                    theme === 'dark' ? 'border-white/10 bg-zinc-950/55 text-white placeholder:text-zinc-600' : 'border-zinc-200 bg-white/85 text-zinc-900 placeholder:text-zinc-400 shadow-sm',
                  )}
                />
              </div>
            </div>
          </div>
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
