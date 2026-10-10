import { NextResponse } from "next/server";
import { getAdvice, hasKey } from "@/lib/gemini";
import { fallbackAdvice } from "@/lib/fallbackAdvice";
import type { AdviceRequest } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  let body: AdviceRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body?.weather || !body?.travel) return NextResponse.json({ error: "Missing data" }, { status: 400 });
  body.places = (body.places ?? []).slice(0, 14);

  if (!hasKey()) {
    return NextResponse.json(
      fallbackAdvice(body, "GEMINI_API_KEY is not set, so this plan uses built-in safety rules. Add your key to .env.local to enable Gemini.")
    );
  }
  try {
    return NextResponse.json(await getAdvice(body));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[advice]", msg);
    return NextResponse.json(fallbackAdvice(body, `Gemini request failed (${msg}). Showing rule-based advice instead.`));
  }
}
