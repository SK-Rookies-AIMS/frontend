const BASE_URL = "http://127.0.0.1:8083/api/quality/inspection"

async function request(url: string) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`)
  }

  return response.json()
}

export async function fetchInspectionProcess() {
  return request(`${BASE_URL}/process`)
}

export async function fetchInspectionSummary() {
  return request(`${BASE_URL}/summary`)
}

export async function fetchRiskHistory() {
  return request(`${BASE_URL}/risk-history`)
}

export async function fetchRiskTrend(range: string) {
  return request(
    `${BASE_URL}/risk-trend?range=${encodeURIComponent(range)}`
  )
}

export async function fetchStatusDetail() {
  return request(`${BASE_URL}/status-detail`)
}

export async function fetchDriveDetail() {
  return request(`${BASE_URL}/drive-detail`)
}