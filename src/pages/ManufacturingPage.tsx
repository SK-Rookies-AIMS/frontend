"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/dashboard/header"
import { Mascot } from "@/components/dashboard/mascot"
import { Footer } from "@/components/dashboard/footer"
import { AuthGuard } from "@/components/auth-guard"
import { ChevronDown, AlertTriangle, CheckCircle } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from "recharts"

const processStages = [
  { id: "01", name: "프레스", rate: 92, events: 22, status: "normal", color: "#22c55e" },
  { id: "02", name: "차체", rate: 89, events: 22, status: "warning", color: "#f59e0b" },
  { id: "03", name: "도장", rate: 87, events: 22, status: "danger", color: "#ef4444", isBottleneck: true },
  { id: "04", name: "의장", rate: 91, events: 22, status: "normal", color: "#22c55e" },
  { id: "05", name: "연계 분석", rate: null, defectRate: 78, targetProcess: "도장(L3)", status: "analysis" },
]

const bottleneckData = [
  { rank: 1, process: "도장 (L3)", delay: 12.4, affected: 128, risk: 5 },
  { rank: 2, process: "차체 (S12)", delay: 9.8, affected: 92, risk: 4 },
  { rank: 3, process: "프레스 (P4)", delay: 6.1, affected: 54, risk: 3 },
  { rank: 4, process: "의장 (A1)", delay: 4.3, affected: 32, risk: 2 },
  { rank: 5, process: "검사 (I2)", delay: 2.1, affected: 18, risk: 1 },
]

const defectPredictionData = [
  { vinId: "VIN-001245", currentProcess: "차체", predictedProcess: "도장 (L3)", probability: 78, stepsAhead: "3단계 후" },
  { vinId: "VIN-001248", currentProcess: "프레스", predictedProcess: "차체 (S12)", probability: 72, stepsAhead: "2단계 후" },
  { vinId: "VIN-001250", currentProcess: "도장", predictedProcess: "의장 (A1)", probability: 69, stepsAhead: "3단계 후" },
  { vinId: "VIN-001253", currentProcess: "차체", predictedProcess: "도장 (L3)", probability: 61, stepsAhead: "3단계 후" },
  { vinId: "VIN-001255", currentProcess: "프레스", predictedProcess: "차체 (S12)", probability: 58, stepsAhead: "2단계 후" },
]

const aiAnalysisFactors = [
  { name: "S2 Station 통과 지연 +12초", impact: 0.38 },
  { name: "L3 온도 편차 +7°C", impact: 0.24 },
  { name: "프레스 공정 Cycle Time 증가", impact: 0.19 },
  { name: "과거 유사 불량 사례 34건 존재", impact: 0.11 },
  { name: "센서 통신 지연 (3ms)", impact: 0.08 },
]

const pressData = Array.from({ length: 20 }, (_, i) => ({
  time: `${String(Math.floor(i * 1.2) + 6).padStart(2, "0")}:00`,
  normal: 5000 + Math.random() * 5000,
  abnormal: Math.random() * 2000,
  max: 10000 + Math.random() * 5000,
}))

// 차체 로봇 데이터
const bodyRobotData = Array.from({ length: 20 }, (_, i) => ({
  time: `${String(Math.floor(i * 1.2) + 6).padStart(2, "0")}:00`,
  weldPoints: 80 + Math.random() * 20,
  quality: 90 + Math.random() * 10,
  temperature: 45 + Math.random() * 15,
}))

