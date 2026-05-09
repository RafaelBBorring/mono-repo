import { useState, useRef } from 'react'
import { uploadGrimorioImage } from '../services/uploadService'

export default function ImageUploadField({ value, onChange, uploading, onUploadError }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  async function handleFile(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) { onUploadError?.('Selecione uma imagem.'); return }
    if (file.size > 5 * 1024 * 1024) { onUploadError?.('Maximo 5MB.'); return }
    try {
      const url = await uploadGrimorioImage(file, crypto.randomUUID())
      onChange(url)
    } catch (err) {
      onUploadError?.(err.message || 'Erro no upload.')
    }
  }

  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) handleFile(file)
  }

  function onPaste(e) {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) { handleFile(file); break }
      }
    }
  }

  return (
    <div className="space-y-2">
      {value && (
        <div className="w-24 h-30 rounded-lg border border-sep/20 bg-void/50 overflow-hidden mx-auto">
          <img src={value} alt="Preview" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none' }} />
        </div>
      )}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onPaste={onPaste}
        tabIndex={0}
        role="button"
        onClick={() => inputRef.current?.click()}
        className={`w-full py-3 rounded-lg border-2 border-dashed text-center cursor-pointer transition-all duration-200 ${
          dragOver ? 'border-gold/40 bg-gold/5' : 'border-sep/15 hover:border-sep/30 hover:bg-white/[0.02]'
        }`}>
        {uploading ? (
          <span className="text-gold/60 text-xs animate-pulse">Enviando...</span>
        ) : (
          <span className="text-txt-dim/40 text-xs">Arraste, cole ou clique para enviar</span>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      <div className="text-center">
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder="Ou cole uma URL..."
          className="w-full bg-void border border-sep rounded-lg px-3 py-1.5 text-[11px] text-txt-main focus:border-gold/40 outline-none" />
      </div>
    </div>
  )
}
