import React from 'react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import { Camera, Video, Plus, Eye } from 'lucide-react'
import { formatPrice } from '../../utils/priceCalculator'
import { useCart } from '../../contexts/CartContext'
import { useToast } from '../ui/Toast'

const mediaColors = {
  photo: 'from-ocean-500/40 to-ocean-800/20',
  video: 'from-sunset-500/40 to-sunset-800/20',
}

export default function MediaCard({ media, surferName, sessionTime, onPreview }) {
  const { addItem, items } = useCart()
  const { addToast } = useToast()
  const inCart = items.find(i => i.id === media.id)

  const handleAdd = (e) => {
    e.stopPropagation()
    addItem({ id: media.id, type: media.type, surferName, sessionTime, price: media.price })
    addToast(`${media.type === 'photo' ? 'Foto' : 'Video'} adicionado ao carrinho`, 'success')
  }

  return (
    <Card onClick={() => onPreview(media)} className="overflow-hidden group relative">
      <div className={`aspect-square bg-gradient-to-br ${mediaColors[media.type]} relative flex items-center justify-center border-b border-white/[0.06]`}>
        {media.type === 'video' ? <Video size={32} className="text-white/20" /> : <Camera size={32} className="text-white/20" />}
        <div className="absolute top-2 left-2">
          <Badge variant={media.type === 'video' ? 'sunset' : 'ocean'}>{media.type === 'photo' ? 'FOTO' : 'VIDEO'}</Badge>
        </div>
        <div className="absolute bottom-2 right-2">
          <span className="font-mono font-semibold text-sm text-white bg-black/40 backdrop-blur-sm px-2 py-1 rounded-lg">{formatPrice(media.price)}</span>
        </div>
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button onClick={handleAdd} className={`p-3 rounded-xl backdrop-blur transition-transform hover:scale-110 ${inCart ? 'bg-emerald-500/30 text-emerald-300' : 'bg-white/20 text-white'}`}>
            {inCart ? <Eye size={18} /> : <Plus size={18} />}
          </button>
        </div>
      </div>
    </Card>
  )
}
