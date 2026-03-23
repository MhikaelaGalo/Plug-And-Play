// src/components/CategoriesModule.jsx
import React, { useState, useEffect } from "react";
import {
  Folder,
  ArrowLeft,
  Pencil,
  Trash2,
  XCircle,
  CheckCircle,
} from "lucide-react";
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../services/dataService";

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

const btnPrimary = {
  ...btn,
  background: `linear-gradient(180deg, ${T.brand}, ${T.brandAlt})`,
  border: "none",
  color: "white",
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
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
  border: `1px solid ${T.border}`,
  borderRadius: 16,
  boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
};

const styles = {
  button: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "10px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    color: "white",
    fontWeight: 600,
    fontSize: 13,
  },
};

function CategoriesModule({ onBack }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [formData, setFormData] = useState({
    category_name: "",
    description: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  const loadCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      if (isEditing) {
        await updateCategory(currentId, formData);
        setSuccessMsg("Category updated successfully!");
      } else {
        await createCategory(formData);
        setSuccessMsg("Category created successfully!");
      }
      setFormData({ category_name: "", description: "" });
      setIsEditing(false);
      setCurrentId(null);
      await loadCategories();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category) => {
    setFormData({
      category_name: category.category_name,
      description: category.description,
    });
    setIsEditing(true);
    setCurrentId(category._id);
    setSuccessMsg(null);
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to soft-delete this category?"))
      return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await deleteCategory(id);
      setSuccessMsg("Category deleted successfully!");
      await loadCategories();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setFormData({ category_name: "", description: "" });
    setIsEditing(false);
    setCurrentId(null);
  };

  return (
    <div style={{ padding: "20px", maxWidth: "860px", margin: "0 auto" }}>
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
        <Folder size={22} />
        Category Management
      </h2>

      {/* Back button */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={onBack}
          style={{ ...styles.button, backgroundColor: "#6c757d" }}
          disabled={loading}
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
          {isEditing ? "Edit Category" : "Create New Category"}
        </h3>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
          <div>
            <label style={labelStyle}>Category Name *</label>
            <input
              type="text"
              name="category_name"
              placeholder="e.g. Electronics"
              value={formData.category_name}
              onChange={handleChange}
              required
              style={inputStyle}
              disabled={loading}
            />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              name="description"
              placeholder="Optional description..."
              value={formData.description}
              onChange={handleChange}
              style={{ ...inputStyle, resize: "vertical", minHeight: 80 }}
              disabled={loading}
            />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                ...btnPrimary,
                flexGrow: 1,
                justifyContent: "center",
                padding: "10px 16px",
                background: isEditing
                  ? "linear-gradient(180deg, #b45309, #f59e0b)"
                  : `linear-gradient(180deg, ${T.brand}, ${T.brandAlt})`,
              }}
            >
              {loading
                ? "Processing..."
                : isEditing
                  ? "Save Changes"
                  : "Create Category"}
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

      {/* Category List */}
      <h3 style={{ color: T.text, marginBottom: 12 }}>
        Category List ({categories.length} Total)
      </h3>
      {loading && <p style={{ color: T.textDim }}>Loading categories...</p>}

      <div style={{ ...panel, overflow: "hidden" }}>
        {categories.length === 0 && !loading ? (
          <div style={{ padding: 20, color: T.textDim }}>
            No categories found.
          </div>
        ) : (
          categories.map((category, index) => (
            <div
              key={category._id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 20px",
                borderBottom:
                  index < categories.length - 1
                    ? `1px solid ${T.border}`
                    : "none",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: T.text }}>
                  {category.category_name}
                </div>
                <div style={{ fontSize: 12, color: T.textDim, marginTop: 3 }}>
                  ID: {category._id} &nbsp;•&nbsp;
                  <span style={{ color: category.is_active ? T.ok : T.danger }}>
                    {category.is_active ? "Active" : "Soft-deleted"}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => handleEdit(category)}
                  style={btnWarn}
                  disabled={loading}
                >
                  <Pencil size={13} /> Edit
                </button>
                <button
                  onClick={() => handleDelete(category._id)}
                  style={btnDanger}
                  disabled={loading}
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default CategoriesModule;