const paintData = [
  { eventTime: "2026-06-18T10:00:00", defectScore: 0.42, surfaceQualityScore: 88.4, thicknessValue: 121.2, thermalStdTemp: 2.1, visionLabel: "OK", riskScore: 34.2, severity: "NORMAL", isAbnormal: false, analysisMessage: "표면 품질 안정" },
  { eventTime: "2026-06-18T10:15:00", defectScore: 0.51, surfaceQualityScore: 84.7, thicknessValue: 119.8, thermalStdTemp: 2.8, visionLabel: "OK", riskScore: 41.5, severity: "NORMAL", isAbnormal: false, analysisMessage: "도장 두께 정상 범위" },
  { eventTime: "2026-06-18T10:30:00", defectScore: 0.68, surfaceQualityScore: 78.9, thicknessValue: 117.3, thermalStdTemp: 3.5, visionLabel: "DEFECT", riskScore: 67.4, severity: "WARNING", isAbnormal: true, analysisMessage: "비전 불량 라벨 감지" },
  { eventTime: "2026-06-18T10:45:00", defectScore: 0.87, surfaceQualityScore: 72.3, thicknessValue: 116.5, thermalStdTemp: 4.2, visionLabel: "DEFECT", riskScore: 88.5, severity: "CRITICAL", isAbnormal: true, analysisMessage: "표면 품질 점수 저하 및 두께 이상 의심" },
  { eventTime: "2026-06-18T11:00:00", defectScore: 0.73, surfaceQualityScore: 76.8, thicknessValue: 118.1, thermalStdTemp: 3.9, visionLabel: "DEFECT", riskScore: 72.8, severity: "WARNING", isAbnormal: true, analysisMessage: "불량 점수 상승" },
  { eventTime: "2026-06-18T11:15:00", defectScore: 0.46, surfaceQualityScore: 86.2, thicknessValue: 120.4, thermalStdTemp: 2.4, visionLabel: "OK", riskScore: 38.6, severity: "NORMAL", isAbnormal: false, analysisMessage: "후속 샘플 품질 회복" },
]

const paintChartData = paintData.map((row) => ({
  ...row,
  time: new Date(row.eventTime).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }),
  defectScoreScaled: row.defectScore <= 1 ? row.defectScore * 100 : row.defectScore,
}))

const paintAlert = [...paintData].sort((a, b) => b.riskScore - a.riskScore)[0]
const paintKpis = {
  analysisCount: paintData.length,
  defectRate: (paintData.filter((row) => row.isAbnormal || row.visionLabel === "DEFECT").length / paintData.length) * 100,
  averageQuality: paintData.reduce((sum, row) => sum + row.surfaceQualityScore, 0) / paintData.length,
  riskAlarmCount: paintData.filter((row) => row.severity === "WARNING" || row.severity === "CRITICAL").length,
}

const assemblyData = [
  { carId: "CAR-000001", expectedSequence: "A01>A02>A03>A04", actualSequence: "A01>A03>A02>A04", sequenceErrorCount: 1, missingPartCount: 0, fasteningErrorCount: 1, riskScore: 86.5, severity: "CRITICAL", isAbnormal: true, analysisMessage: "조립 순서 오류와 체결 오류 동시 감지" },
  { carId: "CAR-000002", expectedSequence: "A01>A02>A03>A04", actualSequence: "A01>A02>A03>A04", sequenceErrorCount: 0, missingPartCount: 0, fasteningErrorCount: 0, riskScore: 18.2, severity: "NORMAL", isAbnormal: false, analysisMessage: "정상 조립 완료" },
  { carId: "CAR-000003", expectedSequence: "A01>A02>A03>A04", actualSequence: "A01>A02>A04", sequenceErrorCount: 0, missingPartCount: 1, fasteningErrorCount: 0, riskScore: 61.3, severity: "WARNING", isAbnormal: true, analysisMessage: "부품 누락 의심" },
  { carId: "CAR-000004", expectedSequence: "A01>A02>A03>A04", actualSequence: "A01>A02>A03>A04", sequenceErrorCount: 0, missingPartCount: 0, fasteningErrorCount: 1, riskScore: 54.7, severity: "WARNING", isAbnormal: true, analysisMessage: "체결 토크 이상 감지" },
  { carId: "CAR-000005", expectedSequence: "A01>A02>A03>A04", actualSequence: "A01>A02>A03>A04", sequenceErrorCount: 0, missingPartCount: 0, fasteningErrorCount: 0, riskScore: 22.4, severity: "NORMAL", isAbnormal: false, analysisMessage: "정상 조립 진행" },
]

