export type Condition =
  | "clear-day"
  | "clear-night"
  | "cloudy"
  | "rain"
  | "storm"
  | "snow"
  | "fog"
  | "heat"
  | "cold";

/** What kind of relief the user needs right now. */
export type ReliefMode = "heat" | "cold" | "rain" | "comfort";

export type TravelMode = "walk" | "bike" | "motorbike" | "car" | "bus";

export interface HourPoint {
  time: string;
  temp: number;
  pop: number; // precipitation probability %
  code: number;
}

export interface Weather {
  temp: number;
  feelsLike: number;
  humidity: number;
  precipitation: number; // mm
  windKmh: number;
  uv: number | null;
  code: number;
  isDay: boolean;
  condition: Condition;
  label: string;
  aqi: number | null;
  aqiLabel: string;
  hourly: HourPoint[];
  rainSoonMinutes: number | null;
  simulated: boolean;
}

export interface Place {
  id: string;
  name: string;
  lat: number;
  lon: number;
  cat: string;
  hours?: string;
  phone?: string;
  distance: number; // metres, straight line from user
}

export interface Profile {
  elderly: boolean;
  children: boolean;
  breathing: boolean;
  outdoorWorker: boolean;
  pregnant: boolean;
  noShelter: boolean;
}

export interface AdviceAction {
  title: string;
  detail: string;
  when: string;
}

export interface AdvicePlace {
  placeId: string;
  name: string;
  reason: string;
}

export interface Advice {
  headline: string;
  riskLevel: "low" | "moderate" | "high" | "severe";
  summary: string;
  actions: AdviceAction[];
  travelTips: string[];
  topPlaces: AdvicePlace[];
  warningSigns: string[];
  source: "gemini" | "rules";
  note?: string;
}

export interface AdviceRequest {
  weather: Weather;
  locationName: string;
  travel: TravelMode;
  profile: Profile;
  places: { id: string; name: string; cat: string; distance: number; eta: number }[];
}
