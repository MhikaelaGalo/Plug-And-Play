// src/services/adminService.js
import api from "./api"; // Assumes you have an api.js with an Axios interceptor for tokens

const CATEGORIES_URL = "/categories";
const PRODUCTS_URL = "/products";
const SUPPLIERS_URL = "/suppliers";
const ORDERS_URL = "/orders";
const ADMIN_ME_URL = "/admin/me";

// --- ADMIN PROFILE ---

// GET /api/admin/me
export async function getAdminProfile() {
  const response = await api.get(ADMIN_ME_URL);
  return response.data; // Expects admin user object
}

// --- CATEGORIES API CALLS ---

// GET /api/categories (Admin can see all, including inactive, but we filter in dashboard)
export async function getCategories() {
  const response = await api.get(CATEGORIES_URL);
  return response.data;
}

// POST /api/categories
export async function createCategory(data) {
  const response = await api.post(CATEGORIES_URL, data);
  return response.data;
}

// DELETE /api/categories/:id (Soft Delete)
export async function softDeleteCategory(id) {
  const response = await api.delete(`${CATEGORIES_URL}/${id}`);
  return response.data;
}

// --- PRODUCTS API CALLS ---

// GET /api/products
export async function getProducts() {
  const response = await api.get(PRODUCTS_URL);
  return response.data;
}

// POST /api/products
export async function createProduct(data) {
  const response = await api.post(PRODUCTS_URL, data);
  return response.data;
}

// DELETE /api/products/:id (Soft Delete)
export async function softDeleteProduct(id) {
  const response = await api.delete(`${PRODUCTS_URL}/${id}`);
  return response.data;
}

// --- SUPPLIERS API CALLS ---

// GET /api/suppliers
export async function getSuppliers() {
  const response = await api.get(SUPPLIERS_URL);
  return response.data;
}

// POST /api/suppliers
export async function createSupplier(data) {
  const response = await api.post(SUPPLIERS_URL, data);
  return response.data;
}

// DELETE /api/suppliers/:id (Soft Delete)
export async function softDeleteSupplier(id) {
  const response = await api.delete(`${SUPPLIERS_URL}/${id}`);
  return response.data;
}

// --- ORDERS API CALLS ---

// GET /api/orders (Admin can read all orders)
export async function getAllOrders() {
  const response = await api.get(ORDERS_URL);
  return response.data;
}

// PUT /api/orders/:id (Admin can update order status)
export async function updateOrder(id, data) {
  const response = await api.put(`${ORDERS_URL}/${id}`, data);
  return response.data;
}
