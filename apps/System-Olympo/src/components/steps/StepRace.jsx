import { useMemo, useState } from 'react'
import { RACES, RACE_CATEGORIES } from '../../data/races'
import { getRaceProfile } from '../../data/raceProfiles'
import { getRaceTree } from '../../data/raceTrees'
import {
  ATTR_KEYS,
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

function formatAttrs(attrs = {}) {
  return Object.entries(attrs)
    .filter(([, value]) => value !== 0)
    .map(([attr, value]) => `${value >= 0 ? '+' : ''}${value}${attr}`)
    .join('  ')
}

function pushBonusChips(chips, bonus = {}) {
  if (bonus.hp) chips.push(`${bonus.hp >= 0 ? '+' : ''}${bonus.hp} HP`)
  if (bonus.energia) chips.push(`${bonus.energia >= 0 ? '+' : ''}${bonus.energia} Energia`)
  if (bonus.pe) chips.push(`+${bonus.pe} PE`)
  if (bonus.pericias) chips.push(`+${bonus.pericias} Perícias`)
  if (bonus.modules) chips.push(`+${bonus.modules} Módulo`)
  if (bonus.attrsEscolher) {
    chips.push(`Escolhe ${bonus.attrsEscolher.qtd} atributo${bonus.attrsEscolher.qtd > 1 ? 's' : ''}`)
  }
  if (bonus.attrs) {
    Object.entries(bonus.attrs)
      .filter(([, value]) => value !== 0)
      .forEach(([attr, value]) => chips.push(`${value >= 0 ? '+' : ''}${value} ${attr}`))
  }
}

function getBonusChips(profile, selectedSubrace, selectedGod) {
  const chips = []
  pushBonusChips(chips, profile?.bonus)
  if (selectedGod?.attr) {
    Object.entries(selectedGod.attr)
      .filter(([, value]) => value !== 0)
      .forEach(([attr, value]) => chips.push(`${value >= 0 ? '+' : ''}${value} ${attr}`))
  }
  pushBonusChips(chips, selectedSubrace?.bonus)
  return chips.length ? [...new Set(chips)].slice(0, 8) : ['Sem bônus inicial']
}

function getPowerItems(profile, selectedGod) {
  const base = profile?.poderesBase || []
  if (!selectedGod) return base
  return [
    { nome: `Traço de ${selectedGod.name}`, icon: 'auto_awesome', desc: selectedGod.traco },
    { nome: 'Especial da linhagem', icon: 'bolt', desc: selectedGod.especial },
    ...base.filter(power => power.nome !== 'Herança Divina').slice(0, 3),
  ]
}

function getBranchPreview(tree, branch) {
  const branchNodes = tree.nodes.filter(node => node.branch === branch.id && !node.upgradeOf)
  const opener = branchNodes.find(node => node.tier === 1 && node.effects?.some(effect => effect.type === 'habilidade'))
    || branchNodes.find(node => node.tier === 1)
    || branchNodes[0]
  const capstone = [...branchNodes].reverse().find(node => node.tier === 4 && node.effects?.some(effect => effect.type === 'habilidade'))
    || [...branchNodes].reverse().find(node => node.tier === 4)
    || branchNodes[branchNodes.length - 1]
  return { opener, capstone, total: branchNodes.length }
}

function shortPathName(name = '') {
  return name
    .replace(/^Caminho\s+(do|da|das|dos|de)\s+/i, '')
    .replace(/^Caminho\s+/i, '')
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
  const selectedGod = race.deuses?.find(d => d.id === char.racaDeus) || race.deuses?.[0] || null
  const bonusChips = getBonusChips(profile, selectedSubrace, selectedGod)
  const powerItems = getPowerItems(profile, selectedGod)
  const layer = race.layer0?.attrBonus || {}

  const allowedAttrs = layer.escolherOpcoes || ATTR_KEYS
  const selectedChoiceCount = Object.values(char.racaAttrChoices || {}).filter(Boolean).length
  const maxChoices = layer.escolherQtd || 0

  return (
    <div className="race-detail-panel race-detail-panel--expanded">
      <div className="race-panel-kicker">
        <span className="material-symbols-outlined text-gold text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>expand_more</span>
        <span>Detalhes da Raça Selecionada</span>
        <div />
      </div>

      <div className="race-dossier-shell">
        <div className="race-dossier-hero">
          <div className="race-dossier-sigil">{race.icon}</div>
          <div className="race-dossier-copy">
            <div className="race-dossier-title-row">
              <h3 className={`font-cinzel ${catMeta.title}`}>{race.name}</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${catMeta.badge}`}>{catMeta.label}</span>
            </div>
            <p className="race-dossier-desc">{race.desc}</p>
            {race.quote && <p className="race-dossier-quote">{race.quote}</p>}
            <div className="race-bonus-strip">
              {bonusChips.map((chip, i) => (
                <span key={`${chip}-${i}`}>{chip}</span>
              ))}
            </div>
          </div>
          <button type="button" onClick={onClear} className="race-soft-button shrink-0 text-xs">Remover</button>
        </div>

        {race.layer0?.requiresDeus && race.deuses && (
          <DivineLineage race={race} selectedGod={selectedGod} update={update} />
        )}

        <div className="race-impact-grid">
          {profile?.fraquezas?.length > 0 && (
            <section className="race-impact-card race-impact-card--weak">
              <h4 className="race-impact-title">
                <span className="material-symbols-outlined text-rose-400 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                Fraquezas
              </h4>
              <ul className="race-impact-list">
                {profile.fraquezas.map((fq, i) => (
                  <li key={i} className="race-impact-item">
                    <span className="material-symbols-outlined text-rose-400/80 text-base shrink-0">{fq.icon}</span>
                    <div className="min-w-0">
                      <span>{fq.nome}</span>
                      <p>{fq.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {powerItems.length > 0 && (
            <section className="race-impact-card race-impact-card--power">
              <h4 className="race-impact-title">
                <span className="material-symbols-outlined text-amber-300 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                Poderes e Potenciais
              </h4>
              <ul className="race-impact-list race-impact-list--power">
                {powerItems.map((pw, i) => (
                  <li key={i} className="race-impact-item">
                    <span className="material-symbols-outlined text-amber-300/80 text-base shrink-0">{pw.icon}</span>
                    <div className="min-w-0">
                      <span>{pw.nome}</span>
                      <p>{pw.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {layer.escolher && (
          <div className="race-attribute-choice-row">
            <span className="text-[10px] uppercase tracking-[0.16em] text-txt-dim">
              Escolha {maxChoices} atributos (+{layer.escolherValor || 1} cada) - {selectedChoiceCount}/{maxChoices}
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {allowedAttrs.map(attr => {
                const selected = !!char.racaAttrChoices?.[attr]
                const disabled = !selected && selectedChoiceCount >= maxChoices
                return (
                  <button
                    key={attr}
                    type="button"
                    disabled={disabled}
                    onClick={() => onToggleAttr(race, attr)}
                    className={`race-choice-chip race-choice-chip--sm ${selected ? 'is-selected' : ''} ${disabled ? 'is-disabled' : ''}`}
                  >
                    {attr}{selected ? ` +${layer.escolherValor || 1}` : ''}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {tree && (
          <section className="race-pathway-section">
            <h4 className="race-minimal-section-label">
              <span className="material-symbols-outlined text-purple-400 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>account_tree</span>
              Árvore racial - {tree.name}
            </h4>
            <div className="race-pathway-map">
              {tree.branches.map(branch => {
                const preview = getBranchPreview(tree, branch)
                return (
                  <article key={branch.id} className="race-pathway" style={{ '--path-color': branch.color }}>
                    <div className="race-pathway-orb">
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{branch.icon}</span>
                      <strong>{shortPathName(branch.name)}</strong>
                      <small>{preview.total} nós</small>
                    </div>
                    <div className="race-pathway-caption">
                      <p>{branch.desc}</p>
                      {preview.opener && <span>Início: {preview.opener.name}</span>}
                      {preview.capstone && <span>Ápice: {preview.capstone.name}</span>}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )}

        {subraces.length > 0 && (
          <section className="race-subrace-section">
            <h4 className="race-minimal-section-label">
              <span className="material-symbols-outlined text-purple-400 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>fork_right</span>
              {race.id === 'SEMIDEUS' ? 'Caminho de Ascensão' : 'Sub-raças'}
            </h4>
            <div className="race-subrace-pills">
              {subraces.map(sub => {
                const selected = selectedSubrace?.id === sub.id
                const subAttrs = []
                if (sub.bonus?.hp) subAttrs.push(`${sub.bonus.hp >= 0 ? '+' : ''}${sub.bonus.hp} HP`)
                if (sub.bonus?.pe) subAttrs.push(`+${sub.bonus.pe} PE`)
                if (sub.bonus?.pericias) subAttrs.push(`+${sub.bonus.pericias} Perícias`)
                Object.entries(sub.bonus?.attrs || {}).filter(([, v]) => v !== 0).forEach(([a, v]) => subAttrs.push(`${v >= 0 ? '+' : ''}${v} ${a}`))

                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => onSubraceSelect(race, sub)}
                    className={`race-subrace-pill ${selected ? 'is-selected' : ''}`}
                  >
                    <span className="race-subrace-pill-name">{sub.name}</span>
                    {subAttrs.length > 0 && (
                      <span className="race-subrace-pill-stats">{subAttrs.join(' · ')}</span>
                    )}
                  </button>
                )
              })}
            </div>
            {selectedSubrace?.note && (
              <p className="race-subrace-note">{selectedSubrace.note}</p>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

function DivineLineage({ race, selectedGod, update }) {
  return (
    <section className="race-lineage-panel">
      <h4 className="race-minimal-section-label">
        <span className="material-symbols-outlined text-amber-300 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
        Linhagem divina
      </h4>
      <div className="race-lineage-scroll">
        {race.deuses.map(deus => {
          const selected = selectedGod?.id === deus.id
          return (
            <button
              key={deus.id}
              type="button"
              onClick={() => update({ racaDeus: deus.id })}
              className={`race-lineage-chip ${selected ? 'is-selected' : ''}`}
            >
              <span>{deus.name}</span>
              <small>{formatAttrs(deus.attr)}</small>
            </button>
          )
        })}
      </div>

      {selectedGod && (
        <div className="race-lineage-focus">
          <div>
            <span>Traço</span>
            <p>{selectedGod.traco}</p>
          </div>
          <div>
            <span>Especial</span>
            <p>{selectedGod.especial}</p>
          </div>
        </div>
      )}
    </section>
  )
}
