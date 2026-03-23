import React, { useState } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import AdminDashboard from "./components/AdminDashboard";

const HEADER_H = 64;

export default function App() {
  const [currentView, setCurrentView] = useState("login");
  const isLoggedIn = !!localStorage.getItem("adminToken");

  if (isLoggedIn) return <AdminDashboard />;

  return (
    <div
      style={{
        minHeight: "100svh",
        display: "grid",
        gridTemplateRows: "auto 1fr",
        background: "#0b1220",
      }}
    >
      <header
        style={{
          height: HEADER_H,
          minHeight: HEADER_H,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          color: "#e5e7eb",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>E-Commerce Admin Panel</h1>
        <button
          onClick={() => setCurrentView(v => (v === "login" ? "register" : "login"))}
          style={{
            border: "1px solid rgba(255,255,255,0.15)",
            background: "transparent",
            color: "#e5e7eb",
            borderRadius: 8,
            padding: "8px 12px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {currentView === "login" ? "Go to Register" : "Go to Login"}
        </button>
      </header>

      {/* exact centering layer */}
      <div style={{ position: "relative" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div style={{ width: "min(460px, 92vw)" }}>
            {currentView === "login" ? (
              <Login onSwitchToRegister={() => setCurrentView("register")} />
            ) : (
              <Register onSwitchToLogin={() => setCurrentView("login")} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}