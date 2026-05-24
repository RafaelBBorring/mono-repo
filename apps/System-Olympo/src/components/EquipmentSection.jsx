import { Fragment, useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { WEAPONS, WEAPON_RANKS, WEAPON_ABILITY_COST, LEGENDARY_WEAPONS, WEAPON_POWER_LEVELS, canEquipRank as canUseWeaponRank, getWeaponLimitForLevel, getWeaponWeight, getWeaponRankBonus } from '../data/weapons'
import { RANK_COLORS } from '../data/colors'
import { generateWeaponAbilities, generateEquipmentAbilities, analyzeBalance, suggestItemWeight } from '../services/aiService'
import { getAttrValue } from '../utils/calculator'
import { calcSystemSkillBonuses } from '../utils/systemSkills'
import { getModifier } from '../data/attributes'
import { useAuth } from '../contexts/AuthContext'
import { fetchMysticWeapons } from '../services/alchemyService'
import { getAvailableForgeMaterials, getMaterialDamageBonus, getMaterialArmorBonus, getMaterialDurabilityBonus, getMaterialSpecial, getMaterialLabel, getMaterialIcon } from '../data/materials'
import { ARMOR_ABSORPTION_HARD_CAP, ARMOR_ABSORPTION_SOFT_CAP, ARMOR_TYPES, EQUIPMENT_TYPES, SIMPLE_ITEMS, SET_BONUSES, calcEquipStats, getEquipmentArmorValue, getEquipmentDurabilityCurrent, getEquipmentDurabilityMax, getEquipmentRarity, canEquipRank as canUseEquipRank, getEquipLimitForLevel, estimateEquipmentWeight } from '../data/equipment'

function tagValue(tags = [], key) {
  const found = tags.find(t => t.startsWith(`${key}:`))
  return found ? found.slice(key.length + 1) : ''
}

function getEquipmentType(item = {}) {
  return EQUIPMENT_TYPES.find(t => t.id === item.tipoEquip)
}

function getArmorType(item = {}) {
  return ARMOR_TYPES.find(t => t.id === item.armorType)
}

function isOutfit(item = {}) {
  return item.categoria === 'Traje'
}

const FORGE_RANK_ENCHANTMENT_LIMIT = {
  Comum: 0,
  Incomum: 1,
  Raro: 1,
  'Ã‰pico': 2,
  Heroico: 2,
  Ancestral: 3,
  'MÃ­tico': 3,
  Transcendente: 4,
}

function getForgeEnchantmentLimit(rank, systemSkillBonuses = {}) {
  const skillLimit = systemSkillBonuses.forgeEnchantmentSlots || 0
  const rankIndex = WEAPON_RANKS.findIndex(r => r.rank === rank)
  const rankLimitByIndex = [0, 1, 1, 2, 2, 3, 3, 4]
  const rankLimit = rankLimitByIndex[rankIndex] || 0
  return Math.min(skillLimit, rankLimit)
}

function canUseForgeEnchantment(enc = {}, category = 'Arma') {
  const target = enc.alvo || 'Ambos'
  return target === 'Ambos' || target === category
}

function getMaterialTone(materialId = '') {
  if (materialId === 'ferro_hefestiano') return 'border-amber-300/30 bg-amber-300/10 text-amber-100'
  if (materialId === 'ferro_tartaro') return 'border-indigo-400/30 bg-indigo-400/10 text-indigo-100'
  if (materialId === 'aco_astrano') return 'border-purple-400/30 bg-purple-400/10 text-purple-100'
  if (materialId === 'vibranium') return 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100'
  if (materialId === 'aco_olimpiano') return 'border-yellow-400/30 bg-yellow-400/10 text-yellow-100'
  return 'border-sep/30 bg-void/40 text-txt-main'
}

function ForgeMaterialPicker({ char, value, onChange, category = 'Arma', currentMaterial = '' }) {
  const grants = getAvailableForgeMaterials(char || {})
  const options = grants.filter(grant => grant.available || grant.material.id === value || grant.material.id === currentMaterial)
  const selectedGrant = grants.find(grant => grant.material.id === value)

  return (
    <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.035] p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="text-amber-200 text-[10px] uppercase tracking-wider">Material Especial</span>
          <p className="text-txt-dim/55 text-[10px] mt-0.5">Concessao do Mestre Forjador, consumida por item criado.</p>
        </div>
        {selectedGrant && (
          <span className="text-[9px] px-2 py-1 rounded border border-amber-300/20 bg-black/20 text-amber-100/70">
            {selectedGrant.unlimited ? 'ilimitado' : `${selectedGrant.remaining} restantes`}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button type="button" onClick={() => onChange('')}
          className={`text-left rounded-lg border p-2 transition-colors ${value === '' ? 'border-sep/60 bg-white/5 text-txt-main' : 'border-sep/25 bg-void/30 text-txt-dim/65 hover:border-sep/50'}`}>
          <span className="text-[11px] font-semibold">Material comum</span>
          <p className="text-[9px] text-txt-dim/50 mt-0.5">Sem bonus especial.</p>
        </button>
        {options.map(grant => {
          const mat = grant.material
          const selected = value === mat.id
          const disabled = !grant.available && !selected
          return (
            <button key={mat.id} type="button" disabled={disabled} onClick={() => onChange(mat.id)}
              className={`text-left rounded-lg border p-2.5 transition-colors ${getMaterialTone(mat.id)} ${selected ? 'ring-1 ring-amber-200/35' : disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/[0.045]'}`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[15px]">{getMaterialIcon(mat.id)}</span>
                <span className="text-[11px] font-semibold truncate">{mat.name}</span>
                <span className="ml-auto text-[8px] px-1.5 py-0.5 rounded bg-black/25 border border-white/10">
                  {grant.unlimited ? 'ilimitado' : `${grant.remaining}/${grant.limit}`}
                </span>
              </div>
              <p className="text-[9px] text-current/70 mt-1 leading-snug">{mat.specialty}</p>
              <p className="text-[9px] text-current/65 mt-1 font-mono">
                {category === 'Equipamento' ? `+${mat.armorBonus} ARM · +${mat.durabilityBonus} DUR` : `${mat.damageBonus} dano`}
              </p>
            </button>
          )
        })}
      </div>
      {options.length === 0 && (
        <p className="text-txt-dim/45 text-[10px] italic">Nenhum material especial concedido pelo Mestre ainda.</p>
      )}
    </div>
  )
}

function ForgeEnchantmentPicker({ library, selected, limit, onToggle }) {
  return (
    <div className="rounded-xl border border-amber-300/15 bg-void/45 p-3">
      <div className="flex justify-between items-start gap-3 mb-2">
        <div>
          <span className="text-amber-200 text-[10px] uppercase tracking-wider">Encantamentos</span>
          <p className="text-txt-dim/55 text-[10px] leading-relaxed mt-0.5">Modulos especiais criados pelo Mestre Forjador.</p>
        </div>
        <span className={`text-[10px] font-mono px-2 py-1 rounded border ${selected.length > limit ? 'text-err border-err/25 bg-err/10' : 'text-amber-100/75 border-amber-300/20 bg-amber-300/10'}`}>
          {selected.length}/{limit}
        </span>
      </div>
      {library.length === 0 ? (
        <p className="text-txt-dim/40 text-[10px] italic">Nenhum encantamento criado no Mestre Forjador.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
          {library.map(enc => {
            const isSelected = selected.some(item => item.id === enc.id)
            const locked = !isSelected && selected.length >= limit
            return (
              <button key={enc.id} type="button" onClick={() => !locked && onToggle(enc)} disabled={locked}
                className={`text-left rounded-lg border p-3 transition-colors ${isSelected ? 'border-amber-300/45 bg-amber-300/12' : locked ? 'border-sep/15 bg-void/25 opacity-45 cursor-not-allowed' : 'border-amber-300/18 bg-amber-300/5 hover:border-amber-300/35'}`}>
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-100 text-[12px] font-semibold truncate">{enc.nome || 'Encantamento'}</span>
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-txt-dim/65">{enc.tipo || 'Ativa'}</span>
                  {isSelected && <span className="material-symbols-outlined text-[14px] text-emerald-300 ml-auto">check_circle</span>}
                </div>
                <p className="text-txt-dim/65 text-[10px] mt-1.5 leading-relaxed line-clamp-3">{enc.descricao || 'Sem descricao.'}</p>
                {enc.custo && <p className="text-gold/70 text-[9px] font-mono mt-1">{enc.custo}</p>}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function getMaterialDamageDisplay(item = {}) {
  const bonus = getMaterialDamageBonus(item.materialEspecial)
  return bonus ? ` ${bonus}` : ''
}

function getMaterialArmorDisplay(item = {}) {
  const bonus = getMaterialArmorBonus(item.materialEspecial)
  return bonus ? `+${bonus}` : ''
}

function getMaterialDurabilityDisplay(item = {}) {
  const bonus = getMaterialDurabilityBonus(item.materialEspecial)
  return bonus ? `+${bonus}` : ''
}

function enforceSingleSlot(items, incoming, incomingIdx = -1) {
  const type = getEquipmentType(incoming)
  if (!incoming?.equipado || !type?.slot) return items
  return items.map((item, idx) => {
    if (idx === incomingIdx) return item
    const itemType = getEquipmentType(item)
    if (item?.equipado && itemType?.slot === type.slot) {
      return { ...item, equipado: false }
    }
    return item
  })
}

function getWeaponTriagemBonus(char) {
  const tp = char.triagemPrincipal || ''
  const tn = char.triagemPrincipalNivel || 0
  const st = char.subTriagem || ''
  const sn = char.subTriagemNivel || 0
  const sk = char.skeletonPoints || {}
  const attrs = char.atributos || {}
  const bonuses = []

  if ((tp === 'ATIRADOR' && tn >= 0.2) || (st === 'ATIRADOR' && sn >= 0.2)) {
    const int = getAttrValue(attrs, 'INT', sk, char)
    bonuses.push({ label: `+${int} (INT) — Atirador`, value: int, color: 'text-sky-400' })
  }
  if ((tp === 'TÉCNICO' && tn >= 0.1) || (st === 'TÉCNICO' && sn >= 0.1)) {
    const allVals = ['FOR','DES','CON','INT','APA','AM'].map(a => getAttrValue(attrs, a, sk, char))
    const maior = Math.max(...allVals)
    bonuses.push({ label: `+${maior} (maior attr) — Técnico`, value: maior, color: 'text-amber-400' })
  }
  return bonuses
}

function getAssassinReactionBonus(char) {
  const tp = char.triagemPrincipal || ''
  const tn = char.triagemPrincipalNivel || 0
  const st = char.subTriagem || ''
  const sn = char.subTriagemNivel || 0
  const sk = char.skeletonPoints || {}
  const attrs = char.atributos || {}
  const des = getAttrValue(attrs, 'DES', sk, char)
  let bonus = 0
  if ((tp === 'ASSASSINO' && tn >= 0.2) || (st === 'ASSASSINO' && sn >= 0.2)) {
    bonus = Math.floor(des / 15)
  }
  return bonus
}

export default function EquipmentSection({ char, canEdit, onUpdate, onCharacterUpdate, onDrawerToggle, onTransfer }) {
  const { isAdmin } = useAuth()
  const weapon = WEAPONS.find(w => w.id === char.arma)
  const weaponRank = WEAPON_RANKS.find(r => r.rank === char.armaRank) || WEAPON_RANKS[0]
  const weaponEquipped = !!weapon && char.armaEquipada !== false
  const equipamentos = char.equipamentos || []
  const equipmentStats = calcEquipStats(equipamentos)
  const legendaryAssigned = char.armasLendarias || []
  const [showCreate, setShowCreate] = useState(false)
  const [showCreateOutfit, setShowCreateOutfit] = useState(false)
  const [pieceOutfitId, setPieceOutfitId] = useState(null)
  const [showLegendaryCatalog, setShowLegendaryCatalog] = useState(false)
  const [legendaryForgeItems, setLegendaryForgeItems] = useState([])
  const enrichedLegendary = useMemo(() => {
    return legendaryAssigned.map(item => {
      const forge = legendaryForgeItems.find(fi => fi.id === item.sourceId || fi.id === item.id)
      return forge
        ? { ...item, name: forge.name || item.name, image: forge.image || item.image, tipo: forge.base || item.tipo, power_level: forge.power_level }
        : item
    })
  }, [legendaryAssigned, legendaryForgeItems])
  const [viewIdx, setViewIdx] = useState(null)
  const [viewOutfitIdx, setViewOutfitIdx] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [showWeaponDrawer, setShowWeaponDrawer] = useState(false)
  const [viewLegendaryIdx, setViewLegendaryIdx] = useState(null)
  const editImgRef = useRef(null)

  useEffect(() => {
    let alive = true
    fetchMysticWeapons().then((res) => {
      if (alive) setLegendaryForgeItems(res.data || [])
    })
    return () => { alive = false }
  }, [])

  function openDrawer(idx) { setViewIdx(idx); setViewOutfitIdx(null); setEditMode(false); onDrawerToggle?.(true) }
  function closeDrawer() { setViewIdx(null); setViewOutfitIdx(null); setEditMode(false); onDrawerToggle?.(false) }
  function openOutfitDrawer(idx) { setViewOutfitIdx(idx); setViewIdx(null); setEditMode(false); onDrawerToggle?.(true) }

  function addEquip(item) {
    const next = enforceSingleSlot([...equipamentos, item], item, equipamentos.length)
    onUpdate(next)
    setShowCreate(false)
  }

  function addOutfit(item) {
    onUpdate([...equipamentos, item])
    setShowCreateOutfit(false)
  }

  function addOutfitPiece(outfitId, item) {
    const nextItem = { ...item, trajeId: outfitId }
    const nextType = getEquipmentType(nextItem)
    if (nextType?.slot) {
      const slotTaken = equipamentos.some(piece => piece.trajeId === outfitId && getEquipmentType(piece)?.slot === nextType.slot)
      if (slotTaken) return
    }
    const next = enforceSingleSlot([...equipamentos, nextItem], nextItem, equipamentos.length)
    onUpdate(next)
    setPieceOutfitId(null)
  }

  function updateEquip(idx, patch) {
    const next = [...equipamentos]
    next[idx] = { ...next[idx], ...patch }
    onUpdate(enforceSingleSlot(next, next[idx], idx))
  }

  function setOutfitEquipped(outfitId, equipped) {
    let next = equipamentos.map(item => {
      if (item.id === outfitId && isOutfit(item)) return { ...item, equipado: equipped }
      if (item.trajeId === outfitId && (item.categoria === 'Arma' || item.categoria === 'Equipamento')) {
        return { ...item, equipado: equipped, local: equipped ? 'equipado' : 'guardado' }
      }
      return item
    })

    if (equipped) {
      next.forEach((item, idx) => {
        if (item.trajeId === outfitId && item.equipado) {
          next = enforceSingleSlot(next, item, idx)
        }
      })
    }

    onUpdate(next)
  }

  function dissolveOutfit(outfitId) {
    onUpdate(equipamentos
      .filter(item => item.id !== outfitId)
      .map(item => item.trajeId === outfitId ? { ...item, trajeId: null } : item))
    closeDrawer()
  }

  function removePieceFromOutfit(idx) {
    updateEquip(idx, { trajeId: null })
  }

  function removeEquip(idx) {
    onUpdate(equipamentos.filter((_, i) => i !== idx))
    closeDrawer()
  }

  function updatePrimaryWeapon(patch) {
    onCharacterUpdate?.(patch)
  }

  function removePrimaryWeapon() {
    onCharacterUpdate?.({
      arma: null,
      armaRank: 'Comum',
      armaEquipada: true,
      armaLocal: 'equipado',
      armaHabilidades: [],
      armaNome: '',
      armaImagem: null,
    })
    setShowWeaponDrawer(false)
  }

  const legendaryCatalog = [
    ...LEGENDARY_WEAPONS.map(item => ({
      id: `static_${item.id}`,
      sourceId: item.id,
      name: item.name,
      rank: 'Lendária',
      tipo: item.tipo,
      image: item.image || item.imagem || '',
      descricao: item.descricao || '',
    })),
    ...legendaryForgeItems.map(item => ({
      id: `forge_${item.id}`,
      sourceId: item.id,
      name: item.name,
      rank: 'Lendária',
      tipo: item.base || 'Forja Lendária',
      image: item.image || '',
      descricao: item.effect || '',
      power_level: item.power_level || 'notavel',
    })),
  ]

  function assignLegendary(item) {
    if (!isAdmin || !onCharacterUpdate) return
    const exists = (char.armasLendarias || []).some(lw => lw.id === item.id || lw.sourceId === item.sourceId)
    if (exists) return
    onCharacterUpdate({
      armasLendarias: [...(char.armasLendarias || []), {
        id: item.id,
        sourceId: item.sourceId,
        name: item.name,
        rank: 'Lendária',
        tipo: item.tipo,
        image: item.image || '',
      }],
    })
  }

  function removeLegendary(idx) {
    if (!isAdmin || !onCharacterUpdate) return
    onCharacterUpdate({
      armasLendarias: (char.armasLendarias || []).filter((_, i) => i !== idx),
    })
  }

  function handleDrawerImage(e) {
    const file = e.target.files?.[0]
    if (!file || viewIdx === null) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const size = 128
        const canvas = document.createElement('canvas')
        canvas.width = size; canvas.height = size
        const ctx = canvas.getContext('2d')
        const scale = Math.max(size / img.width, size / img.height)
        const w = img.width * scale; const h = img.height * scale
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
        updateEquip(viewIdx, { imagem: canvas.toDataURL('image/webp', 0.7) })
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const viewing = viewIdx !== null ? equipamentos[viewIdx] : null
  const viewingOutfit = viewOutfitIdx !== null ? equipamentos[viewOutfitIdx] : null
  const outfits = equipamentos.filter(isOutfit)
  const visibleEquipamentos = equipamentos.filter(item => !isOutfit(item) && !item.trajeId)
  const pieceOutfitUsedSlots = pieceOutfitId
    ? equipamentos
        .filter(item => item.trajeId === pieceOutfitId)
        .map(item => getEquipmentType(item)?.slot)
        .filter(Boolean)
    : []
  const naturalArmoryCards = [
    ...(weapon ? [{ key: 'primary_weapon', kind: 'weapon' }] : []),
    ...visibleEquipamentos.map((item) => {
      const idx = equipamentos.indexOf(item)
      return { key: `equip:${item.id || idx}`, kind: 'equip', item, idx }
    }),
    ...enrichedLegendary.map((item, idx) => ({ key: `legendary:${item.id || idx}`, kind: 'legendary', item, idx })),
  ]
  const armoryCardOrder = Array.isArray(char.armoryCardOrder) ? char.armoryCardOrder : []
  const orderedArmoryCards = naturalArmoryCards
    .map((card, naturalIdx) => ({ ...card, naturalIdx, orderIdx: armoryCardOrder.indexOf(card.key) }))
    .sort((a, b) => {
      if (a.orderIdx === -1 && b.orderIdx === -1) return a.naturalIdx - b.naturalIdx
      if (a.orderIdx === -1) return 1
      if (b.orderIdx === -1) return -1
      return a.orderIdx - b.orderIdx
    })
  const armorySlotCount = outfits.length ? Math.max(6, Math.ceil(orderedArmoryCards.length / 2) * 2) : orderedArmoryCards.length

  function moveArmoryCard(cardKey, direction) {
    if (!onCharacterUpdate) return
    const keys = orderedArmoryCards.map(card => card.key)
    const current = keys.indexOf(cardKey)
    const target = current + direction
    if (current === -1 || target < 0 || target >= keys.length) return
    const next = [...keys]
    const moved = next[current]
    next[current] = next[target]
    next[target] = moved
    onCharacterUpdate({ armoryCardOrder: next })
  }

  return (
    <>
      <section>
        <div className="flex items-center gap-2 mb-3">
          <div className="section-header text-primary mb-0 flex-1">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>swords</span>
            Armas e Equipamentos
          </div>
          <button onClick={() => setShowLegendaryCatalog(true)}
            className="text-[9px] border border-lime-300/30 text-lime-300/80 px-2 py-0.5 rounded hover:bg-lime-300/10 hover:text-lime-300 transition-colors shrink-0">
            Armas Lendárias
          </button>
          {canEdit && (
            <>
              <button onClick={() => setShowCreateOutfit(true)}
                className="text-[9px] border border-sky-300/30 text-sky-300/80 px-2 py-0.5 rounded hover:bg-sky-300/10 hover:text-sky-200 transition-colors shrink-0">
                + Traje
              </button>
              <button onClick={() => setShowCreate(true)}
                className="text-[9px] border border-primary/30 text-primary/70 px-2 py-0.5 rounded hover:bg-primary/10 hover:text-primary transition-colors shrink-0">
                + Arma/Equip
              </button>
            </>
          )}
        </div>

        <div className="space-y-2">
          {(equipmentStats.totalArmor || equipmentStats.totalDurabilityMax || equipmentStats.totalCrit || equipmentStats.totalDamage || equipmentStats.activeCategoryBonuses.length > 0 || equipmentStats.activeSetBonuses.length > 0) ? (
            <div className="rounded-lg border border-primary/15 bg-void/45 p-3">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <ArmoryStat
                  label="Armadura"
                  value={equipmentStats.totalArmorRaw > equipmentStats.totalArmor ? `${equipmentStats.totalArmor}/${equipmentStats.totalArmorCap}` : (equipmentStats.totalArmor || 0)}
                  tone={equipmentStats.totalArmorRaw > ARMOR_ABSORPTION_SOFT_CAP ? 'text-amber-300' : 'text-primary'}
                />
                <ArmoryStat label="Durabilidade" value={equipmentStats.totalDurabilityMax ? `${equipmentStats.totalDurability}/${equipmentStats.totalDurabilityMax}` : 0} tone="text-emerald-300" />
                <ArmoryStat label="Crit" value={`${equipmentStats.totalCrit}%`} tone="text-purple-400" />
                <ArmoryStat label="Dano" value={equipmentStats.totalDamage ? `+${equipmentStats.totalDamage}` : 0} tone="text-red-400" />
                <ArmoryStat label="Penalidade" value={equipmentStats.totalSpeedPenalty ? `${equipmentStats.totalSpeedPenalty} DES` : '—'} tone={equipmentStats.totalSpeedPenalty ? 'text-amber-400' : 'text-txt-dim'} />
              </div>
              {equipmentStats.totalArmorRaw > equipmentStats.totalArmor && (
                <p className="mt-2 text-[10px] text-amber-200/75">
                  Absorção bruta {equipmentStats.totalArmorRaw}; limite ativo {ARMOR_ABSORPTION_HARD_CAP}. Acima de {ARMOR_ABSORPTION_SOFT_CAP}, golpes absorvidos desgastam 2 de durabilidade.
                </p>
              )}
              {equipmentStats.activeCategoryBonuses.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {equipmentStats.activeCategoryBonuses.map(({ type, count, bonus }) => (
                    <span key={type.id} className={`text-[11px] px-3 py-1.5 rounded border leading-snug ${type.badgeClass}`}>
                      {type.label} {count}: {bonus}
                    </span>
                  ))}
                </div>
              )}
              {equipmentStats.activeSetBonuses.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {equipmentStats.activeSetBonuses.map(({ type, count, bonus }) => (
                    <span key={`${type.id}-${bonus.pieces}`} className={`text-[11px] px-3 py-1.5 rounded border leading-snug ${type.badgeClass}`}>
                      {type.label} {count}/4: {bonus.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {(weapon || visibleEquipamentos.length > 0 || outfits.length > 0 || enrichedLegendary.length > 0) && (
            <div className={outfits.length ? 'grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)] gap-4 items-start' : ''}>
              {outfits.length > 0 && (
                <div className="space-y-3 lg:sticky lg:top-4">
                  {outfits.map((item) => {
                    const idx = equipamentos.indexOf(item)
                    const pieces = equipamentos.filter(piece => piece.trajeId === item.id)
                    return (
                      <OutfitPortraitCard
                        key={item.id || idx}
                        item={item}
                        pieces={pieces}
                        canEdit={canEdit}
                        onToggle={() => setOutfitEquipped(item.id, !item.equipado)}
                        onClick={() => openOutfitDrawer(idx)}
                      />
                    )
                  })}
                </div>
              )}
              <div className={outfits.length ? 'grid grid-cols-2 gap-3 auto-rows-min content-start' : 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3'}>
                {orderedArmoryCards.map((card, cardIdx) => {
                  const cardNode = card.kind === 'weapon' ? (
                    <WeaponCard
                      weapon={weapon}
                      rank={weaponRank}
                      habilidades={char.armaHabilidades || []}
                      triagemBonus={getWeaponTriagemBonus(char)}
                      image={char.armaImagem}
                      displayName={char.armaNome || weapon.name}
                      equipped={weaponEquipped}
                      canEdit={canEdit}
                      onToggleEquipped={() => updatePrimaryWeapon({ armaEquipada: !weaponEquipped, armaLocal: weaponEquipped ? 'guardado' : 'equipado' })}
                      onClick={() => setShowWeaponDrawer(true)}
                    />
                  ) : card.kind === 'equip' ? (
                    <EquipCard
                      item={card.item}
                      canEdit={canEdit}
                      onToggle={() => updateEquip(card.idx, { equipado: !card.item.equipado, local: card.item.equipado ? 'guardado' : 'equipado' })}
                      onClick={() => openDrawer(card.idx)}
                    />
                  ) : (
                    <LegendaryAssignedCard item={card.item} onClick={() => setViewLegendaryIdx(card.idx)} />
                  )

                  return outfits.length ? (
                    <ArmoryGridSlot
                      key={card.key}
                      canMove={canEdit && !!onCharacterUpdate && orderedArmoryCards.length > 1}
                      canMoveBack={cardIdx > 0}
                      canMoveForward={cardIdx < orderedArmoryCards.length - 1}
                      onMoveBack={() => moveArmoryCard(card.key, -1)}
                      onMoveForward={() => moveArmoryCard(card.key, 1)}
                    >
                      {cardNode}
                    </ArmoryGridSlot>
                  ) : (
                    <Fragment key={card.key}>{cardNode}</Fragment>
                  )
                })}
                {outfits.length > 0 && Array.from({ length: Math.max(0, armorySlotCount - orderedArmoryCards.length) }).map((_, idx) => (
                  <ArmoryEmptySlot key={`empty-slot-${idx}`} />
                ))}
              </div>
            </div>
          )}

          {!weapon && visibleEquipamentos.length === 0 && outfits.length === 0 && enrichedLegendary.length === 0 && (
            <p className="text-txt-dim/50 text-[11px] italic">Nenhum equipamento</p>
          )}
        </div>
      </section>

      {showCreate && createPortal(
        <EquipCreateModal char={char} onSave={addEquip} onClose={() => setShowCreate(false)} />,
        document.body
      )}

      {showCreateOutfit && createPortal(
        <OutfitCreateModalClean onSave={addOutfit} onClose={() => setShowCreateOutfit(false)} />,
        document.body
      )}

      {pieceOutfitId && createPortal(
        <EquipCreateModal
          char={char}
          onSave={(item) => addOutfitPiece(pieceOutfitId, item)}
          onClose={() => setPieceOutfitId(null)}
          initialCategory="Equipamento"
          lockCategory
          title="Nova Peca do Traje"
          unavailableSlots={pieceOutfitUsedSlots}
        />,
        document.body
      )}

      {showLegendaryCatalog && createPortal(
        <LegendaryCatalogModal
          items={legendaryCatalog}
          assigned={enrichedLegendary}
          isAdmin={isAdmin}
          onAssign={assignLegendary}
          onClose={() => setShowLegendaryCatalog(false)}
        />,
        document.body
      )}

      {viewing && createPortal(
        <EquipDrawer
          item={viewing}
          char={char}
          canEdit={canEdit}
          editMode={editMode}
          onEdit={() => setEditMode(true)}
          onCancelEdit={() => setEditMode(false)}
          onSaveEdit={(patch) => updateEquip(viewIdx, patch)}
          onDelete={() => removeEquip(viewIdx)}
          onTransfer={onTransfer ? () => onTransfer('equipamentos', viewIdx) : null}
          onClose={closeDrawer}
          onImageChange={handleDrawerImage}
          imgRef={editImgRef}
        />,
        document.body
      )}

      {viewingOutfit && createPortal(
        <OutfitDrawerClean
          outfit={viewingOutfit}
          pieces={equipamentos
            .map((item, idx) => ({ item, idx }))
            .filter(({ item }) => item.trajeId === viewingOutfit.id)}
          canEdit={canEdit}
          onAddPiece={() => setPieceOutfitId(viewingOutfit.id)}
          onToggleOutfit={() => setOutfitEquipped(viewingOutfit.id, !viewingOutfit.equipado)}
          onTogglePiece={(idx, piece) => updateEquip(idx, { equipado: !piece.equipado, local: piece.equipado ? 'guardado' : 'equipado' })}
          onOpenPiece={(idx) => openDrawer(idx)}
          onRemovePiece={removePieceFromOutfit}
          onDissolve={() => dissolveOutfit(viewingOutfit.id)}
          onClose={closeDrawer}
        />,
        document.body
      )}

      {showWeaponDrawer && weapon && createPortal(
        <WeaponDrawer
          weapon={weapon}
          rank={weaponRank}
          habilidades={char.armaHabilidades || []}
          char={char}
          canEdit={canEdit}
          onUpdate={updatePrimaryWeapon}
          onDelete={removePrimaryWeapon}
          onTransfer={onTransfer ? () => onTransfer('armaPrincipal', null) : null}
          onClose={() => setShowWeaponDrawer(false)}
        />,
        document.body
      )}

      {viewLegendaryIdx !== null && createPortal(
        <LegendaryWeaponDrawer
          item={enrichedLegendary[viewLegendaryIdx]}
          forgeItem={legendaryForgeItems.find(fi => fi.id === (enrichedLegendary[viewLegendaryIdx]?.sourceId || enrichedLegendary[viewLegendaryIdx]?.id)) || null}
          canRemove={canEdit && isAdmin}
          onRemove={() => { removeLegendary(viewLegendaryIdx); setViewLegendaryIdx(null) }}
          onClose={() => setViewLegendaryIdx(null)}
        />,
        document.body
      )}
    </>
  )
}

function ArmoryStat({ label, value, tone }) {
  return (
    <div className="bg-black/20 border border-white/5 rounded px-2 py-1.5">
      <span className="block text-[8px] uppercase tracking-wider text-txt-dim/45">{label}</span>
      <strong className={`block text-sm font-mono ${tone}`}>{value || 0}</strong>
    </div>
  )
}

function ArmoryGridSlot({ children, canMove, canMoveBack, canMoveForward, onMoveBack, onMoveForward }) {
  return (
    <div className="group relative aspect-[1.55/1] min-h-[112px] rounded-lg border border-sep/35 bg-void/25 p-2 overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
      {canMove && (
        <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button type="button" onClick={onMoveBack} disabled={!canMoveBack}
            title="Mover para antes"
            className="w-6 h-6 rounded border border-primary/25 bg-deep/90 text-primary/80 grid place-items-center hover:text-primary disabled:opacity-25 disabled:hover:text-primary/80">
            <span className="material-symbols-outlined text-[15px]">arrow_back</span>
          </button>
          <button type="button" onClick={onMoveForward} disabled={!canMoveForward}
            title="Mover para depois"
            className="w-6 h-6 rounded border border-primary/25 bg-deep/90 text-primary/80 grid place-items-center hover:text-primary disabled:opacity-25 disabled:hover:text-primary/80">
            <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
          </button>
        </div>
      )}
      <div className="relative z-[1] h-full flex items-start">
        {children}
      </div>
    </div>
  )
}

function ArmoryEmptySlot() {
  return (
    <div className="aspect-[1.55/1] min-h-[112px] rounded-lg border border-dashed border-sep/25 bg-black/10" />
  )
}

function OutfitCard({ item, pieces = [], canEdit, onToggle, onClick }) {
  const stats = calcEquipStats(pieces.map(piece => ({ ...piece, equipado: true })))
  const equippedPieces = pieces.filter(piece => piece.equipado).length
  const completeSlots = new Set(pieces.map(piece => getEquipmentType(piece)?.slot).filter(Boolean)).size
  const previewPieces = pieces.slice(0, 4)
  return (
    <div className="relative rounded-lg border border-sky-300/35 bg-sky-300/6 text-sky-100 shadow-lg shadow-sky-300/8 p-2.5 overflow-hidden">
      <div className="armory-rank-rail" style={{ background: 'rgba(125, 211, 252, 0.55)' }} />
      <button type="button" onClick={onToggle} disabled={!canEdit}
        title={item.equipado ? 'Desequipar traje' : 'Equipar traje'}
        className={`w-full h-[320px] lg:h-[360px] xl:h-[390px] rounded-lg border bg-sky-300/10 text-sky-200 border-sky-300/25 overflow-hidden transition-transform ${canEdit ? 'hover:scale-[1.01] cursor-pointer' : 'cursor-default'} ${item.equipado ? 'ring-1 ring-emerald-300/50' : 'opacity-90'}`}>
        {item.imagem ? <img src={item.imagem} alt="" className="w-full h-full object-cover object-top" /> : (
          <span className="w-full h-full grid place-items-center">
            <span className="material-symbols-outlined text-sky-200/70 text-4xl">checkroom</span>
          </span>
        )}
      </button>
      <button type="button" onClick={onClick} className="flex-1 min-w-0 text-left">
        <span className="text-txt-main text-sm font-semibold truncate block">{item.nome || 'Traje'}</span>
        <span className="text-sky-200/65 text-[11px] mt-0.5 block">{pieces.length} pecas · {equippedPieces} equipadas · {completeSlots}/4 slots</span>
        <span className="text-emerald-300/75 text-[10px] font-mono mt-1 block">
          ARM {stats.totalArmor || 0} · DUR {stats.totalDurabilityMax ? `${stats.totalDurability}/${stats.totalDurabilityMax}` : '0'}
        </span>
        <span className={`text-[9px] mt-1 inline-flex px-1.5 py-0.5 rounded border ${item.equipado ? 'text-emerald-300 border-emerald-400/20 bg-emerald-400/10' : 'text-txt-dim/50 border-sep/30 bg-void/40'}`}>
          {item.equipado ? 'traje equipado' : 'traje guardado'}
        </span>
      </button>
    </div>
  )
}

function OutfitPortraitCard({ item, pieces = [], canEdit, onToggle, onClick }) {
  const stats = calcEquipStats(pieces.map(piece => ({ ...piece, equipado: true })))
  const equippedPieces = pieces.filter(piece => piece.equipado).length
  const completeSlots = new Set(pieces.map(piece => getEquipmentType(piece)?.slot).filter(Boolean)).size
  const previewPieces = pieces.slice(0, 4)
  return (
    <div className="relative rounded-lg border border-sky-300/35 bg-sky-300/6 text-sky-100 shadow-lg shadow-sky-300/8 p-3 overflow-hidden">
      <div className="armory-rank-rail" style={{ background: 'rgba(125, 211, 252, 0.55)' }} />
      <button type="button" onClick={onToggle} disabled={!canEdit}
        title={item.equipado ? 'Desequipar traje' : 'Equipar traje'}
        className={`w-full aspect-[2/3] rounded-lg border bg-sky-300/10 text-sky-200 border-sky-300/25 overflow-hidden transition-transform ${canEdit ? 'hover:scale-[1.01] cursor-pointer' : 'cursor-default'} ${item.equipado ? 'ring-1 ring-emerald-300/50' : 'opacity-90'}`}>
        {item.imagem ? <img src={item.imagem} alt="" className="w-full h-full object-cover object-top" /> : (
          <span className="w-full h-full grid place-items-center">
            <span className="material-symbols-outlined text-sky-200/70 text-4xl">checkroom</span>
          </span>
        )}
      </button>
      <div className="mt-3">
        <button type="button" onClick={onClick} className="w-full min-w-0 text-left">
          <span className="text-txt-main text-sm font-semibold truncate block">{item.nome || 'Traje'}</span>
          <span className="text-sky-200/65 text-[11px] mt-0.5 block">{pieces.length} pecas - {equippedPieces} equipadas - {completeSlots}/4 slots</span>
          <span className="text-emerald-300/75 text-[10px] font-mono mt-1 block">
            ARM {stats.totalArmor || 0} - DUR {stats.totalDurabilityMax ? `${stats.totalDurability}/${stats.totalDurabilityMax}` : '0'}
          </span>
        </button>
        {previewPieces.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {previewPieces.map((piece, index) => {
              const type = getEquipmentType(piece)
              return (
                <span key={piece.id || index} className="text-[8px] px-1.5 py-0.5 rounded border border-sky-300/15 bg-sky-300/8 text-sky-100/75">
                  {type?.label || piece.nome || 'Peca'}
                </span>
              )
            })}
          </div>
        )}
        <span className={`text-[9px] mt-2 inline-flex px-1.5 py-0.5 rounded border ${item.equipado ? 'text-emerald-300 border-emerald-400/20 bg-emerald-400/10' : 'text-txt-dim/50 border-sep/30 bg-void/40'}`}>
          {item.equipado ? 'traje equipado' : 'traje guardado'}
        </span>
      </div>
    </div>
  )
}

function WeaponCard({ weapon, rank, habilidades, triagemBonus = [], image, displayName, equipped, canEdit, onToggleEquipped, onClick }) {
  const rc = RANK_COLORS[rank.rank] || RANK_COLORS.Comum
  return (
    <div
      className={`armory-card armory-card-weapon w-full rounded-xl border-2 shadow-lg ${rc.border} ${rc.bg} ${rc.text} ${rc.glow} p-4 text-left transition-all hover:shadow-xl`}>
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1">
          <button type="button" onClick={onToggleEquipped} disabled={!canEdit}
            title={equipped ? 'Desequipar arma' : 'Equipar arma'}
            className={`w-16 h-16 rounded-xl border-2 transition-all ${canEdit ? 'hover:scale-[1.03] cursor-pointer' : 'cursor-default'} ${equipped ? 'ring-2 ring-emerald-400/50' : 'opacity-70'}`}>
            {image ? <img src={image} alt="" className="w-full h-full object-cover rounded-lg" /> : <span className="text-3xl">⚔️</span>}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-txt-main text-sm font-bold">{displayName || weapon.name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${rc.badge} ${equipped ? 'ring-1 ring-' + rc.border : ''}`}>{rank.rank}</span>
              </div>
              <span className={`text-[10px] px-3 py-1 rounded font-mono border ${rc.border} ${rc.bg}`}>{weapon.dano}{rank.danoBonus ? ` + ${rank.danoBonus}` : ''}</span>
            </div>
            {habilidades && habilidades.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {habilidades.map(h => (
                  <span key={h.id} className={`text-[10px] px-2 py-0.5 rounded border ${rc.border} ${rc.bg} opacity-80`}>{h.nome}</span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button type="button" onClick={onClick} className="flex-1 text-left">
              <span className={`text-sm font-semibold ${equipped ? 'text-emerald-400' : 'text-txt-main'}`}>{equipped ? 'EQUIPADA' : 'GUARDADA'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function WeaponDrawer({ weapon, rank, habilidades, char, canEdit, onUpdate, onDelete, onTransfer, onAdjustImage, onClose }) {
  const { isAdmin } = useAuth()
  const rc = RANK_COLORS[rank.rank] || RANK_COLORS.Comum
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState(char.armaNome || weapon.name)
  const [editRank, setEditRank] = useState(rank.rank)
  const [editHabilidades, setEditHabilidades] = useState(habilidades || [])
  const [editEquipped, setEditEquipped] = useState(char.armaEquipada !== false)
  const imageRef = useRef(null)
  const triagemBonus = getWeaponTriagemBonus(char)
  const assassinBonus = getAssassinReactionBonus(char)
  const editRankDef = WEAPON_RANKS.find(r => r.rank === editRank) || rank
  const editUsedSlots = editHabilidades.reduce((s, h) => s + (WEAPON_ABILITY_COST[h.potencia] || 0), 0)
  const systemSkillBonuses = calcSystemSkillBonuses(char || {})
  const weaponRankAllowance = getWeaponRankBonus(char) + (systemSkillBonuses.forgeRankBonus || 0)

  function updateWeaponEquipped(equipped) {
    onUpdate?.({
      armaLocal: equipped ? 'equipado' : 'guardado',
      armaEquipada: equipped,
    })
  }

  async function handleAnalyze(dir) {
    setAnalyzing(true)
    setError('')
    try {
      const data = await analyzeBalance(char, dir || null)
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  function handlePrimaryImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const size = 256
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        const scale = Math.max(size / img.width, size / img.height)
        const w = img.width * scale
        const h = img.height * scale
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
        onUpdate?.({ armaImagem: canvas.toDataURL('image/webp', 0.78) })
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function saveEdit() {
    onUpdate?.({
      armaNome: editName,
      armaRank: isAdmin ? editRank : rank.rank,
      armaEquipada: editEquipped,
      armaLocal: editEquipped ? 'equipado' : 'guardado',
      armaHabilidades: editHabilidades.filter(h => h.nome?.trim() || h.descricao?.trim()),
    })
    setEditMode(false)
  }

  function addWeaponHab() {
    if (editUsedSlots >= editRankDef.slots) return
    setEditHabilidades([...editHabilidades, { nome: '', potencia: 'Fraca', descricao: '', tipo: 'Ativa', custo: '' }])
  }

  function updateWeaponHab(i, patch) {
    const next = [...editHabilidades]
    next[i] = { ...next[i], ...patch }
    setEditHabilidades(next)
  }

  function removeWeaponHab(i) {
    setEditHabilidades(editHabilidades.filter((_, idx) => idx !== i))
  }

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-[420px] bg-deep border-l border-primary/15 shadow-2xl shadow-black/60 flex flex-col">
        <div className="px-5 py-4 border-b border-sep/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg ${rc.badge} border flex items-center justify-center text-base`}>⚔</div>
            <div>
              <h3 className="text-on-surface text-sm font-semibold">{char.armaNome || weapon.name}</h3>
              <span className="text-txt-dim text-[10px]">{weapon.attr} · {weapon.dano}{rank.danoBonus ? ` ${rank.danoBonus}` : ''}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {canEdit && (
              <>
                <button onClick={() => setEditMode(!editMode)}
                  className="w-8 h-8 grid place-items-center rounded border border-gold/25 text-gold hover:bg-gold/10 transition-colors"
                  title={editMode ? 'Cancelar edição' : 'Editar arma'}>
                  <span className="material-symbols-outlined text-[16px]">{editMode ? 'close' : 'edit'}</span>
                </button>
                <button onClick={onDelete}
                  className="w-8 h-8 grid place-items-center rounded border border-err/25 text-err hover:bg-err/10 transition-colors"
                  title="Remover arma">
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </>
            )}
            <button onClick={onClose} className="w-8 h-8 grid place-items-center text-txt-dim hover:text-err text-sm transition-colors">✕</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {canEdit && !editMode && (
            <div className="rounded-lg border border-primary/15 bg-void/45 p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-txt-dim/50 text-[9px] uppercase tracking-wider">Estado da arma</span>
                  <p className="text-txt-main text-xs mt-0.5">{char.armaEquipada !== false ? 'Equipada' : 'Desequipada'}</p>
                </div>
                <span className={`text-[9px] px-2 py-1 rounded border ${char.armaEquipada !== false ? 'text-emerald-300 border-emerald-400/25 bg-emerald-400/10' : 'text-txt-dim/60 border-sep/30 bg-black/20'}`}>
                  {char.armaEquipada !== false ? 'conta carga' : 'fora da carga'}
                </span>
              </div>
              <button type="button"
                onClick={() => updateWeaponEquipped(char.armaEquipada === false)}
                className={`w-full text-[10px] px-3 py-2 rounded-lg border transition-colors ${char.armaEquipada !== false ? 'border-emerald-400/30 text-emerald-300 bg-emerald-400/10 hover:bg-emerald-400/15' : 'border-sky-400/30 text-sky-300 bg-sky-400/10 hover:bg-sky-400/15'}`}>
                {char.armaEquipada !== false ? 'Desequipar' : 'Equipar'}
              </button>
              {onTransfer && (
                <button type="button" onClick={onTransfer}
                  className="w-full text-[10px] px-3 py-2 rounded-lg border border-sky-400/30 text-sky-300 bg-sky-400/10 hover:bg-sky-400/15 transition-colors">
                  Transferir arma
                </button>
              )}
              {char.armaImagem && onAdjustImage && (
                <button type="button" onClick={onAdjustImage}
                  className="w-full text-[10px] px-3 py-2 rounded-lg border border-purple-400/30 text-purple-300 bg-purple-400/10 hover:bg-purple-400/15 transition-colors">
                  Ajustar Imagem
                </button>
              )}
            </div>
          )}

          {editMode && canEdit && (
            <div className="bg-void/50 border border-gold/20 rounded-lg p-3 space-y-3">
              <div className="flex items-center gap-3">
                <button onClick={() => imageRef.current?.click()}
                  className="w-20 h-20 rounded-lg border border-sep/40 flex items-center justify-center hover:border-gold/40 transition-colors overflow-hidden bg-void/50 shrink-0">
                  {char.armaImagem ? <img src={char.armaImagem} alt="" className="w-full h-full object-cover" /> : <span className="text-txt-dim/40 text-xs">IMG</span>}
                </button>
                <input ref={imageRef} type="file" accept="image/*" onChange={handlePrimaryImage} className="hidden" />
                <div className="flex-1 space-y-2">
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nome da arma"
                    className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-xs text-txt-main focus:border-gold/40 focus:outline-none" />
                  <div className="flex flex-wrap gap-1">
                    {WEAPON_RANKS.map(r => {
                      const c = RANK_COLORS[r.rank]
                      const allowed = canUseWeaponRank(char.nivel || 1, r.rank, weaponRankAllowance)
                      return (
                        <button key={r.rank} onClick={() => isAdmin && allowed && setEditRank(r.rank)} disabled={!isAdmin || !allowed}
                          title={!allowed ? `Requer nível maior. Limite atual: ${getWeaponLimitForLevel(char.nivel || 1).maxRank}` : r.rank}
                          className={`text-[9px] px-2 py-0.5 rounded border transition-colors ${editRank === r.rank ? `${c.badge}` : allowed ? 'border-sep/30 text-txt-dim/50 hover:border-sep/60' : 'border-sep/10 text-txt-dim/20 cursor-not-allowed'}`}>
                          {r.rank}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-txt-dim/45 text-[9px]">Limite atual: {getWeaponLimitForLevel(char.nivel || 1).maxRank}. Ranks acima do nivel ficam bloqueados.</p>
                  <label className="flex items-center gap-2 text-[10px] text-txt-dim cursor-pointer">
                    <input type="checkbox" checked={editEquipped} onChange={e => setEditEquipped(e.target.checked)} className="accent-gold" />
                    Equipada
                  </label>
                </div>
              </div>
              <div className="border-t border-sep/20 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-txt-dim text-[10px] uppercase tracking-wider">Habilidades da arma</span>
                  <span className={`text-[10px] font-mono ${editUsedSlots > editRankDef.slots ? 'text-err' : 'text-txt-dim'}`}>Slots {editUsedSlots}/{editRankDef.slots}</span>
                </div>
                <div className="space-y-2">
                  {editHabilidades.map((h, i) => (
                    <div key={i} className="bg-void/45 border border-sep/30 rounded-lg p-2 space-y-1.5">
                      <div className="flex gap-1.5">
                        <input type="text" value={h.nome || ''} onChange={e => updateWeaponHab(i, { nome: e.target.value })} placeholder="Nome"
                          className="min-w-0 flex-1 bg-void/60 border border-sep/40 rounded px-2 py-1 text-[10px] text-txt-main focus:border-gold/40 focus:outline-none" />
                        <select value={h.potencia || 'Fraca'} onChange={e => updateWeaponHab(i, { potencia: e.target.value })}
                          className="bg-void/60 border border-sep/40 rounded px-2 py-1 text-[10px] text-txt-main">
                          {Object.entries(WEAPON_ABILITY_COST).map(([label, cost]) => <option key={label} value={label}>{label} ({cost})</option>)}
                        </select>
                        <select value={h.tipo || 'Ativa'} onChange={e => updateWeaponHab(i, { tipo: e.target.value })}
                          className="bg-void/60 border border-sep/40 rounded px-2 py-1 text-[10px] text-txt-main">
                          <option value="Ativa">Ativa</option>
                          <option value="Passiva">Passiva</option>
                        </select>
                        <button onClick={() => removeWeaponHab(i)} className="text-err/55 hover:text-err text-xs px-1 shrink-0">✕</button>
                      </div>
                      <textarea value={h.descricao || ''} onChange={e => updateWeaponHab(i, { descricao: e.target.value })} placeholder="Descrição da habilidade..." rows={2}
                        className="w-full bg-void/60 border border-sep/40 rounded px-2 py-1 text-[9px] text-txt-main resize-none focus:border-gold/40 focus:outline-none leading-relaxed" />
                      <input type="text" value={h.custo || ''} onChange={e => updateWeaponHab(i, { custo: e.target.value })} placeholder="Custo"
                        className="w-full bg-void/60 border border-sep/40 rounded px-2 py-1 text-[10px] text-txt-main focus:border-gold/40 focus:outline-none" />
                    </div>
                  ))}
                  {editUsedSlots < editRankDef.slots && (
                    <button onClick={addWeaponHab} className="text-gold/70 hover:text-gold text-[10px]">+ Habilidade</button>
                  )}
                  {editRankDef.slots === 0 && (
                    <p className="text-txt-dim/40 text-[10px] italic">Este rank não concede slots de habilidade.</p>
                  )}
                </div>
              </div>
              <button onClick={saveEdit} disabled={editUsedSlots > editRankDef.slots}
                className="text-[10px] bg-gold text-void px-3 py-1.5 rounded-lg hover:bg-gold-light transition-colors font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
                Salvar arma
              </button>
            </div>
          )}

          {char.armaImagem && !editMode && (
            <img src={char.armaImagem} alt="" className={`w-full aspect-[16/9] rounded-lg object-cover border ${rc.border}`} />
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className={`bg-void/50 border rounded-lg px-3 py-2 ${rc.border}`}>
              <span className="text-txt-dim/50 text-[9px] uppercase">Dano</span>
              <p className="text-red-400/90 text-sm font-mono mt-0.5">{weapon.dano}{rank.danoBonus ? ` ${rank.danoBonus}` : ''}</p>
            </div>
            <div className="bg-void/50 border border-sep/30 rounded-lg px-3 py-2">
              <span className="text-txt-dim/50 text-[9px] uppercase">Atributo</span>
              <p className="text-txt-main text-sm font-mono mt-0.5">{weapon.attr}</p>
            </div>
            <div className="bg-void/50 border border-sep/30 rounded-lg px-3 py-2">
              <span className="text-txt-dim/50 text-[9px] uppercase">Peso</span>
              <p className="text-txt-main text-sm font-mono mt-0.5">{getWeaponWeight(char.arma, char.armaNome || weapon.name).toFixed(1)} kg</p>
            </div>
            <div className="bg-void/50 border border-sep/30 rounded-lg px-3 py-2">
              <span className="text-txt-dim/50 text-[9px] uppercase">Slots</span>
              <p className="text-gold text-sm font-mono mt-0.5">{rank.slots}</p>
            </div>
          </div>

          {triagemBonus.length > 0 && (
            <div className="bg-void/40 border border-gold/20 rounded-lg px-3 py-2.5">
              <span className="text-gold/70 text-[9px] uppercase tracking-wider">Bônus de Triagem no Dano</span>
              <div className="space-y-1 mt-1.5">
                {triagemBonus.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`text-sm font-mono font-semibold ${b.color}`}>+{b.value}</span>
                    <span className="text-txt-dim/70 text-[10px]">{b.label.split(' — ')[1] || ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {assassinBonus > 0 && (
            <div className="bg-void/40 border border-purple-400/20 rounded-lg px-3 py-2.5">
              <span className="text-purple-400/70 text-[9px] uppercase tracking-wider">Bônus de Reações (Assassino)</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-purple-400 text-sm font-mono font-semibold">+{assassinBonus}</span>
                <span className="text-txt-dim/70 text-[10px]">reações extras (a cada 15 DES)</span>
              </div>
            </div>
          )}

          {weapon.mec && (
            <div className="bg-void/50 border border-sep/30 rounded-lg px-3 py-2">
              <span className="text-txt-dim/50 text-[9px] uppercase">Mecânica Única</span>
              <p className="text-txt-dim/80 text-xs mt-0.5 leading-relaxed">{weapon.mec}</p>
            </div>
          )}

          {habilidades.length > 0 && (
            <div>
              <span className="text-txt-dim/50 text-[9px] uppercase tracking-wider">Habilidades da Arma</span>
              <div className="space-y-2 mt-2">
                {habilidades.map((h, i) => (
                  <div key={i} className={`bg-void/50 border rounded-lg px-3 py-2.5 ${rc.border}`}>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-txt-main text-xs font-semibold">{h.nome || 'Hab'}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-sep/20 text-txt-dim/70 border border-sep/30">{h.potencia}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border ${h.tipo === 'Passiva' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                        {h.tipo || 'Ativa'}
                      </span>
                      {h.custo && <span className="text-[9px] text-gold/80 ml-auto font-mono">{h.custo}</span>}
                    </div>
                    {h.descricao && <p className="text-txt-dim/70 text-[11px] leading-relaxed">{h.descricao}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-sep/20 pt-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-indigo-400 text-xs">✦</span>
              <span className="text-txt-dim text-[10px] uppercase tracking-wider">Análise de Balanceamento</span>
            </div>
            <button
              onClick={() => handleAnalyze(null)}
              disabled={analyzing}
              className="w-full bg-indigo-500/10 border border-indigo-400/30 text-indigo-400 text-[10px] px-3 py-2 rounded hover:bg-indigo-500/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {analyzing && <span className="animate-spin inline-block w-3 h-3 border border-indigo-400/40 border-t-indigo-400 rounded-full" />}
              {analyzing ? 'Analisando...' : '✦ Analisar Habilidades com IA'}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleAnalyze('buff')}
                disabled={analyzing}
                className="bg-emerald-500/10 border border-emerald-400/30 text-emerald-400 text-[10px] px-3 py-1.5 rounded hover:bg-emerald-500/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[12px]">arrow_upward</span>
                Buff
              </button>
              <button
                onClick={() => handleAnalyze('nerf')}
                disabled={analyzing}
                className="bg-red-500/10 border border-red-400/30 text-red-400 text-[10px] px-3 py-1.5 rounded hover:bg-red-500/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-[12px]">arrow_downward</span>
                Nerf
              </button>
            </div>
            {error && <p className="text-err text-[10px] mt-2">{error}</p>}
            {result && (
              <div className="mt-3 space-y-2">
                {result.habilidades?.map((h, i) => (
                  <div key={i} className="bg-void/50 border border-sep/30 rounded-lg px-2.5 py-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-txt-main text-[11px] font-semibold">{h.nome}</span>
                      <span className="text-[9px] bg-indigo-400/10 text-indigo-400 px-1.5 py-0.5 rounded">{char.habilidades?.[i]?.tipo || '?'}</span>
                    </div>
                    <p className="text-txt-dim text-[10px]">{h.descricao}</p>
                    {h.feedback && <p className="text-gold/60 text-[9px] mt-0.5 italic">💡 {h.feedback}</p>}
                  </div>
                ))}
                {result.armaHabilidades?.map((h, i) => (
                  <div key={`w${i}`} className="bg-void/50 border border-orange-400/20 rounded-lg px-2.5 py-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-txt-main text-[11px] font-semibold">{h.nome}</span>
                      <span className="text-[9px] bg-orange-400/10 text-orange-400 px-1.5 py-0.5 rounded">{h.tipo || 'Ativa'}</span>
                      {h.custo && <span className="text-gold/60 text-[9px] ml-auto font-mono">{h.custo}</span>}
                    </div>
                    <p className="text-txt-dim text-[10px]">{h.descricao}</p>
                    {h.feedback && <p className="text-gold/60 text-[9px] mt-0.5 italic">💡 {h.feedback}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function EquipCard({ item, canEdit, onToggle, onClick }) {
  const rc = RANK_COLORS[item.rank] || RANK_COLORS.Comum
  const isLegendaryItem = item.categoria === 'Arma Lendaria' || item.categoria === 'Arma Lendária' || item.categoria === 'Arma Mistica'
  const isWeapon = item.categoria === 'Arma' || isLegendaryItem
  const canQuickEquip = canEdit && (item.categoria === 'Arma' || item.categoria === 'Equipamento')
  const equipType = getEquipmentType(item)
  const armorType = getArmorType(item)
  const rarity = item.categoria === 'Equipamento' ? getEquipmentRarity(item.rank) : null
  const itemRankBonus = WEAPON_RANKS.find(r => r.rank === item.rank)?.danoBonus
  const materialDamageBonus = getMaterialDamageDisplay(item)
  return (
    <div
      className={`armory-card w-full rounded-lg border ${isLegendaryItem ? 'border-lime-300/45 bg-lime-300/8 text-lime-300 shadow-lg shadow-lime-300/10' : `${rc.border} ${rc.bg} ${rc.text} ${rc.glow}`} p-3 text-left`}>
      <div className="armory-rank-rail" />
      <button type="button" onClick={onToggle} disabled={!canQuickEquip}
        title={item.equipado ? 'Desequipar' : 'Equipar'}
        className={`armory-icon ${isLegendaryItem ? 'bg-lime-300/10 text-lime-300 border-lime-300/25' : rc.badge} transition-transform ${canQuickEquip ? 'hover:scale-[1.03] cursor-pointer' : 'cursor-default'} ${item.equipado ? 'ring-1 ring-emerald-300/40' : 'opacity-85'}`}>
        {item.imagem ? <img src={item.imagem} alt="" className="w-full h-full object-cover" /> : <span>{isWeapon ? 'ARM' : 'EQP'}</span>}
      </button>
      <button type="button" onClick={onClick} className="flex-1 min-w-0 text-left">
        <span className="text-txt-main text-sm font-semibold truncate block">{item.nome || 'Equipamento'}</span>
        {item.dano && <span className="text-red-400/70 text-[11px] font-mono mt-0.5 block">{item.dano}{itemRankBonus ? ` ${itemRankBonus}` : ''}{materialDamageBonus ? ` ${materialDamageBonus}` : ''}</span>}
        <span className={`text-[9px] mt-1 inline-flex px-1.5 py-0.5 rounded border ${item.equipado ? 'text-emerald-300 border-emerald-400/20 bg-emerald-400/10' : 'text-txt-dim/50 border-sep/30 bg-void/40'}`}>
          {item.equipado ? 'equipado' : 'guardado'}
        </span>
        {(item.encantamentos || []).length > 0 && (
          <span className="text-[9px] mt-1 ml-1 inline-flex px-1.5 py-0.5 rounded border text-amber-200 border-amber-300/20 bg-amber-300/10">
            ENC {item.encantamentos.length}
          </span>
        )}
        {item.materialEspecial && (
          <span className={`text-[9px] mt-1 ml-1 inline-flex items-center px-1.5 py-0.5 rounded border ${item.materialEspecial === 'ferro_hefestiano' ? 'text-amber-100 border-amber-300/20 bg-amber-300/10' : item.materialEspecial === 'ferro_tartaro' ? 'text-indigo-200 border-indigo-400/20 bg-indigo-400/10' : item.materialEspecial === 'aco_astrano' ? 'text-purple-200 border-purple-400/20 bg-purple-400/10' : item.materialEspecial === 'vibranium' ? 'text-cyan-200 border-cyan-400/20 bg-cyan-400/10' : item.materialEspecial === 'aco_olimpiano' ? 'text-yellow-200 border-yellow-400/20 bg-yellow-400/10' : 'text-gray-300 border-gray-400/20 bg-gray-400/10'}`}>
            <span className="material-symbols-outlined text-[12px] leading-none">
            {getMaterialIcon(item.materialEspecial)}
            </span>
          </span>
        )}
      </button>
    </div>
  )
}

function LegendaryAssignedCard({ item, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="armory-card w-full rounded-lg border border-lime-300/25 bg-lime-300/5 p-3 text-left transition-all hover:border-lime-300/50 hover:shadow-lg hover:shadow-lime-300/8">
      <div className="armory-rank-rail" style={{ background: 'rgba(190, 242, 100, 0.45)' }} />
      <div className="armory-icon bg-lime-300/10 border-lime-300/20 text-lime-300">
        {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <span>LEN</span>}
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-lime-100 text-sm font-semibold truncate block">{item.name || 'Arma Lendária'}</span>
        <span className="text-lime-300/45 text-[11px] mt-0.5 block">{item.tipo || 'Forja Lendária'}</span>
      </div>
    </button>
  )
}

export function LegendaryWeaponDrawer({ item, forgeItem, canRemove, onRemove, onAdjustImage, onClose }) {
  const habs = forgeItem?.habilidades
    ? (typeof forgeItem.habilidades === 'string'
        ? JSON.parse(forgeItem.habilidades || '{}')
        : forgeItem.habilidades)
    : { passivas: [], ativas: [], ultimates: [] }
  const powerLabel = WEAPON_POWER_LEVELS.find(p => p.value === forgeItem?.power_level)?.label || 'Notável'

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-[420px] bg-deep border-l border-lime-300/15 shadow-2xl shadow-black/60 flex flex-col">
        <div className="px-5 py-4 border-b border-sep/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-lime-300/10 border border-lime-300/20 flex items-center justify-center overflow-hidden">
              {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <span className="text-lime-300 text-xs">⚔</span>}
            </div>
            <div>
              <h3 className="text-lime-100 text-sm font-semibold">{item.name || 'Arma Lendária'}</h3>
              <span className="text-lime-300/50 text-[10px]">{item.tipo || 'Forja Lendária'} · {powerLabel}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-txt-dim hover:text-err text-sm transition-colors">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {item.image && (
            <img src={item.image} alt="" className="w-full aspect-[16/9] rounded-lg object-cover border border-lime-300/15" />
          )}

          {forgeItem ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {forgeItem.dano && (
                  <div className="bg-void/50 border border-lime-300/15 rounded-lg px-3 py-2">
                    <span className="text-txt-dim/50 text-[9px] uppercase">Dano</span>
                    <p className="text-red-400/90 text-sm font-mono mt-0.5">{forgeItem.dano}</p>
                  </div>
                )}
                {forgeItem.attr && (
                  <div className="bg-void/50 border border-lime-300/15 rounded-lg px-3 py-2">
                    <span className="text-txt-dim/50 text-[9px] uppercase">Atributo</span>
                    <p className="text-lime-200 text-sm font-mono mt-0.5">{forgeItem.attr}</p>
                  </div>
                )}
              </div>

              {forgeItem.effect && (
                <div className="bg-void/50 border border-lime-300/10 rounded-lg px-3 py-2.5">
                  <span className="text-lime-300/50 text-[9px] uppercase tracking-wider">Efeito Lendário</span>
                  <p className="text-txt-dim/80 text-xs mt-1 leading-relaxed whitespace-pre-line">{forgeItem.effect}</p>
                </div>
              )}

              {forgeItem.lore && (
                <div className="bg-void/50 border border-sep/20 rounded-lg px-3 py-2.5">
                  <span className="text-txt-dim/40 text-[9px] uppercase tracking-wider">História</span>
                  <p className="text-txt-dim/60 text-[11px] mt-1 leading-relaxed italic">{forgeItem.lore}</p>
                </div>
              )}

              {[
                { key: 'passivas', label: 'Passivas', color: 'emerald' },
                { key: 'ativas', label: 'Ativas', color: 'sky' },
                { key: 'ultimates', label: 'Ultimate', color: 'purple' },
              ].map(({ key, label, color }) => {
                const skills = habs[key] || []
                if (skills.length === 0) return null
                return (
                  <div key={key}>
                    <span className={`text-${color}-400/60 text-[9px] uppercase tracking-wider`}>{label}</span>
                    <div className="space-y-1.5 mt-1.5">
                      {skills.map((sk, i) => (
                        <div key={i} className={`bg-void/50 border border-${color}-400/10 rounded-lg px-3 py-2`}>
                          <div className="flex items-center gap-2">
                            <span className="text-txt-main text-[11px] font-semibold">{sk.nome}</span>
                            <span className="text-amber-300/60 text-[9px] font-mono">PE {sk.custoPE ?? 0}</span>
                          </div>
                          {sk.descricao && <p className="text-txt-dim/60 text-[10px] mt-1 leading-relaxed">{sk.descricao}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </>
          ) : (
            <p className="text-txt-dim/50 text-xs italic">Detalhes completos não disponíveis para esta arma.</p>
          )}
        </div>

        <div className="px-5 py-3 border-t border-sep/30 flex justify-end gap-2 shrink-0">
          {item.image && onAdjustImage && (
            <button onClick={onAdjustImage}
              className="text-[10px] border border-purple-400/25 text-purple-300 px-3 py-1.5 rounded-lg hover:bg-purple-400/10 transition-colors">
              Ajustar Imagem
            </button>
          )}
          {canRemove && (
            <button onClick={() => { if (confirm('Remover esta arma lendária do personagem?')) onRemove() }}
              className="text-[10px] border border-err/25 text-err/80 px-3 py-1.5 rounded-lg hover:bg-err/10 hover:text-err transition-colors">
              Excluir
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function LegendaryCatalogModal({ items, assigned, isAdmin, onAssign, onClose }) {
  const assignedIds = new Set((assigned || []).flatMap(item => [item.id, item.sourceId, item.sourceId ? `static_${item.sourceId}` : null, item.sourceId ? `forge_${item.sourceId}` : null]).filter(Boolean))
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm modal-bg" onClick={onClose}>
      <div className="bg-deep border border-lime-300/25 rounded-xl w-full max-w-3xl shadow-2xl shadow-black/50 max-h-[86vh] flex flex-col modal-content" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-sep/30 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-cinzel text-lime-300 text-sm">Catálogo de Armas Lendárias</h3>
            <p className="text-txt-dim/60 text-[10px] mt-1">Visualização breve. Somente o Mestre pode atribuir uma arma lendária.</p>
          </div>
          <button onClick={onClose} className="text-txt-dim hover:text-err text-sm transition-colors">×</button>
        </div>
        <div className="p-5 overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-txt-dim/50 text-xs italic">Nenhuma arma lendária disponível na forja.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map(item => {
                const already = assignedIds.has(item.id)
                return (
                  <div key={item.id} className="legendary-catalog-card rounded-lg border border-lime-300/25 bg-lime-300/5 overflow-hidden">
                    <div className="aspect-[4/3] bg-void/70 grid place-items-center border-b border-lime-300/15 overflow-hidden">
                      {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <span className="font-cinzel text-lime-300/55 text-sm">Lendária</span>}
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="font-cinzel text-lime-200 text-sm leading-tight truncate">{item.name}</div>
                      <div className="text-txt-dim/50 text-[10px] truncate">{item.tipo || 'Forja Lendária'}</div>
                      {item.power_level && (
                        <span className="text-[9px] bg-amber-300/10 text-amber-200 px-1.5 py-0.5 rounded border border-amber-300/20">
                          {WEAPON_POWER_LEVELS.find(p => p.value === item.power_level)?.label || 'Notável'}
                        </span>
                      )}
                      {isAdmin ? (
                        <button onClick={() => onAssign(item)} disabled={already}
                          className={`w-full text-[10px] px-3 py-1.5 rounded border transition-colors ${already ? 'border-sep/30 text-txt-dim/35 cursor-not-allowed' : 'border-lime-300/35 text-lime-300 hover:bg-lime-300/10'}`}>
                          {already ? 'Já atribuída' : 'Atribuir'}
                        </button>
                      ) : (
                        <div className="text-[10px] text-txt-dim/40 border border-sep/25 rounded px-2 py-1.5 text-center">Restrita ao Mestre</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function OutfitDrawerClean({ outfit, pieces = [], canEdit, onAddPiece, onToggleOutfit, onTogglePiece, onOpenPiece, onRemovePiece, onDissolve, onClose }) {
  const pieceItems = pieces.map(({ item }) => item)
  const stats = calcEquipStats(pieceItems.map(piece => ({ ...piece, equipado: true })))
  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/40 drawer-overlay" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-[420px] bg-deep border-l border-sky-300/15 shadow-2xl shadow-black/60 flex flex-col drawer-panel">
        <div className="px-4 py-3 border-b border-sep/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-300/10 border border-sky-300/20 grid place-items-center overflow-hidden">
              {outfit.imagem ? <img src={outfit.imagem} alt="" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-sky-200 text-[18px]">checkroom</span>}
            </div>
            <div>
              <h3 className="font-cinzel text-sky-100 text-xs uppercase tracking-wider">{outfit.nome || 'Traje'}</h3>
              <span className="text-txt-dim/60 text-[10px]">{pieces.length} pecas vinculadas</span>
            </div>
          </div>
          <button onClick={onClose} className="text-txt-dim hover:text-err text-sm transition-colors">x</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {outfit.imagem && (
            <img src={outfit.imagem} alt="" className="w-full aspect-[2/3] max-h-[520px] rounded-lg object-cover object-top border border-sky-300/20" />
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-void/50 border border-sky-300/15 rounded-lg px-3 py-2">
              <span className="text-txt-dim/50 text-[9px] uppercase">Armadura</span>
              <p className="text-primary text-sm font-mono mt-0.5">{stats.totalArmor || 0}</p>
            </div>
            <div className="bg-void/50 border border-sky-300/15 rounded-lg px-3 py-2">
              <span className="text-txt-dim/50 text-[9px] uppercase">Durabilidade</span>
              <p className="text-emerald-300 text-sm font-mono mt-0.5">{stats.totalDurabilityMax ? `${stats.totalDurability}/${stats.totalDurabilityMax}` : 0}</p>
            </div>
            <div className="bg-void/50 border border-sky-300/15 rounded-lg px-3 py-2">
              <span className="text-txt-dim/50 text-[9px] uppercase">Penalidade</span>
              <p className="text-amber-300 text-sm font-mono mt-0.5">{stats.totalSpeedPenalty ? `${stats.totalSpeedPenalty} DES` : '0'}</p>
            </div>
            <div className="bg-void/50 border border-sky-300/15 rounded-lg px-3 py-2">
              <span className="text-txt-dim/50 text-[9px] uppercase">Estado</span>
              <p className="text-txt-main text-sm font-mono mt-0.5">{outfit.equipado ? 'equipado' : 'guardado'}</p>
            </div>
          </div>

          {outfit.descricao && <p className="text-txt-dim/75 text-xs leading-relaxed">{outfit.descricao}</p>}

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-txt-dim text-[10px] uppercase tracking-wider">Pecas do traje</span>
              {canEdit && (
                <button onClick={onAddPiece} className="text-[10px] border border-sky-300/30 text-sky-200 px-2 py-1 rounded hover:bg-sky-300/10 transition-colors">
                  + Peca
                </button>
              )}
            </div>
            {pieces.length === 0 ? (
              <div className="rounded-lg border border-dashed border-sky-300/20 bg-sky-300/5 px-3 py-6 text-center">
                <span className="material-symbols-outlined text-sky-200/50 text-3xl">inventory_2</span>
                <p className="text-txt-dim/55 text-[11px] mt-1">Crie as pecas internas para este traje.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pieces.map(({ item, idx }) => {
                  const type = getEquipmentType(item)
                  const armorType = getArmorType(item)
                  return (
                    <div key={item.id || idx} className="rounded-lg border border-sky-300/15 bg-void/45 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => onTogglePiece(idx, item)} disabled={!canEdit}
                          title={item.equipado ? 'Desequipar peca' : 'Equipar peca'}
                          className={`w-11 h-11 rounded border bg-sky-300/8 grid place-items-center overflow-hidden shrink-0 transition-transform ${canEdit ? 'hover:scale-[1.04]' : ''} ${item.equipado ? 'border-emerald-400/35 ring-1 ring-emerald-300/25' : 'border-sky-300/20 opacity-75'}`}>
                          {item.imagem ? <img src={item.imagem} alt="" className="w-full h-full object-cover" /> : <span className="text-sky-100/70 text-[10px]">EQP</span>}
                        </button>
                        <button type="button" onClick={() => onOpenPiece(idx)} className="min-w-0 flex-1 text-left">
                          <span className="text-txt-main text-xs font-semibold truncate block">{item.nome || 'Peca'}</span>
                          <span className="text-txt-dim/55 text-[10px] block">{type?.label || item.categoria}{armorType ? ` - ${armorType.label}` : ''}</span>
                        </button>
                        {canEdit && (
                          <button onClick={() => onRemovePiece(idx)}
                            title="Tirar do traje"
                            className="w-7 h-7 grid place-items-center rounded border border-amber-300/25 text-amber-200/75 hover:bg-amber-300/10 hover:text-amber-100 transition-colors">
                            <span className="material-symbols-outlined text-[15px]">logout</span>
                          </button>
                        )}
                      </div>
                      {item.categoria === 'Equipamento' && (
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-mono">
                          <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/15">ARM {getEquipmentArmorValue(item)}</span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-300 border border-emerald-400/15">DUR {getEquipmentDurabilityCurrent(item)}/{getEquipmentDurabilityMax(item)}</span>
                          {type?.penalty ? <span className="px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/15">{type.penalty} DES</span> : null}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-sep/30 flex gap-2 shrink-0">
          {canEdit && (
            <>
              <button onClick={onToggleOutfit}
                className={`text-[10px] border px-3 py-1.5 rounded-lg transition-colors ${outfit.equipado ? 'border-emerald-400/30 text-emerald-300 hover:bg-emerald-400/10' : 'border-sky-400/30 text-sky-300 hover:bg-sky-400/10'}`}>
                {outfit.equipado ? 'Desequipar traje' : 'Equipar traje'}
              </button>
              <button onClick={onDissolve} className="text-[10px] border border-err/30 text-err px-3 py-1.5 rounded-lg hover:bg-err/10 transition-colors">Desfazer traje</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function OutfitDrawer({ outfit, pieces = [], canEdit, onAddPiece, onToggleOutfit, onTogglePiece, onOpenPiece, onRemovePiece, onDissolve, onClose }) {
  const pieceItems = pieces.map(({ item }) => item)
  const stats = calcEquipStats(pieceItems.map(piece => ({ ...piece, equipado: true })))
  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/40 drawer-overlay" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-[420px] bg-deep border-l border-sky-300/15 shadow-2xl shadow-black/60 flex flex-col drawer-panel">
        <div className="px-4 py-3 border-b border-sep/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-300/10 border border-sky-300/20 grid place-items-center overflow-hidden">
              {outfit.imagem ? <img src={outfit.imagem} alt="" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-sky-200 text-[18px]">checkroom</span>}
            </div>
            <div>
              <h3 className="font-cinzel text-sky-100 text-xs uppercase tracking-wider">{outfit.nome || 'Traje'}</h3>
              <span className="text-txt-dim/60 text-[10px]">{pieces.length} pecas vinculadas</span>
            </div>
          </div>
          <button onClick={onClose} className="text-txt-dim hover:text-err text-sm transition-colors">x</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {outfit.imagem && (
            <img src={outfit.imagem} alt="" className="w-full aspect-[4/3] rounded-lg object-cover border border-sky-300/20" />
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-void/50 border border-sky-300/15 rounded-lg px-3 py-2">
              <span className="text-txt-dim/50 text-[9px] uppercase">Armadura</span>
              <p className="text-primary text-sm font-mono mt-0.5">{stats.totalArmor || 0}</p>
            </div>
            <div className="bg-void/50 border border-sky-300/15 rounded-lg px-3 py-2">
              <span className="text-txt-dim/50 text-[9px] uppercase">Durabilidade</span>
              <p className="text-emerald-300 text-sm font-mono mt-0.5">{stats.totalDurabilityMax ? `${stats.totalDurability}/${stats.totalDurabilityMax}` : 0}</p>
            </div>
            <div className="bg-void/50 border border-sky-300/15 rounded-lg px-3 py-2">
              <span className="text-txt-dim/50 text-[9px] uppercase">Penalidade</span>
              <p className="text-amber-300 text-sm font-mono mt-0.5">{stats.totalSpeedPenalty ? `${stats.totalSpeedPenalty} DES` : '0'}</p>
            </div>
            <div className="bg-void/50 border border-sky-300/15 rounded-lg px-3 py-2">
              <span className="text-txt-dim/50 text-[9px] uppercase">Estado</span>
              <p className="text-txt-main text-sm font-mono mt-0.5">{outfit.equipado ? 'equipado' : 'guardado'}</p>
            </div>
          </div>

          {outfit.descricao && (
            <p className="text-txt-dim/75 text-xs leading-relaxed">{outfit.descricao}</p>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-txt-dim text-[10px] uppercase tracking-wider">PeÃ§as do traje</span>
              {canEdit && (
                <button onClick={onAddPiece} className="text-[10px] border border-sky-300/30 text-sky-200 px-2 py-1 rounded hover:bg-sky-300/10 transition-colors">
                  + PeÃ§a
                </button>
              )}
            </div>
            {pieces.length === 0 ? (
              <div className="rounded-lg border border-dashed border-sky-300/20 bg-sky-300/5 px-3 py-6 text-center">
                <span className="material-symbols-outlined text-sky-200/50 text-3xl">inventory_2</span>
                <p className="text-txt-dim/55 text-[11px] mt-1">Crie as peÃ§as internas para este traje.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pieces.map(({ item, idx }) => {
                  const type = getEquipmentType(item)
                  const armorType = getArmorType(item)
                  return (
                    <div key={item.id || idx} className="rounded-lg border border-sky-300/15 bg-void/45 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded border border-sky-300/20 bg-sky-300/8 grid place-items-center overflow-hidden shrink-0">
                          {item.imagem ? <img src={item.imagem} alt="" className="w-full h-full object-cover" /> : <span className="text-sky-100/70 text-[10px]">EQP</span>}
                        </div>
                        <button type="button" onClick={() => onOpenPiece(idx)} className="min-w-0 flex-1 text-left">
                          <span className="text-txt-main text-xs font-semibold truncate block">{item.nome || 'PeÃ§a'}</span>
                          <span className="text-txt-dim/55 text-[10px] block">{type?.label || item.categoria}{armorType ? ` · ${armorType.label}` : ''}</span>
                        </button>
                        {canEdit && (
                          <button onClick={() => onTogglePiece(idx, item)}
                            className={`text-[9px] px-2 py-1 rounded border transition-colors ${item.equipado ? 'border-emerald-400/30 text-emerald-300 bg-emerald-400/10' : 'border-sep/30 text-txt-dim/60 bg-black/15'}`}>
                            {item.equipado ? 'on' : 'off'}
                          </button>
                        )}
                      </div>
                      {item.categoria === 'Equipamento' && (
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-mono">
                          <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/15">ARM {getEquipmentArmorValue(item)}</span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-300 border border-emerald-400/15">DUR {getEquipmentDurabilityCurrent(item)}/{getEquipmentDurabilityMax(item)}</span>
                          {type?.penalty ? <span className="px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/15">{type.penalty} DES</span> : null}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-sep/30 flex gap-2 shrink-0">
          {canEdit && (
            <>
              <button onClick={onToggleOutfit}
                className={`text-[10px] border px-3 py-1.5 rounded-lg transition-colors ${outfit.equipado ? 'border-emerald-400/30 text-emerald-300 hover:bg-emerald-400/10' : 'border-sky-400/30 text-sky-300 hover:bg-sky-400/10'}`}>
                {outfit.equipado ? 'Desequipar traje' : 'Equipar traje'}
              </button>
              <button onClick={onDissolve} className="text-[10px] border border-err/30 text-err px-3 py-1.5 rounded-lg hover:bg-err/10 transition-colors">Desfazer traje</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function OutfitCreateModalClean({ onSave, onClose }) {
  const [nome, setNome] = useState('Traje Completo')
  const [descricao, setDescricao] = useState('')
  const [imagem, setImagem] = useState(null)
  const [preview, setPreview] = useState(null)
  const fileRef = useRef(null)

  function processImageFile(file) {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const size = 320
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = Math.round(size * 1.5)
        const ctx = canvas.getContext('2d')
        const scale = Math.max(canvas.width / img.width, canvas.height / img.height)
        const w = img.width * scale
        const h = img.height * scale
        ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h)
        const dataUrl = canvas.toDataURL('image/webp', 0.8)
        setImagem(dataUrl)
        setPreview(dataUrl)
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  }

  function handleImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
    processImageFile(file)
    e.target.value = ''
  }

  function handlePaste(e) {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        processImageFile(item.getAsFile())
        return
      }
    }
  }

  function handleSave() {
    onSave({
      id: Date.now(),
      categoria: 'Traje',
      nome: nome.trim() || 'Traje Completo',
      descricao,
      imagem,
      equipado: false,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm modal-bg" onClick={onClose} onPaste={handlePaste}>
      <div className="codex-card !bg-deep border-sky-300/25 rounded-xl w-full max-w-md shadow-2xl shadow-black/50 modal-content" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-sep/30 flex items-center justify-between">
          <h3 className="font-cinzel text-sky-200 text-sm">Novo Traje</h3>
          <button onClick={onClose} className="text-txt-dim hover:text-err text-sm transition-colors">x</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <button onClick={() => fileRef.current?.click()}
              className="w-28 h-40 rounded-lg border-2 border-dashed border-sky-300/25 flex flex-col items-center justify-center hover:border-sky-300/50 transition-colors shrink-0 bg-void/50 overflow-hidden group">
              {preview ? <img src={preview} alt="" className="w-full h-full object-cover object-top" /> : (
                <>
                  <span className="material-symbols-outlined text-sky-200/60 text-3xl">checkroom</span>
                  <span className="text-txt-dim/45 text-[9px] mt-1">Imagem do traje</span>
                </>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
            <div className="flex-1 space-y-2">
              <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do traje"
                className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-xs text-txt-main focus:border-sky-300/45 focus:outline-none" autoFocus />
              <textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descricao visual, origem, detalhes..." rows={5}
                className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-[11px] text-txt-main resize-none focus:border-sky-300/45 focus:outline-none leading-relaxed" />
            </div>
          </div>
          <div className="rounded-lg border border-sky-300/15 bg-sky-300/5 px-3 py-2">
            <p className="text-sky-100/80 text-[11px] leading-relaxed">O traje funciona como uma pasta visual. As pecas criadas dentro dele continuam calculando armadura, durabilidade, penalidade e carga normalmente.</p>
          </div>
        </div>
        <div className="px-6 py-3 border-t border-sep/30 flex justify-end gap-2">
          <button onClick={onClose} className="text-txt-dim text-xs hover:text-txt-main px-3 py-1.5 transition-colors">Cancelar</button>
          <button onClick={handleSave}
            className="text-xs px-4 py-1.5 rounded-lg font-semibold bg-gold text-void hover:bg-gold-light transition-colors">
            Criar Traje
          </button>
        </div>
      </div>
    </div>
  )
}

function OutfitCreateModal({ onSave, onClose }) {
  const [nome, setNome] = useState('Traje Completo')
  const [descricao, setDescricao] = useState('')
  const [imagem, setImagem] = useState(null)
  const [preview, setPreview] = useState(null)
  const fileRef = useRef(null)

  function processImageFile(file) {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const size = 256
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        const scale = Math.max(size / img.width, size / img.height)
        const w = img.width * scale
        const h = img.height * scale
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
        const dataUrl = canvas.toDataURL('image/webp', 0.78)
        setImagem(dataUrl)
        setPreview(dataUrl)
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  }

  function handleImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
    processImageFile(file)
    e.target.value = ''
  }

  function handlePaste(e) {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        processImageFile(item.getAsFile())
        return
      }
    }
  }

  function handleSave() {
    onSave({
      id: Date.now(),
      categoria: 'Traje',
      nome: nome.trim() || 'Traje Completo',
      descricao,
      imagem,
      equipado: false,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm modal-bg" onClick={onClose} onPaste={handlePaste}>
      <div className="codex-card !bg-deep border-sky-300/25 rounded-xl w-full max-w-md shadow-2xl shadow-black/50 modal-content" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-sep/30 flex items-center justify-between">
          <h3 className="font-cinzel text-sky-200 text-sm">Novo Traje</h3>
          <button onClick={onClose} className="text-txt-dim hover:text-err text-sm transition-colors">âœ•</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <button onClick={() => fileRef.current?.click()}
              className="w-28 h-28 rounded-lg border-2 border-dashed border-sky-300/25 flex flex-col items-center justify-center hover:border-sky-300/50 transition-colors shrink-0 bg-void/50 overflow-hidden group">
              {preview ? <img src={preview} alt="" className="w-full h-full object-cover" /> : (
                <>
                  <span className="material-symbols-outlined text-sky-200/60 text-3xl">checkroom</span>
                  <span className="text-txt-dim/45 text-[9px] mt-1">Imagem do traje</span>
                </>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
            <div className="flex-1 space-y-2">
              <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do traje"
                className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-xs text-txt-main focus:border-sky-300/45 focus:outline-none" autoFocus />
              <textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="DescriÃ§Ã£o visual, origem, detalhes..." rows={4}
                className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-[11px] text-txt-main resize-none focus:border-sky-300/45 focus:outline-none leading-relaxed" />
            </div>
          </div>
          <div className="rounded-lg border border-sky-300/15 bg-sky-300/5 px-3 py-2">
            <p className="text-sky-100/80 text-[11px] leading-relaxed">O traje funciona como uma pasta visual. As peÃ§as criadas dentro dele continuam calculando armadura, durabilidade, penalidade e carga normalmente.</p>
          </div>
        </div>
        <div className="px-6 py-3 border-t border-sep/30 flex justify-end gap-2">
          <button onClick={onClose} className="text-txt-dim text-xs hover:text-txt-main px-3 py-1.5 transition-colors">Cancelar</button>
          <button onClick={handleSave}
            className="text-xs px-4 py-1.5 rounded-lg font-semibold bg-gold text-void hover:bg-gold-light transition-colors">
            Criar Traje
          </button>
        </div>
      </div>
    </div>
  )
}

export function EquipCreateModal({ char, onSave, onClose, initialCategory = 'Arma', lockCategory = false, title = 'Novo Equipamento', unavailableSlots = [] }) {
  const [step, setStep] = useState(0)
  const [itemCategory, setItemCategory] = useState(initialCategory)
  const [equipType, setEquipType] = useState(null)
  const [selectedType, setSelectedType] = useState('')
  const [selectedRank, setSelectedRank] = useState('Comum')
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [dano, setDano] = useState('')
  const [efeitos, setEfeitos] = useState('')
  const [habilidades, setHabilidades] = useState([])
  const [encantamentos, setEncantamentos] = useState([])
  const [passivas, setPassivas] = useState([])
  const [imagem, setImagem] = useState(null)
  const [preview, setPreview] = useState(null)
  const [armorType, setArmorType] = useState(null)
  const [equipado, setEquipado] = useState(false)
  const [materialEspecial, setMaterialEspecial] = useState('')
  const [peso, setPeso] = useState('')
  const [quantidade, setQuantidade] = useState(1)
  const [local, setLocal] = useState('guardado')
  const fileRef = useRef(null)
  const modalRef = useRef(null)
  const [genLoading, setGenLoading] = useState(false)
  const [genError, setGenError] = useState('')

  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [])

  const weaponDef = WEAPONS.find(w => w.id === selectedType)
  const rankDef = WEAPON_RANKS.find(r => r.rank === selectedRank) || WEAPON_RANKS[0]
  const equipRarity = getEquipmentRarity(selectedRank)
  const activeSlotsAvail = itemCategory === 'Equipamento' ? (equipRarity?.activeSkills || 0) : 0
  const passiveSlotsAvail = itemCategory === 'Equipamento' ? (equipRarity?.passiveSkills || 0) : 0
  const equipSkillSlotsAvail = activeSlotsAvail + passiveSlotsAvail
  const usedSlots = habilidades.reduce((s, h) => s + (WEAPON_ABILITY_COST[h.potencia] || 0), 0)
  const currentLevel = char?.nivel || 1
  const systemSkillBonuses = calcSystemSkillBonuses(char || {})
  const forgeRankBonus = systemSkillBonuses.forgeRankBonus || 0
  const forgeEnchantmentSlots = (itemCategory === 'Arma' || itemCategory === 'Equipamento') ? getForgeEnchantmentLimit(selectedRank, systemSkillBonuses) : 0
  const forgeQualityBonus = systemSkillBonuses.forgeQualityBonus || 0
  const forgeMaterials = getAvailableForgeMaterials(char || {})
  const weaponRankAllowance = getWeaponRankBonus(char) + forgeRankBonus
  const rankAllowed = itemCategory === 'Arma' ? canUseWeaponRank(currentLevel, selectedRank, weaponRankAllowance) : itemCategory === 'Equipamento' ? canUseEquipRank(currentLevel, selectedRank) : true
  const detailStep = itemCategory === 'Equipamento' ? 3 : 2
  const forgeLibrary = (char?.forgeEnchantments || []).filter(enc => canUseForgeEnchantment(enc, itemCategory))

  async function handleAIEquip() {
    if (!equipType) return
    setGenLoading(true); setGenError('')
    try {
      const data = await generateEquipmentAbilities(char || {}, equipType, selectedRank, activeSlotsAvail, passiveSlotsAvail, nome, armorType)
      if (data.passivas?.length) {
        setPassivas(data.passivas)
      }
    } catch (err) {
      setGenError(err.message)
    } finally {
      setGenLoading(false)
    }
  }

  async function handleAIWeight() {
    if (!nome.trim()) return
    setGenLoading(true); setGenError('')
    try {
      const val = await suggestItemWeight(nome, descricao || efeitos)
      if (val != null) setPeso(String(val))
    } catch (err) {
      setGenError(err.message)
    } finally {
      setGenLoading(false)
    }
  }

  function handleImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
    processImageFile(file)
    e.target.value = ''
  }

  function processImageFile(file) {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const size = 128
        const canvas = document.createElement('canvas')
        canvas.width = size; canvas.height = size
        const ctx = canvas.getContext('2d')
        const scale = Math.max(size / img.width, size / img.height)
        const w = img.width * scale; const h = img.height * scale
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
        const dataUrl = canvas.toDataURL('image/webp', 0.7)
        setImagem(dataUrl); setPreview(dataUrl)
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  }

  function handlePaste(e) {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        processImageFile(item.getAsFile())
        return
      }
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer?.files?.[0]
    if (file && file.type.startsWith('image/')) {
      processImageFile(file)
    }
  }

  function handleDragOver(e) {
    e.preventDefault()
  }

  function selectType(id) {
    const w = WEAPONS.find(x => x.id === id)
    setSelectedType(id)
    if (w) {
      setDano(w.dano)
      setNome(w.name)
      setEfeitos(w.mec)
      setPeso(String(getWeaponWeight(w.id, w.name, w.mec)))
    } else {
      setDano('')
      setNome('')
      setEfeitos('')
      setPeso('')
    }
    setStep(1)
  }

  function addHabilidade() {
    if (usedSlots >= rankDef.slots) return
    setHabilidades([...habilidades, { nome: '', potencia: 'Fraca', descricao: '', tipo: 'Ativa', custo: '' }])
  }

  function updateHab(i, patch) {
    const arr = [...habilidades]
    arr[i] = { ...arr[i], ...patch }
    setHabilidades(arr)
  }

  function removeHab(i) { setHabilidades(habilidades.filter((_, j) => j !== i)) }

  function toggleEncantamento(enc) {
    const exists = encantamentos.some(item => item.id === enc.id)
    if (exists) {
      setEncantamentos(encantamentos.filter(item => item.id !== enc.id))
      return
    }
    if (encantamentos.length >= forgeEnchantmentSlots) return
    setEncantamentos([...encantamentos, { ...enc }])
  }

  async function handleAIGenerate() {
    if (!selectedType) return
    setGenLoading(true)
    setGenError('')
    try {
      const data = await generateWeaponAbilities(char || {}, selectedType, selectedRank, rankDef.slots)
      if (data.habilidades?.length) {
        const valid = data.habilidades.filter(h => {
          const cost = WEAPON_ABILITY_COST[h.potencia] || 1
          return cost <= rankDef.slots
        })
        let totalSlots = 0
        const fitting = []
        for (const h of valid) {
          const cost = WEAPON_ABILITY_COST[h.potencia] || 1
          if (totalSlots + cost <= rankDef.slots) {
            fitting.push({ ...h, potencia: h.potencia || 'Fraca', tipo: h.tipo || 'Ativa', custo: h.custo || '' })
            totalSlots += cost
          }
        }
        setHabilidades(fitting)
      }
    } catch (err) {
      setGenError(err.message)
    } finally {
      setGenLoading(false)
    }
  }

  function handleSave() {
    const equipmentDraft = { categoria: itemCategory, tipoEquip: equipType, rank: selectedRank, nome, descricao, armorType, setId: armorType, materialEspecial }
    const durabilityMax = itemCategory === 'Equipamento' ? getEquipmentDurabilityMax(equipmentDraft) : 0
    onSave({
      id: Date.now(), nome, descricao, imagem, dano, efeitos,
      categoria: itemCategory,
      armaId: itemCategory === 'Arma' ? (selectedType === 'custom' ? null : selectedType) : null,
      tipoEquip: itemCategory === 'Equipamento' ? equipType : (itemCategory === 'Utilidade' ? 'utilidade' : null),
      rank: selectedRank,
      materialEspecial: (itemCategory === 'Arma' || itemCategory === 'Equipamento') ? materialEspecial : '',
      peso: peso === '' ? (itemCategory === 'Arma' ? getWeaponWeight(selectedType, nome, descricao || efeitos) : estimateEquipmentWeight({ categoria: itemCategory, tipoEquip: equipType, nome, descricao })) : Number(peso),
      local: (itemCategory === 'Arma' || itemCategory === 'Equipamento') ? (equipado ? 'equipado' : 'guardado') : local,
      habilidades: itemCategory === 'Arma' ? habilidades.filter(h => h.nome.trim()) : [],
      encantamentos: (itemCategory === 'Arma' || itemCategory === 'Equipamento') ? encantamentos.filter(h => h.nome?.trim() || h.descricao?.trim()).slice(0, forgeEnchantmentSlots) : [],
      equipHabilidades: itemCategory === 'Equipamento' ? passivas.filter(h => h.nome?.trim()) : [],
      passivas: itemCategory === 'Equipamento' ? passivas.filter(h => (h.tipo || '').includes('Passiva')) : [],
      armorType: itemCategory === 'Equipamento' ? armorType : null,
      setId: itemCategory === 'Equipamento' ? armorType : null,
      equipado: itemCategory === 'Equipamento' || itemCategory === 'Arma' ? equipado : false,
      durabilidadeAtual: itemCategory === 'Equipamento' ? durabilityMax : null,
      quantidade: quantidade > 1 ? quantidade : undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm modal-bg" onClick={onClose} onPaste={handlePaste}>
      <div ref={modalRef} className="codex-card !bg-deep border-primary/25 rounded-xl w-full max-w-2xl shadow-2xl shadow-black/50 max-h-[90vh] flex flex-col modal-content" onClick={e => e.stopPropagation()} onDrop={handleDrop} onDragOver={handleDragOver}>
        <div className="px-6 py-4 border-b border-sep/30 flex items-center justify-between shrink-0">
          <h3 className="font-cinzel text-primary text-sm">{title}</h3>
          <div className="flex items-center gap-2">
            {Array.from({ length: detailStep + 1 }, (_, s) => (
              <div key={s} className={`w-2 h-2 rounded-full transition-colors ${step >= s ? 'bg-gold' : 'bg-sep/50'}`} />
            ))}
          </div>
          <button onClick={onClose} className="text-txt-dim hover:text-err text-sm transition-colors">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 0 && (
            <div className="space-y-3">
              <h4 className="text-txt-dim text-xs uppercase tracking-wider">{lockCategory ? 'Peca do traje' : 'Categoria'}</h4>
              {!lockCategory && <div className="grid grid-cols-3 gap-2">
                {[
                  { cat: 'Arma', icon: '⚔', desc: 'Espadas, armas de fogo' },
                  { cat: 'Equipamento', icon: '🛡', desc: 'Armaduras, coletes' },
                  { cat: 'Utilidade', icon: '🔧', desc: 'Escutas, kits, tasers' },
                ].map(c => (
                  <button key={c.cat} onClick={() => { setItemCategory(c.cat); setSelectedType(''); setEquipType(null) }}
                    className={`border rounded-lg px-2 py-2.5 text-center transition-all ${itemCategory === c.cat ? 'border-gold/60 bg-gold/10 text-gold' : 'border-sep/40 bg-void/40 text-txt-dim hover:border-gold/30'}`}>
                    <span className="text-lg block mb-1">{c.icon}</span>
                    <span className="text-[10px] font-semibold block">{c.cat}</span>
                    <span className="text-[8px] text-txt-dim/50 block mt-0.5">{c.desc}</span>
                  </button>
                ))}
              </div>}

              {itemCategory === 'Arma' && (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => selectType('custom')}
                    className={`text-left border rounded-lg p-2.5 transition-all hover:border-gold/40 ${selectedType === 'custom' ? 'border-gold/50 bg-gold/5' : 'border-sep/40 bg-void/40'}`}>
                    <span className="text-txt-main text-[11px] font-semibold">Personalizada</span>
                    <div className="text-[10px] mt-0.5 text-txt-dim/50">Nome, dano e imagem livres</div>
                  </button>
                  {WEAPONS.map(w => (
                    <button key={w.id} onClick={() => selectType(w.id)}
                      className={`text-left border rounded-lg p-2.5 transition-all hover:border-gold/40 ${selectedType === w.id ? 'border-gold/50 bg-gold/5' : 'border-sep/40 bg-void/40'}`}>
                      <span className="text-txt-main text-[11px] font-semibold">{w.name}</span>
                      <div className="flex gap-3 mt-0.5 text-[10px]">
                        <span className="text-red-400/70 font-mono">{w.dano}</span>
                        <span className="text-txt-dim/50">{w.attr}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {itemCategory === 'Equipamento' && (
                <div className="grid grid-cols-2 gap-2">
                  {EQUIPMENT_TYPES.filter(t => t.id !== 'utilidade').map(et => {
                    const slotUnavailable = !!et.slot && unavailableSlots.includes(et.slot)
                    return (
                    <button key={et.id} disabled={slotUnavailable} title={slotUnavailable ? 'Este traje ja possui uma peca nesse slot.' : et.label}
                      onClick={() => { if (slotUnavailable) return; setEquipType(et.id); setSelectedType(et.id); setNome(et.label); setEfeitos(et.desc); setDano(''); setPeso(String(estimateEquipmentWeight({ categoria: 'Equipamento', tipoEquip: et.id, nome: et.label, descricao: et.desc }))); setStep(1) }}
                      className={`text-left border rounded-lg p-2.5 transition-all ${slotUnavailable ? 'border-sep/15 bg-void/20 opacity-40 cursor-not-allowed' : equipType === et.id ? 'border-primary/50 bg-primary/5 hover:border-gold/40' : 'border-sep/40 bg-void/40 hover:border-gold/40'}`}>
                      <span className="text-txt-main text-[11px] font-semibold">{et.label}</span>
                      <div className="text-[10px] mt-0.5 text-txt-dim/50">{et.desc}</div>
                      <div className="text-[10px] mt-1 text-primary/70 font-mono">
                        Armadura: {et.caBase} · Durabilidade: {getEquipmentDurabilityMax({ tipoEquip: et.id, rank: selectedRank })}
                      </div>
                      <div className="text-[9px] mt-0.5 text-amber-300/65 font-mono">{et.penalty ? `Penalidade: ${et.penalty} DES` : 'Sem penalidade'}</div>
                    </button>
                    )
                  })}
                </div>
              )}

              {itemCategory === 'Utilidade' && (
                <div className="grid grid-cols-2 gap-2">
                  {SIMPLE_ITEMS.map(si => (
                    <button key={si.id} onClick={() => { setEquipType('utilidade'); setSelectedType(si.id); setNome(si.nome); setDescricao(si.desc); setEfeitos(si.efeito); setDano(''); setPeso(String(si.peso)); setLocal('mochila'); setStep(1) }}
                      className={`text-left border rounded-lg p-2.5 transition-all hover:border-gold/40 ${selectedType === si.id ? 'border-sky-400/50 bg-sky-400/5' : 'border-sep/40 bg-void/40'}`}>
                      <span className="text-txt-main text-[11px] font-semibold">{si.nome}</span>
                      <div className="text-[10px] mt-0.5 text-txt-dim/50 leading-snug">{si.efeito}</div>
                      <div className="text-[9px] mt-1 text-sky-400/60 font-mono">{si.peso} kg</div>
                    </button>
                  ))}
                  <button onClick={() => { setEquipType('utilidade'); setSelectedType('custom_util'); setNome(''); setDescricao(''); setEfeitos(''); setDano(''); setPeso(''); setLocal('mochila'); setStep(1) }}
                    className={`text-left border rounded-lg p-2.5 transition-all hover:border-gold/40 border-dashed border-sep/30 bg-void/20`}>
                    <span className="text-txt-dim/60 text-[11px] font-semibold">Personalizado</span>
                    <div className="text-[10px] mt-0.5 text-txt-dim/40">Item customizado</div>
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <h4 className="text-txt-dim text-xs uppercase tracking-wider">
                {itemCategory === 'Arma' ? 'Rank da arma' : itemCategory === 'Equipamento' ? 'Rank do equipamento' : 'Detalhes do item'}
              </h4>
              {itemCategory === 'Utilidade' ? (
                <div className="space-y-3">
                  <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do item"
                    className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-xs text-txt-main focus:border-gold/40 focus:outline-none" />
                  <textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descrição" rows={2}
                    className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-[11px] text-txt-main resize-none focus:border-gold/40 focus:outline-none" />
                  <input type="text" value={efeitos} onChange={e => setEfeitos(e.target.value)} placeholder="Efeito mecânico"
                    className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-xs text-txt-main focus:border-gold/40 focus:outline-none" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {WEAPON_RANKS.map(r => {
                    const rc = RANK_COLORS[r.rank]
                    const rarity = getEquipmentRarity(r.rank)
                    const allowed = itemCategory === 'Arma' ? canUseWeaponRank(currentLevel, r.rank, weaponRankAllowance) : canUseEquipRank(currentLevel, r.rank)
                    return (
                      <button key={r.rank} onClick={() => allowed && setSelectedRank(r.rank)} disabled={!allowed}
                        title={!allowed ? `Requer nível maior. Limite atual: ${itemCategory === 'Arma' ? getWeaponLimitForLevel(currentLevel).maxRank : getEquipLimitForLevel(currentLevel).maxRank}` : r.rank}
                        className={`text-left border rounded-lg p-2.5 transition-all ${selectedRank === r.rank ? `${rc.border} ${rc.bg} ${rc.glow}` : allowed ? 'border-sep/40 bg-void/40 hover:border-sep/70' : 'border-sep/15 bg-void/20 opacity-40 cursor-not-allowed'}`}>
                        <span className={`text-xs font-semibold ${rc.text}`}>{r.rank}</span>
                        <div className="text-[10px] mt-0.5 text-txt-dim/60 space-y-0.5">
                          {itemCategory === 'Arma' && (
                            <>
                              <div>Dano: <span className="text-red-400/70 font-mono">{r.danoBonus || '—'}</span></div>
                              <div>CA: <span className="font-mono">sem bônus</span> · Slots: <span className="font-mono">{r.slots}</span></div>
                            </>
                          )}
                          {itemCategory === 'Equipamento' && rarity && (
                            <>
                              <div>Armadura: <span className="text-primary font-mono">+{rarity.armorBonus}</span> · Categoria define buffs extras</div>
                              <div>Durabilidade: <span className="text-emerald-300 font-mono">{getEquipmentDurabilityMax({ tipoEquip: equipType, rank: r.rank, armorType })}</span></div>
                              <div>Ativas: <span className="font-mono">{rarity.activeSkills}</span> · Passivas: <span className="font-mono">{rarity.passiveSkills}</span></div>
                            </>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
              {(itemCategory === 'Arma' || itemCategory === 'Equipamento') && (forgeRankBonus > 0 || forgeEnchantmentSlots > 0 || forgeQualityBonus > 0) && (
                <div className="rounded-lg border border-amber-300/20 bg-amber-300/5 px-3 py-2">
                  <div className="text-amber-200 text-[11px] font-semibold">Mestre Forjador ativo</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {itemCategory === 'Arma' && forgeRankBonus > 0 && <span className="text-[9px] text-amber-200/80 bg-amber-300/10 border border-amber-300/15 rounded px-2 py-0.5">+{forgeRankBonus} rank no limite</span>}
                    {systemSkillBonuses.forgeRankLabels?.map(label => <span key={label} className="text-[9px] text-gold/80 bg-gold/10 border border-gold/15 rounded px-2 py-0.5">{label}</span>)}
                    {forgeEnchantmentSlots > 0 && <span className="text-[9px] text-sky-200/80 bg-sky-300/10 border border-sky-300/15 rounded px-2 py-0.5">{forgeEnchantmentSlots} encantamento(s)</span>}
                    {forgeQualityBonus > 0 && <span className="text-[9px] text-emerald-200/80 bg-emerald-300/10 border border-emerald-300/15 rounded px-2 py-0.5">Qualidade +{forgeQualityBonus}</span>}
                    {forgeMaterials.length > 0 && <span className="text-[9px] text-amber-100/80 bg-amber-300/10 border border-amber-300/15 rounded px-2 py-0.5">{forgeMaterials.length} material(is) concedido(s)</span>}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && itemCategory === 'Equipamento' && (
            <div className="space-y-3 font-sans">
              <div>
                <h4 className="text-txt-dim text-xs uppercase tracking-wider">Categoria do equipamento</h4>
                <p className="text-txt-dim/65 text-[11px] mt-1 leading-relaxed">A primeira peca ativa o mini bonus; 3 pecas da mesma categoria liberam o bonus maior.</p>
              </div>
              <button type="button" onClick={() => setArmorType(null)}
                className={`w-full text-left border rounded-lg p-3 transition-all ${armorType === null ? 'border-gold/50 bg-gold/5' : 'border-sep/40 bg-void/40 hover:border-gold/30'}`}>
                <span className="text-txt-main text-xs font-semibold">Sem categoria</span>
                <span className="block text-txt-dim/60 text-[11px] mt-0.5">Nao conta para bonus de conjunto.</span>
              </button>
              <div className="grid grid-cols-1 gap-2">
                {SET_BONUSES.map(s => {
                  const mainBonus = s.bonuses?.find(b => b.pieces === 3) || s.bonuses?.[0]
                  return (
                    <button key={s.id} type="button" onClick={() => setArmorType(s.id)}
                      className={`text-left border rounded-lg p-3 transition-all ${armorType === s.id ? `${s.borderClass} ${s.bgClass}` : 'border-sep/40 bg-void/40 hover:border-sep/70'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm font-semibold ${s.colorClass}`}>{s.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${s.badgeClass}`}>1+ / 3+</span>
                      </div>
                      <p className="text-txt-dim/70 text-[11px] mt-1 leading-relaxed">{s.desc}</p>
                      <div className="mt-2 grid gap-1.5">
                        <div className="rounded border border-white/5 bg-black/15 px-2 py-1.5">
                          <span className="block text-txt-dim/50 text-[9px] uppercase tracking-wider">Mini bonus</span>
                          <span className="text-txt-main/85 text-[11px] leading-relaxed">{s.miniBonus}</span>
                          {s.miniPassive && <span className="block text-txt-dim/60 text-[10px] mt-0.5 leading-relaxed">{s.miniPassive}</span>}
                        </div>
                        {mainBonus && (
                          <div className="rounded border border-white/5 bg-black/15 px-2 py-1.5">
                            <span className="block text-txt-dim/50 text-[9px] uppercase tracking-wider">Com 3 pecas</span>
                            <span className="text-txt-main/85 text-[11px] leading-relaxed">{mainBonus.label}: {mainBonus.bonus}</span>
                            <span className="block text-txt-dim/60 text-[10px] mt-0.5 leading-relaxed">{mainBonus.passive}</span>
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {step === detailStep && (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <button onClick={() => fileRef.current?.click()}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-sep/50 flex flex-col items-center justify-center hover:border-gold/40 transition-colors shrink-0 bg-void/50 overflow-hidden group relative"
                  onDrop={e => { e.stopPropagation(); handleDrop(e) }} onDragOver={e => { e.stopPropagation(); e.preventDefault() }}>
                  {preview ? (
                    <img src={preview} alt="" className="w-full h-full rounded-lg object-cover" />
                  ) : (
                    <>
                      <span className="text-txt-dim/40 text-lg group-hover:text-gold/50 transition-colors">📷</span>
                      <span className="text-txt-dim/30 text-[8px] mt-0.5">Colar / Arrastar</span>
                    </>
                  )}
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
                <div className="flex-1 space-y-2">
                  <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome"
                    className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-xs text-txt-main focus:border-gold/40 focus:outline-none" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" value={dano} onChange={e => setDano(e.target.value)} placeholder="Dano"
                      className="bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-xs text-txt-main font-mono focus:border-gold/40 focus:outline-none" />
                    <input type="text" value={efeitos} onChange={e => setEfeitos(e.target.value)} placeholder="Efeitos"
                      className="bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-xs text-txt-main focus:border-gold/40 focus:outline-none" />
                  </div>
                  {itemCategory === 'Equipamento' && (
                    <label className="flex items-center gap-2 text-[10px] text-txt-dim cursor-pointer">
                      <input type="checkbox" checked={equipado} onChange={e => setEquipado(e.target.checked)} className="accent-gold" />
                      Equipado
                    </label>
                  )}
                  {itemCategory === 'Arma' && (
                    <label className="flex items-center gap-2 text-[10px] text-txt-dim cursor-pointer">
                      <input type="checkbox" checked={equipado} onChange={e => setEquipado(e.target.checked)} className="accent-gold" />
                      Equipada
                    </label>
                  )}
                </div>
              </div>
              {(itemCategory === 'Arma' || itemCategory === 'Equipamento') && (forgeMaterials.length > 0 || materialEspecial) && (
                <ForgeMaterialPicker
                  char={char}
                  value={materialEspecial}
                  onChange={setMaterialEspecial}
                  category={itemCategory}
                />
              )}
              <div className={`grid gap-2 ${itemCategory === 'Utilidade' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <div className="flex gap-1.5">
                  <input type="number" step="0.1" value={peso} onChange={e => setPeso(e.target.value)} placeholder="Peso kg (unidade)"
                    className="min-w-0 flex-1 bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-xs text-txt-main focus:border-gold/40 focus:outline-none" />
                  <button type="button" onClick={handleAIWeight} disabled={genLoading || !nome.trim()} title="Sugerir peso com IA"
                    className="shrink-0 px-2.5 py-2 text-[10px] border border-indigo-400/30 text-indigo-300 rounded-lg hover:bg-indigo-400/10 transition-colors disabled:opacity-40">
                    IA
                  </button>
                </div>
                <input type="number" min="1" value={quantidade} onChange={e => setQuantidade(Math.max(1, Number(e.target.value)))} placeholder="Quantidade"
                  className="bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-xs text-txt-main focus:border-gold/40 focus:outline-none" />
                {itemCategory === 'Utilidade' && (
                  <select value={local} onChange={e => setLocal(e.target.value)}
                    className="bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-xs text-txt-main focus:border-gold/40 focus:outline-none">
                    <option value="mochila">Mochila</option>
                    <option value="veiculo">Veículo</option>
                    <option value="base">Base/Casa</option>
                    <option value="case">Case</option>
                    <option value="guardado">Guardado</option>
                  </select>
                )}
              </div>
              <textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descrição (opcional)" rows={2}
                className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-[11px] text-txt-main resize-none focus:border-gold/40 focus:outline-none" />
              {!rankAllowed && (
                <p className="text-err text-[10px]">
                  Rank acima do limite do nível {currentLevel}. Limite atual: {itemCategory === 'Arma' ? getWeaponLimitForLevel(currentLevel).maxRank : getEquipLimitForLevel(currentLevel).maxRank}.
                </p>
              )}

              {itemCategory === 'Arma' && rankDef.slots > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-txt-dim text-[10px] uppercase tracking-wider">Habilidades ({rankDef.rank})</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono ${usedSlots > rankDef.slots ? 'text-err' : 'text-txt-dim'}`}>
                        Slots: {usedSlots}/{rankDef.slots}
                      </span>
                      {selectedType && (
                        <button
                          onClick={handleAIGenerate}
                          disabled={genLoading}
                          className="text-[9px] bg-purple-500/10 border border-purple-400/30 text-purple-400 px-2 py-0.5 rounded hover:bg-purple-500/20 transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          {genLoading && <span className="animate-spin inline-block w-2.5 h-2.5 border border-purple-400/40 border-t-purple-400 rounded-full" />}
                          {genLoading ? '...' : '✦ IA'}
                        </button>
                      )}
                    </div>
                  </div>
                  {genError && <p className="text-err text-[9px] mb-1.5">{genError}</p>}
                  {habilidades.map((h, i) => (
                    <div key={i} className="bg-void/40 border border-sep/30 rounded-lg p-2 mb-1.5 space-y-1.5">
                      <div className="flex gap-1.5">
                        <input type="text" value={h.nome} onChange={e => updateHab(i, { nome: e.target.value })} placeholder="Nome"
                          className="flex-1 bg-void/60 border border-sep/40 rounded px-2 py-1 text-[10px] text-txt-main focus:border-gold/40 focus:outline-none" />
                        <select value={h.potencia} onChange={e => updateHab(i, { potencia: e.target.value })}
                          className="bg-void/60 border border-sep/40 rounded px-2 py-1 text-[10px] text-txt-main">
                          {Object.entries(WEAPON_ABILITY_COST).map(([l, c]) => <option key={l} value={l}>{l} ({c})</option>)}
                        </select>
                        <select value={h.tipo || 'Ativa'} onChange={e => updateHab(i, { tipo: e.target.value })}
                          className="bg-void/60 border border-sep/40 rounded px-2 py-1 text-[10px] text-txt-main">
                          <option value="Ativa">Ativa</option>
                          <option value="Passiva">Passiva</option>
                        </select>
                        <button onClick={() => removeHab(i)} className="text-err/50 hover:text-err text-xs px-1 shrink-0">✕</button>
                      </div>
                      <textarea value={h.descricao || ''} onChange={e => updateHab(i, { descricao: e.target.value })} placeholder="Descrição da habilidade..." rows={2}
                        className="w-full bg-void/60 border border-sep/40 rounded px-2 py-1 text-[9px] text-txt-main resize-none focus:border-gold/40 focus:outline-none leading-relaxed" />
                      <input type="text" value={h.custo || ''} onChange={e => updateHab(i, { custo: e.target.value })} placeholder="Custo (ex: 2 PA, 1 Ação...)"
                        className="w-full bg-void/60 border border-sep/40 rounded px-2 py-1 text-[10px] text-txt-main focus:border-gold/40 focus:outline-none" />
                    </div>
                  ))}
                  {usedSlots < rankDef.slots && (
                    <button onClick={addHabilidade} className="text-gold/60 hover:text-gold text-[10px]">+ Habilidade</button>
                  )}
                </div>
              )}

              {(itemCategory === 'Arma' || itemCategory === 'Equipamento') && forgeEnchantmentSlots > 0 && (
                <ForgeEnchantmentPicker
                  library={forgeLibrary}
                  selected={encantamentos}
                  limit={forgeEnchantmentSlots}
                  onToggle={toggleEncantamento}
                />
              )}

              {itemCategory === 'Equipamento' && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-txt-dim text-[10px] uppercase tracking-wider">Habilidades ({activeSlotsAvail} ativas / {passiveSlotsAvail} passivas)</span>
                    <button
                      onClick={handleAIEquip}
                      disabled={genLoading || equipSkillSlotsAvail === 0}
                      className="text-[9px] bg-emerald-500/10 border border-emerald-400/30 text-emerald-400 px-2 py-0.5 rounded hover:bg-emerald-500/20 transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {genLoading && <span className="animate-spin inline-block w-2.5 h-2.5 border border-emerald-400/40 border-t-emerald-400 rounded-full" />}
                      {genLoading ? '...' : '✦ IA Equipe'}
                    </button>
                  </div>
                  {genError && <p className="text-err text-[9px] mb-1.5">{genError}</p>}
                  {passivas.map((p, i) => (
                    <div key={i} className="bg-void/40 border border-emerald-400/15 rounded-lg p-2.5 mb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-emerald-400 text-[10px] font-semibold">{p.nome}</span>
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">{p.tipo || 'Passiva'}</span>
                      </div>
                      <p className="text-txt-dim/70 text-[10px] leading-relaxed">{p.descricao}</p>
                      <p className="text-primary/60 text-[9px] font-mono mt-1">{p.efeito}</p>
                    </div>
                  ))}
                  {equipSkillSlotsAvail === 0 && (
                    <p className="text-txt-dim/40 text-[10px] italic">Este rank ainda nÃ£o concede habilidades prÃ³prias. Os bÃ´nus numÃ©ricos da peÃ§a continuam ativos.</p>
                  )}
                  {equipSkillSlotsAvail > 0 && passivas.length === 0 && !genLoading && (
                    <p className="text-txt-dim/40 text-[10px] italic">Clique em "IA Equipe" para gerar habilidades do equipamento, ou deixe os slots livres.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-sep/30 flex justify-between shrink-0">
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)} className="text-txt-dim text-xs hover:text-txt-main px-3 py-1.5 transition-colors">← Voltar</button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={onClose} className="text-txt-dim text-xs hover:text-txt-main px-3 py-1.5 transition-colors">Cancelar</button>
            {step < detailStep ? (
              <button onClick={() => setStep(step + 1)} disabled={(step === 0 && !selectedType) || (step === 1 && !rankAllowed)}
                className={`text-xs px-4 py-1.5 rounded-lg font-semibold transition-colors ${((step === 0 && !selectedType) || (step === 1 && !rankAllowed)) ? 'bg-gold/20 text-void/40 cursor-not-allowed' : 'bg-gold text-void hover:bg-gold-light'}`}>
                Próximo →
              </button>
            ) : (
              <button onClick={handleSave} disabled={!nome.trim() || !rankAllowed}
                className={`text-xs px-4 py-1.5 rounded-lg font-semibold transition-colors ${nome.trim() && rankAllowed ? 'bg-gold text-void hover:bg-gold-light' : 'bg-gold/20 text-void/40 cursor-not-allowed'}`}>
                Criar Equipamento
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function EquipDrawer({ item, char, canEdit, editMode, onEdit, onCancelEdit, onSaveEdit, onDelete, onTransfer, onClose, onImageChange, imgRef, onAdjustImage }) {
  const { isAdmin } = useAuth()
  const rc = RANK_COLORS[item.rank] || RANK_COLORS.Comum
  const equipType = getEquipmentType(item)
  const armorTypeMeta = getArmorType(item)
  const rarity = item.categoria === 'Equipamento' ? getEquipmentRarity(item.rank) : null
  const equipHabilidades = item.equipHabilidades || item.passivas || []
  const itemRankBonus = WEAPON_RANKS.find(r => r.rank === item.rank)?.danoBonus
  const materialDamageBonus = getMaterialDamageDisplay(item)
  const [editNome, setEditNome] = useState(item.nome || '')
  const [editDesc, setEditDesc] = useState(item.descricao || '')
  const [editDano, setEditDano] = useState(item.dano || '')
  const [editEfeitos, setEditEfeitos] = useState(item.efeitos || '')
  const [editRank, setEditRank] = useState(item.rank || 'Comum')
  const [editEquipado, setEditEquipado] = useState(!!item.equipado)
  const [editArmorType, setEditArmorType] = useState(item.armorType || item.setId || null)
  const [editMaterialEspecial, setEditMaterialEspecial] = useState(item.materialEspecial || '')
  const [editPeso, setEditPeso] = useState(item.peso ?? '')
  const [editQuantidade, setEditQuantidade] = useState(Number(item.quantidade) || 1)
  const [editLocal, setEditLocal] = useState(item.local || (item.equipado ? 'equipado' : 'guardado'))
  const [editDurabilidadeAtual, setEditDurabilidadeAtual] = useState(item.durabilidadeAtual ?? item.durabilityAtual ?? item.armorAtual ?? '')
  const [editItemHabilidades, setEditItemHabilidades] = useState(item.habilidades || [])
  const [editEncantamentos, setEditEncantamentos] = useState(item.encantamentos || [])
  const [editEquipHabilidades, setEditEquipHabilidades] = useState(equipHabilidades || [])
  const currentLevel = char?.nivel || 1
  const systemSkillBonuses = calcSystemSkillBonuses(char || {})
  const forgeRankBonus = systemSkillBonuses.forgeRankBonus || 0
  const forgeEnchantmentSlots = (item.categoria === 'Arma' || item.categoria === 'Equipamento') ? getForgeEnchantmentLimit(editRank, systemSkillBonuses) : 0
  const weaponRankAllowance = getWeaponRankBonus(char) + forgeRankBonus
  const editRankAllowed = item.categoria === 'Arma' ? canUseWeaponRank(currentLevel, editRank, weaponRankAllowance) : item.categoria === 'Equipamento' ? canUseEquipRank(currentLevel, editRank) : true
  const editRankSaveAllowed = isAdmin ? editRankAllowed : true
  const editWeaponRank = WEAPON_RANKS.find(r => r.rank === editRank) || WEAPON_RANKS[0]
  const editWeaponUsedSlots = editItemHabilidades.reduce((sum, h) => sum + (WEAPON_ABILITY_COST[h.potencia] || 0), 0)
  const editEquipRarity = getEquipmentRarity(editRank)
  const editEquipSlots = item.categoria === 'Equipamento' ? ((editEquipRarity?.activeSkills || 0) + (editEquipRarity?.passiveSkills || 0)) : 0
  const editEquipUsedSlots = editEquipHabilidades.filter(h => h.nome?.trim() || h.descricao?.trim()).length
  const editAbilityOverflow = (item.categoria === 'Arma' && (editWeaponUsedSlots > editWeaponRank.slots || editEncantamentos.length > forgeEnchantmentSlots)) || (item.categoria === 'Equipamento' && (editEquipUsedSlots > editEquipSlots || editEncantamentos.length > forgeEnchantmentSlots))
  const forgeLibrary = (char?.forgeEnchantments || []).filter(enc => canUseForgeEnchantment(enc, item.categoria))
  const editForgeMaterials = getAvailableForgeMaterials(char || {})

  function updateEditItemHab(index, patch) {
    const next = [...editItemHabilidades]
    next[index] = { ...next[index], ...patch }
    setEditItemHabilidades(next)
  }

  function addEditItemHab() {
    if (editWeaponUsedSlots >= editWeaponRank.slots) return
    setEditItemHabilidades([...editItemHabilidades, { nome: '', potencia: 'Fraca', descricao: '', tipo: 'Ativa', custo: '' }])
  }

  function removeEditItemHab(index) {
    setEditItemHabilidades(editItemHabilidades.filter((_, i) => i !== index))
  }

  function toggleEditEncantamento(enc) {
    const exists = editEncantamentos.some(item => item.id === enc.id)
    if (exists) {
      setEditEncantamentos(editEncantamentos.filter(item => item.id !== enc.id))
      return
    }
    if (editEncantamentos.length >= forgeEnchantmentSlots) return
    setEditEncantamentos([...editEncantamentos, { ...enc }])
  }

  function updateEditEquipHab(index, patch) {
    const next = [...editEquipHabilidades]
    next[index] = { ...next[index], ...patch }
    setEditEquipHabilidades(next)
  }

  function addEditEquipHab() {
    if (editEquipUsedSlots >= editEquipSlots) return
    setEditEquipHabilidades([...editEquipHabilidades, { nome: '', tipo: 'Ativa', descricao: '', efeito: '' }])
  }

  function removeEditEquipHab(index) {
    setEditEquipHabilidades(editEquipHabilidades.filter((_, i) => i !== index))
  }

  function handleSave() {
    onSaveEdit({
      nome: editNome,
      descricao: editDesc,
      dano: editDano,
      efeitos: editEfeitos,
      rank: isAdmin ? editRank : item.rank,
      materialEspecial: (item.categoria === 'Arma' || item.categoria === 'Equipamento') ? editMaterialEspecial : '',
      equipado: editEquipado,
      habilidades: item.categoria === 'Arma' ? editItemHabilidades.filter(h => h.nome?.trim() || h.descricao?.trim()) : item.habilidades,
      encantamentos: (item.categoria === 'Arma' || item.categoria === 'Equipamento') ? editEncantamentos.filter(h => h.nome?.trim() || h.descricao?.trim()).slice(0, forgeEnchantmentSlots) : item.encantamentos,
      equipHabilidades: item.categoria === 'Equipamento' ? editEquipHabilidades.filter(h => h.nome?.trim() || h.descricao?.trim()) : item.equipHabilidades,
      passivas: item.categoria === 'Equipamento' ? editEquipHabilidades.filter(h => (h.tipo || '').includes('Passiva')) : item.passivas,
      armorType: editArmorType,
      setId: editArmorType,
      peso: editPeso === '' ? estimateEquipmentWeight({ ...item, nome: editNome, descricao: editDesc }) : Number(editPeso),
      local: (item.categoria === 'Arma' || item.categoria === 'Equipamento') ? (editEquipado ? 'equipado' : 'guardado') : editLocal,
      durabilidadeAtual: editDurabilidadeAtual === '' ? null : Number(editDurabilidadeAtual),
      quebrado: editDurabilidadeAtual !== '' && Number(editDurabilidadeAtual) <= 0,
      quantidade: editQuantidade > 1 ? editQuantidade : undefined,
    })
    onCancelEdit()
  }

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/40 drawer-overlay" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-[460px] bg-deep border-l border-primary/15 shadow-2xl shadow-black/60 flex flex-col drawer-panel">
        <div className="px-4 py-3 border-b border-sep/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="font-cinzel text-primary text-xs uppercase tracking-wider">Equipamento</h3>
            {item.rank && <span className={`text-[8px] px-1.5 py-0.5 rounded border ${rc.badge}`}>{item.rank}</span>}
          </div>
          <button onClick={onClose} className="text-txt-dim hover:text-err text-sm transition-colors">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {editMode && canEdit ? (
            <>
              <div className="flex justify-center">
                <button onClick={() => imgRef.current?.click()}
                  className="w-24 h-24 rounded-lg border border-sep/40 flex items-center justify-center hover:border-gold/40 transition-colors overflow-hidden bg-void/50">
                  {item.imagem ? <img src={item.imagem} alt="" className="w-full h-full object-cover" /> : <span className="text-txt-dim/40 text-xl">📷</span>}
                </button>
                <input ref={imgRef} type="file" accept="image/*" onChange={onImageChange} className="hidden" />
              </div>
              <input type="text" value={editNome} onChange={e => setEditNome(e.target.value)} placeholder="Nome"
                className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-sm text-txt-main focus:border-gold/40 focus:outline-none" />
              {item.categoria === 'Equipamento' && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] text-txt-dim cursor-pointer">
                    <input type="checkbox" checked={editEquipado} onChange={e => setEditEquipado(e.target.checked)} className="accent-gold" />
                    Equipado
                  </label>
                  <div>
                    <label className="text-txt-dim/50 text-[9px] uppercase">Categoria</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {SET_BONUSES.map(s => (
                        <button key={s.id} onClick={() => setEditArmorType(editArmorType === s.id ? null : s.id)}
                          className={`text-[9px] px-2 py-0.5 rounded border transition-colors ${editArmorType === s.id ? `${s.borderClass} ${s.bgClass} ${s.colorClass}` : 'border-sep/30 text-txt-dim/50 hover:border-sep/60'}`}>
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {item.categoria === 'Arma' && (
                <label className="flex items-center gap-2 text-[10px] text-txt-dim cursor-pointer">
                  <input type="checkbox" checked={editEquipado} onChange={e => setEditEquipado(e.target.checked)} className="accent-gold" />
                  Equipada
                </label>
              )}
              {(item.categoria === 'Arma' || item.categoria === 'Equipamento') && (editForgeMaterials.length > 0 || editMaterialEspecial) && (
                <ForgeMaterialPicker
                  char={char}
                  value={editMaterialEspecial}
                  onChange={setEditMaterialEspecial}
                  category={item.categoria}
                  currentMaterial={item.materialEspecial || ''}
                />
              )}
              <div>
                <label className="text-txt-dim/50 text-[9px] uppercase">Rank</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {WEAPON_RANKS.map(r => {
                    const c = RANK_COLORS[r.rank]
                    const allowed = item.categoria === 'Arma' ? canUseWeaponRank(currentLevel, r.rank, weaponRankAllowance) : item.categoria === 'Equipamento' ? canUseEquipRank(currentLevel, r.rank) : true
                    return (
                      <button key={r.rank} onClick={() => isAdmin && allowed && setEditRank(r.rank)} disabled={!isAdmin || !allowed}
                        title={!allowed ? `Limite atual: ${item.categoria === 'Arma' ? getWeaponLimitForLevel(currentLevel).maxRank : getEquipLimitForLevel(currentLevel).maxRank}` : r.rank}
                        className={`text-[9px] px-2 py-0.5 rounded border transition-colors ${editRank === r.rank ? `${c.badge}` : allowed ? 'border-sep/30 text-txt-dim/50 hover:border-sep/60' : 'border-sep/10 text-txt-dim/20 cursor-not-allowed'}`}>
                        {r.rank}
                      </button>
                    )
                  })}
                </div>
                <p className="text-txt-dim/45 text-[9px] mt-1">Limite atual: {item.categoria === 'Arma' ? getWeaponLimitForLevel(currentLevel).maxRank : getEquipLimitForLevel(currentLevel).maxRank}.</p>
              </div>
              <div className={`grid gap-2 ${item.categoria === 'Utilidade' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <div>
                  <label className="text-txt-dim/50 text-[9px] uppercase">Dano</label>
                  <input type="text" value={editDano} onChange={e => setEditDano(e.target.value)} placeholder="2d10+3"
                    className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-1.5 text-xs text-txt-main font-mono focus:border-gold/40 focus:outline-none" />
                </div>
                <div>
                  <label className="text-txt-dim/50 text-[9px] uppercase">Efeitos</label>
                  <input type="text" value={editEfeitos} onChange={e => setEditEfeitos(e.target.value)} placeholder="Efeitos"
                    className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-1.5 text-xs text-txt-main focus:border-gold/40 focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-txt-dim/50 text-[9px] uppercase">Peso kg (unidade)</label>
                  <input type="number" step="0.1" value={editPeso} onChange={e => setEditPeso(e.target.value)} placeholder="auto"
                    className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-1.5 text-xs text-txt-main focus:border-gold/40 focus:outline-none" />
                </div>
                <div>
                  <label className="text-txt-dim/50 text-[9px] uppercase">Quantidade</label>
                  <input type="number" min="1" value={editQuantidade} onChange={e => setEditQuantidade(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-1.5 text-xs text-txt-main focus:border-gold/40 focus:outline-none" />
                </div>
                {item.categoria === 'Utilidade' && <div>
                  <label className="text-txt-dim/50 text-[9px] uppercase">Local</label>
                  <select value={editLocal} onChange={e => setEditLocal(e.target.value)}
                    className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-1.5 text-xs text-txt-main focus:border-gold/40 focus:outline-none">
                    <option value="mochila">Mochila</option>
                    <option value="veiculo">Veículo</option>
                    <option value="base">Base/Casa</option>
                    <option value="case">Case</option>
                    <option value="guardado">Guardado</option>
                  </select>
                </div>}
              </div>
              {item.categoria === 'Equipamento' && (
                <div>
                  <label className="text-txt-dim/50 text-[9px] uppercase">Durabilidade atual</label>
                  <input type="number" step="1" value={editDurabilidadeAtual} onChange={e => setEditDurabilidadeAtual(e.target.value)} placeholder="cheia"
                    className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-1.5 text-xs text-txt-main focus:border-gold/40 focus:outline-none" />
                </div>
              )}
              {item.categoria === 'Arma' && (
                <div className="border-t border-sep/20 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-txt-dim text-[10px] uppercase tracking-wider">Habilidades da arma</span>
                    <span className={`text-[10px] font-mono ${editWeaponUsedSlots > editWeaponRank.slots ? 'text-err' : 'text-txt-dim'}`}>Slots {editWeaponUsedSlots}/{editWeaponRank.slots}</span>
                  </div>
                  <div className="space-y-2">
                    {editItemHabilidades.map((h, i) => (
                      <div key={i} className="bg-void/45 border border-sep/30 rounded-lg p-2 space-y-1.5">
                        <div className="flex gap-1.5">
                          <input type="text" value={h.nome || ''} onChange={e => updateEditItemHab(i, { nome: e.target.value })} placeholder="Nome"
                            className="min-w-0 flex-1 bg-void/60 border border-sep/40 rounded px-2 py-1 text-[10px] text-txt-main focus:border-gold/40 focus:outline-none" />
                          <select value={h.potencia || 'Fraca'} onChange={e => updateEditItemHab(i, { potencia: e.target.value })}
                            className="bg-void/60 border border-sep/40 rounded px-2 py-1 text-[10px] text-txt-main">
                            {Object.entries(WEAPON_ABILITY_COST).map(([label, cost]) => <option key={label} value={label}>{label} ({cost})</option>)}
                          </select>
                          <select value={h.tipo || 'Ativa'} onChange={e => updateEditItemHab(i, { tipo: e.target.value })}
                            className="bg-void/60 border border-sep/40 rounded px-2 py-1 text-[10px] text-txt-main">
                            <option value="Ativa">Ativa</option>
                            <option value="Passiva">Passiva</option>
                          </select>
                          <button onClick={() => removeEditItemHab(i)} className="text-err/55 hover:text-err text-xs px-1 shrink-0">x</button>
                        </div>
                        <textarea value={h.descricao || ''} onChange={e => updateEditItemHab(i, { descricao: e.target.value })} placeholder="Descricao da habilidade..." rows={2}
                          className="w-full bg-void/60 border border-sep/40 rounded px-2 py-1 text-[9px] text-txt-main resize-none focus:border-gold/40 focus:outline-none leading-relaxed" />
                        <input type="text" value={h.custo || ''} onChange={e => updateEditItemHab(i, { custo: e.target.value })} placeholder="Custo"
                          className="w-full bg-void/60 border border-sep/40 rounded px-2 py-1 text-[10px] text-txt-main focus:border-gold/40 focus:outline-none" />
                      </div>
                    ))}
                    {editWeaponUsedSlots < editWeaponRank.slots && (
                      <button onClick={addEditItemHab} className="text-gold/70 hover:text-gold text-[10px]">+ Habilidade</button>
                    )}
                  </div>
                </div>
              )}
              {(item.categoria === 'Arma' || item.categoria === 'Equipamento') && forgeEnchantmentSlots > 0 && (
                <ForgeEnchantmentPicker
                  library={forgeLibrary}
                  selected={editEncantamentos}
                  limit={forgeEnchantmentSlots}
                  onToggle={toggleEditEncantamento}
                />
              )}
              {item.categoria === 'Equipamento' && (
                <div className="border-t border-sep/20 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-txt-dim text-[10px] uppercase tracking-wider">Habilidades do equipamento</span>
                    <span className={`text-[10px] font-mono ${editEquipUsedSlots > editEquipSlots ? 'text-err' : 'text-txt-dim'}`}>Slots {editEquipUsedSlots}/{editEquipSlots}</span>
                  </div>
                  <div className="space-y-2">
                    {editEquipHabilidades.map((h, i) => (
                      <div key={i} className="bg-void/45 border border-emerald-400/15 rounded-lg p-2 space-y-1.5">
                        <div className="flex gap-1.5">
                          <input type="text" value={h.nome || ''} onChange={e => updateEditEquipHab(i, { nome: e.target.value })} placeholder="Nome"
                            className="min-w-0 flex-1 bg-void/60 border border-sep/40 rounded px-2 py-1 text-[10px] text-txt-main focus:border-gold/40 focus:outline-none" />
                          <select value={h.tipo || 'Ativa'} onChange={e => updateEditEquipHab(i, { tipo: e.target.value })}
                            className="bg-void/60 border border-sep/40 rounded px-2 py-1 text-[10px] text-txt-main">
                            <option value="Ativa">Ativa</option>
                            <option value="Passiva">Passiva</option>
                          </select>
                          <button onClick={() => removeEditEquipHab(i)} className="text-err/55 hover:text-err text-xs px-1 shrink-0">x</button>
                        </div>
                        <textarea value={h.descricao || ''} onChange={e => updateEditEquipHab(i, { descricao: e.target.value })} placeholder="Descricao da habilidade..." rows={2}
                          className="w-full bg-void/60 border border-sep/40 rounded px-2 py-1 text-[9px] text-txt-main resize-none focus:border-gold/40 focus:outline-none leading-relaxed" />
                        <input type="text" value={h.efeito || ''} onChange={e => updateEditEquipHab(i, { efeito: e.target.value })} placeholder="Efeito mecanico"
                          className="w-full bg-void/60 border border-sep/40 rounded px-2 py-1 text-[10px] text-txt-main focus:border-gold/40 focus:outline-none" />
                      </div>
                    ))}
                    {editEquipUsedSlots < editEquipSlots && (
                      <button onClick={addEditEquipHab} className="text-gold/70 hover:text-gold text-[10px]">+ Habilidade</button>
                    )}
                    {editEquipSlots === 0 && (
                      <p className="text-txt-dim/40 text-[10px] italic">Este rank nao concede slots de habilidade.</p>
                    )}
                  </div>
                </div>
              )}
              <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Descrição" rows={3}
                className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-xs text-txt-main resize-none focus:border-gold/40 focus:outline-none leading-relaxed" />
            </>
          ) : (
            <>
              {item.imagem && (
                <div className="flex justify-center">
                  <img src={item.imagem} alt="" className="w-28 h-28 rounded-lg object-cover border border-sep/30" />
                </div>
              )}
              <div>
                <h4 className="text-txt-main text-sm font-semibold">{item.nome || 'Equipamento'}</h4>
                {item.categoria === 'Equipamento' && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {item.equipado && <span className="text-[9px] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded">equipado</span>}
                    {item.quebrado && <span className="text-[9px] text-err bg-err/10 border border-err/20 px-1.5 py-0.5 rounded">quebrado</span>}
                    {equipType?.label && <span className="text-[9px] text-txt-dim/70 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">{equipType.label}</span>}
                    {armorTypeMeta && <span className={`text-[9px] px-1.5 py-0.5 rounded border ${armorTypeMeta.badgeClass}`}>{armorTypeMeta.label}</span>}
                    <span className="text-[9px] text-txt-dim/70 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">{item.equipado ? 'equipado' : 'guardado'}</span>
                  </div>
                )}
              </div>
              {item.categoria === 'Equipamento' && equipType && rarity && (
                <div className="grid grid-cols-2 gap-2">
                  <div className={`bg-void/50 border rounded-lg px-3 py-2 ${rc.border}`}>
                    <span className="text-txt-dim/50 text-[9px] uppercase">Armadura</span>
                    <p className="text-primary text-sm font-mono mt-0.5">{getEquipmentArmorValue(item)}</p>
                  </div>
                  <div className="bg-void/50 border border-sep/30 rounded-lg px-3 py-2">
                    <span className="text-txt-dim/50 text-[9px] uppercase">Durabilidade</span>
                    <p className="text-emerald-300 text-sm font-mono mt-0.5">{getEquipmentDurabilityCurrent(item)} / {getEquipmentDurabilityMax(item)}</p>
                  </div>
                  <div className="bg-void/50 border border-sep/30 rounded-lg px-3 py-2">
                    <span className="text-txt-dim/50 text-[9px] uppercase">Peso</span>
                    <p className="text-txt-main text-sm font-mono mt-0.5">{(estimateEquipmentWeight(item) * (Number(item.quantidade) || 1)).toFixed(1)} kg</p>
                  </div>
                  <div className="bg-void/50 border border-sep/30 rounded-lg px-3 py-2">
                    <span className="text-txt-dim/50 text-[9px] uppercase">Penalidade</span>
                    <p className="text-amber-300 text-sm font-mono mt-0.5">{equipType.penalty ? `${equipType.penalty} DES` : '0'}</p>
                  </div>
                  {Number(item.quantidade) > 1 && (
                    <div className="bg-void/50 border border-sep/30 rounded-lg px-3 py-2 col-span-2">
                      <span className="text-txt-dim/50 text-[9px] uppercase">Quantidade</span>
                      <p className="text-sky-300 text-sm font-mono mt-0.5">{item.quantidade}x</p>
                    </div>
                  )}
                </div>
              )}
              {item.categoria !== 'Equipamento' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-void/50 border border-sep/30 rounded-lg px-3 py-2">
                    <span className="text-txt-dim/50 text-[9px] uppercase">Peso</span>
                    <p className="text-txt-main text-sm font-mono mt-0.5">{(estimateEquipmentWeight(item) * (Number(item.quantidade) || 1)).toFixed(1)} kg</p>
                  </div>
                  <div className="bg-void/50 border border-sep/30 rounded-lg px-3 py-2">
                    <span className="text-txt-dim/50 text-[9px] uppercase">{item.categoria === 'Arma' ? 'Estado' : 'Local'}</span>
                    <p className="text-txt-main text-sm font-mono mt-0.5">{item.categoria === 'Arma' ? (item.equipado ? 'equipada' : 'guardada') : (item.local || 'guardado')}</p>
                  </div>
                  {Number(item.quantidade) > 1 && (
                    <div className="bg-void/50 border border-sep/30 rounded-lg px-3 py-2 col-span-2">
                      <span className="text-txt-dim/50 text-[9px] uppercase">Quantidade</span>
                      <p className="text-sky-300 text-sm font-mono mt-0.5">{item.quantidade}x</p>
                    </div>
                  )}
                </div>
              )}
              {item.dano && (
                <div className={`bg-void/50 border rounded-lg px-3 py-2 ${rc.border}`}>
                  <span className="text-txt-dim/50 text-[9px] uppercase">Dano</span>
                  <p className="text-red-400/90 text-sm font-mono mt-0.5">{item.dano}{itemRankBonus ? ` ${itemRankBonus}` : ''}{materialDamageBonus ? ` ${materialDamageBonus}` : ''}</p>
                </div>
              )}
              {item.materialEspecial && (
                <div className={`rounded-lg px-3 py-2 ${item.materialEspecial === 'ferro_hefestiano' ? 'bg-amber-300/5 border-amber-300/20' : item.materialEspecial === 'ferro_tartaro' ? 'bg-indigo-300/5 border-indigo-400/20' : item.materialEspecial === 'aco_astrano' ? 'bg-purple-300/5 border-purple-400/20' : item.materialEspecial === 'vibranium' ? 'bg-cyan-300/5 border-cyan-400/20' : item.materialEspecial === 'aco_olimpiano' ? 'bg-yellow-300/5 border-yellow-400/20' : 'bg-gray-300/5 border-gray-400/20'}`}>
                  <span className={`text-[9px] uppercase ${item.materialEspecial === 'ferro_hefestiano' ? 'text-amber-200/70' : item.materialEspecial === 'ferro_tartaro' ? 'text-indigo-200/70' : item.materialEspecial === 'aco_astrano' ? 'text-purple-200/70' : item.materialEspecial === 'vibranium' ? 'text-cyan-200/70' : item.materialEspecial === 'aco_olimpiano' ? 'text-yellow-200/70' : 'text-gray-200/70'}`}>Material</span>
                  <p className={`text-xs mt-0.5 leading-relaxed ${item.materialEspecial === 'ferro_hefestiano' ? 'text-amber-100/80' : item.materialEspecial === 'ferro_tartaro' ? 'text-indigo-100/80' : item.materialEspecial === 'aco_astrano' ? 'text-purple-100/80' : item.materialEspecial === 'vibranium' ? 'text-cyan-100/80' : item.materialEspecial === 'aco_olimpiano' ? 'text-yellow-100/80' : 'text-gray-100/80'}`}>
                    {getMaterialLabel(item.materialEspecial)}: {item.categoria === 'Equipamento' ? `+${getMaterialArmorBonus(item.materialEspecial)} Armadura e +${getMaterialDurabilityBonus(item.materialEspecial)} Durabilidade maxima.` : `${getMaterialDamageBonus(item.materialEspecial)} de dano material.`}
                    {getMaterialSpecial(item.materialEspecial) && <span className="block mt-1 text-[10px] italic">{getMaterialSpecial(item.materialEspecial)}</span>}
                  </p>
                </div>
              )}
              {item.efeitos && (
                <div className="bg-void/50 border border-sep/30 rounded-lg px-3 py-2">
                  <span className="text-txt-dim/50 text-[9px] uppercase">Efeitos</span>
                  <p className="text-txt-dim/80 text-xs mt-0.5 leading-relaxed">{item.efeitos}</p>
                </div>
              )}
              {(item.habilidades || []).length > 0 && (
                <div>
                  <span className="text-txt-dim/50 text-[9px] uppercase">Habilidades</span>
                  <div className="space-y-1.5 mt-1">
                    {(item.habilidades || []).map((h, i) => (
                      <div key={i} className={`bg-void/50 border rounded-lg px-2.5 py-2 ${rc.border}`}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-txt-main text-[11px] font-semibold">{h.nome || 'Hab'}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-sep/20 text-txt-dim/70 border border-sep/30">{h.potencia}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border ${h.tipo === 'Passiva' ? 'bg-blue-500/10 text-blue-400/80 border-blue-500/20' : 'bg-amber-500/10 text-amber-400/80 border-amber-500/20'}`}>
                            {h.tipo || 'Ativa'}
                          </span>
                          {h.custo && <span className="text-[9px] text-gold/70 ml-auto font-mono">{h.custo}</span>}
                        </div>
                        {h.descricao && <p className="text-txt-dim/60 text-[10px] mt-1 leading-relaxed">{h.descricao}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(item.encantamentos || []).length > 0 && (
                <div>
                  <span className="text-amber-200/70 text-[9px] uppercase">Encantamentos</span>
                  <div className="space-y-1.5 mt-1">
                    {(item.encantamentos || []).map((enc, i) => (
                      <div key={i} className="bg-amber-300/5 border border-amber-300/20 rounded-lg px-2.5 py-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-txt-main text-[11px] font-semibold">{enc.nome || 'Encantamento'}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-300/10 text-amber-200/80 border border-amber-300/20">ENC</span>
                          {enc.custo && <span className="text-[9px] text-gold/70 ml-auto font-mono">{enc.custo}</span>}
                        </div>
                        {enc.descricao && <p className="text-txt-dim/60 text-[10px] mt-1 leading-relaxed">{enc.descricao}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {equipHabilidades.length > 0 && (
                <div>
                  <span className="text-txt-dim/50 text-[9px] uppercase">Habilidades do equipamento</span>
                  <div className="space-y-1.5 mt-1">
                    {equipHabilidades.map((h, i) => (
                      <div key={i} className={`bg-void/50 border rounded-lg px-2.5 py-2 ${rc.border}`}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-txt-main text-[11px] font-semibold">{h.nome || 'Hab'}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border ${h.tipo === 'Passiva' ? 'bg-blue-500/10 text-blue-400/80 border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400/80 border-emerald-500/20'}`}>
                            {h.tipo || 'Passiva'}
                          </span>
                        </div>
                        {h.descricao && <p className="text-txt-dim/60 text-[10px] mt-1 leading-relaxed">{h.descricao}</p>}
                        {h.efeito && <p className="text-primary/60 text-[9px] font-mono mt-1">{h.efeito}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {item.descricao ? (
                <p className="text-txt-dim/80 text-xs leading-relaxed">{item.descricao}</p>
              ) : (
                <p className="text-txt-dim/30 text-xs italic">Sem descrição</p>
              )}
            </>
          )}
        </div>

        <div className="px-4 py-3 border-t border-sep/30 flex gap-2 shrink-0">
          {canEdit && !editMode && (
            <>
              {(item.categoria === 'Arma' || item.categoria === 'Equipamento') && (
                <button onClick={() => onSaveEdit({ equipado: !item.equipado, local: item.equipado ? 'guardado' : 'equipado' })}
                  className={`text-[10px] border px-3 py-1.5 rounded-lg transition-colors ${item.equipado ? 'border-emerald-400/30 text-emerald-300 hover:bg-emerald-400/10' : 'border-sky-400/30 text-sky-300 hover:bg-sky-400/10'}`}>
                  {item.equipado ? 'Desequipar' : 'Equipar'}
                </button>
              )}
              <button onClick={onEdit} className="text-[10px] border border-gold/30 text-gold px-3 py-1.5 rounded-lg hover:bg-gold/10 transition-colors">Editar</button>
              <button onClick={onDelete} className="text-[10px] border border-err/30 text-err px-3 py-1.5 rounded-lg hover:bg-err/10 transition-colors">Excluir</button>
              {item.imagem && onAdjustImage && <button onClick={onAdjustImage} className="text-[10px] border border-purple-400/30 text-purple-300 px-3 py-1.5 rounded-lg hover:bg-purple-400/10 transition-colors">Ajustar Imagem</button>}
              {onTransfer && <button onClick={onTransfer} className="text-[10px] border border-sky-400/30 text-sky-300 px-3 py-1.5 rounded-lg hover:bg-sky-400/10 transition-colors">Transferir</button>}
            </>
          )}
          {editMode && (
            <>
              <button onClick={handleSave} disabled={!editRankSaveAllowed || editAbilityOverflow}
                className="text-[10px] bg-gold text-void px-3 py-1.5 rounded-lg hover:bg-gold-light transition-colors font-semibold disabled:opacity-40 disabled:cursor-not-allowed">Salvar</button>
              <button onClick={onCancelEdit} className="text-[10px] text-txt-dim hover:text-txt-main px-3 py-1.5 transition-colors">Cancelar</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
