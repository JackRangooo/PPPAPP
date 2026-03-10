import { useEffect, useState } from 'react';
import {
  Activity,
  Check as CheckIcon,
  Edit2,
  Info,
  LogOut,
  Moon,
  Package,
  Settings,
  Star,
  Sun,
  Trophy,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import clsx from 'clsx';

import { useAuth } from '../App';
import { updateProfileDisplayName, updateProfilePreferences } from '../lib/api';
import type { Trophy as TrophyType } from '../types';
import { useTranslation } from '../i18n';

export default function Profile() {
  const { userProfile, logOut, theme, toggleTheme, language, setLanguage, syncProfile } = useAuth();
  const t = useTranslation(language);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [selectedTrophy, setSelectedTrophy] = useState<TrophyType | null>(null);
  const [inventoryTab, setInventoryTab] = useState<'trophies' | 'titles'>('trophies');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    setNewName(userProfile?.displayName ?? '');
  }, [userProfile?.displayName]);

  if (!userProfile) return null;

  const handleRename = async () => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === userProfile.displayName) {
      setIsEditingName(false);
      setNewName(userProfile.displayName);
      return;
    }

    try {
      const updatedProfile = await updateProfileDisplayName(trimmed);
      syncProfile(updatedProfile);
      setIsEditingName(false);
    } catch (error) {
      console.error('Failed to rename', error);
      alert(t('profile.renameFailed'));
    }
  };

  const handleSelectTitle = async (title: string) => {
    try {
      const updatedProfile = await updateProfilePreferences({ selectedTitle: title });
      syncProfile(updatedProfile);
    } catch (error) {
      console.error('Failed to select title', error);
    }
  };

  const handlePlaceTrophy = async (slotId: number, trophyId: string | null) => {
    const newShowcase = (userProfile.showcase || []).map((slot) =>
      slot.slotId === slotId ? { ...slot, trophyId } : slot,
    );

    try {
      const updatedProfile = await updateProfilePreferences({ showcase: newShowcase });
      syncProfile(updatedProfile);
    } catch (error) {
      console.error('Failed to update showcase', error);
    }
  };

  const casualWinRate =
    userProfile.casualWins + userProfile.casualLosses > 0
      ? Math.round((userProfile.casualWins / (userProfile.casualWins + userProfile.casualLosses)) * 100)
      : 0;

  return (
    <div className="space-y-8 pb-12">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative shrink-0">
            <img
              src={userProfile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.displayName)}&background=random`}
              alt={userProfile.displayName}
              className="w-20 h-20 rounded-full border-4 border-zinc-900 shadow-xl"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-zinc-950 p-1 rounded-full border-2 border-zinc-950">
              <Star className="w-4 h-4 fill-current" />
            </div>
          </div>
          <div className="min-w-0">
            {isEditingName ? (
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="text"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  className={clsx(
                    'border rounded-lg px-3 py-1 font-bold focus:outline-none focus:border-emerald-500 w-40',
                    theme === 'dark' ? 'bg-zinc-900 border-white/10 text-white' : 'bg-white border-zinc-300 text-zinc-900',
                  )}
                  autoFocus
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      void handleRename();
                    }
                  }}
                />
                <button onClick={() => void handleRename()} className="p-1.5 bg-emerald-500 text-zinc-950 rounded-lg hover:bg-emerald-400 transition-colors">
                  <CheckIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setIsEditingName(false);
                    setNewName(userProfile.displayName);
                  }}
                  className={clsx(
                    'p-1.5 rounded-lg transition-colors',
                    theme === 'dark'
                      ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                      : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300 hover:text-zinc-900',
                  )}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-1 min-w-0">
                <h1 className={clsx('text-2xl font-bold truncate', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                  {userProfile.displayName}
                </h1>
                <button
                  onClick={() => {
                    setNewName(userProfile.displayName);
                    setIsEditingName(true);
                  }}
                  className="text-zinc-500 hover:text-emerald-500 transition-colors p-1 shrink-0"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold uppercase tracking-widest">
              {userProfile.selectedTitle || t('profile.novicePlayer')}
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className={clsx(
            'w-12 h-12 rounded-2xl border flex items-center justify-center transition-all active:scale-95 shrink-0',
            theme === 'dark'
              ? 'bg-zinc-900/50 border-white/5 text-zinc-400 hover:text-white'
              : 'bg-white border-zinc-200 text-zinc-500 hover:text-zinc-900 shadow-sm',
          )}
        >
          <Settings className="w-6 h-6" />
        </button>
      </header>

      <section className="relative">
        <div className="flex items-center justify-between mb-4">
          <h2 className={clsx('text-lg font-bold flex items-center gap-2', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
            <Trophy className="w-5 h-5 text-amber-500" /> {t('profile.showcase')}
          </h2>
          <button onClick={() => setIsInventoryOpen(true)} className="text-sm text-emerald-500 font-bold flex items-center gap-1 hover:text-emerald-400">
            <Package className="w-4 h-4" /> {t('profile.backpack')}
          </button>
        </div>

        <div className={clsx('border-x-8 border-t-8 rounded-t-3xl p-6 shadow-2xl relative', theme === 'dark' ? 'bg-zinc-900/80 border-zinc-800' : 'bg-zinc-100 border-zinc-300')}>
          <div className="grid grid-cols-3 gap-4 relative z-10">
            {(userProfile.showcase || []).map((slot) => {
              const trophy = userProfile.inventory?.trophies?.find((currentTrophy) => currentTrophy.id === slot.trophyId);
              return (
                <div
                  key={slot.slotId}
                  onClick={() => (trophy ? setSelectedTrophy(trophy) : setIsInventoryOpen(true))}
                  className={clsx(
                    'aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer group',
                    trophy
                      ? theme === 'dark'
                        ? 'bg-zinc-950/50 border-amber-500/30 hover:border-amber-500/60'
                        : 'bg-white border-amber-500/30 hover:border-amber-500/60 shadow-sm'
                      : theme === 'dark'
                        ? 'bg-zinc-950/20 border-white/5 hover:bg-zinc-950/40 hover:border-white/10'
                        : 'bg-white/50 border-zinc-200 hover:bg-white hover:border-zinc-300',
                  )}
                >
                  {trophy ? (
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
                      <Trophy
                        className={clsx(
                          'w-10 h-10 mb-1 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]',
                          trophy.rank === 1 ? 'text-yellow-400' : trophy.rank === 2 ? 'text-zinc-300' : 'text-amber-600',
                        )}
                      />
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter text-center px-1 truncate w-full">
                        {trophy.name}
                      </span>
                    </motion.div>
                  ) : (
                    <div className="text-zinc-700 group-hover:text-zinc-500 transition-colors">
                      <Trophy className="w-8 h-8 opacity-20" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className={clsx('h-4 rounded-full mt-4 shadow-inner', theme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-300')} />
        </div>
        <div className={clsx('h-6 rounded-b-3xl border-x-8 border-b-8 shadow-xl', theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-200 border-zinc-300')} />
      </section>

      <div className="grid grid-cols-2 gap-4">
        <div className={clsx('border rounded-3xl p-5', theme === 'dark' ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-zinc-200 shadow-sm')}>
          <div className="flex items-center gap-2 text-emerald-500 mb-4">
            <Star className="w-4 h-4 fill-current" />
            <span className="text-xs font-bold uppercase tracking-wider">{t('profile.casualStats')}</span>
          </div>
          <div className={clsx('text-3xl font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
            {userProfile.casualStars} <span className="text-sm font-medium text-zinc-500">{t('profile.stars')}</span>
          </div>
          <div className="text-xs text-zinc-500 font-medium mt-1">
            {userProfile.casualWins}W - {userProfile.casualLosses}L ({casualWinRate}%)
          </div>
        </div>

        <div className={clsx('border rounded-3xl p-5', theme === 'dark' ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-zinc-200 shadow-sm')}>
          <div className="flex items-center gap-2 text-amber-500 mb-4">
            <Activity className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">{t('profile.rankedStats')}</span>
          </div>
          <div className={clsx('text-3xl font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
            {userProfile.rankedPoints} <span className="text-sm font-medium text-zinc-500">{t('profile.points')}</span>
          </div>
          <div className="text-xs text-zinc-500 font-medium mt-1">{t('profile.avgRank')}: #{userProfile.averageRank || '-'}</div>
        </div>
      </div>

      <AnimatePresence>
        {isSettingsOpen ? (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSettingsOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={clsx('fixed top-0 right-0 bottom-0 w-80 border-l z-[70] p-8 flex flex-col', theme === 'dark' ? 'bg-zinc-950 border-white/10' : 'bg-white border-zinc-200')}
            >
              <div className="flex items-center justify-between mb-12">
                <h2 className={clsx('text-2xl font-bold', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                  {t('profile.settings')}
                </h2>
                <button onClick={() => setIsSettingsOpen(false)} className="text-zinc-500 hover:text-emerald-500">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-8 flex-1">
                <section>
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">{t('profile.appearance')}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        if (theme === 'light') {
                          void toggleTheme();
                        }
                      }}
                      className={clsx(
                        'flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all',
                        theme === 'dark' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100',
                      )}
                    >
                      <Moon className="w-6 h-6" />
                      <span className="text-xs font-bold">{t('profile.dark')}</span>
                    </button>
                    <button
                      onClick={() => {
                        if (theme === 'dark') {
                          void toggleTheme();
                        }
                      }}
                      className={clsx(
                        'flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all',
                        theme === 'light' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' : 'bg-zinc-900 border-white/5 text-zinc-500 hover:bg-zinc-800',
                      )}
                    >
                      <Sun className="w-6 h-6" />
                      <span className="text-xs font-bold">{t('profile.light')}</span>
                    </button>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">{t('profile.language')}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        if (language !== 'en') {
                          void setLanguage('en');
                        }
                      }}
                      className={clsx(
                        'flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all',
                        language === 'en'
                          ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500'
                          : theme === 'dark'
                            ? 'bg-zinc-900 border-white/5 text-zinc-500 hover:bg-zinc-800'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100',
                      )}
                    >
                      <span className="text-xs font-bold">{t('profile.english')}</span>
                    </button>
                    <button
                      onClick={() => {
                        if (language !== 'zh') {
                          void setLanguage('zh');
                        }
                      }}
                      className={clsx(
                        'flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all',
                        language === 'zh'
                          ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500'
                          : theme === 'dark'
                            ? 'bg-zinc-900 border-white/5 text-zinc-500 hover:bg-zinc-800'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:bg-zinc-100',
                      )}
                    >
                      <span className="text-xs font-bold">{t('profile.chinese')}</span>
                    </button>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">{t('profile.account')}</h3>
                  <button
                    onClick={() => {
                      void logOut().catch((error) => {
                        console.error('Failed to sign out', error);
                      });
                    }}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 font-bold hover:bg-red-500 hover:text-white transition-all"
                  >
                    <LogOut className="w-5 h-5" />
                    {t('profile.signOut')}
                  </button>
                </section>
              </div>

              <div className="text-center text-[10px] text-zinc-600 font-medium">PingProPrivate v2.0.0</div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isInventoryOpen ? (
          <div className="fixed inset-0 z-[80] flex items-end justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsInventoryOpen(false)} className="fixed inset-0 bg-black/80 backdrop-blur-md" />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className={clsx('relative w-full max-w-lg rounded-t-[40px] p-8 max-h-[80vh] overflow-y-auto', theme === 'dark' ? 'bg-zinc-900' : 'bg-white')}
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                    <Package className="w-6 h-6 text-emerald-500" />
                  </div>
                  <h2 className={clsx('text-2xl font-bold', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                    {t('profile.backpack')}
                  </h2>
                </div>
                <button onClick={() => setIsInventoryOpen(false)} className="text-zinc-500 hover:text-emerald-500">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex gap-4 mb-8">
                <button
                  onClick={() => setInventoryTab('trophies')}
                  className={clsx(
                    'flex-1 py-3 rounded-xl font-bold transition-all',
                    inventoryTab === 'trophies'
                      ? theme === 'dark'
                        ? 'bg-white text-zinc-950'
                        : 'bg-zinc-900 text-white'
                      : theme === 'dark'
                        ? 'bg-zinc-800 text-zinc-500'
                        : 'bg-zinc-100 text-zinc-500',
                  )}
                >
                  {t('profile.trophies')}
                </button>
                <button
                  onClick={() => setInventoryTab('titles')}
                  className={clsx(
                    'flex-1 py-3 rounded-xl font-bold transition-all',
                    inventoryTab === 'titles'
                      ? theme === 'dark'
                        ? 'bg-white text-zinc-950'
                        : 'bg-zinc-900 text-white'
                      : theme === 'dark'
                        ? 'bg-zinc-800 text-zinc-500'
                        : 'bg-zinc-100 text-zinc-500',
                  )}
                >
                  {t('profile.titles')}
                </button>
              </div>

              {inventoryTab === 'trophies' ? (
                <div className="grid grid-cols-2 gap-4">
                  {(userProfile.inventory?.trophies || []).map((currentTrophy) => (
                    <div
                      key={currentTrophy.id}
                      className={clsx(
                        'border rounded-2xl p-4 flex flex-col items-center text-center group relative',
                        theme === 'dark' ? 'bg-zinc-950 border-white/5' : 'bg-zinc-50 border-zinc-200',
                      )}
                    >
                      <Trophy
                        className={clsx(
                          'w-12 h-12 mb-3',
                          currentTrophy.rank === 1 ? 'text-yellow-400' : currentTrophy.rank === 2 ? 'text-zinc-300' : 'text-amber-600',
                        )}
                      />
                      <div className={clsx('font-bold text-sm mb-1', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                        {currentTrophy.name}
                      </div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest">{currentTrophy.tournamentName}</div>

                      <div className="mt-4 flex gap-2 w-full">
                        <button
                          onClick={() => setSelectedTrophy(currentTrophy)}
                          className={clsx(
                            'flex-1 p-2 rounded-lg transition-colors',
                            theme === 'dark' ? 'bg-zinc-800 text-zinc-400 hover:text-white' : 'bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-900',
                          )}
                        >
                          <Info className="w-4 h-4 mx-auto" />
                        </button>
                        <button
                          onClick={() => {
                            const currentSlot = (userProfile.showcase || []).find((slot) => slot.trophyId === currentTrophy.id);
                            if (currentSlot) {
                              void handlePlaceTrophy(currentSlot.slotId, null);
                              return;
                            }

                            const emptySlot = (userProfile.showcase || []).find((slot) => !slot.trophyId);
                            if (emptySlot) {
                              void handlePlaceTrophy(emptySlot.slotId, currentTrophy.id);
                            } else {
                              alert(t('profile.showcaseFull'));
                            }
                          }}
                          className={clsx(
                            'flex-1 p-2 rounded-lg font-bold text-[10px] uppercase',
                            (userProfile.showcase || []).some((slot) => slot.trophyId === currentTrophy.id)
                              ? 'bg-red-500/10 text-red-500'
                              : 'bg-emerald-500/10 text-emerald-500',
                          )}
                        >
                          {(userProfile.showcase || []).some((slot) => slot.trophyId === currentTrophy.id) ? t('profile.remove') : t('profile.display')}
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!userProfile.inventory?.trophies || userProfile.inventory.trophies.length === 0) ? (
                    <div className="col-span-2 py-12 text-center text-zinc-500 font-medium">{t('profile.winToEarn')}</div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-3">
                  {(userProfile.inventory?.titles || []).map((title) => (
                    <button
                      key={title}
                      onClick={() => void handleSelectTitle(title)}
                      className={clsx(
                        'w-full p-4 rounded-2xl border flex items-center justify-between transition-all',
                        userProfile.selectedTitle === title
                          ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500'
                          : theme === 'dark'
                            ? 'bg-zinc-950 border-white/5 text-zinc-500 hover:border-white/10'
                            : 'bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300',
                      )}
                    >
                      <span className="font-bold">{title}</span>
                      {userProfile.selectedTitle === title ? <CheckIcon className="w-5 h-5" /> : null}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {selectedTrophy ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedTrophy(null)} className="fixed inset-0 bg-black/90 backdrop-blur-xl" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={clsx('relative border rounded-[40px] p-10 max-w-sm w-full text-center shadow-[0_0_100px_rgba(245,158,11,0.2)]', theme === 'dark' ? 'bg-zinc-900 border-white/10' : 'bg-white border-zinc-200')}
            >
              <Trophy
                className={clsx(
                  'w-32 h-32 mx-auto mb-8 drop-shadow-[0_0_30px_rgba(245,158,11,0.5)]',
                  selectedTrophy.rank === 1 ? 'text-yellow-400' : selectedTrophy.rank === 2 ? 'text-zinc-300' : 'text-amber-600',
                )}
              />
              <h2 className={clsx('text-3xl font-black mb-2', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                {selectedTrophy.name}
              </h2>
              <p className="text-emerald-500 font-bold uppercase tracking-widest text-sm mb-8">{selectedTrophy.tournamentName}</p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className={clsx('p-4 rounded-2xl', theme === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50')}>
                  <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">{t('profile.rank')}</div>
                  <div className={clsx('text-xl font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>#{selectedTrophy.rank}</div>
                </div>
                <div className={clsx('p-4 rounded-2xl', theme === 'dark' ? 'bg-zinc-950' : 'bg-zinc-50')}>
                  <div className="text-[10px] text-zinc-500 font-bold uppercase mb-1">{t('profile.date')}</div>
                  <div className={clsx('text-sm font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>{selectedTrophy.date}</div>
                </div>
              </div>

              <button
                onClick={() => setSelectedTrophy(null)}
                className={clsx('w-full py-4 rounded-2xl font-bold text-lg transition-all', theme === 'dark' ? 'bg-white text-zinc-950 hover:bg-zinc-200' : 'bg-zinc-900 text-white hover:bg-zinc-800')}
              >
                {t('profile.close')}
              </button>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}




