const BASE_URL = "/api/ai"

export async function getCurrentManual() {
    const token = sessionStorage.getItem("aims-auth-accessToken");

    if (!token) {
        return null;
    }

    const response = await fetch(
        `${BASE_URL}/manual`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    if (response.status === 404) {
        return null;
    }

    if (!response.ok) {
        console.warn(
            `AI Manual 조회 실패 (${response.status})`
        );
        return null;
    }

    return response.json();
}