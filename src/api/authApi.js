import api from "./axios";

export const loginApi = async (loginData) => {
  const response = await api.post(
    "/api/auth/login", loginData
  );

  return response.data;
};