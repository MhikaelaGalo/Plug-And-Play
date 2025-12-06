import React, { useState } from "react";
import { registerCustomer, registerAdmin } from "../services/authService";

function Register({ onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    full_name: "",
    phone: "",
    address: "",
    role: "customer",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let next = { ...formData, [name]: value };
    if (name === "role") {
      if (value === "customer") next.full_name = "";
      else if (value === "admin") {
        next.first_name = "";
        next.last_name = "";
        next.phone = "";
        next.address = "";
      }
    }
    setFormData(next);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      if (formData.role === "customer") {
        const { username, email, password, first_name, last_name, phone, address } = formData;
        if (!username || !email || !password || !first_name || !last_name) {
          throw new Error("All required customer fields must be filled.");
        }
        await registerCustomer({ username, email, password, first_name, last_name, phone, address });
        setMessage("Customer registration successful! You can now log in.");
      } else {
        const { username, email, password, full_name } = formData;
        if (!username || !email || !password) {
          throw new Error("Username, email, and password are required for Admin.");
        }
        await registerAdmin({ username, email, password, full_name, role: "admin" });
        setMessage("Admin registration successful! You can now log in.");
      }
      setTimeout(() => onSwitchToLogin(), 1000);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || error.message || "Registration failed.";
      setMessage(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const isCustomer = formData.role === "customer";

  return (
    <div
      style={{
        maxWidth: "450px",
        margin: "50px auto",
        padding: "20px",
        border: "1px solid #ccc",
        borderRadius: "8px",
      }}
    >
      <h2>{isCustomer ? "Customer Registration" : "Admin Registration"}</h2>

      <div style={{ marginBottom: "15px" }}>
        <label>Register As:</label>
        <select
          name="role"
          value={formData.role}
          onChange={handleChange}
          style={{ padding: "8px", marginLeft: "10px" }}
        >
          <option value="customer">Customer</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <form onSubmit={handleRegister}>
        <input
          name="username"
          type="text"
          placeholder="Username *"
          value={formData.username}
          onChange={handleChange}
          required
          style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
        />
        <input
          name="email"
          type="email"
          placeholder="Email *"
          value={formData.email}
          onChange={handleChange}
          required
          style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
        />
        <input
          name="password"
          type="password"
          placeholder="Password *"
          value={formData.password}
          onChange={handleChange}
          required
          style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
        />

        {isCustomer && (
          <>
            <input
              name="first_name"
              type="text"
              placeholder="First Name *"
              value={formData.first_name}
              onChange={handleChange}
              required
              style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
            />
            <input
              name="last_name"
              type="text"
              placeholder="Last Name *"
              value={formData.last_name}
              onChange={handleChange}
              required
              style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
            />
            <input
              name="phone"
              type="text"
              placeholder="Phone (Optional)"
              value={formData.phone}
              onChange={handleChange}
              style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
            />
            <input
              name="address"
              type="text"
              placeholder="Address (Optional)"
              value={formData.address}
              onChange={handleChange}
              style={{ width: "100%", padding: "8px", marginBottom: "20px" }}
            />
          </>
        )}

        {!isCustomer && (
          <input
            name="full_name"
            type="text"
            placeholder="Full Name (Optional)"
            value={formData.full_name}
            onChange={handleChange}
            style={{ width: "100%", padding: "8px", marginBottom: "20px" }}
          />
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 15px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          {loading ? "Processing..." : "Register Account"}
        </button>
      </form>

      <p style={{ marginTop: "15px" }}>
        Already have an account?
        <button
          onClick={onSwitchToLogin}
          style={{
            marginLeft: "10px",
            background: "none",
            border: "none",
            color: "#007bff",
            cursor: "pointer",
          }}
        >
          Login here
        </button>
      </p>

      {message && (
        <p
          style={{
            marginTop: "15px",
            color: message.startsWith("Error") ? "red" : "green",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}

export default Register;