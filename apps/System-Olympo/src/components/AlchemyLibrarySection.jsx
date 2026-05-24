import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { fetchAlchemyRituals } from '../services/alchemyService'
import { ALCHEMY_CATEGORIES } from '../data/alchemyFallbackRituals'
import { REGENTES, getRegenteId, getRegenteById, getRegenteAffinity, REGENTE_AFFINITY_TIERS } from '../data/regentes'
import {
  SPACE_COST_BY_CIRCLE,
  canLearnAlchemyRitual,
  getAlchemyProfile,
  getAlchemyRitualSpaceCost,
  getAlchemySpaceUsed,
  normalizeSelectedAlchemyRitual,
} from '../utils/alchemyRules'

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

const SOURCE_LABELS = {
  regente: 'Regente',
  limiar: 'Limiar',
  neutro: 'Neutro',
}

const CIRCLE_NOTES = {
  1: 'Formulas taticas de baixo risco. Custam poucos PE e ocupam 4 espacos.',
  2: 'Rituais consistentes de combate e suporte. Custam 6 espacos e cobram mais preparo.',
  3: 'Rituais pesados. Cada escolha custa 10 espacos e precisa de treino real em Alquimia.',
  4: 'Rituais catastroficos. Cada formula custa 15 espacos e tende a tocar a Camada 3.',
}

