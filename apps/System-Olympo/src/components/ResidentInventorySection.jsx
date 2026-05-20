import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ITEM_COLORS } from '../data/colors'
import { WEAPONS, WEAPON_RANKS, getWeaponWeight } from '../data/weapons'
import { EQUIPMENT_TYPES, calcEquipStats, estimateEquipmentWeight } from '../data/equipment'
import { estimateInventoryItemWeight } from '../utils/calculator'
import { suggestItemWeight } from '../services/aiService'
import { EquipCreateModal, EquipDrawer, OutfitCreateModalClean, OutfitDrawerClean, WeaponDrawer } from './EquipmentSection'

const GRID_COLS = 10
const GRID_ROWS = 8
const BASE_LOCATIONS = [
  { id: 'carregado', label: 'Personagem', icon: 'person' },
  { id: 'quarto', label: 'Quarto', icon: 'bed' },
  { id: 'base', label: 'Base', icon: 'home' },
]

function normalizeLocation(local, item = {}) {
  if (item.equipado || local === 'equipado' || local === 'mochila' || local === 'guardado' || !local) return 'carregado'
  if (local === 'casa' || local === 'case') return 'quarto'
  return local
}

function locationLabel(locations, id) {
  return locations.find(loc => loc.id === id)?.label || id
}

