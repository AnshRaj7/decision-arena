import {
  Comparison,
  ComparisonCalculation,
  Criterion,
  CriterionBreakdown,
  OptionItem,
  OptionScoreResult,
  ProposedComparisonDraft,
  RatingsMap,
} from '../types/decision';

/**
 * Calculates the normalized percentage (0 - 100) of a single criterion's weight
 * relative to the sum of all criteria weights.
 */
export function getNormalizedWeightPct(weight: number, totalWeight: number): number {
  if (totalWeight <= 0) return 0;
  return (weight / totalWeight) * 100;
}

/**
 * Validates and calculates weighted scores for a comparison using:
 * Weighted Score = Sum(Rating * Weight) / Sum(Weights)
 */
export function calculateComparisonScores(comparison: Comparison): ComparisonCalculation {
  const { options, criteria, ratings } = comparison;
  const validationErrors: string[] = [];

  if (options.length < 2 || options.length > 3) {
    validationErrors.push('Please include 2 or 3 options to compare.');
  }

  options.forEach((opt, idx) => {
    if (!opt.name || opt.name.trim() === '') {
      validationErrors.push(`Option ${String.fromCharCode(65 + idx)} needs a custom name.`);
    }
  });

  if (criteria.length === 0) {
    validationErrors.push('Add at least one criterion to evaluate your options.');
  }

  criteria.forEach((crit, idx) => {
    if (!crit.name || crit.name.trim() === '') {
      validationErrors.push(`Criterion #${idx + 1} needs a name.`);
    }
    if (typeof crit.weight !== 'number' || isNaN(crit.weight) || crit.weight < 1 || crit.weight > 10) {
      validationErrors.push(`Criterion "${crit.name || idx + 1}" must have a weight between 1 and 10.`);
    }
  });

  const totalWeight = criteria.reduce((acc, c) => {
    const validWeight = typeof c.weight === 'number' && !isNaN(c.weight) ? Math.min(10, Math.max(1, c.weight)) : 0;
    return acc + validWeight;
  }, 0);

  let missingRatingsCount = 0;

  options.forEach((opt) => {
    criteria.forEach((crit) => {
      const val = ratings[opt.id]?.[crit.id];
      if (typeof val !== 'number' || isNaN(val) || val < 1 || val > 10) {
        missingRatingsCount += 1;
      }
    });
  });

  if (missingRatingsCount > 0) {
    validationErrors.push(
      `${missingRatingsCount} rating${missingRatingsCount > 1 ? 's are' : ' is'} missing or outside the 1–10 scale.`
    );
  }

  const prelimResults: Omit<OptionScoreResult, 'rank' | 'isWinner' | 'isTieForFirst'>[] = options.map(
    (option, optionIndex) => {
      let rawWeightedSum = 0;
      const criterionBreakdowns: CriterionBreakdown[] = criteria.map((crit) => {
        const rawRating = ratings[option.id]?.[crit.id];
        const rating =
          typeof rawRating === 'number' && !isNaN(rawRating)
            ? Math.min(10, Math.max(1, rawRating))
            : 0;
        const weight =
          typeof crit.weight === 'number' && !isNaN(crit.weight)
            ? Math.min(10, Math.max(1, crit.weight))
            : 0;
        const normalizedWeightPct = getNormalizedWeightPct(weight, totalWeight);
        const weightedProduct = rating * weight;
        const normalizedContribution = totalWeight > 0 ? weightedProduct / totalWeight : 0;

        rawWeightedSum += weightedProduct;

        return {
          criterionId: crit.id,
          criterionName: crit.name,
          weight,
          normalizedWeightPct,
          rating,
          weightedProduct,
          normalizedContribution,
        };
      });

      const weightedScore = totalWeight > 0 ? rawWeightedSum / totalWeight : 0;

      return {
        option,
        optionIndex,
        weightedScore,
        rawWeightedSum,
        totalWeight,
        criterionBreakdowns,
      };
    }
  );

  // Sort descending by weightedScore to determine ranks and ties
  const sortedByScore = [...prelimResults].sort((a, b) => b.weightedScore - a.weightedScore);
  const topScore = sortedByScore.length > 0 ? sortedByScore[0].weightedScore : 0;
  const EPSILON = 1e-5;

  // Count how many options share the highest score
  const topScorers = sortedByScore.filter((r) => Math.abs(r.weightedScore - topScore) < EPSILON && topScore > 0);
  const hasTieAtTop = topScorers.length > 1;

  // Assign standard competition ranks (e.g., 1, 1, 3 or 1, 2, 2)
  const rankedResults: OptionScoreResult[] = [];
  sortedByScore.forEach((item, index) => {
    let rank = index + 1;
    if (index > 0) {
      const prev = rankedResults[index - 1];
      if (Math.abs(item.weightedScore - prev.weightedScore) < EPSILON) {
        rank = prev.rank;
      }
    }
    const isTop = Math.abs(item.weightedScore - topScore) < EPSILON && topScore > 0;
    rankedResults.push({
      ...item,
      rank,
      isWinner: isTop && !hasTieAtTop,
      isTieForFirst: isTop && hasTieAtTop,
    });
  });

  const resultsByOptionId: Record<string, OptionScoreResult> = {};
  rankedResults.forEach((res) => {
    resultsByOptionId[res.option.id] = res;
  });

  const orderedResults = options.map((opt) => resultsByOptionId[opt.id]);
  const winners = rankedResults.filter((r) => r.rank === 1 && r.weightedScore > 0);

  return {
    resultsByOptionId,
    orderedResults,
    rankedResults,
    totalWeight,
    hasTieAtTop,
    topScore,
    winners,
    isValid: validationErrors.length === 0,
    missingRatingsCount,
    validationErrors,
  };
}

