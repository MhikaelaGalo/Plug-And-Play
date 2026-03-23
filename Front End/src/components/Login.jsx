import React, { useState } from "react";
import { Lock, XCircle } from "lucide-react";
import { loginAdmin } from "../services/authService";

export default function Login({ onSwitchToRegister }) {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);
    try {
      await loginAdmin({ usernameOrEmail, password });
      window.location.reload();
    } catch (err) {
      setIsError(true);
      setMessage(err?.response?.data?.message || err?.message || "Login failed");
    }
  };

  return (
    <div
      style={{
        margin: 0,
        maxWidth: "100%",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 12,
        background: "rgba(16,24,40,0.85)",
        boxShadow: "0 10px 30px rgba(0,0,0,.35)",
        padding: 24,
      }}
    >
      <h2 style={{ margin: "0 0 16px 0", fontSize: 22, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
        <Lock size={20} />
        Admin Login
      </h2>

      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", margin: "0 0 6px 0" }}>Username or Email:</label>
          <input
            type="text"
            value={usernameOrEmail}
            onChange={(e) => setUsernameOrEmail(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.15)",
              outline: "none",
              background: "#0b1220",
              color: "#e5e7eb",
            }}
          />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", margin: "0 0 6px 0" }}>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.15)",
              outline: "none",
              background: "#0b1220",
              color: "#e5e7eb",
            }}
          />
        </div>

        <button
          type="submit"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "none",
            background: "linear-gradient(180deg,#4f46e5,#6366f1)",
            color: "white",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Log In
        </button>
      </form>

      <div style={{ marginTop: 14, fontSize: 14 }}>
        Don't have an account?{" "}
        <button
          onClick={onSwitchToRegister}
          type="button"
          style={{
            background: "transparent",
            border: "none",
            color: "#22c55e",
            fontWeight: 700,
            cursor: "pointer",
            padding: 0,
          }}
        >
          Register Admin here
        </button>
      </div>

      {message && (
        <p
          style={{
            marginTop: 12,
            color: isError ? "#f87171" : "#4ade80",
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {isError && <XCircle size={16} />}
          {message}
        </p>
      )}
    </div>
  );
}