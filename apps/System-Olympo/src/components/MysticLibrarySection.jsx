import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { getTagValue, normalizeTags } from '../utils/mysticTagHelpers'

const CIRCLE_LABELS = {
  1: '1o Circulo',
  2: '2o Circulo',
  3: '3o Circulo',
  4: '4o Circulo',
}

const CIRCLE_THEMES = {
  1: {
    badge: 'bg-emerald-400/12 text-emerald-300 border-emerald-400/25',
    border: 'border-emerald-400/30',
    glow: 'bg-emerald-400/10',
    text: 'text-emerald-300',
  },
  2: {
    badge: 'bg-sky-400/12 text-sky-300 border-sky-400/25',
    border: 'border-sky-400/30',
    glow: 'bg-sky-400/10',
    text: 'text-sky-300',
  },
  3: {
    badge: 'bg-purple-400/12 text-purple-300 border-purple-400/25',
    border: 'border-purple-400/30',
    glow: 'bg-purple-400/10',
    text: 'text-purple-300',
  },
  4: {
    badge: 'bg-amber-300/12 text-amber-200 border-amber-300/30',
    border: 'border-amber-300/30',
    glow: 'bg-amber-300/10',
    text: 'text-amber-200',
  },
}

const TONE_CLASSES = {
  emerald: 'text-emerald-300 border-emerald-400/15',
  teal: 'text-teal-300 border-teal-400/15',
  sky: 'text-sky-300 border-sky-400/15',
  purple: 'text-purple-300 border-purple-400/15',
  amber: 'text-amber-200 border-amber-300/15',
  gold: 'text-gold border-gold/15',
  red: 'text-red-300 border-red-400/15',
}

