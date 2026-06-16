const DB_NAME = 'codex-arcanum-db'
const DB_VERSION = 2
const STORE_NAME = 'npcs'
const FOLDERS_STORE = 'folders'
const ASSIGNMENTS_STORE = 'assignments'

const SEED_VERSION_KEY = 'codex-seed-version'
const CURRENT_SEED_VERSION = '2026-06-16-hybrid-vh'

export function resolveAvatarUrl(avatar) {
  if (!avatar) return ''
  if (avatar.startsWith('data:') || avatar.startsWith('http') || avatar.startsWith('blob:')) return avatar
  if (avatar.startsWith('codex-avatars/')) {
    const base = import.meta.env.BASE_URL || '/'
    return `${base}${avatar}`
  }
  return avatar
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('nome', 'nome', { unique: false })
        store.createIndex('profile', 'profile', { unique: false })
        store.createIndex('nivel', 'nivel', { unique: false })
        store.createIndex('updated_at', 'updated_at', { unique: false })
      }
      if (!db.objectStoreNames.contains(FOLDERS_STORE)) {
        const folderStore = db.createObjectStore(FOLDERS_STORE, { keyPath: 'id' })
        folderStore.createIndex('name', 'name', { unique: false })
        folderStore.createIndex('parentId', 'parentId', { unique: false })
      }
      if (!db.objectStoreNames.contains(ASSIGNMENTS_STORE)) {
        const assignStore = db.createObjectStore(ASSIGNMENTS_STORE, { keyPath: 'npcId' })
        assignStore.createIndex('folderId', 'folderId', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx(db, stores, mode = 'readonly') {
  const transaction = db.transaction(stores, mode)
  if (Array.isArray(stores)) {
    return transaction
  }
  return transaction.objectStore(stores)
}

export async function getAllNpcs() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const store = tx(db, STORE_NAME)
    const req = store.index('updated_at').openCursor(null, 'prev')
    const results = []
    req.onsuccess = (e) => {
      const cursor = e.target.result
      if (cursor) {
        results.push(cursor.value)
        cursor.continue()
      } else {
        resolve(results)
      }
    }
    req.onerror = () => reject(req.error)
  })
}

export async function getNpc(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const store = tx(db, STORE_NAME)
    const req = store.get(id)
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  })
}

export async function saveNpc(npc) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const store = tx(db, STORE_NAME, 'readwrite')
    const existing = store.get(npc.id)
    existing.onsuccess = () => {
      const record = {
        ...existing.result,
        ...npc,
        updated_at: new Date().toISOString(),
      }
      const putReq = store.put(record)
      putReq.onsuccess = () => resolve(record)
      putReq.onerror = () => reject(putReq.error)
    }
    existing.onerror = () => reject(existing.error)
  })
}

export async function deleteNpc(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const store = tx(db, STORE_NAME, 'readwrite')
    const req = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function getAllFolders() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const store = tx(db, FOLDERS_STORE)
    const req = store.index('name').openCursor()
    const results = []
    req.onsuccess = (e) => {
      const cursor = e.target.result
      if (cursor) {
        results.push(cursor.value)
        cursor.continue()
      } else {
        resolve(results)
      }
    }
    req.onerror = () => reject(req.error)
  })
}

export async function saveFolder(folder) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const store = tx(db, FOLDERS_STORE, 'readwrite')
    const existing = store.get(folder.id)
    existing.onsuccess = () => {
      const now = new Date().toISOString()
      const record = {
        ...existing.result,
        ...folder,
        updated_at: now,
      }
      if (!existing.result) {
        record.created_at = now
      }
      const putReq = store.put(record)
      putReq.onsuccess = () => resolve(record)
      putReq.onerror = () => reject(putReq.error)
    }
    existing.onerror = () => reject(existing.error)
  })
}

export async function deleteFolder(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const store = tx(db, FOLDERS_STORE, 'readwrite')
    const req = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function getFolderAssignments() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const store = tx(db, ASSIGNMENTS_STORE)
    const req = store.openCursor()
    const map = {}
    req.onsuccess = (e) => {
      const cursor = e.target.result
      if (cursor) {
        map[cursor.value.npcId] = cursor.value.folderId
        cursor.continue()
      } else {
        resolve(map)
      }
    }
    req.onerror = () => reject(req.error)
  })
}

