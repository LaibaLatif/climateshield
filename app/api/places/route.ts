import { NextResponse } from "next/server";
import { CATEGORIES, buildQuery } from "@/lib/places";
import { queryOverpass } from "@/lib/overpass";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Server-side proxy for OpenStreetMap data: avoids browser CORS limits and is cached at the edge. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lon = parseFloat(searchParams.get("lon") ?? "");
  const r = Math.min(8000, Math.max(100, parseInt(searchParams.get("r") ?? "", 10)));
  const cats = (searchParams.get("cats") ?? "").split(",").filter((c) => CATEGORIES[c]).slice(0, 20);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(r) || cats.length === 0 || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return NextResponse.json({ error: "Bad parameters" }, { status: 400 });
  }
  try {
    const data = await queryOverpass(buildQuery(lat, lon, r, cats, 15), { timeoutMs: 13_000, attempts: 2 });
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (e) {
    const detail = e instanceof AggregateError ? e.errors.map((x) => (x as Error).message).join(" | ") : (e as Error)?.message;
    console.error("[places]", detail);
    return NextResponse.json({ error: "Map data is busy", detail }, { status: 503 });
  }
}
