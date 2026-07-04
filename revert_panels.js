const fs = require('fs');

const pressJSX = fs.readFileSync('press_original.jsx', 'utf-8');
const bodyJSX = fs.readFileSync('body_original.jsx', 'utf-8');
const paintJSX = fs.readFileSync('paint_original.jsx', 'utf-8');
const assemblyJSX = fs.readFileSync('assembly_original.jsx', 'utf-8');

const imports = `import React from "react"
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
} from "recharts"
import { PaintTooltip } from "./useManufacturingDashboard"

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case "NORMAL":
      return "bg-green-500/10 text-green-500 border-green-500/20"
    case "WARNING":
      return "bg-amber-500/10 text-amber-500 border-amber-500/20"
    case "DANGER":
      return "bg-red-500/10 text-red-500 border-red-500/20"
    default:
      return "bg-gray-500/10 text-gray-500 border-gray-500/20"
  }
}

const formatSequence = (seq: number) => {
  return seq.toString().padStart(4, "0")
}

const getAssemblyStatus = (score: number) => {
  if (score >= 80) return { label: "위험", className: "text-red-500", bg: "bg-red-500" }
  if (score >= 50) return { label: "경고", className: "text-amber-500", bg: "bg-amber-500" }
  return { label: "정상", className: "text-green-500", bg: "bg-green-500" }
}

`;

function wrapComponent(name, jsx) {
  return imports + `export function ${name}({ dashboard }: { dashboard: any }) {
  const {
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
    pressChartWindowSize,
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
  } = dashboard;

  return (
    ${jsx}
  );
}
`;
}

fs.writeFileSync('src/components/manufacturing/PressAnomalyPanel.tsx', wrapComponent('PressAnomalyPanel', pressJSX));
fs.writeFileSync('src/components/manufacturing/BodyAnomalyPanel.tsx', wrapComponent('BodyAnomalyPanel', bodyJSX));
fs.writeFileSync('src/components/manufacturing/PaintAnomalyPanel.tsx', wrapComponent('PaintAnomalyPanel', paintJSX));
fs.writeFileSync('src/components/manufacturing/AssemblyAnomalyPanel.tsx', wrapComponent('AssemblyAnomalyPanel', assemblyJSX));

let pageContent = fs.readFileSync('src/pages/ManufacturingPage.tsx', 'utf-8');

pageContent = pageContent.replace(/<PressAnomalyPanel[\s\S]*?\/>/g, '<PressAnomalyPanel dashboard={dashboard} />');
pageContent = pageContent.replace(/<BodyAnomalyPanel[\s\S]*?\/>/g, '<BodyAnomalyPanel dashboard={dashboard} />');
pageContent = pageContent.replace(/<PaintAnomalyPanel[\s\S]*?\/>/g, '<PaintAnomalyPanel dashboard={dashboard} />');
pageContent = pageContent.replace(/<AssemblyAnomalyPanel[\s\S]*?\/>/g, '<AssemblyAnomalyPanel dashboard={dashboard} />');

fs.writeFileSync('src/pages/ManufacturingPage.tsx', pageContent);
console.log('Restored panels to their original implementation!');
