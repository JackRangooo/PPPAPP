import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, Check, Loader2, Trophy, X } from 'lucide-react';
import { motion } from 'motion/react';
import clsx from 'clsx';

import { useAuth } from '../App';
import { changeMatchStatus, fetchMatch, submitMatchScore } from '../lib/api';
import { subscribeToTable } from '../lib/supabase';
import type { Match } from '../types';
import { useTranslation } from '../i18n';

export default function MatchDetails() {
  const { id } = useParams();
  const { userProfile, theme, language } = useAuth();
  const t = useTranslation(language);
  const navigate = useNavigate();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [myScore, setMyScore] = useState<number | ''>('');
  const [opponentScore, setOpponentScore] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id || !userProfile) return;

    const loadMatch = async () => {
      try {
        const currentMatch = await fetchMatch(id);
        if (!currentMatch) {
          navigate('/');
          return;
        }
        setMatch(currentMatch);
      } catch (error) {
        console.error('Failed to load match', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    void loadMatch();
    return subscribeToTable('matches', () => {
      void loadMatch();
    });
  }, [id, navigate, userProfile]);

  if (loading || !match || !userProfile) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const isPlayer1 = match.player1Id === userProfile.uid;
  const opponentName = isPlayer1 ? match.player2Name : match.player1Name;
  const opponentPhoto = isPlayer1 ? match.player2Photo : match.player1Photo;
  const myConfirmed = isPlayer1 ? match.player1Confirmed : match.player2Confirmed;
  const opponentConfirmed = isPlayer1 ? match.player2Confirmed : match.player1Confirmed;

  const handleAction = async (action: 'accept' | 'decline' | 'cancel') => {
    setSubmitting(true);
    try {
      setMatch(await changeMatchStatus(match.id, action));
    } catch (error) {
      console.error('Error updating match', error);
      alert(t('match.updateFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitScore = async () => {
    if (myScore === '' || opponentScore === '') {
      alert(t('match.enterBothScores'));
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitMatchScore(match.id, Number(myScore), Number(opponentScore));
      setMatch(result.match);

      if (result.result === 'completed') {
        alert(t('match.matchCompletedAlert'));
        navigate('/');
        return;
      }

      if (result.result === 'reset') {
        setMyScore('');
        setOpponentScore('');
        alert(t('match.scoresMismatch'));
        return;
      }

      alert(t('match.scoreSubmittedAlert'));
    } catch (error) {
      console.error('Error submitting score', error);
      alert(t('match.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <header className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className={clsx(
            'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
            theme === 'dark'
              ? 'bg-zinc-900 text-zinc-400 hover:text-white'
              : 'bg-white text-zinc-500 hover:text-zinc-900 shadow-sm border border-zinc-200',
          )}
        >
          <X className="w-5 h-5" />
        </button>
        <div>
          <h1 className={clsx('text-2xl font-bold tracking-tight mb-1', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
            {t('match.details')}
          </h1>
          <div className="text-sm font-medium uppercase tracking-wider text-emerald-500">{t(`match.status.${match.status}`)}</div>
        </div>
      </header>

      <div className={clsx('border rounded-3xl p-8 relative overflow-hidden flex flex-col items-center justify-center', theme === 'dark' ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-zinc-200 shadow-sm')}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#064e3b_0%,_transparent_70%)] opacity-20" />

        <div className="flex items-center justify-between w-full relative z-10 gap-4">
          <div className="flex flex-col items-center gap-3 min-w-0 flex-1">
            <img
              src={userProfile.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.displayName)}&background=random`}
              alt="You"
              className={clsx('w-20 h-20 rounded-full border-4 shadow-xl', theme === 'dark' ? 'border-zinc-950' : 'border-white')}
              referrerPolicy="no-referrer"
            />
            <div className={clsx('font-bold text-lg text-center', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
              {t('match.you')}
            </div>
          </div>

          <div className={clsx('text-3xl font-black italic px-4', theme === 'dark' ? 'text-zinc-700' : 'text-zinc-300')}>VS</div>

          <div className="flex flex-col items-center gap-3 min-w-0 flex-1">
            <img
              src={opponentPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(opponentName)}&background=random`}
              alt={opponentName}
              className={clsx('w-20 h-20 rounded-full border-4 shadow-xl', theme === 'dark' ? 'border-zinc-950' : 'border-white')}
              referrerPolicy="no-referrer"
            />
            <div className={clsx('font-bold text-lg text-center', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
              {opponentName}
            </div>
          </div>
        </div>
      </div>

      {match.status === 'pending' ? (
        <div className={clsx('border rounded-2xl p-6 text-center', theme === 'dark' ? 'bg-zinc-900/30 border-white/5' : 'bg-white border-zinc-200 shadow-sm')}>
          {isPlayer1 ? (
            <>
              <p className={clsx('mb-6 font-medium', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500')}>
                {t('match.waitingFor', { name: opponentName })}
              </p>
              <button
                onClick={() => void handleAction('cancel')}
                disabled={submitting}
                className="w-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white py-4 rounded-xl font-bold transition-colors"
              >
                {t('match.cancelChallenge')}
              </button>
            </>
          ) : (
            <>
              <p className={clsx('mb-6 font-medium', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500')}>
                {t('match.challengedYou', { name: match.player1Name })}
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => void handleAction('decline')}
                  disabled={submitting}
                  className={clsx('flex-1 py-4 rounded-xl font-bold transition-colors', theme === 'dark' ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200')}
                >
                  {t('match.decline')}
                </button>
                <button
                  onClick={() => void handleAction('accept')}
                  disabled={submitting}
                  className="flex-1 bg-emerald-500 text-zinc-950 hover:bg-emerald-400 py-4 rounded-xl font-bold transition-colors"
                >
                  {t('match.accept')}
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {match.status === 'ongoing' ? (
        <div className={clsx('border rounded-3xl p-6', theme === 'dark' ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-zinc-200 shadow-sm')}>
          <h2 className={clsx('text-xl font-bold mb-6 text-center flex items-center justify-center gap-2', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
            <Trophy className="w-6 h-6 text-emerald-500" /> {t('match.recordScore')}
          </h2>

          {myConfirmed ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-500" />
              </div>
              <p className={clsx('font-medium text-lg mb-2', theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700')}>
                {t('match.scoreSubmitted')}
              </p>
              <p className={clsx(theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
                {t('match.waitingForConfirm', { name: opponentName })}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {opponentConfirmed ? (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3 text-amber-600">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{t('match.opponentSubmitted', { name: opponentName })}</p>
                </div>
              ) : null}

              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <label className="block text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">{t('match.yourScore')}</label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={myScore}
                    onChange={(event) => setMyScore(event.target.value === '' ? '' : Number(event.target.value))}
                    className={clsx('w-24 h-24 border-2 rounded-2xl text-center text-4xl font-black focus:border-emerald-500 focus:outline-none transition-colors', theme === 'dark' ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900')}
                  />
                </div>
                <div className={clsx('text-3xl font-black mt-8', theme === 'dark' ? 'text-zinc-700' : 'text-zinc-300')}>-</div>
                <div className="text-center">
                  <label className="block text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">{t('match.theirScore')}</label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={opponentScore}
                    onChange={(event) => setOpponentScore(event.target.value === '' ? '' : Number(event.target.value))}
                    className={clsx('w-24 h-24 border-2 rounded-2xl text-center text-4xl font-black focus:border-emerald-500 focus:outline-none transition-colors', theme === 'dark' ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900')}
                  />
                </div>
              </div>

              <button
                onClick={() => void handleSubmitScore()}
                disabled={submitting}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 py-4 rounded-xl font-bold text-lg transition-colors mt-8"
              >
                {submitting ? t('match.submitting') : t('match.submitVerify')}
              </button>
            </div>
          )}
        </div>
      ) : null}

      {match.status === 'completed' ? (
        <div className={clsx('border rounded-3xl p-8 text-center', theme === 'dark' ? 'bg-zinc-900/50 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200 shadow-sm')}>
          <Trophy className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className={clsx('text-2xl font-bold mb-2', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
            {t('match.matchCompleted')}
          </h2>
          <div className="text-4xl font-black text-emerald-500 tracking-tighter mb-6">
            {isPlayer1 ? match.player1Score : match.player2Score} - {isPlayer1 ? match.player2Score : match.player1Score}
          </div>
          <p className={clsx('font-medium', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-600')}>
            {match.winnerId === userProfile.uid ? t('match.victory') : t('match.defeat')}
          </p>
        </div>
      ) : null}

      {match.status === 'declined' || match.status === 'cancelled' ? (
        <div className={clsx('border rounded-2xl p-8 text-center', theme === 'dark' ? 'bg-zinc-900/30 border-white/5' : 'bg-white border-zinc-200 shadow-sm')}>
          <p className="text-zinc-500 font-medium text-lg">{t('match.wasStatus', { status: t(`match.status.${match.status}`) })}</p>
        </div>
      ) : null}
    </motion.div>
  );
}
