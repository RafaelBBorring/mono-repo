import { useState } from 'react'
import { ATTR_LABELS, ATTR_ICONS, getModifier } from '../../data/attributes'
import { calcVidaTotal, calcEnergiaTotal, calcPeTotal, calcCA, calcReacoes, calcPercepcaoPassiva, calcDanoBase, calcAbilityCostReduction } from '../../utils/calculator'
import { exportSheet } from '../../utils/exporter'
import { WEAPONS, WEAPON_RANKS } from '../../data/weapons'
import { MARTIAL_ARTS } from '../../data/martialArts'
import { PERICIAS, GRAU_NAMES, getGrauBonus } from '../../data/pericias'
import { TRIAGES } from '../../data/triages'
import { MODULES_PASSIVE, MODULES_ACTIVE, MODULES_SPECIAL } from '../../data/modules'
import InventorySection from '../InventorySection'

const STATUS_COLORS = { Pendente: 'text-warn', Aprovada: 'text-ok', 'Revisão necessária': 'text-err' }
const STATUS_OPTIONS = ['Pendente', 'Aprovada', 'Revisão necessária']

export default function Step11Review({ char, onSave, onEdit, onNew, update, updateHabilidade }) {
  return <ReviewContent char={char} onSave={onSave} onEdit={onEdit} onNew={onNew} update={update} updateHabilidade={updateHabilidade} />
}

