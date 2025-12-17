import axios from "axios";

const backendURL = import.meta.env.VITE_BACKEND_URL || "http://localhost:7777/";

const api = axios.create({
  baseURL: backendURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
});

export default api;
