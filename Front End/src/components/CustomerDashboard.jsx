// src/components/CustomerDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { logout } from "../services/authService";

// WHY: keep visual text separate for reuse
const LABELS = {
  profile: "Profile",
  orders: "Orders",
  logout: "Logout",
};

function CustomerDashboard({ user }) {
  const displayName = useMemo(() => {
    if (!user) return "USER";
    return user.first_name ? user.first_name : user.username || "USER";
  }, [user]);

  const [tab, setTab] = useState("orders"); // 'orders' | 'profile'
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersErr, setOrdersErr] = useState("");

  useEffect(() => {
    const fetchOrders = async () => {
      setLoadingOrders(true);
      setOrdersErr("");
      try {
        // Try likely endpoints in order; stop at first success
        const tries = [
          () => api.get("/orders/my"),
          () => api.get("/orders/customer/me"),
          () => user?._id ? api.get(`/orders/by-customer/${user._id}`) : Promise.reject(new Error("No user id")),
        ];
        for (const t of tries) {
          try {
            const { data } = await t();
            setOrders(Array.isArray(data) ? data : data?.orders || []);
            return;
          } catch {
            /* continue */
          }
        }
        setOrders([]); setOrdersErr("No orders endpoint responded.");
      } catch (e) {
        setOrders([]); setOrdersErr(e.response?.data?.message || e.message || "Failed to load orders");
      } finally {
        setLoadingOrders(false);
      }
    };
    fetchOrders();
  }, [user?._id]);

  const handleLogout = () => {
    logout();
    window.location.href = "/"; // WHY: ensure app resets to login quickly
  };

  return (
    <div className="custdash">
      <div className="custdash-inner">
        {/* Sidebar */}
        <aside className="custdash-sidebar">
          <div className="custdash-sidebar-title">★</div>
          <nav className="custdash-nav">
            <button
              className={`custdash-nav-item ${tab === "profile" ? "is-active" : ""}`}
              onClick={() => setTab("profile")}
            >
              {LABELS.profile}
            </button>
            <button
              className={`custdash-nav-item ${tab === "orders" ? "is-active" : ""}`}
              onClick={() => setTab("orders")}
            >
              {LABELS.orders}
            </button>
            <button className="custdash-nav-item is-muted" onClick={handleLogout}>
              {LABELS.logout}
            </button>
          </nav>
        </aside>

        {/* Main */}
        <section className="custdash-main">
          <div className="custdash-banner">
            <div className="custdash-banner-text">WELCOME, {displayName}!</div>
            {/* Optional: if you have a banner image, drop it into /public and change src */}
            <div className="custdash-banner-art" aria-hidden />
          </div>

          {tab === "orders" ? (
            <OrdersPanel orders={orders} loading={loadingOrders} error={ordersErr} />
          ) : (
            <ProfilePanel user={user} />
          )}
        </section>
      </div>
    </div>
  );
}

function OrdersPanel({ orders, loading, error }) {
  return (
    <div className="custdash-card">
      <h3 className="custdash-h3">MY PURCHASES</h3>
      {loading ? (
        <p className="note">Loading orders…</p>
      ) : error ? (
        <p className="custdash-error">{error}</p>
      ) : orders.length === 0 ? (
        <p className="note">You have no orders yet.</p>
      ) : (
        <ul className="orders-list">
          {orders.map((o) => (
            <li key={o._id} className="order-row">
              <div className="order-info">
                <div className="order-name">{o.items?.[0]?.product_name || "Name of the product"}</div>
                <div className="order-meta">
                  <span>Category</span>
                  <span>Quantity: {o.items?.reduce((n, it) => n + (it.quantity || 0), 0) || 1}</span>
                </div>
              </div>
              <div className="order-right">
                <div className="order-status">
                  <span className={`chip ${o.status || "completed"}`}>{(o.status || "Completed").toString()}</span>
                  <span className="order-amount">Php {Number(o.total_amount ?? 0).toFixed(2)}</span>
                </div>
                <div className="order-actions">
                  <button className="btn pill">Buy it again</button>
                  <button className="btn pill outline">Order Details</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProfilePanel({ user }) {
  return (
    <div className="custdash-card">
      <h3 className="custdash-h3">PERSONAL INFORMATION</h3>

      <div className="profile-grid">
        <div className="profile-col">
          <label className="field-label">NAME</label>
          <div className="field-line">
            {(user?.first_name ? `${user.first_name} ${user?.last_name || ""}` : user?.username || "—").trim()}
          </div>

          <label className="field-label">EMAIL</label>
          <div className="field-line">{user?.email || "—"}</div>

          <label className="field-label">CHANGE PASSWORD</label>
          <input className="input underline" type="password" placeholder="*************" />

          <label className="field-label">CONFIRM PASSWORD</label>
          <input className="input underline" type="password" placeholder="*************" />

          <label className="field-label">SAVED ADDRESSES</label>
          <button className="btn pill outline small">Add New Address +</button>

          <div className="addr-list">
            <div className="addr-row">
              <div>
                <div className="addr-name">Name</div>
                <div className="addr-text">123 Sampaloc St. Sta.Mesa, Manila</div>
                <div className="addr-text">+123 456 7890</div>
              </div>
              <div className="addr-zip">Zip Code</div>
            </div>
            <div className="divider" />
            <div className="addr-row">
              <div>
                <div className="addr-name">Name</div>
                <div className="addr-text">123 Sampaloc St. Sta.Mesa, Manila</div>
                <div className="addr-text">+123 456 7890</div>
              </div>
              <div className="addr-zip">Zip Code</div>
            </div>
          </div>
        </div>

        <div className="profile-col photo">
          <div className="avatar" />
          <button className="btn pill outline mt-2">Change Profile Picture</button>
        </div>
      </div>
    </div>
  );
}

export default CustomerDashboard;
