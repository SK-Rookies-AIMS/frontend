import axios from "axios"

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
    headers: { "Content-Type": "application/json" },
})

apiClient.interceptors.request.use(
    (config) => {
        const token = sessionStorage.getItem("aims-auth-accessToken")
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => Promise.reject(error)
)

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            sessionStorage.removeItem("aims-auth-accessToken")
            sessionStorage.removeItem("aims-auth-refreshToken")
            window.location.href = "/login"
            return Promise.reject(error)
        }

        const serverMessage = error.response?.data?.message
        if (serverMessage) {
            error.message = serverMessage
        }

        return Promise.reject(error)
    }
)

export default apiClient
