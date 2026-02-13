import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export function useDemoMode() {
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkDemoMode = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        // Demo account has a specific user ID
        const demoUserId = "00000000-0000-0000-0000-000000000001"
        setIsDemoMode(user?.id === demoUserId)
      } catch (error) {
        console.error("Error checking demo mode:", error)
        setIsDemoMode(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkDemoMode()
  }, [])

  return { isDemoMode, isLoading }
}
