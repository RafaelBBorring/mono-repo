import { useState } from 'react'
import { RACES, RACE_CATEGORIES } from '../data/races'
import {
  getSubracesForRace,
  getSelectedSubrace,
  calculateRaceBonus,
  ATTR_KEYS,
} from '../utils/raceCalculator'
import { useAuth } from '../contexts/AuthContext'

function bonusLine(bonus = {}) {
  const attrs = Object.entries(bonus.attrs || {})
    .filter(([, v]) => v !== 0)
    .map(([a, v]) => `${v >= 0 ? '+' : ''}${v}${a}`)
  if (bonus.hp) attrs.push(`${bonus.hp >= 0 ? '+' : ''}${bonus.hp}HP`)
  if (bonus.pe) attrs.push(`+${bonus.pe}PE`)
  if (bonus.pericias) attrs.push(`+${bonus.pericias} Pericias`)
  if (bonus.modules) attrs.push(`+${bonus.modules} Mod.`)
  return attrs.join(' ') || 'Sem bonus'
}

function diffBonus(current, next) {
  const diffs = []
  for (const k of ATTR_KEYS) {
    const c = (current.attrs?.[k] || 0)
    const n = (next.attrs?.[k] || 0)
    if (n !== c) diffs.push(`${n >= 0 ? '+' : ''}${n - c}${k}`)
  }
  if ((next.hp || 0) !== (current.hp || 0)) diffs.push(`${(next.hp || 0) - (current.hp || 0) >= 0 ? '+' : ''}${(next.hp || 0) - (current.hp || 0)}HP`)
  if ((next.pe || 0) !== (current.pe || 0)) diffs.push(`${(next.pe || 0) - (current.pe || 0) >= 0 ? '+' : ''}${(next.pe || 0) - (current.pe || 0)}PE`)
  if ((next.pericias || 0) !== (current.pericias || 0)) diffs.push(`+${(next.pericias || 0) - (current.pericias || 0)} Pericias`)
  if ((next.modules || 0) !== (current.modules || 0)) diffs.push(`+${(next.modules || 0) - (current.modules || 0)} Mod.`)
  return diffs.join(', ') || 'Sem mudanca numerica'
}

