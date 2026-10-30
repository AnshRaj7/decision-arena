import React, { useState } from 'react';
import {
  Search,
  Trash2,
  FolderOpen,
  PieChart,
  Copy,
  Plus,
  RotateCcw,
  Trophy,
  Scale,
} from 'lucide-react';
import { Comparison, NavSection } from '../types/decision';
import { calculateComparisonScores, formatScore } from '../utils/calculations';

interface SavedComparisonsViewProps {
  savedComparisons: Comparison[];
  activeComparisonId: string;
  precision: 1 | 2;
  onSelectComparison: (comp: Comparison, targetSection: NavSection) => void;
  onDuplicateComparison: (comp: Comparison) => void;
  onDeleteComparison: (id: string) => void;
  onRestoreDemoData: () => void;
  onStartNewComparison: () => void;
}

export const SavedComparisonsView: React.FC<SavedComparisonsViewProps> = ({
  savedComparisons,
  activeComparisonId,
  precision,
  onSelectComparison,
  onDuplicateComparison,
  onDeleteComparison,
  onRestoreDemoData,
  onStartNewComparison,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [optionCountFilter, setOptionCountFilter] = useState<'all' | '2' | '3'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = savedComparisons.filter((comp) => {
    const matchesSearch =
      comp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.options.some((o) =>
        o.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesCount =
      optionCountFilter === 'all' ||
      String(comp.options.length) === optionCountFilter;

    return matchesSearch && matchesCount;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Saved Comparisons
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Stored persistently in your browser’s localStorage across sessions and refreshes.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onRestoreDemoData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#131C31] hover:bg-slate-100 dark:hover:bg-[#1E293B] border border-slate-200 dark:border-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Load Sample Presets</span>
          </button>

          <button
            type="button"
            onClick={onStartNewComparison}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 shadow-[0_0_20px_-4px_rgba(6,182,212,0.5)] transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Comparison</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-slate-800/90 p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved comparisons by title, category, or option name..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 shrink-0">
          {(['all', '2', '3'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setOptionCountFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                optionCountFilter === tab
                  ? 'bg-white dark:bg-[#1E293B] text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab === 'all' ? 'All Saved' : `${tab} Options`}
            </button>
          ))}
        </div>
      </div>

      {/* Saved Comparisons Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-slate-800/90 p-12 text-center">
          <p className="text-base font-bold text-slate-900 dark:text-white">
            {savedComparisons.length === 0
              ? 'No saved comparisons in storage'
              : 'No comparisons match your search'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5 max-w-md mx-auto">
            {savedComparisons.length === 0
              ? 'Create a new comparison or restore the sample comparisons to start evaluating options.'
              : 'Try clearing your search filter or switching the option count tab.'}
          </p>
          <div className="inline-flex items-center gap-3">
            <button
              type="button"
              onClick={onStartNewComparison}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-400 to-indigo-500 cursor-pointer"
            >
              Create New Comparison
            </button>
            {savedComparisons.length === 0 && (
              <button
                type="button"
                onClick={onRestoreDemoData}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#1E293B] cursor-pointer"
              >
                Restore Sample Comparisons
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((comp) => {
            const calc = calculateComparisonScores(comp);
            const isActive = comp.id === activeComparisonId;
            const formattedDate = new Date(comp.updatedAt).toLocaleDateString(
              undefined,
              {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }
            );

            return (
              <div
                key={comp.id}
                className={`rounded-2xl bg-white dark:bg-[#131C31] border p-5 flex flex-col justify-between transition-all ${
                  isActive
                    ? 'border-cyan-400/80 shadow-[0_0_24px_-8px_rgba(6,182,212,0.3)]'
                    : 'border-slate-200 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Metadata Line */}
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <span>{comp.category || 'General'}</span>
                      <span>·</span>
                      <span>{comp.criteria.length} criteria</span>
                      <span>·</span>
                      <span>Updated {formattedDate}</span>
                    </div>
                    {isActive && (
                      <span className="text-cyan-600 dark:text-cyan-400 font-semibold shrink-0">
                        Active in Arena
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                    {comp.title}
                  </h3>

                  {/* Mini Option Score Breakdown */}
                  <div className="space-y-2 mb-5">
                    {calc.rankedResults.map((res) => {
                      const isTop = res.rank === 1;
                      const pct = Math.max(
                        0,
                        Math.min(100, (res.weightedScore / 10) * 100)
                      );
                      return (
                        <div key={res.option.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className={`font-mono font-bold ${
                                  isTop
                                    ? 'text-cyan-600 dark:text-cyan-400'
                                    : 'text-slate-400'
                                }`}
                              >
                                #{res.rank}
                              </span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {res.option.name}
                              </span>
                            </div>
                            <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                              {formatScore(res.weightedScore, precision)}/10
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-[#0B1120] overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isTop
                                  ? 'bg-gradient-to-r from-cyan-400 to-indigo-500'
                                  : 'bg-slate-400 dark:bg-slate-600'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Card Footer: Outcome & Actions */}
                <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    {calc.hasTieAtTop ? (
                      <>
                        <Scale className="w-4 h-4 text-amber-500" />
                        <span className="text-amber-600 dark:text-amber-400">
                          Tie at {formatScore(calc.topScore, precision)}/10
                        </span>
                      </>
                    ) : (
                      <>
                        <Trophy className="w-4 h-4 text-cyan-500" />
                        <span className="text-cyan-600 dark:text-cyan-400">
                          Winner: {calc.rankedResults[0]?.option.name}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onSelectComparison(comp, 'results')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 hover:bg-cyan-500 hover:text-white transition-colors cursor-pointer"
                    >
                      <PieChart className="w-3.5 h-3.5" />
                      <span>View Results</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectComparison(comp, 'new-comparison')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDuplicateComparison(comp)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-[#1E293B] transition-colors cursor-pointer"
                      title="Duplicate comparison"
                      aria-label={`Duplicate ${comp.title}`}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {confirmDeleteId === comp.id ? (
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteComparison(comp.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-500 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                      >
                        Confirm
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(comp.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 bg-slate-100 dark:bg-[#1E293B] transition-colors cursor-pointer"
                        title="Delete comparison"
                        aria-label={`Delete ${comp.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
