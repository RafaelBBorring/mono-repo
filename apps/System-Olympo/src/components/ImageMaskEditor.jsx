import { useState, useRef, useEffect, useCallback } from 'react'

const PREVIEW_SIZE = 280

export default function ImageMaskEditor({ imageSrc, initialTransform, onSave, onClose }) {
  const [transform, setTransform] = useState(() => ({
    scale: initialTransform?.scale ?? 1,
    rotation: initialTransform?.rotation ?? 0,
    translateX: initialTransform?.translateX ?? 0,
    translateY: initialTransform?.translateY ?? 0,
  }))
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [transStart, setTransStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef(null)

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function handleMouseDown(e) {
    e.preventDefault()
    const rect = containerRef.current.getBoundingClientRect()
    setDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    setTransStart({ x: transform.translateX, y: transform.translateY })
  }

  function handleMouseMove(e) {
    if (!dragging) return
    const rect = containerRef.current.getBoundingClientRect()
    const displayScale = PREVIEW_SIZE / rect.width
    const dx = (e.clientX - dragStart.x) * displayScale
    const dy = (e.clientY - dragStart.y) * displayScale
    setTransform(prev => ({ ...prev, translateX: transStart.x + dx, translateY: transStart.y + dy }))
  }

  function handleMouseUp() {
    setDragging(false)
  }

  function handleWheel(e) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.95 : 1.05
    setTransform(prev => ({ ...prev, scale: Math.max(0.1, Math.min(10, prev.scale * delta)) }))
  }

  function handleTouchStart(e) {
    if (e.touches.length !== 1) return
    e.preventDefault()
    const t = e.touches[0]
    setDragging(true)
    setDragStart({ x: t.clientX, y: t.clientY })
    setTransStart({ x: transform.translateX, y: transform.translateY })
  }

  function handleTouchMove(e) {
    if (!dragging || e.touches.length !== 1) return
    e.preventDefault()
    const rect = containerRef.current.getBoundingClientRect()
    const displayScale = PREVIEW_SIZE / rect.width
    const t = e.touches[0]
    const dx = (t.clientX - dragStart.x) * displayScale
    const dy = (t.clientY - dragStart.y) * displayScale
    setTransform(prev => ({ ...prev, translateX: transStart.x + dx, translateY: transStart.y + dy }))
  }

  function handleTouchEnd() {
    setDragging(false)
  }

  function rotateLeft() {
    setTransform(prev => ({ ...prev, rotation: prev.rotation - 90 }))
  }

  function rotateRight() {
    setTransform(prev => ({ ...prev, rotation: prev.rotation + 90 }))
  }

  function resetTransform() {
    setTransform({ scale: 1, rotation: 0, translateX: 0, translateY: 0 })
  }

  function handleSave() {
    const hasTransform = transform.scale !== 1 || transform.rotation !== 0 || transform.translateX !== 0 || transform.translateY !== 0
    onSave(hasTransform ? transform : null)
  }

  const imgStyle = {
    transform: `translate(${transform.translateX}px, ${transform.translateY}px) rotate(${transform.rotation}deg) scale(${transform.scale})`,
    transformOrigin: 'center center',
    maxWidth: 'none',
    maxHeight: 'none',
  }

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-deep border border-gold/20 rounded-xl shadow-2xl shadow-black/60 w-full max-w-[400px] flex flex-col modal-content">
        <div className="px-4 py-3 border-b border-sep/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-gold text-sm">tune</span>
            <h3 className="font-cinzel text-gold text-xs uppercase tracking-wider">Ajustar Imagem</h3>
          </div>
          <button onClick={onClose} className="text-txt-dim hover:text-err text-sm transition-colors">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div
            ref={containerRef}
            className="mx-auto rounded-lg border-2 border-gold/30 overflow-hidden bg-void/70"
            style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
          >
            <img
              src={imageSrc}
              alt=""
              draggable={false}
              style={{
                ...imgStyle,
                width: PREVIEW_SIZE,
                height: PREVIEW_SIZE,
                objectFit: 'cover',
                cursor: dragging ? 'grabbing' : 'grab',
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />
          </div>

          <p className="text-txt-dim/60 text-[10px] text-center">Arraste para mover · Scroll para zoom</p>

          <div className="grid grid-cols-3 gap-2">
            <button onClick={rotateLeft} className="flex items-center justify-center gap-1.5 bg-void/50 border border-sep/30 rounded-lg px-3 py-2 text-xs text-txt-dim hover:border-gold/30 hover:text-gold transition-colors">
              <span className="material-symbols-outlined text-[14px]">rotate_left</span>
              -90°
            </button>
            <button onClick={rotateRight} className="flex items-center justify-center gap-1.5 bg-void/50 border border-sep/30 rounded-lg px-3 py-2 text-xs text-txt-dim hover:border-gold/30 hover:text-gold transition-colors">
              <span className="material-symbols-outlined text-[14px]">rotate_right</span>
              +90°
            </button>
            <button onClick={resetTransform} className="flex items-center justify-center gap-1.5 bg-void/50 border border-sep/30 rounded-lg px-3 py-2 text-xs text-txt-dim hover:border-err/30 hover:text-err transition-colors">
              <span className="material-symbols-outlined text-[14px]">restart_alt</span>
              Reset
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-txt-dim/60 text-[10px] uppercase w-12 shrink-0">Zoom</span>
              <input
                type="range"
                min="0.2"
                max="4"
                step="0.05"
                value={transform.scale}
                onChange={e => setTransform(prev => ({ ...prev, scale: Number(e.target.value) }))}
                className="flex-1 accent-gold"
              />
              <span className="text-txt-dim text-[10px] font-mono w-10 text-right">{transform.scale.toFixed(2)}x</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-txt-dim/60 text-[10px] uppercase w-12 shrink-0">Angulo</span>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={transform.rotation}
                onChange={e => setTransform(prev => ({ ...prev, rotation: Number(e.target.value) }))}
                className="flex-1 accent-gold"
              />
              <span className="text-txt-dim text-[10px] font-mono w-10 text-right">{transform.rotation}°</span>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-sep/30 flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="text-[10px] text-txt-dim hover:text-txt-main px-4 py-2 transition-colors">Cancelar</button>
          <button onClick={handleSave} className="text-[10px] bg-gold text-void px-4 py-2 rounded-lg hover:bg-gold-light transition-colors font-semibold">Salvar</button>
        </div>
      </div>
    </div>
  )
}
