"use client"

import type React from "react"
import { useState } from "react"
import { Link } from "react-router-dom"
import { BriefcaseBusiness, IdCard, Lock, Mail, User } from "lucide-react"

export default function SignupPage() {
  const [employeeId, setEmployeeId] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [userName, setUserName] = useState("")
  const [yearsOfExperience, setYearsOfExperience] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordMismatch) return
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: userName,
          email,
          password,
          workExperience: parseInt(yearsOfExperience),
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        alert(data.message || "회원가입에 성공했습니다. 로그인 페이지로 이동합니다.")
        window.location.href = "/login"
      } else {
        alert(data.message || "회원가입 실패: 알 수 없는 오류입니다.")
      }
    } catch (error) {
      console.error("회원가입 중 오류 발생:", error)
      alert("회원가입 중 네트워크 오류가 발생했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col p-4">
      <div className="flex-1 flex items-center justify-center py-6">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-xl px-8 pt-8 pb-6 shadow-xl">
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

            <div className="bg-secondary/40 border border-border rounded-lg p-6">
              <h2 className="text-lg font-bold text-foreground mb-5">회원가입</h2>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="signup-email" className="text-sm font-medium text-foreground">
                    이메일
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="signup-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="이메일을 입력하세요"
                      className="w-full bg-input border border-border rounded-md py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="signup-password" className="text-sm font-medium text-foreground">
                    비밀번호
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="signup-password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="비밀번호를 입력하세요"
                      className="w-full bg-input border border-border rounded-md py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
                    비밀번호 확인
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="confirm-password"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="비밀번호를 다시 입력하세요"
                      className={`w-full bg-input border rounded-md py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:border-transparent transition ${
                        passwordMismatch
                          ? "border-destructive focus:ring-destructive"
                          : "border-border focus:ring-ring"
                      }`}
                    />
                  </div>
                  {passwordMismatch && (
                    <p className="text-xs text-destructive">비밀번호와 비밀번호 확인 값이 일치하지 않습니다.</p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="user-name" className="text-sm font-medium text-foreground">
                    사용자 이름
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="user-name"
                      type="text"
                      required
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="사용자 이름을 입력하세요"
                      className="w-full bg-input border border-border rounded-md py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="years-of-experience" className="text-sm font-medium text-foreground">
                    경력(년수)
                  </label>
                  <div className="relative">
                    <BriefcaseBusiness className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      id="years-of-experience"
                      type="number"
                      min="0"
                      required
                      value={yearsOfExperience}
                      onChange={(e) => setYearsOfExperience(e.target.value)}
                      placeholder="경력 년수를 입력하세요"
                      className="w-full bg-input border border-border rounded-md py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || passwordMismatch}
                  className="w-full bg-primary text-primary-foreground font-semibold rounded-md py-2.5 text-sm hover:bg-primary/90 transition-colors disabled:opacity-70"
                >
                  {isSubmitting ? "회원가입 중..." : "회원가입"}
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">또는</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <Link
                  to="/login"
                  className="w-full text-center border border-border rounded-md py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  로그인 페이지로 이동
                </Link>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
