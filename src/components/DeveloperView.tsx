import React, { useState, useCallback } from 'react';
import { MitigationBudgetControls } from './MitigationBudgetControls';
import { DraggableRegionalMap } from './map/DraggableRegionalMap';
import type { PlacedIndustrialSymbol } from './map/mapSymbols';
export const DeveloperView: React.FC = () => {
  const [selectedBenefits, setSelectedBenefits] = useState<string[]>([]);
  const [placedIndustrial, setPlacedIndustrial] = useState<PlacedIndustrialSymbol[]>([]);

  const toggleBenefit = useCallback((id: string) => {
    setSelectedBenefits(prev =>
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  }, []);

  const handleScenarioUnlock = useCallback(() => {
    setSelectedBenefits([]);
  }, []);

  return (
    <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-hidden relative font-sans text-gray-900 h-full">
      <p className="text-[11px] text-gray-600 px-1 shrink-0">
        Technical teams: configure mitigation budget, then drag industrial facilities onto the regional
        map. Export results when finished.
      </p>

      <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0 overflow-hidden">
        <div className="lg:w-[min(420px,38%)] shrink-0 bg-white rounded-xl shadow-lg border border-gray-200 p-4 flex flex-col gap-4 overflow-y-auto max-h-full">
          <MitigationBudgetControls
            selectedBenefits={selectedBenefits}
            onToggleBenefit={toggleBenefit}
            onScenarioUnlock={handleScenarioUnlock}
            placedIndustrial={placedIndustrial}
          />
        </div>

        <div className="flex-1 min-h-[360px] min-w-0">
          <DraggableRegionalMap
            mode="technical"
            selectedNoBuildIds={[]}
            placedIndustrial={placedIndustrial}
            onPlacedIndustrialChange={setPlacedIndustrial}
          />
        </div>
      </div>
    </div>
  );
};
