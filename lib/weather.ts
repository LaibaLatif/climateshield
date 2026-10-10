import type { Condition, HourPoint, ReliefMode, Weather } from "./types";

export const CONDITION_META: Record<Condition, { label: string; emoji: string; relief: ReliefMode; tagline: string }> = {
  "clear-day": { label: "Clear & sunny", emoji: "☀️", relief: "comfort", tagline: "Pleasant conditions. Stay hydrated and plan ahead." },
  "clear-night": { label: "Clear night", emoji: "🌙", relief: "comfort", tagline: "Calm night. Watch visibility when travelling." },
  cloudy: { label: "Cloudy", emoji: "☁️", relief: "comfort", tagline: "Overcast skies. Keep an eye on the forecast." },
  rain: { label: "Rain", emoji: "🌧️", relief: "rain", tagline: "Wet roads and low visibility. Find cover and ride carefully." },
  storm: { label: "Thunderstorm", emoji: "⛈️", relief: "rain", tagline: "Dangerous conditions. Get indoors, avoid open ground." },
  snow: { label: "Snow", emoji: "🌨️", relief: "cold", tagline: "Freezing and slippery. Keep warm and avoid long trips." },
  fog: { label: "Fog", emoji: "🌫️", relief: "rain", tagline: "Very low visibility. Slow down and use lights." },
  heat: { label: "Extreme heat", emoji: "🔥", relief: "heat", tagline: "Heat stress risk. Find cool, shaded places and water." },
  cold: { label: "Cold wave", emoji: "🥶", relief: "cold", tagline: "Cold stress risk. Find warm places and layer up." },
};

export function describeCode(code: number): string {
  if (code === 0) return "Clear sky";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Foggy";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snowfall";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code === 85 || code === 86) return "Snow showers";
  if (code >= 95) return "Thunderstorm";
  return "Unsettled";
}

export function classify(code: number, feelsLike: number, isDay: boolean, precipitation: number): Condition {
  if (code >= 95) return "storm";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || precipitation >= 0.3) return "rain";
  if (code === 45 || code === 48) return "fog";
  if (feelsLike >= 35) return "heat";
  if (feelsLike <= 8) return "cold";
  if (code === 3 || code === 2) return "cloudy";
  return isDay ? "clear-day" : "clear-night";
}

export function aqiInfo(aqi: number | null): { label: string; level: number } {
  if (aqi === null) return { label: "n/a", level: 0 };
  if (aqi <= 50) return { label: "Good", level: 1 };
  if (aqi <= 100) return { label: "Moderate", level: 2 };
  if (aqi <= 150) return { label: "Unhealthy for sensitive", level: 3 };
  if (aqi <= 200) return { label: "Unhealthy", level: 4 };
  if (aqi <= 300) return { label: "Very unhealthy", level: 5 };
  return { label: "Hazardous", level: 6 };
}

export async function fetchWeather(lat: number, lon: number): Promise<Weather> {
  const wUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m` +
    `&hourly=temperature_2m,precipitation_probability,weather_code,uv_index&forecast_hours=12` +
    `&minutely_15=precipitation&forecast_minutely_15=8&timezone=auto`;
  const aUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`;

  const [wRes, aRes] = await Promise.all([
    fetch(wUrl),
    fetch(aUrl).catch(() => null),
  ]);
  if (!wRes.ok) throw new Error("Weather service unavailable");
  const w = await wRes.json();
  let aqi: number | null = null;
  try {
    if (aRes && aRes.ok) {
      const a = await aRes.json();
      aqi = typeof a.current?.us_aqi === "number" ? Math.round(a.current.us_aqi) : null;
    }
  } catch {
    aqi = null;
  }

  const c = w.current;
  const hourly: HourPoint[] = (w.hourly?.time ?? []).map((t: string, i: number) => ({
    time: t,
    temp: Math.round(w.hourly.temperature_2m[i]),
    pop: w.hourly.precipitation_probability?.[i] ?? 0,
    code: w.hourly.weather_code?.[i] ?? 0,
  }));

  let rainSoon: number | null = null;
  const m: number[] = w.minutely_15?.precipitation ?? [];
  const nowRaining = (c.precipitation ?? 0) >= 0.2;
  if (!nowRaining) {
    const idx = m.findIndex((v) => v >= 0.2);
    if (idx >= 0) rainSoon = (idx + 1) * 15;
  }

  const feels = Math.round(c.apparent_temperature);
  const condition = classify(c.weather_code, feels, c.is_day === 1, c.precipitation ?? 0);
  return {
    temp: Math.round(c.temperature_2m),
    feelsLike: feels,
    humidity: Math.round(c.relative_humidity_2m),
    precipitation: c.precipitation ?? 0,
    windKmh: Math.round(c.wind_speed_10m),
    uv: w.hourly?.uv_index?.[0] !== undefined ? Math.round(w.hourly.uv_index[0] * 10) / 10 : null,
    code: c.weather_code,
    isDay: c.is_day === 1,
    condition,
    label: describeCode(c.weather_code),
    aqi,
    aqiLabel: aqiInfo(aqi).label,
    hourly,
    rainSoonMinutes: rainSoon,
    simulated: false,
  };
}

