/** Shared Overpass (OpenStreetMap) client. Works in the browser and on the server. */

export const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
];

export interface OverpassResult {
  elements: { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[];
}

async function askMirror(url: string, query: string, signal: AbortSignal | undefined, timeoutMs: number): Promise<OverpassResult> {
  const timeout = AbortSignal.timeout(timeoutMs);
  const res = await fetch(url, {
    method: "POST",
    body: "data=" + encodeURIComponent(query),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      // servers must identify themselves to the public Overpass instances (browsers add their own)
      ...(typeof window === "undefined" ? { "User-Agent": "ClimateShield/1.0 (student hackathon project; https://github.com/LaibaLatif/climateshield)" } : {}),
    },
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  const text = await res.text();
  if (!text.trimStart().startsWith("{")) throw new Error("Overpass busy");
  const parsed = JSON.parse(text);
  if (parsed.remark && /error|timeout/i.test(parsed.remark) && !parsed.elements?.length) throw new Error("Overpass timeout");
  return parsed;
}

/** Asks every mirror at once and returns whichever answers first; retries when all are busy. */
export async function queryOverpass(
  query: string,
  opts: { signal?: AbortSignal; mirrors?: string[]; timeoutMs?: number; attempts?: number } = {}
): Promise<OverpassResult> {
  const { signal, mirrors = OVERPASS_MIRRORS, timeoutMs = 10_000, attempts = 2 } = opts;
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await Promise.any(mirrors.map((m) => askMirror(m, query, signal, timeoutMs)));
    } catch (e) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      lastErr = e;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Map data unavailable");
}
