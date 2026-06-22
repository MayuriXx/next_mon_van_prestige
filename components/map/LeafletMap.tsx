'use client';

import { useEffect, useRef } from 'react';

interface MapPoint {
  lat: number;
  lng: number;
  label: string;
}

interface LeafletMapProps {
  from: MapPoint | null;
  to: MapPoint | null;
  routeCoords?: [number, number][];
}

export default function LeafletMap({ from, to, routeCoords }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    import('leaflet').then((L) => {
      // Fix default icon paths
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!mapInstanceRef.current) {
        const center: [number, number] = from
          ? [from.lat, from.lng]
          : [50.3569, 3.5234];

        const map = L.map(mapRef.current!, { zoomControl: true, scrollWheelZoom: false });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
        }).addTo(map);
        map.setView(center, 10);
        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.eachLayer((layer: any) => {
        if (!(layer instanceof L.TileLayer)) {
          map.removeLayer(layer);
        }
      });

      const goldIcon = L.divIcon({
        html: '<div style="width:16px;height:16px;background:#C9A84C;border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px rgba(201,168,76,0.6)"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        className: '',
      });

      const markers: [number, number][] = [];

      if (from) {
        L.marker([from.lat, from.lng], { icon: goldIcon })
          .addTo(map)
          .bindPopup('<b>Départ</b><br/>' + from.label);
        markers.push([from.lat, from.lng]);
      }

      if (to) {
        L.marker([to.lat, to.lng], { icon: goldIcon })
          .addTo(map)
          .bindPopup('<b>Arrivée</b><br/>' + to.label);
        markers.push([to.lat, to.lng]);
      }

      if (routeCoords && routeCoords.length > 0) {
        L.polyline(routeCoords, {
          color: '#C9A84C',
          weight: 4,
          opacity: 0.85,
        }).addTo(map);
      }

      if (markers.length === 2) {
        map.fitBounds(markers, { padding: [50, 50] });
      } else if (markers.length === 1) {
        map.setView(markers[0], 12);
      }
    });
  }, [from, to, routeCoords]);

  return (
    <>
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </>
  );
}
