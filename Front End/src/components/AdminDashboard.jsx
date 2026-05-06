// src/components/AdminDashboard.jsx
import React, { useEffect, useState, useCallback } from "react";

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
import AdminLayout from "./AdminLayout";

import { T, btn, panel, panelPad, muted } from "../styles/adminTokens";

const gridCards = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
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

const StatCard = ({ title, value, hint, tone = "default" }) => {
  const toneColor =
    tone === "ok"
      ? T.ok
      : tone === "warn"
      ? T.warn
      : tone === "danger"
      ? T.danger
      : T.text;

  return (
    <div style={{ ...panel, ...panelPad }}>
      <div style={{ marginBottom: 4 }}>
        <div style={muted}>{title}</div>

        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            marginTop: 6,
            color: T.white,
          }}
        >
          {value}
        </div>

        {hint && (
          <div
            style={{
              marginTop: 6,
              color: toneColor,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {hint}
          </div>
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
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead>
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.key}
                    style={{
                      textAlign: c.align || "left",
                      padding: "10px 8px",
                      ...muted,
                    }}
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
                    <td
                      key={c.key}
                      style={{
                        padding: "10px 8px",
                        textAlign: c.align || "left",
                      }}
                    >
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

const fmtMoney = (n) =>
  typeof n === "number"
    ? n.toLocaleString(undefined, {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
      })
    : "—";

export default function AdminDashboard() {
  const [activeModule, setActiveModule] = useState(null);
  const [admin, setAdmin] = useState(null);

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

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErr("");

    try {
      const [adminInfo, products, categories, suppliers, inventory, orders] =
        await Promise.all([
          getAdminInfo(),
          fetchProducts(),
          fetchCategories(),
          fetchSuppliers(),
          fetchInventory(),
          fetchAdminOrders({}),
        ]);

      setAdmin(adminInfo);

      const low = (inventory || []).filter(
        (r) => r.stock_quantity <= r.reorder_level
      );

      const topLow = low
        .slice()
        .sort((a, b) => a.stock_quantity - b.stock_quantity)
        .slice(0, 3);

      const ro = (orders || [])
        .slice()
        .sort(
          (a, b) =>
            new Date(b.order_date || b.createdAt || 0) -
            new Date(a.order_date || a.createdAt || 0)
        )
        .slice(0, 5)
        .map((o) => ({
          id: o._id,
          date: new Date(
            o.order_date || o.createdAt || Date.now()
          ).toLocaleString(),
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

  const moduleMap = {
    categories: <CategoriesModule onBack={() => setActiveModule(null)} />,
    products: <ProductsModule onBack={() => setActiveModule(null)} />,
    suppliers: <SuppliersModule onBack={() => setActiveModule(null)} />,
    inventory: <InventoryModule onBack={() => setActiveModule(null)} />,
    orders: <OrdersModule onBack={() => setActiveModule(null)} />,
  };

  const skeletonCard = (
    <div style={{ ...panel, ...panelPad }}>
      <div
        style={{
          height: 16,
          width: "40%",
          background: T.border,
          borderRadius: 6,
        }}
      />
      <div
        style={{
          height: 30,
          width: "60%",
          background: T.border,
          borderRadius: 8,
          marginTop: 10,
        }}
      />
    </div>
  );

  return (
    <AdminLayout
      activeModule={activeModule}
      setActiveModule={setActiveModule}
    >
      {activeModule ? (
        moduleMap[activeModule]
      ) : (
        <>
          {err && (
            <div
              style={{
                ...panel,
                ...panelPad,
                borderColor: "rgba(239,68,68,.35)",
              }}
            >
              <div
                style={{
                  color: T.danger,
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                Failed to load dashboard
              </div>

              <div style={{ ...muted, marginBottom: 10 }}>{err}</div>

              <button style={btn} onClick={loadAll}>
                Try again
              </button>
            </div>
          )}

          <div style={gridCards}>
            {loading ? (
              <>
                {skeletonCard}
                {skeletonCard}
                {skeletonCard}
                {skeletonCard}
              </>
            ) : (
              <>
                <StatCard
                  title="Products"
                  value={counts.products}
                  hint="Total SKUs"
                />

                <StatCard
                  title="Categories"
                  value={counts.categories}
                  hint="Taxonomy health"
                />

                <StatCard
                  title="Suppliers"
                  value={counts.suppliers}
                  hint="Active partners"
                />

                <StatCard
                  title="Orders"
                  value={counts.orders}
                  hint="All-time"
                />

                <StatCard
                  title="Low-stock Alerts"
                  value={counts.lowStock}
                  hint={
                    counts.lowStock > 0
                      ? `${counts.lowStock} item(s) at/below reorder`
                      : "All good"
                  }
                  tone={counts.lowStock > 0 ? "warn" : "ok"}
                />
              </>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.3fr",
              gap: 16,
            }}
          >
            <div style={{ ...panel }}>
              <div
                style={{
                  ...panelPad,
                  borderBottom: `1px solid ${T.border}`,
                }}
              >
                <h3 style={{ margin: 0, fontSize: 16 }}>
                  Inventory Alerts
                </h3>
                <div style={muted}>Top items to replenish</div>
              </div>

              <div style={{ ...panelPad }}>
                {loading ? (
                  <div
                    style={{
                      height: 64,
                      background: T.border,
                      borderRadius: 10,
                    }}
                  />
                ) : lowStockTop.length === 0 ? (
                  <div style={{ ...muted }}>
                    No items are currently at or below reorder level.
                  </div>
                ) : (
                  <ul
                    style={{
                      listStyle: "none",
                      margin: 0,
                      padding: 0,
                      display: "grid",
                      gap: 10,
                    }}
                  >
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
                            Stock: {r.stock_quantity} • Reorder:{" "}
                            {r.reorder_level}
                          </div>
                        </div>

                        <button
                          style={btn}
                          onClick={() => setActiveModule("inventory")}
                          title="Open inventory"
                        >
                          Adjust
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <MiniTable
              title="Recent Orders"
              empty="No orders yet."
              columns={[
                { key: "id", label: "Order ID" },
                { key: "date", label: "Date/Time" },
                { key: "status", label: "Order" },
                { key: "payment", label: "Payment" },
                { key: "total", label: "Total", align: "right" },
              ]}
              rows={loading ? [] : recentOrders}
            />
          </div>
        </>
      )}
    </AdminLayout>
  );
}