export async function assignToFolder(npcId, folderId) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const store = tx(db, ASSIGNMENTS_STORE, 'readwrite')
    const req = store.put({
      npcId,
      folderId,
      updated_at: new Date().toISOString(),
    })
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function removeFromFolder(npcId) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const store = tx(db, ASSIGNMENTS_STORE, 'readwrite')
    const req = store.delete(npcId)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function bulkAssignToFolder(npcIds, folderId) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ASSIGNMENTS_STORE, 'readwrite')
    const store = transaction.objectStore(ASSIGNMENTS_STORE)
    const now = new Date().toISOString()
    let count = 0
    npcIds.forEach((npcId) => {
      const req = store.put({ npcId, folderId, updated_at: now })
      req.onsuccess = () => { count++ }
    })
    transaction.oncomplete = () => resolve(count)
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function importNpcs(npcs, folders = [], assignments = {}) {
  const db = await openDB()
  const stores = [STORE_NAME]
  if (folders.length > 0) stores.push(FOLDERS_STORE)
  if (Object.keys(assignments).length > 0) stores.push(ASSIGNMENTS_STORE)
  const transaction = db.transaction(stores, 'readwrite')
  let count = 0
  const npcStore = transaction.objectStore(STORE_NAME)
  npcs.forEach((npc) => {
    const req = npcStore.put({
      ...npc,
      updated_at: npc.updated_at || new Date().toISOString(),
    })
    req.onsuccess = () => { count++ }
  })
  if (folders.length > 0) {
    const folderStore = transaction.objectStore(FOLDERS_STORE)
    folders.forEach((f) => { folderStore.put(f) })
  }
  if (Object.keys(assignments).length > 0) {
    const assignStore = transaction.objectStore(ASSIGNMENTS_STORE)
    Object.entries(assignments).forEach(([npcId, folderId]) => {
      assignStore.put({ npcId, folderId, updated_at: new Date().toISOString() })
    })
  }
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve(count)
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function migrateCodexIfNeeded() {
  const stored = localStorage.getItem(SEED_VERSION_KEY)
  if (stored === CURRENT_SEED_VERSION) return { migrated: false, count: 0 }
  const npcs = await getAllNpcs()
  if (!npcs.length) { localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION); return { migrated: false, count: 0 } }
  const seedModule = await import('../data/codex-import-ready.codex.json')
  const seedData = seedModule.default || seedModule
  const seedMap = new Map((seedData.npcs || []).map(n => [n.id, n]))
  let needsMigrator = false
  const updated = npcs.map(npc => {
    if (seedMap.has(npc.id)) {
      const seed = seedMap.get(npc.id)
      return {
        ...seed,
        avatar: npc.avatar || seed.avatar || '',
        avatarTransform: npc.avatarTransform || seed.avatarTransform || null,
        updated_at: npc.updated_at,
        _rebalanced: true,
      }
    }
    if (!npc._rebalanced) {
      needsMigrator = true
      return npc
    }
    return npc
  })
  if (needsMigrator) {
    const { rebalanceNpc } = await import('../utils/codexMigrator')
    for (let i = 0; i < updated.length; i++) {
      if (seedMap.has(updated[i].id)) continue
      if (!updated[i]._rebalanced) {
        updated[i] = rebalanceNpc(updated[i])
      }
    }
  }
  const changed = updated.some((n, i) => n !== npcs[i])
  if (changed) {
    await new Promise((resolve, reject) => {
      openDB().then(db => {
        const transaction = db.transaction(STORE_NAME, 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        updated.forEach(npc => store.put({ ...npc, updated_at: new Date().toISOString() }))
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      })
    })
  }
  localStorage.setItem(SEED_VERSION_KEY, CURRENT_SEED_VERSION)
  const count = updated.filter((n, i) => n !== npcs[i]).length
  return { migrated: count > 0, count }
}

export async function exportAllNpcs() {
  const [npcs, folders, assignments] = await Promise.all([
    getAllNpcs(),
    getAllFolders(),
    getFolderAssignments(),
  ])
  return {
    format: 'codex-arcanum',
    version: '2.0',
    exported_at: new Date().toISOString(),
    npcs,
    folders,
    assignments,
  }
}
