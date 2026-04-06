import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiFetch, getAuthToken } from '../api/http-client'
import { useConnectionStore } from './connection'

export const useRemoteDesktopStore = defineStore('remoteDesktop', () => {
  const connectionState = ref<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
  const currentSession = ref<any | null>(null)
  const sessions = ref<any[]>([])
  const config = ref({ width: 1024, height: 768, depth: 24, timeout: 300 })
  const error = ref<string | null>(null)
  const eventSource = ref<EventSource | null>(null)
  const reconnectAttempts = ref(0)
  const heartbeatTimer = ref<ReturnType<typeof setInterval> | null>(null)
  const reconnectTimer = ref<ReturnType<typeof setTimeout> | null>(null)

  const isConnected = computed(() => connectionState.value === 'connected')

  function getBaseUrl(): string {
    return useConnectionStore().currentServer?.url || ''
  }

  async function createSession(nodeId?: string, width?: number, height?: number): Promise<any> {
    try {
      const result: any = await apiFetch('/api/desktop/create', {
        method: 'POST',
        body: JSON.stringify({
          nodeId,
          width: width || config.value.width,
          height: height || config.value.height
        })
      })
      if (result.ok) {
        const session = { id: result.sessionId, nodeId: nodeId || 'local', status: 'creating', width: result.width, height: result.height }
        sessions.value.push(session)
        return session
      }
      throw new Error(result.error?.message || '创建远程桌面会话失败')
    } catch (e) {
      error.value = e instanceof Error ? e.message : '创建远程桌面会话失败'
      return null
    }
  }

  async function loadSessions(): Promise<void> {
    try {
      const result: any = await apiFetch('/api/desktop/list')
      if (result.ok && result.sessions) sessions.value = result.sessions
    } catch { sessions.value = [] }
  }

  function connect(sessionId: string): void {
    if (eventSource.value) disconnect()
    connectionState.value = 'connecting'
    error.value = null
    currentSession.value = sessions.value.find((s: any) => s.id === sessionId) || null

    const baseUrl = getBaseUrl()
    const token = getAuthToken()
    let url = `${baseUrl}/api/desktop/stream?sessionId=${sessionId}`
    if (token) url += `&token=${token}`

    eventSource.value = new EventSource(url)
    eventSource.value.onopen = () => { reconnectAttempts.value = 0 }
    eventSource.value.onmessage = (event) => {
      try { handleEvent(JSON.parse(event.data)) } catch {}
    }
    eventSource.value.onerror = () => {
      connectionState.value = 'error'
      scheduleReconnect()
    }
  }

  function handleEvent(event: any) {
    switch (event.type) {
      case 'connected':
        connectionState.value = 'connected'
        startHeartbeat()
        break
      case 'disconnected':
        connectionState.value = 'disconnected'
        stopHeartbeat()
        break
      case 'frame':
        if (currentSession.value) currentSession.value.frameData = event.data
        break
    }
  }

  function scheduleReconnect() {
    if (reconnectAttempts.value >= 10 || !currentSession.value) return
    reconnectTimer.value = setTimeout(() => {
      reconnectAttempts.value++
      connect(currentSession.value!.id)
    }, 1000 * Math.pow(1.5, reconnectAttempts.value))
  }

  function startHeartbeat() {
    stopHeartbeat()
    heartbeatTimer.value = setInterval(async () => {
      if (isConnected.value && currentSession.value) {
        try {
          await apiFetch('/api/desktop/heartbeat', {
            method: 'POST',
            body: JSON.stringify({ sessionId: currentSession.value.id })
          })
        } catch {}
      }
    }, (config.value.timeout || 300) * 500)
  }

  function stopHeartbeat() {
    if (heartbeatTimer.value) { clearInterval(heartbeatTimer.value); heartbeatTimer.value = null }
  }

  function disconnect() {
    stopHeartbeat()
    if (reconnectTimer.value) { clearTimeout(reconnectTimer.value); reconnectTimer.value = null }
    eventSource.value?.close()
    eventSource.value = null
    connectionState.value = 'disconnected'
    reconnectAttempts.value = 0
  }

  async function destroySession(sessionId?: string): Promise<boolean> {
    const id = sessionId || currentSession.value?.id
    if (!id) return false
    try {
      const result: any = await apiFetch('/api/desktop/destroy', {
        method: 'POST',
        body: JSON.stringify({ sessionId: id })
      })
      if (result.ok) {
        sessions.value = sessions.value.filter((s: any) => s.id !== id)
        if (currentSession.value?.id === id) disconnect()
        return true
      }
      return false
    } catch { return false }
  }

  async function sendMouseEvent(x: number, y: number, buttons: number, type: string): Promise<boolean> {
    if (!isConnected.value || !currentSession.value) return false
    try {
      await apiFetch('/api/desktop/input/mouse', {
        method: 'POST',
        body: JSON.stringify({ sessionId: currentSession.value.id, x, y, buttons, type })
      })
      return true
    } catch { return false }
  }

  async function sendKeyboardEvent(key: string, code: string, type: string, modifiers?: any): Promise<boolean> {
    if (!isConnected.value || !currentSession.value) return false
    try {
      await apiFetch('/api/desktop/input/keyboard', {
        method: 'POST',
        body: JSON.stringify({ sessionId: currentSession.value.id, key, code, type, ...modifiers })
      })
      return true
    } catch { return false }
  }

  return {
    connectionState, currentSession, sessions, config, error, isConnected,
    createSession, loadSessions, connect, disconnect, destroySession,
    sendMouseEvent, sendKeyboardEvent
  }
})
