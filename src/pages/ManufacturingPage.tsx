"use client"

import { AuthGuard } from "@/components/auth-guard"
import { Footer } from "@/components/dashboard/footer"
import { Header } from "@/components/dashboard/header"
import { Mascot } from "@/components/mascot/mascot"
import { AssemblyAnomalyPanel } from "@/components/manufacturing/AssemblyAnomalyPanel"
import { BodyAnomalyPanel } from "@/components/manufacturing/BodyAnomalyPanel"
import { BottleneckAnalysisPanel } from "@/components/manufacturing/BottleneckAnalysisPanel"
import { DefectTransferPredictionPanel } from "@/components/manufacturing/DefectTransferPredictionPanel"
import { PaintAnomalyPanel } from "@/components/manufacturing/PaintAnomalyPanel"
import { PressAnomalyPanel } from "@/components/manufacturing/PressAnomalyPanel"
import { ProcessFlowSummary } from "@/components/manufacturing/ProcessFlowSummary"
import { ShapCauseAnalysisPanel } from "@/components/manufacturing/ShapCauseAnalysisPanel"
import { ImpactBar, RiskIndicator, StageIcon } from "@/components/manufacturing/ManufacturingIndicators"
import { PaintTooltip, useManufacturingDashboard } from "@/components/manufacturing/useManufacturingDashboard"

export default function ManufacturingPage() {
  const dashboard = useManufacturingDashboard()

  return (
    <AuthGuard>
      <div className="flex min-h-screen flex-col bg-background">
        <Header currentTime={dashboard.currentTime} />
        <main className="relative flex-1 overflow-auto p-4">
          <div className="mb-4">
            <h1 className="text-lg font-semibold">
              ?꾩껜 怨듭젙 ?먮쫫 ?붿빟 諛?蹂묐ぉ ?먯? <span className="font-normal text-muted-foreground">(?ㅼ떆媛?</span>
            </h1>
          </div>

          <ProcessFlowSummary stages={dashboard.topProcessStages} stageCount={dashboard.processStageCount} StageIcon={StageIcon} />

          <div className="mb-6 grid grid-cols-3 gap-4">
            <BottleneckAnalysisPanel
              rows={dashboard.bottleneckRows}
              isLoading={dashboard.isBottleneckLoading}
              error={dashboard.bottleneckError}
              scrollRef={dashboard.bottleneckScrollRef}
              onScroll={dashboard.handleBottleneckScroll}
              formatDelayTime={dashboard.formatDelayTime}
              RiskIndicator={RiskIndicator}
            />
            <DefectTransferPredictionPanel
              rows={dashboard.defectPredictionRows}
              selectedVehicle={dashboard.selectedVehicle}
              defectCauseSummary={dashboard.defectCauseSummary}
              isLoading={dashboard.isDefectPredictionLoading}
              error={dashboard.defectPredictionError}
              scrollRef={dashboard.defectPredictionScrollRef}
              onScroll={dashboard.handleDefectPredictionScroll}
              onSelectVehicle={(vehicleId) => dashboard.setSelectedVehicle(dashboard.selectedVehicle === vehicleId ? "" : vehicleId)}
              formatProbability={dashboard.formatProbability}
              getDefectRiskTextClass={dashboard.getDefectRiskTextClass}
            />
            <ShapCauseAnalysisPanel
              selectedVehicle={dashboard.selectedVehicle}
              vehicleOptions={dashboard.defectPredictionVehicleOptions}
              defectCauseSummary={dashboard.defectCauseSummary}
              defectCauseRows={dashboard.defectCauseRows}
              isLoading={dashboard.isDefectCauseLoading}
              error={dashboard.defectCauseError}
              scrollRef={dashboard.defectCauseScrollRef}
              onScroll={dashboard.handleDefectCauseScroll}
              onChangeVehicle={dashboard.setSelectedVehicle}
              formatProbability={dashboard.formatProbability}
              getDefectRiskTextClass={dashboard.getDefectRiskTextClass}
              ImpactBar={ImpactBar}
            />
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex flex-wrap gap-2 border-b border-border bg-card/70 p-2">
              {[
                { id: "press", label: "2.1 프레스 | 이상 탐지 분석" },
                { id: "body", label: "2.2 차체 | 로봇 이상/진동 분석" },
                { id: "paint", label: "2.3 도장 | 도장 품질 이상 분석" },
                { id: "assembly", label: "2.4 조립 | 조립 순서 오류 분석" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => dashboard.setActiveTab(tab.id)}
                  className={`min-h-9 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    dashboard.activeTab === tab.id
                      ? "bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-400/40"
                      : "bg-background/40 text-muted-foreground hover:bg-background/60 hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-4">
              {dashboard.activeTab === "press" && <PressAnomalyPanel dashboard={dashboard} />}
              {dashboard.activeTab === "body" && <BodyAnomalyPanel dashboard={dashboard} />}
              {dashboard.activeTab === "paint" && <PaintAnomalyPanel dashboard={dashboard} />}
              {dashboard.activeTab === "assembly" && <AssemblyAnomalyPanel dashboard={dashboard} />}
            </div>
          </div>

          <Mascot />
        </main>
        <Footer />
      </div>
    </AuthGuard>
  )
}
