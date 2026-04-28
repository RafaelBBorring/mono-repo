import { useState, useRef, useEffect } from 'react'
import { calcVidaTotal, calcEnergiaTotal, calcPeTotal, calcCA, calcReacoes, calcPercepcaoPassiva, calcDanoBase, calcAbilityCostReduction, calcExtraAbilities, calcExtraAbilitiesTypes } from '../../utils/calculator'
import { exportSheet } from '../../utils/exporter'
import { ATTR_ICONS, getModifier } from '../../data/attributes'
import { MARTIAL_ARTS } from '../../data/martialArts'
import { PERICIAS, GRAU_NAMES, getGrauBonus } from '../../data/pericias'
import { TRIAGES } from '../../data/triages'
import { MODULES_PASSIVE, MODULES_ACTIVE, MODULES_SPECIAL } from '../../data/modules'
import { getRaceAdjustedAttrs, getRaceLabel, calculateRaceBonus, getSelectedSubrace, ATTR_KEYS } from '../../utils/raceCalculator'
import { RACES, RACE_CATEGORIES } from '../../data/races'
import InventorySection from '../InventorySection'
import EquipmentSection from '../EquipmentSection'
import BalanceAnalysis from '../BalanceAnalysis'
import AlchemyLibrarySection from '../AlchemyLibrarySection'
import SpellLibrarySection from '../SpellLibrarySection'
import RuneLibrarySection from '../RuneLibrarySection'
import MagicLibrarySection from '../MagicLibrarySection'
import { getSpellProfile } from '../../utils/spellRules'
import { getRuneProfile } from '../../utils/runeRules'
import { getMagicProfile } from '../../utils/magicRules'

const STATUS_COLORS = { Pendente: 'text-warn', Aprovada: 'text-ok', 'Revisão necessária': 'text-err' }
const STATUS_OPTIONS = ['Pendente', 'Aprovada', 'Revisão necessária']

export default function Step11Review({ char, onSave, onEdit, onNew, update, updateHabilidade, characterId }) {
  return <ReviewContent char={char} onSave={onSave} onEdit={onEdit} onNew={onNew} update={update} updateHabilidade={updateHabilidade} characterId={characterId} />
}

function SectionHeader({ icon, title, color }) {
  return (
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-sep/20">
      <div className={`w-1.5 h-5 rounded-full ${color}`} />
      <span className="text-txt-dim text-sm">{icon}</span>
      <h3 className="font-cinzel text-txt-main text-sm uppercase tracking-[0.12em] font-semibold">{title}</h3>
      <div className="flex-1 h-px bg-gradient-to-r from-sep/60 to-transparent" />
    </div>
  )
}

