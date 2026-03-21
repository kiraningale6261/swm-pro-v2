'use client';

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

export default function MapController({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.flyTo(center, 15, {
        animate: true,
        duration: 1.5
      });
    }
  }, [center, map]);

  return null;
}
