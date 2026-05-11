import React, { useState, useCallback } from 'react';
import { JointNoBuildSection } from './JointNoBuildSection';
import { BenefitUtilityCostChart } from '../BenefitUtilityCostChart';
import { JointDeveloperPanel } from './JointDeveloperPanel';

/**
 * Joint negotiation: no-build map (top), utility vs cost chart (middle), developer controls (bottom).
 * CommunityView and DeveloperView are unchanged; this route composes joint-only pieces.
 */
export const JointView: React.FC = () => {
  const [chartBudget, setChartBudget] = useState<number | null>(null);
  const [chartBenefits, setChartBenefits] = useState<string[]>([]);

  const handleMetricsChange = useCallback(
    (m: { totalBudget: number; selectedBenefits: string[] }) => {
      setChartBudget(m.totalBudget);
      setChartBenefits(m.selectedBenefits);
    },
    []
  );

  return (
    <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto overflow-x-hidden text-gray-900">
      <p className="text-[11px] text-gray-600 px-1 shrink-0">
        Joint workspace: set no-build areas, review benefit cost vs utility, then adjust technical mitigation
        (same rules as the technical teams screen).
      </p>

      <JointNoBuildSection />

      <BenefitUtilityCostChart
        developerBudget={chartBudget}
        highlightBenefitIds={chartBenefits}
        title="Utility vs cost (funded community benefits)"
        className="h-80 shrink-0"
      />

      <div className="min-h-[320px] shrink-0 flex flex-col">
        <JointDeveloperPanel onMetricsChange={handleMetricsChange} />
      </div>
    </div>
  );
};
