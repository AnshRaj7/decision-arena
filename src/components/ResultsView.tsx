import React, { useState } from 'react';
import {
  Trophy,
  Scale,
  BookmarkCheck,
  Edit3,
  Plus,
  Calculator,
  CheckCircle2,
} from 'lucide-react';
import {
  Comparison,
  ComparisonCalculation,
  NavSection,
} from '../types/decision';
import { formatScore, getNormalizedWeightPct } from '../utils/calculations';
import { ScorecardRow } from './ScorecardRow';
import { RadarChart } from './RadarChart';
import { BarChartComparison } from './BarChartComparison';

interface ResultsViewProps {
  comparison: Comparison;
  calculation: ComparisonCalculation;
  precision: 1 | 2;
  showFormulaExplanation: boolean;
  onUpdateComparison: (updated: Comparison) => void;
  onSaveComparison: () => void;
  onStartNewComparison: () => void;
  onNavigate: (section: NavSection) => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  comparison,
  calculation,
  precision,
  showFormulaExplanation,
  onUpdateComparison,
  onSaveComparison,
  onStartNewComparison,
  onNavigate,
}) => {
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSaveClick = () => {
    onSaveComparison();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1800);
  };

  const handleInlineRatingChange = (
    optionId: string,
    criterionId: string,
    val: number
  ) => {
    const clamped = Math.min(10, Math.max(1, Math.round(val)));
    onUpdateComparison({
      ...comparison,
      updatedAt: new Date().toISOString(),
      ratings: {
        ...comparison.ratings,
        [optionId]: {
          ...(comparison.ratings[optionId] || {}),
          [criterionId]: clamped,
        },
      },
    });
  };

  const handleInlineWeightChange = (criterionId: string, val: number) => {
    const clamped = Math.min(10, Math.max(1, Math.round(val)));
    onUpdateComparison({
      ...comparison,
      updatedAt: new Date().toISOString(),
      criteria: comparison.criteria.map((c) =>
        c.id === criterionId ? { ...c, weight: clamped } : c
      ),
    });
  };

  const topResult = calculation.rankedResults[0];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>{comparison.category || 'Decision Analysis'}</span>
            <span>·</span>
            <span>{comparison.options.length} Options</span>
            <span>·</span>
            <span>{comparison.criteria.length} Criteria</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Results: {comparison.title}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('new-comparison')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#131C31] hover:bg-slate-100 dark:hover:bg-[#1E293B] border border-slate-200 dark:border-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Options &amp; Criteria</span>
          </button>

          <button
            type="button"
            onClick={handleSaveClick}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-800 dark:text-white bg-white dark:bg-[#1E293B] hover:bg-slate-100 dark:hover:bg-slate-700 border border-cyan-500/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {savedNotice ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Saved to Browser</span>
              </>
            ) : (
              <>
                <BookmarkCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Save Comparison</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onStartNewComparison}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 shadow-[0_0_20px_-4px_rgba(6,182,212,0.5)] transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Comparison</span>
          </button>
        </div>
      </div>

      {/* Winner / Tie Summary Banner */}
      <div
        className={`rounded-2xl p-5 sm:p-6 border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          calculation.hasTieAtTop
            ? 'bg-gradient-to-r from-amber-500/15 via-indigo-500/10 to-transparent border-amber-500/40'
            : 'bg-gradient-to-r from-cyan-500/15 via-indigo-500/15 to-transparent border-cyan-400/60 shadow-[0_0_28px_-10px_rgba(6,182,212,0.35)]'
        }`}
      >
        <div className="flex items-start sm:items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              calculation.hasTieAtTop
                ? 'bg-amber-500/20 text-amber-500 dark:text-amber-300 border border-amber-400/40'
                : 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-400/40'
            }`}
          >
            {calculation.hasTieAtTop ? (
              <Scale className="w-6 h-6" />
            ) : (
              <Trophy className="w-6 h-6" />
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">
              {calculation.hasTieAtTop
                ? 'Equal Highest Weighted Score — Tie Result'
                : 'Recommended Top Choice'}
            </p>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
              {calculation.hasTieAtTop
                ? `Tie between ${calculation.winners
                    .map((w) => w.option.name)
                    .join(' and ')}`
                : `${topResult?.option.name || 'Winner'} leads with ${formatScore(
                    topResult?.weightedScore ?? 0,
                    precision
                  )} / 10`}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              {calculation.hasTieAtTop
                ? `Both top options achieved an identical weighted score of ${formatScore(
                    calculation.topScore,
                    precision
                  )}/10 across ${comparison.criteria.length} weighted criteria.`
                : `Outperformed ${
                    calculation.rankedResults.length - 1
                  } competing ${
                    calculation.rankedResults.length - 1 === 1 ? 'option' : 'options'
                  } by +${formatScore(
                    (topResult?.weightedScore ?? 0) -
                      (calculation.rankedResults[1]?.weightedScore ?? 0),
                    precision
                  )} points on a 10-point weighted scale.`}
            </p>
          </div>
        </div>

        {/* Formula Badge */}
        {showFormulaExplanation && (
          <div className="px-4 py-3 rounded-xl bg-white/80 dark:bg-[#0B1120]/90 border border-slate-200 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Calculator className="w-3.5 h-3.5 text-cyan-500" />
              <span>Scoring Formula</span>
            </div>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
              Sum(Rating × Weight) / {calculation.totalWeight}
            </p>
          </div>
        )}
      </div>

      {/* Individual Option Scorecards */}
      <div className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-slate-800/90 p-5 sm:p-6">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
          Option Scorecards
        </h3>
        <ScorecardRow calculation={calculation} precision={precision} />
      </div>

      {/* Charts Grid: Comparison Bar Chart + Radar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Bar Chart Card (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-slate-800/90 p-5 sm:p-6 flex flex-col justify-between">
          <BarChartComparison
            calculation={calculation}
            options={comparison.options}
            criteria={comparison.criteria}
            ratings={comparison.ratings}
            precision={precision}
          />
        </div>

        {/* Radar Chart Card (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-slate-800/90 p-5 sm:p-6 flex flex-col justify-between">
          <div className="mb-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Multi-Axis Radar Profile
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Geometric shape overlay across all criteria (1–10 scale)
            </p>
          </div>

          <div className="my-auto py-2">
            <RadarChart
              options={comparison.options}
              criteria={comparison.criteria}
              ratings={comparison.ratings}
              size={320}
            />
          </div>
        </div>
      </div>

      {/* Full Calculation Matrix & Live "What-If" Breakdown Table */}
      <div className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-slate-800/90 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Detailed Ratings &amp; Weighted Calculation Matrix
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Adjust any weight or rating below to test sensitivity and see the weighted score recalculate live.
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            Sum(Weights) = {calculation.totalWeight}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <th className="py-3 pr-4">Criterion</th>
                <th className="py-3 px-4">Weight (1–10)</th>
                <th className="py-3 px-4 text-right">Normalized %</th>
                {comparison.options.map((opt) => (
                  <th key={opt.id} className="py-3 px-4 text-right">
                    <span className="text-slate-900 dark:text-white font-bold">
                      {opt.name || opt.slotLabel}
                    </span>
                    <span className="block text-[11px] font-normal text-slate-400">
                      Rating · Weighted Pts
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/80 text-xs">
              {comparison.criteria.map((crit) => {
                const normPct = getNormalizedWeightPct(
                  crit.weight,
                  calculation.totalWeight
                );

                return (
                  <tr
                    key={crit.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3.5 pr-4 font-semibold text-slate-900 dark:text-white">
                      {crit.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        value={crit.weight}
                        onChange={(e) =>
                          handleInlineWeightChange(crit.id, Number(e.target.value))
                        }
                        aria-label={`Weight for ${crit.name}`}
                        className="px-2 py-1 rounded-md font-mono tabular-nums font-semibold bg-slate-100 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((w) => (
                          <option key={w} value={w}>
                            {w} / 10
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-cyan-600 dark:text-cyan-400 font-medium">
                      {normPct.toFixed(1)}%
                    </td>

                    {comparison.options.map((opt) => {
                      const rating = comparison.ratings[opt.id]?.[crit.id] ?? 0;
                      const weightedPts =
                        calculation.totalWeight > 0
                          ? (rating * crit.weight) / calculation.totalWeight
                          : 0;

                      return (
                        <td
                          key={opt.id}
                          className="py-3.5 px-4 text-right font-mono tabular-nums"
                        >
                          <div className="inline-flex items-center justify-end gap-2">
                            <select
                              value={rating}
                              onChange={(e) =>
                                handleInlineRatingChange(
                                  opt.id,
                                  crit.id,
                                  Number(e.target.value)
                                )
                              }
                              aria-label={`Rate ${opt.name} on ${crit.name}`}
                              className="px-2 py-1 rounded-md font-mono font-bold bg-slate-100 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400"
                            >
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => (
                                <option key={r} value={r}>
                                  {r}/10
                                </option>
                              ))}
                            </select>
                            <span className="text-slate-400 dark:text-slate-500 w-14 text-right">
                              +{weightedPts.toFixed(2)}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-[#0B1120]/50 font-mono tabular-nums text-xs">
                <td className="py-3.5 pr-4 font-sans font-bold text-slate-900 dark:text-white">
                  Final Weighted Score
                </td>
                <td className="py-3.5 px-4 font-semibold text-slate-600 dark:text-slate-300">
                  {calculation.totalWeight} total
                </td>
                <td className="py-3.5 px-4 text-right font-semibold text-cyan-600 dark:text-cyan-400">
                  100.0%
                </td>
                {comparison.options.map((opt) => {
                  const res = calculation.resultsByOptionId[opt.id];
                  const isTop = res?.rank === 1;
                  return (
                    <td
                      key={opt.id}
                      className={`py-3.5 px-4 text-right text-sm font-bold ${
                        isTop
                          ? 'text-cyan-600 dark:text-cyan-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {formatScore(res?.weightedScore ?? 0, precision)} / 10
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
