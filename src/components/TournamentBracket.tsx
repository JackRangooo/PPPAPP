import clsx from 'clsx';

import type { Language, Theme, TournamentBracketMatch } from '../types';
import { getTournamentMatchStatusTone } from '../lib/tournamentBracket';

const stageHeadings = {
  en: {
    quarterfinal: 'Quarterfinals',
    semifinal: 'Semifinals',
    final: 'Grand Final',
    third_place: 'Third Place',
  },
  zh: {
    quarterfinal: '四分之一决赛',
    semifinal: '半决赛',
    final: '决赛',
    third_place: '季军赛',
  },
} as const;

const statusLabels = {
  en: {
    waiting: 'Waiting',
    ready: 'Ready',
    waiting_confirmation: 'Awaiting Confirmation',
    completed: 'Completed',
    walkover: 'Walkover',
    unknown: 'TBD',
  },
  zh: {
    waiting: '待定',
    ready: '待开赛',
    waiting_confirmation: '待确认',
    completed: '已结束',
    walkover: '轮空/退赛',
    unknown: '待定',
  },
} as const;

type TournamentBracketProps = {
  matches: TournamentBracketMatch[];
  selectedMatchId: string | null;
  currentUserId: string | null;
  theme: Theme;
  language: Language;
  onSelectMatch: (match: TournamentBracketMatch) => void;
};

const toneClasses: Record<string, string> = {
  emerald: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300',
  amber: 'border-amber-500/35 bg-amber-500/10 text-amber-300',
  sky: 'border-sky-500/35 bg-sky-500/10 text-sky-300',
  zinc: 'border-white/10 bg-white/5 text-zinc-300',
};

const getStageOrder = (matches: TournamentBracketMatch[]) => {
  const hasQuarterfinals = matches.some((match) => match.stage === 'quarterfinal');
  return hasQuarterfinals
    ? ['quarterfinal', 'semifinal', 'final', 'third_place']
    : ['semifinal', 'final', 'third_place'];
};

const getPlayerLabel = (
  match: TournamentBracketMatch,
  slot: 1 | 2,
  labels: { unknown: string },
) => {
  const id = slot === 1 ? match.player1Id : match.player2Id;
  const name = slot === 1 ? match.player1Name : match.player2Name;
  const source = slot === 1 ? match.player1Source : match.player2Source;

  if (id && name) {
    return name;
  }

  return source ?? labels.unknown;
};

export default function TournamentBracket({
  matches,
  selectedMatchId,
  currentUserId,
  theme,
  language,
  onSelectMatch,
}: TournamentBracketProps) {
  const labels = statusLabels[language];
  const headings = stageHeadings[language];
  const stageOrder = getStageOrder(matches);

  return (
    <div className="overflow-x-auto pb-2">
      <div className="min-w-[920px] flex gap-5 items-start">
        {stageOrder.map((stage) => {
          const stageMatches = matches.filter((match) => match.stage === stage).sort((left, right) => left.slot - right.slot);
          if (stageMatches.length === 0) {
            return null;
          }

          return (
            <section key={stage} className="flex-1 min-w-[210px] space-y-4">
              <div>
                <h3 className={clsx('text-xs font-black uppercase tracking-[0.18em]', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
                  {headings[stage]}
                </h3>
              </div>

              <div className={clsx('space-y-4', stage === 'final' ? 'pt-12' : stage === 'third_place' ? 'pt-24' : '')}>
                {stageMatches.map((match) => {
                  const tone = getTournamentMatchStatusTone(match.status);
                  const isSelected = selectedMatchId === match.id;
                  const isMine = currentUserId && (match.player1Id === currentUserId || match.player2Id === currentUserId);
                  const player1Label = getPlayerLabel(match, 1, labels);
                  const player2Label = getPlayerLabel(match, 2, labels);

                  return (
                    <button
                      key={match.id}
                      type="button"
                      onClick={() => onSelectMatch(match)}
                      className={clsx(
                        'w-full rounded-[1.6rem] border p-4 text-left transition-all',
                        theme === 'dark'
                          ? 'bg-zinc-900/75 hover:bg-zinc-900 border-white/10'
                          : 'bg-white hover:bg-zinc-50 border-zinc-200 shadow-sm',
                        isSelected && (theme === 'dark' ? 'ring-2 ring-emerald-500/60 border-emerald-500/40' : 'ring-2 ring-emerald-500/40 border-emerald-400'),
                      )}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className={clsx('text-sm font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                            {match.label}
                          </div>
                          <div className={clsx('text-[11px] font-semibold mt-1', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
                            BO{match.bestOf}
                          </div>
                        </div>
                        <div className={clsx('rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em]', toneClasses[tone])}>
                          {labels[match.status]}
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        {[1, 2].map((slot) => {
                          const label = slot === 1 ? player1Label : player2Label;
                          const id = slot === 1 ? match.player1Id : match.player2Id;
                          const score = slot === 1 ? match.player1Score : match.player2Score;
                          const isWinner = match.winnerId && match.winnerId === id;
                          const slotIsMine = currentUserId && id === currentUserId;

                          return (
                            <div
                              key={slot}
                              className={clsx(
                                'rounded-2xl border px-3 py-3 flex items-center justify-between gap-3',
                                theme === 'dark' ? 'border-white/5 bg-zinc-950/70' : 'border-zinc-100 bg-zinc-50',
                                isWinner && (theme === 'dark' ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-emerald-300 bg-emerald-50'),
                              )}
                            >
                              <div className="min-w-0">
                                <div className={clsx('font-bold truncate', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                                  {label}
                                </div>
                                {slotIsMine ? (
                                  <div className="text-[11px] font-semibold text-emerald-500 mt-0.5">
                                    {language === 'zh' ? '你' : 'You'}
                                  </div>
                                ) : null}
                              </div>
                              <div className={clsx('text-xl font-black shrink-0', theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700')}>
                                {typeof score === 'number' ? score : '-'}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {isMine ? (
                        <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-500">
                          {language === 'zh' ? '你的比赛' : 'Your match'}
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}


