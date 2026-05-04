import { useState, useRef, useEffect } from 'react'
import { calcVidaTotal, calcEnergiaTotal, calcPeTotal, calcCA, calcReacoes, calcPercepcaoPassiva, calcDanoBase, calcAbilityCostReduction, calcExtraAbilities, calcExtraAbilitiesTypes } from '../../utils/calculator'
import { exportSheet } from '../../utils/exporter'
import { ATTR_ICONS, getModifier } from '../../data/attributes'
import { MARTIAL_ARTS, GRAU_LABELS } from '../../data/martialArts'
import { WEAPONS, WEAPON_RANKS, WEAPON_ABILITY_COST, RANK_LEVEL_BAND, getWeaponLimitForLevel, getMartialArtsLimitForLevel, canEquipRank, getRankIndex, LEGENDARY_WEAPONS } from '../../data/weapons'
import { RANK_COLORS } from '../../data/colors'
import { calcPEHTotal } from '../../utils/calculator'
import { calcPEHSpent, getMaxEvolucao, canEvolveSkill, calcEvolucaoDelta, getSkillBracket } from '../../utils/skillEvolution'
import { PERICIAS, GRAU_NAMES, getGrauBonus } from '../../data/pericias'
import { TRIAGES } from '../../data/triages'
import { MODULES_PASSIVE, MODULES_ACTIVE, MODULES_SPECIAL } from '../../data/modules'
import { getRaceAdjustedAttrs, getRaceLabel, calculateRaceBonus, getSelectedSubrace, ATTR_KEYS } from '../../utils/raceCalculator'
import { RACES, RACE_CATEGORIES } from '../../data/races'
import { generateWeaponAbilities } from '../../services/aiService'
import InventorySection from '../InventorySection'
import EquipmentSection from '../EquipmentSection'
import AbilityAnalysisChat from '../AbilityAnalysisChat'
import AlchemyLibrarySection from '../AlchemyLibrarySection'
import SpellLibrarySection from '../SpellLibrarySection'
import RuneLibrarySection from '../RuneLibrarySection'
import MagicLibrarySection from '../MagicLibrarySection'
import { getSpellProfile } from '../../utils/spellRules'
import { getRuneProfile } from '../../utils/runeRules'
import { getMagicProfile } from '../../utils/magicRules'

const STATUS_COLORS = { Pendente: 'text-warn', Aprovada: 'text-ok', 'Revisão necessária': 'text-err' }
const STATUS_OPTIONS = ['Pendente', 'Aprovada', 'Revisão necessária']

function parseActiveBonuses(source) {
  const text = `${source?.name || source?.nome || ''} ${source?.desc || ''} ${source?.descricao || ''} ${source?.efeito || ''}`
  const bonuses = { ataque: 0, ca: 0, vida: 0, energia: 0, dano: 0 }
  const signedNumbers = [...text.matchAll(/([+-]\s*\d+)(?:\s*(?:em|no|na|de|para|ao|a))?\s*([a-zA-ZÀ-ÿ ]{0,28})/g)]

  signedNumbers.forEach((match) => {
    const value = Number(match[1].replace(/\s+/g, ''))
    const target = (match[2] || '').toLowerCase()
    if (!Number.isFinite(value)) return
    if (/ataque|acerto|pontaria|golpe/.test(target)) bonuses.ataque += value
    else if (/ca|defesa|armadura|bloqueio|esquiva/.test(target)) bonuses.ca += value
    else if (/vida|hp/.test(target)) bonuses.vida += value
    else if (/energia/.test(target)) bonuses.energia += value
    else if (/dano/.test(target)) bonuses.dano += value
  })

  return bonuses
}

function mergeBonuses(items) {
  return items.reduce((sum, item) => {
    const next = parseActiveBonuses(item)
    return {
      ataque: sum.ataque + next.ataque,
      ca: sum.ca + next.ca,
      vida: sum.vida + next.vida,
      energia: sum.energia + next.energia,
      dano: sum.dano + next.dano,
    }
  }, { ataque: 0, ca: 0, vida: 0, energia: 0, dano: 0 })
}

