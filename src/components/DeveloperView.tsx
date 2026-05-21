import React, { useState, useCallback } from 'react';
import { MitigationBudgetControls } from './MitigationBudgetControls';
import { MINE_SIZES, CAPACITIES, type MineSize, type Capacity } from '../data/mitigationConstants';

export const DeveloperView: React.FC = () => {
  const [selectedBenefits, setSelectedBenefits] = useState<string[]>([]);
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
    <div className="flex-1 flex gap-4 min-h-0 overflow-hidden relative font-sans text-gray-900 h-full">
      <div className="flex-[2] bg-white rounded-xl shadow-lg border border-gray-200 p-4 flex flex-col gap-4 overflow-y-auto h-full">
        <MitigationBudgetControls
          selectedBenefits={selectedBenefits}
          onToggleBenefit={toggleBenefit}
          onScenarioUnlock={handleScenarioUnlock}
          onScenarioStateChange={handleScenarioStateChange}
        />
      </div>

      <div className="flex-[3] bg-gray-100 rounded-xl border border-gray-300 overflow-hidden relative flex items-center justify-center">
        <img
          src={selectedSize.image}
          alt={`Mine Size ${selectedSize.label}`}
          className="w-full h-full object-contain p-4"
        />
        <div className="absolute top-4 right-4 bg-white/90 p-2 rounded shadow text-xs">
          <div className="font-bold mb-1">Visualizing:</div>
          <div>Size: {selectedSize.label}</div>
          <div>Capacity: {selectedCapacity.label}</div>
        </div>
      </div>
    </div>
  );
};
