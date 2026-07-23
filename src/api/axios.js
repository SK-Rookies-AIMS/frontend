import axios from "axios";

const api = axios.create({
  baseURL: "",
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("aims-auth-accessToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;