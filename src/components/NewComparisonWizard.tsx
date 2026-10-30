import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Check,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  RotateCcw,
  BookmarkCheck,
  Sliders,
} from 'lucide-react';
import {
  Comparison,
  ComparisonCalculation,
  Criterion,
  NavSection,
  OptionItem,
} from '../types/decision';
import {
  formatScore,
  getNormalizedWeightPct,
  INITIAL_SAMPLE_COMPARISONS,
} from '../utils/calculations';

interface NewComparisonWizardProps {
  comparison: Comparison;
  calculation: ComparisonCalculation;
  precision: 1 | 2;
  onUpdateComparison: (updated: Comparison) => void;
  onSaveAndViewResults: () => void;
  onResetBlank: (optionCount: 2 | 3) => void;
  onLoadTemplate: (template: Comparison) => void;
  onNavigate: (section: NavSection) => void;
}

export const NewComparisonWizard: React.FC<NewComparisonWizardProps> = ({
  comparison,
  calculation,
  precision,
  onUpdateComparison,
  onSaveAndViewResults,
  onResetBlank,
  onLoadTemplate,
}) => {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [newCriterionName, setNewCriterionName] = useState('');
  const [newCriterionWeight, setNewCriterionWeight] = useState<number>(8);
  const [stepError, setStepError] = useState<string | null>(null);

  // Set option count between 2 and 3
  const handleSetOptionCount = (count: 2 | 3) => {
    if (count === comparison.options.length) return;

    if (count === 2 && comparison.options.length === 3) {
      const keptOptions = comparison.options.slice(0, 2);
      const updatedRatings = { ...comparison.ratings };
      delete updatedRatings[comparison.options[2].id];
      onUpdateComparison({
        ...comparison,
        updatedAt: new Date().toISOString(),
        options: keptOptions,
        ratings: updatedRatings,
      });
    } else if (count === 3 && comparison.options.length === 2) {
      const newOptId = `opt-c-${Date.now()}`;
      const newOption: OptionItem = {
        id: newOptId,
        slotLabel: 'Option C',
        name: 'Option C',
        description: '',
      };
      const newOptRatings: Record<string, number> = {};
      comparison.criteria.forEach((c) => {
        newOptRatings[c.id] = 6;
      });
      onUpdateComparison({
        ...comparison,
        updatedAt: new Date().toISOString(),
        options: [...comparison.options, newOption],
        ratings: {
          ...comparison.ratings,
          [newOptId]: newOptRatings,
        },
      });
    }
  };

  const handleOptionChange = (
    optionId: string,
    field: 'name' | 'description',
    value: string
  ) => {
    setStepError(null);
    onUpdateComparison({
      ...comparison,
      updatedAt: new Date().toISOString(),
      options: comparison.options.map((o) =>
        o.id === optionId ? { ...o, [field]: value } : o
      ),
    });
  };

  const handleAddCriterion = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCriterionName.trim();
    if (!trimmed) {
      setStepError('Please enter a name for the new criterion.');
      return;
    }
    setStepError(null);
    const critId = `crit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const clampedWeight = Math.min(10, Math.max(1, Math.round(newCriterionWeight)));

    const newCriterion: Criterion = {
      id: critId,
      name: trimmed,
      weight: clampedWeight,
    };

    const updatedRatings = { ...comparison.ratings };
    comparison.options.forEach((opt) => {
      updatedRatings[opt.id] = {
        ...(updatedRatings[opt.id] || {}),
        [critId]: 7,
      };
    });

    onUpdateComparison({
      ...comparison,
      updatedAt: new Date().toISOString(),
      criteria: [...comparison.criteria, newCriterion],
      ratings: updatedRatings,
    });
    setNewCriterionName('');
    setNewCriterionWeight(8);
  };

  const handleUpdateCriterion = (
    criterionId: string,
    updates: Partial<Criterion>
  ) => {
    setStepError(null);
    onUpdateComparison({
      ...comparison,
      updatedAt: new Date().toISOString(),
      criteria: comparison.criteria.map((c) =>
        c.id === criterionId ? { ...c, ...updates } : c
      ),
    });
  };

  const handleDeleteCriterion = (criterionId: string) => {
    if (comparison.criteria.length <= 1) {
      setStepError('A comparison must have at least 1 criterion.');
      return;
    }
    setStepError(null);
    const updatedRatings = { ...comparison.ratings };
    Object.keys(updatedRatings).forEach((optId) => {
      const copy = { ...updatedRatings[optId] };
      delete copy[criterionId];
      updatedRatings[optId] = copy;
    });

    onUpdateComparison({
      ...comparison,
      updatedAt: new Date().toISOString(),
      criteria: comparison.criteria.filter((c) => c.id !== criterionId),
      ratings: updatedRatings,
    });
  };

  const handleSetRating = (
    optionId: string,
    criterionId: string,
    ratingValue: number
  ) => {
    setStepError(null);
    const clamped =
      isNaN(ratingValue) || ratingValue < 1
        ? 0
        : Math.min(10, Math.max(1, Math.round(ratingValue)));

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

  const validateStepAndProceed = (targetStep: 1 | 2 | 3) => {
    setStepError(null);
    if (targetStep > 1) {
      if (!comparison.title.trim()) {
        setStepError('Please enter a title for your comparison.');
        return;
      }
      const emptyOpt = comparison.options.find((o) => !o.name.trim());
      if (emptyOpt) {
        setStepError(`Please provide a custom name for ${emptyOpt.slotLabel}.`);
        return;
      }
    }
    if (targetStep > 2) {
      if (comparison.criteria.length === 0) {
        setStepError('Please add at least one criterion before rating options.');
        return;
      }
      const invalidCrit = comparison.criteria.find(
        (c) => !c.name.trim() || c.weight < 1 || c.weight > 10
      );
      if (invalidCrit) {
        setStepError('Ensure all criteria have a name and a weight between 1 and 10.');
        return;
      }
    }
    setActiveStep(targetStep);
  };

  const handleFinish = () => {
    if (!calculation.isValid) {
      setStepError(
        calculation.validationErrors[0] ||
          'Please complete all required fields and ratings (1–10).'
      );
      return;
    }
    onSaveAndViewResults();
  };

  const steps = [
    {
      num: 1 as const,
      title: 'Step A: Add Options',
      subtitle: 'Compare 2 or 3 options',
    },
    {
      num: 2 as const,
      title: 'Step B: Add Criteria',
      subtitle: 'Weights 1–10 & normalized %',
    },
    {
      num: 3 as const,
      title: 'Step C: Enter Ratings',
      subtitle: 'Rate each option 1–10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Step-by-Step Comparison Builder
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Define 2 or 3 options, assign weighted criteria, and rate each option on a 1–10 scale.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onResetBlank(comparison.options.length as 2 | 3)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#131C31] hover:bg-slate-100 dark:hover:bg-[#1E293B] border border-slate-200 dark:border-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Start Blank</span>
          </button>

          <button
            type="button"
            onClick={handleFinish}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 shadow-[0_0_20px_-4px_rgba(6,182,212,0.5)] transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BookmarkCheck className="w-4 h-4" />
            <span>Save &amp; View Results</span>
          </button>
        </div>
      </div>

      {/* Stepper Navigation Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {steps.map((s) => {
          const isCurrent = activeStep === s.num;
          const isCompleted = activeStep > s.num;
          return (
            <button
              key={s.num}
              type="button"
              onClick={() => validateStepAndProceed(s.num)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                isCurrent
                  ? 'bg-gradient-to-r from-cyan-500/15 via-indigo-500/10 to-transparent border-cyan-400 shadow-[0_0_20px_-6px_rgba(6,182,212,0.3)]'
                  : isCompleted
                  ? 'bg-white dark:bg-[#131C31] border-emerald-500/40 text-slate-800 dark:text-slate-200'
                  : 'bg-white dark:bg-[#131C31] border-slate-200 dark:border-slate-800/90 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div>
                <p
                  className={`text-sm font-bold ${
                    isCurrent
                      ? 'text-cyan-600 dark:text-cyan-400'
                      : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {s.title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {s.subtitle}
                </p>
              </div>
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                  isCurrent
                    ? 'bg-gradient-to-r from-cyan-400 to-indigo-500 text-white'
                    : isCompleted
                    ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/40'
                    : 'bg-slate-100 dark:bg-[#1E293B] text-slate-500 dark:text-slate-400'
                }`}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.num}
              </div>
            </button>
          );
        })}
      </div>

      {/* Validation Error Banner */}
      {stepError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-600 dark:text-rose-300 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{stepError}</span>
        </div>
      )}

      {/* Main Wizard Card + Live Score Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-slate-800/90 p-5 sm:p-6">
          {/* STEP 1: ADD OPTIONS */}
          {activeStep === 1 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Step A — Define Your Decision &amp; Options
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Choose whether to compare 2 or 3 options and give each a clear custom name.
                  </p>
                </div>

                {/* 2 vs 3 Options Selector */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSetOptionCount(2)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      comparison.options.length === 2
                        ? 'bg-gradient-to-r from-cyan-400 to-indigo-500 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    2 Options
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetOptionCount(3)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      comparison.options.length === 3
                        ? 'bg-gradient-to-r from-cyan-400 to-indigo-500 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    3 Options
                  </button>
                </div>
              </div>

              {/* Decision Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Comparison Title *
                  </label>
                  <input
                    type="text"
                    value={comparison.title}
                    onChange={(e) => {
                      setStepError(null);
                      onUpdateComparison({
                        ...comparison,
                        title: e.target.value,
                        updatedAt: new Date().toISOString(),
                      });
                    }}
                    placeholder="e.g., Cloud Platform Selection, Grad School Offer, First Car"
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Category
                  </label>
                  <input
                    type="text"
                    value={comparison.category}
                    onChange={(e) =>
                      onUpdateComparison({
                        ...comparison,
                        category: e.target.value,
                        updatedAt: new Date().toISOString(),
                      })
                    }
                    placeholder="e.g., Academic, Tech, Career"
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Option Input Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {comparison.options.map((opt, idx) => {
                  const accentBorders = [
                    'focus-within:border-cyan-400',
                    'focus-within:border-indigo-400',
                    'focus-within:border-purple-400',
                  ];
                  return (
                    <div
                      key={opt.id}
                      className={`p-4 rounded-xl bg-slate-50 dark:bg-[#172136] border border-slate-200 dark:border-slate-800 transition-colors ${
                        accentBorders[idx % accentBorders.length]
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
                          {opt.slotLabel}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                          Required
                        </span>
                      </div>

                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                        Custom Name *
                      </label>
                      <input
                        type="text"
                        value={opt.name}
                        onChange={(e) =>
                          handleOptionChange(opt.id, 'name', e.target.value)
                        }
                        placeholder={`Enter ${opt.slotLabel} name...`}
                        className="w-full px-3 py-2 rounded-lg text-sm font-semibold bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400 mb-3"
                      />

                      <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                        Short Note (Optional)
                      </label>
                      <input
                        type="text"
                        value={opt.description || ''}
                        onChange={(e) =>
                          handleOptionChange(opt.id, 'description', e.target.value)
                        }
                        placeholder="Key highlight or context..."
                        className="w-full px-3 py-1.5 rounded-lg text-xs bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Optional Sample Presets Bar */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2.5">
                  Or load an optional demo preset to explore:
                </p>
                <div className="flex flex-wrap gap-2">
                  {INITIAL_SAMPLE_COMPARISONS.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => onLoadTemplate(sample)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-slate-300 hover:bg-cyan-500/15 hover:text-cyan-600 dark:hover:text-cyan-300 border border-slate-200 dark:border-slate-700/80 transition-colors cursor-pointer"
                    >
                      {sample.title} ({sample.options.length} options)
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => validateStepAndProceed(2)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 transition-all cursor-pointer"
                >
                  <span>Next: Add &amp; Weight Criteria</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: ADD & WEIGHT CRITERIA */}
          {activeStep === 2 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Step B — Add &amp; Weight Criteria (1 to 10)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Assign each criterion an importance weight from 1 to 10. Normalized percentages are calculated automatically.
                  </p>
                </div>
                <span className="text-xs font-mono tabular-nums text-cyan-600 dark:text-cyan-400 font-semibold whitespace-nowrap">
                  Total Weight: {calculation.totalWeight} pts (100%)
                </span>
              </div>

              {/* Add New Criterion Form */}
              <form
                onSubmit={handleAddCriterion}
                className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
              >
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    New Criterion Name
                  </label>
                  <input
                    type="text"
                    value={newCriterionName}
                    onChange={(e) => setNewCriterionName(e.target.value)}
                    placeholder="e.g., Pricing, Battery Life, Financial Aid, Scalability..."
                    className="w-full px-3.5 py-2 rounded-lg text-sm bg-white dark:bg-[#131C31] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="w-full sm:w-40">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 font-mono tabular-nums">
                    Initial Weight: {newCriterionWeight}/10
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={newCriterionWeight}
                    onChange={(e) => setNewCriterionWeight(Number(e.target.value))}
                    className="w-full arena-slider"
                    style={{
                      background: `linear-gradient(to right, #06B6D4 0%, #6366F1 ${
                        ((newCriterionWeight - 1) / 9) * 100
                      }%, rgba(51, 65, 85, 0.45) ${
                        ((newCriterionWeight - 1) / 9) * 100
                      }%, rgba(51, 65, 85, 0.45) 100%)`,
                      height: '6px',
                      borderRadius: '9999px',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 transition-all whitespace-nowrap shrink-0 cursor-pointer h-[38px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Criterion</span>
                </button>
              </form>

              {/* Criteria List with Weight Sliders & Normalized % */}
              <div className="space-y-3">
                {comparison.criteria.map((crit, index) => {
                  const normPct = getNormalizedWeightPct(
                    crit.weight,
                    calculation.totalWeight
                  );
                  const fillPct = ((crit.weight - 1) / 9) * 100;

                  return (
                    <div
                      key={crit.id}
                      className="p-4 rounded-xl bg-slate-50/80 dark:bg-[#172136] border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-12 items-center gap-4"
                    >
                      {/* Editable Criterion Name */}
                      <div className="md:col-span-4 flex items-center gap-2.5">
                        <span className="text-xs font-mono text-slate-400 dark:text-slate-500 w-5">
                          0{index + 1}.
                        </span>
                        <input
                          type="text"
                          value={crit.name}
                          onChange={(e) =>
                            handleUpdateCriterion(crit.id, { name: e.target.value })
                          }
                          aria-label={`Criterion ${index + 1} name`}
                          className="w-full px-2.5 py-1.5 rounded-lg text-sm font-semibold bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400"
                        />
                      </div>

                      {/* Weight Slider (1-10) */}
                      <div className="md:col-span-5 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                          <span className="text-slate-600 dark:text-slate-300 font-medium">
                            Weight: <strong>{crit.weight}</strong>/10
                          </span>
                          <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
                            {normPct.toFixed(1)}% of total weight
                          </span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={10}
                          step={1}
                          value={crit.weight}
                          onChange={(e) =>
                            handleUpdateCriterion(crit.id, {
                              weight: Number(e.target.value),
                            })
                          }
                          style={{
                            background: `linear-gradient(to right, #06B6D4 0%, #6366F1 ${fillPct}%, rgba(51, 65, 85, 0.45) ${fillPct}%, rgba(51, 65, 85, 0.45) 100%)`,
                            height: '6px',
                            borderRadius: '9999px',
                          }}
                          className="w-full arena-slider"
                        />
                      </div>

                      {/* Quick Number Select & Delete */}
                      <div className="md:col-span-3 flex items-center justify-end gap-2">
                        <select
                          value={crit.weight}
                          onChange={(e) =>
                            handleUpdateCriterion(crit.id, {
                              weight: Number(e.target.value),
                            })
                          }
                          aria-label={`Select weight for ${crit.name}`}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                            <option key={n} value={n}>
                              {n} / 10
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => handleDeleteCriterion(crit.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete criterion"
                          aria-label={`Delete ${crit.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#1E293B] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Options</span>
                </button>

                <button
                  type="button"
                  onClick={() => validateStepAndProceed(3)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 transition-all cursor-pointer"
                >
                  <span>Next: Enter Ratings</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: ENTER RATINGS */}
          {activeStep === 3 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Step C — Rate Every Option (Scale 1 to 10)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Rate each option against every criterion from 1 (lowest) to 10 (highest). Scores update automatically.
                  </p>
                </div>

                <div className="text-xs font-mono tabular-nums">
                  {calculation.missingRatingsCount === 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      All {comparison.options.length * comparison.criteria.length} ratings complete
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">
                      {calculation.missingRatingsCount} rating(s) required
                    </span>
                  )}
                </div>
              </div>

              {/* Criterion-by-Criterion Rating Cards */}
              <div className="space-y-5">
                {comparison.criteria.map((crit, cIdx) => {
                  const normPct = getNormalizedWeightPct(
                    crit.weight,
                    calculation.totalWeight
                  );

                  return (
                    <div
                      key={crit.id}
                      className="p-4 sm:p-5 rounded-xl bg-slate-50/90 dark:bg-[#172136] border border-slate-200 dark:border-slate-800 space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 font-bold">
                            0{cIdx + 1}.
                          </span>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {crit.name}
                          </h3>
                        </div>
                        <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                          Weight: {crit.weight}/10 ({normPct.toFixed(1)}% of decision)
                        </span>
                      </div>

                      <div className="space-y-3.5">
                        {comparison.options.map((opt) => {
                          const currentVal =
                            comparison.ratings[opt.id]?.[crit.id] ?? 0;
                          const isInvalid = currentVal < 1 || currentVal > 10;
                          const fillPct = isInvalid
                            ? 0
                            : ((currentVal - 1) / 9) * 100;

                          return (
                            <div
                              key={opt.id}
                              className="grid grid-cols-1 sm:grid-cols-12 items-center gap-3"
                            >
                              <div className="sm:col-span-4 flex items-center justify-between sm:justify-start gap-2">
                                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                  {opt.name || opt.slotLabel}
                                </span>
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                                  ({opt.slotLabel})
                                </span>
                              </div>

                              {/* Quick 1-10 Number Buttons */}
                              <div className="sm:col-span-6 flex items-center gap-1 flex-wrap sm:flex-nowrap">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                                  const isSelected = currentVal === num;
                                  return (
                                    <button
                                      key={num}
                                      type="button"
                                      onClick={() =>
                                        handleSetRating(opt.id, crit.id, num)
                                      }
                                      className={`w-7 h-7 rounded-lg text-xs font-mono tabular-nums font-semibold transition-all cursor-pointer shrink-0 ${
                                        isSelected
                                          ? 'bg-gradient-to-r from-cyan-400 to-indigo-500 text-white shadow-xs scale-105'
                                          : 'bg-white dark:bg-[#0B1120] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-cyan-400'
                                      }`}
                                    >
                                      {num}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Numeric Input & Contribution */}
                              <div className="sm:col-span-2 flex items-center justify-end gap-1.5 font-mono tabular-nums">
                                <input
                                  type="number"
                                  min={1}
                                  max={10}
                                  value={currentVal || ''}
                                  onChange={(e) =>
                                    handleSetRating(
                                      opt.id,
                                      crit.id,
                                      Number(e.target.value)
                                    )
                                  }
                                  aria-label={`Rating for ${opt.name} on ${crit.name}`}
                                  className={`w-14 px-2 py-1 rounded-lg text-xs font-bold text-center bg-white dark:bg-[#0B1120] border ${
                                    isInvalid
                                      ? 'border-rose-500 text-rose-500'
                                      : 'border-slate-200 dark:border-slate-800 text-cyan-600 dark:text-cyan-400'
                                  } focus:outline-none focus:border-cyan-400`}
                                />
                                <span className="text-xs text-slate-400">/10</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#1E293B] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Criteria</span>
                </button>

                <button
                  type="button"
                  onClick={handleFinish}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 shadow-[0_0_20px_-4px_rgba(6,182,212,0.5)] transition-all cursor-pointer"
                >
                  <BookmarkCheck className="w-4 h-4" />
                  <span>Save &amp; View Visual Results</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Live Calculation Preview Sidebar (4 cols) */}
        <div className="lg:col-span-4 rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-slate-800/90 p-5 space-y-5 sticky top-6">
          <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Live Weighted Scoreboard
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
              Score = Sum(Rating × Weight) / Sum(Weights)
            </p>
          </div>

          <div className="space-y-3">
            {calculation.rankedResults.map((res) => {
              const isTop = res.rank === 1;
              return (
                <div
                  key={res.option.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isTop
                      ? 'bg-gradient-to-r from-cyan-500/12 to-indigo-500/10 border-cyan-400/70'
                      : 'bg-slate-50 dark:bg-[#172136] border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span
                        className={`text-xs font-bold ${
                          res.isTieForFirst
                            ? 'text-amber-500 dark:text-amber-400'
                            : isTop
                            ? 'text-cyan-600 dark:text-cyan-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {res.isTieForFirst
                          ? 'Tied 1st Place'
                          : isTop
                          ? 'Current Leader'
                          : `Rank #${res.rank}`}
                      </span>
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {res.option.name || res.option.slotLabel}
                      </p>
                    </div>
                    <div className="text-right font-mono tabular-nums shrink-0">
                      <span className="text-lg font-bold text-slate-900 dark:text-white">
                        {formatScore(res.weightedScore, precision)}
                      </span>
                      <span className="text-xs text-slate-400">/10</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Normalized Weight Breakdown Summary */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>Normalized Criteria Weights</span>
              <span className="font-mono tabular-nums">{calculation.totalWeight} pts</span>
            </div>
            <div className="space-y-1.5">
              {comparison.criteria.map((c) => {
                const pct = getNormalizedWeightPct(c.weight, calculation.totalWeight);
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400"
                  >
                    <span className="truncate pr-2">{c.name}</span>
                    <span className="font-mono tabular-nums shrink-0">
                      {c.weight}/10 ({pct.toFixed(1)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
