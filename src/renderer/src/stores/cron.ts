import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useGatewayStore } from './gateway'

export const useCronStore = defineStore('cron', () => {
  const jobs = ref<any[]>([])
  const status = ref<any | null>(null)
  const selectedJobId = ref<string | null>(null)
  const runs = ref<any[]>([])
  const loading = ref(false)
  const statusLoading = ref(false)
  const runsLoading = ref(false)
  const saving = ref(false)
  const lastError = ref<string | null>(null)

  const gwStore = useGatewayStore()

  async function fetchJobs() {
    loading.value = true
    lastError.value = null
    try {
      jobs.value = (await gwStore.rpc.listCrons()) as any[]
    } catch (error) {
      jobs.value = []
      lastError.value = error instanceof Error ? error.message : String(error)
    } finally {
      loading.value = false
    }
  }

  async function fetchStatus() {
    statusLoading.value = true
    try {
      status.value = await gwStore.rpc.getCronStatus()
    } catch {
      status.value = null
    } finally {
      statusLoading.value = false
    }
  }

  async function fetchOverview() {
    await Promise.all([fetchJobs(), fetchStatus()])
  }

  async function fetchRuns(jobId: string, limit = 50) {
    selectedJobId.value = jobId
    runsLoading.value = true
    try {
      runs.value = (await gwStore.rpc.listCronRuns({ jobId, limit })) as any[]
    } catch {
      runs.value = []
    } finally {
      runsLoading.value = false
    }
  }

  function clearRuns() {
    selectedJobId.value = null
    runs.value = []
  }

  async function createJob(params: any) {
    saving.value = true
    try {
      await gwStore.rpc.createCron(params)
      await fetchOverview()
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error)
      throw error
    } finally {
      saving.value = false
    }
  }

  async function updateJob(id: string, params: any) {
    saving.value = true
    try {
      await gwStore.rpc.updateCron({ id, ...params })
      await fetchOverview()
      if (selectedJobId.value === id) await fetchRuns(id)
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error)
      throw error
    } finally {
      saving.value = false
    }
  }

  async function deleteJob(id: string) {
    saving.value = true
    try {
      await gwStore.rpc.deleteCron({ id })
      if (selectedJobId.value === id) clearRuns()
      await fetchOverview()
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error)
      throw error
    } finally {
      saving.value = false
    }
  }

  async function runJob(id: string, mode: 'force' | 'due' = 'force') {
    saving.value = true
    try {
      await gwStore.rpc.runCron({ id, mode })
      await fetchOverview()
      await fetchRuns(id)
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error)
      throw error
    } finally {
      saving.value = false
    }
  }

  return {
    jobs, status, selectedJobId, runs, loading, statusLoading, runsLoading, saving, lastError,
    fetchJobs, fetchStatus, fetchOverview, fetchRuns, clearRuns, createJob, updateJob, deleteJob, runJob
  }
})
