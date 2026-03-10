import { addDays, format, isAfter, isBefore, startOfDay, startOfWeek, subWeeks } from 'date-fns';
import clsx from 'clsx';

import type { Language, Match, Theme } from '../types';
import { useTranslation } from '../i18n';

const TOTAL_WEEKS = 52;
const DAYS_IN_WEEK = 7;
const WEEKDAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

type ActivityHeatmapProps = {
  matches: Match[];
  theme: Theme;
  language: Language;
};

const formatTooltipDate = (date: Date, language: Language) =>
  language === 'zh' ? format(date, 'yyyy年M月d日') : format(date, 'MMM d, yyyy');

const getIntensityClassName = (count: number, theme: Theme, isFuture: boolean, isToday: boolean) => {
  if (isFuture) {
    return 'bg-transparent border-transparent';
  }

  if (count <= 0) {
    return theme === 'dark'
      ? clsx('bg-zinc-900 border-white/5', isToday && 'border-zinc-500')
      : clsx('bg-zinc-200/80 border-zinc-100', isToday && 'border-zinc-400');
  }

  if (count === 1) {
    return theme === 'dark'
      ? clsx('bg-emerald-900/70 border-emerald-800', isToday && 'ring-1 ring-emerald-300/50')
      : clsx('bg-emerald-200 border-emerald-300', isToday && 'ring-1 ring-emerald-500/40');
  }

  if (count === 2) {
    return theme === 'dark'
      ? clsx('bg-emerald-700/80 border-emerald-600', isToday && 'ring-1 ring-emerald-300/50')
      : clsx('bg-emerald-400 border-emerald-500', isToday && 'ring-1 ring-emerald-500/40');
  }

  if (count === 3) {
    return theme === 'dark'
      ? clsx('bg-lime-500/80 border-lime-400', isToday && 'ring-1 ring-lime-200/50')
      : clsx('bg-lime-500 border-lime-600', isToday && 'ring-1 ring-lime-500/40');
  }

  return theme === 'dark'
    ? clsx('bg-green-400 border-green-300', isToday && 'ring-1 ring-green-100/60')
    : clsx('bg-green-600 border-green-700', isToday && 'ring-1 ring-green-600/40');
};

export default function ActivityHeatmap({ matches, theme, language }: ActivityHeatmapProps) {
  const t = useTranslation(language);
  const today = startOfDay(new Date());
  const gridStart = startOfWeek(subWeeks(today, TOTAL_WEEKS - 1), { weekStartsOn: 1 });
  const todayKey = format(today, 'yyyy-MM-dd');

  const activityCountByDate = matches.reduce<Record<string, number>>((accumulator, match) => {
    const activityDate = startOfDay(new Date(match.updatedAt || match.createdAt));

    if (isBefore(activityDate, gridStart) || isAfter(activityDate, today)) {
      return accumulator;
    }

    const key = format(activityDate, 'yyyy-MM-dd');
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});

  const totalActivity = Object.values(activityCountByDate).reduce((sum, current) => sum + current, 0);

  const weeks = Array.from({ length: TOTAL_WEEKS }, (_, weekIndex) =>
    Array.from({ length: DAYS_IN_WEEK }, (_, dayIndex) => addDays(gridStart, weekIndex * DAYS_IN_WEEK + dayIndex)),
  );

  const monthLabels = weeks.map((week, weekIndex) => {
    const firstVisibleDay = week.find((day) => !isAfter(day, today));
    if (!firstVisibleDay) {
      return '';
    }

    if (weekIndex === 0) {
      return format(firstVisibleDay, 'MMM');
    }

    const previousWeekDay = weeks[weekIndex - 1].find((day) => !isAfter(day, today));
    if (!previousWeekDay || previousWeekDay.getMonth() !== firstVisibleDay.getMonth()) {
      return format(firstVisibleDay, 'MMM');
    }

    return '';
  });

  const legendSteps = [0, 1, 2, 3, 4];

  return (
    <section
      className={clsx(
        'border rounded-[2rem] p-5 md:p-6',
        theme === 'dark' ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-zinc-200 shadow-sm',
      )}
    >
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className={clsx('text-lg font-bold mb-1', theme === 'dark' ? 'text-white' : 'text-zinc-900')}>
            {t('dashboard.activityTitle')}
          </h2>
          <p className={clsx('text-sm font-medium', theme === 'dark' ? 'text-zinc-400' : 'text-zinc-500')}>
            {t('dashboard.activitySummary', { count: String(totalActivity) })}
          </p>
        </div>
        <div
          className={clsx(
            'rounded-2xl px-4 py-2 text-sm font-bold',
            theme === 'dark'
              ? 'bg-zinc-950 text-zinc-300 border border-white/5'
              : 'bg-zinc-100 text-zinc-700 border border-zinc-200',
          )}
        >
          {today.getFullYear()}
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="min-w-[760px]">
          <div className="flex gap-1 pl-12 mb-3">
            {monthLabels.map((label, index) => (
              <div
                key={`${label}-${index}`}
                className={clsx('w-3.5 text-[11px] font-semibold', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400')}
              >
                {label}
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <div className="w-8 shrink-0 flex flex-col gap-1">
              {WEEKDAY_LABELS.map((label, index) => (
                <div
                  key={`${label}-${index}`}
                  className={clsx(
                    'h-3.5 text-[11px] leading-[14px] font-semibold',
                    theme === 'dark' ? 'text-zinc-500' : 'text-zinc-400',
                  )}
                >
                  {label}
                </div>
              ))}
            </div>

            <div className="flex gap-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {week.map((day) => {
                    const key = format(day, 'yyyy-MM-dd');
                    const count = activityCountByDate[key] ?? 0;
                    const isFuture = isAfter(day, today);
                    const isToday = key === todayKey;
                    const tooltip = isFuture
                      ? ''
                      : count > 0
                        ? t('dashboard.activityTooltipSome', {
                            count: String(count),
                            date: formatTooltipDate(day, language),
                          })
                        : t('dashboard.activityTooltipNone', { date: formatTooltipDate(day, language) });

                    return (
                      <div
                        key={key}
                        title={tooltip}
                        className={clsx(
                          'h-3.5 w-3.5 rounded-[4px] border transition-transform duration-150 hover:scale-110',
                          getIntensityClassName(count, theme, isFuture, isToday),
                        )}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mt-5">
        <p className={clsx('text-xs font-medium', theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500')}>
          {totalActivity > 0 ? t('dashboard.activityHint') : t('dashboard.activityEmpty')}
        </p>

        <div className="flex items-center gap-2 text-xs font-medium">
          <span className={theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500'}>{t('dashboard.activityLegendLess')}</span>
          <div className="flex items-center gap-1">
            {legendSteps.map((level) => (
              <div
                key={level}
                className={clsx(
                  'h-3.5 w-3.5 rounded-[4px] border',
                  getIntensityClassName(level, theme, false, false),
                )}
              />
            ))}
          </div>
          <span className={theme === 'dark' ? 'text-zinc-500' : 'text-zinc-500'}>{t('dashboard.activityLegendMore')}</span>
        </div>
      </div>
    </section>
  );
}
