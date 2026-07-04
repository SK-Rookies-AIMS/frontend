const fs = require('fs');

let code = fs.readFileSync('src/components/manufacturing/useManufacturingDashboard.tsx', 'utf8');

// 1. Add state variables
code = code.replace(
  'const [bottleneckRows, setBottleneckRows] = useState<BottleneckRow[]>([])',
  'const [bottleneckRows, setBottleneckRows] = useState<BottleneckRow[]>([])\n  const [mostBottleneckProcess, setMostBottleneckProcess] = useState<string | null>(null)\n  const [mostBottleneckRiskLevel, setMostBottleneckRiskLevel] = useState<string | null>(null)'
);

// 2. Update fetchBottleneckRows to set the new state variables
code = code.replace(
  'setBottleneckRows((prevRows) => [...prevRows, ...result.content])',
  'setBottleneckRows((prevRows) => [...prevRows, ...result.content])\n      if (cursor === BOTTLENECK_INITIAL_CURSOR) {\n        setMostBottleneckProcess(result.mostBottleneckProcess)\n        setMostBottleneckRiskLevel(result.mostBottleneckRiskLevel)\n      }'
);

// 3. Update topProcessStages calculation
const oldTopProcessStages = `  const topProcessStages = processStages.map((stage) => {
    if (stage.rate === null) return stage

    const operationRate = stage.processCode
      ? operationRateByProcess[stage.processCode]?.operationRate
      : undefined
    const events =
      stage.processCode === "PAINT"
        ? paintAbnormalEventCount
        : stage.processCode === "ASSEMBLY"
          ? assemblyAbnormalEventCount
          : stage.events

    return {
      ...stage,
      rate: Number.isFinite(operationRate) ? Math.round(operationRate as number) : stage.rate,
      events,
    }
  })`;

const newTopProcessStages = `  const topProcessStages = processStages.map((stage) => {
    if (stage.id === "05") {
      return {
        ...stage,
        defectRate: defectPredictionRows[0]?.defectProbability ?? stage.defectRate,
        targetProcess: mostBottleneckProcess ?? stage.targetProcess,
      }
    }

    if (stage.rate === null) return stage

    const operationRate = stage.processCode
      ? operationRateByProcess[stage.processCode]?.operationRate
      : undefined
    const events =
      stage.processCode === "PRESS"
        ? (pressAnalysis?.chart?.filter(p => p.isAbnormal).length ?? 0)
        : stage.processCode === "BODY"
          ? (bodyAnalysis?.chart?.filter(p => p.isAbnormal).length ?? 0)
          : stage.processCode === "PAINT"
            ? paintAbnormalEventCount
            : stage.processCode === "ASSEMBLY"
              ? assemblyAbnormalEventCount
              : stage.events

    return {
      ...stage,
      rate: Number.isFinite(operationRate) ? Math.round(operationRate as number) : stage.rate,
      events,
    }
  })`;

code = code.replace(oldTopProcessStages, newTopProcessStages);

// 4. Expose the new state variables in the return object so ProcessFlowSummary can use them
code = code.replace(
  'topProcessStages,',
  'topProcessStages,\n    mostBottleneckProcess,\n    mostBottleneckRiskLevel,'
);

fs.writeFileSync('src/components/manufacturing/useManufacturingDashboard.tsx', code);
console.log('Modified useManufacturingDashboard.tsx');
