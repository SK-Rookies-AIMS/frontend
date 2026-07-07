import type { ManualApiResponse } from "@/types/manual"

const BASE_URL = "http://localhost:8000"

export async function getCurrentManual(
  userId: number
): Promise<ManualApiResponse> {
  const response = await fetch(
    `${BASE_URL}/manual/${userId}`
  )

  if (!response.ok) {
    throw new Error("AI Manual 조회 실패")
  }

  return response.json()
}