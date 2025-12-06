// src/App.jsx  (recommended: remove the wrong import)
import React, { useEffect, useState } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import CustomerDashboard from "./components/CustomerDashboard";
import AdminDashboard from "./components/AdminDashboard";
import { logout, getAdminMe, getCustomerMe } from "./services/authService";
// ❌ import "./styles.css";  // remove this line

function App() {
  const [currentView, setCurrentView] = useState("login");
  const [role, setRole] = useState("guest");
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const probe = async () => {
      try {
        if (localStorage.getItem("adminToken")) {
          const me = await getAdminMe(); setRole("admin"); setUser(me); return;
        }
        if (localStorage.getItem("customerToken")) {
          const me = await getCustomerMe(); setRole("customer"); setUser(me); return;
        }
        setRole("guest");
      } catch { setRole("guest"); setUser(null); }
      finally { setChecking(false); }
    };
    probe();
  }, []);

  const isLoggedIn = role !== "guest";
  const handleLogout = () => { logout(); setRole("guest"); setUser(null); setCurrentView("login"); };

  return (
    <div>
      <header className="header">
        <div className="header__inner">
          <div className="brand">E-Commerce App</div>
          <div className="header__right">
            {isLoggedIn && <span className="pill">Logged in as: <b>{role.toUpperCase()}</b></span>}
            {isLoggedIn ? (
              <button className="btn btn--danger" onClick={handleLogout}>Logout</button>
            ) : (
              <button
                className="btn btn--ghost"
                onClick={() => setCurrentView(currentView === "login" ? "register" : "login")}
              >
                {currentView === "login" ? "Go to Register" : "Go to Login"}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="container">
        {checking ? (
          <p className="note">Checking session…</p>
        ) : !isLoggedIn ? (
          currentView === "login" ? (
            <Login
              onSwitchToRegister={() => setCurrentView("register")}
              onLoggedIn={(nextRole, nextUser) => { setRole(nextRole); setUser(nextUser); }}
            />
          ) : (
            <Register onSwitchToLogin={() => setCurrentView("login")} />
          )
        ) : role === "admin" ? (
          <AdminDashboard user={user} />
        ) : (
          <CustomerDashboard user={user} />
        )}
      </main>
    </div>
  );
}
export default App;
