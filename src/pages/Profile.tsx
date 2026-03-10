import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Check as CheckIcon,
  Coins,
  Edit2,
  LogOut,
  Moon,
  Package,
  Search,
  Settings,
  ShieldAlert,
  Star,
  Sun,
  Trophy,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import clsx from 'clsx';

import { useAuth } from '../App';
import ProfileIdentityEditor from '../components/ProfileIdentityEditor';
import PrizeIcon from '../components/PrizeIcon';
import ProfileInventorySheet, { type InventoryTab } from '../components/ProfileInventorySheet';
import TrophyShowcaseCabinet from '../components/TrophyShowcaseCabinet';
import {
  adminDeleteUser,
  adminResetUserProgress,
  listProfiles,
  listShopProducts,
  purchaseShopItem,
  updateProfileIdentity,
  updateProfileDisplayName,
  updateProfilePreferences,
} from '../lib/api';
import type { ShopProduct, Trophy as TrophyType, UserProfile } from '../types';
import { useTranslation } from '../i18n';

const adminCopy = {
  en: {
    title: 'Admin Control',
    subtitle: 'Root data is now test-only and excluded from rankings. Reset clears a player back to a clean account state and revokes active sessions.',
    searchPlaceholder: 'Search players to reset...',
    noUsers: 'No other players found.',
    resetAction: 'Reset User',
    deleteAction: 'Delete User',
    resetConfirm: 'Reset this player? Their stats, coins, inventory, sessions, and match records will be cleared.',
    deleteConfirm: 'Delete this user completely? This removes the account, sessions, and related match records.',
    resetSuccess: 'Player data was cleared.',
    deleteSuccess: 'User account was deleted.',
    resetFailed: 'Could not reset this player.',
    deleteFailed: 'Could not delete this user.',
    rootBadge: 'Root Admin',
    openShop: 'Open Shop',
    openBackpack: 'Open Backpack',
  },
  zh: {
    title: '管理员控制台',
    subtitle: 'root 数据现在只用于测试，不会进入排行榜。重置会把玩家恢复成干净账号，并注销该用户当前会话。',
    searchPlaceholder: '搜索要重置的玩家...',
    noUsers: '暂时没有其他玩家。',
    resetAction: '清除数据',
    deleteAction: '删除用户',
    resetConfirm: '确认重置这个玩家吗？他的积分、金币、背包、会话和比赛记录都会被清空。',
    deleteConfirm: '确认彻底删除这个用户吗？账号、会话和相关比赛记录都会被移除。',
    resetSuccess: '玩家数据已清除。',
    deleteSuccess: '用户已删除。',
    resetFailed: '清除玩家数据失败。',
    deleteFailed: '删除用户失败。',
    rootBadge: 'Root 管理员',
    openShop: '打开商店',
    openBackpack: '打开背包',
  },
} as const;

