"use client";
import type { Place, TravelMode } from "@/lib/types";
import { CATEGORIES } from "@/lib/places";
import { TRAVEL, etaMinutes, formatDistance, formatMinutes, googleDirections } from "@/lib/geo";

interface Props {
  places: Place[];
  travel: TravelMode;
  origin: { lat: number; lon: number };
  selectedIds: string[];
  loading: boolean;
  error: string | null;
  onSelect: (id: string) => void;
  onFocus: (id: string) => void;
  onRetry: () => void;
}

export default function PlacesList({ places, travel, origin, selectedIds, loading, error, onSelect, onFocus, onRetry }: Props) {
  return (
    <div className="glass card places">
      <div className="places-head">
        <h3>📋 Nearest relief points <span className="count">{places.length}</span></h3>
        {loading && <span className="spinner" aria-label="Loading" />}
      </div>
      {error && (
        <div className="notice warn">
          {error} <button className="link" onClick={onRetry}>Retry</button>
        </div>
      )}
      {!loading && !error && places.length === 0 && (
        <div className="empty">
          <div style={{ fontSize: 34 }}>🔍</div>
          No points found in this range. Increase the range or enable more categories.
        </div>
      )}
      <ul>
        {places.slice(0, 40).map((p) => {
          const c = CATEGORIES[p.cat];
          const sel = selectedIds.includes(p.id);
          return (
            <li key={p.id} className={sel ? "sel" : ""}>
              <button className="place-main" onClick={() => onFocus(p.id)}>
                <span className="place-ic" style={{ background: c.color + "33", borderColor: c.color }}>{c.emoji}</span>
                <span className="place-info">
                  <b>{p.name}</b>
                  <small>{c.label.split(" (")[0]} · {formatDistance(p.distance)} · {TRAVEL[travel].emoji} {formatMinutes(etaMinutes(p.distance, travel))}</small>
                </span>
              </button>
              <div className="place-actions">
                <button className={`mini ${sel ? "on" : ""}`} onClick={() => onSelect(p.id)} title="Select to measure distance">{sel ? "✓ Selected" : "Measure"}</button>
                <a className="mini" href={googleDirections(p.lat, p.lon, travel, origin.lat, origin.lon)} target="_blank" rel="noreferrer">Go ↗</a>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
