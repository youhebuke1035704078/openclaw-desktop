import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  getServers: (): Promise<
    Array<{ id: string; name: string; url: string; username: string }>
  > => ipcRenderer.invoke('store:getServers'),

  saveServer: (server: {
    id: string
    name: string
    url: string
    username: string
    password: string
  }): Promise<void> => ipcRenderer.invoke('store:saveServer', server),

  removeServer: (id: string): Promise<void> => ipcRenderer.invoke('store:removeServer', id),

  decryptPassword: (id: string): Promise<string | null> =>
    ipcRenderer.invoke('store:decryptPassword', id),

  minimize: (): void => ipcRenderer.send('window:minimize'),
  maximize: (): void => ipcRenderer.send('window:maximize'),
  close: (): void => ipcRenderer.send('window:close'),

  notify: (title: string, body: string): void => ipcRenderer.send('notify', title, body),

  getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
