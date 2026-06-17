import { getDB } from './db.js'

const HANDLE_STORE = 'settings'
const HANDLE_KEY = 'fsa:dbHandle'

export function fsaSupported() {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window && 'showOpenFilePicker' in window
}

function opts() {
  return {
    types: [{ description: 'Banco System-Drako', accept: { 'application/json': ['.drako', '.json'] } }],
    excludeAcceptAllOption: false,
    id: 'system-drako-db',
    startIn: 'downloads',
    mode: 'readwrite'
  }
}

export async function getStoredHandle() {
  try {
    const db = await getDB()
    const rec = await db.get(HANDLE_STORE, HANDLE_KEY)
    return rec?.value || null
  } catch { return null }
}

export async function storeHandle(handle) {
  const db = await getDB()
  await db.put(HANDLE_STORE, { key: HANDLE_KEY, value: handle })
}

export async function clearStoredHandle() {
  const db = await getDB()
  await db.delete(HANDLE_STORE, HANDLE_KEY)
}

export async function verifyPermission(handle, write = true) {
  if (!handle) return false
  const opts2 = write ? { mode: 'readwrite' } : {}
  if ((await handle.queryPermission(opts2)) === 'granted') return true
  if ((await handle.requestPermission(opts2)) === 'granted') return true
  return false
}

export async function readHandle(handle) {
  const file = await handle.getFile()
  const text = await file.text()
  if (!text.trim()) return null
  return JSON.parse(text)
}

export async function writeHandle(handle, payload) {
  const writable = await handle.createWritable()
  await writable.write(JSON.stringify(payload, null, 2))
  await writable.close()
}

export async function pickNewDatabaseFile(initialPayload) {
  const handle = await window.showSaveFilePicker({ ...opts(), suggestedName: 'banco-system-drako.drako' })
  await writeHandle(handle, initialPayload)
  await storeHandle(handle)
  return handle
}

export async function pickExistingDatabaseFile() {
  const [handle] = await window.showOpenFilePicker(opts())
  await storeHandle(handle)
  return handle
}
