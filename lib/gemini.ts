import type { Advice, AdviceRequest } from "./types";
import { CATEGORIES } from "./places";
import { TRAVEL } from "./geo";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export function modelName(): string {
  return process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
}

export function hasKey(): boolean {
  return !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 10;
}

export function describeContext(req: AdviceRequest): string {
  const { weather: w, locationName, travel, profile, places } = req;
  const active = Object.entries(profile)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(", ");
  const hourly = w.hourly
    .slice(0, 8)
    .map((h) => `${h.time.slice(11, 16)}: ${h.temp}C, rain ${h.pop}%`)
    .join("; ");
  const list = places.length
    ? places
        .map((p) => `- id=${p.id} | ${p.name} | ${CATEGORIES[p.cat]?.label ?? p.cat} | ${Math.round(p.distance)} m | ~${p.eta} min by ${TRAVEL[travel].label.toLowerCase()}`)
        .join("\n")
    : "(no relief points found within the selected range)";
  return [
    `Location: ${locationName}`,
    `Weather now: ${w.label}, ${w.temp}C (feels like ${w.feelsLike}C), humidity ${w.humidity}%, wind ${w.windKmh} km/h, UV ${w.uv ?? "n/a"}, rain now ${w.precipitation} mm.`,
    `Air quality (US AQI): ${w.aqi ?? "n/a"} (${w.aqiLabel}).`,
    w.rainSoonMinutes !== null ? `Rain is forecast to start in about ${w.rainSoonMinutes} minutes.` : "No rain expected in the next 2 hours.",
    `Next hours: ${hourly}`,
    w.simulated ? "NOTE: this weather is a simulated demo scenario, treat it as real for the advice." : "",
    `User travels by: ${TRAVEL[travel].label}.`,
    `User situation flags: ${active || "none"}.`,
    `Nearby real relief points (from OpenStreetMap), nearest first:\n${list}`,
  ]
    .filter(Boolean)
    .join("\n");
}

const ADVICE_SCHEMA = {
  type: "OBJECT",
  properties: {
    headline: { type: "STRING" },
    riskLevel: { type: "STRING", enum: ["low", "moderate", "high", "severe"] },
    summary: { type: "STRING" },
    actions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { title: { type: "STRING" }, detail: { type: "STRING" }, when: { type: "STRING" } },
        required: ["title", "detail", "when"],
      },
    },
    travelTips: { type: "ARRAY", items: { type: "STRING" } },
    topPlaces: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { placeId: { type: "STRING" }, name: { type: "STRING" }, reason: { type: "STRING" } },
        required: ["placeId", "name", "reason"],
      },
    },
    warningSigns: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["headline", "riskLevel", "summary", "actions", "travelTips", "topPlaces", "warningSigns"],
};

function callGemini(model: string, body: object): Promise<Response> {
  return fetch(`${BASE}/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY as string },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000), // never leave the user waiting longer than this
  });
}

async function generate(body: object): Promise<string> {
  // Fast "lite" models first; fall back to a second model if the first is busy or unavailable.
  const models = Array.from(new Set([modelName(), "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]));
  let res: Response | null = null;
  for (const m of models) {
    try {
      res = await callGemini(m, body);
    } catch {
      continue; // timeout or network error: try the next model
    }
    if (res.ok || ![404, 429, 500, 503].includes(res.status)) break;
  }
  if (!res) throw new Error("Gemini did not respond in time");
  if (!res.ok) {
    const text = await res.text();
    let msg = text.slice(0, 300);
    try {
      msg = JSON.parse(text).error?.message ?? msg;
    } catch {
      /* keep raw */
    }
    throw new Error(`Gemini ${res.status}: ${msg}`);
  }
  const json = await res.json();
  const out = json.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  if (!out) throw new Error("Gemini returned an empty response");
  return out;
}

const SYSTEM = `You are ClimateShield, a calm, practical climate-preparedness assistant for everyday people.
Rules:
- Base advice ONLY on the weather data and the relief points provided. Never invent places: topPlaces must use placeId values from the list (copy the id and name exactly). If the list is empty, return an empty topPlaces array and say so in the summary.
- Tailor advice to the user's travel mode (walking, bicycle, motorbike, car, bus) and situation flags (elderly, children, breathing issues, outdoor worker, pregnant, no shelter).
- Be specific about timing ("before 2pm", "within 15 minutes") and concrete actions. Keep each detail under 28 words.
- Give 3-5 actions, 2-4 travel tips, 2-4 warning signs, and up to 3 top places with a one-sentence reason that mentions distance or time.
- You are not a doctor. Do not diagnose. For severe symptoms, tell the user to contact local emergency services.
- Plain, friendly language. No markdown.`;

export async function getAdvice(req: AdviceRequest): Promise<Advice> {
  const text = await generate({
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [{ role: "user", parts: [{ text: `Create a safety and preparedness plan.\n\n${describeContext(req)}` }] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: ADVICE_SCHEMA, temperature: 0.4, maxOutputTokens: 2048 },
  });
  const parsed = JSON.parse(text);
  const valid = new Set(req.places.map((p) => p.id));
  parsed.topPlaces = (parsed.topPlaces ?? []).filter((p: { placeId: string }) => valid.has(p.placeId)).slice(0, 3);
  return { ...parsed, source: "gemini" } as Advice;
}

export async function chat(
  req: AdviceRequest,
  history: { role: "user" | "assistant"; text: string }[]
): Promise<string> {
  const contents = [
    { role: "user", parts: [{ text: `Context for this conversation:\n${describeContext(req)}` }] },
    { role: "model", parts: [{ text: "Understood. I will answer using only this live context." }] },
    ...history.slice(-8).map((m) => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.text }] })),
  ];
  return generate({
    systemInstruction: {
      parts: [
        {
          text: `${SYSTEM}\nYou are now in chat mode: answer the user's question in at most 5 short sentences. If the user describes symptoms or a weather-related injury (heat illness, fever, hypothermia, frostbite, sunburn, shivering, dizziness), give the immediate first-aid steps in order (for example move to shade or warmth, cool or rewarm gently, fluids, never rub frostbitten skin), then say clearly when to call local emergency services, and point to the nearest suitable place from the list. Do not diagnose. Refer to places by name and distance from the provided list only. If asked something outside weather, travel safety or the listed places, politely steer back.`,
        },
      ],
    },
    contents,
    generationConfig: { temperature: 0.5, maxOutputTokens: 600 },
  });
}
