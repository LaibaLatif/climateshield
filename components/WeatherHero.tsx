"use client";
import type { Weather } from "@/lib/types";
import { CONDITION_META, aqiInfo, riskFromWeather } from "@/lib/weather";

function hourLabel(t: string, i: number) {
  if (!t) return i === 0 ? "Now" : `+${i}h`;
  const h = parseInt(t.slice(11, 13), 10);
  if (i === 0) return "Now";
  return `${h % 12 || 12}${h >= 12 ? "pm" : "am"}`;
}

export default function WeatherHero({ weather, locationName, loading }: { weather: Weather | null; locationName: string; loading: boolean }) {
  if (!weather) {
    return (
      <section className="glass hero skeleton-block">
        <div className="hero-main">
          <div className="shimmer" style={{ width: 120, height: 120, borderRadius: 60 }} />
          <div style={{ flex: 1 }}>
            <div className="shimmer" style={{ width: "40%", height: 22, marginBottom: 14 }} />
            <div className="shimmer" style={{ width: "25%", height: 70 }} />
          </div>
        </div>
        <p className="muted" style={{ marginTop: 16 }}>{loading ? "Reading live weather for your location…" : "Weather is unavailable. Check your connection and try again."}</p>
      </section>
    );
  }
  const meta = CONDITION_META[weather.condition];
  const risk = riskFromWeather(weather);
  const aq = aqiInfo(weather.aqi);
  const maxT = Math.max(...weather.hourly.map((h) => h.temp), weather.temp);
  const minT = Math.min(...weather.hourly.map((h) => h.temp), weather.temp);
  const span = Math.max(1, maxT - minT);

  return (
    <section className="glass hero">
      <div className="hero-main">
        <div className="hero-icon">
          <div className="ring ring1" />
          <div className="ring ring2" />
          <span className="hero-emoji">{meta.emoji}</span>
        </div>
        <div className="hero-text">
          <div className="hero-loc">
            📍 {locationName} {weather.simulated && <span className="sim-badge">Simulated scenario</span>}
          </div>
          <div className="hero-temp">
            {weather.temp}°<span className="hero-feels">feels like {weather.feelsLike}°</span>
          </div>
          <div className="hero-label">{meta.label}{weather.label.toLowerCase() !== meta.label.toLowerCase() ? ` · ${weather.label}` : ""}</div>
          <div className="hero-tag">{meta.tagline}</div>
        </div>
        <div className={`risk risk-${risk.level}`}>
          <div className="risk-top">
            <span className="risk-dot" />
            {risk.level.toUpperCase()} RISK
          </div>
          <div className="risk-reason">{risk.reason}</div>
        </div>
      </div>

      {weather.rainSoonMinutes !== null && (
        <div className="rain-alert">
          🌧️ <b>Rain expected in about {weather.rainSoonMinutes} minutes.</b> Pick a covered stop now.
        </div>
      )}

      <div className="stats">
        <div className="stat"><span>💧</span><b>{weather.humidity}%</b><small>Humidity</small></div>
        <div className="stat"><span>💨</span><b>{weather.windKmh} km/h</b><small>Wind</small></div>
        <div className="stat"><span>🕶️</span><b>{weather.uv ?? "–"}</b><small>UV index</small></div>
        <div className="stat"><span>🌧️</span><b>{weather.hourly[0]?.pop ?? 0}%</b><small>Rain chance</small></div>
        <div className={`stat aq aq-${aq.level}`}><span>🫁</span><b>{weather.aqi ?? "–"}</b><small>AQI · {weather.aqiLabel}</small></div>
      </div>

      <div className="hours">
        {weather.hourly.slice(0, 12).map((h, i) => (
          <div className="hour" key={i}>
            <small>{hourLabel(h.time, i)}</small>
            <div className="bar-wrap">
              <div className="bar" style={{ height: `${20 + ((h.temp - minT) / span) * 60}%` }} />
            </div>
            <b>{h.temp}°</b>
            <small className="pop">{h.pop}%</small>
          </div>
        ))}
      </div>
    </section>
  );
}
