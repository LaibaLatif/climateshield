"use client";
import { useEffect, useState } from "react";

export function SectionHeader({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="sec-head">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  );
}

const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

export function Intro({ onLocate }: { onLocate: () => void }) {
  return (
    <section className="intro" aria-labelledby="intro-title">
      <span className="eyebrow">AI + Climate · ForgeHacks 2026</span>
      <h1 id="intro-title">Know where to go <span className="grad">when the weather turns.</span></h1>
      <p className="intro-sub">
        ClimateShield reads live weather for where you are, finds the nearest places that actually help for how you travel — on foot, bike, motorbike, car or bus — and turns it all into a personal AI safety plan.
      </p>
      <div className="intro-cta">
        <button className="primary" onClick={() => { onLocate(); go("explore"); }}>🎯 Find relief near me</button>
        <button className="ghost-btn" onClick={() => go("advisor")}>✨ Get my safety plan</button>
      </div>
      <ul className="intro-modes" aria-label="Supported travel modes">
        <li>🚶 Walking</li><li>🚲 Bicycle</li><li>🏍️ Motorbike</li><li>🚗 Car</li><li>🚌 Bus</li>
      </ul>
    </section>
  );
}

const STEPS = [
  { n: "1", icon: "🌦️", title: "Sense", text: "Live temperature, feels-like, rain timing and air quality for your exact location, turned into a clear risk level." },
  { n: "2", icon: "📍", title: "Find", text: "Real places from OpenStreetMap — water, shelter, pharmacies, fuel, covered parking — filtered by the weather and how you travel." },
  { n: "3", icon: "🧠", title: "Advise", text: "Gemini AI builds a timed safety plan and answers questions about heat, cold, rain and injuries, using only places that really exist nearby." },
  { n: "4", icon: "🧭", title: "Go", text: "See distance and time by your travel mode, measure between two points, and open directions in one tap." },
];

export function HowItWorks() {
  return (
    <section id="how" className="section">
      <SectionHeader eyebrow="How it works" title="From weather alert to a safe next step" text="Four steps, one page. No sign-up, no install." />
      <div className="steps">
        {STEPS.map((s) => (
          <article key={s.n} className="step glass">
            <div className="step-top"><span className="step-n">{s.n}</span><span className="step-ic">{s.icon}</span></div>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

const STACK = ["Next.js 16", "React 19", "TypeScript", "Leaflet", "Gemini API", "Open-Meteo", "OpenStreetMap / Overpass", "Vercel"];

export function About() {
  return (
    <section id="about" className="section">
      <SectionHeader eyebrow="About" title="Built for people who are out in the weather" />
      <div className="about-grid">
        <article className="glass about-card">
          <h3>The problem</h3>
          <p>
            Sudden rain, heatwaves and cold snaps hit commuters, riders, drivers and outdoor workers hardest. Weather apps show numbers, maps show everything — nothing connects the two to a safe place you can reach right now.
          </p>
          <h3>Who it helps</h3>
          <p>Pedestrians, cyclists, motorbike riders, drivers, bus commuters, elderly people, parents and anyone caught outside without cover.</p>
        </article>
        <article className="glass about-card">
          <h3>Technology</h3>
          <div className="chips">{STACK.map((t) => <span key={t} className="chip static">{t}</span>)}</div>
          <h3>Data sources</h3>
          <p>Weather and air quality from Open-Meteo. Places and routes from OpenStreetMap contributors. Advice from Google Gemini, grounded in the live data on screen.</p>
          <h3>Limits &amp; roadmap</h3>
          <p>Map coverage depends on OpenStreetMap, and travel times are estimates, not live traffic. Next: community-added points with reviews, push alerts for rain and heat, and local languages.</p>
        </article>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="footer glass">
      <div className="footer-grid">
        <div>
          <div className="footer-brand"><span className="logo sm">🛡️</span> ClimateShield</div>
          <p className="muted">Weather-aware relief finder and AI preparedness advisor. Built for ForgeHacks 2026, AI + Climate track.</p>
        </div>
        <div>
          <h4>Explore</h4>
          <ul>
            <li><button onClick={() => go("overview")}>Overview</button></li>
            <li><button onClick={() => go("explore")}>Explore map</button></li>
            <li><button onClick={() => go("advisor")}>AI advisor</button></li>
            <li><button onClick={() => go("how")}>How it works</button></li>
          </ul>
        </div>
        <div>
          <h4>Project</h4>
          <ul>
            <li><a href="https://github.com/LaibaLatif/climateshield" target="_blank" rel="noreferrer">Source code ↗</a></li>
            <li><a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo ↗</a></li>
            <li><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors ↗</a></li>
          </ul>
        </div>
      </div>
      <p className="disclaimer-bar">ClimateShield gives general safety guidance, not medical advice. In an emergency, contact your local emergency services.</p>
    </footer>
  );
}

export function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!show) return null;
  return (
    <button className="to-top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top">↑</button>
  );
}
