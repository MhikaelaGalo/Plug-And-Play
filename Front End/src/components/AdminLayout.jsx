// src/components/AdminLayout.jsx
import {
  LayoutDashboard,
  Folder,
  Package,
  Handshake,
  BarChart2,
  Receipt,
  LogOut,
} from "lucide-react";

import { T, btn, muted } from "../styles/adminTokens";

const SIDEBAR_ITEMS = [
  { key: null, label: "Dashboard", Icon: LayoutDashboard },
  { key: "orders", label: "Orders", Icon: Receipt },
  { key: "products", label: "Products", Icon: Package },
  { key: "inventory", label: "Inventory", Icon: BarChart2 },
  { key: "categories", label: "Categories", Icon: Folder },
  { key: "suppliers", label: "Suppliers", Icon: Handshake },
];

export default function AdminLayout({
  activeModule,
  setActiveModule,
  children,
}) {
  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    window.location.reload();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1200px 600px at 75% -10%, rgba(99,102,241,.18), transparent)," +
          T.bg,
        color: T.text,
        display: "grid",
        gridTemplateColumns: "260px 1fr",
      }}
    >
      {/* SIDEBAR */}
      <aside
        style={{
          borderRight: `1px solid ${T.border}`,
          backgroundColor: "rgba(255,255,255,0.02)",
          padding: "18px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 12,

          // Keeps sidebar fixed within the viewport
          height: "100vh",
          position: "sticky",
          top: 0,
          overflowY: "auto",
          boxSizing: "border-box",
        }}
      >
        <div style={{ padding: 10, marginBottom: 6 }}>
          <div style={{ fontWeight: 800 }}>Admin Panel</div>
          <div style={muted}>Control Center</div>
        </div>

        {SIDEBAR_ITEMS.map(({ key, label, Icon }) => (
          <button
            key={String(key)}
            onClick={() => setActiveModule(key)}
            style={{
              ...btn,
              justifyContent: "flex-start",
              width: "100%",
              background:
                activeModule === key
                  ? "rgba(99,102,241,0.18)"
                  : btn.background,
              borderColor: activeModule === key ? T.brand : T.border,
            }}
          >
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}

        <div style={{ flex: 1 }} />

        <button
          onClick={handleLogout}
          style={{ ...btn, justifyContent: "center" }}
        >
          <LogOut size={16} />
          Log out
        </button>
      </aside>

      {/* CONTENT AREA */}
      <section style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <main style={{ padding: "50px 22px 22px", display: "grid", gap: 20 }}>
          {children}
        </main>
      </section>
    </div>
  );
}