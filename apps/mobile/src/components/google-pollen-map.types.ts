import type { ReactNode } from 'react';
import type { GooglePollenMapType } from '@allerguide/core';

export interface GoogleMapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  color?: string;
}

export interface GooglePollenMapProps {
  latitude: number;
  longitude: number;
  zoom: number;
  mapType: GooglePollenMapType | null;
  height?: number;
  interactive?: boolean;
  markers?: GoogleMapMarker[];
  selectedMarkerId?: string | null;
  onMarkerPress?: (markerId: string) => void;
  overlay?: ReactNode;
}
