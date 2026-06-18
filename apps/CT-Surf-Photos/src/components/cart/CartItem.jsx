import React from 'react'
import { Trash2, Camera, Video } from 'lucide-react'
import Badge from '../ui/Badge'
import { formatPrice } from '../../utils/priceCalculator'
import { useCart } from '../../contexts/CartContext'

export default function CartItem({ item }) {
  const { removeItem } = useCart()
  const gradientClass = item.type === 'video'
    ? 'from-sunset-500/30 to-sunset-800/10'
    : 'from-ocean-500/30 to-ocean-800/10'

  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/[0.04] last:border-0">
      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${gradientClass} flex items-center justify-center flex-shrink-0`}>
        {item.type === 'video' ? <Video size={16} className="text-sunset-300" /> : <Camera size={16} className="text-ocean-300" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant={item.type === 'video' ? 'sunset' : 'ocean'}>{item.type === 'video' ? 'VIDEO' : 'FOTO'}</Badge>
        </div>
        <p className="text-sm text-slate-300 truncate mt-1">{item.surferName}</p>
        <p className="text-xs text-slate-500">{item.sessionTime}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <span className="font-mono font-semibold text-sand-400">{formatPrice(item.price)}</span>
        <button onClick={() => removeItem(item.id)} className="block ml-auto mt-1 p-1 rounded hover:bg-white/5 text-slate-600 hover:text-rose-400 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}
