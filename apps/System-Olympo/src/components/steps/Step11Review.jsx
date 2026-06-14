import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../contexts/AuthContext'
import { calcVidaTotal, calcEnergiaTotal, calcPeTotal, calcCA, calcReacoes, calcPercepcaoPassiva, calcDanoBase, calcAbilityCostReduction, calcExtraAbilities, calcExtraAbilitiesTypes, calcCarryCapacity, calcCarriedLoad, calcSkeletonPointsAvailable, getProgressionRewards } from '../../utils/calculator'
import { exportSheet } from '../../utils/exporter'
import { ATTR_ICONS, getModifier, getAttrCap } from '../../data/attributes'
import { MARTIAL_ARTS, GRAU_LABELS } from '../../data/martialArts'
import { WEAPONS, WEAPON_RANKS, WEAPON_ABILITY_COST, RANK_LEVEL_BAND, getWeaponLimitForLevel, getMartialArtsLimitForLevel, canEquipRank, getRankIndex, LEGENDARY_WEAPONS } from '../../data/weapons'
import { RANK_COLORS } from '../../data/colors'
import { calcPEHTotal, calcPericiasAvailable } from '../../utils/calculator'
import { calcPEHSpent, getMaxEvolucao, canEvolveSkill, calcEvolucaoDelta, getSkillBracket, getSkillTagChips, getSkillDtDisplay, hasSkillDtType, normalizeSkillTags, SKILL_TAG_OPTIONS, buildSkillTagOverridePatch, buildSkillTagValuePatch, getNextEvolucaoCost, calcEvolucaoCost } from '../../utils/skillEvolution'
import { PERICIAS, GRAU_NAMES, getGrauBonus, getMaxGrauForLevel } from '../../data/pericias'
import { TRIAGES } from '../../data/triages'
import { MODULES_PASSIVE, MODULES_ACTIVE, MODULES_SPECIAL } from '../../data/modules'
import { getRaceAdjustedAttrs, getRaceLabel, calculateRaceBonus, getSelectedSubrace, ATTR_KEYS } from '../../utils/raceCalculator'
import { RACES, RACE_CATEGORIES } from '../../data/races'
import { generateWeaponAbilities, analyzeForgeEnchantment } from '../../services/aiService'
import ResidentInventorySection from '../ResidentInventorySection'
import AbilityAnalysisChat from '../AbilityAnalysisChat'
import { MysticKnowledgePanel } from '../MysticKnowledgePanel'
import { calcEquipStats } from '../../data/equipment'
import { getSystemSkillById, SYSTEM_SKILLS, SYSTEM_SKILL_CATEGORIES, EFFECT_PARAM_DEFS } from '../../data/systemSkills'
import { summarizeSystemSkillBonuses, createDefaultEffectsForSkill, calcSystemSkillBonuses } from '../../utils/systemSkills'

import { flattenRaceMilestones, formatRaceBonusParts } from '../../utils/raceMilestones'
import { SPECIAL_MATERIALS, getAvailableForgeMaterials, getMaterialIcon } from '../../data/materials'
import RaceSkillTree from '../RaceSkillTree'

const STATUS_COLORS = { Pendente: 'text-warn', Aprovada: 'text-ok', 'Revisão necessária': 'text-err' }
const STATUS_OPTIONS = ['Pendente', 'Aprovada', 'Revisão necessária']

