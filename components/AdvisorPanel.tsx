"use client";
import { useEffect, useRef, useState } from "react";
import type { Advice, AdviceRequest, Condition } from "@/lib/types";

interface Props {
  request: AdviceRequest | null;
  stamp: string;
  onFocusPlace: (id: string) => void;
}

interface Msg {
  role: "user" | "assistant";
  text: string;
}

const GENERAL = [
  "What is the most suitable place for me right now?",
  "Is it safe to travel in the next hour?",
  "What should I carry with me?",
  "Where is the nearest hospital or pharmacy?",
  "Which place is the safest to wait for a few hours?",
  "Where can I get water or food nearby?",
  "How long will this weather last today?",
  "Should I postpone my trip or leave now?",
  "What is the safest way to travel in this weather?",
  "Is it safe for me to stay outside for long?",
  "Which nearby place is closest by my travel mode?",
];

const BY_CONDITION: Record<Condition, string[]> = {
  heat: [
    "I feel dizzy from the heat. What should I do?",
    "I suddenly have a fever and it is very hot",
    "What are the signs of heatstroke and what do I do?",
    "I have a sunburn or heat rash. How do I treat it?",
    "I have a headache and nausea in this heat",
    "I have muscle cramps from the heat. What do I do?",
    "How do I cool someone who has collapsed from heat?",
    "Is it safe to ride a motorbike in this heat?",
    "How much water and salt should I take in extreme heat?",
    "My child looks tired and flushed in the heat",
    "How do I keep an elderly person safe in this heat?",
    "Where can I cool down quickly nearby?",
  ],
  cold: [
    "It is so cold I cannot stop shivering",
    "My fingers and toes are numb. Is it frostbite?",
    "How do I treat frostbite until I reach help?",
    "What are the signs of hypothermia?",
    "I have a fever and chills in this cold",
    "My skin looks white or waxy and feels hard",
    "I feel sleepy and confused in the cold",
    "How do I warm up safely after being very cold?",
    "How should I dress for this cold?",
    "Is it safe for my child to go outside in this cold?",
    "Where can I get warm nearby right now?",
    "Is it safe to ride a bike or motorbike in this cold?",
  ],
  snow: [
    "My fingers and toes are numb. Is it frostbite?",
    "How do I treat frostbite until I reach help?",
    "Is it safe to ride or drive on icy roads?",
    "I am soaked and freezing. What should I do?",
    "I slipped on ice and hurt myself. What now?",
    "I feel very cold and cannot stop shivering",
    "My car is stuck in snow. What should I do?",
    "How do I walk safely on snow and ice?",
    "Where can I get warm and dry nearby?",
  ],
  rain: [
    "Where can I take cover right now?",
    "Is it safe to ride a bike or motorbike in this rain?",
    "I am soaked and cold. What should I do?",
    "How do I stay safe on slippery roads?",
    "Where can I buy an umbrella or raincoat nearby?",
    "I got soaked and now I have a fever",
    "How long should I wait for the rain to stop?",
    "Is it safe to walk through flooded streets?",
    "How do I protect my phone and bag in the rain?",
    "Is it safe for my child to be out in the rain?",
  ],
  storm: [
    "What should I do if lightning is close?",
    "Where can I take cover right now?",
    "Is it safe to drive or ride in this storm?",
    "What should I do if the road is flooded?",
    "Is it safe to stand under a tree or near poles?",
    "Should I stay inside my car or leave it?",
    "How long until the storm passes?",
    "What should I do if someone is struck by lightning?",
    "Is it safe to use my phone during a thunderstorm?",
  ],
  fog: [
    "How do I drive or ride safely in fog?",
    "Should I delay my trip because of the fog?",
    "I have trouble breathing in this air",
    "How far can I see when driving in this fog?",
    "Is it safe to walk near roads in the fog?",
    "My eyes and throat are irritated by the air",
  ],
  cloudy: [
    "Is the air quality safe for exercise?",
    "I have trouble breathing outdoors",
    "Is it a good time to travel today?",
    "Will the weather change later today?",
    "Should I wear a mask outside today?",
  ],
  "clear-day": [
    "How do I protect myself from strong sun and UV?",
    "How much water should I drink today?",
    "What is the best time to go outside today?",
    "I have sunburn. How do I treat it?",
    "Where can I find shade and water nearby?",
  ],
  "clear-night": [
    "Is it safe to travel at night right now?",
    "What should I carry for a night trip?",
    "Where can I find an open pharmacy or hospital at night?",
    "How do I stay visible when riding at night?",
    "Is it safe to walk alone at night?",
  ],
};

const HEALTH = [
  "I feel feverish and weak suddenly",
  "I am travelling with a child. What should I do?",
  "I have asthma. Is it safe outside?",
  "I have a weather-related injury. What now?",
  "I have a high fever and feel very weak",
  "I feel dizzy and might faint",
  "I have chest tightness or trouble breathing",
  "I am pregnant. Is it safe to go out?",
  "I am an outdoor worker. How do I stay safe today?",
  "I have diabetes or heart disease. What should I watch for?",
  "My elderly parent feels unwell in this weather",
  "I have nowhere safe to stay tonight",
  "I feel confused and cannot think clearly",
  "How do I know when to call an ambulance?",
];

