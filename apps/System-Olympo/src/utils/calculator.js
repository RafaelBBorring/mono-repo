import { getModifier, getTierForLevel } from '../data/attributes'
import { CLASSES } from '../data/classes'
import { PROGRESSION } from '../data/progression'
import { TRIAGES } from '../data/triages'
import { getMaxGrauForLevel, getGrauBonus } from '../data/pericias'
import { WEAPON_RANKS } from '../data/weapons'
import { calculateRaceBonus } from './raceCalculator'
import { scaleTrainedSkillsReward } from './progressionUtils'

function getClassDef(classe) {
  return CLASSES[classe]
}

function getAttrValue(attrs, attr, skeletonPoints, raceContext) {
  const raceBonus = raceContext ? calculateRaceBonus(raceContext).attrs[attr] || 0 : 0
  return (attrs[attr] || 0) + (skeletonPoints[attr] || 0) + raceBonus
}

function getProgressionRewards(classe, nivel, choices) {
  const prog = PROGRESSION[classe]
  if (!prog) return { vida: 0, energia: 0, pe: 0, esqueleto: 0, modulo: 0, pericias: 0, triagemPrincipal: 0, subTriagem: 0, peh: 0 }
  let total = { vida: 0, energia: 0, pe: 0, esqueleto: 0, modulo: 0, pericias: 0, triagemPrincipal: 0, subTriagem: 0, peh: 0 }
  for (let n = 1; n <= nivel; n++) {
    const entry = prog[n]
    if (!entry) continue
    for (const r of entry.rewards) {
      if (r.type === 'escolha') {
        const chosen = choices?.[r.key]
        if (chosen) {
          const opt = r.options.find(o => o.key === chosen)
          if (opt) {
            for (const sr of opt.rewards) {
              applyReward(total, sr)
            }
          }
        }
      } else {
        applyReward(total, r)
      }
    }
  }
  return total
}

function applyReward(total, r) {
  switch (r.type) {
    case 'vida_fixo': total.vida += r.value; break
    case 'energia_fixo': total.energia += r.value; break
    case 'pe_fixo': total.pe += r.value; break
    case 'pontos_esqueleto': total.esqueleto += r.value; break
    case 'modulo': total.modulo += r.value; break
    case 'pericias_treinadas': total.pericias += scaleTrainedSkillsReward(r.value); break
    case 'triagem_principal': total.triagemPrincipal = Math.max(total.triagemPrincipal, r.value); break
    case 'sub_triagem': total.subTriagem = Math.max(total.subTriagem, r.value); break
    case 'peh': total.peh += r.value; break
  }
}

function getTankBonus(triagemPrincipal, triagemPrincipalNivel, nivel) {
  if (triagemPrincipal === 'TANK' && triagemPrincipalNivel >= 0.1) {
    return nivel * 5
  }
  return 0
}

function buildExtraAbilitiesTypes(triagemPrincipal, triagemPrincipalNivel, subTriagem, subTriagemNivel, attrs, skeletonPoints, modulosAdquiridos, raceContext) {
  const types = []
  const modInt = getModifier(getAttrValue(attrs, 'INT', skeletonPoints, raceContext))
  if (triagemPrincipal === 'INTUITIVO' && triagemPrincipalNivel >= 0.6) types.push('Passiva')
  if (triagemPrincipal === 'GRADUADO' && triagemPrincipalNivel >= 0.2) {
    const n = Math.floor(modInt / 3)
    for (let i = 0; i < n; i++) types.push('Extra (Triagem)')
  }
  if (triagemPrincipal === 'GRADUADO' && triagemPrincipalNivel >= 0.5) {
    const n = Math.floor(modInt / 3)
    for (let i = 0; i < n; i++) types.push('Extra (Triagem)')
  }
  if (subTriagem === 'INTUITIVO' && subTriagemNivel >= 0.6) types.push('Passiva')
  if (subTriagem === 'GRADUADO' && subTriagemNivel >= 0.2) {
    const n = Math.floor(modInt / 3)
    for (let i = 0; i < n; i++) types.push('Extra (Triagem)')
  }
  if (subTriagem === 'GRADUADO' && subTriagemNivel >= 0.5) {
    const n = Math.floor(modInt / 3)
    for (let i = 0; i < n; i++) types.push('Extra (Triagem)')
  }
  const ca = (modulosAdquiridos || []).find(m => m.id === 'conhecimento_amplificado')
  if (ca) {
    const n = ca.boughtCount || 1
    for (let i = 0; i < n; i++) types.push('Extra (Módulo)')
  }
  return types
}

function getExtraAbilities(triagemPrincipal, triagemPrincipalNivel, subTriagem, subTriagemNivel, attrs, skeletonPoints, modulosAdquiridos, raceContext) {
  return buildExtraAbilitiesTypes(triagemPrincipal, triagemPrincipalNivel, subTriagem, subTriagemNivel, attrs, skeletonPoints, modulosAdquiridos, raceContext).length
}

