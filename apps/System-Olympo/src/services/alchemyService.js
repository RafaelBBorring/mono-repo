import { supabase, getSupabaseAdmin } from '../lib/supabase'
import { ALCHEMY_FALLBACK_RITUALS } from '../data/alchemyFallbackRituals'
import { SPELL_FALLBACK_RITUALS } from '../data/spellFallbackRituals'
import { RUNE_FALLBACK_RITUALS } from '../data/runeFallbackRituals'
import { MAGIC_FALLBACK_RITUALS } from '../data/magicFallbackRituals'

function sortRituals(items = []) {
  return [...items].sort((a, b) => {
    if ((a.circle || 0) !== (b.circle || 0)) return (a.circle || 0) - (b.circle || 0)
    return (a.name || '').localeCompare(b.name || '')
  })
}

const FALLBACK_BY_TYPE = {
  alchemy: ALCHEMY_FALLBACK_RITUALS,
  spell: SPELL_FALLBACK_RITUALS,
  rune: RUNE_FALLBACK_RITUALS,
  magic: MAGIC_FALLBACK_RITUALS,
}

const RITUAL_TABLES = {
  alchemy: 'alchemy_rituals',
  spell: 'spells',
  rune: 'runes',
  magic: 'magics',
}

async function fetchFromTable(tableName, fallbackItems = []) {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .order('circle', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    return { data: sortRituals(fallbackItems), source: 'fallback', error }
  }
  if (!data || data.length === 0) {
    return { data: sortRituals(fallbackItems), source: 'fallback', error: null }
  }
  return { data: sortRituals(data), source: 'database', error: null }
}

async function saveToTable(tableName, payload) {
  return getSupabaseAdmin()
    .from(tableName)
    .upsert(payload)
    .select()
    .single()
}

async function deleteFromTable(tableName, id) {
  return getSupabaseAdmin().from(tableName).delete().eq('id', id)
}

// ─── Alchemy (existing table) ──────────────────────────────
export async function fetchAlchemyRituals() {
  return fetchFromTable('alchemy_rituals', ALCHEMY_FALLBACK_RITUALS)
}
export async function saveAlchemyRitual(payload) {
  return saveToTable('alchemy_rituals', { ...payload, ritual_type: 'alchemy' })
}
export async function deleteAlchemyRitual(id) {
  return deleteFromTable('alchemy_rituals', id)
}

// ─── Spells ────────────────────────────────────────────────
export async function fetchSpellRituals() {
  return fetchFromTable('spells', SPELL_FALLBACK_RITUALS)
}
export async function saveSpellRitual(payload) {
  return saveToTable('spells', payload)
}
export async function deleteSpellRitual(id) {
  return deleteFromTable('spells', id)
}

// ─── Runes ─────────────────────────────────────────────────
export async function fetchRuneRituals() {
  return fetchFromTable('runes', RUNE_FALLBACK_RITUALS)
}
export async function saveRuneRitual(payload) {
  return saveToTable('runes', payload)
}
export async function deleteRuneRitual(id) {
  return deleteFromTable('runes', id)
}

// ─── Magics ────────────────────────────────────────────────
export async function fetchMagicRituals() {
  return fetchFromTable('magics', MAGIC_FALLBACK_RITUALS)
}
export async function saveMagicRitual(payload) {
  return saveToTable('magics', payload)
}
export async function deleteMagicRitual(id) {
  return deleteFromTable('magics', id)
}

// ─── Legendary Weapons ─────────────────────────────────────
export async function fetchLegendaryWeapons() {
  const { data, error } = await supabase
    .from('legendary_weapons')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) {
    return { data: [], source: 'fallback', error }
  }
  return { data: data || [], source: 'database', error: null }
}

export async function saveLegendaryWeapon(payload) {
  const { data, error } = await getSupabaseAdmin()
    .from('legendary_weapons')
    .upsert(payload)
    .select()
    .single()
  return { data, error }
}

export async function deleteLegendaryWeapon(id) {
  return getSupabaseAdmin().from('legendary_weapons').delete().eq('id', id)
}

// ─── Backward-compatible aliases ───────────────────────────
export async function fetchMysticWeapons() { return fetchLegendaryWeapons() }
export async function saveMysticWeapon(payload) { return saveLegendaryWeapon(payload) }
export async function deleteMysticWeapon(id) { return deleteLegendaryWeapon(id) }
export async function fetchMysticEntries() { return fetchAlchemyRituals() }
export async function saveMysticEntry(payload) { return saveAlchemyRitual(payload) }
export async function deleteMysticEntry(id) { return deleteAlchemyRitual(id) }

export function getFallbackLibraryForType(ritualType) {
  return FALLBACK_BY_TYPE[ritualType] || []
}
