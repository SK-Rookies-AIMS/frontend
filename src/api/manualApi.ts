import { getStoredAccessToken } from "./authStorage"
import type { ManualApiResponse } from "@/types/manual"

const BASE_URL = "/api/ai"

export async function getCurrentManual(eventId?: string | number): Promise<ManualApiResponse> {
  const token = getStoredAccessToken()

  if (!token) {
    throw new Error("Login token is missing.")
  }

  const url = new URL(`${BASE_URL}/manual`, window.location.origin)
  if (eventId !== undefined && eventId !== null && String(eventId).trim() !== "") {
    url.searchParams.set("eventId", String(eventId))
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const text = await response.text()

  if (!response.ok) {
    throw new Error(`Failed to fetch AI manual (${response.status}): ${text}`)
  }

  return text ? (JSON.parse(text) as ManualApiResponse) : ({} as ManualApiResponse)
}
