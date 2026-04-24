import { useState } from 'react'
import { RACES, RACE_CATEGORIES, getAttrBonusText } from '../../data/races'

export default function StepRace({ char, update }) {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [expandedRace, setExpandedRace] = useState(null)

  const selectedRaceData = char.raca ? RACES[char.raca] : null

  function handleSelectRace(raceId) {
    const race = RACES[raceId]
    const patch = {
      raca: raceId,
      racaTipo: RACE_CATEGORIES.find(c => c.id === race.category)?.label || '',
    }
    if (race.layer0?.requiresDeus && !char.racaDeus) {
      patch.racaDeus = race.deuses[0]?.id || null
    }
    if (!race.layer0?.requiresDeus) {
      patch.racaDeus = null
    }
    update(patch)
  }

  const filteredRaces = selectedCategory === 'all'
    ? Object.values(RACES)
    : Object.values(RACES).filter(r => r.category === selectedCategory)

  return (
    <div className="space-y-6">
      <h2 className="font-cinzel text-gold text-xl">Etapa — Raça</h2>
      <p className="text-txt-dim text-sm">
        Escolha a raça do personagem. Cada raça oferece bônus, traços inatos, vantagens e desvantagens únicos que afetam diretamente a gameplay.
      </p>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${selectedCategory === 'all' ? 'bg-gold text-void' : 'border border-sep text-txt-dim hover:border-gold hover:text-gold'}`}>
          Todas
        </button>
        {RACE_CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${selectedCategory === cat.id ? 'bg-gold text-void' : 'border border-sep text-txt-dim hover:border-gold hover:text-gold'}`}>
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {filteredRaces.map(race => {
          const isSelected = char.raca === race.id
          const isExpanded = expandedRace === race.id
          const catMeta = RACE_CATEGORIES.find(c => c.id === race.category) || RACE_CATEGORIES[0]

          return (
            <div key={race.id}
              className={`bg-deep border rounded-lg overflow-hidden transition-all ${
                isSelected ? 'border-gold shadow-[0_0_15px_rgba(201,168,76,0.3)]' : 'border-sep hover:border-gold'
              }`}>
              <button type="button" onClick={() => handleSelectRace(race.id)}
                className="w-full text-left px-4 py-3 flex items-center gap-3">
                <span className="text-xl shrink-0">{race.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-cinzel text-base ${isSelected ? 'text-gold' : 'text-txt-main'}`}>{race.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${catMeta.badge}`}>{catMeta.label}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-txt-dim text-[11px] font-mono">
                      HP: <span className={race.layer0.hpMod >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {race.layer0.hpMod >= 0 ? '+' : ''}{race.layer0.hpLabel || race.layer0.hpMod}
                      </span>
                    </span>
                    <span className="text-txt-dim text-[11px]">Atr: <span className="text-sky-400">{getAttrBonusText(race)}</span></span>
                    <span className="text-txt-dim text-[11px] ml-auto">{getDiffStars(race.dificuldade)}</span>
                  </div>
                </div>
              </button>

              {isSelected && (
                <div className="border-t border-gold/30 px-4 py-3 space-y-3">
                  <p className="text-txt-dim text-xs italic">{race.quote}</p>
                  <p className="text-txt-dim text-xs">{race.desc}</p>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-void/60 rounded-lg p-2.5 border border-sep/30">
                      <div className="text-[10px] text-gold font-semibold mb-1.5 uppercase tracking-wider">Camada 0</div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-txt-dim">Atributos</span>
                          <span className="text-sky-400 font-mono text-[11px]">{getAttrBonusText(race)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-txt-dim">Vida</span>
                          <span className={`font-mono text-[11px] ${race.layer0.hpMod >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {race.layer0.hpLabel || `${race.layer0.hpMod >= 0 ? '+' : ''}${race.layer0.hpMod}`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-void/60 rounded-lg p-2.5 border border-sep/30">
                      <div className="text-[10px] text-gold font-semibold mb-1.5 uppercase tracking-wider">Traços Inatos</div>
                      <div className="space-y-1 text-xs">
                        {race.layer0.tracoAtivo && (
                          <div>
                            <span className="text-amber-300 font-semibold text-[11px]">ATV: </span>
                            <span className="text-txt-dim text-[11px]">{race.layer0.tracoAtivo.nome}</span>
                          </div>
                        )}
                        {race.layer0.tracoPassivo && (
                          <div>
                            <span className="text-emerald-400 font-semibold text-[11px]">PSV: </span>
                            <span className="text-txt-dim text-[11px]">{race.layer0.tracoPassivo.nome}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {race.layer0.requiresDeus && (
                    <div className="bg-void/60 rounded-lg p-3 border border-amber-300/20">
                      <div className="text-[10px] text-amber-300 font-semibold mb-2 uppercase tracking-wider">Deus Pai (Linhagem)</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {race.deuses.map(deus => (
                          <button key={deus.id} type="button"
                            onClick={() => update({ racaDeus: deus.id })}
                            className={`text-left px-2 py-1.5 rounded border text-[11px] transition-colors ${
                              char.racaDeus === deus.id
                                ? 'border-amber-300/50 bg-amber-300/10 text-amber-300'
                                : 'border-sep/40 text-txt-dim hover:border-amber-300/30'
                            }`}>
                            <span className="font-semibold">{deus.name}</span>
                            <div className="text-[10px] text-txt-dim/60 mt-0.5">
                              {Object.entries(deus.attr).map(([a, v]) => `${v >= 0 ? '+' : ''}${v}${a}`).join(' ')}
                            </div>
                          </button>
                        ))}
                      </div>
                      {char.racaDeus && (() => {
                        const deus = race.deuses.find(d => d.id === char.racaDeus)
                        return deus ? (
                          <div className="mt-2 bg-amber-300/5 rounded p-2 border border-amber-300/15 text-[11px]">
                            <span className="text-amber-300 font-semibold">{deus.name}:</span>
                            <span className="text-txt-dim"> {deus.traco} — {deus.especial}</span>
                          </div>
                        ) : null
                      })()}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[10px] text-emerald-400 font-semibold mb-1 uppercase tracking-wider">Vantagens</div>
                      <ul className="space-y-0.5">
                        {race.vantagens.map((v, i) => (
                          <li key={i} className="text-[11px] text-txt-dim flex gap-1">
                            <span className="text-emerald-400/60 shrink-0">+</span>
                            <span>{v}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-[10px] text-red-400 font-semibold mb-1 uppercase tracking-wider">Desvantagens</div>
                      <ul className="space-y-0.5">
                        {race.desvantagens.map((d, i) => (
                          <li key={i} className="text-[11px] text-txt-dim flex gap-1">
                            <span className="text-red-400/60 shrink-0">-</span>
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <button type="button"
                    onClick={() => setExpandedRace(isExpanded ? null : race.id)}
                    className="w-full text-center text-[11px] text-gold/70 hover:text-gold transition-colors py-1">
                    {isExpanded ? '▲ Menos' : '▼ Progressão Completa'}
                  </button>

                  {isExpanded && (
                    <div className="space-y-2 border-t border-sep/30 pt-3">
                      <div className="text-[10px] text-gold font-semibold uppercase tracking-wider">Progressão por Nível</div>
                      {race.progressao.map((p, i) => {
                        const active = char.nivel >= p.nivel
                        return (
                          <div key={i} className={`flex gap-3 items-start text-[11px] ${active ? 'text-txt-main' : 'text-txt-dim/50'}`}>
                            <span className={`shrink-0 w-8 text-center font-mono font-bold rounded px-1 py-0.5 text-[10px] ${active ? 'bg-gold/15 text-gold border border-gold/20' : 'bg-sep/20 text-txt-dim/50'}`}>
                              N{p.nivel}
                            </span>
                            <div>
                              <span className="font-semibold">{p.ganho}</span>
                              <span className="text-txt-dim"> — {p.desc}</span>
                            </div>
                          </div>
                        )
                      })}
                      {race.progressaoIdade && (
                        <>
                          <div className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider mt-3">Progressão por Idade (Vampiro)</div>
                          {race.progressaoIdade.map((p, i) => (
                            <div key={i} className="flex gap-3 items-start text-[11px]">
                              <span className="shrink-0 w-20 text-center font-mono font-bold rounded px-1 py-0.5 text-[10px] bg-purple-400/10 text-purple-400 border border-purple-400/20">
                                {p.idade}
                              </span>
                              <div>
                                <span className="font-semibold">{p.ganho}</span>
                                <span className="text-txt-dim"> — {p.efeito}</span>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                      {race.formas && (
                        <>
                          <div className="text-[10px] text-amber-300 font-semibold uppercase tracking-wider mt-3">Formas (Dasariano)</div>
                          {race.formas.map((f, i) => (
                            <div key={i} className="bg-void/40 border border-sep/30 rounded p-2 text-[11px]">
                              <span className="font-semibold text-amber-300">{f.nome}</span>
                              {Object.keys(f.attrBonus).length > 0 && (
                                <span className="text-sky-400 font-mono ml-2">
                                  {Object.entries(f.attrBonus).map(([a, v]) => `${v >= 0 ? '+' : ''}${v}${a}`).join(' ')}
                                </span>
                              )}
                              {f.hpExtra > 0 && <span className="text-emerald-400 font-mono ml-2">+{f.hpExtra} HP</span>}
                              {f.garras && <span className="text-red-400 font-mono ml-2">Garras {f.garras}</span>}
                              <p className="text-txt-dim mt-0.5">{f.desc}</p>
                            </div>
                          ))}
                        </>
                      )}
                      {race.bonusMorte && (
                        <>
                          <div className="text-[10px] text-red-400 font-semibold uppercase tracking-wider mt-3">Bônus por Morte (Demônio)</div>
                          {race.bonusMorte.map((b, i) => (
                            <div key={i} className="flex gap-3 items-start text-[11px]">
                              <span className="shrink-0 w-16 text-center font-mono font-bold rounded px-1 py-0.5 text-[10px] bg-red-400/10 text-red-400 border border-red-400/20">
                                {b.mortes} mortes
                              </span>
                              <span className="text-txt-dim">{b.ganho}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getDiffStars(n) {
  return '⭐'.repeat(n || 1)
}
