import React, { useMemo } from 'react';
import clsx from 'clsx';
import { AlertTriangle } from 'lucide-react';
import type { SelectableNoBuildId } from '../../data/noBuildAreas';
import { getNoBuildAreaLabel } from '../../data/noBuildAreas';
import type { IndustrialPlacementRecord } from '../../data/mapOverlap';
import { findIndustrialNoBuildConflicts } from '../../data/mapOverlap';
import { getIndustrialSymbolDef, type IndustrialSymbolType } from './mapSymbols';
import { NoBuildOverlays } from './NoBuildOverlays';

export interface AdminNegotiationMapProps {
  noBuildZoneIds: SelectableNoBuildId[];
  industrialPlacements: IndustrialPlacementRecord[];
  className?: string;
}

export const AdminNegotiationMap: React.FC<AdminNegotiationMapProps> = ({
  noBuildZoneIds,
  industrialPlacements,
  className,
}) => {
  const conflicts = useMemo(
    () => findIndustrialNoBuildConflicts(industrialPlacements, noBuildZoneIds),
    [industrialPlacements, noBuildZoneIds]
  );

  const mismatchZoneIds = useMemo(() => {
    const set = new Set<SelectableNoBuildId>();
    conflicts.forEach(c => c.zoneIds.forEach(z => set.add(z)));
    return [...set];
  }, [conflicts]);

  return (
    <div
      className={clsx(
        'rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col',
        className
      )}
    >
      <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-gray-800">Siting vs no-go overlap</span>
        {conflicts.length > 0 ? (
          <span className="text-[10px] font-bold text-amber-800 flex items-center gap-1">
            <AlertTriangle size={14} />
            {conflicts.length} conflict(s)
          </span>
        ) : (
          <span className="text-[10px] font-bold text-green-700">No overlaps</span>
        )}
      </div>
      <div className="relative w-full aspect-[4/3] bg-gray-100 max-h-[420px] mx-auto">
        <img
          src="/regional-map.png"
          alt="Regional map analysis"
          className="absolute inset-0 w-full h-full object-contain object-center"
        />
        <NoBuildOverlays
          selectedNoBuildIds={noBuildZoneIds}
          highlightMismatchZoneIds={mismatchZoneIds}
        />
        <div className="absolute inset-0 pointer-events-none">
          {industrialPlacements.map((p, i) => {
            const isConflict = conflicts.some(
              c => c.placement.xPct === p.xPct && c.placement.yPct === p.yPct && c.placement.type === p.type
            );
            const def = getIndustrialSymbolDef(p.type as IndustrialSymbolType);
            const { Icon } = def;
            return (
              <div
                key={`${p.type}-${i}`}
                className={clsx(
                  'absolute flex items-center justify-center w-8 h-8 rounded-full border-2 shadow-md -translate-x-1/2 -translate-y-1/2',
                  def.chipClass,
                  isConflict && 'ring-4 ring-amber-500 ring-offset-1 z-20'
                )}
                style={{ left: `${p.xPct}%`, top: `${p.yPct}%` }}
                title={isConflict ? `${def.label} — conflicts with no-go zone` : def.label}
              >
                <Icon size={16} strokeWidth={2.5} />
              </div>
            );
          })}
        </div>
      </div>
      <div className="px-3 py-2 text-[10px] text-gray-600 space-y-1 border-t bg-gray-50">
        <p>
          <span className="font-semibold">Red shading:</span> community no-go zones.{' '}
          <span className="font-semibold">Amber ring:</span> industrial facility inside a no-go zone.
        </p>
        {conflicts.length > 0 && (
          <ul className="list-disc pl-4 text-amber-900">
            {conflicts.map((c, i) => (
              <li key={i}>
                {getIndustrialSymbolDef(c.placement.type as IndustrialSymbolType).label} at (
                {c.placement.xPct.toFixed(0)}%, {c.placement.yPct.toFixed(0)}%) in{' '}
                {c.zoneIds.map(getNoBuildAreaLabel).join(', ')}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
