import { ABSORPTION_TABLE, absorption } from '../data/combat.js'
import { LEVEL_BY_KEY } from '../data/startingLevels.js'
import { combinedPool } from './dice.js'

export function baseResources(attributes) {
  return {
    vida: (attributes.for || 1) * 2 + (attributes.von || 1) + 10,
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

export function attackPool({ attribute, weapon, conditions = {}, spendPE = 0 }) {
  const bonus = weapon?.bonusDice || 0
  let pool = (attribute || 0) + bonus
  if (conditions.pos) pool += 1
  if (conditions.neg) pool -= 1
  if (spendPE) pool += 2 * spendPE
  return Math.max(1, pool)
}

export function defensePool({ agility, weaponHeldPenalty = 0, conditions = {} }) {
  let pool = agility + weaponHeldPenalty
  if (conditions.pos) pool += 1
  if (conditions.neg) pool -= 1
  return Math.max(1, pool)
}

export function resolveHit({ attackSuccesses, dodgeSuccesses }) {
  const net = Math.max(0, attackSuccesses - dodgeSuccesses)
  return { netSuccesses: net, fullyDodged: net === 0 }
}

export function resolveDamage({ netSuccesses, valuePerSuccess, attackerForca, magic = false }) {
  const gross = netSuccesses * valuePerSuccess
  const absorb = magic ? 0 : absorption(attackerForca)
  return { gross, absorb, final: Math.max(0, gross - absorb) }
}

export function fullCombatResolution({
  attackerAttr, weapon, attackSuccesses, defenderAgi, defenderForca,
  defenderWeaponPenalty = 0, conditions = {}
}) {
  const dodgePool = defensePool({ agility: defenderAgi, weaponHeldPenalty: defenderWeaponPenalty })
  const net = Math.max(0, attackSuccesses)
  const gross = net * weapon.valuePerSuccess
  const absorb = weapon.ignoresArmor ? 0 : absorption(defenderForca)
  const final = Math.max(0, gross - absorb)
  return {
    dodgePoolSuggested: dodgePool,
    netSuccesses: net,
    grossDamage: gross,
    absorption: absorb,
    finalDamage: final,
    magic: !!weapon.ignoresArmor
  }
}

export function combinedAction(attributes, keyA, keyB) {
  const a = attributes[keyA] || 1
  const b = attributes[keyB] || 1
  return combinedPool(a, b)
}

export { ABSORPTION_TABLE, absorption }
