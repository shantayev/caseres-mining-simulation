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
  const noGoCount = noBuildZoneIds.length;

  const statusLine = (() => {
    if (facilityCount === 0) {
      return {
        tone: 'neutral' as const,
        label: 'No facilities to check',
        detail:
          'Upload a developer CSV with industrial_placements (facilities dragged onto the technical map).',
      };
    }
    if (noGoCount === 0) {
      return {
        tone: 'neutral' as const,
        label: 'No community no-go zones',
        detail: `${facilityCount} facility(ies) placed — community did not restrict any map areas.`,
      };
    }
    if (conflicts.length > 0) {
      return {
        tone: 'conflict' as const,
        label: `${conflicts.length} conflict${conflicts.length === 1 ? '' : 's'}`,
        detail: 'At least one technical facility sits inside a shaded no-go zone (amber ring).',
      };
    }
    return {
      tone: 'ok' as const,
      label: 'No conflicts',
      detail: `All ${facilityCount} facility(ies) are outside the ${noGoCount} selected no-go zone(s).`,
    };
  })();

  return (
    <div
      className={clsx(
        'rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col',
        className
      )}
    >
      <div className="px-3 py-2 bg-gray-50 border-b flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-bold text-gray-800">Siting vs no-go overlap</span>
        <div className="text-right sm:text-left">
          <span
            className={clsx(
              'text-[10px] font-bold flex items-center gap-1 justify-end sm:justify-start',
              statusLine.tone === 'conflict' && 'text-amber-800',
              statusLine.tone === 'ok' && 'text-green-700',
              statusLine.tone === 'neutral' && 'text-gray-600'
            )}
          >
            {statusLine.tone === 'conflict' && <AlertTriangle size={14} />}
            {statusLine.tone === 'ok' && <CheckCircle2 size={14} />}
            {statusLine.tone === 'neutral' && <MapPin size={14} />}
            {statusLine.label}
          </span>
          <p className="text-[9px] text-gray-500 max-w-md">{statusLine.detail}</p>
        </div>
      </div>

      <div className="px-3 py-1.5 bg-white border-b flex flex-wrap gap-3 text-[9px] text-gray-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 h-3 rounded-sm bg-red-500/40 border border-red-300" aria-hidden />
          Red = community no-go zone
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="w-5 h-5 rounded-full border-2 border-slate-600 bg-slate-100 flex items-center justify-center"
            aria-hidden
          >
            <span className="w-2 h-2 rounded-full bg-slate-500" />
          </span>
          Circle = technical facility
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="w-5 h-5 rounded-full border-2 border-slate-600 bg-slate-100 ring-4 ring-amber-500 ring-offset-1"
            aria-hidden
          />
          Amber ring = facility inside no-go (conflict)
        </span>
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
                    className="absolute inset-0 -m-2 rounded-full border-[3px] border-amber-500 border-dashed bg-amber-400/20 animate-pulse"
                    aria-hidden
                  />
                )}
                <div
                  className={clsx(
                    'relative flex items-center justify-center w-8 h-8 rounded-full border-2 shadow-md',
                    def.chipClass,
                    isConflict
                      ? 'ring-4 ring-amber-500 ring-offset-2 border-amber-600 z-20'
                      : 'ring-2 ring-white ring-offset-1 z-10'
                  )}
                  title={
                    isConflict
                      ? `${def.label} — inside no-go zone (conflict)`
                      : `${def.label} — outside no-go zones`
                  }
                >
                  <Icon size={16} strokeWidth={2.5} />
                </div>
              </div>
            );
          })}
        </div>

        {facilityCount === 0 && (
          <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <p className="text-xs font-semibold text-gray-700 bg-white/90 px-3 py-2 rounded-lg border border-gray-300 shadow-sm text-center max-w-[240px]">
              No facility markers yet. Technical teams must place facilities on the map and export
              the developer CSV.
            </p>
          </div>
        )}
      </div>

      <div className="px-3 py-2 text-[10px] text-gray-600 space-y-1 border-t bg-gray-50">
        <p>
          Compares <span className="font-semibold">community no-go zones</span> (from social CSV) with{' '}
          <span className="font-semibold">industrial facility locations</span> (from technical CSV).
          Negotiation is blocked when any facility falls inside a shaded zone.
        </p>
        {conflicts.length > 0 && (
          <ul className="list-disc pl-4 text-amber-900 font-medium">
            {conflicts.map((c, i) => (
              <li key={i}>
                {getIndustrialSymbolDef(c.placement.type as IndustrialSymbolType).label} at (
                {c.placement.xPct.toFixed(0)}%, {c.placement.yPct.toFixed(0)}%) overlaps{' '}
                {c.zoneIds.map(getNoBuildAreaLabel).join(', ')}
              </li>
            ))}
          </ul>
        )}
        {facilityCount > 0 && conflicts.length === 0 && noGoCount > 0 && (
          <p className="text-green-800 font-medium">
            ✓ {facilityCount} facility(ies) shown as map circles; none sit inside red zones, so no
            amber rings appear.
          </p>
        )}
      </div>
    </div>
  );
};
