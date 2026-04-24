import { useState } from 'react'
import { RACES, RACE_CATEGORIES, getAttrBonusText } from '../../data/races'

export default function StepRace({ char, update }) {
  const [selectedCategory, setSelectedCategory] = useState('all')

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
        Escolha a raça do personagem. Cada raça oferece bônus de Camada 0, passivas raciais com valores mecânicos, vantagens e desvantagens que impactam diretamente a gameplay.
      </p>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${selectedCategory === 'all' ? 'bg-gold text-void' : 'border border-sep text-txt-dim hover:border-gold hover:text-gold'}`}>
          Todas ({Object.keys(RACES).length})
        </button>
        {RACE_CATEGORIES.map(c => {
          const count = Object.values(RACES).filter(r => r.category === c.id).length
          return (
            <button key={c.id} onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${selectedCategory === c.id ? `${c.title} ${c.color} border ${c.color.split(' ')[0]}` : 'border border-sep text-txt-dim hover:border-gold hover:text-gold'}`}>
              {c.label} ({count})
            </button>
          )
        })}
      </div>

      <div className="space-y-3">
        {filteredRaces.map(race => {
          const isSelected = char.raca === race.id
          const catMeta = RACE_CATEGORIES.find(c => c.id === race.category) || RACE_CATEGORIES[0]

          return (
            <div key={race.id}
              className={`rounded-xl border transition-all ${isSelected ? `${catMeta.color} ${catMeta.color.split(' ')[0]}` : 'bg-deep border-sep hover:border-gold/50'}`}>

              {!isSelected ? (
                <button type="button" onClick={() => handleSelectRace(race.id)}
                  className="w-full text-left px-5 py-4 flex items-center gap-4">
                  <span className="text-2xl shrink-0">{race.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-cinzel text-lg text-txt-main">{race.name}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded border ${catMeta.badge}`}>{catMeta.label}</span>
                      <span className="text-txt-dim text-[11px] ml-1">{'⭐'.repeat(race.dificuldade || 1)}</span>
                    </div>
                    <p className="text-txt-dim text-xs mt-1 line-clamp-2">{race.desc}</p>
                  </div>
                  <span className="text-gold/50 text-sm shrink-0">Selecionar →</span>
                </button>
              ) : (
                <div className="px-5 py-4 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">{race.icon}</span>
                      <span className={`font-cinzel text-xl ${catMeta.title}`}>{race.name}</span>
                      <span className={`text-[9px] px-2 py-0.5 rounded border ${catMeta.badge}`}>{catMeta.label}</span>
                      <span className="text-txt-dim text-[11px] ml-1">{'⭐'.repeat(race.dificuldade || 1)}</span>
                      <button onClick={() => update({ raca: '', racaTipo: '', racaDeus: null })}
                        className="ml-auto text-txt-dim text-xs hover:text-err transition-colors">✕ Remover</button>
                    </div>
                    <p className="text-txt-dim text-xs italic">{race.quote}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-void/60 rounded-lg p-3 border border-sep/30">
                      <div className="text-gold text-[11px] font-semibold mb-2 uppercase tracking-wider">Camada 0 — Bônus Inato</div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-txt-dim">Atributos</span>
                          <span className="text-sky-400 font-mono">{getAttrBonusText(race)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-txt-dim">Vida</span>
                          <span className={`font-mono ${race.layer0.hpMod >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {race.layer0.hpLabel || `${race.layer0.hpMod >= 0 ? '+' : ''}${race.layer0.hpMod} HP`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {race.passivasRaciais.length > 0 && (
                      <div className="bg-void/60 rounded-lg p-3 border border-sep/30">
                        <div className="text-amber-300 text-[11px] font-semibold mb-2 uppercase tracking-wider">Passivas Raciais ({race.passivasRaciais.length})</div>
                        <div className="space-y-1.5">
                          {race.passivasRaciais.map((pr, i) => (
                            <div key={i}>
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${pr.tipo === 'Ativa' ? 'bg-amber-300/15 text-amber-300' : 'bg-emerald-400/15 text-emerald-400'}`}>
                                  {pr.tipo === 'Ativa' ? 'ATV' : 'PSV'}
                                </span>
                                <span className="text-txt-main text-xs font-semibold">{pr.nome}</span>
                              </div>
                              <p className="text-txt-dim text-[11px] mt-0.5 leading-relaxed">{pr.efeito}</p>
                              <div className="flex gap-3 text-[10px] text-txt-dim/60 mt-0.5">
                                {pr.custo && pr.custo !== '—' && <span>Custo: <span className="text-amber-300/80">{pr.custo}</span></span>}
                                {pr.duracao && pr.duracao !== 'Contínuo' && <span>Duração: <span className="text-sky-400/80">{pr.duracao}</span></span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="bg-void/60 rounded-lg p-3 border border-sep/30">
                      <div className="text-emerald-400 text-[11px] font-semibold mb-2 uppercase tracking-wider">Vantagens ({race.vantagens.length})</div>
                      <ul className="space-y-1">
                        {race.vantagens.map((v, i) => (
                          <li key={i} className="text-[11px] text-txt-dim flex gap-1.5">
                            <span className="text-emerald-400/60 shrink-0">+</span>
                            <span>{v}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="bg-void/60 rounded-lg p-3 border border-red-400/15">
                    <div className="text-red-400 text-[11px] font-semibold mb-2 uppercase tracking-wider">Desvantagens ({race.desvantagens.length})</div>
                    <div className="flex flex-wrap gap-x-6 gap-y-1">
                      {race.desvantagens.map((d, i) => (
                        <span key={i} className="text-[11px] text-txt-dim flex gap-1.5">
                          <span className="text-red-400/60 shrink-0">-</span>
                          <span>{d}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {race.layer0.requiresDeus && race.deuses && (
                    <div className="bg-void/60 rounded-lg p-3 border border-amber-300/20">
                      <div className="text-amber-300 text-[11px] font-semibold mb-2 uppercase tracking-wider">Deus Pai — Linhagem</div>
                      <div className="grid grid-cols-4 gap-2">
                        {race.deuses.map(deus => {
                          const selected = char.racaDeus === deus.id
                          return (
                            <button key={deus.id} type="button"
                              onClick={() => update({ racaDeus: deus.id })}
                              className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                                selected ? 'border-amber-300/50 bg-amber-300/10' : 'border-sep/40 hover:border-amber-300/30'
                              }`}>
                              <span className={`font-semibold ${selected ? 'text-amber-300' : 'text-txt-main'}`}>{deus.name}</span>
                              <div className="text-[10px] text-sky-400 font-mono mt-0.5">
                                {Object.entries(deus.attr).map(([a, v]) => `${v >= 0 ? '+' : ''}${v}${a}`).join(' ')}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                      {char.racaDeus && (() => {
                        const deus = race.deuses.find(d => d.id === char.racaDeus)
                        return deus ? (
                          <div className="mt-2 bg-amber-300/5 rounded-lg p-3 border border-amber-300/15">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-amber-300 font-cinzel font-bold">{deus.name}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                              <div>
                                <span className="text-txt-dim">Traço: </span>
                                <span className="text-txt-main">{deus.traco}</span>
                              </div>
                              <div>
                                <span className="text-txt-dim">Especial: </span>
                                <span className="text-txt-main">{deus.especial}</span>
                              </div>
                            </div>
                          </div>
                        ) : null
                      })()}
                    </div>
                  )}

                  {race.formas && (
                    <div className="bg-void/60 rounded-lg p-3 border border-amber-300/20">
                      <div className="text-amber-300 text-[11px] font-semibold mb-2 uppercase tracking-wider">Formas Disponíveis</div>
                      <div className="grid grid-cols-3 gap-2">
                        {race.formas.map((f, i) => (
                          <div key={i} className="bg-deep rounded-lg p-3 border border-sep/40">
                            <span className="font-semibold text-amber-300 text-sm">{f.nome}</span>
                            {Object.keys(f.attrBonus).length > 0 && (
                              <div className="text-sky-400 font-mono text-[11px] mt-1">
                                {Object.entries(f.attrBonus).map(([a, v]) => `${v >= 0 ? '+' : ''}${v}${a}`).join(' ')}
                              </div>
                            )}
                            {f.hpExtra > 0 && <span className="text-emerald-400 font-mono text-[11px] ml-2">+{f.hpExtra} HP</span>}
                            {f.garras && <span className="text-red-400 font-mono text-[11px] ml-2">Garras {f.garras}</span>}
                            <p className="text-txt-dim text-[11px] mt-1">{f.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-gold text-[11px] font-semibold mb-2 uppercase tracking-wider">Evolução de Poder (por Nível)</div>
                    <div className="space-y-1.5">
                      {race.progressaoPoder.map((p, i) => {
                        const active = char.nivel >= p.nivel
                        return (
                          <div key={i} className={`flex gap-4 items-start text-xs py-1.5 ${active ? 'text-txt-main' : 'text-txt-dim/40'}`}>
                            <span className={`shrink-0 w-12 text-center font-mono font-bold rounded px-1.5 py-0.5 text-[10px] ${active ? 'bg-gold/15 text-gold border border-gold/20' : 'bg-sep/20 text-txt-dim/40'}`}>
                              N{p.nivel}
                            </span>
                            <div className="flex-1">
                              <span className="font-semibold">{p.ganho}</span>
                              <span className="text-txt-dim ml-1">{p.desc}</span>
                              {p.custo && <span className="text-amber-300/80 ml-1 font-mono text-[10px]">[{p.custo}]</span>}
                              {p.duracao && p.duracao !== 'Contínuo' && <span className="text-sky-400/80 ml-1 font-mono text-[10px]">[{p.duracao}]</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {race.marcosExperiencia && race.marcosExperiencia.length > 0 && (
                    <div>
                      <div className="text-purple-400 text-[11px] font-semibold mb-2 uppercase tracking-wider">Marcos de Experiência (conquistas narrativas)</div>
                      <div className="space-y-1.5">
                        {race.marcosExperiencia.map((item, i) =>
                          item.marcos ? (
                            <div key={i} className="space-y-1.5">
                              <div className="flex items-center gap-2 text-xs py-1">
                                <span className="shrink-0 w-6 text-center text-purple-400 text-base">◆</span>
                                <span className="text-purple-300 font-cinzel font-bold">{item.titulo}</span>
                                <span className="text-txt-dim text-[10px]">— {item.desc}</span>
                              </div>
                              {item.marcos.map((m, j) => (
                                <div key={j} className="flex gap-4 items-start text-xs py-1 pl-6">
                                  <span className="shrink-0 w-6 text-center text-purple-400/60 text-sm">◇</span>
                                  <div className="flex-1">
                                    <span className="text-txt-main font-semibold">{m.marco}</span>
                                    <span className="text-emerald-400 ml-1">{m.ganho}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div key={i} className="flex gap-4 items-start text-xs py-1.5">
                              <span className="shrink-0 w-6 text-center text-purple-400 text-base">◆</span>
                              <div className="flex-1">
                                <span className="text-txt-main font-semibold">{item.marco}</span>
                                <span className="text-emerald-400 ml-1">{item.ganho}</span>
                              </div>
                            </div>
                          )
                        )}
                      </div>
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
