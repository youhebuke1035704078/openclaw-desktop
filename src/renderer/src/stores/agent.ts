import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useGatewayStore } from './gateway'
import { useSessionStore } from './session'

export const useAgentStore = defineStore('agent', () => {
  const agents = ref<any[]>([])
  const defaultAgentId = ref<string>('main')
  const mainKey = ref<string>('')
  const loading = ref(false)
  const error = ref('')
  const lastUpdatedAt = ref<number | null>(null)
  const models = ref<any[]>([])
  let refreshInterval: ReturnType<typeof setInterval> | null = null
  let initialized = false
  const eventUnsubscribes: Array<() => void> = []

  const gwStore = useGatewayStore()
  const sessionStore = useSessionStore()

  const methodUnknown = computed(() => gwStore.gatewayMethods.length === 0)
  const supportsAgents = computed(
    () => methodUnknown.value || gwStore.supportsAnyMethod(['agents.list'])
  )

  const agentStats = computed(() => {
    const stats: Record<string, { sessions: number; input: number; output: number }> = {}
    for (const session of sessionStore.sessions) {
      const agentId = session.agentId || 'main'
      if (!stats[agentId]) stats[agentId] = { sessions: 0, input: 0, output: 0 }
      stats[agentId].sessions++
      if (session.tokenUsage) {
        stats[agentId].input += session.tokenUsage.totalInput
        stats[agentId].output += session.tokenUsage.totalOutput
      }
    }
    return stats
  })

  async function mergeRuntimeSessionAgents(baseAgents: any[]): Promise<any[]> {
    const merged = [...baseAgents]
    const knownIds = new Set(baseAgents.map((a: any) => a.id).filter(Boolean))

    if (sessionStore.sessions.length === 0) {
      try {
        await sessionStore.fetchSessions()
      } catch {
        // ignore
      }
    }

    for (const session of sessionStore.sessions) {
      const agentId = (session.agentId || '').trim()
      if (!agentId || knownIds.has(agentId)) continue
      knownIds.add(agentId)
      merged.push({ id: agentId, name: agentId })
    }

    return merged
  }

  async function fetchAgents() {
    if (!supportsAgents.value) {
      error.value = 'Agent listing is not supported by current Gateway'
      return
    }
    loading.value = true
    error.value = ''
    try {
      const result: any = await gwStore.rpc.listAgents()
      const baseAgents = result.agents || []
      agents.value = await mergeRuntimeSessionAgents(baseAgents)
      defaultAgentId.value = result.defaultId || 'main'
      mainKey.value = result.mainKey || ''
      lastUpdatedAt.value = Date.now()
    } catch (e: any) {
      error.value = e?.message || 'Failed to load agent list'
    } finally {
      loading.value = false
    }
  }

  async function fetchModels() {
    try {
      models.value = (await gwStore.rpc.listModels()) as any[]
    } catch {
      models.value = []
    }
  }

  async function addAgent(params: { id: string; workspace?: string; name?: string }) {
    const workspace = params.workspace || `~/.openclaw/workspace-${params.id}`
    await gwStore.rpc.createAgent({ name: params.id, workspace })

    if (params.name && params.name !== params.id) {
      for (let i = 0; i < 5; i++) {
        try {
          await gwStore.rpc.updateAgent({ agentId: params.id, name: params.name })
          break
        } catch {
          await new Promise((r) => setTimeout(r, 500 * (i + 1)))
        }
      }
    }
    await fetchAgents()
  }

  async function deleteAgent(agentId: string) {
    if (agentId === 'main') throw new Error('Cannot delete the main agent')
    await gwStore.rpc.deleteAgent({ agentId })
    agents.value = agents.value.filter((a: any) => a.id !== agentId)
  }

  async function setAgentIdentity(params: {
    agentId: string
    name?: string
    theme?: string
    emoji?: string
    avatar?: string
  }) {
    if (params.name !== undefined) {
      for (let i = 0; i < 5; i++) {
        try {
          await gwStore.rpc.updateAgent({ agentId: params.agentId, name: params.name })
          break
        } catch {
          await new Promise((r) => setTimeout(r, 500 * (i + 1)))
        }
      }
    }
    await fetchAgents()
  }

  async function setAgentModel(params: { agentId: string; model?: string }) {
    await gwStore.rpc.updateAgent({ agentId: params.agentId, model: params.model })
    await fetchAgents()
  }

  function getAgentById(id: string) {
    return agents.value.find((a: any) => a.id === id)
  }

  function getAgentStats(id: string) {
    return agentStats.value[id] || { sessions: 0, input: 0, output: 0 }
  }

  function startAutoRefresh(intervalMs = 10000): void {
    if (refreshInterval) clearInterval(refreshInterval)
    refreshInterval = setInterval(() => {
      fetchAgents().catch(() => {})
    }, intervalMs)
  }

  function stopAutoRefresh(): void {
    if (refreshInterval) {
      clearInterval(refreshInterval)
      refreshInterval = null
    }
  }

  function cleanupEventListeners(): void {
    while (eventUnsubscribes.length > 0) {
      eventUnsubscribes.pop()?.()
    }
  }

  function setupEventListeners(): void {
    if (eventUnsubscribes.length > 0) return
    eventUnsubscribes.push(
      gwStore.subscribe('agent.created', () => fetchAgents().catch(() => {})),
      gwStore.subscribe('agent.deleted', () => fetchAgents().catch(() => {})),
      gwStore.subscribe('agents.updated', () => fetchAgents().catch(() => {}))
    )
  }

  async function initialize(): Promise<void> {
    if (initialized) return
    initialized = true
    try {
      await fetchAgents()
      await fetchModels()
      setupEventListeners()
    } catch (e) {
      initialized = false
      cleanupEventListeners()
      throw e
    }
  }

  return {
    agents,
    defaultAgentId,
    mainKey,
    loading,
    error,
    lastUpdatedAt,
    models,
    methodUnknown,
    supportsAgents,
    agentStats,
    fetchAgents,
    fetchModels,
    addAgent,
    deleteAgent,
    setAgentIdentity,
    setAgentModel,
    getAgentById,
    getAgentStats,
    startAutoRefresh,
    stopAutoRefresh,
    cleanupEventListeners,
    setupEventListeners,
    initialize
  }
})
