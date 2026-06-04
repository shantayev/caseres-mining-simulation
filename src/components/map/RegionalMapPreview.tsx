import React from 'react';
import type { SelectableNoBuildId } from '../../data/noBuildAreas';
import { NoBuildOverlays } from './NoBuildOverlays';

export interface RegionalMapPreviewProps {
  selectedNoBuildIds: SelectableNoBuildId[];
  highlightMismatchZoneIds?: SelectableNoBuildId[];
  footer?: string;
  className?: string;
}

/** Static regional map with no-build shading (community / admin). */
export const RegionalMapPreview: React.FC<RegionalMapPreviewProps> = ({
  selectedNoBuildIds,
  highlightMismatchZoneIds = [],
  footer = 'Shaded zones show selected “do not build here” constraints.',
  className = '',
}) => (
  <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
    <div className="px-2 py-1 bg-gray-50 border-b text-[10px] font-bold text-gray-700 flex items-center justify-between">
      <span>Regional map</span>
      <span className="text-gray-500 font-normal">
        Selected:{' '}
        {selectedNoBuildIds.length === 0
          ? 'None'
          : selectedNoBuildIds.join(', ')}
      </span>
    </div>
    <div className="relative w-full aspect-[4/3] bg-gray-100">
      <img
        src="/regional-map.png"
        alt="Regional map"
        className="absolute inset-0 w-full h-full object-contain object-center"
      />
      <NoBuildOverlays
        selectedNoBuildIds={selectedNoBuildIds}
        highlightMismatchZoneIds={highlightMismatchZoneIds}
      />
    </div>
    <div className="px-2 py-1 text-[10px] text-gray-500">{footer}</div>
  </div>
);
