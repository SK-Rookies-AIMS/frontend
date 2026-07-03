"use client"

import { useState, useEffect } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useTheme } from "@/components/theme-provider"
import { Home, Factory, ClipboardCheck, Sun, Moon, Clock, AlertTriangle, LogOut, RefreshCw } from "lucide-react"

import { getStoredAccessToken } from "@/api/authStorage"
import { decodeJwt } from "@/lib/jwt-utils"

import { jwtDecode } from "jwt-decode"

import UserProfileModal from "@/components/user/UserProfileModal"

interface JwtPayload {
  sub: string
  role: string
  empNo: number
  id: number
  name: string
  workExperience: number
  iat: number
  exp: number
}

interface HeaderProps {
  currentTime: Date
}

// 계정 역할 타입
type UserRole = "시니어" | "주니어"

// 역할별 스타일
const roleStyles: Record<string, { bg: string; text: string }> = {
  "시니어": { bg: "bg-primary/20", text: "text-primary" },
  "주니어": { bg: "bg-success/20", text: "text-success" },
  "ADMIN": { bg: "bg-destructive/20", text: "text-destructive" },
}

export function Header({ currentTime }: HeaderProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number>(0)

  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [userInfo, setUserInfo] = useState<JwtPayload | null>(null)
  
  // 로그인 사용자 정보
  const [currentUser, setCurrentUser] = useState({ name: "알수없음", role: "주니어" })

  useEffect(() => {
    const token = getStoredAccessToken()
    if (token) {
      const decoded = decodeJwt(token)
      if (decoded) {
        setCurrentUser({
          name: decoded.name || "사용자",
          role: decoded.role === "SENIOR" ? "시니어" : "주니어"
        })
      }
    }
  }, [])

  function handleUserClick() {
    const token = sessionStorage.getItem("aims-auth-accessToken")
    if (!token) return

    try {
      const decoded = jwtDecode<JwtPayload>(token)

      setUserInfo(decoded)

      setIsUserModalOpen(true)
    } catch (e) {
      console.error("JWT Decode 실패", e)
    }
  }
  // 세션 타이머
  useEffect(() => {
    const checkExpiry = () => {
      const token = sessionStorage.getItem("aims-auth-accessToken")
      if (!token) {
        setTimeLeft(0)
        return
      }

      const decoded = decodeJwt(token)
      if (!decoded || !decoded.exp) {
        setTimeLeft(0)
        return
      }

      const now = Math.floor(Date.now() / 1000)
      const remaining = decoded.exp - now
      setTimeLeft(remaining > 0 ? remaining : 0)
    }

    checkExpiry()
    const interval = setInterval(checkExpiry, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = () => {
    sessionStorage.removeItem("aims-auth-accessToken")
    sessionStorage.removeItem("aims-auth-refreshToken")
    navigate("/login", { replace: true })
  }

  const extendSession = async () => {
    try {
      const refreshToken = sessionStorage.getItem("aims-auth-refreshToken")
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      })
      const data = await response.json()
      if (data.success) {
        sessionStorage.setItem("aims-auth-accessToken", data.data.accessToken)
        alert("세션이 1시간 연장되었습니다.")
        window.location.reload()
      } else {
        alert("세션 연장에 실패했습니다. 다시 로그인해주세요.")
        handleLogout()
      }
    } catch (error) {
      console.error("세션 연장 오류:", error)
    }
  }

  const formatTimeLeft = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  // 클라이언트 사이드에서만 테마 아이콘 표시 (hydration 문제 방지)
  useEffect(() => {
    setMounted(true)
  }, [])

  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")
    const seconds = String(date.getSeconds()).padStart(2, "0")
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  const navItems = [
    { icon: <Home className="w-4 h-4" />, label: "메인", href: "/" },
    { icon: <Factory className="w-4 h-4" />, label: "제조", href: "/manufacturing" },
    { icon: <ClipboardCheck className="w-4 h-4" />, label: "검사", href: "/inspection" },
    { icon: <AlertTriangle className="w-4 h-4" />, label: "이벤트", href: "/events", hasNotification: true },
  ]

  const toggleTheme = () => {
    const currentTheme = resolvedTheme || theme
    setTheme(currentTheme === "dark" ? "light" : "dark")
  }

  // 현재 테마가 다크인지 확인 (mounted 후에만 정확한 값)
  const isDark = mounted ? (resolvedTheme || theme) === "dark" : true

  return (
    <>
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4">
      <div className="flex items-center gap-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/images/aims-logo-new.png"
            alt="AIMS Logo"
            width={48}
            height={48}
            className="rounded"
          />
          <div>
            <span className="text-xl font-bold text-primary">AIMS</span>
            <p className="text-[10px] text-muted-foreground -mt-1">Smart Factory</p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {item.icon}
                <span className="text-sm font-medium">{item.label}</span>
                {item.hasNotification && (
                  <span className="w-2 h-2 bg-destructive rounded-full" />
                )}
                {/* Active indicator underline */}
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span className="text-sm font-medium">테마</span>
        </button>
      </div>

      <div className="flex items-center gap-4">
        {/* Session Timer & Extend */}
        <div className="flex items-center gap-3 text-sm">
          <span className={`${timeLeft < 300 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
            세션 만료: {formatTimeLeft(timeLeft)}
          </span>
          <button
            onClick={extendSession}
            className="flex items-center gap-1 px-2 py-1 bg-secondary text-foreground rounded hover:bg-secondary/80 transition-colors"
            title="세션 연장"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="text-xs">연장</span>
          </button>
        </div>

        {/* User Profile */}
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={handleUserClick}
        >
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="currentColor">
              <circle cx="12" cy="8" r="4" />
              <path d="M20 21a8 8 0 00-16 0" />
            </svg>
          </div>
          <span className="text-sm font-medium">{currentUser.name}</span>
          <span className={`text-xs px-2 py-0.5 rounded ${roleStyles[currentUser.role].bg} ${roleStyles[currentUser.role].text}`}>
            {currentUser.role}
          </span>
        </div>

        {/* DateTime */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{formatDate(currentTime)}</span>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors"
          title="로그아웃"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">로그아웃</span>
        </button>
      </div>
    </header>
    <UserProfileModal
      open={isUserModalOpen}
      user={userInfo}
      onClose={() => setIsUserModalOpen(false)}
      />
    </>
  )
}

