import React from 'react';
import { MitigationBudgetControls } from '../MitigationBudgetControls';
import type { JointExportExtras } from '../../hooks/useMitigationBudgetV2';
import type { MineSize, Capacity, AirTierId } from '../../data/mitigationConstants';
import type { PlacedIndustrialSymbol } from '../map/mapSymbols';

export interface JointDeveloperPanelProps {
  selectedBenefits: string[];
  onToggleBenefit: (id: string) => void;
  onScenarioUnlock?: () => void;
  placedIndustrial?: PlacedIndustrialSymbol[];
  onMetricsChange?: (m: {
    totalBudget: number;
    selectedBenefits: string[];
    unassignedBudget: number;
    allocWater: number;
    allocWaste: number;
    allocAir: number;
    avgChainSpreadPct: number;
    spreadPenaltyPct: number;
    sitingPenaltyUsd: number;
  }) => void;
  onScenarioStateChange?: (s: {
    selectedSize: MineSize;
    selectedCapacity: Capacity;
    selectedFacilityId: AirTierId;
    scenarioLocked: boolean;
    phase: import('../../hooks/useMitigationBudgetV2').WorkflowPhase;
  }) => void;
  onRegisterExport?: (exportFn: (jointExtras?: JointExportExtras) => void) => void;
}

/** Joint developer controls — same gated four-step budget flow as DeveloperView. */
export const JointDeveloperPanel: React.FC<JointDeveloperPanelProps> = ({
  selectedBenefits,
  onToggleBenefit,
  onScenarioUnlock,
  placedIndustrial = [],
  onMetricsChange,
  onScenarioStateChange,
  onRegisterExport,
}) => (
  <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative font-sans text-gray-900">
    <div className="flex-1 bg-white rounded-xl shadow-lg border border-gray-200 p-4 flex flex-col gap-4 overflow-y-auto min-h-0">
      <MitigationBudgetControls
        selectedBenefits={selectedBenefits}
        onToggleBenefit={onToggleBenefit}
        onScenarioUnlock={onScenarioUnlock}
        placedIndustrial={placedIndustrial}
        onMetricsChange={onMetricsChange}
        onScenarioStateChange={onScenarioStateChange}
        onRegisterExport={onRegisterExport}
        showSubmitButton={false}
      />
    </div>
  </div>
);
