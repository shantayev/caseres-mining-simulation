import React from 'react';
import { MitigationBudgetControls } from '../MitigationBudgetControls';
import type { MineSize, Capacity } from '../../data/mitigationConstants';

export interface JointDeveloperPanelProps {
  selectedBenefits: string[];
  onToggleBenefit: (id: string) => void;
  onScenarioUnlock?: () => void;
  onMetricsChange?: (m: {
    totalBudget: number;
    selectedBenefits: string[];
    unassignedBudget: number;
    allocWater: number;
    allocWaste: number;
    allocAir: number;
  }) => void;
  onScenarioStateChange?: (s: { selectedSize: MineSize; selectedCapacity: Capacity }) => void;
}

/** Joint developer controls — same two-step budget flow as DeveloperView. */
export const JointDeveloperPanel: React.FC<JointDeveloperPanelProps> = ({
  selectedBenefits,
  onToggleBenefit,
  onScenarioUnlock,
  onMetricsChange,
  onScenarioStateChange,
}) => (
  <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative font-sans text-gray-900">
    <div className="flex-1 bg-white rounded-xl shadow-lg border border-gray-200 p-4 flex flex-col gap-4 overflow-y-auto min-h-0">
      <MitigationBudgetControls
        selectedBenefits={selectedBenefits}
        onToggleBenefit={onToggleBenefit}
        onScenarioUnlock={onScenarioUnlock}
        onMetricsChange={onMetricsChange}
        onScenarioStateChange={onScenarioStateChange}
        showSubmitButton={false}
      />
    </div>
  </div>
);
