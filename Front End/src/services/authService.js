// src/services/authService.js
import api from "./api";

const ADMIN_AUTH_BASE = "/admin"; // This resolves to /api/admin

// --- ADMIN FUNCTIONS ---

export async function registerAdmin(adminData) {
  // POST /api/admin/register
  const response = await api.post(`${ADMIN_AUTH_BASE}/register`, adminData);
  return response.data;
}

export async function loginAdmin(credentials) {
  // POST /api/admin/login
  const response = await api.post(`${ADMIN_AUTH_BASE}/login`, credentials);

  // Store the admin token and clear customer token for safety
  localStorage.setItem("adminToken", response.data.token);
  localStorage.removeItem("customerToken");
  return response.data.admin;
}

export async function getAdminInfo() {
  // GET /api/admin/me
  const response = await api.get(`${ADMIN_AUTH_BASE}/me`);
  return response.data;
}

export function logout() {
  // Clear only the admin token
  localStorage.removeItem("adminToken");
}

// NOTE: All customer functions (registerCustomer, loginCustomer, getCustomerInfo) are removed.
