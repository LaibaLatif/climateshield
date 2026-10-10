import type { Advice, AdviceAction, AdviceRequest } from "./types";
import { CATEGORIES } from "./places";
import { CONDITION_META, riskFromWeather } from "./weather";
import { TRAVEL } from "./geo";

/** Rule-based safety plan. Used only when the Gemini API is not configured or fails. */
export function fallbackAdvice(req: AdviceRequest, note?: string): Advice {
  const { weather: w, travel, profile, places } = req;
  const meta = CONDITION_META[w.condition];
  const risk = riskFromWeather(w);
  const actions: AdviceAction[] = [];
  const tips: string[] = [];
  const warn: string[] = [];

  if (w.condition === "heat") {
    actions.push({ title: "Avoid direct sun between 12pm and 4pm", detail: "Stay in shade or air-conditioned places during the hottest hours.", when: "Now until late afternoon" });
    actions.push({ title: "Drink water regularly", detail: "Sip water every 15-20 minutes even if you do not feel thirsty.", when: "Continuously" });
    warn.push("Dizziness, headache or nausea", "Very hot dry skin or confusion", "Rapid pulse - seek medical help immediately");
  } else if (w.condition === "cold" || w.condition === "snow") {
    actions.push({ title: "Layer up and cover extremities", detail: "Wear a wind-proof outer layer, gloves and a hat.", when: "Before going out" });
    actions.push({ title: "Take warm breaks", detail: "Use warm indoor places for short rests during longer trips.", when: "Every 30-40 minutes outdoors" });
    warn.push("Numb fingers or toes", "Uncontrollable shivering or slurred speech");
  } else if (w.condition === "rain" || w.condition === "storm") {
    actions.push({ title: "Move to cover before it gets heavier", detail: "Use a covered stop, shop or shelter nearby rather than waiting in the open.", when: "Now" });
    actions.push({ title: "Avoid flooded roads and open ground", detail: "Never cross flowing water; stay away from trees and poles during thunder.", when: "While the storm lasts" });
    warn.push("Rising water on the road", "Lightning close by (thunder within 10 seconds)");
  } else if (w.condition === "fog") {
    actions.push({ title: "Reduce speed and use low-beam lights", detail: "Keep a longer following distance and avoid overtaking.", when: "While visibility is low" });
    warn.push("Visibility below 50 metres");
  } else {
    actions.push({ title: "Conditions are comfortable", detail: "Keep water with you and re-check the forecast before long trips.", when: "Today" });
  }

  if (w.rainSoonMinutes !== null) {
    actions.unshift({ title: `Rain expected in about ${w.rainSoonMinutes} minutes`, detail: "Plan your stop now and carry rain protection.", when: `Within ${w.rainSoonMinutes} min` });
  }
  if ((w.aqi ?? 0) > 150) {
    actions.push({ title: "Air quality is unhealthy", detail: "Wear an N95 mask outdoors and keep windows closed.", when: "While AQI is high" });
  }
  if (profile.elderly) tips.push("Older adults feel extreme weather faster - keep trips short and stay in company.");
  if (profile.children) tips.push("Keep children close, hydrated and dressed for the conditions.");
  if (profile.breathing) tips.push("Carry your inhaler or medication and avoid heavy exertion outdoors.");
  if (profile.pregnant) tips.push("Avoid long exposure and rest often; seek care early if you feel unwell.");
  if (profile.outdoorWorker) tips.push("Schedule heavy work for safer hours and take regular shaded breaks.");
  if (profile.noShelter) tips.push("Ask a local shelter or community centre for urgent support if conditions worsen.");

  if (travel === "motorbike" || travel === "bike") tips.push("Two-wheelers are most exposed: wear a helmet, reflective layers and avoid wet road markings.");
  if (travel === "car") tips.push("Keep water, a phone charger and a torch in the car; avoid underpasses if it floods.");
  if (travel === "bus") tips.push("Bus waits add exposure time - use covered stops and check arrival times.");
  if (travel === "walk") tips.push("Pick routes with shade or cover and rest at the points listed below.");

  return {
    headline: `${meta.label}: ${risk.reason}`,
    riskLevel: risk.level,
    summary: `${meta.tagline} It is ${w.temp}°C and feels like ${w.feelsLike}°C. You are travelling by ${TRAVEL[travel].label.toLowerCase()}.`,
    actions: actions.slice(0, 5),
    travelTips: tips.slice(0, 4),
    topPlaces: places.slice(0, 3).map((p) => ({
      placeId: p.id,
      name: p.name,
      reason: `${CATEGORIES[p.cat]?.label ?? "Relief point"}, about ${p.eta} min away.`,
    })),
    warningSigns: warn,
    source: "rules",
    note,
  };
}
