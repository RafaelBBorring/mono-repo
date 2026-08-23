import { vault, vaultScope } from './db'

function uid() {
  if (crypto.randomUUID) return crypto.randomUUID()
  return `rule-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export async function listCanonRules(projectId) {
  const scope = vaultScope(projectId)
  const rows = await vault.canon_rules.where('projectId').equals(scope).toArray()
  return rows.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
}

export async function saveCanonRule(rule) {
  const now = Date.now()
  const record = {
    id: rule.id || uid(),
    projectId: vaultScope(rule.projectId),
    category: (rule.category || 'Geral').trim(),
    title: (rule.title || '').trim(),
    rule: (rule.rule || '').trim(),
    status: rule.status || 'active',
    source: rule.source || 'author',
    notes: (rule.notes || '').trim(),
    createdAt: rule.createdAt || now,
    updatedAt: now,
  }
  await vault.canon_rules.put(record)
  return record
}

export async function deleteCanonRule(id) {
  await vault.canon_rules.delete(id)
}

export async function listCustomCategories(projectId) {
  const rows = await listCanonRules(projectId)
  const known = new Set(DEFAULT_CATEGORIES.map((c) => c.key))
  const custom = new Set()
  rows.forEach((row) => { if (row.category && !known.has(row.category)) custom.add(row.category) })
  return [...custom]
}

export async function listCanonConflicts(projectId) {
  const scope = vaultScope(projectId)
  const rows = await vault.canon_conflicts.where('projectId').equals(scope).toArray()
  return rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

export async function saveCanonConflict(conflict) {
  const now = Date.now()
  const record = {
    id: conflict.id || uid(),
    projectId: vaultScope(conflict.projectId),
    ruleTitle: (conflict.ruleTitle || 'Regra do cânone').slice(0, 200),
    ruleText: (conflict.ruleText || '').slice(0, 1200),
    userStatement: (conflict.userStatement || '').slice(0, 600),
    explanation: (conflict.explanation || '').slice(0, 900),
    suggestedResolution: (conflict.suggestedResolution || '').slice(0, 900),
    severity: ['low', 'medium', 'high'].includes(conflict.severity) ? conflict.severity : 'medium',
    status: conflict.status || 'open',
    conversationId: conflict.conversationId || null,
    createdAt: conflict.createdAt || now,
    resolvedAt: null,
  }
  await vault.canon_conflicts.put(record)
  return record
}

export async function resolveCanonConflict(id, resolution) {
  const row = await vault.canon_conflicts.get(id)
  if (!row) return null
  const updated = { ...row, status: 'resolved', resolution: (resolution || row.suggestedResolution || '').slice(0, 900), resolvedAt: Date.now() }
  await vault.canon_conflicts.put(updated)
  return updated
}

export async function ignoreCanonConflict(id) {
  const row = await vault.canon_conflicts.get(id)
  if (!row) return null
  const updated = { ...row, status: 'ignored', resolvedAt: Date.now() }
  await vault.canon_conflicts.put(updated)
  return updated
}

export const DEFAULT_CATEGORIES = [
  { key: 'cosmologia', label: 'Cosmologia e Física', prompts: [
    'Qual o formato e a natureza do mundo (plano, esférico, infinito)?',
    'Existe viagem no tempo? Sob quais regras?',
    'Há múltiplas dimensões ou um multiverso?',
    'Quem criou ou originou o mundo?' ] },
  { key: 'magia', label: 'Sistema de Magia', prompts: [
    'De onde vem a magia?',
    'Quem pode usá-la e qual o custo/preço?',
    'Quais são seus limites absolutos?',
    'A magia pode ser detectada ou rastreada? Como?' ] },
  { key: 'povos', label: 'Povos e Raças', prompts: [
    'Quais espécies inteligentes existem?',
    'Tempo de vida e origem de cada povo?',
    'Existem híbridos? Como funcionam?' ] },
  { key: 'geografia', label: 'Geografia e Ambiente', prompts: [
    'Principais massas de terra, mares e rotas?',
    'Climas, estações e perigos naturais?' ] },
  { key: 'historia', label: 'História e Linha do Tempo', prompts: [
    'Quais as eras principais do mundo?',
    'Quais eventos fundadores moldaram o presente?' ] },
  { key: 'sociedade', label: 'Sociedade e Cultura', prompts: [
    'Como funcionam governo, religião e economia?',
    'Qual o nível tecnológico da obra?',
    'Idiomas e formas de comunicação?' ] },
  { key: 'conflito', label: 'Conflito e Poder', prompts: [
    'Quais as principais facções ou impérios?',
    'Quem detém o poder e por quê?' ] },
  { key: 'fe', label: 'Vida, Morte e Fé', prompts: [
    'Existe apósvida? Como funciona a alma?',
    'Ressurreição é possível? Sob quais condições?',
    'Há destino, profecia ou divindades atuantes no mundo?' ] },
  { key: 'tom', label: 'Tom e Tema', prompts: [
    'Qual o tom moral (heroico, cinzento, sombrio)?',
    'Que temas centrais a obra explora?' ] },
]
