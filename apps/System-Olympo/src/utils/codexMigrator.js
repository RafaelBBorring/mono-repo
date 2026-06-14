import { CODEX_PROFILES } from '../data/codexProfiles'
import { CODEX_NA_MODS } from '../data/codexNaMods'

export const CODEX_SEED_VERSION = '2026-06-13-rebalance-v1'

function remapLevel(old) {
  if (old >= 35) return Math.min(50, Math.round(old * 1.25))
  return Math.max(1, Math.min(50, Math.round(old * 1.6)))
}

function mid(arr) { return Math.round((arr[0] + arr[1]) / 2) }

function interpolate(profileKey, level) {
  const profile = CODEX_PROFILES[profileKey]
  if (!profile) return null
  const keys = Object.keys(profile.levels).map(Number).sort((a, b) => a - b)
  if (level <= keys[0]) { const l = profile.levels[keys[0]]; return { vida: mid(l.vida), arm: mid(l.arm), dano: l.dano, ba: l.ba, reac: l.reac } }
  if (level >= keys[keys.length - 1]) { const l = profile.levels[keys[keys.length - 1]]; return { vida: mid(l.vida), arm: mid(l.arm), dano: l.dano, ba: l.ba, reac: l.reac } }
  let lo = keys[0], hi = keys[1]
  for (let i = 0; i < keys.length - 1; i++) {
    if (keys[i] <= level && level <= keys[i + 1]) { lo = keys[i]; hi = keys[i + 1]; break }
  }
  const t = (level - lo) / (hi - lo)
  const a = profile.levels[lo], b = profile.levels[hi]
  return {
    vida: Math.round(mid(a.vida) + (mid(b.vida) - mid(a.vida)) * t),
    arm: Math.round(mid(a.arm) + (mid(b.arm) - mid(a.arm)) * t),
    dano: t >= 0.5 ? b.dano : a.dano,
    ba: Math.round(a.ba + (b.ba - a.ba) * t),
    reac: Math.round(a.reac + (b.reac - a.reac) * t),
  }
}

function applyNAMods(base, naStr) {
  const m = CODEX_NA_MODS[naStr] || CODEX_NA_MODS['1']
  return {
    vida: Math.round(base.vida * (1 + m.vida / 100)),
    arm: base.arm + m.arm,
    ba: base.ba + m.ba,
    bd: (base.ba + m.ba) - 3,
    ca: 10 + ((base.ba + m.ba) - 3),
    reac: Math.max(0, base.reac + m.reac),
    dano: base.dano,
    danoExtra: m.danoBase,
    tag: m.tag,
  }
}

function calcDamageAvg(s) {
  let total = 0
  const parts = (s || '').match(/(\d+)d(\d+)(?:\+(\d+))?/g) || []
  for (const p of parts) {
    const m = p.match(/(\d+)d(\d+)(?:\+(\d+))?/)
    total += parseInt(m[1]) * (parseInt(m[2]) + 1) / 2 + parseInt(m[3] || '0')
  }
  return total || 1
}

function scaleDiceInText(text, ratio) {
  if (!text || ratio === 1) return text
  return text.replace(/(\d+)d(\d+)/g, (m, n, d) => `${Math.max(1, Math.round(parseInt(n) * ratio))}d${d}`)
}

function scaleFlatsInText(text, ratio, hpRatio) {
  if (!text) return text
  const dtPlaceholders = []
  let masked = text.replace(/(?:DT|CD)\s*(\d+)/gi, (m) => {
    dtPlaceholders.push(m)
    return `\x01${dtPlaceholders.length - 1}\x01`
  })
  masked = masked.replace(/(?<!\d)(\d{2,4})/g, (match, num, offset, str) => {
    const val = parseInt(num)
    if (val < 5) return match
    const nextChar = str[offset + match.length] || ''
    if (nextChar === 'm' || nextChar === 'd' || /\d/.test(nextChar)) return match
    const ctx = str.substring(Math.max(0, offset - 20), Math.min(str.length, offset + match.length + 20))
    if (/cura|PV|vida|escudo|absorv|regener|ressusc/i.test(ctx)) return String(Math.round(val * hpRatio))
    if (/rodada|rod|turno|stack|m[áa]x/i.test(ctx)) return match
    return String(Math.round(val * ratio))
  })
  return masked.replace(/\x01(\d+)\x01/g, (m, i) => dtPlaceholders[parseInt(i)] || m)
}

export function rebalanceNpc(npc) {
  const oldLevel = npc.nivel
  const newLevel = remapLevel(oldLevel)
  if (newLevel === oldLevel) return npc

  const profileKey = npc.profile || 'guerreiro'
  const naStr = String(npc.na || '1')

  const oldBase = interpolate(profileKey, oldLevel)
  const newBase = interpolate(profileKey, newLevel)
  if (!oldBase || !newBase) return npc

  const oldFull = applyNAMods(oldBase, naStr)
  const newFull = applyNAMods(newBase, naStr)

  const vidaRatio = newFull.vida / (oldFull.vida || 1)
  const oldDanoAvg = calcDamageAvg(oldFull.dano + (oldFull.danoExtra || ''))
  const newDanoAvg = calcDamageAvg(newFull.dano + (newFull.danoExtra || ''))
  const dmgRatio = newDanoAvg / (oldDanoAvg || 1)

  const scaledAbilities = (npc.abilities || []).map(ab => {
    let desc = scaleDiceInText(ab.description || '', dmgRatio)
    desc = scaleFlatsInText(desc, dmgRatio, vidaRatio)
    let stats = (ab.stats || []).map(s => {
      s = scaleDiceInText(s, dmgRatio)
      s = scaleFlatsInText(s, dmgRatio, vidaRatio)
      return s
    })
    return { ...ab, description: desc, stats }
  })

  const cap = newLevel <= 7 ? 20 : newLevel <= 13 ? 26 : newLevel <= 22 ? 32 : newLevel <= 30 ? 38 : newLevel <= 38 ? 44 : 50
  const oldCap = oldLevel <= 7 ? 20 : oldLevel <= 13 ? 26 : oldLevel <= 22 ? 32 : oldLevel <= 30 ? 38 : oldLevel <= 38 ? 44 : 50
  const attrRatio = cap / (oldCap || 1)
  const newAttrs = (npc.attrs || [18, 14, 14, 12, 10, 10]).map(v => Math.min(cap, Math.max(8, Math.round(v * attrRatio))))

  return {
    ...npc,
    nivel: newLevel,
    stats: newFull,
    attrs: newAttrs,
    abilities: scaledAbilities,
    _rebalanced: true,
  }
}
