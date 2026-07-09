export async function getCurrentManual() {
    const token = sessionStorage.getItem("aims-auth-accessToken");

    if (!token) {
        throw new Error("로그인 토큰이 없습니다.");
    }

    const response = await fetch(
        "http://localhost:8000/manual",
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error("AI Manual 조회 실패");
    }

    return response.json();
}