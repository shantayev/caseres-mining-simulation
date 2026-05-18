import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import type { SelectableNoBuildId } from '../joint/JointNoBuildSection';
import {
  COMMUNITY_BENEFITS,
  type CommunityBenefitId,
} from '../../data/communityBenefits';
import {
  MAP_BENEFIT_DRAG_TYPE,
  MAP_INDUSTRIAL_DRAG_TYPE,
  INDUSTRIAL_SYMBOLS,
  BENEFIT_CHIP_CLASS,
  getBenefitLabel,
  getIndustrialSymbolDef,
  type IndustrialSymbolType,
  type PlacedIndustrialSymbol,
} from './mapSymbols';
import {
  clientToMapPercent,
  clampPct,
  getObjectContainRect,
  type ContainRect,
} from './mapGeometry';
import { isPointInNoBuildZone } from './noBuildZones';
import { NoBuildOverlays } from './NoBuildOverlays';

export interface BenefitPlacement {
  xPct: number;
  yPct: number;
}

export interface DraggableRegionalMapProps {
  selectedNoBuildIds: SelectableNoBuildId[];
  selectedBenefits: string[];
  benefitPlacements: Partial<Record<CommunityBenefitId, BenefitPlacement>>;
  remainingBudget: number;
  onBenefitPlace: (id: CommunityBenefitId, xPct: number, yPct: number) => void;
  onBenefitRemove: (id: CommunityBenefitId) => void;
}

let symbolIdCounter = 0;
function nextSymbolId() {
  symbolIdCounter += 1;
  return `sym-${symbolIdCounter}`;
}

