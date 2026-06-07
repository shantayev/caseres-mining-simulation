import React, { useState, useCallback } from 'react';
import { MitigationBudgetControls } from './MitigationBudgetControls';
import { DraggableRegionalMap } from './map/DraggableRegionalMap';
import type { PlacedIndustrialSymbol } from './map/mapSymbols';
import {
  MINE_SIZES,
  CAPACITIES,
  type MineSize,
  type Capacity,
} from '../data/mitigationConstants';
import { MapPin } from 'lucide-react';

export const DeveloperView: React.FC = () => {
  const [selectedBenefits, setSelectedBenefits] = useState<string[]>([]);
  const [placedIndustrial, setPlacedIndustrial] = useState<PlacedIndustrialSymbol[]>([]);
  const [selectedSize, setSelectedSize] = useState<MineSize>(MINE_SIZES[0]);
  const [selectedCapacity, setSelectedCapacity] = useState<Capacity>(CAPACITIES[0]);

  const toggleBenefit = useCallback((id: string) => {
    setSelectedBenefits(prev =>
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  }, []);

  const handleScenarioUnlock = useCallback(() => {
    setSelectedBenefits([]);
  }, []);

  const handleScenarioStateChange = useCallback(
    (s: { selectedSize: MineSize; selectedCapacity: Capacity }) => {
      setSelectedSize(s.selectedSize);
      setSelectedCapacity(s.selectedCapacity);
    },
    []
  );

  return (
    <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-hidden relative font-sans text-gray-900 h-full">
      <p className="text-[11px] text-gray-600 px-1 shrink-0">
        Technical teams: configure mitigation budget, then drag industrial facilities onto the regional
        map. Export results when finished.
      </p>

      <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0 overflow-hidden">
        <div className="flex-1 min-w-0 basis-1/2 bg-white rounded-xl shadow-lg border border-gray-200 p-4 flex flex-col gap-4 overflow-y-auto max-h-full">
          <MitigationBudgetControls
            selectedBenefits={selectedBenefits}
            onToggleBenefit={toggleBenefit}
            onScenarioUnlock={handleScenarioUnlock}
            placedIndustrial={placedIndustrial}
            onScenarioStateChange={handleScenarioStateChange}
          />
        </div>

        <div className="flex-1 min-w-0 basis-1/2 flex flex-col gap-3 min-h-0 overflow-y-auto bg-white p-3 rounded-xl shadow-lg border border-gray-200">
          <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2 shrink-0">
            <MapPin size={20} /> Projected Impact
          </h2>

          <div className="relative w-full aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden border border-gray-300 shrink-0">
            <img
              key={selectedSize.value}
              src={selectedSize.image}
              alt={`Mine size ${selectedSize.label}`}
              className="absolute inset-0 w-full h-full object-contain p-4"
            />
            <div className="absolute bottom-2 left-2 bg-white/90 px-2 py-1 rounded shadow text-[10px] font-bold">
              Size: {selectedSize.label}
            </div>
            <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded shadow text-[10px]">
              <div className="font-bold text-gray-800">Visualizing</div>
              <div>Size: {selectedSize.label}</div>
              <div>Capacity: {selectedCapacity.label}</div>
            </div>
          </div>

          <DraggableRegionalMap
            mode="technical"
            compact
            className="w-full"
            selectedNoBuildIds={[]}
            placedIndustrial={placedIndustrial}
            onPlacedIndustrialChange={setPlacedIndustrial}
          />
        </div>
      </div>
    </div>
  );
};
