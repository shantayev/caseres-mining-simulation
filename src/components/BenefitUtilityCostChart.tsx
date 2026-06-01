import React, { useMemo } from 'react';
import clsx from 'clsx';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  Label,
  Cell,
} from 'recharts';
import {
  calculateWeightedBenefitUtility,
  getLeverWeightsForAllocations,
  type LeverWeights,
} from '../data/benefitLeverWeights';

export const BENEFIT_VALUES: Record<string, { cost: number; util: number }> = {
  research: { cost: 5000000, util: 0.33 },
  energy: { cost: 3000000, util: 0.27 },
  canoe: { cost: 2500000, util: 0.2 },
  irrigation: { cost: 900000, util: 0.13 },
  park: { cost: 700000, util: 0.07 },
};

const BENEFIT_ID_ORDER = ['park', 'irrigation', 'canoe', 'energy', 'research'] as const;

const BASE_UTIL_BY_ID: Record<string, number> = Object.fromEntries(
  Object.entries(BENEFIT_VALUES).map(([k, v]) => [k, v.util])
);

export type LeverAllocations = {
  allocWater: number;
  allocWaste: number;
  allocAir: number;
};

function sameBenefitSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

/** All non-empty subsets for scatter (2^5 - 1 = 31) plus optional empty point. */
function generateBundleChartRows(weights: LeverWeights, includeEmpty: boolean) {
  const rows: {
    id: string;
    cost: number;
    utility: number;
    label: string;
    benefitIds: string[];
  }[] = [];

  if (includeEmpty) {
    rows.push({
      id: 'bundle-empty',
      cost: 0,
      utility: 0,
      label: '(no benefits)',
      benefitIds: [],
    });
  }

  const n = BENEFIT_ID_ORDER.length;
  for (let mask = 1; mask < 1 << n; mask += 1) {
    const benefitIds: string[] = [];
    for (let i = 0; i < n; i += 1) {
      if (mask & (1 << i)) benefitIds.push(BENEFIT_ID_ORDER[i]);
    }
    let cost = 0;
    for (const id of benefitIds) {
      cost += BENEFIT_VALUES[id]?.cost ?? 0;
    }
    const utility = calculateWeightedBenefitUtility(benefitIds, BASE_UTIL_BY_ID, weights);
    rows.push({
      id: `bundle-${mask}`,
      cost,
      utility,
      label: benefitIds.join(' + '),
      benefitIds,
    });
  }
  return rows;
}

export function calculateBenefitBundleMetrics(
  benefitIds: string[],
  leverAllocations?: LeverAllocations | null
) {
  let cost = 0;
  for (const id of benefitIds) {
    const data = BENEFIT_VALUES[id];
    if (data) cost += data.cost;
  }
  const weights = getLeverWeightsForAllocations(
    leverAllocations?.allocWater,
    leverAllocations?.allocWaste,
    leverAllocations?.allocAir
  );
  const util = calculateWeightedBenefitUtility(benefitIds, BASE_UTIL_BY_ID, weights);
  return { cost, util };
}

export interface BenefitUtilityCostChartProps {
  developerBudget: number | null;
  highlightBenefitIds: string[];
  /** When set, utility uses water/waste/air weight table from these allocations (dollars only for lookup). */
  leverAllocations?: LeverAllocations | null;
  className?: string;
  title?: string;
}

export const BenefitUtilityCostChart: React.FC<BenefitUtilityCostChartProps> = ({
  developerBudget,
  highlightBenefitIds,
  leverAllocations = null,
  className = '',
  title = 'Community Benefit Options Analysis',
}) => {
  const weights = useMemo(
    () =>
      getLeverWeightsForAllocations(
        leverAllocations?.allocWater,
        leverAllocations?.allocWaste,
        leverAllocations?.allocAir
      ),
    [leverAllocations?.allocWater, leverAllocations?.allocWaste, leverAllocations?.allocAir]
  );

  const choice = useMemo(
    () =>
      highlightBenefitIds.length > 0
        ? calculateBenefitBundleMetrics(highlightBenefitIds, leverAllocations)
        : null,
    [highlightBenefitIds, leverAllocations]
  );

  const chartData = useMemo(() => {
    const rows = generateBundleChartRows(weights, true);
    return rows.map(item => ({
      ...item,
      isMatch: choice ? sameBenefitSet(item.benefitIds, highlightBenefitIds) : false,
    }));
  }, [weights, choice, highlightBenefitIds]);

  return (
    <div
      className={clsx(
        'w-full min-h-[240px] bg-gray-50 rounded-xl border p-3 relative shrink-0 flex flex-col',
        className
      )}
    >
      <h3 className="text-sm font-bold text-gray-700 mb-1 text-center shrink-0">{title}</h3>
      {leverAllocations != null && (
        <p className="text-[10px] text-gray-600 text-center mb-1 shrink-0">
          Lever weights (utility scaling): water ×{weights.water.toFixed(2)}, waste ×
          {weights.waste.toFixed(2)}, air ×{weights.air.toFixed(2)}
        </p>
      )}
      <ResponsiveContainer width="100%" height="85%">
        <ScatterChart margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="cost"
            name="Cost"
            unit="$"
            tickFormatter={val => `$${(val / 1000000).toFixed(1)}M`}
            domain={[0, 20000000]}
          >
            <Label value="Community benefit cost ($)" offset={-8} position="insideBottom" />
          </XAxis>
          <YAxis type="number" dataKey="utility" name="Utility" domain={[0, 1]}>
            <Label value="Weighted utility" angle={-90} position="insideLeft" />
          </YAxis>
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload as (typeof chartData)[0];
                return (
                  <div className="bg-white p-2 border rounded shadow text-xs">
                    <p className="font-bold">{data.label}</p>
                    <p>Cost: ${(data.cost / 1000000).toFixed(1)}M</p>
                    <p>Utility: {data.utility.toFixed(3)}</p>
                    {data.isMatch && (
                      <p className="text-red-500 font-bold mt-1">★ Current selection</p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend />
          <Scatter name="Benefit bundles" data={chartData} fill="#8884d8" fillOpacity={0.6}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isMatch ? '#ff0000' : '#8884d8'}
                stroke={entry.isMatch ? '#ff0000' : 'none'}
                strokeWidth={2}
              />
            ))}
          </Scatter>
          {developerBudget != null && developerBudget > 0 && (
            <ReferenceLine
              x={developerBudget}
              stroke="green"
              strokeDasharray="3 3"
              label={{
                position: 'top',
                value: 'Miner Allocated Budget',
                fill: 'green',
                fontSize: 11,
              }}
            />
          )}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};
