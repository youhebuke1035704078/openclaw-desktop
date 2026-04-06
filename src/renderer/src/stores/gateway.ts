import { ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { rpcCall } from '../api/rpc-client'
import { connectSSE } from '../api/http-client'

/**
 * Gateway store — replaces Admin's useWebSocketStore.
 * Provides a `rpc` proxy that translates rpc.methodName(params) → HTTP POST /api/rpc.
 * Also manages SSE connection for real-time events.
 */
export const useGatewayStore = defineStore('gateway', () => {
  const state = ref<'disconnected' | 'connecting' | 'connected' | 'failed'>('disconnected')
  const lastError = ref<string | null>(null)
  const reconnectAttempts = ref(0)
  const gatewayMethods = ref<string[]>([])
  const gatewayVersion = ref<string | null>(null)
  const updateAvailable = ref<{
    currentVersion: string
    latestVersion: string
    channel: string
  } | null>(null)

  const eventListeners = new Map<string, Set<(...args: unknown[]) => void>>()
  let sseSource: EventSource | null = null

  // Proxy-based RPC: rpc.listAgents() → rpcCall('listAgents')
  // rpc.getConfig() → rpcCall('getConfig')
  // rpc.setConfig(newConfig) → rpcCall('setConfig', newConfig)
  const rpc = shallowRef(
    new Proxy(
      {},
      {
        get(_target, prop: string) {
          return (...args: unknown[]) => {
            const params =
              args.length === 1 && args[0] && typeof args[0] === 'object'
                ? (args[0] as Record<string, unknown>)
                : args.length > 0
                  ? (() => {
                      // For methods with positional args, pass as-is
                      // Most RPC methods take a single object param
                      if (args.length === 1) return { value: args[0] }
                      return { args }
                    })()
                  : undefined
            return rpcCall(prop, params)
          }
        }
      }
    ) as Record<string, (...args: unknown[]) => Promise<unknown>>
  )

  function subscribe(event: string, handler: (...args: unknown[]) => void): () => void {
    if (!eventListeners.has(event)) {
      eventListeners.set(event, new Set())
    }
    eventListeners.get(event)!.add(handler)

    return () => {
      eventListeners.get(event)?.delete(handler)
    }
  }

  function emitEvent(type: string, data: unknown) {
    const handlers = eventListeners.get(type)
    if (handlers) {
      handlers.forEach((handler) => handler(data))
    }
  }

  function connectSSEStream() {
    sseSource?.close()
    sseSource = connectSSE(
      (event) => {
        emitEvent(event.type, event.data)
      },
      () => {
        // SSE error — will auto-reconnect via browser EventSource
        reconnectAttempts.value++
      }
    )
  }

  async function connect() {
    state.value = 'connecting'
    lastError.value = null

    try {
      // Probe the gateway to verify connectivity
      const info = await rpcCall<{
        version?: string
        features?: { methods?: string[] }
        updateAvailable?: { currentVersion: string; latestVersion: string; channel: string }
      }>('getStatus')

      if (info) {
        gatewayVersion.value = info.version || null
        gatewayMethods.value = info.features?.methods || []
        if (info.updateAvailable) {
          updateAvailable.value = info.updateAvailable
        }
      }

      state.value = 'connected'
      connectSSEStream()
    } catch (e) {
      // If getStatus fails, still try to connect — some gateways don't have it
      state.value = 'connected'
      connectSSEStream()
    }
  }

  function disconnect() {
    sseSource?.close()
    sseSource = null
    gatewayMethods.value = []
    gatewayVersion.value = null
    updateAvailable.value = null
    state.value = 'disconnected'
  }

  function supportsAnyMethod(methods: string[]): boolean {
    if (gatewayMethods.value.length === 0) return false
    const methodSet = new Set(gatewayMethods.value)
    return methods.some((method) => methodSet.has(method))
  }

  return {
    state,
    lastError,
    reconnectAttempts,
    gatewayMethods,
    gatewayVersion,
    updateAvailable,
    rpc,
    connect,
    disconnect,
    subscribe,
    supportsAnyMethod
  }
})
