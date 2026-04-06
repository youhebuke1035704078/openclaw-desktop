import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useGatewayStore } from './gateway'

export const useNodeStore = defineStore('node', () => {
  const nodes = ref<any[]>([])
  const loading = ref(false)

  const gwStore = useGatewayStore()

  async function fetchNodes() {
    loading.value = true
    try {
      nodes.value = (await gwStore.rpc.listNodes()) as any[]
    } catch {
      nodes.value = []
    } finally {
      loading.value = false
    }
  }

  async function invokeNode(params: any) {
    return await gwStore.rpc.invokeNode(params)
  }

  async function requestPairing(nodeId: string) {
    await gwStore.rpc.requestNodePairing({ nodeId })
  }

  async function approvePairing(nodeId: string, code: string) {
    await gwStore.rpc.approveNodePairing({ nodeId, code })
    await fetchNodes()
  }

  return { nodes, loading, fetchNodes, invokeNode, requestPairing, approvePairing }
})
