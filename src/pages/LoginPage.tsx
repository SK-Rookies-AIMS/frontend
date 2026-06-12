"use client"

import type React from "react"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Mail, Lock, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberId, setRememberId] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        sessionStorage.setItem("aims-auth-accessToken", data.data.accessToken)
        sessionStorage.setItem("aims-auth-refreshToken", data.data.refreshToken)
        navigate("/")
      } else {
        alert(data.message || "로그인 실패: 알 수 없는 오류입니다.")
      }
    } catch (error) {
      console.error("로그인 중 오류 발생:", error)
      alert("로그인 중 네트워크 오류가 발생했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col p-4">
      {/* Centered Login Card */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md">
          {/* Login Card */}
          <div className="bg-card border border-border rounded-xl px-8 pt-8 pb-6 shadow-xl">
          {/* Logo & Title */}
          <div className="flex flex-col items-center text-center mb-8">
            <img
              src="/images/aims-logo-new.png"
              alt="AIMS 로고"
              width={72}
              height={72}
              className="rounded-lg mb-4"
            />
            <h1 className="text-2xl font-bold text-foreground text-balance">
              스마트팩토리 통합 모니터링
            </h1>
            <p className="text-sm text-muted-foreground mt-2 text-pretty">
              AI 기반 지능형 모빌리티 스마트팩토리 관제 시스템
            </p>
          </div>

          {/* Form */}
          <div className="bg-secondary/40 border border-border rounded-lg p-6">
            <h2 className="text-lg font-bold text-foreground mb-5">로그인</h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Email */}
              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  사원 이메일
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="이메일을 입력하세요"
                    className="w-full bg-input border border-border rounded-md py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  비밀번호
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호를 입력하세요"
                    className="w-full bg-input border border-border rounded-md py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Options */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberId}
                    onChange={(e) => setRememberId(e.target.checked)}
                    className="w-4 h-4 rounded border-border bg-input accent-primary"
                  />
                  <span className="text-sm text-muted-foreground">아이디 저장</span>
                </label>
                <button
                  type="button"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  비밀번호 찾기
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-primary-foreground font-semibold rounded-md py-2.5 text-sm hover:bg-primary/90 transition-colors disabled:opacity-70"
              >
                {isSubmitting ? "로그인 중..." : "로그인"}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">또는</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Sign up */}
              <Link
                to="/signup"
                className="w-full text-center border border-border rounded-md py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                회원가입
              </Link>
            </form>
          </div>
          </div>
        </div>
      </div>

      {/* Factory Illustration & Footer (bottom) */}
      <div className="w-full max-w-md mx-auto">
        <div className="px-4">
          <img
            src="/images/factory-skyline.png"
            alt="스마트팩토리 일러스트"
            width={800}
            height={200}
            className="w-full h-auto opacity-80"
          />
        </div>
        <p className="text-center text-xs text-muted-foreground mt-4">
          © 2025 Smart Factory Monitoring System. All rights reserved.
        </p>
      </div>
    </div>
  )
}
