# 🛡️ ClimateShield

**A weather-aware relief finder with an AI preparedness advisor.** Built for ForgeHacks 2026 · Track: **AI + Climate**.

When the weather turns, people on foot, bicycles, motorbikes, cars and buses all need different help. ClimateShield reads live weather for your location, finds the nearest *relevant* relief points on a real map, and uses Gemini to turn all of that into a personal safety plan.

## Features

- **Live weather and risk level** from Open-Meteo, including feels-like, UV, wind, rain chance, US AQI and a "rain starts in N minutes" alert.
- **Dynamic weather themes.** The whole UI (colors, sky, particles, map tint) changes with the condition: sunny, night, cloudy, rain, thunderstorm with lightning, snow, fog, heatwave and cold wave. A *Preview weather* bar lets you demo any of them.
- **Travel-mode aware**: walking, bicycle, motorbike, car, bus. Range is set in minutes or metres, and ETAs use mode-specific speeds. Drivers and riders also get fuel, covered parking, repair, EV charging and rest areas. Bus users get covered bus stops.
- **Relief map**: real OpenStreetMap data via Overpass.
  - Heat: drinking water, cafés, malls, pharmacies, libraries.
  - Cold: shelters, warm food, community centres.
  - Rain: covered stops, umbrella and raincoat shops, covered parking.
  - Hover for details. Select 1 or 2 points to get a road route, distance and ETA for your travel mode.
- **AI Preparedness Advisor** (Gemini): a structured plan with a risk level, timed actions, best stops (chosen only from real nearby places), journey tips and warning signs. It is tailored to your situation: elderly, children, asthma, outdoor worker, pregnant, no shelter.
- **Ask the advisor**: chat grounded in the live weather and real nearby places.
- Works without a key: if Gemini is not configured or fails, the app falls back to rule-based advice and says so.

## Architecture

```
Browser (Next.js / React / Leaflet)
 ├─ Open-Meteo        → weather, forecast, air quality, geocoding
 ├─ Overpass (OSM)    → real nearby relief points
 ├─ routing.openstreetmap.de → road geometry for selected points
 └─ /api/advice, /api/chat  (server routes, hold the Gemini key)
        └─ Gemini API  → structured JSON plan / grounded chat
```

The Gemini key stays on the server and is never sent to the browser.

## Run locally

```bash
npm install
cp .env.local.example .env.local   # then paste your key after GEMINI_API_KEY=
npm run dev
```

Open http://localhost:3000. Get a free key at https://aistudio.google.com/apikey.

## Deploy

Import the repo on Vercel and add `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) under *Settings → Environment Variables*.

## Roadmap

- **Community points:** let anyone register a new relief point (for example a free water cooler or a shop that sells raincoats) and let others confirm, report or review it, with moderation. This needs a database and sign-in, so it is planned after the hackathon.
- Live alerts by push notification when rain or a heat spike is about to hit your saved places.
- Urdu and other local languages for the advisor.

## Notes and limits

- Map data comes from free public OpenStreetMap servers, so results depend on local OSM coverage and the servers can be busy at times.
- Walking and driving times are estimates, not live traffic.
- ClimateShield gives general safety guidance, not medical advice.
