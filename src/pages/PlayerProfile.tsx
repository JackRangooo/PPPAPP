import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Activity, ArrowLeft, Star, Trophy } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import clsx from 'clsx';

import { useAuth } from '../App';
import PrizeIcon from '../components/PrizeIcon';
import TrophyShowcaseCabinet from '../components/TrophyShowcaseCabinet';
import { fetchPlayerProfile } from '../lib/api';
import { getCompetitiveDivision } from '../lib/competitiveRank';
import { subscribeToTable } from '../lib/supabase';
import type { Trophy as TrophyType, UserProfile } from '../types';
import { useTranslation } from '../i18n';

export default function PlayerProfile() {
  const { uid } = useParams();
  const navigate = useNavigate();
  const { theme, language } = useAuth();
  const t = useTranslation(language);
  const [player, setPlayer] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTrophy, setSelectedTrophy] = useState<TrophyType | null>(null);

  useEffect(() => {
    if (!uid) return;

    const loadPlayer = async () => {
      try {
        setPlayer(await fetchPlayerProfile(uid));
      } catch (error) {
        console.error('Failed to load player', error);
      } finally {
        setLoading(false);
      }
    };

    void loadPlayer();
    return subscribeToTable(
      'profiles',
      () => {
        void loadPlayer();
      },
      `id=eq.${uid}`,
    );
  }, [uid]);

  if (loading) return <div className="text-center py-12 text-zinc-500 font-medium">{t('leaderboard.loading')}</div>;
  if (!player) return <div className="text-center py-12 text-zinc-500 font-medium">{t('profile.playerNotFound')}</div>;

  const casualWinRate =
    player.casualWins + player.casualLosses > 0
      ? Math.round((player.casualWins / (player.casualWins + player.casualLosses)) * 100)
      : 0;
  const division = getCompetitiveDivision(player.casualStars, language);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-12">
      <header className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className={clsx(
            'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
            theme === 'dark'
              ? 'bg-zinc-900/50 text-zinc-400 hover:text-white'
              : 'bg-white text-zinc-500 hover:text-zinc-900 shadow-sm border border-zinc-200',
          )}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className={clsx('text-xl font-bold', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
          {t('profile.playerProfile')}
        </h1>
      </header>

      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative shrink-0">
            <img
              src={player.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.displayName)}&background=random`}
              alt={player.displayName}
              className={clsx('w-20 h-20 rounded-full border-4 object-cover object-center shadow-xl', theme === 'dark' ? 'border-zinc-900' : 'border-white')}
              referrerPolicy="no-referrer"
            />
            <div className={clsx('absolute -bottom-1 -right-1 bg-emerald-500 text-zinc-950 p-1 rounded-full border-2', theme === 'dark' ? 'border-zinc-950' : 'border-white')}>
              <Star className="w-4 h-4 fill-current" />
            </div>
          </div>
          <div className="min-w-0">
            <h2 className={clsx('mb-1 truncate text-2xl font-bold', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
              {player.displayName}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-block rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-500">
                {player.selectedTitle || t('profile.novicePlayer')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="relative">
        <h2 className={clsx('text-lg font-bold mb-4 flex items-center gap-2', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
          <Trophy className="w-5 h-5 text-amber-500" /> {t('profile.trophyShowcase')}
        </h2>

        <TrophyShowcaseCabinet
          language={language}
          theme={theme}
          slots={player.showcase || []}
          trophies={player.inventory?.trophies || []}
          displayMode="badge"
          onSelectTrophy={setSelectedTrophy}
        />
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className={clsx('border rounded-3xl p-5', theme === 'dark' ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-zinc-200 shadow-sm')}>
          <div className="mb-4 flex items-center gap-2 text-emerald-500">
            <Star className="w-4 h-4 fill-current" />
            <span className="text-xs font-bold uppercase tracking-wider">{t('profile.casualStats')}</span>
          </div>
          <div className={clsx('text-3xl font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
            {player.casualStars} <span className={clsx('text-sm font-medium', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400')}>{t('leaderboard.stars')}</span>
          </div>
          <div className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-amber-500">
            {t('profile.division')}: {division.title}
          </div>
          <div className={clsx('text-xs font-medium mt-1', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
            {player.casualWins}W - {player.casualLosses}L ({casualWinRate}%)
          </div>
          <div className={clsx('text-xs font-medium mt-1', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
            {division.shielded
              ? t('profile.starShieldOn')
              : division.nextStars === null
                ? t('profile.topDivision')
                : t('profile.nextDivision', { count: String(division.starsRemaining), name: division.nextTitle })}
          </div>
        </div>

        <div className={clsx('border rounded-3xl p-5', theme === 'dark' ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-zinc-200 shadow-sm')}>
          <div className="flex items-center gap-2 text-amber-500 mb-4">
            <Activity className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">{t('profile.rankedStats')}</span>
          </div>
          <div className={clsx('text-3xl font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
            {player.rankedPoints} <span className={clsx('text-sm font-medium', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400')}>{t('leaderboard.points')}</span>
          </div>
          <div className={clsx('text-xs font-medium mt-1', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
            {t('profile.avgRank')}: #{player.averageRank || '-'}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedTrophy ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTrophy(null)}
              className={clsx('fixed inset-0 backdrop-blur-xl', theme === 'dark' ? 'bg-black/90' : 'bg-white/80')}
            />
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
    </motion.div>
  );
}
