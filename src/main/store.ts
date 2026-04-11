import Store from 'electron-store'
import { safeStorage } from 'electron'

export interface ServerConfig {
  id: string
  name: string
  url: string
  username: string
  encryptedPassword: string
}

const store = new Store<{ servers: ServerConfig[] }>({
  defaults: { servers: [] }
})

export function getServers(): Omit<ServerConfig, 'encryptedPassword'>[] {
  return store.get('servers').map(({ encryptedPassword: _, ...rest }) => rest)
}

export function isEncryptionAvailable(): boolean {
  return safeStorage.isEncryptionAvailable()
}

export function saveServer(server: {
  id: string
  name: string
  url: string
  username: string
  password: string
}): void {
  const servers = store.get('servers')
  if (!safeStorage.isEncryptionAvailable()) {
    // Fail loudly instead of silently falling back to base64 — plain base64 is
    // trivially reversible and would give a false sense of security. The
    // renderer surfaces this error to the user so they can switch to a
    // platform with a working keychain / credential manager.
    throw new Error(
      'System keychain/credential manager is unavailable. Credentials cannot be stored securely on this machine.'
    )
  }
  const encrypted = safeStorage.encryptString(server.password).toString('base64')

  const entry: ServerConfig = {
    id: server.id,
    name: server.name,
    url: server.url,
    username: server.username,
    encryptedPassword: encrypted
  }

  const idx = servers.findIndex((s) => s.id === server.id)
  if (idx >= 0) servers[idx] = entry
  else servers.push(entry)
  store.set('servers', servers)
}

export function removeServer(id: string): void {
  store.set(
    'servers',
    store.get('servers').filter((s) => s.id !== id)
  )
}

export function decryptPassword(id: string): string | null {
  const server = store.get('servers').find((s) => s.id === id)
  if (!server) return null
  if (!safeStorage.isEncryptionAvailable()) return null
  try {
    return safeStorage.decryptString(Buffer.from(server.encryptedPassword, 'base64'))
  } catch {
    return null
  }
}
