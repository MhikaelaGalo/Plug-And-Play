// src/components/AdminDashboard.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  LayoutDashboard,
  Folder,
  Package,
  Handshake,
  BarChart2,
  Receipt,
  LogOut,
  RefreshCw,
  Plus,
  ArrowRight,
} from "lucide-react";
import { getAdminInfo } from "../services/authService";
import {
  fetchProducts,
  fetchCategories,
  fetchSuppliers,
  fetchInventory,
  fetchAdminOrders,
} from "../services/dataService";
import CategoriesModule from "./CategoriesModule";
import ProductsModule from "./ProductsModule";
import SuppliersModule from "./SuppliersModule";
import InventoryModule from "./InventoryModule";
import OrdersModule from "./OrdersModule";

/* Minimal inline design tokens to keep styles consistent */
const T = {
  bg: "#0b1220",
  panel: "#101828",
  panelAlt: "#0f172a",
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

const container = {
  minHeight: "100vh",
  background:
    "radial-gradient(1200px 600px at 75% -10%, rgba(99,102,241,.18), transparent)," +
    "radial-gradient(800px 400px at 10% -20%, rgba(56,189,248,.14), transparent)," +
    T.bg,
  color: T.text,
  display: "grid",
  gridTemplateColumns: "260px 1fr",
};

const sidebar = {
  borderRight: `1px solid ${T.border}`,
  backgroundColor: "rgba(255,255,255,0.02)",
  padding: "18px 14px",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const content = { display: "flex", flexDirection: "column", minWidth: 0 };

const header = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "18px 22px",
  borderBottom: `1px solid ${T.border}`,
  position: "sticky",
  top: 0,
  backgroundColor: "rgba(16,24,40,0.8)",
  backdropFilter: "blur(8px)",
  zIndex: 10,
};

const main = { padding: 22, display: "grid", gap: 20 };

const gridCards = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
};

const panel = {
  background: `linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))`,
  border: `1px solid ${T.border}`,
  borderRadius: 16,
  boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
};

const panelPad = { padding: 16 };

const btn = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 12px",
  borderRadius: 10,
  border: `1px solid ${T.border}`,
  background: "rgba(255,255,255,0.03)",
  color: T.text,
  cursor: "pointer",
  fontWeight: 600,
};

const btnPrimary = {
  ...btn,
  background: `linear-gradient(180deg, ${T.brand}, ${T.brandAlt})`,
  border: "none",
};

const badge = (bg) => ({
  display: "inline-block",
  padding: "4px 8px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0.3,
  backgroundColor: bg,
  color: "#0b1220",
});

const muted = { color: T.textDim, fontSize: 13 };

// --- Small UI components ---
const SIDEBAR_ITEMS = [
  { key: null,        label: "Dashboard",   Icon: LayoutDashboard },
  { key: "categories",label: "Categories",  Icon: Folder          },
  { key: "products",  label: "Products",    Icon: Package         },
  { key: "suppliers", label: "Suppliers",   Icon: Handshake       },
  { key: "inventory", label: "Inventory",   Icon: BarChart2       },
  { key: "orders",    label: "Orders",      Icon: Receipt         },
];

const SidebarItem = ({ active, label, onClick, Icon }) => (
  <button
    onClick={onClick}
    aria-pressed={active}
    style={{
      ...btn,
      justifyContent: "flex-start",
      width: "100%",
      background: active ? "rgba(99,102,241,0.18)" : btn.background,
      borderColor: active ? T.brand : T.border,
    }}
  >
    <Icon size={18} />
    <span>{label}</span>
  </button>
);

