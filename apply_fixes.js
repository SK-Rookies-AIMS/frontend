const fs = require('fs');

let content = fs.readFileSync('src/components/manufacturing/useManufacturingDashboard.tsx', 'utf8');

// 1. Prepend imports
const imports = `import { useState, useEffect, useRef, useCallback } from "react"
import {
  BOTTLENECK_INITIAL_CURSOR,
  BOTTLENECK_PAGE_SIZE,
  type BottleneckRow,
  fetchBottleneckAnalysis,
} from "@/api/bottleneckApi"
import {
  DEFECT_TRANSFER_INITIAL_CURSOR,
  DEFECT_TRANSFER_PAGE_SIZE,
  type DefectTransferCauseData,
  type DefectTransferCauseRow,
  type DefectTransferPredictionRow,
  fetchDefectTransferCauses,
  fetchDefectTransferPredictions,
} from "@/api/defectTransferApi"
import {
  type PressAnomalyData,
  fetchPressAnomalyAnalysis,
} from "@/api/pressAnomalyApi"
import {
  type BodyAnomalyData,
  fetchBodyAnalysis,
} from "@/api/bodyAnalysisApi"
import {
  getAssemblyDashboard,
  getAssemblyAvailableDates,
  getEquipmentOperationRate,
  getPaintAvailableDates,
  getPaintDashboard,
} from "@/api/processDashboardApi"

`;
content = imports + content.replace('"use client"\n\n\n', '"use client"\n\n');

// 2. Export PaintTooltip
content = content.replace('const PaintTooltip = ({ active, payload, label }: any) => {', 'export const PaintTooltip = ({ active, payload, label }: any) => {');

// 3. Add useEffect blocks
const useEffects = `  useEffect(() => {
    void fetchBottleneckRows(BOTTLENECK_INITIAL_CURSOR)
  }, [fetchBottleneckRows])

  useEffect(() => {
    void fetchDefectPredictionRows(DEFECT_TRANSFER_INITIAL_CURSOR)
  }, [fetchDefectPredictionRows])

  useEffect(() => {
    resetDefectCauses()
    void fetchDefectCauseRows(DEFECT_TRANSFER_INITIAL_CURSOR, selectedVehicle || null)
  }, [fetchDefectCauseRows, selectedVehicle, resetDefectCauses])

  useEffect(() => {
    void fetchPressAnalysis(selectedPressAnalysisDate)
  }, [fetchPressAnalysis, selectedPressAnalysisDate])

  useEffect(() => {
    void fetchPaintDashboardData(selectedPaintDate)
  }, [fetchPaintDashboardData, selectedPaintDate])

  useEffect(() => {
    void fetchAssemblyDashboardData(selectedAssemblyDate)
  }, [fetchAssemblyDashboardData, selectedAssemblyDate])

  useEffect(() => {
    const timer = setInterval(() => {
`;
content = content.replace('  useEffect(() => {\n    const timer = setInterval(() => {', useEffects);

// 4. Fix fetchDefectCauseRows
const fetchDefectCauseRowsOriginal = `  const fetchDefectCauseRows = useCallback(async (cursor: number | null, vehicleId: string | null) => {
    if (cursor === null) return
    const requestKey = vehicleId || "__default__"
    if (requestedDefectCauseCursorsRef.current.has(cursor)) return`;

const fetchDefectCauseRowsFixed = `  const fetchDefectCauseRows = useCallback(async (cursor: number | null, vehicleId: string | null) => {
    if (cursor === null) return
    const requestKey = vehicleId || "__default__"
    if (cursor === DEFECT_TRANSFER_INITIAL_CURSOR) {
      initializedDefectCauseVehicleRef.current = requestKey
    }
    if (requestedDefectCauseCursorsRef.current.has(cursor)) return`;
    
content = content.replace(fetchDefectCauseRowsOriginal, fetchDefectCauseRowsFixed);

fs.writeFileSync('src/components/manufacturing/useManufacturingDashboard.tsx', content);
console.log("All fixes applied successfully.");
