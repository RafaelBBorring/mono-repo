import { useState } from 'react'
import { ALL_MODULES, MODULES_PASSIVE, MODULES_ACTIVE, MODULE_PRESETS } from '../../data/modules'
import { calcModulesAvailable } from '../../utils/calculator'
import { getRaceAdjustedAttrs } from '../../utils/raceCalculator'

const ALL_MODULE_MAP = Object.fromEntries(
  [...MODULES_PASSIVE, ...MODULES_ACTIVE].map(m => [m.id, m])
)

export default function Step7Modules({ char, update, updateNested }) {
  const classe = char.classe
  const nivel = char.nivel || 1
  const attrs = char.atributos || {}
  const sk = char.skeletonPoints || {}
  const choices = char.choices || {}
  const modulosAdquiridos = char.modulosAdquiridos || []
  const [activeTab, setActiveTab] = useState('passivos')

  const adjustedAttrs = getRaceAdjustedAttrs(attrs, sk, char)
  const totalAttr = (a) => adjustedAttrs[a] || 0

  const totalAvailable = classe ? calcModulesAvailable(classe, nivel, choices, char) : 0
  const totalBought = modulosAdquiridos.reduce((sum, m) => sum + (m.boughtCount || 1), 0)
  const remaining = totalAvailable - totalBought

  function getModuleList() {
    switch (activeTab) {
      case 'passivos': return MODULES_PASSIVE
      case 'ativos': return MODULES_ACTIVE
      default: return MODULES_PASSIVE
    }
  }

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

  function setTab(tab) {
    setActiveTab(tab)
  }

  function getBoughtCount(moduleId) {
    return modulosAdquiridos
      .filter(m => m.id === moduleId)
      .reduce((sum, m) => sum + (m.boughtCount || 1), 0)
  }

  function acquireModule(mod, type) {
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
      updated = [...modulosAdquiridos, { id: mod.id, name: mod.name, type, boughtCount: 1 }]
    }
    update({ modulosAdquiridos: updated })
  }

  function removeModule(moduleId) {
    update({ modulosAdquiridos: modulosAdquiridos.filter(m => m.id !== moduleId) })
  }

  function getPresetEligible(preset) {
    return preset.modules.filter(({ id, type }) => {
      const mod = ALL_MODULE_MAP[id]
      if (!mod) return false
      if (!parseReq(mod.req)) return false
      const current = getBoughtCount(id)
      if (mod.maxBuy && current >= mod.maxBuy) return false
      if (!mod.maxBuy && current > 0) return false
      return { id, type, mod }
    }).map(({ id, type }) => ({ id, type, mod: ALL_MODULE_MAP[id] }))
  }

  function applyPreset(preset) {
    const eligible = getPresetEligible(preset)
    if (!eligible.length) return
    let currentMods = [...modulosAdquiridos]
    let slotsLeft = remaining
    for (const { id, type, mod } of eligible) {
      if (slotsLeft <= 0) break
      const existing = currentMods.find(m => m.id === id)
      if (existing) {
        currentMods = currentMods.map(m =>
          m.id === id ? { ...m, boughtCount: (m.boughtCount || 1) + 1 } : m
        )
      } else {
        currentMods = [...currentMods, { id, name: mod.name, type, boughtCount: 1 }]
      }
      slotsLeft--
    }
    update({ modulosAdquiridos: currentMods })
  }

  const tabs = [
    { key: 'passivos', label: 'Passivas' },
    { key: 'ativos', label: 'Ativas' },
  ]

  const typeMap = { passivos: 'passivo', ativos: 'ativo' }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="section-header text-primary mb-0 flex-1">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>extension</span>
          Soft-Skills
        </div>
        <div className="text-sm text-on-surface-variant">
          Soft-Skills: <span className={`font-mono ${remaining > 0 ? 'text-ok' : remaining === 0 ? 'text-on-surface-variant' : 'text-err'}`}>{remaining}</span>/{totalAvailable} disponíveis
        </div>
      </div>

      <div>
        <div className="text-txt-dim text-sm font-semibold mb-2">Presets (seleção rápida)</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {MODULE_PRESETS.map(preset => {
            const eligible = getPresetEligible(preset)
            const canApply = eligible.length > 0 && remaining > 0
            return (
              <button
                key={preset.id}
                type="button"
                disabled={!canApply}
                onClick={() => applyPreset(preset)}
                className={`text-left bg-deep border rounded-lg p-3 transition-colors ${
                  canApply
                    ? 'border-sep hover:border-gold/50 cursor-pointer'
                    : 'border-sep/30 opacity-40 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="material-symbols-outlined text-gold" style={{ fontSize: '18px' }}>{preset.icon}</span>
                  <span className="font-body text-sm font-semibold text-txt-main">{preset.name}</span>
                </div>
                <p className="text-txt-dim text-xs leading-snug mb-1.5">{preset.desc}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {preset.modules.map(({ id }) => (
                    <span key={id} className="text-[10px] text-txt-dim/80 bg-void/50 rounded px-1.5 py-0.5">
                      {ALL_MODULE_MAP[id]?.name || id}
                    </span>
                  ))}
                </div>
                {canApply && (
                  <div className="text-[10px] text-gold/80 mt-1.5">
                    +{Math.min(eligible.length, remaining)} módulo(s) · clique para aplicar
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex gap-1 border-b border-sep">
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setTab(tab.key)}
            className={`px-4 py-2 text-sm font-body transition-colors ${
              activeTab === tab.key
                ? 'text-gold border-b-2 border-gold'
                : 'text-txt-dim hover:text-txt-main'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {getModuleList().map(mod => {
          const met = parseReq(mod.req)
          const bought = getBoughtCount(mod.id)
          const atMax = mod.maxBuy ? bought >= mod.maxBuy : bought > 0
          const canBuy = remaining > 0 && met && !atMax

          return (
            <div
              key={mod.id}
              className={`bg-deep border rounded p-3 transition-colors ${
                !met
                  ? 'border-sep/30 opacity-40'
                  : bought > 0
                    ? 'border-gold/50'
                    : 'border-sep hover:border-gold/50'
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <h4 className={`font-body text-sm font-semibold ${met ? 'text-txt-main' : 'text-txt-dim'}`}>
                  {mod.name}
                </h4>
                {mod.pe != null && (
                  <span className="text-xs font-mono text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">
                    {mod.pe} PE
                  </span>
                )}
              </div>
              <p className="text-txt-dim text-xs mb-2">{mod.desc}</p>
              <div className="flex items-center justify-between">
                <span className={`text-xs ${met ? 'text-ok' : 'text-err'}`}>
                  {mod.req}
                </span>
                <div className="flex items-center gap-2">
                  {bought > 0 && (
                    <span className="text-xs font-mono text-gold">
                      ×{bought}{mod.maxBuy ? `/${mod.maxBuy}` : ''}
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={!canBuy}
                    onClick={() => acquireModule(mod, typeMap[activeTab])}
                    className={`text-xs px-3 py-1 rounded font-semibold transition-colors ${
                      canBuy
                        ? 'bg-gold text-void hover:bg-gold-light'
                        : 'bg-sep/30 text-txt-dim cursor-not-allowed'
                    }`}
                  >
                    {bought > 0 && (!mod.maxBuy || bought < mod.maxBuy) ? '+1' : 'Obter'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {modulosAdquiridos.length > 0 && (
        <div className="codex-card p-5">
          <h3 className="font-cinzel text-primary text-lg mb-3 tracking-wider">Soft-Skills Adquiridas</h3>
          <div className="flex flex-wrap gap-2">
            {modulosAdquiridos.map((mod, idx) => (
              <div
                key={mod.id}
                className="flex items-center gap-2 bg-void border border-sep rounded px-3 py-1.5 text-sm"
              >
                <span className="text-txt-main">{mod.name}</span>
                {(mod.boughtCount || 1) > 1 && (
                  <span className="text-gold font-mono text-xs">×{mod.boughtCount}</span>
                )}
                <span className="text-txt-dim text-xs capitalize">({mod.type})</span>
                <button
                  type="button"
                  onClick={() => removeModule(mod.id)}
                  className="text-err hover:text-err/80 text-xs ml-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
