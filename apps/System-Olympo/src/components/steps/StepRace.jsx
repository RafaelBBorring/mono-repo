import { useMemo, useState } from 'react'
import { RACES, RACE_CATEGORIES, getAttrBonusText } from '../../data/races'
import {
  ATTR_KEYS,
  calculateRaceBonus,
  getDefaultSubraceId,
  getSelectedSubrace,
  getSubracesForRace,
} from '../../utils/raceCalculator'

function bonusLine(bonus = {}) {
  const attrs = Object.entries(bonus.attrs || {})
    .filter(([, v]) => v !== 0)
    .map(([a, v]) => `${v >= 0 ? '+' : ''}${v} ${a}`)
  if (bonus.hp) attrs.push(`${bonus.hp >= 0 ? '+' : ''}${bonus.hp} HP`)
  if (bonus.pe) attrs.push(`${bonus.pe >= 0 ? '+' : ''}${bonus.pe} PE`)
  if (bonus.pericias) attrs.push(`+${bonus.pericias} Pericias`)
  if (bonus.modules) attrs.push(`+${bonus.modules} Modulos`)
  return attrs.join(' | ') || 'Sem bonus numerico'
}

function compactBonus(bonus = {}) {
  const parts = ATTR_KEYS
    .map(attr => [attr, bonus.attrs?.[attr] || 0])
    .filter(([, v]) => v !== 0)
    .map(([attr, v]) => `${v >= 0 ? '+' : ''}${v}${attr}`)
  if (bonus.hp) parts.push(`${bonus.hp >= 0 ? '+' : ''}${bonus.hp}HP`)
  if (bonus.pe) parts.push(`+${bonus.pe}PE`)
  if (bonus.pericias) parts.push(`+${bonus.pericias}PER`)
  if (bonus.modules) parts.push(`+${bonus.modules}MOD`)
  return parts
}

