import axios from "axios";

const backendURL = import.meta.env.VITE_BACKEND_URL || "http://localhost:7777/";

const api = axios.create({
  baseURL: backendURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("docquery_token");
    if (token) {
      config.headers.Cookie = `token=${token}`;
      if (!config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
