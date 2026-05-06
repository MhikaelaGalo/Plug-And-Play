export const T = {
  bg: "#0b1220",
  panel: "#101828",
  border: "rgba(255,255,255,0.08)",
  text: "#e5e7eb",
  textDim: "#9ca3af",
  brand: "#4f46e5",
  brandAlt: "#6366f1",
  ok: "#22c55e",
  warn: "#f59e0b",
  danger: "#ef4444",
  white: "#ffffff",
};

export const btn = {
  display: "inline-flex", alignItems: "center", gap: 8,
  padding: "10px 12px", borderRadius: 10,
  border: `1px solid ${T.border}`,
  background: "rgba(255,255,255,0.03)",
  color: T.text, cursor: "pointer", fontWeight: 600,
};

export const btnPrimary = {
  ...btn,
  background: `linear-gradient(180deg, ${T.brand}, ${T.brandAlt})`,
  border: "none",
};

export const panel = {
  background: `linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))`,
  border: `1px solid ${T.border}`,
  borderRadius: 16,
  boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
};

export const panelPad = { padding: 16 };
export const muted = { color: T.textDim, fontSize: 13 };