import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ITEM_COLORS } from '../data/colors'
import { suggestItemWeight } from '../services/aiService'
import { calcStartingEconomy, estimateInventoryItemWeight } from '../utils/calculator'
import DragDropInventory from './DragDropInventory'

function estimateItemWeight(item = {}) {
  return estimateInventoryItemWeight(item)
}

export default function InventorySection({
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
  onEquipItem,
  onUnequipItem,
}) {
  const [showCreate, setShowCreate] = useState(false)
  const [viewIdx, setViewIdx] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const editImgRef = useRef(null)

  if (!canEdit && items.length === 0 && !equippedWeapon && equippedItems.length === 0) return null

  function openDrawer(idx) { setViewIdx(idx); setEditMode(false); onDrawerToggle?.(true) }
  function closeDrawer() { setViewIdx(null); setEditMode(false); onDrawerToggle?.(false) }

  function addItem(item) {
    // Don't auto-assign slot - let user drag freely (free allocation!)
    // Just add to inventory without slot, it will be displayed at the end
    onUpdate([...items, { id: Date.now(), nome: '', descricao: '', imagem: null, cor: 'gray', ...item }])
    setShowCreate(false)
  }

  function updateItem(idx, patch) {
    const next = [...items]
    next[idx] = { ...next[idx], ...patch }
    onUpdate(next)
  }

  function removeItem(idx) {
    onUpdate(items.filter((_, i) => i !== idx))
    closeDrawer()
  }

  function handleDrawerImage(e) {
    const file = e.target.files?.[0]
    if (!file || viewIdx === null) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const maxDim = 512
        const scale = Math.min(maxDim / img.width, maxDim / img.height, 1)
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        updateItem(viewIdx, { imagem: canvas.toDataURL('image/webp', 0.88) })
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const viewing = viewIdx !== null ? items[viewIdx] : null

  return (
    <>
      <section className="inventory-redesign">
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => setShowCreate(true)}
            className={`text-[9px] border text-primary/70 px-2 py-0.5 rounded transition-colors shrink-0 ${canEdit ? 'border-primary/30 hover:bg-primary/10 hover:text-primary' : 'border-transparent opacity-50 cursor-not-allowed'}`}
            disabled={!canEdit}>
            + Item
          </button>
          <button onClick={() => setShowCreate('mochila')}
            className={`text-[9px] border text-amber-300/70 px-2 py-0.5 rounded transition-colors shrink-0 ${canEdit ? 'border-amber-400/30 hover:bg-amber-400/10 hover:text-amber-300' : 'border-transparent opacity-50 cursor-not-allowed'}`}
            disabled={!canEdit}>
            + Mochila
          </button>
        </div>

        <DragDropInventory
          items={items}
          equippedWeapon={equippedWeapon}
          equippedItems={equippedItems}
          canEdit={canEdit}
          onUpdate={onUpdate}
          onTransfer={onTransfer}
          wallet={wallet}
          onWalletUpdate={onWalletUpdate}
          maxCarry={maxCarry}
          level={level}
          modules={modules}
          totalCarryWeight={totalCarryWeight}
          onItemView={(item, idx) => openDrawer(idx)}
          onItemEdit={() => setEditMode(true)}
          onItemDelete={(idx) => removeItem(idx)}
          onEquipItem={onEquipItem}
          onUnequipItem={onUnequipItem}
        />
      </section>

      {showCreate && createPortal(
        <ItemCreateModal
          itemType={showCreate === 'mochila' ? 'mochila' : 'normal'}
          onSave={addItem}
          onClose={() => setShowCreate(false)}
        />,
        document.body
      )}

      {viewing && createPortal(
        <ItemDrawer
          item={viewing}
          canEdit={canEdit}
          editMode={editMode}
          onEdit={() => setEditMode(true)}
          onCancelEdit={() => setEditMode(false)}
          onSaveEdit={(patch) => updateItem(viewIdx, patch)}
          onDelete={() => removeItem(viewIdx)}
          onTransfer={onTransfer ? () => onTransfer(viewIdx) : null}
          onClose={closeDrawer}
          onImageChange={handleDrawerImage}
          imgRef={editImgRef}
        />,
        document.body
      )}
    </>
  )
}

