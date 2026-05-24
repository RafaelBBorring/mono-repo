import { useMemo, useState, useRef, useEffect } from 'react'

const LEGACY_PREVIEW_SIZE = 280
const MAX_PREVIEW_WIDTH = 340
const MAX_PREVIEW_HEIGHT = 260
const MAX_SCALE = 8

function clampAspect(value) {
  const aspect = Number(value) || 1
  return Math.max(0.25, Math.min(4, aspect))
}

function getPreviewSize(maskAspect = 1) {
  const aspect = clampAspect(maskAspect)
  let width = MAX_PREVIEW_WIDTH
  let height = width / aspect
  if (height > MAX_PREVIEW_HEIGHT) {
    height = MAX_PREVIEW_HEIGHT
    width = height * aspect
  }
  return { width: Math.round(width), height: Math.round(height), aspect }
}

function getRotationCoverScale(rotation, width, height) {
  const radians = ((Number(rotation) || 0) * Math.PI) / 180
  const cos = Math.abs(Math.cos(radians))
  const sin = Math.abs(Math.sin(radians))
  const safeWidth = Math.max(1, width)
  const safeHeight = Math.max(1, height)
  return Math.max(
    cos + (safeHeight / safeWidth) * sin,
    cos + (safeWidth / safeHeight) * sin,
    1
  )
}

function toEditorTransform(initialTransform, previewSize) {
  const scale = Number(initialTransform?.scale) || 1
  const rotation = Number(initialTransform?.rotation) || 0
  const legacy = initialTransform && initialTransform.unit !== 'ratio'
  const translateX = Number(initialTransform?.translateX) || 0
  const translateY = Number(initialTransform?.translateY) || 0

  const next = {
    scale,
    rotation,
    translateX: legacy ? (translateX / LEGACY_PREVIEW_SIZE) * previewSize.width : translateX * previewSize.width,
    translateY: legacy ? (translateY / LEGACY_PREVIEW_SIZE) * previewSize.height : translateY * previewSize.height,
  }
  const minScale = getRotationCoverScale(next.rotation, previewSize.width, previewSize.height)
  return { ...next, scale: Math.max(next.scale, minScale) }
}

export default function ImageMaskEditor({ imageSrc, initialTransform, maskAspect = 1, onSave, onClose }) {
  const previewSize = useMemo(() => getPreviewSize(maskAspect), [maskAspect])
  const [transform, setTransform] = useState(() => ({
    ...toEditorTransform(initialTransform, previewSize),
  }))
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [transStart, setTransStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef(null)
  const minScale = getRotationCoverScale(transform.rotation, previewSize.width, previewSize.height)
  const sliderMax = Math.min(MAX_SCALE, Math.max(4, Math.ceil(minScale * 1.6)))

  function clampTransform(next) {
    const nextMin = getRotationCoverScale(next.rotation, previewSize.width, previewSize.height)
    return {
      ...next,
      scale: Math.max(nextMin, Math.min(MAX_SCALE, Number(next.scale) || 1)),
    }
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function handleMouseDown(e) {
    e.preventDefault()
    setDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    setTransStart({ x: transform.translateX, y: transform.translateY })
  }

  function handleMouseMove(e) {
    if (!dragging) return
    const rect = containerRef.current.getBoundingClientRect()
    const dx = (e.clientX - dragStart.x) * (previewSize.width / rect.width)
    const dy = (e.clientY - dragStart.y) * (previewSize.height / rect.height)
    setTransform(prev => ({ ...prev, translateX: transStart.x + dx, translateY: transStart.y + dy }))
  }

  function handleMouseUp() {
    setDragging(false)
  }

  function handleWheel(e) {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.95 : 1.05
    setTransform(prev => clampTransform({ ...prev, scale: prev.scale * delta }))
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
    const t = e.touches[0]
    const dx = (t.clientX - dragStart.x) * (previewSize.width / rect.width)
    const dy = (t.clientY - dragStart.y) * (previewSize.height / rect.height)
    setTransform(prev => ({ ...prev, translateX: transStart.x + dx, translateY: transStart.y + dy }))
  }

  function handleTouchEnd() {
    setDragging(false)
  }

  function rotateLeft() {
    setTransform(prev => clampTransform({ ...prev, rotation: prev.rotation - 90 }))
  }

  function rotateRight() {
    setTransform(prev => clampTransform({ ...prev, rotation: prev.rotation + 90 }))
  }

  function resetTransform() {
    setTransform({ scale: 1, rotation: 0, translateX: 0, translateY: 0 })
  }

  function handleSave() {
    const normalized = {
      unit: 'ratio',
      scale: Math.max(transform.scale, minScale),
      rotation: transform.rotation,
      translateX: transform.translateX / previewSize.width,
      translateY: transform.translateY / previewSize.height,
      maskAspect: previewSize.aspect,
    }
    const hasTransform = normalized.scale !== 1 || normalized.rotation !== 0 || normalized.translateX !== 0 || normalized.translateY !== 0
    onSave(hasTransform ? normalized : null)
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
            style={{ width: previewSize.width, height: previewSize.height, touchAction: 'none' }}
          >
            <img
              src={imageSrc}
              alt=""
              draggable={false}
              style={{
                ...imgStyle,
                width: previewSize.width,
                height: previewSize.height,
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
                min={minScale}
                max={sliderMax}
                step="0.05"
                value={transform.scale}
                onChange={e => setTransform(prev => clampTransform({ ...prev, scale: Number(e.target.value) }))}
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
                onChange={e => setTransform(prev => clampTransform({ ...prev, rotation: Number(e.target.value) }))}
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
