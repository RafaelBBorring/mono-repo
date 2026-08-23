import Dexie from 'dexie'

class MaestroVault extends Dexie {
  constructor() {
    super('maestro-vault')
    this.version(1).stores({
      canon_rules: 'id, projectId, category, status, updatedAt',
      meta: 'key',
    })
    this.version(2).stores({
      canon_rules: 'id, projectId, category, status, updatedAt',
      canon_conflicts: 'id, projectId, status, createdAt',
      meta: 'key',
    })
  }
}

export const vault = new MaestroVault()

export function vaultScope(projectId) {
  return projectId || 'demo'
}

export async function readMeta(key) {
  const row = await vault.meta.get(key)
  return row ? row.value : null
}

export async function writeMeta(key, value) {
  await vault.meta.put({ key, value })
}
