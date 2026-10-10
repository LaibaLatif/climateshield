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
      fallbackAdvice(body, "The AI advisor is unavailable right now, so this plan uses standard safety guidance.")
    );
  }
  try {
    return NextResponse.json(await getAdvice(body));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[advice]", msg);
    return NextResponse.json(fallbackAdvice(body, "The AI advisor is busy right now, so this plan uses standard safety guidance. Try again in a minute."));
  }
}
