# ClimateShield

**Know where to go when the weather turns.** ClimateShield is a weather-aware relief finder with an AI safety advisor. Built for **ForgeHacks 2026, AI + Climate track**.

**Live demo: https://climateshield-relief.vercel.app** (works on phone and desktop, no sign-up)

## The problem

Sudden rain, heatwaves and cold snaps hit commuters, riders, drivers, elderly people and outdoor workers hardest. Weather apps show numbers. Maps show everything. Nothing connects the two to a safe place you can actually reach right now, the way you actually travel.

## What it does

- **Live weather and risk level** from Open-Meteo: feels-like temperature, humidity, wind, UV, rain chance, air quality (US AQI), a 12-hour forecast, and a "rain in N minutes" alert.
- **Weather-adaptive interface.** The whole UI (colors, sky animation, map tint) changes with the weather: sunny, night, cloudy, rain, thunderstorm, snow, fog, heatwave, cold wave. A "Preview weather" menu lets you demo any of them.
- **Travel-mode aware** for walking, bicycle, motorbike, car and bus. Range can be set from 1 minute or 100 m. Walkers get cool or warm places; riders and drivers also get fuel, covered parking, repair and EV charging; bus users get covered stops.
- **Relief map from real OpenStreetMap data.** The place types change with the weather (heat: water, cool indoor spots, pharmacies; rain: covered stops, umbrella shops; cold: shelters, warm food).
- **"Need something now?"** shows the single nearest water point, pharmacy, hospital, fuel stop and so on, with distance and travel time for your mode, and draws the route in one tap.
- **Measure between two places** with real road distance and time, and open directions in one tap.
- **AI safety plan and chat.** Gemini turns live weather, your travel mode and the real nearby places into a timed plan (what to do and when), and answers questions such as "I feel dizzy from the heat" or "My fingers are numb, is it frostbite?" with first-aid steps.
- **Search any area**, including sectors and streets (for example "F-10 Islamabad"), or use your current location.

## How the AI is used

| Part | AI or normal logic |
|---|---|
| Safety plan and chat answers | **Gemini**: receives live weather, rain timing, air quality, travel mode and the real nearby places, and returns a structured plan or a short answer |
| Weather risk level, place filtering, distances, travel times, routes | Normal logic (rules, geometry, OpenStreetMap routing) |

Design choices so the AI is not "just a wrapper":

- **Grounded:** the model only sees live data and the real places list, and is told never to invent places.
- **Validated:** its place recommendations are checked against the real list, and unknown places are dropped.
- **Structured output:** the plan is requested as JSON against a schema, so the UI can render it reliably.
- **Safe by design:** it gives general guidance, never diagnoses, and tells users when to call emergency services.
- **Graceful fallback:** if the AI is unavailable or rate-limited, the app shows standard safety guidance and says so.

## Architecture

```
Browser (Next.js / React / Leaflet)
 |- Open-Meteo                      weather, forecast, air quality
 |- routing.openstreetmap.de        road geometry between selected points
 '- Next.js server routes (Vercel)
      |- /api/places                OpenStreetMap (Overpass) relief points, several mirrors, edge-cached
      |- /api/advice                builds the prompt, calls Gemini, validates the plan
      '- /api/chat                  grounded chat via Gemini
```

The Gemini key lives only on the server and is never sent to the browser.

## Tech stack

Next.js 16, React 19, TypeScript, Leaflet, Gemini API, Open-Meteo, OpenStreetMap (Overpass, Nominatim, OSRM), Vercel.

## Run locally

```bash
npm install
cp .env.local.example .env.local    # then paste your key after GEMINI_API_KEY=
npm run dev
```

Open http://localhost:3000. Get a free key at https://aistudio.google.com/apikey. Variables:

- `GEMINI_API_KEY` (required for AI features)
- `GEMINI_MODEL` (optional, defaults to `gemini-flash-lite-latest`)

Without a key the app still works and shows standard safety guidance instead of AI plans.

## Deploy

Import the repository on Vercel and add `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) under Settings, Environment Variables.

## Limits

- Place data comes from community-edited OpenStreetMap, so coverage and opening hours vary by area.
- Travel times are estimates and do not include live traffic.
- Public map servers can be slow at times, so results are cached and several mirrors are tried.
- ClimateShield gives general safety guidance, not medical advice.

## Roadmap

- Community-added places with reviews and moderation.
- Push alerts for rain and heat at saved places.
- Local languages for the advisor.
