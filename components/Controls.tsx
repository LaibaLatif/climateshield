"use client";
import { useState } from "react";
import type { Place, ReliefMode, TravelMode } from "@/lib/types";
import { TRAVEL, etaMinutes, formatDistance, formatMinutes, metersForMinutes } from "@/lib/geo";
import { CATEGORIES } from "@/lib/places";

export type Unit = "time" | "distance";

export interface QuickNeed {
  id: string;
  label: string;
  emoji: string;
  place: Place | null;
}

const RELIEF_TITLE: Record<ReliefMode, string> = {
  heat: "Cooling points",
  cold: "Warming points",
  rain: "Rain cover & shops",
  comfort: "Useful stops nearby",
};

interface Props {
  travel: TravelMode;
  onTravel: (t: TravelMode) => void;
  unit: Unit;
  onUnit: (u: Unit) => void;
  minutes: number;
  onMinutes: (n: number) => void;
  meters: number;
  onMeters: (n: number) => void;
  relief: ReliefMode;
  catIds: string[];
  activeCats: string[];
  onToggleCat: (id: string) => void;
  counts: Record<string, number>;
  quick: QuickNeed[];
  loadingPlaces: boolean;
  onQuick: (placeId: string) => void;
  onSearch: (q: string) => Promise<void>;
  onLocate: () => void;
  searchResults: { name: string; lat: number; lon: number }[];
  searchMsg: string | null;
  onPick: (r: { name: string; lat: number; lon: number }) => void;
  searching: boolean;
}

export default function Controls(p: Props) {
  const [q, setQ] = useState("");
  const reachM = p.unit === "time" ? metersForMinutes(p.minutes, p.travel) : p.meters;

  return (
    <aside className="controls">
      <div className="glass card">
        <h3>📍 Location</h3>
        <div className="search">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && q.trim()) p.onSearch(q.trim());
            }}
            placeholder="Search an area, e.g. F-10 Islamabad"
            aria-label="Search location"
          />
          <button type="button" disabled={p.searching || !q.trim()} onClick={() => p.onSearch(q.trim())}>{p.searching ? "…" : "Search"}</button>
        </div>
        {p.searchMsg && <div className="notice warn">{p.searchMsg}</div>}
        {p.searchResults.length > 0 && (
          <ul className="results">
            {p.searchResults.map((r, i) => (
              <li key={i}>
                <button onClick={() => { p.onPick(r); setQ(""); }}>{r.name}</button>
              </li>
            ))}
          </ul>
        )}
        <button className="ghost wide" onClick={p.onLocate}>🎯 Use my current location</button>
      </div>

      <div className="glass card">
        <h3>🧭 How are you travelling?</h3>
        <div className="seg">
          {(Object.keys(TRAVEL) as TravelMode[]).map((m) => (
            <button key={m} className={p.travel === m ? "on" : ""} onClick={() => p.onTravel(m)} title={TRAVEL[m].label}>
              <span>{TRAVEL[m].emoji}</span>
              <small>{TRAVEL[m].label}</small>
            </button>
          ))}
        </div>

        <div className="range-head">
          <h4>Search range</h4>
          <div className="mini-seg">
            <button className={p.unit === "time" ? "on" : ""} onClick={() => p.onUnit("time")}>Minutes</button>
            <button className={p.unit === "distance" ? "on" : ""} onClick={() => p.onUnit("distance")}>Metres</button>
          </div>
        </div>
        {p.unit === "time" ? (
          <input type="range" min={1} max={40} step={1} value={p.minutes} onChange={(e) => p.onMinutes(+e.target.value)} aria-label="Maximum travel time" />
        ) : (
          <input type="range" min={100} max={8000} step={100} value={p.meters} onChange={(e) => p.onMeters(+e.target.value)} aria-label="Maximum distance" />
        )}
        <div className="range-val">
          {p.unit === "time" ? <b>{p.minutes} min by {TRAVEL[p.travel].label.toLowerCase()}</b> : <b>{formatDistance(p.meters)}</b>}
          <span className="muted"> ≈ {formatDistance(reachM)} radius</span>
        </div>
      </div>

      <div className="glass card">
        <h3>⚡ Need something now?</h3>
        <div className="quick">
          {p.quick.map((n) => (
            <button key={n.id} className="quick-row" disabled={!n.place} onClick={() => n.place && p.onQuick(n.place.id)}>
              <span className="quick-ic">{n.emoji}</span>
              <span className="quick-txt">
                <b>{n.label}</b>
                <small>
                  {n.place
                    ? `${n.place.name} · ${formatDistance(n.place.distance)} · ${TRAVEL[p.travel].emoji} ${formatMinutes(etaMinutes(n.place.distance, p.travel))}`
                    : p.loadingPlaces ? "Searching…" : "None within your range"}
                </small>
              </span>
              {n.place && <span className="quick-go">→</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="glass card">
        <h3>✨ {RELIEF_TITLE[p.relief]}</h3>
        <div className="chips">
          {p.catIds.map((id) => {
            const c = CATEGORIES[id];
            const on = p.activeCats.includes(id);
            return (
              <button key={id} className={`chip ${on ? "on" : ""}`} style={on ? { borderColor: c.color, background: c.color + "33" } : undefined} onClick={() => p.onToggleCat(id)}>
                {c.emoji} {c.label.split(" (")[0]} <em>{p.counts[id] ?? 0}</em>
              </button>
            );
          })}
        </div>
      </div>

    </aside>
  );
}
