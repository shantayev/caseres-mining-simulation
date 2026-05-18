import type { LucideIcon } from 'lucide-react';
import { Factory, Droplets, Users, TreePine, Pickaxe } from 'lucide-react';

export type MapSymbolType = 'mine' | 'facility' | 'water' | 'community' | 'forestry';

export const MAP_SYMBOL_DRAG_TYPE = 'application/x-map-symbol';

export interface MapSymbolDef {
  type: MapSymbolType;
  label: string;
  Icon: LucideIcon;
  /** Tailwind classes for marker chip on map */
  chipClass: string;
}

export const MAP_SYMBOLS: MapSymbolDef[] = [
  { type: 'mine', label: 'Mine', Icon: Pickaxe, chipClass: 'bg-gray-800 text-white border-gray-900' },
  { type: 'facility', label: 'Facility', Icon: Factory, chipClass: 'bg-orange-600 text-white border-orange-700' },
  { type: 'water', label: 'Water', Icon: Droplets, chipClass: 'bg-blue-600 text-white border-blue-700' },
  { type: 'community', label: 'Community', Icon: Users, chipClass: 'bg-purple-600 text-white border-purple-700' },
  { type: 'forestry', label: 'Forestry', Icon: TreePine, chipClass: 'bg-green-700 text-white border-green-800' },
];

export function getMapSymbolDef(type: MapSymbolType): MapSymbolDef {
  return MAP_SYMBOLS.find(s => s.type === type) ?? MAP_SYMBOLS[0];
}

export interface PlacedMapSymbol {
  id: string;
  type: MapSymbolType;
  /** 0–100 within visible map image box */
  xPct: number;
  yPct: number;
}
