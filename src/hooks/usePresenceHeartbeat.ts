import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

// Marks the logged-in member as "seen now" on load + every 3 minutes
// while the app is open. Drives the green "Active now" dots on
// Dashboard Team Today and Team Overview.
const HEARTBEAT_MS = 3 * 60 * 1000

export function usePresenceHeartbeat() {
  const userId = useAuthStore((s) => s.user?.id)

  useEffect(() => {
    if (!userId) return
    let stopped = false

    const beat = async () => {
      try {
        await supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', userId)
      } catch {
        // best-effort; never break the app over presence
      }
    }

    beat()
    const timer = setInterval(() => { if (!stopped) beat() }, HEARTBEAT_MS)
    const onVisible = () => { if (document.visibilityState === 'visible' && !stopped) beat() }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      stopped = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [userId])
}
