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

export async function fetchMysticEntries(ritualType, fallbackItems = []) {
  const { data, error } = await supabase
    .from('alchemy_rituals')
    .select('*')
    .eq('ritual_type', ritualType)
    .order('circle', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    return {
      data: sortRituals(fallbackItems),
      source: 'fallback',
      error,
    }
  }

  if (!data || data.length === 0) {
    return {
      data: sortRituals(fallbackItems),
      source: 'fallback',
      error: null,
    }
  }

  return {
    data: sortRituals(data),
    source: 'database',
    error: null,
  }
}

export async function fetchAlchemyRituals() {
  return fetchMysticEntries('alchemy', ALCHEMY_FALLBACK_RITUALS)
}

export async function fetchSpellRituals() {
  return fetchMysticEntries('spell', SPELL_FALLBACK_RITUALS)
}

export async function fetchRuneRituals() {
  return fetchMysticEntries('rune', RUNE_FALLBACK_RITUALS)
}

export async function fetchMagicRituals() {
  return fetchMysticEntries('magic', MAGIC_FALLBACK_RITUALS)
}

export async function fetchMysticWeapons() {
  return fetchMysticEntries('mystic_weapon', [])
}

export async function saveMysticEntry(payload) {
  return getSupabaseAdmin()
    .from('alchemy_rituals')
    .upsert(payload)
    .select()
    .single()
}

export async function saveAlchemyRitual(payload) {
  return saveMysticEntry({ ...payload, ritual_type: 'alchemy' })
}

export async function saveSpellRitual(payload) {
  return saveMysticEntry({ ...payload, ritual_type: 'spell' })
}

export async function saveRuneRitual(payload) {
  return saveMysticEntry({ ...payload, ritual_type: 'rune' })
}

export async function saveMagicRitual(payload) {
  return saveMysticEntry({ ...payload, ritual_type: 'magic' })
}

export async function saveMysticWeapon(payload) {
  return saveMysticEntry({ ...payload, ritual_type: 'mystic_weapon' })
}

export async function deleteMysticEntry(id) {
  return getSupabaseAdmin().from('alchemy_rituals').delete().eq('id', id)
}

export async function deleteAlchemyRitual(id) {
  return deleteMysticEntry(id)
}

export async function deleteSpellRitual(id) {
  return deleteMysticEntry(id)
}

export async function deleteRuneRitual(id) {
  return deleteMysticEntry(id)
}

export async function deleteMagicRitual(id) {
  return deleteMysticEntry(id)
}

export async function deleteMysticWeapon(id) {
  return deleteMysticEntry(id)
}

export function getFallbackLibraryForType(ritualType) {
  return FALLBACK_BY_TYPE[ritualType] || []
}
