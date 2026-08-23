import { vault, vaultScope } from './db'

const FORMAT = 'maestro-vault'
const FORMAT_VERSION = 1

export function buildVaultSnapshot(projectId, projectName, rules, conflicts) {
  return {
    format: FORMAT,
    version: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    project: { id: vaultScope(projectId), name: projectName || 'Universo' },
    canon_rules: rules || [],
    canon_conflicts: conflicts || [],
  }
}

async function gzipEncode(text) {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))
  const buffer = await new Response(stream).arrayBuffer()
  return new Uint8Array(buffer)
}

async function gzipDecode(file) {
  const stream = file.stream().pipeThrough(new DecompressionStream('gzip'))
  return new Response(stream).text()
}

export async function exportVaultFile(projectId, projectName, rules, conflicts) {
  const snapshot = buildVaultSnapshot(projectId, projectName, rules, conflicts)
  const json = JSON.stringify(snapshot)
  let bytes
  try {
    bytes = await gzipEncode(json)
  } catch {
    bytes = new TextEncoder().encode(json)
  }
  return new Blob([bytes], { type: 'application/octet-stream' })
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export function suggestedFileName(projectName) {
  const date = new Date().toISOString().slice(0, 10)
  const slug = (projectName || 'universo').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'universo'
  return `maestro-${slug}-${date}.maestro`
}

export async function parseVaultFile(file) {
  let text
  try {
    text = await gzipDecode(file)
  } catch {
    text = await file.text()
  }
  let snapshot
  try {
    snapshot = JSON.parse(text)
  } catch {
    throw new Error('Arquivo .maestro inválido ou corrompido.')
  }
  if (!snapshot || snapshot.format !== FORMAT) throw new Error('Arquivo .maestro inválido ou corrompido.')
  return snapshot
}

export async function importVaultSnapshot(snapshot, projectId, mode = 'merge') {
  const scope = vaultScope(projectId)
  const targetRules = (snapshot.canon_rules || [])
    .filter((rule) => rule && (rule.rule || rule.title))
    .map((rule) => ({
      ...rule,
      id: rule.id || (crypto.randomUUID ? crypto.randomUUID() : `rule-${Date.now()}-${Math.random().toString(36).slice(2)}`),
      projectId: scope,
      status: rule.status || 'active',
      updatedAt: Date.now(),
    }))
  const targetConflicts = (snapshot.canon_conflicts || [])
    .filter((conflict) => conflict)
    .map((conflict) => ({
      ...conflict,
      id: conflict.id || (crypto.randomUUID ? crypto.randomUUID() : `conflict-${Date.now()}-${Math.random().toString(36).slice(2)}`),
      projectId: scope,
      status: conflict.status || 'open',
    }))
  if (mode === 'replace') {
    await vault.canon_rules.where('projectId').equals(scope).delete()
    await vault.canon_conflicts.where('projectId').equals(scope).delete()
  }
  if (targetRules.length) await vault.canon_rules.bulkPut(targetRules)
  if (targetConflicts.length) await vault.canon_conflicts.bulkPut(targetConflicts)
  return { rules: targetRules.length, conflicts: targetConflicts.length }
}
