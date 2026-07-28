import type { ReactNode } from 'react';
import type { GooglePollenMapType } from '@allerguide/core';

export interface GooglePollenMapProps {
  latitude: number;
  longitude: number;
  zoom: number;
  mapType: GooglePollenMapType;
  height?: number;
  interactive?: boolean;
  overlay?: ReactNode;
}
