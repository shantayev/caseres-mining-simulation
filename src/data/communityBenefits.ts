export type CommunityBenefitId = 'park' | 'irrigation' | 'canoe' | 'energy' | 'research';

export interface CommunityBenefit {
  id: CommunityBenefitId;
  label: string;
  cost: number;
}

export const COMMUNITY_BENEFITS: CommunityBenefit[] = [
  { id: 'park', label: 'Park/Forestry', cost: 700000 },
  { id: 'irrigation', label: 'Upgrade Irrigation System', cost: 900000 },
  { id: 'canoe', label: 'Underground Canoe System', cost: 2500000 },
  { id: 'energy', label: 'Energy Storage Program', cost: 3000000 },
  { id: 'research', label: 'New Research Program', cost: 5000000 },
];

export function getCommunityBenefit(id: string): CommunityBenefit | undefined {
  return COMMUNITY_BENEFITS.find(b => b.id === id);
}
