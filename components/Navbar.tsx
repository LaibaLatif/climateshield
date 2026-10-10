"use client";
import { useEffect, useRef, useState } from "react";
import type { Condition, Weather } from "@/lib/types";
import { CONDITION_META, SIM_OPTIONS } from "@/lib/weather";

const LINKS = [
  { id: "overview", label: "Overview" },
  { id: "explore", label: "Explore map" },
  { id: "advisor", label: "AI advisor" },
  { id: "how", label: "How it works" },
  { id: "about", label: "About" },
];

interface Props {
  weather: Weather | null;
  condition: Condition;
  sim: Condition | null;
  onSim: (c: Condition | null) => void;
}

export default function Navbar({ weather, condition, sim, onSim }: Props) {
  const [menu, setMenu] = useState(false);
  const [simOpen, setSimOpen] = useState(false);
  const [active, setActive] = useState("overview");
  const [scrolled, setScrolled] = useState(false);
  const simRef = useRef<HTMLDivElement>(null);

  // highlight the section currently in view
  useEffect(() => {
    const els = LINKS.map((l) => document.getElementById(l.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (vis) setActive(vis.target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.2, 0.5] }
    );
    els.forEach((el) => io.observe(el));
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // close dropdowns on outside click / Escape
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (simRef.current && !simRef.current.contains(e.target as Node)) setSimOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSimOpen(false);
        setMenu(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const go = (id: string) => {
    setMenu(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const meta = CONDITION_META[condition];

  return (
    <header className={`nav-wrap ${scrolled ? "scrolled" : ""}`}>
      <nav className="nav glass" aria-label="Main navigation">
        <button className="nav-brand" onClick={() => go("overview")} aria-label="ClimateShield home">
          <span className="logo sm">🛡️</span>
          <span className="nav-name">ClimateShield</span>
        </button>

        <ul className="nav-links">
          {LINKS.map((l) => (
            <li key={l.id}>
              <button className={active === l.id ? "on" : ""} onClick={() => go(l.id)} aria-current={active === l.id ? "true" : undefined}>
                {l.label}
              </button>
            </li>
          ))}
        </ul>

        <div className="nav-right">
          {weather && (
            <span className="nav-pill" title={`${meta.label}, feels like ${weather.feelsLike}°`}>
              <span>{meta.emoji}</span>
              <b>{weather.temp}°</b>
              <em className="hide-sm">{meta.label}</em>
            </span>
          )}

          <div className="sim-menu" ref={simRef}>
            <button className={`nav-btn ${sim ? "active" : ""}`} onClick={() => setSimOpen((o) => !o)} aria-haspopup="true" aria-expanded={simOpen}>
              🎛️ <span className="hide-sm">{sim ? "Demo weather" : "Preview weather"}</span> ▾
            </button>
            {simOpen && (
              <div className="sim-pop glass" role="menu">
                <div className="sim-pop-title">Preview any weather</div>
                <button role="menuitem" className={sim === null ? "on" : ""} onClick={() => { onSim(null); setSimOpen(false); }}>
                  <span>📡</span> Live weather
                </button>
                {SIM_OPTIONS.map((o) => (
                  <button key={o.id} role="menuitem" title={`Simulate ${o.label}`} className={sim === o.id ? "on" : ""} onClick={() => { onSim(o.id); setSimOpen(false); }}>
                    <span>{o.emoji}</span> {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <a className="nav-btn gh hide-sm" href="https://github.com/LaibaLatif/climateshield" target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
          <button className="burger" onClick={() => setMenu((m) => !m)} aria-label="Open menu" aria-expanded={menu}>
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {menu && (
        <div className="mobile-menu glass">
          {LINKS.map((l) => (
            <button key={l.id} className={active === l.id ? "on" : ""} onClick={() => go(l.id)}>{l.label}</button>
          ))}
          <a href="https://github.com/LaibaLatif/climateshield" target="_blank" rel="noreferrer">GitHub ↗</a>
        </div>
      )}
    </header>
  );
}
