const DB_NAME = 'codex-arcanum-db'
const DB_VERSION = 1
const STORE_NAME = 'npcs'

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
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx(db, mode = 'readonly') {
  const transaction = db.transaction(STORE_NAME, mode)
  return transaction.objectStore(STORE_NAME)
}

export async function getAllNpcs() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const store = tx(db)
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
    const store = tx(db)
    const req = store.get(id)
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  })
}

export async function saveNpc(npc) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const store = tx(db, 'readwrite')
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
    const store = tx(db, 'readwrite')
    const req = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function importNpcs(npcs) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const store = tx(db, 'readwrite')
    let count = 0
    npcs.forEach((npc) => {
      const req = store.put({
        ...npc,
        updated_at: npc.updated_at || new Date().toISOString(),
      })
      req.onsuccess = () => { count++ }
    })
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.oncomplete = () => resolve(count)
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function exportAllNpcs() {
  const npcs = await getAllNpcs()
  return {
    format: 'codex-arcanum',
    version: '2.0',
    exported_at: new Date().toISOString(),
    npcs,
  }
}
