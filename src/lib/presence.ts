// Online / last-active presence helper for team displays.

export interface Presence {
  online: boolean
  label: string
}

const ONLINE_WINDOW_MS = 5 * 60 * 1000 // seen within 5 min = online now

export function getPresence(lastSeenAt?: string | null, now: number = Date.now()): Presence {
  if (!lastSeenAt) return { online: false, label: 'Never active yet' }
  const seen = new Date(lastSeenAt).getTime()
  if (isNaN(seen)) return { online: false, label: 'Never active yet' }
  const diff = now - seen
  if (diff < 0) return { online: true, label: 'Active now' }
  if (diff <= ONLINE_WINDOW_MS) return { online: true, label: 'Active now' }

  const mins = Math.floor(diff / 60000)
  if (mins < 60) return { online: false, label: `Active ${mins}m ago` }
  const hours = Math.floor(mins / 60)
  if (hours < 24) return { online: false, label: `Active ${hours}h ago` }

  const days = Math.floor(hours / 24)
  if (days === 1) return { online: false, label: 'Active yesterday' }
  if (days < 7) return { online: false, label: `Active ${days}d ago` }
  return {
    online: false,
    label: `Active ${new Date(seen).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`,
  }
}
