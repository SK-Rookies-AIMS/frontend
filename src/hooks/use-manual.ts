import { useEffect, useState } from "react"

import { getCurrentManual } from "@/api/manualApi"

import { ManualResponse } from "@/types/manual"

export function useManual(eventId?: number) {

  const [manual, setManual] =
    useState<ManualResponse | null>(null)

  const [loading, setLoading] = useState(false)

  useEffect(() => {

    if (eventId === undefined || eventId === null) {
        setManual(null)
        return
    }

    let cancelled = false

    async function load() {

      try {

        setLoading(true)

        const result =
          await getCurrentManual(eventId!)

        if (!cancelled) {
          setManual(result)
        }

      } catch (e) {

        console.error(e)

      } finally {

        if (!cancelled) {
          setLoading(false)
        }

      }

    }

    load()

    return () => {
      cancelled = true
    }

  }, [eventId])

  return {
    manual,
    loading
  }
}