export function calcVidaTotal(classe, nivel, attrs, skeletonPoints, choices, triagemPrincipal, triagemPrincipalNivel, raceContext) {
  const def = getClassDef(classe)
  if (!def) return 0
  const con = getAttrValue(attrs, 'CON', skeletonPoints, raceContext)
  const base = def.vidaBase(con)
  const prog = getProgressionRewards(classe, nivel, choices)
  let vidaPorNivelTotal = 0
  for (let n = 1; n <= nivel; n++) {
    vidaPorNivelTotal += def.vidaPorNivel(getModifier(con))
  }
  const tankBonus = getTankBonus(triagemPrincipal, triagemPrincipalNivel || 0, nivel)
  return base + vidaPorNivelTotal + prog.vida + tankBonus + (raceContext ? calculateRaceBonus(raceContext).hp : 0)
}

export function calcEnergiaTotal(classe, nivel, attrs, skeletonPoints, choices, triagemPrincipal, triagemPrincipalNivel, subTriagem, subTriagemNivel, raceContext) {
  const def = getClassDef(classe)
  if (!def) return 0
  const am = getAttrValue(attrs, 'AM', skeletonPoints, raceContext)
  const base = def.energiaBase(am)
  const prog = getProgressionRewards(classe, nivel, choices)
  let energiaPorNivelTotal = 0
  for (let n = 1; n <= nivel; n++) {
    energiaPorNivelTotal += def.energiaPorNivel(getModifier(am))
  }
  let intuitivoBonus = 0
  if (triagemPrincipal === 'INTUITIVO' && (triagemPrincipalNivel || 0) >= 0.1) {
    intuitivoBonus += Math.floor(am * 0.5) * Math.floor(nivel / 5)
  }
  if (subTriagem === 'INTUITIVO' && (subTriagemNivel || 0) >= 0.1) {
    intuitivoBonus += Math.floor(am * 0.5) * Math.floor(nivel / 5)
  }
  return base + energiaPorNivelTotal + prog.energia + intuitivoBonus
}

export function calcPeTotal(classe, nivel, choices, raceContext) {
  const def = getClassDef(classe)
  if (!def) return 0
  const prog = getProgressionRewards(classe, nivel, choices)
  return def.peBase + (def.pePorNivel * nivel) + prog.pe + (raceContext ? calculateRaceBonus(raceContext).pe : 0)
}

export function calcCA(attrs, skeletonPoints, pericias, raceContext) {
  const des = getAttrValue(attrs, 'DES', skeletonPoints, raceContext)
  const con = getAttrValue(attrs, 'CON', skeletonPoints, raceContext)
  const modDES = getModifier(des)
  const modCON = getModifier(con)
  const reflexoGrau = pericias?.Reflexo || 0
  const bloqueioGrau = pericias?.Bloqueio || 0
  const treino = Math.max(getGrauBonus(reflexoGrau), getGrauBonus(bloqueioGrau))
  return 10 + treino + Math.max(modCON, modDES)
}

export function calcReacoes(attrs, skeletonPoints, triagemPrincipal, triagemPrincipalNivel, subTriagem, subTriagemNivel, raceContext) {
  const des = getAttrValue(attrs, 'DES', skeletonPoints, raceContext)
  let reacoes = Math.max(1, Math.floor(des / 5))
  if (triagemPrincipal === 'ASSASSINO' && triagemPrincipalNivel >= 0.2) {
    reacoes += Math.floor(des / 15)
  }
  if (subTriagem === 'ASSASSINO' && subTriagemNivel >= 0.2) {
    reacoes += Math.floor(des / 15)
  }
  return reacoes
}

export function calcPercepcaoPassiva(attrs, skeletonPoints, pericias, raceContext) {
  const int = getAttrValue(attrs, 'INT', skeletonPoints, raceContext)
  const modINT = getModifier(int)
  const percGrau = pericias?.Percepção || 0
  const treino = getGrauBonus(percGrau)
  return 10 + treino + modINT
}

export function calcDanoBase(classe, attrs, skeletonPoints, nivel, subTriagem, subTriagemNivel, triagemPrincipal, triagemPrincipalNivel, raceContext) {
  const def = getClassDef(classe)
  if (!def) return ''
  const modAttr = getAttrValue(attrs, def.danoBaseMod, skeletonPoints, raceContext)
  const mod = getModifier(modAttr)
  const parts = [`${def.danoBase} ${mod >= 0 ? '+' : ''}${mod}`]
  const n = nivel || 1
  const tp = triagemPrincipal || ''; const tn = triagemPrincipalNivel || 0
  const st = subTriagem || '';       const sn = subTriagemNivel || 0

  if ((tp === 'COMBATE' && tn >= 0.2) || (st === 'COMBATE' && sn >= 0.2)) {
    const bonus = Math.floor(n / 10)
    if (bonus > 0) parts.push(`+${bonus}d6+${bonus * 5}`)
  }
  if ((tp === 'ATIRADOR' && tn >= 0.2) || (st === 'ATIRADOR' && sn >= 0.2)) {
    const int = getAttrValue(attrs, 'INT', skeletonPoints, raceContext)
    parts.push(`+${int} (INT)`)
  }
  if ((tp === 'TÉCNICO' && tn >= 0.1) || (st === 'TÉCNICO' && sn >= 0.1)) {
    const allAttrs = ['FOR','DES','CON','INT','APA','AM'].map(a => getAttrValue(attrs, a, skeletonPoints, raceContext))
    const maior = Math.max(...allAttrs)
    parts.push(`+${maior} (maior attr)`)
  }

  return parts.join(' ')
}

