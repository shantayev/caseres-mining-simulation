import React from 'react';
import clsx from 'clsx';
import { KM_TO_MAP_PCT } from '../../data/mapScale';
import { oreBodyExtractionBufferRect } from './noBuildZones';

export interface MapScaleBarProps {
  className?: string;
}

/** 1 km scale bar for a 10×10 km regional map (10% of map width). */
export const MapScaleBar: React.FC<MapScaleBarProps> = ({ className }) => (
  <div
    className={clsx(
      'absolute bottom-2 left-2 z-20 flex flex-col items-start gap-0.5 pointer-events-none',
      className
    )}
    aria-label="Map scale: 1 kilometer"
  >
    <div
      className="h-1.5 border-b-2 border-l-2 border-r-2 border-gray-900 bg-white/80"
      style={{ width: `${KM_TO_MAP_PCT}%`, minWidth: '28px' }}
    />
    <span className="text-[8px] font-bold text-gray-900 bg-white/85 px-1 rounded shadow-sm">
      1 km
    </span>
  </div>
);

export interface ExtractionZoneGuideProps {
  visible?: boolean;
  className?: string;
}

/** Dashed guide showing the 1 km extraction siting buffer around the ore body. */
export const ExtractionZoneGuide: React.FC<ExtractionZoneGuideProps> = ({
  visible = true,
  className,
}) => {
  if (!visible) return null;

  const buffer = oreBodyExtractionBufferRect();

  return (
    <div
      className={clsx(
        'absolute border-2 border-dashed border-amber-500/70 bg-amber-400/10 rounded-lg pointer-events-none',
        className
      )}
      style={{
        top: `${buffer.top}%`,
        left: `${buffer.left}%`,
        width: `${buffer.width}%`,
        height: `${buffer.height}%`,
      }}
      aria-hidden
      title="Extraction sites must be placed within 1 km of the ore body"
    />
  );
};
