import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import React from 'react'
import { ITEM_COLORS } from '../data/colors'
import { estimateInventoryItemWeight } from '../utils/calculator'

const DEFAULT_INVENTORY_SIZE = 24 // 6x4 grid like Resident Evil
const BACKPACK_DEFAULT_SIZE = 12 // 3x4 grid for backpacks

function estimateItemWeight(item = {}) {
  return estimateInventoryItemWeight(item)
}

export default function DragDropInventory({
  items = [],
  equippedWeapon = null,
  equippedItems = [],
  canEdit,
  onUpdate,
  onDrawerToggle,
  wallet = {},
  onWalletUpdate,
  maxCarry,
  level = 1,
  modules = [],
  totalCarryWeight = null,
  onTransfer,
  inventorySize = DEFAULT_INVENTORY_SIZE,
  isBackpack = false,
  parentBackpackId = null,
  onItemView,
  onItemEdit,
  onItemDelete,
  onEquipItem,
  onUnequipItem,
}) {
  const [draggedItem, setDraggedItem] = useState(null)
  const [draggedFromBackpack, setDraggedFromBackpack] = useState(null)
  const [draggedItemIndex, setDraggedItemIndex] = useState(null)
  const [openBackpackId, setOpenBackpackId] = useState(null)
  const [dragOverSlot, setDragOverSlot] = useState(null)
  const [hoveredItem, setHoveredItem] = useState(null)
  const containerRef = useRef(null)
  const modalRef = useRef(null)

  // Separate regular items from equipped items - each type has its own index range
  // Regular items: indices 0 to items.length - 1
  // Equipped weapons: virtual index starting at items.length
  // Equipped items: virtual index starting at items.length + (equippedWeapon ? 1 : 0)
  const weaponOffset = equippedWeapon ? 1 : 0
  const equippedItemOffset = items.length + weaponOffset

  // Create unified positions map that includes all items
  const itemPositions = new Map()

  // Add regular items with their original indices
  items.forEach((item, idx) => {
    const slot = item.slot
    if (slot !== null && slot !== undefined) {
      itemPositions.set(slot, { item, idx, source: 'items' })
    }
  })

  // Add equipped items with their virtual indices
  equippedItems.forEach((item, idx) => {
    const slot = item.slot
    const virtualIdx = equippedItemOffset + idx
    if (slot !== null && slot !== undefined) {
      itemPositions.set(slot, { item, idx: virtualIdx, source: 'equipped' })
    }
  })

  // Add equipped weapon with virtual index
  if (equippedWeapon) {
    const slot = equippedWeapon.slot
    const virtualIdx = equippedItemOffset
    if (slot !== null && slot !== undefined) {
      itemPositions.set(slot, { item: equippedWeapon, idx: virtualIdx, source: 'weapon' })
    }
  }

  // Combine all items for display - maintain their original virtual indices
  const combinedItems = [
    ...items.map((item, idx) => ({ ...item, idx, source: 'items' })),
    ...equippedItems.map((item, idx) => ({ ...item, idx: equippedItemOffset + idx, source: 'equipped' })),
    ...(equippedWeapon ? [{ ...equippedWeapon, idx: weaponOffset, source: 'weapon' }] : []),
  ]

  const totalWeight = combinedItems.reduce((sum, item) => {
    const location = item.local || 'carregado'
    if (location === 'guardado' || location === 'base' || location === 'veiculo') return sum
    return sum + estimateItemWeight(item) * (Number(item.quantidade) || 1)
  }, 0)
  const displayedLoad = totalCarryWeight ?? totalWeight

  const occupiedSlots = new Set(combinedItems.map(item => item.slot))

  function handleDragStart(e, item, idx, source = 'items') {
    setDraggedItem(item)
    setDraggedFromBackpack(source === 'equipped' ? 'equipped' : source)
    setDraggedItemIndex(idx)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', JSON.stringify({ itemId: item.id, idx, source }))

    // Add drag styling to actual element
    const dragElement = e.target.closest('.inventory-item')
    if (dragElement) {
      dragElement.classList.add('dragging')
    }
  }

  function handleDragEnd(e) {
    setDraggedItem(null)
    setDraggedFromBackpack(null)
    setDraggedItemIndex(null)
    setDragOverSlot(null)

    // Remove drag styling
    const dragElement = e.target.closest('.inventory-item')
    if (dragElement) {
      dragElement.classList.remove('dragging')
    }

    // Clean up all drag-over states
    document.querySelectorAll('.inventory-slot.drag-over').forEach(el => {
      el.classList.remove('drag-over')
    })
  }

  function handleDragOver(e, targetSlot) {
    e.preventDefault()

    // Check if dropping into same backpack (prevent recursion)
    if (isBackpack && draggedFromBackpack === parentBackpackId) {
      e.dataTransfer.dropEffect = 'none'
      return
    }

    // Check if item is a backpack and we're trying to drop it into another backpack
    if (draggedItem?.tipo === 'mochila' && isBackpack) {
      e.dataTransfer.dropEffect = 'none'
      return
    }

    e.dataTransfer.dropEffect = 'move'
    setDragOverSlot(targetSlot)

    // Add visual feedback to target slot
    const targetSlotElement = e.target.closest('.inventory-slot')
    if (targetSlotElement) {
      targetSlotElement.classList.add('drag-over')
    }
  }

  function handleDragLeave(e, targetSlot) {
    const targetSlotElement = e.target.closest('.inventory-slot')
    if (targetSlotElement && !targetSlotElement.contains(e.relatedTarget)) {
      targetSlotElement.classList.remove('drag-over')
    }
  }

  function handleDrop(e, targetSlot) {
    e.preventDefault()

    // Remove drag-over state
    const targetSlotElement = e.target.closest('.inventory-slot')
    if (targetSlotElement) {
      targetSlotElement.classList.remove('drag-over')
    }
    setDragOverSlot(null)

    if (!draggedItem) return

    // Check if dropping into same backpack (prevent recursion)
    if (isBackpack && draggedFromBackpack === parentBackpackId) {
      return
    }

    // Check if item is a backpack and we're trying to drop it into another backpack
    if (draggedItem.tipo === 'mochila' && isBackpack) {
      alert('Nao eh possivel colocar uma mochila dentro de outra mochila!')
      return
    }

    // Handle equipped item being dropped - unequip it first
    if (draggedItem.isEquipped) {
      if (onUnequipItem) {
        if (draggedItem.isWeapon) {
          onUnequipItem('weapon')
        } else {
          onUnequipItem(draggedItem.id)
        }
      }
      return
    }

    // Handle drop within different types of inventory
    if (draggedFromBackpack !== null && draggedFromBackpack !== undefined) {
      // Moving from backpack to main inventory
      if (onTransfer) {
        onTransfer('backpack', draggedFromBackpack, draggedItemIndex, targetSlot)
      }
      return
    }

    // Moving within main inventory (regular items or equipped items)
    const sourceData = itemPositions.get(draggedItem.slot)
    const targetData = itemPositions.get(targetSlot)

    if (targetData && targetData.item.id !== draggedItem.id) {
      // Swap with item in target slot
      const sourceType = sourceData.source
      const targetType = targetData.source

      if (sourceType === targetType || (sourceType === 'items' && targetType === 'equipped') || (sourceType === 'equipped' && targetType === 'items')) {
        // Same type - swap within same array
        if (sourceType === 'items') {
          const newItems = [...items]
          const sourceRealIdx = sourceData.idx
          const targetRealIdx = items.findIndex(i => i.id === targetData.item.id)

          newItems[sourceRealIdx] = { ...targetData.item, slot: draggedItem.slot }
          newItems[targetRealIdx] = { ...draggedItem, slot: targetSlot }
          onUpdate(newItems)
        } else if (sourceType === 'equipped') {
          // Swap within equipped items
          const realIdx = sourceData.idx - equippedItemOffset
          const targetRealIdx = targetData.idx - equippedItemOffset
          const newEquippedItems = [...equippedItems]
          newEquippedItems[realIdx] = { ...targetData.item, slot: draggedItem.slot }
          newEquippedItems[targetRealIdx] = { ...draggedItem, slot: targetSlot }

          // Call onUnequipItem with the ID of the item being moved
          onUnequipItem(draggedItem.id)

          // Need to re-equip the moved item
          onEquipItem(draggedItem.id)
        } else if (sourceType === 'weapon') {
          // Swap with equipped weapon (not implemented as weapon can't be unequipped this way)
          // For now, just don't allow swapping with weapon
          return
        }
      } else {
        // Different types - move from equipped to regular items or vice versa
        if (sourceType === 'items') {
          // Moving regular item to equipped item slot
          // This unequips the target item and equips the dragged one
          if (targetData.item.isEquipped) {
            onUnequipItem(draggedItem.id)
            onEquipItem(targetData.item.id)
          }
        } else if (sourceType === 'equipped') {
          // Moving equipped item to regular item slot
          onUnequipItem(draggedItem.id)
        }
      }
    } else {
      // Drop on empty slot - move item there
      if (sourceData?.source === 'items') {
        const newItems = [...items]
        newItems[sourceData.idx] = { ...draggedItem, slot: targetSlot }
        onUpdate(newItems)
      } else if (sourceData?.source === 'equipped') {
        // Move equipped item to empty slot in regular items area
        onUnequipItem(draggedItem.id)
        const newItems = [...items, { ...draggedItem, local: 'carregado', slot: targetSlot }]
        onUpdate(newItems)
      }
    }

    setDraggedItem(null)
    setDraggedFromBackpack(null)
    setDraggedItemIndex(null)
  }

  function handleItemClick(item, idx, source) {
    // Clicking equipped item shows details or can unequip
    if (item.isEquipped) {
      // Show details of equipped item
      if (onItemView) {
        onItemView(item, idx)
      }
    } else if (source === 'equipped') {
      // Clicking equipped item - quick unequip
      if (onUnequipItem) {
        onUnequipItem(item.id)
      }
    } else {
      // Clicking regular item - show details
      if (onItemView) {
        onItemView(item, idx)
      }
    }

    // Clicking backpack - open it
    if (item.tipo === 'mochila') {
      setOpenBackpackId(item.id === openBackpackId ? null : item.id)
    }
  }

  function handleQuickUnequip(item, source) {
    if (item.isEquipped && onUnequipItem) {
      e.stopPropagation()
      if (source === 'equipped') {
        onUnequipItem(item.id)
      }
    }
  }

  // Scroll to modal when opened
  useEffect(() => {
    if (openBackpackId && modalRef.current) {
      modalRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      modalRef.current.focus()
    }
  }, [openBackpackId])

  // Generate grid slots - target specific slot number
  const slots = []
  for (let i = 0; i < inventorySize; i++) {
    const itemData = itemPositions.get(i)
    slots.push({ slot: i, item: itemData?.item, idx: itemData?.idx, source: itemData?.source })
  }

  return (
    <div ref={containerRef} className="drag-drop-inventory">
      <div className="inventory-header">
        <div className="inventory-title">
          <span className="material-symbols-outlined inventory-icon">inventory_2</span>
          {isBackpack ? 'Mochila' : 'Inventário Geral'}
          {!isBackpack && (
            <span className="inventory-slots-info">{combinedItems.length}/{inventorySize} slots</span>
          )}
        </div>
        {!isBackpack && (
          <div className="inventory-currency-strip">
            <label>$ <input type="number" value={wallet.dolares ?? 0} disabled={!canEdit} onChange={e => onWalletUpdate?.({ dolares: Number(e.target.value) || 0 })} /></label>
            <label>Δ <input type="number" value={wallet.dracmas ?? 0} disabled={!canEdit} onChange={e => onWalletUpdate?.({ dracmas: Number(e.target.value) || 0 })} /></label>
          </div>
        )}
      </div>

      <div
        className="inventory-slots-grid"
        style={{
          gridTemplateColumns: `repeat(${Math.min(6, isBackpack ? 3 : 6)}, 1fr)`,
          gridTemplateRows: `repeat(${Math.ceil(inventorySize / (isBackpack ? 3 : 6))}, 1fr)`
        }}
      >
        {slots.map(({ slot, item, idx, source }) => (
          <div
            key={slot}
            className={`inventory-slot ${item ? 'has-item' : 'empty'} ${item?.tipo === 'mochila' ? 'is-backpack' : ''} ${item?.isEquipped ? 'is-equipped' : ''} ${dragOverSlot === slot ? 'drag-over' : ''}`}
            onDragOver={(e) => handleDragOver(e, slot)}
            onDragLeave={(e) => handleDragLeave(e, slot)}
            onDrop={(e) => handleDrop(e, slot)}
            onClick={item ? (e) => handleItemClick(item, idx, source) : undefined}
            onMouseEnter={() => setHoveredItem(item)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            {item ? (
              <div
                draggable={canEdit}
                onDragStart={(e) => handleDragStart(e, item, idx, source)}
                onDragEnd={handleDragEnd}
                className={`inventory-item ${ITEM_COLORS.find(c => c.id === (item.cor || 'gray'))?.cls || ''}`}
              >
                {item.isEquipped && (
                  <div className="inventory-item-badge equipped" onClick={(e) => handleQuickUnequip(item, source)}>
                    <span className="material-symbols-outlined">check_circle</span>
                  </div>
                )}
                {item.tipo === 'mochila' && (
                  <div className="inventory-item-badge backpack">
                    <span className="material-symbols-outlined">backpack</span>
                  </div>
                )}
                {item.imagem ? (
                  <img src={item.imagem} alt="" className="inventory-item-image" />
                ) : (
                  <div className="inventory-item-empty-icon">
                    {item.tipo === 'mochila' ? <span className="material-symbols-outlined">backpack</span> : item.isWeapon ? '⚔' : '▢'}
                  </div>
                )}
                {/* Details shown on hover - always show for equipped items too */}
                {(hoveredItem?.id === item.id || hoveredItem === item || item.isEquipped) && (
                  <div className="inventory-item-tooltip">
                    <span className="inventory-item-name-tooltip">{item.nome || 'Item'}</span>
                    {item.tipo !== 'mochila' && (
                      <span className="inventory-weight-chip-tooltip">{estimateItemWeight(item).toFixed(1)} kg</span>
                    )}
                  </div>
                )}
                {item.tipo === 'mochila' && item.contents && (
                  <span className="inventory-item-count">{item.contents.length}</span>
                )}
              </div>
            ) : (
              <div className="inventory-slot-empty" />
            )}
          </div>
        ))}
      </div>

      {!isBackpack && (
        <div className="inventory-load-footer">
          <span>Carga</span>
          <strong className={maxCarry && displayedLoad > maxCarry ? 'text-red-400' : ''}>{displayedLoad.toFixed(1)} kg{maxCarry ? ` / ${maxCarry} kg` : ''}</strong>
        </div>
      )}

      {/* Backpack Modal */}
      {openBackpackId && createPortal(
        <BackpackModal
          ref={modalRef}
          backpackId={openBackpackId}
          items={items}
          onClose={() => setOpenBackpackId(null)}
          canEdit={canEdit}
          onUpdate={onUpdate}
          onTransfer={(sourceType, sourceBackpackId, itemIdx, targetSlot) => {
            if (sourceType === 'backpack' && sourceBackpackId === openBackpackId) {
              // Moving item from backpack to main inventory
              const backpack = items.find(i => i.id === openBackpackId)
              if (!backpack?.contents) return

              const item = backpack.contents[itemIdx]
              const newContents = backpack.contents.filter((_, i) => i !== itemIdx)
              const newItems = items.map(i => {
                if (i.id === openBackpackId) {
                  return { ...i, contents: newContents }
                }
                return i
              })

              // Use targetSlot directly - allow placing in any slot
              onUpdate([...newItems, { ...item, slot: targetSlot, local: 'carregado' }])
            }
          }}
          onItemView={onItemView}
          onItemEdit={onItemEdit}
          onItemDelete={onItemDelete}
          onUnequipItem={onUnequipItem}
          parentBackpackId={openBackpackId}
        />,
        document.body
      )}
    </div>
  )
}

const BackpackModal = React.forwardRef(({ backpackId, items, onClose, canEdit, onUpdate, onTransfer, onItemView, onItemEdit, onItemDelete, onUnequipItem, parentBackpackId }, ref) => {
  const backpack = items.find(i => i.id === backpackId)
  if (!backpack) return null

  const backpackContents = backpack.contents || []
  const backpackSize = backpack.slotSize || BACKPACK_DEFAULT_SIZE

  function handleBackpackUpdate(newContents) {
    const newItems = items.map(i => {
      if (i.id === backpackId) {
        return { ...i, contents: newContents }
      }
      return i
    })
    onUpdate(newItems)
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div ref={ref} tabIndex={-1} className="codex-card !bg-deep border-primary/25 rounded-xl w-full max-w-lg shadow-2xl shadow-black/50 relative z-10 outline-none focus:outline-none">
        <div className="px-6 py-4 border-b border-sep/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-300">backpack</span>
            <h3 className="font-cinzel text-primary text-sm">{backpack.nome || 'Mochila'}</h3>
            <span className="text-[10px] text-txt-dim/70 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
              {backpackContents.length}/{backpackSize} slots
            </span>
          </div>
          <button onClick={onClose} className="text-txt-dim hover:text-err text-sm transition-colors">×</button>
        </div>

        <div className="p-4">
          {backpack.descricao && (
            <p className="text-txt-dim/70 text-xs mb-4 leading-relaxed">{backpack.descricao}</p>
          )}

          <DragDropInventory
            items={backpackContents}
            equippedWeapon={null}
            equippedItems={[]}
            canEdit={canEdit}
            onUpdate={handleBackpackUpdate}
            onTransfer={(sourceType, sourceBackpackId, itemIdx, targetSlot) => {
              if (sourceType === 'backpack' && sourceBackpackId === backpackId) {
                // Use targetSlot directly - allow placing in any slot
                const backpack = items.find(i => i.id === backpackId)
                if (!backpack?.contents) return

                const item = backpack.contents[itemIdx]
                const newContents = backpack.contents.filter((_, i) => i !== itemIdx)
                const newItems = items.map(i => {
                  if (i.id === backpackId) {
                    return { ...i, contents: newContents }
                  }
                  return i
                })

                onUpdate([...newItems, { ...item, slot: targetSlot, local: 'carregado' }])
              }
            }}
            inventorySize={backpackSize}
            isBackpack={true}
            parentBackpackId={parentBackpackId}
            onItemView={onItemView}
            onItemEdit={onItemEdit}
            onItemDelete={onItemDelete}
            onUnequipItem={onUnequipItem}
          />
        </div>

        {backpackContents.length > 0 && (
          <div className="px-6 py-3 border-t border-sep/30">
            <p className="text-[9px] text-txt-dim/50 text-center">
              Arraste itens para fora da mochila para move-los ao inventario principal
            </p>
          </div>
        )}
      </div>
    </div>
  )
})

BackpackModal.displayName = 'BackpackModal'
