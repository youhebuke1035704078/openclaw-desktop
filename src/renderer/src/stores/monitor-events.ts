import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

const MAX_EVENTS = 1000

export const useMonitorEventsStore = defineStore('monitorEvents', () => {
  const events = ref<any[]>([])
  const paused = ref(false)

  const eventCount = computed(() => events.value.length)

  function addEvent(event: any) {
    if (paused.value) return
    events.value.unshift(event)
    if (events.value.length > MAX_EVENTS) events.value.length = MAX_EVENTS
  }

  function clearEvents() {
    events.value = []
  }

  function filterByType(type: string) {
    return events.value.filter((e: any) => e.event === type)
  }

  return { events, paused, eventCount, addEvent, clearEvents, filterByType }
})
