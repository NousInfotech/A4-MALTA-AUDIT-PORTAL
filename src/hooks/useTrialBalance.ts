// @ts-nocheck

import { useState, useEffect } from "react"

interface TrialBalanceData {
  _id: string
  engagement: string
  headers: string[]
  rows: any[][]
  fetchedAt: string
}

export const useTrialBalance = (engagementId: string) => {
  const [trialBalance, setTrialBalance] = useState<TrialBalanceData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTrialBalance = async () => {
    if (!engagementId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${import.meta.env.VITE_APIURL}/api/engagements/${engagementId}/trial-balance`)
      if (!response.ok) {
        if (response.status === 404) {
          setTrialBalance(null)
          return
        }
        throw new Error("Failed to fetch trial balance")
      }

      const data = await response.json()
      setTrialBalance(data)
    } catch (err: any) {
      setError(err.message)
      setTrialBalance(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTrialBalance()
  }, [engagementId])

  return {
    trialBalance,
    loading,
    error,
    refetch: fetchTrialBalance,
  }
}
