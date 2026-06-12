import { useMemo, useState } from 'react'
import { RACES, RACE_CATEGORIES } from '../../data/races'
import { getRaceProfile, getRaceBonusSummary } from '../../data/raceProfiles'
import { getRaceTree } from '../../data/raceTrees'
import {
  ATTR_KEYS,
  calculateRaceBonus,
  getDefaultSubraceId,
  getSelectedSubrace,
  getSubracesForRace,
} from '../../utils/raceCalculator'

const CAT_COLORS = {
  humanoide: {
    badge: 'bg-blue-400/15 text-blue-300 border-blue-400/25',
    accent: 'text-blue-400',
  },
  sobrenatural: {
    badge: 'bg-purple-400/15 text-purple-300 border-purple-400/25',
    accent: 'text-purple-400',
  },
  predatoria: {
    badge: 'bg-red-400/15 text-red-300 border-red-400/25',
    accent: 'text-red-400',
  },
  lendaria: {
    badge: 'bg-amber-300/15 text-amber-300 border-amber-300/25',
    accent: 'text-amber-400',
  },
}

function truncateDesc(text, maxWords = 12) {
  if (!text) return ''
  const words = text.split(' ')
  if (words.length <= maxWords) return text
  return words.slice(0, maxWords).join(' ') + '…'
}

function StatPill({ label, value, tone = 'sky' }) {
  const toneClass = {
    sky: 'text-sky-300 border-sky-400/25 bg-sky-400/10',
    emerald: 'text-emerald-300 border-emerald-400/25 bg-emerald-400/10',
    gold: 'text-gold border-gold/25 bg-gold/10',
    red: 'text-red-300 border-red-400/25 bg-red-400/10',
    purple: 'text-purple-300 border-purple-400/25 bg-purple-400/10',
  }[tone]

  return (
    <div className={`race-stat-pill ${toneClass}`}>
      <span className="text-[10px] uppercase tracking-[0.16em] opacity-70">{label}</span>
      <span className="font-mono text-sm font-bold">{value}</span>
    </div>
  )
}

