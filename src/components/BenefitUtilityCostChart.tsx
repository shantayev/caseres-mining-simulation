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

export const BENEFIT_VALUES: Record<string, { cost: number; util: number }> = {
  research: { cost: 5000000, util: 0.33 },
  energy: { cost: 3000000, util: 0.27 },
  canoe: { cost: 2500000, util: 0.2 },
  irrigation: { cost: 900000, util: 0.13 },
  park: { cost: 700000, util: 0.07 },
};

export const COMBINATIONS = [
  { id: 1, cost: 12500000, utility: 0.8, label: '8km: R+E+C' },
  { id: 2, cost: 10900000, utility: 0.73, label: '8km: R+E+I' },
  { id: 3, cost: 10700000, utility: 0.67, label: '8km: R+E+P' },
  { id: 4, cost: 10400000, utility: 0.66, label: '8km: R+C+I' },
  { id: 5, cost: 6400000, utility: 0.6, label: '8km: E+C+I' },
  { id: 6, cost: 10200000, utility: 0.6, label: '8km: R+C+P' },
  { id: 7, cost: 6200000, utility: 0.54, label: '8km: E+C+P' },
  { id: 8, cost: 8600000, utility: 0.53, label: '8km: R+I+P' },
  { id: 9, cost: 4600000, utility: 0.47, label: '8km: E+I+P' },
  { id: 10, cost: 4100000, utility: 0.4, label: '8km: C+I+P' },
  { id: 11, cost: 10000000, utility: 0.6, label: '4km: R+E' },
  { id: 12, cost: 9500000, utility: 0.53, label: '4km: R+C' },
  { id: 13, cost: 5500000, utility: 0.47, label: '4km: E+C' },
  { id: 14, cost: 7900000, utility: 0.46, label: '4km: R+I' },
  { id: 15, cost: 3900000, utility: 0.4, label: '4km: E+I' },
  { id: 16, cost: 7700000, utility: 0.4, label: '4km: R+P' },
  { id: 17, cost: 3700000, utility: 0.34, label: '4km: E+P' },
  { id: 18, cost: 3400000, utility: 0.33, label: '4km: C+I' },
  { id: 19, cost: 3200000, utility: 0.27, label: '4km: C+P' },
  { id: 20, cost: 1600000, utility: 0.2, label: '4km: I+P' },
  { id: 21, cost: 10000000, utility: 0.6, label: '2km: R+E' },
  { id: 22, cost: 9500000, utility: 0.53, label: '2km: R+C' },
  { id: 23, cost: 5500000, utility: 0.47, label: '2km: E+C' },
  { id: 24, cost: 7900000, utility: 0.46, label: '2km: R+I' },
  { id: 25, cost: 3900000, utility: 0.4, label: '2km: E+I' },
  { id: 26, cost: 7700000, utility: 0.4, label: '2km: R+P' },
  { id: 27, cost: 3700000, utility: 0.34, label: '2km: E+P' },
  { id: 28, cost: 3400000, utility: 0.33, label: '2km: C+I' },
  { id: 29, cost: 3200000, utility: 0.27, label: '2km: C+P' },
  { id: 30, cost: 1600000, utility: 0.2, label: '2km: I+P' },
  { id: 31, cost: 7000000, utility: 0.33, label: '1km: R' },
  { id: 32, cost: 3000000, utility: 0.27, label: '1km: E' },
  { id: 33, cost: 2500000, utility: 0.2, label: '1km: C' },
  { id: 34, cost: 900000, utility: 0.13, label: '1km: I' },
  { id: 35, cost: 700000, utility: 0.07, label: '1km: P' },
  { id: 36, cost: 7000000, utility: 0.33, label: '0.5km: R' },
  { id: 37, cost: 3000000, utility: 0.27, label: '0.5km: E' },
  { id: 38, cost: 2500000, utility: 0.2, label: '0.5km: C' },
  { id: 39, cost: 900000, utility: 0.13, label: '0.5km: I' },
  { id: 40, cost: 700000, utility: 0.07, label: '0.5km: P' },
  { id: 41, cost: 0, utility: 0.0, label: 'Oppose' },
];

export function calculateBenefitBundleMetrics(benefitIds: string[]) {
  let cost = 0;
  let util = 0;
  benefitIds.forEach(id => {
    const data = BENEFIT_VALUES[id];
    if (data) {
      cost += data.cost;
      util += data.util;
    }
  });
  return { cost, util };
}

export interface BenefitUtilityCostChartProps {
  developerBudget: number | null;
  highlightBenefitIds: string[];
  className?: string;
  title?: string;
}

export const BenefitUtilityCostChart: React.FC<BenefitUtilityCostChartProps> = ({
  developerBudget,
  highlightBenefitIds,
  className = '',
  title = 'Community Benefit Options Analysis',
}) => {
  const choice = useMemo(
    () =>
      highlightBenefitIds.length > 0 ? calculateBenefitBundleMetrics(highlightBenefitIds) : null,
    [highlightBenefitIds]
  );

  const chartData = useMemo(() => {
    return COMBINATIONS.map(item => {
      let isMatch = false;
      if (choice) {
        const costDiff = Math.abs(item.cost - choice.cost);
        const utilDiff = Math.abs(item.utility - choice.util);
        if (costDiff < 100 && utilDiff < 0.015) {
          isMatch = true;
        }
      }
      return { ...item, isMatch };
    });
  }, [choice]);

  return (
    <div
      className={clsx(
        'w-full min-h-[240px] bg-gray-50 rounded-xl border p-3 relative shrink-0 flex flex-col',
        className
      )}
    >
      <h3 className="text-sm font-bold text-gray-700 mb-1 text-center shrink-0">{title}</h3>
      <ResponsiveContainer width="100%" height="85%">
        <ScatterChart margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="cost"
            name="R&D Cost"
            unit="$"
            tickFormatter={val => `$${(val / 1000000).toFixed(1)}M`}
            domain={[0, 20000000]}
          >
            <Label value="R&D Cost ($)" offset={-8} position="insideBottom" />
          </XAxis>
          <YAxis type="number" dataKey="utility" name="Utility" domain={[0, 1]}>
            <Label value="Utility Value" angle={-90} position="insideLeft" />
          </YAxis>
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload as (typeof COMBINATIONS)[0] & { isMatch: boolean };
                return (
                  <div className="bg-white p-2 border rounded shadow text-xs">
                    <p className="font-bold">{data.label}</p>
                    <p>Cost: ${(data.cost / 1000000).toFixed(1)}M</p>
                    <p>Utility: {data.utility.toFixed(2)}</p>
                    {data.isMatch && (
                      <p className="text-red-500 font-bold mt-1">★ Highlighted package</p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend />
          <Scatter name="Possible Combinations" data={chartData} fill="#8884d8" fillOpacity={0.6}>
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
