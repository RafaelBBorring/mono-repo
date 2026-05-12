import { useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ITEM_COLORS } from '../data/colors'
import { WEAPONS, WEAPON_RANKS, getWeaponWeight } from '../data/weapons'
import { EQUIPMENT_TYPES, calcEquipStats, estimateEquipmentWeight } from '../data/equipment'
import { estimateInventoryItemWeight } from '../utils/calculator'
import { suggestItemWeight } from '../services/aiService'
import { EquipCreateModal, EquipDrawer, OutfitCreateModalClean, OutfitDrawerClean, WeaponDrawer } from './EquipmentSection'

const GRID_COLS = 9
const GRID_ROWS = 7
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
  if (entry.source === 'primary') return { w: 3, h: 1 }
  if (item.categoria === 'Traje') return { w: 2, h: 4 }
  if (item.categoria === 'Arma') return { w: 3, h: 1 }
  if (item.categoria === 'Equipamento') return { w: 2, h: 2 }
  if (item.tipo === 'mochila') return { w: 2, h: 2 }
  if (/kit|carga|corda|drone/i.test(item.nome || item.id || '')) return { w: 2, h: 1 }
  return { w: 1, h: 1 }
}

function resolveSize(entry, rotated = false) {
  const stored = entry.item?.inventorySize || {}
  const base = { ...entryBaseSize(entry), ...stored }
  return rotated ? { w: base.h, h: base.w } : base
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

  return entries
}