function slugLocation(value) {
  const base = String(value || 'local')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return base || `local_${Date.now()}`
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function entryBaseSize(entry) {
  const item = entry.item || {}
  const override = item.inventorySize
  if (override && override.w && override.h) return override
  if (entry.source === 'primary') {
    const wName = (item.nome || item.id || '').toLowerCase()
    if (/espingarda|rifle|baioneta/i.test(wName)) return { w: 4, h: 1 }
    if (/machado|martelo|martel[ao]|macha/i.test(wName)) return { w: 2, h: 2 }
    if (/lanca|alabarda|tridente|glaive/i.test(wName)) return { w: 1, h: 4 }
    if (/adaga|punhal|faca|kunai/i.test(wName)) return { w: 1, h: 1 }
    if (/pistola|revolver|arma.*curta/i.test(wName)) return { w: 1, h: 2 }
    if (/arco|besta/i.test(wName)) return { w: 2, h: 3 }
    return { w: 3, h: 1 }
  }
  if (item.categoria === 'Traje') return { w: 2, h: 3 }
  if (item.categoria === 'Arma') {
    const wName = (item.nome || item.id || '').toLowerCase()
    if (/machado|martelo/i.test(wName)) return { w: 2, h: 2 }
    if (/adaga|punhal|faca/i.test(wName)) return { w: 1, h: 1 }
    if (/pistola|revolver/i.test(wName)) return { w: 1, h: 2 }
    if (/escudo/i.test(wName)) return { w: 2, h: 3 }
    return { w: 3, h: 1 }
  }
  if (item.categoria === 'Equipamento') return { w: 2, h: 2 }
  if (item.tipo === 'mochila') {
    const cap = Number(item.slotSize || item.capacidade || 12)
    if (cap >= 20) return { w: 3, h: 3 }
    if (cap >= 12) return { w: 2, h: 2 }
    return { w: 2, h: 1 }
  }
  if (/kit|carga|corda|drone/i.test(item.nome || item.id || '')) return { w: 2, h: 1 }
  if (/pocao|seringa|po..o|frasco/i.test(item.nome || item.id || '')) return { w: 1, h: 1 }
  return { w: 1, h: 1 }
}

function resolveSize(entry, rotated = 0) {
  const stored = entry.item?.inventorySize || {}
  const base = { ...entryBaseSize(entry), ...stored }
  const turns = ((rotated || 0) / 90) % 4
  if (turns === 1 || turns === 3) return { w: base.h, h: base.w }
  return base
}

function findFreeSpot(size, occupied) {
  for (let y = 0; y <= GRID_ROWS - size.h; y++) {
    for (let x = 0; x <= GRID_COLS - size.w; x++) {
      const rect = { x, y, ...size }
      if (!occupied.some(other => rectsOverlap(rect, other))) return rect
    }
  }
  return { x: 0, y: 0, ...size }
}

function findFreeSpotIn(size, occupied, cols, rows) {
  for (let y = 0; y <= rows - size.h; y++) {
    for (let x = 0; x <= cols - size.w; x++) {
      const rect = { x, y, ...size }
      if (!occupied.some(other => rectsOverlap(rect, other))) return rect
    }
  }
  return null
}

function getBackpackGridDims(capacity) {
  const c = Math.max(4, Math.min(30, capacity || 12))
  if (c <= 4) return { cols: 2, rows: 2 }
  if (c <= 6) return { cols: 3, rows: 2 }
  if (c <= 9) return { cols: 3, rows: 3 }
  if (c <= 12) return { cols: 4, rows: 3 }
  if (c <= 16) return { cols: 4, rows: 4 }
  if (c <= 20) return { cols: 5, rows: 4 }
  if (c <= 24) return { cols: 6, rows: 4 }
  return { cols: 6, rows: 5 }
}

function layoutBackpackContents(contents, cols, rows) {
  const occupied = []
  return (contents || []).map((item, idx) => {
    const entry = { key: `bp:${item.id || idx}`, source: 'backpack', idx, item }
    const stored = item.inventoryGrid
    const rotated = stored?.rotated || 0
    const size = resolveSize(entry, rotated)
    let rect = stored && Number.isFinite(stored.x) && Number.isFinite(stored.y)
      ? { x: stored.x, y: stored.y, w: size.w, h: size.h, rotated }
      : null
    const invalid = !rect || rect.x < 0 || rect.y < 0 || rect.x + rect.w > cols || rect.y + rect.h > rows || occupied.some(other => rectsOverlap(rect, other))
    if (invalid) {
      const spot = findFreeSpotIn(size, occupied, cols, rows)
      rect = spot ? { ...spot, rotated } : { x: 0, y: 0, ...size, rotated }
    }
    occupied.push(rect)
    return { ...entry, rect }
  })
}

function buildLocations(char, entries) {
  const custom = Array.isArray(char.inventoryLocations) ? char.inventoryLocations : []
  const used = entries
    .map(entry => normalizeLocation(entry.item?.local || entry.item?.armaLocal, entry.item))
    .filter(id => id && !BASE_LOCATIONS.some(loc => loc.id === id) && !custom.some(loc => loc.id === id))
    .map(id => ({ id, label: id, icon: 'inventory_2' }))
  return [...BASE_LOCATIONS, ...custom, ...used]
}

function buildEntries(char) {
  const weapon = WEAPONS.find(w => w.id === char.arma)
  const weaponRank = WEAPON_RANKS.find(r => r.rank === char.armaRank) || WEAPON_RANKS[0]
  const entries = []

  if (weapon) {
    entries.push({
      key: 'primary:weapon',
      source: 'primary',
      idx: null,
      item: {
        id: char.arma,
        nome: char.armaNome || weapon.name,
        categoria: 'Arma',
        rank: char.armaRank || 'Comum',
        imagem: char.armaImagem,
        equipado: char.armaEquipada !== false,
        local: char.armaEquipada === false ? (char.armaLocal || 'carregado') : 'equipado',
        inventoryGrid: char.armaInventoryGrid,
        dano: weapon.dano,
      },
      weapon,
      weaponRank,
    })
  }

  ;(char.equipamentos || []).forEach((item, idx) => {
    entries.push({ key: `equip:${item.id || idx}`, source: 'equipment', idx, item })
  })

  ;(char.inventario || []).forEach((item, idx) => {
    entries.push({ key: `item:${item.id || idx}`, source: 'inventory', idx, item })
  })

  ;(char.armasLendarias || []).forEach((item, idx) => {
    entries.push({
      key: `legendary:${item.id || idx}`,
      source: 'legendary',
      idx,
      item: {
        id: item.id,
        nome: item.name,
        categoria: 'Arma Lendária',
        rank: item.rank || 'Lendária',
        imagem: item.image,
        equipado: true,
        local: 'equipado',
        inventoryGrid: item.inventoryGrid,
      },
    })
  })

  return entries
}

function layoutEntries(entries, activeLocation) {
  const occupied = []
  return entries.map(entry => {
    const stored = entry.source === 'primary' ? entry.item.inventoryGrid : entry.item.inventoryGrid
    const rotated = stored?.rotated || 0
    const size = resolveSize(entry, rotated)
    let rect = stored && Number.isFinite(stored.x) && Number.isFinite(stored.y)
      ? { x: stored.x, y: stored.y, w: size.w, h: size.h, rotated }
      : null
    const invalid = !rect || rect.x < 0 || rect.y < 0 || rect.x + rect.w > GRID_COLS || rect.y + rect.h > GRID_ROWS || occupied.some(other => rectsOverlap(rect, other))
    if (invalid) rect = { ...findFreeSpot(size, occupied), rotated }
    occupied.push(rect)
    return { ...entry, rect, activeLocation }
  })
}

export default function ResidentInventorySection({
  char,
  canEdit,
  update,
  onTransferItem,
  maxCarry,
  totalCarryWeight,
}) {
  const [activeLocation, setActiveLocation] = useState('carregado')
  const [showCreateHub, setShowCreateHub] = useState(false)
  const [showEquipCreate, setShowEquipCreate] = useState(null)
  const [showOutfitCreate, setShowOutfitCreate] = useState(false)
  const [pieceOutfitId, setPieceOutfitId] = useState(null)
  const [showItemCreate, setShowItemCreate] = useState(null)
  const [newLocationName, setNewLocationName] = useState('')
  const [dragging, setDragging] = useState(null)
  const [hoverSlot, setHoverSlot] = useState(null)
  const [itemDrawer, setItemDrawer] = useState(null)
  const [backpackDrawer, setBackpackDrawer] = useState(null)
  const [backpackDragging, setBackpackDragging] = useState(null)
  const [itemEditMode, setItemEditMode] = useState(false)
  const [equipDrawer, setEquipDrawer] = useState(null)
  const [outfitDrawer, setOutfitDrawer] = useState(null)
  const [equipEditMode, setEquipEditMode] = useState(false)
  const [showWeaponDrawer, setShowWeaponDrawer] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState(null)
  const itemImgRef = useRef(null)
  const equipImgRef = useRef(null)

  const allEntries = useMemo(() => buildEntries(char), [char])
  const locations = useMemo(() => buildLocations(char, allEntries), [char, allEntries])
  const activeEntries = useMemo(() => allEntries.filter(entry => !entry.item.trajeId && normalizeLocation(entry.item.local, entry.item) === activeLocation), [allEntries, activeLocation])
  const gridEntries = useMemo(() => layoutEntries(activeEntries, activeLocation), [activeEntries, activeLocation])

  useEffect(() => {
    if (!canEdit) return
    function onKeyDown(e) {
      if (e.key === 'r' || e.key === 'R') {
        if (selectedEntry) rotateEntry(selectedEntry)
        else if (dragging) {
          const base = entryBaseSize(dragging.entry)
          if (base.w !== base.h) setDragging(current => current ? { ...current, rotated: ((current.rotated || 0) + 90) % 360 } : null)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [canEdit, selectedEntry, dragging, gridEntries])

  const equippedWeapons = allEntries.filter(entry => entry.item.categoria === 'Arma' && entry.item.equipado).slice(0, 3)
  const equippedOutfit = allEntries.find(entry => entry.item.categoria === 'Traje' && entry.item.equipado)
  const equipmentStats = calcEquipStats(char.equipamentos || [])

  function patchInventoryItem(idx, patch) {
    const inventario = [...(char.inventario || [])]
    inventario[idx] = { ...inventario[idx], ...patch }
    update({ inventario })
  }

  function patchEquipment(idx, patch) {
    const equipamentos = [...(char.equipamentos || [])]
    equipamentos[idx] = { ...equipamentos[idx], ...patch }
    if (patch.equipado) {
      const type = EQUIPMENT_TYPES.find(t => t.id === equipamentos[idx]?.tipoEquip)
      if (type?.slot) {
        equipamentos.forEach((item, i) => {
          const itemType = EQUIPMENT_TYPES.find(t => t.id === item?.tipoEquip)
          if (i !== idx && item.equipado && itemType?.slot === type.slot) {
            equipamentos[i] = { ...item, equipado: false, local: 'carregado' }
          }
        })
      }
    }
    update({ equipamentos })
  }

  function patchEntry(entry, patch) {
    if (entry.source === 'inventory') patchInventoryItem(entry.idx, patch)
    if (entry.source === 'equipment') patchEquipment(entry.idx, patch)
    if (entry.source === 'primary') update(patch)
  }

  function removeEntry(entry) {
    if (entry.source === 'inventory') {
      update({ inventario: (char.inventario || []).filter((_, i) => i !== entry.idx) })
      setItemDrawer(null)
    }
    if (entry.source === 'equipment') {
      update({ equipamentos: (char.equipamentos || []).filter((_, i) => i !== entry.idx) })
      setEquipDrawer(null)
    }
    if (entry.source === 'primary') {
      update({ arma: null, armaRank: 'Comum', armaEquipada: true, armaLocal: 'equipado', armaHabilidades: [], armaNome: '', armaImagem: null })
      setShowWeaponDrawer(false)
    }
  }

  function moveEntry(entry, targetLocation) {
    if (entry.source === 'primary') {
      update({ armaLocal: targetLocation, armaEquipada: targetLocation === 'carregado' })
      return
    }
    const patch = { local: targetLocation }
    if (entry.source === 'equipment') patch.equipado = targetLocation === 'carregado' ? entry.item.equipado : false
    patchEntry(entry, patch)
  }

  function toggleEquipped(entry) {
    if (entry.item.categoria === 'Traje') {
      const nextEquipped = !entry.item.equipado
      const equipamentos = (char.equipamentos || []).map(item => {
        if (item.id === entry.item.id) return { ...item, equipado: nextEquipped, local: nextEquipped ? 'equipado' : 'carregado' }
        if (item.trajeId === entry.item.id && (item.categoria === 'Arma' || item.categoria === 'Equipamento')) {
          return { ...item, equipado: nextEquipped, local: nextEquipped ? 'equipado' : 'carregado' }
        }
        return item
      })
      update({ equipamentos })
      return
    }
    if (entry.source === 'primary') {
      update({ armaEquipada: char.armaEquipada === false, armaLocal: char.armaEquipada === false ? 'equipado' : 'carregado' })
      return
    }
    if (entry.source === 'equipment' && (entry.item.categoria === 'Arma' || entry.item.categoria === 'Equipamento')) {
      patchEquipment(entry.idx, { equipado: !entry.item.equipado, local: !entry.item.equipado ? 'equipado' : 'carregado' })
    }
  }

  function openEntry(entry) {
    if (entry.source === 'primary') {
      setShowWeaponDrawer(true)
    } else if (entry.item.categoria === 'Traje') {
      setOutfitDrawer(entry)
    } else if (entry.source === 'equipment') {
      setEquipDrawer(entry)
      setEquipEditMode(false)
    } else if (entry.item.tipo === 'mochila') {
      setBackpackDrawer(entry)
      setItemEditMode(false)
    } else {
      setItemDrawer(entry)
      setItemEditMode(false)
    }
  }

  function createLocation() {
    const label = newLocationName.trim()
    if (!label) return
    const existing = locations.some(loc => loc.label.toLowerCase() === label.toLowerCase())
    if (existing) return
    const id = slugLocation(label)
    update({ inventoryLocations: [...(char.inventoryLocations || []), { id, label, icon: 'inventory_2' }] })
    setNewLocationName('')
    setActiveLocation(id)
  }

  function addEquipmentItem(item) {
    const local = activeLocation === 'carregado' ? (item.equipado ? 'equipado' : 'carregado') : activeLocation
    update({ equipamentos: [...(char.equipamentos || []), { ...item, local, equipado: activeLocation === 'carregado' ? item.equipado : false }] })
    setShowEquipCreate(null)
  }

  function addInventoryItem(item) {
    update({ inventario: [...(char.inventario || []), { id: Date.now(), local: activeLocation, inventoryGrid: null, ...item }] })
    setShowItemCreate(null)
  }

  function addOutfit(item) {
    update({ equipamentos: [...(char.equipamentos || []), { ...item, local: activeLocation, equipado: false }] })
    setShowOutfitCreate(false)
  }

  function addOutfitPiece(item) {
    if (!pieceOutfitId) return
    const type = EQUIPMENT_TYPES.find(t => t.id === item.tipoEquip)
    const alreadyUsed = type?.slot && (char.equipamentos || []).some(piece => piece.trajeId === pieceOutfitId && EQUIPMENT_TYPES.find(t => t.id === piece.tipoEquip)?.slot === type.slot)
    if (alreadyUsed) return
    update({ equipamentos: [...(char.equipamentos || []), { ...item, trajeId: pieceOutfitId, local: 'carregado', equipado: false }] })
    setPieceOutfitId(null)
  }

  function handleDrop(slotIndex) {
    if (!dragging) return
    const x = slotIndex % GRID_COLS
    const y = Math.floor(slotIndex / GRID_COLS)
    const backpackAtSlot = gridEntries.find(entry => {
      const r = entry.rect
      return entry.item.tipo === 'mochila' && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h && entry.key !== dragging.entry.key
    })
    if (backpackAtSlot) {
      moveIntoBackpack(backpackAtSlot, dragging.entry)
      setDragging(null)
      setHoverSlot(null)
      return
    }
    const size = resolveSize(dragging.entry, dragging.rotated)
    const rect = { x, y, ...size, rotated: dragging.rotated }
    const occupied = gridEntries.filter(entry => entry.key !== dragging.entry.key).map(entry => entry.rect)
    if (rect.x + rect.w > GRID_COLS || rect.y + rect.h > GRID_ROWS || occupied.some(other => rectsOverlap(rect, other))) {
      setDragging(null)
      setHoverSlot(null)
      return
    }
    const patch = { inventoryGrid: rect, local: activeLocation }
    if (dragging.entry.source === 'primary') {
      update({ armaInventoryGrid: rect, armaLocal: activeLocation, armaEquipada: activeLocation === 'carregado' ? char.armaEquipada !== false : false })
    } else if (dragging.entry.source === 'equipment') {
      patch.equipado = activeLocation === 'carregado' ? dragging.entry.item.equipado : false
      patchEquipment(dragging.entry.idx, patch)
    } else {
      patchInventoryItem(dragging.entry.idx, patch)
    }
    setDragging(null)
    setHoverSlot(null)
  }

  function handleGridWheel(event) {
    if (!dragging) return
    event.preventDefault()
    const base = entryBaseSize(dragging.entry)
    if (base.w === base.h) return
    setDragging(current => current ? { ...current, rotated: ((current.rotated || 0) + 90) % 360 } : null)
  }

  function rotateEntry(entry) {
    const currentRect = gridEntries.find(item => item.key === entry.key)?.rect || entry.rect
    if (!currentRect) return
    const nextRotated = ((currentRect.rotated || 0) + 90) % 360
    const size = resolveSize(entry, nextRotated)
    let rect = {
      x: Math.min(currentRect.x, GRID_COLS - size.w),
      y: Math.min(currentRect.y, GRID_ROWS - size.h),
      w: size.w,
      h: size.h,
      rotated: nextRotated,
    }
    if (rect.x < 0 || rect.y < 0) return
    const occupied = gridEntries.filter(item => item.key !== entry.key).map(item => item.rect)
    if (occupied.some(other => rectsOverlap(rect, other))) return

    if (entry.source === 'primary') {
      update({ armaInventoryGrid: rect })
    } else if (entry.source === 'equipment') {
      patchEquipment(entry.idx, { inventoryGrid: rect })
    } else {
      patchInventoryItem(entry.idx, { inventoryGrid: rect })
    }
  }

  function moveIntoBackpack(backpackEntry, draggedEntry) {
    if (!backpackEntry || !draggedEntry || backpackEntry.key === draggedEntry.key) return
    if (draggedEntry.item?.tipo === 'mochila') return
    const isBackpackEquip = backpackEntry.source === 'equipment'
    const backpackArr = isBackpackEquip ? [...(char.equipamentos || [])] : [...(char.inventario || [])]
    const backpack = backpackArr[backpackEntry.idx]
    if (!backpack || backpack.tipo !== 'mochila') return
    const capacity = Number(backpack.slotSize || backpack.capacidade || 12)
    const contents = Array.isArray(backpack.contents) ? backpack.contents : []
    const { cols, rows } = getBackpackGridDims(capacity)
    const bpEntry = { key: `new:${draggedEntry.key}`, source: 'backpack', idx: contents.length, item: draggedEntry.item }
    const size = resolveSize(bpEntry, 0)
    const occupied = layoutBackpackContents(contents, cols, rows).map(e => e.rect)
    const spot = findFreeSpotIn(size, occupied, cols, rows)
    if (!spot) return
    const gridRect = { ...spot, rotated: 0 }
    const updatedBackpack = { ...backpack, contents: [...contents] }
    const resultArr = [...backpackArr]
    if (draggedEntry.source === 'inventory') {
      const inventario = [...(char.inventario || [])]
      const dragged = inventario[draggedEntry.idx]
      if (!dragged) return
      updatedBackpack.contents.push({ ...dragged, local: 'mochila', inventoryGrid: gridRect })
      resultArr[backpackEntry.idx] = updatedBackpack
      if (isBackpackEquip) {
        update({ equipamentos: resultArr, inventario: inventario.filter((_, idx) => idx !== draggedEntry.idx) })
      } else {
        update({ inventario: resultArr.filter((_, idx) => idx !== draggedEntry.idx) })
      }
    } else if (draggedEntry.source === 'equipment') {
      const equipamentos = [...(char.equipamentos || [])]
      const draggedEquip = equipamentos[draggedEntry.idx]
      if (!draggedEquip) return
      updatedBackpack.contents.push({ ...draggedEquip, local: 'mochila', inventoryGrid: gridRect, equipado: false })
      resultArr[backpackEntry.idx] = updatedBackpack
      if (isBackpackEquip) {
        update({ equipamentos: resultArr.filter((_, idx) => idx !== draggedEntry.idx) })
      } else {
        update({ inventario: resultArr, equipamentos: equipamentos.filter((_, idx) => idx !== draggedEntry.idx) })
      }
    } else if (draggedEntry.source === 'primary') {
      updatedBackpack.contents.push({ ...draggedEntry.item, local: 'mochila', inventoryGrid: gridRect, equipado: false })
      resultArr[backpackEntry.idx] = updatedBackpack
      if (isBackpackEquip) {
        update({ equipamentos: resultArr, arma: null, armaInventoryGrid: null })
      } else {
        update({ inventario: resultArr, arma: null, armaInventoryGrid: null })
      }
    }
    setDragging(null)
  }

  function removeFromBackpack(contentIdxOrEntry, externalEntry, gridPosition) {
    if (!backpackDrawer) return
    const inventario = [...(char.inventario || [])]
    const backpack = inventario[backpackDrawer.idx]
    const contents = Array.isArray(backpack?.contents) ? backpack.contents : []
    if (!backpack) return

    if (externalEntry && gridPosition) {
      const newContent = { ...externalEntry.item, local: 'mochila', inventoryGrid: gridPosition }
      if (externalEntry.source === 'inventory') {
        const srcInv = [...(char.inventario || [])]
        const dragged = srcInv[externalEntry.idx]
        if (!dragged) return
        Object.assign(newContent, dragged)
        inventario[backpackDrawer.idx] = { ...backpack, contents: [...contents, newContent] }
        update({ inventario: inventario.filter((_, idx) => idx !== externalEntry.idx) })
      } else if (externalEntry.source === 'equipment') {
        const eqArr = [...(char.equipamentos || [])]
        const draggedEq = eqArr[externalEntry.idx]
        if (!draggedEq) return
        Object.assign(newContent, draggedEq, { equipado: false })
        inventario[backpackDrawer.idx] = { ...backpack, contents: [...contents, newContent] }
        update({ inventario, equipamentos: eqArr.filter((_, idx) => idx !== externalEntry.idx) })
      } else if (externalEntry.source === 'primary') {
        inventario[backpackDrawer.idx] = { ...backpack, contents: [...contents, newContent] }
        update({ inventario, arma: null, armaInventoryGrid: null })
      }
      setDragging(null)
      return
    }

    const contentIdx = contentIdxOrEntry
    const item = contents[contentIdx]
    if (!item) return
    inventario[backpackDrawer.idx] = {
      ...backpack,
      contents: contents.filter((_, idx) => idx !== contentIdx),
    }
    update({
      inventario: [
        ...inventario,
        { ...item, id: item.id || Date.now(), local: activeLocation, inventoryGrid: null },
      ],
    })
    setBackpackDragging(null)
  }

  function updateBackpackContents(newContents) {
    if (!backpackDrawer) return
    const inventario = [...(char.inventario || [])]
    inventario[backpackDrawer.idx] = { ...inventario[backpackDrawer.idx], contents: newContents }
    update({ inventario })
  }

  function autoSort() {
    const sorted = [...activeEntries].sort((a, b) => {
      const sizeA = resolveSize(a)
      const sizeB = resolveSize(b)
      const areaA = sizeA.w * sizeA.h
      const areaB = sizeB.w * sizeB.h
      if (areaA !== areaB) return areaB - areaA
      return (a.item.nome || '').localeCompare(b.item.nome || '')
    })
    const occupied = []
    let updates = {}
    sorted.forEach(entry => {
      const size = resolveSize(entry)
      const spot = findFreeSpot(size, occupied)
      const rect = { ...spot, rotated: 0 }
      occupied.push(rect)
      if (entry.source === 'primary') {
        updates.armaInventoryGrid = rect
      } else if (entry.source === 'equipment') {
        const equipamentos = updates.equipamentos || [...(char.equipamentos || [])]
        equipamentos[entry.idx] = { ...equipamentos[entry.idx], inventoryGrid: rect }
        updates.equipamentos = equipamentos
      } else {
        const inventario = updates.inventario || [...(char.inventario || [])]
        inventario[entry.idx] = { ...inventario[entry.idx], inventoryGrid: rect }
        updates.inventario = inventario
      }
    })
    update(updates)
  }

  function computeDropPreview(slotIndex) {
    if (!dragging) return null
    const x = slotIndex % GRID_COLS
    const y = Math.floor(slotIndex / GRID_COLS)
    const size = resolveSize(dragging.entry, dragging.rotated)
    const rect = { x, y, ...size }
    if (rect.x + rect.w > GRID_COLS || rect.y + rect.h > GRID_ROWS) return { rect, valid: false }
    const occupied = gridEntries.filter(entry => entry.key !== dragging.entry.key).map(entry => entry.rect)
    const valid = !occupied.some(other => rectsOverlap(rect, other))
    return { rect, valid }
  }

  function handleItemImage(e) {
    const file = e.target.files?.[0]
    if (!file || !itemDrawer) return
    const reader = new FileReader()
    reader.onload = ev => patchInventoryItem(itemDrawer.idx, { imagem: ev.target.result })
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function handleEquipImage(e) {
    const file = e.target.files?.[0]
    if (!file || !equipDrawer) return
    const reader = new FileReader()
    reader.onload = ev => patchEquipment(equipDrawer.idx, { imagem: ev.target.result })
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const activeLabel = locationLabel(locations, activeLocation)

  return (
    <>
      <section className="resident-inventory">
        <div className="resident-inventory-toolbar">
          <div className="resident-location-tabs" role="tablist" aria-label="Locais do inventario">
            {locations.map(loc => {
              const count = allEntries.filter(entry => !entry.item.trajeId && normalizeLocation(entry.item.local, entry.item) === loc.id).length
              return (
                <button key={loc.id} type="button" onClick={() => setActiveLocation(loc.id)}
                  className={activeLocation === loc.id ? 'is-active' : ''}>
                  <span className="material-symbols-outlined">{loc.icon}</span>
                  {loc.label}
                  {count > 0 && <span className="resident-tab-badge">{count}</span>}
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button type="button" onClick={autoSort} className="resident-create-btn" title="Organizar itens automaticamente">
                <span className="material-symbols-outlined">auto_fix_high</span>
                Organizar
              </button>
            )}
            {canEdit && (
              <button type="button" onClick={() => setShowCreateHub(true)} className="resident-create-btn">
                <span className="material-symbols-outlined">add</span>
                Criar
              </button>
            )}
          </div>
        </div>

        {canEdit && (
          <div className="resident-location-create">
            <input value={newLocationName} onChange={e => setNewLocationName(e.target.value)} placeholder="Novo local: armario, cofre, quartel..." />
            <button type="button" onClick={createLocation}>Adicionar local</button>
          </div>
        )}

        <div className="resident-inventory-status">
          <MiniStat label="Local" value={activeLabel} tone="text-sky-200" />
          <MiniStat label="Carga" value={`${Number(totalCarryWeight || 0).toFixed(1)} / ${maxCarry || 0} kg`} tone={maxCarry && totalCarryWeight > maxCarry * 0.85 ? (totalCarryWeight > maxCarry ? 'text-err' : 'text-warn') : 'text-gold'} />
          <MiniStat label="Armadura" value={equipmentStats.totalArmor || 0} tone="text-primary" />
          <MiniStat label="Durabilidade" value={equipmentStats.totalDurabilityMax ? `${equipmentStats.totalDurability}/${equipmentStats.totalDurabilityMax}` : 0} tone="text-emerald-300" />
          <MiniStat label="Itens" value={`${gridEntries.length} / ${GRID_COLS * GRID_ROWS}`} tone="text-purple-300" />
        </div>

        <div className="resident-equipped-strip">
          <EquippedQuickSlot
            label="Traje"
            entry={equippedOutfit}
            detail={equippedOutfit ? `${(char.equipamentos || []).filter(piece => piece.trajeId === equippedOutfit.item.id).length} pecas` : 'Nenhum'}
            icon="checkroom"
            onClick={() => equippedOutfit && openEntry(equippedOutfit)}
          />
          {[0, 1, 2].map(slot => {
            const entry = equippedWeapons[slot]
            return (
              <EquippedQuickSlot
                key={slot}
                label={`Arma ${slot + 1}`}
                entry={entry}
                detail={entry ? `Dano ${entry.item.dano || entry.weapon?.dano || '-'}` : 'Vazio'}
                icon="swords"
                onClick={() => entry && openEntry(entry)}
              />
            )
          })}
        </div>

        <div className="resident-inventory-board">
          <div className="resident-grid-wrap">
            <div className="resident-grid" onWheel={handleGridWheel} style={{ '--grid-cols': GRID_COLS, '--grid-rows': GRID_ROWS }}>
              <div className="resident-grid-cells">
                {Array.from({ length: GRID_COLS * GRID_ROWS }).map((_, idx) => (
                  <button key={idx} type="button" aria-label={`Slot ${idx + 1}`}
                    onDragOver={e => { e.preventDefault(); setHoverSlot(idx) }}
                    onDragLeave={() => setHoverSlot(null)}
                    onDrop={() => { setHoverSlot(null); handleDrop(idx) }}
                    className={hoverSlot === idx && dragging ? (computeDropPreview(idx)?.valid ? 'is-drop-valid' : 'is-drop-invalid') : ''}
                  />
                ))}
              </div>
              {hoverSlot != null && dragging && (() => {
                const preview = computeDropPreview(hoverSlot)
                if (!preview) return null
                return (
                  <div className={`resident-drop-preview ${preview.valid ? 'is-valid' : 'is-invalid'}`}
                    style={{
                      left: `${(preview.rect.x / GRID_COLS) * 100}%`,
                      top: `${(preview.rect.y / GRID_ROWS) * 100}%`,
                      width: `${(preview.rect.w / GRID_COLS) * 100}%`,
                      height: `${(preview.rect.h / GRID_ROWS) * 100}%`,
                    }} />
                )
              })()}
              <div className="resident-grid-items">
                {gridEntries.map(entry => (
                  <InventoryGridCard
                    key={entry.key}
                    entry={entry}
                    rect={entry.rect}
                    canEdit={canEdit}
                    dragging={dragging?.entry.key === entry.key}
                    selected={selectedEntry?.key === entry.key}
                    onOpen={() => openEntry(entry)}
                    onDropInto={() => moveIntoBackpack(entry, dragging?.entry)}
                    onDragStart={() => { if (canEdit) { setDragging({ entry, rotated: entry.rect.rotated || 0 }); setHoverSlot(null) }}}
                    onDragEnd={() => { setDragging(null); setHoverSlot(null) }}
                    onSelect={() => setSelectedEntry(entry)}
                  />
                ))}
              </div>
            </div>
            <p className="resident-grid-hint">Arraste para organizar · Roda do mouse para rotacionar · Duplo clique para detalhes · <kbd>R</kbd> rotaciona o item selecionado</p>
          </div>
        </div>
      </section>

      {showCreateHub && createPortal(
        <CreateHub
          onClose={() => setShowCreateHub(false)}
          onChooseEquipment={(category) => { setShowCreateHub(false); setShowEquipCreate(category) }}
          onChooseOutfit={() => { setShowCreateHub(false); setShowOutfitCreate(true) }}
          onChooseItem={(kind) => { setShowCreateHub(false); setShowItemCreate(kind) }}
        />,
        document.body
      )}

      {showOutfitCreate && createPortal(
        <OutfitCreateModalClean onSave={addOutfit} onClose={() => setShowOutfitCreate(false)} />,
        document.body
      )}

      {pieceOutfitId && createPortal(
        <EquipCreateModal
          char={char}
          initialCategory="Equipamento"
          lockCategory
          title="Nova Peca do Traje"
          unavailableSlots={(char.equipamentos || [])
            .filter(item => item.trajeId === pieceOutfitId)
            .map(item => EQUIPMENT_TYPES.find(t => t.id === item.tipoEquip)?.slot)
            .filter(Boolean)}
          onSave={addOutfitPiece}
          onClose={() => setPieceOutfitId(null)}
        />,
        document.body
      )}

      {showEquipCreate && createPortal(
        <EquipCreateModal
          char={char}
          initialCategory={showEquipCreate}
          title={showEquipCreate === 'Utilidade' ? 'Nova Utilidade' : 'Novo Equipamento'}
          onSave={addEquipmentItem}
          onClose={() => setShowEquipCreate(null)}
        />,
        document.body
      )}

      {showItemCreate && createPortal(
        <InventoryItemCreateModal kind={showItemCreate} onSave={addInventoryItem} onClose={() => setShowItemCreate(null)} />,
        document.body
      )}

      {itemDrawer && createPortal(
        <InventoryItemDrawer
          entry={itemDrawer}
          item={
            itemDrawer.source === 'backpack-content'
              ? char.inventario?.[itemDrawer.backpackIdx]?.contents?.[itemDrawer.idx] || itemDrawer.item
              : char.inventario?.[itemDrawer.idx] || itemDrawer.item
          }
          canEdit={canEdit}
          editMode={itemEditMode}
          locations={itemDrawer.source === 'backpack-content' ? [] : locations}
          onEdit={() => setItemEditMode(true)}
          onCancelEdit={() => { setItemEditMode(false); if (itemDrawer.source === 'backpack-content') { setBackpackDrawer({ idx: itemDrawer.backpackIdx, item: char.inventario?.[itemDrawer.backpackIdx] }) } }}
          onSave={(patch) => {
            if (itemDrawer.source === 'backpack-content') {
              const inventario = [...(char.inventario || [])]
              const bp = inventario[itemDrawer.backpackIdx]
              const contents = [...(bp?.contents || [])]
              contents[itemDrawer.idx] = { ...contents[itemDrawer.idx], ...patch }
              inventario[itemDrawer.backpackIdx] = { ...bp, contents }
              update({ inventario })
            } else {
              patchInventoryItem(itemDrawer.idx, patch)
            }
            setItemEditMode(false)
          }}
          onDelete={() => {
            if (itemDrawer.source === 'backpack-content') {
              const inventario = [...(char.inventario || [])]
              const bp = inventario[itemDrawer.backpackIdx]
              const contents = [...(bp?.contents || [])]
              contents.splice(itemDrawer.idx, 1)
              inventario[itemDrawer.backpackIdx] = { ...bp, contents }
              update({ inventario })
              setItemDrawer(null)
              setBackpackDrawer({ idx: itemDrawer.backpackIdx, item: inventario[itemDrawer.backpackIdx] })
            } else {
              removeEntry(itemDrawer)
            }
          }}
          onTransfer={null}
          onMove={itemDrawer.source === 'backpack-content' ? null : (loc) => moveEntry(itemDrawer, loc)}
          onClose={() => { setItemDrawer(null); if (itemDrawer.source === 'backpack-content') { setBackpackDrawer({ idx: itemDrawer.backpackIdx, item: char.inventario?.[itemDrawer.backpackIdx] }) } }}
          onImageChange={handleItemImage}
          imgRef={itemImgRef}
        />,
        document.body
      )}

      {backpackDrawer && createPortal(
        <BackpackGridDrawer
          backpack={char.inventario?.[backpackDrawer.idx] || backpackDrawer.item}
          canEdit={canEdit}
          externalDrag={dragging}
          onUpdateContents={updateBackpackContents}
          onRemoveItem={(contentIdx, externalEntry, gridPosition) => {
            if (externalEntry) removeFromBackpack(null, externalEntry, gridPosition)
            else if (contentIdx != null) removeFromBackpack(contentIdx)
          }}
          onOpenItem={(entry) => {
            const contentItem = char.inventario?.[backpackDrawer.idx]?.contents?.[entry.idx]
            if (!contentItem) return
            setItemDrawer({ source: 'backpack-content', idx: entry.idx, item: contentItem, key: entry.key, backpackIdx: backpackDrawer.idx })
            setBackpackDrawer(null)
          }}
          onClose={() => { setBackpackDrawer(null); setBackpackDragging(null) }}
        />,
        document.body
      )}

      {equipDrawer && createPortal(
        <EquipDrawer
          item={char.equipamentos?.[equipDrawer.idx] || equipDrawer.item}
          char={char}
          canEdit={canEdit}
          editMode={equipEditMode}
          onEdit={() => setEquipEditMode(true)}
          onCancelEdit={() => setEquipEditMode(false)}
          onSaveEdit={(patch) => patchEquipment(equipDrawer.idx, patch)}
          onDelete={() => removeEntry(equipDrawer)}
          onTransfer={onTransferItem ? () => onTransferItem('equipamentos', equipDrawer.idx) : null}
          onClose={() => setEquipDrawer(null)}
          onImageChange={handleEquipImage}
          imgRef={equipImgRef}
        />,
        document.body
      )}

      {outfitDrawer && createPortal(
        <OutfitDrawerClean
          outfit={char.equipamentos?.[outfitDrawer.idx] || outfitDrawer.item}
          pieces={(char.equipamentos || [])
            .map((item, idx) => ({ item, idx }))
            .filter(({ item }) => item.trajeId === outfitDrawer.item.id)}
          canEdit={canEdit}
          onAddPiece={() => setPieceOutfitId(outfitDrawer.item.id)}
          onToggleOutfit={() => toggleEquipped(outfitDrawer)}
          onTogglePiece={(idx, piece) => patchEquipment(idx, { equipado: !piece.equipado, local: !piece.equipado ? 'equipado' : 'carregado' })}
          onOpenPiece={(idx) => { setOutfitDrawer(null); setEquipDrawer({ source: 'equipment', idx, item: char.equipamentos?.[idx], key: `equip:${char.equipamentos?.[idx]?.id || idx}` }) }}
          onRemovePiece={(idx) => patchEquipment(idx, { trajeId: null, equipado: false, local: 'carregado' })}
          onDissolve={() => {
            const equipamentos = (char.equipamentos || [])
              .filter(item => item.id !== outfitDrawer.item.id)
              .map(item => item.trajeId === outfitDrawer.item.id ? { ...item, trajeId: null, equipado: false, local: 'carregado' } : item)
            update({ equipamentos })
            setOutfitDrawer(null)
          }}
          onClose={() => setOutfitDrawer(null)}
        />,
        document.body
      )}

      {showWeaponDrawer && char.arma && createPortal(
        <WeaponDrawer
          weapon={WEAPONS.find(w => w.id === char.arma) || { id: char.arma, name: char.armaNome || 'Arma', dano: char.armaDano || '' }}
          rank={WEAPON_RANKS.find(r => r.rank === char.armaRank) || WEAPON_RANKS[0]}
          habilidades={char.armaHabilidades || []}
          char={char}
          canEdit={canEdit}
          onUpdate={update}
          onDelete={() => removeEntry({ source: 'primary' })}
          onTransfer={onTransferItem ? () => onTransferItem('armaPrincipal', null) : null}
          onClose={() => setShowWeaponDrawer(false)}
        />,
        document.body
      )}
    </>
  )
}

function MiniStat({ label, value, tone }) {
  return (
    <div className="resident-mini-stat">
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
    </div>
  )
}

function EquippedQuickSlot({ label, entry, detail, icon, onClick }) {
  const image = entry?.item?.imagem || entry?.item?.image
  return (
    <button type="button" disabled={!entry} onClick={onClick} className={`resident-equipped-slot ${entry ? 'has-entry' : ''}`}>
      <span className="resident-equipped-icon">
        {image ? <img src={image} alt="" /> : <span className="material-symbols-outlined">{icon}</span>}
      </span>
      <span>
        <em>{label}</em>
        <strong>{entry?.item?.nome || entry?.item?.name || detail}</strong>
        <small>{entry ? detail : 'Livre'}</small>
      </span>
    </button>
  )
}

function InventoryGridCard({ entry, rect, canEdit, dragging, selected, onOpen, onDropInto, onDragStart, onDragEnd, onSelect, gridCols = GRID_COLS, gridRows = GRID_ROWS }) {
  const item = entry.item || {}
  const image = item.imagem || item.image
  const weight = entry.source === 'inventory'
    ? estimateInventoryItemWeight(item)
    : entry.source === 'primary'
      ? getWeaponWeight(item.id, item.rank)
      : estimateEquipmentWeight(item)
  const area = rect.w * rect.h
  const isSmall = area <= 2
  const rotationDeg = rect.rotated || 0
  const quantity = Number(item.quantidade || item.qtd || 0)
  const hasQuantity = quantity > 1

  function handleDragStart(e) {
    if (!canEdit) { e.preventDefault(); return }
    const el = e.currentTarget
    if (el.offsetWidth > 0 && el.offsetHeight > 0) {
      e.dataTransfer.setDragImage(el, el.offsetWidth / 2, el.offsetHeight / 2)
    }
    e.dataTransfer.effectAllowed = 'move'
    onDragStart()
  }

  return (
    <div
      className={`resident-grid-card ${selected ? 'is-selected' : ''} ${item.equipado ? 'is-equipped' : ''} ${rotationDeg ? 'is-rotated' : ''} ${item.tipo === 'mochila' ? 'is-backpack' : ''} ${dragging ? 'is-dragging' : ''} ${isSmall ? 'is-small' : ''}`}
      title={`${item.nome || 'Item'}${hasQuantity ? ` x${quantity}` : ''} · ${weight.toFixed(1)}kg`}
      style={{
        '--item-cols': rect.w,
        '--item-rows': rect.h,
        '--rotation': `${rotationDeg}deg`,
        left: `${(rect.x / gridCols) * 100}%`,
        top: `${(rect.y / gridRows) * 100}%`,
        width: `${(rect.w / gridCols) * 100}%`,
        height: `${(rect.h / gridRows) * 100}%`,
      }}
      draggable={canEdit}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onDragOver={item.tipo === 'mochila' ? (e) => e.preventDefault() : undefined}
      onDrop={item.tipo === 'mochila' ? (e) => { e.preventDefault(); onDropInto?.() } : undefined}
      onDoubleClick={onOpen}
      onClick={() => onSelect?.()}
    >
      <div className="resident-grid-card-visual">
        {image
          ? <img src={image} alt="" draggable={false} />
          : <span className="material-symbols-outlined">{item.categoria === 'Arma' ? 'swords' : item.categoria === 'Equipamento' ? 'shield' : item.tipo === 'mochila' ? 'backpack' : 'inventory_2'}</span>
        }
        {hasQuantity && <span className="resident-grid-card-qty">x{quantity}</span>}
      </div>
      <span className="resident-grid-card-label">{item.nome || item.name || 'Item'}</span>
      {!isSmall && <span className="resident-grid-card-weight">{weight.toFixed(1)}kg</span>}
    </div>
  )
}

function BackpackGridDrawer({ backpack, canEdit, externalDrag, onUpdateContents, onRemoveItem, onOpenItem, onClose }) {
  const contents = Array.isArray(backpack?.contents) ? backpack.contents : []
  const capacity = Number(backpack?.slotSize || backpack?.capacidade || 12)
  const { cols, rows } = getBackpackGridDims(capacity)

  const [bpDrag, setBpDrag] = useState(null)
  const [bpHover, setBpHover] = useState(null)
  const [bpSelected, setBpSelected] = useState(null)

  const bpEntries = useMemo(() => layoutBackpackContents(contents, cols, rows), [contents, cols, rows])

  function patchContent(idx, patch) {
    const next = [...contents]
    next[idx] = { ...next[idx], ...patch }
    onUpdateContents(next)
  }

  useEffect(() => {
    if (!canEdit) return
    function onKeyDown(e) {
      if (e.key !== 'r' && e.key !== 'R') return
      if (bpSelected) {
        const entry = bpEntries.find(en => en.key === bpSelected)
        if (entry) rotateBpEntry(entry)
      } else if (bpDrag) {
        const base = entryBaseSize(bpDrag.entry)
        if (base.w !== base.h) setBpDrag(cur => cur ? { ...cur, rotated: ((cur.rotated || 0) + 90) % 360 } : null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [canEdit, bpSelected, bpDrag, bpEntries])

  function rotateBpEntry(entry) {
    const cur = bpEntries.find(en => en.key === entry.key)?.rect
    if (!cur) return
    const nextRot = ((cur.rotated || 0) + 90) % 360
    const size = resolveSize(entry, nextRot)
    const rect = {
      x: Math.min(cur.x, cols - size.w),
      y: Math.min(cur.y, rows - size.h),
      w: size.w, h: size.h, rotated: nextRot,
    }
    if (rect.x < 0 || rect.y < 0) return
    const occupied = bpEntries.filter(en => en.key !== entry.key).map(en => en.rect)
    if (occupied.some(o => rectsOverlap(rect, o))) return
    patchContent(entry.idx, { inventoryGrid: rect })
  }

  function handleBpWheel(event) {
    if (!bpDrag) return
    event.preventDefault()
    const base = entryBaseSize(bpDrag.entry)
    if (base.w === base.h) return
    setBpDrag(cur => cur ? { ...cur, rotated: ((cur.rotated || 0) + 90) % 360 } : null)
  }

  function handleBpDrop(slotIndex) {
    if (externalDrag && !bpDrag) {
      const entry = externalDrag.entry
      const rotated = externalDrag.rotated || 0
      const size = resolveSize(entry, rotated)
      const x = slotIndex % cols
      const y = Math.floor(slotIndex / cols)
      const rect = { x, y, w: size.w, h: size.h, rotated }
      if (rect.x + rect.w > cols || rect.y + rect.h > rows) { setBpHover(null); return }
      const occupied = bpEntries.map(en => en.rect)
      if (occupied.some(o => rectsOverlap(rect, o))) { setBpHover(null); return }
      onRemoveItem(null, entry, rect)
      setBpHover(null)
      return
    }
    if (!bpDrag) return
    const x = slotIndex % cols
    const y = Math.floor(slotIndex / cols)
    const size = resolveSize(bpDrag.entry, bpDrag.rotated)
    const rect = { x, y, w: size.w, h: size.h, rotated: bpDrag.rotated || 0 }
    if (rect.x + rect.w > cols || rect.y + rect.h > rows) { setBpDrag(null); setBpHover(null); return }
    const occupied = bpEntries.filter(en => en.key !== bpDrag.entry.key).map(en => en.rect)
    if (occupied.some(o => rectsOverlap(rect, o))) { setBpDrag(null); setBpHover(null); return }
    patchContent(bpDrag.entry.idx, { inventoryGrid: rect })
    setBpDrag(null)
    setBpHover(null)
  }

  function computeBpPreview(slotIndex) {
    const src = bpDrag || (externalDrag ? { entry: externalDrag.entry, rotated: externalDrag.rotated || 0 } : null)
    if (!src) return null
    const x = slotIndex % cols
    const y = Math.floor(slotIndex / cols)
    const size = resolveSize(src.entry, src.rotated)
    const rect = { x, y, ...size }
    if (rect.x + rect.w > cols || rect.y + rect.h > rows) return { rect, valid: false }
    const occupied = bpEntries.filter(en => {
      if (bpDrag && en.key === bpDrag.entry.key) return false
      return true
    }).map(en => en.rect)
    const valid = !occupied.some(o => rectsOverlap(rect, o))
    return { rect, valid }
  }

  function autoSortBp() {
    const sorted = [...bpEntries].sort((a, b) => {
      const aa = a.rect.w * a.rect.h, bb = b.rect.w * b.rect.h
      if (aa !== bb) return bb - aa
      return (a.item.nome || '').localeCompare(b.item.nome || '')
    })
    const occupied = []
    const next = [...contents]
    sorted.forEach(entry => {
      const size = resolveSize(entry, 0)
      const spot = findFreeSpotIn(size, occupied, cols, rows)
      const rect = { ...(spot || { x: 0, y: 0, ...size }), rotated: 0 }
      occupied.push(rect)
      next[entry.idx] = { ...next[entry.idx], inventoryGrid: rect }
    })
    onUpdateContents(next)
  }

  function handleBpDragOut() {
    if (!bpDrag) return
    onRemoveItem(bpDrag.entry.idx)
    setBpDrag(null)
  }

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/50 drawer-overlay" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-[430px] bg-deep border-l border-primary/15 shadow-2xl shadow-black/60 flex flex-col drawer-panel">
        <div className="px-4 py-3 border-b border-sep/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm">backpack</span>
            <h3 className="font-cinzel text-primary text-xs uppercase tracking-wider">{backpack?.nome || 'Mochila'}</h3>
            <span className="text-[10px] text-txt-dim/65">{cols}x{rows}</span>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button onClick={autoSortBp} className="text-[10px] border border-gold/30 text-gold px-2 py-1 rounded hover:bg-gold/10 transition-colors">Auto</button>
            )}
            <button onClick={onClose} className="text-txt-dim hover:text-err text-sm transition-colors">×</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="resident-inventory-board resident-bp-board">
            <div className="resident-grid-wrap">
              <div className="resident-grid" style={{ '--grid-cols': cols, '--grid-rows': rows, aspectRatio: `${cols}/${rows}` }} onWheel={handleBpWheel}>
                <div className="resident-grid-cells">
                  {Array.from({ length: cols * rows }).map((_, idx) => (
                    <button key={idx} type="button" aria-label={`Slot ${idx + 1}`}
                      onDragOver={e => { e.preventDefault(); setBpHover(idx) }}
                      onDragLeave={() => setBpHover(null)}
                      onDrop={() => handleBpDrop(idx)}
                      className={bpHover === idx && (bpDrag || externalDrag) ? (computeBpPreview(idx)?.valid ? 'is-drop-valid' : 'is-drop-invalid') : ''}
                    />
                  ))}
                </div>
                {bpHover != null && (bpDrag || externalDrag) && (() => {
                  const preview = computeBpPreview(bpHover)
                  if (!preview) return null
                  return (
                    <div className={`resident-drop-preview ${preview.valid ? 'is-valid' : 'is-invalid'}`}
                      style={{
                        left: `${(preview.rect.x / cols) * 100}%`,
                        top: `${(preview.rect.y / rows) * 100}%`,
                        width: `${(preview.rect.w / cols) * 100}%`,
                        height: `${(preview.rect.h / rows) * 100}%`,
                      }} />
                  )
                })()}
                <div className="resident-grid-items">
                  {bpEntries.map(entry => (
                    <InventoryGridCard
                      key={entry.key}
                      entry={entry}
                      rect={entry.rect}
                      canEdit={canEdit}
                      dragging={bpDrag?.entry.key === entry.key}
                      selected={bpSelected === entry.key}
                      onOpen={() => onOpenItem(entry)}
                      onDragStart={() => { if (canEdit) { setBpDrag({ entry, rotated: entry.rect.rotated || 0 }); setBpHover(null) } }}
                      onDragEnd={() => { setBpDrag(null); setBpHover(null) }}
                      onSelect={() => setBpSelected(entry.key)}
                      gridCols={cols}
                      gridRows={rows}
                    />
                  ))}
                </div>
              </div>
              <p className="resident-grid-hint">Arraste para organizar · Roda do mouse para rotacionar · <kbd>R</kbd> rotaciona selecionado</p>
            </div>
          </div>

          <div className={`bp-drop-zone ${bpDrag ? 'is-active' : ''}`}>
            <div
              className="bp-drop-zone-target"
              onDragOver={event => event.preventDefault()}
              onDrop={handleBpDragOut}
            >
              <span className="bp-drop-zone-arrow">⬇</span>
              <span className="bp-drop-zone-text">Arraste pra ca para tirar da mochila</span>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-sep/30 flex gap-2 shrink-0">
          <button onClick={onClose} className="text-[10px] text-txt-dim hover:text-txt-main px-3 py-1.5 transition-colors">Fechar</button>
        </div>
      </div>
    </div>
  )
}

function OutfitInventoryCard({ entry, pieces, onClick, onToggle, canEdit }) {
  const item = entry.item
  const stats = calcEquipStats(pieces.map(piece => ({ ...piece, equipado: true })))
  return (
    <div className="resident-outfit-card">
      <button type="button" onClick={canEdit ? onToggle : onClick} className="resident-outfit-image">
        {item.imagem ? <img src={item.imagem} alt="" /> : <span className="material-symbols-outlined">checkroom</span>}
      </button>
      <button type="button" onClick={onClick} className="resident-outfit-info">
        <strong>{item.nome || 'Traje Completo'}</strong>
        <span>{pieces.length} pecas - {pieces.filter(piece => piece.equipado).length} equipadas</span>
        <em>ARM {stats.totalArmor || 0} - DUR {stats.totalDurabilityMax ? `${stats.totalDurability}/${stats.totalDurabilityMax}` : 0}</em>
      </button>
    </div>
  )
}

function CreateHub({ onClose, onChooseEquipment, onChooseOutfit, onChooseItem }) {
  const cards = [
    { id: 'Arma', title: 'Arma', icon: 'swords', desc: 'Armas com rank, dano, material e encantamentos.' },
    { id: 'Equipamento', title: 'Equipamento', icon: 'shield', desc: 'Pecas de armadura, traje e defesa.' },
    { id: 'Utilidade', title: 'Utilidade', icon: 'construction', desc: 'Kits, explosivos, ferramentas e consumiveis prontos.' },
  ]
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/60 drawer-overlay" onClick={onClose} />
      <div className="resident-create-modal">
        <header>
          <div>
            <span className="material-symbols-outlined">add_box</span>
            <h3>Criar no Inventario</h3>
          </div>
          <button type="button" onClick={onClose}>×</button>
        </header>
        <div className="resident-create-grid">
          {cards.map(card => (
            <button key={card.id} type="button" onClick={() => onChooseEquipment(card.id)}>
              <span className="material-symbols-outlined">{card.icon}</span>
              <strong>{card.title}</strong>
              <p>{card.desc}</p>
            </button>
          ))}
          <button type="button" onClick={onChooseOutfit}>
            <span className="material-symbols-outlined">checkroom</span>
            <strong>Traje</strong>
            <p>Pasta visual para agrupar pecas e equipar o conjunto.</p>
          </button>
          <button type="button" onClick={() => onChooseItem('item')}>
            <span className="material-symbols-outlined">inventory_2</span>
            <strong>Item Livre</strong>
            <p>Anotacoes, chaves, documentos, tesouros e objetos narrativos.</p>
          </button>
          <button type="button" onClick={() => onChooseItem('mochila')}>
            <span className="material-symbols-outlined">backpack</span>
            <strong>Mochila</strong>
            <p>Container portatil para guardar itens menores por arrastar e soltar.</p>
          </button>
          <button type="button" onClick={() => onChooseItem('consumivel')}>
            <span className="material-symbols-outlined">local_drink</span>
            <strong>Consumivel Rapido</strong>
            <p>Pocoes e seringas de vida, energia e PE temporario.</p>
          </button>
        </div>
      </div>
    </div>
  )
}

const CONSUMABLE_PRESETS = [
  { nome: 'Pocao de Vida Pequena', descricao: 'Recupera 25 de Vida.', peso: 0.2, cor: 'red' },
  { nome: 'Pocao de Vida Media', descricao: 'Recupera 60 de Vida.', peso: 0.35, cor: 'red' },
  { nome: 'Pocao de Vida Grande', descricao: 'Recupera 120 de Vida.', peso: 0.5, cor: 'red' },
  { nome: 'Pocao de Energia Pequena', descricao: 'Recupera 25 de Energia.', peso: 0.2, cor: 'sky' },
  { nome: 'Pocao de Energia Media', descricao: 'Recupera 60 de Energia.', peso: 0.35, cor: 'sky' },
  { nome: 'Pocao de Energia Grande', descricao: 'Recupera 120 de Energia.', peso: 0.5, cor: 'sky' },
  { nome: 'Seringa Vital', descricao: 'Recupera 80 de Vida como acao rapida.', peso: 0.15, cor: 'emerald' },
  { nome: 'Seringa de PE Temporario', descricao: 'Concede 2 PE temporarios ate o fim da cena.', peso: 0.15, cor: 'purple' },
]

const BACKPACK_PRESETS = [
  { nome: 'Mochila Pequena', descricao: 'Espaco compacto para itens essenciais.', peso: 0.5, cor: 'amber', tipo: 'mochila', slotSize: 6, contents: [] },
  { nome: 'Mochila Media', descricao: 'Mochila padrao com bom espaco de armazenamento.', peso: 1.0, cor: 'amber', tipo: 'mochila', slotSize: 12, contents: [] },
  { nome: 'Mochila Grande', descricao: 'Mochila grande para expedicoes longas.', peso: 1.5, cor: 'amber', tipo: 'mochila', slotSize: 20, contents: [] },
]

function InventoryItemCreateModal({ kind, onSave, onClose }) {
  const [draft, setDraft] = useState(
    kind === 'consumivel'
      ? CONSUMABLE_PRESETS[0]
      : kind === 'mochila'
        ? BACKPACK_PRESETS[0]
        : { nome: '', descricao: '', peso: 0.1, cor: 'gray' }
  )
  const [aiLoading, setAiLoading] = useState(false)

  async function suggestWeight() {
    if (!draft.nome?.trim()) return
    setAiLoading(true)
    try {
      const peso = await suggestItemWeight(draft.nome, draft.descricao)
      if (peso != null) setDraft(current => ({ ...current, peso }))
    } catch {}
    setAiLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/60 drawer-overlay" onClick={onClose} />
      <div className="resident-create-modal resident-item-modal">
        <header>
          <div>
            <span className="material-symbols-outlined">{kind === 'consumivel' ? 'local_drink' : kind === 'mochila' ? 'backpack' : 'inventory_2'}</span>
            <h3>{kind === 'consumivel' ? 'Consumivel Rapido' : kind === 'mochila' ? 'Mochila' : 'Item Livre'}</h3>
          </div>
          <button type="button" onClick={onClose}>×</button>
        </header>
        {kind === 'consumivel' && (
          <div className="resident-preset-grid">
            {CONSUMABLE_PRESETS.map(preset => (
              <button key={preset.nome} type="button" onClick={() => setDraft(preset)} className={draft.nome === preset.nome ? 'is-active' : ''}>
                <strong>{preset.nome}</strong>
                <span>{preset.descricao}</span>
              </button>
            ))}
          </div>
        )}
        {kind === 'mochila' && (
          <div className="resident-preset-grid">
            {BACKPACK_PRESETS.map(preset => {
              const { cols, rows } = getBackpackGridDims(preset.slotSize)
              return (
                <button key={preset.nome} type="button" onClick={() => setDraft(preset)} className={draft.nome === preset.nome ? 'is-active' : ''}>
                  <strong>{preset.nome}</strong>
                  <span>{preset.descricao}</span>
                  <em>{cols}x{rows} slots · {preset.peso}kg</em>
                </button>
              )
            })}
          </div>
        )}
        <div className="resident-form-grid">
          <input value={draft.nome || ''} onChange={e => setDraft({ ...draft, nome: e.target.value })} placeholder="Nome" />
          <input type="number" step="0.1" value={draft.peso ?? ''} onChange={e => setDraft({ ...draft, peso: Number(e.target.value) })} placeholder="Peso kg" />
          <textarea value={draft.descricao || ''} onChange={e => setDraft({ ...draft, descricao: e.target.value })} placeholder="Descricao, efeito, usos..." />
          {kind === 'mochila' && (
            <input type="number" min="4" max="30" value={draft.slotSize || 12} onChange={e => setDraft({ ...draft, slotSize: Number(e.target.value) })} placeholder="Slots" />
          )}
          <select value={draft.cor || 'gray'} onChange={e => setDraft({ ...draft, cor: e.target.value })}>
            {ITEM_COLORS.map(color => <option key={color.id} value={color.id}>{color.label}</option>)}
          </select>
        </div>
        <footer>
          <button type="button" onClick={suggestWeight} disabled={aiLoading}>{aiLoading ? '...' : 'Peso IA'}</button>
          <button type="button" onClick={() => onSave(draft)} disabled={!draft.nome?.trim()} className="primary">Criar</button>
        </footer>
      </div>
    </div>
  )
}

function InventoryItemDrawer({ entry, item, canEdit, editMode, locations, onEdit, onCancelEdit, onSave, onDelete, onTransfer, onMove, onClose, onImageChange, imgRef }) {
  const [draft, setDraft] = useState(item)
  const color = ITEM_COLORS.find(c => c.id === (item.cor || 'gray')) || ITEM_COLORS[0]

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/40 drawer-overlay" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-[390px] bg-deep border-l border-primary/15 shadow-2xl shadow-black/60 flex flex-col drawer-panel">
        <div className="px-4 py-3 border-b border-sep/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="font-cinzel text-primary text-xs uppercase tracking-wider">Item</h3>
            <div className={`w-2.5 h-2.5 rounded ${color.cls}`} />
          </div>
          <button onClick={onClose} className="text-txt-dim hover:text-err text-sm transition-colors">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {editMode && canEdit ? (
            <>
              <button type="button" onClick={() => imgRef.current?.click()} className="w-full aspect-video rounded-lg border border-sep/40 bg-void/50 overflow-hidden grid place-items-center">
                {item.imagem ? <img src={item.imagem} alt="" className="w-full h-full object-cover" /> : <span className="text-txt-dim/45 text-xs">Imagem</span>}
              </button>
              <input ref={imgRef} type="file" accept="image/*" onChange={onImageChange} className="hidden" />
              <input value={draft.nome || ''} onChange={e => setDraft({ ...draft, nome: e.target.value })} className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-sm text-txt-main" />
              <textarea value={draft.descricao || ''} onChange={e => setDraft({ ...draft, descricao: e.target.value })} rows={5} className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-xs text-txt-main resize-none" />
              <input type="number" step="0.1" value={draft.peso ?? ''} onChange={e => setDraft({ ...draft, peso: Number(e.target.value) })} className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-sm text-txt-main" />
            </>
          ) : (
            <>
              {item.imagem && <img src={item.imagem} alt="" className="w-full aspect-video rounded-lg object-cover border border-sep/30" />}
              <h4 className="text-txt-main text-sm font-semibold">{item.nome || 'Item'}</h4>
              <span className="inline-flex text-[9px] text-txt-dim/70 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">{item.local || 'carregado'}</span>
              {item.descricao ? <p className="text-txt-dim/80 text-xs leading-relaxed">{item.descricao}</p> : <p className="text-txt-dim/35 text-xs italic">Sem descricao</p>}
              <div className="inventory-drawer-weight"><span>Peso</span><strong>{estimateInventoryItemWeight(item).toFixed(1)} kg</strong></div>
              {canEdit && (
                <div className="resident-move-list">
                  {locations.map(loc => (
                    <button key={loc.id} type="button" disabled={normalizeLocation(item.local, item) === loc.id} onClick={() => onMove(loc.id)}>
                      <span className="material-symbols-outlined">{loc.icon}</span>
                      {loc.label}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <div className="px-4 py-3 border-t border-sep/30 flex gap-2 shrink-0">
          {canEdit && !editMode && (
            <>
              <button onClick={onEdit} className="text-[10px] border border-gold/30 text-gold px-3 py-1.5 rounded-lg hover:bg-gold/10 transition-colors">Editar</button>
              <button onClick={onDelete} className="text-[10px] border border-err/30 text-err px-3 py-1.5 rounded-lg hover:bg-err/10 transition-colors">Excluir</button>
              {onTransfer && <button onClick={onTransfer} className="text-[10px] border border-sky-400/30 text-sky-300 px-3 py-1.5 rounded-lg hover:bg-sky-400/10 transition-colors">Transferir</button>}
            </>
          )}
          {editMode && (
            <>
              <button onClick={() => onSave(draft)} className="text-[10px] bg-gold text-void px-3 py-1.5 rounded-lg hover:bg-gold-light transition-colors font-semibold">Salvar</button>
              <button onClick={onCancelEdit} className="text-[10px] text-txt-dim hover:text-txt-main px-3 py-1.5 transition-colors">Cancelar</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
