/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  AppSettings,
  Comparison,
  NavSection,
} from './types/decision';
import {
  calculateComparisonScores,
  createBlankComparison,
  INITIAL_SAMPLE_COMPARISONS,
} from './utils/calculations';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { NewComparisonWizard } from './components/NewComparisonWizard';
import { VoiceAssistantView } from './components/VoiceAssistantView';
import { ResultsView } from './components/ResultsView';
import { SavedComparisonsView } from './components/SavedComparisonsView';
import { SettingsView } from './components/SettingsView';
import { FloatingVoiceOrb } from './components/FloatingVoiceOrb';
import { PersonalizationModal } from './components/PersonalizationModal';

const STORAGE_KEYS = {
  SAVED_COMPARISONS: 'decision_arena_saved_v1',
  ACTIVE_COMPARISON: 'decision_arena_active_v1',
  SETTINGS: 'decision_arena_settings_v2',
  TOTAL_DECISIONS: 'decision_arena_total_count_v1',
};

const DEFAULT_SETTINGS: AppSettings = {
  userName: '',
  userAge: '',
  hasCompletedOnboarding: false,
  theme: 'dark',
  scorePrecision: 1,
  defaultOptionCount: 3,
  showFormulaExplanation: true,
};

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isVoiceSessionActive, setIsVoiceSessionActive] = useState(false);
  const [voiceFocusTrigger, setVoiceFocusTrigger] = useState(0);

  // Personalization modal state
  const [isPersonalizationOpen, setIsPersonalizationOpen] = useState(false);
  const [pendingActivityLabel, setPendingActivityLabel] = useState<string | undefined>(
    undefined
  );
  const pendingActionRef = useRef<(() => void) | null>(null);

  // Load Settings from localStorage
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          hasCompletedOnboarding: Boolean(
            parsed.hasCompletedOnboarding && parsed.userName?.trim()
          ),
        };
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_SETTINGS;
  });

  // Load Saved Comparisons from localStorage (seed with optional sample comparisons on first visit)
  const [savedComparisons, setSavedComparisons] = useState<Comparison[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SAVED_COMPARISONS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_SAMPLE_COMPARISONS;
  });

  // Load Active Comparison from localStorage
  const [activeComparison, setActiveComparison] = useState<Comparison>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_COMPARISON);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id && Array.isArray(parsed.options)) {
          return parsed;
        }
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_SAMPLE_COMPARISONS[0];
  });

  // Load Total Decisions Counter
  const [totalDecisionsCount, setTotalDecisionsCount] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TOTAL_DECISIONS);
      if (raw) {
        const num = parseInt(raw, 10);
        if (!isNaN(num)) return num;
      }
    } catch {
      // ignore
    }
    return 24;
  });

  // Sync theme class on <html> and <body>
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
      document.body.className =
        'bg-[#0B1120] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200';
    } else {
      root.classList.remove('dark');
      document.body.className =
        'bg-slate-100 text-slate-900 antialiased selection:bg-cyan-500/20 selection:text-cyan-900';
    }
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  // Persist Saved Comparisons
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.SAVED_COMPARISONS,
        JSON.stringify(savedComparisons)
      );
    } catch {
      // ignore
    }
  }, [savedComparisons]);

  // Persist Active Comparison
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.ACTIVE_COMPARISON,
        JSON.stringify(activeComparison)
      );
    } catch {
      // ignore
    }
  }, [activeComparison]);

  // Persist Total Decisions Count
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.TOTAL_DECISIONS,
        String(totalDecisionsCount)
      );
    } catch {
      // ignore
    }
  }, [totalDecisionsCount]);

  // Live Score Calculation for the Active Comparison
  const calculation = useMemo(
    () => calculateComparisonScores(activeComparison),
    [activeComparison]
  );

  // Gate main user activities with the one-time Personalization Popup if not completed yet
  const requirePersonalization = (activityLabel: string, action: () => void) => {
    if (settings.hasCompletedOnboarding && settings.userName.trim() !== '') {
      action();
      return;
    }
    pendingActionRef.current = action;
    setPendingActivityLabel(activityLabel);
    setIsPersonalizationOpen(true);
  };

  const handlePersonalizationComplete = (displayName: string, age: string) => {
    setSettings((prev) => ({
      ...prev,
      userName: displayName,
      userAge: age,
      hasCompletedOnboarding: true,
    }));
    setIsPersonalizationOpen(false);
    setPendingActivityLabel(undefined);

    if (pendingActionRef.current) {
      const nextAction = pendingActionRef.current;
      pendingActionRef.current = null;
      nextAction();
    }
  };

  const handlePersonalizationClose = () => {
    setIsPersonalizationOpen(false);
    setPendingActivityLabel(undefined);
    if (pendingActionRef.current) {
      const nextAction = pendingActionRef.current;
      pendingActionRef.current = null;
      nextAction();
    }
  };

  // Navigate handler that triggers personalization on first main comparison/voice activity
  const handleNavigate = (section: NavSection) => {
    if (section === 'new-comparison') {
      requirePersonalization('New Comparison', () => setActiveSection('new-comparison'));
      return;
    }
    if (section === 'voice-assistant') {
      requirePersonalization('AI Voice Assistant', () =>
        setActiveSection('voice-assistant')
      );
      return;
    }
    if (section === 'results') {
      requirePersonalization('Comparison Results', () => setActiveSection('results'));
      return;
    }
    setActiveSection(section);
  };

  // Update active comparison and auto-sync if it is already in savedComparisons
  const handleUpdateActiveComparison = (updated: Comparison) => {
    setActiveComparison(updated);
    setSavedComparisons((prev) => {
      const exists = prev.some((c) => c.id === updated.id);
      if (!exists) return prev;
      return prev.map((c) => (c.id === updated.id ? updated : c));
    });
  };

  // Save or update active comparison in savedComparisons list
  const handleSaveActiveComparison = () => {
    requirePersonalization('Save Comparison', () => {
      const updatedComp: Comparison = {
        ...activeComparison,
        updatedAt: new Date().toISOString(),
      };
      setActiveComparison(updatedComp);
      setSavedComparisons((prev) => {
        const exists = prev.some((c) => c.id === updatedComp.id);
        if (exists) {
          return prev.map((c) => (c.id === updatedComp.id ? updatedComp : c));
        }
        setTotalDecisionsCount((cnt) => cnt + 1);
        return [updatedComp, ...prev];
      });
    });
  };

  // Start a brand new comparison and navigate to the Step-by-Step Builder
  const handleStartNewComparison = () => {
    requirePersonalization('New Comparison', () => {
      const blank = createBlankComparison(settings.defaultOptionCount);
      setActiveComparison(blank);
      setActiveSection('new-comparison');
    });
  };

  // Reset current builder to blank with specified option count
  const handleResetBlank = (optionCount: 2 | 3) => {
    const blank = createBlankComparison(optionCount);
    setActiveComparison(blank);
  };

  // Load a saved or template comparison
  const handleSelectSavedComparison = (
    comp: Comparison,
    targetSection: NavSection = 'results'
  ) => {
    requirePersonalization('Start Comparing', () => {
      const copy: Comparison = JSON.parse(JSON.stringify(comp));
      setActiveComparison(copy);
      setActiveSection(targetSection);
    });
  };

  // Duplicate a saved comparison
  const handleDuplicateComparison = (comp: Comparison) => {
    requirePersonalization('Duplicate Comparison', () => {
      const copy: Comparison = JSON.parse(JSON.stringify(comp));
      const duplicated: Comparison = {
        ...copy,
        id: `comp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: `${copy.title} (Copy)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSample: false,
      };
      setSavedComparisons((prev) => [duplicated, ...prev]);
      setActiveComparison(duplicated);
      setTotalDecisionsCount((cnt) => cnt + 1);
    });
  };

  // Delete a saved comparison
  const handleDeleteSavedComparison = (id: string) => {
    setSavedComparisons((prev) => prev.filter((c) => c.id !== id));
  };

  // Restore demo sample comparisons
  const handleRestoreDemoData = () => {
    setSavedComparisons((prev) => {
      const existingIds = new Set(prev.map((c) => c.id));
      const missingSamples = INITIAL_SAMPLE_COMPARISONS.filter(
        (s) => !existingIds.has(s.id)
      );
      return [...missingSamples, ...prev];
    });
    setActiveComparison(INITIAL_SAMPLE_COMPARISONS[0]);
  };

  // Clear all saved comparisons
  const handleClearAllSaved = () => {
    setSavedComparisons([]);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-100 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 transition-colors duration-150">
      {/* Left Sidebar Navigation */}
      <Sidebar
        activeSection={activeSection}
        onNavigate={handleNavigate}
        savedCount={savedComparisons.length}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {activeSection === 'dashboard' && (
            <DashboardView
              userName={settings.userName}
              activeComparison={activeComparison}
              calculation={calculation}
              savedComparisons={savedComparisons}
              totalDecisionsCount={totalDecisionsCount}
              precision={settings.scorePrecision}
              onStartNewComparison={handleStartNewComparison}
              onUpdateActiveComparison={handleUpdateActiveComparison}
              onSaveActiveComparison={handleSaveActiveComparison}
              onSelectSavedComparison={handleSelectSavedComparison}
              onDeleteSavedComparison={handleDeleteSavedComparison}
              onNavigate={handleNavigate}
            />
          )}

          {activeSection === 'new-comparison' && (
            <NewComparisonWizard
              comparison={activeComparison}
              calculation={calculation}
              precision={settings.scorePrecision}
              onUpdateComparison={handleUpdateActiveComparison}
              onSaveAndViewResults={() => {
                handleSaveActiveComparison();
                setActiveSection('results');
              }}
              onResetBlank={handleResetBlank}
              onLoadTemplate={(tmpl) => {
                const copy: Comparison = JSON.parse(JSON.stringify(tmpl));
                setActiveComparison(copy);
              }}
              onNavigate={handleNavigate}
            />
          )}

          <div className={activeSection === 'voice-assistant' ? 'block' : 'hidden'}>
            <VoiceAssistantView
              precision={settings.scorePrecision}
              onActiveStateChange={setIsVoiceSessionActive}
              focusTrigger={voiceFocusTrigger}
              onApproveDraft={(approvedComparison, targetSection) => {
                setActiveComparison(approvedComparison);
                if (targetSection === 'results') {
                  setSavedComparisons((prev) => [approvedComparison, ...prev]);
                  setTotalDecisionsCount((cnt) => cnt + 1);
                }
                setActiveSection(targetSection);
              }}
            />
          </div>

          {activeSection === 'results' && (
            <ResultsView
              comparison={activeComparison}
              calculation={calculation}
              precision={settings.scorePrecision}
              showFormulaExplanation={settings.showFormulaExplanation}
              onUpdateComparison={handleUpdateActiveComparison}
              onSaveComparison={handleSaveActiveComparison}
              onStartNewComparison={handleStartNewComparison}
              onNavigate={handleNavigate}
            />
          )}

          {activeSection === 'saved' && (
            <SavedComparisonsView
              savedComparisons={savedComparisons}
              activeComparisonId={activeComparison.id}
              precision={settings.scorePrecision}
              onSelectComparison={handleSelectSavedComparison}
              onDuplicateComparison={handleDuplicateComparison}
              onDeleteComparison={handleDeleteSavedComparison}
              onRestoreDemoData={handleRestoreDemoData}
              onStartNewComparison={handleStartNewComparison}
            />
          )}

          {activeSection === 'settings' && (
            <SettingsView
              settings={settings}
              savedComparisons={savedComparisons}
              onUpdateSettings={setSettings}
              onRestoreDemoData={handleRestoreDemoData}
              onClearAllSaved={handleClearAllSaved}
              onOpenPersonalizationModal={() => {
                pendingActionRef.current = null;
                setPendingActivityLabel(undefined);
                setIsPersonalizationOpen(true);
              }}
            />
          )}
        </div>
      </main>

      {/* Global Floating AI Voice Assistant Button */}
      <FloatingVoiceOrb
        isOnVoiceSection={activeSection === 'voice-assistant'}
        isVoiceSessionActive={isVoiceSessionActive}
        onActivateVoiceAssistant={() => {
          requirePersonalization('AI Voice Assistant', () => {
            setActiveSection('voice-assistant');
            setVoiceFocusTrigger((prev) => prev + 1);
          });
        }}
      />

      {/* Deferred Personalization Modal (Triggered on First Main Activity or Profile Edit) */}
      <PersonalizationModal
        isOpen={isPersonalizationOpen}
        initialName={settings.userName}
        initialAge={settings.userAge}
        pendingActivityLabel={pendingActivityLabel}
        onComplete={handlePersonalizationComplete}
        onClose={handlePersonalizationClose}
      />
    </div>
  );
}
