import React, { useState } from 'react';
import {
  Moon,
  Sun,
  User,
  Sliders,
  Download,
  RotateCcw,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { AppSettings, Comparison } from '../types/decision';

interface SettingsViewProps {
  settings: AppSettings;
  savedComparisons: Comparison[];
  onUpdateSettings: (newSettings: AppSettings) => void;
  onRestoreDemoData: () => void;
  onClearAllSaved: () => void;
  onOpenPersonalizationModal?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  savedComparisons,
  onUpdateSettings,
  onRestoreDemoData,
  onClearAllSaved,
  onOpenPersonalizationModal,
}) => {
  const [confirmClear, setConfirmClear] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 2400);
  };

  const handleExportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      settings,
      savedComparisons,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `decision-arena-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Exported comparisons to JSON file.');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Settings &amp; Preferences
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Customize your Decision Arena workspace, appearance, calculation display, and browser storage.
        </p>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Profile & Greeting */}
      <div className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-slate-800/90 p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <User className="w-4 h-4 text-cyan-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Profile &amp; Dashboard Greeting
            </h2>
          </div>

          {onOpenPersonalizationModal && (
            <button
              type="button"
              onClick={onOpenPersonalizationModal}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-[#1E293B] text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500 hover:text-white border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              Open Profile Popup
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Display Name *
              </label>
              <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400">
                Required
              </span>
            </div>
            <input
              type="text"
              value={settings.userName}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  userName: e.target.value,
                  hasCompletedOnboarding: Boolean(e.target.value.trim()),
                })
              }
              placeholder="Enter your display name"
              className="w-full px-3.5 py-2 rounded-xl text-sm bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              {settings.userName.trim()
                ? `Greeting: "Welcome back, ${settings.userName.trim()}"`
                : 'Enter a name to personalize your dashboard greeting.'}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Age
              </label>
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                Optional
              </span>
            </div>
            <input
              type="number"
              min={5}
              max={120}
              value={settings.userAge || ''}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  userAge: e.target.value,
                })
              }
              placeholder="e.g., 21 (optional)"
              className="w-full px-3.5 py-2 rounded-xl text-sm font-mono tabular-nums bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-400"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
              Stored locally in your browser preferences.
            </p>
          </div>
        </div>
      </div>

      {/* Appearance & Theme */}
      <div className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-slate-800/90 p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
          {settings.theme === 'dark' ? (
            <Moon className="w-4 h-4 text-cyan-400" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500" />
          )}
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Theme Preference
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => onUpdateSettings({ ...settings, theme: 'dark' })}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
              settings.theme === 'dark'
                ? 'bg-gradient-to-r from-cyan-500/15 to-indigo-500/10 border-cyan-400 shadow-[0_0_20px_-6px_rgba(6,182,212,0.35)]'
                : 'bg-slate-50 dark:bg-[#172136] border-slate-200 dark:border-slate-800'
            }`}
          >
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Deep Navy Dark (Default)
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Signature #0B1120 navy canvas with cyan &amp; indigo accents
              </p>
            </div>
            <Moon className="w-5 h-5 text-cyan-400 shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => onUpdateSettings({ ...settings, theme: 'light' })}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
              settings.theme === 'light'
                ? 'bg-gradient-to-r from-cyan-500/15 to-indigo-500/10 border-cyan-500'
                : 'bg-slate-50 dark:bg-[#172136] border-slate-200 dark:border-slate-800'
            }`}
          >
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Daylight Crisp Slate
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                High-contrast light workspace for bright environments
              </p>
            </div>
            <Sun className="w-5 h-5 text-amber-500 shrink-0" />
          </button>
        </div>
      </div>

      {/* Calculation & Comparison Defaults */}
      <div className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-slate-800/90 p-5 sm:p-6 space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200 dark:border-slate-800">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Scoring &amp; Comparison Defaults
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Score Decimal Precision */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Weighted Score Decimal Precision
            </label>
            <div className="flex items-center gap-2">
              {([1, 2] as const).map((prec) => (
                <button
                  key={prec}
                  type="button"
                  onClick={() =>
                    onUpdateSettings({ ...settings, scorePrecision: prec })
                  }
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-mono font-semibold border transition-colors cursor-pointer ${
                    settings.scorePrecision === prec
                      ? 'bg-cyan-500/15 border-cyan-400 text-cyan-600 dark:text-cyan-300'
                      : 'bg-slate-50 dark:bg-[#0B1120] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {prec === 1 ? '1 Decimal (8.4/10)' : '2 Decimals (8.40/10)'}
                </button>
              ))}
            </div>
          </div>

          {/* Default Option Count */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Default Options for New Comparisons
            </label>
            <div className="flex items-center gap-2">
              {([2, 3] as const).map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() =>
                    onUpdateSettings({ ...settings, defaultOptionCount: cnt })
                  }
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                    settings.defaultOptionCount === cnt
                      ? 'bg-indigo-500/15 border-indigo-400 text-indigo-600 dark:text-indigo-300'
                      : 'bg-slate-50 dark:bg-[#0B1120] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {cnt} Options
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Browser Storage & Demo Data Management */}
      <div className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-slate-800/90 p-5 sm:p-6 space-y-4">
        <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Browser LocalStorage Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Currently storing {savedComparisons.length} saved comparison(s) in your browser.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#1E293B] hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Comparisons (.json)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onRestoreDemoData();
              showToast('Sample comparisons restored.');
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-[#1E293B] hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore Sample Comparisons</span>
          </button>

          {confirmClear ? (
            <div className="inline-flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClearAllSaved();
                  setConfirmClear(false);
                  showToast('Cleared all saved comparisons from localStorage.');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500 text-white hover:bg-rose-600 transition-colors cursor-pointer"
              >
                Confirm Clear All
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Saved Comparisons</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
