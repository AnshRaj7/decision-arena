import React, { useState } from 'react';
import { Criterion, OptionItem, RatingsMap } from '../types/decision';

interface RadarChartProps {
  options: OptionItem[];
  criteria: Criterion[];
  ratings: RatingsMap;
  size?: number;
  compact?: boolean;
}

const OPTION_COLORS = [
  {
    stroke: '#06B6D4', // Cyan 500
    fill: 'rgba(6, 182, 212, 0.24)',
    dot: '#22D3EE',
    text: 'text-cyan-400',
    bg: 'bg-cyan-400',
  },
  {
    stroke: '#6366F1', // Indigo 500
    fill: 'rgba(99, 102, 241, 0.24)',
    dot: '#818CF8',
    text: 'text-indigo-400',
    bg: 'text-indigo-400',
  },
  {
    stroke: '#A855F7', // Purple 500
    fill: 'rgba(168, 85, 247, 0.20)',
    dot: '#C084FC',
    text: 'text-purple-400',
    bg: 'bg-purple-400',
  },
];

export const RadarChart: React.FC<RadarChartProps> = ({
  options,
  criteria,
  ratings,
  size = 320,
  compact = false,
}) => {
  const [hoveredOptionId, setHoveredOptionId] = useState<string | null>(null);
  const [hoveredCriterionIdx, setHoveredCriterionIdx] = useState<number | null>(null);

  if (criteria.length < 3) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#0F172A]/60 min-h-[240px]">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Radar Chart Requires 3+ Criteria
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
          You currently have {criteria.length} {criteria.length === 1 ? 'criterion' : 'criteria'}. Add at least 3 criteria to render a multi-axis polygon radar chart.
        </p>
      </div>
    );
  }

  const center = size / 2;
  const padding = compact ? 52 : 64;
  const radius = center - padding;
  const numAxes = criteria.length;
  const ringLevels = [2, 4, 6, 8, 10];

  // Angle for each criterion (starting at top: -PI / 2)
  const getAngle = (index: number) => (Math.PI * 2 * index) / numAxes - Math.PI / 2;

  const getCoordinates = (index: number, value: number) => {
    const angle = getAngle(index);
    const r = (Math.max(0, Math.min(10, value)) / 10) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative w-full flex items-center justify-center">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-full max-w-[340px] h-auto overflow-visible select-none"
          role="img"
          aria-label="Radar chart comparing options across criteria"
        >
          <defs>
            <filter id="radarGlowCyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Concentric polygonal grid rings */}
          {ringLevels.map((level) => {
            const points = criteria
              .map((_, i) => {
                const { x, y } = getCoordinates(i, level);
                return `${x.toFixed(1)},${y.toFixed(1)}`;
              })
              .join(' ');
            return (
              <polygon
                key={level}
                points={points}
                fill="none"
                stroke="currentColor"
                className={
                  level === 10
                    ? 'text-slate-300 dark:text-slate-700/90'
                    : 'text-slate-200 dark:text-slate-800/80'
                }
                strokeWidth={level === 10 ? 1.25 : 1}
              />
            );
          })}

          {/* Axis spokes from center to vertices */}
          {criteria.map((crit, i) => {
            const { x, y } = getCoordinates(i, 10);
            const isHovered = hoveredCriterionIdx === i;
            return (
              <line
                key={crit.id}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="currentColor"
                className={
                  isHovered
                    ? 'text-cyan-400 dark:text-cyan-400'
                    : 'text-slate-300 dark:text-slate-700/75'
                }
                strokeWidth={isHovered ? 1.5 : 1}
              />
            );
          })}

          {/* Option Polygons */}
          {options.map((opt, optIdx) => {
            const color = OPTION_COLORS[optIdx % OPTION_COLORS.length];
            const isHighlighted = hoveredOptionId === null || hoveredOptionId === opt.id;
            const opacity = hoveredOptionId === null ? 1 : hoveredOptionId === opt.id ? 1 : 0.25;

            const coords = criteria.map((crit, cIdx) => {
              const rating = ratings[opt.id]?.[crit.id] ?? 0;
              return getCoordinates(cIdx, rating);
            });

            const pointsString = coords.map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');

            return (
              <g
                key={opt.id}
                style={{ opacity, transition: 'opacity 180ms ease' }}
                onMouseEnter={() => setHoveredOptionId(opt.id)}
                onMouseLeave={() => setHoveredOptionId(null)}
                className="cursor-pointer"
              >
                <polygon
                  points={pointsString}
                  fill={color.fill}
                  stroke={color.stroke}
                  strokeWidth={isHighlighted && hoveredOptionId === opt.id ? 2.75 : 2}
                  strokeLinejoin="round"
                />
                {coords.map((pt, cIdx) => (
                  <circle
                    key={`${opt.id}-${criteria[cIdx].id}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredOptionId === opt.id || hoveredCriterionIdx === cIdx ? 4.5 : 3}
                    fill={color.dot}
                    stroke="#0B1120"
                    strokeWidth={1.2}
                  />
                ))}
              </g>
            );
          })}

          {/* Perimeter Criterion Labels */}
          {criteria.map((crit, i) => {
            const angle = getAngle(i);
            const labelRadius = radius + (compact ? 22 : 26);
            const lx = center + labelRadius * Math.cos(angle);
            const ly = center + labelRadius * Math.sin(angle);

            const cos = Math.cos(angle);
            let textAnchor: 'middle' | 'start' | 'end' = 'middle';
            if (cos > 0.25) textAnchor = 'start';
            else if (cos < -0.25) textAnchor = 'end';

            const displayLabel =
              crit.name.length > 16 ? `${crit.name.slice(0, 15)}…` : crit.name;

            return (
              <g
                key={`label-${crit.id}`}
                onMouseEnter={() => setHoveredCriterionIdx(i)}
                onMouseLeave={() => setHoveredCriterionIdx(null)}
                className="cursor-pointer"
              >
                <text
                  x={lx}
                  y={ly}
                  textAnchor={textAnchor}
                  dominantBaseline="central"
                  className={`text-[11px] font-medium transition-colors ${
                    hoveredCriterionIdx === i
                      ? 'fill-cyan-500 dark:fill-cyan-300 font-semibold'
                      : 'fill-slate-600 dark:fill-slate-300'
                  }`}
                >
                  {displayLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Interactive Legend & Hover Readout */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/70 w-full">
        {options.map((opt, idx) => {
          const color = OPTION_COLORS[idx % OPTION_COLORS.length];
          const isActive = hoveredOptionId === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onMouseEnter={() => setHoveredOptionId(opt.id)}
              onMouseLeave={() => setHoveredOptionId(null)}
              onClick={() => setHoveredOptionId(isActive ? null : opt.id)}
              className={`flex items-center gap-2 text-xs px-2 py-1 rounded-md transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-slate-200/70 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: color.stroke }}
              />
              <span className="truncate max-w-[120px]">{opt.name || opt.slotLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Criterion tooltip bar when hovering an axis label */}
      {hoveredCriterionIdx !== null && criteria[hoveredCriterionIdx] && (
        <div className="mt-2 w-full px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/90 text-xs flex items-center justify-between gap-2">
          <span className="font-medium text-slate-700 dark:text-slate-200 truncate">
            {criteria[hoveredCriterionIdx].name} (Weight {criteria[hoveredCriterionIdx].weight}/10)
          </span>
          <div className="flex items-center gap-3 font-mono tabular-nums">
            {options.map((opt, idx) => (
              <span
                key={opt.id}
                style={{ color: OPTION_COLORS[idx % OPTION_COLORS.length].stroke }}
                className="font-semibold"
              >
                {opt.slotLabel.replace('Option ', '')}:{' '}
                {ratings[opt.id]?.[criteria[hoveredCriterionIdx].id] ?? 0}/10
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
