import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { apiFetch } from '../api/http-client'

export const useBackupStore = defineStore('backup', () => {
  const backupList = ref<any[]>([])
  const tasks = ref<Map<string, any>>(new Map())
  const loading = ref(false)

  const activeTasks = computed(() =>
    Array.from(tasks.value.values()).filter((t: any) => t.status === 'pending' || t.status === 'running')
  )
  const hasActiveTask = computed(() => activeTasks.value.length > 0)

  function generateTaskId(): string {
    return `backup-task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }

  async function fetchBackupList(): Promise<void> {
    loading.value = true
    try {
      const data: any = await apiFetch('/api/backup/list')
      if (data.backups) backupList.value = data.backups
    } catch (error) {
      console.error('[BackupStore] fetchBackupList failed:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function createBackup(params?: any): Promise<any> {
    const taskId = generateTaskId()
    const task: any = { id: taskId, type: 'create', status: 'running', progress: 0, message: '正在创建备份...' }
    tasks.value.set(taskId, task)
    try {
      const data: any = await apiFetch('/api/backup/create', {
        method: 'POST',
        body: JSON.stringify(params || {})
      })
      if (!data.ok) throw new Error(data.error?.message || '备份失败')
      task.status = 'completed'
      task.progress = 100
      tasks.value.set(taskId, { ...task })
      return task
    } catch (error) {
      task.status = 'failed'
      task.error = error instanceof Error ? error.message : '备份失败'
      tasks.value.set(taskId, { ...task })
      throw error
    }
  }

  async function restoreBackup(params: { filename: string }): Promise<any> {
    const taskId = generateTaskId()
    const task: any = { id: taskId, type: 'restore', status: 'running', progress: 0, filename: params.filename }
    tasks.value.set(taskId, task)
    try {
      const data: any = await apiFetch('/api/backup/restore', {
        method: 'POST',
        body: JSON.stringify(params)
      })
      if (!data.ok) throw new Error(data.error?.message || '恢复失败')
      task.status = 'completed'
      task.progress = 100
      tasks.value.set(taskId, { ...task })
      return task
    } catch (error) {
      task.status = 'failed'
      task.error = error instanceof Error ? error.message : '恢复失败'
      tasks.value.set(taskId, { ...task })
      throw error
    }
  }

  async function deleteBackup(filename: string): Promise<void> {
    const data: any = await apiFetch(`/api/backup/delete?filename=${encodeURIComponent(filename)}`, {
      method: 'DELETE'
    })
    if (!data.ok) throw new Error(data.error?.message || '删除失败')
    await fetchBackupList()
  }

  async function initialize(): Promise<void> {
    await fetchBackupList()
  }

  return {
    backupList, tasks, loading, activeTasks, hasActiveTask,
    fetchBackupList, createBackup, restoreBackup, deleteBackup, initialize
  }
})