export default function Step11Review({ char, onSave, onEdit, onNew, update, updateHabilidade, characterId, normalizeAbilities = true }) {
  return <ReviewContent char={char} onSave={onSave} onEdit={onEdit} onNew={onNew} update={update} updateHabilidade={updateHabilidade} characterId={characterId} normalizeAbilities={normalizeAbilities} />
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

const SHEET_VIEWS = [
  { key: 'overview', label: 'Visão', hint: 'O essencial para jogar agora.' },
  { key: 'combat', label: 'Combate', hint: 'Defesa, arma e números de mesa.' },
  { key: 'powers', label: 'Poderes', hint: 'Módulos, habilidades e análise.' },
  { key: 'traits', label: 'Traços', hint: 'Raça, perícias e triagens.' },
  { key: 'inventory', label: 'Bolsa', hint: 'Itens, equipamentos e notas.' },
  { key: 'mystic', label: 'Místico', hint: 'Disciplinas opcionais.' },
  { key: 'full', label: 'Tudo', hint: 'Ficha completa sem filtros.' },
]

function getSheetTriageTitle(char, cls) {
  const key = char.triagemPrincipal
  if (!key) return 'Sem triagem'
  if (TRIAGES[cls]?.[key]?.name) return TRIAGES[cls][key].name
  for (const classKey of Object.keys(TRIAGES)) {
    if (TRIAGES[classKey]?.[key]?.name) return TRIAGES[classKey][key].name
  }
  return key
}

function SheetViewTabs({ active, onChange, counts }) {
  return (
    <div className="sheet-view-tabs" aria-label="Modos de leitura da ficha">
      {SHEET_VIEWS.map(view => (
        <button
          key={view.key}
          type="button"
          onClick={() => onChange(view.key)}
          className={`sheet-view-tab ${active === view.key ? 'is-active' : ''}`}
          title={view.hint}
        >
          <span>{view.label}</span>
          {counts?.[view.key] != null && <small>{counts[view.key]}</small>}
        </button>
      ))}
    </div>
  )
}

function HeroMetric({ label, value, tone = 'gold' }) {
  return (
    <div className={`sheet-hero-metric is-${tone}`}>
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  )
}

function ReviewContent({ char, onSave, onEdit, onNew, update, updateHabilidade, characterId, normalizeAbilities }) {
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
    if (!update || !normalizeAbilities) return
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

  const allModules = [...MODULES_PASSIVE, ...MODULES_ACTIVE, ...MODULES_SPECIAL]
  const acquiredModules = (char.modulosAdquiridos || []).map(am => {
    const found = allModules.find(m => m.id === am.id)
    return found ? { ...found, boughtCount: am.boughtCount || 1 } : null
  }).filter(Boolean)
  const activeEffects = char.activeEffects || {}
  const activeAbilityItems = (char.habilidades || [])
    .map((h, index) => ({ ...h, effectKey: `habilidade_${index}`, sourceLabel: 'Habilidade' }))
    .filter((item) => activeEffects[item.effectKey])
  const activeModuleItems = acquiredModules
    .map((m) => ({ ...m, effectKey: `module_${m.id}`, sourceLabel: 'Modulo' }))
    .filter((item) => activeEffects[item.effectKey])
  const activeItems = [...activeAbilityItems, ...activeModuleItems]
  const activeBonuses = mergeBonuses(activeItems)

  const derived = {
    vida: cls ? calcVidaTotal(cls, char.nivel, char.atributos, sk, char.choices, char.triagemPrincipal, char.triagemPrincipalNivel, char) : 0,
    energia: cls ? calcEnergiaTotal(cls, char.nivel, char.atributos, sk, char.choices, char.triagemPrincipal, char.triagemPrincipalNivel, char.subTriagem, char.subTriagemNivel, char) : 0,
    pe: cls ? calcPeTotal(cls, char.nivel, char.choices, char) : 0,
    ca: (cls ? calcCA(char.atributos, sk, char.pericias, char) : 0) + activeBonuses.ca,
    reacoes: calcReacoes(char.atributos, sk, char.triagemPrincipal, char.triagemPrincipalNivel, char.subTriagem, char.subTriagemNivel, char),
    percepcao: cls ? calcPercepcaoPassiva(char.atributos, sk, char.pericias, char) : 0,
    danoBase: cls ? calcDanoBase(cls, char.atributos, sk, char.nivel, char.subTriagem, char.subTriagemNivel, char.triagemPrincipal, char.triagemPrincipalNivel, char) : '',
  }

  if (activeBonuses.dano && derived.danoBase) derived.danoBase = `${derived.danoBase} + ${activeBonuses.dano}`

  const vidaNow = char.vidaOverride ?? (derived.vida + (char.vidaBonus || 0) + activeBonuses.vida)
  const energiaNow = char.energiaOverride ?? (derived.energia + (char.energiaBonus || 0) + activeBonuses.energia)
  const peNow = char.peOverride ?? (derived.pe + (char.peBonus || 0))

  const costReduction = calcAbilityCostReduction(char.triagemPrincipal, char.triagemPrincipalNivel || 0, char.subTriagem, char.subTriagemNivel || 0)

  const pehTotal = cls ? calcPEHTotal(cls, char.nivel, char.choices, char.modulosAdquiridos) : 0
  const pehSpent = calcPEHSpent(char.habilidades)
  const pehRemaining = pehTotal - pehSpent

  const periciasArr = Object.entries(char.pericias || {}).filter(([, v]) => v > 0)
  const systemOptIn = char.systemsOptIn || {}
  const spellProfile = getSpellProfile(char)
  const runeProfile = getRuneProfile(char)
  const alchemyEnabled = systemOptIn.alchemy || (char.alchemyRituals || []).length > 0
  const spellsEnabled = systemOptIn.spells || (char.spells || []).length > 0
  const runesEnabled = systemOptIn.runes || (char.runes || []).length > 0
  const magicEnabled = systemOptIn.magic || (char.magics || []).length > 0
  const magicProfile = getMagicProfile(char)
  const [sheetView, setSheetView] = useState('overview')

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

  function toggleActiveEffect(key) {
    if (!update) return
    update({ activeEffects: { ...activeEffects, [key]: !activeEffects[key] } })
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
            ...(h.descricaoBalanceada && { descricao: h.descricaoBalanceada }),
            ...(!h.descricaoBalanceada && h.descricao && { descricao: h.descricao }),
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
            ...(h.descricaoBalanceada && { descricao: h.descricaoBalanceada }),
            ...(!h.descricaoBalanceada && h.descricao && { descricao: h.descricao }),
            ...(h.tipo && { tipo: h.tipo }),
            ...(h.custo && { custo: h.custo }),
          }
        }
      })
      update({ armaHabilidades: arHabs })
    }
  }

  const canEdit = !!update
  const showAll = sheetView === 'full'
  const visible = (...views) => showAll || views.includes(sheetView)
  const abilityCount = (char.habilidades || []).filter(h => h.nome || h.descricao).length
  const mysticCount = (char.alchemyRituals || []).length + (char.spells || []).length + (char.runes || []).length + (char.magics || []).length
  const equipmentCount = Array.isArray(char.equipamentos)
    ? char.equipamentos.length
    : Object.values(char.equipamentos || {}).filter(Boolean).length
  const inventoryCount = (char.inventario || []).length + equipmentCount + (char.arma ? 1 : 0) + (char.arteMarcial ? 1 : 0)
  const sheetCounts = {
    powers: abilityCount + acquiredModules.length,
    traits: periciasArr.length + (char.raca ? 1 : 0) + (char.triagemPrincipal ? 1 : 0),
    inventory: inventoryCount,
    mystic: mysticCount,
  }
  const primaryTriage = getSheetTriageTitle(char, cls)

  return (
    <div className="sheet-experience space-y-4">
      <div className="sheet-actionbar">
        <button onClick={handleCopy} className="border border-sep text-txt-dim px-3 py-1.5 rounded text-xs hover:border-gold hover:text-gold transition-colors">
          Copiar Texto
        </button>
        <button onClick={onSave} className="bg-gold text-void font-semibold px-5 py-1.5 rounded text-xs hover:bg-gold-light transition-colors">
          Salvar Ficha ✓
        </button>
      </div>

      <div className={`active-effects-panel ${activeItems.length > 0 ? 'is-live' : ''}`}>
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-gold font-semibold">Supervisao de efeitos ativos</div>
          <p className="text-txt-dim text-xs mt-1">Habilidades e modulos ligados alteram a leitura da ficha ate serem desativados.</p>
        </div>
        <div className="active-effects-summary">
          {activeItems.length > 0 ? activeItems.map((item) => (
            <button key={item.effectKey} type="button" onClick={() => toggleActiveEffect(item.effectKey)} className="active-effect-chip">
              <span>{item.sourceLabel}</span>
              <strong>{item.nome || item.name || 'Efeito ativo'}</strong>
            </button>
          )) : (
            <span className="text-txt-dim text-xs">Nenhum efeito ativo no momento.</span>
          )}
          {(activeBonuses.ataque || activeBonuses.ca || activeBonuses.vida || activeBonuses.energia || activeBonuses.dano) ? (
            <span className="active-effect-total">
              {activeBonuses.ataque ? `Ataque ${activeBonuses.ataque > 0 ? '+' : ''}${activeBonuses.ataque} ` : ''}
              {activeBonuses.ca ? `CA ${activeBonuses.ca > 0 ? '+' : ''}${activeBonuses.ca} ` : ''}
              {activeBonuses.vida ? `Vida ${activeBonuses.vida > 0 ? '+' : ''}${activeBonuses.vida} ` : ''}
              {activeBonuses.energia ? `Energia ${activeBonuses.energia > 0 ? '+' : ''}${activeBonuses.energia} ` : ''}
              {activeBonuses.dano ? `Dano ${activeBonuses.dano > 0 ? '+' : ''}${activeBonuses.dano}` : ''}
            </span>
          ) : null}
        </div>
      </div>

      <SheetViewTabs active={sheetView} onChange={setSheetView} counts={sheetCounts} />

      <div className="character-sheet-shell bg-deep/95 backdrop-blur-sm border border-gold/15 overflow-hidden shadow-2xl shadow-black/40">
        {/* ═══ HEADER ═══ */}
        <div className="sheet-hero-legacy relative overflow-hidden">
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
          <div className="sheet-hero-metrics">
            <HeroMetric label="Vida" value={vidaNow} tone="life" />
            <HeroMetric label="Energia" value={energiaNow} tone="energy" />
            <HeroMetric label="CA" value={derived.ca} tone="guard" />
            <HeroMetric label="Triagem" value={primaryTriage} tone="gold" />
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
        </div>

        {/* ═══ BODY ═══ */}
        <div className="p-4 sm:p-5">
          {visible('inventory') && (
            <section className="sheet-panel mb-5 space-y-5">
              <div>
                <EquipmentSection
                  char={char}
                  canEdit={canEdit}
                  onUpdate={(eq) => update({ equipamentos: eq })}
                  onCharacterUpdate={update}
                  onDrawerToggle={() => {}}
                />
              </div>
              <div className="border-t border-sep/25 pt-5">
                <InventorySection
                  items={char.inventario || []}
                  canEdit={canEdit}
                  onUpdate={(items) => update({ inventario: items })}
                  onDrawerToggle={() => {}}
                />
              </div>
            </section>
          )}

          <div className={`sheet-body-grid sheet-view-${sheetView} grid grid-cols-1 lg:grid-cols-12 gap-5`}>

            {/* ═══ LEFT COLUMN ═══ */}
            <div className="lg:col-span-7 space-y-5">

              {/* ATTRIBUTES */}
              <section className={visible('overview') ? 'sheet-panel' : 'hidden'}>
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
              <section className={visible('overview') ? 'sheet-panel' : 'hidden'}>
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
              <section className={visible('overview', 'combat') ? 'sheet-panel bg-void/60 border border-red-400/15 rounded-lg p-4' : 'hidden'}>
                <SectionHeader icon="⚔" title="Combate" color="bg-red-400" />
                <div className="grid grid-cols-4 gap-3">
                  <CombatStat label="CA" value={derived.ca} />
                  {activeBonuses.ataque ? <CombatStat label="Ataque Ativo" value={`${activeBonuses.ataque > 0 ? '+' : ''}${activeBonuses.ataque}`} isGold /> : null}
                  <div className="text-center">
                    <span className="text-txt-dim/50 text-[10px] uppercase block">Reações</span>
                    <span className="text-txt-main text-xl font-mono block">{derived.reacoes}</span>
                    {((char.triagemPrincipal === 'ASSASSINO' && (char.triagemPrincipalNivel || 0) >= 0.2) || (char.subTriagem === 'ASSASSINO' && (char.subTriagemNivel || 0) >= 0.2)) && (
                      <span className="text-[8px] text-purple-400/70 block mt-0.5">+{Math.floor(totalAttr('DES') / 15)} Assassino</span>
                    )}
                  </div>
                  <CombatStat label="Percepção" value={derived.percepcao} />
                  <div className="text-center">
                    <span className="text-txt-dim/50 text-[10px] uppercase block">Dano Base</span>
                    <span className="text-gold text-xs font-mono block mt-1 leading-tight">{derived.danoBase}</span>
                  </div>
                </div>
                {((char.triagemPrincipal === 'ATIRADOR' && (char.triagemPrincipalNivel || 0) >= 0.1) || (char.subTriagem === 'ATIRADOR' && (char.subTriagemNivel || 0) >= 0.1)) && (
                  <div className="mt-2 bg-sky-500/5 border border-sky-500/15 rounded px-2.5 py-1.5 text-[10px] text-sky-400/80 flex items-center gap-1.5">
                    <span className="text-sky-400">★</span>
                    Vantagem em Pontaria
                  </div>
                )}
              </section>

              {/* PERÍCIAS */}
              <section className={visible('traits') ? 'sheet-panel' : 'hidden'}>
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
              <section className={visible('traits', 'combat') ? 'sheet-panel' : 'hidden'}>
                <SectionHeader icon="★" title="Triagens" color="bg-purple-400" />
                <TriagemSection char={char} cls={cls} />
              </section>

              {/* HERANÇA RACIAL */}
              <details className={visible('traits') ? 'group sheet-panel' : 'hidden'}>
                <summary className="flex items-center gap-2 cursor-pointer hover:bg-gold/[0.035] rounded-lg px-1 py-1 -mx-1 transition-colors list-none">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-1 h-4 rounded-full bg-emerald-400" />
                    <span className="text-txt-dim text-[11px]">🧬</span>
                    <h3 className="font-cinzel text-txt-main text-xs uppercase tracking-[0.15em]">Herança Racial</h3>
                    <div className="flex-1 h-px bg-gradient-to-r from-sep/60 to-transparent" />
                  </div>
                  <span className="text-txt-dim/30 text-[10px] group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="mt-2">
                  <RaceHeritageSection char={char} />
                </div>
              </details>

              {/* ARMAS & EQUIPAMENTOS */}
              <div className={sheetView === 'combat' ? '' : 'hidden'}>
                <EquipmentSection char={char} canEdit={canEdit} onUpdate={(eq) => update({ equipamentos: eq })} onCharacterUpdate={update} onDrawerToggle={() => {}} />
              </div>
            </div>

            {/* ═══ RIGHT COLUMN ═══ */}
            <div className="lg:col-span-5 space-y-5">

              {visible('overview') && (
                <section className="sheet-panel sheet-focus-panel">
                  <SectionHeader icon=">" title="Mapa da Ficha" color="bg-gold" />
                  <div className="sheet-focus-grid">
                    {[
                      { key: 'combat', label: 'Combate', value: `${derived.ca} CA`, desc: `${derived.reacoes} reações` },
                      { key: 'powers', label: 'Poderes', value: abilityCount, desc: `${acquiredModules.length} módulos` },
                      { key: 'traits', label: 'Traços', value: periciasArr.length, desc: primaryTriage },
                      { key: 'inventory', label: 'Bolsa', value: inventoryCount, desc: `${mysticCount} registros místicos` },
                    ].map(item => (
                      <button key={item.key} type="button" onClick={() => setSheetView(item.key)} className="sheet-focus-card">
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                        <small>{item.desc}</small>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* ARMAS & ARTE MARCIAL */}
              <div className={sheetView === 'combat' ? '' : 'hidden'}>
                <WeaponMartialPanel char={char} update={update} canEdit={canEdit} />
              </div>

              {/* MÓDULOS */}
              <section className={visible('powers') ? 'sheet-panel' : 'hidden'}>
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
                          {canEdit && !isPassive && (
                            <button
                              type="button"
                              onClick={() => toggleActiveEffect(`module_${m.id}`)}
                              className={`active-toggle mt-2 ${activeEffects[`module_${m.id}`] ? 'is-active' : ''}`}
                            >
                              {activeEffects[`module_${m.id}`] ? 'Ativo na ficha' : 'Ligar efeito'}
                            </button>
                          )}
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
              <div className={visible('powers') ? '' : 'hidden'}>
                <AbilityAnalysisChat char={char} onApply={handleBalanceApply} characterId={characterId} />
              </div>

              {/* HABILIDADES */}
              <section className={visible('powers') ? 'sheet-panel' : 'hidden'}>
                <SectionHeader icon="✦" title="Habilidades" color="bg-indigo-400" />
                {canEdit && (
                  <div className="mb-3 bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-2.5 flex items-center gap-3 text-[11px]">
                    <span className="text-indigo-400 font-semibold">PEH</span>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 h-2 bg-void rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pehRemaining < 0 ? 'bg-red-500' : pehRemaining === 0 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                          style={{ width: `${Math.min(100, Math.max(0, (pehSpent / Math.max(1, pehTotal)) * 100))}%` }}
                        />
                      </div>
                      <span className={`font-mono ${pehRemaining < 0 ? 'text-red-400' : pehRemaining === 0 ? 'text-emerald-400' : 'text-indigo-400'}`}>
                        {pehRemaining}/{pehTotal}
                      </span>
                    </div>
                    <span className="text-txt-dim/60">gastos: {pehSpent}</span>
                  </div>
                )}
                {costReduction > 0 && (
                  <div className="mb-2 bg-blue-500/5 border border-blue-500/20 rounded-lg p-2 text-[11px] text-blue-400/80 flex items-center gap-1.5">
                    <span className="text-blue-400">★</span>
                    Suporte: −{Math.round(costReduction * 100)}% custo de Buffs
                  </div>
                )}
                <div className="space-y-1.5">
                  {(char.habilidades || []).map((h, i) => (
                    <HabilidadeCard
                      key={i}
                      h={h}
                      i={i}
                      canEdit={canEdit}
                      updateHabilidade={updateHabilidade}
                      charNivel={char.nivel || 1}
                      pehRemaining={pehRemaining}
                      active={!!activeEffects[`habilidade_${i}`]}
                      activePreview={parseActiveBonuses(h)}
                      onToggleActive={() => toggleActiveEffect(`habilidade_${i}`)}
                    />
                  ))}
                </div>
              </section>

              {/* INVENTÁRIO */}
              <div className="hidden">
                <InventorySection
                  items={char.inventario || []}
                  canEdit={canEdit}
                  onUpdate={(items) => update({ inventario: items })}
                  onDrawerToggle={() => {}}
                />
              </div>

              {/* NOTAS */}
              <section className={visible('inventory') ? 'sheet-panel' : 'hidden'}>
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
              <section className={showAll ? 'sheet-panel' : 'hidden'}>
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

          <div className={`mt-5 border-t border-sep/30 pt-5 ${visible('mystic') ? '' : 'hidden'}`}>
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

function HabilidadeCard({ h, i, canEdit, updateHabilidade, charNivel, pehRemaining, active, activePreview, onToggleActive }) {
  const [open, setOpen] = useState(false)

  const evoNivel = h.evolucaoNivel || 0
  const maxEvo = getMaxEvolucao(h.tipo)
  const evoDelta = calcEvolucaoDelta(h, evoNivel)
  const bracket = getSkillBracket(h.custoEnergia || 0, h.tipo)
  const { allowed: canUp, reason: upReason } = canEvolveSkill(h, evoNivel, charNivel)
  const canDown = evoNivel > 0 && h.tipo !== 'Passiva'

  const typeStyle = h.tipo === 'Ultimate'
    ? { border: 'border-gold/30', bg: 'bg-gold/3', badge: 'bg-gold/15 text-gold border-gold/20', icon: '★', label: 'Ultimate' }
    : h.tipo === 'Passiva'
    ? { border: 'border-emerald-400/20', bg: 'bg-emerald-400/3', badge: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20', icon: 'P', label: 'Passiva' }
    : h.tipo === 'Extra (Triagem)'
    ? { border: 'border-purple-400/20', bg: 'bg-purple-400/3', badge: 'bg-purple-400/10 text-purple-400 border-purple-400/20', icon: 'T', label: 'Extra (Triagem)' }
    : h.tipo === 'Extra (Módulo)'
    ? { border: 'border-sky-400/20', bg: 'bg-sky-400/3', badge: 'bg-sky-400/10 text-sky-400 border-sky-400/20', icon: 'M', label: 'Extra (Módulo)' }
    : { border: 'border-indigo-400/15', bg: 'bg-indigo-400/2', badge: 'bg-indigo-400/10 text-indigo-400 border-indigo-400/20', icon: `#${i + 1}`, label: 'Ativa' }

  function handleEvoUp() {
    if (!canUp || pehRemaining <= 0) return
    updateHabilidade(i, { evolucaoNivel: evoNivel + 1 })
  }

  function handleEvoDown() {
    if (!canDown) return
    updateHabilidade(i, { evolucaoNivel: evoNivel - 1 })
  }

  return (
    <div className={`rounded-xl border ${typeStyle.border} ${typeStyle.bg} overflow-hidden transition-all`}>
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gold/[0.035] transition-colors">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className={`text-xs font-bold w-8 h-8 rounded-lg flex items-center justify-center border ${typeStyle.badge} shrink-0`}>
            {typeStyle.icon}
          </span>
          <div className="min-w-0 flex-1">
            <span className="text-txt-main text-sm font-semibold block truncate">{h.nome || '—'}</span>
            <span className="text-txt-dim/50 text-[10px]">
              {typeStyle.label}{h.custoEnergia > 0 ? ` · ⚡${h.custoEnergia}` : ''}{h.dano ? ` · ⚔${h.dano}` : ''}
              {evoNivel > 0 && <span className="text-indigo-400 ml-1">· Evo {evoNivel}/{maxEvo} ({bracket})</span>}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          {canEdit && (
            <button type="button" onClick={e => { e.stopPropagation(); onToggleActive?.() }}
              title="Ativar ou desativar efeito temporario na ficha"
              className={`active-toggle ${active ? 'is-active' : ''}`}>
              {active ? 'Ativo' : 'Ligar'}
            </button>
          )}
          {canEdit && h.tipo !== 'Passiva' && (
            <div className="flex items-center gap-1 mr-1">
              <button type="button" onClick={e => { e.stopPropagation(); handleEvoDown() }}
                disabled={!canDown}
                className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center transition-colors ${canDown ? 'bg-void border border-sep/50 text-txt-dim hover:border-red-400 hover:text-red-400' : 'opacity-20 cursor-not-allowed'}`}>
                −
              </button>
              <span className={`text-[10px] font-mono w-4 text-center ${evoNivel > 0 ? 'text-indigo-400' : 'text-txt-dim/40'}`}>{evoNivel}</span>
              <button type="button" onClick={e => { e.stopPropagation(); handleEvoUp() }}
                disabled={!canUp || pehRemaining <= 0}
                title={upReason || (pehRemaining <= 0 ? 'Sem PEH disponível' : '')}
                className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center transition-colors ${canUp && pehRemaining > 0 ? 'bg-void border border-sep/50 text-txt-dim hover:border-indigo-400 hover:text-indigo-400' : 'opacity-20 cursor-not-allowed'}`}>
                +
              </button>
            </div>
          )}
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[h.status] === 'text-ok' ? 'border-ok/20 bg-ok/5' : STATUS_COLORS[h.status] === 'text-warn' ? 'border-warn/20 bg-warn/5' : STATUS_COLORS[h.status] === 'text-err' ? 'border-err/20 bg-err/5' : 'border-sep/20 bg-sep/5'} ${STATUS_COLORS[h.status] || 'text-txt-dim'}`}>{h.status}</span>
          <span className="text-txt-dim/30 text-sm">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-sep/15">
          {evoDelta && (
            <div className="flex flex-wrap gap-1.5 pt-3">
              {evoDelta.dadoExtra && <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20 font-mono">{evoDelta.dadoExtra} dano</span>}
              {evoDelta.flatExtra && <span className="text-[10px] bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded border border-orange-500/20 font-mono">{evoDelta.flatExtra} flat</span>}
              {evoDelta.energiaExtra && <span className="text-[10px] bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded border border-sky-500/20 font-mono">{evoDelta.energiaExtra} energia</span>}
              {evoDelta.duracaoExtra && <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 font-mono">{evoDelta.duracaoExtra}</span>}
            </div>
          )}
          {(activePreview?.ataque || activePreview?.ca || activePreview?.vida || activePreview?.energia || activePreview?.dano) ? (
            <div className="flex flex-wrap gap-1.5 pt-3">
              {activePreview.ataque ? <span className="effect-bonus-pill">Ataque {activePreview.ataque > 0 ? '+' : ''}{activePreview.ataque}</span> : null}
              {activePreview.ca ? <span className="effect-bonus-pill">CA {activePreview.ca > 0 ? '+' : ''}{activePreview.ca}</span> : null}
              {activePreview.vida ? <span className="effect-bonus-pill">Vida {activePreview.vida > 0 ? '+' : ''}{activePreview.vida}</span> : null}
              {activePreview.energia ? <span className="effect-bonus-pill">Energia {activePreview.energia > 0 ? '+' : ''}{activePreview.energia}</span> : null}
              {activePreview.dano ? <span className="effect-bonus-pill">Dano {activePreview.dano > 0 ? '+' : ''}{activePreview.dano}</span> : null}
            </div>
          ) : null}
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

function WeaponMartialPanel({ char, update, canEdit }) {
  const nivel = char.nivel || 1
  const weaponLimit = getWeaponLimitForLevel(nivel)
  const martialLimit = getMartialArtsLimitForLevel(nivel)
  const [showWeaponSelector, setShowWeaponSelector] = useState(false)
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [aiDesc, setAiDesc] = useState('')
  const [genLoading, setGenLoading] = useState(false)
  const [genError, setGenError] = useState('')
  const [showLegendary, setShowLegendary] = useState(false)
  const [showMartialSelector, setShowMartialSelector] = useState(false)

  const selectedWeapon = WEAPONS.find(w => w.id === char.arma)
  const selectedRank = WEAPON_RANKS.find(r => r.rank === char.armaRank) || WEAPON_RANKS[0]
  const availableSlots = selectedRank.slots
  const usedSlots = (char.armaHabilidades || []).reduce((sum, h) => sum + (WEAPON_ABILITY_COST[h.potencia] || 0), 0)
  const selectedArt = MARTIAL_ARTS.find(a => a.id === char.arteMarcial)
  const selectedGrau = char.arteMarcialGrau || 0
  const rc = RANK_COLORS[char.armaRank] || RANK_COLORS.Comum
  const maxRankIdx = getRankIndex(weaponLimit.maxRank)

  function handleWeaponChange(armaId) {
    if (!canEdit) return
    const w = WEAPONS.find(x => x.id === armaId)
    update({ arma: armaId || null, armaRank: 'Comum', armaHabilidades: [] })
    setShowWeaponSelector(false)
  }

  function handleRankChange(rank) {
    if (!canEdit) return
    if (!canEquipRank(nivel, rank)) return
    update({ armaRank: rank, armaHabilidades: [] })
  }

  function addHabilidade(potencia) {
    if (!canEdit) return
    const cost = WEAPON_ABILITY_COST[potencia] || 0
    if (usedSlots + cost > availableSlots) return
    const arr = [...(char.armaHabilidades || []), { nome: '', potencia, descricao: '', tipo: 'Ativa', custo: '' }]
    update({ armaHabilidades: arr })
  }

  function removeHabilidade(i) {
    if (!canEdit) return
    const arr = (char.armaHabilidades || []).filter((_, j) => j !== i)
    update({ armaHabilidades: arr })
  }

  function updateHabilidade(i, patch) {
    if (!canEdit) return
    const arr = [...(char.armaHabilidades || [])]
    arr[i] = { ...arr[i], ...patch }
    update({ armaHabilidades: arr })
  }

  async function handleAIGenerate() {
    if (!char.arma) return
    setGenLoading(true)
    setGenError('')
    try {
      const count = Math.max(1, char.armaHabilidades?.length || 1)
      const data = await generateWeaponAbilities(char, char.arma, char.armaRank || 'Comum', availableSlots, aiDesc, count)
      if (data.habilidades?.length) {
        let totalSlots = 0
        const fitting = []
        for (const h of data.habilidades) {
          const cost = WEAPON_ABILITY_COST[h.potencia] || 1
          if (totalSlots + cost <= availableSlots) {
            fitting.push({ ...h, potencia: h.potencia || 'Fraca', tipo: h.tipo || 'Ativa', custo: h.custo || '' })
            totalSlots += cost
          }
        }
        update({ armaHabilidades: fitting })
        setShowAIPanel(false)
        setAiDesc('')
      }
    } catch (err) {
      setGenError(err.message)
    } finally {
      setGenLoading(false)
    }
  }

  const SLOT_OPTIONS = Object.entries(WEAPON_ABILITY_COST)

  return (
    <section>
      <SectionHeader icon=">" title="Artes Marciais" color="bg-orange-400" />

      {!canEdit && !selectedWeapon && !selectedArt && (
        <p className="text-txt-dim/50 text-[11px] italic">Nenhuma arma ou arte marcial equipada</p>
      )}

      {/* LIMITES */}
      <div className="bg-void/60 border border-sep/30 rounded-lg p-2.5 mb-4">
        <div className="flex flex-wrap gap-3 text-[10px]">
          <span className="text-txt-dim">Artes Marciais: <span className="text-orange-400 font-mono">{martialLimit.maxArts}</span> (máx Grau <span className="text-orange-400">{GRAU_LABELS[martialLimit.maxGrau]}</span>)</span>
        </div>
      </div>

      {/* ARMA SELECIONADA */}
      {canEdit && false && (
        <div className="space-y-3">
          {!showWeaponSelector ? (
            <div>
              {selectedWeapon ? (
                <button type="button" onClick={() => setShowWeaponSelector(true)}
                  className={`w-full rounded-lg border ${rc.border} ${rc.bg} ${rc.glow} p-3 text-left hover:brightness-110 transition-all`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${rc.badge} border flex items-center justify-center text-lg shrink-0`}>⚔</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-txt-main text-sm font-semibold">{selectedWeapon.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${rc.badge}`}>{char.armaRank}</span>
                        <span className="text-[10px] text-txt-dim/50">({RANK_LEVEL_BAND[char.armaRank] || '?'})</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs">
                        <span className="text-red-400/90 font-mono">{selectedWeapon.dano}{selectedRank.danoBonus ? `+${selectedRank.danoBonus}` : ''}</span>
                        <span className="text-txt-dim/60">{selectedWeapon.attr}</span>
                        <span className="text-sky-400/70">+{selectedRank.caBonus} CA</span>
                        <span className="text-gold/60">{availableSlots} slots</span>
                      </div>
                      <p className="text-txt-dim/50 text-[10px] mt-0.5">{selectedWeapon.mec}</p>
                    </div>
                    <span className="text-txt-dim/30 text-xs">▶ editar</span>
                  </div>
                </button>
              ) : (
                <button type="button" onClick={() => setShowWeaponSelector(true)}
                  className="w-full border border-dashed border-sep/50 rounded-lg p-3 text-center text-txt-dim/50 text-xs hover:border-gold/30 hover:text-gold/60 transition-colors">
                  + Selecionar Arma
                </button>
              )}
            </div>
          ) : (
            <div className="bg-void/60 border border-gold/20 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gold text-xs font-semibold uppercase tracking-wider">Selecionar Arma</span>
                <button onClick={() => setShowWeaponSelector(false)} className="text-txt-dim hover:text-err text-xs">✕</button>
              </div>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                {WEAPONS.map(w => (
                  <button key={w.id} onClick={() => handleWeaponChange(w.id)}
                    className={`text-left border rounded-lg p-2 transition-all ${char.arma === w.id ? 'border-gold/50 bg-gold/5' : 'border-sep/40 bg-void/40 hover:border-gold/30'}`}>
                    <span className="text-txt-main text-[11px] font-semibold">{w.name}</span>
                    <div className="flex gap-2 mt-0.5 text-[10px]">
                      <span className="text-red-400/70 font-mono">{w.dano}</span>
                      <span className="text-txt-dim/50">{w.attr}</span>
                    </div>
                  </button>
                ))}
              </div>
              {selectedWeapon && (
                <button onClick={() => { update({ arma: null, armaRank: 'Comum', armaHabilidades: [] }); setShowWeaponSelector(false) }}
                  className="text-err/60 hover:text-err text-[10px]">Remover Arma</button>
              )}
            </div>
          )}

          {/* RANK SELECTION */}
          {selectedWeapon && (
            <div>
              <label className="text-txt-dim text-[10px] uppercase tracking-wider block mb-1.5">Rank da Arma</label>
              <div className="grid grid-cols-4 gap-1.5">
                {WEAPON_RANKS.map(r => {
                  const rankIdx = getRankIndex(r.rank)
                  const allowed = rankIdx <= maxRankIdx
                  const rColors = RANK_COLORS[r.rank]
                  const active = char.armaRank === r.rank
                  return (
                    <button key={r.rank} onClick={() => allowed && handleRankChange(r.rank)} disabled={!allowed}
                      className={`rounded-lg px-2 py-1.5 text-[10px] border text-left transition-all ${
                        active ? `${rColors.border} ${rColors.bg} ${rColors.glow}` :
                        allowed ? 'border-sep/30 bg-void/40 hover:border-sep/60' :
                        'border-sep/10 bg-void/20 opacity-30 cursor-not-allowed'
                      }`}>
                      <div className={`font-semibold ${active ? rColors.text : allowed ? 'text-txt-main' : 'text-txt-dim/30'}`}>{r.rank}</div>
                      <div className="text-[9px] mt-0.5 space-y-0">
                        <div className={allowed ? 'text-txt-dim/60' : 'text-txt-dim/20'}>{r.danoBonus || '—'} · +{r.caBonus} CA</div>
                        <div className={allowed ? 'text-gold/50' : 'text-txt-dim/20'}>{r.slots} slots</div>
                      </div>
                      {!allowed && <div className="text-[8px] text-err/40 mt-0.5">Requer N{weaponLimit.maxRank === r.rank ? '' : ''}</div>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* WEAPON ABILITIES */}
          {selectedWeapon && availableSlots > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-txt-dim text-[10px] uppercase tracking-wider">Habilidades da Arma</span>
                <span className={`text-[10px] font-mono ${usedSlots > availableSlots ? 'text-err' : usedSlots === availableSlots ? 'text-ok' : 'text-txt-main'}`}>
                  Slots: {usedSlots}/{availableSlots}
                </span>
              </div>
              {(char.armaHabilidades || []).map((hab, i) => (
                <div key={i} className="bg-void/40 border border-sep/30 rounded-lg p-2.5 space-y-1.5">
                  <div className="flex gap-1.5">
                    <input type="text" value={hab.nome || ''} onChange={e => updateHabilidade(i, { nome: e.target.value })}
                      placeholder="Nome" className="flex-1 bg-deep border border-sep rounded px-2 py-1 text-[11px] text-txt-main focus:border-gold/40 focus:outline-none" />
                    <select value={hab.potencia || 'Fraca'} onChange={e => {
                      const newCost = WEAPON_ABILITY_COST[e.target.value] || 0
                      const otherSlots = (char.armaHabilidades || []).reduce((s, h2, j) => j === i ? s : s + (WEAPON_ABILITY_COST[h2.potencia] || 0), 0)
                      if (otherSlots + newCost > availableSlots) return
                      updateHabilidade(i, { potencia: e.target.value })
                    }} className="bg-deep border border-sep rounded px-2 py-1 text-[11px] text-txt-main">
                      {SLOT_OPTIONS.map(([label, cost]) => {
                        const otherSlots = (char.armaHabilidades || []).reduce((s, h2, j) => j === i ? s : s + (WEAPON_ABILITY_COST[h2.potencia] || 0), 0)
                        return <option key={label} value={label} disabled={otherSlots + cost > availableSlots}>{label} ({cost})</option>
                      })}
                    </select>
                    <select value={hab.tipo || 'Ativa'} onChange={e => updateHabilidade(i, { tipo: e.target.value })}
                      className="bg-deep border border-sep rounded px-2 py-1 text-[11px] text-txt-main">
                      <option value="Ativa">Ativa</option>
                      <option value="Passiva">Passiva</option>
                    </select>
                    <button onClick={() => removeHabilidade(i)} className="px-2 py-1 bg-err/20 text-err rounded text-[10px] hover:bg-err/30">✕</button>
                  </div>
                  <textarea value={hab.descricao || ''} onChange={e => updateHabilidade(i, { descricao: e.target.value })}
                    placeholder="Descrição da habilidade..." rows={2}
                    className="w-full bg-deep border border-sep rounded px-2 py-1 text-[10px] text-txt-main resize-none focus:border-gold/40 focus:outline-none" />
                  <input type="text" value={hab.custo || ''} onChange={e => updateHabilidade(i, { custo: e.target.value })}
                    placeholder="Custo" className="w-full bg-deep border border-sep rounded px-2 py-1 text-[10px] text-txt-main focus:border-gold/40 focus:outline-none" />
                </div>
              ))}
              {usedSlots < availableSlots && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-txt-dim/50 text-[10px]">Adicionar:</span>
                  {SLOT_OPTIONS.map(([label, cost]) => (
                    <button key={label} onClick={() => usedSlots + cost <= availableSlots && addHabilidade(label)}
                      disabled={usedSlots + cost > availableSlots}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                        usedSlots + cost <= availableSlots ? 'bg-void border-gold/30 text-gold hover:bg-gold/10' : 'bg-void/20 border-sep/10 text-txt-dim/20 cursor-not-allowed'
                      }`}>
                      + {label} ({cost})
                    </button>
                  ))}
                </div>
              )}
              {usedSlots > 0 && (
                <div className="pt-1.5 border-t border-sep/15">
                  {!showAIPanel ? (
                    <button onClick={() => setShowAIPanel(true)}
                      className="bg-purple-500/10 border border-purple-400/30 text-purple-400 text-[10px] px-3 py-1.5 rounded hover:bg-purple-500/20 transition-colors">
                      ✦ Gerar com IA
                    </button>
                  ) : (
                    <div className="bg-void/50 border border-purple-400/20 rounded-lg p-2.5 space-y-2">
                      <p className="text-txt-dim text-[9px]">Descreva o estilo para a IA criar habilidades:</p>
                      <textarea value={aiDesc} onChange={e => setAiDesc(e.target.value)} placeholder="Ex: Uma katana que corta o vento..." rows={2}
                        className="w-full bg-void/60 border border-sep/40 rounded px-2 py-1.5 text-[10px] text-txt-main resize-none focus:border-purple-400/40 focus:outline-none" />
                      {genError && <p className="text-err text-[9px]">{genError}</p>}
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setShowAIPanel(false)} className="text-txt-dim text-[10px] px-2 py-1 hover:text-txt-main">Cancelar</button>
                        <button onClick={handleAIGenerate} disabled={genLoading}
                          className="bg-purple-500 text-white text-[10px] px-3 py-1 rounded font-semibold hover:bg-purple-400 transition-colors disabled:opacity-50 flex items-center gap-1">
                          {genLoading && <span className="animate-spin inline-block w-2.5 h-2.5 border border-gold/30 border-t-gold rounded-full" />}
                          {genLoading ? 'Gerando...' : 'Gerar'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* LEGENDARY WEAPONS */}
          <div>
            <button type="button" onClick={() => setShowLegendary(!showLegendary)}
              className="text-amber-400/60 text-[10px] hover:text-amber-400 transition-colors flex items-center gap-1">
              <span>★</span> Armas Lendárias
              <span className="text-txt-dim/30 text-[9px]">({showLegendary ? 'ocultar' : 'ver'})</span>
            </button>
            {showLegendary && (
              <div className="mt-2 space-y-2">
                <p className="text-txt-dim/50 text-[9px] italic">Armas exclusivas da narrativa. Apenas o Mestre pode atribuí-las a personagens.</p>
                {LEGENDARY_WEAPONS.map(lw => (
                  <div key={lw.id} className="bg-void/50 border border-amber-400/20 rounded-lg p-2.5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-amber-400 text-sm">★</span>
                      <span className="text-txt-main text-xs font-semibold">{lw.name}</span>
                      <span className="text-[9px] bg-amber-400/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-400/20">{lw.rank}</span>
                      <span className="text-[9px] text-txt-dim/50">{lw.tipo}</span>
                    </div>
                    <p className="text-txt-dim/70 text-[10px] leading-relaxed">{lw.descricao}</p>
                    <div className="flex gap-3 mt-1 text-[10px]">
                      <span className="text-red-400/80 font-mono">Dano: {lw.dano}</span>
                      <span className="text-txt-dim/50">{lw.attr}</span>
                    </div>
                    <p className="text-gold/50 text-[9px] mt-1 italic">{lw.mec}</p>
                    {(lw.habilidades || []).length > 0 && (
                      <div className="mt-1.5 space-y-1">
                        {(lw.habilidades || []).map((h, hi) => (
                          <div key={hi} className="bg-amber-400/5 border border-amber-400/10 rounded px-2 py-1">
                            <span className="text-amber-400/80 text-[10px] font-semibold">{h.nome}</span>
                            <span className="text-[8px] text-amber-400/40 ml-1">{h.potencia} · {h.tipo}</span>
                            <p className="text-txt-dim/60 text-[9px]">{h.descricao}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* MARTE MARCIAL */}
          <div className="border-t border-sep/20 pt-3">
            {!showMartialSelector ? (
              selectedArt ? (
                <button type="button" onClick={() => setShowMartialSelector(true)} className="w-full text-left">
                  <div className="bg-void/50 border border-orange-400/20 rounded-lg p-2.5 hover:border-orange-400/40 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-orange-400 text-sm">👊</span>
                      <span className="text-txt-main text-xs font-semibold">{selectedArt.name}</span>
                      <span className="text-[10px] bg-orange-400/10 text-orange-400 px-1.5 py-0.5 rounded border border-orange-400/20">
                        {selectedArt.graus[selectedGrau]?.nome || 'Novato'}
                      </span>
                      <span className="text-txt-dim/30 text-[10px] ml-auto">▶</span>
                    </div>
                    <p className="text-txt-dim/60 text-[10px] mt-1">{selectedArt.graus[selectedGrau]?.desc}</p>
                  </div>
                </button>
              ) : (
                <button type="button" onClick={() => setShowMartialSelector(true)}
                  className="w-full border border-dashed border-sep/50 rounded-lg p-2.5 text-center text-txt-dim/50 text-[10px] hover:border-orange-400/30 hover:text-orange-400/60 transition-colors">
                  + Selecionar Arte Marcial
                </button>
              )
            ) : (
              <div className="bg-void/60 border border-orange-400/20 rounded-lg p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-orange-400 text-[10px] font-semibold uppercase tracking-wider">Arte Marcial</span>
                  <button onClick={() => setShowMartialSelector(false)} className="text-txt-dim hover:text-err text-xs">✕</button>
                </div>
                <select value={char.arteMarcial || ''} onChange={e => update({ arteMarcial: e.target.value || null, arteMarcialGrau: 0 })}
                  className="w-full bg-void border border-sep/40 rounded px-2 py-1.5 text-[11px] text-txt-main focus:border-orange-400/40 focus:outline-none">
                  <option value="">— Nenhuma —</option>
                  {MARTIAL_ARTS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                {selectedArt && (
                  <div className="grid grid-cols-2 gap-1">
                    {GRAU_LABELS.map((label, gi) => {
                      const allowed = gi <= martialLimit.maxGrau
                      const sel = (char.arteMarcialGrau || 0) === gi
                      return (
                        <button key={gi} onClick={() => allowed && update({ arteMarcialGrau: gi })} disabled={!allowed}
                          className={`rounded px-2 py-1.5 text-[10px] border text-left transition-colors ${
                            sel ? 'bg-orange-400/15 border-orange-400/40 text-orange-300' :
                            allowed ? 'bg-void/50 border-sep/30 text-txt-dim hover:border-orange-400/30' :
                            'bg-void/20 border-sep/10 text-txt-dim/20 cursor-not-allowed'
                          }`}>
                          <div className="font-semibold">{label}</div>
                          <div className="text-[9px] mt-0.5 opacity-70">{selectedArt.graus[gi]?.desc}</div>
                        </button>
                      )
                    })}
                  </div>
                )}
                {selectedArt && (
                  <button onClick={() => { update({ arteMarcial: null, arteMarcialGrau: 0 }) }}
                    className="text-err/60 hover:text-err text-[10px]">Remover Arte Marcial</button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {canEdit && (
        <div className="space-y-2">
          <select value={char.arteMarcial || ''} onChange={e => update({ arteMarcial: e.target.value || null, arteMarcialGrau: 0 })}
            className="w-full bg-void border border-sep/40 rounded px-2 py-2 text-xs text-txt-main focus:border-orange-400/40 focus:outline-none">
            <option value="">Nenhuma arte marcial</option>
            {MARTIAL_ARTS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {selectedArt && (
            <>
              <div className="grid grid-cols-2 gap-1">
                {GRAU_LABELS.map((label, gi) => {
                  const allowed = gi <= martialLimit.maxGrau
                  const sel = (char.arteMarcialGrau || 0) === gi
                  return (
                    <button key={gi} onClick={() => allowed && update({ arteMarcialGrau: gi })} disabled={!allowed}
                      className={`rounded px-2 py-1.5 text-[10px] border text-left transition-colors ${
                        sel ? 'bg-orange-400/15 border-orange-400/40 text-orange-300' :
                        allowed ? 'bg-void/50 border-sep/30 text-txt-dim hover:border-orange-400/30' :
                        'bg-void/20 border-sep/10 text-txt-dim/20 cursor-not-allowed'
                      }`}>
                      <div className="font-semibold">{label}</div>
                      <div className="text-[9px] mt-0.5 opacity-70">{selectedArt.graus[gi]?.desc}</div>
                    </button>
                  )
                })}
              </div>
              <button onClick={() => update({ arteMarcial: null, arteMarcialGrau: 0 })}
                className="text-err/60 hover:text-err text-[10px]">Remover Arte Marcial</button>
            </>
          )}
        </div>
      )}

      {/* READ-ONLY VIEW */}
      {false && !canEdit && selectedWeapon && (
        <div className={`rounded-lg border ${rc.border} ${rc.bg} ${rc.glow} p-3`}>
          <div className="flex items-center gap-2">
            <span className="text-txt-main text-sm font-semibold">{selectedWeapon.name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${rc.badge}`}>{char.armaRank}</span>
          </div>
          <div className="flex gap-3 mt-0.5 text-xs">
            <span className="text-red-400/90 font-mono">{selectedWeapon.dano}{selectedRank.danoBonus ? `+${selectedRank.danoBonus}` : ''}</span>
            <span className="text-txt-dim/60">{selectedWeapon.attr}</span>
          </div>
        </div>
      )}
      {!canEdit && selectedArt && (
        <div className="bg-void/50 border border-sep/40 rounded-lg p-2.5 mt-2">
          <div className="flex items-center gap-2">
            <span className="text-txt-main text-xs font-semibold">{selectedArt.name}</span>
            <span className="text-[10px] bg-orange-400/10 text-orange-400 px-1.5 py-0.5 rounded border border-orange-400/20">
              {selectedArt.graus[selectedGrau]?.nome || 'Novato'}
            </span>
          </div>
          <p className="text-txt-dim/60 text-[10px] mt-0.5">{selectedArt.graus[selectedGrau]?.desc}</p>
        </div>
      )}
    </section>
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
