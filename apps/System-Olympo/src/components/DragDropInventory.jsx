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

  // Combine regular items with equipped items for display
  const combinedItems = [
    ...items,
    ...equippedItems.map(eq => ({ ...eq, isEquipped: true })),
    ...(equippedWeapon ? [{ ...equippedWeapon, isEquipped: true, isWeapon: true }] : []),
  ]

  // Calculate item positions (slot indices)
  const itemPositions = new Map()
  combinedItems.forEach((item, idx) => {
    const slot = item.slot ?? idx
    itemPositions.set(slot, { item, idx })
  })

  const totalWeight = combinedItems.reduce((sum, item) => {
    const location = item.local || 'carregado'
    if (location === 'guardado' || location === 'base' || location === 'veiculo') return sum
    return sum + estimateItemWeight(item) * (Number(item.quantidade) || 1)
  }, 0)
  const displayedLoad = totalCarryWeight ?? totalWeight

  const occupiedSlots = new Set(combinedItems.map((item, idx) => item.slot ?? idx))

  function handleDragStart(e, item, idx, fromBackpackId = null) {
    setDraggedItem(item)
    setDraggedFromBackpack(fromBackpackId)
    setDraggedItemIndex(idx)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', JSON.stringify({ itemId: item.id, idx, fromBackpackId }))

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
    if (isBackpack && draggedFromBackpackId === parentBackpackId) {
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
    if (isBackpack && draggedFromBackpackId === parentBackpackId) {
      return
    }

    // Check if item is a backpack and we're trying to drop it into another backpack
    if (draggedItem.tipo === 'mochila' && isBackpack) {
      alert('Nao eh possivel colocar uma mochila dentro de outra mochila!')
      return
    }

    // Handle equipped item being dropped - unequip it
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

    // Handle drop within same inventory (rearranging)
    if (draggedFromBackpackId === null || draggedFromBackpackId === undefined) {
      const newItems = [...items]
      const sourceSlot = draggedItem.slot ?? draggedItemIndex
      const existingItemAtSlot = itemPositions.get(targetSlot)

      if (existingItemAtSlot && existingItemAtSlot.item.id !== draggedItem.id) {
        // Swap items
        const sourceIdx = existingItemAtSlot.idx
        const targetIdx = draggedItemIndex
        newItems[sourceIdx] = { ...existingItemAtSlot.item, slot: sourceSlot }
        newItems[targetIdx] = { ...draggedItem, slot: targetSlot }
      } else {
        // Move to empty slot
        newItems[draggedItemIndex] = { ...draggedItem, slot: targetSlot }
      }

      onUpdate(newItems)
    } else {
      // Moving from backpack to main inventory
      if (onTransfer) {
        onTransfer('backpack', draggedFromBackpackId, draggedItemIndex, targetSlot)
      }
    }

    setDraggedItem(null)
    setDraggedFromBackpack(null)
    setDraggedItemIndex(null)
  }

  function handleItemClick(item, idx) {
    // Clicking equipped item shows details or can unequip
    if (onItemView) {
      onItemView(item, idx)
    }
  }

  // Scroll to modal when opened
  useEffect(() => {
    if (openBackpackId && modalRef.current) {
      modalRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      modalRef.current.focus()
    }
  }, [openBackpackId])

  // Generate grid slots
  const slots = []
  for (let i = 0; i < inventorySize; i++) {
    const itemData = itemPositions.get(i)
    slots.push({ slot: i, item: itemData?.item, idx: itemData?.idx })
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
        {slots.map(({ slot, item, idx }) => (
          <div
            key={slot}
            className={`inventory-slot ${item ? 'has-item' : 'empty'} ${item?.tipo === 'mochila' ? 'is-backpack' : ''} ${item?.isEquipped ? 'is-equipped' : ''} ${dragOverSlot === slot ? 'drag-over' : ''}`}
            onDragOver={(e) => handleDragOver(e, slot)}
            onDragLeave={(e) => handleDragLeave(e, slot)}
            onDrop={(e) => handleDrop(e, slot)}
            onClick={item ? (e) => handleItemClick(item, idx) : undefined}
            onMouseEnter={() => setHoveredItem(item)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            {item ? (
              <div
                draggable={canEdit}
                onDragStart={(e) => handleDragStart(e, item, idx)}
                onDragEnd={handleDragEnd}
                className={`inventory-item ${ITEM_COLORS.find(c => c.id === (item.cor || 'gray'))?.cls || ''}`}
              >
                {item.isEquipped && (
                  <div className="inventory-item-badge equipped">
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
                {/* Details shown on hover */}
                {(hoveredItem?.id === item.id || hoveredItem === item) && !item.isEquipped && (
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

              // Find available slot in main inventory - try to use targetSlot first
              const mainItems = items.filter(i => i.id !== openBackpackId)
              const occupiedSlots = new Set(mainItems.map((item, idx) => item.slot ?? idx))

              let targetSlotInMain = targetSlot
              if (targetSlotInMain === null || targetSlotInMain === undefined || occupiedSlots.has(targetSlotInMain)) {
                // If target slot is invalid, find any available slot
                for (let s = 0; s < DEFAULT_INVENTORY_SIZE; s++) {
                  if (!occupiedSlots.has(s)) {
                    targetSlotInMain = s
                    break
                  }
                }
              }

              if (targetSlotInMain !== null && targetSlotInMain !== undefined) {
                onUpdate([...newItems, { ...item, slot: targetSlotInMain, local: 'carregado' }])
              }
            }
          }}
          onItemView={onItemView}
          onItemEdit={onItemEdit}
          onItemDelete={onItemDelete}
          parentBackpackId={openBackpackId}
        />,
        document.body
      )}
    </div>
  )
}

const BackpackModal = React.forwardRef(({ backpackId, items, onClose, canEdit, onUpdate, onTransfer, onItemView, onItemEdit, onItemDelete, parentBackpackId }, ref) => {
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

  function handleMoveToMainInventory(item, idx) {
    if (onTransfer) {
      onTransfer('backpack', backpackId, idx, null)
    }
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
            canEdit={canEdit}
            onUpdate={handleBackpackUpdate}
            onTransfer={(sourceType, sourceBackpackId, itemIdx, targetSlot) => {
              if (sourceType === 'backpack' && sourceBackpackId === backpackId) {
                handleMoveToMainInventory(backpackContents[itemIdx], itemIdx)
              }
            }}
            inventorySize={backpackSize}
            isBackpack={true}
            parentBackpackId={parentBackpackId}
            onItemView={onItemView}
            onItemEdit={onItemEdit}
            onItemDelete={onItemDelete}
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
