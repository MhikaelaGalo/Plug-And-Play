// src/components/OrdersModule.jsx

import React, { useState, useEffect, useCallback } from "react";
import { fetchAdminOrders, updateOrderStatus } from "../services/dataService";
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  XOctagon,
  RefreshCw,
} from "lucide-react";

const ORDER_STATUSES = ["pending", "processing", "completed", "cancelled"];
const PAYMENT_STATUSES = ["pending", "paid", "failed"];

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function OrdersModule({ onBack }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [updateFormData, setUpdateFormData] = useState({});
  const [filters, setFilters] = useState({ status: "", paymentStatus: "" });

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const data = await fetchAdminOrders(filters);
      setOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Status Update Handlers ---
  const handleEdit = (order) => {
    setEditingOrder(order);
    setUpdateFormData({
      order_status: order.order_status,
      payment_status: order.payment_status,
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingOrder) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await updateOrderStatus(editingOrder._id, updateFormData);
      setMessage(`Order ${editingOrder._id} status updated successfully.`);
      setEditingOrder(null);
      await fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Rendering Functions ---

  const renderUpdateForm = () => (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.08)",
        padding: "20px",
        borderRadius: "12px",
        marginBottom: "20px",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <h3 style={{ color: "#e5e7eb", marginTop: 0 }}>
        Update Status for Order:{" "}
        <code style={{ color: "#6366f1" }}>{editingOrder._id}</code>
      </h3>
      <form
        onSubmit={handleUpdate}
        style={{
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ color: "#9ca3af", fontSize: 13 }}>
            Order Status:
          </label>
          <select
            value={updateFormData.order_status || ""}
            onChange={(e) =>
              setUpdateFormData({
                ...updateFormData,
                order_status: e.target.value,
              })
            }
            required
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "#0b1220",
              color: "#e5e7eb",
              fontSize: 13,
            }}
          >
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ color: "#9ca3af", fontSize: 13 }}>
            Payment Status:
          </label>
          <select
            value={updateFormData.payment_status || ""}
            onChange={(e) =>
              setUpdateFormData({
                ...updateFormData,
                payment_status: e.target.value,
              })
            }
            required
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "#0b1220",
              color: "#e5e7eb",
              fontSize: 13,
            }}
          >
            {PAYMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            background: "linear-gradient(180deg, #16a34a, #22c55e)",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {loading ? "Updating..." : "Save Status"}
        </button>
        <button
          type="button"
          onClick={() => setEditingOrder(null)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            background: "rgba(255,255,255,0.06)",
            color: "#e5e7eb",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </form>
    </div>
  );

  const renderFilterControls = () => (
    <div
      style={{
        marginBottom: "20px",
        display: "flex",
        gap: "12px",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <label style={{ color: "#9ca3af", fontSize: 13 }}>Order Status:</label>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "#0b1220",
            color: "#e5e7eb",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          <option value="">ALL</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <label style={{ color: "#9ca3af", fontSize: 13 }}>
          Payment Status:
        </label>
        <select
          value={filters.paymentStatus}
          onChange={(e) =>
            setFilters({ ...filters, paymentStatus: e.target.value })
          }
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "#0b1220",
            color: "#e5e7eb",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          <option value="">ALL</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={fetchData}
        disabled={loading}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 16px",
          borderRadius: 8,
          border: "none",
          background: "linear-gradient(180deg, #4f46e5, #6366f1)",
          color: "white",
          fontWeight: 600,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        <RefreshCw size={13} />
        Apply Filters
      </button>
    </div>
  );

  const renderTable = () => (
    <div
      style={{
        overflowX: "auto",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
      >
        <thead>
          <tr style={{ background: "rgba(255,255,255,0.03)" }}>
            {[
              "ID (Date)",
              "Customer ID",
              "Total",
              "Order Status",
              "Payment Status",
              "Actions",
            ].map((h) => (
              <th
                key={h}
                style={{
                  padding: "12px 14px",
                  textAlign: "left",
                  color: "#9ca3af",
                  fontWeight: 600,
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr
              key={o._id}
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            >
              <td style={{ padding: "12px 14px", color: "#e5e7eb" }}>
                {o._id}
                <br />
                <small style={{ color: "#6c757d" }}>
                  {formatDate(o.order_date)}
                </small>
              </td>
              <td style={{ padding: "12px 14px", color: "#e5e7eb" }}>
                {o.customer_id}
              </td>
              <td style={{ padding: "12px 14px", color: "#e5e7eb" }}>
                ${o.total_amount ? o.total_amount.toFixed(2) : "0.00"}
              </td>
              <td style={{ padding: "12px 14px" }}>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    background:
                      o.order_status === "completed"
                        ? "rgba(34,197,94,0.15)"
                        : o.order_status === "pending"
                          ? "rgba(245,158,11,0.15)"
                          : o.order_status === "cancelled"
                            ? "rgba(239,68,68,0.15)"
                            : "rgba(148,163,184,0.15)",
                    color:
                      o.order_status === "completed"
                        ? "#22c55e"
                        : o.order_status === "pending"
                          ? "#f59e0b"
                          : o.order_status === "cancelled"
                            ? "#ef4444"
                            : "#94a3b8",
                  }}
                >
                  {o.order_status.toUpperCase()}
                </span>
              </td>
              <td style={{ padding: "12px 14px" }}>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    background:
                      o.payment_status === "paid"
                        ? "rgba(34,197,94,0.15)"
                        : o.payment_status === "failed"
                          ? "rgba(239,68,68,0.15)"
                          : "rgba(245,158,11,0.15)",
                    color:
                      o.payment_status === "paid"
                        ? "#22c55e"
                        : o.payment_status === "failed"
                          ? "#ef4444"
                          : "#f59e0b",
                  }}
                >
                  {o.payment_status.toUpperCase()}
                </span>
              </td>
              <td style={{ padding: "12px 14px" }}>
                <button
                  onClick={() => handleEdit(o)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    background: "linear-gradient(180deg, #4f46e5, #6366f1)",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Update Status
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={{ padding: "20px" }}>
      <button
        onClick={onBack}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginBottom: "20px",
          padding: "8px 15px",
          backgroundColor: "#6c757d",
          color: "white",
          border: "none",
          borderRadius: "6px",
          fontWeight: 600,
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        <ArrowLeft size={15} />
        Back to Dashboard
      </button>

      <h2
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "#e5e7eb",
        }}
      >
        <FileText size={22} />
        Order Management
      </h2>

      {message && (
        <p
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "#22c55e",
            fontWeight: "bold",
          }}
        >
          <CheckCircle size={16} />
          {message}
        </p>
      )}
      {error && (
        <p
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "#ef4444",
            fontWeight: "bold",
          }}
        >
          <XOctagon size={16} />
          {error}
        </p>
      )}

      {editingOrder && renderUpdateForm()}
      {renderFilterControls()}
      {loading && <p style={{ color: "#9ca3af" }}>Loading orders...</p>}

      <h3 style={{ color: "#e5e7eb" }}>Order List ({orders.length} total)</h3>
      {!loading && orders.length > 0 && renderTable()}
      {!loading && orders.length === 0 && (
        <p style={{ color: "#9ca3af" }}>
          No orders found matching the current filters.
        </p>
      )}
    </div>
  );
}

export default OrdersModule;
