import React from 'react';
import clsx from 'clsx';
import type { SelectableNoBuildId } from '../../data/noBuildAreas';
import { getNoBuildAreaLabel } from '../../data/noBuildAreas';
import { NO_BUILD_ZONE_RECTS } from './noBuildZones';

export interface NoBuildOverlaysProps {
  selectedNoBuildIds: SelectableNoBuildId[];
  /** Highlight zones where community no-go conflicts with technical siting */
  highlightMismatchZoneIds?: SelectableNoBuildId[];
  className?: string;
}

const ZONE_SHAPE: Record<
  SelectableNoBuildId,
  { rounded: string; borderStyle: 'solid' | 'dashed' }
> = {
  ore_body: { rounded: 'rounded-lg', borderStyle: 'dashed' },
  mountain: { rounded: 'rounded-[2rem]', borderStyle: 'solid' },
  oldtown: { rounded: 'rounded-[2rem]', borderStyle: 'solid' },
  aquifer: { rounded: 'rounded-[2rem]', borderStyle: 'solid' },
  agriculture: { rounded: 'rounded-[2rem]', borderStyle: 'solid' },
};

/** Bordered overlays aligned to regional-map.png (percent of map box). */
export const NoBuildOverlays: React.FC<NoBuildOverlaysProps> = ({
  selectedNoBuildIds,
  highlightMismatchZoneIds = [],
  className,
}) => (
  <div className={clsx('pointer-events-none absolute inset-0', className)}>
    {NO_BUILD_ZONE_RECTS.map((zone, index) => {
      const selected = selectedNoBuildIds.includes(zone.id);
      const mismatch = highlightMismatchZoneIds.includes(zone.id);
      const visible = selected || mismatch;
      const shape = ZONE_SHAPE[zone.id];
      const showLabel =
        visible && NO_BUILD_ZONE_RECTS.findIndex(z => z.id === zone.id) === index;
      return (
        <div
          key={`${zone.id}-${index}`}
          className={clsx(
            'absolute transition-all duration-300 box-border',
            shape.rounded,
            shape.borderStyle === 'dashed' ? 'border-dashed' : 'border-solid',
            visible
              ? 'border-2 border-red-600 bg-red-500/20 opacity-100'
              : 'border-0 bg-transparent opacity-0',
            mismatch && 'ring-2 ring-amber-500 ring-offset-1 border-amber-600 bg-amber-400/15'
          )}
          style={{
            top: `${zone.top}%`,
            left: `${zone.left}%`,
            width: `${zone.width}%`,
            height: `${zone.height}%`,
          }}
          aria-hidden={!visible}
        >
          {showLabel && (
            <span className="absolute top-0.5 left-1 text-[8px] font-bold text-red-900 bg-white/80 px-1 rounded leading-tight max-w-[90%] truncate">
              {getNoBuildAreaLabel(zone.id)}
            </span>
          )}
        </div>
      );
    })}
  </div>
);
