import { openDB } from 'idb'

const DB_NAME = 'system-drako'
const DB_VERSION = 1

let _db = null

const _listeners = new Set()
export function subscribeDB(fn) { _listeners.add(fn); return () => _listeners.delete(fn) }
function _notify() { _listeners.forEach(fn => { try { fn() } catch {} }) }

export async function getDB() {
  if (_db) return _db
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('characters')) {
        const s = db.createObjectStore('characters', { keyPath: 'id' })
        s.createIndex('by_folder', 'folderId')
        s.createIndex('by_updated', 'updatedAt')
      }
      if (!db.objectStoreNames.contains('folders')) {
        db.createObjectStore('folders', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('boards')) {
        db.createObjectStore('boards', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' })
      }
    }
  })
  return _db
}

export async function dbGetAll(store) {
  const db = await getDB()
  return db.getAll(store)
}

export async function dbGet(store, key) {
  const db = await getDB()
  return db.get(store, key)
}

export async function dbPut(store, value) {
  const db = await getDB()
  await db.put(store, value)
  _notify()
  return value
}

export async function dbDel(store, key) {
  const db = await getDB()
  await db.delete(store, key)
  _notify()
}

export async function dbClear(store) {
  const db = await getDB()
  await db.clear(store)
  _notify()
}

export async function dbBulkPut(store, items) {
  const db = await getDB()
  const tx = db.transaction(store, 'readwrite')
  await Promise.all(items.map(i => tx.store.put(i)))
  await tx.done
  _notify()
  return items
}

/* ---------- Characters ---------- */
export const listCharacters = () => dbGetAll('characters')
export const getCharacter = (id) => dbGet('characters', id)
export const saveCharacter = (c) => dbPut('characters', { ...c, updatedAt: new Date().toISOString() })
export const deleteCharacter = (id) => dbDel('characters', id)
export const charactersInFolder = async (folderId) => {
  const all = await listCharacters()
  return all.filter(c => (c.folderId || null) === (folderId || null))
}

/* ---------- Folders ---------- */
export const listFolders = () => dbGetAll('folders')
export const saveFolder = (f) => dbPut('folders', f)
export const deleteFolder = (id) => dbDel('folders', id)

/* ---------- Boards (quadro infinito) ---------- */
export const listBoards = () => dbGetAll('boards')
export const getBoard = (id) => dbGet('boards', id)
export const saveBoard = (b) => dbPut('boards', { ...b, updatedAt: new Date().toISOString() })
export const deleteBoard = (id) => dbDel('boards', id)

/* ---------- Settings ---------- */
export const getSetting = async (key, fallback = null) => {
  const v = await dbGet('settings', key)
  return v ? v.value : fallback
}
export const setSetting = (key, value) => dbPut('settings', { key, value })

/* ---------- Backup total ---------- */
export async function exportDatabase() {
  const [characters, folders, boards, settings] = await Promise.all([
    dbGetAll('characters'),
    dbGetAll('folders'),
    dbGetAll('boards'),
    dbGetAll('settings')
  ])
  return {
    kind: 'drako-db',
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    app: 'system-drako',
    characters, folders, boards, settings
  }
}

export async function importDatabase(payload, mode = 'merge') {
  if (!payload || payload.kind !== 'drako-db') throw new Error('Arquivo .drako de banco inválido.')
  if (mode === 'replace') {
    await Promise.all(['characters', 'folders', 'boards', 'settings'].map(dbClear))
  }
  if (payload.characters?.length) await dbBulkPut('characters', payload.characters)
  if (payload.folders?.length) await dbBulkPut('folders', payload.folders)
  if (payload.boards?.length) await dbBulkPut('boards', payload.boards)
  return {
    characters: payload.characters?.length || 0,
    folders: payload.folders?.length || 0,
    boards: payload.boards?.length || 0
  }
}
