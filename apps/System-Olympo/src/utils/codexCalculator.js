import { CODEX_PROFILES } from '../data/codexProfiles'
import { CODEX_NA_MODS } from '../data/codexNaMods'
import { CODEX_ATTR_DIST, getAttrCapForLevel, getAttrPoolForLevel } from '../data/codexAttrDist'

export function attrMod(v) {
  const m = Math.floor((v - 10) / 2)
  return (m >= 0 ? '+' : '') + m
}

export function interpolateProfile(profileKey, level) {
  const profile = CODEX_PROFILES[profileKey]
  if (!profile) return null
  const keys = Object.keys(profile.levels).map(Number).sort((a, b) => a - b)
  if (level <= keys[0]) return { ...profile.levels[keys[0]] }
  if (level >= keys[keys.length - 1]) return { ...profile.levels[keys[keys.length - 1]] }
  let lo = keys[0], hi = keys[1]
  for (let i = 0; i < keys.length - 1; i++) {
    if (keys[i] <= level && level <= keys[i + 1]) {
      lo = keys[i]
      hi = keys[i + 1]
      break
    }
  }
  const t = (level - lo) / (hi - lo)
  const a = profile.levels[lo]
  const b = profile.levels[hi]
  return {
    vida: [
      Math.round(a.vida[0] + (b.vida[0] - a.vida[0]) * t),
      Math.round(a.vida[1] + (b.vida[1] - a.vida[1]) * t),
    ],
    arm: [
      Math.round(a.arm[0] + (b.arm[0] - a.arm[0]) * t),
      Math.round(a.arm[1] + (b.arm[1] - a.arm[1]) * t),
    ],
    dano: a.dano,
    ba: Math.round(a.ba + (b.ba - a.ba) * t),
    reac: Math.round(a.reac + (b.reac - a.reac) * t),
  }
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function applyNA(base, naStr) {
  const m = CODEX_NA_MODS[naStr]
  if (!m) return { vida: rand(base.vida[0], base.vida[1]), arm: rand(base.arm[0], base.arm[1]), ba: base.ba, bd: base.ba - 3, ca: calcCA(base.ba), reac: base.reac, dano: base.dano, danoExtra: '', tag: '1v1' }
  const vida = Math.round(rand(base.vida[0], base.vida[1]) * (1 + m.vida / 100))
  const arm = rand(base.arm[0], base.arm[1]) + m.arm
  const ba = base.ba + m.ba
  const bd = ba - 3
  const ca = calcCA(ba)
  const reac = Math.max(0, base.reac + m.reac)
  return { vida, arm, ba, bd, ca, reac, dano: base.dano, danoExtra: m.danoBase, tag: m.tag }
}

export function calcCA(ba) {
  return 10 + (ba - 3)
}

export function getAttrDist(level, distType) {
  const tbl = CODEX_ATTR_DIST[distType] || CODEX_ATTR_DIST.balanceada
  const fallback = CODEX_ATTR_DIST.balanceada
  const pick = (t) => {
    if (level <= 7 && t['5-7']) return t['5-7']
    if (level <= 14 && t['8-14']) return t['8-14']
    if (level <= 22 && t['15-22']) return t['15-22']
    if (level <= 30 && t['23-30']) return t['23-30']
    if (level <= 38 && t['31-38']) return t['31-38']
    if (t['39-50']) return t['39-50']
    return null
  }
  return pick(tbl) || pick(fallback)
}

export function generateNpcStats(profileKey, nivel, naStr, distType, existingAttrs) {
  const base = interpolateProfile(profileKey, nivel)
  if (!base) return null
  const stats = applyNA(base, naStr)

  if (distType === 'livre') {
    const cap = getAttrCapForLevel(nivel)
    if (existingAttrs && existingAttrs.length === 6) {
      return { stats, attrs: existingAttrs.map(v => Math.max(1, Math.min(cap + 5, v))), profile: profileKey, nivel, na: naStr, distType: 'livre', attrCap: cap }
    }
    const pool = getAttrPoolForLevel(nivel)
    const baseVal = Math.floor(pool / 6)
    const remainder = pool - baseVal * 6
    const attrs = Array(6).fill(baseVal)
    for (let i = 0; i < remainder; i++) attrs[i]++
    return { stats, attrs, profile: profileKey, nivel, na: naStr, distType: 'livre', attrCap: cap }
  }

  const distArray = getAttrDist(nivel, distType)
  const attrs = [...distArray]
    .sort((a, b) => b - a)
    .map(v => Math.max(1, v + rand(-1, 1)))
  return { stats, attrs, profile: profileKey, nivel, na: naStr, distType: distType || 'balanceada' }
}
