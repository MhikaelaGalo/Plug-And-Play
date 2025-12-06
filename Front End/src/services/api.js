import axios from "axios";

// Use .env value; fall back to dev default for convenience.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:2141/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Inject JWT for both admin/customer tokens
api.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("adminToken") || localStorage.getItem("customerToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalize auth failures
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response && [401, 403].includes(err.response.status)) {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("customerToken");
    }
    return Promise.reject(err);
  }
);

export default api;