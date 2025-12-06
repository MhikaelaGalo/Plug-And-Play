// FILE: src/components/Login.jsx  (styled + robust)
import React, { useState } from "react";
import {
  loginCustomer,
  loginAdmin,
  getAdminMe,
  getCustomerMe,
} from "../services/authService";

function Login({ onSwitchToRegister, onLoggedIn }) {
  const [identifier, setIdentifier] = useState(""); // email or username
  const [password, setPassword] = useState("");
  const [isCustomer, setIsCustomer] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setMessage("");
    setBusy(true);
    try {
      if (isCustomer) {
        // Backend accepts usernameOrEmail OR email now
        await loginCustomer({ usernameOrEmail: identifier, password });
        const me = await getCustomerMe();
        if (onLoggedIn) onLoggedIn("customer", me);
        else window.location.reload(); // fallback for older App.jsx
        setMessage(`Customer login successful! Welcome, ${me.username}`);
      } else {
        await loginAdmin({ usernameOrEmail: identifier, password });
        const me = await getAdminMe();
        if (onLoggedIn) onLoggedIn("admin", me);
        else window.location.reload();
        setMessage(`Admin login successful! Welcome, ${me.username}`);
      }
    } catch (error) {
      const errorMessage =
        error?.response?.data?.message || error.message || "Login failed.";
      setMessage(`Error: ${errorMessage}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 480, margin: "40px auto" }}>
      <div className="row">
        <h2 className="section-title" style={{ margin: 0 }}>
          {isCustomer ? "Customer Login" : "Admin Login"}
        </h2>
        <button
          className="btn btn--subtle right"
          onClick={() => setIsCustomer(!isCustomer)}
        >
          Switch to {isCustomer ? "Admin" : "Customer"}
        </button>
      </div>

      <form className="form mt-2" onSubmit={handleLogin}>
        <input
          className="input"
          placeholder="Email or Username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />
        <input
          className="input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Logging in…" : "Log In"}
        </button>
      </form>

      <p className="note mt-2">
        Don’t have an account?
        <button className="btn btn--ghost" style={{ marginLeft: 8 }} onClick={onSwitchToRegister}>
          Register
        </button>
      </p>

      {message && (
        <p
          className="mt-2"
          style={{
            color: message.startsWith("Error") ? "var(--danger)" : "var(--success)",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}

export default Login;

