"use client";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import type { Place, TravelMode } from "@/lib/types";
import { CATEGORIES } from "@/lib/places";
import { TRAVEL, etaMinutes, formatDistance, formatMinutes, haversine } from "@/lib/geo";

interface Props {
  center: { lat: number; lon: number };
  places: Place[];
  radiusM: number;
  travel: TravelMode;
  selectedIds: string[];
  focusId: string | null;
  focusTick: number;
  onSelect: (id: string) => void;
  onClear: () => void;
  accent: string;
}

interface RouteInfo {
  from: string;
  to: string;
  meters: number;
  minutes: number;
  approx: boolean;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

export default function MapView({ center, places, radiusM, travel, selectedIds, focusId, focusTick, onSelect, onClear, accent }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const markerIndex = useRef<Map<string, L.Marker>>(new Map());
  const circleRef = useRef<L.Circle | null>(null);
  const userRef = useRef<L.Marker | null>(null);
  const routeRef = useRef<L.LayerGroup | null>(null);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [routing, setRouting] = useState(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // create the map once
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { zoomControl: false, attributionControl: true }).setView([center.lat, center.lon], 14);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    routeRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    const t = setTimeout(() => {
      if (mapRef.current === map) map.invalidateSize();
    }, 200);
    return () => {
      clearTimeout(t);
      map.remove();
      // forget every layer that belonged to the removed map so the next map starts clean
      mapRef.current = null;
      markersRef.current = null;
      routeRef.current = null;
      circleRef.current = null;
      userRef.current = null;
      markerIndex.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // user position + search radius
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const ll: L.LatLngExpression = [center.lat, center.lon];
    if (!userRef.current) {
      userRef.current = L.marker(ll, {
        icon: L.divIcon({ className: "", html: '<div class="me"><i></i><b></b></div>', iconSize: [22, 22], iconAnchor: [11, 11] }),
        zIndexOffset: 2000,
        interactive: false,
      }).addTo(map);
    } else userRef.current.setLatLng(ll);
    if (!circleRef.current) {
      circleRef.current = L.circle(ll, { radius: radiusM, color: accent, weight: 2, fillColor: accent, fillOpacity: 0.07, dashArray: "6 6", interactive: false }).addTo(map);
    } else {
      circleRef.current.setLatLng(ll);
      circleRef.current.setRadius(radiusM);
      circleRef.current.setStyle({ color: accent, fillColor: accent });
    }
    map.fitBounds(circleRef.current.getBounds(), { padding: [30, 30], animate: true, duration: 0.5, maxZoom: 17 });
  }, [center.lat, center.lon, radiusM, accent]);

  // markers
  useEffect(() => {
    const group = markersRef.current;
    if (!group) return;
    group.clearLayers();
    markerIndex.current.clear();
    for (const p of places) {
      const cat = CATEGORIES[p.cat];
      const selected = selectedIds.includes(p.id);
      const icon = L.divIcon({
        className: "",
        html: `<div class="pin ${selected ? "sel" : ""}" style="--c:${cat.color}"><span>${cat.emoji}</span></div>`,
        iconSize: [34, 42],
        iconAnchor: [17, 40],
        tooltipAnchor: [0, -38],
      });
      const m = L.marker([p.lat, p.lon], { icon, zIndexOffset: selected ? 1500 : 0 });
      const tip =
        `<div class="tt-in"><div class="tt-cat" style="color:${cat.color}">${cat.emoji} ${esc(cat.label.split(" (")[0])}</div>` +
        `<b>${esc(p.name)}</b>` +
        `<div class="tt-row">📏 ${formatDistance(p.distance)} · ${TRAVEL[travel].emoji} ${formatMinutes(etaMinutes(p.distance, travel))}</div>` +
        (p.hours ? `<div class="tt-row">🕒 ${esc(p.hours.slice(0, 60))}</div>` : "") +
        (p.phone ? `<div class="tt-row">📞 ${esc(p.phone)}</div>` : "") +
        `<div class="tt-hint">Click to ${selected ? "deselect" : "select"} for distance</div></div>`;
      m.bindTooltip(tip, { direction: "top", className: "tt", opacity: 1 });
      m.on("click", () => onSelectRef.current(p.id));
      m.addTo(group);
      markerIndex.current.set(p.id, m);
    }
  }, [places, selectedIds, travel]);

