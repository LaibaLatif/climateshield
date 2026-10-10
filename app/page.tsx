"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdviceRequest, Condition, Place, Profile, ReliefMode, TravelMode, Weather } from "@/lib/types";
import { CONDITION_META, fetchWeather, simulate } from "@/lib/weather";
import { categoriesFor, fetchPlaces, reverseName, searchCity } from "@/lib/places";
import { etaMinutes, metersForMinutes } from "@/lib/geo";
import WeatherBackdrop from "@/components/WeatherBackdrop";
import WeatherHero from "@/components/WeatherHero";
import Controls, { type Unit } from "@/components/Controls";
import PlacesList from "@/components/PlacesList";
import AdvisorPanel from "@/components/AdvisorPanel";
import Navbar from "@/components/Navbar";
import { About, BackToTop, Footer, HowItWorks, Intro, SectionHeader } from "@/components/Sections";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="map-shell">
      <div className="map map-loading"><span className="spinner" /> Loading map…</div>
    </div>
  ),
});

const NO_PROFILE: Profile = { elderly: false, children: false, breathing: false, outdoorWorker: false, pregnant: false, noShelter: false };

interface Need {
  id: string;
  label: string;
  emoji: string;
  cats: string[];
}

const NEEDS_BY_RELIEF: Record<ReliefMode, Need[]> = {
  heat: [
    { id: "water", label: "Drinking water", emoji: "💧", cats: ["water"] },
    { id: "cool", label: "Cool indoor spot", emoji: "❄️", cats: ["mall", "cafe", "library", "icecream"] },
    { id: "pharmacy", label: "Pharmacy", emoji: "💊", cats: ["pharmacy"] },
    { id: "hospital", label: "Hospital / clinic", emoji: "🏥", cats: ["hospital"] },
  ],
  cold: [
    { id: "warm", label: "Warm shelter", emoji: "🔥", cats: ["shelter", "community", "library", "mall"] },
    { id: "food", label: "Hot food / drink", emoji: "🍲", cats: ["restaurant", "cafe"] },
    { id: "hospital", label: "Hospital / clinic", emoji: "🏥", cats: ["hospital"] },
  ],
  rain: [
    { id: "cover", label: "Cover from rain", emoji: "☂️", cats: ["busstop", "shelter", "mall"] },
    { id: "gear", label: "Umbrella / raincoat shop", emoji: "🌂", cats: ["rainshop"] },
    { id: "drink", label: "Café to wait it out", emoji: "☕", cats: ["cafe"] },
    { id: "pharmacy", label: "Pharmacy", emoji: "💊", cats: ["pharmacy"] },
  ],
  comfort: [
    { id: "water", label: "Drinking water", emoji: "💧", cats: ["water"] },
    { id: "pharmacy", label: "Pharmacy", emoji: "💊", cats: ["pharmacy"] },
    { id: "hospital", label: "Hospital / clinic", emoji: "🏥", cats: ["hospital"] },
    { id: "cafe", label: "Café", emoji: "☕", cats: ["cafe"] },
  ],
};

const NEEDS_BY_TRAVEL: Record<TravelMode, Need[]> = {
  walk: [],
  bike: [{ id: "repair", label: "Bike repair", emoji: "🔧", cats: ["repair"] }],
  motorbike: [
    { id: "fuel", label: "Fuel station", emoji: "⛽", cats: ["fuel"] },
    { id: "parking", label: "Covered parking", emoji: "🅿️", cats: ["parking"] },
    { id: "repair", label: "Repair / tyres", emoji: "🔧", cats: ["repair"] },
  ],
  car: [
    { id: "fuel", label: "Fuel station", emoji: "⛽", cats: ["fuel"] },
    { id: "parking", label: "Covered parking", emoji: "🅿️", cats: ["parking"] },
    { id: "charging", label: "EV charging", emoji: "🔌", cats: ["charging"] },
  ],
  bus: [{ id: "busstop", label: "Covered bus stop", emoji: "🚏", cats: ["busstop"] }],
};

const DEFAULT_LOC ={ lat: 31.5204, lon: 74.3587, name: "Lahore, Punjab, Pakistan" };

