"use client"

import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const [checked, setChecked] = useState(false)

  
  const authed = sessionStorage.getItem("aims-auth-accessToken") !== null
  if (!authed) return <Navigate to="/login" replace />
  return <>{children}</>
}
