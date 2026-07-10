const BASE_URL = "/api/ai"

export async function getCurrentManual() {
    const token = sessionStorage.getItem("aims-auth-accessToken")

    if (!token) {
        throw new Error("Login token is missing.")
    }

    const response = await fetch("/api/ai/manual", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    })

    const response = await fetch(
        `${BASE_URL}/manual`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error("Failed to fetch AI manual")
    }

    return response.json()
}