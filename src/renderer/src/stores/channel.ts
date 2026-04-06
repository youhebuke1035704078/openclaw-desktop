import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useGatewayStore } from './gateway'

export const useChannelStore = defineStore('channel', () => {
  const channels = ref<any[]>([])
  const loading = ref(false)

  const gwStore = useGatewayStore()

  async function fetchChannels() {
    loading.value = true
    try {
      channels.value = (await gwStore.rpc.listChannels()) as any[]
    } catch {
      channels.value = []
    } finally {
      loading.value = false
    }
  }

  async function authChannel(params: any) {
    return await gwStore.rpc.authChannel(params)
  }

  async function pairChannel(params: any) {
    await gwStore.rpc.pairChannel(params)
    await fetchChannels()
  }

  return { channels, loading, fetchChannels, authChannel, pairChannel }
})
