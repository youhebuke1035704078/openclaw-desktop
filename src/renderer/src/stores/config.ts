import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useGatewayStore } from './gateway'

export const useConfigStore = defineStore('config', () => {
  const config = ref<any | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const lastError = ref<string | null>(null)

  const gwStore = useGatewayStore()

  async function fetchConfig() {
    loading.value = true
    lastError.value = null
    try {
      config.value = await gwStore.rpc.getConfig()
    } catch (error) {
      config.value = null
      lastError.value = error instanceof Error ? error.message : String(error)
    } finally {
      loading.value = false
    }
  }

  async function patchConfig(patches: any[]) {
    saving.value = true
    lastError.value = null
    try {
      await gwStore.rpc.patchConfig({ patches })
      await fetchConfig()
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error)
      throw error
    } finally {
      saving.value = false
    }
  }

  async function setConfig(newConfig: any) {
    saving.value = true
    lastError.value = null
    try {
      await gwStore.rpc.setConfig(newConfig)
      await fetchConfig()
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error)
      throw error
    } finally {
      saving.value = false
    }
  }

  async function applyConfig() {
    saving.value = true
    lastError.value = null
    try {
      await gwStore.rpc.applyConfig()
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error)
      throw error
    } finally {
      saving.value = false
    }
  }

  return { config, loading, saving, lastError, fetchConfig, patchConfig, setConfig, applyConfig }
})
