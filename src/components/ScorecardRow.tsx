import React from 'react';
import { ComparisonCalculation, OptionScoreResult } from '../types/decision';
import { formatScore } from '../utils/calculations';

interface ScorecardRowProps {
  calculation: ComparisonCalculation;
  precision: 1 | 2;
  selectedOptionId?: string;
  onSelectOption?: (optionId: string) => void;
}

export const ScorecardRow: React.FC<ScorecardRowProps> = ({
  calculation,
  precision,
  selectedOptionId,
  onSelectOption,
}) => {
  const getRankHeading = (res: OptionScoreResult) => {
    if (res.isTieForFirst) return 'Tied 1st';
    if (res.isWinner) return 'Winner';
    if (res.rank === 2) return '2nd';
    if (res.rank === 3) return '3rd';
    return `#${res.rank}`;
  };

  const getRankHeadingColor = (res: OptionScoreResult) => {
    if (res.isWinner || res.isTieForFirst) {
      return 'text-cyan-500 dark:text-cyan-400';
    }
    if (res.rank === 2) {
      return 'text-slate-500 dark:text-slate-400';
    }
    return 'text-amber-600/90 dark:text-amber-500/80';
  };

  const getPlaceLabel = (res: OptionScoreResult) => {
    const formatted = `${formatScore(res.weightedScore, precision)}/10`;
    if (res.isTieForFirst) {
      return `Tied 1st (${formatted})`;
    }
    if (res.isWinner) {
      return `1st Place (${formatted})`;
    }
    if (res.rank === 2) {
      return `2nd · ${formatted}`;
    }
    return `3rd · ${formatted}`;
  };

  return (
    <div
      className={`grid gap-3 ${
        calculation.rankedResults.length === 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'
      }`}
    >
      {calculation.rankedResults.map((res) => {
        const isTop = res.isWinner || res.isTieForFirst;
        const isSelected = selectedOptionId === res.option.id;

        return (
          <div
            key={res.option.id}
            onClick={() => onSelectOption && onSelectOption(res.option.id)}
            className={`relative rounded-xl p-4 flex flex-col items-center justify-between text-center transition-all duration-150 ${
              onSelectOption ? 'cursor-pointer' : ''
            } ${
              isTop
                ? 'bg-gradient-to-b from-cyan-500/12 via-indigo-500/10 to-slate-900/40 dark:from-cyan-500/15 dark:via-indigo-500/10 dark:to-[#151F34] border border-cyan-400/70 dark:border-cyan-400/80 shadow-[0_0_24px_-4px_rgba(6,182,212,0.35)]'
                : isSelected
                ? 'bg-slate-100 dark:bg-[#1E293B] border border-indigo-400/60'
                : 'bg-slate-50/90 dark:bg-[#151E31] border border-slate-200/80 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            {/* Rank Header */}
            <span className={`text-base font-bold tracking-tight ${getRankHeadingColor(res)}`}>
              {getRankHeading(res)}
            </span>

            {/* Option Name */}
            <h4
              className="text-sm font-semibold text-slate-900 dark:text-white mt-1.5 mb-3 truncate w-full"
              title={res.option.name || res.option.slotLabel}
            >
              {res.option.name || res.option.slotLabel}
            </h4>

            {/* Score Readout */}
            <div
              className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-mono tabular-nums font-medium whitespace-nowrap ${
                isTop
                  ? 'bg-amber-500/15 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-400/30'
                  : res.rank === 2
                  ? 'bg-slate-200/70 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300'
                  : 'bg-amber-900/10 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300/90'
              }`}
            >
              {getPlaceLabel(res)}
            </div>
          </div>
        );
      })}
    </div>
  );
};
