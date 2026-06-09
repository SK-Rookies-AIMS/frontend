"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/dashboard/header"
import { Mascot } from "@/components/dashboard/mascot"
import { Footer } from "@/components/dashboard/footer"
import { AuthGuard } from "@/components/auth-guard"
import { ChevronDown, Car, Gauge, CheckCircle, X, Activity, Thermometer, Gauge as GaugeIcon } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts"

type TimeRange = "1일" | "1주" | "1달"

const inspectionStages = [
  {
    id: 1,
    name: "외관 검사",
    status: "진행 중",
    icon: "car",
    count: 256,
    progress: 87,
    color: "#22c55e",
  },
  {
    id: 2,
    name: "기능 검사",
    status: "진행 중",
    icon: "gear",
    count: 198,
    progress: 68,
    color: "#22c55e",
  },
  {
    id: 3,
    name: "주행 검사",
    status: "진행 중",
    icon: "steering",
    count: 142,
    progress: null,
    progressLabel: "중단됨",
    color: "#f59e0b",
    isSelected: true,
  },
  {
    id: 4,
    name: "최종 검사",
    status: "대기 중",
    icon: "check",
    count: 0,
    progress: 0,
    color: "#64748b",
  },
]

const generateRiskTrendData = (range: TimeRange) => {
  const length = range === "1일" ? 24 : range === "1주" ? 7 : 30
  const labelFn = (i: number) => {
    if (range === "1일") return `${String(i).padStart(2, "0")}:00`
    if (range === "1주") return ["월", "화", "수", "목", "금", "토", "일"][i]
    return `${i + 1}일`
  }
  
  return Array.from({ length }, (_, i) => ({
    time: labelFn(i),
    exterior: 20 + Math.random() * 30,
    function: 25 + Math.random() * 40,
    driving: 30 + Math.random() * 50,
    final: 10 + Math.random() * 30,
  }))
}

const inspectionSummary = {
  total: 596,
  completed: 256,
  completedPercent: 43,
  normal: 231,
  normalPercent: 90.2,
  abnormal: 25,
  abnormalPercent: 9.8,
  waiting: 340,
  waitingPercent: 57,
}

const riskDistribution = {
  high: { count: 25, percent: 4.2 },
  medium: { count: 78, percent: 13.1 },
  low: { count: 493, percent: 82.7 },
}

const vehicleStatusData = [
  { model: "K2", inspected: 128, normal: 116, abnormal: 12, rate: 9.4 },
  { model: "K3", inspected: 156, normal: 142, abnormal: 14, rate: 9.0 },
  { model: "K5", inspected: 98, normal: 88, abnormal: 10, rate: 10.2 },
  { model: "K7", inspected: 102, normal: 92, abnormal: 10, rate: 9.8 },
  { model: "EV6", inspected: 112, normal: 100, abnormal: 12, rate: 10.7 },
]

const driverInputData = [
  { model: "K2", inspected: 128, normal: 118, abnormal: 10, rate: 7.8 },
  { model: "K3", inspected: 156, normal: 139, abnormal: 17, rate: 10.9 },
  { model: "K5", inspected: 98, normal: 87, abnormal: 11, rate: 11.2 },
  { model: "K7", inspected: 102, normal: 90, abnormal: 12, rate: 11.8 },
  { model: "EV6", inspected: 112, normal: 97, abnormal: 15, rate: 13.4 },
]

// Mock detailed vehicle data
const vehicleDetailData = {
  K2: {
    exterior: {
      safetyControl: {
        abs: "정상",
        esp: "정상",
        airbag: "정상",
        seatbelt: "정상",
        blindSpot: "경고",
      }
    },
    function: {
      vehicleStatus: {
        engineTemp: 92,
        oilPressure: 45,
        batteryVoltage: 12.6,
        coolantLevel: "정상",
        brakeFluid: "정상",
      }
    },
    driving: {
      dynamics: {
        maxSpeed: 180,
        acceleration: 8.2,
        brakeDistance: 38.5,
        steeringResponse: 0.12,
        suspensionBalance: "정상",
      }
    },
    driverInput: {
      steeringAngle: 15.2,
      brakeForce: 78,
      acceleratorPosition: 45,
      gearPosition: "D",
      clutchEngagement: "N/A",
    }
  },
  K3: {
    exterior: {
      safetyControl: {
        abs: "정상",
        esp: "정상",
        airbag: "정상",
        seatbelt: "정상",
        blindSpot: "정상",
      }
    },
    function: {
      vehicleStatus: {
        engineTemp: 88,
        oilPressure: 42,
        batteryVoltage: 12.8,
        coolantLevel: "정상",
        brakeFluid: "정상",
      }
    },
    driving: {
      dynamics: {
        maxSpeed: 200,
        acceleration: 7.8,
        brakeDistance: 36.2,
        steeringResponse: 0.10,
        suspensionBalance: "정상",
      }
    },
    driverInput: {
      steeringAngle: 12.5,
      brakeForce: 82,
      acceleratorPosition: 52,
      gearPosition: "D",
      clutchEngagement: "N/A",
    }
  },
}

