'use client'

import { useEffect, useRef, useCallback } from 'react'

const HUB_URL = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ?? 'http://localhost:5000') + '/hubs/pm'
  : ''

type EventHandler = (data: unknown) => void

export function useSignalR(
  events: Record<string, EventHandler>,
  projectId?: string
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const connectionRef = useRef<any>(null)
  const eventsRef = useRef(events)
  eventsRef.current = events

  const getToken = useCallback(() => {
    try {
      const raw = localStorage.getItem('pm-auth')
      if (raw) {
        const state = JSON.parse(raw)
        return state?.state?.token ?? ''
      }
    } catch {}
    return ''
  }, [])

  useEffect(() => {
    if (!HUB_URL) return

    let stopped = false

    import('@microsoft/signalr').then((signalR) => {
      if (stopped) return

      const connection = new signalR.HubConnectionBuilder()
        .withUrl(HUB_URL, {
          accessTokenFactory: getToken,
          transport: signalR.HttpTransportType.WebSockets,
        })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Warning)
        .build()

      connectionRef.current = connection

      Object.entries(eventsRef.current).forEach(([event, handler]) => {
        connection.on(event, handler)
      })

      connection.start()
        .then(async () => {
          if (projectId) {
            await connection.invoke('JoinProject', projectId)
          }
        })
        .catch((err: unknown) => console.warn('[SignalR] Connection failed:', err))
    })

    return () => {
      stopped = true
      const conn = connectionRef.current
      if (conn) {
        if (projectId) {
          conn.invoke('LeaveProject', projectId).catch(() => {})
        }
        conn.stop().catch(() => {})
        connectionRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, getToken])
}
