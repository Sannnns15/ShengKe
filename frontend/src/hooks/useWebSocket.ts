import { useEffect, useRef, useCallback } from 'react'
import { getAccessToken } from '../utils/storage'
import { API_BASE_URL } from '../constants/config'

interface UseWebSocketOptions {
  onNotification?: (data: any) => void
  enabled?: boolean
}

export function useWebSocket({
  onNotification,
  enabled = true,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const onNotificationRef = useRef(onNotification)

  // Keep callback ref fresh without re-triggering effect
  onNotificationRef.current = onNotification

  const connect = useCallback(async () => {
    const token = await getAccessToken()
    if (!token) return

    const wsUrl = API_BASE_URL.replace(/^http/, 'ws') + '/ws?token=' + token
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      // WebSocket connected
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'notification' && onNotificationRef.current) {
          onNotificationRef.current(data.data)
        }
      } catch {
        // Ignore parse errors (heartbeat pings, etc.)
      }
    }

    ws.onclose = () => {
      // Auto-reconnect after 5s
      reconnectTimeoutRef.current = setTimeout(() => {
        connect()
      }, 5000)
    }

    ws.onerror = () => {
      // onclose will fire after onerror, so reconnect is handled there
    }

    wsRef.current = ws
  }, []) // no deps — uses refs for callbacks

  // Heartbeat
  useEffect(() => {
    if (!enabled) return

    const heartbeat = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send('ping')
      }
    }, 30000)

    return () => clearInterval(heartbeat)
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    connect()

    return () => {
      clearTimeout(reconnectTimeoutRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null // prevent reconnect on intentional close
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect, enabled])
}