function ReviewContent({ char, onSave, onEdit, onNew, update, updateHabilidade, characterId }) {
  const sk = char.skeletonPoints || {}
  const adjustedAttrs = getRaceAdjustedAttrs(char.atributos, sk, char)
  const totalAttr = (a) => adjustedAttrs[a] || 0
  const cls = char.classe

  const extraTypes = calcExtraAbilitiesTypes(
    char.triagemPrincipal, char.triagemPrincipalNivel,
    char.subTriagem, char.subTriagemNivel,
    char.atributos, sk, char.modulosAdquiridos, char
  )
  const neededAbilities = 5 + extraTypes.length
  const allTipos = ['Passiva', 'Ativa', 'Ativa', 'Ativa', 'Ultimate', ...extraTypes]

  useEffect(() => {
    if (!update) return
    const raw = char.habilidades || []
    if (raw.length !== neededAbilities) {
      const copy = [...raw]
      while (copy.length < neededAbilities) {
        const tipo = allTipos[copy.length] || 'Extra (Triagem)'
        copy.push({ tipo, nome: '', descricao: '', custoEnergia: 0, dano: '', duracao: '', camadaSCP: 2, ppEstimado: 0, status: 'Pendente' })
      }
      if (copy.length > neededAbilities) copy.length = neededAbilities
      update({ habilidades: copy })
    }
  }, [neededAbilities])

  const derived = {
    vida: cls ? calcVidaTotal(cls, char.nivel, char.atributos, sk, char.choices, char.triagemPrincipal, char.triagemPrincipalNivel, char) : 0,
    energia: cls ? calcEnergiaTotal(cls, char.nivel, char.atributos, sk, char.choices, char.triagemPrincipal, char.triagemPrincipalNivel, char.subTriagem, char.subTriagemNivel, char) : 0,
    pe: cls ? calcPeTotal(cls, char.nivel, char.choices, char) : 0,
    ca: cls ? calcCA(char.atributos, sk, char.pericias, char) : 0,
    reacoes: calcReacoes(char.atributos, sk, char.triagemPrincipal, char.triagemPrincipalNivel, char.subTriagem, char.subTriagemNivel, char),
    percepcao: cls ? calcPercepcaoPassiva(char.atributos, sk, char.pericias, char) : 0,
    danoBase: cls ? calcDanoBase(cls, char.atributos, sk, char.nivel, char.subTriagem, char.subTriagemNivel, char.triagemPrincipal, char.triagemPrincipalNivel, char) : '',
  }

  const vidaNow = char.vidaOverride ?? (derived.vida + (char.vidaBonus || 0))
  const energiaNow = char.energiaOverride ?? (derived.energia + (char.energiaBonus || 0))
  const peNow = char.peOverride ?? (derived.pe + (char.peBonus || 0))

  const costReduction = calcAbilityCostReduction(char.triagemPrincipal, char.triagemPrincipalNivel || 0, char.subTriagem, char.subTriagemNivel || 0)

  const martialArt = MARTIAL_ARTS.find(a => a.id === char.arteMarcial)

  const allModules = [...MODULES_PASSIVE, ...MODULES_ACTIVE, ...MODULES_SPECIAL]
  const acquiredModules = (char.modulosAdquiridos || []).map(am => {
    const found = allModules.find(m => m.id === am.id)
    return found ? { ...found, boughtCount: am.boughtCount || 1 } : null
  }).filter(Boolean)

  const periciasArr = Object.entries(char.pericias || {}).filter(([, v]) => v > 0)
  const systemOptIn = char.systemsOptIn || {}
  const spellProfile = getSpellProfile(char)
  const runeProfile = getRuneProfile(char)
  const alchemyEnabled = systemOptIn.alchemy || (char.alchemyRituals || []).length > 0
  const spellsEnabled = systemOptIn.spells || (char.spells || []).length > 0
  const runesEnabled = systemOptIn.runes || (char.runes || []).length > 0
  const magicEnabled = systemOptIn.magic || (char.magics || []).length > 0
  const magicProfile = getMagicProfile(char)

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

  function handleBalanceApply(result) {
    if (!update || !updateHabilidade) return
    if (result._generatedConcepts) {
      const habs = [...(char.habilidades || [])]
      result._generatedConcepts.forEach((gc, i) => {
        if (i < habs.length && habs[i]) {
          habs[i] = { ...habs[i], nome: gc.nome || habs[i].nome, descricao: gc.descricao || habs[i].descricao }
        }
      })
      update({ habilidades: habs })
      return
    }
    if (result.habilidades) {
      const habs = [...(char.habilidades || [])]
      result.habilidades.forEach(h => {
        if (h.index != null && habs[h.index]) {
          habs[h.index] = {
            ...habs[h.index],
            ...(h.nome && { nome: h.nome }),
            ...(h.descricao && { descricao: h.descricao }),
            ...(h.custoEnergia != null && { custoEnergia: h.custoEnergia }),
            ...(h.dano != null && { dano: h.dano }),
            ...(h.duracao != null && { duracao: h.duracao }),
            ...(h.camadaSCP != null && { camadaSCP: h.camadaSCP }),
            ...(h.ppEstimado != null && { ppEstimado: h.ppEstimado }),
            status: 'Aprovada',
          }
        }
      })
      update({ habilidades: habs })
    }
    if (result.armaHabilidades) {
      const arHabs = [...(char.armaHabilidades || [])]
      result.armaHabilidades.forEach(h => {
        if (h.index != null && arHabs[h.index]) {
          arHabs[h.index] = {
            ...arHabs[h.index],
            ...(h.nome && { nome: h.nome }),
            ...(h.descricao && { descricao: h.descricao }),
            ...(h.tipo && { tipo: h.tipo }),
            ...(h.custo && { custo: h.custo }),
          }
        }
      })
      update({ armaHabilidades: arHabs })
    }
  }

  const canEdit = !!update

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button onClick={handleCopy} className="border border-sep text-txt-dim px-3 py-1.5 rounded text-xs hover:border-gold hover:text-gold transition-colors">
          Copiar Texto
        </button>
        <button onClick={onSave} className="bg-gold text-void font-semibold px-5 py-1.5 rounded text-xs hover:bg-gold-light transition-colors">
          Salvar Ficha ✓
        </button>
      </div>

      <div className="bg-deep/95 backdrop-blur-sm border border-gold/15 rounded-xl overflow-hidden shadow-2xl shadow-black/40">
        {/* ═══ HEADER ═══ */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-gold/3" />
          <div className="relative px-6 py-5 flex items-center gap-5">
            <div className="shrink-0">
              {char.avatar ? (
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-gold/20 blur-lg scale-110" />
                  <img src={char.avatar} alt="" className="relative w-24 h-24 rounded-full border-2 border-gold/50 object-cover shadow-lg shadow-gold/10" />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full border-2 border-sep/60 bg-void flex items-center justify-center shadow-lg shadow-black/30">
                  <span className="text-txt-dim text-3xl">👤</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-cinzel text-gold text-2xl sm:text-3xl leading-tight truncate">{char.nome || 'Sem Nome'}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="bg-gold/10 text-gold text-[11px] px-2.5 py-0.5 rounded font-semibold border border-gold/20">{cls || '—'}</span>
                <span className="bg-void/80 text-txt-dim text-[11px] px-2.5 py-0.5 rounded border border-sep/40">Nv {char.nivel || 1}</span>
                <span className="bg-void/80 text-txt-dim text-[11px] px-2.5 py-0.5 rounded border border-sep/40">{getRaceLabel(char) || '—'}</span>
                {char.racaTipo && <span className="bg-void/80 text-txt-dim text-[11px] px-2.5 py-0.5 rounded border border-sep/40">{char.racaTipo}</span>}
              </div>
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
        </div>

        {/* ═══ BODY ═══ */}
        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

            {/* ═══ LEFT COLUMN ═══ */}
            <div className="lg:col-span-7 space-y-5">

              {/* ATTRIBUTES */}
              <section>
                <SectionHeader icon="📊" title="Atributos" color="bg-amber-400" />
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {['FOR','DES','CON','INT','APA','AM'].map(a => {
                    const v = totalAttr(a)
                    const m = getModifier(v)
                    return (
                      <div key={a} className="bg-void/80 rounded-lg border border-sep/60 flex flex-col items-center justify-center py-3 px-1 hover:border-gold/30 transition-colors group">
                        <span className="text-[11px] text-txt-dim group-hover:text-gold/60 transition-colors">{ATTR_ICONS[a]}</span>
                        <span className="font-cinzel text-gold/70 text-[10px] mt-0.5">{a}</span>
                        <span className="font-mono text-txt-main text-xl leading-none mt-1">{v}</span>
                        <span className={`font-mono text-[11px] mt-0.5 ${m >= 0 ? 'text-emerald-400/80' : 'text-red-400/70'}`}>
                          {m >= 0 ? '+' : ''}{m}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>

              {/* RESOURCES */}
              <section>
                <SectionHeader icon="💎" title="Recursos" color="bg-emerald-400" />
                <div className="grid grid-cols-3 gap-2.5">
                  <ResBox label="Vida" icon="❤" current={vidaNow} max={derived.vida}
                    gradientFrom="from-emerald-500" gradientTo="to-emerald-400"
                    textColor="text-emerald-400" barBg="bg-emerald-500/80"
                    canEdit={canEdit} hasOverride={char.vidaOverride !== null}
                    onChange={v => setOverride('vidaOverride', v)} onReset={() => clearOverride('vidaOverride')} />
                  <ResBox label="Energia" icon="⚡" current={energiaNow} max={derived.energia}
                    gradientFrom="from-sky-500" gradientTo="to-sky-400"
                    textColor="text-sky-400" barBg="bg-sky-500/80"
                    canEdit={canEdit} hasOverride={char.energiaOverride !== null}
                    onChange={v => setOverride('energiaOverride', v)} onReset={() => clearOverride('energiaOverride')} />
                  <ResBox label="PE" icon="✦" current={peNow} max={derived.pe}
                    gradientFrom="from-amber-500" gradientTo="to-amber-400"
                    textColor="text-amber-400" barBg="bg-amber-500/80"
                    canEdit={canEdit} hasOverride={char.peOverride !== null}
                    onChange={v => setOverride('peOverride', v)} onReset={() => clearOverride('peOverride')} />
                </div>
              </section>

              {/* COMBAT */}
              <section className="bg-void/60 border border-red-400/15 rounded-lg p-4">
                <SectionHeader icon="⚔" title="Combate" color="bg-red-400" />
                <div className="grid grid-cols-4 gap-3">
                  <CombatStat label="CA" value={derived.ca} />
                  <CombatStat label="Reações" value={derived.reacoes} />
                  <CombatStat label="Percepção" value={derived.percepcao} />
                  <CombatStat label="Dano Base" value={derived.danoBase} isGold />
                </div>
              </section>

              {/* PERÍCIAS */}
              <section>
                <SectionHeader icon="📜" title="Perícias Treinadas" color="bg-cyan-400" />
                {periciasArr.length > 0 ? (
                  <div className="overflow-hidden rounded-lg border border-sep/60">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-void/80">
                          <th className="text-left px-3 py-2 text-txt-dim font-body font-normal">Perícia</th>
                          <th className="text-center px-2 py-2 text-txt-dim font-body font-normal w-16">Atr.</th>
                          <th className="text-center px-2 py-2 text-txt-dim font-body font-normal w-28">Grau</th>
                          <th className="text-center px-2 py-2 text-txt-dim font-body font-normal w-16">Bônus</th>
                        </tr>
                      </thead>
                      <tbody>
                        {periciasArr.map(([name, grau]) => {
                          const pDef = PERICIAS.find(p => p.name === name)
                          const bestAttr = pDef ? pDef.attrs.map(a => ({ a, v: totalAttr(a) })).reduce((a, b) => a.v >= b.v ? a : b).a : '—'
                          const bonus = pDef ? Math.max(...pDef.attrs.map(a => getModifier(totalAttr(a)))) + getGrauBonus(grau) : grau * 5
                          return (
                            <tr key={name} className="border-t border-sep/30 hover:bg-void/40 transition-colors">
                              <td className="px-3 py-2 text-txt-main">{name}</td>
                              <td className="px-2 py-2 text-center text-gold/80 font-mono text-xs">{bestAttr}</td>
                              <td className="px-2 py-2 text-center text-txt-dim text-xs">{GRAU_NAMES[grau] || grau}</td>
                              <td className="px-2 py-2 text-center font-mono text-cyan-400">{bonus >= 0 ? '+' : ''}{bonus}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-txt-dim/60 text-xs italic">Nenhuma perícia treinada</p>
                )}
              </section>

              {/* TRIAGENS */}
              <section>
                <SectionHeader icon="★" title="Triagens" color="bg-purple-400" />
                <TriagemSection char={char} cls={cls} />
              </section>

              {/* HERANÇA RACIAL */}
              <RaceHeritageSection char={char} />

              {/* ARMAS & EQUIPAMENTOS */}
              <EquipmentSection char={char} canEdit={canEdit} onUpdate={(eq) => update({ equipamentos: eq })} onDrawerToggle={() => {}} />
            </div>

            {/* ═══ RIGHT COLUMN ═══ */}
            <div className="lg:col-span-5 space-y-5">

              {/* ARTE MARCIAL */}
              <section>
                <SectionHeader icon="👊" title="Arte Marcial" color="bg-orange-400" />
                {martialArt ? (
                  <div className="bg-void/50 border border-sep/40 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-txt-main text-sm font-semibold">{martialArt.name}</span>
                      <span className="text-[10px] bg-orange-400/10 text-orange-400 px-2 py-0.5 rounded border border-orange-400/20">
                        {martialArt.graus[char.arteMarcialGrau || 0]?.nome || 'Novato'}
                      </span>
                    </div>
                    {martialArt.desc && <p className="text-txt-dim/60 text-[10px] mt-1">{martialArt.desc}</p>}
                  </div>
                ) : (
                  <p className="text-txt-dim/50 text-[11px] italic">Nenhuma arte marcial</p>
                )}
              </section>

              {/* MÓDULOS */}
              <section>
                <SectionHeader icon="⚙" title="Módulos de Evolução" color="bg-yellow-400" />
                {acquiredModules.length > 0 ? (
                  <div className="space-y-1.5">
                    {acquiredModules.map((m, i) => {
                      const isPassive = !m.pe
                      const isSpecial = MODULES_SPECIAL.some(s => s.id === m.id)
                      return (
                        <div key={i} className="bg-void/50 border border-sep/40 rounded-lg px-3 py-2.5 hover:border-gold/20 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isSpecial ? 'bg-purple-400/10 text-purple-400 border border-purple-400/20' : isPassive ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20' : 'bg-sky-400/10 text-sky-400 border border-sky-400/20'}`}>
                              {isSpecial ? 'ESP' : isPassive ? 'PSV' : 'ATV'}
                            </span>
                            <span className="text-txt-main text-sm font-semibold">{m.name}</span>
                            {(m.boughtCount || 1) > 1 && (
                              <span className="text-gold font-mono text-xs bg-gold/10 px-1 rounded">×{m.boughtCount}</span>
                            )}
                          </div>
                          <p className="text-txt-dim text-xs mt-1 leading-relaxed">{m.desc}</p>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-txt-dim/60 text-xs italic">Nenhum módulo adquirido</p>
                )}
              </section>

              {/* BALANCE ANALYSIS */}
              <BalanceAnalysis char={char} onApply={handleBalanceApply} characterId={characterId} />

              {/* HABILIDADES */}
              <section>
                <SectionHeader icon="✦" title="Habilidades" color="bg-indigo-400" />
                {costReduction > 0 && (
                  <div className="mb-2 bg-blue-500/5 border border-blue-500/20 rounded-lg p-2 text-[11px] text-blue-400/80 flex items-center gap-1.5">
                    <span className="text-blue-400">★</span>
                    Suporte: −{Math.round(costReduction * 100)}% custo de Buffs
                  </div>
                )}
                <div className="space-y-1.5">
                  {(char.habilidades || []).map((h, i) => (
                    <HabilidadeCard key={i} h={h} i={i} canEdit={canEdit} updateHabilidade={updateHabilidade} />
                  ))}
                </div>
              </section>

              {/* INVENTÁRIO */}
              <InventorySection
                items={char.inventario || []}
                canEdit={canEdit}
                onUpdate={(items) => update({ inventario: items })}
                onDrawerToggle={() => {}}
              />

              {/* NOTAS */}
              <section>
                <SectionHeader icon="📝" title="Notas" color="bg-gray-400" />
                {canEdit ? (
                  <textarea value={char.notas || ''} onChange={e => update({ notas: e.target.value })} placeholder="Anotações do jogador..."
                    rows={3}
                    className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-xs text-txt-main resize-none focus:border-gold/40 focus:outline-none transition-colors placeholder:text-txt-dim/40" />
                ) : (
                  <p className="text-txt-main/80 text-xs whitespace-pre-wrap leading-relaxed">{char.notas || '—'}</p>
                )}
              </section>

              {/* RESERVED — FUTURE SECTIONS */}
              <section>
                <SectionHeader icon="🔮" title="Em Desenvolvimento" color="bg-gold/60" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { icon: '⚡', name: 'Condições', desc: 'Condições Especiais' },
                    { icon: '🗺', name: 'Mapas Táticos', desc: 'Terreno e zonas dinâmicas' },
                    { icon: '👥', name: 'Companheiros', desc: 'Invocações, aliados e lacaios' },
                  ].map(s => (
                    <div key={s.name} className="bg-void/30 border border-sep/20 rounded-lg p-2.5 opacity-50 hover:opacity-70 transition-opacity">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm">{s.icon}</span>
                        <span className="text-txt-dim text-[11px] font-semibold">{s.name}</span>
                      </div>
                      <p className="text-txt-dim/50 text-[9px]">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

          </div>

          <div className="mt-5 border-t border-sep/30 pt-5">
            <OptionalSystemsSection
              char={char}
              update={update}
              alchemyEnabled={alchemyEnabled}
              spellsEnabled={spellsEnabled}
              runesEnabled={runesEnabled}
              magicEnabled={magicEnabled}
              spellProfile={spellProfile}
              runeProfile={runeProfile}
              magicProfile={magicProfile}
            />

            <div className="space-y-5 mt-5">
              {alchemyEnabled && <AlchemyLibrarySection char={char} update={update} wide />}
              {spellsEnabled && <SpellLibrarySection char={char} update={update} wide />}
              {runesEnabled && <RuneLibrarySection char={char} update={update} wide />}
              {magicEnabled && <MagicLibrarySection char={char} update={update} wide />}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-3 pb-4">
        <button onClick={onNew} className="border border-gold/50 text-gold px-5 py-2 rounded-lg text-xs hover:bg-gold hover:text-void transition-colors font-semibold">
          Novo Personagem
        </button>
        <button onClick={onSave} className="bg-gold text-void font-semibold px-6 py-2 rounded-lg text-xs hover:bg-gold-light transition-colors">
          Salvar e Ir para Biblioteca
        </button>
      </div>
    </div>
  )
}

function OptionalSystemsSection({ char, update, alchemyEnabled, spellsEnabled, runesEnabled, magicEnabled, spellProfile, runeProfile, magicProfile }) {
  const systemOptIn = char.systemsOptIn || {}
  const cards = [
    {
      key: 'alchemy',
      icon: '⚗',
      title: 'Alquimia',
      active: alchemyEnabled,
      accent: 'border-teal-400/20 bg-teal-400/5',
      access: 'Livre',
      summary: 'Qualquer personagem pode estudar, mas o repertorio cresce com nivel, treino em Alquimia, classe e raca.',
    },
    {
      key: 'spells',
      icon: '✨',
      title: 'Feitiços',
      active: spellsEnabled,
      accent: 'border-emerald-400/20 bg-emerald-400/5',
      access: spellProfile.hasAccess ? 'Permitido' : 'Bloqueado',
      summary: spellProfile.hasAccess
        ? `Tradicoes liberadas: ${spellProfile.traditions.map((item) => item === 'arcana' ? 'Arcana' : 'Bruxaria').join(' / ')}. Ideal para personagens realmente voltados ao arcano.`
        : 'Seu conjunto atual de raca/classe nao pede feiticops. A ficha pode seguir leve sem essa camada.',
    },
    {
      key: 'runes',
      icon: '💎',
      title: 'Runas',
      active: runesEnabled,
      accent: 'border-sky-400/20 bg-sky-400/5',
      access: 'Livre',
      summary: `Runas sao opcionais para qualquer personagem. Seu vinculo atual sustenta ate ${runeProfile.activeSlots} runa(s) ativa(s) ao mesmo tempo.`,
    },
    {
      key: 'magic',
      icon: '🔥',
      title: 'Magias',
      active: magicEnabled,
      accent: 'border-orange-400/20 bg-orange-400/5',
      access: magicProfile.hasAccess ? 'Permitido' : 'Bloqueado',
      summary: magicProfile.hasAccess
        ? 'Seu sangue arcano permite canalizar Magias diretamente. Escolha entre escolas de fogo, gelo, eletricidade, arcano, gravidade e mais.'
        : 'Apenas Magos possuem acesso a Magias. Outras racas usam Feiticops, Rituais ou Runas.',
    },
  ]

  function getStoredState(key) {
    return systemOptIn[key] || false
  }

  function getCurrentEntries(key) {
    if (key === 'alchemy') return char.alchemyRituals || []
    if (key === 'spells') return char.spells || []
    if (key === 'magic') return char.magics || []
    return char.runes || []
  }

  function toggleSystem(key) {
    if (!update) return
    const currentEntries = getCurrentEntries(key)
    const implicitActive = currentEntries.length > 0
    const nextEnabled = !(getStoredState(key) || implicitActive)
    const nextOptIn = {
      ...systemOptIn,
      [key]: nextEnabled,
    }
    const patch = { systemsOptIn: nextOptIn }
    if (!nextEnabled) {
      if (key === 'alchemy') patch.alchemyRituals = []
      if (key === 'spells') patch.spells = []
      if (key === 'runes') patch.runes = []
      if (key === 'magic') patch.magics = []
    }
    update({
      ...patch,
    })
  }

  return (
    <section className="space-y-4">
      <SectionHeader icon="🔮" title="Disciplinas Opcionais" color="bg-gold/60" />
      <div className="bg-void/60 border border-sep/30 rounded-xl p-4">
        <p className="text-txt-dim text-sm leading-relaxed">
          Para reduzir sobrecarga, Alquimia, Feiticops, Runas e Magias ficam nas maos do jogador. Quem quer uma ficha direta pode ignorar essas camadas; quem quer explorar o lado mistico ativa so os sistemas que realmente pretende usar.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-3">
        {cards.map((card) => (
          <article key={card.key} className={`rounded-xl border p-4 ${card.accent}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{card.icon}</span>
                <div>
                  <div className="text-txt-main font-semibold">{card.title}</div>
                  <div className="text-[11px] text-txt-dim">Acesso: {card.access}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleSystem(card.key)}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                  card.active ? 'bg-gold text-void' : 'border border-sep/40 text-txt-dim hover:border-gold hover:text-gold'
                }`}
              >
                {card.active ? 'Ativo' : 'Ativar'}
              </button>
            </div>
            <p className="text-txt-dim text-xs mt-3 leading-relaxed">{card.summary}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function ResBox({ label, icon, current, max, textColor, barBg, canEdit, hasOverride, onChange, onReset }) {
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0
  return (
    <div className="bg-void/60 border border-sep/40 rounded-lg p-3 hover:border-sep/70 transition-colors">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[11px]">{icon}</span>
        <span className="text-txt-dim text-[11px] font-semibold uppercase tracking-wider">{label}</span>
        {hasOverride && <span className="text-[9px] text-gold/70 ml-auto">✎ editado</span>}
      </div>
      {canEdit ? (
        <div className="flex items-baseline gap-1">
          <input type="number" value={current} onChange={e => onChange(e.target.value)}
            className={`font-mono text-lg bg-transparent border-b border-sep/50 w-14 text-right outline-none focus:border-gold/50 transition-colors ${textColor}`} />
          <span className="text-txt-dim/50 text-[11px] font-mono">/ {max}</span>
          {hasOverride && (
            <button onClick={onReset} className="ml-auto text-[9px] text-gold/50 border border-gold/20 px-1 rounded hover:text-gold hover:border-gold/40 transition-colors">↺</button>
          )}
        </div>
      ) : (
        <div className="flex items-baseline gap-1">
          <span className={`font-mono text-lg ${textColor}`}>{current}</span>
          {current !== max && <span className="text-txt-dim/50 text-[11px] font-mono">/ {max}</span>}
        </div>
      )}
      <div className="h-1 bg-deep rounded-full mt-2 overflow-hidden">
        <div className={`h-full ${barBg} rounded-full transition-all duration-500 ease-out`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function CombatStat({ label, value, isGold }) {
  return (
    <div className="text-center">
      <div className="text-txt-dim/60 text-[10px] uppercase tracking-wider mb-1">{label}</div>
      <div className={`font-mono text-xl leading-none ${isGold ? 'text-gold' : 'text-txt-main'}`}>{value}</div>
    </div>
  )
}

function FieldRow({ label, value }) {
  return (
    <div className="flex justify-between items-center px-3 py-1.5">
      <span className="text-txt-dim/70 text-[11px]">{label}</span>
      <span className="text-txt-main text-[11px] font-mono">{value || '—'}</span>
    </div>
  )
}

function AutoResizeTextarea({ value, onChange, placeholder, className }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = ref.current.scrollHeight + 'px'
    }
  }, [value])
  return (
    <textarea ref={ref} value={value} onChange={onChange} placeholder={placeholder}
      className={className} />
  )
}

function HabilidadeCard({ h, i, canEdit, updateHabilidade }) {
  const [open, setOpen] = useState(false)

  const typeStyle = h.tipo === 'Ultimate'
    ? { border: 'border-gold/30', bg: 'bg-gold/3', badge: 'bg-gold/15 text-gold border-gold/20', icon: '★', label: 'Ultimate' }
    : h.tipo === 'Passiva'
    ? { border: 'border-emerald-400/20', bg: 'bg-emerald-400/3', badge: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20', icon: 'P', label: 'Passiva' }
    : h.tipo === 'Extra (Triagem)'
    ? { border: 'border-purple-400/20', bg: 'bg-purple-400/3', badge: 'bg-purple-400/10 text-purple-400 border-purple-400/20', icon: 'T', label: 'Extra (Triagem)' }
    : h.tipo === 'Extra (Módulo)'
    ? { border: 'border-sky-400/20', bg: 'bg-sky-400/3', badge: 'bg-sky-400/10 text-sky-400 border-sky-400/20', icon: 'M', label: 'Extra (Módulo)' }
    : { border: 'border-indigo-400/15', bg: 'bg-indigo-400/2', badge: 'bg-indigo-400/10 text-indigo-400 border-indigo-400/20', icon: `#${i + 1}`, label: 'Ativa' }

  return (
    <div className={`rounded-xl border ${typeStyle.border} ${typeStyle.bg} overflow-hidden transition-all`}>
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-white/[0.03] transition-colors">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className={`text-xs font-bold w-8 h-8 rounded-lg flex items-center justify-center border ${typeStyle.badge} shrink-0`}>
            {typeStyle.icon}
          </span>
          <div className="min-w-0 flex-1">
            <span className="text-txt-main text-sm font-semibold block truncate">{h.nome || '—'}</span>
            <span className="text-txt-dim/50 text-[10px]">{typeStyle.label}{h.custoEnergia > 0 ? ` · ⚡${h.custoEnergia}` : ''}{h.dano ? ` · ⚔${h.dano}` : ''}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[h.status] === 'text-ok' ? 'border-ok/20 bg-ok/5' : STATUS_COLORS[h.status] === 'text-warn' ? 'border-warn/20 bg-warn/5' : STATUS_COLORS[h.status] === 'text-err' ? 'border-err/20 bg-err/5' : 'border-sep/20 bg-sep/5'} ${STATUS_COLORS[h.status] || 'text-txt-dim'}`}>{h.status}</span>
          <span className="text-txt-dim/30 text-sm">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-sep/15">
          {!canEdit ? (
            <>
              <p className="text-txt-dim/90 text-sm pt-4 leading-relaxed whitespace-pre-wrap break-words">{h.descricao || 'Sem descrição'}</p>
              <div className="flex flex-wrap gap-2.5">
                {h.custoEnergia > 0 && (
                  <span className="bg-sky-500/10 text-sky-400 px-3 py-1.5 rounded-lg border border-sky-500/20 text-sm font-mono">
                    ⚡ Energia: {h.custoEnergia}
                  </span>
                )}
                {h.dano && (
                  <span className="bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg border border-red-500/20 text-sm font-mono">
                    ⚔ Dano: {h.dano}
                  </span>
                )}
                {h.duracao && (
                  <span className="bg-amber-500/10 text-amber-400 px-3 py-1.5 rounded-lg border border-amber-500/20 text-sm">
                    ⏱ Duração: {h.duracao}
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="pt-4">
                <select value={h.status} onChange={e => updateHabilidade(i, { status: e.target.value })}
                  className={`text-xs bg-void border border-sep/50 rounded px-2 py-1 mb-3 ${STATUS_COLORS[h.status] || 'text-txt-dim'}`}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input type="text" value={h.nome || ''} onChange={e => updateHabilidade(i, { nome: e.target.value })} placeholder="Nome"
                  className="w-full bg-void border border-sep/50 rounded px-3 py-2 text-sm text-txt-main mb-2 focus:border-gold/40 focus:outline-none transition-colors" />
                <AutoResizeTextarea value={h.descricao || ''} onChange={e => updateHabilidade(i, { descricao: e.target.value })} placeholder="Descrição..."
                  className="w-full bg-void border border-sep/50 rounded px-3 py-2 text-sm text-txt-main resize-none focus:border-gold/40 focus:outline-none transition-colors leading-relaxed overflow-hidden" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sky-400 text-xs font-semibold block mb-1">Energia</label>
                  <input type="number" value={h.custoEnergia || 0} onChange={e => updateHabilidade(i, { custoEnergia: Number(e.target.value) || 0 })} className="w-full bg-void border border-sep/50 rounded px-2 py-1.5 text-sm text-txt-main font-mono focus:border-gold/40 focus:outline-none" />
                </div>
                <div>
                  <label className="text-red-400 text-xs font-semibold block mb-1">Dano</label>
                  <input type="text" value={h.dano || ''} onChange={e => updateHabilidade(i, { dano: e.target.value })} className="w-full bg-void border border-sep/50 rounded px-2 py-1.5 text-sm text-txt-main font-mono focus:border-gold/40 focus:outline-none" />
                </div>
                <div>
                  <label className="text-amber-400 text-xs font-semibold block mb-1">Duração</label>
                  <input type="text" value={h.duracao || ''} onChange={e => updateHabilidade(i, { duracao: e.target.value })} className="w-full bg-void border border-sep/50 rounded px-2 py-1.5 text-sm text-txt-main focus:border-gold/40 focus:outline-none" />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function RaceHeritageSection({ char }) {
  const race = RACES[char.raca]
  if (!race) return null

  const bonus = calculateRaceBonus(char)
  const subrace = getSelectedSubrace(char)
  const catMeta = RACE_CATEGORIES.find(c => c.id === race.category) || RACE_CATEGORIES[0]
  const nivel = char.nivel || 1

  const progressaoAplicavel = (race.progressaoPoder || []).filter(p => p.nivel <= nivel)

  return (
    <section>
      <SectionHeader icon={race.icon} title="Herança Racial" color={catMeta.title.replace('text-', 'bg-').replace(/-\d+$/, '-400')} />

      <div className="space-y-3">
        <div className={`rounded-lg border ${catMeta.color} px-4 py-3`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`font-cinzel text-sm font-bold ${catMeta.title}`}>{race.name}</span>
            {subrace && <span className="text-purple-300 text-sm">— {subrace.name}</span>}
            <span className="text-txt-dim text-sm ml-auto">Nv {nivel}</span>
          </div>

          {race.desc && <p className="text-txt-dim text-sm leading-relaxed mb-3">{race.desc}</p>}

          <div className="flex flex-wrap gap-2">
            {ATTR_KEYS.map(a => {
              const v = bonus.attrs[a] || 0
              if (v === 0) return null
              return (
                <span key={a} className={`text-sm font-mono px-2 py-0.5 rounded border ${v > 0 ? 'bg-sky-400/10 text-sky-400 border-sky-400/20' : 'bg-red-400/10 text-red-400 border-red-400/20'}`}>
                  {v >= 0 ? '+' : ''}{v} {a}
                </span>
              )
            })}
            {bonus.hp !== 0 && (
              <span className={`text-sm font-mono px-2 py-0.5 rounded border ${bonus.hp > 0 ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' : 'bg-red-400/10 text-red-400 border-red-400/20'}`}>
                {bonus.hp >= 0 ? '+' : ''}{bonus.hp} HP
              </span>
            )}
            {bonus.pe > 0 && (
              <span className="text-sm font-mono px-2 py-0.5 rounded border bg-amber-400/10 text-amber-400 border-amber-400/20">
                +{bonus.pe} PE
              </span>
            )}
            {bonus.pericias > 0 && (
              <span className="text-sm font-mono px-2 py-0.5 rounded border bg-cyan-400/10 text-cyan-400 border-cyan-400/20">
                +{bonus.pericias} Perícias
              </span>
            )}
            {bonus.modules > 0 && (
              <span className="text-sm font-mono px-2 py-0.5 rounded border bg-yellow-400/10 text-yellow-400 border-yellow-400/20">
                +{bonus.modules} Módulos
              </span>
            )}
          </div>

          {subrace?.note && (
            <div className="mt-2 text-sm text-gold/80 bg-gold/5 border border-gold/15 rounded px-3 py-1.5">
              {subrace.note}
            </div>
          )}
        </div>

        {race.passivasRaciais?.length > 0 && (
          <div>
            <div className="text-txt-dim text-sm font-semibold mb-2">Passivas Raciais</div>
            <div className="space-y-1.5">
              {race.passivasRaciais.map((p, i) => (
                <div key={i} className="bg-void/50 border border-sep/40 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-txt-main text-sm font-semibold">{p.nome}</span>
                    <span className={`text-sm px-1.5 py-0.5 rounded border ${p.tipo === 'Passiva' ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' : 'bg-sky-400/10 text-sky-400 border-sky-400/20'}`}>
                      {p.tipo}
                    </span>
                    {p.custo && p.custo !== '—' && (
                      <span className="text-sm text-amber-400/80">{p.custo}</span>
                    )}
                    {p.duracao && p.duracao !== 'Contínuo' && (
                      <span className="text-sm text-txt-dim">{p.duracao}</span>
                    )}
                  </div>
                  <p className="text-txt-dim text-sm leading-relaxed">{p.efeito}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {(race.vantagens?.length > 0 || race.desvantagens?.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {race.vantagens?.length > 0 && (
              <div className="bg-emerald-400/5 border border-emerald-400/15 rounded-lg px-3 py-2">
                <div className="text-emerald-400 text-sm font-semibold mb-1.5">Vantagens</div>
                <ul className="space-y-1">
                  {race.vantagens.map((v, i) => (
                    <li key={i} className="text-txt-dim text-sm leading-relaxed flex gap-1.5">
                      <span className="text-emerald-400/60 shrink-0">+</span>
                      <span>{v}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {race.desvantagens?.length > 0 && (
              <div className="bg-red-400/5 border border-red-400/15 rounded-lg px-3 py-2">
                <div className="text-red-400 text-sm font-semibold mb-1.5">Desvantagens</div>
                <ul className="space-y-1">
                  {race.desvantagens.map((d, i) => (
                    <li key={i} className="text-txt-dim text-sm leading-relaxed flex gap-1.5">
                      <span className="text-red-400/60 shrink-0">-</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {progressaoAplicavel.length > 0 && (
          <div>
            <div className="text-txt-dim text-sm font-semibold mb-2">Progressão de Poder</div>
            <div className="space-y-1">
              {progressaoAplicavel.map(p => (
                <div key={p.nivel} className="bg-void/40 border border-sep/30 rounded-lg px-3 py-1.5 flex gap-3">
                  <span className="text-gold/70 font-mono text-sm shrink-0 w-8">N{p.nivel}</span>
                  <div>
                    <span className="text-txt-main text-sm font-semibold">{p.ganho}</span>
                    <span className="text-txt-dim text-sm ml-1">— {p.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {subrace?.marcos?.length > 0 && (
          <div>
            <div className="text-purple-300 text-sm font-semibold mb-2">Marcos da Sub-Raça</div>
            <div className="space-y-1">
              {subrace.marcos.map(([marco, condicao, ganho]) => (
                <div key={marco} className="bg-purple-400/5 border border-purple-400/15 rounded-lg px-3 py-1.5">
                  <div className="text-txt-main text-sm font-semibold">{marco}</div>
                  <div className="text-txt-dim text-sm">{condicao}</div>
                  <div className="text-emerald-400 text-sm">{ganho}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {race.marcosExperiencia?.length > 0 && (
          <div>
            <div className="text-amber-300 text-sm font-semibold mb-2">Marcos de Experiência</div>
            <div className="space-y-1">
              {race.marcosExperiencia.map((m, i) => (
                <div key={i} className="bg-amber-400/5 border border-amber-400/15 rounded-lg px-3 py-1.5">
                  <div className="text-txt-dim text-sm">{m.marco}</div>
                  <div className="text-gold text-sm">{m.ganho}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
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
    <div className="space-y-3">
      {principalData && principalNv >= 0.1 ? (
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-gold text-[11px] font-semibold">{principalData.name}</span>
            <span className="text-[9px] bg-gold/10 text-gold/80 px-1.5 py-0.5 rounded border border-gold/15">Nv {principalNv}</span>
          </div>
          <div className="space-y-1">
            {principalLevels.filter(l => l <= principalNv).map(lvl => {
              const desc = principalData.levels[lvl]
              if (!desc) return null
              return (
                <div key={lvl} className="bg-void/40 border border-sep/30 rounded-lg px-2.5 py-1.5 text-[11px] flex gap-2">
                  <span className="font-mono text-gold/60 w-5 shrink-0 text-[10px]">{lvl}</span>
                  <span className="text-txt-dim leading-relaxed">{desc}</span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <p className="text-txt-dim/50 text-[11px] italic">Nenhuma triagem principal</p>
      )}
      {subData && subNv >= 0.1 && (
        <div className="border-t border-sep/30 pt-3">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-warn text-[11px] font-semibold">{subData.name}</span>
            <span className="text-[9px] bg-warn/10 text-warn/80 px-1.5 py-0.5 rounded border border-warn/15">Nv {subNv}</span>
            <span className="text-[9px] text-txt-dim/50">({subClass})</span>
          </div>
          <div className="space-y-1">
            {subLevels.filter(l => l <= subNv).map(lvl => {
              const desc = subData.levels[lvl]
              if (!desc) return null
              return (
                <div key={lvl} className="bg-void/40 border border-sep/30 rounded-lg px-2.5 py-1.5 text-[11px] flex gap-2">
                  <span className="font-mono text-warn/60 w-5 shrink-0 text-[10px]">{lvl}</span>
                  <span className="text-txt-dim leading-relaxed">{desc}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