export default function MysticLibrarySection({ char, update, config, compact = false, wide = false }) {
  const {
    field,
    title,
    icon,
    accentClass = 'text-teal-300',
    sectionBorder = 'border-teal-400/20',
    fetchLibrary,
    categories,
    getProfile,
    canLearn,
    normalizeSelected,
    getSpaceCost,
    introText,
    sourceErrorText,
    categoryPlaceholder,
    searchPlaceholder,
    loadingText,
    emptyText,
    emptyInspectorTitle,
    emptyInspectorText,
    itemLabelPlural,
    sourceChipLabel,
    metaLines,
    circleNotes,
    sourceLabelText = 'Origem',
    tagLabel = 'Marcadores',
    hiddenTagPrefixes = [],
    ruleBadges,
    secondaryFilter,
    getSecondaryBadge,
    getInspectorStats,
    getSecondaryAction,
    renderSummary,
  } = config

  const [library, setLibrary] = useState([])
  const [sourceMode, setSourceMode] = useState('database')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [circle, setCircle] = useState('all')
  const [secondaryValue, setSecondaryValue] = useState('all')
  const [activeId, setActiveId] = useState(null)

  const deferredSearch = useDeferredValue(search)
  const selectedItems = char[field] || []
  const profile = getProfile(char)
  const spaceUsed = (selectedItems || []).reduce((sum, item) => sum + getSpaceCost(item.circle), 0)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const res = await fetchLibrary()
      if (!active) return
      setLibrary(res.data || [])
      setSourceMode(res.source || 'database')
      setError(res.error ? sourceErrorText : '')
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [fetchLibrary, sourceErrorText])

  const filtered = useMemo(() => {
    return library.filter((item) => {
      const haystack = `${item.name} ${item.short_description} ${item.effect} ${(item.tags || []).join(' ')} ${item.source_name || ''} ${item.law_name || ''}`.toLowerCase()
      const matchesSearch = !deferredSearch.trim() || haystack.includes(deferredSearch.trim().toLowerCase())
      const matchesCategory = category === 'all' || item.category === category
      const matchesCircle = circle === 'all' || Number(circle) === item.circle
      const matchesSecondary = !secondaryFilter || secondaryValue === 'all' || secondaryFilter.getValue(item) === secondaryValue
      return matchesSearch && matchesCategory && matchesCircle && matchesSecondary
    })
  }, [library, deferredSearch, category, circle, secondaryFilter, secondaryValue])

  useEffect(() => {
    if (!filtered.length) {
      setActiveId(null)
      return
    }
    const preferred = filtered.find((item) => item.id === activeId)
      || filtered.find((item) => selectedItems.some((selected) => selected.id === item.id))
      || filtered[0]
    if (preferred && preferred.id !== activeId) {
      setActiveId(preferred.id)
    }
  }, [filtered, activeId, selectedItems])

  const activeItem = filtered.find((item) => item.id === activeId)
    || library.find((item) => item.id === activeId)
    || selectedItems.find((item) => item.id === activeId)
    || filtered[0]
    || null

  function toggleItem(item) {
    if (!update) return
    const current = selectedItems || []
    const exists = current.some((selected) => selected.id === item.id)
    if (exists) {
      update({ [field]: current.filter((selected) => selected.id !== item.id) })
      return
    }

    const gate = canLearn(char, current, item)
    if (!gate.allowed) {
      alert(gate.reason)
      return
    }

    update({ [field]: [...current, normalizeSelected(item)] })
  }

  const badges = ruleBadges({ char, profile, selectedItems, spaceUsed }) || []

  return (
    <section className={`knowledge-library mystic-grimoire codex-card ${sectionBorder} ${compact ? 'p-4' : 'p-5'} space-y-4`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm ${accentClass}`}>{icon}</span>
            <h3 className={`font-cinzel text-sm uppercase tracking-[0.12em] font-semibold ${accentClass}`}>Grimorio de {title}</h3>
          </div>
          <p className="text-on-surface-variant text-xs max-w-3xl">{introText}</p>
        </div>
        <div className="text-xs text-on-surface-variant space-y-1">
          <div>Fonte: <span className={sourceMode === 'database' ? 'text-emerald-400' : 'text-amber-300'}>{sourceMode === 'database' ? 'Banco' : 'Catalogo local'}</span></div>
          <div>{selectedItems.length} {itemLabelPlural}</div>
        </div>
      </div>

      {badges.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
          {badges.map((badge) => (
            <RuleBadge key={`${badge.label}-${badge.value}`} label={badge.label} value={badge.value} tone={badge.tone} />
          ))}
        </div>
      )}

      {renderSummary ? renderSummary({ char, profile, selectedItems, spaceUsed }) : null}

      {selectedItems.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-on-surface text-sm font-semibold">Selecionados</div>
            <div className="text-[11px] text-on-surface-variant">{spaceUsed}/{profile.spaceBudget || 0} espacos ocupados</div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
            {selectedItems
              .slice()
              .sort((a, b) => a.circle - b.circle || a.name.localeCompare(b.name))
              .map((item) => {
                const theme = CIRCLE_THEMES[item.circle] || CIRCLE_THEMES[1]
                const secondaryBadge = getSecondaryBadge?.(item)
                const secondaryAction = getSecondaryAction?.({ char, item, selectedItems, update, activeItemId: activeItem?.id })
                return (
                  <article
                    key={item.id}
                    onClick={() => setActiveId(item.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setActiveId(item.id)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={`text-left rounded-lg border p-3 cursor-pointer transition-colors ${
                      activeId === item.id ? `${theme.border} ${theme.glow}` : 'border-sep/30 bg-deep/60 hover:border-gold/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-txt-main font-semibold text-sm">{item.name}</span>
                          <CircleBadge circle={item.circle} />
                          <span className="text-[10px] bg-sep/20 text-txt-dim px-1.5 py-0.5 rounded">{item.category}</span>
                          {secondaryBadge && <SecondaryBadge badge={secondaryBadge} />}
                        </div>
                        <p className="text-txt-dim text-xs mt-1">{item.short_description}</p>
                      </div>
                      {update && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(event) => {
                            event.stopPropagation()
                            toggleItem(item)
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              event.stopPropagation()
                              toggleItem(item)
                            }
                          }}
                          className="text-err/70 hover:text-err text-xs"
                        >
                          Remover
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2 text-[11px] font-mono">
                      <span className="text-amber-300">{item.pe_cost} PE</span>
                      <span className="text-gold">{getSpaceCost(item.circle)} espacos</span>
                      <span className="text-sky-300">{item.action_cost}</span>
                      <span className="text-txt-dim">{item.duration}</span>
                    </div>
                    {secondaryAction && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            secondaryAction.onClick()
                          }}
                          disabled={secondaryAction.disabled}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                            secondaryAction.disabled
                              ? 'bg-sep/20 text-txt-dim/50'
                              : secondaryAction.tone === 'active'
                              ? 'bg-sky-400 text-void'
                              : 'border border-sky-400/30 text-sky-300 hover:bg-sky-400/10'
                          }`}
                        >
                          {secondaryAction.label}
                        </button>
                        {secondaryAction.reason && <p className="text-[10px] text-txt-dim mt-1">{secondaryAction.reason}</p>}
                      </div>
                    )}
                  </article>
                )
              })}
          </div>
        </div>
      )}

      <div className={`grid gap-4 ${wide ? 'xl:grid-cols-[minmax(0,1.35fr)_430px]' : 'xl:grid-cols-[minmax(0,1.1fr)_390px]'}`}>
        <div className="space-y-3 min-w-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-on-surface text-sm font-semibold">Biblioteca</div>
            {error && <span className="text-[11px] text-amber-300">{error}</span>}
          </div>

          <div className={`grid gap-2 ${secondaryFilter ? 'grid-cols-1 md:grid-cols-[minmax(0,1fr)_170px_120px_160px]' : 'grid-cols-1 md:grid-cols-[minmax(0,1fr)_180px_130px]'}`}>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-void border border-sep rounded px-3 py-2 text-sm text-txt-main"
            />
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="bg-void border border-sep rounded px-3 py-2 text-sm text-txt-main">
              <option value="all">{categoryPlaceholder}</option>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={circle} onChange={(event) => setCircle(event.target.value)} className="bg-void border border-sep rounded px-3 py-2 text-sm text-txt-main">
              <option value="all">Todos circulos</option>
              {[1, 2, 3, 4].map((item) => <option key={item} value={item}>{CIRCLE_LABELS[item]}</option>)}
            </select>
            {secondaryFilter && (
              <select value={secondaryValue} onChange={(event) => setSecondaryValue(event.target.value)} className="bg-void border border-sep rounded px-3 py-2 text-sm text-txt-main">
                <option value="all">{secondaryFilter.allLabel}</option>
                {secondaryFilter.options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            )}
          </div>

          {loading ? (
            <p className="text-txt-dim text-sm animate-pulse">{loadingText}</p>
          ) : (
            <div className={`grid gap-3 max-h-[760px] overflow-y-auto pr-1 ${wide ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
              {filtered.map((item) => {
                const selected = selectedItems.some((selectedItem) => selectedItem.id === item.id)
                const gate = canLearn(char, selectedItems, item)
                const disabled = !selected && !gate.allowed
                const active = activeItem?.id === item.id
                const theme = CIRCLE_THEMES[item.circle] || CIRCLE_THEMES[1]
                const secondaryBadge = getSecondaryBadge?.(item)

                return (
                  <article
                    key={item.id}
                    onClick={() => setActiveId(item.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setActiveId(item.id)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={`text-left rounded-lg border p-4 transition-colors cursor-pointer ${
                      active
                        ? `${theme.border} ${theme.glow}`
                        : selected
                        ? `${sectionBorder} bg-gold/[0.035]`
                        : disabled
                        ? 'border-sep/30 bg-void/50 opacity-60'
                        : 'border-sep/40 bg-deep/60 hover:border-gold/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-txt-main text-sm font-semibold">{item.name}</h4>
                          <CircleBadge circle={item.circle} />
                          <span className="text-[10px] bg-sep/20 text-txt-dim px-1.5 py-0.5 rounded">{item.category}</span>
                          {secondaryBadge && <SecondaryBadge badge={secondaryBadge} />}
                          <span className="text-[10px] bg-purple-400/10 text-purple-300 px-1.5 py-0.5 rounded border border-purple-400/20">
                            {sourceChipLabel(item)}
                          </span>
                        </div>
                        <p className="text-txt-dim text-xs mt-1 leading-relaxed">{item.short_description}</p>
                      </div>
                      {update && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(event) => {
                            event.stopPropagation()
                            toggleItem(item)
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              event.stopPropagation()
                              toggleItem(item)
                            }
                          }}
                          className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                            selected ? 'bg-teal-400 text-void' : disabled ? 'bg-sep/30 text-txt-dim/50 cursor-not-allowed' : 'border border-teal-400/30 text-teal-300 hover:bg-teal-400/10'
                          }`}
                        >
                          {selected ? 'Selecionado' : 'Aprender'}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3 text-[11px] font-mono">
                      <span className="text-amber-300">{item.pe_cost} PE</span>
                      <span className="text-gold">{getSpaceCost(item.circle)} espacos</span>
                      <span className="text-sky-300">{item.action_cost}</span>
                      <span className="text-txt-dim">{item.duration}</span>
                      <span className="text-purple-300">SCP {item.protocol_layer}</span>
                      <span className="text-red-300">Risco {item.rupture_risk}/4</span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-1.5 text-xs">
                      {metaLines(item).map((line) => (
                        <MetaLine key={`${item.id}-${line.label}`} label={line.label} value={line.value} />
                      ))}
                    </div>

                    {disabled && <p className="text-err text-[11px] mt-3">{gate.reason}</p>}
                  </article>
                )
              })}

              {filtered.length === 0 && (
                <div className="text-txt-dim text-sm italic py-6">{emptyText}</div>
              )}
            </div>
          )}
        </div>

        <aside className="xl:sticky xl:top-4 self-start">
          <MysticInspector
            item={activeItem}
            selected={selectedItems.some((selectedItem) => selectedItem.id === activeItem?.id)}
            update={update}
            onToggle={toggleItem}
            char={char}
            selectedItems={selectedItems}
            profile={profile}
            config={config}
            emptyInspectorTitle={emptyInspectorTitle}
            emptyInspectorText={emptyInspectorText}
            getSpaceCost={getSpaceCost}
            sourceLabelText={sourceLabelText}
            circleNotes={circleNotes}
            sourceChipLabel={sourceChipLabel}
            metaLines={metaLines}
            hiddenTagPrefixes={hiddenTagPrefixes}
            tagLabel={tagLabel}
            canLearn={canLearn}
            getSecondaryBadge={getSecondaryBadge}
            getInspectorStats={getInspectorStats}
            getSecondaryAction={getSecondaryAction}
          />
        </aside>
      </div>
    </section>
  )
}