const StatCard = ({ title, value, hint, tone = "default", onManage }) => {
  const toneColor =
    tone === "ok" ? T.ok : tone === "warn" ? T.warn : tone === "danger" ? T.danger : T.text;
  return (
    <div style={{ ...panel, ...panelPad }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div>
          <div style={{ ...muted }}>{title}</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6, color: T.white }}>
            {value}
          </div>
          {hint && (
            <div style={{ marginTop: 6, color: toneColor, fontSize: 13, fontWeight: 700 }}>
              {hint}
            </div>
          )}
        </div>
        {onManage && (
          <button style={btn} onClick={onManage} title="Manage">
            <span>Manage</span>
            <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

const MiniTable = ({ title, columns, rows, empty }) => (
  <div style={{ ...panel }}>
    <div style={{ ...panelPad, borderBottom: `1px solid ${T.border}` }}>
      <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
    </div>
    <div style={panelPad}>
      {rows.length === 0 ? (
        <div style={{ ...muted }}>{empty}</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    style={{ textAlign: c.align || "left", padding: "10px 8px", ...muted }}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderTop: `1px solid ${T.border}` }}>
                  {columns.map((c) => (
                    <td key={c.key} style={{ padding: "10px 8px", textAlign: c.align || "left" }}>
                      {r[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </div>
);

// --- Helpers ---
const fmtMoney = (n) =>
  typeof n === "number"
    ? n.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 2 })
    : "—";

export default function AdminDashboard() {
  // Core state
  const [activeModule, setActiveModule] = useState(null);
  const [admin, setAdmin] = useState(null);

  // Dashboard data state
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [counts, setCounts] = useState({
    products: 0,
    categories: 0,
    suppliers: 0,
    orders: 0,
    lowStock: 0,
  });
  const [lowStockTop, setLowStockTop] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);

  // Boot: admin + cards
  const loadAll = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const [adminInfo, products, categories, suppliers, inventory, orders] = await Promise.all([
        getAdminInfo(),
        fetchProducts(),
        fetchCategories(),
        fetchSuppliers(),
        fetchInventory(),
        fetchAdminOrders({}),
      ]);

      setAdmin(adminInfo);

      const low = (inventory || []).filter((r) => r.stock_quantity <= r.reorder_level);
      const topLow = low
        .slice()
        .sort((a, b) => a.stock_quantity - b.stock_quantity)
        .slice(0, 3);

      const ro = (orders || [])
        .slice()
        .sort(
          (a, b) =>
            new Date(b.order_date || b.createdAt || 0) - new Date(a.order_date || a.createdAt || 0)
        )
        .slice(0, 5)
        .map((o) => ({
          id: o._id,
          date: new Date(o.order_date || o.createdAt || Date.now()).toLocaleString(),
          status: (
            <span
              style={badge(
                o.order_status === "completed"
                  ? "rgba(34,197,94,.25)"
                  : o.order_status === "pending"
                  ? "rgba(245,158,11,.25)"
                  : "rgba(148,163,184,.25)"
              )}
            >
              {String(o.order_status || "N/A").toUpperCase()}
            </span>
          ),
          payment: (
            <span
              style={badge(
                o.payment_status === "paid"
                  ? "rgba(34,197,94,.25)"
                  : o.payment_status === "failed"
                  ? "rgba(239,68,68,.25)"
                  : "rgba(245,158,11,.25)"
              )}
            >
              {String(o.payment_status || "N/A").toUpperCase()}
            </span>
          ),
          total: fmtMoney(Number(o.total_amount || 0)),
        }));

      setCounts({
        products: products?.length || 0,
        categories: categories?.length || 0,
        suppliers: suppliers?.length || 0,
        orders: orders?.length || 0,
        lowStock: low.length,
      });
      setLowStockTop(topLow);
      setRecentOrders(ro);
    } catch (e) {
      setErr(e?.message || "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  if (activeModule === "categories") return <CategoriesModule onBack={() => setActiveModule(null)} />;
  if (activeModule === "products") return <ProductsModule onBack={() => setActiveModule(null)} />;
  if (activeModule === "suppliers") return <SuppliersModule onBack={() => setActiveModule(null)} />;
  if (activeModule === "inventory") return <InventoryModule onBack={() => setActiveModule(null)} />;
  if (activeModule === "orders") return <OrdersModule onBack={() => setActiveModule(null)} />;

  const handleLogout = () => {
    try {
      localStorage.removeItem("adminToken");
    } finally {
      window.location.reload();
    }
  };

  const skeletonCard = (
    <div style={{ ...panel, ...panelPad }}>
      <div style={{ height: 16, width: "40%", background: T.border, borderRadius: 6 }} />
      <div style={{ height: 30, width: "60%", background: T.border, borderRadius: 8, marginTop: 10 }} />
    </div>
  );

  return (
    <div style={container}>
      {/* SIDEBAR */}
      <aside style={sidebar}>
        <div style={{ padding: 10, marginBottom: 6 }}>
          <div style={{ fontWeight: 800, letterSpacing: 0.4 }}>Admin Panel</div>
          <div style={muted}>Control Center</div>
        </div>

        {SIDEBAR_ITEMS.map(({ key, label, Icon }) => (
          <SidebarItem
            key={String(key)}
            label={label}
            Icon={Icon}
            active={activeModule === key}
            onClick={() => setActiveModule(key)}
          />
        ))}

        <div style={{ flex: 1 }} />

        <button onClick={handleLogout} style={{ ...btn, justifyContent: "center" }}>
          <LogOut size={16} />
          Log out
        </button>
      </aside>

      {/* CONTENT */}
      <section style={content}>
        <header style={header}>
          <div>
            <div style={{ fontSize: 14, ...muted }}>Welcome back</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>
              {admin?.username || "Admin"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button style={btn} onClick={loadAll} title="Refresh">
              <RefreshCw size={15} />
              Refresh
            </button>
            <button style={btnPrimary} onClick={() => setActiveModule("products")}>
              <Plus size={15} />
              New Product
            </button>
          </div>
        </header>

        <main style={main}>
          {err && (
            <div style={{ ...panel, ...panelPad, borderColor: "rgba(239,68,68,.35)" }}>
              <div style={{ color: T.danger, fontWeight: 700, marginBottom: 6 }}>Failed to load dashboard</div>
              <div style={{ ...muted, marginBottom: 10 }}>{err}</div>
              <button style={btn} onClick={loadAll}>Try again</button>
            </div>
          )}

          {/* STATS */}
          <div style={gridCards}>
            {loading ? (
              <>{skeletonCard}{skeletonCard}{skeletonCard}{skeletonCard}</>
            ) : (
              <>
                <StatCard title="Products"    value={counts.products}   hint="Total SKUs"        onManage={() => setActiveModule("products")} />
                <StatCard title="Categories"  value={counts.categories} hint="Taxonomy health"   onManage={() => setActiveModule("categories")} />
                <StatCard title="Suppliers"   value={counts.suppliers}  hint="Active partners"   onManage={() => setActiveModule("suppliers")} />
                <StatCard title="Orders"      value={counts.orders}     hint="All-time"          onManage={() => setActiveModule("orders")} />
                <StatCard
                  title="Low-stock Alerts"
                  value={counts.lowStock}
                  hint={counts.lowStock > 0 ? `${counts.lowStock} item(s) at/below reorder` : "All good"}
                  tone={counts.lowStock > 0 ? "warn" : "ok"}
                  onManage={() => setActiveModule("inventory")}
                />
              </>
            )}
          </div>

          {/* DETAILS */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 16 }}>
            {/* Low stock list */}
            <div style={{ ...panel }}>
              <div style={{ ...panelPad, borderBottom: `1px solid ${T.border}` }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>Inventory Alerts</h3>
                <div style={muted}>Top items to replenish</div>
              </div>
              <div style={{ ...panelPad }}>
                {loading ? (
                  <div style={{ height: 64, background: T.border, borderRadius: 10 }} />
                ) : lowStockTop.length === 0 ? (
                  <div style={{ ...muted }}>No items are currently at or below reorder level.</div>
                ) : (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
                    {lowStockTop.map((r) => (
                      <li
                        key={r._id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: 12,
                          border: `1px solid ${T.border}`,
                          borderRadius: 12,
                          background: "rgba(255,255,255,0.02)",
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>
                          {r?.product_id?.product_name || "Unknown"}
                          <div style={muted}>
                            Stock: {r.stock_quantity} • Reorder: {r.reorder_level}
                          </div>
                        </div>
                        <button style={btn} onClick={() => setActiveModule("inventory")} title="Open inventory">
                          <span>Adjust</span>
                          <ArrowRight size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Recent orders */}
            <MiniTable
              title="Recent Orders"
              empty="No orders yet."
              columns={[
                { key: "id",      label: "Order ID"  },
                { key: "date",    label: "Date/Time" },
                { key: "status",  label: "Order"     },
                { key: "payment", label: "Payment"   },
                { key: "total",   label: "Total", align: "right" },
              ]}
              rows={loading ? [] : recentOrders}
            />
          </div>

          {/* Quick Actions */}
          <div style={{ ...panel, ...panelPad }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 800 }}>Quick Actions</div>
                <div style={muted}>Jump straight into a module</div>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button style={btn} onClick={() => setActiveModule("categories")}>Manage Categories</button>
                <button style={btn} onClick={() => setActiveModule("products")}>Manage Products</button>
                <button style={btn} onClick={() => setActiveModule("suppliers")}>Manage Suppliers</button>
                <button style={btn} onClick={() => setActiveModule("inventory")}>Manage Inventory</button>
                <button style={btn} onClick={() => setActiveModule("orders")}>Manage Orders</button>
              </div>
            </div>
          </div>
        </main>
      </section>
    </div>
  );
}