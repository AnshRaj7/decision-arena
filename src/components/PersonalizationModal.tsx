import React, { useState, useEffect, useRef } from 'react';
import { User, Sparkles, ArrowRight, X, AlertCircle } from 'lucide-react';

interface PersonalizationModalProps {
  isOpen: boolean;
  initialName: string;
  initialAge?: string;
  pendingActivityLabel?: string;
  onComplete: (displayName: string, age: string) => void;
  onClose: () => void;
}

export const PersonalizationModal: React.FC<PersonalizationModalProps> = ({
  isOpen,
  initialName,
  initialAge = '',
  pendingActivityLabel,
  onComplete,
  onClose,
}) => {
  const [name, setName] = useState(initialName);
  const [age, setAge] = useState(initialAge);
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setAge(initialAge || '');
      setError(null);
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, initialName, initialAge]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Display Name is required to personalize your workspace.');
      nameInputRef.current?.focus();
      return;
    }

    const trimmedAge = age.trim();
    if (trimmedAge !== '') {
      const numericAge = Number(trimmedAge);
      if (isNaN(numericAge) || !Number.isInteger(numericAge) || numericAge < 5 || numericAge > 120) {
        setError('Please enter a valid whole number for Age (5–120) or leave it blank.');
        return;
      }
    }

    setError(null);
    onComplete(trimmedName, trimmedAge);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="personalization-modal-title"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#131C31] border border-cyan-500/40 dark:border-cyan-400/50 shadow-[0_0_40px_-10px_rgba(6,182,212,0.4)] p-6 overflow-hidden">
        {/* Top Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close personalization popup"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-400/20 to-indigo-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-500 dark:text-cyan-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2
              id="personalization-modal-title"
              className="text-lg font-bold text-slate-900 dark:text-white"
            >
              Personalize Your Workspace
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {pendingActivityLabel
                ? `Quick one-time setup before continuing to ${pendingActivityLabel}`
                : 'Update your Decision Arena profile preferences'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs font-medium text-rose-600 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mandatory Display Name */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="personalize-display-name"
                className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5 text-cyan-500" />
                <span>Display Name *</span>
              </label>
              <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400">
                Required
              </span>
            </div>
            <input
              ref={nameInputRef}
              id="personalize-display-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Enter your name (e.g., Alex, Priya, Rohan)"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm font-medium bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          {/* Optional Age */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="personalize-age"
                className="text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                Age
              </label>
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                Optional
              </span>
            </div>
            <input
              id="personalize-age"
              type="number"
              min={5}
              max={120}
              value={age}
              onChange={(e) => {
                setAge(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g., 21 (optional)"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm font-mono tabular-nums bg-slate-50 dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Saved in your browser so we won’t ask again on future visits. You can update your name or age anytime in Settings.
          </p>

          {/* Submit & Continue Button */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Later
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-400 to-indigo-500 hover:from-cyan-300 hover:to-indigo-400 shadow-[0_0_20px_-4px_rgba(6,182,212,0.6)] transition-all cursor-pointer"
            >
              <span>Save &amp; Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PersonalizationModal;
