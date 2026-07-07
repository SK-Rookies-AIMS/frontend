"use client"

import { useState, useEffect } from "react"
import { ThermometerSun, Zap, Droplets } from "lucide-react"

type StatusLevel = "normal" | "warning" | "danger"

interface EquipmentApiResponse {
  processCode: string
  overallEquipmentCount: number
  runningEquipmentCount: number
  temperature: number
  humidity: number
  usage: number
}

interface EquipmentCardProps {
  number: number
  title: string
  status: "가동" | "가동중" | "점검"
  count: number
  running: number
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

const getTitleByProcessCode = (code: string) => {
  switch (code) {
    case "PRESS": return "프레스"
    case "BODY": return "차체 (용접)"
    case "PAINT": return "도장"
    case "ASSEMBLY": return "의장 조립"
    default: return code
  }
}

export function EquipmentStatus() {
  const [equipmentList, setEquipmentList] = useState<EquipmentCardProps[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEquipmentStatus = async () => {
      try {
        const accessToken = sessionStorage.getItem("aims-auth-accessToken")
        const response = await fetch("/api/main/get-manufacturing-status", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        })
        const result = await response.json()
        
        if (response.ok && result.success) {
          const filteredData = result.data.filter((item: EquipmentApiResponse) => item.processCode !== 'INSPECTION');

          const processOrder: Record<string, number> = {
            'PRESS': 0,
            'BODY': 1,
            'PAINT': 2,
            'ASSEMBLY': 3
          };

          filteredData.sort((a: EquipmentApiResponse, b: EquipmentApiResponse) => {
            return (processOrder[a.processCode] ?? 99) - (processOrder[b.processCode] ?? 99);
          });

          const mappedData: EquipmentCardProps[] = filteredData.map((item: EquipmentApiResponse, index: number) => {
            const calculatedPercent = item.overallEquipmentCount > 0 
              ? Math.round((item.runningEquipmentCount / item.overallEquipmentCount) * 100) 
              : 0;
            
            return {
              number: index + 1,
              title: getTitleByProcessCode(item.processCode),
              status: item.runningEquipmentCount > 0 ? "가동중" : "점검",
              count: item.overallEquipmentCount,
              running: item.runningEquipmentCount,
              percent: calculatedPercent,
              percentColor: calculatedPercent > 80 ? "text-success" : calculatedPercent > 60 ? "text-warning" : "text-destructive",
              temp: item.temperature,
              humidity: item.humidity,
              power: item.usage,
              tempStatus: "normal",
              humidityStatus: "normal",
              powerStatus: "normal",
              icon: null,
              hasWarning: calculatedPercent < 50
            }
          })
          setEquipmentList(mappedData)
        }
      } catch (err) {
        console.error("설비 상태 조회 실패:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchEquipmentStatus()
  }, [])

  if (loading) return <div className="p-4">로딩 중...</div>

  return (
    <div className="bg-card rounded-lg border border-border p-4 flex flex-col flex-1">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium">주요 설비 현황</h2>
      </div>
      <div className="grid grid-cols-4 gap-4 flex-1">
        {equipmentList.map((equipment, index) => (
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
  running,
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
        <span className="text-muted-foreground">전체</span>
        <span className="font-medium">{count} EA</span>
        <span className="text-muted-foreground">가동중</span>
        <span className="font-medium">{running} EA</span>
      </div>


      <div className="flex items-center justify-between text-[10px] pt-2 border-t border-border">
        <div className="flex items-center gap-1 text-muted-foreground">
          <span className="w-4 h-4 flex items-center justify-center">🌡️</span>
          <span className={getStatusColor(tempStatus)}>{temp}°C</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C15.866 22 19 18.866 19 15C19 11.134 12 2 12 2C12 2 5 11.134 5 15C5 18.866 8.13401 22 12 22Z" fill="#3B82F6" fillOpacity="0.2" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className={getStatusColor(humidityStatus)}>{humidity}%</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="#F59E0B" fillOpacity="0.2" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className={getStatusColor(powerStatus)}>{power}kW</span>
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
