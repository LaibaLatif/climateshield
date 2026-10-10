import type { Metadata, Viewport } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import "./shell.css";

export const metadata: Metadata = {
  title: "ClimateShield · Weather-aware relief finder & AI preparedness advisor",
  description:
    "Find the nearest cooling, warming and rain-shelter points for how you travel (walk, bike, motorbike, car, bus) and get a personal AI safety plan from live weather.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0b1530" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="clear-day">
      <body>{children}</body>
    </html>
  );
}
