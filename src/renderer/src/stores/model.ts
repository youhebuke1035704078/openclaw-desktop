import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useGatewayStore } from './gateway'

export const useModelStore = defineStore('model', () => {
  const models = ref<any[]>([])
  const loading = ref(false)
  const lastError = ref<string | null>(null)

  const gwStore = useGatewayStore()

  async function fetchModels() {
    loading.value = true
    lastError.value = null
    try {
      models.value = (await gwStore.rpc.listModels()) as any[]
    } catch (error) {
      models.value = []
      lastError.value = error instanceof Error ? error.message : String(error)
    } finally {
      loading.value = false
    }
  }

  return { models, loading, lastError, fetchModels }
})
