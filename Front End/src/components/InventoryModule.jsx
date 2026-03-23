// src/components/InventoryModule.jsx

import React, { useState, useEffect } from "react";
import { BarChart2, ArrowLeft, RefreshCw, Pencil, Trash2, CheckCircle, XCircle, AlertTriangle, TrendingUp } from "lucide-react";
import {
  fetchInventory,
  createInventory,
  updateInventory,
  deleteInventory,
  fetchProducts,
} from "../services/dataService";

const initialInventoryState = {
  product_id: "",
  stock_quantity: 0,
  reorder_level: 0,
  max_stock_level: "",
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

const panel = {
  background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
  border: `1px solid ${T.border}`,
  borderRadius: 16,
  boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
};

function InventoryModule({ onBack }) {
  const [inventoryRecords, setInventoryRecords] = useState([]);
  const [products, setProducts] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [formData, setFormData] = useState(initialInventoryState);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const getProductName = (productId) => productId.product_name || "Unknown Product";

  const updateAvailableProducts = (allProducts, currentInventory) => {
    const productIdsWithInventory = new Set(currentInventory.map((inv) => inv.product_id._id));
    setAvailableProducts(allProducts.filter((p) => !productIdsWithInventory.has(p._id)));
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [inventoryData, productData] = await Promise.all([fetchInventory(), fetchProducts()]);
      setInventoryRecords(inventoryData);
      setProducts(productData);
      updateAvailableProducts(productData, inventoryData);
    } catch (err) {
      setError(`Failed to fetch data: ${err.message}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? "" : Number(value)) : value,
    }));
  };

  const handleEdit = (record) => {
    setEditingId(record._id);
    setFormData({
      ...record,
      product_id: record.product_id._id,
      max_stock_level: record.max_stock_level === null ? "" : record.max_stock_level,
    });
    setMessage(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData(initialInventoryState);
    setMessage(null);
    setError(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this inventory record?")) return;
    try {
      await deleteInventory(id);
      setMessage("Inventory record deleted successfully.");
      fetchData();
    } catch (err) {
      setError(`Deletion failed: ${err.message}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const dataToSend = { ...formData };
    if (dataToSend.max_stock_level === "") dataToSend.max_stock_level = null;
    dataToSend.stock_quantity = Number(dataToSend.stock_quantity);
    dataToSend.reorder_level = Number(dataToSend.reorder_level);
    try {
      if (editingId) {
        await updateInventory(editingId, dataToSend);
        setMessage(`Inventory record updated successfully.`);
      } else {
        await createInventory(dataToSend);
        setMessage("Inventory record created successfully.");
      }
      handleCancel();
      fetchData();
    } catch (err) {
      setError(`Operation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderForm = () => (
    <div style={{ ...panel, padding: 24, marginBottom: 24 }}>
      <h3 style={{ margin: "0 0 20px 0", color: T.text, fontSize: 16, fontWeight: 700 }}>
        {editingId ? "Edit Inventory Record" : "Create New Inventory Record"}
      </h3>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>

        {/* Product Select */}
        <div>
          <label style={labelStyle}>Product *</label>
          <select
            name="product_id"
            value={formData.product_id}
            onChange={handleChange}
            required
            disabled={!!editingId}
            style={{
              ...inputStyle,
              opacity: editingId ? 0.6 : 1,
              cursor: editingId ? "not-allowed" : "pointer",
            }}
          >
            <option value="">Select Product</option>
            {editingId && (
              <option key={formData.product_id} value={formData.product_id}>
                (Current) {getProductName(inventoryRecords.find((r) => r._id === editingId)?.product_id || {})}
              </option>
            )}
            {availableProducts.map((p) => (
              <option key={p._id} value={p._id}>{p.product_name}</option>
            ))}
          </select>
          {editingId && (
            <div style={{ marginTop: 4, fontSize: 12, color: T.textDim }}>
              Product cannot be changed when editing.
            </div>
          )}
        </div>

        {/* Stock, Reorder, Max */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Stock Quantity *</label>
            <input
              name="stock_quantity"
              type="number"
              placeholder="0"
              value={formData.stock_quantity}
              onChange={handleChange}
              required
              min="0"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Reorder Level *</label>
            <input
              name="reorder_level"
              type="number"
              placeholder="0"
              value={formData.reorder_level}
              onChange={handleChange}
              required
              min="0"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Max Stock Level</label>
            <input
              name="max_stock_level"
              type="number"
              placeholder="Optional"
              value={formData.max_stock_level}
              onChange={handleChange}
              min="0"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button
            type="submit"
            disabled={loading || (!editingId && !formData.product_id)}
            style={{
              ...btn,
              flexGrow: 1,
              justifyContent: "center",
              padding: "10px 16px",
              border: "none",
              color: "white",
              background: editingId
                ? "linear-gradient(180deg, #b45309, #f59e0b)"
                : `linear-gradient(180deg, ${T.brand}, ${T.brandAlt})`,
              opacity: (!editingId && !formData.product_id) ? 0.5 : 1,
            }}
          >
            {loading ? "Processing..." : editingId ? "Update Record" : "Create Record"}
          </button>
          {editingId && (
            <button type="button" onClick={handleCancel} disabled={loading} style={{ ...btn, padding: "10px 16px" }}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );

  const renderTable = () => (
    <div style={{ overflowX: "auto", borderRadius: 12, border: `1px solid ${T.border}` }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "rgba(255,255,255,0.03)" }}>
            {[
              { label: "Product", align: "left" },
              { label: "Stock", align: "right" },
              { label: "Reorder Level", align: "right" },
              { label: "Max Stock", align: "right" },
              { label: "Record ID", align: "left" },
              { label: "Actions", align: "left" },
            ].map((h) => (
              <th key={h.label} style={{
                padding: "12px 14px",
                textAlign: h.align,
                color: T.textDim,
                fontWeight: 600,
                borderBottom: `1px solid ${T.border}`,
              }}>
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {inventoryRecords.map((record) => {
            const isLowStock = record.stock_quantity <= record.reorder_level;
            const isOverStock = record.max_stock_level !== null && record.stock_quantity > record.max_stock_level;
            const productName = getProductName(record.product_id);

            return (
              <tr key={record._id} style={{ borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                <td style={{ padding: "12px 14px" }}>
                  <div style={{ fontWeight: 700, color: T.text }}>{productName}</div>
                  {isLowStock && (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      marginTop: 4, padding: "2px 8px", borderRadius: 999,
                      fontSize: 11, fontWeight: 700,
                      background: "rgba(239,68,68,0.15)", color: T.danger,
                    }}>
                      <AlertTriangle size={10} /> LOW STOCK
                    </span>
                  )}
                  {isOverStock && !isLowStock && (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      marginTop: 4, padding: "2px 8px", borderRadius: 999,
                      fontSize: 11, fontWeight: 700,
                      background: "rgba(245,158,11,0.15)", color: T.warn,
                    }}>
                      <TrendingUp size={10} /> OVER STOCK
                    </span>
                  )}
                </td>
                <td style={{
                  padding: "12px 14px", textAlign: "right", fontWeight: 700,
                  color: isLowStock ? T.danger : isOverStock ? T.warn : T.ok,
                }}>
                  {record.stock_quantity}
                </td>
                <td style={{ padding: "12px 14px", textAlign: "right", color: T.text }}>
                  {record.reorder_level}
                </td>
                <td style={{ padding: "12px 14px", textAlign: "right", color: T.textDim }}>
                  {record.max_stock_level === null ? "N/A" : record.max_stock_level}
                </td>
                <td style={{ padding: "12px 14px", fontSize: 11, color: T.textDim }}>
                  {record._id}
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => handleEdit(record)} style={btnWarn}>
                      <Pencil size={13} /> Edit
                    </button>
                    <button onClick={() => handleDelete(record._id)} style={btnDanger}>
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={{ padding: "20px" }}>
      <h2 style={{ display: "flex", alignItems: "center", gap: 8, color: T.text, marginBottom: 16 }}>
        <BarChart2 size={22} />
        Inventory Management
      </h2>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button
          onClick={onBack}
          disabled={loading}
          style={{ ...btn, backgroundColor: "#6c757d", color: "white", border: "none" }}
        >
          <ArrowLeft size={15} />
          Back to Dashboard
        </button>
        <button onClick={fetchData} disabled={loading} style={btn}>
          <RefreshCw size={15} />
          Refresh Data
        </button>
      </div>

      {message && (
        <p style={{ display: "flex", alignItems: "center", gap: 6, color: T.ok, fontWeight: "bold", marginBottom: 12 }}>
          <CheckCircle size={16} /> {message}
        </p>
      )}
      {error && (
        <p style={{ display: "flex", alignItems: "center", gap: 6, color: T.danger, fontWeight: "bold", marginBottom: 12 }}>
          <XCircle size={16} /> {error}
        </p>
      )}

      {renderForm()}
      {loading && <p style={{ color: T.textDim }}>Loading inventory data...</p>}

      <h3 style={{ color: T.text, marginBottom: 12 }}>
        Current Inventory Records ({inventoryRecords.length})
      </h3>
      {inventoryRecords.length > 0 && renderTable()}
      {inventoryRecords.length === 0 && !loading && (
        <p style={{ color: T.textDim }}>No inventory records found. Start by creating one above.</p>
      )}
    </div>
  );
}

export default InventoryModule;