export default function AdvisorPanel({ request, stamp, onFocusPlace }: Props) {
  const [advice, setAdvice] = useState<Advice | null>(null);
  const [adviceStamp, setAdviceStamp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const chatLog = useRef<HTMLDivElement>(null);

  // scroll only the chat box (never the page), and only once there are messages
  useEffect(() => {
    const el = chatLog.current;
    if (el && (msgs.length > 0 || sending)) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msgs, sending]);

  const generate = async () => {
    if (!request) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/advice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) });
      if (!res.ok) throw new Error("The advisor service returned an error");
      setAdvice(await res.json());
      setAdviceStamp(stamp);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the plan");
    } finally {
      setLoading(false);
    }
  };

  const send = async (text: string) => {
    if (!request || !text.trim() || sending) return;
    const history: Msg[] = [...msgs, { role: "user", text: text.trim() }];
    setMsgs(history);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ context: request, history }) });
      const j = await res.json();
      setMsgs([...history, { role: "assistant", text: j.reply ?? "No answer received." }]);
    } catch {
      setMsgs([...history, { role: "assistant", text: "Network problem - please try again." }]);
    } finally {
      setSending(false);
    }
  };

  const stale = advice && adviceStamp !== stamp;
  const suggestions = [...(request ? BY_CONDITION[request.weather.condition] : []), ...GENERAL, ...HEALTH];

  return (
    <section className="glass card advisor" id="advisor">
      <div className="adv-head">
        <div>
          <h2>🛡️ AI Preparedness Advisor</h2>
          <p className="muted">Live weather + your travel mode + real nearby places, turned into a personal plan by Gemini.</p>
        </div>
        <button className="primary" onClick={generate} disabled={!request || loading}>
          {loading ? "Thinking…" : advice ? "↻ Regenerate plan" : "✨ Generate my safety plan"}
        </button>
      </div>

      {stale && !loading && <div className="notice">Conditions changed since this plan was made. Regenerate for fresh advice.</div>}
      {error && <div className="notice warn">{error}</div>}

      {loading && (
        <div className="adv-skeleton">
          <div className="shimmer" style={{ height: 26, width: "70%" }} />
          <div className="shimmer" style={{ height: 14, width: "95%" }} />
          <div className="shimmer" style={{ height: 14, width: "80%" }} />
          <div className="skeleton-grid">
            <div className="shimmer" style={{ height: 90 }} />
            <div className="shimmer" style={{ height: 90 }} />
            <div className="shimmer" style={{ height: 90 }} />
          </div>
        </div>
      )}

      {!advice && !loading && !error && (
        <div className="empty">
          <div style={{ fontSize: 38 }}>🧠</div>
          Pick how you travel, then generate a plan with timing, safe stops and warning signs. Use the chat below for your personal situation.
        </div>
      )}

      {advice && !loading && (
        <div className="adv-body">
          <div className={`adv-top risk-${advice.riskLevel}`}>
            <div>
              <span className="badge">{advice.riskLevel.toUpperCase()} RISK</span>
              <h3>{advice.headline}</h3>
              <p>{advice.summary}</p>
            </div>
            <span className={`src src-${advice.source}`}>{advice.source === "gemini" ? "✦ Gemini AI" : "⚙ Rule-based"}</span>
          </div>
          {advice.note && <div className="notice warn">{advice.note}</div>}

          <h4>⏱️ What to do, and when</h4>
          <ol className="timeline">
            {advice.actions.map((a, i) => (
              <li key={i} style={{ animationDelay: `${i * 90}ms` }}>
                <span className="when">{a.when}</span>
                <b>{a.title}</b>
                <p>{a.detail}</p>
              </li>
            ))}
          </ol>

          {advice.topPlaces.length > 0 && (
            <>
              <h4>📍 Best stops for you</h4>
              <div className="top-places">
                {advice.topPlaces.map((p, i) => (
                  <button key={p.placeId} onClick={() => onFocusPlace(p.placeId)} style={{ animationDelay: `${i * 100}ms` }}>
                    <span className="rank">{i + 1}</span>
                    <b>{p.name}</b>
                    <small>{p.reason}</small>
                    <em>Show on map →</em>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="two-col">
            {advice.travelTips.length > 0 && (
              <div>
                <h4>🧭 For your journey</h4>
                <ul className="bullets">{advice.travelTips.map((t, i) => <li key={i}>{t}</li>)}</ul>
              </div>
            )}
            {advice.warningSigns.length > 0 && (
              <div>
                <h4>⚠️ Warning signs</h4>
                <ul className="bullets warn">{advice.warningSigns.map((t, i) => <li key={i}>{t}</li>)}</ul>
              </div>
            )}
          </div>
          <p className="disclaimer">ClimateShield gives general safety guidance, not medical advice. In an emergency contact your local emergency services.</p>
        </div>
      )}

      <div className="chat">
        <h4>💬 Ask the advisor</h4>
        <div className="sugg">
          {suggestions.map((s) => (
            <button key={s} className="chip" onClick={() => send(s)} disabled={!request || sending}>{s}</button>
          ))}
        </div>
        <div className="chat-log" ref={chatLog}>
          {msgs.map((m, i) => (
            <div key={i} className={`bubble ${m.role}`}>{m.text}</div>
          ))}
          {sending && <div className="bubble assistant typing"><i /><i /><i /></div>}
        </div>
        <div className="chat-form">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send(input);
            }}
            placeholder="e.g. I feel dizzy in this heat, what should I do?"
            disabled={!request}
          />
          <button type="button" disabled={!request || sending || !input.trim()} onClick={() => send(input)}>Send</button>
        </div>
      </div>
    </section>
  );
}
