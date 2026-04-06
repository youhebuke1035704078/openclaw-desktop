import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useGatewayStore } from './gateway'

export const useSkillStore = defineStore('skill', () => {
  const skills = ref<any[]>([])
  const loading = ref(false)
  const installing = ref<string | null>(null)
  const error = ref<string | null>(null)
  const showBundled = ref(true)

  const gwStore = useGatewayStore()

  async function fetchSkills() {
    loading.value = true
    error.value = null
    try {
      skills.value = (await gwStore.rpc.listSkills()) as any[]
    } catch (err) {
      skills.value = []
      error.value = err instanceof Error ? err.message : String(err)
    } finally {
      loading.value = false
    }
  }

  async function installSkill(name: string) {
    installing.value = name
    error.value = null
    try {
      await gwStore.rpc.installSkill({ name })
      await fetchSkills()
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      throw err
    } finally {
      installing.value = null
    }
  }

  async function updateSkills() {
    loading.value = true
    error.value = null
    try {
      await gwStore.rpc.updateSkills()
      await fetchSkills()
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return { skills, loading, installing, error, showBundled, fetchSkills, installSkill, updateSkills }
})
