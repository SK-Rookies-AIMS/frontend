import { ManualResponse } from "@/types/manual"

const BASE_URL = "http://localhost:8000"

export async function getCurrentManual(
  eventId: number
): Promise<ManualResponse> {

  const response = await fetch(
    `${BASE_URL}/manual/current/${eventId}`
  )

  if (!response.ok) {
    throw new Error("AI Manual 조회 실패")
  }

  return response.json()
}