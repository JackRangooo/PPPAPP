import clsx from 'clsx';

import { getTournamentMatchStatusTone } from '../lib/tournamentBracket';
import type { Language, Theme, TournamentBracketMatch } from '../types';

const stageHeadings = {
  en: {
    quarterfinal: {
      full: 'Quarterfinals',
      compact: 'Qualifiers',
    },
    semifinal: 'Semifinals',
    final: 'Grand Final',
    thirdPlace: 'Third Place Match',
    feedHint: 'Semifinal losers drop into this match.',
  },
  zh: {
    quarterfinal: {
      full: '四分之一决赛',
      compact: '资格赛',
    },
    semifinal: '半决赛',
    final: '决赛',
    thirdPlace: '季军赛',
    feedHint: '两场半决赛的败者会在这里争夺季军。',
  },
} as const;

const statusLabels = {
  en: {
    waiting: 'Waiting',
    pending: 'Ready',
    ongoing: 'Live',
    waiting_confirmation: 'Confirm',
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
    completed: '已完成',
    walkover: '轮空',
    unknown: '待定',
    you: '你',
    yourMatch: '你的比赛',
  },
} as const;

const toneClasses: Record<string, string> = {
  emerald: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-400',
  amber: 'border-amber-500/30 bg-amber-500/12 text-amber-400',
  sky: 'border-sky-500/30 bg-sky-500/12 text-sky-400',
  zinc: 'border-white/10 bg-white/5 text-zinc-300',
};

const CARD_WIDTH = 176;
const CARD_HEIGHT = 94;
const COLUMN_GAP = 22;
const ROW_GAP = 10;
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

type PlayerIdentity = {
  id: string | null;
  name: string;
  displayLabel: string;
  avatarUrl: string;
  score: number | null;
};

const getMainStages = (matches: TournamentBracketMatch[]): MainStage[] =>
  matches.some((match) => match.stage === 'quarterfinal')
    ? ['quarterfinal', 'semifinal', 'final']
    : ['semifinal', 'final'];

const getMainHeading = (language: Language, stage: MainStage, matchCount: number) => {
  if (stage === 'quarterfinal') {
    return matchCount === 4
      ? stageHeadings[language].quarterfinal.full
      : stageHeadings[language].quarterfinal.compact;
  }

  return stageHeadings[language][stage];
};

const localizeLegacyMatchLabel = (language: Language, label: string) => {
  if (language === 'en') {
    return label;
  }

  if (label === 'Grand Final') {
    return '决赛';
  }

  if (label === 'Third Place Match') {
    return '季军赛';
  }

  const quarterMatch = label.match(/^(Quarterfinal|Qualifier|Play-In)\s+(\d+)$/);
  if (quarterMatch) {
    const stageText = quarterMatch[1] === 'Quarterfinal' ? '四分之一决赛' : '资格赛';
    return `${stageText} ${quarterMatch[2]}`;
  }

  const semifinalMatch = label.match(/^Semifinal\s+(\d+)$/);
  if (semifinalMatch) {
    return `半决赛 ${semifinalMatch[1]}`;
  }

  return label;
};

const localizeSourceLabel = (language: Language, source: string | null) => {
  if (!source) {
    return '';
  }

  if (language === 'en') {
    return source;
  }

  const winnerMatch = source.match(/^Winner of (.+)$/);
  if (winnerMatch) {
    return `${localizeLegacyMatchLabel(language, winnerMatch[1])}胜者`;
  }

  const loserMatch = source.match(/^Loser of (.+)$/);
  if (loserMatch) {
    return `${localizeLegacyMatchLabel(language, loserMatch[1])}败者`;
  }

  return localizeLegacyMatchLabel(language, source);
};

const getMatchDisplayLabel = (language: Language, match: TournamentBracketMatch) => {
  if (match.stage === 'final') {
    return language === 'zh' ? '决赛' : 'Grand Final';
  }

  if (match.stage === 'third_place') {
    return language === 'zh' ? '季军赛' : 'Third Place';
  }

  if (match.stage === 'semifinal') {
    return language === 'zh' ? `半决赛 ${match.slot}` : `Semifinal ${match.slot}`;
  }

  return language === 'zh' ? `资格赛 ${match.slot}` : `Qualifier ${match.slot}`;
};