export default function InspectionPage() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedLine, setSelectedLine] = useState("전체 라인 선택")
  const [timeRange, setTimeRange] = useState<TimeRange>("1일")
  const [riskTrendData, setRiskTrendData] = useState(generateRiskTrendData("1일"))
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)
  const [detailType, setDetailType] = useState<"status" | "driver">("status")

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    setRiskTrendData(generateRiskTrendData(timeRange))
  }, [timeRange])

  const getTotals = (data: typeof vehicleStatusData) => ({
    inspected: data.reduce((sum, item) => sum + item.inspected, 0),
    normal: data.reduce((sum, item) => sum + item.normal, 0),
    abnormal: data.reduce((sum, item) => sum + item.abnormal, 0),
    rate: (data.reduce((sum, item) => sum + item.rate, 0) / data.length).toFixed(1),
  })

  const handleViewDetail = (model: string, type: "status" | "driver") => {
    setSelectedVehicle(model)
    setDetailType(type)
  }

  const getVehicleDetail = (model: string) => {
    return (vehicleDetailData as Record<string, typeof vehicleDetailData.K2>)[model] || vehicleDetailData.K2
  }

  return (
    <AuthGuard>
    <div className="min-h-screen bg-background flex flex-col">
      <Header currentTime={currentTime} />
      <main className="flex-1 p-4 overflow-auto relative">
        {/* Page Title */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold">검사 단계 모니터링</h1>
            <p className="text-sm text-muted-foreground">각 검사 단계별 진행 상황과 결과를 실시간으로 모니터링합니다.</p>
          </div>
          <div className="relative">
            <button className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg">
              <span className="text-sm">{selectedLine}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Inspection Stages */}
        <div className="flex items-center gap-2 mb-6">
          {inspectionStages.map((stage, index) => (
            <div key={stage.id} className="flex items-center">
              <div
                className={`relative rounded-xl border p-4 min-w-[180px] ${
                  stage.isSelected
                    ? "border-warning bg-warning/10"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    stage.isSelected ? "bg-warning text-warning-foreground" : "bg-primary/20 text-primary"
                  }`}>
                    {stage.id}
                  </div>
                  <span className="font-medium">{stage.name}</span>
                </div>
                <p className={`text-xs mb-3 ${
                  stage.status === "진행 중" ? "text-success" : "text-muted-foreground"
                }`}>{stage.status}</p>
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-secondary/50 flex items-center justify-center">
                    {stage.icon === "car" && <Car className="w-6 h-6" />}
                    {stage.icon === "gear" && <Gauge className="w-6 h-6" />}
                    {stage.icon === "steering" && <SteeringIcon />}
                    {stage.icon === "check" && <CheckCircle className="w-6 h-6" />}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">차량 대수</p>
                    <p className="text-xl font-bold">{stage.count} <span className="text-sm font-normal text-muted-foreground">대</span></p>
                  </div>
                  <div className="flex flex-col items-center">
                    <p className="text-xs text-muted-foreground mb-1">진행률</p>
                    {stage.progress !== null ? (
                      <div className="relative w-12 h-12">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="16" fill="none" stroke="#1e293b" strokeWidth="3" />
                          <circle
                            cx="18"
                            cy="18"
                            r="16"
                            fill="none"
                            stroke={stage.color}
                            strokeWidth="3"
                            strokeDasharray={`${stage.progress} 100`}
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                          {stage.progress}%
                        </span>
                      </div>
                    ) : (
                      <div className="relative w-12 h-12">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="16" fill="none" stroke="#1e293b" strokeWidth="3" />
                          <circle
                            cx="18"
                            cy="18"
                            r="16"
                            fill="none"
                            stroke={stage.color}
                            strokeWidth="3"
                            strokeDasharray="50 100"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] text-warning">
                          {stage.progressLabel}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {index < inspectionStages.length - 1 && (
                <div className="mx-2 text-primary">→</div>
              )}
            </div>
          ))}
        </div>

        {/* Middle Section - Chart and Summary */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* Risk Trend Chart */}
          <div className="col-span-2 bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">검사 단계별 위험도 추이</h3>
              <div className="flex items-center gap-2">
                {(["1일", "1주", "1달"] as TimeRange[]).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 text-xs rounded ${
                      timeRange === range
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4 mb-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-success" />
                <span>외관 검사</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-primary" />
                <span>기능 검사</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-warning" />
                <span>주행 검사</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-destructive" />
                <span>최종 검사</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={riskTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 10 }} stroke="#64748b" domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155" }} />
                <Line type="monotone" dataKey="exterior" stroke="#22c55e" name="외관 검사" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="function" stroke="#00d4ff" name="기능 검사" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="driving" stroke="#f59e0b" name="주행 검사" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="final" stroke="#ef4444" name="최종 검사" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Summary */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium mb-4">검사 단계 요약</h3>
            <div className="grid grid-cols-4 gap-2 mb-6">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">전체 차량 대수</p>
                <p className="text-2xl font-bold">{inspectionSummary.total}</p>
                <p className="text-xs text-muted-foreground">대</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">검사 완료</p>
                <p className="text-2xl font-bold">{inspectionSummary.completed}</p>
                <p className="text-xs text-muted-foreground">대 ({inspectionSummary.completedPercent}%)</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-success mb-1">정상</p>
                <p className="text-2xl font-bold text-success">{inspectionSummary.normal}</p>
                <p className="text-xs text-muted-foreground">대 ({inspectionSummary.normalPercent}%)</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-destructive mb-1">이상</p>
                <p className="text-2xl font-bold text-destructive">{inspectionSummary.abnormal}</p>
                <p className="text-xs text-muted-foreground">대 ({inspectionSummary.abnormalPercent}%)</p>
              </div>
            </div>
            <div className="text-center mb-6">
              <p className="text-xs text-warning mb-1">대기 중</p>
              <p className="text-2xl font-bold text-warning">{inspectionSummary.waiting}</p>
              <p className="text-xs text-muted-foreground">대 ({inspectionSummary.waitingPercent}%)</p>
            </div>

            <h4 className="text-sm font-medium mb-3">위험��� 분포</h4>
            <div className="flex gap-2 mb-2 text-xs">
              <span className="text-destructive">High</span>
              <span className="text-warning">Medium</span>
              <span className="text-success">Low</span>
            </div>
            <div className="flex h-6 rounded overflow-hidden">
              <div
                className="bg-destructive flex items-center justify-center text-[10px] text-destructive-foreground"
                style={{ width: `${riskDistribution.high.percent}%` }}
              >
                {riskDistribution.high.count} 대 ({riskDistribution.high.percent}%)
              </div>
              <div
                className="bg-warning flex items-center justify-center text-[10px] text-warning-foreground"
                style={{ width: `${riskDistribution.medium.percent}%` }}
              >
                {riskDistribution.medium.count} 대 ({riskDistribution.medium.percent}%)
              </div>
              <div
                className="bg-success flex items-center justify-center text-[10px] text-success-foreground"
                style={{ width: `${riskDistribution.low.percent}%` }}
              >
                {riskDistribution.low.count} 대 ({riskDistribution.low.percent}%)
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Tables */}
        <div className="grid grid-cols-2 gap-4">
          {/* Vehicle Status Results */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-sm font-medium">차량 상태 결과</h3>
              <button className="w-4 h-4 rounded-full bg-secondary flex items-center justify-center text-xs">?</button>
              <span className="text-xs text-muted-foreground ml-2">외관(안전 제어), 기능(차량 상태), 주행(동역학)</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-xs">
                  <th className="text-left py-2">차종</th>
                  <th className="text-center py-2">검사 받은 차량 대수</th>
                  <th className="text-center py-2">정상</th>
                  <th className="text-center py-2">이상</th>
                  <th className="text-center py-2">이상률</th>
                  <th className="text-center py-2">상세 보기</th>
                </tr>
              </thead>
              <tbody>
                {vehicleStatusData.map((row) => (
                  <tr key={row.model} className="border-t border-border">
                    <td className="py-2">{row.model}</td>
                    <td className="text-center">{row.inspected} 대</td>
                    <td className="text-center text-success">{row.normal} 대</td>
                    <td className="text-center text-destructive">{row.abnormal} 대</td>
                    <td className="text-center text-warning">{row.rate}%</td>
                    <td className="text-center">
                      <button 
                        onClick={() => handleViewDetail(row.model, "status")}
                        className="px-2 py-1 text-xs bg-secondary rounded hover:bg-secondary/80"
                      >
                        보기
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-border font-medium">
                  <td className="py-2">총 합계</td>
                  <td className="text-center">{getTotals(vehicleStatusData).inspected} 대</td>
                  <td className="text-center text-success">{getTotals(vehicleStatusData).normal} 대</td>
                  <td className="text-center text-destructive">{getTotals(vehicleStatusData).abnormal} 대</td>
                  <td className="text-center text-warning">{getTotals(vehicleStatusData).rate}%</td>
                  <td className="text-center">-</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Driver Input Results */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-sm font-medium">운전자 입력 결과</h3>
              <button className="w-4 h-4 rounded-full bg-secondary flex items-center justify-center text-xs">?</button>
              <span className="text-xs text-muted-foreground ml-2">최종 검사(운전자 입력 데이터)</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-xs">
                  <th className="text-left py-2">차종</th>
                  <th className="text-center py-2">검사 받은 차량 대수</th>
                  <th className="text-center py-2">정상</th>
                  <th className="text-center py-2">이상</th>
                  <th className="text-center py-2">이상률</th>
                  <th className="text-center py-2">상세 보기</th>
                </tr>
              </thead>
              <tbody>
                {driverInputData.map((row) => (
                  <tr key={row.model} className="border-t border-border">
                    <td className="py-2">{row.model}</td>
                    <td className="text-center">{row.inspected} 대</td>
                    <td className="text-center text-success">{row.normal} 대</td>
                    <td className="text-center text-destructive">{row.abnormal} 대</td>
                    <td className="text-center text-warning">{row.rate}%</td>
                    <td className="text-center">
                      <button 
                        onClick={() => handleViewDetail(row.model, "driver")}
                        className="px-2 py-1 text-xs bg-secondary rounded hover:bg-secondary/80"
                      >
                        보기
                      </button>
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-border font-medium">
                  <td className="py-2">총 합계</td>
                  <td className="text-center">{getTotals(driverInputData).inspected} 대</td>
                  <td className="text-center text-success">{getTotals(driverInputData).normal} 대</td>
                  <td className="text-center text-destructive">{getTotals(driverInputData).abnormal} 대</td>
                  <td className="text-center text-warning">{getTotals(driverInputData).rate}%</td>
                  <td className="text-center">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Vehicle Detail Modal */}
        {selectedVehicle && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card border border-border rounded-lg w-[800px] max-h-[90vh] overflow-auto">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-semibold">
                  {selectedVehicle} {detailType === "status" ? "차량 상태 상��" : "운전자 입력 상세"}
                </h2>
                <button 
                  onClick={() => setSelectedVehicle(null)}
                  className="p-1 hover:bg-secondary rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4">
                {detailType === "status" ? (
                  <div className="space-y-6">
                    {/* 외관 검사 - 안전 제어 시스템 */}
                    <div>
                      <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Car className="w-4 h-4 text-primary" />
                        외관 검사 (안전 제어 시스템)
                      </h3>
                      <div className="grid grid-cols-5 gap-3">
                        {Object.entries(getVehicleDetail(selectedVehicle).exterior.safetyControl).map(([key, value]) => (
                          <div key={key} className="bg-secondary/30 rounded-lg p-3 text-center">
                            <p className="text-xs text-muted-foreground mb-1">{key.toUpperCase()}</p>
                            <p className={`font-medium ${value === "정상" ? "text-success" : "text-warning"}`}>
                              {value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 기능 검사 - 차량 상태 데이터 */}
                    <div>
                      <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-primary" />
                        기능 검사 (차량 상태 데이터)
                      </h3>
                      <div className="grid grid-cols-5 gap-3">
                        <div className="bg-secondary/30 rounded-lg p-3 text-center">
                          <div className="flex justify-center mb-1">
                            <Thermometer className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <p className="text-xs text-muted-foreground">엔진 온도</p>
                          <p className="font-medium">{getVehicleDetail(selectedVehicle).function.vehicleStatus.engineTemp}°C</p>
                        </div>
                        <div className="bg-secondary/30 rounded-lg p-3 text-center">
                          <div className="flex justify-center mb-1">
                            <GaugeIcon className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <p className="text-xs text-muted-foreground">오일 압력</p>
                          <p className="font-medium">{getVehicleDetail(selectedVehicle).function.vehicleStatus.oilPressure} PSI</p>
                        </div>
                        <div className="bg-secondary/30 rounded-lg p-3 text-center">
                          <div className="flex justify-center mb-1">
                            <Activity className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <p className="text-xs text-muted-foreground">배터리 전압</p>
                          <p className="font-medium">{getVehicleDetail(selectedVehicle).function.vehicleStatus.batteryVoltage}V</p>
                        </div>
                        <div className="bg-secondary/30 rounded-lg p-3 text-center">
                          <p className="text-xs text-muted-foreground">냉각수</p>
                          <p className={`font-medium ${getVehicleDetail(selectedVehicle).function.vehicleStatus.coolantLevel === "정상" ? "text-success" : "text-warning"}`}>
                            {getVehicleDetail(selectedVehicle).function.vehicleStatus.coolantLevel}
                          </p>
                        </div>
                        <div className="bg-secondary/30 rounded-lg p-3 text-center">
                          <p className="text-xs text-muted-foreground">브레이크 오일</p>
                          <p className={`font-medium ${getVehicleDetail(selectedVehicle).function.vehicleStatus.brakeFluid === "정상" ? "text-success" : "text-warning"}`}>
                            {getVehicleDetail(selectedVehicle).function.vehicleStatus.brakeFluid}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 주행 검사 - 차량 동역학 데이터 */}
                    <div>
                      <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <SteeringIcon />
                        주행 검사 (차량 동역학 데이터)
                      </h3>
                      <div className="grid grid-cols-5 gap-3">
                        <div className="bg-secondary/30 rounded-lg p-3 text-center">
                          <p className="text-xs text-muted-foreground">최고 속도</p>
                          <p className="font-medium">{getVehicleDetail(selectedVehicle).driving.dynamics.maxSpeed} km/h</p>
                        </div>
                        <div className="bg-secondary/30 rounded-lg p-3 text-center">
                          <p className="text-xs text-muted-foreground">가속력 (0-100)</p>
                          <p className="font-medium">{getVehicleDetail(selectedVehicle).driving.dynamics.acceleration}초</p>
                        </div>
                        <div className="bg-secondary/30 rounded-lg p-3 text-center">
                          <p className="text-xs text-muted-foreground">제동 거리</p>
                          <p className="font-medium">{getVehicleDetail(selectedVehicle).driving.dynamics.brakeDistance}m</p>
                        </div>
                        <div className="bg-secondary/30 rounded-lg p-3 text-center">
                          <p className="text-xs text-muted-foreground">조향 반응</p>
                          <p className="font-medium">{getVehicleDetail(selectedVehicle).driving.dynamics.steeringResponse}초</p>
                        </div>
                        <div className="bg-secondary/30 rounded-lg p-3 text-center">
                          <p className="text-xs text-muted-foreground">서스펜션</p>
                          <p className={`font-medium ${getVehicleDetail(selectedVehicle).driving.dynamics.suspensionBalance === "정상" ? "text-success" : "text-warning"}`}>
                            {getVehicleDetail(selectedVehicle).driving.dynamics.suspensionBalance}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* 운전자 입력 데이터 */}
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      최종 검사 (운전자 입력 데이터)
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      기능 검사, 주행 검사 단계에서 입력된 시나리오 정보입니다.
                    </p>
                    <div className="grid grid-cols-5 gap-3">
                      <div className="bg-secondary/30 rounded-lg p-3 text-center">
                        <p className="text-xs text-muted-foreground">핸들 각도</p>
                        <p className="font-medium">{getVehicleDetail(selectedVehicle).driverInput.steeringAngle}°</p>
                      </div>
                      <div className="bg-secondary/30 rounded-lg p-3 text-center">
                        <p className="text-xs text-muted-foreground">브레이크 눌림 강도</p>
                        <p className="font-medium">{getVehicleDetail(selectedVehicle).driverInput.brakeForce}%</p>
                      </div>
                      <div className="bg-secondary/30 rounded-lg p-3 text-center">
                        <p className="text-xs text-muted-foreground">액셀 위치</p>
                        <p className="font-medium">{getVehicleDetail(selectedVehicle).driverInput.acceleratorPosition}%</p>
                      </div>
                      <div className="bg-secondary/30 rounded-lg p-3 text-center">
                        <p className="text-xs text-muted-foreground">기어 위치</p>
                        <p className="font-medium">{getVehicleDetail(selectedVehicle).driverInput.gearPosition}</p>
                      </div>
                      <div className="bg-secondary/30 rounded-lg p-3 text-center">
                        <p className="text-xs text-muted-foreground">클러치</p>
                        <p className="font-medium">{getVehicleDetail(selectedVehicle).driverInput.clutchEngagement}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end mt-6">
                  <button 
                    onClick={() => setSelectedVehicle(null)}
                    className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mascot */}
        <Mascot />
      </main>
      <Footer />
    </div>
    </AuthGuard>
  )
}

function SteeringIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3" />
      <line x1="12" y1="3" x2="12" y2="9" />
      <line x1="3" y1="12" x2="9" y2="12" />
      <line x1="15" y1="12" x2="21" y2="12" />
    </svg>
  )
}
