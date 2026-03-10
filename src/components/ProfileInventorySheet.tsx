import { Check as CheckIcon, Coins, Info, Package, ShoppingBag, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import clsx from 'clsx';

import TrophyBadge from './TrophyBadge';
import type { InventoryItem, Language, ShopProduct, Theme, Trophy as TrophyType, UserProfile } from '../types';

export type InventoryTab = 'trophies' | 'titles' | 'items' | 'shop';

type ProfileInventorySheetProps = {
  open: boolean;
  theme: Theme;
  language: Language;
  userProfile: UserProfile;
  inventoryTab: InventoryTab;
  busy: boolean;
  shopLoading: boolean;
  shopProducts: ShopProduct[];
  onClose: () => void;
  onInventoryTabChange: (tab: InventoryTab) => void;
  onSelectTitle: (title: string) => void;
  onPlaceTrophy: (slotId: number, trophyId: string | null) => void;
  onSelectTrophy: (trophy: TrophyType) => void;
  onPurchase: (productId: string) => void;
};

const copy = {
  en: {
    backpack: 'Backpack',
    trophies: 'Trophies',
    titles: 'Titles',
    items: 'Items',
    shop: 'Shop',
    winToEarn: 'Win tournaments to earn trophies.',
    noItems: 'Bought cards and items will appear here.',
    noShopItems: 'No products are live in the shop yet.',
    remove: 'Remove',
    display: 'Display',
    showcaseFull: 'Showcase is full. Remove a trophy first.',
    buy: 'Buy',
    owned: 'Owned',
    coins: 'Coins',
    shopHint: 'Build your bag now. Gameplay effects can be wired in later.',
    comingSoon: 'Effect coming later',
  },
  zh: {
    backpack: '背包',
    trophies: '奖杯',
    titles: '称号',
    items: '道具',
    shop: '商店',
    winToEarn: '赢下锦标赛即可获得奖杯。',
    noItems: '购买后的技能卡和道具会显示在这里。',
    noShopItems: '商店里暂时还没有上架商品。',
    remove: '取下',
    display: '展示',
    showcaseFull: '展示柜已满，请先取下一个奖杯。',
    buy: '购买',
    owned: '拥有',
    coins: '金币',
    shopHint: '先把道具买进背包，具体效果会在后续版本接入。',
    comingSoon: '效果后续开放',
  },
} as const;

const kindLabels = {
  en: {
    card: 'Card',
  },
  zh: {
    card: '技能卡',
  },
} as const;

const productLocalization = {
  select_card: {
    en: {
      name: 'Self-Select Card',
      description: 'Choose your first-round opponent in a future tournament. This version only supports buying and storing it.',
      effectHint: 'Future: choose a first-round opponent',
    },
    zh: {
      name: '自选卡',
      description: '未来可在锦标赛中指定第一轮对手。当前版本仅支持购买和入库，效果暂未开放。',
      effectHint: '未来可指定第一轮对手',
    },
  },
} as const;

const getOwnedQuantity = (items: InventoryItem[], productId: string) => {
  const item = items.find((currentItem) => currentItem.productId === productId);
  return item?.quantity ?? 0;
};

const getLocalizedItemContent = (
  item: Pick<InventoryItem, 'productId' | 'name' | 'description' | 'kind' | 'effectHint'>,
  language: Language,
) => {
  const localized = productLocalization[item.productId as keyof typeof productLocalization]?.[language];

  return {
    name: localized?.name ?? item.name,
    description: localized?.description ?? item.description,
    effectHint: localized?.effectHint ?? item.effectHint,
    kindLabel: kindLabels[language][item.kind] ?? item.kind,
  };
};

export default function ProfileInventorySheet({
  open,
  theme,
  language,
  userProfile,
  inventoryTab,
  busy,
  shopLoading,
  shopProducts,
  onClose,
  onInventoryTabChange,
  onSelectTitle,
  onPlaceTrophy,
  onSelectTrophy,
  onPurchase,
}: ProfileInventorySheetProps) {
  const ui = copy[language];
  const priceUnit = language === 'zh' ? '金币' : 'coins';

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/80 backdrop-blur-md" />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className={clsx('relative w-full max-w-2xl rounded-t-[40px] p-8 max-h-[86vh] overflow-y-auto', theme === 'dark' ? 'bg-zinc-900' : 'bg-white')}
          >
            <div className="flex items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <Package className="w-6 h-6 text-emerald-500" />
                </div>
                <div>
                  <h2 className={clsx('text-2xl font-bold', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                    {ui.backpack}
                  </h2>
                  <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-amber-500">
                    <Coins className="w-4 h-4" />
                    {userProfile.coins} {ui.coins}
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="text-zinc-500 hover:text-emerald-500">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {([
                ['trophies', ui.trophies],
                ['titles', ui.titles],
                ['items', ui.items],
                ['shop', ui.shop],
              ] as const).map(([tabId, label]) => (
                <button
                  key={tabId}
                  onClick={() => onInventoryTabChange(tabId)}
                  className={clsx(
                    'py-3 rounded-xl font-bold transition-all',
                    inventoryTab === tabId
                      ? theme === 'dark'
                        ? 'bg-white text-zinc-950'
                        : 'bg-zinc-900 text-white'
                      : theme === 'dark'
                        ? 'bg-zinc-800 text-zinc-500'
                        : 'bg-zinc-100 text-zinc-500',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {inventoryTab === 'trophies' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(userProfile.inventory?.trophies || []).map((currentTrophy) => (
                  <div
                    key={currentTrophy.id}
                    className={clsx(
                      'border rounded-2xl p-4 flex flex-col gap-4',
                      theme === 'dark' ? 'bg-zinc-950 border-white/5' : 'bg-zinc-50 border-zinc-200',
                    )}
                  >
                    <div className="h-44">
                      <TrophyBadge trophy={currentTrophy} theme={theme} language={language} />
                    </div>

                    <div className="flex gap-2 w-full">
                      <button
                        onClick={() => onSelectTrophy(currentTrophy)}
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
                            onPlaceTrophy(currentSlot.slotId, null);
                            return;
                          }

                          const emptySlot = (userProfile.showcase || []).find((slot) => !slot.trophyId);
                          if (emptySlot) {
                            onPlaceTrophy(emptySlot.slotId, currentTrophy.id);
                          } else {
                            window.alert(ui.showcaseFull);
                          }
                        }}
                        className={clsx(
                          'flex-1 p-2 rounded-lg font-bold text-[10px] uppercase',
                          (userProfile.showcase || []).some((slot) => slot.trophyId === currentTrophy.id)
                            ? 'bg-red-500/10 text-red-500'
                            : 'bg-emerald-500/10 text-emerald-500',
                        )}
                      >
                        {(userProfile.showcase || []).some((slot) => slot.trophyId === currentTrophy.id) ? ui.remove : ui.display}
                      </button>
                    </div>
                  </div>
                ))}

                {(!userProfile.inventory?.trophies || userProfile.inventory.trophies.length === 0) ? (
                  <div className="col-span-full py-12 text-center text-zinc-500 font-medium">{ui.winToEarn}</div>
                ) : null}
              </div>
            ) : null}

            {inventoryTab === 'titles' ? (
              <div className="space-y-3">
                {(userProfile.inventory?.titles || []).map((title) => (
                  <button
                    key={title}
                    onClick={() => onSelectTitle(title)}
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
            ) : null}

            {inventoryTab === 'items' ? (
              <div className="space-y-3">
                {(userProfile.inventory?.items || []).map((item) => {
                  const content = getLocalizedItemContent(item, language);

                  return (
                    <div
                      key={item.productId}
                      className={clsx(
                        'rounded-2xl border p-4 flex items-start justify-between gap-4',
                        theme === 'dark' ? 'bg-zinc-950 border-white/5' : 'bg-zinc-50 border-zinc-200',
                      )}
                    >
                      <div className="min-w-0">
                        <div className={clsx('font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                          {content.name}
                        </div>
                        <div className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-500">
                          {content.kindLabel}
                        </div>
                        <div className={clsx('text-sm mt-2 leading-6', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600')}>
                          {content.description}
                        </div>
                        <div className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-500">
                          {content.effectHint || ui.comingSoon}
                        </div>
                      </div>
                      <div className={clsx('rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em]', theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600')}>
                        x{item.quantity}
                      </div>
                    </div>
                  );
                })}

                {(!userProfile.inventory?.items || userProfile.inventory.items.length === 0) ? (
                  <div className="py-12 text-center text-zinc-500 font-medium">{ui.noItems}</div>
                ) : null}
              </div>
            ) : null}

            {inventoryTab === 'shop' ? (
              <div className="space-y-4">
                <div className={clsx('rounded-2xl border p-4 text-sm font-medium', theme === 'dark' ? 'bg-zinc-950/70 border-white/5 text-zinc-400' : 'bg-zinc-50 border-zinc-200 text-zinc-600')}>
                  {ui.shopHint}
                </div>

                {shopLoading ? (
                  <div className="py-12 text-center text-zinc-500 font-medium">...</div>
                ) : shopProducts.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 font-medium">{ui.noShopItems}</div>
                ) : (
                  <div className="space-y-4">
                    {shopProducts.map((product) => {
                      const owned = getOwnedQuantity(userProfile.inventory?.items || [], product.id);
                      const canAfford = userProfile.coins >= product.priceCoins;
                      const content = getLocalizedItemContent(
                        {
                          productId: product.id,
                          name: product.name,
                          description: product.description,
                          kind: product.kind,
                          effectHint: product.effectHint,
                        },
                        language,
                      );

                      return (
                        <div
                          key={product.id}
                          className={clsx(
                            'rounded-[1.75rem] border p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between',
                            theme === 'dark' ? 'bg-zinc-950 border-white/5' : 'bg-zinc-50 border-zinc-200',
                          )}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                <ShoppingBag className="w-6 h-6" />
                              </div>
                              <div>
                                <div className={clsx('font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                                  {content.name}
                                </div>
                                <div className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-500">
                                  {content.kindLabel}
                                </div>
                              </div>
                            </div>

                            <div className={clsx('text-sm mt-4 leading-6', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600')}>
                              {content.description}
                            </div>
                            <div className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-500">
                              {content.effectHint || ui.comingSoon}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className={clsx('rounded-full px-3 py-2 text-xs font-black uppercase tracking-[0.16em]', theme === 'dark' ? 'bg-zinc-800 text-zinc-300' : 'bg-white text-zinc-700 border border-zinc-200')}>
                              {ui.owned} {owned}
                            </div>
                            <button
                              onClick={() => onPurchase(product.id)}
                              disabled={busy || !canAfford}
                              className={clsx(
                                'rounded-2xl px-5 py-3 font-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                                canAfford ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950' : 'bg-zinc-700 text-zinc-300',
                              )}
                            >
                              {ui.buy} {product.priceCoins} {priceUnit}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
