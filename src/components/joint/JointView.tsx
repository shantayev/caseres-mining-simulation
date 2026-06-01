import React, { useState, useCallback } from 'react';
import {
  JointNoBuildToolbar,
  type NoBuildAreaId,
  type SelectableNoBuildId,
} from './JointNoBuildSection';
import { DraggableRegionalMap } from '../map/DraggableRegionalMap';
import type { BenefitPlacement } from '../map/DraggableRegionalMap';
import { BenefitUtilityCostChart, type LeverAllocations } from '../BenefitUtilityCostChart';
import { JointDeveloperPanel } from './JointDeveloperPanel';
import { getCommunityBenefit, type CommunityBenefitId } from '../../data/communityBenefits';

/**
 * Joint negotiation: no-build toolbar, utility chart (left) + draggable regional map (right), developer controls below.
 */
export const JointView: React.FC = () => {
  const [chartBudget, setChartBudget] = useState<number | null>(null);
  const [chartBenefits, setChartBenefits] = useState<string[]>([]);
  const [unassignedBudget, setUnassignedBudget] = useState(0);
  const [leverAllocations, setLeverAllocations] = useState<LeverAllocations | null>(null);
  const [selectedNoBuildIds, setSelectedNoBuildIds] = useState<SelectableNoBuildId[]>([]);
  const [selectedBenefits, setSelectedBenefits] = useState<string[]>([]);
  const [benefitPlacements, setBenefitPlacements] = useState<
    Partial<Record<CommunityBenefitId, BenefitPlacement>>
  >({});

  const handleMetricsChange = useCallback(
    (m: {
      totalBudget: number;
      selectedBenefits: string[];
      unassignedBudget: number;
      allocWater: number;
      allocWaste: number;
      allocAir: number;
    }) => {
      setChartBudget(m.totalBudget);
      setChartBenefits(m.selectedBenefits);
      setUnassignedBudget(m.unassignedBudget);
      setLeverAllocations({
        allocWater: m.allocWater,
        allocWaste: m.allocWaste,
        allocAir: m.allocAir,
      });
    },
    []
  );

  const toggleBenefit = useCallback(
    (id: string) => {
      const benefit = getCommunityBenefit(id);
      if (!benefit) return;
      if (selectedBenefits.includes(id)) {
        setSelectedBenefits(prev => prev.filter(b => b !== id));
        setBenefitPlacements(prev => {
          const next = { ...prev };
          delete next[benefit.id];
          return next;
        });
      } else if (unassignedBudget >= benefit.cost) {
        setSelectedBenefits(prev => [...prev, id]);
      } else {
        alert(
          'Not enough unassigned budget. Reduce water or waste spend, or unlock scenario to change mine/capacity/facility.'
        );
      }
    },
    [selectedBenefits, unassignedBudget]
  );

  const handleBenefitPlace = useCallback(
    (id: CommunityBenefitId, xPct: number, yPct: number) => {
      const benefit = getCommunityBenefit(id);
      if (!benefit) return;
      if (!selectedBenefits.includes(id)) {
        if (unassignedBudget < benefit.cost) {
          alert(
            'Not enough unassigned budget. Reduce water or waste spend, or unlock scenario to change mine/capacity/facility.'
          );
          return;
        }
        setSelectedBenefits(prev => [...prev, id]);
      }
      setBenefitPlacements(prev => ({ ...prev, [id]: { xPct, yPct } }));
    },
    [selectedBenefits, unassignedBudget]
  );

  const handleBenefitRemove = useCallback((id: CommunityBenefitId) => {
    setSelectedBenefits(prev => prev.filter(b => b !== id));
    setBenefitPlacements(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const handleScenarioUnlock = useCallback(() => {
    setSelectedBenefits([]);
    setBenefitPlacements({});
  }, []);

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
        Joint workspace: choose areas to avoid, drag industrial and community-benefit symbols onto the
        regional map, compare benefit utility vs cost, then adjust technical mitigation (same rules as
        the technical teams screen).
      </p>

      <JointNoBuildToolbar selectedNoBuildIds={selectedNoBuildIds} onToggle={toggleNoBuildArea} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch flex-1 min-h-[360px]">
        <div className="flex flex-col min-h-[320px] lg:min-h-[min(72vh,640px)]">
          <BenefitUtilityCostChart
            developerBudget={chartBudget}
            highlightBenefitIds={chartBenefits}
            leverAllocations={leverAllocations}
            title="Utility vs cost (funded community benefits)"
            className="h-full min-h-[320px] flex-1"
          />
        </div>
        <div className="flex flex-col min-h-[320px]">
          <DraggableRegionalMap
            selectedNoBuildIds={selectedNoBuildIds}
            selectedBenefits={selectedBenefits}
            benefitPlacements={benefitPlacements}
            unassignedBudget={unassignedBudget}
            onBenefitPlace={handleBenefitPlace}
            onBenefitRemove={handleBenefitRemove}
          />
        </div>
      </div>

      <div className="min-h-[320px] shrink-0 flex flex-col">
        <JointDeveloperPanel
          selectedBenefits={selectedBenefits}
          onToggleBenefit={toggleBenefit}
          onScenarioUnlock={handleScenarioUnlock}
          onMetricsChange={handleMetricsChange}
        />
      </div>
    </div>
  );
};
