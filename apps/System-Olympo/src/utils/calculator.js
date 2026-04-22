import { getModifier, getTierForLevel } from '../data/attributes'
import { CLASSES } from '../data/classes'
import { PROGRESSION } from '../data/progression'
import { TRIAGES } from '../data/triages'
import { getMaxGrauForLevel, getGrauBonus } from '../data/pericias'
import { WEAPON_RANKS } from '../data/weapons'

function getClassDef(classe) {
  return CLASSES[classe]
}

function getAttrValue(attrs, attr, skeletonPoints) {
  return (attrs[attr] || 0) + (skeletonPoints[attr] || 0)
}

function getProgressionRewards(classe, nivel, choices) {
  const prog = PROGRESSION[classe]
  if (!prog) return { vida: 0, energia: 0, pe: 0, esqueleto: 0, modulo: 0, pericias: 0, triagemPrincipal: 0, subTriagem: 0 }
  let total = { vida: 0, energia: 0, pe: 0, esqueleto: 0, modulo: 0, pericias: 0, triagemPrincipal: 0, subTriagem: 0 }
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
    case 'pericias_treinadas': total.pericias += r.value; break
    case 'triagem_principal': total.triagemPrincipal = Math.max(total.triagemPrincipal, r.value); break
    case 'sub_triagem': total.subTriagem = Math.max(total.subTriagem, r.value); break
  }
}

function getTankBonus(triagemPrincipal, triagemPrincipalNivel, nivel) {
  if (triagemPrincipal === 'TANK' && triagemPrincipalNivel >= 0.1) {
    return nivel * 5
  }
  return 0
}

function getExtraAbilities(triagemPrincipal, triagemPrincipalNivel, subTriagem, subTriagemNivel, attrs, skeletonPoints, modulosAdquiridos) {
  let extra = 0
  const modInt = getModifier(getAttrValue(attrs, 'INT', skeletonPoints))
  if (triagemPrincipal === 'INTUITIVO' && triagemPrincipalNivel >= 0.6) extra += 1
  if (triagemPrincipal === 'GRADUADO' && triagemPrincipalNivel >= 0.2) extra += Math.floor(modInt / 3)
  if (triagemPrincipal === 'GRADUADO' && triagemPrincipalNivel >= 0.5) extra += Math.floor(modInt / 3)
  if (subTriagem === 'INTUITIVO' && subTriagemNivel >= 0.6) extra += 1
  if (subTriagem === 'GRADUADO' && subTriagemNivel >= 0.2) extra += Math.floor(modInt / 3)
  if (subTriagem === 'GRADUADO' && subTriagemNivel >= 0.5) extra += Math.floor(modInt / 3)
  const ca = (modulosAdquiridos || []).find(m => m.id === 'conhecimento_amplificado')
  if (ca) extra += (ca.boughtCount || 1)
  return extra
}

export function calcVidaTotal(classe, nivel, attrs, skeletonPoints, choices, triagemPrincipal, triagemPrincipalNivel) {
  const def = getClassDef(classe)
  if (!def) return 0
  const con = getAttrValue(attrs, 'CON', skeletonPoints)
  const base = def.vidaBase(con)
  const prog = getProgressionRewards(classe, nivel, choices)
  let vidaPorNivelTotal = 0
  for (let n = 1; n <= nivel; n++) {
    vidaPorNivelTotal += def.vidaPorNivel(getModifier(con))
  }
  const tankBonus = getTankBonus(triagemPrincipal, triagemPrincipalNivel || 0, nivel)
  return base + vidaPorNivelTotal + prog.vida + tankBonus
}

export function calcEnergiaTotal(classe, nivel, attrs, skeletonPoints, choices, triagemPrincipal, triagemPrincipalNivel, subTriagem, subTriagemNivel) {
  const def = getClassDef(classe)
  if (!def) return 0
  const am = getAttrValue(attrs, 'AM', skeletonPoints)
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

export function calcPeTotal(classe, nivel, choices) {
  const def = getClassDef(classe)
  if (!def) return 0
  const prog = getProgressionRewards(classe, nivel, choices)
  return def.peBase + (def.pePorNivel * nivel) + prog.pe
}

export function calcCA(attrs, skeletonPoints, pericias) {
  const des = getAttrValue(attrs, 'DES', skeletonPoints)
  const con = getAttrValue(attrs, 'CON', skeletonPoints)
  const modDES = getModifier(des)
  const modCON = getModifier(con)
  const reflexoGrau = pericias?.Reflexo || 0
  const bloqueioGrau = pericias?.Bloqueio || 0
  const treino = Math.max(getGrauBonus(reflexoGrau), getGrauBonus(bloqueioGrau))
  return 10 + treino + Math.max(modCON, modDES)
}

export function calcReacoes(attrs, skeletonPoints, triagemPrincipal, triagemPrincipalNivel, subTriagem, subTriagemNivel) {
  const des = getAttrValue(attrs, 'DES', skeletonPoints)
  let reacoes = Math.max(1, Math.floor(des / 5))
  if (triagemPrincipal === 'ASSASSINO' && triagemPrincipalNivel >= 0.2) {
    reacoes += Math.floor(des / 15)
  }
  if (subTriagem === 'ASSASSINO' && subTriagemNivel >= 0.2) {
    reacoes += Math.floor(des / 15)
  }
  return reacoes
}

export function calcPercepcaoPassiva(attrs, skeletonPoints, pericias) {
  const int = getAttrValue(attrs, 'INT', skeletonPoints)
  const modINT = getModifier(int)
  const percGrau = pericias?.Percepção || 0
  const treino = getGrauBonus(percGrau)
  return 10 + treino + modINT
}

export function calcDanoBase(classe, attrs, skeletonPoints) {
  const def = getClassDef(classe)
  if (!def) return ''
  const modAttr = getAttrValue(attrs, def.danoBaseMod, skeletonPoints)
  const mod = getModifier(modAttr)
  return `${def.danoBase} ${mod >= 0 ? '+' : ''}${mod}`
}

export function calcSkeletonPointsAvailable(classe, nivel, choices) {
  const prog = getProgressionRewards(classe, nivel, choices)
  return prog.esqueleto
}

export function calcModulesAvailable(classe, nivel, choices) {
  const prog = getProgressionRewards(classe, nivel, choices)
  return prog.modulo
}

export function calcPericiasAvailable(classe, nivel, choices, modulosAdquiridos) {
  const def = getClassDef(classe)
  if (!def) return 0
  const prog = getProgressionRewards(classe, nivel, choices)
  let total = def.periciasIniciais + prog.pericias
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

export function calcExtraAbilities(triagemPrincipal, triagemPrincipalNivel, subTriagem, subTriagemNivel, attrs, skeletonPoints, modulosAdquiridos) {
  return getExtraAbilities(triagemPrincipal, triagemPrincipalNivel, subTriagem, subTriagemNivel, attrs, skeletonPoints, modulosAdquiridos)
}

export function calcAbilityCostReduction(triagemPrincipal, triagemPrincipalNivel, subTriagem, subTriagemNivel) {
  let reduction = 0
  if (triagemPrincipal === 'SUPORTE' && triagemPrincipalNivel >= 0.1) reduction = Math.max(reduction, 0.30)
  if (subTriagem === 'SUPORTE' && subTriagemNivel >= 0.1) reduction = Math.max(reduction, 0.30)
  return reduction
}

export { getProgressionRewards, getClassDef, getAttrValue }