export default function StepRace({ char, update }) {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const selectedRace = RACES[char.raca] || null

  const filteredRaces = useMemo(() => {
    const all = Object.values(RACES)
    return selectedCategory === 'all' ? all : all.filter(r => r.category === selectedCategory)
  }, [selectedCategory])

  function handleSelectRace(raceId) {
    const race = RACES[raceId]
    const defaultSubrace = getDefaultSubraceId(raceId)
    const patch = {
      raca: raceId,
      racaTipo: RACE_CATEGORIES.find(c => c.id === race.category)?.label || '',
      subraca: defaultSubrace,
      racaAttrChoices: {},
    }
    if (race.layer0?.requiresDeus) patch.racaDeus = race.deuses?.[0]?.id || null
    if (!race.layer0?.requiresDeus) patch.racaDeus = null
    update(patch)
  }

  function handleClearRace() {
    update({ raca: '', racaTipo: '', racaDeus: null, subraca: null, racaAttrChoices: {} })
  }

  function handleSubraceSelect(race, sub) {
    update({ subraca: sub.id })
  }

  function toggleAttrChoice(race, attr) {
    const current = !!char.racaAttrChoices?.[attr]
    const layer = race.layer0?.attrBonus || {}
    const max = layer.escolherQtd || 0
    const selectedCount = Object.values(char.racaAttrChoices || {}).filter(Boolean).length
    if (!current && selectedCount >= max) return
    update({ racaAttrChoices: { ...(char.racaAttrChoices || {}), [attr]: !current } })
  }

  return (
    <div className="race-stage space-y-6">
      <div className="race-hero">
        <div className="min-w-0">
          <div className="section-header text-primary mb-2">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>public</span>
            Origem do Personagem
          </div>
          <p className="text-on-surface-variant text-sm sm:text-base mt-3 max-w-3xl">
            Escolha a raça que definirá sua origem, fraquezas e poderes inatos.
          </p>
        </div>

        <div className="race-hero-summary">
          <span className="text-outline text-xs uppercase tracking-[0.18em]">Escolha atual</span>
          <strong className="font-cinzel text-xl text-on-surface mt-1">
            {selectedRace ? selectedRace.name : 'Nenhuma raça'}
          </strong>
          <span className="text-purple-300 text-sm truncate">
            {selectedRace ? RACE_CATEGORIES.find(c => c.id === selectedRace.category)?.label || '' : 'Selecione uma origem'}
          </span>
        </div>
      </div>

      <div className="race-category-bar">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`race-category-tab ${selectedCategory === 'all' ? 'is-active' : ''}`}
        >
          Todas <span>{Object.keys(RACES).length}</span>
        </button>
        {RACE_CATEGORIES.map(c => {
          const count = Object.values(RACES).filter(r => r.category === c.id).length
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategory(c.id)}
              className={`race-category-tab ${selectedCategory === c.id ? 'is-active' : ''}`}
            >
              {c.label} <span>{count}</span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {filteredRaces.map(race => {
          const isSelected = char.raca === race.id
          const catMeta = RACE_CATEGORIES.find(c => c.id === race.category) || RACE_CATEGORIES[0]
          const catColor = CAT_COLORS[race.category] || CAT_COLORS.humanoide

          return (
            <button
              key={race.id}
              type="button"
              onClick={() => handleSelectRace(race.id)}
              className={`race-square-card relative rounded-2xl border border-white/[0.06] p-3 sm:p-4 flex flex-col items-center text-center transition-all duration-200 ease-out cursor-pointer ${isSelected ? 'race-square-card--selected' : ''}`}
            >
              {isSelected && (
                <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gold flex items-center justify-center z-10 shadow-lg">
                  <span className="material-symbols-outlined text-black text-sm" style={{ fontVariationSettings: "'FILL' 1, 'wght' 700" }}>check</span>
                </span>
              )}

              <span className="text-3xl sm:text-4xl mt-1 drop-shadow-lg">{race.icon}</span>

              <span className="font-cinzel text-sm sm:text-base font-bold text-gold leading-tight mt-2 max-w-full truncate">
                {race.name}
              </span>

              <span className={`text-[10px] px-2 py-0.5 rounded-full border mt-1.5 ${catColor.badge}`}>
                {catMeta.label}
              </span>

              <p className="mt-auto pt-2.5 text-[10px] sm:text-[11px] text-txt-dim leading-relaxed line-clamp-2">
                {truncateDesc(race.desc)}
              </p>
            </button>
          )
        })}
      </div>

      {selectedRace && (
        <SelectedRacePanel
          char={char}
          race={selectedRace}
          update={update}
          onClear={handleClearRace}
          onSubraceSelect={handleSubraceSelect}
          onToggleAttr={toggleAttrChoice}
        />
      )}
    </div>
  )
}

function SelectedRacePanel({ char, race, update, onClear, onSubraceSelect, onToggleAttr }) {
  const catMeta = RACE_CATEGORIES.find(c => c.id === race.category) || RACE_CATEGORIES[0]
  const profile = getRaceProfile(race.id)
  const tree = getRaceTree(race.id)
  const subraces = getSubracesForRace(race.id)
  const selectedSubrace = getSelectedSubrace(char)
  const raceBonus = calculateRaceBonus(char)
  const layer = race.layer0?.attrBonus || {}
  const bonusSummary = getRaceBonusSummary(race.id)

  const allowedAttrs = layer.escolherOpcoes || ATTR_KEYS
  const selectedChoiceCount = Object.values(char.racaAttrChoices || {}).filter(Boolean).length
  const maxChoices = layer.escolherQtd || 0

  return (
    <div className="race-detail-panel race-detail-panel--expanded">
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-gold text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>expand_more</span>
        <span className="font-cinzel text-gold text-sm font-bold tracking-wide uppercase">Detalhes da Raça Selecionada</span>
        <div className="flex-1 h-px bg-gold/20 ml-2" />
      </div>

      <div className="space-y-5">
        <div className="race-selected-header">
          <div className="flex items-start gap-4 min-w-0">
            <span className="race-selected-icon">{race.icon}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`font-cinzel text-2xl ${catMeta.title}`}>{race.name}</h3>
                <span className={`text-xs px-2.5 py-1 rounded-full border ${catMeta.badge}`}>{catMeta.label}</span>
              </div>
              {race.quote && <p className="text-txt-dim text-sm italic mt-1">{race.quote}</p>}
              <p className="text-txt-dim text-sm leading-relaxed mt-3 max-w-2xl">{race.desc}</p>
            </div>
          </div>
          <button type="button" onClick={onClear} className="race-soft-button shrink-0">Remover</button>
        </div>

        {profile && profile.fraquezas && profile.fraquezas.length > 0 && (
          <section className="race-info-panel border-rose-400/25 bg-rose-400/[0.05] text-rose-200 p-5">
            <h3 className="race-section-title flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-400 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
              Fraquezas Raciais
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {profile.fraquezas.map((fq, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl border border-rose-400/15 bg-rose-400/[0.04] p-3 transition-all duration-200"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <span className="material-symbols-outlined text-rose-400 text-xl mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>{fq.icon}</span>
                  <div className="min-w-0">
                    <div className="font-semibold text-rose-100 text-sm">{fq.nome}</div>
                    <p className="text-rose-200/70 text-xs mt-0.5 leading-relaxed">{fq.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {profile && profile.poderesBase && profile.poderesBase.length > 0 && (
          <section className="race-info-panel border-amber-300/25 bg-amber-300/[0.045] text-amber-200 p-5">
            <h3 className="race-section-title flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-300 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              Poderes Base
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {profile.poderesBase.map((pw, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-3"
                >
                  <span className="material-symbols-outlined text-amber-300 text-xl mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>{pw.icon}</span>
                  <div className="min-w-0">
                    <div className="font-semibold text-amber-100 text-sm">{pw.nome}</div>
                    <p className="text-amber-200/70 text-xs mt-0.5 leading-relaxed">{pw.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="race-info-panel border-gold/25 bg-gold/[0.045] text-gold p-5">
          <h3 className="race-section-title flex items-center gap-2">
            <span className="material-symbols-outlined text-gold text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>tune</span>
            Bônus Base
          </h3>
          <div className="flex flex-wrap gap-2 mt-3">
            {bonusSummary.map((part, i) => (
              <span key={i} className="text-xs font-mono px-2.5 py-1 rounded-full border border-gold/20 bg-gold/[0.08] text-gold">
                {part}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
            {ATTR_KEYS.map(attr => {
              const val = raceBonus.attrs[attr] || 0
              if (val === 0) return null
              return (
                <StatPill
                  key={attr}
                  label={attr}
                  value={`${val >= 0 ? '+' : ''}${val}`}
                  tone={val < 0 ? 'red' : 'sky'}
                />
              )
            })}
          </div>

          {layer.escolher && (
            <div className="mt-4 pt-3 border-t border-gold/15">
              <p className="text-xs text-txt-dim mb-2">
                Escolha {maxChoices} {layer.escolherLabel || 'atributos'}. Valor: +{layer.escolherValor || 1} por atributo ({selectedChoiceCount}/{maxChoices})
              </p>
              <div className="flex flex-wrap gap-2">
                {allowedAttrs.map(attr => {
                  const selected = !!char.racaAttrChoices?.[attr]
                  const disabled = !selected && selectedChoiceCount >= maxChoices
                  return (
                    <button
                      key={attr}
                      type="button"
                      disabled={disabled}
                      onClick={() => onToggleAttr(race, attr)}
                      className={`race-choice-chip ${selected ? 'is-selected' : ''} ${disabled ? 'is-disabled' : ''}`}
                    >
                      {attr} {selected ? `+${layer.escolherValor || 1}` : ''}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {profile?.bonus?.attrsDeus && (
            <div className="mt-3 text-xs text-amber-300/80 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              Atributos concedidos pelo deus pai
            </div>
          )}
        </section>

        {tree && (
          <section className="race-info-panel border-purple-400/25 bg-purple-400/[0.045] text-purple-200 p-5">
            <h3 className="race-section-title flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-400 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>account_tree</span>
              Prévia da Árvore de Habilidades
            </h3>
            <p className="text-xs text-txt-dim mt-1 mb-3">
              {tree.nodes.length} habilidades desbloqueáveis em {tree.branches.length} caminhos
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {tree.branches.map(branch => {
                const branchNodes = tree.nodes.filter(n => n.branch === branch.id)
                return (
                  <div key={branch.id} className="rounded-xl border border-purple-400/15 bg-purple-400/[0.04] p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="material-symbols-outlined text-base"
                        style={{ fontVariationSettings: "'FILL' 1", color: branch.color }}
                      >
                        {branch.icon}
                      </span>
                      <span className="text-xs font-semibold" style={{ color: branch.color }}>{branch.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {branchNodes.slice(0, 8).map(node => (
                        <div
                          key={node.id}
                          className="group relative"
                          title={node.name}
                        >
                          <div
                            className="w-5 h-5 rounded-full border-2 transition-colors duration-200"
                            style={{
                              borderColor: branch.color,
                              backgroundColor: `${branch.color}33`,
                            }}
                          />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-black/90 border border-white/10 text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                            {node.name}
                          </div>
                        </div>
                      ))}
                      {branchNodes.length > 8 && (
                        <span className="text-[10px] text-purple-300/60 self-center ml-1">+{branchNodes.length - 8}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {subraces.length > 0 && (
          <section className="race-info-panel border-purple-400/25 bg-purple-400/[0.045] text-purple-300 p-5">
            <h3 className="race-section-title">
              {race.id === 'SEMIDEUS' ? 'Caminho de Ascensão' : 'Sub-Raça / Caminho'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              {subraces.map(sub => {
                const selected = selectedSubrace?.id === sub.id
                const subAttrs = Object.entries(sub.bonus?.attrs || {})
                  .filter(([, v]) => v !== 0)
                  .map(([a, v]) => `${v >= 0 ? '+' : ''}${v} ${a}`)
                if (sub.bonus?.hp) subAttrs.push(`${sub.bonus.hp >= 0 ? '+' : ''}${sub.bonus.hp} HP`)
                if (sub.bonus?.pe) subAttrs.push(`+${sub.bonus.pe} PE`)
                if (sub.bonus?.pericias) subAttrs.push(`+${sub.bonus.pericias} Perícias`)
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => onSubraceSelect(race, sub)}
                    className={`race-path-card ${selected ? 'is-selected' : ''}`}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="font-semibold text-txt-main">{sub.name}</span>
                      {selected && <span className="text-[10px] uppercase tracking-[0.14em] text-purple-300">Ativo</span>}
                    </span>
                    {subAttrs.length > 0 && (
                      <span className="block text-xs text-sky-300 font-mono mt-2">{subAttrs.join(' | ')}</span>
                    )}
                    {(sub.minLevel || sub.requirement) && (
                      <span className="block text-xs text-amber-300/85 mt-2">
                        Requisito: {sub.minLevel ? `Nível ${sub.minLevel}+` : sub.requirement}
                      </span>
                    )}
                    {sub.note && <span className="block text-xs text-txt-dim mt-2 leading-relaxed">{sub.note}</span>}
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {race.layer0?.requiresDeus && race.deuses && (
          <DivineLineage race={race} char={char} update={update} />
        )}
      </div>
    </div>
  )
}

function DivineLineage({ race, char, update }) {
  return (
    <section className="race-info-panel border-amber-300/25 bg-amber-300/[0.045] text-amber-300 p-5">
      <h3 className="race-section-title flex items-center gap-2">
        <span className="material-symbols-outlined text-amber-300 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
        Deus Pai / Herança Divina
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3 max-h-[360px] overflow-y-auto pr-1">
        {race.deuses.map(deus => {
          const selected = char.racaDeus === deus.id
          return (
            <button
              key={deus.id}
              type="button"
              onClick={() => update({ racaDeus: deus.id })}
              className={`race-god-card ${selected ? 'is-selected' : ''}`}
            >
              <span className="font-semibold text-txt-main">{deus.name}</span>
              <span className="block text-[11px] text-txt-dim mt-0.5">{deus.title}</span>
              <span className="block text-xs text-sky-300 font-mono mt-2">
                {Object.entries(deus.attr).map(([a, v]) => `${v >= 0 ? '+' : ''}${v}${a}`).join(' | ')}
              </span>
            </button>
          )
        })}
      </div>

      {char.racaDeus && (() => {
        const deus = race.deuses.find(d => d.id === char.racaDeus)
        return deus ? (
          <div className="race-god-detail">
            <div className="text-amber-300 font-cinzel font-bold text-base">{deus.name} — {deus.title}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mt-3">
              <div><span className="text-txt-dim">Traço: </span><span className="text-txt-main">{deus.traco}</span></div>
              <div><span className="text-txt-dim">Especial: </span><span className="text-txt-main">{deus.especial}</span></div>
            </div>
          </div>
        ) : null
      })()}
    </section>
  )
}
