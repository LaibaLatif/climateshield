import { NextResponse } from "next/server";
import { chat, hasKey } from "@/lib/gemini";
import type { AdviceRequest } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  let body: { context: AdviceRequest; history: { role: "user" | "assistant"; text: string }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body?.context?.weather || !Array.isArray(body.history)) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }
  if (!hasKey()) {
    return NextResponse.json({ reply: "The chat needs a Gemini API key. Add GEMINI_API_KEY to .env.local and restart the server." });
  }
  body.context.places = (body.context.places ?? []).slice(0, 14);
  try {
    return NextResponse.json({ reply: await chat(body.context, body.history) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[chat]", msg);
    return NextResponse.json({ reply: `Sorry, I could not reach Gemini right now (${msg.slice(0, 120)}).` });
  }
}