function Section({ title, tone = 'gold', children, dense = false }) {
  const tones = {
    gold: 'border-gold/25 bg-gold/[0.045] text-gold',
    sky: 'border-sky-400/25 bg-sky-400/[0.045] text-sky-300',
    purple: 'border-purple-400/25 bg-purple-400/[0.045] text-purple-300',
    emerald: 'border-emerald-400/25 bg-emerald-400/[0.045] text-emerald-300',
    red: 'border-red-400/25 bg-red-400/[0.045] text-red-300',
    amber: 'border-amber-300/25 bg-amber-300/[0.045] text-amber-300',
  }
  return (
    <section className={`race-info-panel ${tones[tone] || tones.gold} ${dense ? 'p-4' : 'p-5'}`}>
      <h3 className="race-section-title">{title}</h3>
      {children}
    </section>
  )
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
  const selectedSubrace = getSelectedSubrace(char)
  const raceBonus = calculateRaceBonus(char)

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
    if (race.layer0?.requiresDeus) patch.racaDeus = defaultSubrace || race.deuses[0]?.id || null
    if (!race.layer0?.requiresDeus) patch.racaDeus = null
    update(patch)
  }

  function handleClearRace() {
    update({ raca: '', racaTipo: '', racaDeus: null, subraca: null, racaAttrChoices: {} })
  }

  function handleSubraceSelect(race, sub) {
    const patch = { subraca: sub.id }
    if (race.id === 'SEMIDEUS') patch.racaDeus = sub.id
    update(patch)
  }

  function toggleAttrChoice(race, attr) {
    const current = !!char.racaAttrChoices?.[attr]
    const layer = race.layer0?.attrBonus || {}
    const max = layer.escolherQtd || 0
    const selectedCount = Object.values(char.racaAttrChoices || {}).filter(Boolean).length
    if (!current && selectedCount >= max) return
    update({ racaAttrChoices: { ...(char.racaAttrChoices || {}), [attr]: !current } })
  }

  const totals = compactBonus(raceBonus)

  return (
    <div className="race-stage space-y-6">
      <div className="race-hero">
        <div className="min-w-0">
          <div className="section-header text-primary mb-2">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>public</span>
            Origem do Personagem
          </div>
          <p className="text-on-surface-variant text-sm sm:text-base mt-3 max-w-3xl">
            Escolha a raca, o caminho interno e as concessoes mecanicas. Tudo abaixo entra no calculo da ficha:
            atributos, HP, PE, pericias, modulos e exportacao.
          </p>
        </div>

        <div className="race-hero-summary">
          <span className="text-outline text-xs uppercase tracking-[0.18em]">Escolha atual</span>
          <strong className="font-cinzel text-xl text-on-surface mt-1">
            {selectedRace ? selectedRace.name : 'Nenhuma raca'}
          </strong>
          <span className="text-purple-300 text-sm truncate">
            {selectedSubrace ? selectedSubrace.name : 'Selecione uma origem'}
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

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.88fr)_minmax(420px,1.12fr)] gap-5 items-start">
        <div className="race-list-panel">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
            <h3 className="font-cinzel text-primary text-lg">Racas Disponiveis</h3>
            <p className="text-on-surface-variant text-xs mt-1">Clique em uma raca para ver os detalhes completos.</p>
            </div>
            <span className="text-xs text-on-surface-variant border border-outline/20 rounded-full px-3 py-1">{filteredRaces.length} opcoes</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
            {filteredRaces.map(race => {
              const isSelected = char.raca === race.id
              const catMeta = RACE_CATEGORIES.find(c => c.id === race.category) || RACE_CATEGORIES[0]
              const previewChar = {
                ...char,
                raca: race.id,
                racaDeus: race.layer0?.requiresDeus ? (getDefaultSubraceId(race.id) || race.deuses?.[0]?.id || null) : null,
                subraca: getDefaultSubraceId(race.id),
                racaAttrChoices: {},
              }
              const previewBonus = calculateRaceBonus(previewChar)

              return (
                <button
                  key={race.id}
                  type="button"
                  onClick={() => handleSelectRace(race.id)}
                  className={`race-option-card ${isSelected ? 'is-selected' : ''}`}
                >
                  <span className="race-option-icon">{race.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 flex-wrap">
                      <span className="font-cinzel text-base text-txt-main">{race.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${catMeta.badge}`}>{catMeta.label}</span>
                    </span>
                    <span className="block text-xs text-txt-dim mt-1 line-clamp-2">{race.desc}</span>
                    <span className="flex flex-wrap gap-1.5 mt-3">
                      {compactBonus(previewBonus).slice(0, 5).map(part => (
                        <span key={part} className="race-mini-bonus">{part}</span>
                      ))}
                      {compactBonus(previewBonus).length === 0 && <span className="race-mini-bonus">sem bonus base</span>}
                    </span>
                  </span>
                  <span className="race-select-mark">{isSelected ? 'Ativa' : 'Ver'}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="race-detail-panel">
          {!selectedRace ? (
            <div className="race-empty-state">
              <div className="text-5xl text-gold/70">?</div>
              <h3 className="font-cinzel text-2xl text-primary mt-4">Nenhuma raca selecionada</h3>
              <p className="text-on-surface-variant text-sm mt-2 max-w-md">
                Selecione uma origem na lista. O painel vai mostrar impacto numerico, caminho, passivas,
                vantagens, fraquezas e evolucao.
              </p>
            </div>
          ) : (
            <SelectedRaceDetails
              char={char}
              race={selectedRace}
              selectedSubrace={selectedSubrace}
              raceBonus={raceBonus}
              totals={totals}
              update={update}
              onClear={handleClearRace}
              onSubraceSelect={handleSubraceSelect}
              onToggleAttr={toggleAttrChoice}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function SelectedRaceDetails({
  char,
  race,
  selectedSubrace,
  raceBonus,
  totals,
  update,
  onClear,
  onSubraceSelect,
  onToggleAttr,
}) {
  const catMeta = RACE_CATEGORIES.find(c => c.id === race.category) || RACE_CATEGORIES[0]
  const subraces = getSubracesForRace(race.id)
  const layer = race.layer0?.attrBonus || {}
  const allowedAttrs = layer.escolherOpcoes || ATTR_KEYS
  const selectedChoiceCount = Object.values(char.racaAttrChoices || {}).filter(Boolean).length
  const maxChoices = layer.escolherQtd || 0

  return (
    <div className="space-y-5">
      <div className="race-selected-header">
        <div className="flex items-start gap-4 min-w-0">
          <span className="race-selected-icon">{race.icon}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`font-cinzel text-2xl ${catMeta.title}`}>{race.name}</h3>
              <span className={`text-xs px-2.5 py-1 rounded-full border ${catMeta.badge}`}>{catMeta.label}</span>
              <span className="text-amber-300 text-xs font-mono">Complexidade {race.dificuldade || 1}/5</span>
            </div>
            {race.quote && <p className="text-txt-dim text-sm italic mt-1">{race.quote}</p>}
            <p className="text-txt-dim text-sm leading-relaxed mt-3">{race.desc}</p>
          </div>
        </div>
        <button type="button" onClick={onClear} className="race-soft-button shrink-0">Remover</button>
      </div>

      <Section title="Impacto Numerico Total" tone="gold">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {ATTR_KEYS.map(attr => (
            <StatPill
              key={attr}
              label={attr}
              value={`${raceBonus.attrs[attr] >= 0 ? '+' : ''}${raceBonus.attrs[attr] || 0}`}
              tone={(raceBonus.attrs[attr] || 0) < 0 ? 'red' : 'sky'}
            />
          ))}
          <StatPill label="HP" value={`${raceBonus.hp >= 0 ? '+' : ''}${raceBonus.hp}`} tone={raceBonus.hp < 0 ? 'red' : 'emerald'} />
          <StatPill label="PE" value={`+${raceBonus.pe || 0}`} tone="emerald" />
          <StatPill label="Pericias" value={`+${raceBonus.pericias || 0}`} tone="gold" />
          <StatPill label="Modulos" value={`+${raceBonus.modules || 0}`} tone="purple" />
        </div>
        <div className="mt-3 text-xs text-txt-dim">
          Base racial: <span className="text-sky-300 font-mono">{getAttrBonusText(race)}</span>
          {totals.length > 0 && <span className="ml-2 text-txt-dim/70">Total: {totals.join(' | ')}</span>}
        </div>
      </Section>

      {layer.escolher && (
        <Section title={`Bonus Escolhivel (${selectedChoiceCount}/${maxChoices})`} tone="sky" dense>
          <p className="text-xs text-txt-dim mb-3">
            Escolha {maxChoices} {layer.escolherLabel || 'atributos'}. Valor aplicado: +{layer.escolherValor || 1} por atributo.
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
        </Section>
      )}

      {subraces.length > 0 && (
        <Section title={race.id === 'SEMIDEUS' ? 'Linhagem Divina' : 'Sub-Raca / Caminho'} tone="purple">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {subraces.map(sub => {
              const selected = selectedSubrace?.id === sub.id
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
                  <span className="block text-xs text-sky-300 font-mono mt-2">{bonusLine(sub.bonus)}</span>
                  {(sub.minLevel || sub.requirement) && (
                    <span className="block text-xs text-amber-300/85 mt-2">
                      Requisito: {sub.minLevel ? `Nivel ${sub.minLevel}+` : sub.requirement}
                    </span>
                  )}
                  {sub.note && <span className="block text-xs text-txt-dim mt-2 leading-relaxed">{sub.note}</span>}
                </button>
              )
            })}
          </div>

          {selectedSubrace?.marcos && (
            <div className="mt-4 space-y-2 border-t border-purple-400/15 pt-4">
              <div className="text-purple-300 text-sm font-semibold">Marcos deste caminho</div>
              {selectedSubrace.marcos.map(([marco, condicao, ganho]) => (
                <div key={marco} className="race-milestone">
                  <span className="text-txt-main font-semibold">{marco}</span>
                  <span className="text-txt-dim"> - {condicao}: </span>
                  <span className="text-emerald-300">{ganho}</span>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {race.layer0?.requiresDeus && race.deuses && (
        <DivineLineage race={race} char={char} update={update} />
      )}

      {race.passivasRaciais.length > 0 && (
        <Section title={`Passivas Raciais (${race.passivasRaciais.length})`} tone="amber">
          <div className="space-y-3">
            {race.passivasRaciais.map((pr, i) => (
              <div key={i} className="race-ability-row">
                <span className={`race-ability-tag ${pr.tipo === 'Ativa' ? 'is-active' : 'is-passive'}`}>
                  {pr.tipo === 'Ativa' ? 'ATV' : 'PSV'}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-txt-main text-sm font-semibold">{pr.nome}</span>
                    {pr.custo && !['---', '—'].includes(pr.custo) && <span className="text-xs text-amber-300/75">{pr.custo}</span>}
                    {pr.duracao && !pr.duracao.startsWith('Cont') && <span className="text-xs text-sky-300/75">{pr.duracao}</span>}
                  </div>
                  <p className="text-txt-dim text-sm mt-1 leading-relaxed">{pr.efeito}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title={`Vantagens (${race.vantagens.length})`} tone="emerald" dense>
          <ul className="space-y-2">
            {race.vantagens.map((v, i) => (
              <li key={i} className="race-list-line"><span className="text-emerald-300">+</span><span>{v}</span></li>
            ))}
          </ul>
        </Section>
        <Section title={`Desvantagens (${race.desvantagens.length})`} tone="red" dense>
          <ul className="space-y-2">
            {race.desvantagens.map((d, i) => (
              <li key={i} className="race-list-line"><span className="text-red-300">-</span><span>{d}</span></li>
            ))}
          </ul>
        </Section>
      </div>

      {race.formas && (
        <Section title="Formas Disponiveis" tone="amber">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {race.formas.map((f, i) => (
              <div key={i} className="race-form-card">
                <span className="font-semibold text-amber-300 text-sm">{f.nome}</span>
                <div className="text-sky-300 font-mono text-xs mt-2">{bonusLine({ attrs: f.attrBonus, hp: f.hpExtra })}</div>
                {f.garras && <div className="text-red-300 font-mono text-xs mt-1">Garras {f.garras}</div>}
                <p className="text-txt-dim text-xs mt-2 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Evolucao de Poder" tone="gold">
        <div className="space-y-2">
          {race.progressaoPoder.map((p, i) => {
            const active = (char.nivel || 1) >= p.nivel
            return (
              <div key={i} className={`race-progression-row ${active ? 'is-active' : ''}`}>
                <span className="race-level-pill">N{p.nivel}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-txt-main">{p.ganho}</span>
                    {p.custo && <span className="text-xs text-amber-300">{p.custo}</span>}
                    {p.duracao && <span className="text-xs text-sky-300">{p.duracao}</span>}
                  </div>
                  <p className="text-sm text-txt-dim mt-0.5">{p.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      {race.marcosExperiencia && race.marcosExperiencia.length > 0 && (
        <Section title="Marcos de Experiencia" tone="purple">
          <div className="space-y-3">
            {race.marcosExperiencia.map((item, i) =>
              item.marcos ? (
                <div key={i} className="race-milestone-group">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-purple-300 font-cinzel font-bold">{item.titulo}</span>
                    <span className="text-txt-dim text-xs">{item.desc}</span>
                  </div>
                  <div className="mt-2 space-y-2">
                    {item.marcos.map((m, j) => (
                      <div key={j} className="race-milestone">
                        <span className="text-txt-main font-semibold">{m.marco}</span>
                        <span className="text-emerald-300 ml-1">{m.ganho}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div key={i} className="race-milestone">
                  <span className="text-txt-main font-semibold">{item.marco}</span>
                  <span className="text-emerald-300 ml-1">{item.ganho}</span>
                </div>
              )
            )}
          </div>
        </Section>
      )}
    </div>
  )
}

function DivineLineage({ race, char, update }) {
  return (
    <Section title="Detalhe do Deus Pai" tone="amber">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[360px] overflow-y-auto pr-1">
        {race.deuses.map(deus => {
          const selected = char.racaDeus === deus.id
          return (
            <button
              key={deus.id}
              type="button"
              onClick={() => update({ racaDeus: deus.id, subraca: deus.id })}
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
            <div className="text-amber-300 font-cinzel font-bold text-base">{deus.name} - {deus.title}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mt-3">
              <div><span className="text-txt-dim">Traco: </span><span className="text-txt-main">{deus.traco}</span></div>
              <div><span className="text-txt-dim">Especial: </span><span className="text-txt-main">{deus.especial}</span></div>
            </div>
          </div>
        ) : null
      })()}
    </Section>
  )
}
