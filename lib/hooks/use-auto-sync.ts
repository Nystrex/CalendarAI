"use client"

import { useEffect, useRef, useCallback } from "react"

export function useAutoSync(intervalMinutes = 30, onSyncComplete?: () => void) {
  const intervalRef = useRef<NodeJS.Timeout>()
  const isSyncingRef = useRef(false)
  const lastSyncRef = useRef<number>(0)

  const syncGoogleCalendar = useCallback(async () => {
    if (isSyncingRef.current) {
      return
    }

    const now = Date.now()
    const timeSinceLastSync = now - lastSyncRef.current
    if (timeSinceLastSync < 120000) {
      return
    }

    isSyncingRef.current = true
    lastSyncRef.current = now

    try {
      const response = await fetch("/api/google/sync", {
        method: "POST",
      })

      // Don't retry if it's a 503 (OAuth not configured) or 400 (not connected)
      if (response.status === 503 || response.status === 400) {
        // Stop trying to sync if Google isn't configured
        isSyncingRef.current = false
        return
      }

      if (response.ok) {
        if (onSyncComplete) {
          setTimeout(() => onSyncComplete(), 3000)
        }
      }
    } catch (error) {
      // Silently fail auto-sync
    } finally {
      isSyncingRef.current = false
    }
  }, [onSyncComplete])

  useEffect(() => {
    const initialTimeout = setTimeout(() => {
      syncGoogleCalendar()
    }, 5000)

    intervalRef.current = setInterval(
      () => {
        syncGoogleCalendar()
      },
      intervalMinutes * 60 * 1000,
    )

    return () => {
      clearTimeout(initialTimeout)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [intervalMinutes, syncGoogleCalendar])

  return { syncNow: syncGoogleCalendar }
}
