// src/components/SuppliersModule.jsx
import React, { useState, useEffect } from "react";
import {
  Handshake,
  ArrowLeft,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  fetchSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "../services/dataService";

const initialFormState = {
  supplier_name: "",
  contact_person: "",
  email: "",
  phone: "",
  address: "",
  is_active: true,
};

// --- Design Tokens ---
const T = {
  bg: "#0b1220",
  border: "rgba(255,255,255,0.08)",
  text: "#e5e7eb",
  textDim: "#9ca3af",
  brand: "#4f46e5",
  brandAlt: "#6366f1",
  ok: "#22c55e",
  danger: "#ef4444",
  warn: "#f59e0b",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: `1px solid ${T.border}`,
  background: T.bg,
  color: T.text,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  marginBottom: 6,
  color: T.textDim,
  fontSize: 12,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 0.5,
};

const btn = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  borderRadius: 8,
  border: `1px solid ${T.border}`,
  background: "rgba(255,255,255,0.04)",
  color: T.text,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
};

const btnWarn = {
  ...btn,
  background: "rgba(245,158,11,0.12)",
  border: "1px solid rgba(245,158,11,0.25)",
  color: T.warn,
};

const btnDanger = {
  ...btn,
  background: "rgba(239,68,68,0.12)",
  border: "1px solid rgba(239,68,68,0.25)",
  color: T.danger,
};

const btnDisabled = {
  ...btn,
  opacity: 0.4,
  cursor: "not-allowed",
};

const panel = {
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
  border: `1px solid ${T.border}`,
  borderRadius: 16,
  boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
};

