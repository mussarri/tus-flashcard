import axios from "axios";
import * as SecureStore from "expo-secure-store";

// TODO: Move to .env
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync("auth_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error fetching token", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle global error responses (e.g., 401 logout)
    if (error.response?.status === 401) {
      // Logic to clear token and redirect to login
    }
    return Promise.reject(error);
  },
);

export default api;
