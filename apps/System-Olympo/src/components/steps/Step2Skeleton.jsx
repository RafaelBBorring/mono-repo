import { useState } from 'react'
import { ATTRIBUTES, ATTR_ICONS, ATTR_LABELS, getModifier, getArraysForLevel } from '../../data/attributes'
import { calculateRaceBonus } from '../../utils/raceCalculator'

export default function Step2Skeleton({ char, update }) {
  const [selectedValue, setSelectedValue] = useState(null)

  const tierArrays = getArraysForLevel(char.nivel)
  const arrayValues = tierArrays?.[char.arrayTipo] || []
  const assigned = ATTRIBUTES.filter((a) => char.atributos[a] > 0)
  const allAssigned = assigned.length === 6
  const usedValues = ATTRIBUTES.map((a) => char.atributos[a]).filter((v) => v > 0)
  const raceBonus = calculateRaceBonus(char)
  const raceAttrs = raceBonus.attrs || {}

  function handleAssign(attr) {
    if (selectedValue === null) return
    if (char.atributos[attr] > 0) return
    update({ atributos: { ...char.atributos, [attr]: selectedValue } })
    setSelectedValue(null)
  }

  function handleReset() {
    const resetAtributos = {}
    ATTRIBUTES.forEach((a) => { resetAtributos[a] = 0 })
    update({ atributos: resetAtributos })
    setSelectedValue(null)
  }

  function isValueAvailable(val) {
    const usedCount = usedValues.filter((uv) => uv === val).length
    const totalInArray = arrayValues.filter((av) => av === val).length
    return usedCount < totalInArray
  }

  function handleRemove(attr) {
    if (char.atributos[attr] <= 0) return
    update({ atributos: { ...char.atributos, [attr]: 0 } })
    setSelectedValue(null)
  }

  return (
    <div className="skeleton-stage space-y-6">
      <div className="flex items-center justify-between">
        <div className="section-header text-primary mb-0 flex-1">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>tune</span>
          Esqueleto (Atributos)
        </div>
        <button onClick={handleReset}
          className="sigil-button text-primary rounded px-4 py-2 text-sm font-cinzel uppercase tracking-wider hover:text-white">
          Redistribuir Tudo
        </button>
      </div>

      <div className="skeleton-race-bonus-strip">
        <span>Bônus raciais ativos</span>
        {ATTRIBUTES.map(attr => {
          const bonus = raceAttrs[attr] || 0
          return (
            <strong key={attr} className={bonus > 0 ? 'is-positive' : bonus < 0 ? 'is-negative' : ''}>
              {attr} {bonus >= 0 ? '+' : ''}{bonus}
            </strong>
          )
        })}
      </div>

      <div className="creation-panel space-y-4">
        <p className="text-txt-dim text-sm">
          {selectedValue !== null
            ? `Valor ${selectedValue} selecionado — clique em um atributo vazio para atribuir.`
            : 'Clique em um valor abaixo para selecioná-lo. Clique no × do atributo para remover.'}
        </p>
        <div className="flex flex-wrap gap-3">
          {arrayValues.map((val, i) => {
            const avail = isValueAvailable(val)
            const isSelected = selectedValue === val && avail
            return (
              <button key={`${val}-${i}`} disabled={!avail} onClick={() => avail && setSelectedValue(val)}
                className={`skeleton-array-orb ${isSelected ? 'is-selected' : avail ? '' : 'is-disabled'}`}>
                {val}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {ATTRIBUTES.map((attr) => {
          const val = char.atributos[attr]
          const racial = raceAttrs[attr] || 0
          const effective = (val || 0) + racial
          const mod = val > 0 ? getModifier(val) : null
          const assignedVal = val > 0
          const canAssign = selectedValue !== null && !assignedVal

          return (
            <div key={attr}
              className={`skeleton-attr-card ${assignedVal ? 'is-filled' : ''} ${canAssign ? 'can-assign' : ''}`}>
              {assignedVal && (
                <button onClick={(e) => { e.stopPropagation(); handleRemove(attr) }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full border border-sep text-txt-dim text-xs flex items-center justify-center hover:border-err hover:text-err transition-colors"
                  title={`Remover ${ATTR_LABELS[attr]}`}>
                  ×
                </button>
              )}
              <div onClick={() => handleAssign(attr)} className={canAssign ? 'cursor-pointer' : ''}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{ATTR_ICONS[attr]}</span>
                  <div>
                    <p className="font-cinzel text-gold text-sm">{attr}</p>
                    <p className="text-txt-dim text-xs">{ATTR_LABELS[attr]}</p>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className={`font-mono text-2xl ${assignedVal ? 'text-txt-main' : 'text-txt-dim'}`}>
                    {val > 0 ? val : '—'}
                  </span>
                  {racial !== 0 && (
                    <span className={`font-mono text-xs ${racial > 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                      raça {racial > 0 ? '+' : ''}{racial}
                    </span>
                  )}
                  {mod !== null && (
                    <span className={`font-mono text-sm ${mod >= 0 ? 'text-ok' : 'text-err'}`}>
                      ({mod >= 0 ? '+' : ''}{mod})
                    </span>
                  )}
                </div>
                {assignedVal && racial !== 0 && (
                  <p className="text-txt-dim text-xs mt-2">
                    Total com raça: <span className="text-gold font-mono">{effective}</span>
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {!allAssigned && <p className="text-warn text-sm text-center">Atribua todos os 6 valores para continuar ({assigned.length}/6)</p>}
      {allAssigned && <p className="text-ok text-sm text-center">Todos os atributos foram atribuídos!</p>}
    </div>
  )
}