  // focus a place from the list / AI picks
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusId) return;
    const m = markerIndex.current.get(focusId);
    if (!m) return;
    map.flyTo(m.getLatLng(), Math.max(map.getZoom(), 16), { duration: 0.7 });
    setTimeout(() => m.openTooltip(), 750);
  }, [focusId, focusTick]);

  // route between selected points (real road geometry when available)
  useEffect(() => {
    const map = mapRef.current;
    const layer = routeRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    setRoute(null);
    if (selectedIds.length === 0) return;
    const sel = selectedIds.map((id) => places.find((p) => p.id === id)).filter(Boolean) as Place[];
    if (sel.length === 0) return;
    const a = sel.length === 1 ? { name: "You", lat: center.lat, lon: center.lon } : { name: sel[0].name, lat: sel[0].lat, lon: sel[0].lon };
    const b = sel.length === 1 ? { name: sel[0].name, lat: sel[0].lat, lon: sel[0].lon } : { name: sel[1].name, lat: sel[1].lat, lon: sel[1].lon };
    const profile = TRAVEL[travel];
    const toMinutes = (m: number) => Math.max(1, Math.round(((m / 1000) / profile.speedKmh) * 60 + profile.waitMin));
    const straight = haversine(a.lat, a.lon, b.lat, b.lon);
    let cancelled = false;

    const drawLine = (pts: L.LatLngExpression[], dashed: boolean) => {
      L.polyline(pts, { color: "#ffffff", weight: 9, opacity: 0.55 }).addTo(layer);
      L.polyline(pts, { color: accent, weight: 5, opacity: 0.95, dashArray: dashed ? "2 10" : undefined, lineCap: "round" }).addTo(layer);
    };

    setRouting(true);
    fetch(`https://routing.openstreetmap.de/${profile.osrm}/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=full&geometries=geojson`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => {
        if (cancelled) return;
        const r = j.routes?.[0];
        if (!r) throw new Error("no route");
        const pts = (r.geometry.coordinates as [number, number][]).map(([lon, lat]) => [lat, lon] as L.LatLngExpression);
        drawLine(pts, false);
        map.fitBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 17 });
        setRoute({ from: a.name, to: b.name, meters: r.distance, minutes: toMinutes(r.distance), approx: false });
      })
      .catch(() => {
        if (cancelled) return;
        drawLine([[a.lat, a.lon], [b.lat, b.lon]], true);
        const m = straight * profile.detour;
        setRoute({ from: a.name, to: b.name, meters: m, minutes: toMinutes(m), approx: true });
      })
      .finally(() => !cancelled && setRouting(false));
    return () => {
      cancelled = true;
    };
  }, [selectedIds, travel, places, center.lat, center.lon, accent]);

  return (
    <div className="map-shell">
      <div ref={elRef} className="map" />
      <div className="map-legend glass">
        <span className="me-dot" /> You &nbsp;·&nbsp; <i className="ring-dot" /> Search range
      </div>
      {selectedIds.length > 0 && (
        <div className="route-panel glass">
          <div className="route-title">
            {TRAVEL[travel].emoji} {selectedIds.length === 1 ? "From you" : "Between two points"}
            <button onClick={onClear} aria-label="Clear selection">✕</button>
          </div>
          {routing && <div className="muted">Finding the best route…</div>}
          {route && !routing && (
            <>
              <div className="route-path"><b>{route.from}</b> → <b>{route.to}</b></div>
              <div className="route-nums">
                <div><strong>{formatDistance(route.meters)}</strong><small>{route.approx ? "approx. distance" : "road distance"}</small></div>
                <div><strong>{formatMinutes(route.minutes)}</strong><small>by {TRAVEL[travel].label.toLowerCase()}</small></div>
              </div>
            </>
          )}
          {selectedIds.length === 1 && <div className="muted tiny">Select a second point to measure between two places.</div>}
        </div>
      )}
    </div>
  );
}