function ItemCreateModal({ itemType = 'normal', onSave, onClose }) {
  const [nome, setNome] = useState(itemType === 'mochila' ? 'Mochila' : '')
  const [descricao, setDescricao] = useState('')
  const [peso, setPeso] = useState('')
  const [cor, setCor] = useState('gray')
  const [imagem, setImagem] = useState(null)
  const [preview, setPreview] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [local, setLocal] = useState('carregado')
  const [slotSize, setSlotSize] = useState(12) // Default backpack size
  const fileRef = useRef(null)
  const modalRef = useRef(null)

  useEffect(() => {
    modalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  function handleImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const maxDim = 512
        const scale = Math.min(maxDim / img.width, maxDim / img.height, 1)
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        const dataUrl = canvas.toDataURL('image/webp', 0.88)
        setImagem(dataUrl); setPreview(dataUrl)
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function aiWeight() {
    if (!nome.trim()) return
    setAiLoading(true)
    try {
      const val = await suggestItemWeight(nome, descricao)
      if (val != null) setPeso(String(val))
    } catch {}
    setAiLoading(false)
  }

  function save() {
    const baseItem = {
      nome,
      descricao,
      imagem,
      cor,
      local,
      peso: peso === '' ? estimateItemWeight({ nome, descricao }) : Number(peso),
    }

    if (itemType === 'mochila') {
      onSave({
        ...baseItem,
        tipo: 'mochila',
        contents: [],
        slotSize: slotSize,
      })
    } else {
      onSave(baseItem)
    }
  }

  const isBackpack = itemType === 'mochila'

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm modal-bg" onClick={onClose}>
      <div ref={modalRef} tabIndex={-1} className="codex-card !bg-deep border-primary/25 rounded-xl w-full max-w-md shadow-2xl shadow-black/50 modal-content outline-none focus:outline-none" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-sep/30 flex items-center justify-between">
          <h3 className="font-cinzel text-primary text-sm">{isBackpack ? 'Nova Mochila' : 'Novo Item'}</h3>
          <button onClick={onClose} className="text-txt-dim hover:text-err text-sm transition-colors">×</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <button onClick={() => fileRef.current?.click()}
              className="w-24 h-24 rounded-lg border-2 border-dashed border-sep/50 flex flex-col items-center justify-center hover:border-gold/40 transition-colors shrink-0 bg-void/50 group overflow-hidden">
              {preview ? <img src={preview} alt="" className="w-full h-full rounded-lg object-cover" /> : <span className="text-txt-dim/40 text-xs">Imagem</span>}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
            <div className="flex-1 space-y-2">
              <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder={isBackpack ? "Nome da mochila" : "Nome do item"}
                className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-xs text-txt-main focus:border-gold/40 focus:outline-none" autoFocus />
              <textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder={isBackpack ? "Descrição da mochila" : "Descrição"} rows={2}
                className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-[11px] text-txt-main resize-none focus:border-gold/40 focus:outline-none leading-relaxed" />
              {!isBackpack && (
                <div className="flex gap-1.5">
                  <input type="number" step="0.1" value={peso} onChange={e => setPeso(e.target.value)} placeholder="Peso kg (opcional)"
                    className="flex-1 min-w-0 bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-xs text-txt-main focus:border-gold/40 focus:outline-none" />
                  <button type="button" onClick={aiWeight} disabled={aiLoading || !nome.trim()} title="Sugerir peso com IA"
                    className="shrink-0 px-2.5 py-2 text-[10px] border border-indigo-400/30 text-indigo-300 rounded-lg hover:bg-indigo-400/10 transition-colors disabled:opacity-40">
                    {aiLoading ? '...' : 'IA'}
                  </button>
                </div>
              )}
              {!isBackpack && (
                <select value={local} onChange={e => setLocal(e.target.value)}
                  className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-xs text-txt-main focus:border-gold/40 focus:outline-none">
                  <option value="carregado">Carregado</option>
                  <option value="mochila">Mochila</option>
                  <option value="veiculo">Veículo</option>
                  <option value="base">Base/Casa</option>
                  <option value="guardado">Guardado</option>
                </select>
              )}
              {isBackpack && (
                <div className="space-y-1">
                  <label className="text-[10px] text-txt-dim/70">Capacidade da mochila:</label>
                  <select value={slotSize} onChange={e => setSlotSize(Number(e.target.value))}
                    className="w-full bg-void/60 border border-amber-400/30 rounded-lg px-3 py-2 text-xs text-txt-main focus:border-amber-400/40 focus:outline-none">
                    <option value="8">8 slots (2x4)</option>
                    <option value="12">12 slots (3x4)</option>
                    <option value="16">16 slots (4x4)</option>
                    <option value="20">20 slots (5x4)</option>
                  </select>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-1.5 mt-1.5">
            {ITEM_COLORS.map(c => {
              const bgMap = { gray: 'bg-gray-400', red: 'bg-red-500', orange: 'bg-orange-500', amber: 'bg-amber-400', emerald: 'bg-emerald-500', sky: 'bg-sky-500', purple: 'bg-purple-500', pink: 'bg-pink-500' }
              return (
                <button key={c.id} onClick={() => setCor(c.id)} title={c.label}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${cor === c.id ? 'scale-125 border-gold/80 ring-2 ring-gold/25' : 'border-black/30 hover:scale-110'} ${bgMap[c.id]}`} />
              )
            })}
          </div>
          {isBackpack && (
            <div className="bg-amber-400/10 border border-amber-400/20 rounded-lg p-3">
              <div className="flex items-center gap-2 text-[10px] text-amber-200">
                <span className="material-symbols-outlined text-sm">info</span>
                <span>Itens dentro da mochila não contam para o peso carregado, mas a mochila sim.</span>
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-3 border-t border-sep/30 flex justify-end gap-2">
          <button onClick={onClose} className="text-txt-dim text-xs hover:text-txt-main px-3 py-1.5 transition-colors">Cancelar</button>
          <button onClick={save} disabled={!nome.trim()}
            className={`text-xs px-4 py-1.5 rounded-lg font-semibold transition-colors ${nome.trim() ? 'bg-gold text-void hover:bg-gold-light' : 'bg-gold/20 text-void/40 cursor-not-allowed'}`}>
            {isBackpack ? 'Criar Mochila' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ItemDrawer({ item, canEdit, editMode, onEdit, onCancelEdit, onSaveEdit, onDelete, onTransfer, onClose, onImageChange, imgRef }) {
  const [editNome, setEditNome] = useState(item.nome || '')
  const [editDesc, setEditDesc] = useState(item.descricao || '')
  const [editCor, setEditCor] = useState(item.cor || 'gray')
  const [editPeso, setEditPeso] = useState(item.peso ?? '')
  const [editLocal, setEditLocal] = useState(item.local || 'carregado')
  const [aiLoading, setAiLoading] = useState(false)
  const cc = ITEM_COLORS.find(c => c.id === (item.cor || 'gray')) || ITEM_COLORS[0]

  const isBackpack = item.tipo === 'mochila'

  async function aiWeight() {
    if (!editNome.trim()) return
    setAiLoading(true)
    try {
      const val = await suggestItemWeight(editNome, editDesc)
      if (val != null) setEditPeso(String(val))
    } catch {}
    setAiLoading(false)
  }

  function handleSave() {
    const patch = {
      nome: editNome,
      descricao: editDesc,
      cor: editCor,
      local: editLocal,
      peso: editPeso === '' ? estimateItemWeight({ nome: editNome, descricao: editDesc }) : Number(editPeso),
    }
    onSaveEdit(patch)
    onCancelEdit()
  }

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/40 drawer-overlay" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-[380px] bg-deep border-l border-primary/15 shadow-2xl shadow-black/60 flex flex-col drawer-panel">
        <div className="px-4 py-3 border-b border-sep/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="font-cinzel text-primary text-xs uppercase tracking-wider">
              {isBackpack ? 'Mochila' : 'Item'}
            </h3>
            <div className={`w-2.5 h-2.5 rounded ${cc.cls}`} />
            {isBackpack && <span className="material-symbols-outlined text-amber-300 text-sm">backpack</span>}
          </div>
          <button onClick={onClose} className="text-txt-dim hover:text-err text-sm transition-colors">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {editMode && canEdit ? (
            <>
              <div className="flex justify-center">
                <button onClick={() => imgRef.current?.click()}
                  className="w-28 h-28 rounded-lg border border-sep/40 flex items-center justify-center hover:border-gold/40 transition-colors overflow-hidden bg-void/50">
                  {item.imagem ? <img src={item.imagem} alt="" className="w-full h-full object-cover" /> : <span className="text-txt-dim/40 text-xs">Imagem</span>}
                </button>
                <input ref={imgRef} type="file" accept="image/*" onChange={onImageChange} className="hidden" />
              </div>
              <input type="text" value={editNome} onChange={e => setEditNome(e.target.value)} placeholder="Nome"
                className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-sm text-txt-main focus:border-gold/40 focus:outline-none" />
              <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Descrição" rows={4}
                className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-xs text-txt-main resize-none focus:border-gold/40 focus:outline-none leading-relaxed" />
              {!isBackpack && (
                <div className="flex gap-1.5">
                  <input type="number" step="0.1" value={editPeso} onChange={e => setEditPeso(e.target.value)} placeholder="Peso kg"
                    className="flex-1 min-w-0 bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-sm text-txt-main focus:border-gold/40 focus:outline-none" />
                  <button type="button" onClick={aiWeight} disabled={aiLoading || !editNome.trim()} title="Sugerir peso com IA"
                    className="shrink-0 px-2.5 py-2 text-[10px] border border-indigo-400/30 text-indigo-300 rounded-lg hover:bg-indigo-400/10 transition-colors disabled:opacity-40">
                    {aiLoading ? '...' : 'IA'}
                  </button>
                </div>
              )}
              {!isBackpack && (
                <select value={editLocal} onChange={e => setEditLocal(e.target.value)}
                  className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-xs text-txt-main focus:border-gold/40 focus:outline-none">
                  <option value="carregado">Carregado</option>
                  <option value="mochila">Mochila</option>
                  <option value="veiculo">Veículo</option>
                  <option value="base">Base/Casa</option>
                  <option value="guardado">Guardado</option>
                </select>
              )}
              {isBackpack && item.contents && (
                <div className="bg-amber-400/10 border border-amber-400/20 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-amber-200">Conteúdo: {item.contents.length} itens</span>
                    <span className="text-[10px] text-amber-200">{item.contents.length}/{item.slotSize || 12} slots</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {item.imagem && <img src={item.imagem} alt="" className="w-full aspect-[4/3] rounded-lg object-cover border border-sep/30" />}
              {isBackpack && <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-amber-300">backpack</span>
                <span className="text-[10px] text-amber-200">Mochila</span>
              </div>}
              <h4 className="text-txt-main text-sm font-semibold">{item.nome || (isBackpack ? 'Mochila' : 'Item')}</h4>
              <span className="inline-flex text-[9px] text-txt-dim/70 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">{item.local || 'carregado'}</span>
              {item.descricao ? <p className="text-txt-dim/80 text-xs leading-relaxed">{item.descricao}</p> : <p className="text-txt-dim/30 text-xs italic">Sem descrição</p>}
              {!isBackpack && (
                <div className="inventory-drawer-weight"><span>Peso</span><strong>{estimateItemWeight(item).toFixed(1)} kg</strong></div>
              )}
              {isBackpack && (
                <div className="inventory-drawer-weight"><span>Peso da mochila</span><strong>{estimateItemWeight(item).toFixed(1)} kg</strong></div>
              )}
              {isBackpack && item.contents && item.contents.length > 0 && (
                <div className="bg-amber-400/10 border border-amber-400/20 rounded-lg p-3">
                  <div className="text-[10px] text-amber-200">Contém {item.contents.length} itens</div>
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
              <button onClick={handleSave} className="text-[10px] bg-gold text-void px-3 py-1.5 rounded-lg hover:bg-gold-light transition-colors font-semibold">Salvar</button>
              <button onClick={onCancelEdit} className="text-[10px] text-txt-dim hover:text-txt-main px-3 py-1.5 transition-colors">Cancelar</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