export function formatScore(score: number, precision: 1 | 2 = 1): string {
  if (isNaN(score)) return '0.0';
  return score.toFixed(precision);
}

export const INITIAL_SAMPLE_COMPARISONS: Comparison[] = [
  {
    id: 'sample-cloud-platform',
    title: 'Cloud Platform Selection',
    category: 'Infrastructure & Dev',
    createdAt: '2026-10-28T14:30:00.000Z',
    updatedAt: '2026-10-30T05:45:00.000Z',
    isSample: true,
    options: [
      { id: 'opt-a', slotLabel: 'Option A', name: 'CloudProvider X', description: 'Managed enterprise cloud cluster' },
      { id: 'opt-b', slotLabel: 'Option B', name: 'LocalHost Y', description: 'Self-hosted dedicated bare-metal' },
      { id: 'opt-c', slotLabel: 'Option C', name: 'Serverless Z', description: 'Event-driven edge functions' },
    ],
    criteria: [
      { id: 'crit-pricing', name: 'Pricing', weight: 8 },
      { id: 'crit-perf', name: 'Performance', weight: 9 },
      { id: 'crit-support', name: 'Support', weight: 6 },
      { id: 'crit-scale', name: 'Scalability', weight: 9 },
      { id: 'crit-sec', name: 'Security', weight: 8 },
    ],
    ratings: {
      'opt-a': {
        'crit-pricing': 8,
        'crit-perf': 9,
        'crit-support': 9,
        'crit-scale': 9,
        'crit-sec': 7,
      },
      'opt-b': {
        'crit-pricing': 7,
        'crit-perf': 8,
        'crit-support': 7,
        'crit-scale': 6,
        'crit-sec': 8,
      },
      'opt-c': {
        'crit-pricing': 6,
        'crit-perf': 7,
        'crit-support': 5,
        'crit-scale': 7,
        'crit-sec': 7,
      },
    },
  },
  {
    id: 'sample-grad-school',
    title: 'CS Master’s Program Choice',
    category: 'Academic & Career',
    createdAt: '2026-10-24T10:15:00.000Z',
    updatedAt: '2026-10-25T18:20:00.000Z',
    isSample: true,
    options: [
      { id: 'uni-a', slotLabel: 'Option A', name: 'Tech Institute Metro', description: 'Strong AI lab & industry co-op' },
      { id: 'uni-b', slotLabel: 'Option B', name: 'State Research Univ', description: 'Full tuition scholarship + TA stipend' },
      { id: 'uni-c', slotLabel: 'Option C', name: 'European Polytech', description: '1-year accelerated international track' },
    ],
    criteria: [
      { id: 'c-tuition', name: 'Affordability & Aid', weight: 9 },
      { id: 'c-research', name: 'Research Labs', weight: 8 },
      { id: 'c-placement', name: 'Job Placement', weight: 10 },
      { id: 'c-location', name: 'Quality of Life', weight: 6 },
    ],
    ratings: {
      'uni-a': {
        'c-tuition': 6,
        'c-research': 9,
        'c-placement': 10,
        'c-location': 8,
      },
      'uni-b': {
        'c-tuition': 10,
        'c-research': 8,
        'c-placement': 8,
        'c-location': 7,
      },
      'uni-c': {
        'c-tuition': 8,
        'c-research': 7,
        'c-placement': 7,
        'c-location': 9,
      },
    },
  },
  {
    id: 'sample-student-laptop',
    title: 'Engineering Laptop Upgrade',
    category: 'Hardware & Gear',
    createdAt: '2026-10-19T09:00:00.000Z',
    updatedAt: '2026-10-19T11:30:00.000Z',
    isSample: true,
    options: [
      { id: 'lap-a', slotLabel: 'Option A', name: 'ProBook 14 ARM', description: '18hr battery life, silent fanless chassis' },
      { id: 'lap-b', slotLabel: 'Option B', name: 'ThinkStation X1', description: 'Linux compatibility, upgradable RAM' },
    ],
    criteria: [
      { id: 'l-battery', name: 'Battery Life', weight: 9 },
      { id: 'l-perf', name: 'Compile Speed', weight: 8 },
      { id: 'l-port', name: 'Portability', weight: 7 },
      { id: 'l-price', name: 'Student Value', weight: 8 },
    ],
    ratings: {
      'lap-a': {
        'l-battery': 10,
        'l-perf': 9,
        'l-port': 9,
        'l-price': 7,
      },
      'lap-b': {
        'l-battery': 7,
        'l-perf': 8,
        'l-port': 8,
        'l-price': 9,
      },
    },
  },
];