function layoutEntries(entries, activeLocation) {
  const occupied = []
  return entries.map(entry => {
    const stored = entry.source === 'primary' ? entry.item.inventoryGrid : entry.item.inventoryGrid
    const rotated = !!stored?.rotated
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
  const [itemDrawer, setItemDrawer] = useState(null)
  const [itemEditMode, setItemEditMode] = useState(false)
  const [equipDrawer, setEquipDrawer] = useState(null)
  const [outfitDrawer, setOutfitDrawer] = useState(null)
  const [equipEditMode, setEquipEditMode] = useState(false)
  const [showWeaponDrawer, setShowWeaponDrawer] = useState(false)
  const itemImgRef = useRef(null)
  const equipImgRef = useRef(null)

  const allEntries = useMemo(() => buildEntries(char), [char])
  const locations = useMemo(() => buildLocations(char, allEntries), [char, allEntries])
  const activeEntries = useMemo(() => allEntries.filter(entry => !entry.item.trajeId && normalizeLocation(entry.item.local, entry.item) === activeLocation), [allEntries, activeLocation])
  const gridEntries = useMemo(() => layoutEntries(activeEntries, activeLocation), [activeEntries, activeLocation])
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
    const size = resolveSize(dragging.entry, dragging.rotated)
    const rect = { x, y, ...size, rotated: dragging.rotated }
    const occupied = gridEntries.filter(entry => entry.key !== dragging.entry.key).map(entry => entry.rect)
    if (rect.x + rect.w > GRID_COLS || rect.y + rect.h > GRID_ROWS || occupied.some(other => rectsOverlap(rect, other))) {
      setDragging(null)
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
  }

  function handleGridWheel(event) {
    if (!dragging) return
    event.preventDefault()
    const base = entryBaseSize(dragging.entry)
    if (base.w === base.h) return
    setDragging(current => current ? { ...current, rotated: !current.rotated } : null)
  }

  function rotateEntry(entry) {
    const currentRect = gridEntries.find(item => item.key === entry.key)?.rect || entry.rect
    if (!currentRect) return
    const nextRotated = !currentRect.rotated
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
            {locations.map(loc => (
              <button key={loc.id} type="button" onClick={() => setActiveLocation(loc.id)}
                className={activeLocation === loc.id ? 'is-active' : ''}>
                <span className="material-symbols-outlined">{loc.icon}</span>
                {loc.label}
              </button>
            ))}
          </div>
          {canEdit && (
            <button type="button" onClick={() => setShowCreateHub(true)} className="resident-create-btn">
              <span className="material-symbols-outlined">add</span>
              Criar
            </button>
          )}
        </div>

        {canEdit && (
          <div className="resident-location-create">
            <input value={newLocationName} onChange={e => setNewLocationName(e.target.value)} placeholder="Novo local: armario, cofre, quartel..." />
            <button type="button" onClick={createLocation}>Adicionar local</button>
          </div>
        )}

        <div className="resident-inventory-status">
          <MiniStat label="Local" value={activeLabel} tone="text-sky-200" />
          <MiniStat label="Carga" value={`${Number(totalCarryWeight || 0).toFixed(1)} / ${maxCarry || 0} kg`} tone="text-gold" />
          <MiniStat label="Armadura" value={equipmentStats.totalArmor || 0} tone="text-primary" />
          <MiniStat label="Durabilidade" value={equipmentStats.totalDurabilityMax ? `${equipmentStats.totalDurability}/${equipmentStats.totalDurabilityMax}` : 0} tone="text-emerald-300" />
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
            <div className="resident-grid" onWheel={handleGridWheel}>
              <div className="resident-grid-cells">
                {Array.from({ length: GRID_COLS * GRID_ROWS }).map((_, idx) => (
                  <button key={idx} type="button" aria-label={`Slot ${idx + 1}`}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => handleDrop(idx)}
                  />
                ))}
              </div>
              <div className="resident-grid-items">
                {gridEntries.map(entry => (
                  <InventoryGridCard
                    key={entry.key}
                    entry={entry}
                    rect={entry.rect}
                    canEdit={canEdit}
                    dragging={dragging?.entry.key === entry.key}
                    onOpen={() => openEntry(entry)}
                    onToggle={() => toggleEquipped(entry)}
                    onMove={() => moveEntry(entry, activeLocation === 'carregado' ? 'quarto' : 'carregado')}
                    onMoveTo={(location) => moveEntry(entry, location)}
                    onRotate={() => rotateEntry(entry)}
                    moveLabel={activeLocation === 'carregado' ? 'Guardar' : 'Pegar'}
                    locations={locations}
                    onDragStart={() => canEdit && setDragging({ entry, rotated: !!entry.rect.rotated })}
                    onDragEnd={() => setDragging(null)}
                  />
                ))}
              </div>
            </div>
            <p className="resident-grid-hint">Arraste para organizar. Enquanto segura um item, use a roda do mouse para rotacionar. Trajes, armas, equipamentos e consumiveis ocupam o mesmo inventario.</p>
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
          item={char.inventario?.[itemDrawer.idx] || itemDrawer.item}
          canEdit={canEdit}
          editMode={itemEditMode}
          locations={locations}
          onEdit={() => setItemEditMode(true)}
          onCancelEdit={() => setItemEditMode(false)}
          onSave={(patch) => { patchInventoryItem(itemDrawer.idx, patch); setItemEditMode(false) }}
          onDelete={() => removeEntry(itemDrawer)}
          onTransfer={onTransferItem ? () => onTransferItem('inventario', itemDrawer.idx) : null}
          onMove={(loc) => moveEntry(itemDrawer, loc)}
          onClose={() => setItemDrawer(null)}
          onImageChange={handleItemImage}
          imgRef={itemImgRef}
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

function InventoryGridCard({ entry, rect, canEdit, dragging, onOpen, onToggle, onMove, onMoveTo, onRotate, moveLabel, locations, onDragStart, onDragEnd }) {
  const item = entry.item || {}
  const image = item.imagem || item.image
  const isEquippable = entry.source === 'primary' || item.categoria === 'Arma' || item.categoria === 'Equipamento' || item.categoria === 'Traje'
  const weight = entry.source === 'inventory'
    ? estimateInventoryItemWeight(item)
    : entry.source === 'primary'
      ? getWeaponWeight(item.id, item.rank)
      : estimateEquipmentWeight(item)

  return (
    <div
      className={`resident-grid-card ${item.equipado ? 'is-equipped' : ''} ${dragging ? 'is-dragging' : ''}`}
      style={{
        '--item-cols': rect.w,
        '--item-rows': rect.h,
        left: `${(rect.x / GRID_COLS) * 100}%`,
        top: `${(rect.y / GRID_ROWS) * 100}%`,
        width: `${(rect.w / GRID_COLS) * 100}%`,
        height: `${(rect.h / GRID_ROWS) * 100}%`,
      }}
      draggable={canEdit}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <button type="button" onClick={onOpen} className="resident-grid-card-main">
        {image ? <img src={image} alt="" /> : <span className="material-symbols-outlined">{item.categoria === 'Arma' ? 'swords' : item.categoria === 'Equipamento' ? 'shield' : 'inventory_2'}</span>}
        <span className="resident-grid-card-name">{item.nome || item.name || 'Item'}</span>
        <span className="resident-grid-card-meta">{weight.toFixed(1)} kg</span>
      </button>
      <div className="resident-card-actions">
        {canEdit && (
          <button type="button" onClick={onRotate} title="Rotacionar">
            <span className="material-symbols-outlined">screen_rotation</span>
          </button>
        )}
        {isEquippable && canEdit && (
          <button type="button" onClick={onToggle} title={item.equipado ? 'Desequipar' : 'Equipar'}>
            <span className="material-symbols-outlined">{item.equipado ? 'remove_done' : 'done_all'}</span>
          </button>
        )}
        {canEdit && (
          <button type="button" onClick={onMove} title={moveLabel}>
            <span className="material-symbols-outlined">{moveLabel === 'Pegar' ? 'move_to_inbox' : 'outbox'}</span>
          </button>
        )}
        {canEdit && (
          <select
            title="Mover para"
            value={normalizeLocation(item.local, item)}
            onChange={(event) => onMoveTo(event.target.value)}
            onClick={(event) => event.stopPropagation()}
          >
            {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.label}</option>)}
          </select>
        )}
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

function InventoryItemCreateModal({ kind, onSave, onClose }) {
  const [draft, setDraft] = useState(kind === 'consumivel' ? CONSUMABLE_PRESETS[0] : { nome: '', descricao: '', peso: 0.1, cor: 'gray' })
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
            <span className="material-symbols-outlined">{kind === 'consumivel' ? 'local_drink' : 'inventory_2'}</span>
            <h3>{kind === 'consumivel' ? 'Consumivel Rapido' : 'Item Livre'}</h3>
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
        <div className="resident-form-grid">
          <input value={draft.nome || ''} onChange={e => setDraft({ ...draft, nome: e.target.value })} placeholder="Nome" />
          <input type="number" step="0.1" value={draft.peso ?? ''} onChange={e => setDraft({ ...draft, peso: Number(e.target.value) })} placeholder="Peso kg" />
          <textarea value={draft.descricao || ''} onChange={e => setDraft({ ...draft, descricao: e.target.value })} placeholder="Descricao, efeito, usos..." />
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
