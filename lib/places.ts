import type { Place, ReliefMode, TravelMode } from "./types";
import { haversine } from "./geo";

export interface Category {
  id: string;
  label: string;
  emoji: string;
  color: string;
  selectors: string[]; // Overpass selectors (without the around filter)
  match: (t: Record<string, string>) => boolean;
}

export const CATEGORIES: Record<string, Category> = {
  water: {
    id: "water", label: "Drinking water", emoji: "💧", color: "#0ea5e9",
    selectors: ['["amenity"="drinking_water"]', '["amenity"="water_point"]'],
    match: (t) => t.amenity === "drinking_water" || t.amenity === "water_point",
  },
  cafe: {
    id: "cafe", label: "Café (cool / warm indoors)", emoji: "☕", color: "#f59e0b",
    selectors: ['["amenity"="cafe"]'],
    match: (t) => t.amenity === "cafe",
  },
  icecream: {
    id: "icecream", label: "Ice cream & cold drinks", emoji: "🍦", color: "#ec4899",
    selectors: ['["amenity"="ice_cream"]'],
    match: (t) => t.amenity === "ice_cream",
  },
  mall: {
    id: "mall", label: "Mall / big store (AC)", emoji: "🏬", color: "#8b5cf6",
    selectors: ['["shop"="mall"]', '["shop"="department_store"]'],
    match: (t) => t.shop === "mall" || t.shop === "department_store",
  },
  pharmacy: {
    id: "pharmacy", label: "Pharmacy", emoji: "💊", color: "#10b981",
    selectors: ['["amenity"="pharmacy"]'],
    match: (t) => t.amenity === "pharmacy",
  },
  hospital: {
    id: "hospital", label: "Hospital / clinic", emoji: "🏥", color: "#ef4444",
    selectors: ['["amenity"="hospital"]', '["amenity"="clinic"]'],
    match: (t) => t.amenity === "hospital" || t.amenity === "clinic",
  },
  library: {
    id: "library", label: "Library (quiet, climate-controlled)", emoji: "📚", color: "#6366f1",
    selectors: ['["amenity"="library"]'],
    match: (t) => t.amenity === "library",
  },
  worship: {
    id: "worship", label: "Place of worship (open shelter)", emoji: "🕌", color: "#14b8a6",
    selectors: ['["amenity"="place_of_worship"]'],
    match: (t) => t.amenity === "place_of_worship",
  },
  shelter: {
    id: "shelter", label: "Public shelter", emoji: "⛺", color: "#06b6d4",
    selectors: ['["amenity"="shelter"]', '["amenity"="social_facility"]'],
    match: (t) => t.amenity === "shelter" || t.amenity === "social_facility",
  },
  community: {
    id: "community", label: "Community centre (warm)", emoji: "🏛️", color: "#a855f7",
    selectors: ['["amenity"="community_centre"]'],
    match: (t) => t.amenity === "community_centre",
  },
  busstop: {
    id: "busstop", label: "Covered bus stop", emoji: "🚏", color: "#3b82f6",
    selectors: ['["highway"="bus_stop"]["shelter"="yes"]', '["amenity"="shelter"]["shelter_type"="public_transport"]'],
    match: (t) => (t.highway === "bus_stop" && t.shelter === "yes") || t.shelter_type === "public_transport",
  },
  rainshop: {
    id: "rainshop", label: "Shops (umbrella / raincoat)", emoji: "🌂", color: "#f97316",
    selectors: ['["shop"="variety_store"]', '["shop"="supermarket"]', '["shop"="general"]', '["shop"="convenience"]'],
    match: (t) => ["variety_store", "supermarket", "general", "convenience"].includes(t.shop),
  },
  restaurant: {
    id: "restaurant", label: "Restaurant (hot food, warm)", emoji: "🍲", color: "#e11d48",
    selectors: ['["amenity"="restaurant"]', '["amenity"="fast_food"]'],
    match: (t) => t.amenity === "restaurant" || t.amenity === "fast_food",
  },
  fuel: {
    id: "fuel", label: "Fuel station (covered)", emoji: "⛽", color: "#eab308",
    selectors: ['["amenity"="fuel"]'],
    match: (t) => t.amenity === "fuel",
  },
  parking: {
    id: "parking", label: "Covered parking", emoji: "🅿️", color: "#64748b",
    selectors: ['["amenity"="parking"]["parking"~"multi-storey|underground"]', '["amenity"="parking"]["covered"="yes"]'],
    match: (t) => t.amenity === "parking",
  },
  repair: {
    id: "repair", label: "Vehicle repair / tyres", emoji: "🔧", color: "#78716c",
    selectors: ['["shop"="car_repair"]', '["shop"="motorcycle_repair"]', '["shop"="tyres"]', '["shop"="bicycle"]'],
    match: (t) => ["car_repair", "motorcycle_repair", "tyres", "bicycle"].includes(t.shop),
  },
  charging: {
    id: "charging", label: "EV charging", emoji: "🔌", color: "#22c55e",
    selectors: ['["amenity"="charging_station"]'],
    match: (t) => t.amenity === "charging_station",
  },
  rest: {
    id: "rest", label: "Rest area / services", emoji: "🛋️", color: "#0d9488",
    selectors: ['["highway"="rest_area"]', '["highway"="services"]'],
    match: (t) => t.highway === "rest_area" || t.highway === "services",
  },
};

const BY_MODE: Record<ReliefMode, string[]> = {
  heat: ["water", "cafe", "icecream", "mall", "pharmacy", "hospital", "library", "worship"],
  cold: ["shelter", "restaurant", "community", "hospital", "cafe", "library", "mall"],
  rain: ["busstop", "shelter", "rainshop", "mall", "cafe", "pharmacy"],
  comfort: ["water", "cafe", "pharmacy", "hospital", "mall", "rainshop"],
};

