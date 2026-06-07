import React from 'react';
import { NoBuildToolbar } from '../map/NoBuildToolbar';
import { RegionalMapPreview } from '../map/RegionalMapPreview';
import type { NoBuildAreaId, SelectableNoBuildId } from '../../data/noBuildAreas';

export type { NoBuildAreaId, SelectableNoBuildId };

export interface JointNoBuildToolbarProps {
  selectedNoBuildIds: SelectableNoBuildId[];
  onToggle: (id: NoBuildAreaId) => void;
  maxNoBuildZones: number;
  mineSizeLabel?: string;
}

export const JointNoBuildToolbar: React.FC<JointNoBuildToolbarProps> = props => (
  <NoBuildToolbar {...props} />
);

export interface JointNoBuildMapPanelProps {
  selectedNoBuildIds: SelectableNoBuildId[];
}

export const JointNoBuildMapPanel: React.FC<JointNoBuildMapPanelProps> = ({
  selectedNoBuildIds,
}) => (
  <RegionalMapPreview
    selectedNoBuildIds={selectedNoBuildIds}
    className="h-full min-h-[280px]"
  />
);
