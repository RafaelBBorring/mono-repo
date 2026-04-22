import { useRef, useState, useEffect, useCallback } from 'react'

const AVATAR_SIZE = 256
const MAX_ORIGINAL_SIZE = 800

export default function AvatarCropper({ value, onChange }) {
  const canvasRef = useRef(null)
  const [img, setImg] = useState(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [offsetStart, setOffsetStart] = useState({ x: 0, y: 0 })
  const [hasImage, setHasImage] = useState(false)

  useEffect(() => {
    if (value && !img) {
      const i = new Image()
      i.onload = () => {
        setImg(i)
        setHasImage(true)
        fitImage(i)
      }
      i.src = value
    }
  }, [])

  useEffect(() => {
    if (!img) return
    draw()
    saveAvatar()
  }, [img, offset, scale])

  function fitImage(image) {
    const s = AVATAR_SIZE / Math.min(image.width, image.height)
    setScale(s)
    setOffset({
      x: (AVATAR_SIZE - image.width * s) / 2,
      y: (AVATAR_SIZE - image.height * s) / 2,
    })
  }

  function draw() {
    const canvas = canvasRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')
    canvas.width = AVATAR_SIZE
    canvas.height = AVATAR_SIZE
    ctx.clearRect(0, 0, AVATAR_SIZE, AVATAR_SIZE)
    ctx.save()
    ctx.beginPath()
    ctx.arc(AVATAR_SIZE / 2, AVATAR_SIZE / 2, AVATAR_SIZE / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(img, offset.x, offset.y, img.width * scale, img.height * scale)
    ctx.restore()
    ctx.beginPath()
    ctx.arc(AVATAR_SIZE / 2, AVATAR_SIZE / 2, AVATAR_SIZE / 2 - 2, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(201,168,76,0.5)'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  function loadImage(file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const i = new Image()
      i.onload = () => {
        let w = i.width
        let h = i.height
        if (w > MAX_ORIGINAL_SIZE || h > MAX_ORIGINAL_SIZE) {
          const ratio = Math.min(MAX_ORIGINAL_SIZE / w, MAX_ORIGINAL_SIZE / h)
          const c = document.createElement('canvas')
          c.width = w * ratio
          c.height = h * ratio
          c.getContext('2d').drawImage(i, 0, 0, c.width, c.height)
          const resized = new Image()
          resized.onload = () => {
            setImg(resized)
            setHasImage(true)
            fitImage(resized)
          }
          resized.src = c.toDataURL('image/jpeg', 0.85)
        } else {
          setImg(i)
          setHasImage(true)
          fitImage(i)
        }
      }
      i.src = e.target.result
    }
    reader.readAsDataURL(file)
  }

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (file) loadImage(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    const file = e.dataTransfer?.files?.[0]
    if (file && file.type.startsWith('image/')) loadImage(file)
  }

  function handlePaste(e) {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        loadImage(item.getAsFile())
        break
      }
    }
  }

  useEffect(() => {
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [img])

  function handleMouseDown(e) {
    if (!hasImage) return
    e.preventDefault()
    const rect = canvasRef.current.getBoundingClientRect()
    setDragging(true)
    setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setOffsetStart({ ...offset })
  }

  function handleMouseMove(e) {
    if (!dragging) return
    const rect = canvasRef.current.getBoundingClientRect()
    const displayScale = AVATAR_SIZE / rect.width
    const dx = (e.clientX - rect.left - dragStart.x) * displayScale
    const dy = (e.clientY - rect.top - dragStart.y) * displayScale
    setOffset({ x: offsetStart.x + dx, y: offsetStart.y + dy })
  }

  function handleMouseUp() {
    if (dragging) {
      setDragging(false)
      saveAvatar()
    }
  }

  function handleWheel(e) {
    if (!hasImage) return
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.95 : 1.05
    const newScale = Math.max(0.1, Math.min(10, scale * delta))
    const rect = canvasRef.current.getBoundingClientRect()
    const mx = (e.clientX - rect.left) / rect.width * AVATAR_SIZE
    const my = (e.clientY - rect.top) / rect.height * AVATAR_SIZE
    setOffset(prev => ({
      x: mx - (mx - prev.x) * (newScale / scale),
      y: my - (my - prev.y) * (newScale / scale),
    }))
    setScale(newScale)
    setTimeout(() => saveAvatar(), 50)
  }

  function saveAvatar() {
    if (!img) return
    const outSize = 128
    const c = document.createElement('canvas')
    c.width = outSize
    c.height = outSize
    const ctx = c.getContext('2d')
    const outScale = outSize / AVATAR_SIZE
    ctx.beginPath()
    ctx.arc(outSize / 2, outSize / 2, outSize / 2, 0, Math.PI * 2)
    ctx.clip()
    ctx.drawImage(img, offset.x * outScale, offset.y * outScale, img.width * scale * outScale, img.height * scale * outScale)
    onChange(c.toDataURL('image/webp', 0.7))
  }

  function handleRemove() {
    setImg(null)
    setHasImage(false)
    setOffset({ x: 0, y: 0 })
    setScale(1)
    onChange(null)
  }

  const [touchStart, setTouchStart] = useState(null)

  function handleTouchStart(e) {
    if (!hasImage || e.touches.length !== 1) return
    e.preventDefault()
    const rect = canvasRef.current.getBoundingClientRect()
    const t = e.touches[0]
    setDragging(true)
    setDragStart({ x: t.clientX - rect.left, y: t.clientY - rect.top })
    setOffsetStart({ ...offset })
  }

  function handleTouchMove(e) {
    if (!dragging || e.touches.length !== 1) return
    e.preventDefault()
    const rect = canvasRef.current.getBoundingClientRect()
    const displayScale = AVATAR_SIZE / rect.width
    const t = e.touches[0]
    const dx = (t.clientX - rect.left - dragStart.x) * displayScale
    const dy = (t.clientY - rect.top - dragStart.y) * displayScale
    setOffset({ x: offsetStart.x + dx, y: offsetStart.y + dy })
  }

  function handleTouchEnd() {
    if (dragging) {
      setDragging(false)
      saveAvatar()
    }
  }

  return (
    <div className="space-y-3">
      <div
        className="relative mx-auto rounded-full overflow-hidden border-2 border-gold/40 shadow-lg shadow-gold/10"
        style={{ width: 200, height: 200 }}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
      >
        <canvas
          ref={canvasRef}
          width={AVATAR_SIZE}
          height={AVATAR_SIZE}
          style={{ width: 200, height: 200, cursor: hasImage ? 'grab' : 'default' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
        {!hasImage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-deep/80 pointer-events-none">
            <div className="text-gold text-3xl mb-2">📷</div>
            <p className="text-txt-dim text-xs text-center px-4">Arraste uma imagem,<br />Ctrl+V ou clique abaixo</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-2">
        <label className="cursor-pointer bg-gold/10 border border-gold/30 text-gold px-3 py-1.5 rounded text-xs hover:bg-gold/20 transition-colors">
          Escolher Imagem
          <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
        </label>
        {hasImage && (
          <button onClick={handleRemove} className="text-err text-xs border border-err/30 px-3 py-1.5 rounded hover:bg-err/10 transition-colors">
            Remover
          </button>
        )}
      </div>
      {hasImage && (
        <p className="text-txt-dim text-xs text-center">Arraste para posicionar • Scroll para zoom</p>
      )}
    </div>
  )
}
