<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { NTag, NSpace, NButton, NPopover, NProgress } from 'naive-ui'

// ── Desktop App self-update ──
const appVersion = ref('')
const appUpdateAvailable = ref(false)
const appNewVersion = ref('')
const appDownloading = ref(false)
const appDownloadPercent = ref(0)
const appDownloaded = ref(false)
const appUpdateError = ref('')
const appChecking = ref(false)

const updateStatusText = computed(() => {
  if (appDownloaded.value) return '新版本已就绪'
  if (appDownloading.value) return `下载中 ${Math.round(appDownloadPercent.value)}%`
  if (appUpdateAvailable.value) return '检测到新版本'
  if (appChecking.value) return '检查中...'
  return '已是最新'
})

let unsubUpdater: (() => void) | null = null

onMounted(async () => {
  const api = (window as any).api
  if (api?.getVersion) {
    appVersion.value = await api.getVersion()
  }

  if (api?.onUpdaterStatus) {
    unsubUpdater = api.onUpdaterStatus((data: any) => {
      switch (data.event) {
        case 'checking':
          appChecking.value = true
          break
        case 'available':
          appChecking.value = false
          appUpdateAvailable.value = true
          appNewVersion.value = data.version || ''
          break
        case 'not-available':
          appChecking.value = false
          appUpdateAvailable.value = false
          break
        case 'progress':
          appDownloading.value = true
          appDownloadPercent.value = data.percent || 0
          break
        case 'downloaded':
          appDownloading.value = false
          appDownloaded.value = true
          appDownloadPercent.value = 100
          break
        case 'error':
          appChecking.value = false
          appDownloading.value = false
          appUpdateError.value = data.error || '更新失败'
          break
      }
    })
  }
})

onUnmounted(() => {
  unsubUpdater?.()
  unsubUpdater = null
})

async function checkAppUpdate() {
  appUpdateError.value = ''
  const api = (window as any).api
  if (api?.updaterCheck) {
    const result = await api.updaterCheck()
    if (!result.ok && result.error) {
      appUpdateError.value = result.error
    }
  }
}

async function downloadAppUpdate() {
  appUpdateError.value = ''
  appDownloading.value = true
  appDownloadPercent.value = 0
  const api = (window as any).api
  if (api?.updaterDownload) {
    const result = await api.updaterDownload()
    if (!result.ok && result.error) {
      appDownloading.value = false
      appUpdateError.value = result.error
    }
  }
}

function installAppUpdate() {
  const api = (window as any).api
  if (api?.updaterInstall) {
    api.updaterInstall()
  }
}
</script>

<template>
  <NPopover
    v-if="appVersion"
    trigger="click"
    placement="bottom"
    :width="320"
  >
    <template #trigger>
      <NTag
        size="small"
        :bordered="false"
        round
        :type="appUpdateAvailable || appDownloading ? 'warning' : appDownloaded ? 'success' : 'default'"
        style="cursor: pointer;"
      >
        Desktop v{{ appVersion }} · {{ updateStatusText }}
      </NTag>
    </template>
    <div style="padding: 12px;">
      <div style="margin-bottom: 8px; font-size: 13px;">
        当前 Desktop 版本 v{{ appVersion }}{{ appUpdateAvailable && appNewVersion ? `，可升级到 v${appNewVersion}` : '' }}
      </div>

      <!-- Download progress -->
      <NProgress
        v-if="appDownloading"
        type="line"
        :percentage="Math.round(appDownloadPercent)"
        :show-indicator="true"
        style="margin-bottom: 8px;"
      />

      <NSpace :size="8">
        <!-- No update detected yet: check button -->
        <NButton
          v-if="!appUpdateAvailable && !appDownloading && !appDownloaded"
          size="small"
          :type="appChecking ? 'default' : 'primary'"
          :loading="appChecking"
          :disabled="appChecking"
          @click="checkAppUpdate"
        >
          {{ appChecking ? '检查中...' : '检查新版本' }}
        </NButton>
        <!-- Update available: download button -->
        <NButton
          v-if="appUpdateAvailable && !appDownloading && !appDownloaded"
          size="small"
          type="primary"
          @click="downloadAppUpdate"
        >
          下载 v{{ appNewVersion }}
        </NButton>
        <!-- Downloaded: install button -->
        <NButton
          v-if="appDownloaded"
          size="small"
          type="primary"
          @click="installAppUpdate"
        >
          立即安装并重启
        </NButton>
      </NSpace>

      <div v-if="appUpdateError" style="margin-top: 6px; font-size: 12px; color: #d03050;">
        {{ appUpdateError }}
      </div>
      <div v-else-if="!appUpdateAvailable && !appDownloading && !appDownloaded && !appChecking && !appUpdateError" style="margin-top: 6px; font-size: 12px; color: var(--text-color-3);">
        点击检查是否有新版本可用
      </div>
    </div>
  </NPopover>
</template>
