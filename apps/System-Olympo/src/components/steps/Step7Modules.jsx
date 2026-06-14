import { useState, useMemo } from 'react'
import { ALL_MODULES, MODULES_PASSIVE, MODULES_ACTIVE, MODULE_PRESETS } from '../../data/modules'
import { calcModulesAvailable } from '../../utils/calculator'
import { getRaceAdjustedAttrs } from '../../utils/raceCalculator'

const ALL_MODULE_MAP = Object.fromEntries(
  [...MODULES_PASSIVE, ...MODULES_ACTIVE].map(m => [m.id, m])
)

const TAB_CONFIG = {
  passivos: {
    label: 'Passivas',
    icon: 'shield',
    accent: '#4ade80',
    hint: 'Bônus permanentes, upgrades de atributos e desbloqueios de disciplinas.',
  },
  ativos: {
    label: 'Ativas',
    icon: 'bolt',
    accent: '#60a5fa',
    hint: 'Habilidades ativáveis em combate — cada uso consome Pontos de Energia (PE).',
  },
}

export default function Step7Modules({ char, update, updateNested }) {
  const classe = char.classe
  const nivel = char.nivel || 1
  const attrs = char.atributos || {}
  const sk = char.skeletonPoints || {}
  const choices = char.choices || {}
  const modulosAdquiridos = char.modulosAdquiridos || []
  const [activeTab, setActiveTab] = useState('passivos')
  const [search, setSearch] = useState('')

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

  const filteredModules = useMemo(() => {
    const list = getModuleList()
    if (!search.trim()) return list
    const q = search.trim().toLowerCase()
    return list.filter(m =>
      m.name.toLowerCase().includes(q) ||
      (m.desc && m.desc.toLowerCase().includes(q))
    )
  }, [activeTab, search])

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
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="section-header text-primary mb-0 flex-1">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>extension</span>
          Soft-Skills
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-void/50 border border-sep/50">
          <span className="material-symbols-outlined text-txt-dim" style={{ fontSize: '18px' }}>inventory_2</span>
          <span className="text-sm text-txt-dim">Slots:</span>
          <span className={`font-mono font-semibold text-sm ${remaining > 0 ? 'text-ok' : remaining === 0 ? 'text-txt-main' : 'text-err'}`}>
            {remaining}
          </span>
          <span className="text-txt-dim text-xs">/ {totalAvailable}</span>
        </div>
      </div>

      {/* Presets */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-gold" style={{ fontSize: '18px' }}>auto_awesome</span>
          <h3 className="font-cinzel text-txt-main text-sm tracking-wider uppercase">Presets · Seleção Rápida</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {MODULE_PRESETS.map(preset => {
            const eligible = getPresetEligible(preset)
            const canApply = eligible.length > 0 && remaining > 0
            return (
              <button
                key={preset.id}
                type="button"
                disabled={!canApply}
                onClick={() => applyPreset(preset)}
                className="ss-preset-card p-3"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="material-symbols-outlined text-gold" style={{ fontSize: '20px' }}>{preset.icon}</span>
                  <span className="font-body text-sm font-semibold text-txt-main">{preset.name}</span>
                </div>
                <p className="text-txt-dim text-xs leading-relaxed mb-2 line-clamp-2">{preset.desc}</p>
                <div className="flex items-center gap-1 flex-wrap mb-1">
                  {preset.modules.map(({ id }) => (
                    <span key={id} className="text-[10px] text-txt-dim/80 bg-void/60 border border-sep/40 rounded px-1.5 py-0.5">
                      {ALL_MODULE_MAP[id]?.name || id}
                    </span>
                  ))}
                </div>
                {canApply ? (
                  <div className="flex items-center gap-1 text-[11px] text-gold mt-1.5 font-semibold">
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add_circle</span>
                    +{Math.min(eligible.length, remaining)} módulo(s)
                  </div>
                ) : (
                  <div className="text-[11px] text-txt-dim/50 mt-1.5">
                    {remaining <= 0 ? 'Sem slots' : 'Indisponível'}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* Tabs + Search */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-sep/60">
        <div className="relative flex">
          {tabs.map(tab => {
            const cfg = TAB_CONFIG[tab.key]
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setTab(tab.key)}
                className={`ss-tab-btn ${isActive ? 'is-active' : ''}`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{cfg.icon}</span>
                {tab.label}
                {isActive && (
                  <span className="ss-tab-indicator" style={{ left: 12, right: 12 }} />
                )}
              </button>
            )
          })}
        </div>
        <div className="ss-search-wrap">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-txt-dim pointer-events-none" style={{ fontSize: '18px' }}>
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar Soft-Skill..."
            className="ss-search-input"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-txt-dim hover:text-txt-main transition-colors"
              aria-label="Limpar busca"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab hint */}
      <p className="-mt-4 text-xs text-txt-dim italic">
        {TAB_CONFIG[activeTab].hint}
      </p>

      {/* Module grid */}
      {filteredModules.length === 0 ? (
        <div className="text-center py-12 text-txt-dim">
          <span className="material-symbols-outlined block mx-auto mb-2 opacity-50" style={{ fontSize: '32px' }}>search_off</span>
          <p className="text-sm">Nenhuma Soft-Skill encontrada para &ldquo;{search}&rdquo;.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredModules.map((mod, idx) => {
            const met = parseReq(mod.req)
            const bought = getBoughtCount(mod.id)
            const atMax = mod.maxBuy ? bought >= mod.maxBuy : bought > 0
            const canBuy = remaining > 0 && met && !atMax
            const isPassive = activeTab === 'passivos'
            const accentColor = isPassive ? '#4ade80' : '#60a5fa'

            const stateClass = !met
              ? 'is-locked'
              : bought > 0
                ? 'is-acquired'
                : ''

            return (
              <article
                key={mod.id}
                className={`ss-module-card ss-card-enter ${stateClass}`}
                style={{ animationDelay: `${Math.min(idx * 25, 300)}ms` }}
              >
                <div className="ss-accent-bar" style={{ color: accentColor }} />

                <div className="p-3.5 relative z-[2]">
                  <div className="flex items-start gap-2.5 mb-2">
                    <span className={`ss-module-icon ${isPassive ? 'is-passive' : 'is-active'}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        {isPassive ? 'shield' : 'bolt'}
                      </span>
                    </span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-body text-sm font-semibold text-txt-main leading-tight flex items-center gap-1.5">
                        <span className="truncate">{mod.name}</span>
                        {bought > 0 && (
                          <span className="material-symbols-outlined text-gold flex-shrink-0" style={{ fontSize: '14px' }}>
                            check_circle
                          </span>
                        )}
                      </h4>
                      {mod.maxBuy ? (
                        <span className="text-[10px] text-txt-dim/70 uppercase tracking-wider">
                          Comprável · {bought}/{mod.maxBuy}
                        </span>
                      ) : (
                        <span className="text-[10px] text-txt-dim/70 uppercase tracking-wider">
                          {isPassive ? 'Permanente' : 'Ativável'}
                        </span>
                      )}
                    </div>
                    {mod.pe != null && (
                      <span className="ss-pe-badge">
                        <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>flash_on</span>
                        {mod.pe}
                      </span>
                    )}
                  </div>

                  <p className="text-txt-dim text-sm leading-relaxed mb-3 min-h-[2.5rem]">
                    {mod.desc}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-sep/40">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: '14px',
                          color: met ? '#4ade80' : '#ffb4ab',
                        }}
                      >
                        {met ? 'check' : 'lock'}
                      </span>
                      <span className={`font-mono ${met ? 'text-ok/90' : 'text-err/90'}`}>
                        {mod.req}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={!canBuy}
                      onClick={() => acquireModule(mod, typeMap[activeTab])}
                      className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md font-semibold transition-all ${
                        canBuy
                          ? 'bg-gold text-void hover:bg-gold-light hover:shadow-[0_0_12px_rgba(247,189,72,0.4)] active:scale-95'
                          : 'bg-sep/30 text-txt-dim/60 cursor-not-allowed'
                      }`}
                    >
                      {bought > 0 && (!mod.maxBuy || bought < mod.maxBuy) ? (
                        <>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
                          Adicionar
                        </>
                      ) : bought > 0 ? (
                        'Máximo'
                      ) : (
                        <>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
                          Obter
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Acquired */}
      {modulosAdquiridos.length > 0 && (
        <section className="codex-card p-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-gold" style={{ fontSize: '20px' }}>workspace_premium</span>
              <h3 className="font-cinzel text-primary text-lg tracking-wider">Soft-Skills Adquiridas</h3>
            </div>
            <span className="text-xs font-mono text-txt-dim bg-void/50 px-2 py-1 rounded border border-sep/40">
              {totalBought} selecionada(s)
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {modulosAdquiridos.map((mod) => (
              <div
                key={mod.id}
                className="ss-acquired-chip"
              >
                <span className={`type-dot ${mod.type === 'passivo' ? 'passive' : 'active'}`} />
                <span className="text-txt-main">{mod.name}</span>
                {(mod.boughtCount || 1) > 1 && (
                  <span className="text-gold font-mono text-xs font-semibold">×{mod.boughtCount}</span>
                )}
                <span className="text-txt-dim/70 text-[10px] uppercase tracking-wider">({mod.type})</span>
                <button
                  type="button"
                  onClick={() => removeModule(mod.id)}
                  className="text-err/70 hover:text-err transition-colors ml-1 flex items-center"
                  aria-label={`Remover ${mod.name}`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
