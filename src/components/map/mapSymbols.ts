import type { LucideIcon } from 'lucide-react';
import { Pickaxe, Flame, Cog, Factory } from 'lucide-react';
import type { CommunityBenefitId } from '../../data/communityBenefits';
import { COMMUNITY_BENEFITS } from '../../data/communityBenefits';

export const MAP_INDUSTRIAL_DRAG_TYPE = 'application/x-map-industrial';
export const MAP_BENEFIT_DRAG_TYPE = 'application/x-map-benefit';

export type IndustrialSymbolType =
  | 'extraction'
  | 'refining'
  | 'processing'
  | 'advanced_manufacturing';

export interface IndustrialSymbolDef {
  type: IndustrialSymbolType;
  label: string;
  Icon: LucideIcon;
  chipClass: string;
}

export const INDUSTRIAL_SYMBOLS: IndustrialSymbolDef[] = [
  {
    type: 'extraction',
    label: 'Extraction',
    Icon: Pickaxe,
    chipClass: 'bg-gray-900 text-white border-gray-950',
  },
  {
    type: 'refining',
    label: 'Refining',
    Icon: Flame,
    chipClass: 'bg-orange-600 text-white border-orange-700',
  },
  {
    type: 'processing',
    label: 'Processing',
    Icon: Cog,
    chipClass: 'bg-blue-600 text-white border-blue-700',
  },
  {
    type: 'advanced_manufacturing',
    label: 'Advanced Manufacturing',
    Icon: Factory,
    chipClass: 'bg-purple-600 text-white border-purple-700',
  },
];

export function getIndustrialSymbolDef(type: IndustrialSymbolType): IndustrialSymbolDef {
  return INDUSTRIAL_SYMBOLS.find(s => s.type === type) ?? INDUSTRIAL_SYMBOLS[0];
}

export interface PlacedIndustrialSymbol {
  id: string;
  type: IndustrialSymbolType;
  xPct: number;
  yPct: number;
}

export const BENEFIT_CHIP_CLASS =
  'bg-green-700 text-white border-green-800 hover:bg-green-800';

export function getBenefitLabel(id: CommunityBenefitId): string {
  return COMMUNITY_BENEFITS.find(b => b.id === id)?.label ?? id;
}