export function createBlankComparison(optionCount: 2 | 3 = 3): Comparison {
  const timestamp = new Date().toISOString();
  const uid = Math.random().toString(36).substring(2, 8);

  const options: OptionItem[] = [
    { id: `opt-a-${uid}`, slotLabel: 'Option A', name: 'Option A' },
    { id: `opt-b-${uid}`, slotLabel: 'Option B', name: 'Option B' },
  ];

  if (optionCount === 3) {
    options.push({ id: `opt-c-${uid}`, slotLabel: 'Option C', name: 'Option C' });
  }

  const criteria: Criterion[] = [
    { id: `crit-1-${uid}`, name: 'Cost & Value', weight: 8 },
    { id: `crit-2-${uid}`, name: 'Quality & Performance', weight: 9 },
    { id: `crit-3-${uid}`, name: 'Ease of Use', weight: 7 },
    { id: `crit-4-${uid}`, name: 'Long-Term Flexibility', weight: 6 },
  ];

  const ratings: RatingsMap = {};
  options.forEach((opt, idx) => {
    ratings[opt.id] = {};
    criteria.forEach((crit) => {
      // Default neutral ratings (e.g. 7, 6, 5) so users can immediately see and adjust
      ratings[opt.id][crit.id] = Math.max(5, 8 - idx);
    });
  });

  return {
    id: `comp-${Date.now()}-${uid}`,
    title: 'Untitled Comparison',
    category: 'Personal Decision',
    createdAt: timestamp,
    updatedAt: timestamp,
    options,
    criteria,
    ratings,
    isSample: false,
  };
}

export function convertProposedDraftToComparison(
  draft: ProposedComparisonDraft
): Comparison {
  const timestamp = new Date().toISOString();
  const uid = Math.random().toString(36).substring(2, 8);

  const rawOptions = Array.isArray(draft.options) ? draft.options.slice(0, 3) : [];
  while (rawOptions.length < 2) {
    rawOptions.push({ name: `Option ${String.fromCharCode(65 + rawOptions.length)}` });
  }

  const options: OptionItem[] = rawOptions.map((opt, idx) => ({
    id: `opt-${String.fromCharCode(97 + idx)}-${uid}`,
    slotLabel: `Option ${String.fromCharCode(65 + idx)}`,
    name: (opt.name || `Option ${String.fromCharCode(65 + idx)}`).trim(),
    description: opt.description ? opt.description.trim() : '',
  }));

  const rawCriteria =
    Array.isArray(draft.criteria) && draft.criteria.length > 0
      ? draft.criteria
      : [
          { name: 'Value & Cost', weight: 8 },
          { name: 'Performance', weight: 9 },
          { name: 'Ease of Use', weight: 7 },
        ];

  const criteria: Criterion[] = rawCriteria.map((c, idx) => ({
    id: `crit-${idx + 1}-${uid}`,
    name: (c.name || `Criterion ${idx + 1}`).trim(),
    weight: Math.min(10, Math.max(1, Math.round(Number(c.weight) || 7))),
  }));

  const ratings: RatingsMap = {};
  options.forEach((opt) => {
    ratings[opt.id] = {};
    criteria.forEach((crit) => {
      // Find matching rating from draft.ratings (case-insensitive match on optionName & criterionName)
      const matched = (draft.ratings || []).find(
        (r) =>
          r.optionName?.trim().toLowerCase() === opt.name.toLowerCase() &&
          r.criterionName?.trim().toLowerCase() === crit.name.toLowerCase()
      );
      const val = matched ? Math.min(10, Math.max(1, Math.round(Number(matched.rating) || 7))) : 7;
      ratings[opt.id][crit.id] = val;
    });
  });

  return {
    id: `comp-voice-${Date.now()}-${uid}`,
    title: (draft.title || 'Voice Assisted Comparison').trim(),
    category: (draft.category || 'Voice Assisted').trim(),
    createdAt: timestamp,
    updatedAt: timestamp,
    options,
    criteria,
    ratings,
    isSample: false,
  };
}

