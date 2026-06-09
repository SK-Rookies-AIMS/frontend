"use client"

import { ThermometerSun, Zap, Droplets } from "lucide-react"

type StatusLevel = "normal" | "warning" | "danger"

interface EquipmentCardProps {
  number: number
  title: string
  status: "가동" | "가동중" | "점검"
  count: number
  percent: number
  percentColor: string
  temp: number
  humidity: number
  power: number
  tempStatus: StatusLevel
  humidityStatus: StatusLevel
  powerStatus: StatusLevel
  icon: React.ReactNode
  hasWarning?: boolean
}

const equipmentData: Omit<EquipmentCardProps, "icon">[] = [
  { number: 1, title: "프레스", status: "가동", count: 256, percent: 87, percentColor: "text-success", temp: 24.1, humidity: 41, power: 78, tempStatus: "normal", humidityStatus: "normal", powerStatus: "normal" },
  { number: 2, title: "차체 (용접)", status: "가동중", count: 198, percent: 68, percentColor: "text-warning", temp: 24.0, humidity: 57, power: 82, tempStatus: "normal", humidityStatus: "warning", powerStatus: "normal" },
  { number: 3, title: "도장", status: "가동중", count: 142, percent: 53, percentColor: "text-warning", temp: 34.8, humidity: 71, power: 95, tempStatus: "danger", humidityStatus: "warning", powerStatus: "danger", hasWarning: true },
  { number: 4, title: "의장 조립", status: "가동중", count: 312, percent: 74, percentColor: "text-success", temp: 23.7, humidity: 68, power: 65, tempStatus: "normal", humidityStatus: "normal", powerStatus: "normal" },
  { number: 5, title: "최종 검사", status: "가동", count: 298, percent: 90, percentColor: "text-success", temp: 23.0, humidity: 64, power: 45, tempStatus: "normal", humidityStatus: "normal", powerStatus: "normal" },
]

export function EquipmentStatus() {
  return (
    <div className="bg-card rounded-lg border border-border p-4 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium">주요 설비 현황</h2>
      </div>
      <div className="grid grid-cols-5 gap-4">
        {equipmentData.map((equipment, index) => (
          <EquipmentCard 
            key={index} 
            {...equipment} 
            icon={<EquipmentIcon type={equipment.title} hasWarning={equipment.hasWarning} />}
          />
        ))}
      </div>
    </div>
  )
}

function EquipmentCard({
  number,
  title,
  status,
  count,
  percent,
  percentColor,
  temp,
  humidity,
  power,
  tempStatus,
  humidityStatus,
  powerStatus,
  icon,
  hasWarning,
}: EquipmentCardProps) {
  const getStatusColor = (status: StatusLevel) => {
    switch (status) {
      case "danger": return "text-destructive"
      case "warning": return "text-warning"
      default: return "text-muted-foreground"
    }
  }

  return (
    <div className={`bg-secondary/30 rounded-lg p-3 border ${hasWarning ? 'border-destructive/50' : 'border-border'} relative`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">
          {number}
        </span>
        <span className="text-sm font-medium">{title}</span>
      </div>

      {/* Status Badge */}
      <div className={`text-xs mb-3 ${hasWarning ? 'text-destructive' : 'text-success'}`}>
        {hasWarning ? '위험' : status}
      </div>

      {/* Icon and Progress */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-14 h-14 flex items-center justify-center text-primary">
          {icon}
        </div>
        <div className="flex-1 flex justify-end">
          <CircularProgress percent={percent} color={percentColor} />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="text-muted-foreground">가동중</span>
        <span className="font-medium">{count} EA</span>
      </div>

      {/* Footer metrics - 온도, 습도, 전력사용량 with status colors */}
      <div className="flex items-center justify-between text-[10px] pt-2 border-t border-border">
        <div className={`flex items-center gap-1 ${getStatusColor(tempStatus)}`}>
          <ThermometerSun className="w-3 h-3" />
          <span>{temp}°C</span>
        </div>
        <div className={`flex items-center gap-1 ${getStatusColor(humidityStatus)}`}>
          <Droplets className="w-3 h-3" />
          <span>{humidity}%</span>
        </div>
        <div className={`flex items-center gap-1 ${getStatusColor(powerStatus)}`}>
          <Zap className="w-3 h-3" />
          <span>{power}kW</span>
        </div>
      </div>
    </div>
  )
}

function CircularProgress({ percent, color }: { percent: number; color: string }) {
  const radius = 22
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percent / 100) * circumference

  return (
    <div className="relative w-14 h-14">
      <svg className="w-full h-full -rotate-90">
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          className="text-secondary"
        />
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={color}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-sm font-bold ${color}`}>{percent}%</span>
      </div>
    </div>
  )
}

function EquipmentIcon({ type, hasWarning }: { type: string; hasWarning?: boolean }) {
  const iconColor = hasWarning ? "text-warning" : "text-primary"
  
  switch (type) {
    case "프레스":
      return (
        <svg viewBox="0 0 48 48" className={`w-full h-full ${iconColor}`} fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="10" y="6" width="28" height="10" rx="2" />
          <rect x="16" y="16" width="16" height="18" />
          <rect x="12" y="34" width="24" height="8" rx="2" />
          <circle cx="34" cy="12" r="2" fill="currentColor" />
          <rect x="20" y="22" width="8" height="8" rx="1" fill="currentColor" fillOpacity="0.3" />
        </svg>
      )
    case "차체 (용접)":
      return (
        <svg viewBox="0 0 48 48" className={`w-full h-full ${iconColor}`} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6 30 L12 22 L36 22 L42 30 L42 36 L6 36 Z" />
          <path d="M14 22 L16 14 L32 14 L34 22" />
          <circle cx="12" cy="36" r="4" />
          <circle cx="36" cy="36" r="4" />
          <rect x="18" y="8" width="12" height="6" rx="2" fill="currentColor" fillOpacity="0.3" />
        </svg>
      )
    case "도장":
      return (
        <svg viewBox="0 0 48 48" className={`w-full h-full ${iconColor}`} fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="8" y="16" width="14" height="24" rx="3" />
          <path d="M22 22 L36 10 L42 16 L28 28" strokeLinejoin="round" />
          <circle cx="15" cy="14" r="4" />
          <line x1="42" y1="38" x2="42" y2="16" strokeDasharray="4 2" />
          <circle cx="42" cy="42" r="3" fill="currentColor" fillOpacity="0.3" />
        </svg>
      )
    case "의장 조립":
      return (
        <svg viewBox="0 0 48 48" className={`w-full h-full ${iconColor}`} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6 34 L12 24 L36 24 L42 34 L42 40 L6 40 Z" />
          <path d="M14 24 L16 18 L32 18 L34 24" />
          <circle cx="12" cy="40" r="3" />
          <circle cx="36" cy="40" r="3" />
          <rect x="18" y="10" width="12" height="8" rx="2" />
          <circle cx="24" cy="14" r="2" fill="currentColor" fillOpacity="0.5" />
        </svg>
      )
    case "최종 검사":
      return (
        <svg viewBox="0 0 48 48" className={`w-full h-full ${iconColor}`} fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="10" y="10" width="28" height="28" rx="4" />
          <path d="M16 24 L22 30 L32 18" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="38" cy="10" r="4" fill="currentColor" />
        </svg>
      )
    default:
      return null
  }
}