export function calcSkeletonPointsAvailable(classe, nivel, choices) {
  const prog = getProgressionRewards(classe, nivel, choices)
  return prog.esqueleto
}

export function calcModulesAvailable(classe, nivel, choices, raceContext) {
  const prog = getProgressionRewards(classe, nivel, choices)
  return prog.modulo + (raceContext ? calculateRaceBonus(raceContext).modules : 0)
}

export function calcPericiasAvailable(classe, nivel, choices, modulosAdquiridos, raceContext) {
  const def = getClassDef(classe)
  if (!def) return 0
  const prog = getProgressionRewards(classe, nivel, choices)
  let total = def.periciasIniciais + prog.pericias + (raceContext ? calculateRaceBonus(raceContext).pericias : 0)
  const treinoIntensivo = (modulosAdquiridos || []).find(m => m.id === 'treino_intensivo')
  if (treinoIntensivo) {
    total += (treinoIntensivo.boughtCount || 1) * 2
  }
  return total
}

export function calcTriagemPrincipalLevel(classe, nivel, choices) {
  const prog = getProgressionRewards(classe, nivel, choices)
  return prog.triagemPrincipal
}

export function calcSubTriagemLevel(classe, nivel, choices) {
  const prog = getProgressionRewards(classe, nivel, choices)
  return prog.subTriagem
}

export function calcExtraAbilities(triagemPrincipal, triagemPrincipalNivel, subTriagem, subTriagemNivel, attrs, skeletonPoints, modulosAdquiridos, raceContext) {
  return getExtraAbilities(triagemPrincipal, triagemPrincipalNivel, subTriagem, subTriagemNivel, attrs, skeletonPoints, modulosAdquiridos, raceContext)
}

export function calcExtraAbilitiesTypes(triagemPrincipal, triagemPrincipalNivel, subTriagem, subTriagemNivel, attrs, skeletonPoints, modulosAdquiridos, raceContext) {
  return buildExtraAbilitiesTypes(triagemPrincipal, triagemPrincipalNivel, subTriagem, subTriagemNivel, attrs, skeletonPoints, modulosAdquiridos, raceContext)
}

export function calcAbilityCostReduction(triagemPrincipal, triagemPrincipalNivel, subTriagem, subTriagemNivel) {
  let reduction = 0
  if (triagemPrincipal === 'SUPORTE' && triagemPrincipalNivel >= 0.1) reduction = Math.max(reduction, 0.30)
  if (subTriagem === 'SUPORTE' && subTriagemNivel >= 0.1) reduction = Math.max(reduction, 0.30)
  return reduction
}

export function calcPEHTotal(classe, nivel, choices, modulosAdquiridos) {
  const prog = getProgressionRewards(classe, nivel, choices)
  let total = prog.peh || 0
  // Aumento de Poder: cada compra concede 1 PEH adicional (representa o slot de evolução grant)
  const aumentoPoder = (modulosAdquiridos || []).find(m => m.id === 'aumento_poder')
  if (aumentoPoder) total += (aumentoPoder.boughtCount || 1)
  return total
}

export function calcCarryCapacity(atributos, skeletonPoints, char) {
  const total = (a) => (atributos[a] || 0) + (skeletonPoints[a] || 0)
  const baseFOR = total('FOR')
  const baseCON = total('CON')
  let capacity = 10 + (baseFOR * 2) + Math.floor(baseCON * 0.5)
  if (char) {
    const mods = char.modulosAdquiridos || []
    if (mods.some(m => m.id === 'mochila_avancada')) capacity += 10
    if (mods.some(m => m.id === 'forja_pessoal')) capacity += 5
    if (mods.some(m => m.id === 'portador_nato')) {
      const buys = mods.filter(m => m.id === 'portador_nato').reduce((s, m) => s + (m.boughtCount || 1), 0)
      capacity += buys * 8
    }
    const eq = Array.isArray(char.equipamentos) ? char.equipamentos : Object.values(char.equipamentos || {})
    if (eq.some(e => /mochila|backpack|bolsa.*refor/i.test(e.nome || ''))) capacity += 8
    if (eq.some(e => /bolsa.*dimens|bag.*holding/i.test(e.nome || ''))) capacity += 20
  }
  return capacity
}

export function calcStartingEconomy(level) {
  return 5000 + Math.max(0, level - 1) * 500
}

export { getProgressionRewards, getClassDef, getAttrValue }