function normalizeEffectText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function parseActiveBonuses(source) {
  const text = `${source?.name || source?.nome || ''} ${source?.desc || ''} ${source?.descricao || ''} ${source?.efeito || ''}`
  const normalized = normalizeEffectText(text)
  const isAbilitySource = source?.sourceLabel === 'Habilidade'
  const tags = isAbilitySource ? new Set(normalizeSkillTags(source)) : new Set()
  const values = source?.valores || {}
  const bonuses = { ataque: 0, ca: 0, vida: 0, energia: 0, dano: 0 }
  const manualNumber = (tag) => {
    const match = String(values[tag] || '').match(/[+-]?\d+/)
    return match ? Number(match[0]) : 0
  }
  const signedNumbers = [...text.matchAll(/([+-]\s*\d+)(?:\s*(?:em|no|na|de|para|ao|a))?\s*([a-zA-ZÀ-ÿ ]{0,28})/g)]

  if (isAbilitySource && values.bonusVida) bonuses.vida += Number(values.bonusVida) || 0
  if (isAbilitySource && values.bonusEnergia) bonuses.energia += Number(values.bonusEnergia) || 0
  if (isAbilitySource && tags.has('bonusCA')) bonuses.ca += manualNumber('bonusCA')
  if (isAbilitySource && tags.has('bonusAtaque')) bonuses.ataque += manualNumber('bonusAtaque')
  if (isAbilitySource && tags.has('dano')) bonuses.dano += manualNumber('dano')

  signedNumbers.forEach((match) => {
    const value = Number(match[1].replace(/\s+/g, ''))
    const target = (match[2] || '').toLowerCase()
    if (!Number.isFinite(value)) return
    if (/ataque|acerto|pontaria|golpe/.test(target)) {
      if (!isAbilitySource || (tags.has('bonusAtaque') && !values.bonusAtaque)) bonuses.ataque += value
    } else if (/ca|defesa|armadura|bloqueio|esquiva/.test(target)) {
      if (!isAbilitySource || (tags.has('bonusCA') && !values.bonusCA)) bonuses.ca += value
    } else if (/vida|hp/.test(target)) {
      if (!isAbilitySource && !/\b(cura|curar|recupera|regenera|restaura)\b/.test(normalized)) bonuses.vida += value
    } else if (/energia/.test(target)) {
      if (!isAbilitySource && !/\b(custo|gasta|paga|consome)\b/.test(normalized)) bonuses.energia += value
    } else if (/dano/.test(target)) {
      if (!isAbilitySource || (tags.has('dano') && !values.dano && /\b(ataque|ataques|golpe|golpes|arma|proximo ataque|proximo golpe)\b/.test(normalized))) bonuses.dano += value
    }
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

export default function Step11Review({ char, onSave, onEdit, onNew, update, updateHabilidade, characterId, normalizeAbilities = true, transferTargets = [], onTransferItem }) {
  return <ReviewContent char={char} onSave={onSave} onEdit={onEdit} onNew={onNew} update={update} updateHabilidade={updateHabilidade} characterId={characterId} normalizeAbilities={normalizeAbilities} transferTargets={transferTargets} onTransferItem={onTransferItem} />
}

function SectionHeader({ icon, title, color }) {
  return (
    <div className="flex items-center gap-2.5 mb-3 pb-2" style={{ borderBottom: '1px solid rgba(232,201,126,0.12)' }}>
      <div className={`w-1 h-5 rounded-full ${color}`} />
      <span className="text-on-surface-variant text-sm">{icon}</span>
      <h3 className="font-cinzel text-on-surface text-sm uppercase tracking-[0.1em] font-semibold">{title}</h3>
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(232,201,126,0.15), transparent)' }} />
    </div>
  )
}

const SHEET_VIEWS = [
  { key: 'overview', label: 'Visão', hint: 'O essencial para jogar agora.', icon: 'dashboard' },
  { key: 'combat', label: 'Combate', hint: 'Defesa, arma e números de mesa.', icon: 'shield' },
  { key: 'powers', label: 'Poderes', hint: 'Módulos, habilidades e análise.', icon: 'auto_awesome' },
  { key: 'traits', label: 'Traços', hint: 'Raça, perícias e triagens.', icon: 'psychology' },
  { key: 'inventory', label: 'Bolsa', hint: 'Itens, equipamentos e notas.', icon: 'inventory_2' },
  { key: 'mystic', label: 'Místico', hint: 'Disciplinas opcionais.', icon: 'auto_fix_high' },
  { key: 'full', label: 'Tudo', hint: 'Ficha completa sem filtros.', icon: 'menu_book' },
]

const DASH_TABS = [
  { key: 'overview', label: 'Visão', icon: 'dashboard' },
  { key: 'abilities', label: 'Poderes', icon: 'auto_awesome' },
  { key: 'equipment', label: 'Bolsa', icon: 'inventory_2' },
  { key: 'evolution', label: 'Evolução', icon: 'trending_up' },
  { key: 'mystic', label: 'Místico', icon: 'auto_fix_high' },
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
    <nav className="sheet-menu-nav" aria-label="Modos de leitura da ficha">
      {SHEET_VIEWS.map(view => (
        <button
          key={view.key}
          type="button"
          onClick={() => onChange(view.key)}
          className={`sheet-menu-item ${active === view.key ? 'is-active' : ''}`}
          title={view.hint}
        >
          <span className="material-symbols-outlined">{view.icon}</span>
          <span className="sheet-menu-label">{view.label}</span>
          {counts?.[view.key] != null && <small>{counts[view.key]}</small>}
        </button>
      ))}
    </nav>
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

function ReviewContent({ char, onSave, onEdit, onNew, update, updateHabilidade, characterId, normalizeAbilities, transferTargets, onTransferItem }) {
  const { isAdmin } = useAuth()
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
        copy.push({ tipo, nome: '', descricao: '', custoEnergia: 0, dano: '', duracao: '', dt: '', tags: [], valores: {}, camadaSCP: 2, ppEstimado: 0, status: 'Pendente' })
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
  const sysSkillBonuses = calcSystemSkillBonuses(char)
  const equipmentStats = calcEquipStats(char.equipamentos || [])
  const equipDurBonus = sysSkillBonuses.equipmentDurability
  if (equipDurBonus > 0) {
    equipmentStats.totalArmorMax += equipDurBonus
    equipmentStats.totalDurabilityMax += equipDurBonus
    if (equipmentStats.totalArmorRaw === 0 && equipmentStats.totalArmor === 0) {
      equipmentStats.totalArmorRaw = equipDurBonus
      equipmentStats.totalArmor = equipDurBonus
    }
  }
  const carryCapacity = calcCarryCapacity(char.atributos, sk, char)
  const carriedLoad = calcCarriedLoad(char)

  const derived = {
    vida: cls ? calcVidaTotal(cls, char.nivel, char.atributos, sk, char.choices, char.triagemPrincipal, char.triagemPrincipalNivel, char, char.subTriagem, char.subTriagemNivel) : 0,
    energia: cls ? calcEnergiaTotal(cls, char.nivel, char.atributos, sk, char.choices, char.triagemPrincipal, char.triagemPrincipalNivel, char.subTriagem, char.subTriagemNivel, char) : 0,
    pe: cls ? calcPeTotal(cls, char.nivel, char.choices, char) : 0,
    ca: (cls ? calcCA(char.atributos, sk, char.pericias, char) : 0) + activeBonuses.ca,
    reacoes: calcReacoes(char.atributos, sk, char.triagemPrincipal, char.triagemPrincipalNivel, char.subTriagem, char.subTriagemNivel, char),
    percepcao: cls ? calcPercepcaoPassiva(char.atributos, sk, char.pericias, char) : 0,
    danoBase: cls ? calcDanoBase(cls, char.atributos, sk, char.nivel, char.subTriagem, char.subTriagemNivel, char.triagemPrincipal, char.triagemPrincipalNivel, char) : '',
  }

  if (sysSkillBonuses.dano && derived.danoBase && !String(derived.danoBase).includes('(Skill)')) {
    derived.danoBase = `${derived.danoBase} +${sysSkillBonuses.dano} (Skill)`
  }
  if (activeBonuses.dano && derived.danoBase) derived.danoBase = `${derived.danoBase} + ${activeBonuses.dano}`

  const vidaNow = char.vidaOverride ?? (derived.vida + (char.vidaBonus || 0) + activeBonuses.vida)
  const energiaNow = char.energiaOverride ?? (derived.energia + (char.energiaBonus || 0) + activeBonuses.energia)
  const peNow = char.peOverride ?? (derived.pe + (char.peBonus || 0))

  const vidaAtual = char.vidaAtual ?? vidaNow
  const energiaAtual = char.energiaAtual ?? energiaNow
  const peAtual = char.peAtual ?? peNow

  const costReduction = calcAbilityCostReduction(char.triagemPrincipal, char.triagemPrincipalNivel || 0, char.subTriagem, char.subTriagemNivel || 0)

  const pehTotal = cls ? calcPEHTotal(cls, char.nivel, char.choices, char.modulosAdquiridos, char) : 0
  const pehSpent = calcPEHSpent(char.habilidades)
  const pehRemaining = pehTotal - pehSpent

  const skelBonus = sysSkillBonuses.skeletonPoints
  const skelBase = cls ? getProgressionRewards(cls, char.nivel, char.choices).esqueleto : 0
  const skelTotal = cls ? calcSkeletonPointsAvailable(cls, char.nivel, char.choices, char) : 0
  const skelSpent = ['FOR','DES','CON','INT','APA','AM'].reduce((s, a) => s + (sk[a] || 0), 0)
  const hasSystemSkills = (char.systemSkills || []).length > 0 || (char.systemSkillNotifications || []).some(n => n.status !== 'closed') || isAdmin

  const periciasArr = Object.entries(char.pericias || {}).filter(([, v]) => v > 0)
  const systemOptIn = char.systemsOptIn || {}
  const [sheetView, setSheetView] = useState('overview')
  const [skillCatalogOpen, setSkillCatalogOpen] = useState(false)
  const [oracleFocusRequest, setOracleFocusRequest] = useState(null)
  const [forgeMenuOpen, setForgeMenuOpen] = useState(false)
  const [editingPericias, setEditingPericias] = useState(false)
  const [pendingExpanded, setPendingExpanded] = useState(false)

  const periciasTotal = cls ? calcPericiasAvailable(cls, char.nivel || 1, char.choices || {}, char.modulosAdquiridos || [], char) : 0
  const periciasUsed = Object.values(char.pericias || {}).reduce((s, g) => s + (g > 0 ? g : 0), 0)
  const periciasMaxGrau = getMaxGrauForLevel(char.nivel || 1)

  const skelPending = skelTotal - skelSpent
  const periciasRemaining = periciasTotal - periciasUsed
  const totalModuleSlots = (char.modulosAdquiridos || []).reduce((sum, m) => sum + (m.boughtCount || 1), 0)
  const unnamedAbilities = (char.habilidades || []).filter(h => !h.nome || h.nome.trim() === '').length
  const pendingAbilities = (char.habilidades || []).filter(h => h.status === 'Pendente').length
  const pendingItems = [
    ...(skelPending > 0 ? [{ key: 'skel', label: `${skelPending} Pontos de Esqueleto`, color: 'text-amber-300 border-amber-300/25 bg-amber-300/8', icon: 'diamond' }] : []),
    ...(periciasRemaining > 0 ? [{ key: 'per', label: `${periciasRemaining} Perícias disponíveis`, color: 'text-cyan-300 border-cyan-300/25 bg-cyan-300/8', icon: 'school' }] : []),
    ...(pehRemaining > 0 ? [{ key: 'peh', label: `${pehRemaining} PEH não gasto`, color: 'text-indigo-300 border-indigo-300/25 bg-indigo-300/8', icon: 'upgrade' }] : []),
    ...(unnamedAbilities > 0 ? [{ key: 'unnamed', label: `${unnamedAbilities} Habilidade(s) sem nome`, color: 'text-orange-300 border-orange-300/25 bg-orange-300/8', icon: 'edit_note' }] : []),
    ...(pendingAbilities > 0 ? [{ key: 'pending', label: `${pendingAbilities} Pendente(s) de revisão`, color: 'text-yellow-300 border-yellow-300/25 bg-yellow-300/8', icon: 'pending' }] : []),
  ]

  function cyclePericia(periciaName, currentGrau) {
    if (!update) return
    const pericias = { ...(char.pericias || {}) }
    const remaining = periciasTotal - periciasUsed
    if (currentGrau === 0) {
      if (remaining <= 0) return
      pericias[periciaName] = 1
    } else if (currentGrau < periciasMaxGrau) {
      if (remaining <= 0) return
      pericias[periciaName] = currentGrau + 1
    } else {
      pericias[periciaName] = 0
    }
    update({ pericias })
  }

  function adjustPericia(periciaName, delta) {
    if (!update) return
    const pericias = { ...(char.pericias || {}) }
    const current = pericias[periciaName] || 0
    if (delta > 0) {
      const remaining = periciasTotal - periciasUsed
      if (remaining <= 0) return
    }
    const next = Math.max(0, Math.min(periciasMaxGrau, current + delta))
    if (next === current) return
    pericias[periciaName] = next
    update({ pericias })
  }

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
          const next = {
            ...habs[i],
            nome: gc.nome || habs[i].nome,
            descricao: gc.descricao || habs[i].descricao,
            ...(gc.custoEnergia != null && { custoEnergia: gc.custoEnergia }),
            ...(gc.dano != null && { dano: gc.dano }),
            ...(gc.duracao != null && { duracao: gc.duracao || '' }),
            ...(gc.dt != null && { dt: gc.dt }),
            ...(gc.valores && { valores: gc.valores }),
          }
          habs[i] = { ...next, tags: normalizeSkillTags({ ...next, tags: gc.tags }) }
        }
      })
      update({ habilidades: habs })
      return
    }
    if (result.habilidades) {
      const habs = [...(char.habilidades || [])]
      result.habilidades.forEach(h => {
        if (h.index != null && habs[h.index]) {
          const original = habs[h.index]
          const incoming = { ...original, ...h, tipo: original.tipo }
          const nextTags = normalizeSkillTags(incoming)
          const hasDurationPatch = Object.prototype.hasOwnProperty.call(h, 'duracao')
          const nextDuracao = hasDurationPatch
            ? (h.duracao && nextTags.includes('duracao') ? h.duracao : '')
            : undefined
          habs[h.index] = {
            ...original,
            ...(h.nome && { nome: h.nome }),
            ...(h.descricaoBalanceada && { descricao: h.descricaoBalanceada }),
            ...(!h.descricaoBalanceada && h.descricao && { descricao: h.descricao }),
            ...(h.custoEnergia != null && { custoEnergia: h.custoEnergia }),
            ...(h.dano != null && { dano: h.dano }),
            ...(nextDuracao !== undefined && { duracao: nextDuracao }),
            ...(h.dt != null && { dt: h.dt }),
            ...(h.valores && { valores: h.valores }),
            ...(h.camadaSCP != null && { camadaSCP: h.camadaSCP }),
            ...(h.ppEstimado != null && { ppEstimado: h.ppEstimado }),
            tags: nextTags,
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
    if (result._systemSkillNotifications?.length) {
      const existing = char.systemSkillNotifications || []
      const seen = new Set(existing.map(n => `${n.skillId}:${n.abilityIndex}:${n.status}`))
      const incoming = result._systemSkillNotifications.filter(n => {
        const key = `${n.skillId}:${n.abilityIndex}:open`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      if (incoming.length) update({ systemSkillNotifications: [...existing, ...incoming] })
    }
  }

  const canEdit = !!update
  const visible = (...views) => views.includes(sheetView)
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
    <div className="dash-root space-y-3">
      <div className="dash-topbar">
        <div className="dash-topbar-left">
          <div className="relative shrink-0">
            {char.avatar ? (
              <img src={char.avatar} alt="" className="dash-topbar-avatar" />
            ) : (
              <div className="dash-topbar-avatar dash-topbar-avatar-empty">
                <span className="material-symbols-outlined">person</span>
              </div>
            )}
            {canEdit && (
              <>
                <button type="button" onClick={() => avatarInputRef.current?.click()} className="dash-topbar-avatar-btn" title="Alterar ícone do personagem">
                  <span className="material-symbols-outlined">photo_camera</span>
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
              </>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="dash-topbar-name">{char.nome || 'Sem Nome'}</h2>
            <div className="dash-topbar-meta">
              <span>{cls || '—'}</span>
              <span className="dash-topbar-sep">·</span>
              <span>Nível {char.nivel || 1}</span>
              <span className="dash-topbar-sep">·</span>
              <span>{getRaceLabel(char) || '—'}</span>
              {primaryTriage !== 'Sem triagem' && (
                <>
                  <span className="dash-topbar-sep">·</span>
                  <span style={{ color: '#c084fc' }}>{primaryTriage}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="dash-topbar-right">
          <button onClick={handleCopy} className="dash-topbar-btn" title="Copiar ficha como texto">
            <span className="material-symbols-outlined">content_copy</span>
          </button>
          <button onClick={onSave} className="dash-topbar-btn dash-topbar-btn-primary">
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>save</span>
            Salvar
          </button>
        </div>
      </div>

      <nav className="dash-tabs">
        {DASH_TABS.map(tab => (
          <button key={tab.key} type="button" onClick={() => setSheetView(tab.key)} className={`dash-tab ${sheetView === tab.key ? 'is-active' : ''}`}>
            <span className="material-symbols-outlined">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="dash-content space-y-3">

      {pendingItems.length > 0 && (
        <div className="dash-pending-bar">
          <button type="button" onClick={() => setPendingExpanded(!pendingExpanded)} className="dash-pending-toggle">
            <span className="material-symbols-outlined">pending_actions</span>
            <span className="dash-pending-count">{pendingItems.length} pendência{pendingItems.length > 1 ? 's' : ''}</span>
          </button>
          {pendingExpanded && (
            <div className="dash-pending-badges w-full">
              {pendingItems.map(item => (
                <span key={item.key} className={`dash-pending-badge ${item.color}`}>
                  <span className="material-symbols-outlined">{item.icon}</span>
                  {item.label}
                </span>
              ))}
            </div>
          )}
          {!pendingExpanded && (
            <span className="material-symbols-outlined dash-pending-chevron">expand_more</span>
          )}
        </div>
      )}

      {skillCatalogOpen && isAdmin && (
        <SkillCatalogModal
          assigned={char.systemSkills || []}
          onSelect={(skillId) => { const effects = createDefaultEffectsForSkill(skillId); update({ systemSkills: [...(char.systemSkills || []), { id: `skill_${Date.now()}`, skillId, active: true, sourceAbilityIndex: null, notes: '', effects, createdAt: new Date().toISOString() }] }); setSkillCatalogOpen(false) }}
          onClose={() => setSkillCatalogOpen(false)}
        />
      )}
      {forgeMenuOpen && (
        <ForgeMasterMenu
          char={char}
          update={update}
          canEdit={canEdit}
          isAdmin={isAdmin}
          onClose={() => setForgeMenuOpen(false)}
        />
      )}

      {sheetView === 'overview' && (
        <>
          <div className="dash-resources">
            <div className="dash-resource-pill dash-resource-vida">
              <span className="material-symbols-outlined dash-resource-icon">favorite</span>
              <div className="dash-resource-body">
                <span className="dash-resource-label">Vida</span>
                <span className={`dash-resource-value ${hpColor(vidaNow > 0 ? Math.round((vidaAtual / vidaNow) * 100) : 0)}`}>
                  {canEdit ? (
                    <input type="number" value={vidaAtual} onChange={e => update({ vidaAtual: Number(e.target.value) || 0 })} className="dash-resource-input" />
                  ) : (vidaAtual)}
                  <small>/{vidaNow}</small>
                </span>
              </div>
              <div className="dash-resource-bar"><div className="dash-resource-bar-fill" style={{ width: `${vidaNow > 0 ? Math.min(100, (vidaAtual / vidaNow) * 100) : 0}%` }} /></div>
            </div>
            <div className="dash-resource-pill dash-resource-energia">
              <span className="material-symbols-outlined dash-resource-icon">bolt</span>
              <div className="dash-resource-body">
                <span className="dash-resource-label">Energia</span>
                <span className={`dash-resource-value ${enColor(energiaNow > 0 ? Math.round((energiaAtual / energiaNow) * 100) : 0)}`}>
                  {canEdit ? (
                    <input type="number" value={energiaAtual} onChange={e => update({ energiaAtual: Number(e.target.value) || 0 })} className="dash-resource-input" />
                  ) : (energiaAtual)}
                  <small>/{energiaNow}</small>
                </span>
              </div>
              <div className="dash-resource-bar"><div className="dash-resource-bar-fill" style={{ width: `${energiaNow > 0 ? Math.min(100, (energiaAtual / energiaNow) * 100) : 0}%` }} /></div>
            </div>
            <div className="dash-resource-pill dash-resource-pe">
              <span className="material-symbols-outlined dash-resource-icon">stars</span>
              <div className="dash-resource-body">
                <span className="dash-resource-label">Pontos de Esforço</span>
                <span className={`dash-resource-value ${peColor(peNow > 0 ? Math.round((peAtual / peNow) * 100) : 0)}`}>
                  {canEdit ? (
                    <input type="number" value={peAtual} onChange={e => update({ peAtual: Number(e.target.value) || 0 })} className="dash-resource-input" />
                  ) : (peAtual)}
                  <small>/{peNow}</small>
                </span>
              </div>
              <div className="dash-resource-bar"><div className="dash-resource-bar-fill" style={{ width: `${peNow > 0 ? Math.min(100, (peAtual / peNow) * 100) : 0}%` }} /></div>
            </div>
            <div className="dash-resource-pill dash-resource-ca">
              <span className="material-symbols-outlined dash-resource-icon">shield</span>
              <div className="dash-resource-body">
                <span className="dash-resource-label">CA</span>
                <span className="dash-resource-value" style={{ color: '#fb7185' }}>
                  {derived.ca}
                  {equipmentStats.totalArmorMax ? <small style={{ marginLeft: '0.3rem' }}>{equipmentStats.totalArmor}/{equipmentStats.totalArmorCap}</small> : null}
                </span>
              </div>
            </div>
          </div>

          <div className="dash-attrs">
            {['FOR','DES','CON','INT','APA','AM'].map(a => {
              const v = totalAttr(a)
              const m = getModifier(v)
              const cap = getAttrCap(char.nivel || 1)
              const pts = sk[a] || 0
              const pct = Math.min(100, Math.round((v / (cap + 10)) * 100))
              return (
                <div key={a} className="dash-attr">
                  <div className="dash-attr-fill" style={{ height: `${pct}%` }} />
                  <span className="dash-attr-icon">{ATTR_ICONS[a]}</span>
                  <span className="dash-attr-sigla">{a}</span>
                  <span className="dash-attr-value">{v}</span>
                  <span className={`dash-attr-mod ${m >= 0 ? 'pos' : 'neg'}`}>{m >= 0 ? '+' : ''}{m}</span>
                  {pts > 0 && <span className="dash-attr-skel">+{pts}</span>}
                </div>
              )
            })}
          </div>

          <div className="dash-section">
            <div className="dash-section-header">
              <div className="dash-section-header-bar bg-red-400" />
              <h3>Combate</h3>
              <div className="dash-section-header-line" />
            </div>
            <div className="dash-combat">
              <div className="dash-combat-stat"><small>CA</small><strong>{derived.ca}</strong></div>
              {equipmentStats.totalDurabilityMax ? <div className="dash-combat-stat"><small>Durabilidade</small><strong className="is-gold">{equipmentStats.totalDurability}/{equipmentStats.totalDurabilityMax}</strong></div> : null}
              {(activeBonuses.ataque || sysSkillBonuses.ataque) ? <div className="dash-combat-stat"><small>Ataque</small><strong className="is-gold">{(activeBonuses.ataque || 0) + sysSkillBonuses.ataque > 0 ? '+' : ''}{(activeBonuses.ataque || 0) + sysSkillBonuses.ataque}</strong></div> : null}
              <div className="dash-combat-stat"><small>Reações</small><strong>{derived.reacoes}</strong></div>
              <div className="dash-combat-stat"><small>Percepção</small><strong>{derived.percepcao}</strong></div>
              <div className="dash-combat-stat"><small>Dano Base</small><strong className="is-gold" style={{ fontSize: '0.85rem' }}>{derived.danoBase}</strong></div>
            </div>
            {(equipmentStats.totalCrit || equipmentStats.totalDamage || equipmentStats.activeSetBonuses.length > 0) && (
              <div className="dash-combat-bonuses">
                {equipmentStats.totalCrit ? <span className="dash-combat-bonus border-purple-400/20 bg-purple-400/10 text-purple-300">Crit +{equipmentStats.totalCrit}%</span> : null}
                {equipmentStats.totalDamage ? <span className="dash-combat-bonus border-red-400/20 bg-red-400/10 text-red-300">Dano +{equipmentStats.totalDamage}</span> : null}
                {equipmentStats.activeSetBonuses.map(({ type, count, bonus }) => (
                  <span key={`${type.id}-${bonus.pieces}`} className={`dash-combat-bonus ${type.badgeClass}`}>{type.label} {count}/4: {bonus.label}</span>
                ))}
              </div>
            )}
          </div>

          <div className="dash-section">
            <div className="dash-section-header">
              <div className="dash-section-header-bar bg-cyan-400" />
              <h3>Perícias</h3>
              {canEdit && cls && (
                <button onClick={() => { setSheetView('evolution'); }} className="ml-auto text-[10px] px-2.5 py-1 rounded border border-cyan-400/30 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20 transition-colors">Editar</button>
              )}
              <div className="dash-section-header-line" />
            </div>
            {periciasArr.length > 0 ? (
              <div className="dash-pericias">
                {periciasArr.map(([name, grau]) => {
                  const pDef = PERICIAS.find(p => p.name === name)
                  const bonus = pDef ? Math.max(...pDef.attrs.map(a => getModifier(totalAttr(a)))) + getGrauBonus(grau) : grau * 5
                  return (
                    <span key={name} className="dash-pericia-chip">
                      {name}
                      <small>{GRAU_NAMES[grau] || grau}</small>
                      <strong>{bonus >= 0 ? '+' : ''}{bonus}</strong>
                    </span>
                  )
                })}
              </div>
            ) : (
              <p className="text-txt-dim/50 text-xs italic">Nenhuma perícia treinada</p>
            )}
          </div>

          <div className="dash-section">
            <div className="dash-section-header">
              <div className="dash-section-header-bar bg-indigo-400" />
              <h3>Habilidades</h3>
              <button onClick={() => setSheetView('abilities')} className="ml-auto text-[10px] px-2.5 py-1 rounded border border-indigo-400/30 bg-indigo-400/10 text-indigo-300 hover:bg-indigo-400/20 transition-colors">Ver tudo</button>
              <div className="dash-section-header-line" />
            </div>
            <div className="dash-abilities-summary">
              {(char.habilidades || []).filter(h => h.nome).length > 0 ? (
                (char.habilidades || []).filter(h => h.nome).map((h, fi) => {
                  const i = (char.habilidades || []).indexOf(h)
                  const typeClass = h.tipo === 'Ultimate' ? 't-Ultimate' : h.tipo === 'Passiva' ? 't-Passiva' : h.tipo.startsWith('Extra') ? 't-Extra' : 't-Ativa'
                  return (
                    <div key={fi} className="dash-ability-summary">
                      <span className={`dash-ability-type ${typeClass}`}>{h.tipo === 'Ultimate' ? 'ULT' : h.tipo === 'Passiva' ? 'PSV' : h.tipo.startsWith('Extra') ? 'EXT' : 'ATV'}</span>
                      <span className="dash-ability-name">{h.nome}</span>
                      {h.custoEnergia > 0 && <span className="dash-ability-cost">{h.custoEnergia}⚡</span>}
                      <span className="dash-ability-status" style={{ background: h.status === 'Aprovada' ? '#34d399' : h.status === 'Revisão necessária' ? '#fb7185' : '#fbbf24' }} title={h.status || 'Pendente'} />
                    </div>
                  )
                })
              ) : (
                <p className="text-txt-dim/50 text-xs italic">Nenhuma habilidade definida</p>
              )}
            </div>
          </div>

          {acquiredModules.length > 0 && (
            <div className="dash-section">
              <div className="dash-section-header">
                <div className="dash-section-header-bar bg-yellow-400" />
                <h3>Módulos</h3>
                <div className="dash-section-header-line" />
              </div>
              <div className="dash-module-chips">
                {acquiredModules.map((m, i) => {
                  const isPassive = !m.pe
                  const isSpecial = MODULES_SPECIAL.some(s => s.id === m.id)
                  return (
                    <span key={i} className={`dash-module-chip ${isSpecial ? 'is-special' : isPassive ? 'is-passive' : 'is-active'}`}>
                      <span className="mod-type">{isSpecial ? 'ESP' : isPassive ? 'PSV' : 'ATV'}</span>
                      {m.name}
                      {(m.boughtCount || 1) > 1 && <span className="mod-count">×{m.boughtCount}</span>}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {sheetView === 'abilities' && (
        <div className="space-y-3">
          <div className="dash-section">
            <div className="dash-section-header">
              <div className="dash-section-header-bar bg-indigo-400" />
              <h3>Habilidades</h3>
              {costReduction > 0 && (
                <span className="ml-auto text-[10px] text-blue-400/80 flex items-center gap-1"><span className="text-blue-400">★</span> −{Math.round(costReduction * 100)}% custo de Buffs</span>
              )}
              <div className="dash-section-header-line" />
            </div>
            {canEdit && (
              <div className="mb-3 bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-2.5 flex items-center gap-3 text-[11px]">
                <span className="text-indigo-400 font-semibold">PEH</span>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-void rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pehRemaining < 0 ? 'bg-red-500' : pehRemaining === 0 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(100, Math.max(0, (pehSpent / Math.max(1, pehTotal)) * 100))}%` }} />
                  </div>
                  <span className={`font-mono ${pehRemaining < 0 ? 'text-red-400' : pehRemaining === 0 ? 'text-emerald-400' : 'text-indigo-400'}`}>{pehRemaining}/{pehTotal}</span>
                </div>
                <span className="text-txt-dim/60">gastos: {pehSpent}</span>
              </div>
            )}
            <div className="space-y-1.5">
              {(char.habilidades || []).map((h, i) => (
                <HabilidadeCard key={i} h={h} i={i} canEdit={canEdit} updateHabilidade={updateHabilidade} charNivel={char.nivel || 1} pehRemaining={pehRemaining} active={!!activeEffects[`habilidade_${i}`]} activePreview={parseActiveBonuses(h)} onToggleActive={() => toggleActiveEffect(`habilidade_${i}`)} onAnalyzeWithOracle={() => setOracleFocusRequest({ id: `habilidade_${i}_${Date.now()}`, index: i, ability: h })} />
              ))}
            </div>
          </div>

          <AbilityAnalysisChat char={char} onApply={handleBalanceApply} characterId={characterId} focusRequest={oracleFocusRequest} />

          {acquiredModules.length > 0 && (
            <div className="dash-section">
              <div className="dash-section-header">
                <div className="dash-section-header-bar bg-yellow-400" />
                <h3>Módulos de Evolução</h3>
                <div className="dash-section-header-line" />
              </div>
              <div className="dash-module-chips">
                {acquiredModules.map((m, i) => {
                  const isPassive = !m.pe
                  const isSpecial = MODULES_SPECIAL.some(s => s.id === m.id)
                  return (
                    <div key={i} className={`dash-module-chip ${isSpecial ? 'is-special' : isPassive ? 'is-passive' : 'is-active'}`} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.3rem', padding: '0.5rem 0.6rem' }}>
                      <div className="flex items-center gap-2 w-full">
                        <span className="mod-type">{isSpecial ? 'ESP' : isPassive ? 'PSV' : 'ATV'}</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>{m.name}</span>
                        {(m.boughtCount || 1) > 1 && <span className="mod-count">×{m.boughtCount}</span>}
                      </div>
                      <p style={{ fontSize: '0.66rem', color: 'rgba(156,143,123,0.6)', lineHeight: 1.4 }}>{m.desc}</p>
                      {canEdit && !isPassive && (
                        <button type="button" onClick={() => toggleActiveEffect(`module_${m.id}`)} className={`active-toggle ${activeEffects[`module_${m.id}`] ? 'is-active' : ''}`} style={{ fontSize: '0.58rem', padding: '0.25rem 0.5rem' }}>
                          {activeEffects[`module_${m.id}`] ? 'Ativo' : 'Ativar'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {hasSystemSkills && (
            <div className="dash-section">
              <div className="flex items-center gap-2 mb-3">
                <div className="dash-section-header">
                  <div className="dash-section-header-bar bg-purple-400" />
                  <h3>Skills Sistêmicas</h3>
                  <div className="dash-section-header-line" />
                </div>
                {isAdmin && (
                  <button onClick={() => setSkillCatalogOpen(true)} className="ml-auto bg-purple-400/10 border border-purple-300/30 text-purple-300 rounded-lg px-3 py-1.5 text-[11px] font-semibold hover:bg-purple-400/20 transition-colors">+ Atribuir Skill</button>
                )}
              </div>
              <div className="space-y-3">
                {(char.systemSkills || []).length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {(char.systemSkills || []).map((entry, i) => {
                      const skill = getSystemSkillById(entry.skillId)
                      const effects = entry.effects || []
                      const availableTypes = skill?.effectTypes || Object.keys(EFFECT_PARAM_DEFS)
                      const repeatableTypes = ['damage_per_level_interval', 'damage_per_attribute_interval', 'resource_per_level', 'attribute_cap_bonus', 'forge_rank_bonus', 'forge_enchantment_slots', 'forge_quality_bonus', 'manual_flag']
                      const addableTypes = availableTypes.filter(t => !effects.some(e => e.type === t) || repeatableTypes.includes(t))
                      const isActive = entry.active !== false
                      const skillColors = { forge_master: 'from-amber-400/20 via-orange-500/10 to-amber-600/5', skeleton_progression: 'from-emerald-400/20 via-green-500/10 to-emerald-600/5', scaling_damage: 'from-red-400/20 via-rose-500/10 to-red-600/5', resource_growth: 'from-cyan-400/20 via-sky-500/10 to-cyan-600/5', attribute_cap_break: 'from-violet-400/20 via-purple-500/10 to-violet-600/5' }
                      const gradient = skillColors[entry.skillId] || 'from-purple-400/15 via-indigo-500/10 to-purple-600/5'
                      return (
                        <div key={entry.id || i} onClick={(e) => { if (entry.skillId === 'forge_master' && !e.target.closest('button,input,select,textarea')) setForgeMenuOpen(true) }} className={`relative overflow-hidden rounded-xl border transition-all duration-300 group ${isActive ? `border-purple-300/40 bg-gradient-to-br ${gradient}` : 'border-sep/20 bg-void/40 opacity-60'}`} style={{ boxShadow: isActive ? '0 0 20px rgba(168, 85, 247, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)' : 'none' }}>
                          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M20%200%20L40%2020%20L20%2040%20L0%2020Z%22%20fill%3D%22none%22%20stroke%3D%22rgba(168%2C%2085%2C%20247%2C0.03)%22%20stroke-width%3D%221%22%2F%3E%3C%2Fsvg%3E')] opacity-30 pointer-events-none" />
                          <div className="relative px-4 pt-3 pb-3">
                            <div className="flex items-start gap-3">
                              <div className={`relative shrink-0 ${isActive ? '' : 'opacity-40'}`}>
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${isActive ? 'border-purple-300/30 bg-purple-400/20' : 'border-sep/30 bg-void/60'}`}>
                                  <span className="text-xl" style={{ textShadow: isActive ? '0 0 10px rgba(168, 85, 247, 0.5)' : 'none' }}>{entry.skillId === 'forge_master' ? '⚒️' : entry.skillId === 'skeleton_progression' ? '💀' : entry.skillId === 'scaling_damage' ? '⚔️' : entry.skillId === 'resource_growth' ? '💎' : entry.skillId === 'attribute_cap_break' ? '🔮' : '✦'}</span>
                                </div>
                                <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${isActive ? 'bg-purple-400 animate-pulse' : 'bg-sep/40'}`} style={{ boxShadow: isActive ? '0 0 8px rgba(168, 85, 247, 0.6)' : 'none' }} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-[13px] font-bold tracking-wide ${isActive ? 'text-purple-100' : 'text-txt-dim/60'}`} style={{ textShadow: isActive ? '0 0 10px rgba(168, 85, 247, 0.3)' : 'none' }}>{skill?.name || entry.skillId}</span>
                                  <span className={`text-[8px] rounded-full px-2 py-0.5 font-bold uppercase tracking-wider ${isActive ? 'bg-purple-400/25 text-purple-200 border border-purple-300/30' : 'bg-sep/15 text-txt-dim/50 border border-sep/20'}`}>{isActive ? 'Ativa' : 'Inativa'}</span>
                                  {skill?.rarity && (<span className={`text-[8px] rounded px-2 py-0.5 font-medium ${isActive ? 'bg-amber-400/15 text-amber-200 border border-amber-300/20' : 'bg-sep/15 text-txt-dim/50 border border-sep/20'}`}>{skill.rarity}</span>)}
                                </div>
                                <p className={`text-[10px] mt-2 leading-relaxed ${isActive ? 'text-txt-dim/80' : 'text-txt-dim/40'}`}>{skill?.short || 'Integração sistêmica definida pelo mestre.'}</p>
                              </div>
                              {isAdmin && (
                                <div className="ml-auto flex items-center gap-2 shrink-0">
                                  {entry.skillId === 'forge_master' && (<button onClick={() => setForgeMenuOpen(true)} className="w-7 h-7 grid place-items-center rounded border border-amber-300/30 text-amber-300/70 hover:text-amber-200 hover:bg-amber-400/20 transition-colors" title="Abrir encantamentos"><span className="material-symbols-outlined text-[15px]">auto_fix_high</span></button>)}
                                  <button onClick={() => { if (confirm(`Remover a skill "${skill?.name || entry.skillId}"? Os efeitos serão perdidos.`)) update({ systemSkills: (char.systemSkills || []).filter((_, si) => si !== i) }) }} className="w-7 h-7 grid place-items-center rounded text-err/50 hover:text-err hover:bg-err/15 transition-colors border border-transparent hover:border-err/25" title="Excluir Skill"><span className="material-symbols-outlined text-[15px]">close</span></button>
                                </div>
                              )}
                            </div>
                          </div>
                          {effects.length > 0 && (
                            <div className={`px-4 pb-3 ${isAdmin ? '' : 'pt-2'}`}>
                              <div className="space-y-2">
                                {effects.map((effect, ei) => {
                                  const eDef = EFFECT_PARAM_DEFS[effect.type]
                                  if (!eDef) return null
                                  return (
                                    <div key={ei} className="bg-void/50 border border-purple-300/20 rounded-lg px-3 py-2 backdrop-blur-sm">
                                      <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-purple-200/90 text-[10px] font-semibold tracking-wide">◆ {eDef.label}</span>
                                        {isAdmin && (<button onClick={() => update({ systemSkills: (char.systemSkills || []).map((s, si) => si === i ? { ...s, effects: s.effects.filter((_, fi) => fi !== ei) } : s) })} className="text-err/50 hover:text-err text-[9px] transition-colors opacity-70 hover:opacity-100">✕</button>)}
                                      </div>
                                      {!isAdmin && (<div className="flex flex-wrap gap-x-3 gap-y-0.5">{Object.entries(eDef.params).map(([pKey, pDef]) => (<span key={pKey} className="text-txt-dim/50 text-[9px]"><span className="text-purple-300/70">{pDef.label}:</span> <span className="text-txt-dim/90">{effect[pKey] ?? pDef.default}</span></span>))}</div>)}
                                      {isAdmin && Object.entries(eDef.params).map(([pKey, pDef]) => {
                                        if (pDef.type === 'select') return (<div key={pKey} className="flex items-center gap-2 mt-1.5"><span className="text-txt-dim/50 text-[10px] min-w-[100px]">{pDef.label}</span><select value={effect[pKey] ?? pDef.default} onChange={e => update({ systemSkills: (char.systemSkills || []).map((s, si) => si === i ? { ...s, effects: s.effects.map((ef, fi) => fi === ei ? { ...ef, [pKey]: e.target.value } : ef) } : s) })} className="flex-1 bg-void/70 text-txt-main text-[10px] border border-purple-300/25 rounded px-2.5 py-1 focus:border-purple-400/40 focus:outline-none focus:ring-1 focus:ring-purple-400/20">{(pDef.options || []).map(o => <option key={o.value} value={o.value} className="bg-void text-txt-main">{o.label}</option>)}</select></div>)
                                        if (pDef.type === 'number') return (<div key={pKey} className="flex items-center gap-2 mt-1.5"><span className="text-txt-dim/50 text-[10px] min-w-[100px]">{pDef.label}</span><input type="number" value={effect[pKey] ?? pDef.default} min={pDef.min} max={pDef.max} onChange={e => update({ systemSkills: (char.systemSkills || []).map((s, si) => si === i ? { ...s, effects: s.effects.map((ef, fi) => fi === ei ? { ...ef, [pKey]: e.target.value === '' ? '' : Number(e.target.value) } : ef) } : s) })} className="w-16 bg-void/70 text-txt-dim text-[10px] border border-purple-300/25 rounded px-2 py-0.5 text-center focus:border-purple-400/40 focus:outline-none focus:ring-1 focus:ring-purple-400/20" /></div>)
                                        return (<div key={pKey} className="flex items-center gap-2 mt-1.5"><span className="text-txt-dim/50 text-[10px] min-w-[100px]">{pDef.label}</span><input type="text" value={effect[pKey] ?? pDef.default ?? ''} onChange={e => update({ systemSkills: (char.systemSkills || []).map((s, si) => si === i ? { ...s, effects: s.effects.map((ef, fi) => fi === ei ? { ...ef, [pKey]: e.target.value } : ef) } : s) })} className="flex-1 bg-void/70 text-txt-dim text-[10px] border border-purple-300/25 rounded px-2 py-0.5 focus:border-purple-400/40 focus:outline-none focus:ring-1 focus:ring-purple-400/20" /></div>)
                                      })}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                          {isAdmin && addableTypes.length > 0 && (
                            <div className="px-4 pb-3 pt-2">
                              <select onChange={e => { if (e.target.value) { const pDef = EFFECT_PARAM_DEFS[e.target.value]; const newEff = { type: e.target.value }; if (pDef) for (const [k, p] of Object.entries(pDef.params)) { if (p.default != null) newEff[k] = p.default; } update({ systemSkills: (char.systemSkills || []).map((s, si) => si === i ? { ...s, effects: [...(s.effects || []), newEff] } : s) }); e.target.value = '' } }} className="w-full text-[10px] bg-void/50 border border-dashed border-purple-300/30 text-purple-200/50 rounded-lg px-3 py-2 hover:border-purple-400/40 hover:text-purple-200/70 transition-colors cursor-pointer focus:border-purple-400/50 focus:outline-none focus:ring-1 focus:ring-purple-400/20">
                                <option value="">✧ Adicionar efeito arcânico...</option>
                                {addableTypes.map(t => <option key={t} value={t}>{EFFECT_PARAM_DEFS[t]?.label || t}</option>)}
                              </select>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (<p className="text-txt-dim/40 text-xs italic text-center py-4">Nenhuma Skill atribuída pelo Mestre.</p>)}
                {summarizeSystemSkillBonuses(char).length > 0 && (
                  <div className="bg-purple-400/5 border border-purple-300/25 rounded-xl px-4 py-3 backdrop-blur-sm">
                    <div className="text-[10px] text-purple-300/70 font-semibold mb-2 uppercase tracking-widest">✦ Bônus Ativos</div>
                    <div className="flex flex-wrap gap-1.5">{summarizeSystemSkillBonuses(char).map((line, i) => (<span key={i} className="text-[10px] bg-purple-400/15 text-purple-200 border border-purple-300/25 rounded-md px-2.5 py-1" style={{ boxShadow: '0 0 8px rgba(168,85,247,0.1)' }}>{line}</span>))}</div>
                  </div>
                )}
                {(char.systemSkillNotifications || []).filter(n => n.status !== 'closed').length > 0 && (
                  <div className="space-y-2">
                    {(char.systemSkillNotifications || []).filter(n => n.status !== 'closed').map(notice => (
                      <div key={notice.id} className="rounded-lg border border-warn/25 bg-warn/5 px-3 py-2.5 flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-txt-main text-[11px] font-semibold">{notice.title}</p>
                          <p className="text-txt-dim/60 text-[10px] mt-0.5">{notice.message}</p>
                          {notice.suggestedEffects && (<div className="mt-1.5 flex flex-wrap gap-1">{notice.suggestedEffects.map((ef, ei) => (<span key={ei} className="text-[8px] bg-sky-400/10 text-sky-300 border border-sky-400/15 rounded px-1.5 py-0.5">{EFFECT_PARAM_DEFS[ef.type]?.label || ef.type}</span>))}</div>)}
                        </div>
                        {isAdmin && (
                          <div className="flex gap-1.5 shrink-0">
                            <button onClick={() => { const effects = notice.suggestedEffects && notice.suggestedEffects.length > 0 ? notice.suggestedEffects : createDefaultEffectsForSkill(notice.skillId); update({ systemSkills: [...(char.systemSkills || []), { id: `skill_${Date.now()}`, skillId: notice.skillId, active: true, sourceAbilityIndex: notice.abilityIndex ?? null, notes: '', effects, createdAt: new Date().toISOString() }], systemSkillNotifications: (char.systemSkillNotifications || []).map(n => n.id === notice.id ? { ...n, status: 'closed', resolvedAt: new Date().toISOString() } : n) }) }} className="text-[10px] bg-gold text-void px-3 py-1 rounded-md font-semibold hover:bg-gold/90 transition-colors">Atribuir</button>
                            <button onClick={() => update({ systemSkillNotifications: (char.systemSkillNotifications || []).map(n => n.id === notice.id ? { ...n, status: 'closed', resolvedAt: new Date().toISOString() } : n) })} className="text-[10px] border border-err/30 text-err/70 px-2.5 py-1 rounded-md hover:bg-err/10 transition-colors">Descartar</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {sheetView === 'equipment' && (
        <div className="space-y-3">
          <div className="dash-section">
            <div className="dash-section-header">
              <div className="dash-section-header-bar bg-red-400" />
              <h3>Armas & Arte Marcial</h3>
              <div className="dash-section-header-line" />
            </div>
            <WeaponMartialPanel char={char} update={update} canEdit={canEdit} />
          </div>
          <div className="dash-section">
            <div className="dash-section-header">
              <div className="dash-section-header-bar bg-amber-400" />
              <h3>Inventário & Equipamentos</h3>
              <div className="dash-section-header-line" />
            </div>
            <ResidentInventorySection char={char} characterId={characterId} canEdit={canEdit} update={update} onTransferItem={onTransferItem} maxCarry={carryCapacity} totalCarryWeight={carriedLoad} />
          </div>
          <div className="dash-section">
            <div className="dash-section-header">
              <div className="dash-section-header-bar bg-gray-400" />
              <h3>Notas</h3>
              <div className="dash-section-header-line" />
            </div>
            {canEdit ? (
              <textarea value={char.notas || ''} onChange={e => update({ notas: e.target.value })} placeholder="Anotações do jogador..." rows={3} className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-xs text-txt-main resize-none focus:border-gold/40 focus:outline-none transition-colors placeholder:text-txt-dim/40" />
            ) : (<p className="text-txt-main/80 text-xs whitespace-pre-wrap leading-relaxed">{char.notas || '—'}</p>)}
          </div>
        </div>
      )}

      {sheetView === 'evolution' && (
        <div className="space-y-3">
          {cls && skelTotal > 0 && (
            <SkeletonPointAllocator char={char} update={update} sk={sk} skelTotal={skelTotal} skelSpent={skelSpent} sysSkillBonuses={sysSkillBonuses} skelBase={skelBase} isAdmin={isAdmin} />
          )}
          <div className="dash-section">
            <div className="flex items-center justify-between">
              <div className="dash-section-header">
                <div className="dash-section-header-bar bg-cyan-400" />
                <h3>Perícias</h3>
                <div className="dash-section-header-line" />
              </div>
              {canEdit && cls && (
                <button onClick={() => setEditingPericias(!editingPericias)} className={`text-[10px] px-2.5 py-1 rounded border transition-colors ${editingPericias ? 'bg-cyan-400/15 border-cyan-400/40 text-cyan-300' : 'bg-void border-sep/30 text-txt-dim hover:border-cyan-400/30 hover:text-cyan-300'}`}>{editingPericias ? 'Fechar' : 'Editar'}</button>
              )}
            </div>
            {cls && (<div className="mb-2 flex items-center gap-2 text-[10px] text-txt-dim"><span>Pontos: <span className={`font-mono ${(periciasTotal - periciasUsed) > 0 ? 'text-cyan-400' : 'text-ok'}`}>{periciasUsed}/{periciasTotal}</span></span><span className="text-txt-dim/40">|</span><span>Grau máx: <span className="font-mono text-gold">{periciasMaxGrau} ({GRAU_NAMES[periciasMaxGrau]})</span></span></div>)}
            {editingPericias && canEdit && cls ? (
              <div className="space-y-1.5">
                {PERICIAS.map(pericia => {
                  const grau = (char.pericias || {})[pericia.name] || 0
                  const bestAttr = pericia.attrs.map(a => ({ a, v: totalAttr(a) })).reduce((a, b) => a.v >= b.v ? a : b)
                  const bonus = Math.max(...pericia.attrs.map(a => getModifier(totalAttr(a)))) + getGrauBonus(grau)
                  const remaining = periciasTotal - periciasUsed
                  const canUpgrade = remaining > 0 && (grau < periciasMaxGrau)
                  return (
                    <div key={pericia.name} className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors ${grau > 0 ? 'border-cyan-400/30 bg-cyan-400/5' : 'border-sep/20 bg-void/30'}`}>
                      <span className={`text-xs flex-1 min-w-0 truncate ${grau > 0 ? 'text-txt-main' : 'text-txt-dim/60'}`}>{pericia.name}</span>
                      <span className="text-[9px] text-txt-dim/50 w-10 text-center">{pericia.attrs.join('/')}</span>
                      <span className="text-[9px] text-gold/60 font-mono w-6 text-center">{bestAttr.a}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => adjustPericia(pericia.name, -1)} disabled={grau <= 0} className={`w-5 h-5 flex items-center justify-center rounded text-xs transition-colors ${grau > 0 ? 'bg-err/10 text-err/60 hover:bg-err/20' : 'bg-void border border-sep/20 text-sep/20 cursor-not-allowed'}`}>−</button>
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded text-center min-w-[70px] ${grau > 0 ? 'bg-cyan-400/15 text-cyan-300' : 'bg-void text-txt-dim/40'}`}>{GRAU_NAMES[grau]}</span>
                        <button onClick={() => adjustPericia(pericia.name, 1)} disabled={!canUpgrade} className={`w-5 h-5 flex items-center justify-center rounded text-xs transition-colors ${canUpgrade || grau > 0 ? 'bg-ok/10 text-ok/60 hover:bg-ok/20' : 'bg-void border border-sep/20 text-sep/20 cursor-not-allowed'}`}>+</button>
                      </div>
                      <span className={`font-mono text-xs w-8 text-right ${grau > 0 ? 'text-cyan-400' : 'text-txt-dim/30'}`}>{bonus >= 0 ? '+' : ''}{grau > 0 ? bonus : 0}</span>
                    </div>
                  )
                })}
              </div>
            ) : periciasArr.length > 0 ? (
              <div className="dash-pericias">
                {periciasArr.map(([name, grau]) => {
                  const pDef = PERICIAS.find(p => p.name === name)
                  const bonus = pDef ? Math.max(...pDef.attrs.map(a => getModifier(totalAttr(a)))) + getGrauBonus(grau) : grau * 5
                  return (<span key={name} className="dash-pericia-chip">{name}<small>{GRAU_NAMES[grau] || grau}</small><strong>{bonus >= 0 ? '+' : ''}{bonus}</strong></span>)
                })}
              </div>
            ) : (<p className="text-txt-dim/60 text-xs italic">Nenhuma perícia treinada</p>)}
          </div>
          <div className="dash-section">
            <div className="dash-section-header">
              <div className="dash-section-header-bar bg-purple-400" />
              <h3>Triagens</h3>
              <div className="dash-section-header-line" />
            </div>
            <TriagemSection char={char} cls={cls} />
          </div>
          <details className="dash-collapsible">
            <summary>
              <div className="dash-section-header-bar bg-emerald-400" />
              <span className="font-cinzel text-txt-main text-xs uppercase tracking-[0.15em]">Herança Racial</span>
              <span className="ml-auto text-txt-dim/30 text-[10px]">▼</span>
            </summary>
            <div className="dash-collapsible-content mt-2">
              <RaceHeritageSectionV2 char={char} update={update} />
            </div>
          </details>
        </div>
      )}

      {sheetView === 'mystic' && (
        <MysticKnowledgePanel char={char} update={update} canEdit={canEdit} />
      )}

      <div className="dash-footer">
        <button onClick={onNew} className="dash-topbar-btn">
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>add</span>
          Novo Personagem
        </button>
        <button onClick={onSave} className="dash-topbar-btn dash-topbar-btn-primary">
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>library_books</span>
          Salvar e Ir para Biblioteca
        </button>
      </div>
      </div>
    </div>
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
    <div className="rounded-xl p-3 hover:border-sep/70 transition-all duration-200" style={{ background: 'rgba(14,14,15,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[11px]">{icon}</span>
        <span className="text-txt-dim text-[10px] font-semibold uppercase tracking-wider">{label}</span>
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
      <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <div className={`h-full rounded-full transition-all duration-700 ease-out ${pctBarColor(pct)}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function CombatStat({ label, value, isGold }) {
  return (
    <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <div className="text-txt-dim/50 text-[10px] uppercase tracking-wider mb-1">{label}</div>
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

const RT_COLORS = [
  { label: 'Branco', value: '#e2e8f0', cls: 'bg-slate-200' },
  { label: 'Vermelho', value: '#f87171', cls: 'bg-red-400' },
  { label: 'Laranja', value: '#fb923c', cls: 'bg-orange-400' },
  { label: 'Amarelo', value: '#facc15', cls: 'bg-yellow-400' },
  { label: 'Verde', value: '#4ade80', cls: 'bg-green-400' },
  { label: 'Azul', value: '#60a5fa', cls: 'bg-blue-400' },
  { label: 'Roxo', value: '#c084fc', cls: 'bg-purple-400' },
  { label: 'Dourado', value: '#fbbf24', cls: 'bg-amber-400' },
]

const BG_COLORS = [
  { label: 'Nenhum', value: '', cls: 'bg-void border border-sep/30' },
  { label: 'Vermelho', value: '#7f1d1d', cls: 'bg-red-900' },
  { label: 'Laranja', value: '#7c2d12', cls: 'bg-orange-900' },
  { label: 'Amarelo', value: '#713f12', cls: 'bg-yellow-900' },
  { label: 'Verde', value: '#14532d', cls: 'bg-green-900' },
  { label: 'Azul', value: '#1e3a5f', cls: 'bg-blue-900' },
  { label: 'Roxo', value: '#3b0764', cls: 'bg-purple-900' },
  { label: 'Cinza', value: '#1f2937', cls: 'bg-gray-800' },
]

function RichTextToolbar({ editorRef }) {
  const [showTextColor, setShowTextColor] = useState(false)
  const [showBgColor, setShowBgColor] = useState(false)

  function exec(command, value) {
    editorRef.current?.focus()
    document.execCommand(command, false, value || null)
  }

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 bg-void/80 border-b border-sep/20 rounded-t-lg flex-wrap">
      <button type="button" onClick={() => exec('bold')} title="Negrito"
        className="w-7 h-7 rounded flex items-center justify-center text-txt-dim/70 hover:text-txt-main hover:bg-sep/20 transition-colors text-sm font-bold">B</button>
      <button type="button" onClick={() => exec('italic')} title="Itálico"
        className="w-7 h-7 rounded flex items-center justify-center text-txt-dim/70 hover:text-txt-main hover:bg-sep/20 transition-colors text-sm italic">I</button>
      <button type="button" onClick={() => exec('underline')} title="Sublinhado"
        className="w-7 h-7 rounded flex items-center justify-center text-txt-dim/70 hover:text-txt-main hover:bg-sep/20 transition-colors text-sm underline">U</button>
      <button type="button" onClick={() => exec('strikeThrough')} title="Tachado"
        className="w-7 h-7 rounded flex items-center justify-center text-txt-dim/70 hover:text-txt-main hover:bg-sep/20 transition-colors text-sm line-through">S</button>
      <div className="w-px h-5 bg-sep/20 mx-1" />
      <div className="relative">
        <button type="button" onClick={() => { setShowTextColor(v => !v); setShowBgColor(false) }} title="Cor do texto"
          className="w-7 h-7 rounded flex items-center justify-center text-txt-dim/70 hover:text-txt-main hover:bg-sep/20 transition-colors text-sm">
          <span className="border-b-2 border-current" style={{ color: '#f87171' }}>A</span>
        </button>
        {showTextColor && (
          <div className="absolute top-full left-0 mt-1 bg-deep border border-sep/30 rounded-lg p-1.5 flex gap-1 z-50 shadow-xl">
            {RT_COLORS.map(c => (
              <button type="button" key={c.value} onClick={() => { exec('foreColor', c.value); setShowTextColor(false) }} title={c.label}
                className={`w-5 h-5 rounded-full ${c.cls} border border-sep/30 hover:scale-125 transition-transform`} />
            ))}
          </div>
        )}
      </div>
      <div className="relative">
        <button type="button" onClick={() => { setShowBgColor(v => !v); setShowTextColor(false) }} title="Cor de fundo"
          className="w-7 h-7 rounded flex items-center justify-center text-txt-dim/70 hover:text-txt-main hover:bg-sep/20 transition-colors text-sm">
          <span className="bg-amber-900/60 px-0.5 rounded text-[10px]">A</span>
        </button>
        {showBgColor && (
          <div className="absolute top-full left-0 mt-1 bg-deep border border-sep/30 rounded-lg p-1.5 flex gap-1 z-50 shadow-xl">
            {BG_COLORS.map(c => (
              <button type="button" key={c.value || 'none'} onClick={() => { exec('hiliteColor', c.value || 'transparent'); setShowBgColor(false) }} title={c.label}
                className={`w-5 h-5 rounded-full ${c.cls} hover:scale-125 transition-transform`} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EffectCardControls({ hab, onChange }) {
  const activeTags = normalizeSkillTags(hab)
  const chipValues = new Map(getSkillTagChips(hab).map(chip => [chip.tag, chip.value || '']))
  const onToggle = (tag) => onChange?.(buildSkillTagOverridePatch(hab, tag))

  return (
    <div className="bg-void/35 border border-sep/25 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-txt-dim uppercase tracking-wider font-semibold">Cards de efeito</span>
        <span className="text-[10px] text-gold/60 font-mono">{activeTags.length} ativos</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SKILL_TAG_OPTIONS.map(opt => {
          const active = activeTags.includes(opt.tag)
          return (
            <button
              key={opt.tag}
              type="button"
              onClick={() => onToggle(opt.tag)}
              className={`text-[10px] px-2 py-1 rounded border font-mono transition-colors ${
                active
                  ? 'bg-gold/10 border-gold/35 text-gold'
                  : 'bg-black/20 border-sep/25 text-txt-dim/45 hover:text-txt-dim hover:border-sep/60'
              }`}
              title={active ? 'Ocultar card' : 'Mostrar card'}
            >
              {active ? '✓' : '+'} {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function EditableEffectCardControls({ hab, onChange }) {
  const activeTags = normalizeSkillTags(hab)
  const chipValues = new Map(getSkillTagChips(hab).map(chip => [chip.tag, chip.value || '']))

  return (
    <div className="bg-void/35 border border-sep/25 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-txt-dim uppercase tracking-wider font-semibold">Cards de efeito</span>
        <span className="text-[10px] text-gold/60 font-mono">{activeTags.length} ativos</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SKILL_TAG_OPTIONS.map(opt => {
          const active = activeTags.includes(opt.tag)
          return (
            <div key={opt.tag} className={`rounded border p-2 transition-colors ${active ? 'bg-gold/10 border-gold/35 text-gold' : 'bg-black/20 border-sep/25 text-txt-dim/45 hover:text-txt-dim hover:border-sep/60'}`}>
              <button type="button" onClick={() => onChange(buildSkillTagOverridePatch(hab, opt.tag))}
                className="w-full flex items-center justify-between gap-2 text-[10px] font-mono"
                title={active ? 'Ocultar card' : 'Mostrar card'}>
                <span>{active ? '✓' : '+'} {opt.label}</span>
                {active && <span className="text-[9px] text-gold/60">editar</span>}
              </button>
              {active && (
                <input
                  type="text"
                  value={chipValues.get(opt.tag) || ''}
                  onChange={e => onChange(buildSkillTagValuePatch(hab, opt.tag, e.target.value))}
                  placeholder="valor do card"
                  className="mt-1 w-full bg-void/70 border border-sep/25 rounded px-2 py-1 text-[11px] text-txt-main font-mono focus:border-gold/50 focus:outline-none"
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AbilityEditModal({ h, i, canEdit, updateHabilidade, onClose }) {
  const [form, setForm] = useState({
    tipo: h.tipo || 'Ativa',
    nome: h.nome || '',
    descricao: h.descricao || '',
    custoEnergia: h.custoEnergia || 0,
    dano: h.dano || '',
    duracao: h.duracao || '',
    dt: h.dt || '',
    valores: h.valores || {},
    tags: normalizeSkillTags(h),
    tagsManuais: h.tagsManuais || [],
    tagsOcultas: h.tagsOcultas || [],
    status: h.status || 'Pendente',
  })
  const editorRef = useRef(null)
  const isHtml = form.descricao?.includes('<') && form.descricao?.includes('>')

  useEffect(() => {
    if (editorRef.current && isHtml) {
      editorRef.current.innerHTML = form.descricao
    }
  }, [])

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleDescEditorInput() {
    if (editorRef.current) {
      handleChange('descricao', editorRef.current.innerHTML)
    }
  }

  function handleEffectCardChange(patch) {
    setForm(prev => ({
      ...prev,
      ...patch,
    }))
  }

  function handleSave() {
    updateHabilidade(i, form)
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl max-h-[90vh] bg-deep border border-gold/20 rounded-2xl shadow-2xl shadow-black/60 flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gold/15 bg-gradient-to-r from-void/60 via-deep/80 to-void/60">
          <span className="text-gold text-lg">✎</span>
          <h3 className="text-gold text-sm font-cinzel font-semibold flex-1">Editar Habilidade</h3>
          <button type="button" onClick={onClose}
            className="text-txt-dim/40 hover:text-txt-dim text-lg transition-colors">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="text-txt-dim/60 text-[10px] uppercase tracking-wider block mb-1">Status</label>
            <select value={form.status} onChange={e => handleChange('status', e.target.value)}
              className={`text-xs bg-void border border-sep/50 rounded-lg px-3 py-1.5 ${STATUS_COLORS[form.status] || 'text-txt-dim'}`}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="text-txt-dim/60 text-[10px] uppercase tracking-wider block mb-1">Nome</label>
            <input type="text" value={form.nome} onChange={e => handleChange('nome', e.target.value)} placeholder="Nome da habilidade"
              className="w-full bg-void border border-sep/30 rounded-lg px-4 py-2.5 text-sm text-txt-main focus:border-gold/40 focus:outline-none transition-colors" />
          </div>

          <div>
            <label className="text-txt-dim/60 text-[10px] uppercase tracking-wider block mb-1.5">Descrição</label>
            <div className="border border-sep/25 rounded-lg overflow-hidden bg-void/60">
              <RichTextToolbar editorRef={editorRef} />
              {isHtml ? (
                <div
                  ref={editorRef}
                  contentEditable
                  onInput={handleDescEditorInput}
                  className="px-4 py-3 text-sm text-txt-main leading-relaxed min-h-[120px] max-h-[300px] overflow-y-auto focus:outline-none whitespace-pre-wrap break-words"
                  style={{ fontFamily: 'inherit' }}
                />
              ) : (
                <textarea
                  value={form.descricao}
                  onChange={e => handleChange('descricao', e.target.value)}
                  placeholder="Descrição da habilidade..."
                  rows={5}
                  className="w-full px-4 py-3 text-sm text-txt-main leading-relaxed resize-none focus:outline-none bg-transparent min-h-[120px] max-h-[300px] overflow-y-auto"
                />
              )}
            </div>
            <p className="text-txt-dim/30 text-[9px] mt-1">Selecione texto para aplicar formatação (negrito, itálico, cores)</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-sky-400 text-[10px] uppercase tracking-wider block mb-1">Energia</label>
              <input type="number" value={form.custoEnergia} onChange={e => handleChange('custoEnergia', Number(e.target.value) || 0)}
                className="w-full bg-void border border-sep/30 rounded-lg px-3 py-2 text-sm text-txt-main font-mono focus:border-gold/40 focus:outline-none transition-colors" />
            </div>
            <div>
              <label className="text-red-400 text-[10px] uppercase tracking-wider block mb-1">Dano</label>
              <input type="text" value={form.dano} onChange={e => handleChange('dano', e.target.value)}
                className="w-full bg-void border border-sep/30 rounded-lg px-3 py-2 text-sm text-txt-main font-mono focus:border-gold/40 focus:outline-none transition-colors" />
            </div>
            <div>
              <label className="text-amber-400 text-[10px] uppercase tracking-wider block mb-1">Duração</label>
              <input type="text" value={form.duracao} onChange={e => handleChange('duracao', e.target.value)}
                className="w-full bg-void border border-sep/30 rounded-lg px-3 py-2 text-sm text-txt-main focus:border-gold/40 focus:outline-none transition-colors" />
            </div>
            <div>
              <label className="text-purple-400 text-[10px] uppercase tracking-wider block mb-1">DT</label>
              <input type="text" value={form.dt} onChange={e => handleChange('dt', e.target.value)}
                className="w-full bg-void border border-sep/30 rounded-lg px-3 py-2 text-sm text-txt-main font-mono focus:border-gold/40 focus:outline-none transition-colors" />
            </div>
          </div>
          <EditableEffectCardControls hab={form} onChange={handleEffectCardChange} />
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-sep/20 bg-void/40">
          <button type="button" onClick={onClose}
            className="text-sm text-txt-dim/50 hover:text-txt-dim px-4 py-2 rounded-lg transition-colors">
            Cancelar
          </button>
          <button type="button" onClick={handleSave}
            className="text-sm bg-gold/15 border border-gold/25 text-gold hover:bg-gold/25 px-5 py-2 rounded-lg font-medium transition-colors">
            Salvar
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

const DETAIL_CHIP_META = {
  custoEnergia: { icon: '⚡', label: 'Energia', color: 'text-sky-400', border: 'border-sky-500/20', bg: 'rgba(56,189,248,0.06)', accent: 'text-sky-300/80' },
  dano: { icon: '⚔', label: 'Dano', color: 'text-red-400', border: 'border-red-500/20', bg: 'rgba(239,68,68,0.06)', accent: 'text-red-300/80' },
  cura: { icon: '✚', label: 'Cura', color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'rgba(16,185,129,0.06)', accent: 'text-emerald-300/80' },
  curaEnergia: { icon: '↺', label: 'Energia/rod.', color: 'text-cyan-300', border: 'border-cyan-500/20', bg: 'rgba(34,211,238,0.06)', accent: 'text-cyan-200/80' },
  duracao: { icon: '⏱', label: 'Duração', color: 'text-amber-400', border: 'border-amber-500/20', bg: 'rgba(245,158,11,0.06)', accent: 'text-amber-300/80' },
  dt: { icon: '🎯', label: 'DT', color: 'text-purple-400', border: 'border-purple-500/20', bg: 'rgba(168,85,247,0.06)', accent: 'text-purple-300/80' },
  bonusCA: { icon: '◆', label: 'CA', color: 'text-cyan-300', border: 'border-cyan-500/20', bg: 'rgba(34,211,238,0.06)', accent: 'text-cyan-200/80' },
  bonusAtaque: { icon: '⌁', label: 'Ataque', color: 'text-indigo-300', border: 'border-indigo-500/20', bg: 'rgba(129,140,248,0.06)', accent: 'text-indigo-200/80' },
  bonusResultado: { icon: '+', label: 'Resultado', color: 'text-indigo-300', border: 'border-indigo-500/20', bg: 'rgba(129,140,248,0.06)', accent: 'text-indigo-200/80' },
  bonusReacoes: { icon: '↻', label: 'Reações', color: 'text-indigo-300', border: 'border-indigo-500/20', bg: 'rgba(129,140,248,0.06)', accent: 'text-indigo-200/80' },
  area: { icon: '◎', label: 'Área', color: 'text-txt-dim', border: 'border-sep/25', bg: 'rgba(255,255,255,0.03)', accent: 'text-gold/80' },
  deslocamento: { icon: '↗', label: 'Deslocamento', color: 'text-sky-300', border: 'border-sky-500/20', bg: 'rgba(56,189,248,0.05)', accent: 'text-sky-200/80' },
  resistencia: { icon: '◈', label: 'Resistência', color: 'text-emerald-300', border: 'border-emerald-500/20', bg: 'rgba(16,185,129,0.05)', accent: 'text-emerald-200/80' },
  paralisia: { icon: '✕', label: 'Controle', color: 'text-fuchsia-300', border: 'border-fuchsia-500/20', bg: 'rgba(217,70,239,0.05)', accent: 'text-fuchsia-200/80' },
}

function getChipBaseValue(h, chip, dtDisplay) {
  if (chip.tag === 'custoEnergia') return chip.value || (h.custoEnergia > 0 ? String(h.custoEnergia) : '')
  if (chip.tag === 'dano') return h.dano || chip.value
  if (chip.tag === 'duracao') return h.duracao || chip.value
  if (chip.tag === 'dt') return dtDisplay || chip.value
  return chip.value
}

function firstNumber(value) {
  const match = String(value || '').match(/[+-]?\d+/)
  return match ? Number(match[0]) : null
}

function signedNumber(value) {
  if (value == null || Number.isNaN(value)) return ''
  return `${value > 0 ? '+' : ''}${value}`
}

function finalSignedValue(base, evo) {
  const baseNum = firstNumber(base)
  const evoNum = firstNumber(evo)
  if (baseNum == null && evoNum == null) return base || ''
  return signedNumber((baseNum || 0) + (evoNum || 0))
}

function finalDurationValue(base, evo) {
  const baseNum = firstNumber(base)
  const evoNum = firstNumber(evo)
  if (baseNum == null || !evoNum) return base || ''
  const total = baseNum + evoNum
  const text = String(base || '').toLowerCase()
  const unit = /turno/.test(text) ? (total === 1 ? 'turno' : 'turnos') : (total === 1 ? 'rodada' : 'rodadas')
  return `${total} ${unit}`
}

function finalPerRoundValue(base, evo) {
  const value = finalSignedValue(base, evo)
  if (!value) return base || ''
  const text = `${base || ''} ${evo || ''}`.toLowerCase()
  if (/turno/.test(text)) return `${value}/turno`
  if (/rod|round/.test(text)) return `${value}/rod.`
  return value
}

function finalDtValue(base, evo) {
  const extra = firstNumber(evo)
  if (!extra) return base || ''
  const match = String(base || '').match(/^(DT\s*)(\d+)(.*)$/i)
  if (!match) return base || ''
  return `${match[1]}${Number(match[2]) + extra}${match[3]}`.trim()
}

function finalDamageValue(base, evo) {
  if (!evo) return base || ''
  if (!base) return evo
  return `${base} ${evo}`.replace(/\s+/g, ' ').trim()
}

function finalChipValue(h, chip, evoBonus, evoDelta, dtDisplay) {
  const base = getChipBaseValue(h, chip, dtDisplay)
  const evo = formatEvoForChip(chip, evoBonus)
  if (chip.tag === 'custoEnergia') {
    const baseNum = firstNumber(base)
    if (baseNum != null && evoDelta?.valores?.energiaExtra > 0) return String(baseNum + evoDelta.valores.energiaExtra)
    return base
  }
  if (chip.tag === 'dano') return finalDamageValue(base, evo)
  if (chip.tag === 'duracao') return finalDurationValue(base, evo)
  if (chip.tag === 'dt') return finalDtValue(base, evo)
  if (chip.tag === 'curaEnergia') return finalPerRoundValue(base, evo)
  if (['bonusCA', 'bonusAtaque', 'bonusResultado', 'bonusReacoes', 'cura'].includes(chip.tag)) return finalSignedValue(base, evo)
  return base
}

function formatEvoForChip(chip, evoBonus) {
  if (!evoBonus?.value) return ''
  if (chip.tag === 'curaEnergia' && /rod|turno/i.test(chip.value || '') && !/rod|turno/i.test(evoBonus.value)) return `${evoBonus.value}/rod.`
  if (chip.tag === 'dt') return `(${evoBonus.value})`
  return evoBonus.value
}

function buildAbilityDetailChips(h, tagChips, evoDelta, dtDisplay, dtMissingType) {
  return tagChips.map(chip => {
    const evoBonus = evoDelta?.tagBonuses?.find(item => item.tag === chip.tag) || null
    const meta = DETAIL_CHIP_META[chip.tag] || { icon: '', label: chip.label, color: 'text-txt-dim', border: 'border-sep/25', bg: 'rgba(255,255,255,0.03)', accent: 'text-gold/80' }
    const value = finalChipValue(h, chip, evoBonus, evoDelta, dtDisplay)
    return { ...meta, tag: chip.tag, value, evo: '', missingType: chip.tag === 'dt' && dtMissingType }
  }).filter(chip => chip.value || chip.evo)
}

function CompactTagChip({ chip, evoBonus }) {
  const evo = formatEvoForChip(chip, evoBonus)
  return (
    <span className="text-[10px] bg-void/45 border border-sep/25 text-txt-dim/80 px-2 py-0.5 rounded font-mono">
      {chip.tag === 'dt' ? (
        <>
          DT: {chip.value || 'tipo?'}{evo ? <span className="text-gold/80"> {evo}</span> : null}{chip.missingType ? <span className="text-amber-300/80"> tipo?</span> : null}
        </>
      ) : (
        <>
          {chip.label}{chip.value ? ` ${chip.value}` : ''}{evo ? <span className="text-gold/80"> {evo}</span> : null}
        </>
      )}
    </span>
  )
}

function AbilityDetailChips({ chips }) {
  if (!chips.length) return null
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map(chip => (
        <span key={chip.tag} className={`${chip.color} px-3 py-1.5 rounded-lg border ${chip.border} text-xs font-mono`} style={{ background: chip.bg }}>
          {chip.icon ? `${chip.icon} ` : ''}{chip.label}: {chip.value}{chip.evo ? <span className={chip.accent}> {chip.evo}</span> : ''}{chip.missingType ? <span className="text-amber-300/80"> tipo?</span> : ''}
        </span>
      ))}
    </div>
  )
}

function HabilidadeCard({ h, i, canEdit, updateHabilidade, charNivel, pehRemaining, active, activePreview, onToggleActive, onAnalyzeWithOracle }) {
  const [open, setOpen] = useState(false)
  const [editModal, setEditModal] = useState(false)

  const evoNivel = h.evolucaoNivel || 0
  const maxEvo = getMaxEvolucao(h.tipo, charNivel)
  const evoDelta = calcEvolucaoDelta(h, evoNivel)
  const tagChips = getSkillTagChips(h)
  const dtDisplay = getSkillDtDisplay(h)
  const dtMissingType = !!dtDisplay && !hasSkillDtType(h)
  const detailChips = buildAbilityDetailChips(h, tagChips, evoDelta, dtDisplay, dtMissingType)
  const bracket = getSkillBracket(h.custoEnergia || 0, h.tipo)
  const { allowed: canUp, reason: upReason } = canEvolveSkill(h, evoNivel, charNivel)
  const canDown = evoNivel > 0 && h.tipo !== 'Passiva'
  const nextEvoCost = getNextEvolucaoCost(h, evoNivel)
  const evoCost = calcEvolucaoCost(h.tipo, evoNivel)

  const typeStyle = h.tipo === 'Ultimate'
    ? { border: 'border-amber-400/30', bg: '', badge: 'text-amber-300 border-amber-400/30', badgeBg: 'rgba(251,191,36,0.12)', icon: '★', label: 'Ultimate', accentGrad: 'linear-gradient(135deg, rgba(251,191,36,0.08), transparent)' }
    : h.tipo === 'Passiva'
    ? { border: 'border-emerald-400/20', bg: '', badge: 'text-emerald-400 border-emerald-400/30', badgeBg: 'rgba(52,211,153,0.10)', icon: 'P', label: 'Passiva', accentGrad: 'linear-gradient(135deg, rgba(52,211,153,0.06), transparent)' }
    : h.tipo === 'Extra (Triagem)'
    ? { border: 'border-purple-400/20', bg: '', badge: 'text-purple-400 border-purple-400/30', badgeBg: 'rgba(192,132,252,0.10)', icon: 'T', label: 'Extra (Triagem)', accentGrad: 'linear-gradient(135deg, rgba(192,132,252,0.06), transparent)' }
    : h.tipo === 'Extra (Módulo)'
    ? { border: 'border-sky-400/20', bg: '', badge: 'text-sky-400 border-sky-400/30', badgeBg: 'rgba(56,189,248,0.10)', icon: 'M', label: 'Extra (Módulo)', accentGrad: 'linear-gradient(135deg, rgba(56,189,248,0.06), transparent)' }
    : { border: 'border-indigo-400/15', bg: '', badge: 'text-indigo-400 border-indigo-400/30', badgeBg: 'rgba(129,140,248,0.10)', icon: `#${i + 1}`, label: 'Ativa', accentGrad: 'linear-gradient(135deg, rgba(129,140,248,0.05), transparent)' }

  function handleEvoUp() {
    if (!canUp || pehRemaining < nextEvoCost) return
    updateHabilidade(i, { evolucaoNivel: evoNivel + 1 })
  }

  function handleEvoDown() {
    if (!canDown) return
    updateHabilidade(i, { evolucaoNivel: evoNivel - 1 })
  }

  return (
    <div className={`rounded-xl border ${typeStyle.border} overflow-hidden transition-all duration-200 hover:translate-y-[-1px]`} style={{ background: typeStyle.accentGrad }}>
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className={`text-[10px] font-bold w-7 h-7 rounded-lg flex items-center justify-center border shrink-0 ${typeStyle.badge}`} style={{ background: typeStyle.badgeBg }}>
            {typeStyle.icon}
          </span>
          <span className="text-txt-main text-sm font-semibold truncate">{h.nome || '—'}</span>
          {h.custoEnergia > 0 && (
            <span className="shrink-0 text-sky-400 px-2 py-0.5 rounded border border-sky-500/20 text-[10px] font-mono leading-tight" style={{ background: 'rgba(56,189,248,0.08)' }}>
              ⚡{h.custoEnergia}
            </span>
          )}
          {h.tipo === 'Passiva' && (
            <span className="shrink-0 text-emerald-400 px-2 py-0.5 rounded border border-emerald-400/20 text-[10px] font-mono leading-tight" style={{ background: 'rgba(52,211,153,0.08)' }}>
              Passiva
            </span>
          )}
          {h.status && h.status !== 'Aprovada' && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[h.status] === 'text-warn' ? 'border-yellow-400/25 text-yellow-300' : STATUS_COLORS[h.status] === 'text-err' ? 'border-red-400/25 text-red-300' : 'border-sep/20 text-txt-dim'}`} style={{ background: STATUS_COLORS[h.status] === 'text-warn' ? 'rgba(250,204,21,0.08)' : STATUS_COLORS[h.status] === 'text-err' ? 'rgba(248,113,113,0.08)' : 'rgba(255,255,255,0.02)' }}>
              {h.status}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-3">
          {canEdit && h.tipo !== 'Passiva' && canUp && pehRemaining >= nextEvoCost && (
            <button type="button" onClick={e => { e.stopPropagation(); handleEvoUp() }}
              title={`Evoluir habilidade (${evoNivel}/${maxEvo}) - custo ${nextEvoCost} PEH, ${pehRemaining} livre(s)`}
              className="w-6 h-6 rounded border border-indigo-400/30 text-indigo-400/70 hover:text-indigo-400 hover:border-indigo-400/60 inline-flex items-center justify-center transition-colors text-[11px] font-bold" style={{ background: 'rgba(129,140,248,0.06)' }}>
              +
            </button>
          )}
          {evoNivel > 0 && (
            <span className="text-indigo-400/60 text-[10px] font-mono">{evoNivel}/{maxEvo}</span>
          )}
          {onAnalyzeWithOracle && (
            <button type="button" onClick={e => { e.stopPropagation(); onAnalyzeWithOracle() }}
              className="w-6 h-6 rounded border border-gold/20 text-gold/70 hover:text-gold hover:border-gold/40 inline-flex items-center justify-center transition-colors" style={{ background: 'rgba(201,168,76,0.05)' }}
              title="Analisar esta habilidade no Oraculo"
              aria-label="Analisar esta habilidade no Oraculo">
              <span className="material-symbols-outlined text-[14px] leading-none" aria-hidden="true">auto_awesome</span>
            </button>
          )}
          {canEdit && (
            <button type="button" onClick={e => { e.stopPropagation(); setEditModal(true) }}
              className="w-6 h-6 rounded border border-transparent text-txt-dim/30 hover:text-gold/60 hover:border-gold/20 inline-flex items-center justify-center transition-colors text-xs" title="Editar habilidade">✎</button>
          )}
          <span className="text-txt-dim/30 text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex flex-wrap items-center gap-2 pt-3">
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[h.status] === 'text-ok' ? 'border-emerald-400/20 text-emerald-300' : STATUS_COLORS[h.status] === 'text-warn' ? 'border-yellow-400/20 text-yellow-300' : STATUS_COLORS[h.status] === 'text-err' ? 'border-red-400/20 text-red-300' : 'border-sep/20 text-txt-dim'}`} style={{ background: STATUS_COLORS[h.status] === 'text-ok' ? 'rgba(52,211,153,0.06)' : STATUS_COLORS[h.status] === 'text-warn' ? 'rgba(250,204,21,0.06)' : STATUS_COLORS[h.status] === 'text-err' ? 'rgba(248,113,113,0.06)' : 'rgba(255,255,255,0.02)' }}>{h.status}</span>
            {evoNivel > 0 && <span className="text-indigo-400 text-[10px] font-mono">Evo {evoNivel}/{maxEvo} ({bracket}) - {evoCost} PEH</span>}
            {canEdit && h.tipo !== 'Passiva' && (
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => handleEvoDown()}
                  disabled={!canDown}
                  className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center transition-colors ${canDown ? 'bg-void border border-sep/50 text-txt-dim hover:border-red-400 hover:text-red-400' : 'opacity-20 cursor-not-allowed'}`}>
                  −
                </button>
                <span className={`text-[10px] font-mono w-4 text-center ${evoNivel > 0 ? 'text-indigo-400' : 'text-txt-dim/40'}`}>{evoNivel}</span>
                <button type="button" onClick={() => handleEvoUp()}
                  disabled={!canUp || pehRemaining < nextEvoCost}
                  title={upReason || (pehRemaining < nextEvoCost ? `Requer ${nextEvoCost} PEH livre` : '')}
                  className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center transition-colors ${canUp && pehRemaining >= nextEvoCost ? 'bg-void border border-sep/50 text-txt-dim hover:border-indigo-400 hover:text-indigo-400' : 'opacity-20 cursor-not-allowed'}`}>
                  +
                </button>
              </div>
            )}
            {canEdit && (
              <button type="button" onClick={() => onToggleActive?.()}
                title="Ativar ou desativar efeito temporario na ficha"
                className={`active-toggle ${active ? 'is-active' : ''}`}>
                {active ? 'Ativo' : 'Ligar'}
              </button>
            )}
          </div>
          {tagChips.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              <span className="text-[10px] text-indigo-400/70 font-mono">Efeitos →</span>
              {tagChips.map(chip => (
                <CompactTagChip
                  key={chip.tag}
                  chip={chip}
                  evoBonus={evoNivel > 0 ? evoDelta?.tagBonuses?.find(item => item.tag === chip.tag) : null}
                />
              ))}
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
              {(h.descricao?.includes('<') && h.descricao?.includes('>')) ? (
                <div className="text-txt-dim/90 text-sm pt-3 leading-relaxed break-words" dangerouslySetInnerHTML={{ __html: h.descricao || 'Sem descrição' }} />
              ) : (
                <p className="text-txt-dim/90 text-sm pt-3 leading-relaxed whitespace-pre-wrap break-words">{h.descricao || 'Sem descrição'}</p>
              )}
               <AbilityDetailChips chips={detailChips} />
             </>
           ) : (
             <>
               {(h.descricao?.includes('<') && h.descricao?.includes('>')) ? (
                 <div className="text-txt-dim/90 text-sm pt-3 leading-relaxed break-words" dangerouslySetInnerHTML={{ __html: h.descricao || 'Sem descrição' }} />
               ) : (
                 <p className="text-txt-dim/90 text-sm pt-3 leading-relaxed whitespace-pre-wrap break-words">{h.descricao || 'Sem descrição'}</p>
               )}
               <AbilityDetailChips chips={detailChips} />
              <p className="text-txt-dim/25 text-[10px] pt-1">Clique em ✎ para editar</p>
            </>
          )}
        </div>
      )}
      {editModal && (
        <AbilityEditModal h={h} i={i} canEdit={canEdit} updateHabilidade={updateHabilidade} onClose={() => setEditModal(false)} />
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
    update({ arma: armaId || null, armaRank: 'Comum', armaEquipada: true, armaHabilidades: [] })
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
                        <span className="text-red-400/90 font-mono">{selectedWeapon.dano}{selectedRank.danoBonus ? ` ${selectedRank.danoBonus}` : ''}</span>
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
                <button onClick={() => { update({ arma: null, armaRank: 'Comum', armaEquipada: true, armaHabilidades: [] }); setShowWeaponSelector(false) }}
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
                {(char.armasLendarias || []).length === 0 && (
                  <p className="text-txt-dim/40 text-[10px] italic">Nenhuma arma lendária atribuída a este personagem.</p>
                )}
                {(char.armasLendarias || []).map((lw, li) => (
                  <div key={lw.id || li} className="bg-void/50 border border-amber-400/20 rounded-lg p-2.5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-amber-400 text-sm">★</span>
                      <span className="text-txt-main text-xs font-semibold">{lw.name}</span>
                      <span className="text-[9px] bg-amber-400/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-400/20">{lw.rank || 'Lendária'}</span>
                      {lw.tipo && <span className="text-[9px] text-txt-dim/50">{lw.tipo}</span>}
                    </div>
                    {lw.descricao && <p className="text-txt-dim/70 text-[10px] leading-relaxed">{lw.descricao}</p>}
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
             <span className="text-red-400/90 font-mono">{selectedWeapon.dano}{selectedRank.danoBonus ? ` ${selectedRank.danoBonus}` : ''}</span>
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

function RaceHeritageSectionV2({ char, update }) {
  const race = RACES[char.raca]
  if (!race) return null

  const bonus = calculateRaceBonus(char)
  const subrace = getSelectedSubrace(char)
  const catMeta = RACE_CATEGORIES.find(c => c.id === race.category) || RACE_CATEGORIES[0]

  const statParts = formatRaceBonusParts(bonus)

  return (
    <section>
      <SectionHeader icon={race.icon} title="Heranca Racial" color={catMeta.title.replace('text-', 'bg-').replace(/-\d+$/, '-400')} />

      <div className="space-y-3">
        <div className={`rounded-lg border ${catMeta.color} px-4 py-3`}>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`font-cinzel text-sm font-bold ${catMeta.title}`}>{race.name}</span>
            {subrace && <span className="text-purple-300 text-sm">- {subrace.name}</span>}
            {char.racaDeus && race.deuses?.length > 0 && (
              <span className="text-amber-300 text-xs border border-amber-300/20 rounded px-2 py-0.5">
                {race.deuses.find(d => d.id === char.racaDeus)?.name || char.racaDeus}
              </span>
            )}
            <span className="text-txt-dim text-sm ml-auto">Nv {char.nivel || 1}</span>
          </div>

          {race.desc && <p className="text-txt-dim text-sm leading-relaxed mb-3">{race.desc}</p>}

          <div className="flex flex-wrap gap-2">
            {statParts.length > 0
              ? statParts.map(part => <span key={part} className="race-grant-effect">{part}</span>)
              : <span className="text-txt-dim text-sm">Sem bonus numerico ativo.</span>}
          </div>

          {bonus.notes?.length > 0 && (
            <div className="mt-2 text-sm text-gold/80 bg-gold/5 border border-gold/15 rounded px-3 py-1.5">
              {bonus.notes[0]}
            </div>
          )}
        </div>

        {(race.vantagens?.length > 0 || race.desvantagens?.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-emerald-400/5 border border-emerald-400/15 rounded-lg px-3 py-2">
              <div className="text-emerald-400 text-sm font-semibold mb-1.5">Vantagens-chave</div>
              <ul className="space-y-1">
                {(race.vantagens || []).slice(0, 4).map((v, i) => (
                  <li key={i} className="text-txt-dim text-sm leading-relaxed flex gap-1.5"><span className="text-emerald-400/60 shrink-0">+</span><span>{v}</span></li>
                ))}
              </ul>
            </div>
            <div className="bg-red-400/5 border border-red-400/15 rounded-lg px-3 py-2">
              <div className="text-red-400 text-sm font-semibold mb-1.5">Custos e riscos</div>
              <ul className="space-y-1">
                {(race.desvantagens || []).slice(0, 4).map((d, i) => (
                  <li key={i} className="text-txt-dim text-sm leading-relaxed flex gap-1.5"><span className="text-red-400/60 shrink-0">-</span><span>{d}</span></li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {update && char.raca && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="text-amber-300 text-sm font-semibold">Árvore de Habilidades</div>
              <span className="text-txt-dim text-xs">(constelação racial)</span>
            </div>
            <RaceSkillTree char={char} update={update} />
          </div>
        )}
      </div>
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
      ) : null}
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

function ForgeMasterMenu({ char, update, canEdit, isAdmin = false, onClose }) {
  const [draft, setDraft] = useState({ nome: '', tipo: 'Ativa', alvo: 'Ambos', custo: '', descricao: '' })
  const [grantDraft, setGrantDraft] = useState({ materialId: 'ferro_hefestiano', unlimited: true, limit: 1 })
  const [analyzingId, setAnalyzingId] = useState(null)
  const [error, setError] = useState('')
  const enchantments = char.forgeEnchantments || []
  const materialGrants = Array.isArray(char.forgeMaterialGrants) ? char.forgeMaterialGrants : []
  const availableMaterials = getAvailableForgeMaterials(char || {})
  const canManageMaterials = canEdit && isAdmin

  function patchEnchantments(next) {
    update?.({ forgeEnchantments: next })
  }

  function addEnchantment() {
    if (!draft.nome.trim() && !draft.descricao.trim()) return
    patchEnchantments([
      ...enchantments,
      {
        id: `enc_${Date.now()}`,
        nome: draft.nome.trim() || 'Novo Encantamento',
        tipo: draft.tipo,
        alvo: draft.alvo,
        custo: draft.custo,
        descricao: draft.descricao,
        status: 'Pendente',
        createdAt: new Date().toISOString(),
      },
    ])
    setDraft({ nome: '', tipo: 'Ativa', alvo: 'Ambos', custo: '', descricao: '' })
  }

  function updateEnchant(id, patch) {
    patchEnchantments(enchantments.map(item => item.id === id ? { ...item, ...patch } : item))
  }

  function removeEnchant(id) {
    patchEnchantments(enchantments.filter(item => item.id !== id))
  }

  function patchMaterialGrants(next) {
    update?.({ forgeMaterialGrants: next })
  }

  function upsertMaterialGrant() {
    const materialId = grantDraft.materialId
    if (!SPECIAL_MATERIALS[materialId]) return
    const nextGrant = {
      id: `mat_${materialId}`,
      materialId,
      unlimited: !!grantDraft.unlimited,
      limit: grantDraft.unlimited ? null : Math.max(1, Number(grantDraft.limit) || 1),
      grantedAt: new Date().toISOString(),
    }
    const exists = materialGrants.some(grant => grant.materialId === materialId)
    patchMaterialGrants(exists
      ? materialGrants.map(grant => grant.materialId === materialId ? nextGrant : grant)
      : [...materialGrants, nextGrant]
    )
  }

  function removeMaterialGrant(materialId) {
    patchMaterialGrants(materialGrants.filter(grant => grant.materialId !== materialId))
  }

  async function analyzeEnchant(item) {
    setAnalyzingId(item.id)
    setError('')
    try {
      const result = await analyzeForgeEnchantment(char, item)
      updateEnchant(item.id, {
        ...result,
        nome: result.nome || item.nome,
        tipo: result.tipo || item.tipo,
        alvo: result.alvo || item.alvo,
        custo: result.custo || item.custo,
        descricao: result.descricaoBalanceada || result.descricao || item.descricao,
        status: result.status || 'Aprovada',
        analyzedAt: new Date().toISOString(),
      })
    } catch (err) {
      setError(err.message || 'Nao foi possivel analisar o encantamento.')
    } finally {
      setAnalyzingId(null)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-4xl max-h-[88vh] bg-[#0c0e14] border border-amber-300/25 rounded-2xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-amber-300/15 flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg border border-amber-300/25 bg-amber-300/10 text-amber-200 grid place-items-center">
            <span className="material-symbols-outlined text-[19px]">auto_fix_high</span>
          </div>
          <div className="min-w-0">
            <h3 className="font-cinzel text-amber-100 text-sm uppercase tracking-wider">Mestre Forjador</h3>
            <p className="text-txt-dim/70 text-[11px] mt-1 leading-relaxed">
              Encantamentos funcionam como modulos de evolucao para armas e equipamentos. Ferro Hefestiano fica como material especial: ele nao cria um novo rank, ele reforca o item por cima do rank atual.
            </p>
          </div>
          <button onClick={onClose} className="ml-auto w-8 h-8 grid place-items-center text-txt-dim/50 hover:text-err transition-colors">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="rounded-xl border border-amber-300/15 bg-amber-300/5 p-3 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-amber-200 text-[11px] font-semibold">Materiais Concedidos</span>
                <p className="text-txt-dim/70 text-[11px] mt-1 leading-relaxed">
                  O Mestre define quais materiais o personagem pode usar e quantas criacoes cada material permite. Ferro Hefestiano e o material de maior poder bruto, mas cada material tem uma especialidade.
                </p>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded border border-amber-300/20 bg-amber-300/10 text-amber-100/80">Mestre da Forja</span>
            </div>

            {canManageMaterials && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.values(SPECIAL_MATERIALS).map(mat => {
                  const grant = availableMaterials.find(item => item.material.id === mat.id)
                  const selected = grantDraft.materialId === mat.id
                  return (
                    <div key={mat.id}
                      className={`rounded-xl border p-3 transition-colors ${selected ? 'border-amber-300/45 bg-amber-300/10' : 'border-sep/20 bg-void/35 hover:border-amber-300/25'}`}>
                      <button type="button" onClick={() => setGrantDraft(prev => ({ ...prev, materialId: mat.id, unlimited: grant?.unlimited ?? prev.unlimited, limit: grant?.limit ?? prev.limit }))}
                        className="w-full text-left">
                        <div className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-[17px] text-amber-200 mt-0.5">{getMaterialIcon(mat.id)}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-txt-main text-[12px] font-semibold truncate">{mat.name}</span>
                              {grant && <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-400/10 border border-emerald-400/20 text-emerald-200">concedido</span>}
                            </div>
                            <p className="text-txt-dim/65 text-[10px] mt-1 leading-relaxed">{mat.specialty}</p>
                            <p className="text-amber-100/70 text-[9px] mt-1 font-mono">{mat.damageBonus} dano · +{mat.armorBonus} ARM · +{mat.durabilityBonus} DUR</p>
                          </div>
                        </div>
                      </button>
                      {selected && (
                        <div className="mt-3 grid grid-cols-[1fr_92px_auto] gap-2">
                          <label className="flex items-center gap-2 rounded-lg border border-amber-300/15 bg-black/20 px-2 py-1.5 text-[10px] text-txt-dim">
                            <input type="checkbox" checked={grantDraft.unlimited} onChange={e => setGrantDraft(prev => ({ ...prev, unlimited: e.target.checked }))} className="accent-gold" />
                            Ilimitado
                          </label>
                          <input type="number" min="1" value={grantDraft.limit} disabled={grantDraft.unlimited}
                            onChange={e => setGrantDraft(prev => ({ ...prev, limit: e.target.value }))}
                            className="bg-void/70 border border-sep/35 rounded-lg px-2 py-1.5 text-xs text-txt-main focus:border-amber-300/40 focus:outline-none disabled:opacity-35" />
                          <button onClick={upsertMaterialGrant}
                            className="text-[10px] bg-amber-300 text-void px-3 py-1.5 rounded-lg font-semibold hover:bg-amber-200 transition-colors">
                            Aplicar
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {availableMaterials.length === 0 ? (
                <p className="md:col-span-2 text-txt-dim/45 text-[10px] italic">Nenhum material especial concedido ainda.</p>
              ) : availableMaterials.map(grant => {
                const mat = grant.material
                return (
                  <div key={mat.id} className="rounded-lg border border-amber-300/15 bg-black/15 p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[15px] text-amber-200">{getMaterialIcon(mat.id)}</span>
                      <span className="text-txt-main text-[11px] font-semibold">{mat.name}</span>
                      <span className="ml-auto text-[8px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-txt-dim/75">
                        {grant.unlimited ? 'ilimitado' : `${grant.used}/${grant.limit} usados`}
                      </span>
                      {canManageMaterials && (
                        <button onClick={() => removeMaterialGrant(mat.id)} title="Remover concessao" className="w-6 h-6 grid place-items-center rounded border border-err/20 text-err/55 hover:bg-err/10 hover:text-err">
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      )}
                    </div>
                    <p className="text-txt-dim/65 text-[10px] mt-1 leading-relaxed">{mat.specialty}</p>
                    <p className="text-amber-100/70 text-[9px] mt-1 font-mono">{mat.damageBonus} dano · +{mat.armorBonus} ARM · +{mat.durabilityBonus} DUR</p>
                  </div>
                )
              })}
            </div>
          </div>

          {canEdit && (
            <div className="rounded-xl border border-sep/25 bg-void/45 p-3 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_120px_120px_120px] gap-2">
                <input value={draft.nome} onChange={e => setDraft(prev => ({ ...prev, nome: e.target.value }))} placeholder="Nome do encantamento"
                  className="bg-void/70 border border-sep/35 rounded-lg px-3 py-2 text-xs text-txt-main focus:border-amber-300/40 focus:outline-none" />
                <select value={draft.tipo} onChange={e => setDraft(prev => ({ ...prev, tipo: e.target.value }))}
                  className="bg-[#11141c] border border-amber-300/20 rounded-lg px-2 py-2 text-xs text-txt-main focus:border-amber-300/45 focus:outline-none">
                  <option className="bg-[#11141c] text-txt-main">Ativa</option>
                  <option className="bg-[#11141c] text-txt-main">Passiva</option>
                </select>
                <select value={draft.alvo} onChange={e => setDraft(prev => ({ ...prev, alvo: e.target.value }))}
                  className="bg-[#11141c] border border-amber-300/20 rounded-lg px-2 py-2 text-xs text-txt-main focus:border-amber-300/45 focus:outline-none">
                  <option className="bg-[#11141c] text-txt-main">Ambos</option>
                  <option className="bg-[#11141c] text-txt-main">Arma</option>
                  <option className="bg-[#11141c] text-txt-main">Equipamento</option>
                </select>
                <input value={draft.custo} onChange={e => setDraft(prev => ({ ...prev, custo: e.target.value }))} placeholder="Custo"
                  className="bg-void/70 border border-sep/35 rounded-lg px-3 py-2 text-xs text-txt-main focus:border-amber-300/40 focus:outline-none" />
              </div>
              <textarea value={draft.descricao} onChange={e => setDraft(prev => ({ ...prev, descricao: e.target.value }))} rows={2}
                placeholder="Efeito, gatilho, custo, limites e escala..."
                className="w-full bg-void/70 border border-sep/35 rounded-lg px-3 py-2 text-xs text-txt-main resize-none focus:border-amber-300/40 focus:outline-none" />
              <button onClick={addEnchantment} className="text-[10px] bg-amber-300 text-void px-3 py-1.5 rounded-lg font-semibold hover:bg-amber-200 transition-colors">
                + Criar Encantamento
              </button>
              {error && <p className="text-err text-[10px]">{error}</p>}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {enchantments.length === 0 ? (
              <div className="md:col-span-2 rounded-xl border border-dashed border-amber-300/20 bg-amber-300/5 px-4 py-8 text-center">
                <p className="text-txt-dim/55 text-xs">Nenhum encantamento criado ainda.</p>
              </div>
            ) : enchantments.map(item => (
              <div key={item.id} className="rounded-xl border border-amber-300/18 bg-gradient-to-br from-amber-300/6 to-transparent p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-amber-100 text-sm font-semibold truncate">{item.nome || 'Encantamento'}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded border border-amber-300/20 bg-amber-300/10 text-amber-100/75">{item.tipo || 'Ativa'}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded border border-sky-300/20 bg-sky-300/10 text-sky-100/75">{item.alvo || 'Ambos'}</span>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded border ${item.status === 'Aprovada' ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200' : 'border-warn/20 bg-warn/10 text-warn'}`}>{item.status || 'Pendente'}</span>
                    </div>
                    {item.custo && <p className="text-gold/70 text-[10px] font-mono mt-1">{item.custo}</p>}
                  </div>
                  {canEdit && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => analyzeEnchant(item)} disabled={analyzingId === item.id}
                        title="Analisar com IA"
                        className="w-7 h-7 grid place-items-center rounded border border-indigo-300/25 text-indigo-200/75 hover:bg-indigo-300/10 disabled:opacity-40">
                        <span className="material-symbols-outlined text-[15px]">{analyzingId === item.id ? 'hourglass_top' : 'psychology'}</span>
                      </button>
                      <button onClick={() => removeEnchant(item.id)} title="Remover"
                        className="w-7 h-7 grid place-items-center rounded border border-err/20 text-err/60 hover:bg-err/10 hover:text-err">
                        <span className="material-symbols-outlined text-[15px]">close</span>
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-txt-dim/70 text-[11px] mt-2 leading-relaxed whitespace-pre-wrap">{item.descricao || 'Sem descricao.'}</p>
                {item.feedback && <p className="text-indigo-200/70 text-[10px] mt-2 leading-relaxed border-t border-indigo-300/10 pt-2">{item.feedback}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

function SkillCatalogModal({ assigned, onSelect, onClose }) {
  const [activeCat, setActiveCat] = useState(null)
  const assignedIds = new Set((assigned || []).map(a => a.skillId))
  const filtered = activeCat ? SYSTEM_SKILLS.filter(s => s.category === activeCat) : SYSTEM_SKILLS

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0c0e14] border border-gold/20 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-sep/20 flex items-center gap-3">
          <span className="text-gold font-cinzel text-base tracking-wide">Catálogo de Skills</span>
          <span className="text-[10px] text-txt-dim/50">{SYSTEM_SKILLS.length} skills disponíveis</span>
          <button onClick={onClose} className="ml-auto text-txt-dim/40 hover:text-txt-dim text-lg">✕</button>
        </div>
        <div className="px-6 py-2.5 border-b border-sep/15 flex flex-wrap gap-1.5">
          <button onClick={() => setActiveCat(null)} className={`text-[10px] px-2.5 py-1 rounded-md transition-colors ${!activeCat ? 'bg-gold/15 text-gold border border-gold/30' : 'bg-white/5 text-txt-dim/60 border border-transparent hover:bg-white/10'}`}>Todas</button>
          {SYSTEM_SKILL_CATEGORIES.map(cat => (
            <button key={cat.id} onClick={() => setActiveCat(activeCat === cat.id ? null : cat.id)} className={`text-[10px] px-2.5 py-1 rounded-md transition-colors ${activeCat === cat.id ? 'bg-sky-400/15 text-sky-300 border border-sky-400/30' : 'bg-white/5 text-txt-dim/60 border border-transparent hover:bg-white/10'}`}>{cat.label}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {filtered.map(skill => {
            const isAssigned = assignedIds.has(skill.id)
            const catLabel = SYSTEM_SKILL_CATEGORIES.find(c => c.id === skill.category)?.label || ''
            return (
              <div key={skill.id} className={`rounded-xl border p-4 transition-colors ${isAssigned ? 'border-emerald-400/20 bg-emerald-400/[0.03] opacity-60' : 'border-sep/20 bg-white/[0.02] hover:border-gold/25 hover:bg-gold/[0.02]'}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-txt-main">{skill.name}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-txt-dim/50 border border-sep/15">{catLabel}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-txt-dim/50 border border-sep/15">{skill.rarity}</span>
                    </div>
                    <p className="text-txt-dim/70 text-[11px] mt-1.5 leading-relaxed">{skill.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {skill.effectTypes.map(et => {
                        const eDef = EFFECT_PARAM_DEFS[et]
                        return <span key={et} className="text-[8px] bg-sky-400/10 text-sky-300/80 border border-sky-400/15 rounded px-1.5 py-0.5">{eDef?.label || et}</span>
                      })}
                    </div>
                  </div>
                  <button
                    onClick={() => { if (!isAssigned) onSelect(skill.id) }}
                    disabled={isAssigned}
                    className={`shrink-0 px-4 py-2 rounded-lg text-[11px] font-semibold transition-colors ${isAssigned ? 'bg-emerald-400/10 text-emerald-300/50 cursor-default' : 'bg-gold text-void hover:bg-gold/90'}`}>
                    {isAssigned ? 'Atribuída' : 'Atribuir'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>,
    document.body
  )
}

function SkeletonPointAllocator({ char, update, sk, skelTotal, skelSpent, sysSkillBonuses, skelBase, isAdmin = false }) {
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="bg-emerald-400/10 border border-emerald-400/25 text-emerald-300 rounded-lg px-3 py-1.5 text-[11px] font-medium hover:bg-emerald-400/20 transition-colors flex items-center gap-2">
        <span className="text-emerald-400">◆</span>
        Pontos de Esqueleto: <strong>{skelSpent}/{skelTotal}</strong>
        {skelTotal - skelSpent > 0 && <span className="ml-1 bg-emerald-400/20 text-emerald-300 px-1.5 py-0.5 rounded text-[9px]">+{skelTotal - skelSpent} disponíveis</span>}
        {sysSkillBonuses.skeletonPoints > 0 && <span className="text-[9px] text-emerald-400/60">(inclui +{sysSkillBonuses.skeletonPoints} de Skills)</span>}
      </button>
    )
  }
  const remaining = skelTotal - skelSpent
  const adjustedAttrs = getRaceAdjustedAttrs(char.atributos, sk, char)
  const attrCap = getAttrCap(char.nivel || 1)
  const attrLimit = (attr) => attrCap + (sysSkillBonuses.attrCapBonuses?.[attr] || 0)

  function handleAdd(attr) {
    if (!isAdmin) return
    if (remaining <= 0) return
    if ((adjustedAttrs[attr] || 0) >= attrLimit(attr)) return
    const newVal = (sk[attr] || 0) + 1
    update({ skeletonPoints: { ...sk, [attr]: newVal } })
  }
  function handleRemove(attr) {
    if (!isAdmin) return
    if ((sk[attr] || 0) <= 0) return
    update({ skeletonPoints: { ...sk, [attr]: (sk[attr] || 0) - 1 } })
  }

  return (
    <div className="bg-emerald-400/[0.06] border border-emerald-400/20 rounded-xl px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400">◆</span>
          <span className="text-emerald-300 text-[12px] font-semibold">Pontos de Esqueleto</span>
          {!isAdmin && <span className="text-[9px] px-2 py-0.5 rounded border border-sky-300/20 bg-sky-300/10 text-sky-200/70">travado na ficha final</span>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-emerald-300/70 text-[10px]">{skelBase} base{sysSkillBonuses.skeletonPoints > 0 ? ` + ${sysSkillBonuses.skeletonPoints} Skills` : ''} = <strong className="text-emerald-300">{skelTotal}</strong></span>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${remaining > 0 ? 'bg-emerald-400/15 text-emerald-300' : 'bg-sep/10 text-txt-dim/50'}`}>{remaining} restantes</span>
          <button onClick={() => setOpen(false)} className="text-txt-dim/40 hover:text-txt-dim text-xs ml-2">✕</button>
        </div>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {ATTR_KEYS.map(a => {
          const v = adjustedAttrs[a] || 0
          const pts = sk[a] || 0
          const cap = attrLimit(a)
          const capBonus = sysSkillBonuses.attrCapBonuses?.[a] || 0
          return (
            <div key={a} className="flex flex-col items-center bg-void/40 border border-sep/15 rounded-lg p-2">
              <span className="font-mono text-txt-dim/60 uppercase text-[9px]">{ATTR_ICONS[a]} {a}</span>
              <span className="font-mono text-emerald-300 text-lg">{v}</span>
              {capBonus > 0 && <span className="text-[8px] text-purple-300/70 font-mono">limite +{capBonus}</span>}
              <div className="flex items-center gap-1 mt-1">
                <button onClick={() => handleRemove(a)} disabled={!isAdmin} title={!isAdmin ? 'Somente o Mestre pode ajustar pontos depois da criacao.' : 'Remover ponto'} className="w-5 h-5 rounded bg-void/60 border border-sep/20 text-txt-dim/40 hover:text-err hover:border-err/30 text-[10px] transition-colors disabled:opacity-30 disabled:cursor-not-allowed">-</button>
                <span className="text-[9px] text-txt-dim/40 w-4 text-center">{pts}</span>
                <button onClick={() => handleAdd(a)} disabled={!isAdmin || remaining <= 0 || v >= cap} title={!isAdmin ? 'Somente o Mestre pode ajustar pontos depois da criacao.' : 'Adicionar ponto'} className="w-5 h-5 rounded bg-void/60 border border-sep/20 text-txt-dim/40 hover:text-emerald-300 hover:border-emerald-400/30 text-[10px] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">+</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
