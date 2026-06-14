import { useState, useEffect, useDeferredValue, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { getGrimorioAccessTier, getAvailableGrimorioTiers, getMaxCustomRituals, getMaxCreationShots, getMaxGrimorios, getScoreForDisplay, getGrimorioMaxRituals, getGrimorioMaxCircle, canAddRitualToGrimorio, canCreateRitualAtCircle, getAvailableCirclesForChar } from '../utils/grimorioRules'
import { GRIMORIO_TIERS, GRIMORIO_TYPE_LABELS, GRIMORIO_TYPE_ICONS } from '../data/grimorios'
import { DEFAULT_GRIMORIOS, PUBLIC_GRIMORIOS } from '../data/publicGrimorios'
import { ENTIDADES_OUTRO_LADO } from '../data/entidades'
import { getRegenteId, getRegenteById, getRegenteAffinity } from '../data/regentes'
import { analyzeAlchemyRitualDraft, analyzeSpellDraft, analyzeRuneDraft, analyzeMagicDraft } from '../services/aiService'
import { uploadGrimorioImage } from '../services/uploadService'
import ImageUploadField from './ImageUploadField'
import { getAlchemyProfile, canLearnAlchemyRitual } from '../utils/alchemyRules'
import { getSpellProfile, canLearnSpell } from '../utils/spellRules'
import { getRuneProfile, canLearnRune } from '../utils/runeRules'
import { getMagicProfile, canLearnMagic } from '../utils/magicRules'

const KNOWLEDGE_CARDS = [
  { key: 'alchemy', icon: '⚗', title: 'Alquimia', accent: '#2dd4bf', accentClass: 'text-teal-400', borderClass: 'border-teal-400/25', glowClass: 'bg-teal-400/8', field: 'alchemyRituals' },
  { key: 'spells', icon: '✨', title: 'Feitiços', accent: '#34d399', accentClass: 'text-emerald-400', borderClass: 'border-emerald-400/25', glowClass: 'bg-emerald-400/8', field: 'spells' },
  { key: 'runes', icon: '💎', title: 'Runas', accent: '#38bdf8', accentClass: 'text-sky-400', borderClass: 'border-sky-400/25', glowClass: 'bg-sky-400/8', field: 'runes' },
  { key: 'magic', icon: '🔥', title: 'Magias', accent: '#fb923c', accentClass: 'text-orange-400', borderClass: 'border-orange-400/25', glowClass: 'bg-orange-400/8', field: 'magics' },
]

const CIRCLE_BADGE = {
  1: 'bg-emerald-400/12 text-emerald-300 border-emerald-400/25',
  2: 'bg-sky-400/12 text-sky-300 border-sky-400/25',
  3: 'bg-purple-400/12 text-purple-300 border-purple-400/25',
  4: 'bg-amber-300/12 text-amber-200 border-amber-300/30',
}

const RITUAL_FETCH = {
  alchemy: () => import('../services/alchemyService').then(m => m.fetchAlchemyRituals()),
  spells: () => import('../services/alchemyService').then(m => m.fetchSpellRituals()),
  runes: () => import('../services/alchemyService').then(m => m.fetchRuneRituals()),
  magic: () => import('../services/alchemyService').then(m => m.fetchMagicRituals()),
}

function normalizeRitual(ritual) {
  return { id: ritual.id, name: ritual.name, circle: ritual.circle, category: ritual.category, short_description: ritual.short_description, pe_cost: ritual.pe_cost, effect: ritual.effect, regent: ritual.regent || null }
}

function MysticKnowledgeGrid({ char, update, canEdit, alchemyProfile, spellProfile, runeProfile, magicProfile, alchemyEnabled, spellsEnabled, runesEnabled, magicEnabled, systemOptIn }) {
  const [expanded, setExpanded] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(null)
  const [pickerGrimorioId, setPickerGrimorioId] = useState(null)
  const [grimorioPickerOpen, setGrimorioPickerOpen] = useState(null)
  const profiles = { alchemy: alchemyProfile, spells: spellProfile, runes: runeProfile, magic: magicProfile }
  const enabled = { alchemy: alchemyEnabled, spells: spellsEnabled, runes: runesEnabled, magic: magicEnabled }

  const visibleCards = KNOWLEDGE_CARDS.filter(c => profiles[c.key]?.hasAccess)

  useEffect(() => {
    if (!update) return
    const grimorios = char.grimorios || []
    const tierOrder = ['iniciante', 'avancado', 'mestre']
    const changed = []
    for (const g of grimorios) {
      const maxTier = getGrimorioAccessTier(char, g.knowledgeKey)
      const maxIdx = tierOrder.indexOf(maxTier)
      const gIdx = tierOrder.indexOf(g.tier)
      if (maxTier && gIdx > maxIdx) changed.push(g.id)
    }
    if (changed.length > 0) {
      update({ grimorios: grimorios.filter(g => !changed.includes(g.id)) })
    }
  }, [])

  function toggleExpand(key) {
    if (!canEdit) return
    const next = expanded === key ? null : key
    setExpanded(next)
    if (next && !enabled[next]) {
      const fieldMap = { alchemy: 'alchemyRituals', spells: 'spells', runes: 'runes', magic: 'magics' }
      update({ systemsOptIn: { ...systemOptIn, [next]: true }, [fieldMap[next]]: char[fieldMap[next]] || [] })
    }
  }

  if (visibleCards.length === 0) {
    return <p className="text-txt-dim text-xs text-center py-6 italic">Nenhuma disciplina mística disponível para este personagem.</p>
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {visibleCards.map(card => {
          const isExpanded = expanded === card.key
          const count = (char[card.field] || []).length
          return (
            <button key={card.key} type="button" onClick={() => toggleExpand(card.key)}
              className={`relative aspect-square rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                isExpanded ? `${card.borderClass} ${card.glowClass} ring-1 ring-current ${card.accentClass}` : 'border-sep/20 bg-void/30 hover:border-sep/40'
              }`}>
              <span className={`text-3xl ${isExpanded ? card.accentClass : 'text-txt-dim/60'}`}>{card.icon}</span>
              <span className={`text-sm font-semibold ${isExpanded ? 'text-txt-main' : 'text-txt-dim/70'}`}>{card.title}</span>
              {count > 0 && (
                <span className={`absolute top-2 right-2 text-[10px] font-mono px-1.5 py-0.5 rounded-full ${isExpanded ? 'bg-white/10 text-txt-main' : 'bg-sep/20 text-txt-dim'}`}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {expanded && enabled[expanded] && (
        <KnowledgeExpandedSection char={char} update={update} card={KNOWLEDGE_CARDS.find(c => c.key === expanded)}
          profile={profiles[expanded]} onOpenPicker={(grimorioId) => { setPickerOpen(expanded); setPickerGrimorioId(grimorioId || null) }}
          onOpenGrimorioPicker={() => setGrimorioPickerOpen(expanded)} />
      )}

      {pickerOpen && createPortal(
        <RitualPickerModal char={char} update={update} card={KNOWLEDGE_CARDS.find(c => c.key === pickerOpen)}
          profile={profiles[pickerOpen]} grimorioId={pickerGrimorioId} onClose={() => { setPickerOpen(null); setPickerGrimorioId(null) }} />,
        document.body
      )}

      {grimorioPickerOpen && createPortal(
        <GrimorioPickerModal char={char} update={update} card={KNOWLEDGE_CARDS.find(c => c.key === grimorioPickerOpen)}
          onClose={() => setGrimorioPickerOpen(null)} />,
        document.body
      )}
    </div>
  )
}

const CIRCLE_BG = {
  1: 'bg-emerald-500/15 hover:bg-emerald-500/22 border-emerald-500/25',
  2: 'bg-sky-500/15 hover:bg-sky-500/22 border-sky-500/25',
  3: 'bg-purple-500/15 hover:bg-purple-500/22 border-purple-500/25',
  4: 'bg-amber-400/15 hover:bg-amber-400/22 border-amber-400/25',
}

const CIRCLE_BORDER_TOP = {
  1: 'border-t-2 border-t-emerald-400/40',
  2: 'border-t-2 border-t-sky-400/40',
  3: 'border-t-2 border-t-purple-400/40',
  4: 'border-t-2 border-t-amber-300/40',
}

const USES_ENERGIA = new Set(['spells', 'magic'])

function KnowledgeExpandedSection({ char, update, card, profile, onOpenPicker, onOpenGrimorioPicker }) {
  const allItems = (char[card.field] || []).slice().sort((a, b) => a.circle - b.circle || a.name.localeCompare(b.name))
  const SPACE_COST = { 1: 4, 2: 6, 3: 10, 4: 15 }
  const spaceUsed = allItems.reduce((s, r) => s + (SPACE_COST[r.circle] || 0), 0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeRitualId, setActiveRitualId] = useState(null)
  const [grimorioViewId, setGrimorioViewId] = useState(null)
  const usesEnergia = USES_ENERGIA.has(card.key)

  const accessTier = getGrimorioAccessTier(char, card.key)
  const availableTiers = getAvailableGrimorioTiers(char, card.key)
  const maxCustom = getMaxCustomRituals(char, card.key)
  const personalGrimorios = (char.grimorios || []).filter(g => g.knowledgeKey === card.key)
  const publicTemplates = (DEFAULT_GRIMORIOS[card.key] || []).filter(g => {
    if (!accessTier) return false
    const tierOrder = ['iniciante', 'avancado', 'mestre']
    const maxIdx = tierOrder.indexOf(accessTier)
    const gIdx = tierOrder.indexOf(g.tier)
    return gIdx <= maxIdx
  })
  const grimorios = [
    ...publicTemplates.map(g => ({ ...g, isPublic: true, id: `public-${g.id}` })),
    ...personalGrimorios,
  ]
  const score = getScoreForDisplay(char, card.key)
  const nextTierThreshold = accessTier === 'mestre' ? null : accessTier === 'avancado' ? 50 : accessTier === 'iniciante' ? 30 : 15

  function openSidebar(ritualId) {
    setActiveRitualId(ritualId)
    setSidebarOpen(true)
  }

  function removeRitual(ritual) {
    if (!update) return
    const current = char[card.field] || []
    update({ [card.field]: current.filter(r => r.id !== ritual.id) })
    if (activeRitualId === ritual.id) setActiveRitualId(null)
  }

  function getRitualsForGrimorio(grimorio) {
    if (grimorio.isPublic) {
      const realId = grimorio.id.replace('public-', '')
      return allItems.filter(r => r.grimorioId === realId || r.grimorioId === grimorio.id)
    }
    return allItems.filter(r => (r.grimorioId || null) === grimorio.id)
  }

  const viewingGrimorio = grimorios.find(g => g.id === grimorioViewId) || null

  return (
    <div className={`rounded-xl border ${card.borderClass} bg-void/40 overflow-hidden`}>
      <div className="flex items-center justify-between gap-3 p-4 pb-2">
        <div className="flex items-center gap-2">
          <span className={card.accentClass}>{card.icon}</span>
          <span className={`font-semibold text-sm ${card.accentClass}`}>{card.title}</span>
          <span className="text-[11px] text-txt-dim font-mono">{spaceUsed}/{profile.spaceBudget} espaços</span>
        </div>
        <div className="text-[10px] text-txt-dim font-mono">
          Afinidade: <span className={accessTier ? 'text-emerald-300' : 'text-txt-dim/40'}>{score}{nextTierThreshold ? `/${nextTierThreshold}` : ''}</span>
        </div>
      </div>

      {accessTier && nextTierThreshold && (
        <div className="px-4 pb-2">
          <span className="text-[10px] text-amber-300/50">
            Faltam <span className="text-amber-300">{nextTierThreshold - score}</span> pontos para {accessTier === 'iniciante' ? 'Avançado' : accessTier === 'avancado' ? 'Mestre' : ''}
          </span>
        </div>
      )}
      {accessTier && !nextTierThreshold && (
        <div className="px-4 pb-2">
          <span className="text-[10px] text-emerald-300/50">Afinidade máxima alcançada</span>
        </div>
      )}
      {!accessTier && (
        <div className="px-4 pb-2">
          <span className="text-[10px] text-amber-300/50">
            Faltam <span className="text-amber-300">{15 - score}</span> pontos para Iniciante
          </span>
        </div>
      )}

      {(() => {
        const affinities = getRegenteAffinity(allItems)
        if (affinities.length === 0) return null
        return (
          <div className="mx-4 mb-3 bg-gold/5 border border-gold/15 rounded-lg p-2.5 space-y-1.5">
            <div className="text-[10px] uppercase tracking-[0.1em] text-gold font-semibold">Afinidade de Regente</div>
            {affinities.map(a => (
              <div key={a.regentId} className="flex items-center gap-2">
                <span className={`text-xs ${a.regente.color}`}>{a.regente.icon}</span>
                <span className="text-gold text-[10px] font-semibold">{a.tier.name}</span>
                <span className={`text-[9px] border rounded-full px-1 py-0.5 ${a.regente.badge}`}>{a.regente.shortName}</span>
                <span className="text-txt-dim text-[9px]">{a.ritualCount} rituais</span>
                <span className="text-amber-300 text-[9px]">-{a.tier.peDiscount} PE</span>
                <span className="text-emerald-300 text-[9px]">{a.tier.effectBonus}</span>
              </div>
            ))}
          </div>
        )
      })()}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 px-4 pb-4">
        {grimorios.map(grimorio => {
          const rituals = getRitualsForGrimorio(grimorio)
          const tier = GRIMORIO_TIERS.find(t => t.id === grimorio.tier)
          const maxRituals = grimorio.isPublic ? (grimorio.rituals?.length || 0) : getGrimorioMaxRituals(grimorio)
          const isFull = rituals.length >= maxRituals && maxRituals > 0
          return (
            <div key={grimorio.id} className={`relative rounded-xl overflow-hidden aspect-[3/4] transition-all duration-200 border ${
                grimorio.isPublic ? 'border-gold/15 hover:border-gold/35' : 'border-sep/20 hover:border-sep/40'
              }`}>
              {grimorio.isPublic && <span className="absolute top-2 right-2 text-[7px] text-gold/50 font-mono bg-black/40 backdrop-blur-sm rounded px-1.5 py-0.5 z-10">PUBLICO</span>}
              {!grimorio.isPublic && update && (
                <button type="button" onClick={e => { e.stopPropagation(); onOpenGrimorioPicker() }}
                  className="absolute top-2 left-2 z-10 w-6 h-6 rounded-md bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/40 hover:text-gold hover:border-gold/40 transition-colors text-xs">✎</button>
              )}
              <button type="button" onClick={() => setGrimorioViewId(grimorio.id === grimorioViewId ? null : grimorio.id)}
                className="w-full h-full text-left hover:scale-[1.02] active:scale-[0.98] transition-transform">
                {grimorio.image ? (
                  <img src={grimorio.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-void/80 flex items-center justify-center">
                    <span className="text-6xl opacity-15">{card.icon}</span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent pt-10 pb-3 px-3">
                  <span className="text-white text-[11px] font-semibold leading-tight block drop-shadow-lg">{grimorio.name}</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-white/45 text-[9px]">{tier?.name || 'Autoral'}</span>
                    <span className={`text-[9px] font-mono ${isFull ? 'text-amber-300' : 'text-amber-300/60'}`}>{rituals.length}/{maxRituals || '—'}</span>
                  </div>
                </div>
              </button>
            </div>
          )
        })}

        {update && accessTier && (
          <button type="button" onClick={onOpenGrimorioPicker}
            className="rounded-xl border-2 border-dashed border-sep/15 hover:border-gold/25 flex flex-col items-center justify-center aspect-[3/4] transition-all duration-200 hover:bg-gold/[0.03] active:scale-[0.98] gap-1">
            <span className="text-gold/40 text-lg">⚙</span>
            <span className="text-txt-dim/40 text-[9px]">Gerenciar</span>
          </button>
        )}
      </div>

      {viewingGrimorio && (() => {
        const rituals = getRitualsForGrimorio(viewingGrimorio)
        const maxRituals = viewingGrimorio.isPublic ? (viewingGrimorio.rituals?.length || 0) : getGrimorioMaxRituals(viewingGrimorio)
        const isFull = rituals.length >= maxRituals
        return (
          <div className="border-t border-sep/15 px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={card.accentClass}>{card.icon}</span>
                <span className="text-txt-main text-sm font-semibold">{viewingGrimorio.name}</span>
                <span className={`text-[10px] font-mono ${isFull ? 'text-amber-300' : 'text-txt-dim'}`}>{rituals.length}/{maxRituals} rituais</span>
              </div>
              <button type="button" onClick={() => setGrimorioViewId(null)} className="text-txt-dim hover:text-txt-main text-xs">×</button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
              {rituals.map(ritual => {
                    const ritualRegent = getRegenteById(getRegenteId(ritual))
                    return (
                  <button key={ritual.id} type="button" onClick={() => openSidebar(ritual.id)}
                    className={`relative rounded-lg border flex flex-col items-center justify-between p-2 text-left transition-all duration-200 hover:scale-[1.04] active:scale-[0.97] ${CIRCLE_BG[ritual.circle] || CIRCLE_BG[1]}`}>
                  <div className="w-full flex items-start justify-between">
                    <span className={`text-[9px] border rounded-full px-1 py-0.5 ${CIRCLE_BADGE[ritual.circle] || CIRCLE_BADGE[1]}`}>{ritual.circle}o</span>
                    {ritualRegent && <span className={`text-[7px] border rounded-full px-1 py-0.5 ${ritualRegent.badge}`}>{ritualRegent.shortName}</span>}
                    {update && (
                      <span role="button" tabIndex={0} onClick={e => { e.stopPropagation(); removeRitual(ritual) }}
                        className="text-err/30 hover:text-err text-[10px] leading-none">×</span>
                    )}
                  </div>
                  <span className="text-txt-main text-[10px] font-semibold text-center leading-tight mt-0.5 line-clamp-2">{ritual.name}</span>
                  <div className="w-full flex items-center justify-between mt-0.5">
                    <span className="text-amber-300 text-[9px] font-mono">{ritual.pe_cost || 0} PE</span>
                    {usesEnergia && <span className="text-sky-300 text-[9px] font-mono">⚡</span>}
                  </div>
                </button>
                    )
                  })}
              {update && !isFull && (
                <button type="button" onClick={() => onOpenPicker(viewingGrimorio.id)}
                  className="rounded-lg border-2 border-dashed border-sep/15 hover:border-sep/30 flex items-center justify-center min-h-[80px] transition-all hover:bg-white/[0.02] active:scale-[0.97]">
                  <span className="text-txt-dim/25 text-lg">+</span>
                </button>
              )}
              {update && isFull && (
                <div className="rounded-lg border border-amber-300/15 bg-amber-300/5 flex items-center justify-center min-h-[80px]">
                </div>
              )}
            </div>
          </div>
          )
        })()}

      {sidebarOpen && createPortal(
        <div className="fixed inset-0 z-[60] flex justify-end" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm h-full bg-[#0a0c14]/95 border-l border-sep/20 shadow-2xl flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-sep/20">
              <div className="flex items-center gap-2">
                <span className={card.accentClass}>{card.icon}</span>
                <span className={`font-semibold text-sm ${card.accentClass}`}>{card.title}</span>
                <span className="text-[10px] text-txt-dim font-mono">{allItems.length}</span>
              </div>
              <button type="button" onClick={() => setSidebarOpen(false)} className="text-txt-dim hover:text-txt-main transition-colors">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {allItems.map(ritual => {
                const isActive = activeRitualId === ritual.id
                return (
                  <div key={ritual.id}
                    className={`rounded-lg border overflow-hidden transition-all duration-200 ${isActive ? (CIRCLE_BORDER_TOP[ritual.circle] || '') + ' ' + (CIRCLE_BG[ritual.circle] || CIRCLE_BG[1]) : 'border-sep/15 bg-void/30 hover:bg-void/50'}`}>
                    <button type="button" onClick={() => setActiveRitualId(isActive ? null : ritual.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-all duration-150 hover:brightness-110">
                      <span className={`text-[9px] border rounded-full px-1.5 py-0.5 shrink-0 ${CIRCLE_BADGE[ritual.circle] || CIRCLE_BADGE[1]}`}>{ritual.circle}o</span>
                       <span className="text-txt-main text-xs font-semibold truncate flex-1">{ritual.name}</span>
                       {(() => { const lr = getRegenteById(getRegenteId(ritual)); return lr ? <span className={`text-[8px] border rounded-full px-1 py-0.5 ${lr.badge}`}>{lr.shortName}</span> : null })()}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-amber-300 text-[10px] font-mono">{ritual.pe_cost || 0} PE</span>
                        {usesEnergia && <span className="text-sky-300 text-[10px] font-mono">⚡</span>}
                      </div>
                      <span className={`text-txt-dim/30 text-[9px] transition-transform duration-200 ${isActive ? 'rotate-180' : ''}`}>▼</span>
                    </button>
                    {isActive && (
                      <div className="px-3 pb-3 pt-1 border-t border-white/5 space-y-2 animate-fadeIn">
                        {ritual.short_description && <p className="text-txt-dim text-xs leading-relaxed">{ritual.short_description}</p>}
                        {ritual.effect && <p className="text-txt-dim/60 text-[11px] leading-relaxed">{ritual.effect}</p>}
                        <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                          <span className="text-amber-300">{ritual.pe_cost || 0} PE</span>
                          {usesEnergia && <span className="text-sky-300">{ritual.pe_cost || 0} Energia</span>}
                          <span className="text-gold">{SPACE_COST[ritual.circle] || 0} espaços</span>
                          {ritual.category && <span className="text-txt-dim">{ritual.category}</span>}
                          {ritual.duration && <span className="text-sky-300">{ritual.duration}</span>}
                          {ritual.action_cost && <span className="text-purple-300">{ritual.action_cost}</span>}
                          {(() => {
                            const sr = getRegenteById(getRegenteId(ritual))
                            return sr ? <span className={`text-[10px] border rounded-full px-1.5 py-0.5 ${sr.badge}`}>{sr.icon} {sr.shortName}</span> : null
                          })()}
                          {ritual.regent && !getRegenteById(getRegenteId(ritual)) && <span className="text-emerald-400/70">{ENTIDADES_OUTRO_LADO.find(e => e.id === ritual.regent)?.name || ritual.regent}</span>}
                        </div>
                        {update && (
                          <button type="button" onClick={() => removeRitual(ritual)}
                            className="text-err/60 hover:text-err text-[10px] transition-colors mt-1">Remover</button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

function RitualPickerModal({ char, update, card, profile, grimorioId, onClose }) {
  const [tab, setTab] = useState('library')
  const [library, setLibrary] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [circleFilter, setCircleFilter] = useState('all')
  const [inspectId, setInspectId] = useState(null)
  const deferredSearch = useDeferredValue(search)
  const SPACE_COST = { 1: 4, 2: 6, 3: 10, 4: 15 }
  const usesEnergia = USES_ENERGIA.has(card.key)

  const [customName, setCustomName] = useState('')
  const [customDesc, setCustomDesc] = useState('')
  const [customCircle, setCustomCircle] = useState(1)
  const [customPeCost, setCustomPeCost] = useState(5)
  const [customAction, setCustomAction] = useState('Acao Padrao')
  const [customDuration, setCustomDuration] = useState('Instantaneo')
  const [customRange, setCustomRange] = useState('Pessoal')
  const [customEntity, setCustomEntity] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const [customEffect, setCustomEffect] = useState('')
  const [customAnalyzing, setCustomAnalyzing] = useState(false)
  const [customResult, setCustomResult] = useState(null)
  const [customError, setCustomError] = useState('')
  const [customMode, setCustomMode] = useState('form')

  const accessTier = getGrimorioAccessTier(char, card.key)
  const maxCustom = getMaxCustomRituals(char, card.key)
  const maxShots = getMaxCreationShots(char, card.key)
  const customCount = (char[card.field] || []).filter(r => r.isCustom).length
  const shotsLeft = maxShots - customCount

  const activeGrimorio = (char.grimorios || []).find(g => g.id === grimorioId) || null
  const publicGrimorio = !activeGrimorio && grimorioId
    ? (DEFAULT_GRIMORIOS[card.key] || []).find(g => `public-${g.id}` === grimorioId || g.id === grimorioId)
    : null
  const isPublicGrimorio = !!publicGrimorio
  const isPersonalGrimorio = !!activeGrimorio
  const effectiveGrimorio = activeGrimorio || publicGrimorio
  const grimorioMaxCircle = effectiveGrimorio ? getGrimorioMaxCircle(effectiveGrimorio) : 4
  const grimorioMaxRituals = isPublicGrimorio
    ? (publicGrimorio?.rituals?.length || 0)
    : effectiveGrimorio ? getGrimorioMaxRituals(effectiveGrimorio) : Infinity
  const grimorioRitualCount = activeGrimorio
    ? (char[card.field] || []).filter(r => r.grimorioId === activeGrimorio.id).length
    : 0
  const grimorioSlotsLeft = grimorioMaxRituals - grimorioRitualCount

  useEffect(() => {
    if (isPublicGrimorio) {
      setLibrary(publicGrimorio?.rituals || [])
      setLoading(false)
      return
    }
    if (isPersonalGrimorio) {
      const created = (char[card.field] || []).filter(r => r.grimorioId === activeGrimorio.id)
      setLibrary(created)
      setLoading(false)
      return
    }
    let active = true
    async function load() {
      setLoading(true)
      try {
        const fetchFn = RITUAL_FETCH[card.key]
        const res = fetchFn ? await fetchFn() : { data: [] }
        if (active) { setLibrary(res.data || []); setLoading(false) }
      } catch { if (active) { setLibrary([]); setLoading(false) } }
    }
    load()
    return () => { active = false }
  }, [card.key, grimorioId, isPublicGrimorio, isPersonalGrimorio])

  const selected = char[card.field] || []
  const spaceUsed = selected.reduce((s, r) => s + (SPACE_COST[r.circle] || 0), 0)

  const filtered = useMemo(() => {
    return library.filter(r => {
      const hay = `${r.name} ${r.short_description || ''} ${r.category || ''}`.toLowerCase()
      const matchSearch = !deferredSearch.trim() || hay.includes(deferredSearch.trim().toLowerCase())
      const matchCircle = circleFilter === 'all' || Number(circleFilter) === r.circle
      return matchSearch && matchCircle
    })
  }, [library, deferredSearch, circleFilter])

  const inspectedRitual = library.find(r => r.id === inspectId) || null

  function addRitual(ritual) {
    if (!update) return
    if (selected.some(r => r.id === ritual.id)) return
    const targetGrimorioId = isPublicGrimorio ? publicGrimorio.id : (activeGrimorio?.id || null)
    if (targetGrimorioId) {
      if (ritual.circle > grimorioMaxCircle) {
        alert(`Este grimorio suporta apenas circulos ate ${grimorioMaxCircle}o.`)
        return
      }
      if (grimorioSlotsLeft <= 0) {
        alert(`Este grimorio esta cheio (${grimorioRitualCount}/${grimorioMaxRituals}).`)
        return
      }
    }
    const current = selected
    const gateFn = { alchemy: canLearnAlchemyRitual, spells: canLearnSpell, runes: canLearnRune, magic: canLearnMagic }[card.key]
    const gate = gateFn ? gateFn(char, current, ritual) : { allowed: true }
    if (!gate.allowed) { alert(gate.reason); return }
    const normalized = normalizeRitual(ritual)
    if (targetGrimorioId) normalized.grimorioId = targetGrimorioId
    update({ [card.field]: [...current, normalized] })
  }

  async function analyzeCustomRitual() {
    if (!customName.trim()) {
      setCustomError('Preencha pelo menos o nome do ritual.')
      return
    }
    if (shotsLeft <= 0) {
      setCustomError(`Limite de ${maxShots} criações atingido para este conhecimento.`)
      return
    }
    setCustomAnalyzing(true)
    setCustomError('')
    setCustomResult(null)

    const draft = {
      name: customName.trim(),
      description: customDesc.trim() || customEffect.trim(),
      circle: customCircle,
      knowledgeType: card.key,
      pe_cost: customPeCost,
      action_cost: customAction,
      duration: customDuration,
      range: customRange,
      source_name: customEntity.trim(),
      category: customCategory.trim(),
      effect: customEffect.trim(),
    }
    const context = { characterLevel: char.nivel || 1 }

    try {
      const analyzeFn = { alchemy: analyzeAlchemyRitualDraft, spells: analyzeSpellDraft, runes: analyzeRuneDraft, magic: analyzeMagicDraft }[card.key]
      if (!analyzeFn) throw new Error('Tipo de conhecimento nao suportado.')
      const result = await analyzeFn(draft, context)
      setCustomResult(result)
      setCustomMode('feedback')
    } catch (err) {
      setCustomError(err.message || 'Erro ao analisar ritual.')
    } finally {
      setCustomAnalyzing(false)
    }
  }

  function confirmCustomRitual() {
    if (!customResult || !update) return
    if (activeGrimorio && grimorioSlotsLeft <= 0) {
      setCustomError('Este grimorio esta cheio.')
      return
    }
    const ritual = {
      id: crypto.randomUUID(),
      name: customResult.name || customName.trim(),
      circle: customResult.circle || customCircle,
      category: customResult.category || customCategory || 'Personalizado',
      pe_cost: customResult.pe_cost || customPeCost,
      action_cost: customResult.action_cost || customAction,
      duration: customResult.duration || customDuration,
      range: customResult.range || customRange,
      short_description: customResult.short_description || customDesc.trim(),
      effect: customResult.effect || customEffect.trim(),
      source_name: customResult.source_name || customEntity.trim(),
      isCustom: true,
      grimorioId: activeGrimorio ? activeGrimorio.id : null,
    }
    const current = char[card.field] || []
    update({ [card.field]: [...current, ritual] })
    resetCustomForm()
    setTab('library')
  }

  function resetCustomForm() {
    setCustomName('')
    setCustomDesc('')
    setCustomCircle(1)
    setCustomPeCost(5)
    setCustomAction('Acao Padrao')
    setCustomDuration('Instantaneo')
    setCustomRange('Pessoal')
    setCustomEntity('')
    setCustomCategory('')
    setCustomEffect('')
    setCustomResult(null)
    setCustomError('')
    setCustomMode('form')
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-5xl max-h-[85vh] bg-[#0a0c14] border border-sep/30 rounded-2xl shadow-2xl flex overflow-hidden"
        onClick={e => e.stopPropagation()} style={{ '--grimoire-accent': card.accent }}>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-sep/20">
            <div className="flex items-center gap-3">
              <span className={`text-xl ${card.accentClass}`}>{card.icon}</span>
              <div>
                <h3 className={`font-cinzel text-sm uppercase tracking-wider font-semibold ${card.accentClass}`}>{card.title}</h3>
                {effectiveGrimorio && <span className="text-[10px] text-txt-dim font-mono">
                  {effectiveGrimorio.name} {isPublicGrimorio ? '(Publico)' : '(Autoral)'} — {grimorioRitualCount}/{grimorioMaxRituals} rituais — Circulos 1o-{grimorioMaxCircle}o
                </span>}
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-txt-dim">Espaços: <span className={spaceUsed >= profile.spaceBudget ? 'text-amber-300' : 'text-emerald-300'}>{spaceUsed}/{profile.spaceBudget}</span></span>
              <span className="text-txt-dim">Custos: <span className="text-gold">4/6/10/15</span></span>
            </div>
            <button type="button" onClick={onClose} className="text-txt-dim hover:text-txt-main text-lg transition-colors">×</button>
          </div>

          <div className="flex items-center gap-1 px-5 py-2 border-b border-sep/15">
            <button type="button" onClick={() => setTab('library')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === 'library' ? 'bg-gold/20 text-gold border border-gold/30' : 'text-txt-dim hover:text-txt-main'}`}>
              {isPersonalGrimorio ? 'Meus Rituais' : 'Biblioteca'}
            </button>
            {update && isPersonalGrimorio && (
              <button type="button" onClick={() => setTab('custom')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === 'custom' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-txt-dim hover:text-txt-main'}`}>
                Criar Ritual <span className="text-[9px] font-mono">{shotsLeft}/{maxShots}</span>
              </button>
            )}
          </div>

          {tab === 'library' && (
            <>
              <div className="flex items-center gap-2 px-5 py-3 border-b border-sep/15">
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar ritual..."
                  className="flex-1 bg-void border border-sep rounded-lg px-3 py-2 text-sm text-txt-main focus:border-gold/40 outline-none" />
                <div className="flex gap-1">
                  {['all', '1', '2', '3', '4'].map(c => (
                    <button key={c} type="button" onClick={() => setCircleFilter(c)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        circleFilter === c ? 'bg-gold/20 text-gold border border-gold/30' : 'bg-void border border-sep/30 text-txt-dim hover:border-sep/50'
                      }`}>
                      {c === 'all' ? 'Todos' : `${c}o`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {loading ? (
                  <p className="text-txt-dim text-sm animate-pulse text-center py-8">Carregando...</p>
                ) : isPersonalGrimorio && library.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-purple-500/20 flex items-center justify-center">
                      <span className="text-purple-300/30 text-3xl">+</span>
                    </div>
                    <p className="text-txt-dim/50 text-sm text-center">Nenhum ritual criado neste grimorio.</p>
                    {update && shotsLeft > 0 && (
                      <button type="button" onClick={() => setTab('custom')}
                        className="px-6 py-2.5 rounded-lg bg-purple-500/15 text-purple-300 text-xs font-semibold border border-purple-500/25 hover:bg-purple-500/25 transition-colors active:scale-[0.99]">
                        Criar Primeiro Ritual
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grimoire-card-grid">
                    {filtered.map(ritual => {
                      const isSelected = selected.some(r => r.id === ritual.id)
                      const spaceCost = SPACE_COST[ritual.circle] || 0
                      const wouldExceed = !isSelected && (spaceUsed + spaceCost) > profile.spaceBudget
                      const circleOk = ritual.circle <= grimorioMaxCircle
                      const slotsOk = grimorioSlotsLeft > 0 || isSelected
                      const disabled = isSelected || wouldExceed || !circleOk || !slotsOk
                      const circleBg = CIRCLE_BG[ritual.circle] || CIRCLE_BG[1]

                      return (
                        <article key={ritual.id}
                          className={`grimoire-entry-card ${disabled ? 'opacity-50' : ''} ${circleBg} transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${inspectId === ritual.id ? 'ring-1 ring-white/20' : ''}`}
                          style={{ '--grimoire-accent': card.accent }}>
                          <div className="grimoire-entry-top">
                            <span className={`border ${CIRCLE_BADGE[ritual.circle] || CIRCLE_BADGE[1]}`}>{ritual.circle}o</span>
                            <small>{ritual.category || '—'}</small>
                          </div>
                          <h4 className="font-cinzel">{ritual.name}</h4>
                          <p>{ritual.short_description || ritual.effect || '—'}</p>
                          <div className="grimoire-entry-meta">
                            <span>{ritual.pe_cost || 0} PE</span>
                            {usesEnergia && <span>Energia</span>}
                            <span>{spaceCost} espacos</span>
                          </div>
                          <div className="flex gap-2 mt-auto">
                            <button type="button" disabled={disabled}
                              onClick={() => addRitual(ritual)}
                              className={`flex-1 transition-all duration-150 ${isSelected ? 'opacity-50 cursor-default' : 'hover:brightness-110 active:scale-95'}`}>
                              {isSelected ? 'ok' : 'Selecionar'}
                            </button>
                            <button type="button" onClick={() => setInspectId(inspectId === ritual.id ? null : ritual.id)}
                              className="transition-all duration-150 hover:brightness-110 active:scale-95">
                              {inspectId === ritual.id ? 'x' : '...'}
                            </button>
                          </div>
                        </article>
                      )
                    })}
                    {filtered.length === 0 && (
                      <p className="text-txt-dim text-sm italic col-span-full text-center py-6">Nenhum ritual encontrado.</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {tab === 'custom' && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="max-w-xl mx-auto space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-purple-300 text-xs font-semibold">Criar Ritual</span>
                  <span className="text-txt-dim text-[10px] font-mono">Tiros: <span className={shotsLeft > 0 ? 'text-emerald-300' : 'text-err'}>{shotsLeft}/{maxShots}</span></span>
                </div>

                {customMode === 'form' ? (
                  <>
                    <div>
                      <label className="text-txt-dim/60 text-[10px] uppercase tracking-wider mb-1 block">Nome do Ritual *</label>
                      <input type="text" value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Ex: Chama do Crepusculo"
                        className="w-full bg-void border border-sep rounded-lg px-3 py-2 text-sm text-txt-main focus:border-gold/40 outline-none" />
                    </div>
                    <div>
                      <label className="text-txt-dim/60 text-[10px] uppercase tracking-wider mb-1 block">Circulo</label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4].filter(c => !activeGrimorio || c <= grimorioMaxCircle).map(c => {
                          const lvlOk = canCreateRitualAtCircle(char, c)
                          return (
                            <button key={c} type="button" onClick={() => lvlOk.allowed && setCustomCircle(c)}
                              disabled={!lvlOk.allowed}
                              className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors border ${
                                customCircle === c ? (CIRCLE_BG[c] || '') + ' ' + (CIRCLE_BADGE[c] || '')
                                  : !lvlOk.allowed ? 'bg-void/30 border-sep/15 text-txt-dim/30 cursor-not-allowed'
                                  : 'bg-void border-sep/30 text-txt-dim hover:border-sep/50'
                              }`}
                              title={!lvlOk.allowed ? lvlOk.reason : ''}>
                              {c}o
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-txt-dim/60 text-[10px] uppercase tracking-wider mb-1 block">Custo PE</label>
                        <input type="number" min={1} max={99} value={customPeCost} onChange={e => setCustomPeCost(Number(e.target.value) || 1)}
                          className="w-full bg-void border border-sep rounded-lg px-3 py-2 text-sm text-txt-main focus:border-gold/40 outline-none" />
                      </div>
                      <div>
                        <label className="text-txt-dim/60 text-[10px] uppercase tracking-wider mb-1 block">Acao</label>
                        <select value={customAction} onChange={e => setCustomAction(e.target.value)}
                          className="w-full bg-void border border-sep rounded-lg px-3 py-2 text-sm text-txt-main focus:border-gold/40 outline-none">
                          <option value="Acao Padrao">Acao Padrao</option>
                          <option value="Acao Bonus">Acao Bonus</option>
                          <option value="Acao Completa">Acao Completa</option>
                          <option value="Reacao">Reacao</option>
                          <option value="1 minuto">1 minuto</option>
                          <option value="10 minutos">10 minutos</option>
                          <option value="1 hora">1 hora</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-txt-dim/60 text-[10px] uppercase tracking-wider mb-1 block">Duracao</label>
                        <select value={customDuration} onChange={e => setCustomDuration(e.target.value)}
                          className="w-full bg-void border border-sep rounded-lg px-3 py-2 text-sm text-txt-main focus:border-gold/40 outline-none">
                          <option value="Instantaneo">Instantaneo</option>
                          <option value="1 rodada">1 rodada</option>
                          <option value="2 rodadas">2 rodadas</option>
                          <option value="3 rodadas">3 rodadas</option>
                          <option value="1 minuto">1 minuto</option>
                          <option value="10 minutos">10 minutos</option>
                          <option value="1 hora">1 hora</option>
                          <option value="Cena">Cena</option>
                          <option value="Permanente">Permanente</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-txt-dim/60 text-[10px] uppercase tracking-wider mb-1 block">Alcance</label>
                        <select value={customRange} onChange={e => setCustomRange(e.target.value)}
                          className="w-full bg-void border border-sep rounded-lg px-3 py-2 text-sm text-txt-main focus:border-gold/40 outline-none">
                          <option value="Pessoal">Pessoal</option>
                          <option value="Toque">Toque</option>
                          <option value="3m">3m</option>
                          <option value="6m">6m</option>
                          <option value="9m">9m</option>
                          <option value="12m">12m</option>
                          <option value="18m">18m</option>
                          <option value="Cone 6m">Cone 6m</option>
                          <option value="Cone 9m">Cone 9m</option>
                          <option value="Area 6m">Area 6m</option>
                          <option value="Area 12m">Area 12m</option>
                          <option value="Linha 18m">Linha 18m</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-txt-dim/60 text-[10px] uppercase tracking-wider mb-1 block">Regente</label>
                      <select value={customEntity} onChange={e => setCustomEntity(e.target.value)}
                        className="w-full bg-void border border-sep rounded-lg px-3 py-2 text-sm text-txt-main focus:border-gold/40 outline-none">
                        <option value="">Nenhum</option>
                        {ENTIDADES_OUTRO_LADO.map(ent => (
                          <option key={ent.id} value={ent.name}>{ent.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-txt-dim/60 text-[10px] uppercase tracking-wider mb-1 block">Categoria (opcional)</label>
                      <input type="text" value={customCategory} onChange={e => setCustomCategory(e.target.value)} placeholder="Ex: Ofensiva, Defensiva, Suporte..."
                        className="w-full bg-void border border-sep rounded-lg px-3 py-2 text-sm text-txt-main focus:border-gold/40 outline-none" />
                    </div>
                    <div>
                      <label className="text-txt-dim/60 text-[10px] uppercase tracking-wider mb-1 block">Conceito / Descricao curta</label>
                      <textarea value={customDesc} onChange={e => setCustomDesc(e.target.value)} rows={2}
                        placeholder="Uma frase descrevendo a essencia do ritual..."
                        className="w-full bg-void border border-sep rounded-lg px-3 py-2 text-sm text-txt-main focus:border-gold/40 outline-none resize-none" />
                    </div>
                    <div>
                      <label className="text-txt-dim/60 text-[10px] uppercase tracking-wider mb-1 block">Efeito completo</label>
                      <textarea value={customEffect} onChange={e => setCustomEffect(e.target.value)} rows={4}
                        placeholder="Descreva o efeito mecanico detalhado: dados, CD, condicoes, duracoes, contrapesos..."
                        className="w-full bg-void border border-sep rounded-lg px-3 py-2 text-sm text-txt-main focus:border-gold/40 outline-none resize-none" />
                    </div>

                    {customError && <p className="text-err text-xs">{customError}</p>}

                    <button type="button" onClick={analyzeCustomRitual} disabled={customAnalyzing || shotsLeft <= 0 || grimorioSlotsLeft <= 0}
                      className={`w-full py-2.5 rounded-lg text-xs font-semibold transition-colors active:scale-[0.99] ${
                        customAnalyzing ? 'bg-purple-500/10 text-purple-300/50 cursor-wait' : 'bg-purple-500/15 text-purple-300 border border-purple-500/25 hover:bg-purple-500/25'
                      }`}>
                      {customAnalyzing ? 'Analisando com Oraculo...' : shotsLeft <= 0 ? 'Sem tiros de criacao' : grimorioSlotsLeft <= 0 ? 'Grimorio Cheio' : 'Analisar com Oraculo'}
                    </button>
                  </>
                ) : customMode === 'feedback' && customResult ? (
                  <>
                    <div className="border border-purple-500/20 rounded-xl bg-purple-500/5 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-purple-300 text-xs font-semibold">Veredito do Oraculo</span>
                        <span className={`text-[9px] border rounded-full px-1.5 py-0.5 ${CIRCLE_BADGE[customResult.circle || customCircle] || CIRCLE_BADGE[1]}`}>
                          {customResult.circle || customCircle}o
                        </span>
                      </div>

                      <div className="border border-gold/20 rounded-lg bg-gold/5 p-3 space-y-2">
                        <h4 className="text-gold text-[10px] uppercase tracking-wider">Ritual Definitivo</h4>
                        <h4 className="text-txt-main font-semibold text-sm">{customResult.name || customName}</h4>
                        {customResult.short_description && <p className="text-txt-dim text-xs leading-relaxed">{customResult.short_description}</p>}
                        {customResult.effect && <p className="text-txt-dim/60 text-[11px] leading-relaxed whitespace-pre-line">{customResult.effect}</p>}
                        <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                          <span className="text-amber-300">{customResult.pe_cost || customPeCost} PE</span>
                          {usesEnergia && <span className="text-sky-300">{customResult.pe_cost || customPeCost} Energia</span>}
                          {customResult.action_cost && <span className="text-purple-300">{customResult.action_cost}</span>}
                          {customResult.duration && <span className="text-sky-300">{customResult.duration}</span>}
                          {customResult.range && <span className="text-txt-dim">{customResult.range}</span>}
                        </div>
                        {customResult.ai_notes && <p className="text-txt-dim/40 text-[10px] italic border-t border-sep/10 pt-2">{customResult.ai_notes}</p>}
                      </div>

                      {customError && <p className="text-err text-xs">{customError}</p>}

                      <button type="button" onClick={confirmCustomRitual}
                        className="w-full py-2 rounded-lg bg-gold/15 text-gold text-xs font-semibold border border-gold/25 hover:bg-gold/25 transition-colors active:scale-[0.99]">
                        Confirmar Ritual
                      </button>
                      <button type="button" onClick={resetCustomForm}
                        className="w-full py-2 rounded-lg text-txt-dim/50 text-xs hover:text-txt-dim transition-colors">
                        Cancelar e refazer
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {tab === 'library' && inspectedRitual && (
          <div className="w-80 shrink-0 border-l border-sep/20 bg-[#080a12] overflow-y-auto">
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] border rounded-full px-1.5 py-0.5 ${CIRCLE_BADGE[inspectedRitual.circle] || CIRCLE_BADGE[1]}`}>{inspectedRitual.circle}o</span>
                  <span className="text-txt-dim text-[10px]">{inspectedRitual.category || '—'}</span>
                </div>
                <button type="button" onClick={() => setInspectId(null)} className="text-txt-dim/50 hover:text-txt-main text-xs">×</button>
              </div>
              <h4 className="text-txt-main font-semibold leading-tight">{inspectedRitual.name}</h4>
              {inspectedRitual.short_description && <p className="text-txt-dim text-xs leading-relaxed">{inspectedRitual.short_description}</p>}
              {inspectedRitual.effect && <p className="text-txt-dim/60 text-[11px] leading-relaxed">{inspectedRitual.effect}</p>}
              <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                <span className="text-amber-300">{inspectedRitual.pe_cost || 0} PE</span>
                {usesEnergia && <span className="text-sky-300">{inspectedRitual.pe_cost || 0} Energia</span>}
                <span className="text-gold">{SPACE_COST[inspectedRitual.circle] || 0} espaços</span>
              </div>
              {inspectedRitual.action_cost && <div className="text-[10px] font-mono text-purple-300">{inspectedRitual.action_cost}</div>}
              {inspectedRitual.duration && <div className="text-[10px] font-mono text-sky-300">{inspectedRitual.duration}</div>}
              {inspectedRitual.range && <div className="text-[10px] font-mono text-txt-dim">{inspectedRitual.range}</div>}
              {inspectedRitual.regent && <div className="text-[10px] font-mono text-emerald-400/70 border-t border-white/5 pt-2 mt-1">{ENTIDADES_OUTRO_LADO.find(e => e.id === inspectedRitual.regent)?.name || inspectedRitual.regent}</div>}
              <button type="button"
                disabled={selected.some(r => r.id === inspectedRitual.id)}
                onClick={() => addRitual(inspectedRitual)}
                className={`w-full grimoire-entry-card button mt-2 ${selected.some(r => r.id === inspectedRitual.id) ? 'opacity-50 cursor-default' : 'hover:brightness-110'}`}>
                {selected.some(r => r.id === inspectedRitual.id) ? '✓ Selecionado' : 'Selecionar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

function GrimorioPickerModal({ char, update, card, onClose }) {
  const availableTiers = getAvailableGrimorioTiers(char, card.key)
  const accessTier = getGrimorioAccessTier(char, card.key)
  const existingGrimorios = (char.grimorios || []).filter(g => g.knowledgeKey === card.key)
  const allRituals = char[card.field] || []
  const maxGrimorios = getMaxGrimorios(char, card.key)
  const grimoriosLeft = Math.max(0, maxGrimorios - existingGrimorios.length)

  const [mode, setMode] = useState('list')
  const [name, setName] = useState('Grimório em Branco')
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editImage, setEditImage] = useState('')
  const [editUploading, setEditUploading] = useState(false)

  if (!accessTier) return null

  function startEdit(grimorio) {
    setEditingId(grimorio.id)
    setEditName(grimorio.name || '')
    setEditImage(grimorio.image || '')
    setMode('edit')
  }

  function saveEdit() {
    if (!update || !editingId) return
    const grimorios = (char.grimorios || []).map(g => {
      if (g.id !== editingId) return g
      return { ...g, name: editName.trim() || g.name, image: editImage.trim() }
    })
    update({ grimorios })
    setEditingId(null)
    setMode('list')
  }

  function createGrimorio() {
    if (!update) return
    if (!accessTier) return
    const tier = GRIMORIO_TIERS.find(t => t.id === accessTier)
    if (!tier) return
    const grimorioName = name.trim() || 'Grimório em Branco'
    const newGrimorio = {
      id: crypto.randomUUID(),
      knowledgeKey: card.key,
      tier: tier.id,
      name: grimorioName,
      image: imageUrl.trim() || '',
      maxCircle: tier.maxCircle,
      maxRituals: 30,
      isPersonal: true,
      createdAt: new Date().toISOString(),
    }
    const currentGrimorios = char.grimorios || []
    update({ grimorios: [...currentGrimorios, newGrimorio] })
    setName('Grimório em Branco')
    setImageUrl('')
    setMode('list')
  }

  function removeGrimorio(grimorioId) {
    if (!update) return
    update({ grimorios: (char.grimorios || []).filter(g => g.id !== grimorioId) })
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg max-h-[80vh] bg-[#0a0c14] border border-sep/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-sep/20">
          <div className="flex items-center gap-3">
            <span className={`text-xl ${card.accentClass}`}>{card.icon}</span>
            <h3 className="font-cinzel text-sm uppercase tracking-wider font-semibold text-txt-main">
              {mode === 'edit' ? 'Editar Grimório' : mode === 'create' ? 'Novo Grimório' : `Grimórios de ${card.title}`}
            </h3>
          </div>
          <button type="button" onClick={() => mode === 'list' ? onClose() : setMode('list')}
            className="text-txt-dim hover:text-txt-main text-lg transition-colors">{mode === 'list' ? '×' : '←'}</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {mode === 'list' && (
            <>
              <div>
                <h4 className="text-txt-dim text-xs font-semibold uppercase tracking-wider mb-3">Grimórios Atuais <span className="text-gold/60 font-mono">{existingGrimorios.length}/{maxGrimorios}</span></h4>
                {existingGrimorios.length === 0 ? (
                  <p className="text-txt-dim/40 text-xs italic">Nenhum grimório criado.</p>
                ) : (
                  <div className="space-y-2">
                    {existingGrimorios.map(g => {
                      const tier = GRIMORIO_TIERS.find(t => t.id === g.tier)
                      const maxRituals = getGrimorioMaxRituals(g)
                      const ritualCount = allRituals.filter(r => r.grimorioId === g.id).length
                      return (
                        <div key={g.id} className="flex items-center gap-3 p-3 rounded-lg border border-sep/15 bg-void/30">
                          <div className="w-10 h-12 rounded bg-void/50 border border-sep/20 flex items-center justify-center shrink-0 overflow-hidden">
                            {g.image ? <img src={g.image} alt="" className="w-full h-full object-cover" /> : <span className="opacity-30">{card.icon}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-txt-main text-xs font-semibold truncate">{g.name}</p>
                            <p className="text-txt-dim/50 text-[10px]">{tier?.name || 'Personalizado'} — 1o-{g.maxCircle}o — {ritualCount}/{maxRituals} rituais</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {update && (
                              <button type="button" onClick={() => startEdit(g)}
                                className="text-sky-400/60 hover:text-sky-400 text-[10px] transition-colors">Editar</button>
                            )}
                            {update && (
                              <button type="button" onClick={() => removeGrimorio(g.id)}
                                className="text-err/40 hover:text-err text-[10px] transition-colors">Excluir</button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              {update && availableTiers.length > 0 && grimoriosLeft > 0 && (
                <button type="button" onClick={() => { setMode('create'); setName('Grimório em Branco'); setImageUrl('') }}
                  className="w-full py-2.5 rounded-lg bg-gold/15 text-gold text-xs font-semibold border border-gold/25 hover:bg-gold/25 transition-colors active:scale-[0.99]">
                  + Criar Novo Grimório ({grimoriosLeft} restante{grimoriosLeft !== 1 ? 's' : ''})
                </button>
              )}
              {existingGrimorios.length > 0 && existingGrimorios.length >= maxGrimorios && (
                <p className="text-txt-dim/40 text-[10px] text-center italic">Limite de {maxGrimorios} grimório{maxGrimorios !== 1 ? 's' : ''} atingido</p>
              )}
            </>
          )}

          {mode === 'create' && (
            <div className="space-y-3">
              {(() => {
                const tier = GRIMORIO_TIERS.find(t => t.id === accessTier)
                return (
                  <>
                    <div className="bg-gold/5 border border-gold/15 rounded-lg p-3 text-center">
                      <span className="text-gold text-xs font-semibold">{tier?.name || 'Grimório Pessoal'}</span>
                      <span className="text-txt-dim text-[10px] font-mono block mt-0.5">Círculos 1o–{tier?.maxCircle || 2}o — Máx. 30 rituais — Afinidade atual: {getScoreForDisplay(char, card.key)}</span>
                    </div>
                    <div>
                      <label className="text-txt-dim/60 text-[10px] uppercase tracking-wider mb-1 block">Nome do Grimório</label>
                      <input type="text" value={name} onChange={e => setName(e.target.value)}
                        placeholder="Grimório em Branco"
                        className="w-full bg-void border border-sep rounded-lg px-3 py-2 text-sm text-txt-main focus:border-gold/40 outline-none" />
                    </div>
                    <button type="button" onClick={createGrimorio}
                      className="w-full py-2.5 rounded-lg text-xs font-semibold transition-colors active:scale-[0.99] bg-gold/15 text-gold border border-gold/25 hover:bg-gold/25">
                      Criar Grimório
                    </button>
                  </>
                )
              })()}
            </div>
          )}

          {mode === 'edit' && editingId && (() => {
            const g = existingGrimorios.find(x => x.id === editingId)
            if (!g) return null
            const tier = GRIMORIO_TIERS.find(t => t.id === g.tier)
            return (
              <div className="space-y-3">
                <div className="text-txt-dim/40 text-[10px] font-mono">{tier?.name || 'Personalizado'} — Círculos 1o-{g.maxCircle}o</div>
                <div>
                  <label className="text-txt-dim/60 text-[10px] uppercase tracking-wider mb-1 block">Nome</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                    className="w-full bg-void border border-sep rounded-lg px-3 py-2 text-sm text-txt-main focus:border-gold/40 outline-none" />
                </div>
                <ImageUploadField value={editImage} onChange={setEditImage} uploading={editUploading} onUploadError={() => {}} />
                <button type="button" onClick={saveEdit}
                  className="w-full py-2.5 rounded-lg bg-sky-500/15 text-sky-300 text-xs font-semibold border border-sky-500/25 hover:bg-sky-500/25 transition-colors active:scale-[0.99]">
                  Salvar Alterações
                </button>
              </div>
            )
          })()}
        </div>
      </div>
    </div>,
    document.body
  )
}

export function MysticKnowledgePanel({ char, update, canEdit }) {
  const systemOptIn = char.systemsOptIn || {}
  const spellProfile = getSpellProfile(char)
  const runeProfile = getRuneProfile(char)
  const alchemyProfile = getAlchemyProfile(char)
  const magicProfile = getMagicProfile(char)
  const alchemyEnabled = alchemyProfile.hasAccess && (systemOptIn.alchemy || (char.alchemyRituals || []).length > 0)
  const spellsEnabled = spellProfile.hasAccess && (systemOptIn.spells || (char.spells || []).length > 0)
  const runesEnabled = runeProfile.hasAccess && (systemOptIn.runes || (char.runes || []).length > 0)
  const magicEnabled = magicProfile.hasAccess && (systemOptIn.magic || (char.magics || []).length > 0)

  return (
    <MysticKnowledgeGrid char={char} update={update} canEdit={canEdit} alchemyProfile={alchemyProfile} spellProfile={spellProfile} runeProfile={runeProfile} magicProfile={magicProfile} alchemyEnabled={alchemyEnabled} spellsEnabled={spellsEnabled} runesEnabled={runesEnabled} magicEnabled={magicEnabled} systemOptIn={systemOptIn} />
  )
}
