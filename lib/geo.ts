import type { TravelMode } from "./types";

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export interface TravelProfile {
  id: TravelMode;
  label: string;
  emoji: string;
  speedKmh: number; // realistic average door-to-door speed in a city
  detour: number; // road distance / straight-line distance
  waitMin: number; // average waiting time before the trip really starts
  osrm: string; // routing.openstreetmap.de profile
  google: string; // google maps travelmode
}

export const TRAVEL: Record<TravelMode, TravelProfile> = {
  walk: { id: "walk", label: "Walking", emoji: "🚶", speedKmh: 4.8, detour: 1.25, waitMin: 0, osrm: "routed-foot", google: "walking" },
  bike: { id: "bike", label: "Bicycle", emoji: "🚲", speedKmh: 14, detour: 1.25, waitMin: 0, osrm: "routed-bike", google: "bicycling" },
  motorbike: { id: "motorbike", label: "Motorbike", emoji: "🏍️", speedKmh: 28, detour: 1.3, waitMin: 0, osrm: "routed-car", google: "driving" },
  car: { id: "car", label: "Car", emoji: "🚗", speedKmh: 26, detour: 1.35, waitMin: 1, osrm: "routed-car", google: "driving" },
  bus: { id: "bus", label: "Bus", emoji: "🚌", speedKmh: 17, detour: 1.4, waitMin: 8, osrm: "routed-car", google: "transit" },
};

/** Estimated minutes to cover a straight-line distance with the chosen travel mode. */
export function etaMinutes(distM: number, mode: TravelMode): number {
  const t = TRAVEL[mode];
  const roadKm = (distM * t.detour) / 1000;
  return Math.max(1, Math.round((roadKm / t.speedKmh) * 60 + t.waitMin));
}

/** Largest straight-line distance reachable within `minutes` with the chosen mode. */
export function metersForMinutes(minutes: number, mode: TravelMode): number {
  const t = TRAVEL[mode];
  const travelMin = Math.max(0, minutes - t.waitMin);
  return Math.round(((travelMin / 60) * t.speedKmh * 1000) / t.detour);
}

export function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function googleDirections(lat: number, lon: number, mode: TravelMode, originLat?: number, originLon?: number): string {
  const origin = originLat !== undefined && originLon !== undefined ? `&origin=${originLat},${originLon}` : "";
  return `https://www.google.com/maps/dir/?api=1${origin}&destination=${lat},${lon}&travelmode=${TRAVEL[mode].google}`;
}