function MysticInspector({
  item,
  selected,
  update,
  onToggle,
  char,
  selectedItems,
  profile,
  config,
  emptyInspectorTitle,
  emptyInspectorText,
  getSpaceCost,
  sourceLabelText,
  circleNotes,
  sourceChipLabel,
  metaLines,
  hiddenTagPrefixes,
  tagLabel,
  canLearn,
  getSecondaryBadge,
  getInspectorStats,
  getSecondaryAction,
}) {
  if (!item) {
    return (
      <div className="bg-deep/70 border border-sep/40 rounded-xl p-4 min-h-[280px] flex items-center justify-center text-center">
        <div>
          <div className={`text-lg mb-2 ${config.accentClass || 'text-teal-300'}`}>{config.icon}</div>
          <p className="text-txt-main text-sm font-semibold">{emptyInspectorTitle}</p>
          <p className="text-txt-dim text-xs mt-1">{emptyInspectorText}</p>
        </div>
      </div>
    )
  }

  const gate = canLearn(char, selectedItems, item)
  const disabled = !selected && !gate.allowed
  const theme = CIRCLE_THEMES[item.circle] || CIRCLE_THEMES[1]
  const visibleTags = normalizeTags(item.tags).filter((tag) => !hiddenTagPrefixes.some((prefix) => tag.toLowerCase().startsWith(`${prefix.toLowerCase()}:`)))
  const secondaryBadge = getSecondaryBadge?.(item)
  const secondaryAction = getSecondaryAction?.({ char, item, selectedItems, update, activeItemId: item.id })
  const extraStats = getInspectorStats?.({ item, profile, selectedItems, char }) || []

  return (
    <div className={`bg-deep/90 border rounded-xl p-4 space-y-4 shadow-2xl shadow-black/20 ${theme.border}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-cinzel text-txt-main text-lg leading-tight">{item.name}</h4>
            <CircleBadge circle={item.circle} />
            <span className="text-[10px] bg-sep/20 text-txt-dim px-1.5 py-0.5 rounded">{item.category}</span>
            {secondaryBadge && <SecondaryBadge badge={secondaryBadge} />}
          </div>
          <p className="text-txt-dim text-xs mt-2 leading-relaxed">{item.short_description}</p>
        </div>
        <span className="text-[10px] bg-purple-400/10 text-purple-300 px-1.5 py-0.5 rounded border border-purple-400/20">
          {sourceChipLabel(item)}
        </span>
      </div>

      <div className={`rounded-lg border px-3 py-2 ${theme.border} ${theme.glow}`}>
        <div className={`text-[11px] font-semibold uppercase tracking-[0.12em] mb-1 ${theme.text}`}>Leitura do circulo</div>
        <p className="text-txt-dim text-xs leading-relaxed">{circleNotes[item.circle]}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <InspectorBox label="PE" value={`${item.pe_cost} PE`} color="text-amber-300" />
        <InspectorBox label="Espacos" value={`${getSpaceCost(item.circle)}/${profile.spaceBudget || 0}`} color="text-gold" />
        <InspectorBox label="Nivel minimo" value={`N${item.min_level || 1}`} color="text-sky-300" />
        <InspectorBox label="Acao" value={item.action_cost} color="text-txt-main" />
        <InspectorBox label="Duracao" value={item.duration} color="text-gold" />
        <InspectorBox label="Alcance" value={item.range} color="text-txt-main" />
        <InspectorBox label="Risco" value={`${item.rupture_risk}/4`} color="text-red-300" />
        <InspectorBox label="SCP" value={`Camada ${item.protocol_layer}`} color="text-purple-300" />
        {extraStats.map((stat) => (
          <InspectorBox key={stat.label} label={stat.label} value={stat.value} color={stat.color} />
        ))}
      </div>

      <div className="space-y-2 text-xs">
        <MetaLine label={sourceLabelText} value={`${item.source_name || 'Sem fonte'}`} />
        {metaLines(item).map((line) => <MetaLine key={`${item.id}-${line.label}`} label={line.label} value={line.value} />)}
      </div>

      <div className="bg-void/60 border border-sep/30 rounded-lg p-3">
        <div className="text-txt-main text-sm font-semibold mb-2">Efeito</div>
        <p className="text-txt-dim text-xs leading-relaxed whitespace-pre-wrap">
          <HighlightedEffectText text={item.effect} category={item.category} />
        </p>
      </div>

      {item.price && (
        <div className="bg-amber-300/5 border border-amber-300/15 rounded-lg p-3">
          <div className="text-amber-300 text-sm font-semibold mb-2">Preco / Contrapeso</div>
          <p className="text-txt-dim text-xs leading-relaxed">{item.price}</p>
        </div>
      )}

      {visibleTags.length > 0 && (
        <div>
          <div className="text-txt-main text-sm font-semibold mb-2">{tagLabel}</div>
          <div className="flex flex-wrap gap-1.5">
            {visibleTags.map((tag) => (
              <span key={tag} className="text-[10px] bg-void/60 text-txt-dim px-2 py-0.5 rounded-full border border-sep/40">{tag}</span>
            ))}
          </div>
        </div>
      )}

      {update && (
        <div className="pt-2 border-t border-sep/30 space-y-2">
          <button
            type="button"
            onClick={() => onToggle(item)}
            disabled={disabled}
            className={`w-full px-4 py-2 rounded text-sm font-semibold transition-colors ${
              selected ? 'bg-teal-400 text-void' : disabled ? 'bg-sep/30 text-txt-dim/50 cursor-not-allowed' : 'border border-teal-400/30 text-teal-300 hover:bg-teal-400/10'
            }`}
          >
            {selected ? 'Selecionado' : 'Aprender Este Registro'}
          </button>
          {secondaryAction && (
            <button
              type="button"
              onClick={() => secondaryAction.onClick()}
              disabled={secondaryAction.disabled}
              className={`w-full px-4 py-2 rounded text-sm font-semibold transition-colors ${
                secondaryAction.disabled
                  ? 'bg-sep/20 text-txt-dim/50'
                  : secondaryAction.tone === 'active'
                  ? 'bg-sky-400 text-void'
                  : 'border border-sky-400/30 text-sky-300 hover:bg-sky-400/10'
              }`}
            >
              {secondaryAction.label}
            </button>
          )}
          {disabled && <p className="text-err text-[11px]">{gate.reason}</p>}
          {secondaryAction?.reason && <p className="text-[11px] text-txt-dim">{secondaryAction.reason}</p>}
        </div>
      )}
    </div>
  )
}

export function HighlightedEffectText({ text, category }) {
  const chunks = String(text || '').split(/(\s+)/)
  return chunks.map((chunk, index) => {
    if (/^\s+$/.test(chunk)) return chunk

    const clean = chunk.replace(/[.,;:()]/g, '')
    const lower = clean.toLowerCase()
    const prev = (chunks[index - 2] || '').toLowerCase()
    const next = (chunks[index + 2] || '').toLowerCase()
    const context = `${prev} ${lower} ${next} ${String(category || '').toLowerCase()}`

    let className = ''
    if (/^\d+\s*PE$/.test(clean) || lower === 'pe' || lower === 'energia') className = 'text-amber-300 font-semibold'
    else if (/^\d+d\d+(\+\d+)?$/.test(clean) || /^\d+%$/.test(clean) || /^\d+$/.test(clean)) {
      if (/cura|recuper|regenera|vida|hp|purifica/.test(context)) className = 'text-emerald-300 font-semibold'
      else if (/dano|atingid|alvo|explos|golpe|feriment|ataque|debuff|drain|dren|luz|ignio|arcano|concussivo/.test(context) || /ataque|controle/.test(String(category || '').toLowerCase())) className = 'text-red-300 font-semibold'
      else if (/rodada|rodadas|turno|turnos|minuto|minutos|cena|horas/.test(context)) className = 'text-gold font-semibold'
      else className = 'text-sky-300 font-semibold'
    } else if (/^\d+m$/.test(clean)) className = 'text-sky-300 font-semibold'
    else if (/^\d+\s*(rodadas?|turnos?|minutos?|horas?)$/.test(clean)) className = 'text-gold font-semibold'

    return className ? <span key={`${chunk}-${index}`} className={className}>{chunk}</span> : chunk
  })
}

function RuleBadge({ label, value, tone = 'teal' }) {
  return (
    <div className={`bg-deep/70 border rounded-lg px-3 py-2 ${TONE_CLASSES[tone] || TONE_CLASSES.teal}`}>
      <div className="text-[10px] uppercase tracking-[0.12em] text-txt-dim">{label}</div>
      <div className="font-mono text-sm font-semibold mt-1">{value}</div>
    </div>
  )
}

function InspectorBox({ label, value, color = 'text-txt-main' }) {
  return (
    <div className="bg-void/55 border border-sep/30 rounded-lg px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.12em] text-txt-dim">{label}</div>
      <div className={`text-xs font-semibold mt-1 ${color}`}>{value}</div>
    </div>
  )
}

function CircleBadge({ circle }) {
  const theme = CIRCLE_THEMES[circle] || CIRCLE_THEMES[1]
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${theme.badge}`}>
      {CIRCLE_LABELS[circle]}
    </span>
  )
}

