// src/components/ProductsModule.jsx

import React, { useState, useEffect } from "react";
import {
  Package,
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  XOctagon,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  fetchCategories,
  fetchSuppliers,
} from "../services/dataService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL.replace("/api", "");

const initialProductState = {
  product_name: "",
  description: "",
  category_id: "",
  supplier_id: "",
  unit_price: "",
  cost_price: "",
  is_active: true,
  brand: "",
  model: "",
  specs: {},
  tags: [],
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

const fieldGroup = (cols = "1fr") => ({
  display: "grid",
  gridTemplateColumns: cols,
  gap: 12,
});

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

const btnPrimary = {
  ...btn,
  background: `linear-gradient(180deg, ${T.brand}, ${T.brandAlt})`,
  border: "none",
};

const btnDanger = {
  ...btn,
  background: "rgba(239,68,68,0.12)",
  border: "1px solid rgba(239,68,68,0.25)",
  color: T.danger,
};

const btnWarn = {
  ...btn,
  background: "rgba(245,158,11,0.12)",
  border: "1px solid rgba(245,158,11,0.25)",
  color: T.warn,
};

const panel = {
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
  border: `1px solid ${T.border}`,
  borderRadius: 16,
  boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
};

function ProductsModule({ onBack }) {
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState(initialProductState);
  const [imageFile, setImageFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [productData, categoryData, supplierData] = await Promise.all([
        fetchProducts(),
        fetchCategories(),
        fetchSuppliers(),
      ]);
      setProducts(productData);
      setCategories(categoryData);
      setSuppliers(supplierData);
    } catch (err) {
      setError(`Failed to fetch data: ${err.message}.`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSpecsChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      specs: { ...prev.specs, [name]: value },
    }));
  };

  const handleTagsChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      tags: e.target.value.split(",").map((t) => t.trim()),
    }));
  };

  const handleFileChange = (e) => {
    setImageFile(e.target.files[0] || null);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (editingId) {
      setFormData((prev) => ({ ...prev, image_url: null, remove_image: true }));
    }
  };

  const handleEdit = (product) => {
    setEditingId(product._id);
    setFormData({
      ...product,
      category_id: product.category_id?._id || product.category_id || "",
      supplier_id: product.supplier_id?._id || product.supplier_id || "",
      tags: Array.isArray(product.tags) ? product.tags.join(", ") : "",
      unit_price: String(product.unit_price || ""),
      cost_price: String(product.cost_price || ""),
      image_url: product.image_url || null,
    });
    setImageFile(null);
    setMessage(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData(initialProductState);
    setImageFile(null);
    setMessage(null);
    setError(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?"))
      return;
    try {
      await deleteProduct(id);
      setMessage("Product deleted successfully.");
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
    const dataToSend = {};
    for (const key in formData) {
      if (key !== "image_url") dataToSend[key] = formData[key];
    }
    if (editingId && dataToSend.remove_image) {
      dataToSend.remove_image = String(dataToSend.remove_image);
    } else {
      delete dataToSend.remove_image;
    }
    try {
      if (editingId) {
        await updateProduct(editingId, dataToSend, imageFile);
        setMessage(`Product updated successfully.`);
      } else {
        await createProduct(dataToSend, imageFile);
        setMessage("Product created successfully.");
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
      <h3
        style={{
          margin: "0 0 20px 0",
          color: T.text,
          fontSize: 16,
          fontWeight: 700,
        }}
      >
        {editingId ? "Edit Product" : "Create New Product"}
      </h3>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
        {/* Row 1: Name, Price, Cost */}
        <div style={fieldGroup("1fr 1fr 1fr")}>
          <div>
            <label style={labelStyle}>Product Name *</label>
            <input
              name="product_name"
              placeholder="e.g. Wireless Mouse"
              value={formData.product_name}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Unit Price *</label>
            <input
              name="unit_price"
              type="number"
              placeholder="0.00"
              value={formData.unit_price}
              onChange={handleChange}
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Cost Price</label>
            <input
              name="cost_price"
              type="number"
              placeholder="0.00"
              value={formData.cost_price}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Row 2: Category, Supplier */}
        <div style={fieldGroup("1fr 1fr")}>
          <div>
            <label style={labelStyle}>Category</label>
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.category_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Supplier</label>
            <select
              name="supplier_id"
              value={formData.supplier_id}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="">Select Supplier</option>
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.supplier_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: Description */}
        <div>
          <label style={labelStyle}>Description</label>
          <textarea
            name="description"
            placeholder="Product description..."
            value={formData.description}
            onChange={handleChange}
            style={{ ...inputStyle, resize: "vertical", minHeight: 80 }}
          />
        </div>

        {/* Row 4: Brand, Model */}
        <div style={fieldGroup("1fr 1fr")}>
          <div>
            <label style={labelStyle}>Brand</label>
            <input
              name="brand"
              placeholder="e.g. Logitech"
              value={formData.brand}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Model</label>
            <input
              name="model"
              placeholder="e.g. MX Master 3"
              value={formData.model}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Row 5: Tags + Active */}
        <div style={fieldGroup("3fr 1fr")}>
          <div>
            <label style={labelStyle}>Tags (comma separated)</label>
            <input
              name="tags"
              placeholder="e.g. electronics, wireless, input"
              value={formData.tags}
              onChange={handleTagsChange}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Status</label>
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
                style={{ accentColor: T.brand }}
              />
              Is Active
            </label>
          </div>
        </div>

        {/* Row 6: Image Upload */}
        <div>
          <label style={labelStyle}>Product Image</label>
          <div
            style={{
              border: `1px dashed rgba(255,255,255,0.15)`,
              borderRadius: 10,
              padding: 16,
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <input
              type="file"
              name="product_image"
              onChange={handleFileChange}
              accept="image/*"
              style={{
                display: "block",
                marginBottom: 10,
                color: T.textDim,
                fontSize: 13,
              }}
            />
            {(imageFile || formData.image_url) && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginTop: 8,
                }}
              >
                <img
                  src={
                    imageFile
                      ? URL.createObjectURL(imageFile)
                      : `${API_BASE_URL}${formData.image_url}`
                  }
                  alt="Preview"
                  style={{
                    width: 64,
                    height: 64,
                    objectFit: "cover",
                    borderRadius: 8,
                    border: `1px solid ${T.border}`,
                  }}
                />
                <div>
                  <div style={{ color: T.text, fontSize: 13, marginBottom: 6 }}>
                    {imageFile
                      ? imageFile.name
                      : formData.image_url?.split("/").pop()}
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    style={btnDanger}
                  >
                    <X size={13} />
                    {imageFile ? "Clear Selection" : "Remove Image"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Row 7: Specs */}
        <div>
          <label style={labelStyle}>Specifications</label>
          <div style={{ display: "flex", gap: 12 }}>
            <input
              name="weight"
              placeholder="Weight (kg)"
              value={formData.specs.weight || ""}
              onChange={handleSpecsChange}
              style={{ ...inputStyle }}
            />
            <input
              name="color"
              placeholder="Color"
              value={formData.specs.color || ""}
              onChange={handleSpecsChange}
              style={{ ...inputStyle }}
            />
          </div>
        </div>

        {/* Row 8: Actions */}
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              ...btnPrimary,
              flexGrow: 1,
              justifyContent: "center",
              padding: "10px 16px",
              background: editingId
                ? "linear-gradient(180deg, #b45309, #f59e0b)"
                : `linear-gradient(180deg, ${T.brand}, ${T.brandAlt})`,
            }}
          >
            {loading
              ? "Processing..."
              : editingId
                ? "Update Product"
                : "Create Product"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              style={{ ...btn, padding: "10px 16px" }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );

  const renderTable = () => (
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
            {[
              "Image",
              "Name / ID",
              "Price / Cost",
              "Category / Supplier",
              "Status",
              "Actions",
            ].map((h) => (
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
          {products.map((p) => (
            <tr
              key={p._id}
              style={{ borderBottom: `1px solid rgba(255,255,255,0.05)` }}
            >
              <td style={{ padding: "12px 14px" }}>
                {p.image_url ? (
                  <img
                    src={`${API_BASE_URL}${p.image_url}`}
                    alt={p.product_name}
                    style={{
                      width: 48,
                      height: 48,
                      objectFit: "cover",
                      borderRadius: 8,
                      border: `1px solid ${T.border}`,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.05)",
                      border: `1px solid ${T.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Package size={18} color={T.textDim} />
                  </div>
                )}
              </td>
              <td style={{ padding: "12px 14px", color: T.text }}>
                <div style={{ fontWeight: 700 }}>{p.product_name}</div>
                <div style={{ color: T.textDim, fontSize: 11, marginTop: 2 }}>
                  ID: {p._id}
                </div>
              </td>
              <td style={{ padding: "12px 14px", color: T.text }}>
                <div>
                  Unit:{" "}
                  <span style={{ color: T.ok, fontWeight: 600 }}>
                    ${p.unit_price}
                  </span>
                </div>
                <div style={{ color: T.textDim, marginTop: 2 }}>
                  Cost: ${p.cost_price || "N/A"}
                </div>
              </td>
              <td style={{ padding: "12px 14px", color: T.text }}>
                <div>
                  {p.category_id?.category_name || (
                    <span style={{ color: T.textDim }}>N/A</span>
                  )}
                </div>
                <div style={{ color: T.textDim, marginTop: 2 }}>
                  {p.supplier_id?.supplier_name || "N/A"}
                </div>
              </td>
              <td style={{ padding: "12px 14px" }}>
                <span
                  style={{
                    padding: "4px 10px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    background: p.is_active
                      ? "rgba(34,197,94,0.15)"
                      : "rgba(239,68,68,0.15)",
                    color: p.is_active ? T.ok : T.danger,
                  }}
                >
                  {p.is_active ? "ACTIVE" : "INACTIVE"}
                </span>
              </td>
              <td style={{ padding: "12px 14px" }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => handleEdit(p)} style={btnWarn}>
                    <Pencil size={13} /> Edit
                  </button>
                  <button onClick={() => handleDelete(p._id)} style={btnDanger}>
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={{ padding: "20px" }}>
      <h2
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: T.text,
          marginBottom: 16,
        }}
      >
        <Package size={22} />
        Product Management
      </h2>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
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
        <button onClick={fetchData} disabled={loading} style={btn}>
          <RefreshCw size={15} />
          Refresh Data
        </button>
      </div>

      {message && (
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
          <CheckCircle size={16} /> {message}
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
          <XOctagon size={16} /> {error}
        </p>
      )}

      {renderForm()}
      {loading && <p style={{ color: T.textDim }}>Loading products...</p>}

      <h3 style={{ color: T.text, marginBottom: 12 }}>
        Product List ({products.length})
      </h3>
      {products.length > 0 && renderTable()}
    </div>
  );
}

export default ProductsModule;
