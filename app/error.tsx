"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "#fff", textAlign: "center", padding: 24 }}>
      <div>
        <div style={{ fontSize: 48 }}>🛡️</div>
        <h2 style={{ margin: "12px 0 6px" }}>Something went wrong</h2>
        <p style={{ opacity: 0.8, marginBottom: 16 }}>ClimateShield hit an unexpected problem. Your data is safe.</p>
        <button onClick={reset} style={{ padding: "10px 20px", borderRadius: 12, border: 0, fontWeight: 700, cursor: "pointer" }}>
          Try again
        </button>
      </div>
    </div>
  );
}