const compactPlayerName = (name: string, maxLength = 8) => {
  if (name.length <= maxLength) {
    return name;
  }

  return `${name.slice(0, maxLength - 1)}...`;
};

const getPlayerIdentity = (
  language: Language,
  match: TournamentBracketMatch,
  slot: 1 | 2,
  labels: { unknown: string },
): PlayerIdentity => {
  const id = slot === 1 ? match.player1Id : match.player2Id;
  const name = slot === 1 ? match.player1Name : match.player2Name;
  const source = slot === 1 ? match.player1Source : match.player2Source;
  const avatarUrl = slot === 1 ? match.player1AvatarUrl : match.player2AvatarUrl;
  const score = slot === 1 ? match.player1Score : match.player2Score;
  const resolvedName = name || localizeSourceLabel(language, source) || labels.unknown;

  return {
    id,
    name: resolvedName,
    displayLabel: compactPlayerName(resolvedName),
    avatarUrl,
    score,
  };
};

const getConnectorMetrics = (mainStages: readonly MainStage[], stage: MainStage, slot: number) => {
  const columnIndex = mainStages.indexOf(stage);
  const row = rowMap[stage][slot];
  const x = columnIndex * (CARD_WIDTH + COLUMN_GAP);
  const y = (row - 1) * (CARD_HEIGHT + ROW_GAP);

  return {
    centerY: y + CARD_HEIGHT / 2,
    leftX: x,
    rightX: x + CARD_WIDTH,
  };
};