export default function Profile() {
  const { userProfile, logOut, theme, toggleTheme, language, setLanguage, syncProfile } = useAuth();
  const t = useTranslation(language);
  const adminUi = adminCopy[language];
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [selectedTrophy, setSelectedTrophy] = useState<TrophyType | null>(null);
  const [inventoryTab, setInventoryTab] = useState<InventoryTab>('trophies');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [shopProducts, setShopProducts] = useState<ShopProduct[]>([]);
  const [shopLoading, setShopLoading] = useState(false);
  const [inventoryBusy, setInventoryBusy] = useState(false);
  const [identityEditorOpen, setIdentityEditorOpen] = useState(false);
  const [identityBusy, setIdentityBusy] = useState(false);
  const [adminUsers, setAdminUsers] = useState<UserProfile[]>([]);
  const [adminSearch, setAdminSearch] = useState('');
  const [adminBusyUserId, setAdminBusyUserId] = useState<string | null>(null);
  const [adminBusyAction, setAdminBusyAction] = useState<'reset' | 'delete' | null>(null);

  useEffect(() => {
    setNewName(userProfile?.displayName ?? '');
  }, [userProfile?.displayName]);

  useEffect(() => {
    if (!userProfile) {
      return;
    }

    let active = true;

    const loadShopProducts = async () => {
      setShopLoading(true);
      try {
        const products = await listShopProducts();
        if (active) {
          setShopProducts(products);
        }
      } catch (error) {
        console.error('Failed to load shop products', error);
      } finally {
        if (active) {
          setShopLoading(false);
        }
      }
    };

    void loadShopProducts();

    return () => {
      active = false;
    };
  }, [userProfile?.uid]);

  useEffect(() => {
    if (!userProfile?.isRoot) {
      setAdminUsers([]);
      return;
    }

    let active = true;

    const loadAdminUsers = async () => {
      try {
        const profiles = await listProfiles(userProfile.uid);
        if (active) {
          setAdminUsers(profiles);
        }
      } catch (error) {
        console.error('Failed to load admin player list', error);
      }
    };

    void loadAdminUsers();

    return () => {
      active = false;
    };
  }, [userProfile?.uid, userProfile?.isRoot]);

  if (!userProfile) return null;

  const loadAdminUsers = async () => {
    if (!userProfile.isRoot) {
      return;
    }

    try {
      setAdminUsers(await listProfiles(userProfile.uid));
    } catch (error) {
      console.error('Failed to refresh admin player list', error);
    }
  };

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

  const handleSaveIdentity = async (values: {
    displayName: string;
    nickname: string;
    avatarUrl: string;
  }) => {
    setIdentityBusy(true);
    try {
      const updatedProfile = await updateProfileIdentity({
        displayName: values.displayName.trim(),
        nickname: values.nickname.trim(),
        avatarUrl: values.avatarUrl,
      });
      syncProfile(updatedProfile);
      setNewName(updatedProfile.displayName);
      setIdentityEditorOpen(false);
    } catch (error) {
      console.error('Failed to update profile identity', error);
      alert(error instanceof Error && error.message.trim() ? error.message : t('profile.renameFailed'));
    } finally {
      setIdentityBusy(false);
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

  const handlePurchaseProduct = async (productId: string) => {
    setInventoryBusy(true);
    try {
      const updatedProfile = await purchaseShopItem(productId);
      syncProfile(updatedProfile);
    } catch (error) {
      console.error('Failed to purchase shop item', error);
      alert(error instanceof Error ? error.message : 'Purchase failed.');
    } finally {
      setInventoryBusy(false);
    }
  };

  const handleAdminReset = async (targetUser: UserProfile) => {
    if (!window.confirm(adminUi.resetConfirm)) {
      return;
    }

    setAdminBusyUserId(targetUser.uid);
    setAdminBusyAction('reset');
    try {
      await adminResetUserProgress(targetUser.uid);
      await loadAdminUsers();
      alert(adminUi.resetSuccess);
    } catch (error) {
      console.error('Failed to reset player', error);
      alert(error instanceof Error && error.message.trim() ? error.message : adminUi.resetFailed);
    } finally {
      setAdminBusyUserId(null);
      setAdminBusyAction(null);
    }
  };

  const handleAdminDelete = async (targetUser: UserProfile) => {
    if (!window.confirm(adminUi.deleteConfirm)) {
      return;
    }

    setAdminBusyUserId(targetUser.uid);
    setAdminBusyAction('delete');
    try {
      await adminDeleteUser(targetUser.uid);
      await loadAdminUsers();
      alert(adminUi.deleteSuccess);
    } catch (error) {
      console.error('Failed to delete player', error);
      alert(error instanceof Error && error.message.trim() ? error.message : adminUi.deleteFailed);
    } finally {
      setAdminBusyUserId(null);
      setAdminBusyAction(null);
    }
  };

  const casualWinRate =
    userProfile.casualWins + userProfile.casualLosses > 0
      ? Math.round((userProfile.casualWins / (userProfile.casualWins + userProfile.casualLosses)) * 100)
      : 0;

  const filteredAdminUsers = useMemo(() => {
    const searchValue = adminSearch.trim().toLowerCase();
    if (!searchValue) {
      return adminUsers;
    }

    return adminUsers.filter((player) => {
      return (
        player.displayName.toLowerCase().includes(searchValue) ||
        player.nickname.toLowerCase().includes(searchValue)
      );
    });
  }, [adminSearch, adminUsers]);

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
                    setIdentityEditorOpen(true);
                  }}
                  className="text-zinc-500 hover:text-emerald-500 transition-colors p-1 shrink-0"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold uppercase tracking-widest">
                {userProfile.selectedTitle || t('profile.novicePlayer')}
              </div>
              {userProfile.isRoot ? (
                <div className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-amber-500">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {adminUi.rootBadge}
                </div>
              ) : null}
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
        <div className="flex items-center justify-between mb-4 gap-3">
          <h2 className={clsx('text-lg font-bold flex items-center gap-2', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
            <Trophy className="w-5 h-5 text-amber-500" /> {t('profile.showcase')}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setInventoryTab('shop');
                setIsInventoryOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-amber-500/10 px-4 py-2 text-amber-500 font-black text-sm"
            >
              <Coins className="w-4 h-4" />
              {userProfile.coins}
            </button>
            <button
              onClick={() => {
                setInventoryTab('trophies');
                setIsInventoryOpen(true);
              }}
              className="text-sm text-emerald-500 font-bold flex items-center gap-1 hover:text-emerald-400"
            >
              <Package className="w-4 h-4" /> {t('profile.backpack')}
            </button>
          </div>
        </div>

        <TrophyShowcaseCabinet
          language={language}
          theme={theme}
          slots={userProfile.showcase || []}
          trophies={userProfile.inventory?.trophies || []}
          onSelectTrophy={setSelectedTrophy}
          onEmptySlotClick={() => setIsInventoryOpen(true)}
        />
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

      {userProfile.isRoot ? (
        <section className={clsx('border rounded-[2rem] p-6 space-y-5', theme === 'dark' ? 'bg-zinc-900/60 border-amber-500/20' : 'bg-white border-amber-200 shadow-sm')}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-amber-500 mb-3">
                <ShieldAlert className="w-4 h-4" />
                {adminUi.title}
              </div>
              <h2 className={clsx('text-xl font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                {adminUi.title}
              </h2>
              <p className={clsx('text-sm mt-2 max-w-2xl leading-6', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600')}>
                {adminUi.subtitle}
              </p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={adminSearch}
              onChange={(event) => setAdminSearch(event.target.value)}
              placeholder={adminUi.searchPlaceholder}
              className={clsx(
                'w-full rounded-2xl border py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-amber-500/30',
                theme === 'dark'
                  ? 'bg-zinc-950 border-white/8 text-white placeholder:text-zinc-600'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400',
              )}
            />
          </div>

          <div className="space-y-3">
            {filteredAdminUsers.length === 0 ? (
              <div className="py-10 text-center text-zinc-500 font-medium">{adminUi.noUsers}</div>
            ) : (
              filteredAdminUsers.map((player) => (
                <div
                  key={player.uid}
                  className={clsx(
                    'rounded-2xl border p-4 flex items-center justify-between gap-4',
                    theme === 'dark' ? 'bg-zinc-950/70 border-white/6' : 'bg-zinc-50 border-zinc-200',
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={player.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.displayName)}&background=random`}
                      alt={player.displayName}
                      className="w-11 h-11 rounded-full shrink-0 object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <div className={clsx('font-black truncate', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                        {player.displayName}
                      </div>
                      <div className={clsx('text-xs font-medium mt-1 truncate', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
                        @{player.nickname} / {player.coins} coins / {player.rankedPoints} pts
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={() => void handleAdminReset(player)}
                      disabled={adminBusyUserId === player.uid}
                      className="inline-flex items-center gap-2 rounded-2xl bg-amber-500/10 px-4 py-3 text-amber-500 font-black hover:bg-amber-500 hover:text-zinc-950 transition-colors disabled:opacity-50"
                    >
                      <ShieldAlert className="w-4 h-4" />
                      {adminBusyUserId === player.uid && adminBusyAction === 'reset' ? '...' : adminUi.resetAction}
                    </button>
                    <button
                      onClick={() => void handleAdminDelete(player)}
                      disabled={adminBusyUserId === player.uid}
                      className="inline-flex items-center gap-2 rounded-2xl bg-red-500/10 px-4 py-3 text-red-500 font-black hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      {adminBusyUserId === player.uid && adminBusyAction === 'delete' ? '...' : adminUi.deleteAction}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}

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

              <div className="text-center text-[10px] text-zinc-600 font-medium">PingProPrivate v2.1.0</div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <ProfileInventorySheet
        open={isInventoryOpen}
        theme={theme}
        language={language}
        userProfile={userProfile}
        inventoryTab={inventoryTab}
        busy={inventoryBusy}
        shopLoading={shopLoading}
        shopProducts={shopProducts}
        onClose={() => setIsInventoryOpen(false)}
        onInventoryTabChange={setInventoryTab}
        onSelectTitle={(title) => void handleSelectTitle(title)}
        onPlaceTrophy={(slotId, trophyId) => void handlePlaceTrophy(slotId, trophyId)}
        onSelectTrophy={setSelectedTrophy}
        onPurchase={(productId) => void handlePurchaseProduct(productId)}
      />

      <ProfileIdentityEditor
        open={identityEditorOpen}
        theme={theme}
        language={language}
        initialDisplayName={userProfile.displayName}
        initialNickname={userProfile.nickname}
        initialAvatarUrl={userProfile.photoURL}
        busy={identityBusy}
        onClose={() => setIdentityEditorOpen(false)}
        onSave={(values) => void handleSaveIdentity(values)}
      />

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
              <PrizeIcon rank={selectedTrophy.rank} className="w-36 h-36 mx-auto mb-8" />
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
