import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ITEM_COLORS } from '../data/colors'

export default function InventorySection({ items = [], canEdit, onUpdate, onDrawerToggle }) {
  const [showCreate, setShowCreate] = useState(false)
  const [viewIdx, setViewIdx] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const editImgRef = useRef(null)

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
        updateItem(viewIdx, { imagem: canvas.toDataURL('image/webp', 0.7) })
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const viewing = viewIdx !== null ? items[viewIdx] : null

  return (
    <>
      <section>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-4 rounded-full bg-green-400" />
          <span className="text-txt-dim text-[11px]">🎒</span>
          <h3 className="font-cinzel text-txt-main text-xs uppercase tracking-[0.15em]">Inventário</h3>
          <div className="flex-1 h-px bg-gradient-to-r from-sep/60 to-transparent" />
          {canEdit && (
            <button onClick={() => setShowCreate(true)}
              className="text-[9px] border border-gold/30 text-gold/70 px-2 py-0.5 rounded hover:bg-gold/10 hover:text-gold transition-colors shrink-0">
              + Item
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <p className="text-txt-dim/50 text-[11px] italic">Inventário vazio</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {items.map((item, idx) => {
              const cc = ITEM_COLORS.find(c => c.id === (item.cor || 'gray')) || ITEM_COLORS[0]
              return (
                <button key={item.id || idx} type="button" onClick={() => openDrawer(idx)}
                  className={`rounded-lg border p-2 text-center hover:brightness-110 transition-all ${cc.cls}`}>
                  <div className="flex justify-center mb-1.5">
                    {item.imagem ? (
                      <img src={item.imagem} alt="" className="w-14 h-14 rounded-lg object-cover border border-sep/30" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-panel/30 flex items-center justify-center border border-sep/20">
                        <span className="text-2xl opacity-40">📦</span>
                      </div>
                    )}
                  </div>
                  <span className="text-txt-main text-[10px] font-semibold leading-tight block line-clamp-2">{item.nome || 'Item'}</span>
                </button>
              )
            })}
          </div>
        )}
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
  const [cor, setCor] = useState('gray')
  const [imagem, setImagem] = useState(null)
  const [preview, setPreview] = useState(null)
  const fileRef = useRef(null)
  const modalRef = useRef(null)

  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [])

  function handleImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
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
    e.target.value = ''
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm modal-bg" onClick={onClose}>
      <div ref={modalRef} className="bg-deep border border-gold/25 rounded-xl w-full max-w-md shadow-2xl shadow-black/50 modal-content" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-sep/30 flex items-center justify-between">
          <h3 className="font-cinzel text-gold text-sm">Novo Item</h3>
          <button onClick={onClose} className="text-txt-dim hover:text-err text-sm transition-colors">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <button onClick={() => fileRef.current?.click()}
              className="w-20 h-20 rounded-lg border-2 border-dashed border-sep/50 flex flex-col items-center justify-center hover:border-gold/40 transition-colors shrink-0 bg-void/50 group overflow-hidden">
              {preview ? (
                <img src={preview} alt="" className="w-full h-full rounded-lg object-cover" />
              ) : (
                <>
                  <span className="text-txt-dim/40 text-lg group-hover:text-gold/50 transition-colors">📷</span>
                  <span className="text-txt-dim/30 text-[8px] mt-0.5">Imagem</span>
                </>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
            <div className="flex-1 space-y-2">
              <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do item"
                className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-xs text-txt-main focus:border-gold/40 focus:outline-none placeholder:text-txt-dim/30" autoFocus />
              <textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descrição (opcional)" rows={2}
                className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-[11px] text-txt-main resize-none focus:border-gold/40 focus:outline-none placeholder:text-txt-dim/30 leading-relaxed" />
            </div>
          </div>
          <div>
            <label className="text-txt-dim/50 text-[9px] uppercase tracking-wider">Cor do item</label>
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
        </div>
        <div className="px-6 py-3 border-t border-sep/30 flex justify-end gap-2">
          <button onClick={onClose} className="text-txt-dim text-xs hover:text-txt-main px-3 py-1.5 transition-colors">Cancelar</button>
          <button onClick={() => onSave({ nome, descricao, imagem, cor })} disabled={!nome.trim()}
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

  function handleSave() {
    onSaveEdit({ nome: editNome, descricao: editDesc, cor: editCor })
    onCancelEdit()
  }

  const cc = ITEM_COLORS.find(c => c.id === (item.cor || 'gray')) || ITEM_COLORS[0]

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/40 drawer-overlay" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-[360px] bg-deep border-l border-gold/15 shadow-2xl shadow-black/60 flex flex-col drawer-panel">
        <div className="px-4 py-3 border-b border-sep/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="font-cinzel text-gold text-xs uppercase tracking-wider">Item</h3>
            <div className={`w-2.5 h-2.5 rounded ${cc.cls}`} />
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
              <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Descrição" rows={4}
                className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-xs text-txt-main resize-none focus:border-gold/40 focus:outline-none leading-relaxed" />
              <div>
                <label className="text-txt-dim/50 text-[9px] uppercase tracking-wider">Cor</label>
                <div className="flex gap-1.5 mt-1.5">
                  {ITEM_COLORS.map(c => {
                    const bgMap = { gray: 'bg-gray-400', red: 'bg-red-500', orange: 'bg-orange-500', amber: 'bg-amber-400', emerald: 'bg-emerald-500', sky: 'bg-sky-500', purple: 'bg-purple-500', pink: 'bg-pink-500' }
                    return (
                      <button key={c.id} onClick={() => setEditCor(c.id)} title={c.label}
                        className={`w-5 h-5 rounded-full border-2 transition-all ${editCor === c.id ? 'scale-110 border-gold/70' : 'border-black/30 hover:scale-105'} ${bgMap[c.id]}`} />
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              {item.imagem && (
                <div className="flex justify-center">
                  <img src={item.imagem} alt="" className="w-28 h-28 rounded-lg object-cover border border-sep/30" />
                </div>
              )}
              <div>
                <h4 className="text-txt-main text-sm font-semibold">{item.nome || 'Item'}</h4>
              </div>
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
