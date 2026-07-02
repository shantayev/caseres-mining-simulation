import React, { useMemo } from 'react';
import clsx from 'clsx';
import { AlertTriangle, CheckCircle2, MapPin } from 'lucide-react';
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

function placementKey(p: IndustrialPlacementRecord, index: number) {
  return `${p.type}-${p.xPct}-${p.yPct}-${index}`;
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

  const isPlacementConflict = (p: IndustrialPlacementRecord) =>
    conflicts.some(
      c =>
        c.placement.type === p.type &&
        Math.abs(c.placement.xPct - p.xPct) < 0.5 &&
        Math.abs(c.placement.yPct - p.yPct) < 0.5
    );

  const mismatchZoneIds = useMemo(() => {
    const set = new Set<SelectableNoBuildId>();
    conflicts.forEach(c => c.zoneIds.forEach(z => set.add(z)));
    return [...set];
  }, [conflicts]);

  const facilityCount = industrialPlacements.length;

  const statusLine = (() => {
    if (facilityCount === 0) {
      return {
        tone: 'neutral' as const,
        label: 'No facilities to check',
        detail: 'Upload a developer CSV with industrial_placements.',
      };
    }
    if (conflicts.length > 0) {
      return {
        tone: 'conflict' as const,
        label: `${conflicts.length} siting conflict${conflicts.length === 1 ? '' : 's'}`,
        detail: 'At least one facility sits inside a shaded no-go zone.',
      };
    }
    return {
      tone: 'ok' as const,
      label: 'No siting conflicts',
      detail: `All ${facilityCount} facility(ies) are outside no-go zones.`,
    };
  })();

  return (
    <div
      className={clsx(
        'rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col md:flex-row max-w-6xl mx-auto',
        className
      )}
    >
      <div className="md:w-[min(580px,62%)] shrink-0 flex flex-col border-b md:border-b-0 md:border-r border-gray-200">
        <div className="px-3 py-2 bg-gray-50 border-b">
          <span className="text-sm font-bold text-gray-800">Siting vs no-go overlap</span>
        </div>
        <div className="relative w-full aspect-square bg-gray-100">
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
              const key = placementKey(p, i);
              const isConflict = isPlacementConflict(p);
              const def = getIndustrialSymbolDef(p.type as IndustrialSymbolType);
              const { Icon } = def;
              return (
                <div
                  key={key}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                  style={{ left: `${p.xPct}%`, top: `${p.yPct}%` }}
                >
                  {isConflict && (
                    <span
                      className="absolute inset-0 -m-1.5 rounded-full border-2 border-amber-500 border-dashed bg-amber-400/20"
                      aria-hidden
                    />
                  )}
                  <div
                    className={clsx(
                      'relative flex items-center justify-center w-8 h-8 rounded-full border-2 shadow-md',
                      def.chipClass,
                      isConflict
                        ? 'ring-4 ring-amber-500 ring-offset-1 border-amber-600'
                        : 'ring-2 ring-white ring-offset-1'
                    )}
                  >
                    <Icon size={14} strokeWidth={2.5} />
                  </div>
                </div>
              );
            })}
          </div>
          {facilityCount === 0 && (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <p className="text-sm font-medium text-gray-700 bg-white/95 px-3 py-2 rounded-lg border shadow-sm text-center">
                No facility markers on map
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-[240px] bg-gray-50 flex flex-col text-base">
        <div className="px-4 py-3 border-b bg-white">
          <span
            className={clsx(
              'text-base font-bold flex items-center gap-2',
              statusLine.tone === 'conflict' && 'text-amber-800',
              statusLine.tone === 'ok' && 'text-green-700',
              statusLine.tone === 'neutral' && 'text-gray-700'
            )}
          >
            {statusLine.tone === 'conflict' && <AlertTriangle size={20} />}
            {statusLine.tone === 'ok' && <CheckCircle2 size={20} />}
            {statusLine.tone === 'neutral' && <MapPin size={20} />}
            {statusLine.label}
          </span>
          <p className="text-base text-gray-600 mt-2 leading-snug">{statusLine.detail}</p>
        </div>

        <div className="px-4 py-4 space-y-4 flex-1 overflow-y-auto">
          <div className="space-y-3">
            <p className="font-bold text-gray-900 text-base">Legend</p>
            <p className="flex items-center gap-3 text-gray-800">
              <span className="w-6 h-4 rounded bg-red-500/20 border-2 border-red-600 shrink-0" />
              Red border = community no-go zone
            </p>
            <p className="flex items-center gap-3 text-gray-800">
              <span className="w-7 h-7 rounded-full border-2 border-slate-500 bg-slate-100 shrink-0" />
              Circle = technical facility
            </p>
            <p className="flex items-center gap-3 text-gray-800">
              <span className="w-7 h-7 rounded-full border-2 border-slate-500 ring-4 ring-amber-500 shrink-0" />
              Amber ring = facility inside no-go (conflict)
            </p>
          </div>

          {conflicts.length > 0 && (
            <div>
              <p className="font-bold text-amber-900 mb-2">Conflict details</p>
              <ul className="list-disc pl-5 space-y-2 text-amber-900">
                {conflicts.map((c, i) => (
                  <li key={i}>
                    {getIndustrialSymbolDef(c.placement.type as IndustrialSymbolType).label} at (
                    {c.placement.xPct.toFixed(0)}%, {c.placement.yPct.toFixed(0)}%) overlaps{' '}
                    {c.zoneIds.map(getNoBuildAreaLabel).join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {facilityCount > 0 && conflicts.length === 0 && noBuildZoneIds.length > 0 && (
            <p className="text-green-800 font-medium leading-snug">
              {facilityCount} facility(ies) shown; none overlap selected no-go zones.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