const ACCENT: Record<Condition, string> = {
  "clear-day": "#ffb703",
  "clear-night": "#8ab4ff",
  cloudy: "#7cc4ff",
  rain: "#38bdf8",
  storm: "#a78bfa",
  snow: "#38bdf8",
  fog: "#9ca3af",
  heat: "#ff4d00",
  cold: "#22d3ee",
};

export default function Home() {
  const [loc, setLoc] = useState(DEFAULT_LOC);
  const [locNote, setLocNote] = useState<string | null>(null);
  const [baseWeather, setBaseWeather] = useState<Weather | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [sim, setSim] = useState<Condition | null>(null);

  const [travel, setTravel] = useState<TravelMode>("walk");
  const [unit, setUnit] = useState<Unit>("time");
  const [minutes, setMinutes] = useState(15);
  const [meters, setMeters] = useState(1500);
  const profile: Profile = NO_PROFILE;

  const [allPlaces, setAllPlaces] = useState<Place[]>([]);
  const [placesLoading, setPlacesLoading] = useState(true);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const [activeCats, setActiveCats] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [focusTick, setFocusTick] = useState(0);

  const [searching, setSearching] = useState(false);
  const [searchMsg, setSearchMsg] = useState<string | null>(null);
  const [results, setResults] = useState<{ name: string; lat: number; lon: number }[]>([]);

  const weather: Weather | null = useMemo(() => (sim ? simulate(baseWeather, sim) : baseWeather), [sim, baseWeather]);
  const condition: Condition = weather?.condition ?? "clear-day";
  const relief = CONDITION_META[condition].relief;

  // global theme
  useEffect(() => {
    document.documentElement.dataset.theme = condition;
  }, [condition]);

  // locate on first load
  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setLocNote("Your browser does not support location. Showing Lahore - search for your city.");
      return;
    }
    setLocNote("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setLoc({ lat, lon, name: "Your location" });
        setLocNote(null);
        setSelected([]);
        const name = await reverseName(lat, lon);
        setLoc({ lat, lon, name });
      },
      () => setLocNote("Location permission was not granted. Showing Lahore - search for your city or allow location access."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    locate();
  }, [locate]);

  // live weather
  useEffect(() => {
    let cancelled = false;
    setWeatherLoading(true);
    fetchWeather(loc.lat, loc.lon)
      .then((w) => !cancelled && setBaseWeather(w))
      .catch(() => !cancelled && setBaseWeather(null))
      .finally(() => !cancelled && setWeatherLoading(false));
    return () => {
      cancelled = true;
    };
  }, [loc.lat, loc.lon]);

  const maxM = unit === "time" ? metersForMinutes(minutes, travel) : meters;
  const fetchRadius = Math.min(8000, Math.max(500, Math.ceil(maxM / 500) * 500));
  const catIds = useMemo(() => categoriesFor(relief, travel), [relief, travel]);
  const catKey = catIds.join(",");

  // reset category filter when the relevant set changes
  useEffect(() => {
    setActiveCats(catKey.split(","));
    setSelected([]);
  }, [catKey]);

  // relief points
  useEffect(() => {
    const ctrl = new AbortController();
    setPlacesLoading(true);
    setPlacesError(null);
    const t = setTimeout(() => {
      fetchPlaces(loc.lat, loc.lon, fetchRadius, catKey.split(","), ctrl.signal)
        .then((p) => {
          setAllPlaces(p);
          setPlacesLoading(false);
        })
        .catch((e) => {
          if ((e as Error)?.name === "AbortError") return;
          setAllPlaces([]);
          setPlacesError("Nearby places are taking longer than usual to load.");
          setPlacesLoading(false);
        });
    }, 450);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [loc.lat, loc.lon, fetchRadius, catKey, retryTick]);

  const inRange = useMemo(() => allPlaces.filter((p) => p.distance <= maxM), [allPlaces, maxM]);
  const filtered = useMemo(() => inRange.filter((p) => activeCats.includes(p.cat)), [inRange, activeCats]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    inRange.forEach((p) => (c[p.cat] = (c[p.cat] ?? 0) + 1));
    return c;
  }, [inRange]);

  // nearest place for each thing the user might urgently need
  const quick = useMemo(() => {
    const seen = new Set<string>();
    return [...NEEDS_BY_RELIEF[relief], ...NEEDS_BY_TRAVEL[travel]]
      .filter((n) => (seen.has(n.id) ? false : (seen.add(n.id), true)))
      .map((n) => ({ id: n.id, label: n.label, emoji: n.emoji, place: inRange.find((p) => n.cats.includes(p.cat)) ?? null }));
  }, [relief, travel, inRange]);

  // keep the selection valid
  useEffect(() => {
    setSelected((s) => s.filter((id) => filtered.some((p) => p.id === id)));
  }, [filtered]);

  const onSelect = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 2 ? [s[1], id] : [...s, id]));
  const onFocus = (id: string) => {
    setFocusId(id);
    setFocusTick((n) => n + 1);
    document.getElementById("map-anchor")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const doSearch = async (q: string) => {
    setSearching(true);
    setSearchMsg(null);
    try {
      const r = await searchCity(q);
      setResults(r);
      if (r.length === 0) setSearchMsg(`No place found for "${q}". Try the area and city, e.g. "F-10 Islamabad".`);
    } catch (e) {
      setResults([]);
      setSearchMsg(e instanceof Error ? e.message : "Search failed, please try again.");
    } finally {
      setSearching(false);
    }
  };
  const pickCity = (r: { name: string; lat: number; lon: number }) => {
    setLoc({ lat: r.lat, lon: r.lon, name: r.name });
    setResults([]);
    setSearchMsg(null);
    setSelected([]);
    setLocNote(null);
  };

  const request: AdviceRequest | null = useMemo(() => {
    if (!weather) return null;
    return {
      weather,
      locationName: loc.name,
      travel,
      profile,
      places: filtered.slice(0, 12).map((p) => ({ id: p.id, name: p.name, cat: p.cat, distance: p.distance, eta: etaMinutes(p.distance, travel) })),
    };
  }, [weather, loc.name, travel, profile, filtered]);

  const stamp = `${condition}|${travel}|${JSON.stringify(profile)}|${loc.name}`;

  return (
    <>
      <WeatherBackdrop condition={condition} />
      <div className="page">
        <Navbar weather={weather} condition={condition} sim={sim} onSim={setSim} />

        <section id="overview" className="section overview">
          <Intro onLocate={locate} />
          {locNote && <div className="notice banner">{locNote}</div>}
          <WeatherHero weather={weather} locationName={loc.name} loading={weatherLoading} />
        </section>

        <section id="explore" className="section">
        <SectionHeader eyebrow="Explore" title="Relief points near you" text="Pick how you travel and how far you will go. The map shows only what helps in today's weather." />
        <div className="layout">
          <Controls
            travel={travel}
            onTravel={setTravel}
            unit={unit}
            onUnit={setUnit}
            minutes={minutes}
            onMinutes={setMinutes}
            meters={meters}
            onMeters={setMeters}
            relief={relief}
            catIds={catIds}
            activeCats={activeCats}
            onToggleCat={(id) => setActiveCats((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]))}
            counts={counts}
            quick={quick}
            loadingPlaces={placesLoading}
            onQuick={(id) => {
              setActiveCats((a) => {
                const cat = allPlaces.find((p) => p.id === id)?.cat;
                return cat && !a.includes(cat) ? [...a, cat] : a;
              });
              setSelected([id]);
              onFocus(id);
            }}
            onSearch={doSearch}
            onLocate={locate}
            searchResults={results}
            searchMsg={searchMsg}
            onPick={pickCity}
            searching={searching}
          />
          <div className="right">
            <div id="map-anchor">
              <MapView
                center={{ lat: loc.lat, lon: loc.lon }}
                places={filtered}
                radiusM={maxM}
                travel={travel}
                selectedIds={selected}
                focusId={focusId}
                focusTick={focusTick}
                onSelect={onSelect}
                onClear={() => setSelected([])}
                accent={ACCENT[condition]}
              />
            </div>
            <PlacesList
              places={filtered}
              travel={travel}
              origin={{ lat: loc.lat, lon: loc.lon }}
              selectedIds={selected}
              loading={placesLoading}
              error={placesError}
              onSelect={onSelect}
              onFocus={onFocus}
              onRetry={() => setRetryTick((n) => n + 1)}
            />
          </div>
        </div>
        </section>

        <div className="section">
          <AdvisorPanel request={request} stamp={stamp} onFocusPlace={onFocus} />
        </div>

        <HowItWorks />
        <About />
        <Footer />
        <BackToTop />
      </div>
    </>
  );
}
