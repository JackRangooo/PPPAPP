import clsx from 'clsx';

import type { Language, Theme, TournamentBracketMatch } from '../types';
import { getTournamentMatchStatusTone } from '../lib/tournamentBracket';

const stageHeadings = {
  en: {
    quarterfinal: {
      full: 'Quarterfinals',
      compact: 'Qualifiers',
    },
    semifinal: 'Semifinals',
    final: 'Grand Final',
    third_place: 'Third Place Match',
    feedHint: 'Losers of both semifinals drop here.',
  },
  zh: {
    quarterfinal: {
      full: '四分之一决赛',
      compact: '晋级赛',
    },
    semifinal: '半决赛',
    final: '决赛',
    third_place: '季军赛',
    feedHint: '两场半决赛的败者会在这里争夺季军。',
  },
} as const;

const statusLabels = {
  en: {
    waiting: 'Waiting',
    pending: 'Ready Check',
    ongoing: 'Live',
    waiting_confirmation: 'Pending',
    completed: 'Done',
    walkover: 'Walkover',
    unknown: 'TBD',
    you: 'You',
    yourMatch: 'Your Match',
  },
  zh: {
    waiting: '待定',
    pending: '待就绪',
    ongoing: '进行中',
    waiting_confirmation: '待确认',
    completed: '已结束',
    walkover: '轮空',
    unknown: '待定',
    you: '你',
    yourMatch: '你的比赛',
  },
} as const;

const toneClasses: Record<string, string> = {
  emerald: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300',
  amber: 'border-amber-500/35 bg-amber-500/10 text-amber-300',
  sky: 'border-sky-500/35 bg-sky-500/10 text-sky-300',
  zinc: 'border-white/10 bg-white/5 text-zinc-300',
};

const CARD_WIDTH = 220;
const CARD_HEIGHT = 110;
const COLUMN_GAP = 48;
const ROW_GAP = 12;
const MAIN_ROW_COUNT = 8;

const rowMap: Record<'quarterfinal' | 'semifinal' | 'final', Record<number, number>> = {
  quarterfinal: {
    1: 1,
    2: 3,
    3: 5,
    4: 7,
  },
  semifinal: {
    1: 2,
    2: 6,
  },
  final: {
    1: 4,
  },
};

type TournamentBracketProps = {
  matches: TournamentBracketMatch[];
  selectedMatchId: string | null;
  currentUserId: string | null;
  theme: Theme;
  language: Language;
  onSelectMatch: (match: TournamentBracketMatch) => void;
};

type MainStage = 'quarterfinal' | 'semifinal' | 'final';

const getMainStages = (matches: TournamentBracketMatch[]): MainStage[] => {
  return matches.some((match) => match.stage === 'quarterfinal')
    ? ['quarterfinal', 'semifinal', 'final']
    : ['semifinal', 'final'];
};

const getMainHeading = (
  language: Language,
  stage: MainStage,
  matchCount: number,
) => {
  if (stage === 'quarterfinal') {
    return matchCount === 4
      ? stageHeadings[language].quarterfinal.full
      : stageHeadings[language].quarterfinal.compact;
  }

  return stageHeadings[language][stage];
};

const compactPlayerName = (name: string, maxLength = 10) => {
  if (name.length <= maxLength) {
    return name;
  }

  return `${name.slice(0, maxLength - 1)}…`;
};

const getPlayerIdentity = (
  match: TournamentBracketMatch,
  slot: 1 | 2,
  labels: { unknown: string },
) => {
  const id = slot === 1 ? match.player1Id : match.player2Id;
  const name = slot === 1 ? match.player1Name : match.player2Name;
  const source = slot === 1 ? match.player1Source : match.player2Source;
  const avatarUrl = slot === 1 ? match.player1AvatarUrl : match.player2AvatarUrl;
  const score = slot === 1 ? match.player1Score : match.player2Score;

  if (id && name) {
    return {
      id,
      name,
      displayLabel: compactPlayerName(name),
      helperText: source ?? name,
      avatarUrl,
      score,
    };
  }

  return {
    id: null,
    name: source ?? labels.unknown,
    displayLabel: labels.unknown,
    helperText: source ?? labels.unknown,
    avatarUrl: '',
    score,
  };
};

