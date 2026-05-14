import React, { useState, useCallback } from 'react';
import {
  JointNoBuildToolbar,
  JointNoBuildMapPanel,
  type NoBuildAreaId,
  type SelectableNoBuildId,
} from './JointNoBuildSection';
import { BenefitUtilityCostChart } from '../BenefitUtilityCostChart';
import { JointDeveloperPanel } from './JointDeveloperPanel';

/**
 * Joint negotiation: no-build toolbar, then utility chart (left) + regional map (right), then developer controls.
 */
export const JointView: React.FC = () => {
  const [chartBudget, setChartBudget] = useState<number | null>(null);
  const [chartBenefits, setChartBenefits] = useState<string[]>([]);
  const [selectedNoBuildIds, setSelectedNoBuildIds] = useState<SelectableNoBuildId[]>([]);

  const handleMetricsChange = useCallback(
    (m: { totalBudget: number; selectedBenefits: string[] }) => {
      setChartBudget(m.totalBudget);
      setChartBenefits(m.selectedBenefits);
    },
    []
  );

  const toggleNoBuildArea = useCallback((id: NoBuildAreaId) => {
    if (id === 'none') {
      setSelectedNoBuildIds([]);
      return;
    }
    setSelectedNoBuildIds(prev =>
      prev.includes(id as SelectableNoBuildId)
        ? prev.filter(x => x !== id)
        : [...prev, id as SelectableNoBuildId]
    );
  }, []);

  return (
    <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto overflow-x-hidden text-gray-900">
      <p className="text-[11px] text-gray-600 px-1 shrink-0">
        Joint workspace: choose areas to avoid, compare benefit utility vs cost, then adjust technical mitigation
        (same rules as the technical teams screen).
      </p>

      <JointNoBuildToolbar selectedNoBuildIds={selectedNoBuildIds} onToggle={toggleNoBuildArea} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch flex-1 min-h-[360px]">
        <div className="flex flex-col min-h-[320px] lg:min-h-[min(72vh,640px)]">
          <BenefitUtilityCostChart
            developerBudget={chartBudget}
            highlightBenefitIds={chartBenefits}
            title="Utility vs cost (funded community benefits)"
            className="h-full min-h-[320px] flex-1"
          />
        </div>
        <div className="flex flex-col min-h-[320px]">
          <JointNoBuildMapPanel selectedNoBuildIds={selectedNoBuildIds} />
        </div>
      </div>

      <div className="min-h-[320px] shrink-0 flex flex-col">
        <JointDeveloperPanel onMetricsChange={handleMetricsChange} />
      </div>
    </div>
  );
};