const assemblyAlert = [...assemblyData].sort((a, b) => b.riskScore - a.riskScore)[0]
const assemblyKpis = {
  carCount: new Set(assemblyData.map((row) => row.carId)).size,
  sequenceErrors: assemblyData.reduce((sum, row) => sum + row.sequenceErrorCount, 0),
  missingParts: assemblyData.reduce((sum, row) => sum + row.missingPartCount, 0),
  fasteningErrors: assemblyData.reduce((sum, row) => sum + row.fasteningErrorCount, 0),
  averageRisk: assemblyData.reduce((sum, row) => sum + row.riskScore, 0) / assemblyData.length,
}

type PaintChartDatum = (typeof paintChartData)[number]

function PaintTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ payload: PaintChartDatum }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  const row = payload[0].payload

  return (
    <div className="rounded border border-border bg-card p-3 text-xs shadow">
      <p className="mb-2 font-medium">{label}</p>
      <div className="space-y-1 text-muted-foreground">
        <p>event_time: {row.eventTime}</p>
        <p>불량 점수: {row.defectScore.toFixed(2)}{row.defectScore <= 1 ? ` (표시 ${row.defectScoreScaled.toFixed(1)})` : ""}</p>
        <p>표면 품질 점수: {row.surfaceQualityScore.toFixed(1)}</p>
        <p>도장 두께: {row.thicknessValue.toFixed(1)}</p>
        <p>vision_label: {row.visionLabel}</p>
      </div>
    </div>
  )
}

function formatSequence(sequence: string) {
  return sequence.split(">").join(" > ")
}

function getAssemblyStatus(severity: string, isAbnormal: boolean) {
  if (!isAbnormal) return "정상"
  if (severity === "CRITICAL") return "위험"
  if (severity === "WARNING") return "경고"
  return "이상"
}

function getStatusBadgeClass(severity: string, isAbnormal: boolean) {
  if (!isAbnormal) return "bg-success/20 text-success"
  if (severity === "CRITICAL") return "bg-destructive/20 text-destructive"
  if (severity === "WARNING") return "bg-warning/20 text-warning"
  return "bg-destructive/20 text-destructive"
}

function getRiskTextClass(riskScore: number) {
  if (riskScore >= 80) return "text-destructive"
  if (riskScore >= 50) return "text-warning"
  return "text-success"
}

