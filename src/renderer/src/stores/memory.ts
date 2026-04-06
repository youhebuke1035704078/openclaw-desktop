import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useGatewayStore } from './gateway'

const BOOTSTRAP_FILE_ORDER = [
  'AGENTS.md', 'SOUL.md', 'IDENTITY.md', 'USER.md',
  'TOOLS.md', 'HEARTBEAT.md', 'BOOTSTRAP.md'
]
const MEMORY_FILE_ORDER = ['MEMORY.md', 'memory.md']
const KNOWN_FILE_ORDER = [...BOOTSTRAP_FILE_ORDER, ...MEMORY_FILE_ORDER]

function sortKnownFiles(files: any[]): any[] {
  const rank = new Map(KNOWN_FILE_ORDER.map((name, index) => [name, index]))
  return [...files].sort((a: any, b: any) => {
    const ra = rank.has(a.name) ? (rank.get(a.name) as number) : 999
    const rb = rank.has(b.name) ? (rank.get(b.name) as number) : 999
    if (ra !== rb) return ra - rb
    return a.name.localeCompare(b.name)
  })
}

export const useMemoryStore = defineStore('memory', () => {
  const gwStore = useGatewayStore()

  const agents = ref<any[]>([])
  const defaultAgentId = ref('main')
  const selectedAgentId = ref('')
  const workspace = ref('')
  const files = ref<any[]>([])
  const selectedFileName = ref('MEMORY.md')
  const currentContent = ref('')
  const loadingAgents = ref(false)
  const loadingFiles = ref(false)
  const loadingFileContent = ref(false)
  const saving = ref(false)
  const lastError = ref<string | null>(null)

  const docFiles = computed(() => sortKnownFiles(files.value))

  async function fetchAgents() {
    loadingAgents.value = true
    try {
      const result: any = await gwStore.rpc.listAgents()
      agents.value = result.agents || [{ id: 'main' }]
      defaultAgentId.value = result.defaultId || 'main'
    } catch {
      agents.value = [{ id: 'main' }]
      defaultAgentId.value = 'main'
    } finally {
      loadingAgents.value = false
    }
    if (!selectedAgentId.value) selectedAgentId.value = defaultAgentId.value
  }

  async function fetchFiles(agentId = selectedAgentId.value) {
    if (!agentId) return
    loadingFiles.value = true
    try {
      const result: any = await gwStore.rpc.listAgentFiles({ agentId })
      workspace.value = result.workspace || ''
      files.value = sortKnownFiles(result.files || [])
    } catch {
      files.value = []
    } finally {
      loadingFiles.value = false
    }
  }

  async function loadFile(name = selectedFileName.value) {
    if (!selectedAgentId.value || !name) return
    selectedFileName.value = name
    loadingFileContent.value = true
    try {
      const result: any = await gwStore.rpc.getAgentFile({ agentId: selectedAgentId.value, name })
      currentContent.value = result.file?.content || ''
    } catch {
      currentContent.value = ''
    } finally {
      loadingFileContent.value = false
    }
  }

  async function saveFile(content: string, name = selectedFileName.value) {
    if (!selectedAgentId.value || !name) return
    saving.value = true
    try {
      await gwStore.rpc.setAgentFile({ agentId: selectedAgentId.value, name, content })
      currentContent.value = content
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error)
      throw error
    } finally {
      saving.value = false
    }
  }

  async function switchAgent(agentId: string) {
    selectedAgentId.value = agentId
    await fetchFiles(agentId)
    await loadFile(selectedFileName.value)
  }

  async function initialize() {
    await fetchAgents()
    await fetchFiles()
    await loadFile()
  }

  return {
    agents, defaultAgentId, selectedAgentId, workspace, files, docFiles,
    selectedFileName, currentContent, loadingAgents, loadingFiles,
    loadingFileContent, saving, lastError,
    fetchAgents, fetchFiles, loadFile, saveFile, switchAgent, initialize
  }
})
