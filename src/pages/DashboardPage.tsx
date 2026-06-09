"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/dashboard/header"
import { LeftSidebar } from "@/components/dashboard/left-sidebar"
import { EquipmentStatus } from "@/components/dashboard/equipment-status"
import { ProcessFlow } from "@/components/dashboard/process-flow"
import { RightSidebar } from "@/components/dashboard/right-sidebar"
import { Footer } from "@/components/dashboard/footer"
import { AuthGuard } from "@/components/auth-guard"

export default function DashboardPage() {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background flex flex-col">
        <Header currentTime={currentTime} />
        <div className="flex flex-1 overflow-hidden">
          <LeftSidebar />
          <main className="flex-1 p-4 overflow-auto">
            <EquipmentStatus />
            <ProcessFlow />
          </main>
          <RightSidebar />
        </div>
        <Footer />
      </div>
    </AuthGuard>
  )
}