export default function ManufacturingPage() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeTab, setActiveTab] = useState("press")
  const [selectedVehicle, setSelectedVehicle] = useState("VIN-001245")

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
      <main className="flex-1 p-4 overflow-auto relative">
        {/* Page Title */}
        <div className="mb-4">
          <h1 className="text-lg font-semibold">전체 공정 흐름 요약 및 병목 탐지 <span className="text-muted-foreground font-normal">(실시간)</span></h1>
        </div>

        {/* Process Stages */}
        <div className="flex items-center gap-2 mb-6">
          {processStages.map((stage, index) => (
            <div key={stage.id} className="flex items-center">
              <div
                className={`relative rounded-lg border p-4 min-w-[160px] ${
                  stage.isBottleneck
                    ? "border-destructive bg-destructive/10"
                    : "border-border bg-card"
                }`}
              >
                {stage.isBottleneck && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded whitespace-nowrap">
                    병목 구간 (위험)
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-primary font-bold">{stage.id}</span>
                  <StageIcon type={stage.name} />
                  <span className="font-medium">{stage.name}</span>
                </div>
                {stage.rate !== null ? (
                  <>
                    <div className="flex justify-between text-sm text-muted-foreground mb-1">
                      <span>가동률</span>
                      <span className={stage.status === "danger" ? "text-destructive" : ""}>{stage.rate}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">이상 이벤트</span>
                      <span className="text-destructive font-medium">{stage.events}건</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">불량 전이 확률</span>
                      <span className="text-destructive font-bold">{stage.defectRate}%</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      병목 예상 구간 {stage.targetProcess}
                    </div>
                  </>
                )}
              </div>
              {index < processStages.length - 1 && (
                <div className="mx-2 text-primary text-xl">→</div>
              )}
            </div>
          ))}
        </div>

        {/* Analysis Section - 3 Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* 1. Bottleneck Analysis */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium mb-4">실시간 병목 분석</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-xs">
                  <th className="text-left py-2">순위</th>
                  <th className="text-left py-2">공정</th>
                  <th className="text-center py-2">평균 지연</th>
                  <th className="text-center py-2">영향 차량 수</th>
                  <th className="text-center py-2">위험도</th>
                </tr>
              </thead>
              <tbody>
                {bottleneckData.map((row) => (
                  <tr key={row.rank} className="border-t border-border">
                    <td className="py-2 font-bold">{row.rank}</td>
                    <td className="py-2">{row.process}</td>
                    <td className="text-center">{row.delay}초</td>
                    <td className="text-center text-warning">{row.affected}대</td>
                    <td className="text-center">
                      <RiskIndicator level={row.risk} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 2. Defect Prediction */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium mb-4">불량 전이 예측</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground text-xs">
                  <th className="text-left py-2">VIN / Lot ID</th>
                  <th className="text-left py-2">현재 공정</th>
                  <th className="text-left py-2">예측 불량 공정</th>
                  <th className="text-center py-2">불량 확률</th>
                  <th className="text-center py-2">예상 발생 시간</th>
                </tr>
              </thead>
              <tbody>
                {defectPredictionData.map((row) => (
                  <tr key={row.vinId} className="border-t border-border">
                    <td className="py-2">{row.vinId}</td>
                    <td className="py-2">{row.currentProcess}</td>
                    <td className="py-2 text-destructive">{row.predictedProcess}</td>
                    <td className="text-center">
                      <span className={`font-bold ${row.probability >= 70 ? "text-destructive" : "text-warning"}`}>
                        {row.probability}%
                      </span>
                    </td>
                    <td className="text-center text-muted-foreground">{row.stepsAhead}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 3. AI Analysis */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium mb-4">AI 원인 분석</h3>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-muted-foreground text-sm">선택 차량</span>
              <button className="flex items-center gap-2 px-3 py-1.5 bg-secondary border border-border rounded text-sm">
                {selectedVehicle}
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="ml-auto text-right">
                <span className="text-muted-foreground text-xs">예측 불량 확률</span>
                <p className="text-2xl font-bold text-destructive">78% <span className="text-sm font-normal">(위험)</span></p>
              </div>
            </div>
            
            <h4 className="text-xs text-muted-foreground mb-2">주요 원인</h4>
            <div className="space-y-2">
              {aiAnalysisFactors.map((factor, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-xs w-4">{index + 1}</span>
                  <span className="text-xs flex-1">{factor.name}</span>
                  <span className="text-xs text-muted-foreground">(영향도 {factor.impact})</span>
                  <ImpactBar value={factor.impact} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Tabs Section */}
        <div className="bg-card border border-border rounded-lg">
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab("press")}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === "press" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              }`}
            >
              2.1 프레스 | 이상 징지 탐지
            </button>
            <button
              onClick={() => setActiveTab("body")}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === "body" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              }`}
            >
              2.2 차체 | 로봇 이상 동작 및 충돌 위험 탐지
            </button>
            <button
              onClick={() => setActiveTab("paint")}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === "paint" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              }`}
            >
              2.3 도장 | 도장 품질 이상 탐지
            </button>
            <button
              onClick={() => setActiveTab("assembly")}
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === "assembly" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              }`}
            >
              2.4 의장 조립 | 조립 순서 오류 탐지
            </button>
          </div>

          <div className="p-4">
            {activeTab === "press" && (
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <div className="flex items-center gap-8 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">평균값 가동률</p>
                      <p className="text-2xl font-bold">12,458 <span className="text-sm font-normal">ea</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">이상 탐지</p>
                      <p className="text-2xl font-bold">152.3 <span className="text-sm font-normal">ea</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">핵심 편차</p>
                      <p className="text-2xl font-bold">15.2 <span className="text-sm font-normal">ea</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">전일 대비 변화</p>
                      <p className="text-2xl font-bold text-destructive">2 <span className="text-sm font-normal">건</span></p>
                    </div>
                  </div>
                  <h4 className="text-sm font-medium mb-2">전류 RMS 및 CNT 추이</h4>
                  <div className="flex items-center gap-4 mb-2 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-primary" />
                      <span>정상</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-destructive" />
                      <span>이상</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-success" />
                      <span>최심</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={pressData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#64748b" />
                      <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke="#64748b" label={{ value: 'RMS (ea)', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} stroke="#64748b" label={{ value: 'CNT (ea)', angle: 90, position: 'insideRight', fontSize: 10 }} />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155" }} />
                      <Line yAxisId="left" type="monotone" dataKey="normal" stroke="#00d4ff" name="정상" dot={false} strokeWidth={2} />
                      <Line yAxisId="left" type="monotone" dataKey="abnormal" stroke="#ef4444" name="이상" dot={false} strokeWidth={2} strokeDasharray="5 5" />
                      <Line yAxisId="right" type="monotone" dataKey="max" stroke="#22c55e" name="최심" dot={false} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-destructive/10 border border-destructive/30 rounded p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <span className="font-medium text-destructive">프레스 이상 탐지</span>
                  </div>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• CNT 증가 전체 감지</li>
                    <li>• 전류 간 급감 패턴 감지</li>
                    <li>• Timestamp 지연 발생</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === "body" && (
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <div className="flex items-center gap-8 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">용접 포인트 수</p>
                      <p className="text-2xl font-bold">3,842 <span className="text-sm font-normal">개</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">이상 발생</p>
                      <p className="text-2xl font-bold text-warning">18 <span className="text-sm font-normal">건</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">전일 대비</p>
                      <p className="text-2xl font-bold text-success">-3 <span className="text-sm font-normal">건</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">충돌 위험도</p>
                      <p className="text-2xl font-bold text-warning">12% <span className="text-sm font-normal">(경고)</span></p>
                    </div>
                  </div>
                  <h4 className="text-sm font-medium mb-2">용접 품질 및 서보 모터 온도 추이</h4>
                  <div className="flex items-center gap-4 mb-2 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-primary" />
                      <span>용접 포인트</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-success" />
                      <span>품질</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-warning" />
                      <span>서보 온도</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={bodyRobotData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#64748b" />
                      <YAxis tick={{ fontSize: 10 }} stroke="#64748b" />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155" }} />
                      <Line type="monotone" dataKey="weldPoints" stroke="#00d4ff" name="용접 포인트" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="quality" stroke="#22c55e" name="품질" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="temperature" stroke="#f59e0b" name="서보 온도" dot={false} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-warning/10 border border-warning/30 rounded p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    <span className="font-medium text-warning">충돌 위험 감지</span>
                  </div>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>- 로봇 암 R3 동작 패턴 이상</li>
                    <li>- 서보 모터 온도 상승 (58°C)</li>
                    <li>- 센서 통신 지연 (5ms)</li>
                    <li>- 용접 포인트 S12 품질 저하</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === "paint" && (
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <div className="flex items-center gap-8 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">도장 분석 건수</p>
                      <p className="text-2xl font-bold">{paintKpis.analysisCount.toLocaleString()} <span className="text-sm font-normal">건</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">불량 감지율</p>
                      <p className="text-2xl font-bold text-destructive">{paintKpis.defectRate.toFixed(1)}% <span className="text-sm font-normal">(이상/DEFECT)</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">평균 품질 점수</p>
                      <p className="text-2xl font-bold text-success">{paintKpis.averageQuality.toFixed(1)} <span className="text-sm font-normal">점</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">위험 알람 건수</p>
                      <p className="text-2xl font-bold text-warning">{paintKpis.riskAlarmCount} <span className="text-sm font-normal">건</span></p>
                    </div>
                  </div>
                  <h4 className="text-sm font-medium mb-2">도장 품질 지표 추이</h4>
                  <div className="flex items-center gap-4 mb-2 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-primary" />
                      <span>불량 점수</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-destructive" />
                      <span>표면 품질 점수</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-warning" />
                      <span>도장 두께</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={paintChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#64748b" />
                      <YAxis tick={{ fontSize: 10 }} stroke="#64748b" />
                      <Tooltip content={<PaintTooltip />} />
                      <Legend />
                      <Line type="monotone" dataKey="defectScoreScaled" stroke="#00d4ff" name="불량 점수" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="surfaceQualityScore" stroke="#ef4444" name="표면 품질 점수" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="thicknessValue" stroke="#f59e0b" name="도장 두께" dot={false} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-destructive/10 border border-destructive/30 rounded p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <span className="font-medium text-destructive">도장 품질 이상 감지</span>
                  </div>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>- 비전 불량 라벨 감지: {paintAlert.visionLabel}</li>
                    <li>- 불량 점수 상승: defect_score {paintAlert.defectScore.toFixed(2)}</li>
                    <li>- 표면 품질 점수 저하: surface_quality_score {paintAlert.surfaceQualityScore.toFixed(1)}</li>
                    <li>- 도장 두께 이상 의심: thickness_value {paintAlert.thicknessValue.toFixed(1)}</li>
                    <li>- 온도 균일도 이상: thermal_std_temp {paintAlert.thermalStdTemp.toFixed(1)}</li>
                    <li>- 위험도/등급: {paintAlert.riskScore.toFixed(1)} / {paintAlert.severity}</li>
                    <li>- {paintAlert.analysisMessage}</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === "assembly" && (
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <div className="flex items-center gap-8 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">분석 차량 수</p>
                      <p className="text-2xl font-bold">{assemblyKpis.carCount} <span className="text-sm font-normal">대</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">순서 오류 건수</p>
                      <p className="text-2xl font-bold text-destructive">{assemblyKpis.sequenceErrors} <span className="text-sm font-normal">건</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">누락 부품 건수</p>
                      <p className="text-2xl font-bold text-warning">{assemblyKpis.missingParts} <span className="text-sm font-normal">건</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">체결 오류 건수</p>
                      <p className="text-2xl font-bold text-destructive">{assemblyKpis.fasteningErrors} <span className="text-sm font-normal">건</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">평균 위험도 점수</p>
                      <p className="text-2xl font-bold text-warning">{assemblyKpis.averageRisk.toFixed(1)} <span className="text-sm font-normal">점</span></p>
                    </div>
                  </div>
                  <h4 className="text-sm font-medium mb-2">차량별 조립 분석 결과</h4>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground text-xs">
                        <th className="text-left py-2">차량 ID</th>
                        <th className="text-left py-2">기준 순서</th>
                        <th className="text-left py-2">실제 순서</th>
                        <th className="text-center py-2">순서 오류</th>
                        <th className="text-center py-2">누락 부품</th>
                        <th className="text-center py-2">체결 오류</th>
                        <th className="text-center py-2">위험도</th>
                        <th className="text-center py-2">상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assemblyData.map((row) => (
                        <tr key={row.carId} className="border-t border-border">
                          <td className="py-2">{row.carId}</td>
                          <td className="py-2">{formatSequence(row.expectedSequence)}</td>
                          <td className="py-2">{formatSequence(row.actualSequence)}</td>
                          <td className={`text-center font-medium ${row.sequenceErrorCount > 0 ? "text-destructive" : "text-success"}`}>{row.sequenceErrorCount}</td>
                          <td className={`text-center font-medium ${row.missingPartCount > 0 ? "text-warning" : "text-success"}`}>{row.missingPartCount}</td>
                          <td className={`text-center font-medium ${row.fasteningErrorCount > 0 ? "text-destructive" : "text-success"}`}>{row.fasteningErrorCount}</td>
                          <td className={`text-center font-medium ${getRiskTextClass(row.riskScore)}`}>{row.riskScore.toFixed(1)}</td>
                          <td className="text-center">
                            <span className={`px-2 py-0.5 rounded text-xs ${getStatusBadgeClass(row.severity, row.isAbnormal)}`}>
                              {getAssemblyStatus(row.severity, row.isAbnormal)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="bg-destructive/10 border border-destructive/30 rounded p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <span className="font-medium text-destructive">조립 순서 오류 감지</span>
                  </div>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>- 기준 순서: {formatSequence(assemblyAlert.expectedSequence)}</li>
                    <li>- 실제 순서: {formatSequence(assemblyAlert.actualSequence)}</li>
                    <li>- 순서 오류: {assemblyAlert.sequenceErrorCount}건</li>
                    <li>- 체결 오류: {assemblyAlert.fasteningErrorCount}건</li>
                    <li>- 누락 부품: {assemblyAlert.missingPartCount}건</li>
                    <li>- 위험도/등급: {assemblyAlert.riskScore.toFixed(1)} / {assemblyAlert.severity}</li>
                    <li>- {assemblyAlert.analysisMessage}</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mascot */}
        <Mascot />
      </main>
      <Footer />
    </div>
    </AuthGuard>
  )
}

function StageIcon({ type }: { type: string }) {
  switch (type) {
    case "프레스":
      return (
        <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="4" y="2" width="16" height="6" rx="1" />
          <rect x="8" y="8" width="8" height="10" />
          <rect x="6" y="18" width="12" height="4" rx="1" />
        </svg>
      )
    case "차체":
      return (
        <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M5 17 L8 13 L16 13 L19 17" />
          <rect x="4" y="17" width="16" height="3" rx="1" />
          <path d="M9 13 L10 9 L14 9 L15 13" />
        </svg>
      )
    case "도장":
      return (
        <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="10" width="8" height="12" rx="2" />
          <path d="M11 14 L18 6 L21 9 L14 17" />
        </svg>
      )
    case "의장":
      return (
        <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M5 17 L8 13 L16 13 L19 17" />
          <rect x="4" y="17" width="16" height="3" rx="1" />
          <rect x="9" y="6" width="6" height="7" rx="1" />
        </svg>
      )
    case "연계 분석":
      return (
        <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8 L12 12 L15 14" />
        </svg>
      )
    default:
      return null
  }
}

function RiskIndicator({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5 justify-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-sm ${
            i <= level
              ? level >= 4 ? "bg-destructive" : level >= 2 ? "bg-warning" : "bg-success"
              : "bg-secondary"
          }`}
        />
      ))}
    </div>
  )
}

function ImpactBar({ value }: { value: number }) {
  const getColor = (val: number) => {
    if (val >= 0.3) return "bg-destructive"
    if (val >= 0.2) return "bg-orange-500"
    if (val >= 0.15) return "bg-warning"
    return "bg-success"
  }
  
  return (
    <div className="w-20 h-3 bg-secondary rounded overflow-hidden">
      <div className={`h-full ${getColor(value)}`} style={{ width: `${value * 200}%` }} />
    </div>
  )
}
