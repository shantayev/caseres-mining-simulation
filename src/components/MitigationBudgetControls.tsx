import React, { useEffect } from 'react';
import { Droplets, Trash2, DollarSign, Download, Settings, Users, CheckCircle, Lock, Unlock } from 'lucide-react';
import clsx from 'clsx';
import { COMMUNITY_BENEFITS } from '../data/communityBenefits';
import {
  MINE_SIZES,
  CAPACITIES,
  AIR_TIERS,
  MITIGATION_STEP_USD,
  formatNumber,
  formatCurrency,
  type AirTierId,
} from '../data/mitigationConstants';
import { useMitigationBudgetV2 } from '../hooks/useMitigationBudgetV2';
import type { MineSize, Capacity } from '../data/mitigationConstants';

export interface MitigationBudgetControlsProps {
  selectedBenefits: string[];
  onToggleBenefit: (id: string) => void;
  onScenarioUnlock?: () => void;
  onMetricsChange?: (m: {
    totalBudget: number;
    selectedBenefits: string[];
    unassignedBudget: number;
  }) => void;
  onScenarioStateChange?: (s: { selectedSize: MineSize; selectedCapacity: Capacity }) => void;
  showSubmitButton?: boolean;
}

export const MitigationBudgetControls: React.FC<MitigationBudgetControlsProps> = ({
  selectedBenefits,
  onToggleBenefit,
  onScenarioUnlock,
  onMetricsChange,
  onScenarioStateChange,
  showSubmitButton = true,
}) => {
  const b = useMitigationBudgetV2({ selectedBenefits, onToggleBenefit, onScenarioUnlock });

  useEffect(() => {
    onMetricsChange?.({
      totalBudget: b.totalBudget,
      selectedBenefits,
      unassignedBudget: b.unassignedBudget,
    });
  }, [b.totalBudget, b.unassignedBudget, selectedBenefits, onMetricsChange]);

  useEffect(() => {
    onScenarioStateChange?.({
      selectedSize: b.selectedSize,
      selectedCapacity: b.selectedCapacity,
    });
  }, [b.selectedSize, b.selectedCapacity, onScenarioStateChange]);

  const dropdownClass = (locked: boolean) =>
    clsx('p-2 border rounded text-sm', locked ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-gray-50');

  return (
    <>
      <div className="border-b pb-2 flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Settings className="text-gray-600" size={20} /> Configuration
        </h2>
        <span
          className={clsx(
            'text-[10px] font-bold px-2 py-0.5 rounded-full',
            b.scenarioLocked ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-800'
          )}
        >
          {b.scenarioLocked ? 'Step 2: Allocate budget' : 'Step 1: Choose scenario'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1">
          <label className="font-bold text-xs text-gray-700">Mine Size</label>
          <select
            value={b.selectedSize.value}
            disabled={b.scenarioLocked}
            onChange={e => b.handleSizeChange(Number(e.target.value))}
            className={dropdownClass(b.scenarioLocked)}
          >
            {MINE_SIZES.map(s => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-bold text-xs text-gray-700">Capacity</label>
          <select
            value={b.selectedCapacity.value}
            disabled={b.scenarioLocked}
            onChange={e => b.handleCapacityChange(Number(e.target.value))}
            className={dropdownClass(b.scenarioLocked)}
          >
            {CAPACITIES.map(c => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-bold text-xs text-gray-700">Facility</label>
          <select
            value={b.selectedFacilityId}
            disabled={b.scenarioLocked}
            onChange={e => b.handleFacilityChange(e.target.value as AirTierId)}
            className={dropdownClass(b.scenarioLocked)}
          >
            {AIR_TIERS.map(t => (
              <option key={t.id} value={t.id}>
                {t.label} (+{Math.round(t.budgetAdd / 1_000_000)}M)
              </option>
            ))}
          </select>
        </div>
      </div>

      {!b.scenarioLocked ? (
        <p className="text-[10px] text-gray-600 leading-snug">
          Adjust mine (raises waste floor), capacity (raises water floor), and facility (adds budget). Lock
          when ready — mine/capacity steps also add a discretionary pool for step 2.
        </p>
      ) : (
        <p className="text-[10px] text-gray-600 leading-snug">
          Scenario locked. Raise water or waste above locked minimums, or select community benefits, from
          unassigned budget.
        </p>
      )}

      <div className="flex gap-2">
        {!b.scenarioLocked ? (
          <button
            type="button"
            onClick={b.lockScenario}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-bold hover:bg-black"
          >
            <Lock size={16} /> Lock scenario
          </button>
        ) : (
          <button
            type="button"
            onClick={b.unlockScenario}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-bold text-gray-800 hover:bg-gray-50"
          >
            <Unlock size={16} /> Unlock scenario
          </button>
        )}
      </div>

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex flex-col items-center justify-center text-center shrink-0">
        <div className="text-xs font-bold text-blue-800 uppercase tracking-wide">Total Mitigation Budget</div>
        <div className="text-2xl font-extrabold text-blue-900 flex items-center gap-1">
          <DollarSign size={20} />
          {formatNumber(b.totalBudget)}
        </div>
        <div className="text-[10px] text-blue-800/80 leading-relaxed">
          Required floors (mine + capacity steps) {formatCurrency(b.baseScenarioBudget + b.BASELINE_WATER_WASTE_MITIGATION_USD)}
          {' · '}
          Discretionary pool {formatCurrency(b.discretionaryPoolUsd)}
          {b.airBudgetAdd > 0 && <span> · Air quality {formatCurrency(b.airBudgetAdd)}</span>}
        </div>
        {b.scenarioLocked && (
          <div className="text-[10px] text-gray-700 mt-1">
            Locked floors: water {formatCurrency(b.lockedWaterFloor)}, waste{' '}
            {formatCurrency(b.lockedWasteFloor)}
          </div>
        )}
        <div
          className={clsx(
            'text-xs font-bold mt-1 px-2 py-0.5 rounded-full',
            b.budgetOverrun
              ? 'bg-red-100 text-red-800'
              : b.unassignedBudget > 0
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-200 text-gray-500'
          )}
        >
          {b.scenarioLocked ? 'Unassigned' : 'Available after lock'}: {formatCurrency(b.unassignedBudget)}
        </div>
        {b.budgetOverrun && b.scenarioLocked && (
          <p className="text-[11px] text-red-700 font-semibold mt-2 leading-snug max-w-md">
            Total allocation exceeds this mitigation budget. Reduce water or waste spend, or unselect
            community benefits.
          </p>
        )}
      </div>

      <div className={clsx('flex flex-col gap-6 border-t pt-4', !b.scenarioLocked && 'opacity-60')}>
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-blue-600 flex items-center gap-1">
              <Droplets size={12} /> Water Mitigation
            </span>
            <span className="font-mono">{formatCurrency(b.allocWater)}</span>
          </div>
          <input
            type="range"
            min={b.waterSliderMin}
            max={b.waterSliderMax}
            step={MITIGATION_STEP_USD}
            value={b.allocWater}
            disabled={!b.scenarioLocked}
            onChange={e => b.applyWaterTarget(Number(e.target.value))}
            className={clsx(
              'w-full h-2 bg-gray-200 rounded-lg appearance-none accent-blue-600',
              b.scenarioLocked ? 'cursor-pointer' : 'cursor-not-allowed'
            )}
          />
          <div className="flex justify-between text-[10px] text-gray-500">
            <span className="flex items-center gap-2">
              <span>
                {b.scenarioLocked
                  ? `Min locked ${formatCurrency(b.lockedWaterFloor)} — drag up only`
                  : 'Set by capacity in step 1'}
              </span>
            </span>
            <span className="font-bold text-blue-600">
              Result: {formatNumber(b.targetWaterM3)} m³ ({b.waterReduction.toFixed(0)}% ↓)
            </span>
          </div>
          {b.waterClamped && (
            <div className="text-[10px] font-bold text-red-600">Not enough unassigned budget for that level.</div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-orange-600 flex items-center gap-1">
              <Trash2 size={12} /> Waste Mgmt
            </span>
            <span className="font-mono">{formatCurrency(b.allocWaste)}</span>
          </div>
          <input
            type="range"
            min={b.wasteSliderMin}
            max={b.wasteSliderMax}
            step={MITIGATION_STEP_USD}
            value={b.allocWaste}
            disabled={!b.scenarioLocked}
            onChange={e => b.applyWasteTarget(Number(e.target.value))}
            className={clsx(
              'w-full h-2 bg-gray-200 rounded-lg appearance-none accent-orange-600',
              b.scenarioLocked ? 'cursor-pointer' : 'cursor-not-allowed'
            )}
          />
          <div className="flex justify-between text-[10px] text-gray-500">
            <span className="flex items-center gap-2">
              <span>
                {b.scenarioLocked
                  ? `Min locked ${formatCurrency(b.lockedWasteFloor)} — drag up only`
                  : 'Set by mine size in step 1'}
              </span>
            </span>
            <span className="font-bold text-orange-600">
              Result: {formatNumber(b.targetWasteTon)} tons ({b.wasteReduction.toFixed(0)}% ↓)
            </span>
          </div>
          {b.wasteClamped && (
            <div className="text-[10px] font-bold text-red-600">Not enough unassigned budget for that level.</div>
          )}
        </div>

        {b.scenarioLocked && (
          <div className="flex flex-col gap-1 p-2 rounded-lg bg-gray-50 border border-gray-200">
            <div className="flex justify-between text-xs font-bold text-gray-700">
              <span>Facility (locked)</span>
              <span>{b.selectedFacility.label}</span>
            </div>
            <div className="text-[10px] text-gray-500">
              Air quality budget: {formatCurrency(b.airBudgetAdd)} — chosen in step 1
            </div>
          </div>
        )}

        <div className={clsx('flex flex-col gap-1', !b.scenarioLocked && 'pointer-events-none')}>
          <div className="flex justify-between text-xs font-bold">
            <span className="text-green-600 flex items-center gap-1">
              <Users size={12} /> Community Benefits
              {!b.scenarioLocked && (
                <span className="font-normal text-gray-500">(available after lock)</span>
              )}
            </span>
            <span>{formatCurrency(b.communitySpend)}</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-lg overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all"
              style={{
                width: `${Math.min(100, b.totalBudget > 0 ? (b.communitySpend / b.totalBudget) * 100 : 0)}%`,
              }}
            />
          </div>
          <div className="grid grid-cols-1 gap-1 mt-2">
            {COMMUNITY_BENEFITS.map(benefit => {
              const isSelected = selectedBenefits.includes(benefit.id);
              const canAfford = b.scenarioLocked && b.unassignedBudget >= benefit.cost;
              return (
                <div
                  key={benefit.id}
                  onClick={() => b.handleToggleBenefit(benefit.id)}
                  className={clsx(
                    'flex justify-between items-center p-1.5 rounded text-[10px] border transition-colors select-none',
                    !b.scenarioLocked && 'opacity-50 cursor-not-allowed',
                    b.scenarioLocked &&
                      (isSelected
                        ? 'bg-green-100 border-green-300 text-green-900 cursor-pointer'
                        : canAfford
                          ? 'bg-white border-gray-200 hover:bg-gray-50 cursor-pointer'
                          : 'bg-gray-100 border-gray-200 text-gray-400 opacity-60 cursor-not-allowed')
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={clsx(
                        'w-3 h-3 rounded border flex items-center justify-center',
                        isSelected ? 'bg-green-600 border-green-600' : 'border-gray-400'
                      )}
                    >
                      {isSelected && <CheckCircle size={8} className="text-white" />}
                    </div>
                    <span className="font-medium">{benefit.label}</span>
                  </div>
                  <span className="font-mono">{formatCurrency(benefit.cost)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showSubmitButton && (
        <button
          type="button"
          onClick={b.handleDownloadCSV}
          className="mt-auto bg-gray-800 text-white px-4 py-3 rounded-lg font-bold shadow hover:bg-black flex items-center justify-center gap-2 text-sm"
        >
          <Download size={16} /> Submit Results
        </button>
      )}
    </>
  );
};
