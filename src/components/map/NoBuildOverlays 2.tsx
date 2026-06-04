import React from 'react';
import clsx from 'clsx';
import type { SelectableNoBuildId } from '../joint/JointNoBuildSection';

export interface NoBuildOverlaysProps {
  selectedNoBuildIds: SelectableNoBuildId[];
  className?: string;
}

/** Red blur overlays aligned to regional-map.png (shared positions with hit-test rects). */
export const NoBuildOverlays: React.FC<NoBuildOverlaysProps> = ({
  selectedNoBuildIds,
  className,
}) => (
  <div className={clsx('pointer-events-none absolute inset-0', className)}>
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
);
