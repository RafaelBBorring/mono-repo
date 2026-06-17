import { uid, nowISO } from './id.js'
import { ATTRIBUTES } from '../data/attributes.js'
import { LEVEL_BY_KEY } from '../data/startingLevels.js'
import { maxResources } from './calculator.js'

export const ABILITY_SLOTS = [
  { key: 'passiva', name: 'Passiva', kind: 'passiva', energiaObrigatoria: false },
  { key: 'ativa1', name: 'Ativa 1', kind: 'ativa', energiaObrigatoria: true },
  { key: 'ativa2', name: 'Ativa 2', kind: 'ativa', energiaObrigatoria: true },
  { key: 'ativa3', name: 'Ativa 3', kind: 'ativa', energiaObrigatoria: true },
  { key: 'ultimate', name: 'Ultimate', kind: 'ultimate', energiaObrigatoria: true }
]

export const DEFAULT_TAG_COLORS = ['#e0ad33', '#f2661b', '#27ae60', '#2980b9', '#8e44ad', '#c0392b', '#16a085', '#7f8c8d']

export function emptyAbility(kind = 'ativa') {
  return {
    id: uid('ab'),
    kind,
    name: '',
    descricao: '',
    energia: kind === 'passiva' ? 0 : 4,
    tags: []
  }
}

export function emptyAbilities() {
  return {
    passiva: emptyAbility('passiva'),
    ativa1: emptyAbility('ativa'),
    ativa2: emptyAbility('ativa'),
    ativa3: emptyAbility('ativa'),
    ultimate: emptyAbility('ultimate')
  }
}

export function emptyAttributes() {
  const o = {}
  for (const a of ATTRIBUTES) o[a.key] = 0
  return o
}

export function createCharacter(seed = {}) {
  const level = seed.level || 'recruta'
  const attributes = { ...emptyAttributes(), ...(seed.attributes || {}) }
  const resources = maxResources(attributes, level)
  return {
    id: uid('chr'),
    name: seed.name || 'Novo Personagem',
    icon: seed.icon || null,
    folderId: seed.folderId || null,
    isNPC: seed.isNPC !== undefined ? seed.isNPC : true,
    level: seed.level || 'recruta',
    raca: seed.raca || '',
    arquetipo: seed.arquetipo || '',
    attributes,
    narrativa: seed.narrativa || { conceito: '', vinculo: '', cicatriz: '' },
    anotacoes: seed.anotacoes || '',
    resources: { ...resources, vida: resources.vida, energia: resources.energia, pe: resources.pe },
    conditions: seed.conditions || [],
    abilities: seed.abilities || emptyAbilities(),
    createdAt: nowISO(),
    updatedAt: nowISO(),
    ...seed
  }
}

export function recomputeResources(character) {
  const max = maxResources(character.attributes, character.level)
  const cur = character.resources || {}
  return {
    ...max,
    vida: cur.vida != null ? Math.min(cur.vida, max.vida) : max.vida,
    energia: cur.energia != null ? Math.min(cur.energia, max.energia) : max.energia,
    pe: cur.pe != null ? Math.min(cur.pe, max.pe) : max.pe
  }
}

export function abilitiesToArray(abilities) {
  if (!abilities) return []
  return [abilities.passiva, abilities.ativa1, abilities.ativa2, abilities.ativa3, abilities.ultimate].filter(Boolean)
}

export function summaryText(character) {
  const lvl = LEVEL_BY_KEY[character.level]
  return `${lvl?.name || character.level} · ${character.arquetipo || '—'}`
}
