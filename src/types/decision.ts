export type NavSection =
  | 'dashboard'
  | 'new-comparison'
  | 'voice-assistant'
  | 'results'
  | 'saved'
  | 'settings';

export interface OptionItem {
  id: string;
  slotLabel: string; // e.g., "Option A", "Option B", "Option C"
  name: string;
  description?: string;
}

export interface Criterion {
  id: string;
  name: string;
  weight: number; // 1 to 10
}

// ratings[optionId][criterionId] = number (1 to 10)
export type RatingsMap = Record<string, Record<string, number>>;

export interface Comparison {
  id: string;
  title: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  options: OptionItem[]; // 2 or 3 options
  criteria: Criterion[];
  ratings: RatingsMap;
  isSample?: boolean;
}

export interface CriterionBreakdown {
  criterionId: string;
  criterionName: string;
  weight: number;
  normalizedWeightPct: number;
  rating: number;
  weightedProduct: number; // rating * weight
  normalizedContribution: number; // (rating * weight) / totalWeight
}

export interface OptionScoreResult {
  option: OptionItem;
  optionIndex: number;
  weightedScore: number; // 0 to 10 scale
  rawWeightedSum: number; // Sum(Rating * Weight)
  totalWeight: number; // Sum(Weights)
  rank: number; // 1, 2, 3
  isWinner: boolean; // true if rank === 1 and not a tie, or part of top tie
  isTieForFirst: boolean;
  criterionBreakdowns: CriterionBreakdown[];
}

export interface ComparisonCalculation {
  resultsByOptionId: Record<string, OptionScoreResult>;
  orderedResults: OptionScoreResult[]; // In original option order (Option A, B, C)
  rankedResults: OptionScoreResult[]; // Sorted highest score first
  totalWeight: number;
  hasTieAtTop: boolean;
  topScore: number;
  winners: OptionScoreResult[];
  isValid: boolean;
  missingRatingsCount: number;
  validationErrors: string[];
}

export interface AppSettings {
  userName: string;
  userAge?: string;
  hasCompletedOnboarding: boolean;
  theme: 'dark' | 'light';
  scorePrecision: 1 | 2;
  defaultOptionCount: 2 | 3;
  showFormulaExplanation: boolean;
}

export interface ProposedComparisonDraft {
  title: string;
  category?: string;
  options: { name: string; description?: string }[];
  criteria: { name: string; weight: number }[];
  ratings: { optionName: string; criterionName: string; rating: number }[];
}

export interface VoiceTranscriptEntry {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
}