export default function AlchemyLibrarySection({ char, update, compact = false, wide = false }) {
  const [library, setLibrary] = useState([])
  const [sourceMode, setSourceMode] = useState('database')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [circle, setCircle] = useState('all')
  const [activeId, setActiveId] = useState(null)

  const deferredSearch = useDeferredValue(search)
  const selectedRituals = char.alchemyRituals || []
  const profile = getAlchemyProfile(char)
  const spaceUsed = getAlchemySpaceUsed(selectedRituals)
  const spaceRemaining = Math.max(0, profile.spaceBudget - spaceUsed)
  const regenteAffinities = useMemo(() => getRegenteAffinity(selectedRituals), [selectedRituals])
  const regenteCounts = useMemo(() => {
    const counts = {}
    for (const r of REGENTES) counts[r.id] = { regente: r, count: 0 }
    for (const ritual of selectedRituals) {
      const rid = getRegenteId(ritual)
      if (rid && counts[rid]) counts[rid].count++
    }
    return counts
  }, [selectedRituals])

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const res = await fetchAlchemyRituals()
      if (!active) return
      setLibrary(res.data || [])
      setSourceMode(res.source || 'database')
      setError(res.error ? 'Biblioteca do banco indisponivel. Exibindo catalogo local de apoio.' : '')
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [])

  const filtered = useMemo(() => {
    return library.filter((ritual) => {
      const haystack = `${ritual.name} ${ritual.short_description} ${ritual.effect} ${(ritual.tags || []).join(' ')} ${(ritual.source_name || '')} ${(ritual.law_name || '')}`.toLowerCase()
      const matchesSearch = !deferredSearch.trim() || haystack.includes(deferredSearch.trim().toLowerCase())
      const matchesCategory = category === 'all' || ritual.category === category
      const matchesCircle = circle === 'all' || Number(circle) === ritual.circle
      return matchesSearch && matchesCategory && matchesCircle
    })
  }, [library, deferredSearch, category, circle])

  useEffect(() => {
    if (!filtered.length) {
      setActiveId(null)
      return
    }
    const preferred = filtered.find((ritual) => ritual.id === activeId)
      || filtered.find((ritual) => selectedRituals.some((item) => item.id === ritual.id))
      || filtered[0]
    if (preferred && preferred.id !== activeId) {
      setActiveId(preferred.id)
    }
  }, [filtered, activeId, selectedRituals])

  const activeRitual = filtered.find((ritual) => ritual.id === activeId)
    || library.find((ritual) => ritual.id === activeId)
    || selectedRituals.find((ritual) => ritual.id === activeId)
    || filtered[0]
    || null

  function toggleRitual(ritual) {
    if (!update) return

    const current = selectedRituals || []
    const exists = current.some((item) => item.id === ritual.id)
    if (exists) {
      update({ alchemyRituals: current.filter((item) => item.id !== ritual.id) })
      return
    }

    const gate = canLearnAlchemyRitual(char, current, ritual)
    if (!gate.allowed) {
      alert(gate.reason)
      return
    }

    update({
      alchemyRituals: [...current, normalizeSelectedAlchemyRitual(ritual)],
    })
  }

  return (
    <section className={`knowledge-library codex-card border-teal-400/20 ${compact ? 'p-4' : 'p-5'} space-y-4`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-teal-300 text-sm">⚗</span>
            <h3 className="font-cinzel text-teal-300 text-sm uppercase tracking-[0.12em] font-semibold">Rituais de Alquimia</h3>
          </div>
          <p className="text-on-surface-variant text-xs max-w-3xl">
            Aqui o limite nao e um numero fixo de rituais. Cada personagem recebe um orcamento de espacos alquimicos e cada circulo consome uma parte desse total.
          </p>
        </div>
        <div className="text-xs text-on-surface-variant space-y-1">
          <div>Fonte: <span className={sourceMode === 'database' ? 'text-emerald-400' : 'text-amber-300'}>{sourceMode === 'database' ? 'Banco' : 'Catalogo local'}</span></div>
          <div>{selectedRituals.length} ritual(is) selecionado(s)</div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
        <RuleBadge label="Treino em Alquimia" value={`${profile.trainingLabel}`} tone="teal" />
        <RuleBadge label="Espacos" value={`${spaceUsed}/${profile.spaceBudget}`} tone={spaceUsed >= profile.spaceBudget ? 'amber' : 'teal'} />
        <RuleBadge label="Restantes" value={spaceRemaining} tone={spaceRemaining > 0 ? 'emerald' : 'amber'} />
        <RuleBadge label="Circulo Maximo" value={`${profile.maxCircle}o`} tone="purple" />
        <RuleBadge label="4o Circulo" value={profile.maxByCircle[4]} tone="amber" />
        <RuleBadge label="Custos" value="4 / 6 / 10 / 15" tone="gold" />
      </div>

      {regenteAffinities.length > 0 && (
        <div className="bg-void/60 border border-gold/20 rounded-lg p-3 space-y-2">
          <div className="text-[11px] uppercase tracking-[0.12em] text-gold font-semibold">Afinidade de Regente</div>
          <p className="text-txt-dim text-xs">Acumular rituais do mesmo regente concede afinidade e bonus permanentes.</p>
          {regenteAffinities.map(a => (
            <div key={a.regentId} className="flex items-center gap-3 bg-gold/5 border border-gold/15 rounded-lg px-3 py-2">
              <span className={`text-sm ${a.regente.color}`}>{a.regente.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-gold text-xs font-semibold">{a.tier.name}</span>
                  <span className={`text-[10px] border rounded-full px-1.5 py-0.5 ${a.regente.badge}`}>{a.regente.shortName}</span>
                  <span className="text-txt-dim text-[10px]">{a.ritualCount} rituais</span>
                </div>
                <div className="flex gap-3 mt-1 text-[10px]">
                  <span className="text-amber-300">-{a.tier.peDiscount} PE em rituais deste regente</span>
                  <span className="text-emerald-300">{a.tier.effectBonus}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedRituals.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.12em] text-txt-dim font-semibold">Contagem por Regente</div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
            {Object.values(regenteCounts).filter(rc => rc.count > 0).map(rc => {
              const nextTier = REGENTE_AFFINITY_TIERS.find(t => t.minRituals > rc.count)
              return (
                <div key={rc.regente.id} className={`rounded-lg border px-3 py-2 ${rc.regente.badge.replace('text-', 'bg-').split(' ').find(c => c.startsWith('bg-')) || 'bg-void/40'} border-opacity-40`}
                  style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs ${rc.regente.color}`}>{rc.regente.icon}</span>
                    <span className={`text-[10px] border rounded-full px-1.5 py-0.5 ${rc.regente.badge}`}>{rc.regente.shortName}</span>
                  </div>
                  <div className="text-txt-main text-sm font-semibold mt-1">{rc.count} rituais</div>
                  {nextTier && (
                    <div className="text-txt-dim text-[9px] mt-0.5">Próx. afinidade: {nextTier.minRituals - rc.count} rituais</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-3">
        <div className="bg-teal-400/5 border border-teal-400/15 rounded-lg px-3 py-3">
          <div className="text-[11px] uppercase tracking-[0.12em] text-teal-300 font-semibold mb-1">Como seu limite e calculado</div>
          <p className="text-xs text-txt-dim leading-relaxed">
            Nivel define a base de espacos. Grau em <span className="text-teal-300">Alquimia</span> libera circulos mais altos e aumenta o orcamento. Classe e raca podem somar ou reduzir espacos, alem de mexer no limite por circulo.
          </p>
          {profile.notes.map((note) => (
            <p key={note} className="text-xs text-txt-dim leading-relaxed mt-1">{note}</p>
          ))}
        </div>
        <div className="bg-void/60 border border-sep/30 rounded-lg p-3">
          <div className="text-[11px] uppercase tracking-[0.12em] text-gold font-semibold mb-2">Custos por circulo</div>
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((circleNumber) => (
              <div key={circleNumber} className={`rounded-lg border px-3 py-2 ${CIRCLE_THEMES[circleNumber].border} ${CIRCLE_THEMES[circleNumber].glow}`}>
                <div className={`text-[10px] uppercase tracking-[0.12em] ${CIRCLE_THEMES[circleNumber].text}`}>{CIRCLE_LABELS[circleNumber]}</div>
                <div className="text-txt-main text-sm font-semibold mt-1">{SPACE_COST_BY_CIRCLE[circleNumber]} espacos</div>
                <div className="text-txt-dim text-[11px] mt-1">Limite atual: {profile.maxByCircle[circleNumber]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedRituals.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-txt-main text-sm font-semibold">Rituais Selecionados</div>
            <div className="text-[11px] text-txt-dim">{spaceUsed}/{profile.spaceBudget} espacos ocupados</div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
            {selectedRituals
              .slice()
              .sort((a, b) => a.circle - b.circle || a.name.localeCompare(b.name))
              .map((ritual) => {
                const theme = CIRCLE_THEMES[ritual.circle] || CIRCLE_THEMES[1]
                return (
                  <article
                    key={ritual.id}
                    onClick={() => setActiveId(ritual.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setActiveId(ritual.id)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={`text-left rounded-lg border p-3 cursor-pointer transition-colors ${
                      activeId === ritual.id ? `${theme.border} ${theme.glow}` : 'border-sep/30 bg-deep/60 hover:border-teal-400/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-txt-main font-semibold text-sm">{ritual.name}</span>
                           <CircleBadge circle={ritual.circle} />
                           <span className="text-[10px] bg-sep/20 text-txt-dim px-1.5 py-0.5 rounded">{ritual.category}</span>
                           {(() => {
                             const r = getRegenteById(getRegenteId(ritual))
                             return r ? <span className={`text-[10px] border rounded-full px-1.5 py-0.5 ${r.badge}`}>{r.shortName}</span> : null
                           })()}
                        </div>
                        <p className="text-txt-dim text-xs mt-1">{ritual.short_description}</p>
                      </div>
                      {update && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(event) => {
                            event.stopPropagation()
                            toggleRitual(ritual)
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              event.stopPropagation()
                              toggleRitual(ritual)
                            }
                          }}
                          className="text-err/70 hover:text-err text-xs"
                        >
                          Remover
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2 text-[11px] font-mono">
                      <span className="text-amber-300">{ritual.pe_cost} PE</span>
                      <span className="text-gold">{getAlchemyRitualSpaceCost(ritual.circle)} espacos</span>
                      <span className="text-sky-300">{ritual.action_cost}</span>
                      <span className="text-txt-dim">{ritual.duration}</span>
                    </div>
                  </article>
                )
              })}
          </div>
        </div>
      )}

      <div className={`grid gap-4 ${wide ? 'xl:grid-cols-[minmax(0,1.35fr)_430px]' : 'xl:grid-cols-[minmax(0,1.1fr)_390px]'}`}>
        <div className="space-y-3 min-w-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-txt-main text-sm font-semibold">Biblioteca de Alquimia</div>
            {error && <span className="text-[11px] text-amber-300">{error}</span>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_180px_130px] gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por nome, entidade, lei, efeito ou tag..."
              className="w-full bg-void border border-sep rounded px-3 py-2 text-sm text-txt-main"
            />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-void border border-sep rounded px-3 py-2 text-sm text-txt-main">
              <option value="all">Todas as categorias</option>
              {ALCHEMY_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={circle} onChange={(e) => setCircle(e.target.value)} className="bg-void border border-sep rounded px-3 py-2 text-sm text-txt-main">
              <option value="all">Todos circulos</option>
              {[1, 2, 3, 4].map((item) => <option key={item} value={item}>{CIRCLE_LABELS[item]}</option>)}
            </select>
          </div>

          {loading ? (
            <p className="text-txt-dim text-sm animate-pulse">Carregando biblioteca alquimica...</p>
          ) : (
            <div className={`grid gap-3 max-h-[760px] overflow-y-auto pr-1 ${wide ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
              {filtered.map((ritual) => {
                const selected = selectedRituals.some((item) => item.id === ritual.id)
                const gate = canLearnAlchemyRitual(char, selectedRituals, ritual)
                const disabled = !selected && !gate.allowed
                const active = activeRitual?.id === ritual.id
                const theme = CIRCLE_THEMES[ritual.circle] || CIRCLE_THEMES[1]

                return (
                  <article
                    key={ritual.id}
                    onClick={() => setActiveId(ritual.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setActiveId(ritual.id)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={`text-left rounded-lg border p-4 transition-colors cursor-pointer ${
                      active
                        ? `${theme.border} ${theme.glow}`
                        : selected
                        ? 'border-teal-400/25 bg-teal-400/7'
                        : disabled
                        ? 'border-sep/30 bg-void/50 opacity-60'
                        : 'border-sep/40 bg-deep/60 hover:border-teal-400/25'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                           <h4 className="text-txt-main text-sm font-semibold">{ritual.name}</h4>
                            <CircleBadge circle={ritual.circle} />
                            <span className="text-[10px] bg-sep/20 text-txt-dim px-1.5 py-0.5 rounded">{ritual.category}</span>
                            {(() => {
                              const r = getRegenteById(getRegenteId(ritual))
                              return r ? <span className={`text-[10px] border rounded-full px-1.5 py-0.5 ${r.badge}`}>{r.shortName}</span> : null
                            })()}
                            <SourceChip ritual={ritual} />
                        </div>
                        <p className="text-txt-dim text-xs mt-1 leading-relaxed">{ritual.short_description}</p>
                      </div>
                      {update && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(event) => {
                            event.stopPropagation()
                            toggleRitual(ritual)
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              event.stopPropagation()
                              toggleRitual(ritual)
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
                      <span className="text-amber-300">{ritual.pe_cost} PE</span>
                      <span className="text-gold">{getAlchemyRitualSpaceCost(ritual.circle)} espacos</span>
                      <span className="text-sky-300">{ritual.action_cost}</span>
                      <span className="text-txt-dim">{ritual.duration}</span>
                      <span className="text-purple-300">SCP {ritual.protocol_layer}</span>
                      <span className="text-red-300">Ruptura {ritual.rupture_risk}/4</span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-1.5 text-xs">
                      <MetaLine label="Regente original" value={ritual.source_name || 'Sem entidade'} />
                      <MetaLine label="Lei / eixo" value={ritual.law_name || 'Nao informada'} />
                    </div>

                    {disabled && <p className="text-err text-[11px] mt-3">{gate.reason}</p>}
                  </article>
                )
              })}

              {filtered.length === 0 && (
                <div className="text-txt-dim text-sm italic py-6">Nenhum ritual encontrado com esses filtros.</div>
              )}
            </div>
          )}
        </div>

        <aside className="xl:sticky xl:top-4 self-start">
          <RitualInspector
            ritual={activeRitual}
            selected={selectedRituals.some((item) => item.id === activeRitual?.id)}
            update={update}
            onToggle={toggleRitual}
            char={char}
            selectedRituals={selectedRituals}
            profile={profile}
          />
        </aside>
      </div>
    </section>
  )
}

function RitualInspector({ ritual, selected, update, onToggle, char, selectedRituals, profile }) {
  if (!ritual) {
    return (
      <div className="bg-deep/70 border border-sep/40 rounded-xl p-4 min-h-[280px] flex items-center justify-center text-center">
        <div>
          <div className="text-teal-300 text-lg mb-2">⚗</div>
          <p className="text-txt-main text-sm font-semibold">Selecione um ritual</p>
          <p className="text-txt-dim text-xs mt-1">O painel lateral mostra custo em PE, custo em espacos, origem, lei, efeito e contrapeso.</p>
        </div>
      </div>
    )
  }

  const gate = canLearnAlchemyRitual(char, selectedRituals, ritual)
  const disabled = !selected && !gate.allowed
  const theme = CIRCLE_THEMES[ritual.circle] || CIRCLE_THEMES[1]

  return (
    <div className={`bg-deep/90 border rounded-xl p-4 space-y-4 shadow-2xl shadow-black/20 ${theme.border}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-cinzel text-txt-main text-lg leading-tight">{ritual.name}</h4>
            <CircleBadge circle={ritual.circle} />
            <span className="text-[10px] bg-sep/20 text-txt-dim px-1.5 py-0.5 rounded">{ritual.category}</span>
          </div>
          <p className="text-txt-dim text-xs mt-2 leading-relaxed">{ritual.short_description}</p>
        </div>
        <SourceChip ritual={ritual} />
      </div>

      <div className={`rounded-lg border px-3 py-2 ${theme.border} ${theme.glow}`}>
        <div className={`text-[11px] font-semibold uppercase tracking-[0.12em] mb-1 ${theme.text}`}>Leitura do circulo</div>
        <p className="text-txt-dim text-xs leading-relaxed">{CIRCLE_NOTES[ritual.circle]}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <InspectorBox label="PE" value={`${ritual.pe_cost} PE`} color="text-amber-300" />
        <InspectorBox label="Espacos" value={`${getAlchemyRitualSpaceCost(ritual.circle)}/${profile.spaceBudget}`} color="text-gold" />
        <InspectorBox label="Nivel minimo" value={`N${ritual.min_level || 1}`} color="text-sky-300" />
        <InspectorBox label="Acao" value={ritual.action_cost} color="text-txt-main" />
        <InspectorBox label="Duracao" value={ritual.duration} color="text-gold" />
        <InspectorBox label="Alcance" value={ritual.range} color="text-txt-main" />
        <InspectorBox label="Ruptura" value={`${ritual.rupture_risk}/4`} color="text-red-300" />
        <InspectorBox label="SCP" value={`Camada ${ritual.protocol_layer}`} color="text-purple-300" />
      </div>

      <div className="space-y-2 text-xs">
        <MetaLine label="Origem" value={`${SOURCE_LABELS[ritual.source_kind] || ritual.source_kind} • ${ritual.source_name || 'Sem entidade'}`} />
        <MetaLine label="Lei / eixo" value={ritual.law_name || 'Nao informada'} />
        {(() => {
          const ir = getRegenteById(getRegenteId(ritual))
          return ir ? (
            <div className="flex items-center gap-1.5 pt-1">
              <span className={`text-xs ${ir.color}`}>{ir.icon}</span>
              <span className={`text-[10px] border rounded-full px-1.5 py-0.5 ${ir.badge}`}>{ir.name}</span>
            </div>
          ) : null
        })()}
      </div>

      <div className="bg-void/60 border border-sep/30 rounded-lg p-3">
        <div className="text-txt-main text-sm font-semibold mb-2">Efeito</div>
        <p className="text-txt-dim text-xs leading-relaxed whitespace-pre-wrap">
          <HighlightedEffectText text={ritual.effect} category={ritual.category} />
        </p>
      </div>

      {ritual.price && (
        <div className="bg-amber-300/5 border border-amber-300/15 rounded-lg p-3">
          <div className="text-amber-300 text-sm font-semibold mb-2">Preco / Contrapeso</div>
          <p className="text-txt-dim text-xs leading-relaxed">{ritual.price}</p>
        </div>
      )}

      {ritual.tags?.length > 0 && (
        <div>
          <div className="text-txt-main text-sm font-semibold mb-2">Marcadores</div>
          <div className="flex flex-wrap gap-1.5">
            {ritual.tags.map((tag) => (
              <span key={tag} className="text-[10px] bg-void/60 text-txt-dim px-2 py-0.5 rounded-full border border-sep/40">{tag}</span>
            ))}
          </div>
        </div>
      )}

      {update && (
        <div className="pt-2 border-t border-sep/30">
          <button
            type="button"
            onClick={() => onToggle(ritual)}
            disabled={disabled}
            className={`w-full px-4 py-2 rounded text-sm font-semibold transition-colors ${
              selected ? 'bg-teal-400 text-void' : disabled ? 'bg-sep/30 text-txt-dim/50 cursor-not-allowed' : 'border border-teal-400/30 text-teal-300 hover:bg-teal-400/10'
            }`}
          >
            {selected ? 'Ritual Selecionado' : 'Aprender Este Ritual'}
          </button>
          {disabled && <p className="text-err text-[11px] mt-2">{gate.reason}</p>}
        </div>
      )}
    </div>
  )
}

function HighlightedEffectText({ text, category }) {
  const chunks = String(text || '').split(/(\s+)/)
  return chunks.map((chunk, index) => {
    if (/^\s+$/.test(chunk)) return chunk

    const clean = chunk.replace(/[.,;:()]/g, '')
    const lower = clean.toLowerCase()
    const prev = (chunks[index - 2] || '').toLowerCase()
    const next = (chunks[index + 2] || '').toLowerCase()
    const context = `${prev} ${lower} ${next} ${String(category || '').toLowerCase()}`

    let className = ''
    if (/^\d+\s*PE$/.test(clean) || lower === 'pe') className = 'text-amber-300 font-semibold'
    else if (/^\d+d\d+(\+\d+)?$/.test(clean) || /^\d+%$/.test(clean) || /^\d+$/.test(clean)) {
      if (/cura|recuper|regenera|vida|hp/.test(context)) className = 'text-emerald-300 font-semibold'
      else if (/dano|atingid|alvo|explos|golpe|feriment|ataque|debuff|drain|dren/.test(context) || /ataque|controle/.test(String(category || '').toLowerCase())) className = 'text-red-300 font-semibold'
      else if (/rodada|rodadas|turno|turnos/.test(context)) className = 'text-gold font-semibold'
      else className = 'text-sky-300 font-semibold'
    } else if (/^\d+m$/.test(clean)) className = 'text-sky-300 font-semibold'
    else if (/^\d+\s*rodadas?$/.test(clean) || /^\d+\s*turnos?$/.test(clean)) className = 'text-gold font-semibold'

    return className ? <span key={`${chunk}-${index}`} className={className}>{chunk}</span> : chunk
  })
}

function RuleBadge({ label, value, tone = 'teal' }) {
  const tones = {
    teal: 'text-teal-300 border-teal-400/15',
    emerald: 'text-emerald-300 border-emerald-400/15',
    purple: 'text-purple-300 border-purple-400/15',
    amber: 'text-amber-200 border-amber-300/15',
    gold: 'text-gold border-gold/15',
  }
  return (
    <div className={`bg-deep/70 border rounded-lg px-3 py-2 ${tones[tone] || tones.teal}`}>
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

function SourceChip({ ritual }) {
  return (
    <span className="text-[10px] bg-purple-400/10 text-purple-300 px-1.5 py-0.5 rounded border border-purple-400/20">
      {ritual.source_name || SOURCE_LABELS[ritual.source_kind] || 'Origem'}
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
