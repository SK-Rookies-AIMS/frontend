"use client"

import { Header } from "@/components/dashboard/header"
import { Mascot } from "@/components/mascot/mascot"
import { Footer } from "@/components/dashboard/footer"
import { AuthGuard } from "@/components/auth-guard"
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
      <div className="min-h-screen bg-background flex flex-col">
        <Header currentTime={dashboard.currentTime} />
        <main className="flex-1 p-4 overflow-auto relative">
          <div className="mb-4">
            <h1 className="text-lg font-semibold">
              전체 공정 흐름 요약 및 병목 탐지 <span className="text-muted-foreground font-normal">(실시간)</span>
            </h1>
          </div>

          <ProcessFlowSummary
            stages={dashboard.topProcessStages}
            stageCount={dashboard.processStageCount}
            StageIcon={StageIcon}
          />

          <div className="grid grid-cols-3 gap-4 mb-6">
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

          <div className="bg-card border border-border rounded-lg">
            <div className="flex border-b border-border">
              {[
                { id: "press", label: "2.1 프레스 | 이상 정지 탐지" },
                { id: "body", label: "2.2 차체 | 로봇 이상 동작 및 충돌 위험 탐지" },
                { id: "paint", label: "2.3 도장 | 도장 품질 이상 탐지" },
                { id: "assembly", label: "2.4 의장 조립 | 조립 순서 오류 탐지" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => dashboard.setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 ${
                    dashboard.activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-4">
              {dashboard.activeTab === "press" && (
                <PressAnomalyPanel dashboard={dashboard} />
              )}
              {dashboard.activeTab === "body" && (
                <BodyAnomalyPanel dashboard={dashboard} />
              )}
              {dashboard.activeTab === "paint" && (
                <PaintAnomalyPanel dashboard={dashboard} />
              )}
              {dashboard.activeTab === "assembly" && (
                <AssemblyAnomalyPanel dashboard={dashboard} />
              )}
            </div>
          </div>

          <Mascot />
        </main>
        <Footer />
      </div>
    </AuthGuard>
  )
}