export const DraggableRegionalMap: React.FC<DraggableRegionalMapProps> = ({
  selectedNoBuildIds,
  selectedBenefits,
  benefitPlacements,
  remainingBudget,
  onBenefitPlace,
  onBenefitRemove,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [naturalSize, setNaturalSize] = useState({ w: 4, h: 3 });
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [placedIndustrial, setPlacedIndustrial] = useState<PlacedIndustrialSymbol[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingCategory, setDraggingCategory] = useState<'industrial' | 'benefit' | null>(null);

  const selectedLabels =
    selectedNoBuildIds.length === 0
      ? 'None'
      : selectedNoBuildIds
          .map(id => {
            const labels: Record<string, string> = {
              mountain: 'Mountain Trails',
              oldtown: 'Old Town',
              aquifer: 'Aquifer Systems',
              campus: 'University Campus',
            };
            return labels[id];
          })
          .filter(Boolean)
          .join(', ');

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const cr = entries[0]?.contentRect;
      if (cr) setContainerSize({ w: cr.width, h: cr.height });
    });
    ro.observe(el);
    setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const imageRect: ContainRect = useMemo(
    () => getObjectContainRect(containerSize.w, containerSize.h, naturalSize.w, naturalSize.h),
    [containerSize, naturalSize]
  );

  const canPlaceAt = useCallback(
    (xPct: number, yPct: number) => !isPointInNoBuildZone(xPct, yPct, selectedNoBuildIds),
    [selectedNoBuildIds]
  );

  useEffect(() => {
    setPlacedIndustrial(prev =>
      prev.filter(s => canPlaceAt(s.xPct, s.yPct))
    );
  }, [selectedNoBuildIds, canPlaceAt]);

  const addIndustrialAtClient = useCallback(
    (type: IndustrialSymbolType, clientX: number, clientY: number) => {
      const container = containerRef.current;
      if (!container) return;
      const pct = clientToMapPercent(clientX, clientY, container, imageRect);
      if (!pct || !canPlaceAt(pct.xPct, pct.yPct)) return;
      setPlacedIndustrial(prev => [
        ...prev,
        {
          id: nextSymbolId(),
          type,
          xPct: clampPct(pct.xPct),
          yPct: clampPct(pct.yPct),
        },
      ]);
    },
    [imageRect, canPlaceAt]
  );

  const handleMapDragOver = (e: React.DragEvent) => {
    const types = e.dataTransfer.types;
    if (
      types.includes(MAP_INDUSTRIAL_DRAG_TYPE) ||
      types.includes(MAP_BENEFIT_DRAG_TYPE)
    ) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleMapDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const industrialType = e.dataTransfer.getData(
      MAP_INDUSTRIAL_DRAG_TYPE
    ) as IndustrialSymbolType;
    if (industrialType && INDUSTRIAL_SYMBOLS.some(s => s.type === industrialType)) {
      addIndustrialAtClient(industrialType, e.clientX, e.clientY);
      return;
    }
    const benefitId = e.dataTransfer.getData(MAP_BENEFIT_DRAG_TYPE) as CommunityBenefitId;
    if (benefitId && COMMUNITY_BENEFITS.some(b => b.id === benefitId)) {
      const container = containerRef.current;
      if (!container) return;
      const pct = clientToMapPercent(e.clientX, e.clientY, container, imageRect);
      if (!pct) return;
      onBenefitPlace(benefitId, clampPct(pct.xPct), clampPct(pct.yPct));
    }
  };

  const handleMarkerPointerDown = (
    e: React.PointerEvent,
    id: string,
    category: 'industrial' | 'benefit'
  ) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setDraggingId(id);
    setDraggingCategory(category);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleMarkerPointerMove = (e: React.PointerEvent) => {
    if (!draggingId || !draggingCategory || !containerRef.current) return;
    const pct = clientToMapPercent(e.clientX, e.clientY, containerRef.current, imageRect);
    if (!pct) return;
    const x = clampPct(pct.xPct);
    const y = clampPct(pct.yPct);

    if (draggingCategory === 'industrial') {
      if (!canPlaceAt(x, y)) return;
      setPlacedIndustrial(prev =>
        prev.map(s => (s.id === draggingId ? { ...s, xPct: x, yPct: y } : s))
      );
    } else {
      const benefitId = draggingId as CommunityBenefitId;
      if (benefitPlacements[benefitId]) {
        onBenefitPlace(benefitId, x, y);
      }
    }
  };

  const handleMarkerPointerUp = (e: React.PointerEvent) => {
    if (draggingId) {
      setDraggingId(null);
      setDraggingCategory(null);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
    }
  };

  const removeIndustrial = (id: string) => {
    setPlacedIndustrial(prev => prev.filter(s => s.id !== id));
  };

  const benefitCanAfford = (id: CommunityBenefitId) => {
    const benefit = COMMUNITY_BENEFITS.find(b => b.id === id);
    if (!benefit) return false;
    if (selectedBenefits.includes(id)) return true;
    return remainingBudget >= benefit.cost;
  };

  const placedBenefitCount = Object.keys(benefitPlacements).length;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col min-h-[320px] lg:min-h-[min(72vh,640px)] h-full">
      <div className="px-2 py-1.5 bg-gray-50 border-b text-[10px] font-bold text-gray-700 flex items-center justify-between shrink-0">
        <span>Regional map — drag symbols onto map</span>
        <span className="text-gray-500 font-normal">No-build: {selectedLabels}</span>
      </div>

      {/* Industrial palette — horizontal above map */}
      <div className="px-2 py-2 border-b bg-white shrink-0">
        <span className="text-[10px] text-gray-500 font-semibold block mb-1.5">
          Industrial chain (drag onto map):
        </span>
        <div className="flex flex-row flex-wrap gap-2">
          {INDUSTRIAL_SYMBOLS.map(({ type, label, Icon, chipClass }) => (
            <div
              key={type}
              draggable
              onDragStart={e => {
                e.dataTransfer.setData(MAP_INDUSTRIAL_DRAG_TYPE, type);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              className={clsx(
                'flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-bold cursor-grab active:cursor-grabbing shadow-sm select-none',
                chipClass
              )}
              title={`Drag ${label} to map`}
            >
              <Icon size={14} strokeWidth={2.5} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Body: benefits column + map */}
      <div className="flex flex-row flex-1 min-h-0">
        <div className="w-[min(140px,28%)] shrink-0 border-r bg-white px-1.5 py-2 flex flex-col gap-1.5 overflow-y-auto">
          <span className="text-[9px] text-gray-500 font-semibold leading-tight">
            Community benefits:
          </span>
          {COMMUNITY_BENEFITS.map(({ id, label, cost }) => {
            const affordable = benefitCanAfford(id);
            const isSelected = selectedBenefits.includes(id);
            return (
              <div
                key={id}
                draggable={affordable}
                onDragStart={e => {
                  if (!affordable) {
                    e.preventDefault();
                    return;
                  }
                  e.dataTransfer.setData(MAP_BENEFIT_DRAG_TYPE, id);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                className={clsx(
                  'px-1.5 py-1.5 rounded-lg border text-[9px] font-bold leading-tight text-center cursor-grab active:cursor-grabbing shadow-sm select-none',
                  BENEFIT_CHIP_CLASS,
                  !affordable && 'opacity-50 cursor-not-allowed',
                  isSelected && 'ring-2 ring-green-300'
                )}
                title={
                  affordable
                    ? `Drag ${label} to map ($${(cost / 1_000_000).toFixed(1)}M)`
                    : 'Not enough budget remaining'
                }
              >
                {label}
              </div>
            );
          })}
        </div>

        <div className="flex-1 min-h-[240px] bg-gray-100 flex items-center justify-center p-2 min-w-0">
          <div
            ref={containerRef}
            className="relative w-full max-w-full aspect-[4/3] max-h-[min(68vh,620px)] mx-auto"
          >
            <img
              src="/regional-map.png"
              alt="Regional map"
              draggable={false}
              className="absolute inset-0 w-full h-full object-contain object-center select-none pointer-events-none"
              onLoad={e => {
                const img = e.currentTarget;
                if (img.naturalWidth && img.naturalHeight) {
                  setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
                }
              }}
            />

            <NoBuildOverlays selectedNoBuildIds={selectedNoBuildIds} />

            {containerSize.w > 0 && (
              <div
                className="absolute z-10"
                style={{
                  left: imageRect.left,
                  top: imageRect.top,
                  width: imageRect.width,
                  height: imageRect.height,
                }}
                onDragOver={handleMapDragOver}
                onDrop={handleMapDrop}
              >
                {placedIndustrial.map(sym => {
                  const def = getIndustrialSymbolDef(sym.type);
                  const { Icon } = def;
                  const isDragging = draggingId === sym.id;
                  return (
                    <div
                      key={sym.id}
                      role="button"
                      tabIndex={0}
                      className={clsx(
                        'absolute flex items-center justify-center w-8 h-8 rounded-full border-2 shadow-md cursor-grab touch-none',
                        def.chipClass,
                        isDragging && 'ring-2 ring-yellow-400 scale-110 z-20'
                      )}
                      style={{
                        left: `${sym.xPct}%`,
                        top: `${sym.yPct}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      title={`${def.label} — drag to move, double-click to remove`}
                      onPointerDown={e =>
                        handleMarkerPointerDown(e, sym.id, 'industrial')
                      }
                      onPointerMove={handleMarkerPointerMove}
                      onPointerUp={handleMarkerPointerUp}
                      onPointerCancel={handleMarkerPointerUp}
                      onDoubleClick={() => removeIndustrial(sym.id)}
                    >
                      <Icon size={16} strokeWidth={2.5} />
                      <button
                        type="button"
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white border border-gray-300 text-gray-600 flex items-center justify-center hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                        onPointerDown={e => e.stopPropagation()}
                        onClick={e => {
                          e.stopPropagation();
                          removeIndustrial(sym.id);
                        }}
                        aria-label={`Remove ${def.label}`}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  );
                })}

                {(Object.entries(benefitPlacements) as [CommunityBenefitId, BenefitPlacement][]).map(
                  ([id, pos]) => {
                    const isDragging = draggingId === id;
                    return (
                      <div
                        key={id}
                        role="button"
                        tabIndex={0}
                        className={clsx(
                          'absolute flex items-center justify-center min-w-[2rem] max-w-[5rem] px-1 py-0.5 rounded-md border-2 shadow-md cursor-grab touch-none text-[8px] font-bold text-center leading-tight',
                          BENEFIT_CHIP_CLASS,
                          isDragging && 'ring-2 ring-yellow-400 scale-110 z-20'
                        )}
                        style={{
                          left: `${pos.xPct}%`,
                          top: `${pos.yPct}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        title={`${getBenefitLabel(id)} — drag to move, double-click to remove`}
                        onPointerDown={e =>
                          handleMarkerPointerDown(e, id, 'benefit')
                        }
                        onPointerMove={handleMarkerPointerMove}
                        onPointerUp={handleMarkerPointerUp}
                        onPointerCancel={handleMarkerPointerUp}
                        onDoubleClick={() => onBenefitRemove(id)}
                      >
                        <span className="line-clamp-2">{getBenefitLabel(id)}</span>
                        <button
                          type="button"
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white border border-gray-300 text-gray-600 flex items-center justify-center hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                          onPointerDown={e => e.stopPropagation()}
                          onClick={e => {
                            e.stopPropagation();
                            onBenefitRemove(id);
                          }}
                          aria-label={`Remove ${getBenefitLabel(id)}`}
                        >
                          <X size={10} />
                        </button>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-2 py-1 text-[10px] text-gray-500 border-t bg-white shrink-0 space-y-0.5">
        <p>Shaded zones = no-build areas — industrial symbols (top row) cannot be placed there.</p>
        <p>
          Drag industrial symbols from above or community benefits from the left; double-click or ✕
          to remove.
        </p>
        {(placedIndustrial.length > 0 || placedBenefitCount > 0) && (
          <p className="font-semibold text-gray-700">
            Placed: {placedIndustrial.length} industrial, {placedBenefitCount} benefit(s)
          </p>
        )}
      </div>
    </div>
  );
};
