import { exportDatabase, importDatabase, saveCharacter } from './db.js'
import { uid } from './id.js'

export const DRACO_KIND = 'drako-char'
const DB_KIND = 'drako-db'
export const DRACO_BUNDLE_KIND = 'drako-bundle'

export function buildCharacterFile(character) {
  return {
    kind: DRACO_KIND,
    version: 1,
    app: 'system-drako',
    exportedAt: new Date().toISOString(),
    character
  }
}

export function parseDrako(text) {
  const data = JSON.parse(text)
  if (!data || (data.kind !== DRACO_KIND && data.kind !== DB_KIND && data.kind !== DRACO_BUNDLE_KIND)) {
    throw new Error('Arquivo .drako inválido ou corrompido.')
  }
  return data
}

export function downloadBlob(content, filename, type = 'application/json') {
  const blob = content instanceof Blob ? content : new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export function slugify(s = 'ficha') {
  return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'ficha'
}

export async function exportCharacterDrako(character) {
  const payload = buildCharacterFile(character)
  downloadBlob(JSON.stringify(payload, null, 2), `${slugify(character.name)}.drako`)
}

export async function exportDatabaseDrako() {
  const payload = await exportDatabase()
  downloadBlob(JSON.stringify(payload), `banco-system-drako.drako`)
}

export async function exportCharactersDrako(characters, name = 'fichas') {
  const list = (characters || []).filter(Boolean)
  if (!list.length) throw new Error('Nenhuma ficha para exportar.')
  const payload = {
    kind: DRACO_BUNDLE_KIND,
    version: 1,
    app: 'system-drako',
    exportedAt: new Date().toISOString(),
    count: list.length,
    characters: list
  }
  const stamp = new Date().toISOString().slice(0, 10)
  downloadBlob(JSON.stringify(payload, null, 2), `${slugify(name)}-${list.length}fichas-${stamp}.drako`)
}

export async function importDrakoFile(file, { onMerge } = {}) {
  const text = await file.text()
  const data = parseDrako(text)
  if (data.kind === DRACO_KIND) {
    if (!data.character || typeof data.character !== 'object') throw new Error('Ficha .drako inválida.')
    const character = {
      ...data.character,
      id: data.character.id || uid('chr'),
      updatedAt: new Date().toISOString()
    }
    await saveCharacter(character)
    return { type: 'character', character }
  }
  if (data.kind === DRACO_BUNDLE_KIND) {
    const list = Array.isArray(data.characters) ? data.characters : []
    if (!list.length) throw new Error('Pacote .drako sem fichas.')
    const stamped = list.map(c => ({ ...c, id: c.id || uid('chr'), updatedAt: new Date().toISOString() }))
    const { dbBulkPut } = await import('./db.js')
    await dbBulkPut('characters', stamped)
    const result = { characters: stamped.length, folders: 0, boards: 0 }
    if (onMerge) onMerge(result)
    return { type: 'bundle', ...result }
  }
  const result = await importDatabase(data, 'merge')
  if (onMerge) onMerge(result)
  return { type: 'database', ...result }
}

export async function importDrakoFiles(files, { onMerge } = {}) {
  const list = Array.from(files || [])
  if (!list.length) return { type: 'none', characters: 0, folders: 0, boards: 0 }
  let chars = 0, folders = 0, boards = 0
  const errors = []
  for (const f of list) {
    try {
      const r = await importDrakoFile(f, { onMerge })
      chars += r.characters || (r.type === 'character' ? 1 : 0)
      folders += r.folders || 0
      boards += r.boards || 0
    } catch (err) {
      errors.push(`${f.name}: ${err.message}`)
    }
  }
  return { type: 'multi', characters: chars, folders, boards, errors }
}
