import { useState, useRef } from 'react'

export default function InventorySection({ items = [], canEdit, onUpdate }) {
  const [adding, setAdding] = useState(false)
  const [editingIdx, setEditingIdx] = useState(null)
  const fileRef = useRef(null)

  if (!canEdit && items.length === 0) return null

  function addItem(item) {
    onUpdate([...items, { id: Date.now(), nome: '', descricao: '', imagem: null, ...item }])
    setAdding(false)
  }

  function updateItem(idx, patch) {
    const next = [...items]
    next[idx] = { ...next[idx], ...patch }
    onUpdate(next)
  }

  function removeItem(idx) {
    onUpdate(items.filter((_, i) => i !== idx))
    if (editingIdx === idx) setEditingIdx(null)
  }

  function handleImage(e, idx) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const size = 64
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        const scale = Math.max(size / img.width, size / img.height)
        const w = img.width * scale
        const h = img.height * scale
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
        const dataUrl = canvas.toDataURL('image/webp', 0.6)
        updateItem(idx, { imagem: dataUrl })
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-cinzel text-green-400 text-sm uppercase tracking-wider border-b border-green-400/20 pb-1">🎒 Inventário</h3>
        {canEdit && (
          <button onClick={() => { setAdding(true); setEditingIdx(null) }}
            className="text-[10px] border border-gold/40 text-gold px-2 py-1 rounded hover:bg-gold hover:text-void transition-colors">
            + Item
          </button>
        )}
      </div>

      {adding && canEdit && (
        <NewItemForm onSave={addItem} onCancel={() => setAdding(false)} />
      )}

      {items.length === 0 && !adding ? (
        <p className="text-txt-dim text-xs">Inventário vazio</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {items.map((item, idx) => (
            <div key={item.id || idx}
              className={`bg-void border rounded overflow-hidden transition-colors ${
                editingIdx === idx ? 'border-gold/60' : 'border-sep hover:border-sep/80'
              }`}>
              {editingIdx === idx && canEdit ? (
                <EditItemForm item={item} onSave={(patch) => { updateItem(idx, patch); setEditingIdx(null) }}
                  onCancel={() => setEditingIdx(null)} onImage={e => handleImage(e, idx)} />
              ) : (
                <div className="p-2">
                  <div className="flex items-center gap-2 mb-1">
                    {item.imagem ? (
                      <img src={item.imagem} alt="" className="w-8 h-8 rounded object-cover shrink-0 border border-sep/50" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-panel flex items-center justify-center text-txt-dim text-xs shrink-0">📦</div>
                    )}
                    <span className="text-txt-main text-xs font-semibold truncate">{item.nome || 'Item'}</span>
                  </div>
                  {item.descricao && (
                    <p className="text-txt-dim text-[10px] line-clamp-2">{item.descricao}</p>
                  )}
                  {canEdit && (
                    <div className="flex gap-1 mt-1.5">
                      <button onClick={() => { setEditingIdx(idx); setAdding(false) }}
                        className="text-[10px] text-gold border border-gold/30 px-1.5 py-0.5 rounded hover:bg-gold/10">Editar</button>
                      <button onClick={() => removeItem(idx)}
                        className="text-[10px] text-err border border-err/30 px-1.5 py-0.5 rounded hover:bg-err/10">Excluir</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function NewItemForm({ onSave, onCancel }) {
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')

  return (
    <div className="bg-void border border-gold/30 rounded p-3 mb-2 space-y-2">
      <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do item"
        className="w-full bg-deep border border-sep rounded px-2 py-1 text-xs text-txt-main" autoFocus />
      <textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descrição (opcional)" rows={2}
        className="w-full bg-deep border border-sep rounded px-2 py-1 text-[11px] text-txt-main resize-none" />
      <div className="flex gap-2">
        <button onClick={() => onSave({ nome, descricao })} disabled={!nome.trim()}
          className={`text-xs px-3 py-1 rounded font-semibold ${nome.trim() ? 'bg-gold text-void hover:bg-gold-light' : 'bg-gold/30 text-void/50 cursor-not-allowed'}`}>
          Adicionar
        </button>
        <button onClick={onCancel} className="text-xs text-txt-dim hover:text-txt-main px-2 py-1">Cancelar</button>
      </div>
    </div>
  )
}

function EditItemForm({ item, onSave, onCancel, onImage }) {
  const [nome, setNome] = useState(item.nome || '')
  const [descricao, setDescricao] = useState(item.descricao || '')

  return (
    <div className="p-2 space-y-1.5">
      <div className="flex items-center gap-2">
        {item.imagem ? (
          <img src={item.imagem} alt="" className="w-8 h-8 rounded object-cover shrink-0 border border-sep/50" />
        ) : (
          <button onClick={onImage} className="w-8 h-8 rounded bg-panel flex items-center justify-center text-txt-dim text-xs shrink-0 hover:bg-sep transition-colors">+</button>
        )}
        <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome"
          className="flex-1 bg-deep border border-sep rounded px-2 py-1 text-xs text-txt-main" autoFocus />
      </div>
      <textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descrição" rows={2}
        className="w-full bg-deep border border-sep rounded px-2 py-1 text-[11px] text-txt-main resize-none" />
      <div className="flex gap-1.5 items-center">
        <button onClick={() => onSave({ nome, descricao })} className="text-[10px] bg-gold text-void px-2 py-1 rounded hover:bg-gold-light">OK</button>
        <button onClick={onCancel} className="text-[10px] text-txt-dim hover:text-txt-main px-1">Cancelar</button>
        <button onClick={onImage} className="text-[10px] text-gold border border-gold/30 px-1.5 py-0.5 rounded hover:bg-gold/10 ml-auto">📷 Img</button>
      </div>
    </div>
  )
}
