import React, { useState } from 'react';
import {
  LayoutGrid,
  FolderClosed,
  Trophy,
  Plus,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  BookmarkCheck,
  Sliders,
  Trash2,
  Sparkles,
} from 'lucide-react';
import {
  Comparison,
  ComparisonCalculation,
  NavSection,
} from '../types/decision';
import { formatScore, getNormalizedWeightPct } from '../utils/calculations';
import { ScorecardRow } from './ScorecardRow';
import { RadarChart } from './RadarChart';

interface DashboardViewProps {
  userName: string;
  activeComparison: Comparison;
  calculation: ComparisonCalculation;
  savedComparisons: Comparison[];
  totalDecisionsCount: number;
  precision: 1 | 2;
  onStartNewComparison: () => void;
  onUpdateActiveComparison: (updated: Comparison) => void;
  onSaveActiveComparison: () => void;
  onSelectSavedComparison: (comp: Comparison, targetSection?: NavSection) => void;
  onDeleteSavedComparison: (id: string) => void;
  onNavigate: (section: NavSection) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  userName,
  activeComparison,
  calculation,
  savedComparisons,
  totalDecisionsCount,
  precision,
  onStartNewComparison,
  onUpdateActiveComparison,
  onSaveActiveComparison,
  onSelectSavedComparison,
  onDeleteSavedComparison,
  onNavigate,
}) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string>(
    activeComparison.options[0]?.id || ''
  );
  const [isCriteriaExpanded, setIsCriteriaExpanded] = useState(true);
  const [sliderTarget, setSliderTarget] = useState<'rating' | 'weight'>('rating');
  const [newCriterionName, setNewCriterionName] = useState('');
  const [saveFeedback, setSaveFeedback] = useState(false);

  // Ensure selectedOptionId stays valid when activeComparison changes
  const currentSelectedOption =
    activeComparison.options.find((o) => o.id === selectedOptionId) ||
    activeComparison.options[0];

  const recentWinnerText = (() => {
    if (!calculation.isValid || calculation.rankedResults.length === 0) {
      return 'Pending';
    }
    if (calculation.hasTieAtTop) {
      return `Tie (${calculation.winners.map((w) => w.option.name).join(' & ')})`;
    }
    const top = calculation.rankedResults[0];
    return top ? top.option.name || top.option.slotLabel : 'None';
  })();

  const handleRatingChange = (optionId: string, criterionId: string, newRating: number) => {
    const clamped = Math.min(10, Math.max(1, Math.round(newRating)));
    onUpdateActiveComparison({
      ...activeComparison,
      updatedAt: new Date().toISOString(),
      ratings: {
        ...activeComparison.ratings,
        [optionId]: {
          ...(activeComparison.ratings[optionId] || {}),
          [criterionId]: clamped,
        },
      },
    });
  };

  const handleWeightChange = (criterionId: string, newWeight: number) => {
    const clamped = Math.min(10, Math.max(1, Math.round(newWeight)));
    onUpdateActiveComparison({
      ...activeComparison,
      updatedAt: new Date().toISOString(),
      criteria: activeComparison.criteria.map((c) =>
        c.id === criterionId ? { ...c, weight: clamped } : c
      ),
    });
  };

  const handleOptionNameChange = (optionId: string, newName: string) => {
    onUpdateActiveComparison({
      ...activeComparison,
      updatedAt: new Date().toISOString(),
      options: activeComparison.options.map((o) =>
        o.id === optionId ? { ...o, name: newName } : o
      ),
    });
  };

  const handleQuickAddCriterion = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCriterionName.trim();
    if (!trimmed) return;
    const newId = `crit-${Date.now()}`;
    const updatedRatings = { ...activeComparison.ratings };
    activeComparison.options.forEach((opt) => {
      updatedRatings[opt.id] = {
        ...(updatedRatings[opt.id] || {}),
        [newId]: 7,
      };
    });

    onUpdateActiveComparison({
      ...activeComparison,
      updatedAt: new Date().toISOString(),
      criteria: [...activeComparison.criteria, { id: newId, name: trimmed, weight: 7 }],
      ratings: updatedRatings,
    });
    setNewCriterionName('');
  };

  const triggerSave = () => {
    onSaveActiveComparison();
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 1800);
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {userName.trim()
              ? `Welcome back, ${userName.trim()}`
              : 'Welcome to Decision Arena'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Compare options systematically using custom criteria and weighted ratings.
          </p>
        </div>

        <button
          type="button"
          onClick={onStartNewComparison}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 shadow-[0_0_20px_-4px_rgba(6,182,212,0.55)] transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Comparison</span>
        </button>
      </div>

      {/* Unified 3-Metric Summary Bar matching UI Reference */}
      <div className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-slate-800/90 p-5 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-0 md:divide-x divide-slate-200 dark:divide-slate-800/90">
        {/* Metric 1: Total Decisions */}
        <div className="flex items-center gap-4 md:pr-6">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Decisions
            </p>
            <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
              {totalDecisionsCount}
            </p>
          </div>
        </div>

        {/* Metric 2: Saved Comparisons */}
        <div className="flex items-center gap-4 md:px-6">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
            <FolderClosed className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Saved Comparisons
            </p>
            <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
              {savedComparisons.length}
            </p>
          </div>
        </div>

        {/* Metric 3: Recent Winner */}
        <div className="flex items-center gap-4 md:pl-6 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-[#1E293B] border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Recent Winner
            </p>
            <p
              className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5 truncate"
              title={recentWinnerText}
            >
              {recentWinnerText}
            </p>
          </div>
        </div>
      </div>

      {/* Main Split Workspace (Reference Image Layout) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Left Panel: Active Comparison Setup & Live Criteria (7 cols) */}
        <div className="xl:col-span-7 rounded-2xl bg-white dark:bg-[#131C31] border border-cyan-500/40 dark:border-cyan-500/40 shadow-[0_0_30px_-12px_rgba(6,182,212,0.25)] p-5 sm:p-6 flex flex-col justify-between">
          <div>
            {/* Card Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800/90">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                    New Comparison
                  </h2>
                  <span className="text-slate-400 dark:text-slate-600">·</span>
                  <input
                    type="text"
                    value={activeComparison.title}
                    onChange={(e) =>
                      onUpdateActiveComparison({
                        ...activeComparison,
                        title: e.target.value,
                        updatedAt: new Date().toISOString(),
                      })
                    }
                    aria-label="Comparison title"
                    placeholder="Comparison Title..."
                    className="text-sm font-medium text-cyan-600 dark:text-cyan-400 bg-transparent border-b border-transparent hover:border-slate-400 dark:hover:border-slate-700 focus:border-cyan-400 focus:outline-none px-1 py-0.5 min-w-[140px] max-w-[240px]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onNavigate('new-comparison')}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#1E293B] hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Step-by-Step Wizard
                </button>
                <button
                  type="button"
                  onClick={onStartNewComparison}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 transition-all whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Comparison</span>
                </button>
              </div>
            </div>

            {/* Section 1: Setup & Criteria Header */}
            <div className="flex items-center justify-between py-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                1. Setup &amp; Criteria
              </h3>
              <div className="flex items-center gap-2">
                {/* Toggle between adjusting Selected Option's Ratings or Criteria Weights */}
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setSliderTarget('rating')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                      sliderTarget === 'rating'
                        ? 'bg-white dark:bg-[#1E293B] text-cyan-600 dark:text-cyan-400 shadow-2xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Rate {currentSelectedOption?.slotLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSliderTarget('weight')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                      sliderTarget === 'weight'
                        ? 'bg-white dark:bg-[#1E293B] text-indigo-600 dark:text-indigo-400 shadow-2xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Adjust Weights
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCriteriaExpanded(!isCriteriaExpanded)}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#1E293B] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700/70"
                  aria-label="Toggle criteria section"
                >
                  {isCriteriaExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Option Selector Cards (Option A, Option B, Option C) */}
            <div
              className={`grid gap-3 mb-6 ${
                activeComparison.options.length === 2
                  ? 'grid-cols-1 sm:grid-cols-2'
                  : 'grid-cols-1 sm:grid-cols-3'
              }`}
            >
              {activeComparison.options.map((opt) => {
                const isSelected = currentSelectedOption?.id === opt.id;
                const optScore =
                  calculation.resultsByOptionId[opt.id]?.weightedScore ?? 0;

                return (
                  <div
                    key={opt.id}
                    onClick={() => {
                      setSelectedOptionId(opt.id);
                      setSliderTarget('rating');
                    }}
                    className={`rounded-xl p-3.5 transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-gradient-to-b from-cyan-500/15 to-indigo-500/5 border-cyan-400 shadow-[0_0_16px_-4px_rgba(6,182,212,0.3)]'
                        : 'bg-slate-50 dark:bg-[#172136] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                      <span>{opt.slotLabel}:</span>
                      <span className="font-mono tabular-nums text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold">
                        {formatScore(optScore, precision)}/10
                      </span>
                    </div>
                    <input
                      type="text"
                      value={opt.name}
                      onChange={(e) => handleOptionNameChange(opt.id, e.target.value)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOptionId(opt.id);
                      }}
                      placeholder={`Enter ${opt.slotLabel} name`}
                      aria-label={`${opt.slotLabel} name`}
                      className="w-full text-sm font-semibold text-slate-900 dark:text-white bg-transparent border-b border-transparent focus:border-cyan-400 focus:outline-none truncate"
                    />
                  </div>
                );
              })}
            </div>

            {/* Criteria Sliders List */}
            {isCriteriaExpanded && (
              <div className="space-y-1 divide-y divide-slate-200/70 dark:divide-slate-800/80">
                {activeComparison.criteria.map((crit) => {
                  const currentRating =
                    activeComparison.ratings[currentSelectedOption?.id]?.[crit.id] ?? 5;
                  const normWeightPct = getNormalizedWeightPct(
                    crit.weight,
                    calculation.totalWeight
                  );

                  const activeSliderValue =
                    sliderTarget === 'rating' ? currentRating : crit.weight;
                  const fillPercentage = ((activeSliderValue - 1) / 9) * 100;

                  return (
                    <div
                      key={crit.id}
                      className="py-3.5 first:pt-1 last:pb-1 grid grid-cols-1 sm:grid-cols-12 items-center gap-3"
                    >
                      {/* Criterion Name & Weight */}
                      <div className="sm:col-span-4 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {crit.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
                          Weight: {crit.weight}/10 · {normWeightPct.toFixed(0)}%
                        </p>
                      </div>

                      {/* Gradient Range Slider */}
                      <div className="sm:col-span-4 flex items-center">
                        <input
                          type="range"
                          min={1}
                          max={10}
                          step={1}
                          value={activeSliderValue}
                          aria-label={
                            sliderTarget === 'rating'
                              ? `Rate ${currentSelectedOption?.name} on ${crit.name}`
                              : `Weight for ${crit.name}`
                          }
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (sliderTarget === 'rating' && currentSelectedOption) {
                              handleRatingChange(currentSelectedOption.id, crit.id, val);
                            } else {
                              handleWeightChange(crit.id, val);
                            }
                          }}
                          style={{
                            background: `linear-gradient(to right, #06B6D4 0%, #6366F1 ${fillPercentage}%, rgba(51, 65, 85, 0.45) ${fillPercentage}%, rgba(51, 65, 85, 0.45) 100%)`,
                            height: '6px',
                            borderRadius: '9999px',
                          }}
                          className="w-full arena-slider"
                        />
                      </div>

                      {/* Quick 1 / Value / 10 Interactive Stepper Controls (matching reference UI) */}
                      <div className="sm:col-span-4 flex items-center justify-end gap-1.5 font-mono tabular-nums">
                        <button
                          type="button"
                          onClick={() =>
                            sliderTarget === 'rating' && currentSelectedOption
                              ? handleRatingChange(
                                  currentSelectedOption.id,
                                  crit.id,
                                  activeSliderValue - 1
                                )
                              : handleWeightChange(crit.id, activeSliderValue - 1)
                          }
                          disabled={activeSliderValue <= 1}
                          title="Decrease by 1"
                          className="px-2 py-1 rounded-full bg-cyan-500/20 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 text-xs font-semibold hover:bg-cyan-500/30 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                        >
                          <span>1</span>
                          <span className="w-2.5 h-2.5 rounded-full bg-white inline-block" />
                        </button>

                        <div className="px-2.5 py-1 rounded-full bg-indigo-500/20 dark:bg-[#1E293B] border border-indigo-500/40 text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 inline-block" />
                          <span>{activeSliderValue}</span>
                        </div>

                        <span className="text-slate-400 dark:text-slate-600 text-xs">-</span>

                        <button
                          type="button"
                          onClick={() =>
                            sliderTarget === 'rating' && currentSelectedOption
                              ? handleRatingChange(
                                  currentSelectedOption.id,
                                  crit.id,
                                  activeSliderValue + 1
                                )
                              : handleWeightChange(crit.id, activeSliderValue + 1)
                          }
                          disabled={activeSliderValue >= 10}
                          title="Increase by 1"
                          className="px-2 py-1 rounded-full bg-slate-100 dark:bg-[#1E293B] text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-xs font-medium hover:border-cyan-400 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-500 inline-block" />
                          <span>10</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Quick Add Criterion Form */}
                <form
                  onSubmit={handleQuickAddCriterion}
                  className="pt-3 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={newCriterionName}
                    onChange={(e) => setNewCriterionName(e.target.value)}
                    placeholder="Add custom criterion (e.g., Reliability, Speed)..."
                    className="flex-1 px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    disabled={!newCriterionName.trim()}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-slate-200 hover:bg-cyan-500 hover:text-white disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    + Add Criterion
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Card Footer Actions */}
          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Editing ratings for{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {currentSelectedOption?.name}
              </strong>{' '}
              · Click any option card above to switch
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={triggerSave}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-[#1E293B] text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <BookmarkCheck className="w-3.5 h-3.5 text-cyan-500" />
                <span>{saveFeedback ? 'Saved to Browser!' : 'Save Comparison'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel: Live Results & Radar Chart (5 cols) */}
        <div className="xl:col-span-5 rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-slate-800/90 p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2
                className="text-lg font-bold text-slate-900 dark:text-white truncate"
                title={`Results: ${activeComparison.title}`}
              >
                Results: {activeComparison.title}
              </h2>
              {calculation.hasTieAtTop && (
                <span className="text-xs font-semibold text-amber-500 dark:text-amber-400 whitespace-nowrap">
                  Tie Detected
                </span>
              )}
            </div>

            {/* Option Scorecards (Winner, 2nd, 3rd) */}
            <ScorecardRow
              calculation={calculation}
              precision={precision}
              selectedOptionId={currentSelectedOption?.id}
              onSelectOption={(id) => {
                setSelectedOptionId(id);
                setSliderTarget('rating');
              }}
            />

            {/* Radar Chart */}
            <div className="mt-6">
              <RadarChart
                options={activeComparison.options}
                criteria={activeComparison.criteria}
                ratings={activeComparison.ratings}
                size={300}
                compact
              />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              Total Weight: {calculation.totalWeight} pts
            </span>
            <button
              type="button"
              onClick={() => onNavigate('results')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Full Breakdown &amp; Bar Chart</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Comparison History Table */}
      <div className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-slate-800/90 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Recent Comparison History
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Reopen any saved comparison to inspect or update its criteria and ratings.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('saved')}
            className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline whitespace-nowrap shrink-0 self-start sm:self-auto cursor-pointer"
          >
            View All Saved ({savedComparisons.length})
          </button>
        </div>

        {savedComparisons.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No saved comparisons yet
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
              Save your current comparison or start a new step-by-step comparison.
            </p>
            <button
              type="button"
              onClick={triggerSave}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-400 to-indigo-500 cursor-pointer"
            >
              Save Current Comparison
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 pr-4">Comparison Title</th>
                  <th className="py-2.5 px-4">Options Compared</th>
                  <th className="py-2.5 px-4">Criteria</th>
                  <th className="py-2.5 px-4">Outcome / Winner</th>
                  <th className="py-2.5 px-4 text-right">Top Score</th>
                  <th className="py-2.5 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/70 text-xs">
                {savedComparisons.slice(0, 5).map((comp) => {
                  const calc = calculation.resultsByOptionId[comp.options[0]?.id]
                    ? undefined
                    : null;
                  // Compute score for each row
                  const totalW = comp.criteria.reduce((s, c) => s + c.weight, 0);
                  const scores = comp.options.map((o) => {
                    const sum = comp.criteria.reduce(
                      (acc, c) => acc + (comp.ratings[o.id]?.[c.id] ?? 0) * c.weight,
                      0
                    );
                    return {
                      name: o.name,
                      score: totalW > 0 ? sum / totalW : 0,
                    };
                  });
                  scores.sort((a, b) => b.score - a.score);
                  const top = scores[0]?.score ?? 0;
                  const topWinners = scores.filter((s) => Math.abs(s.score - top) < 1e-5);
                  const isTie = topWinners.length > 1;
                  const isCurrent = comp.id === activeComparison.id;

                  return (
                    <tr
                      key={comp.id}
                      className={`group transition-colors ${
                        isCurrent
                          ? 'bg-cyan-500/5 dark:bg-cyan-500/5'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 pr-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span>{comp.title}</span>
                          {isCurrent && (
                            <span className="text-[11px] font-normal text-cyan-600 dark:text-cyan-400">
                              · Active
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {comp.options.map((o) => o.name).join(' vs. ')}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {comp.criteria.length} criteria
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {isTie ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            Tie ({topWinners.map((w) => w.name).join(' & ')})
                          </span>
                        ) : (
                          <span className="text-cyan-600 dark:text-cyan-400">
                            {scores[0]?.name}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatScore(top, precision)}/10
                      </td>
                      <td className="py-3 pl-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectSavedComparison(comp, 'dashboard')}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#1E293B] hover:bg-cyan-500 hover:text-white text-slate-700 dark:text-slate-200 font-medium transition-colors cursor-pointer"
                          >
                            Load
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectSavedComparison(comp, 'results')}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#1E293B] hover:bg-indigo-500 hover:text-white text-slate-700 dark:text-slate-200 font-medium transition-colors cursor-pointer"
                          >
                            Results
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteSavedComparison(comp.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                            title="Delete saved comparison"
                            aria-label={`Delete ${comp.title}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
