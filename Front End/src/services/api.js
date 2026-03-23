// src/services/api.js
import axios from "axios";

// Get the base URL from the frontend's .env file (VITE_API_BASE_URL=http://localhost:2141/api)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 1. Create an Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// 2. Interceptor to inject the JWT token
api.interceptors.request.use(
  (config) => {
    // Check for Admin or Customer token
    const token =
      localStorage.getItem("adminToken") ||
      localStorage.getItem("customerToken");

    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 3. Interceptor for global error handling (401, 403)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403)
    ) {
      console.error("Authentication error: Token expired or unauthorized.");
      localStorage.clear();
      // In a real app, you would use React Router here to navigate('/login')
    }
    return Promise.reject(error);
  }
);

export default api;
