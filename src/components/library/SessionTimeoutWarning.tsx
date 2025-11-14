// @ts-nocheck
import { useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { updateSessionActivity } from "@/lib/api/global-library"
import { useToast } from "@/hooks/use-toast"

export function SessionTimeoutWarning() {
  const [warning, setWarning] = useState<{ show: boolean; minutesLeft: number }>({ show: false, minutesLeft: 0 })
  const [checking, setChecking] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    let isMounted = true
    
    const checkSession = async () => {
      try {
        const result = await updateSessionActivity()
        if (!isMounted) return
        
        if (result.active) {
          if (result.shouldWarn) {
            setWarning({ show: true, minutesLeft: result.minutesUntilTimeout })
          } else {
            setWarning({ show: false, minutesLeft: 0 })
          }
        } else {
          // Session expired
          setWarning({ show: true, minutesLeft: 0 })
          toast({
            title: "Session Expired",
            description: "Your session has expired. Please refresh the page.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Session check failed:", error)
        // On error, don't show warning (might be network issue)
        if (isMounted) {
          setWarning({ show: false, minutesLeft: 0 })
        }
      }
    }

    // Check every minute
    const interval = setInterval(checkSession, 60000)
    checkSession() // Initial check

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [toast])

  const handleRefresh = async () => {
    setChecking(true)
    try {
      await updateSessionActivity()
      setWarning({ show: false, minutesLeft: 0 })
      toast({
        title: "Session Refreshed",
        description: "Your session has been extended",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh session",
        variant: "destructive",
      })
    } finally {
      setChecking(false)
    }
  }

  if (!warning.show) return null

  return (
    <Alert className="fixed bottom-4 right-4 max-w-md z-50 border-yellow-200 bg-yellow-50">
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-800">Session Timeout Warning</AlertTitle>
      <AlertDescription className="text-yellow-700">
        {warning.minutesLeft > 0 ? (
          <>
            Your session will expire in {warning.minutesLeft} minute{warning.minutesLeft !== 1 ? "s" : ""}.
            Click refresh to extend your session.
          </>
        ) : (
          "Your session has expired. Please refresh the page to continue."
        )}
      </AlertDescription>
      {warning.minutesLeft > 0 && (
        <Button
          size="sm"
          onClick={handleRefresh}
          disabled={checking}
          className="mt-2"
        >
          {checking ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh Session
        </Button>
      )}
    </Alert>
  )
}