const getConnectorMetrics = (
  mainStages: readonly MainStage[],
  stage: MainStage,
  slot: number,
) => {
  const columnIndex = mainStages.indexOf(stage);
  const row = rowMap[stage][slot];
  const x = columnIndex * (CARD_WIDTH + COLUMN_GAP);
  const y = (row - 1) * (CARD_HEIGHT + ROW_GAP);

  return {
    x,
    y,
    centerY: y + CARD_HEIGHT / 2,
    leftX: x,
    rightX: x + CARD_WIDTH,
  };
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
  const mainStages = getMainStages(matches);
  const thirdPlaceMatch = matches.find((match) => match.stage === 'third_place') ?? null;

  const mainMatches = matches
    .filter((match): match is TournamentBracketMatch & { stage: 'quarterfinal' | 'semifinal' | 'final' } => match.stage !== 'third_place')
    .sort((left, right) => {
      const stageDelta = mainStages.indexOf(left.stage) - mainStages.indexOf(right.stage);
      if (stageDelta !== 0) {
        return stageDelta;
      }

      return left.slot - right.slot;
    });

  const matchById = Object.fromEntries(mainMatches.map((match) => [match.id, match]));
  const treeHeight = MAIN_ROW_COUNT * CARD_HEIGHT + (MAIN_ROW_COUNT - 1) * ROW_GAP;
  const treeWidth = mainStages.length * CARD_WIDTH + (mainStages.length - 1) * COLUMN_GAP;

  const connectors = mainMatches
    .map((match) => {
      if (!match.nextMatchId) {
        return null;
      }

      const nextMatch = matchById[match.nextMatchId];
      if (!nextMatch) {
        return null;
      }

      const from = getConnectorMetrics(mainStages, match.stage, match.slot);
      const to = getConnectorMetrics(mainStages, nextMatch.stage, nextMatch.slot);
      const elbowX = from.rightX + COLUMN_GAP / 2;

      return {
        id: `${match.id}-${nextMatch.id}`,
        d: `M ${from.rightX} ${from.centerY} H ${elbowX} V ${to.centerY} H ${to.leftX}`,
      };
    })
    .filter((connector): connector is { id: string; d: string } => Boolean(connector));

  return (
    <div className="space-y-6 overflow-x-auto pb-2">
      <div className="min-w-max">
        <div
          className="mb-4 grid"
          style={{
            gridTemplateColumns: `repeat(${mainStages.length}, ${CARD_WIDTH}px)`,
            columnGap: `${COLUMN_GAP}px`,
          }}
        >
          {mainStages.map((stage) => {
            const stageMatches = mainMatches.filter((match) => match.stage === stage);
            return (
              <div key={stage}>
                <h3
                  className={clsx(
                    'text-xs font-black uppercase tracking-[0.2em]',
                    theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500',
                  )}
                >
                  {getMainHeading(language, stage, stageMatches.length)}
                </h3>
              </div>
            );
          })}
        </div>

        <div className="relative" style={{ width: `${treeWidth}px`, height: `${treeHeight}px` }}>
          <svg className="absolute inset-0 pointer-events-none z-0" width={treeWidth} height={treeHeight}>
            {connectors.map((connector) => (
              <path
                key={connector.id}
                d={connector.d}
                fill="none"
                stroke={theme === 'dark' ? 'rgba(148, 163, 184, 0.35)' : 'rgba(100, 116, 139, 0.32)'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </svg>

          <div
            className="relative z-10 grid"
            style={{
              gridTemplateColumns: `repeat(${mainStages.length}, ${CARD_WIDTH}px)`,
              gridTemplateRows: `repeat(${MAIN_ROW_COUNT}, ${CARD_HEIGHT}px)`,
              columnGap: `${COLUMN_GAP}px`,
              rowGap: `${ROW_GAP}px`,
            }}
          >
            {mainMatches.map((match) => {
              const tone = getTournamentMatchStatusTone(match.status);
              const isSelected = selectedMatchId === match.id;
              const isMine = Boolean(currentUserId && (match.player1Id === currentUserId || match.player2Id === currentUserId));
              const player1 = getPlayerIdentity(match, 1, labels);
              const player2 = getPlayerIdentity(match, 2, labels);
              const gridColumn = mainStages.indexOf(match.stage) + 1;
              const gridRow = rowMap[match.stage][match.slot];

              return (
                <button
                  key={match.id}
                  type="button"
                  onClick={() => onSelectMatch(match)}
                  style={{ gridColumn, gridRow }}
                  className={clsx(
                    'h-[110px] w-[220px] overflow-hidden rounded-[1.5rem] border p-3.5 text-left transition-all shadow-[0_16px_32px_rgba(2,6,23,0.08)]',
                    theme === 'dark'
                      ? 'bg-zinc-900/90 border-white/8 hover:bg-zinc-900'
                      : 'bg-white border-zinc-200 hover:bg-zinc-50',
                    isSelected &&
                      (theme === 'dark'
                        ? 'ring-2 ring-emerald-500/60 border-emerald-500/40'
                        : 'ring-2 ring-emerald-500/40 border-emerald-400'),
                  )}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className={clsx('text-[10px] font-black uppercase tracking-[0.16em]', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
                        {match.label}
                      </div>
                      <div className={clsx('text-[10px] font-semibold mt-1', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500')}>
                        BO{match.bestOf}
                      </div>
                    </div>
                    <div className={clsx('rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]', toneClasses[tone])}>
                      {labels[match.status]}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {[player1, player2].map((player, index) => {
                      const slot = index === 0 ? 1 : 2;
                      const isWinner = Boolean(match.winnerId && match.winnerId === player.id);
                      const isCurrent = Boolean(currentUserId && player.id === currentUserId);

                      return (
                        <div
                          key={`${match.id}-${slot}`}
                          title={player.name}
                          className={clsx(
                            'flex items-center justify-between gap-3 overflow-hidden rounded-2xl border px-3 py-2',
                            theme === 'dark' ? 'border-white/6 bg-zinc-950/78' : 'border-zinc-100 bg-zinc-50',
                            isWinner &&
                              (theme === 'dark'
                                ? 'border-emerald-500/40 bg-emerald-500/10'
                                : 'border-emerald-300 bg-emerald-50'),
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            {player.id ? (
                              <img
                                src={player.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=random`}
                                alt={player.name}
                                className="h-7 w-7 shrink-0 rounded-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div
                                className={clsx(
                                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black uppercase',
                                  theme === 'dark' ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-500',
                                )}
                              >
                                ?
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className={clsx('truncate text-sm font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                                {player.id ? player.displayLabel : player.helperText}
                              </div>
                              {player.id ? (
                                <div className={clsx('truncate text-[10px]', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
                                  {player.name}
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            {isCurrent ? (
                              <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-500">
                                {labels.you}
                              </span>
                            ) : null}
                            <div className={clsx('text-lg font-black', theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700')}>
                              {typeof player.score === 'number' ? player.score : '-'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {isMine ? (
                    <div className="mt-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-500">
                      {labels.yourMatch}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {thirdPlaceMatch ? (
        <section
          className={clsx(
            'rounded-[1.9rem] border p-5',
            theme === 'dark' ? 'bg-zinc-900/70 border-white/8' : 'bg-white border-zinc-200 shadow-sm',
          )}
        >
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className={clsx('text-sm font-black uppercase tracking-[0.18em]', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500')}>
                {stageHeadings[language].third_place}
              </h3>
              <p className={clsx('text-sm mt-1', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
                {stageHeadings[language].feedHint}
              </p>
            </div>
            <div className={clsx('rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]', toneClasses[getTournamentMatchStatusTone(thirdPlaceMatch.status)])}>
              {labels[thirdPlaceMatch.status]}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {([1, 2] as const).map((slot) => {
              const player = getPlayerIdentity(thirdPlaceMatch, slot, labels);
              const isWinner = Boolean(thirdPlaceMatch.winnerId && thirdPlaceMatch.winnerId === player.id);

              return (
                <div
                  key={`third-place-${slot}`}
                  className={clsx(
                    'flex items-center justify-between gap-3 rounded-2xl border px-4 py-3',
                    theme === 'dark' ? 'border-white/6 bg-zinc-950/75' : 'border-zinc-100 bg-zinc-50',
                    isWinner &&
                      (theme === 'dark'
                        ? 'border-emerald-500/40 bg-emerald-500/10'
                        : 'border-emerald-300 bg-emerald-50'),
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {player.id ? (
                      <img
                        src={player.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=random`}
                        alt={player.name}
                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div
                        className={clsx(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-black uppercase',
                          theme === 'dark' ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-500',
                        )}
                      >
                        ?
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className={clsx('truncate font-black', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
                        {player.name}
                      </div>
                      <div className={clsx('truncate text-xs', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
                        {player.helperText}
                      </div>
                    </div>
                  </div>

                  <div className={clsx('shrink-0 text-xl font-black', theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700')}>
                    {typeof player.score === 'number' ? player.score : '-'}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
