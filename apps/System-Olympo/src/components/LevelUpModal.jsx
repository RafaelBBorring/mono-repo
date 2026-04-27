import { useState, useMemo } from 'react'
import { PROGRESSION } from '../data/progression'
import { ATTRIBUTES, ATTR_ICONS, ATTR_LABELS, getModifier, getAttrCap } from '../data/attributes'
import { PERICIAS, getMaxGrauForLevel, GRAU_NAMES } from '../data/pericias'
import { ALL_MODULES, MODULES_PASSIVE, MODULES_SPECIAL, MODULES_ACTIVE } from '../data/modules'
import {
  calcSkeletonPointsAvailable, calcModulesAvailable, calcPericiasAvailable,
} from '../utils/calculator'
import { getRaceAdjustedAttrs } from '../utils/raceCalculator'
import { normalizeProgressionLabel } from '../utils/progressionUtils'

export default function LevelUpModal({ char, onApply, onClose }) {
  const oldNivel = char.nivel || 1
  const newNivel = oldNivel + 1
  const classe = char.classe

  const [working, setWorking] = useState(() => {
    const base = JSON.parse(JSON.stringify(char))
    base.nivel = newNivel
    return base
  })

  const prog = PROGRESSION[classe]
  const newLevelEntry = prog?.[newNivel]

  const hasChoice = newLevelEntry?.rewards?.some(r => r.type === 'escolha') || false
  const choiceReward = newLevelEntry?.rewards?.find(r => r.type === 'escolha')

  const oldSk = calcSkeletonPointsAvailable(classe, oldNivel, char.choices)
  const oldMods = calcModulesAvailable(classe, oldNivel, char.choices, char)
  const oldPer = calcPericiasAvailable(classe, oldNivel, char.choices, char.modulosAdquiridos, char)
  const newSk = calcSkeletonPointsAvailable(classe, newNivel, working.choices)
  const newMods = calcModulesAvailable(classe, newNivel, working.choices, working)
  const newPer = calcPericiasAvailable(classe, newNivel, working.choices, working.modulosAdquiridos, working)

  const deltaSk = newSk - oldSk
  const deltaMods = newMods - oldMods
  const deltaPer = newPer - oldPer

  const phases = useMemo(() => {
    const p = []
    if (hasChoice) p.push('choices')
    if (deltaSk > 0) p.push('skeleton')
    if (deltaMods > 0) p.push('modules')
    if (deltaPer > 0) p.push('pericias')
    p.push('summary')
    return p
  }, [hasChoice, deltaSk, deltaMods, deltaPer])

  const [phaseIdx, setPhaseIdx] = useState(0)
  const currentPhase = phases[phaseIdx] || 'summary'

  const choiceMade = !hasChoice || (choiceReward && working.choices[choiceReward.key])

  function updateWorking(patch) {
    setWorking(prev => ({ ...prev, ...patch }))
  }

  function updateWorkingNested(key, patch) {
    setWorking(prev => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }))
  }

  function handleChoice(choiceKey, optionKey) {
    updateWorkingNested('choices', { [choiceKey]: optionKey })
  }

  function canAdvance() {
    if (currentPhase === 'choices') return choiceMade
    return true
  }

  function handleNext() {
    if (!canAdvance()) return
    if (phaseIdx < phases.length - 1) setPhaseIdx(phaseIdx + 1)
  }

  function handlePrev() {
    if (phaseIdx > 0) setPhaseIdx(phaseIdx - 1)
  }

  function handleApply() {
    onApply(working)
  }

  if (newNivel > 30) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100]">
        <div className="bg-deep border border-gold/30 rounded-lg p-6 max-w-md text-center">
          <h2 className="font-cinzel text-gold text-xl mb-3">Nível Máximo</h2>
          <p className="text-txt-dim text-sm mb-4">O personagem já está no nível máximo (30).</p>
          <button onClick={onClose} className="bg-gold text-void px-5 py-2 rounded text-sm hover:bg-gold-light transition-colors">Fechar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
      <div className="bg-deep border border-gold/30 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gold/20 flex items-center justify-between shrink-0">
          <h2 className="font-cinzel text-gold text-xl">Subir para Nível {newNivel}</h2>
          <button onClick={onClose} className="text-txt-dim hover:text-err text-lg">✕</button>
        </div>

        <div className="px-5 py-4 border-b border-sep/50 flex gap-2 flex-wrap shrink-0">
          {phases.map((p, i) => (
            <span key={p} className={`text-xs px-2 py-1 rounded ${i === phaseIdx ? 'bg-gold/20 text-gold' : i < phaseIdx ? 'bg-ok/10 text-ok' : 'bg-panel text-txt-dim'}`}>
              {p === 'choices' ? 'Escolhas' : p === 'skeleton' ? 'Esqueleto' : p === 'modules' ? 'Módulos' : p === 'pericias' ? 'Perícias' : 'Resumo'}
            </span>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {currentPhase === 'choices' && (
            <ChoicesPhase entry={newLevelEntry} choiceReward={choiceReward} choices={working.choices} onChoice={handleChoice} />
          )}
          {currentPhase === 'skeleton' && (
            <SkeletonPhase working={working} deltaSk={deltaSk} onUpdate={updateWorking} />
          )}
          {currentPhase === 'modules' && (
            <ModulesPhase working={working} deltaMods={deltaMods} onUpdate={updateWorking} />
          )}
          {currentPhase === 'pericias' && (
            <PericiasPhase working={working} deltaPer={deltaPer} onUpdate={updateWorking} onUpdateNested={updateWorkingNested} />
          )}
          {currentPhase === 'summary' && (
            <SummaryPhase entry={newLevelEntry} working={working} oldNivel={oldNivel} deltaSk={deltaSk} deltaMods={deltaMods} deltaPer={deltaPer} />
          )}
        </div>

        <div className="px-5 py-4 border-t border-sep/50 flex justify-between shrink-0">
          <button onClick={handlePrev} disabled={phaseIdx === 0}
            className={`px-4 py-2 rounded text-sm transition-colors ${phaseIdx > 0 ? 'bg-panel text-txt-main hover:bg-sep' : 'bg-panel/50 text-txt-dim/50 cursor-not-allowed'}`}>
            ← Anterior
          </button>
          {currentPhase === 'summary' ? (
            <button onClick={handleApply} className="bg-gold text-void font-semibold px-6 py-2 rounded text-sm hover:bg-gold-light transition-colors">
              Aplicar Nível {newNivel}
            </button>
          ) : (
            <button onClick={handleNext} disabled={!canAdvance()}
              className={`px-4 py-2 rounded text-sm transition-colors ${canAdvance() ? 'bg-gold text-void hover:bg-gold-light' : 'bg-gold/30 text-void/50 cursor-not-allowed'}`}>
              Próximo →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ChoicesPhase({ entry, choiceReward, choices, onChoice }) {
  return (
    <div className="space-y-4">
      <h3 className="font-cinzel text-gold text-lg">Recompensas do Nível</h3>
      <p className="text-txt-main text-sm">{normalizeProgressionLabel(entry?.label)}</p>
      {choiceReward && (
        <div className="space-y-2 mt-3">
          <p className="text-warn text-sm font-semibold">Escolha obrigatória:</p>
          {choiceReward.options.map(opt => (
            <label key={opt.key}
              className={`flex items-center gap-3 cursor-pointer px-3 py-2 rounded border transition-colors ${
                choices[choiceReward.key] === opt.key
                  ? 'bg-gold/15 border-gold/40 text-gold'
                  : 'border-sep text-txt-dim hover:text-txt-main hover:border-gold/30'
              }`}>
              <input type="radio" name={choiceReward.key}
                checked={choices[choiceReward.key] === opt.key}
                onChange={() => onChoice(choiceReward.key, opt.key)}
                className="accent-gold" />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function SkeletonPhase({ working, deltaSk, onUpdate }) {
  const sk = working.skeletonPoints || {}
  const attrs = working.atributos || {}
  const adjustedAttrs = getRaceAdjustedAttrs(attrs, sk, working)
  const totalAttr = (a) => adjustedAttrs[a] || 0
  const attrCap = getAttrCap(working.nivel)

  const totalAvailable = calcSkeletonPointsAvailable(working.classe, working.nivel, working.choices)
  const totalSpent = ATTRIBUTES.reduce((sum, a) => sum + (sk[a] || 0), 0)
  const remaining = totalAvailable - totalSpent

  function handleAdd(attr) {
    if (remaining <= 0) return
    if (totalAttr(attr) >= attrCap) return
    const newVal = (sk[attr] || 0) + 1
    onUpdate({ skeletonPoints: { ...sk, [attr]: newVal } })
  }

  function handleRemove(attr) {
    if ((sk[attr] || 0) <= 0) return
    const newVal = (sk[attr] || 0) - 1
    onUpdate({ skeletonPoints: { ...sk, [attr]: newVal } })
  }

  return (
    <div className="space-y-4">
      <h3 className="font-cinzel text-gold text-lg">Pontos de Esqueleto</h3>
      <p className="text-txt-dim text-sm">Você ganhou <span className="text-gold font-mono">+{deltaSk}</span> pontos de esqueleto. Distribua entre seus atributos.</p>
      <div className="bg-void border border-sep rounded p-3 text-center text-sm">
        <span className="text-txt-dim">Restantes: </span>
        <span className={`font-mono ${remaining > 0 ? 'text-ok' : 'text-txt-dim'}`}>{remaining}</span>
        <span className="text-txt-dim"> / {totalAvailable}</span>
        <span className="text-txt-dim ml-3">Cap: <span className="text-gold font-mono">{attrCap}</span></span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {ATTRIBUTES.map(attr => {
          const baseVal = attrs[attr] || 0
          const skVal = sk[attr] || 0
          const total = baseVal + skVal
          const mod = getModifier(total)
          return (
            <div key={attr} className="bg-void border border-sep rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <span>{ATTR_ICONS[attr]}</span>
                <span className="font-cinzel text-gold text-sm">{attr}</span>
              </div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-txt-main">{total}</span>
                <span className={`font-mono text-xs ${mod >= 0 ? 'text-ok' : 'text-err'}`}>({mod >= 0 ? '+' : ''}{mod})</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleRemove(attr)} disabled={skVal <= 0}
                  className={`w-7 h-7 rounded text-sm flex items-center justify-center ${skVal > 0 ? 'border border-gold text-gold hover:bg-gold hover:text-void' : 'border border-sep text-txt-dim/30 cursor-not-allowed'}`}>−</button>
                <span className="font-mono text-sm text-gold flex-1 text-center">{skVal}</span>
                <button onClick={() => handleAdd(attr)} disabled={remaining <= 0 || total >= attrCap}
                  className={`w-7 h-7 rounded text-sm flex items-center justify-center ${remaining > 0 && total < attrCap ? 'border border-gold text-gold hover:bg-gold hover:text-void' : 'border border-sep text-txt-dim/30 cursor-not-allowed'}`}>+</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ModulesPhase({ working, deltaMods, onUpdate }) {
  const modulosAdquiridos = working.modulosAdquiridos || []
  const choices = working.choices || {}
  const nivel = working.nivel
  const sk = working.skeletonPoints || {}
  const attrs = working.atributos || {}
  const adjustedAttrs = getRaceAdjustedAttrs(attrs, sk, working)
  const totalAttr = (a) => adjustedAttrs[a] || 0

  const totalAvailable = calcModulesAvailable(working.classe, nivel, choices, working)
  const totalBought = modulosAdquiridos.reduce((sum, m) => sum + (m.boughtCount || 1), 0)
  const remaining = totalAvailable - totalBought

  const allModules = [...MODULES_PASSIVE, ...MODULES_ACTIVE, ...MODULES_SPECIAL]

  function parseReq(req) {
    if (!req || req === 'Nenhum') return true
    const parts = req.split(', ').map(r => r.trim())
    return parts.every(part => {
      const match = part.match(/^(\w+)\s*(\d+)\+$/)
      if (!match) return true
      const [, attrRaw, valStr] = match
      const val = parseInt(valStr, 10)
      const attr = attrRaw.toUpperCase()
      if (attr === 'N' || attr.startsWith('N')) {
        const nMatch = part.match(/^N(\d+)\+$/)
        if (nMatch) return nivel >= parseInt(nMatch[1], 10)
      }
      if (['FOR', 'DES', 'CON', 'INT', 'APA', 'AM'].includes(attr)) {
        return totalAttr(attr) >= val
      }
      return true
    })
  }

  function getBoughtCount(moduleId) {
    return modulosAdquiridos
      .filter(m => m.id === moduleId)
      .reduce((sum, m) => sum + (m.boughtCount || 1), 0)
  }

  function acquireModule(mod) {
    if (remaining <= 0) return
    if (!parseReq(mod.req)) return
    const current = getBoughtCount(mod.id)
    if (mod.maxBuy && current >= mod.maxBuy) return

    const existing = modulosAdquiridos.find(m => m.id === mod.id)
    let updated
    if (existing) {
      updated = modulosAdquiridos.map(m =>
        m.id === mod.id ? { ...m, boughtCount: (m.boughtCount || 1) + 1 } : m
      )
    } else {
      updated = [...modulosAdquiridos, { id: mod.id, name: mod.name, type: mod.pe ? 'ativo' : 'passivo', boughtCount: 1 }]
    }
    onUpdate({ modulosAdquiridos: updated })
  }

  return (
    <div className="space-y-4">
      <h3 className="font-cinzel text-gold text-lg">Módulos de Evolução</h3>
      <p className="text-txt-dim text-sm">Você ganhou <span className="text-gold font-mono">+{deltaMods}</span> módulo(s). Selecione abaixo.</p>
      <div className="bg-void border border-sep rounded p-3 text-center text-sm">
        <span className="text-txt-dim">Restantes: </span>
        <span className={`font-mono ${remaining > 0 ? 'text-ok' : 'text-txt-dim'}`}>{remaining}</span>
        <span className="text-txt-dim"> / {totalAvailable}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
        {allModules.map(mod => {
          const met = parseReq(mod.req)
          const bought = getBoughtCount(mod.id)
          const atMax = mod.maxBuy ? bought >= mod.maxBuy : bought > 0
          const canBuy = remaining > 0 && met && !atMax

          return (
            <div key={mod.id} className={`bg-void border rounded p-2.5 transition-colors ${!met ? 'border-sep/30 opacity-40' : bought > 0 ? 'border-gold/50' : 'border-sep hover:border-gold/50'}`}>
              <div className="flex items-start justify-between mb-1">
                <span className="text-txt-main text-xs font-semibold">{mod.name}</span>
                {mod.pe != null && <span className="text-[10px] font-mono text-blue-400">{mod.pe} PE</span>}
              </div>
              <p className="text-txt-dim text-[11px] mb-1.5">{mod.desc}</p>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] ${met ? 'text-ok' : 'text-err'}`}>{mod.req}</span>
                <div className="flex items-center gap-1.5">
                  {bought > 0 && <span className="text-[10px] font-mono text-gold">×{bought}</span>}
                  <button disabled={!canBuy} onClick={() => acquireModule(mod)}
                    className={`text-[10px] px-2 py-1 rounded font-semibold ${canBuy ? 'bg-gold text-void hover:bg-gold-light' : 'bg-sep/30 text-txt-dim cursor-not-allowed'}`}>
                    {bought > 0 ? '+1' : 'Obter'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PericiasPhase({ working, deltaPer, onUpdate, onUpdateNested }) {
  const sk = working.skeletonPoints || {}
  const attrs = working.atributos || {}
  const adjustedAttrs = getRaceAdjustedAttrs(attrs, sk, working)
  const pericias = working.pericias || {}
  const nivel = working.nivel
  const choices = working.choices || {}
  const modulosAdquiridos = working.modulosAdquiridos || []
  const totalAttr = (a) => adjustedAttrs[a] || 0

  const available = calcPericiasAvailable(working.classe, nivel, choices, modulosAdquiridos, working)
  const maxGrau = getMaxGrauForLevel(nivel)
  const used = Object.values(pericias).reduce((sum, g) => sum + (g > 0 ? g : 0), 0)
  const remaining = available - used

  function cycleGrau(periciaName, currentGrau) {
    if (currentGrau === 0) {
      if (remaining <= 0) return
      onUpdateNested('pericias', { [periciaName]: 1 })
    } else if (currentGrau < maxGrau) {
      if (remaining <= 0) return
      onUpdateNested('pericias', { [periciaName]: currentGrau + 1 })
    } else {
      onUpdateNested('pericias', { [periciaName]: 0 })
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="font-cinzel text-gold text-lg">Perícias</h3>
      <p className="text-txt-dim text-sm">Você ganhou <span className="text-gold font-mono">+{deltaPer}</span> perícia(s). Distribua abaixo.</p>
      <div className="bg-void border border-sep rounded p-3 text-center text-sm">
        <span className="text-txt-dim">Usados: </span>
        <span className="font-mono text-txt-main">{used}</span>
        <span className="text-txt-dim"> / {available}</span>
        <span className="text-txt-dim ml-3">Restantes: <span className={`font-mono ${remaining > 0 ? 'text-ok' : 'text-txt-dim'}`}>{remaining}</span></span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
        {PERICIAS.map(pericia => {
          const grau = pericias[pericia.name] || 0
          const bestMod = Math.max(...pericia.attrs.map(a => getModifier(totalAttr(a))))
          const bonus = bestMod + grau * 5
          const canUpgrade = remaining > 0 && (grau === 0 || grau < maxGrau)

          return (
            <button key={pericia.name} type="button" onClick={() => cycleGrau(pericia.name, grau)}
              disabled={!canUpgrade && grau >= maxGrau}
              className={`text-left border rounded p-2.5 transition-colors ${
                grau > 0 ? 'bg-void border-gold/50 hover:border-gold' : canUpgrade ? 'bg-void border-sep hover:border-gold/50' : 'bg-void/50 border-sep/30 opacity-50 cursor-not-allowed'
              }`}>
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-xs ${grau > 0 ? 'text-txt-main' : 'text-txt-dim'}`}>{pericia.name}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${grau > 0 ? 'bg-gold/20 text-gold' : 'bg-deep text-txt-dim'}`}>
                  {GRAU_NAMES[grau]}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-txt-dim">{pericia.attrs.join('/')}</span>
                <span className={`font-mono ${grau > 0 ? 'text-gold' : 'text-txt-dim'}`}>{bonus >= 0 ? '+' : ''}{bonus}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SummaryPhase({ entry, working, oldNivel, deltaSk, deltaMods, deltaPer }) {
  return (
    <div className="space-y-4">
      <h3 className="font-cinzel text-gold text-lg">Resumo — Nível {oldNivel} → {working.nivel}</h3>
      {entry && (
        <div className="bg-void border border-sep rounded p-3">
          <p className="text-txt-main text-sm">{normalizeProgressionLabel(entry.label)}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {deltaSk > 0 && <SummaryBadge label="Pontos Esqueleto" value={`+${deltaSk}`} />}
        {deltaMods > 0 && <SummaryBadge label="Módulos" value={`+${deltaMods}`} />}
        {deltaPer > 0 && <SummaryBadge label="Perícias" value={`+${deltaPer}`} />}
      </div>
      <div className="bg-gold/10 border border-gold/30 rounded p-3">
        <p className="text-gold text-sm">Todos os bônus fixos (vida, energia, PE, triagens) são calculados automaticamente.</p>
      </div>
      {(working.modulosAdquiridos || []).length > 0 && (
        <div>
          <h4 className="text-txt-dim text-xs mb-1">Módulos atuais:</h4>
          <div className="flex flex-wrap gap-1">
            {working.modulosAdquiridos.map((m, i) => (
              <span key={i} className="text-xs bg-void border border-sep rounded px-2 py-0.5 text-txt-main">{m.name}{(m.boughtCount || 1) > 1 ? ` ×${m.boughtCount}` : ''}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryBadge({ label, value }) {
  return (
    <div className="bg-void border border-sep rounded px-3 py-2">
      <div className="text-txt-dim text-xs">{label}</div>
      <div className="font-mono text-gold text-lg">{value}</div>
    </div>
  )
}