function SuppliersModule({ onBack }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [formData, setFormData] = useState(initialFormState);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  const loadSuppliers = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await fetchSuppliers();
      setSuppliers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      if (isEditing) {
        await updateSupplier(currentId, { ...formData });
        setSuccessMsg("Supplier updated successfully!");
      } else {
        await createSupplier({ ...formData });
        setSuccessMsg("Supplier created successfully!");
      }
      handleCancelEdit();
      await loadSuppliers();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (supplier) => {
    setFormData({
      supplier_name: supplier.supplier_name,
      contact_person: supplier.contact_person || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      is_active: supplier.is_active,
    });
    setIsEditing(true);
    setCurrentId(supplier._id);
    setSuccessMsg(null);
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to soft-delete/deactivate this supplier?",
      )
    )
      return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await deleteSupplier(id);
      setSuccessMsg("Supplier deactivated successfully!");
      await loadSuppliers();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setFormData(initialFormState);
    setIsEditing(false);
    setCurrentId(null);
  };

  if (loading && suppliers.length === 0) {
    return (
      <div style={{ padding: "20px", color: T.textDim }}>
        Loading Supplier Module...
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "1100px", margin: "0 auto" }}>
      {/* Header */}
      <h2
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: T.text,
          marginBottom: 16,
        }}
      >
        <Handshake size={22} />
        Supplier Management
      </h2>

      {/* Back button */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={onBack}
          disabled={loading}
          style={{
            ...btn,
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
          }}
        >
          <ArrowLeft size={15} />
          Back to Dashboard
        </button>
      </div>

      {/* Feedback messages */}
      {successMsg && (
        <p
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: T.ok,
            fontWeight: "bold",
            marginBottom: 12,
          }}
        >
          <CheckCircle size={16} /> {successMsg}
        </p>
      )}
      {error && (
        <p
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: T.danger,
            fontWeight: "bold",
            marginBottom: 12,
          }}
        >
          <XCircle size={16} /> {error}
        </p>
      )}

      {/* Form */}
      <div style={{ ...panel, padding: 24, marginBottom: 24 }}>
        <h3
          style={{
            margin: "0 0 20px 0",
            color: T.text,
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          {isEditing
            ? `Edit Supplier: ...${currentId?.slice(-4)}`
            : "Create New Supplier"}
        </h3>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
          {/* Supplier Name - full width */}
          <div>
            <label style={labelStyle}>Supplier Name *</label>
            <input
              name="supplier_name"
              type="text"
              placeholder="e.g. Tech Imports Inc."
              value={formData.supplier_name}
              onChange={handleChange}
              required
              disabled={loading}
              style={inputStyle}
            />
          </div>

          {/* Contact Person + Phone */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div>
              <label style={labelStyle}>Contact Person</label>
              <input
                name="contact_person"
                type="text"
                placeholder="e.g. Juan dela Cruz"
                value={formData.contact_person}
                onChange={handleChange}
                disabled={loading}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input
                name="phone"
                type="tel"
                placeholder="e.g. +63 912 345 6789"
                value={formData.phone}
                onChange={handleChange}
                disabled={loading}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Email - full width */}
          <div>
            <label style={labelStyle}>Email</label>
            <input
              name="email"
              type="email"
              placeholder="e.g. supplier@example.com"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              style={inputStyle}
            />
          </div>

          {/* Address - full width */}
          <div>
            <label style={labelStyle}>Address</label>
            <textarea
              name="address"
              placeholder="e.g. 123 Main St, Quezon City"
              value={formData.address}
              onChange={handleChange}
              disabled={loading}
              style={{ ...inputStyle, resize: "vertical", minHeight: 72 }}
            />
          </div>

          {/* Is Active (edit mode only) */}
          {isEditing && (
            <div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1px solid ${T.border}`,
                  background: T.bg,
                  cursor: "pointer",
                  color: T.text,
                  fontSize: 13,
                }}
              >
                <input
                  name="is_active"
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={handleChange}
                  disabled={loading}
                  style={{ accentColor: T.brand }}
                />
                Is Active (controls visibility in Product forms)
              </label>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                ...btn,
                flexGrow: 1,
                justifyContent: "center",
                padding: "10px 16px",
                border: "none",
                color: "white",
                background: isEditing
                  ? "linear-gradient(180deg, #b45309, #f59e0b)"
                  : `linear-gradient(180deg, ${T.brand}, ${T.brandAlt})`,
              }}
            >
              {loading
                ? "Processing..."
                : isEditing
                  ? "Save Supplier Changes"
                  : "Create Supplier"}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={loading}
                style={{ ...btn, padding: "10px 16px" }}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Supplier List */}
      <h3 style={{ color: T.text, marginBottom: 12 }}>
        Supplier List ({suppliers.length} Total)
      </h3>
      {loading && <p style={{ color: T.textDim }}>Loading suppliers...</p>}

      <div
        style={{
          overflowX: "auto",
          borderRadius: 12,
          border: `1px solid ${T.border}`,
        }}
      >
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
        >
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.03)" }}>
              {["Name / Status", "Contact", "Address", "Actions"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "12px 14px",
                    textAlign: "left",
                    color: T.textDim,
                    fontWeight: 600,
                    borderBottom: `1px solid ${T.border}`,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {suppliers.map((supplier) => (
              <tr
                key={supplier._id}
                style={{ borderBottom: `1px solid rgba(255,255,255,0.05)` }}
              >
                <td style={{ padding: "12px 14px" }}>
                  <div style={{ fontWeight: 700, color: T.text }}>
                    {supplier.supplier_name}
                  </div>
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: 4,
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                      background: supplier.is_active
                        ? "rgba(34,197,94,0.15)"
                        : "rgba(239,68,68,0.15)",
                      color: supplier.is_active ? T.ok : T.danger,
                    }}
                  >
                    {supplier.is_active ? "ACTIVE" : "INACTIVE"}
                  </span>
                </td>
                <td
                  style={{
                    padding: "12px 14px",
                    color: T.text,
                    lineHeight: 1.7,
                  }}
                >
                  {supplier.contact_person && (
                    <div>
                      <span style={{ color: T.textDim }}>Contact:</span>{" "}
                      {supplier.contact_person}
                    </div>
                  )}
                  {supplier.email && (
                    <div>
                      <span style={{ color: T.textDim }}>Email:</span>{" "}
                      {supplier.email}
                    </div>
                  )}
                  {supplier.phone && (
                    <div>
                      <span style={{ color: T.textDim }}>Phone:</span>{" "}
                      {supplier.phone}
                    </div>
                  )}
                </td>
                <td style={{ padding: "12px 14px", color: T.textDim }}>
                  {supplier.address || "N/A"}
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => handleEdit(supplier)}
                      style={btnWarn}
                      disabled={loading}
                    >
                      <Pencil size={13} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(supplier._id)}
                      style={supplier.is_active ? btnDanger : btnDisabled}
                      disabled={loading || !supplier.is_active}
                    >
                      <Trash2 size={13} />
                      {supplier.is_active ? "Deactivate" : "Inactive"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && suppliers.length === 0 && (
          <div style={{ padding: 20, color: T.textDim }}>
            No suppliers found.
          </div>
        )}
      </div>
    </div>
  );
}

export default SuppliersModule;
