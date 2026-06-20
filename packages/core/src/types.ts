export type ProfileType = 'self' | 'child';
export type Scenario = 'self' | 'child' | 'both';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface Profile {
  id: number;
  name: string;
  birthYear: number;
  type: ProfileType;
  allergies: string;
}

export interface DiaryEntry {
  id: number;
  profileId: number;
  type: string;
  details: string;
  createdAt: string;
}

export interface ProfileInput {
  name: string;
  birthYear: number;
  type: ProfileType;
  allergies: string[];
}