function ReviewContent({ char, onSave, onEdit, onNew, update, updateHabilidade }) {
  const sk = char.skeletonPoints || {}
  const totalAttr = (a) => (char.atributos[a] || 0) + (sk[a] || 0)
  const cls = char.classe

  const derived = {
    vida: cls ? calcVidaTotal(cls, char.nivel, char.atributos, sk, char.choices, char.triagemPrincipal, char.triagemPrincipalNivel) : 0,
    energia: cls ? calcEnergiaTotal(cls, char.nivel, char.atributos, sk, char.choices, char.triagemPrincipal, char.triagemPrincipalNivel, char.subTriagem, char.subTriagemNivel) : 0,
    pe: cls ? calcPeTotal(cls, char.nivel, char.choices) : 0,
    ca: cls ? calcCA(char.atributos, sk, char.pericias) : 0,
    reacoes: calcReacoes(char.atributos, sk, char.triagemPrincipal, char.triagemPrincipalNivel, char.subTriagem, char.subTriagemNivel),
    percepcao: cls ? calcPercepcaoPassiva(char.atributos, sk, char.pericias) : 0,
    danoBase: cls ? calcDanoBase(cls, char.atributos, sk) : '',
  }

  const vidaNow = char.vidaOverride ?? derived.vida
  const energiaNow = char.energiaOverride ?? derived.energia
  const peNow = char.peOverride ?? derived.pe

  const costReduction = calcAbilityCostReduction(char.triagemPrincipal, char.triagemPrincipalNivel || 0, char.subTriagem, char.subTriagemNivel || 0)

  const weapon = WEAPONS.find(w => w.id === char.arma)
  const weaponRank = WEAPON_RANKS.find(r => r.rank === char.armaRank) || WEAPON_RANKS[0]
  const martialArt = MARTIAL_ARTS.find(a => a.id === char.arteMarcial)

  const allModules = [...MODULES_PASSIVE, ...MODULES_ACTIVE, ...MODULES_SPECIAL]
  const acquiredModules = (char.modulosAdquiridos || []).map(am => {
    const found = allModules.find(m => m.id === am.id)
    return found ? { ...found, boughtCount: am.boughtCount || 1 } : null
  }).filter(Boolean)

  const periciasArr = Object.entries(char.pericias || {}).filter(([, v]) => v > 0)

  function handleCopy() {
    navigator.clipboard.writeText(exportSheet(char, derived)).catch(() => {})
  }

  function setOverride(field, raw) {
    if (!update) return
    const val = Number(raw)
    if (isNaN(val)) return
    update({ [field]: val })
  }

  function clearOverride(field) {
    if (!update) return
    update({ [field]: null })
  }

  const canEdit = !!update

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          <button onClick={handleCopy} className="border border-sep text-txt-dim px-4 py-2 rounded text-sm hover:border-gold hover:text-txt-main transition-colors">
            Copiar Texto
          </button>
          <button onClick={onSave} className="bg-gold text-void font-semibold px-5 py-2 rounded text-sm hover:bg-gold-light transition-colors">
            Salvar Ficha ✓
          </button>
        </div>
      </div>

      <div className="bg-deep/90 backdrop-blur border border-gold/20 rounded-lg overflow-hidden shadow-lg shadow-gold/5">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-void via-deep to-void border-b border-gold/20 px-6 py-5">
          <div className="flex items-center gap-5">
            <div className="shrink-0">
              {char.avatar ? (
                <img src={char.avatar} alt="" className="w-20 h-20 rounded-full border-2 border-gold/50 shadow-md shadow-gold/10 object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full border-2 border-sep bg-void flex items-center justify-center"><span className="text-txt-dim text-2xl">👤</span></div>
              )}
            </div>
            <div className="flex-1">
              <h1 className="font-cinzel text-gold text-3xl leading-tight">{char.nome || 'Sem Nome'}</h1>
              <p className="text-txt-dim text-sm mt-1">FICHA DE PERSONAGEM — SISTEMA OLYMPO 2.0</p>
              <div className="flex gap-3 mt-2 text-xs text-txt-dim">
                <span className="bg-gold/10 text-gold px-2 py-0.5 rounded">{cls || '—'}</span>
                <span className="bg-panel px-2 py-0.5 rounded">Nível {char.nivel}</span>
                <span className="bg-panel px-2 py-0.5 rounded">{char.raca || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

            {/* LEFT COLUMN */}
            <div className="lg:col-span-7 space-y-5">

              {/* ATRIBUTOS */}
              <section>
                <h3 className="font-cinzel text-amber-400 text-sm uppercase tracking-wider mb-2 border-b border-amber-400/20 pb-1">📊 Atributos</h3>
                <div className="grid grid-cols-6 gap-2">
                  {['FOR','DES','CON','INT','APA','AM'].map(a => {
                    const v = totalAttr(a)
                    const m = getModifier(v)
                    return (
                      <div key={a} className="bg-void rounded-lg border border-sep flex flex-col items-center justify-center aspect-square">
                        <div className="text-[10px] text-txt-dim">{ATTR_ICONS[a]}</div>
                        <div className="font-cinzel text-gold text-xs">{a}</div>
                        <div className="font-mono text-txt-main text-xl leading-none mt-0.5">{v}</div>
                        <div className="font-mono text-gold text-xs">({m >= 0 ? '+' : ''}{m})</div>
                      </div>
                    )
                  })}
                </div>
              </section>

              {/* RECURSOS */}
              <section>
                <h3 className="font-cinzel text-blue-400 text-sm uppercase tracking-wider mb-2 border-b border-blue-400/20 pb-1">💎 Recursos</h3>
                <div className="grid grid-cols-3 gap-3">
                  <ResBox label="Vida" icon="❤" current={vidaNow} max={derived.vida} color="text-emerald-400" ring="border-emerald-400/30" canEdit={canEdit}
                    hasOverride={char.vidaOverride !== null} onChange={v => setOverride('vidaOverride', v)} onReset={() => clearOverride('vidaOverride')} />
                  <ResBox label="Energia" icon="⚡" current={energiaNow} max={derived.energia} color="text-sky-400" ring="border-sky-400/30" canEdit={canEdit}
                    hasOverride={char.energiaOverride !== null} onChange={v => setOverride('energiaOverride', v)} onReset={() => clearOverride('energiaOverride')} />
                  <ResBox label="PE" icon="✦" current={peNow} max={derived.pe} color="text-amber-400" ring="border-amber-400/30" canEdit={canEdit}
                    hasOverride={char.peOverride !== null} onChange={v => setOverride('peOverride', v)} onReset={() => clearOverride('peOverride')} />
                </div>
              </section>

              {/* COMBATE */}
              <section className="bg-void border border-red-400/20 rounded-lg p-4">
                <h3 className="font-cinzel text-red-400 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">⚔ Combate</h3>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div>
                    <div className="text-txt-dim text-xs mb-1">CA</div>
                    <div className="font-mono text-2xl text-txt-main">{derived.ca}</div>
                  </div>
                  <div>
                    <div className="text-txt-dim text-xs mb-1">Reações</div>
                    <div className="font-mono text-2xl text-txt-main">{derived.reacoes}</div>
                  </div>
                  <div>
                    <div className="text-txt-dim text-xs mb-1">Percepção</div>
                    <div className="font-mono text-2xl text-txt-main">{derived.percepcao}</div>
                  </div>
                  <div>
                    <div className="text-txt-dim text-xs mb-1">Dano Base</div>
                    <div className="font-mono text-xl text-gold">{derived.danoBase}</div>
                  </div>
                </div>
              </section>

              {/* ARMA E ARTE MARCIAL */}
              <section>
                <h3 className="font-cinzel text-orange-400 text-sm uppercase tracking-wider mb-2 border-b border-orange-400/20 pb-1">🗡 Arma e Arte Marcial</h3>
                <div className="grid grid-cols-2 gap-x-6">
                  <F label="Arma" value={weapon ? `${weapon.name} (${weaponRank.rank})` : 'Nenhuma'} />
                  <F label="Dano" value={weapon ? `${weapon.dano} ${weaponRank.danoBonus ? '+ ' + weaponRank.danoBonus : ''}` : '—'} />
                  <F label="Arte Marcial" value={martialArt ? martialArt.name : 'Nenhuma'} />
                  {martialArt && <F label="Grau" value={martialArt.graus[char.arteMarcialGrau || 0]?.nome || 'Novato'} />}
                </div>
              </section>
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-5 space-y-5">

              {/* PERÍCIAS */}
              <section>
                <h3 className="font-cinzel text-cyan-400 text-sm uppercase tracking-wider mb-2 border-b border-cyan-400/20 pb-1">📜 Perícias Treinadas</h3>
                {periciasArr.length > 0 ? (
                  <div className="overflow-hidden rounded border border-sep">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-void text-txt-dim">
                          <th className="text-left px-2 py-1.5 font-body">Perícia</th>
                          <th className="text-center px-2 py-1.5 font-body w-12">Atr.</th>
                          <th className="text-center px-2 py-1.5 font-body w-24">Grau</th>
                          <th className="text-center px-2 py-1.5 font-body w-12">Bônus</th>
                        </tr>
                      </thead>
                      <tbody>
                        {periciasArr.map(([name, grau]) => {
                          const pDef = PERICIAS.find(p => p.name === name)
                          const bestAttr = pDef ? pDef.attrs.map(a => ({ a, v: totalAttr(a) })).reduce((a, b) => a.v >= b.v ? a : b).a : '—'
                          const bonus = pDef ? Math.max(...pDef.attrs.map(a => getModifier(totalAttr(a)))) + getGrauBonus(grau) : grau * 5
                          return (
                            <tr key={name} className="border-t border-sep/50 hover:bg-void/50">
                              <td className="px-2 py-1.5 text-txt-main">{name}</td>
                              <td className="px-2 py-1.5 text-center text-gold font-mono">{bestAttr}</td>
                              <td className="px-2 py-1.5 text-center text-txt-dim">{GRAU_NAMES[grau] || grau}</td>
                              <td className="px-2 py-1.5 text-center font-mono text-cyan-400">{bonus >= 0 ? '+' : ''}{bonus}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-txt-dim text-sm">Nenhuma perícia treinada</p>
                )}
              </section>

              {/* TRIAGENS */}
              <section>
                <h3 className="font-cinzel text-purple-400 text-sm uppercase tracking-wider mb-2 border-b border-purple-400/20 pb-1">★ Triagens</h3>
                <TriagemSection char={char} cls={cls} />
              </section>

              {/* MÓDULOS */}
              <section>
                <h3 className="font-cinzel text-yellow-400 text-sm uppercase tracking-wider mb-2 border-b border-yellow-400/20 pb-1">⚙ Módulos</h3>
                {acquiredModules.length > 0 ? (
                  <div className="space-y-1">
                    {acquiredModules.map((m, i) => (
                      <div key={i} className="bg-void border border-sep rounded px-3 py-1.5 text-xs flex items-center gap-2">
                        <span className="text-txt-main font-semibold">{m.name}</span>
                        {(m.boughtCount || 1) > 1 && <span className="text-gold font-mono">×{m.boughtCount}</span>}
                        <span className="text-txt-dim ml-auto truncate">{m.desc}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-txt-dim text-sm">Nenhum módulo</p>
                )}
              </section>

              {/* HABILIDADES */}
              <section>
                <h3 className="font-cinzel text-indigo-400 text-sm uppercase tracking-wider mb-2 border-b border-indigo-400/20 pb-1">✦ Habilidades</h3>
                {costReduction > 0 && (
                  <div className="mb-2 bg-blue-500/10 border border-blue-500/30 rounded p-2 text-xs text-blue-400">
                    Suporte: −{Math.round(costReduction * 100)}% custo de Buffs
                  </div>
                )}
                <div className="space-y-1">
                  {(char.habilidades || []).map((h, i) => (
                    <HabilidadeCard key={i} h={h} i={i} canEdit={canEdit} updateHabilidade={updateHabilidade} />
                  ))}
                </div>
              </section>

              {/* NOTAS */}
              <section>
                <h3 className="font-cinzel text-txt-main text-sm uppercase tracking-wider mb-2 border-b border-txt-main/20 pb-1">📝 Notas</h3>
                {canEdit ? (
                  <textarea value={char.notas || ''} onChange={e => update({ notas: e.target.value })} placeholder="Notas..." rows={2}
                    className="w-full bg-void border border-sep rounded px-3 py-2 text-sm text-txt-main resize-none" />
                ) : (
                  <p className="text-txt-main text-sm whitespace-pre-wrap">{char.notas || '—'}</p>
                )}
              </section>

              <InventorySection
                items={char.inventario || []}
                canEdit={canEdit}
                onUpdate={(items) => update({ inventario: items })}
              />
            </div>

          </div>
        </div>
      </div>

      <div className="flex justify-center gap-3 pb-4">
        <button onClick={onNew} className="border border-gold text-gold px-5 py-2 rounded text-sm hover:bg-gold hover:text-void transition-colors">Novo Personagem</button>
        <button onClick={onSave} className="bg-gold text-void font-semibold px-6 py-2 rounded text-sm hover:bg-gold-light transition-colors">Salvar e Ir para Biblioteca</button>
      </div>
    </div>
  )
}

function ResBox({ label, icon, current, max, color, ring, canEdit, hasOverride, onChange, onReset }) {
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0
  const barColor = label === 'Vida' ? 'bg-emerald-400' : label === 'Energia' ? 'bg-sky-400' : 'bg-amber-400'
  return (
    <div className={`bg-void border ${ring} rounded-lg p-3`}>
      <div className="flex items-center gap-1 mb-1">
        <span className="text-txt-dim text-xs">{icon}</span>
        <span className="text-txt-dim text-xs font-semibold">{label}</span>
        {hasOverride && <span className="text-[10px] text-gold bg-gold/10 px-1 rounded ml-auto">✎</span>}
      </div>
      {canEdit ? (
        <div className="flex items-baseline gap-1">
          <input type="number" value={current} onChange={e => onChange(e.target.value)}
            className={`font-mono text-xl bg-transparent border-b border-sep w-16 text-right outline-none focus:border-gold ${color}`} />
          <span className="text-txt-dim text-sm font-mono">/ {max}</span>
          {hasOverride && (
            <button onClick={onReset} className="ml-auto text-[10px] text-gold border border-gold/30 px-1 rounded hover:bg-gold/10">↺</button>
          )}
        </div>
      ) : (
        <div className="flex items-baseline gap-1">
          <span className={`font-mono text-xl ${color}`}>{current}</span>
          {current !== max && <span className="text-txt-dim text-sm font-mono">/ {max}</span>}
        </div>
      )}
      <div className="h-1.5 bg-deep rounded-full mt-2 overflow-hidden">
        <div className={`h-full ${barColor} rounded-full transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function HabilidadeCard({ h, i, canEdit, updateHabilidade }) {
  const [open, setOpen] = useState(false)
  const borderClass = h.tipo === 'Ultimate' ? 'border-gold/40' : h.tipo === 'Passiva' ? 'border-emerald-400/30' : h.tipo === 'Extra (Triagem)' ? 'border-purple-400/30' : 'border-indigo-400/20'
  const bgClass = h.tipo === 'Ultimate' ? 'bg-gold/5' : h.tipo === 'Passiva' ? 'bg-emerald-400/5' : h.tipo === 'Extra (Triagem)' ? 'bg-purple-500/5' : 'bg-indigo-400/5'

  return (
    <div className={`rounded border ${borderClass} ${bgClass}`}>
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3 py-2 text-left">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${h.tipo === 'Ultimate' ? 'bg-gold/20 text-gold' : h.tipo === 'Passiva' ? 'bg-emerald-400/20 text-emerald-400' : h.tipo === 'Extra (Triagem)' ? 'bg-purple-400/20 text-purple-400' : 'bg-indigo-400/20 text-indigo-400'}`}>
            {h.tipo === 'Ultimate' ? '★' : h.tipo === 'Passiva' ? 'P' : h.tipo === 'Extra (Triagem)' ? 'E' : h.tipo === 'Ativa' ? `#${i}` : h.tipo}
          </span>
          <span className="text-txt-main text-xs font-semibold truncate">{h.nome || '—'}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] ${STATUS_COLORS[h.status] || 'text-txt-dim'}`}>{h.status}</span>
          <span className="text-txt-dim text-[10px]">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2 border-t border-sep/30">
          {!canEdit ? (
            <>
              <p className="text-txt-dim text-xs pt-2">{h.descricao || 'Sem descrição'}</p>
              <div className="flex flex-wrap gap-3 text-[10px] font-mono">
                {h.custoEnergia > 0 && <span className="text-sky-400">⚡{h.custoEnergia}</span>}
                {h.dano && <span className="text-red-400">⚔{h.dano}</span>}
                {h.duracao && <span className="text-txt-dim">⏱{h.duracao}</span>}
                <span className="text-amber-400">SCP:{h.camadaSCP}</span>
                <span className="text-purple-400">PP:{h.ppEstimado}</span>
              </div>
            </>
          ) : (
            <>
              <div className="pt-2">
                <select value={h.status} onChange={e => updateHabilidade(i, { status: e.target.value })}
                  className={`text-[10px] bg-void border border-sep rounded px-1.5 py-0.5 mb-2 ${STATUS_COLORS[h.status] || 'text-txt-dim'}`}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input type="text" value={h.nome || ''} onChange={e => updateHabilidade(i, { nome: e.target.value })} placeholder="Nome"
                  className="w-full bg-void border border-sep rounded px-2 py-1 text-xs text-txt-main mb-1" />
                <textarea value={h.descricao || ''} onChange={e => updateHabilidade(i, { descricao: e.target.value })} placeholder="Descrição..." rows={2}
                  className="w-full bg-void border border-sep rounded px-2 py-1 text-[11px] text-txt-main resize-none" />
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                <div><label className="text-txt-dim text-[9px]">Energia</label><input type="number" value={h.custoEnergia || 0} onChange={e => updateHabilidade(i, { custoEnergia: Number(e.target.value) || 0 })} className="w-full bg-void border border-sep rounded px-1.5 py-0.5 text-[11px] text-txt-main font-mono" /></div>
                <div><label className="text-txt-dim text-[9px]">Dano</label><input type="text" value={h.dano || ''} onChange={e => updateHabilidade(i, { dano: e.target.value })} className="w-full bg-void border border-sep rounded px-1.5 py-0.5 text-[11px] text-txt-main font-mono" /></div>
                <div><label className="text-txt-dim text-[9px]">Duração</label><input type="text" value={h.duracao || ''} onChange={e => updateHabilidade(i, { duracao: e.target.value })} className="w-full bg-void border border-sep rounded px-1.5 py-0.5 text-[11px] text-txt-main" /></div>
                <div><label className="text-txt-dim text-[9px]">SCP</label><select value={h.camadaSCP || 2} onChange={e => updateHabilidade(i, { camadaSCP: Number(e.target.value) })} className="w-full bg-void border border-sep rounded px-1.5 py-0.5 text-[11px] text-txt-main"><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option></select></div>
                <div><label className="text-txt-dim text-[9px]">PP</label><input type="number" value={h.ppEstimado || 0} onChange={e => updateHabilidade(i, { ppEstimado: Number(e.target.value) || 0 })} className="w-full bg-void border border-sep rounded px-1.5 py-0.5 text-[11px] text-txt-main font-mono" /></div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function TriagemSection({ char, cls }) {
  const principalKey = char.triagemPrincipal
  const principalNv = char.triagemPrincipalNivel || 0
  const subKey = char.subTriagem
  const subNv = char.subTriagemNivel || 0
  const subClass = char.subTriagemClass || cls
  const principalLevels = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6]
  const subLevels = [0.1, 0.2, 0.3]

  function getTriagemData(classKey, triageKey) {
    if (!triageKey || !classKey) return null
    if (TRIAGES[classKey]?.[triageKey]) return TRIAGES[classKey][triageKey]
    for (const ck of Object.keys(TRIAGES)) { if (TRIAGES[ck]?.[triageKey]) return TRIAGES[ck][triageKey] }
    return null
  }

  const principalData = getTriagemData(cls, principalKey)
  const subData = getTriagemData(subClass, subKey)

  return (
    <div className="space-y-2">
      {principalData && principalNv >= 0.1 ? (
        <div>
          <div className="text-gold text-xs font-semibold mb-1">{principalData.name} <span className="text-txt-dim font-body font-normal">Nv {principalNv}</span></div>
          <div className="space-y-0.5">
            {principalLevels.filter(l => l <= principalNv).map(lvl => {
              const desc = principalData.levels[lvl]
              if (!desc) return null
              return <div key={lvl} className="bg-void border border-sep/50 rounded px-2 py-1 text-[11px] flex gap-1.5"><span className="font-mono text-gold w-6 shrink-0">{lvl}</span><span className="text-txt-main">{desc}</span></div>
            })}
          </div>
        </div>
      ) : <p className="text-txt-dim text-xs">Nenhuma triagem principal</p>}
      {subData && subNv >= 0.1 && (
        <div className="border-t border-sep/50 pt-2">
          <div className="text-warn text-xs font-semibold mb-1">{subData.name} <span className="text-txt-dim font-body font-normal">Nv {subNv} ({subClass})</span></div>
          <div className="space-y-0.5">
            {subLevels.filter(l => l <= subNv).map(lvl => {
              const desc = subData.levels[lvl]
              if (!desc) return null
              return <div key={lvl} className="bg-void border border-sep/50 rounded px-2 py-1 text-[11px] flex gap-1.5"><span className="font-mono text-warn w-6 shrink-0">{lvl}</span><span className="text-txt-main">{desc}</span></div>
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function F({ label, value }) {
  return (
    <div className="flex justify-between py-0.5 text-sm">
      <span className="text-txt-dim">{label}</span>
      <span className="text-txt-main font-mono">{value || '—'}</span>
    </div>
  )
}
