import React, { useState } from 'react';
import { ComparisonCalculation, Criterion, OptionItem, RatingsMap } from '../types/decision';
import { formatScore, getNormalizedWeightPct } from '../utils/calculations';

interface BarChartComparisonProps {
  calculation: ComparisonCalculation;
  options: OptionItem[];
  criteria: Criterion[];
  ratings: RatingsMap;
  precision: 1 | 2;
}

const BAR_GRADIENTS = [
  'from-cyan-400 to-indigo-500',
  'from-indigo-400 to-purple-500',
  'from-purple-400 to-pink-500',
];

const BAR_SOLID_COLORS = ['#06B6D4', '#6366F1', '#A855F7'];

export const BarChartComparison: React.FC<BarChartComparisonProps> = ({
  calculation,
  options,
  criteria,
  ratings,
  precision,
}) => {
  const [mode, setMode] = useState<'overall' | 'criteria'>('overall');

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Score Comparison Bar Chart
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {mode === 'overall'
              ? 'Weighted score on a 10-point scale across all criteria'
              : 'Side-by-side raw ratings (1–10) for each weighted criterion'}
          </p>
        </div>

        {/* Interactive Mode Filter */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setMode('overall')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              mode === 'overall'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Weighted Total
          </button>
          <button
            type="button"
            onClick={() => setMode('criteria')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              mode === 'criteria'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            By Criterion
          </button>
        </div>
      </div>

      {mode === 'overall' ? (
        <div className="space-y-5 my-auto">
          {calculation.rankedResults.map((res) => {
            const pct = Math.max(0, Math.min(100, (res.weightedScore / 10) * 100));
            const grad = BAR_GRADIENTS[res.optionIndex % BAR_GRADIENTS.length];
            const isTop = res.rank === 1;

            return (
              <div key={res.option.id} className="space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`text-xs font-mono font-semibold tabular-nums ${
                        isTop
                          ? 'text-cyan-600 dark:text-cyan-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      #{res.rank}
                    </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {res.option.name || res.option.slotLabel}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">·</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {res.option.slotLabel}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1.5 shrink-0 font-mono tabular-nums">
                    <span
                      className={`text-base font-bold ${
                        isTop
                          ? 'text-cyan-600 dark:text-cyan-300'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {formatScore(res.weightedScore, precision)}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">/ 10</span>
                  </div>
                </div>

                {/* Progress Bar Track */}
                <div className="h-3.5 w-full rounded-full bg-slate-200/80 dark:bg-[#0B1120] overflow-hidden p-0.5 border border-slate-300/50 dark:border-slate-800">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${grad} transition-all duration-200`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  <span>
                    Weighted Sum: {res.rawWeightedSum.toFixed(0)} / {res.totalWeight * 10} max
                  </span>
                  <span>
                    {res.isTieForFirst
                      ? 'Tied for 1st Place'
                      : res.isWinner
                      ? 'Highest Weighted Score'
                      : `${formatScore(calculation.topScore - res.weightedScore, precision)} pts behind leader`}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Scale Axis */}
          <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800/80 flex justify-between text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
            <span>0.0</span>
            <span>2.5</span>
            <span>5.0</span>
            <span>7.5</span>
            <span>10.0</span>
          </div>
        </div>
      ) : (
        <div className="space-y-4 overflow-y-auto max-h-[320px] pr-1">
          {criteria.map((crit) => {
            const normPct = getNormalizedWeightPct(crit.weight, calculation.totalWeight);
            return (
              <div
                key={crit.id}
                className="p-3 rounded-lg bg-slate-50 dark:bg-[#0B1120]/70 border border-slate-200/70 dark:border-slate-800/80 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {crit.name}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                    Weight {crit.weight}/10 · {normPct.toFixed(1)}%
                  </span>
                </div>

                <div className="space-y-1.5">
                  {options.map((opt, optIdx) => {
                    const rating = ratings[opt.id]?.[crit.id] ?? 0;
                    const widthPct = Math.max(0, Math.min(100, (rating / 10) * 100));
                    const color = BAR_SOLID_COLORS[optIdx % BAR_SOLID_COLORS.length];

                    return (
                      <div key={opt.id} className="grid grid-cols-12 items-center gap-2 text-xs">
                        <span className="col-span-4 truncate text-slate-600 dark:text-slate-300">
                          {opt.name || opt.slotLabel}
                        </span>
                        <div className="col-span-6 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-150"
                            style={{ width: `${widthPct}%`, backgroundColor: color }}
                          />
                        </div>
                        <span className="col-span-2 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300 font-medium">
                          {rating}/10
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
