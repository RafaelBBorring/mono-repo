import { ABSORPTION_TABLE, absorption } from '../data/combat.js'
import { LEVEL_BY_KEY } from '../data/startingLevels.js'
import { combinedPool, rollDamage } from './dice.js'

const VIDA_BASE_FLAT = 15

export function baseResources(attributes) {
  return {
    vida: (attributes.for || 1) * 2 + (attributes.von || 1) + VIDA_BASE_FLAT,
    energia: (attributes.am || 1) * 5,
    pe: (attributes.von || 1) * 2 + (attributes.agi || 1)
  }
}

export function maxResources(attributes, levelKey) {
  const lvl = LEVEL_BY_KEY[levelKey]
  if (!lvl) return baseResources(attributes)
  const base = baseResources(attributes)
  return {
    vida: base.vida + lvl.bonus.vida,
    energia: base.energia + lvl.bonus.energia,
    pe: base.pe + lvl.bonus.pe
  }
}

export function pointsSpent(attributes) {
  return Object.values(attributes || {}).reduce((s, v) => s + (Number(v) || 0), 0)
}

export function pointBudget(levelKey) {
  const lvl = LEVEL_BY_KEY[levelKey]
  return lvl ? lvl.points : 0
}

export function capFor(levelKey) {
  const lvl = LEVEL_BY_KEY[levelKey]
  return lvl ? lvl.cap : 10
}

export function validateAttributes(attributes, levelKey) {
  const lvl = LEVEL_BY_KEY[levelKey]
  if (!lvl) return { ok: false, errors: ['Nível inválido.'] }
  const keys = ['for', 'agi', 'per', 'int', 'von', 'pre', 'am']
  const errors = []
  let spent = 0
  for (const k of keys) {
    const v = Number(attributes?.[k] || 0)
    if (v < 0) errors.push(`Atributo abaixo do mínimo (0).`)
    if (v > lvl.cap) errors.push(`Atributo acima do limite (${lvl.cap}).`)
    spent += v
  }
  if (spent !== lvl.points) errors.push(`Pontos distribuídos (${spent}) ≠ pontos do nível (${lvl.points}).`)
  return { ok: errors.length === 0, errors, spent }
}

export function effectiveAbsorption(character) {
  const override = character?.resources?.absorbOverride
  if (override != null && Number.isFinite(Number(override))) return Math.max(0, Number(override))
  return absorption(character?.attributes?.for || 0)
}

export function hitPool({ attribute = 0, conditions = {}, spendPE = 0 }) {
  let pool = attribute
  if (conditions.pos) pool += 1
  if (conditions.neg) pool -= 1
  if (spendPE) pool += 2 * spendPE
  return Math.max(1, pool)
}

export function dodgePool({ agility, weaponHeldPenalty = 0, conditions = {} }) {
  let pool = agility - Math.max(0, weaponHeldPenalty || 0)
  if (conditions.pos) pool += 1
  if (conditions.neg) pool -= 1
  return Math.max(1, pool)
}

export const HIT_DIFFICULTY = 2

export function resolveHit({ attackSuccesses, dodgeSuccesses = 0, difficulty = HIT_DIFFICULTY }) {
  const passed = attackSuccesses >= difficulty && attackSuccesses > dodgeSuccesses
  return {
    netSuccesses: Math.max(0, attackSuccesses - dodgeSuccesses),
    fullyDodged: dodgeSuccesses >= attackSuccesses,
    belowDifficulty: attackSuccesses < difficulty,
    hit: passed
  }
}

export function resolveDamage({ damageSum, absorb, magic = false }) {
  const reduction = magic ? 0 : Math.max(0, absorb || 0)
  return { gross: damageSum, absorb: reduction, final: Math.max(0, damageSum - reduction) }
}

export function fullCombatResolution({
  attackSuccesses, defenderAgi, defenderAbsorb,
  defenderWeaponPenalty = 0, weapon, conditions = {}
}) {
  const dodge = dodgePool({ agility: defenderAgi, weaponHeldPenalty: defenderWeaponPenalty, conditions })
  const hit = resolveHit({ attackSuccesses, dodgeSuccesses: dodge.successes ?? dodge })
  const dmg = rollDamage(weapon?.damage)
  const isMagic = !!weapon?.ignoresArmor
  const res = resolveDamage({ damageSum: dmg.sum, absorb: defenderAbsorb, magic: isMagic })
  return {
    dodgePool: typeof dodge === 'number' ? dodge : dodge.pool,
    ...hit,
    damageDice: dmg.dice,
    grossDamage: res.gross,
    absorption: res.absorb,
    finalDamage: res.final,
    magic: isMagic
  }
}

export function combinedAction(attributes, keyA, keyB) {
  const a = attributes[keyA] || 1
  const b = attributes[keyB] || 1
  return combinedPool(a, b)
}

export function clampPct(value, max) {
  if (!max || max <= 0) return 0
  return Math.max(0, Math.min(1, value / max))
}

function lerp(a, b, t) { return a + (b - a) * t }
function lerpHue(a, b, t) {
  const diff = b - a
  if (Math.abs(diff) > 180) {
    if (diff > 0) return (a + 360 + (b - a) * t) % 360
    return (a + ((b + 360 - a) * t)) % 360
  }
  return a + diff * t
}

export function healthColor(pct, kind = 'vida') {
  const p = Math.max(0, Math.min(1, pct))
  if (kind === 'vida') {
    const h = lerpHue(0, 130, p)
    const s = lerp(60, 75, p)
    const l = lerp(45, 50, p)
    return `hsl(${h.toFixed(0)}, ${s.toFixed(0)}%, ${l.toFixed(0)}%)`
  }
  if (kind === 'energia') {
    const h = lerpHue(0, 35, p)
    const s = lerp(70, 95, p)
    const l = lerp(42, 52, p)
    return `hsl(${h.toFixed(0)}, ${s.toFixed(0)}%, ${l.toFixed(0)}%)`
  }
  if (kind === 'pe') {
    const h = lerpHue(283, 320, p)
    const s = lerp(35, 60, p)
    const l = lerp(35, 50, p)
    return `hsl(${h.toFixed(0)}, ${s.toFixed(0)}%, ${l.toFixed(0)}%)`
  }
  return '#e0ad33'
}

export function healthGradient(pct, kind = 'vida') {
  const p = Math.max(0, Math.min(1, pct))
  const c1 = healthColor(p, kind)
  const c2 = healthColor(Math.max(0, p - 0.18), kind)
  return `linear-gradient(180deg, ${c1}, ${c2})`
}

export { ABSORPTION_TABLE, absorption, VIDA_BASE_FLAT }
