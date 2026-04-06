import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useGatewayStore } from './gateway'

export const useSessionStore = defineStore('session', () => {
  const sessions = ref<any[]>([])
  const currentSession = ref<any | null>(null)
  const loading = ref(false)

  const gwStore = useGatewayStore()

  async function fetchSessions() {
    loading.value = true
    try {
      const list: any = await gwStore.rpc.listSessions()
      sessions.value = Array.isArray(list) ? list : []
    } catch {
      sessions.value = []
    } finally {
      loading.value = false
    }
  }

  async function fetchSession(key: string) {
    loading.value = true
    try {
      currentSession.value = await gwStore.rpc.getSession({ key })
    } catch {
      currentSession.value = null
    } finally {
      loading.value = false
    }
  }

  async function resetSession(key: string) {
    await gwStore.rpc.resetSession({ key })
    await fetchSessions()
  }

  async function newSession(key: string) {
    await gwStore.rpc.newSession({ key })
    await fetchSessions()
  }

  async function deleteSession(key: string) {
    await gwStore.rpc.deleteSession({ key })
    sessions.value = sessions.value.filter((s: any) => s.key !== key)
  }

  async function spawnSession(params: {
    agentId?: string
    channel?: string
    peer?: string
    label?: string
  }): Promise<string> {
    const result: any = await gwStore.rpc.spawnSession(params)
    return result.sessionKey
  }

  async function createSession(params: {
    agentId?: string
    channel?: string
    peer?: string
    label?: string
  }): Promise<string> {
    const agentId = params.agentId || 'main'
    const channel = params.channel || 'main'
    const peer = params.peer || `webchat-${Date.now()}`
    const sessionKey = `agent:${agentId}:${channel}:dm:${peer}`
    const idempotencyKey = `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

    await gwStore.rpc.sendChatMessage({ sessionKey, message: '/new', idempotencyKey })

    if (params.label) {
      await new Promise((r) => setTimeout(r, 1500))
      await gwStore.rpc.patchSession({ sessionKey, label: params.label })
    }

    await fetchSessions()
    return sessionKey
  }

  async function patchSessionLabel(sessionKey: string, label: string): Promise<void> {
    await gwStore.rpc.patchSession({ sessionKey, label })
    await fetchSessions()
  }

  async function exportSession(key: string): Promise<any> {
    return await gwStore.rpc.exportSession({ key })
  }

  return {
    sessions,
    currentSession,
    loading,
    fetchSessions,
    fetchSession,
    resetSession,
    newSession,
    deleteSession,
    spawnSession,
    createSession,
    patchSessionLabel,
    exportSession
  }
})