function MetaLine({ label, value }) {
  return (
    <div>
      <span className="text-txt-dim">{label}: </span>
      <span className="text-txt-main">{value}</span>
    </div>
  )
}

function SecondaryBadge({ badge }) {
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${badge.className}`}>
      {badge.label}
    </span>
  )
}

export function getTraditionBadge(item) {
  const tradition = getTagValue(item.tags, 'tradition')
  if (!tradition) return null
  const className = tradition === 'arcana'
    ? 'bg-sky-400/12 text-sky-300 border-sky-400/25'
    : 'bg-emerald-400/12 text-emerald-300 border-emerald-400/25'
  return {
    label: tradition === 'arcana' ? 'Arcana' : 'Bruxaria',
    className,
  }
}

export function getRuneGradeBadge(item) {
  const grade = getTagValue(item.tags, 'grade')
  if (!grade) return null
  const map = {
    menor: { label: 'Runa Menor', className: 'bg-emerald-400/12 text-emerald-300 border-emerald-400/25' },
    comum: { label: 'Runa Comum', className: 'bg-sky-400/12 text-sky-300 border-sky-400/25' },
    maior: { label: 'Runa Maior', className: 'bg-amber-300/12 text-amber-200 border-amber-300/30' },
  }
  return map[grade] || null
}
