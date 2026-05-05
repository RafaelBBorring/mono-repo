import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ITEM_COLORS } from '../data/colors'

function estimateItemWeight(item = {}) {
  if (item.peso !== '' && item.peso != null && !Number.isNaN(Number(item.peso))) return Number(item.peso)
  const text = `${item.nome || ''} ${item.descricao || ''}`.toLowerCase()
  if (!text.trim()) return 0
  if (/moeda|anel|amuleto|chave|gema|po[cç][aã]o|frasco/.test(text)) return 0.2
  if (/livro|grim[oó]rio|manto|roupa|kit|corda/.test(text)) return 1
  if (/armadura|escudo|machado|rifle|escopeta|lan[cç]a/.test(text)) return 4
  if (/ba[uú]|estatua|barril|caixa|reliquia grande/.test(text)) return 8
  return 0.5
}

export default function InventorySection({ items = [], canEdit, onUpdate, onDrawerToggle, wallet = {}, onWalletUpdate, maxCarry }) {
  const [showCreate, setShowCreate] = useState(false)
  const [viewIdx, setViewIdx] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const editImgRef = useRef(null)
  const totalWeight = items.reduce((sum, item) => sum + estimateItemWeight(item) * (Number(item.quantidade) || 1), 0)

  if (!canEdit && items.length === 0) return null

  function openDrawer(idx) { setViewIdx(idx); setEditMode(false); onDrawerToggle?.(true) }
  function closeDrawer() { setViewIdx(null); setEditMode(false); onDrawerToggle?.(false) }

  function addItem(item) {
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

  function moveItem(idx, dir) {
    const target = idx + dir
    if (target < 0 || target >= items.length) return
    const next = [...items]
    const [item] = next.splice(idx, 1)
    next.splice(target, 0, item)
    onUpdate(next)
  }

  function handleDrawerImage(e) {
    const file = e.target.files?.[0]
    if (!file || viewIdx === null) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const size = 160
        const canvas = document.createElement('canvas')
        canvas.width = size; canvas.height = size
        const ctx = canvas.getContext('2d')
        const scale = Math.max(size / img.width, size / img.height)
        const w = img.width * scale; const h = img.height * scale
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
        updateItem(viewIdx, { imagem: canvas.toDataURL('image/webp', 0.72) })
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
          <div className="section-header text-primary mb-0 flex-1">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>inventory_2</span>
            Inventário Geral
          </div>
          <div className="inventory-currency-strip">
            <label>$ <input type="number" value={wallet.dolares ?? 0} disabled={!canEdit} onChange={e => onWalletUpdate?.({ dolares: Number(e.target.value) || 0 })} /></label>
            <label>Δ <input type="number" value={wallet.dracmas ?? 0} disabled={!canEdit} onChange={e => onWalletUpdate?.({ dracmas: Number(e.target.value) || 0 })} /></label>
          </div>
          {canEdit && (
            <button onClick={() => setShowCreate(true)}
              className="text-[9px] border border-primary/30 text-primary/70 px-2 py-0.5 rounded hover:bg-primary/10 hover:text-primary transition-colors shrink-0">
              + Item
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <p className="text-txt-dim/50 text-[11px] italic">Inventário vazio</p>
        ) : (
          <div className="inventory-item-grid">
            {items.map((item, idx) => {
              const cc = ITEM_COLORS.find(c => c.id === (item.cor || 'gray')) || ITEM_COLORS[0]
              return (
                <button key={item.id || idx} type="button" onClick={() => openDrawer(idx)}
                  className={`inventory-item-card border ${cc.cls}`}>
                  {canEdit && (
                    <span className="inventory-order-controls" onClick={e => e.stopPropagation()}>
                      <span role="button" tabIndex={0} onClick={() => moveItem(idx, -1)}>↑</span>
                      <span role="button" tabIndex={0} onClick={() => moveItem(idx, 1)}>↓</span>
                    </span>
                  )}
                  {item.imagem ? (
                    <img src={item.imagem} alt="" className="inventory-item-image" />
                  ) : (
                    <span className="inventory-item-empty">▢</span>
                  )}
                  <span className="inventory-item-name">{item.nome || 'Item'}</span>
                  <span className="inventory-weight-chip">{estimateItemWeight(item).toFixed(1)} kg</span>
                </button>
              )
            })}
          </div>
        )}

        <div className="inventory-load-footer">
          <span>Carga</span>
          <strong className={maxCarry && totalWeight > maxCarry ? 'text-red-400' : ''}>{totalWeight.toFixed(1)} kg{maxCarry ? ` / ${maxCarry} kg` : ''}</strong>
        </div>
      </section>

      {showCreate && createPortal(
        <ItemCreateModal onSave={addItem} onClose={() => setShowCreate(false)} />,
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
          onClose={closeDrawer}
          onImageChange={handleDrawerImage}
          imgRef={editImgRef}
        />,
        document.body
      )}
    </>
  )
}

function ItemCreateModal({ onSave, onClose }) {
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [peso, setPeso] = useState('')
  const [cor, setCor] = useState('gray')
  const [imagem, setImagem] = useState(null)
  const [preview, setPreview] = useState(null)
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
        const size = 160
        const canvas = document.createElement('canvas')
        canvas.width = size; canvas.height = size
        const ctx = canvas.getContext('2d')
        const scale = Math.max(size / img.width, size / img.height)
        const w = img.width * scale; const h = img.height * scale
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
        const dataUrl = canvas.toDataURL('image/webp', 0.72)
        setImagem(dataUrl); setPreview(dataUrl)
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function save() {
    onSave({ nome, descricao, imagem, cor, peso: peso === '' ? estimateItemWeight({ nome, descricao }) : Number(peso) })
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm modal-bg" onClick={onClose}>
      <div ref={modalRef} className="codex-card !bg-deep border-primary/25 rounded-xl w-full max-w-md shadow-2xl shadow-black/50 modal-content" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-sep/30 flex items-center justify-between">
          <h3 className="font-cinzel text-primary text-sm">Novo Item</h3>
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
              <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do item"
                className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-xs text-txt-main focus:border-gold/40 focus:outline-none" autoFocus />
              <textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descrição" rows={2}
                className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-[11px] text-txt-main resize-none focus:border-gold/40 focus:outline-none leading-relaxed" />
              <input type="number" step="0.1" value={peso} onChange={e => setPeso(e.target.value)} placeholder="Peso kg (opcional)"
                className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-xs text-txt-main focus:border-gold/40 focus:outline-none" />
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
        </div>
        <div className="px-6 py-3 border-t border-sep/30 flex justify-end gap-2">
          <button onClick={onClose} className="text-txt-dim text-xs hover:text-txt-main px-3 py-1.5 transition-colors">Cancelar</button>
          <button onClick={save} disabled={!nome.trim()}
            className={`text-xs px-4 py-1.5 rounded-lg font-semibold transition-colors ${nome.trim() ? 'bg-gold text-void hover:bg-gold-light' : 'bg-gold/20 text-void/40 cursor-not-allowed'}`}>
            Adicionar
          </button>
        </div>
      </div>
    </div>
  )
}

function ItemDrawer({ item, canEdit, editMode, onEdit, onCancelEdit, onSaveEdit, onDelete, onClose, onImageChange, imgRef }) {
  const [editNome, setEditNome] = useState(item.nome || '')
  const [editDesc, setEditDesc] = useState(item.descricao || '')
  const [editCor, setEditCor] = useState(item.cor || 'gray')
  const [editPeso, setEditPeso] = useState(item.peso ?? '')
  const cc = ITEM_COLORS.find(c => c.id === (item.cor || 'gray')) || ITEM_COLORS[0]

  function handleSave() {
    onSaveEdit({ nome: editNome, descricao: editDesc, cor: editCor, peso: editPeso === '' ? estimateItemWeight({ nome: editNome, descricao: editDesc }) : Number(editPeso) })
    onCancelEdit()
  }

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/40 drawer-overlay" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-[380px] bg-deep border-l border-primary/15 shadow-2xl shadow-black/60 flex flex-col drawer-panel">
        <div className="px-4 py-3 border-b border-sep/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="font-cinzel text-primary text-xs uppercase tracking-wider">Item</h3>
            <div className={`w-2.5 h-2.5 rounded ${cc.cls}`} />
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
              <input type="number" step="0.1" value={editPeso} onChange={e => setEditPeso(e.target.value)} placeholder="Peso kg"
                className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-sm text-txt-main focus:border-gold/40 focus:outline-none" />
            </>
          ) : (
            <>
              {item.imagem && <img src={item.imagem} alt="" className="w-full aspect-[4/3] rounded-lg object-cover border border-sep/30" />}
              <h4 className="text-txt-main text-sm font-semibold">{item.nome || 'Item'}</h4>
              {item.descricao ? <p className="text-txt-dim/80 text-xs leading-relaxed">{item.descricao}</p> : <p className="text-txt-dim/30 text-xs italic">Sem descrição</p>}
              <div className="inventory-drawer-weight"><span>Peso</span><strong>{estimateItemWeight(item).toFixed(1)} kg</strong></div>
            </>
          )}
        </div>

        <div className="px-4 py-3 border-t border-sep/30 flex gap-2 shrink-0">
          {canEdit && !editMode && (
            <>
              <button onClick={onEdit} className="text-[10px] border border-gold/30 text-gold px-3 py-1.5 rounded-lg hover:bg-gold/10 transition-colors">Editar</button>
              <button onClick={onDelete} className="text-[10px] border border-err/30 text-err px-3 py-1.5 rounded-lg hover:bg-err/10 transition-colors">Excluir</button>
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