export default function RaceEvolveModal({ char, onApply, onClose, update }) {
  const { isAdmin } = useAuth()
  const race = RACES[char.raca]
  if (!race) return null

  const catMeta = RACE_CATEGORIES.find(c => c.id === race.category) || RACE_CATEGORIES[0]
  const subraces = getSubracesForRace(char.raca)
  const currentSub = getSelectedSubrace(char)
  const currentBonus = calculateRaceBonus(char)
  const nivel = char.nivel || 1

  const [selectedId, setSelectedId] = useState(null)
  const selectedSub = selectedId ? subraces.find(s => s.id === selectedId) : null

  const charPreview = { ...char, subraca: selectedId }
  const previewBonus = selectedId ? calculateRaceBonus(charPreview) : null

  if (subraces.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
        <div className="bg-deep border border-sep rounded-lg p-6 max-w-md text-center">
          <h2 className="font-cinzel text-gold text-xl mb-3">Evoluir Raca</h2>
          <p className="text-txt-dim text-sm mb-4">Esta raca nao possui sub-racas disponiveis.</p>
          <button onClick={onClose} className="bg-gold text-void px-5 py-2 rounded text-sm hover:bg-gold-light transition-colors">Fechar</button>
        </div>
      </div>
    )
  }

  function handleApply() {
    if (!selectedId) return
    const patch = { subraca: selectedId }
    if (char.raca === 'SEMIDEUS') patch.racaDeus = selectedId
    onApply(patch)
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
      <div className="bg-deep border border-gold/30 rounded-lg w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gold/20 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-cinzel text-gold text-xl">Evoluir Raca</h2>
            <p className="text-txt-dim text-sm mt-1">
              {race.icon} {race.name} — Nivel {nivel}
              {currentSub && <span className="text-purple-300 ml-2">({currentSub.name})</span>}
            </p>
          </div>
          <button onClick={onClose} className="text-txt-dim hover:text-err text-lg">X</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="bg-void/60 rounded-lg border border-gold/20 px-4 py-3">
            <div className="text-gold text-sm font-bold mb-1">Bonus Atual</div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {ATTR_KEYS.map(a => {
                const v = currentBonus.attrs[a] || 0
                if (v === 0) return null
                return <span key={a} className="text-sky-400 font-mono">{v >= 0 ? '+' : ''}{v}{a}</span>
              })}
              <span className="text-emerald-400 font-mono">{currentBonus.hp >= 0 ? '+' : ''}{currentBonus.hp}HP</span>
              {currentBonus.pe > 0 && <span className="text-emerald-400 font-mono">+{currentBonus.pe}PE</span>}
              {currentBonus.pericias > 0 && <span className="text-gold font-mono">+{currentBonus.pericias} Pericias</span>}
              {currentBonus.modules > 0 && <span className="text-gold font-mono">+{currentBonus.modules} Mod.</span>}
            </div>
          </div>

          <div className="text-sm font-semibold text-txt-main">Selecione a nova sub-raca / caminho:</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {subraces.map(sub => {
              const isCurrent = currentSub?.id === sub.id
              const isSel = selectedId === sub.id
              const meetsLevel = !sub.minLevel || nivel >= sub.minLevel
              const locked = !meetsLevel && !isCurrent

              return (
                <button key={sub.id} type="button" disabled={locked}
                  onClick={() => setSelectedId(isSel ? null : sub.id)}
                  className={`text-left rounded-lg border px-4 py-3 transition-colors ${
                    isCurrent ? 'border-purple-400/40 bg-purple-400/5' :
                    isSel ? 'border-gold/50 bg-gold/10' :
                    locked ? 'border-sep/20 opacity-40 cursor-not-allowed' :
                    'border-sep/40 hover:border-gold/30'
                  }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-semibold ${isSel ? 'text-gold' : isCurrent ? 'text-purple-300' : 'text-txt-main'}`}>
                      {sub.name}
                    </span>
                    {isCurrent && <span className="text-xs text-purple-400">(atual)</span>}
                  </div>
                  <div className="text-xs text-sky-400 font-mono">{bonusLine(sub.bonus)}</div>
                  {(sub.minLevel || sub.requirement) && (
                    <div className={`text-xs mt-1 ${meetsLevel ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                      Req: {sub.minLevel ? `N${sub.minLevel}+` : sub.requirement}
                    </div>
                  )}
                  {sub.note && <p className="text-xs text-txt-dim mt-1">{sub.note}</p>}
                </button>
              )
            })}
          </div>

          {selectedSub && previewBonus && (
            <div className="bg-gold/5 rounded-lg border border-gold/30 px-4 py-3 space-y-2">
              <div className="text-gold text-sm font-bold">Preview da Mudanca</div>
              <div className="text-sm text-txt-dim">
                Diferenca de bonus: <span className="text-emerald-400 font-mono">{diffBonus(currentBonus, previewBonus)}</span>
              </div>
              {selectedSub.marcos && (
                <div className="space-y-1.5 mt-2">
                  <div className="text-purple-300 text-sm font-semibold">Marcos da Sub-Raca:</div>
                  {selectedSub.marcos.map(([marco, condicao, ganho], idx) => {
                    const checked = (char.marcosConquistados || []).includes(`${selectedSub.id}_${idx}`)
                    return (
                      <div key={marco} className={`text-sm rounded px-3 py-1.5 border ${checked ? 'bg-emerald-400/5 border-emerald-400/30' : 'bg-deep/70 border-sep/30'}`}>
                        <div className="flex items-center gap-2">
                          {isAdmin && update ? (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={checked}
                                onChange={() => {
                                  const key = `${selectedSub.id}_${idx}`
                                  const current = char.marcosConquistados || []
                                  const next = checked ? current.filter(k => k !== key) : [...current, key]
                                  update({ marcosConquistados: next })
                                }}
                                className="accent-emerald-400" />
                              <span className="text-txt-main font-semibold">{marco}</span>
                            </label>
                          ) : (
                            <span className="text-txt-main font-semibold">{marco}</span>
                          )}
                          {checked && <span className="text-emerald-400 text-sm">Conquistado</span>}
                        </div>
                        <div className="text-txt-dim text-sm">{condicao}: <span className="text-emerald-400">{ganho}</span></div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {isAdmin && currentSub?.marcos && (
            <div className="border border-gold/30 rounded-lg px-4 py-3 space-y-2 bg-gold/5">
              <div className="text-gold text-sm font-bold">Admin — Marcos Atuais ({currentSub.name})</div>
              {currentSub.marcos.map(([marco, condicao, ganho], idx) => {
                const key = `${currentSub.id}_${idx}`
                const checked = (char.marcosConquistados || []).includes(key)
                return (
                  <div key={key} className={`flex items-start gap-2 text-sm rounded px-3 py-1.5 border ${checked ? 'bg-emerald-400/5 border-emerald-400/30' : 'bg-deep/70 border-sep/30'}`}>
                    <input type="checkbox" checked={checked}
                      onChange={() => {
                        const current = char.marcosConquistados || []
                        const next = checked ? current.filter(k => k !== key) : [...current, key]
                        update({ marcosConquistados: next })
                      }}
                      className="accent-emerald-400 mt-0.5" />
                    <div>
                      <span className="text-txt-main font-semibold">{marco}</span>
                      {checked && <span className="text-emerald-400 ml-2">Conquistado</span>}
                      <div className="text-txt-dim text-sm">{condicao}: <span className="text-emerald-400">{ganho}</span></div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-sep/50 flex justify-between shrink-0">
          <button onClick={onClose}
            className="px-4 py-2 rounded text-sm bg-panel text-txt-main hover:bg-sep transition-colors">
            Cancelar
          </button>
          <button onClick={handleApply} disabled={!selectedId || selectedId === currentSub?.id}
            className={`px-5 py-2 rounded text-sm font-semibold transition-colors ${
              selectedId && selectedId !== currentSub?.id
                ? 'bg-gold text-void hover:bg-gold-light'
                : 'bg-gold/30 text-void/50 cursor-not-allowed'
            }`}>
            Aplicar Evolucao
          </button>
        </div>
      </div>
    </div>
  )
}
