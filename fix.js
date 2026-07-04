const fs = require('fs');
const content = fs.readFileSync('src/components/manufacturing/useManufacturingDashboard.tsx', 'utf-8');

const targetContent = `      setDefectPredictionRows((prevRows) => {
        const existingVehicleIds = new Set(prevRows.map((row) => row.vehicleId))
        const nextRows = result.content.filter((row) => !existingVehicleIds.has(row.vehicleId))
        return [...prevRows, ...nextRows]`;

const endIndexString = `    } finally {
      if (initializedDefectCauseVehicleRef.current === requestKey) {
        isDefectCauseLoadingRef.current = false
        setIsDefectCauseLoading(false)
      }
    }
  }, [])`;

const replacementContent = `      setDefectPredictionRows((prevRows) => {
        const existingVehicleIds = new Set(prevRows.map((row) => row.vehicleId))
        const nextRows = result.content.filter((row) => !existingVehicleIds.has(row.vehicleId))
        return [...prevRows, ...nextRows]
      })
      hasNextDefectPredictionRef.current = result.hasNext
      setHasNextDefectPrediction(result.hasNext)
      setDefectPredictionCursor(result.hasNext ? result.nextCursor : null)
    } catch (error) {
      requestedDefectPredictionCursorsRef.current.delete(cursor)
      setDefectPredictionError(error instanceof Error ? error.message : "불량 전이 예측 데이터를 불러오지 못했습니다.")
    } finally {
      isDefectPredictionLoadingRef.current = false
      setIsDefectPredictionLoading(false)
    }
  }, [])

  const handleDefectPredictionScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget
    const isNearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 24

    if (isNearBottom && hasNextDefectPredictionRef.current && !isDefectPredictionLoadingRef.current) {
      void fetchDefectPredictionRows(defectPredictionCursor)
    }
  }

  const resetDefectCauses = useCallback(() => {
    requestedDefectCauseCursorsRef.current.clear()
    hasNextDefectCauseRef.current = true
    isDefectCauseLoadingRef.current = false
    setDefectCauseRows([])
    setDefectCauseCursor(DEFECT_TRANSFER_INITIAL_CURSOR)
    setHasNextDefectCause(true)
    setIsDefectCauseLoading(false)
    setDefectCauseError(null)
    setDefectCauseSummary(null)
  }, [])

  const fetchDefectCauseRows = useCallback(async (cursor: number | null, vehicleId: string | null) => {
    if (cursor === null) return
    const requestKey = vehicleId || "__default__"
    if (cursor === DEFECT_TRANSFER_INITIAL_CURSOR) {
      initializedDefectCauseVehicleRef.current = requestKey
    }
    if (requestedDefectCauseCursorsRef.current.has(cursor)) return
    if (!hasNextDefectCauseRef.current && cursor !== DEFECT_TRANSFER_INITIAL_CURSOR) return

    requestedDefectCauseCursorsRef.current.add(cursor)
    isDefectCauseLoadingRef.current = true
    setIsDefectCauseLoading(true)
    setDefectCauseError(null)

    try {
      const result = await fetchDefectTransferCauses({
        vehicleId,
        size: DEFECT_TRANSFER_PAGE_SIZE,
        cursor,
      })

      if (initializedDefectCauseVehicleRef.current !== requestKey) return

      setDefectCauseSummary(result)
      setDefectCauseRows((prevRows) => {
        const existingRanks = new Set(prevRows.map((row) => row.rank))
        const nextRows = result.content.filter((row) => !existingRanks.has(row.rank))
        return [...prevRows, ...nextRows]
      })
      hasNextDefectCauseRef.current = result.hasNext
      setHasNextDefectCause(result.hasNext)
      setDefectCauseCursor(result.hasNext ? result.nextCursor : null)
    } catch (error) {
      if (initializedDefectCauseVehicleRef.current !== requestKey) return
      requestedDefectCauseCursorsRef.current.delete(cursor)
      setDefectCauseError(error instanceof Error ? error.message : "SHAP 원인 분석 데이터를 불러오지 못했습니다.")
    } finally {
      if (initializedDefectCauseVehicleRef.current === requestKey) {
        isDefectCauseLoadingRef.current = false
        setIsDefectCauseLoading(false)
      }
    }
  }, [])`;

const startIndex = content.indexOf(targetContent);
if (startIndex === -1) {
  console.log('Start index not found');
  process.exit(1);
}
const endIndex = content.indexOf(endIndexString, startIndex);
if (endIndex === -1) {
  console.log('End index not found');
  process.exit(1);
}

const newContent = content.slice(0, startIndex) + replacementContent + content.slice(endIndex + endIndexString.length);
fs.writeFileSync('src/components/manufacturing/useManufacturingDashboard.tsx', newContent);
console.log('File successfully updated!');
