// src/components/Register.jsx
import React, { useState } from "react";
// 💡 FIX 1: Restore the correct import from the service file
import { registerAdmin } from "../services/authService";

// --- The temporary local 'registerAdmin' function and 'API_BASE_URL' have been REMOVED ---

// Initial state is simplified for Admin fields only
const initialFormData = {
  username: "",
  email: "",
  password: "",
  full_name: "", // Used for admin (optional field)
};

function Register({ onSwitchToLogin }) {
  const [formData, setFormData] = useState(initialFormData);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    setIsSuccess(false);

    try {
      const adminData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name || undefined,
      };

      // 2. Call the Admin registration service
      // Assuming registerAdmin returns { message, admin: { username, ... } }
      const result = await registerAdmin(adminData);

      // 💡 FIX 2: Check for the 'admin' object before reading its properties.
      // The backend 'admin.js' should return { admin: { username: '...' } }
      const newUsername = result.admin?.username || "New Admin";

      setMessage(
        `✅ Success! Admin account for '${newUsername}' created. Please login.`
      );
      setIsSuccess(true);
      setFormData(initialFormData);

      setTimeout(onSwitchToLogin, 3000);
    } catch (err) {
      // 💡 FIX 3: Improve error message extraction
      // If the error comes from an Axios/fetch wrapper in authService,
      // the message is usually on the error object itself.
      let errorMessage =
        err.message || "Registration failed due to an unknown error.";

      // If the error object has a response (from Axios/fetch), try to get the server's error message
      if (err.response && err.response.data && err.response.data.message) {
        errorMessage = err.response.data.message;
      }

      setMessage(`❌ Registration Failed: ${errorMessage}`);
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "400px",
        margin: "50px auto",
        padding: "30px",
        border: "1px solid #ddd",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
      }}
    >
      <h2 style={{ textAlign: "center", marginBottom: "30px" }}>
        🔒 Admin Registration
      </h2>
      <form onSubmit={handleRegister}>
        {/* Username */}
        <input
          name="username"
          type="text"
          placeholder="Username (Required)"
          value={formData.username}
          onChange={handleChange}
          required
          style={{ width: "100%", padding: "8px", marginBottom: "20px" }}
        />

        {/* Email */}
        <input
          name="email"
          type="email"
          placeholder="Email (Required)"
          value={formData.email}
          onChange={handleChange}
          required
          style={{ width: "100%", padding: "8px", marginBottom: "20px" }}
        />

        {/* Password */}
        <input
          name="password"
          type="password"
          placeholder="Password (Required)"
          value={formData.password}
          onChange={handleChange}
          required
          style={{ width: "100%", padding: "8px", marginBottom: "20px" }}
        />

        {/* Admin Specific Field: Full Name */}
        <input
          name="full_name"
          type="text"
          placeholder="Full Name (Optional)"
          value={formData.full_name}
          onChange={handleChange}
          style={{ width: "100%", padding: "8px", marginBottom: "20px" }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 15px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            width: "100%",
          }}
        >
          {loading ? "Processing..." : "Register Admin"}
        </button>
      </form>

      <p style={{ marginTop: "15px", textAlign: "center" }}>
        Already have an account?
        <button
          onClick={onSwitchToLogin}
          style={{
            marginLeft: "10px",
            background: "none",
            border: "none",
            color: "#007bff",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Login here
        </button>
      </p>

      {message && (
        <p
          style={{
            marginTop: "15px",
            color: isSuccess ? "green" : "red",
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}

export default Register;
