import { useState, useRef, useEffect, useDeferredValue, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { calcVidaTotal, calcEnergiaTotal, calcPeTotal, calcCA, calcReacoes, calcPercepcaoPassiva, calcDanoBase, calcAbilityCostReduction, calcExtraAbilities, calcExtraAbilitiesTypes, calcCarryCapacity } from '../../utils/calculator'
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
import { getSpellProfile, canLearnSpell } from '../../utils/spellRules'
import { getRuneProfile, canLearnRune } from '../../utils/runeRules'
import { getMagicProfile, canLearnMagic } from '../../utils/magicRules'
import { getAlchemyProfile, canLearnAlchemyRitual } from '../../utils/alchemyRules'
import { getGrimorioAccessTier, getAvailableGrimorioTiers, getMaxCustomRituals, getMaxCreationShots, getScoreForDisplay, getGrimorioMaxRituals, getGrimorioMaxCircle, canAddRitualToGrimorio, canCreateRitualAtCircle, getAvailableCirclesForChar } from '../../utils/grimorioRules'
import { GRIMORIO_TIERS, GRIMORIO_TYPE_LABELS, GRIMORIO_TYPE_ICONS } from '../../data/grimorios'
import { DEFAULT_GRIMORIOS, PUBLIC_GRIMORIOS } from '../../data/publicGrimorios'
import { ENTIDADES_OUTRO_LADO } from '../../data/entidades'
import { analyzeAlchemyRitualDraft, analyzeSpellDraft, analyzeRuneDraft, analyzeMagicDraft } from '../../services/aiService'
import { calcEquipStats } from '../../data/equipment'
import { uploadGrimorioImage } from '../../services/uploadService'
import ImageUploadField from '../ImageUploadField'

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
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-primary/20">
      <div className={`w-1.5 h-5 rounded-full ${color}`} />
      <span className="text-outline text-sm">{icon}</span>
      <h3 className="font-cinzel text-on-surface text-sm uppercase tracking-[0.1em] font-semibold">{title}</h3>
      <div className="flex-1 h-px bg-gradient-to-r from-primary/20 to-transparent" />
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
  const avatarInputRef = useRef(null)
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
  const equipmentStats = calcEquipStats(char.equipamentos || [])

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

  const vidaNow = char.vidaOverride ?? (derived.vida + (char.vidaBonus || 0) + activeBonuses.vida + equipmentStats.totalExtraLife)
  const energiaNow = char.energiaOverride ?? (derived.energia + (char.energiaBonus || 0) + activeBonuses.energia)
  const peNow = char.peOverride ?? (derived.pe + (char.peBonus || 0))

  const vidaAtual = char.vidaAtual ?? vidaNow
  const energiaAtual = char.energiaAtual ?? energiaNow
  const peAtual = char.peAtual ?? peNow

  const costReduction = calcAbilityCostReduction(char.triagemPrincipal, char.triagemPrincipalNivel || 0, char.subTriagem, char.subTriagemNivel || 0)

  const pehTotal = cls ? calcPEHTotal(cls, char.nivel, char.choices, char.modulosAdquiridos) : 0
  const pehSpent = calcPEHSpent(char.habilidades)
  const pehRemaining = pehTotal - pehSpent

  const periciasArr = Object.entries(char.pericias || {}).filter(([, v]) => v > 0)
  const systemOptIn = char.systemsOptIn || {}
  const spellProfile = getSpellProfile(char)
  const runeProfile = getRuneProfile(char)
  const alchemyProfile = getAlchemyProfile(char)
  const magicProfile = getMagicProfile(char)
  const alchemyEnabled = alchemyProfile.hasAccess && (systemOptIn.alchemy || (char.alchemyRituals || []).length > 0)
  const spellsEnabled = spellProfile.hasAccess && (systemOptIn.spells || (char.spells || []).length > 0)
  const runesEnabled = runeProfile.hasAccess && (systemOptIn.runes || (char.runes || []).length > 0)
  const magicEnabled = magicProfile.hasAccess && (systemOptIn.magic || (char.magics || []).length > 0)
  const [sheetView, setSheetView] = useState('full')

  function toggleKnowledge(key, currentlyEnabled) {
    if (!update) return
    const fieldMap = { alchemy: 'alchemyRituals', spells: 'spells', runes: 'runes', magic: 'magics' }
    const nextOptIn = { ...systemOptIn, [key]: !currentlyEnabled }
    const patch = { systemsOptIn: nextOptIn }
    if (!currentlyEnabled) {
      patch[fieldMap[key]] = patch[fieldMap[key]] || char[fieldMap[key]] || []
    }
    update(patch)
  }

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

  function handleAvatarFile(e) {
    const file = e.target.files?.[0]
    if (!file || !update) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const size = 256
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        const scale = Math.max(size / img.width, size / img.height)
        const w = img.width * scale
        const h = img.height * scale
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
        update({ avatar: canvas.toDataURL('image/webp', 0.78) })
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
    e.target.value = ''
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

      <div className="codex-card overflow-hidden">
        <div className="flex flex-col xl:flex-row">
          <section className="flex-1 p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center border-l-4 border-l-primary bg-gradient-to-br from-primary/5 via-transparent to-transparent">
            <div className="relative shrink-0">
              <div className="absolute inset-0 border border-primary/30 -m-2 rounded hidden md:block" />
              {char.avatar ? (
                <img src={char.avatar} alt="" className="relative w-28 h-28 object-cover border border-primary/20 bg-surface-container" />
              ) : (
                <div className="relative w-28 h-28 bg-surface-container border border-primary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-primary/30">person</span>
                </div>
              )}
              {canEdit && (
                <>
                  <button type="button" onClick={() => avatarInputRef.current?.click()}
                    className="absolute -right-2 -bottom-2 w-9 h-9 rounded-full bg-deep/95 border border-primary/30 text-primary grid place-items-center hover:bg-primary hover:text-on-primary transition-colors"
                    title="Alterar ícone do personagem">
                    <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
                </>
              )}
            </div>
            <div className="flex-1 text-center md:text-left space-y-3 min-w-0">
              <h2 className="font-cinzel text-white uppercase tracking-[0.05em] truncate" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', lineHeight: 1.1 }}>
                {char.nome || 'Sem Nome'}
              </h2>
              <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-1">
                <span className="font-mono text-outline uppercase" style={{ fontSize: '11px', letterSpacing: '0.15em' }}>Classe: {cls || '—'}</span>
                <span className="font-mono text-outline uppercase" style={{ fontSize: '11px', letterSpacing: '0.15em' }}>Nível {char.nivel || 1}</span>
                <span className="font-mono text-outline uppercase" style={{ fontSize: '11px', letterSpacing: '0.15em' }}>{getRaceLabel(char) || '—'}</span>
              </div>
              <div className="flex flex-wrap justify-center md:justify-start gap-2">
                <span className="px-3 py-1 bg-primary/5 border border-primary/20 text-primary font-mono uppercase" style={{ fontSize: '10px', letterSpacing: '0.1em' }}>{cls || '—'}</span>
                <span className="px-3 py-1 bg-white/5 border border-white/10 text-on-surface-variant font-mono uppercase" style={{ fontSize: '10px', letterSpacing: '0.1em' }}>Nível {char.nivel || 1}</span>
                {primaryTriage !== 'Sem triagem' && (
                  <span className="px-3 py-1 bg-secondary-fixed-dim/5 border border-secondary-fixed-dim/20 text-secondary-fixed-dim font-mono uppercase" style={{ fontSize: '10px', letterSpacing: '0.1em' }}>{primaryTriage}</span>
                )}
              </div>
            </div>
          </section>

          <section className="xl:w-[420px] grid grid-cols-3 border-t xl:border-t-0 xl:border-l border-white/5">
            <div className="flex flex-col items-center justify-center py-4 bg-resource-vida/5 border-r border-white/5">
              <span className="font-mono text-resource-vida/70 uppercase tracking-[0.2em] mb-1" style={{ fontSize: '10px' }}>Vida</span>
              {canEdit ? (
                <input type="number" value={vidaAtual}
                  onChange={e => update({ vidaAtual: Number(e.target.value) || 0 })}
                  className={`font-mono leading-none bg-transparent border-b border-white/10 w-20 text-center outline-none focus:border-gold/50 transition-colors ${hpColor(vidaNow > 0 ? Math.round((vidaAtual / vidaNow) * 100) : 0)}`}
                  style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }} />
              ) : (
                <span className={`font-mono leading-none ${hpColor(vidaNow > 0 ? Math.round((vidaAtual / vidaNow) * 100) : 0)}`} style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}>{vidaAtual}</span>
              )}
              <span className="font-mono text-txt-dim/30 text-[10px] mt-1">{vidaNow}</span>
            </div>
            <div className="flex flex-col items-center justify-center py-4 bg-resource-energia/5 border-r border-white/5">
              <span className="font-mono text-resource-energia/70 uppercase tracking-[0.2em] mb-1" style={{ fontSize: '10px' }}>Energia</span>
              {canEdit ? (
                <input type="number" value={energiaAtual}
                  onChange={e => update({ energiaAtual: Number(e.target.value) || 0 })}
                  className={`font-mono leading-none bg-transparent border-b border-white/10 w-20 text-center outline-none focus:border-gold/50 transition-colors ${enColor(energiaNow > 0 ? Math.round((energiaAtual / energiaNow) * 100) : 0)}`}
                  style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }} />
              ) : (
                <span className={`font-mono leading-none ${enColor(energiaNow > 0 ? Math.round((energiaAtual / energiaNow) * 100) : 0)}`} style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}>{energiaAtual}</span>
              )}
              <span className="font-mono text-txt-dim/30 text-[10px] mt-1">{energiaNow}</span>
            </div>
            <div className="flex flex-col items-center justify-center py-4 bg-resource-pe/5">
              <span className="font-mono text-resource-pe/70 uppercase tracking-[0.2em] mb-1" style={{ fontSize: '10px' }}>P.E.</span>
              {canEdit ? (
                <input type="number" value={peAtual}
                  onChange={e => update({ peAtual: Number(e.target.value) || 0 })}
                  className={`font-mono leading-none bg-transparent border-b border-white/10 w-20 text-center outline-none focus:border-gold/50 transition-colors ${peColor(peNow > 0 ? Math.round((peAtual / peNow) * 100) : 0)}`}
                  style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }} />
              ) : (
                <span className={`font-mono leading-none ${peColor(peNow > 0 ? Math.round((peAtual / peNow) * 100) : 0)}`} style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}>{peAtual}</span>
              )}
              <span className="font-mono text-txt-dim/30 text-[10px] mt-1">{peNow}</span>
            </div>
          </section>
        </div>

        {/* ═══ BODY ═══ */}
        <div className="p-4 sm:p-5">
          <div className={`sheet-body-grid sheet-view-${sheetView} grid grid-cols-1 lg:grid-cols-12 gap-5`}>

            {/* ═══ LEFT COLUMN ═══ */}
            <div className="lg:col-span-7 space-y-5">

              {/* ATTRIBUTES */}
              <section className={visible('overview') ? 'sheet-panel' : 'hidden'}>
                <SectionHeader icon="📊" title="Atributos" color="bg-amber-400" />
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {['FOR','DES','CON','INT','APA','AM'].map(a => {
                    const v = totalAttr(a)
                    const m = getModifier(v)
                    return (
                      <div key={a} className="flex flex-col items-center p-3 border border-primary/10 bg-white/5 hover:border-primary/30 transition-colors">
                        <span className="font-mono text-outline uppercase tracking-widest mb-1" style={{ fontSize: '10px' }}>{ATTR_ICONS[a]} {a}</span>
                        <span className="font-mono text-white leading-none" style={{ fontSize: '28px' }}>{v}</span>
                        <span className={`font-mono font-bold ${m >= 0 ? 'text-primary' : 'text-secondary-fixed-dim'}`} style={{ fontSize: '11px' }}>
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
                  <ResBox label="Vida" icon="❤" current={vidaAtual} max={vidaNow}
                    pctColor={hpColor} pctBarColor={hpBarColor}
                    canEdit={canEdit}
                    onChange={v => update({ vidaAtual: Number(v) || 0 })} onReset={() => update({ vidaAtual: null })} />
                  <ResBox label="Energia" icon="⚡" current={energiaAtual} max={energiaNow}
                    pctColor={enColor} pctBarColor={enBarColor}
                    canEdit={canEdit}
                    onChange={v => update({ energiaAtual: Number(v) || 0 })} onReset={() => update({ energiaAtual: null })} />
                  <ResBox label="PE" icon="✦" current={peAtual} max={peNow}
                    pctColor={peColor} pctBarColor={peBarColor}
                    canEdit={canEdit}
                    onChange={v => update({ peAtual: Number(v) || 0 })} onReset={() => update({ peAtual: null })} />
                </div>
              </section>

              {/* COMBAT */}
              <section className={visible('overview', 'combat') ? 'sheet-panel bg-void/60 border border-red-400/15 rounded-lg p-4' : 'hidden'}>
                <SectionHeader icon="⚔" title="Combate" color="bg-red-400" />
                <div className="grid grid-cols-4 gap-3">
                  <CombatStat label="CA" value={derived.ca} />
                  {equipmentStats.totalArmor ? <CombatStat label="Armadura" value={equipmentStats.totalArmor} isGold /> : null}
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
                {(equipmentStats.totalShield || equipmentStats.totalCrit || equipmentStats.totalDamage || equipmentStats.activeSetBonuses.length > 0) && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {equipmentStats.totalShield ? <span className="text-[10px] px-2 py-1 rounded border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">Escudo {equipmentStats.totalShield}</span> : null}
                    {equipmentStats.totalCrit ? <span className="text-[10px] px-2 py-1 rounded border border-purple-400/20 bg-purple-400/10 text-purple-300">Crit +{equipmentStats.totalCrit}%</span> : null}
                    {equipmentStats.totalDamage ? <span className="text-[10px] px-2 py-1 rounded border border-red-400/20 bg-red-400/10 text-red-300">Dano +{equipmentStats.totalDamage}</span> : null}
                    {equipmentStats.activeSetBonuses.map(({ type, count, bonus }) => (
                      <span key={type.id} className={`text-[10px] px-2 py-1 rounded border ${type.badgeClass}`}>{type.label} {count}/4: {bonus.label}</span>
                    ))}
                  </div>
                )}
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

              {/* INVENTÁRIO & EQUIPAMENTOS */}
              <section className={visible('inventory') ? 'sheet-panel space-y-5' : 'hidden'}>
                <SectionHeader icon="🎒" title="Inventário & Equipamentos" color="bg-amber-400" />
                <EquipmentSection
                  char={char}
                  canEdit={canEdit}
                  onUpdate={(eq) => update({ equipamentos: eq })}
                  onCharacterUpdate={update}
                  onDrawerToggle={() => {}}
                />
                <div className="border-t border-sep/25 pt-5">
                  <InventorySection
                    items={char.inventario || []}
                    canEdit={canEdit}
                    onUpdate={(items) => update({ inventario: items })}
                    wallet={{ dolares: char.dolares || 0, dracmas: char.dracmas || 0 }}
                    onWalletUpdate={(patch) => update(patch)}
                    onDrawerToggle={() => {}}
                    maxCarry={calcCarryCapacity(char.atributos, sk, char)}
                    level={char.nivel || 1}
                    modules={char.modulosAdquiridos || []}
                  />
                </div>
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

            </div>

          </div>

          <div className={`mt-5 border-t border-sep/30 pt-5 ${visible('mystic') ? '' : 'hidden'}`}>
            <MysticKnowledgeGrid
              char={char} update={update} canEdit={canEdit}
              alchemyProfile={alchemyProfile} spellProfile={spellProfile}
              runeProfile={runeProfile} magicProfile={magicProfile}
              alchemyEnabled={alchemyEnabled} spellsEnabled={spellsEnabled}
              runesEnabled={runesEnabled} magicEnabled={magicEnabled}
              systemOptIn={systemOptIn}
            />
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

const KNOWLEDGE_CARDS = [
  { key: 'alchemy', icon: '⚗', title: 'Alquimia', accent: '#2dd4bf', accentClass: 'text-teal-400', borderClass: 'border-teal-400/25', glowClass: 'bg-teal-400/8', field: 'alchemyRituals' },
  { key: 'spells', icon: '✨', title: 'Feitiços', accent: '#34d399', accentClass: 'text-emerald-400', borderClass: 'border-emerald-400/25', glowClass: 'bg-emerald-400/8', field: 'spells' },
  { key: 'runes', icon: '💎', title: 'Runas', accent: '#38bdf8', accentClass: 'text-sky-400', borderClass: 'border-sky-400/25', glowClass: 'bg-sky-400/8', field: 'runes' },
  { key: 'magic', icon: '🔥', title: 'Magias', accent: '#fb923c', accentClass: 'text-orange-400', borderClass: 'border-orange-400/25', glowClass: 'bg-orange-400/8', field: 'magics' },
]

const CIRCLE_BADGE = {
  1: 'bg-emerald-400/12 text-emerald-300 border-emerald-400/25',
  2: 'bg-sky-400/12 text-sky-300 border-sky-400/25',
  3: 'bg-purple-400/12 text-purple-300 border-purple-400/25',
  4: 'bg-amber-300/12 text-amber-200 border-amber-300/30',
}

const RITUAL_FETCH = {
  alchemy: () => import('../../services/alchemyService').then(m => m.fetchAlchemyRituals()),
  spells: () => import('../../services/alchemyService').then(m => m.fetchSpellRituals()),
  runes: () => import('../../services/alchemyService').then(m => m.fetchRuneRituals()),
  magic: () => import('../../services/alchemyService').then(m => m.fetchMagicRituals()),
}

function normalizeRitual(ritual) {
  return { id: ritual.id, name: ritual.name, circle: ritual.circle, category: ritual.category, short_description: ritual.short_description, pe_cost: ritual.pe_cost, effect: ritual.effect }
}

function MysticKnowledgeGrid({ char, update, canEdit, alchemyProfile, spellProfile, runeProfile, magicProfile, alchemyEnabled, spellsEnabled, runesEnabled, magicEnabled, systemOptIn }) {
  const [expanded, setExpanded] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(null)
  const [pickerGrimorioId, setPickerGrimorioId] = useState(null)
  const [grimorioPickerOpen, setGrimorioPickerOpen] = useState(null)
  const profiles = { alchemy: alchemyProfile, spells: spellProfile, runes: runeProfile, magic: magicProfile }
  const enabled = { alchemy: alchemyEnabled, spells: spellsEnabled, runes: runesEnabled, magic: magicEnabled }

  const visibleCards = KNOWLEDGE_CARDS.filter(c => profiles[c.key]?.hasAccess)

  function toggleExpand(key) {
    if (!canEdit) return
    const next = expanded === key ? null : key
    setExpanded(next)
    if (next && !enabled[next]) {
      const fieldMap = { alchemy: 'alchemyRituals', spells: 'spells', runes: 'runes', magic: 'magics' }
      update({ systemsOptIn: { ...systemOptIn, [next]: true }, [fieldMap[next]]: char[fieldMap[next]] || [] })
    }
  }

  if (visibleCards.length === 0) {
    return <p className="text-txt-dim text-xs text-center py-6 italic">Nenhuma disciplina mística disponível para este personagem.</p>
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {visibleCards.map(card => {
          const isExpanded = expanded === card.key
          const count = (char[card.field] || []).length
          return (
            <button key={card.key} type="button" onClick={() => toggleExpand(card.key)}
              className={`relative aspect-square rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                isExpanded ? `${card.borderClass} ${card.glowClass} ring-1 ring-current ${card.accentClass}` : 'border-sep/20 bg-void/30 hover:border-sep/40'
              }`}>
              <span className={`text-3xl ${isExpanded ? card.accentClass : 'text-txt-dim/60'}`}>{card.icon}</span>
              <span className={`text-sm font-semibold ${isExpanded ? 'text-txt-main' : 'text-txt-dim/70'}`}>{card.title}</span>
              {count > 0 && (
                <span className={`absolute top-2 right-2 text-[10px] font-mono px-1.5 py-0.5 rounded-full ${isExpanded ? 'bg-white/10 text-txt-main' : 'bg-sep/20 text-txt-dim'}`}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {expanded && enabled[expanded] && (
        <KnowledgeExpandedSection char={char} update={update} card={KNOWLEDGE_CARDS.find(c => c.key === expanded)}
          profile={profiles[expanded]} onOpenPicker={(grimorioId) => { setPickerOpen(expanded); setPickerGrimorioId(grimorioId || null) }}
          onOpenGrimorioPicker={() => setGrimorioPickerOpen(expanded)} />
      )}

      {pickerOpen && createPortal(
        <RitualPickerModal char={char} update={update} card={KNOWLEDGE_CARDS.find(c => c.key === pickerOpen)}
          profile={profiles[pickerOpen]} grimorioId={pickerGrimorioId} onClose={() => { setPickerOpen(null); setPickerGrimorioId(null) }} />,
        document.body
      )}

      {grimorioPickerOpen && createPortal(
        <GrimorioPickerModal char={char} update={update} card={KNOWLEDGE_CARDS.find(c => c.key === grimorioPickerOpen)}
          onClose={() => setGrimorioPickerOpen(null)} />,
        document.body
      )}
    </div>
  )
}

const CIRCLE_BG = {
  1: 'bg-emerald-500/15 hover:bg-emerald-500/22 border-emerald-500/25',
  2: 'bg-sky-500/15 hover:bg-sky-500/22 border-sky-500/25',
  3: 'bg-purple-500/15 hover:bg-purple-500/22 border-purple-500/25',
  4: 'bg-amber-400/15 hover:bg-amber-400/22 border-amber-400/25',
}

const CIRCLE_BORDER_TOP = {
  1: 'border-t-2 border-t-emerald-400/40',
  2: 'border-t-2 border-t-sky-400/40',
  3: 'border-t-2 border-t-purple-400/40',
  4: 'border-t-2 border-t-amber-300/40',
}

const USES_ENERGIA = new Set(['spells', 'magic'])

function KnowledgeExpandedSection({ char, update, card, profile, onOpenPicker, onOpenGrimorioPicker }) {
  const allItems = (char[card.field] || []).slice().sort((a, b) => a.circle - b.circle || a.name.localeCompare(b.name))
  const SPACE_COST = { 1: 4, 2: 6, 3: 10, 4: 15 }
  const spaceUsed = allItems.reduce((s, r) => s + (SPACE_COST[r.circle] || 0), 0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeRitualId, setActiveRitualId] = useState(null)
  const [grimorioViewId, setGrimorioViewId] = useState(null)
  const usesEnergia = USES_ENERGIA.has(card.key)

  const accessTier = getGrimorioAccessTier(char, card.key)
  const availableTiers = getAvailableGrimorioTiers(char, card.key)
  const maxCustom = getMaxCustomRituals(char, card.key)
  const personalGrimorios = (char.grimorios || []).filter(g => g.knowledgeKey === card.key)
  const publicTemplates = (DEFAULT_GRIMORIOS[card.key] || []).filter(g => {
    if (!accessTier) return false
    const tierOrder = ['iniciante', 'avancado', 'mestre']
    const maxIdx = tierOrder.indexOf(accessTier)
    const gIdx = tierOrder.indexOf(g.tier)
    return gIdx <= maxIdx
  })
  const grimorios = [
    ...publicTemplates.map(g => ({ ...g, isPublic: true, id: `public-${g.id}` })),
    ...personalGrimorios,
  ]
  const score = getScoreForDisplay(char, card.key)
  const nextTierThreshold = accessTier === 'mestre' ? null : accessTier === 'avancado' ? 50 : accessTier === 'iniciante' ? 30 : 14

  function openSidebar(ritualId) {
    setActiveRitualId(ritualId)
    setSidebarOpen(true)
  }

  function removeRitual(ritual) {
    if (!update) return
    const current = char[card.field] || []
    update({ [card.field]: current.filter(r => r.id !== ritual.id) })
    if (activeRitualId === ritual.id) setActiveRitualId(null)
  }

  function getRitualsForGrimorio(grimorio) {
    if (grimorio.isPublic) {
      const realId = grimorio.id.replace('public-', '')
      return allItems.filter(r => r.grimorioId === realId || r.grimorioId === grimorio.id)
    }
    return allItems.filter(r => (r.grimorioId || null) === grimorio.id)
  }

  const viewingGrimorio = grimorios.find(g => g.id === grimorioViewId) || null

  return (
    <div className={`rounded-xl border ${card.borderClass} bg-void/40 overflow-hidden`}>
      <div className="flex items-center justify-between gap-3 p-4 pb-2">
        <div className="flex items-center gap-2">
          <span className={card.accentClass}>{card.icon}</span>
          <span className={`font-semibold text-sm ${card.accentClass}`}>{card.title}</span>
          <span className="text-[11px] text-txt-dim font-mono">{spaceUsed}/{profile.spaceBudget} espaços</span>
        </div>
        <div className="text-[10px] text-txt-dim font-mono">
          Afinidade: <span className={accessTier ? 'text-emerald-300' : 'text-txt-dim/40'}>{score}{nextTierThreshold ? `/${nextTierThreshold}` : ''}</span>
        </div>
      </div>

      {accessTier && nextTierThreshold && (
        <div className="px-4 pb-2">
          <span className="text-[10px] text-amber-300/50">
            Faltam <span className="text-amber-300">{nextTierThreshold - score}</span> pontos para {accessTier === 'iniciante' ? 'Avançado' : accessTier === 'avancado' ? 'Mestre' : ''}
          </span>
        </div>
      )}
      {accessTier && !nextTierThreshold && (
        <div className="px-4 pb-2">
          <span className="text-[10px] text-emerald-300/50">Afinidade máxima alcançada</span>
        </div>
      )}
      {!accessTier && (
        <div className="px-4 pb-2">
          <span className="text-[10px] text-amber-300/50">
            Faltam <span className="text-amber-300">{14 - score}</span> pontos para Iniciante
          </span>
        </div>
      )}
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 px-4 pb-4">
        {grimorios.map(grimorio => {
          const rituals = getRitualsForGrimorio(grimorio)
          const tier = GRIMORIO_TIERS.find(t => t.id === grimorio.tier)
          const maxRituals = grimorio.isPublic ? (grimorio.rituals?.length || 0) : getGrimorioMaxRituals(grimorio)
          const isFull = rituals.length >= maxRituals && maxRituals > 0
          return (
            <button key={grimorio.id} type="button" onClick={() => setGrimorioViewId(grimorio.id === grimorioViewId ? null : grimorio.id)}
              className={`relative rounded-xl overflow-hidden aspect-[3/4] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border ${
                grimorio.isPublic ? 'border-gold/15 hover:border-gold/35' : 'border-sep/20 hover:border-sep/40'
              }`}>
              {grimorio.isPublic && <span className="absolute top-2 right-2 text-[7px] text-gold/50 font-mono bg-black/40 backdrop-blur-sm rounded px-1.5 py-0.5 z-10">PUBLICO</span>}
              {grimorio.image ? (
                <img src={grimorio.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-void/80 flex items-center justify-center">
                  <span className="text-6xl opacity-15">{card.icon}</span>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent pt-10 pb-3 px-3">
                <span className="text-white text-[11px] font-semibold leading-tight block drop-shadow-lg">{grimorio.name}</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-white/45 text-[9px]">{tier?.name || 'Autoral'}</span>
                  <span className={`text-[9px] font-mono ${isFull ? 'text-amber-300' : 'text-amber-300/60'}`}>{rituals.length}/{maxRituals || '—'}</span>
                </div>
              </div>
            </button>
          )
        })}

        {update && accessTier && (
          <button type="button" onClick={onOpenGrimorioPicker}
            className="rounded-xl border-2 border-dashed border-sep/15 hover:border-sep/30 flex items-center justify-center aspect-[3/4] transition-all duration-200 hover:bg-white/[0.02] active:scale-[0.98]">
            <span className="text-txt-dim/25 text-2xl">+</span>
          </button>
        )}
      </div>

      {viewingGrimorio && (() => {
        const rituals = getRitualsForGrimorio(viewingGrimorio)
        const maxRituals = viewingGrimorio.isPublic ? (viewingGrimorio.rituals?.length || 0) : getGrimorioMaxRituals(viewingGrimorio)
        const isFull = rituals.length >= maxRituals
        return (
          <div className="border-t border-sep/15 px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={card.accentClass}>{card.icon}</span>
                <span className="text-txt-main text-sm font-semibold">{viewingGrimorio.name}</span>
                <span className={`text-[10px] font-mono ${isFull ? 'text-amber-300' : 'text-txt-dim'}`}>{rituals.length}/{maxRituals} rituais</span>
              </div>
              <button type="button" onClick={() => setGrimorioViewId(null)} className="text-txt-dim hover:text-txt-main text-xs">×</button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
              {rituals.map(ritual => (
                <button key={ritual.id} type="button" onClick={() => openSidebar(ritual.id)}
                  className={`relative rounded-lg border flex flex-col items-center justify-between p-2 text-left transition-all duration-200 hover:scale-[1.04] active:scale-[0.97] ${CIRCLE_BG[ritual.circle] || CIRCLE_BG[1]}`}>
                  <div className="w-full flex items-start justify-between">
                    <span className={`text-[9px] border rounded-full px-1 py-0.5 ${CIRCLE_BADGE[ritual.circle] || CIRCLE_BADGE[1]}`}>{ritual.circle}o</span>
                    {update && (
                      <span role="button" tabIndex={0} onClick={e => { e.stopPropagation(); removeRitual(ritual) }}
                        className="text-err/30 hover:text-err text-[10px] leading-none">×</span>
                    )}
                  </div>
                  <span className="text-txt-main text-[10px] font-semibold text-center leading-tight mt-0.5 line-clamp-2">{ritual.name}</span>
                  <div className="w-full flex items-center justify-between mt-0.5">
                    <span className="text-amber-300 text-[9px] font-mono">{ritual.pe_cost || 0} PE</span>
                    {usesEnergia && <span className="text-sky-300 text-[9px] font-mono">⚡</span>}
                  </div>
                </button>
              ))}
              {update && !isFull && (
                <button type="button" onClick={() => onOpenPicker(viewingGrimorio.id)}
                  className="rounded-lg border-2 border-dashed border-sep/15 hover:border-sep/30 flex items-center justify-center min-h-[80px] transition-all hover:bg-white/[0.02] active:scale-[0.97]">
                  <span className="text-txt-dim/25 text-lg">+</span>
                </button>
              )}
              {update && isFull && (
                <div className="rounded-lg border border-amber-300/15 bg-amber-300/5 flex items-center justify-center min-h-[80px]">
                  <span className="text-amber-300/40 text-[10px]">Cheio</span>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {sidebarOpen && createPortal(
        <div className="fixed inset-0 z-[60] flex justify-end" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm h-full bg-[#0a0c14]/95 border-l border-sep/20 shadow-2xl flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-sep/20">
              <div className="flex items-center gap-2">
                <span className={card.accentClass}>{card.icon}</span>
                <span className={`font-semibold text-sm ${card.accentClass}`}>{card.title}</span>
                <span className="text-[10px] text-txt-dim font-mono">{allItems.length}</span>
              </div>
              <button type="button" onClick={() => setSidebarOpen(false)} className="text-txt-dim hover:text-txt-main transition-colors">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {allItems.map(ritual => {
                const isActive = activeRitualId === ritual.id
                return (
                  <div key={ritual.id}
                    className={`rounded-lg border overflow-hidden transition-all duration-200 ${isActive ? (CIRCLE_BORDER_TOP[ritual.circle] || '') + ' ' + (CIRCLE_BG[ritual.circle] || CIRCLE_BG[1]) : 'border-sep/15 bg-void/30 hover:bg-void/50'}`}>
                    <button type="button" onClick={() => setActiveRitualId(isActive ? null : ritual.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-all duration-150 hover:brightness-110">
                      <span className={`text-[9px] border rounded-full px-1.5 py-0.5 shrink-0 ${CIRCLE_BADGE[ritual.circle] || CIRCLE_BADGE[1]}`}>{ritual.circle}o</span>
                      <span className="text-txt-main text-xs font-semibold truncate flex-1">{ritual.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-amber-300 text-[10px] font-mono">{ritual.pe_cost || 0} PE</span>
                        {usesEnergia && <span className="text-sky-300 text-[10px] font-mono">⚡</span>}
                      </div>
                      <span className={`text-txt-dim/30 text-[9px] transition-transform duration-200 ${isActive ? 'rotate-180' : ''}`}>▼</span>
                    </button>
                    {isActive && (
                      <div className="px-3 pb-3 pt-1 border-t border-white/5 space-y-2 animate-fadeIn">
                        {ritual.short_description && <p className="text-txt-dim text-xs leading-relaxed">{ritual.short_description}</p>}
                        {ritual.effect && <p className="text-txt-dim/60 text-[11px] leading-relaxed">{ritual.effect}</p>}
                        <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                          <span className="text-amber-300">{ritual.pe_cost || 0} PE</span>
                          {usesEnergia && <span className="text-sky-300">{ritual.pe_cost || 0} Energia</span>}
                          <span className="text-gold">{SPACE_COST[ritual.circle] || 0} espaços</span>
                          {ritual.category && <span className="text-txt-dim">{ritual.category}</span>}
                          {ritual.duration && <span className="text-sky-300">{ritual.duration}</span>}
                          {ritual.action_cost && <span className="text-purple-300">{ritual.action_cost}</span>}
                        </div>
                        {update && (
                          <button type="button" onClick={() => removeRitual(ritual)}
                            className="text-err/60 hover:text-err text-[10px] transition-colors mt-1">Remover</button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

function RitualPickerModal({ char, update, card, profile, grimorioId, onClose }) {
  const [tab, setTab] = useState('library')
  const [library, setLibrary] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [circleFilter, setCircleFilter] = useState('all')
  const [inspectId, setInspectId] = useState(null)
  const deferredSearch = useDeferredValue(search)
  const SPACE_COST = { 1: 4, 2: 6, 3: 10, 4: 15 }
  const usesEnergia = USES_ENERGIA.has(card.key)

  const [customName, setCustomName] = useState('')
  const [customDesc, setCustomDesc] = useState('')
  const [customCircle, setCustomCircle] = useState(1)
  const [customPeCost, setCustomPeCost] = useState(5)
  const [customAction, setCustomAction] = useState('Acao Padrao')
  const [customDuration, setCustomDuration] = useState('Instantaneo')
  const [customRange, setCustomRange] = useState('Pessoal')
  const [customEntity, setCustomEntity] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const [customEffect, setCustomEffect] = useState('')
  const [customAnalyzing, setCustomAnalyzing] = useState(false)
  const [customResult, setCustomResult] = useState(null)
  const [customError, setCustomError] = useState('')
  const [customMode, setCustomMode] = useState('form')

  const accessTier = getGrimorioAccessTier(char, card.key)
  const maxCustom = getMaxCustomRituals(char, card.key)
  const maxShots = getMaxCreationShots(char, card.key)
  const customCount = (char[card.field] || []).filter(r => r.isCustom).length
  const shotsLeft = maxShots - customCount

  const activeGrimorio = (char.grimorios || []).find(g => g.id === grimorioId) || null
  const publicGrimorio = !activeGrimorio && grimorioId
    ? (DEFAULT_GRIMORIOS[card.key] || []).find(g => `public-${g.id}` === grimorioId || g.id === grimorioId)
    : null
  const isPublicGrimorio = !!publicGrimorio
  const isPersonalGrimorio = !!activeGrimorio
  const effectiveGrimorio = activeGrimorio || publicGrimorio
  const grimorioMaxCircle = effectiveGrimorio ? getGrimorioMaxCircle(effectiveGrimorio) : 4
  const grimorioMaxRituals = isPublicGrimorio
    ? (publicGrimorio?.rituals?.length || 0)
    : effectiveGrimorio ? getGrimorioMaxRituals(effectiveGrimorio) : Infinity
  const grimorioRitualCount = activeGrimorio
    ? (char[card.field] || []).filter(r => r.grimorioId === activeGrimorio.id).length
    : 0
  const grimorioSlotsLeft = grimorioMaxRituals - grimorioRitualCount

  useEffect(() => {
    if (isPublicGrimorio) {
      setLibrary(publicGrimorio?.rituals || [])
      setLoading(false)
      return
    }
    if (isPersonalGrimorio) {
      const created = (char[card.field] || []).filter(r => r.grimorioId === activeGrimorio.id)
      setLibrary(created)
      setLoading(false)
      return
    }
    let active = true
    async function load() {
      setLoading(true)
      try {
        const fetchFn = RITUAL_FETCH[card.key]
        const res = fetchFn ? await fetchFn() : { data: [] }
        if (active) { setLibrary(res.data || []); setLoading(false) }
      } catch { if (active) { setLibrary([]); setLoading(false) } }
    }
    load()
    return () => { active = false }
  }, [card.key, grimorioId, isPublicGrimorio, isPersonalGrimorio])

  const selected = char[card.field] || []
  const spaceUsed = selected.reduce((s, r) => s + (SPACE_COST[r.circle] || 0), 0)

  const filtered = useMemo(() => {
    return library.filter(r => {
      const hay = `${r.name} ${r.short_description || ''} ${r.category || ''}`.toLowerCase()
      const matchSearch = !deferredSearch.trim() || hay.includes(deferredSearch.trim().toLowerCase())
      const matchCircle = circleFilter === 'all' || Number(circleFilter) === r.circle
      return matchSearch && matchCircle
    })
  }, [library, deferredSearch, circleFilter])

  const inspectedRitual = library.find(r => r.id === inspectId) || null

  function addRitual(ritual) {
    if (!update) return
    if (selected.some(r => r.id === ritual.id)) return
    const targetGrimorioId = isPublicGrimorio ? publicGrimorio.id : (activeGrimorio?.id || null)
    if (targetGrimorioId) {
      if (ritual.circle > grimorioMaxCircle) {
        alert(`Este grimorio suporta apenas circulos ate ${grimorioMaxCircle}o.`)
        return
      }
      if (grimorioSlotsLeft <= 0) {
        alert(`Este grimorio esta cheio (${grimorioRitualCount}/${grimorioMaxRituals}).`)
        return
      }
    }
    const current = selected
    const gateFn = { alchemy: canLearnAlchemyRitual, spells: canLearnSpell, runes: canLearnRune, magic: canLearnMagic }[card.key]
    const gate = gateFn ? gateFn(char, current, ritual) : { allowed: true }
    if (!gate.allowed) { alert(gate.reason); return }
    const normalized = normalizeRitual(ritual)
    if (targetGrimorioId) normalized.grimorioId = targetGrimorioId
    update({ [card.field]: [...current, normalized] })
  }

  async function analyzeCustomRitual() {
    if (!customName.trim()) {
      setCustomError('Preencha pelo menos o nome do ritual.')
      return
    }
    if (shotsLeft <= 0) {
      setCustomError(`Limite de ${maxShots} criações atingido para este conhecimento.`)
      return
    }
    setCustomAnalyzing(true)
    setCustomError('')
    setCustomResult(null)

    const draft = {
      name: customName.trim(),
      description: customDesc.trim() || customEffect.trim(),
      circle: customCircle,
      knowledgeType: card.key,
      pe_cost: customPeCost,
      action_cost: customAction,
      duration: customDuration,
      range: customRange,
      source_name: customEntity.trim(),
      category: customCategory.trim(),
      effect: customEffect.trim(),
    }
    const context = { characterLevel: char.nivel || 1 }

    try {
      const analyzeFn = { alchemy: analyzeAlchemyRitualDraft, spells: analyzeSpellDraft, runes: analyzeRuneDraft, magic: analyzeMagicDraft }[card.key]
      if (!analyzeFn) throw new Error('Tipo de conhecimento nao suportado.')
      const result = await analyzeFn(draft, context)
      setCustomResult(result)
      setCustomMode('feedback')
    } catch (err) {
      setCustomError(err.message || 'Erro ao analisar ritual.')
    } finally {
      setCustomAnalyzing(false)
    }
  }

  function confirmCustomRitual() {
    if (!customResult || !update) return
    if (activeGrimorio && grimorioSlotsLeft <= 0) {
      setCustomError('Este grimorio esta cheio.')
      return
    }
    const ritual = {
      id: crypto.randomUUID(),
      name: customResult.name || customName.trim(),
      circle: customResult.circle || customCircle,
      category: customResult.category || customCategory || 'Personalizado',
      pe_cost: customResult.pe_cost || customPeCost,
      action_cost: customResult.action_cost || customAction,
      duration: customResult.duration || customDuration,
      range: customResult.range || customRange,
      short_description: customResult.short_description || customDesc.trim(),
      effect: customResult.effect || customEffect.trim(),
      source_name: customResult.source_name || customEntity.trim(),
      isCustom: true,
      grimorioId: activeGrimorio ? activeGrimorio.id : null,
    }
    const current = char[card.field] || []
    update({ [card.field]: [...current, ritual] })
    resetCustomForm()
    setTab('library')
  }

  function keepOriginalRitual() {
    if (!update) return
    if (activeGrimorio && grimorioSlotsLeft <= 0) {
      setCustomError('Este grimorio esta cheio.')
      return
    }
    const ritual = {
      id: crypto.randomUUID(),
      name: customName.trim(),
      circle: customCircle,
      category: customCategory.trim() || 'Personalizado',
      pe_cost: customPeCost,
      action_cost: customAction,
      duration: customDuration,
      range: customRange,
      short_description: customDesc.trim(),
      effect: customEffect.trim(),
      source_name: customEntity.trim(),
      isCustom: true,
      grimorioId: activeGrimorio ? activeGrimorio.id : null,
    }
    const current = char[card.field] || []
    update({ [card.field]: [...current, ritual] })
    resetCustomForm()
    setTab('library')
  }

  function resetCustomForm() {
    setCustomName('')
    setCustomDesc('')
    setCustomCircle(1)
    setCustomPeCost(5)
    setCustomAction('Acao Padrao')
    setCustomDuration('Instantaneo')
    setCustomRange('Pessoal')
    setCustomEntity('')
    setCustomCategory('')
    setCustomEffect('')
    setCustomResult(null)
    setCustomError('')
    setCustomMode('form')
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-5xl max-h-[85vh] bg-[#0a0c14] border border-sep/30 rounded-2xl shadow-2xl flex overflow-hidden"
        onClick={e => e.stopPropagation()} style={{ '--grimoire-accent': card.accent }}>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-sep/20">
            <div className="flex items-center gap-3">
              <span className={`text-xl ${card.accentClass}`}>{card.icon}</span>
              <div>
                <h3 className={`font-cinzel text-sm uppercase tracking-wider font-semibold ${card.accentClass}`}>{card.title}</h3>
                {effectiveGrimorio && <span className="text-[10px] text-txt-dim font-mono">
                  {effectiveGrimorio.name} {isPublicGrimorio ? '(Publico)' : '(Autoral)'} — {grimorioRitualCount}/{grimorioMaxRituals} rituais — Circulos 1o-{grimorioMaxCircle}o
                </span>}
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-txt-dim">Espaços: <span className={spaceUsed >= profile.spaceBudget ? 'text-amber-300' : 'text-emerald-300'}>{spaceUsed}/{profile.spaceBudget}</span></span>
              <span className="text-txt-dim">Custos: <span className="text-gold">4/6/10/15</span></span>
            </div>
            <button type="button" onClick={onClose} className="text-txt-dim hover:text-txt-main text-lg transition-colors">×</button>
          </div>

          <div className="flex items-center gap-1 px-5 py-2 border-b border-sep/15">
            <button type="button" onClick={() => setTab('library')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === 'library' ? 'bg-gold/20 text-gold border border-gold/30' : 'text-txt-dim hover:text-txt-main'}`}>
              {isPersonalGrimorio ? 'Meus Rituais' : 'Biblioteca'}
            </button>
            {update && isPersonalGrimorio && (
              <button type="button" onClick={() => setTab('custom')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === 'custom' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-txt-dim hover:text-txt-main'}`}>
                Criar Ritual <span className="text-[9px] font-mono">{shotsLeft}/{maxShots}</span>
              </button>
            )}
          </div>

          {tab === 'library' && (
            <>
              <div className="flex items-center gap-2 px-5 py-3 border-b border-sep/15">
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar ritual..."
                  className="flex-1 bg-void border border-sep rounded-lg px-3 py-2 text-sm text-txt-main focus:border-gold/40 outline-none" />
                <div className="flex gap-1">
                  {['all', '1', '2', '3', '4'].map(c => (
                    <button key={c} type="button" onClick={() => setCircleFilter(c)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        circleFilter === c ? 'bg-gold/20 text-gold border border-gold/30' : 'bg-void border border-sep/30 text-txt-dim hover:border-sep/50'
                      }`}>
                      {c === 'all' ? 'Todos' : `${c}o`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {loading ? (
                  <p className="text-txt-dim text-sm animate-pulse text-center py-8">Carregando...</p>
                ) : isPersonalGrimorio && library.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-purple-500/20 flex items-center justify-center">
                      <span className="text-purple-300/30 text-3xl">+</span>
                    </div>
                    <p className="text-txt-dim/50 text-sm text-center">Nenhum ritual criado neste grimorio.</p>
                    {update && shotsLeft > 0 && (
                      <button type="button" onClick={() => setTab('custom')}
                        className="px-6 py-2.5 rounded-lg bg-purple-500/15 text-purple-300 text-xs font-semibold border border-purple-500/25 hover:bg-purple-500/25 transition-colors active:scale-[0.99]">
                        Criar Primeiro Ritual
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grimoire-card-grid">
                    {filtered.map(ritual => {
                      const isSelected = selected.some(r => r.id === ritual.id)
                      const spaceCost = SPACE_COST[ritual.circle] || 0
                      const wouldExceed = !isSelected && (spaceUsed + spaceCost) > profile.spaceBudget
                      const circleOk = ritual.circle <= grimorioMaxCircle
                      const slotsOk = grimorioSlotsLeft > 0 || isSelected
                      const disabled = isSelected || wouldExceed || !circleOk || !slotsOk
                      const circleBg = CIRCLE_BG[ritual.circle] || CIRCLE_BG[1]

                      return (
                        <article key={ritual.id}
                          className={`grimoire-entry-card ${disabled ? 'opacity-50' : ''} ${circleBg} transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${inspectId === ritual.id ? 'ring-1 ring-white/20' : ''}`}
                          style={{ '--grimoire-accent': card.accent }}>
                          <div className="grimoire-entry-top">
                            <span className={`border ${CIRCLE_BADGE[ritual.circle] || CIRCLE_BADGE[1]}`}>{ritual.circle}o</span>
                            <small>{ritual.category || '—'}</small>
                          </div>
                          <h4 className="font-cinzel">{ritual.name}</h4>
                          <p>{ritual.short_description || ritual.effect || '—'}</p>
                          <div className="grimoire-entry-meta">
                            <span>{ritual.pe_cost || 0} PE</span>
                            {usesEnergia && <span>Energia</span>}
                            <span>{spaceCost} espacos</span>
                          </div>
                          <div className="flex gap-2 mt-auto">
                            <button type="button" disabled={disabled}
                              onClick={() => addRitual(ritual)}
                              className={`flex-1 transition-all duration-150 ${isSelected ? 'opacity-50 cursor-default' : 'hover:brightness-110 active:scale-95'}`}>
                              {isSelected ? 'ok' : 'Selecionar'}
                            </button>
                            <button type="button" onClick={() => setInspectId(inspectId === ritual.id ? null : ritual.id)}
                              className="transition-all duration-150 hover:brightness-110 active:scale-95">
                              {inspectId === ritual.id ? 'x' : '...'}
                            </button>
                          </div>
                        </article>
                      )
                    })}
                    {filtered.length === 0 && (
                      <p className="text-txt-dim text-sm italic col-span-full text-center py-6">Nenhum ritual encontrado.</p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {tab === 'custom' && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="max-w-xl mx-auto space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-purple-300 text-xs font-semibold">Criar Ritual</span>
                  <span className="text-txt-dim text-[10px] font-mono">Tiros: <span className={shotsLeft > 0 ? 'text-emerald-300' : 'text-err'}>{shotsLeft}/{maxShots}</span></span>
                </div>

                {customMode === 'form' ? (
                  <>
                    <div>
                      <label className="text-txt-dim/60 text-[10px] uppercase tracking-wider mb-1 block">Nome do Ritual *</label>
                      <input type="text" value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Ex: Chama do Crepusculo"
                        className="w-full bg-void border border-sep rounded-lg px-3 py-2 text-sm text-txt-main focus:border-gold/40 outline-none" />
                    </div>
                    <div>
                      <label className="text-txt-dim/60 text-[10px] uppercase tracking-wider mb-1 block">Circulo</label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4].filter(c => !activeGrimorio || c <= grimorioMaxCircle).map(c => {
                          const lvlOk = canCreateRitualAtCircle(char, c)
                          return (
                            <button key={c} type="button" onClick={() => lvlOk.allowed && setCustomCircle(c)}
                              disabled={!lvlOk.allowed}
                              className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors border ${
                                customCircle === c ? (CIRCLE_BG[c] || '') + ' ' + (CIRCLE_BADGE[c] || '')
                                  : !lvlOk.allowed ? 'bg-void/30 border-sep/15 text-txt-dim/30 cursor-not-allowed'
                                  : 'bg-void border-sep/30 text-txt-dim hover:border-sep/50'
                              }`}
                              title={!lvlOk.allowed ? lvlOk.reason : ''}>
                              {c}o
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-txt-dim/60 text-[10px] uppercase tracking-wider mb-1 block">Custo PE</label>
                        <input type="number" min={1} max={99} value={customPeCost} onChange={e => setCustomPeCost(Number(e.target.value) || 1)}
                          className="w-full bg-void border border-sep rounded-lg px-3 py-2 text-sm text-txt-main focus:border-gold/40 outline-none" />
                      </div>
                      <div>
                        <label className="text-txt-dim/60 text-[10px] uppercase tracking-wider mb-1 block">Acao</label>
                        <select value={customAction} onChange={e => setCustomAction(e.target.value)}
                          className="w-full bg-void border border-sep rounded-lg px-3 py-2 text-sm text-txt-main focus:border-gold/40 outline-none">
                          <option value="Acao Padrao">Acao Padrao</option>
                          <option value="Acao Bonus">Acao Bonus</option>
                          <option value="Acao Completa">Acao Completa</option>
                          <option value="Reacao">Reacao</option>
                          <option value="1 minuto">1 minuto</option>
                          <option value="10 minutos">10 minutos</option>
                          <option value="1 hora">1 hora</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-txt-dim/60 text-[10px] uppercase tracking-wider mb-1 block">Duracao</label>
                        <select value={customDuration} onChange={e => setCustomDuration(e.target.value)}
                          className="w-full bg-void border border-sep rounded-lg px-3 py-2 text-sm text-txt-main focus:border-gold/40 outline-none">
                          <option value="Instantaneo">Instantaneo</option>
                          <option value="1 rodada">1 rodada</option>
                          <option value="2 rodadas">2 rodadas</option>
                          <option value="3 rodadas">3 rodadas</option>
                          <option value="1 minuto">1 minuto</option>
                          <option value="10 minutos">10 minutos</option>
                          <option value="1 hora">1 hora</option>
                          <option value="Cena">Cena</option>
                          <option value="Permanente">Permanente</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-txt-dim/60 text-[10px] uppercase tracking-wider mb-1 block">Alcance</label>
                        <select value={customRange} onChange={e => setCustomRange(e.target.value)}
                          className="w-full bg-void border border-sep rounded-lg px-3 py-2 text-sm text-txt-main focus:border-gold/40 outline-none">
                          <option value="Pessoal">Pessoal</option>
                          <option value="Toque">Toque</option>
                          <option value="3m">3m</option>
                          <option value="6m">6m</option>
                          <option value="9m">9m</option>
                          <option value="12m">12m</option>
                          <option value="18m">18m</option>
                          <option value="Cone 6m">Cone 6m</option>
                          <option value="Cone 9m">Cone 9m</option>
                          <option value="Area 6m">Area 6m</option>
                          <option value="Area 12m">Area 12m</option>
                          <option value="Linha 18m">Linha 18m</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-txt-dim/60 text-[10px] uppercase tracking-wider mb-1 block">Entidade / Fonte</label>
                      <select value={customEntity} onChange={e => setCustomEntity(e.target.value)}
                        className="w-full bg-void border border-sep rounded-lg px-3 py-2 text-sm text-txt-main focus:border-gold/40 outline-none">
                        <option value="">Nenhuma</option>
                        {ENTIDADES_OUTRO_LADO.map(ent => (
                          <option key={ent.id} value={ent.name}>{ent.name} — {ent.domain}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-txt-dim/60 text-[10px] uppercase tracking-wider mb-1 block">Categoria (opcional)</label>
                      <input type="text" value={customCategory} onChange={e => setCustomCategory(e.target.value)} placeholder="Ex: Ofensiva, Defensiva, Suporte..."
                        className="w-full bg-void border border-sep rounded-lg px-3 py-2 text-sm text-txt-main focus:border-gold/40 outline-none" />
                    </div>
                    <div>
                      <label className="text-txt-dim/60 text-[10px] uppercase tracking-wider mb-1 block">Conceito / Descricao curta</label>
                      <textarea value={customDesc} onChange={e => setCustomDesc(e.target.value)} rows={2}
                        placeholder="Uma frase descrevendo a essencia do ritual..."
                        className="w-full bg-void border border-sep rounded-lg px-3 py-2 text-sm text-txt-main focus:border-gold/40 outline-none resize-none" />
                    </div>
                    <div>
                      <label className="text-txt-dim/60 text-[10px] uppercase tracking-wider mb-1 block">Efeito completo</label>
                      <textarea value={customEffect} onChange={e => setCustomEffect(e.target.value)} rows={4}
                        placeholder="Descreva o efeito mecanico detalhado: dados, CD, condicoes, duracoes, contrapesos..."
                        className="w-full bg-void border border-sep rounded-lg px-3 py-2 text-sm text-txt-main focus:border-gold/40 outline-none resize-none" />
                    </div>

                    {customError && <p className="text-err text-xs">{customError}</p>}

                    <button type="button" onClick={analyzeCustomRitual} disabled={customAnalyzing || shotsLeft <= 0 || grimorioSlotsLeft <= 0}
                      className={`w-full py-2.5 rounded-lg text-xs font-semibold transition-colors active:scale-[0.99] ${
                        customAnalyzing ? 'bg-purple-500/10 text-purple-300/50 cursor-wait' : 'bg-purple-500/15 text-purple-300 border border-purple-500/25 hover:bg-purple-500/25'
                      }`}>
                      {customAnalyzing ? 'Analisando com Oraculo...' : shotsLeft <= 0 ? 'Sem tiros de criacao' : grimorioSlotsLeft <= 0 ? 'Grimorio Cheio' : 'Analisar com Oraculo'}
                    </button>
                  </>
                ) : customMode === 'feedback' && customResult ? (
                  <>
                    <div className="border border-purple-500/20 rounded-xl bg-purple-500/5 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-purple-300 text-xs font-semibold">Feedback do Oraculo</span>
                        <span className={`text-[9px] border rounded-full px-1.5 py-0.5 ${CIRCLE_BADGE[customResult.circle || customCircle] || CIRCLE_BADGE[1]}`}>
                          {customResult.circle || customCircle}o
                        </span>
                      </div>

                      <div className="border border-sep/15 rounded-lg p-3 space-y-2">
                        <h4 className="text-txt-dim/60 text-[10px] uppercase tracking-wider">Original</h4>
                        <p className="text-txt-main text-sm font-semibold">{customName}</p>
                        <p className="text-txt-dim text-xs">{customDesc || customEffect}</p>
                        <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                          <span className="text-amber-300">{customPeCost} PE</span>
                          <span className="text-purple-300">{customAction}</span>
                          <span className="text-sky-300">{customDuration}</span>
                          <span className="text-txt-dim">{customRange}</span>
                        </div>
                      </div>

                      <div className="border border-gold/20 rounded-lg bg-gold/5 p-3 space-y-2">
                        <h4 className="text-gold text-[10px] uppercase tracking-wider">Versao do Oraculo</h4>
                        <h4 className="text-txt-main font-semibold text-sm">{customResult.name || customName}</h4>
                        {customResult.short_description && <p className="text-txt-dim text-xs leading-relaxed">{customResult.short_description}</p>}
                        {customResult.effect && <p className="text-txt-dim/60 text-[11px] leading-relaxed whitespace-pre-line">{customResult.effect}</p>}
                        <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                          <span className="text-amber-300">{customResult.pe_cost || customPeCost} PE</span>
                          {usesEnergia && <span className="text-sky-300">{customResult.pe_cost || customPeCost} Energia</span>}
                          {customResult.action_cost && <span className="text-purple-300">{customResult.action_cost}</span>}
                          {customResult.duration && <span className="text-sky-300">{customResult.duration}</span>}
                          {customResult.range && <span className="text-txt-dim">{customResult.range}</span>}
                        </div>
                        {customResult.ai_notes && <p className="text-txt-dim/40 text-[10px] italic border-t border-sep/10 pt-2">{customResult.ai_notes}</p>}
                      </div>

                      {customError && <p className="text-err text-xs">{customError}</p>}

                      <div className="flex gap-2">
                        <button type="button" onClick={keepOriginalRitual}
                          className="flex-1 py-2 rounded-lg bg-white/5 text-txt-dim text-xs font-semibold border border-sep/20 hover:bg-white/10 transition-colors active:scale-[0.99]">
                          Manter Original
                        </button>
                        <button type="button" onClick={confirmCustomRitual}
                          className="flex-1 py-2 rounded-lg bg-gold/15 text-gold text-xs font-semibold border border-gold/25 hover:bg-gold/25 transition-colors active:scale-[0.99]">
                          Usar Versao IA
                        </button>
                      </div>
                      <button type="button" onClick={resetCustomForm}
                        className="w-full py-2 rounded-lg text-txt-dim/50 text-xs hover:text-txt-dim transition-colors">
                        Cancelar e refazer
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {tab === 'library' && inspectedRitual && (
          <div className="w-80 shrink-0 border-l border-sep/20 bg-[#080a12] overflow-y-auto">
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] border rounded-full px-1.5 py-0.5 ${CIRCLE_BADGE[inspectedRitual.circle] || CIRCLE_BADGE[1]}`}>{inspectedRitual.circle}o</span>
                  <span className="text-txt-dim text-[10px]">{inspectedRitual.category || '—'}</span>
                </div>
                <button type="button" onClick={() => setInspectId(null)} className="text-txt-dim/50 hover:text-txt-main text-xs">×</button>
              </div>
              <h4 className="text-txt-main font-semibold leading-tight">{inspectedRitual.name}</h4>
              {inspectedRitual.short_description && <p className="text-txt-dim text-xs leading-relaxed">{inspectedRitual.short_description}</p>}
              {inspectedRitual.effect && <p className="text-txt-dim/60 text-[11px] leading-relaxed">{inspectedRitual.effect}</p>}
              <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                <span className="text-amber-300">{inspectedRitual.pe_cost || 0} PE</span>
                {usesEnergia && <span className="text-sky-300">{inspectedRitual.pe_cost || 0} Energia</span>}
                <span className="text-gold">{SPACE_COST[inspectedRitual.circle] || 0} espaços</span>
              </div>
              {inspectedRitual.action_cost && <div className="text-[10px] font-mono text-purple-300">{inspectedRitual.action_cost}</div>}
              {inspectedRitual.duration && <div className="text-[10px] font-mono text-sky-300">{inspectedRitual.duration}</div>}
              {inspectedRitual.range && <div className="text-[10px] font-mono text-txt-dim">{inspectedRitual.range}</div>}
              <button type="button"
                disabled={selected.some(r => r.id === inspectedRitual.id)}
                onClick={() => addRitual(inspectedRitual)}
                className={`w-full grimoire-entry-card button mt-2 ${selected.some(r => r.id === inspectedRitual.id) ? 'opacity-50 cursor-default' : 'hover:brightness-110'}`}>
                {selected.some(r => r.id === inspectedRitual.id) ? '✓ Selecionado' : 'Selecionar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

function GrimorioPickerModal({ char, update, card, onClose }) {
  const availableTiers = getAvailableGrimorioTiers(char, card.key)
  const accessTier = getGrimorioAccessTier(char, card.key)
  const existingGrimorios = (char.grimorios || []).filter(g => g.knowledgeKey === card.key)
  const allRituals = char[card.field] || []

  const [mode, setMode] = useState('list')
  const [selectedTier, setSelectedTier] = useState(null)
  const [name, setName] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editImage, setEditImage] = useState('')
  const [editUploading, setEditUploading] = useState(false)

  if (!accessTier) return null

  function startEdit(grimorio) {
    setEditingId(grimorio.id)
    setEditName(grimorio.name || '')
    setEditImage(grimorio.image || '')
    setMode('edit')
  }

  function saveEdit() {
    if (!update || !editingId) return
    const grimorios = (char.grimorios || []).map(g => {
      if (g.id !== editingId) return g
      return { ...g, name: editName.trim() || g.name, image: editImage.trim() }
    })
    update({ grimorios })
    setEditingId(null)
    setMode('list')
  }

  function createGrimorio() {
    if (!update) return
    if (!selectedTier) return
    const tier = GRIMORIO_TIERS.find(t => t.id === selectedTier)
    if (!tier) return
    const grimorioName = name.trim() || `Grimório de ${char.nome || 'Desconhecido'}`
    const newGrimorio = {
      id: crypto.randomUUID(),
      knowledgeKey: card.key,
      tier: tier.id,
      name: grimorioName,
      image: imageUrl.trim() || '',
      maxCircle: tier.maxCircle,
      maxRituals: 30,
      isPersonal: true,
      createdAt: new Date().toISOString(),
    }
    const currentGrimorios = char.grimorios || []
    update({ grimorios: [...currentGrimorios, newGrimorio] })
    setName('')
    setImageUrl('')
    setSelectedTier(null)
    setMode('list')
  }

  function removeGrimorio(grimorioId) {
    if (!update) return
    update({ grimorios: (char.grimorios || []).filter(g => g.id !== grimorioId) })
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg max-h-[80vh] bg-[#0a0c14] border border-sep/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-sep/20">
          <div className="flex items-center gap-3">
            <span className={`text-xl ${card.accentClass}`}>{card.icon}</span>
            <h3 className="font-cinzel text-sm uppercase tracking-wider font-semibold text-txt-main">
              {mode === 'edit' ? 'Editar Grimório' : mode === 'create' ? 'Novo Grimório' : `Grimórios de ${card.title}`}
            </h3>
          </div>
          <button type="button" onClick={() => mode === 'list' ? onClose() : setMode('list')}
            className="text-txt-dim hover:text-txt-main text-lg transition-colors">{mode === 'list' ? '×' : '←'}</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {mode === 'list' && (
            <>
              <div>
                <h4 className="text-txt-dim text-xs font-semibold uppercase tracking-wider mb-3">Grimórios Atuais</h4>
                {existingGrimorios.length === 0 ? (
                  <p className="text-txt-dim/40 text-xs italic">Nenhum grimório criado.</p>
                ) : (
                  <div className="space-y-2">
                    {existingGrimorios.map(g => {
                      const tier = GRIMORIO_TIERS.find(t => t.id === g.tier)
                      const maxRituals = getGrimorioMaxRituals(g)
                      const ritualCount = allRituals.filter(r => r.grimorioId === g.id).length
                      return (
                        <div key={g.id} className="flex items-center gap-3 p-3 rounded-lg border border-sep/15 bg-void/30">
                          <div className="w-10 h-12 rounded bg-void/50 border border-sep/20 flex items-center justify-center shrink-0 overflow-hidden">
                            {g.image ? <img src={g.image} alt="" className="w-full h-full object-cover" /> : <span className="opacity-30">{card.icon}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-txt-main text-xs font-semibold truncate">{g.name}</p>
                            <p className="text-txt-dim/50 text-[10px]">{tier?.name || 'Personalizado'} — 1o-{g.maxCircle}o — {ritualCount}/{maxRituals} rituais</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {update && (
                              <button type="button" onClick={() => startEdit(g)}
                                className="text-sky-400/60 hover:text-sky-400 text-[10px] transition-colors">Editar</button>
                            )}
                            {update && (
                              <button type="button" onClick={() => removeGrimorio(g.id)}
                                className="text-err/40 hover:text-err text-[10px] transition-colors">Excluir</button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              {update && availableTiers.length > 0 && (
                <button type="button" onClick={() => { setMode('create'); setSelectedTier(null); setName(''); setImageUrl('') }}
                  className="w-full py-2.5 rounded-lg bg-gold/15 text-gold text-xs font-semibold border border-gold/25 hover:bg-gold/25 transition-colors active:scale-[0.99]">
                  + Criar Novo Grimório
                </button>
              )}
            </>
          )}

          {mode === 'create' && (
            <div className="space-y-3">
              <div>
                <label className="text-txt-dim/60 text-[10px] uppercase tracking-wider mb-1 block">Categoria</label>
                <div className="flex gap-2">
                  {availableTiers.map(tier => (
                    <button key={tier.id} type="button" onClick={() => setSelectedTier(tier.id)}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors border ${
                        selectedTier === tier.id
                          ? 'bg-gold/20 text-gold border-gold/30'
                          : 'bg-void border-sep/30 text-txt-dim hover:border-sep/50'
                      }`}>
                      {tier.name}
                    </button>
                  ))}
                </div>
              </div>
              {selectedTier && (() => {
                const tier = GRIMORIO_TIERS.find(t => t.id === selectedTier)
                return (
                  <>
                    <div className="text-txt-dim/40 text-[10px] font-mono">Círculos 1o-{tier?.maxCircle}o — Máx. {tier?.maxRituals} rituais</div>
                    <div>
                      <label className="text-txt-dim/60 text-[10px] uppercase tracking-wider mb-1 block">Nome (opcional)</label>
                      <input type="text" value={name} onChange={e => setName(e.target.value)}
                        placeholder={`${GRIMORIO_TYPE_LABELS[card.key]} — ${tier?.name || ''}`}
                        className="w-full bg-void border border-sep rounded-lg px-3 py-2 text-sm text-txt-main focus:border-gold/40 outline-none" />
                    </div>
                    <ImageUploadField value={imageUrl} onChange={setImageUrl} uploading={uploading} onUploadError={() => {}} />
                    <button type="button" onClick={createGrimorio}
                      className="w-full py-2.5 rounded-lg bg-gold/15 text-gold text-xs font-semibold border border-gold/25 hover:bg-gold/25 transition-colors active:scale-[0.99]">
                      Criar Grimório
                    </button>
                  </>
                )
              })()}
            </div>
          )}

          {mode === 'edit' && editingId && (() => {
            const g = existingGrimorios.find(x => x.id === editingId)
            if (!g) return null
            const tier = GRIMORIO_TIERS.find(t => t.id === g.tier)
            return (
              <div className="space-y-3">
                <div className="text-txt-dim/40 text-[10px] font-mono">{tier?.name || 'Personalizado'} — Círculos 1o-{g.maxCircle}o</div>
                <div>
                  <label className="text-txt-dim/60 text-[10px] uppercase tracking-wider mb-1 block">Nome</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                    className="w-full bg-void border border-sep rounded-lg px-3 py-2 text-sm text-txt-main focus:border-gold/40 outline-none" />
                </div>
                <ImageUploadField value={editImage} onChange={setEditImage} uploading={editUploading} onUploadError={() => {}} />
                <button type="button" onClick={saveEdit}
                  className="w-full py-2.5 rounded-lg bg-sky-500/15 text-sky-300 text-xs font-semibold border border-sky-500/25 hover:bg-sky-500/25 transition-colors active:scale-[0.99]">
                  Salvar Alterações
                </button>
              </div>
            )
          })()}
        </div>
      </div>
    </div>,
    document.body
  )
}

function hpColor(pct) {
  if (pct > 75) return 'text-emerald-400'
  if (pct > 50) return 'text-yellow-400'
  if (pct > 25) return 'text-orange-400'
  return 'text-red-500'
}

function hpBarColor(pct) {
  if (pct > 75) return 'bg-emerald-500/80'
  if (pct > 50) return 'bg-yellow-500/80'
  if (pct > 25) return 'bg-orange-500/80'
  return 'bg-red-500/80'
}

function enColor(pct) {
  if (pct > 75) return 'text-sky-400'
  if (pct > 50) return 'text-yellow-400'
  if (pct > 25) return 'text-orange-400'
  return 'text-red-500'
}

function enBarColor(pct) {
  if (pct > 75) return 'bg-sky-500/80'
  if (pct > 50) return 'bg-yellow-500/80'
  if (pct > 25) return 'bg-orange-500/80'
  return 'bg-red-500/80'
}

function peColor(pct) {
  if (pct > 75) return 'text-amber-400'
  if (pct > 50) return 'text-yellow-400'
  if (pct > 25) return 'text-orange-400'
  return 'text-red-500'
}

function peBarColor(pct) {
  if (pct > 75) return 'bg-amber-500/80'
  if (pct > 50) return 'bg-yellow-500/80'
  if (pct > 25) return 'bg-orange-500/80'
  return 'bg-red-500/80'
}

function ResBox({ label, icon, current, max, pctColor, pctBarColor, canEdit, onChange, onReset }) {
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0
  const isModified = current !== max
  return (
    <div className="bg-void/60 border border-sep/40 rounded-lg p-3 hover:border-sep/70 transition-colors">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[11px]">{icon}</span>
        <span className="text-txt-dim text-[11px] font-semibold uppercase tracking-wider">{label}</span>
        {isModified && <span className="text-[9px] text-gold/70 ml-auto">✎</span>}
      </div>
      {canEdit ? (
        <div className="flex items-baseline gap-1">
          <input type="number" value={current} onChange={e => onChange(e.target.value)}
            className={`font-mono text-lg bg-transparent border-b border-sep/50 w-16 text-right outline-none focus:border-gold/50 transition-colors ${pctColor(pct)}`} />
          <span className="text-txt-dim/40 text-[10px] font-mono">/ {max}</span>
          {isModified && (
            <button onClick={onReset} className="ml-auto text-[9px] text-gold/50 border border-gold/20 px-1 rounded hover:text-gold hover:border-gold/40 transition-colors">↺</button>
          )}
        </div>
      ) : (
        <div className="flex items-baseline gap-1">
          <span className={`font-mono text-lg ${pctColor(pct)}`}>{current}</span>
          {isModified && <span className="text-txt-dim/40 text-[10px] font-mono">/ {max}</span>}
        </div>
      )}
      <div className="h-1 bg-deep rounded-full mt-2 overflow-hidden">
        <div className={`h-full ${pctBarColor(pct)} rounded-full transition-all duration-500 ease-out`} style={{ width: `${pct}%` }} />
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
