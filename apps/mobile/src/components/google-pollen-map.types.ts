import type { ReactNode } from 'react';
import type { GooglePollenMapType } from '@allerguide/core';

export interface GoogleMapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  color?: string;
}

export interface GoogleMapCircle {
  id: string;
  latitude: number;
  longitude: number;
  radiusM: number;
  color: string;
  opacity: number;
  strokeOpacity?: number;
}

export interface GoogleMapPolyline {
  id: string;
  path: Array<{ latitude: number; longitude: number }>;
  color: string;
  width?: number;
  opacity?: number;
}

export interface GooglePollenMapProps {
  latitude: number;
  longitude: number;
  zoom: number;
  mapType: GooglePollenMapType | null;
  height?: number;
  interactive?: boolean;
  markers?: GoogleMapMarker[];
  circles?: GoogleMapCircle[];
  polylines?: GoogleMapPolyline[];
  selectedMarkerId?: string | null;
  onMarkerPress?: (markerId: string) => void;
  overlay?: ReactNode;
}
