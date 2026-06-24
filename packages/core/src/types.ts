export type ProfileType = 'self' | 'child';
export type Scenario = 'self' | 'child' | 'both';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface Profile {
  id: number;
  userId?: number;
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

export interface SafeProduct {
  id: number;
  profileId: number;
  name: string;
  mode: string;
  input: string;
  savedAt: string;
}

export interface ScanHistoryEntry {
  id: number;
  profileId: number;
  mode: string;
  input: string;
  verdict: string;
  matches: string;
  level: string;
  productName: string | null;
  source: string;
  createdAt: string;
}

export interface ProfileInput {
  name: string;
  birthYear: number;
  type: ProfileType;
  allergies: string[];
}