/** Turn a real forecast into a "what if" scenario so the whole UI can be demonstrated on any day. */
export function simulate(base: Weather | null, condition: Condition): Weather {
  const hours = base?.hourly?.length ? base.hourly : Array.from({ length: 12 }, (_, i) => ({ time: "", temp: 25, pop: 0, code: 0 }));
  const presets: Record<Condition, Partial<Weather> & { temp: number; feelsLike: number; code: number }> = {
    "clear-day": { temp: 27, feelsLike: 28, code: 0, humidity: 40, precipitation: 0, windKmh: 10, uv: 7, aqi: 55 },
    "clear-night": { temp: 20, feelsLike: 19, code: 0, humidity: 55, precipitation: 0, windKmh: 6, uv: 0, aqi: 60 },
    cloudy: { temp: 22, feelsLike: 22, code: 3, humidity: 65, precipitation: 0, windKmh: 14, uv: 3, aqi: 70 },
    rain: { temp: 19, feelsLike: 17, code: 63, humidity: 90, precipitation: 3.2, windKmh: 22, uv: 1, aqi: 35 },
    storm: { temp: 21, feelsLike: 20, code: 95, humidity: 94, precipitation: 9.5, windKmh: 55, uv: 1, aqi: 30 },
    snow: { temp: -2, feelsLike: -7, code: 73, humidity: 85, precipitation: 1.4, windKmh: 20, uv: 1, aqi: 40 },
    fog: { temp: 9, feelsLike: 7, code: 45, humidity: 98, precipitation: 0, windKmh: 4, uv: 0, aqi: 165 },
    heat: { temp: 42, feelsLike: 47, code: 0, humidity: 38, precipitation: 0, windKmh: 12, uv: 11, aqi: 120 },
    cold: { temp: 3, feelsLike: -2, code: 0, humidity: 60, precipitation: 0, windKmh: 24, uv: 2, aqi: 90 },
  };
  const p = presets[condition];
  const night = condition === "clear-night";
  const wet = condition === "rain" || condition === "storm" || condition === "snow";
  const aqiVal = p.aqi ?? null;
  return {
    temp: p.temp,
    feelsLike: p.feelsLike,
    humidity: p.humidity ?? 50,
    precipitation: p.precipitation ?? 0,
    windKmh: p.windKmh ?? 10,
    uv: p.uv ?? 0,
    code: p.code,
    isDay: !night,
    condition,
    label: describeCode(p.code),
    aqi: aqiVal,
    aqiLabel: aqiInfo(aqiVal).label,
    hourly: hours.map((h, i) => ({
      time: h.time,
      temp: Math.round(p.temp + Math.sin(i / 3) * 2),
      pop: wet ? 80 - i * 3 : 5,
      code: p.code,
    })),
    rainSoonMinutes: null,
    simulated: true,
  };
}

export const SIM_OPTIONS: { id: Condition; label: string; emoji: string }[] = [
  { id: "heat", label: "Heatwave", emoji: "🔥" },
  { id: "cold", label: "Cold wave", emoji: "🥶" },
  { id: "rain", label: "Rain", emoji: "🌧️" },
  { id: "storm", label: "Storm", emoji: "⛈️" },
  { id: "snow", label: "Snow", emoji: "🌨️" },
  { id: "fog", label: "Fog", emoji: "🌫️" },
  { id: "clear-night", label: "Night", emoji: "🌙" },
  { id: "clear-day", label: "Sunny", emoji: "☀️" },
];

export function riskFromWeather(w: Weather): { level: "low" | "moderate" | "high" | "severe"; reason: string } {
  const aq = aqiInfo(w.aqi).level;
  if (w.condition === "storm") return { level: "severe", reason: "Thunderstorm with strong winds" };
  if (w.condition === "heat" && w.feelsLike >= 45) return { level: "severe", reason: `Feels like ${w.feelsLike}°C - dangerous heat` };
  if (w.condition === "cold" && w.feelsLike <= -5) return { level: "severe", reason: `Feels like ${w.feelsLike}°C - dangerous cold` };
  if (w.condition === "heat") return { level: "high", reason: `Feels like ${w.feelsLike}°C - heat stress risk` };
  if (w.condition === "cold" || w.condition === "snow") return { level: "high", reason: `Feels like ${w.feelsLike}°C - cold stress and icy roads` };
  if (aq >= 5) return { level: "severe", reason: `Air quality ${w.aqiLabel.toLowerCase()} (AQI ${w.aqi})` };
  if (w.condition === "fog") return { level: "high", reason: "Very low visibility for drivers and riders" };
  if (w.condition === "rain") return { level: "moderate", reason: "Rain - slippery roads and low visibility" };
  if (aq >= 4) return { level: "high", reason: `Unhealthy air quality (AQI ${w.aqi})` };
  if (aq >= 3 || w.windKmh >= 40 || (w.uv ?? 0) >= 8) return { level: "moderate", reason: "Conditions need some care" };
  return { level: "low", reason: "No significant weather risk right now" };
}
