import { useState } from 'react'
import { ATTRIBUTES, ATTR_ICONS, ATTR_LABELS, getModifier, getArraysForLevel } from '../../data/attributes'

export default function Step2Skeleton({ char, update }) {
  const [selectedValue, setSelectedValue] = useState(null)

  const tierArrays = getArraysForLevel(char.nivel)
  const arrayValues = tierArrays?.[char.arrayTipo] || []
  const assigned = ATTRIBUTES.filter((a) => char.atributos[a] > 0)
  const allAssigned = assigned.length === 6

  const usedValues = ATTRIBUTES.map((a) => char.atributos[a]).filter((v) => v > 0)
  const availableValues = arrayValues.filter((v) => {
    const usedCount = usedValues.filter((uv) => uv === v).length
    const totalInArray = arrayValues.filter((av) => av === v).length
    return usedCount < totalInArray
  })

  function handleAssign(attr) {
    if (selectedValue === null) return
    if (char.atributos[attr] > 0) return

    const newAtributos = { ...char.atributos, [attr]: selectedValue }
    update({ atributos: newAtributos })
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
    const newAtributos = { ...char.atributos, [attr]: 0 }
    update({ atributos: newAtributos })
    setSelectedValue(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-cinzel text-gold text-xl">Etapa 2 — Esqueleto (Atributos)</h2>
        <button
          onClick={handleReset}
          className="border border-sep text-txt-dim rounded px-3 py-1.5 hover:border-err hover:text-err text-xs transition-colors"
        >
          Redistribuir Tudo
        </button>
      </div>

      <div className="bg-deep border border-sep rounded-lg p-5 space-y-4 hover:border-gold transition-colors">
        <p className="text-txt-dim text-sm">
          {selectedValue !== null
            ? `Valor ${selectedValue} selecionado — clique em um atributo vazio para atribuir`
            : 'Clique em um valor abaixo para selecioná-lo. Clique no × do atributo para remover.'}
        </p>
        <div className="flex flex-wrap gap-3">
          {arrayValues.map((val, i) => {
            const avail = isValueAvailable(val)
            const isSelected = selectedValue === val && avail
            return (
              <button
                key={`${val}-${i}`}
                disabled={!avail}
                onClick={() => avail && setSelectedValue(val)}
                className={`px-4 py-2 rounded-full font-mono text-lg font-bold transition-all ${
                  isSelected
                    ? 'bg-gold text-void ring-2 ring-gold-light'
                    : avail
                      ? 'bg-void border border-gold text-gold hover:bg-gold hover:text-void cursor-pointer'
                      : 'bg-void border border-sep text-txt-dim opacity-40 cursor-not-allowed'
                }`}
              >
                {val}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {ATTRIBUTES.map((attr) => {
          const val = char.atributos[attr]
          const mod = val > 0 ? getModifier(val) : null
          const assigned_val = val > 0
          const canAssign = selectedValue !== null && !assigned_val

          return (
            <div
              key={attr}
              className={`bg-deep border rounded-lg p-4 text-left transition-all relative ${
                assigned_val
                  ? 'border-gold bg-panel'
                  : canAssign
                    ? 'border-sep hover:border-gold cursor-pointer'
                    : 'border-sep cursor-default'
              }`}
            >
              {assigned_val && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemove(attr) }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full border border-sep text-txt-dim text-xs flex items-center justify-center hover:border-err hover:text-err transition-colors"
                  title={`Remover ${ATTR_LABELS[attr]}`}
                >
                  ×
                </button>
              )}
              <div
                onClick={() => handleAssign(attr)}
                className={canAssign ? 'cursor-pointer' : ''}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{ATTR_ICONS[attr]}</span>
                  <div>
                    <p className="font-cinzel text-gold text-sm">{attr}</p>
                    <p className="text-txt-dim text-xs">{ATTR_LABELS[attr]}</p>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`font-mono text-2xl ${assigned_val ? 'text-txt-main' : 'text-txt-dim'}`}>
                    {val > 0 ? val : '—'}
                  </span>
                  {mod !== null && (
                    <span className={`font-mono text-sm ${mod >= 0 ? 'text-ok' : 'text-err'}`}>
                      ({mod >= 0 ? '+' : ''}{mod})
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {!allAssigned && (
        <p className="text-warn text-sm text-center">
          Atribua todos os 6 valores para continuar ({assigned.length}/6)
        </p>
      )}
      {allAssigned && (
        <p className="text-ok text-sm text-center">Todos os atributos foram atribuídos!</p>
      )}
    </div>
  )
}
