import { ref, onUnmounted } from 'vue'
import { monitorApi } from '../api/monitor-client'
import type { AlertEvent } from '../api/types'

/**
 * Polls the alerts API and sends native Electron notifications
 * when new critical or warning alerts appear.
 */
export function useAlertNotifier(options: { interval?: number } = {}) {
  const { interval = 30000 } = options

  const knownAlertIds = ref(new Set<string>())
  const isFirstFetch = ref(true)
  const enabled = ref(true)
  let timer: ReturnType<typeof setInterval> | null = null

  async function check() {
    if (!enabled.value) return
    try {
      const resp = await monitorApi.getAlerts({ state: 'active', page_size: 50 })
      const paginated = resp?.data as any
      const alerts: AlertEvent[] = paginated?.data ?? []

      if (isFirstFetch.value) {
        // On first fetch, just record existing alert IDs — don't spam notifications
        for (const a of alerts) {
          knownAlertIds.value.add(a.id)
        }
        isFirstFetch.value = false
        return
      }

      for (const alert of alerts) {
        if (knownAlertIds.value.has(alert.id)) continue
        knownAlertIds.value.add(alert.id)

        // Only notify for critical and warning
        if (alert.severity === 'critical' || alert.severity === 'warning') {
          const severityLabel = alert.severity === 'critical' ? '严重' : '警告'
          window.api?.notify(
            '告警通知',
            `[${severityLabel}] ${alert.title}`
          )
        }
      }

      // Clean up stale IDs to prevent unbounded growth
      if (knownAlertIds.value.size > 500) {
        const currentIds = new Set(alerts.map(a => a.id))
        knownAlertIds.value = currentIds
      }
    } catch {
      // Silently ignore — network errors are handled elsewhere
    }
  }

  function start() {
    check()
    timer = setInterval(check, interval)
  }

  function stop() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  function setEnabled(val: boolean) {
    enabled.value = val
    if (!val) stop()
    else if (!timer) start()
  }

  start()
  onUnmounted(stop)

  return { enabled, setEnabled, stop }
}
