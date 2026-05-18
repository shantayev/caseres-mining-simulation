import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import type { SelectableNoBuildId } from '../joint/JointNoBuildSection';
import {
  MAP_SYMBOL_DRAG_TYPE,
  MAP_SYMBOLS,
  type MapSymbolType,
  type PlacedMapSymbol,
  getMapSymbolDef,
} from './mapSymbols';
import {
  clientToMapPercent,
  clampPct,
  getObjectContainRect,
  type ContainRect,
} from './mapGeometry';

export interface DraggableRegionalMapProps {
  selectedNoBuildIds: SelectableNoBuildId[];
}

let symbolIdCounter = 0;
function nextSymbolId() {
  symbolIdCounter += 1;
  return `sym-${symbolIdCounter}`;
}

export const DraggableRegionalMap: React.FC<DraggableRegionalMapProps> = ({ selectedNoBuildIds }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [naturalSize, setNaturalSize] = useState({ w: 4, h: 3 });
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [placed, setPlaced] = useState<PlacedMapSymbol[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);

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

  const addSymbolAtClient = useCallback(
    (type: MapSymbolType, clientX: number, clientY: number) => {
      const container = containerRef.current;
      if (!container) return;
      const pct = clientToMapPercent(clientX, clientY, container, imageRect);
      if (!pct) return;
      setPlaced(prev => [
        ...prev,
        { id: nextSymbolId(), type, xPct: clampPct(pct.xPct), yPct: clampPct(pct.yPct) },
      ]);
    },
    [imageRect]
  );

  const handleMapDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(MAP_SYMBOL_DRAG_TYPE)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleMapDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData(MAP_SYMBOL_DRAG_TYPE) as MapSymbolType;
    if (!type || !MAP_SYMBOLS.some(s => s.type === type)) return;
    addSymbolAtClient(type, e.clientX, e.clientY);
  };

  const handleMarkerPointerDown = (e: React.PointerEvent, id: string) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setDraggingId(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleMarkerPointerMove = (e: React.PointerEvent) => {
    if (!draggingId || !containerRef.current) return;
    const pct = clientToMapPercent(e.clientX, e.clientY, containerRef.current, imageRect);
    if (!pct) return;
    setPlaced(prev =>
      prev.map(s =>
        s.id === draggingId
          ? { ...s, xPct: clampPct(pct.xPct), yPct: clampPct(pct.yPct) }
          : s
      )
    );
  };

  const handleMarkerPointerUp = (e: React.PointerEvent) => {
    if (draggingId) {
      setDraggingId(null);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
    }
  };

  const removeSymbol = (id: string) => {
    setPlaced(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col min-h-[320px] lg:min-h-[min(72vh,640px)] h-full">
      <div className="px-2 py-1.5 bg-gray-50 border-b text-[10px] font-bold text-gray-700 flex items-center justify-between shrink-0">
        <span>Regional map — drag symbols onto map</span>
        <span className="text-gray-500 font-normal">No-build: {selectedLabels}</span>
      </div>

      {/* Symbol palette */}
      <div className="px-2 py-2 border-b bg-white flex flex-wrap gap-2 shrink-0">
        <span className="text-[10px] text-gray-500 w-full font-semibold">Drag onto map:</span>
        {MAP_SYMBOLS.map(({ type, label, Icon, chipClass }) => (
          <div
            key={type}
            draggable
            onDragStart={e => {
              e.dataTransfer.setData(MAP_SYMBOL_DRAG_TYPE, type);
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

      <div className="flex-1 min-h-[280px] bg-gray-100 flex items-center justify-center p-2">
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

          {/* No-build overlays (same positions as joint map) */}
          <div className="pointer-events-none absolute inset-0">
            <div
              className={clsx(
                'absolute top-[6%] left-[18%] w-[70%] h-[30%] rounded-full bg-red-500 blur-2xl transition-opacity duration-300',
                selectedNoBuildIds.includes('mountain') ? 'opacity-30' : 'opacity-0'
              )}
            />
            <div
              className={clsx(
                'absolute top-[30%] left-[0%] w-[28%] h-[40%] rounded-full bg-red-500 blur-2xl transition-opacity duration-300',
                selectedNoBuildIds.includes('oldtown') ? 'opacity-30' : 'opacity-0'
              )}
            />
            <div
              className={clsx(
                'absolute bottom-[0%] left-[0%] w-[55%] h-[42%] rounded-full bg-red-500 blur-2xl transition-opacity duration-300',
                selectedNoBuildIds.includes('aquifer') ? 'opacity-30' : 'opacity-0'
              )}
            />
            <div
              className={clsx(
                'absolute bottom-[10%] right-[0%] w-[38%] h-[38%] rounded-full bg-red-500 blur-2xl transition-opacity duration-300',
                selectedNoBuildIds.includes('campus') ? 'opacity-30' : 'opacity-0'
              )}
            />
          </div>

          {/* Drop target + markers aligned to visible image */}
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
              {placed.map(sym => {
                const def = getMapSymbolDef(sym.type);
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
                    onPointerDown={e => handleMarkerPointerDown(e, sym.id)}
                    onPointerMove={handleMarkerPointerMove}
                    onPointerUp={handleMarkerPointerUp}
                    onPointerCancel={handleMarkerPointerUp}
                    onDoubleClick={() => removeSymbol(sym.id)}
                  >
                    <Icon size={16} strokeWidth={2.5} />
                    <button
                      type="button"
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white border border-gray-300 text-gray-600 flex items-center justify-center hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                      onPointerDown={e => e.stopPropagation()}
                      onClick={e => {
                        e.stopPropagation();
                        removeSymbol(sym.id);
                      }}
                      aria-label={`Remove ${def.label}`}
                    >
                      <X size={10} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="px-2 py-1 text-[10px] text-gray-500 border-t bg-white shrink-0 space-y-0.5">
        <p>Shaded zones = selected no-build areas (same as joint view).</p>
        <p>Drag symbols from the palette; drag placed icons to reposition; double-click or ✕ to remove.</p>
        {placed.length > 0 && (
          <p className="font-semibold text-gray-700">Placed: {placed.length} symbol(s)</p>
        )}
      </div>
    </div>
  );
};
