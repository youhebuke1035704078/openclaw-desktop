import { ElectronAPI } from '@electron-toolkit/preload'

interface OpenClawAPI {
  getServers(): Promise<Array<{ id: string; name: string; url: string; username: string }>>
  saveServer(server: {
    id: string
    name: string
    url: string
    username: string
    password: string
  }): Promise<void>
  removeServer(id: string): Promise<void>
  decryptPassword(id: string): Promise<string | null>
  minimize(): void
  maximize(): void
  close(): void
  notify(title: string, body: string): void
  getVersion(): Promise<string>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: OpenClawAPI
  }
}
