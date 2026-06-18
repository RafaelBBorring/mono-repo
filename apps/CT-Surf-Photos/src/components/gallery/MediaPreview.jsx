import React, { useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, ShoppingCart, Camera, Video, User } from 'lucide-react'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { formatPrice } from '../../utils/priceCalculator'
import { useCart } from '../../contexts/CartContext'
import { useToast } from '../ui/Toast'
import { photographers } from '../../data/photographers'

export default function MediaPreview({ media, surfer, allMedia, onClose, onNavigate }) {
  const { addItem, items } = useCart()
  const { addToast } = useToast()
  const inCart = items.find(i => i.id === media.id)
  const currentIndex = allMedia.findIndex(m => m.id === media.id)
  const ph = photographers.find(p => p.id === media.photographerId)

  const goPrev = () => {
    if (currentIndex > 0) {
      const prev = allMedia[currentIndex - 1]
      onNavigate(`preview/${prev.id}`)
    }
  }
  const goNext = () => {
    if (currentIndex < allMedia.length - 1) {
      const next = allMedia[currentIndex + 1]
      onNavigate(`preview/${next.id}`)
    }
  }

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  const handleAdd = () => {
    addItem({
      id: media.id,
      type: media.type,
      surferName: surfer?.name || 'Desconhecido',
      sessionTime: surfer?.sessionTime || '',
      price: media.price,
    })
    addToast(`${media.type === 'photo' ? 'Foto' : 'Video'} adicionado ao carrinho`, 'success')
  }

  const gradientClass = media.type === 'video'
    ? 'from-sunset-600/30 via-sunset-900/20 to-ocean-950'
    : 'from-ocean-600/30 via-ocean-900/20 to-ocean-950'

  return (
    <div className="fixed inset-0 z-50 bg-black/95 animate-fade-in" onContextMenu={e => e.preventDefault()}>
      <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors">
        <X size={22} />
      </button>

      {currentIndex > 0 && (
        <button onClick={goPrev} className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors">
          <ChevronLeft size={24} />
        </button>
      )}
      {currentIndex < allMedia.length - 1 && (
        <button onClick={goNext} className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors">
          <ChevronRight size={24} />
        </button>
      )}

      <div className="h-full flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="relative max-w-4xl w-full aspect-video rounded-2xl overflow-hidden">
          <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass} flex items-center justify-center`}>
            {media.type === 'video' ? <Video size={64} className="text-white/15" /> : <Camera size={64} className="text-white/15" />}
          </div>
          <div className="watermark-grid" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[25deg] text-white/20 font-display font-bold text-3xl tracking-widest select-none pointer-events-none whitespace-nowrap">
            CT-SURF-PHOTOS
          </div>
          {media.type === 'video' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[16px] border-l-white border-b-[10px] border-b-transparent ml-1" />
              </div>
            </div>
          )}
        </div>

        <div className="max-w-4xl w-full mt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant={media.type === 'video' ? 'sunset' : 'ocean'}>
                  {media.type === 'photo' ? 'FOTO' : 'VIDEO'}
                </Badge>
                <span className="font-mono font-bold text-xl text-sand-400">{formatPrice(media.price)}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-400">
                <span className="flex items-center gap-1"><User size={14} /> {surfer?.name}</span>
                <span>Fotografo: {ph?.name}</span>
                <span>{surfer?.sessionTime}</span>
              </div>
            </div>

            <Button
              variant={inCart ? 'ghost' : 'sunset'}
              onClick={handleAdd}
              disabled={!!inCart}
              className="min-w-[200px]"
            >
              <ShoppingCart size={18} className="mr-2" />
              {inCart ? 'No Carrinho' : `Adicionar - ${formatPrice(media.price)}`}
            </Button>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs text-slate-500">{currentIndex + 1} de {allMedia.length}</span>
            <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full bg-ocean-500/50 rounded-full transition-all" style={{ width: `${((currentIndex + 1) / allMedia.length) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
