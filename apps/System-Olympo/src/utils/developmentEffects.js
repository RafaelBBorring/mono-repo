import { TRIAGES } from '../data/triages'
import { getModifier } from '../data/attributes'
import { getAttrValue } from './calculator'

function signed(value) {
  return `${value >= 0 ? '+' : ''}${value}`
}

function findTriage(classKey, triageKey) {
  if (!triageKey) return null
  if (TRIAGES[classKey]?.[triageKey]) return TRIAGES[classKey][triageKey]
  for (const ck of Object.keys(TRIAGES)) {
    if (TRIAGES[ck]?.[triageKey]) return TRIAGES[ck][triageKey]
  }
  return null
}

function has(source, key, minLevel) {
  return source.key === key && source.level >= minLevel
}

export function getTriageDevelopmentEffects(char = {}, classKey = char.classe) {
  const attrs = char.atributos || {}
  const skeleton = char.skeletonPoints || {}
  const level = char.nivel || 1
  const sources = [
    { slot: 'Principal', key: char.triagemPrincipal, level: char.triagemPrincipalNivel || 0, classKey },
    { slot: 'Sub', key: char.subTriagem, level: char.subTriagemNivel || 0, classKey: char.subTriagemClass || classKey },
  ].filter(s => s.key && s.level >= 0.1)
  const effects = []

  sources.forEach(source => {
    const data = findTriage(source.classKey, source.key)
    const label = `${data?.name || source.key} (${source.slot})`
    const push = (target, value, formula, note) => effects.push({
      key: `${source.slot}:${source.key}:${target}:${formula}`,
      source: label,
      target,
      value,
      formula,
      note,
    })

    if (has(source, 'TANK', 0.1)) {
      push('Vida', signed(level * 6), '+6 por nivel', 'Aplicado diretamente na vida maxima.')
    }
    if (has(source, 'TANK', 0.3)) {
      const con = getAttrValue(attrs, 'CON', skeleton, char)
      push('CA / Armadura natural', signed(Math.floor(con * 0.5)), '50% da CON', 'Aplicado na CA base da ficha.')
    }
    if (has(source, 'ASSASSINO', 0.2)) {
      const des = getAttrValue(attrs, 'DES', skeleton, char)
      push('Reacoes', signed(Math.floor(des / 15)), '+1 a cada 15 DES', 'Aplicado no total de reacoes.')
    }
    if (has(source, 'ATIRADOR', 0.2)) {
      const int = getAttrValue(attrs, 'INT', skeleton, char)
      push('Dano a distancia', signed(int), 'INT total no dano', 'Aparece no dano base quando a triagem esta ativa.')
    }
    if (has(source, 'TECNICO', 0.1) || has(source, 'TÉCNICO', 0.1) || has(source, 'TÃ‰CNICO', 0.1)) {
      const values = ['FOR', 'DES', 'CON', 'INT', 'APA', 'AM'].map(attr => getAttrValue(attrs, attr, skeleton, char))
      const highest = Math.max(...values)
      push('Dano de arma', signed(highest), 'maior atributo total', 'Aparece no dano base como calibragem.')
    }
    if (has(source, 'COMBATE', 0.2)) {
      const dice = Math.floor(level / 10)
      if (dice > 0) {
        const modAM = getModifier(getAttrValue(attrs, 'AM', skeleton, char))
        push('Dano base magico', `+${dice}d6${signed(modAM * dice)}`, '+1d6 + modAM a cada 10 niveis', 'Aplicado no dano base da ficha.')
      }
    }
    if (has(source, 'INTUITIVO', 0.1)) {
      const am = getAttrValue(attrs, 'AM', skeleton, char)
      const bonus = Math.floor(am * 0.5) * Math.floor(level / 5)
      push('Energia', signed(bonus), '50% da AM a cada 5 niveis', 'Aplicado na energia maxima.')
    }
    if (has(source, 'INTUITIVO', 0.6)) {
      push('Habilidades', '+1 Passiva', 'desbloqueio de triagem', 'Cria um slot extra de habilidade passiva.')
    }
    if (has(source, 'GRADUADO', 0.2)) {
      const modInt = getModifier(getAttrValue(attrs, 'INT', skeleton, char))
      push('Habilidades', `+${Math.max(0, Math.floor(modInt / 4))}`, 'Mod.INT / 4', 'Slots extras de habilidade.')
    }
    if (has(source, 'GRADUADO', 0.5)) {
      const modInt = getModifier(getAttrValue(attrs, 'INT', skeleton, char))
      push('Habilidades', `+${Math.max(0, Math.floor(modInt / 4))}`, 'Mod.INT / 4 novamente', 'Segundo pacote de slots extras.')
    }
    if (has(source, 'SUPORTE', 0.1)) {
      push('Custo de buffs', '-30%', 'habilidade 0.1', 'Exibido nos custos de habilidade.')
    }
  })

  return effects
}

export function getRaceDevelopmentEffects(char = {}) {
  return []
}
