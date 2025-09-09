"use client"

import { useCallback } from "react"
import { useSearchParams } from "react-router-dom"

export const useQueryParams = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  const getParam = useCallback(
    (key: string): string | null => {
      return searchParams.get(key)
    },
    [searchParams],
  )

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const newParams = new URLSearchParams(searchParams)
      if (value === null || value === "") {
        newParams.delete(key)
      } else {
        newParams.set(key, value)
      }
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const setParams = useCallback(
    (params: Record<string, string | null>) => {
      const newParams = new URLSearchParams(searchParams)
      Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === "") {
          newParams.delete(key)
        } else {
          newParams.set(key, value)
        }
      })
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  return { getParam, setParam, setParams }
}
