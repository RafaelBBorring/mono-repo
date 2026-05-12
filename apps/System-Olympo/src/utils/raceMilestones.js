import { RACES } from '../data/races'

export const RACE_BONUS_KEYS = ['hp', 'energia', 'pe', 'ca', 'dano', 'pericias', 'modules', 'skeletonPoints']
export const RACE_ATTR_KEYS = ['FOR', 'DES', 'CON', 'INT', 'APA', 'AM']

function emptyAttrs() {
  return Object.fromEntries(RACE_ATTR_KEYS.map(attr => [attr, 0]))
}

export function emptyRaceBonus() {
  return {
    attrs: emptyAttrs(),
    hp: 0,
    energia: 0,
    pe: 0,
    ca: 0,
    dano: 0,
    pericias: 0,
    modules: 0,
    skeletonPoints: 0,
    notes: [],
  }
}

export function mergeRaceBonus(target, source = {}) {
  RACE_ATTR_KEYS.forEach(attr => {
    target.attrs[attr] = (target.attrs[attr] || 0) + (source.attrs?.[attr] || 0)
  })
  RACE_BONUS_KEYS.forEach(key => {
    target[key] = (target[key] || 0) + (source[key] || 0)
  })
  if (source.notes?.length) target.notes.push(...source.notes)
  return target
}

function normalizeText(text = '') {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function addRegexValue(text, regex, callback) {
  for (const match of text.matchAll(regex)) {
    const value = Number(match[1] || match[2])
    if (Number.isFinite(value)) callback(value, match)
  }
}

export function parseRaceEffectText(rawText = '') {
  const text = normalizeText(rawText)
  const bonus = emptyRaceBonus()

  addRegexValue(text, /\+\s*(\d+)\s*(?:hp|vida)\b/g, value => { bonus.hp += value })
  addRegexValue(text, /(?:hp|vida)\s*\+\s*(\d+)\b/g, value => { bonus.hp += value })
  addRegexValue(text, /\+\s*(\d+)\s*energia\b/g, value => { bonus.energia += value })
  addRegexValue(text, /energia\s*\+\s*(\d+)\b/g, value => { bonus.energia += value })
  addRegexValue(text, /\+\s*(\d+)\s*pe\b(?!\s*\/)/g, value => { bonus.pe += value })
  addRegexValue(text, /\+\s*(\d+)\s*ca\b/g, value => { bonus.ca += value })
  addRegexValue(text, /ca\s*\+\s*(\d+)\b/g, value => { bonus.ca += value })
  addRegexValue(text, /\+\s*(\d+)\s*dano\b/g, value => { bonus.dano += value })
  addRegexValue(text, /dano\s*\+\s*(\d+)\b/g, value => { bonus.dano += value })
  addRegexValue(text, /\+\s*(\d+)\s*pericias?\b/g, value => { bonus.pericias += value })
  addRegexValue(text, /\+\s*(\d+)\s*modulos?\b/g, value => { bonus.modules += value })

  for (const match of text.matchAll(/\+\s*(\d+)\s*pontos?\s+de\s+esqueleto(?:\s+em\s+(for|des|con|int|apa|am))?/g)) {
    const value = Number(match[1])
    const attr = match[2]?.toUpperCase()
    if (!Number.isFinite(value)) continue
    if (attr && RACE_ATTR_KEYS.includes(attr)) bonus.attrs[attr] += value
    else bonus.skeletonPoints += value
  }

  for (const match of text.matchAll(/\+\s*(\d+)\s*(for|des|con|int|apa|am)\b/g)) {
    const value = Number(match[1])
    const attr = match[2]?.toUpperCase()
    if (Number.isFinite(value) && RACE_ATTR_KEYS.includes(attr)) bonus.attrs[attr] += value
  }

  addRegexValue(text, /\+\s*(\d+)\s+em todos os (?:atributos|modificadores)/g, value => {
    RACE_ATTR_KEYS.forEach(attr => { bonus.attrs[attr] += value })
  })

  return bonus
}

export function flattenRaceMilestones(race, subrace) {
  const out = []
  ;(race?.marcosExperiencia || []).forEach((item, i) => {
    if (item?.marcos) {
      item.marcos.forEach((m, j) => {
        out.push({
          key: `race:${race.id}:${i}:${j}`,
          group: item.titulo || item.grupo || 'Marco racial',
          title: m.marco || `Marco ${j + 1}`,
          condition: m.condicao || item.desc || '',
          reward: m.ganho || '',
        })
      })
      return
    }
    out.push({
      key: `race:${race.id}:${i}`,
      group: 'Marco racial',
      title: item.marco || `Marco ${i + 1}`,
      condition: item.condicao || '',
      reward: item.ganho || '',
    })
  })

  ;(subrace?.marcos || []).forEach((item, i) => {
    const [title, condition, reward] = Array.isArray(item)
      ? item
      : [item.marco, item.condicao, item.ganho]
    out.push({
      key: `sub:${subrace.id}:${i}`,
      group: 'Marco do caminho',
      title: title || `Marco ${i + 1}`,
      condition: condition || '',
      reward: reward || '',
    })
  })

  return out
}

export function getRaceProgressionBonus(char = {}) {
  const race = RACES[char.raca]
  const total = emptyRaceBonus()
  if (!race) return total
  const level = char.nivel || 1
  ;(race.progressaoPoder || [])
    .filter(step => step.nivel <= level)
    .forEach(step => mergeRaceBonus(total, parseRaceEffectText(`${step.ganho || ''}. ${step.desc || ''}`)))
  return total
}

export function getGrantedRaceMilestoneBonus(char = {}, race, subrace) {
  const total = emptyRaceBonus()
  const granted = new Set(char.raceMilestonesGranted || [])
  flattenRaceMilestones(race, subrace)
    .filter(m => granted.has(m.key))
    .forEach(m => mergeRaceBonus(total, parseRaceEffectText(`${m.title}. ${m.reward}`)))
  return total
}

export function formatRaceBonusParts(bonus = {}) {
  const parts = []
  RACE_ATTR_KEYS.forEach(attr => {
    const value = bonus.attrs?.[attr] || 0
    if (value) parts.push(`${value > 0 ? '+' : ''}${value} ${attr}`)
  })
  if (bonus.hp) parts.push(`${bonus.hp > 0 ? '+' : ''}${bonus.hp} Vida`)
  if (bonus.energia) parts.push(`${bonus.energia > 0 ? '+' : ''}${bonus.energia} Energia`)
  if (bonus.pe) parts.push(`${bonus.pe > 0 ? '+' : ''}${bonus.pe} PE`)
  if (bonus.ca) parts.push(`${bonus.ca > 0 ? '+' : ''}${bonus.ca} CA`)
  if (bonus.dano) parts.push(`${bonus.dano > 0 ? '+' : ''}${bonus.dano} Dano`)
  if (bonus.pericias) parts.push(`${bonus.pericias > 0 ? '+' : ''}${bonus.pericias} Pericias`)
  if (bonus.modules) parts.push(`${bonus.modules > 0 ? '+' : ''}${bonus.modules} Modulos`)
  if (bonus.skeletonPoints) parts.push(`${bonus.skeletonPoints > 0 ? '+' : ''}${bonus.skeletonPoints} Esqueleto`)
  return parts
}
