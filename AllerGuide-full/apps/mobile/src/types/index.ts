export type ProfileType = 'self' | 'child';

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
