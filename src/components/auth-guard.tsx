"use client"

import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"

/**
 * 데모용 인증 게이트.
 * 로그인 시 sessionStorage에 설정한 플래그를 확인하고,
 * 없으면 로그인 페이지로 리다이렉트한다.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
    const [checked, setChecked] = useState(false)

  
  const authed = sessionStorage.getItem("aims-auth-accessToken") !== null
  if (!authed) return <Navigate to="/login" replace />
  return <>{children}</>
}
