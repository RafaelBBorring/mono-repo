import React, { useCallback, useEffect, useRef, useState } from 'react'
import Modal from './Modal.jsx'
import { Button } from './Button.jsx'

const DEFAULT = { dataUrl: null, x: 50, y: 50, scale: 1 }

export default function IconPickerModal({ open, onClose, value, onConfirm, title = 'Definir ícone' }) {
  const [draft, setDraft] = useState({ ...DEFAULT, ...(value || {}) })
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => { if (open) setDraft({ ...DEFAULT, ...(value || {}) }) }, [open, value])

  const readFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => setDraft(d => ({ ...DEFAULT, dataUrl: reader.result }))
    reader.readAsDataURL(file)
  }, [])

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files?.[0]; if (f) readFile(f)
  }
  const onPaste = useCallback((e) => {
    const items = e.clipboardData?.items; if (!items) return
    for (const it of items) {
      if (it.type.startsWith('image/')) { const f = it.getAsFile(); if (f) { readFile(f); break } }
    }
  }, [readFile])

  useEffect(() => {
    if (!open) return
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [open, onPaste])

  const confirm = () => { onConfirm?.(draft); onClose?.() }

  const boxStyle = {
    width: '100%', maxWidth: 300, aspectRatio: '1 / 1', borderRadius: 22,
    position: 'relative', overflow: 'hidden', cursor: draft.dataUrl ? 'default' : 'pointer',
    border: dragOver ? '2px dashed rgba(224,173,51,0.8)' : '1px solid rgba(224,173,51,0.3)',
    background: 'radial-gradient(circle at 50% 30%, #1c1812, #0a0806)',
    boxShadow: '0 0 0 5px rgba(5,4,3,0.6), 0 0 36px rgba(224,173,51,0.12)',
    transition: 'border-color .25s'
  }

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        {draft.dataUrl && <Button variant="danger" onClick={() => setDraft({ ...DEFAULT, dataUrl: null })}><i className="bi bi-trash me-2" />Limpar</Button>}
        <Button onClick={confirm} disabled={!draft.dataUrl}><i className="bi bi-check-lg me-2" />Confirmar</Button>
      </>}>
      <div className="d-flex flex-column align-items-center gap-3">
        <div
          style={boxStyle}
          onClick={() => !draft.dataUrl && fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={dragOver ? 'card-sheen' : ''}
        >
          {draft.dataUrl ? (
            <img src={draft.dataUrl} alt="ícone" draggable={false}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${draft.x}% ${draft.y}%`, transform: `scale(${draft.scale})`, transformOrigin: 'center', imageRendering: 'auto' }} />
          ) : (
            <div className="d-flex flex-column align-items-center justify-content-center h-100 text-center px-3">
              <i className="bi bi-cloud-arrow-up text-gold" style={{ fontSize: '2.4rem' }} />
              <div className="mt-2" style={{ fontSize: '1rem', color: 'var(--drako-gold-soft)' }}>Arraste uma imagem</div>
              <div className="text-muted-drako" style={{ fontSize: '0.85rem' }}>ou clique aqui, ou cole <span className="kbd">Ctrl+V</span></div>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => readFile(e.target.files?.[0])} />

        {draft.dataUrl && (
          <div className="w-100 glass glass-tight p-3">
            <div className="label-drako">Posição</div>
            <div className="d-flex gap-2 mb-2">
              <input type="range" min={0} max={100} value={draft.x} onChange={(e) => setDraft(d => ({ ...d, x: Number(e.target.value) }))} style={{ flex: 1 }} />
              <input type="range" min={0} max={100} value={draft.y} onChange={(e) => setDraft(d => ({ ...d, y: Number(e.target.value) }))} style={{ flex: 1 }} />
            </div>
            <div className="label-drako">Zoom</div>
            <input type="range" min={1} max={3} step={0.05} value={draft.scale} onChange={(e) => setDraft(d => ({ ...d, scale: Number(e.target.value) }))} style={{ width: '100%' }} />
          </div>
        )}
      </div>
    </Modal>
  )
}
