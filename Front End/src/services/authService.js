import api from "./api";

const CUSTOMER_BASE = "/customers";
const ADMIN_BASE = "/admin";

// Customer
export async function registerCustomer(payload) {
  const { data } = await api.post(`${CUSTOMER_BASE}/register`, payload);
  return data;
}
export async function loginCustomer(credentials) {
  const { data } = await api.post(`${CUSTOMER_BASE}/login`, credentials);
  localStorage.setItem("customerToken", data.token);
  return data.customer;
}
export async function getCustomerMe() {
  const { data } = await api.get(`${CUSTOMER_BASE}/me`);
  return data;
}

// Admin
export async function registerAdmin(payload) {
  const { data } = await api.post(`${ADMIN_BASE}/register`, payload);
  return data;
}
export async function loginAdmin(credentials) {
  const { data } = await api.post(`${ADMIN_BASE}/login`, credentials);
  localStorage.setItem("adminToken", data.token);
  return data.admin;
}
export async function getAdminMe() {
  const { data } = await api.get(`${ADMIN_BASE}/me`);
  return data;
}

// Shared
export function logout() {
  localStorage.removeItem("customerToken");
  localStorage.removeItem("adminToken");
}