const renderPlayerRow = (
  matchId: string,
  player: PlayerIdentity,
  slot: 1 | 2,
  match: TournamentBracketMatch,
  currentUserId: string | null,
  theme: Theme,
  labels: {
    unknown: string;
    you: string;
    yourMatch: string;
    waiting: string;
    pending: string;
    ongoing: string;
    waiting_confirmation: string;
    completed: string;
    walkover: string;
  },
) => {
  const isWinner = Boolean(match.winnerId && match.winnerId === player.id);
  const isCurrent = Boolean(currentUserId && player.id === currentUserId);

  return (
    <div
      key={`${matchId}-${slot}`}
      title={player.name}
      className={clsx(
        'flex items-center gap-2 rounded-[0.95rem] border px-2.5 py-2',
        theme === 'dark' ? 'border-white/6 bg-zinc-950/78' : 'border-zinc-100 bg-zinc-50',
        isWinner &&
          (theme === 'dark'
            ? 'border-emerald-500/30 bg-emerald-500/10'
            : 'border-emerald-300 bg-emerald-50'),
      )}
    >
      {player.id ? (
        <img
          src={
            player.avatarUrl ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=random`
          }
          alt={player.name}
          className={clsx(
            'h-7 w-7 shrink-0 rounded-full object-cover object-center',
            isCurrent ? 'ring-2 ring-emerald-500/55 ring-offset-1 ring-offset-transparent' : '',
          )}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div
          className={clsx(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-black uppercase',
            theme === 'dark' ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-500',
          )}
        >
          ?
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className={clsx('truncate text-[12px] font-black leading-none', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
          {player.displayLabel}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {isCurrent ? (
          <span className="rounded-full bg-emerald-500/12 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-emerald-400">
            {labels.you}
          </span>
        ) : null}
        <div className={clsx('min-w-4 text-right text-sm font-black', theme === 'dark' ? 'text-zinc-300' : 'text-zinc-700')}>
          {typeof player.score === 'number' ? player.score : '-'}
        </div>
      </div>
    </div>
  );
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
    .filter(
      (match): match is TournamentBracketMatch & { stage: 'quarterfinal' | 'semifinal' | 'final' } =>
        match.stage !== 'third_place',
    )
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
    <div className="space-y-4">
      <div className="min-w-max">
        <div
          className="mb-3 grid"
          style={{
            gridTemplateColumns: `repeat(${mainStages.length}, ${CARD_WIDTH}px)`,
            columnGap: `${COLUMN_GAP}px`,
          }}
        >
          {mainStages.map((stage) => {
            const stageMatches = mainMatches.filter((match) => match.stage === stage);

            return (
              <div key={stage}>
                <h3 className={clsx('text-[11px] font-black uppercase tracking-[0.2em]', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
                  {getMainHeading(language, stage, stageMatches.length)}
                </h3>
              </div>
            );
          })}
        </div>

        <div className="relative" style={{ width: `${treeWidth}px`, height: `${treeHeight}px` }}>
          <svg className="pointer-events-none absolute inset-0 z-0" width={treeWidth} height={treeHeight}>
            {connectors.map((connector) => (
              <path
                key={connector.id}
                d={connector.d}
                fill="none"
                stroke={theme === 'dark' ? 'rgba(148, 163, 184, 0.3)' : 'rgba(100, 116, 139, 0.24)'}
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
              const isMine = Boolean(
                currentUserId && (match.player1Id === currentUserId || match.player2Id === currentUserId),
              );
              const player1 = getPlayerIdentity(language, match, 1, labels);
              const player2 = getPlayerIdentity(language, match, 2, labels);
              const gridColumn = mainStages.indexOf(match.stage) + 1;
              const gridRow = rowMap[match.stage][match.slot];
              const displayLabel = getMatchDisplayLabel(language, match);

              return (
                <button
                  key={match.id}
                  type="button"
                  onClick={() => onSelectMatch(match)}
                  style={{ gridColumn, gridRow }}
                  className={clsx(
                    'h-[94px] w-[176px] overflow-hidden rounded-[1.35rem] border p-2.5 text-left transition-all shadow-[0_12px_26px_rgba(2,6,23,0.08)]',
                    theme === 'dark' ? 'border-white/8 bg-zinc-900/92 hover:bg-zinc-900' : 'border-zinc-200 bg-white hover:bg-zinc-50',
                    isSelected &&
                      (theme === 'dark'
                        ? 'border-emerald-500/40 ring-2 ring-emerald-500/45'
                        : 'border-emerald-400 ring-2 ring-emerald-500/25'),
                  )}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className={clsx('truncate text-[9px] font-black uppercase tracking-[0.18em]', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
                        {displayLabel}
                      </div>
                      <div className={clsx('mt-0.5 text-[9px] font-semibold', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500')}>
                        BO{match.bestOf}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isMine ? <span className="h-2 w-2 rounded-full bg-emerald-500" /> : null}
                      <div className={clsx('shrink-0 rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.16em]', toneClasses[tone])}>
                        {labels[match.status]}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {renderPlayerRow(match.id, player1, 1, match, currentUserId, theme, labels)}
                    {renderPlayerRow(match.id, player2, 2, match, currentUserId, theme, labels)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {thirdPlaceMatch ? (
        <section className={clsx('rounded-[1.55rem] border p-3.5 sm:p-4', theme === 'dark' ? 'border-white/8 bg-zinc-900/68' : 'border-zinc-200 bg-white shadow-sm')}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className={clsx('text-[11px] font-black uppercase tracking-[0.2em]', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500')}>
                {stageHeadings[language].thirdPlace}
              </h3>
              <p className={clsx('mt-1 text-xs', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
                {stageHeadings[language].feedHint}
              </p>
            </div>
            <div className={clsx('rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em]', toneClasses[getTournamentMatchStatusTone(thirdPlaceMatch.status)])}>
              {labels[thirdPlaceMatch.status]}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectMatch(thirdPlaceMatch)}
            className={clsx(
              'w-full rounded-[1.3rem] border p-3 text-left transition-all',
              theme === 'dark' ? 'border-white/8 bg-zinc-950/76 hover:bg-zinc-950' : 'border-zinc-200 bg-zinc-50 hover:bg-white',
              selectedMatchId === thirdPlaceMatch.id &&
                (theme === 'dark'
                  ? 'border-emerald-500/40 ring-2 ring-emerald-500/45'
                  : 'border-emerald-400 ring-2 ring-emerald-500/25'),
            )}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className={clsx('text-[10px] font-black uppercase tracking-[0.18em]', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
                {getMatchDisplayLabel(language, thirdPlaceMatch)}
              </div>
              {currentUserId && (thirdPlaceMatch.player1Id === currentUserId || thirdPlaceMatch.player2Id === currentUserId) ? (
                <span className="rounded-full bg-emerald-500/12 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-emerald-400">
                  {labels.yourMatch}
                </span>
              ) : null}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {([1, 2] as const).map((slot) => renderPlayerRow(
                thirdPlaceMatch.id,
                getPlayerIdentity(language, thirdPlaceMatch, slot, labels),
                slot,
                thirdPlaceMatch,
                currentUserId,
                theme,
                labels,
              ))}
            </div>
          </button>
        </section>
      ) : null}
    </div>
  );
}




