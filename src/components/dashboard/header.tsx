"use client"

import { useState, useEffect } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useTheme } from "@/components/theme-provider"
import { Bell, ChevronDown, Home, Factory, ClipboardCheck, Sun, Moon, Clock, AlertTriangle, LogOut } from "lucide-react"

interface HeaderProps {
  currentTime: Date
}

// 계정 역할 타입
type UserRole = "시니어" | "주니어"

// 현재 로그인한 사용자 정보 (실제로는 인증 시스템에서 가져옴)
const currentUser = {
  name: "홍길동",
  role: "시니어" as UserRole,
}

// 역할별 스타일
const roleStyles: Record<UserRole, { bg: string; text: string }> = {
  "시니어": { bg: "bg-primary/20", text: "text-primary" },
  "주니어": { bg: "bg-success/20", text: "text-success" },
}

export function Header({ currentTime }: HeaderProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  const handleLogout = () => {
    sessionStorage.removeItem("aims-auth")
    navigate("/login", { replace: true })
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
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4">
      <div className="flex items-center gap-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/images/aims-logo.jpeg"
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
        {/* Notifications */}
        <Link to="/events" className="relative cursor-pointer p-2 hover:bg-secondary rounded-md transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-1 right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center">
            3
          </span>
        </Link>

        {/* User Profile */}
        <div className="flex items-center gap-2 cursor-pointer">
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
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
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
  )
}