const BY_TRAVEL: Record<TravelMode, string[]> = {
  walk: [],
  bike: ["repair"],
  motorbike: ["fuel", "parking", "repair", "rest"],
  car: ["fuel", "parking", "repair", "charging", "rest"],
  bus: ["busstop"],
};

export function categoriesFor(mode: ReliefMode, travel: TravelMode): string[] {
  return Array.from(new Set([...BY_MODE[mode], ...BY_TRAVEL[travel]]));
}

const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
];

const cache = new Map<string, { at: number; data: Place[] }>();

export async function fetchPlaces(
  lat: number,
  lon: number,
  radius: number,
  catIds: string[],
  signal?: AbortSignal
): Promise<Place[]> {
  const key = `${lat.toFixed(3)}|${lon.toFixed(3)}|${radius}|${catIds.join(",")}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 5 * 60_000) return hit.data;
  // survive page reloads: the same area and range is instant for 24 hours
  try {
    const stored = JSON.parse(localStorage.getItem("cs:" + key) ?? "null");
    if (stored && Date.now() - stored.at < 24 * 3600_000) {
      cache.set(key, stored);
      return stored.data;
    }
  } catch {
    /* storage unavailable */
  }

  const body = catIds
    .flatMap((id) => CATEGORIES[id].selectors.map((s) => `nwr${s}(around:${radius},${lat},${lon});`))
    .join("");
  const query = `[out:json][timeout:12];(${body});out center tags 400;`;

  // Ask every mirror at once and use whichever answers first; retry once if all are busy.
  const askMirror = async (url: string) => {
    const res = await fetch(url, {
      method: "POST",
      body: "data=" + encodeURIComponent(query),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Overpass ${res.status}`);
    const text = await res.text();
    if (!text.trimStart().startsWith("{")) throw new Error("Overpass busy");
    const parsed = JSON.parse(text);
    if (parsed.remark && /error|timeout/i.test(parsed.remark) && !(parsed.elements?.length)) throw new Error("Overpass timeout");
    return parsed;
  };

  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const json = await Promise.any(MIRRORS.map(askMirror));
      const seen = new Set<string>();
      const out: Place[] = [];
      for (const el of json.elements ?? []) {
        const t: Record<string, string> = el.tags ?? {};
        const plat = el.lat ?? el.center?.lat;
        const plon = el.lon ?? el.center?.lon;
        if (plat === undefined || plon === undefined) continue;
        const cat = catIds.find((id) => CATEGORIES[id].match(t));
        if (!cat) continue;
        const name = t.name || t["name:en"] || t.brand || t.operator || CATEGORIES[cat].label;
        const id = `${el.type}/${el.id}`;
        if (seen.has(id)) continue;
        seen.add(id);
        out.push({
          id,
          name,
          lat: plat,
          lon: plon,
          cat,
          hours: t.opening_hours,
          phone: t.phone || t["contact:phone"],
          distance: haversine(lat, lon, plat, plon),
        });
      }
      out.sort((a, b) => a.distance - b.distance);
      cache.set(key, { at: Date.now(), data: out });
      try {
        localStorage.setItem("cs:" + key, JSON.stringify({ at: Date.now(), data: out }));
      } catch {
        /* storage full or unavailable */
      }
      return out;
    } catch (e) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      lastErr = e;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Map data unavailable");
}

type GeoHit = { name: string; lat: number; lon: number };

async function nominatim(q: string): Promise<GeoHit[]> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&accept-language=en&q=${encodeURIComponent(q)}`
  );
  if (!res.ok) throw new Error("Search service unavailable");
  const j = await res.json();
  return (j as { display_name: string; lat: string; lon: string }[]).map((r) => ({
    name: r.display_name.split(", ").slice(0, 4).join(", "),
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
  }));
}

/** Finds areas, sectors, streets and cities (e.g. "F-10 Islamabad"), not just big towns. */
export async function searchCity(q: string): Promise<GeoHit[]> {
  const variants = [q];
  const sector = q.match(/\b([A-Za-z])\s?-?\s?(\d{1,2})\b/); // "F10" -> "F-10" (best match goes first)
  if (sector) variants.unshift(q.replace(sector[0], `${sector[1].toUpperCase()}-${sector[2]}`));
  const seen = new Set<string>();
  const out: GeoHit[] = [];
  let failed = false;
  for (const v of Array.from(new Set(variants))) {
    try {
      for (const r of await nominatim(v)) {
        const k = `${r.lat.toFixed(3)},${r.lon.toFixed(3)}`;
        if (!seen.has(k)) {
          seen.add(k);
          out.push(r);
        }
      }
    } catch {
      failed = true;
    }
    if (out.length >= 5) break;
  }
  if (out.length === 0) {
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`);
      const j = await res.json();
      for (const r of j.results ?? []) {
        out.push({ name: [r.name, r.admin1, r.country].filter(Boolean).join(", "), lat: r.latitude, lon: r.longitude });
      }
    } catch {
      /* ignore */
    }
  }
  if (out.length === 0 && failed) throw new Error("Search service is busy, please try again.");
  return out.slice(0, 6);
}

export async function reverseName(lat: number, lon: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&accept-language=en`
    );
    if (!res.ok) return "Your location";
    const j = await res.json();
    const a = j.address ?? {};
    return [a.city || a.town || a.village || a.county, a.state, a.country].filter(Boolean).join(", ") || "Your location";
  } catch {
    return "Your location";
  }
}
