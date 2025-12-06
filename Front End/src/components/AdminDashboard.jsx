// src/components/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { getAdminMe } from "../services/authService";

function AdminDashboard({ user: initialUser }) {
  const [me, setMe] = useState(initialUser || null);
  const [err, setErr] = useState("");

  useEffect(() => {
    const load = async () => {
      try { if (!me) setMe(await getAdminMe()); }
      catch (e) { setErr(e.response?.data?.message || e.message); }
    };
    load();
  }, [me]);

  return (
    <div>
      <h2 className="section-title">⚙️ Admin Control Panel</h2>
      <p className="section-sub">Welcome to the management dashboard. You have full administrative privileges.</p>

      {err && <p className="text-warning">{err}</p>}
      {me && (
        <div className="hero">
          <div className="row">
            <div>
              <div><strong>Signed in as:</strong> {me.username} <span className="text-muted">({me.email})</span></div>
              <div className="note mt-1">Role: <b>{me.role || "admin"}</b></div>
            </div>
          </div>
        </div>
      )}

      <div className="grid mt-3">
        <div className="card">
          <h3 className="card__title">📦 Inventory & Products</h3>
          <p className="card__desc">Manage product details, pricing, and category assignments.</p>
          <div className="stack-sm">
            <div className="kbd">POST/PUT <b>/api/products</b></div>
            <div className="kbd">POST/PUT <b>/api/categories</b></div>
          </div>
          <div className="row mt-2">
            <button className="btn">Open Products</button>
            <button className="btn btn--ghost">Categories</button>
          </div>
        </div>

        <div className="card">
          <h3 className="card__title">💰 Orders & Customers</h3>
          <p className="card__desc">Review orders and manage user accounts.</p>
          <div className="stack-sm">
            <div className="kbd">GET <b>/api/orders</b></div>
            <div className="kbd">PUT <b>/api/orders/:id</b></div>
            <div className="kbd">GET <b>/api/admin/users</b></div>
          </div>
          <div className="row mt-2">
            <button className="btn">View Orders</button>
            <button className="btn btn--ghost">Customers</button>
          </div>
        </div>

        <div className="card">
          <h3 className="card__title">🚛 Suppliers</h3>
          <p className="card__desc">Track supplier information and procurement details.</p>
          <div className="stack-sm">
            <div className="kbd">POST/PUT <b>/api/suppliers</b></div>
          </div>
          <div className="row mt-2">
            <button className="btn">Manage Suppliers</button>
            <button className="btn btn--ghost">Invite</button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default AdminDashboard;
