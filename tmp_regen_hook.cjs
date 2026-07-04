const fs = require("fs")
const path = require("path")
const { execFileSync } = require("child_process")

const source = execFileSync("git", ["show", "HEAD:src/pages/ManufacturingPage.tsx"], { encoding: "utf8" })
const functionMarker = "export default function ManufacturingPage() {"
const functionStart = source.indexOf(functionMarker)
if (functionStart < 0) throw new Error("source function not found")
const bodyStart = functionStart + functionMarker.length
const authGuard = source.indexOf("<AuthGuard>", bodyStart)
if (authGuard < 0) throw new Error("AuthGuard return not found")
const returnStart = source.lastIndexOf("\n  return (", authGuard)
if (returnStart < 0) throw new Error("component return not found")

let top = source.slice(0, functionStart)
top = top.replace(/import \{ Header \} from "@\/components\/dashboard\/header"\r?\n/g, "")
top = top.replace(/import \{ Mascot \} from "@\/components\/dashboard\/mascot"\r?\n/g, "")
top = top.replace(/import \{ Footer \} from "@\/components\/dashboard\/footer"\r?\n/g, "")
top = top.replace(/import \{ AuthGuard \} from "@\/components\/auth-guard"\r?\n/g, "")
top = top.replace(/import \{ ChevronDown, AlertTriangle, CheckCircle \} from "lucide-react"\r?\n/g, "")
top = top.replace(/import \{[\s\S]*?\} from "recharts"\r?\n/g, "")
top = top.replace(/const processStages = \[[\s\S]*?\]\r?\n\r?\n/, `const processStages = [
  { id: "01", processCode: "PRESS", name: "프레스", rate: 92, events: 22, status: "normal", color: "#22c55e" },
  { id: "02", processCode: "BODY", name: "차체", rate: 89, events: 22, status: "warning", color: "#f59e0b" },
  { id: "03", processCode: "PAINT", name: "도장", rate: 87, events: 22, status: "danger", color: "#ef4444", isBottleneck: true },
  { id: "04", processCode: "ASSEMBLY", name: "의장", rate: 91, events: 22, status: "normal", color: "#22c55e" },
  { id: "05", name: "연계 분석", rate: null, defectRate: 78, targetProcess: "도장(L3)", status: "analysis" },
]

`)

let hookBody = source.slice(bodyStart, returnStart)
hookBody = hookBody
  .replaceAll('"?뺤긽"', '"정상"')
  .replaceAll('"?꾪뿕"', '"위험"')
  .replaceAll('"寃쎄퀬"', '"경고"')
  .replaceAll('"?댁긽"', '"이상"')
  .replace(/return `\$\{Number\(hours\.toFixed\(1\)\)\}.*?`;/, 'return `${Number(hours.toFixed(1))}시간`;')
  .replace(/return `\$\{Number\(minutes\.toFixed\(1\)\)\}.*?`;/, 'return `${Number(minutes.toFixed(1))}분`;')
  .replace(/return `\$\{Number\(seconds\.toFixed\(1\)\)\}.*?`;/, 'return `${Number(seconds.toFixed(1))}초`;')

const hookSource = `${top}

export function useManufacturingDashboard() {${hookBody}

  return {
    currentTime,
    activeTab,
    setActiveTab,
    topProcessStages,
    processStageCount: processStages.length,
    bottleneckRows,
    isBottleneckLoading,
    bottleneckError,
    bottleneckScrollRef,
    handleBottleneckScroll,
    defectPredictionRows,
    selectedVehicle,
    defectCauseSummary,
    isDefectPredictionLoading,
    defectPredictionError,
    defectPredictionScrollRef,
    handleDefectPredictionScroll,
    setSelectedVehicle,
    defectPredictionVehicleOptions,
    defectCauseRows,
    isDefectCauseLoading,
    defectCauseError,
    defectCauseScrollRef,
    handleDefectCauseScroll,
    latestPressDisplayData,
    latestPressDisplayRisk,
    selectedPressDate,
    pressDisplayAvailableDates,
    handlePressDateChange,
    pressDisplayData,
    isPressAnalysisLoading,
    pressAnalysisError,
    isPressChartHovered,
    isPressChartDragging,
    handlePressChartPointerDown,
    setIsPressChartHovered,
    visiblePressData,
    pressAnalysis,
    latestBodyData,
    latestBodySeverity,
    selectedBodyDate,
    bodyDateOptions,
    handleBodyDateChange,
    isBodyAnalysisLoading,
    bodyAnalysisError,
    isBodyChartHovered,
    isBodyChartDragging,
    handleBodyChartPointerDown,
    setIsBodyChartHovered,
    visibleBodyData,
    bodyAnalysis,
    paintKpis,
    selectedPaintDate,
    setSelectedPaintDate,
    fetchPaintDashboardData,
    isPaintDatesLoading,
    paintDateOptions,
    paintDatesError,
    paintDashboardError,
    isPaintDashboardLoading,
    paintChartData,
    paintDashboard,
    assemblyKpis,
    selectedAssemblyDate,
    setSelectedAssemblyDate,
    fetchAssemblyDashboardData,
    isAssemblyDatesLoading,
    assemblyDateOptions,
    assemblyDatesError,
    assemblyDashboardError,
    isAssemblyDashboardLoading,
    assemblyData,
    pagedAssemblyData,
    assemblyStartIndex,
    assemblyPage,
    assemblyTotalPages,
    setAssemblyPage,
    assemblyDashboard,
    formatChartTick,
    formatDelayTime,
    formatProbability,
    getDefectRiskTextClass,
    formatSequence,
    getRiskTextClass,
    getStatusBadgeClass,
    getAssemblyStatus,
    pressChartWindowSize: PRESS_CHART_WINDOW_SIZE,
  }
}
`

fs.writeFileSync(path.join("src", "components", "manufacturing", "useManufacturingDashboard.tsx"), hookSource, "utf8")
