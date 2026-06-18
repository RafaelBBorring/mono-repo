import React from 'react'
import { X, ShoppingBag } from 'lucide-react'
import { useCart } from '../../contexts/CartContext'
import CartItem from './CartItem'
import CouponInput from './CouponInput'
import CheckoutSummary from './CheckoutSummary'

export default function CartSidebar({ isOpen, onClose, onNavigate }) {
  const { items, subtotal, discountAmount, total } = useCart()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
      <div
        className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-[#111827] border-l border-white/[0.06] shadow-2xl animate-slide-in-right flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-display font-bold text-white">Seu Carrinho</h2>
            {items.length > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold bg-ocean-500/20 text-ocean-400 rounded-full">{items.length}</span>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
            <div className="w-20 h-20 rounded-2xl bg-white/[0.03] flex items-center justify-center">
              <ShoppingBag size={36} className="text-slate-600" />
            </div>
            <p className="text-slate-500 text-center">Seu carrinho esta vazio</p>
            <button onClick={() => { onClose(); onNavigate('sessions/2025-06-10') }} className="text-ocean-400 text-sm font-medium hover:text-ocean-300 transition-colors">
              Explorar sessoes
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-1">
              {items.map(item => (
                <CartItem key={item.id} item={item} />
              ))}
            </div>
            <div className="border-t border-white/[0.06] p-5 space-y-4">
              <CouponInput />
              <CheckoutSummary onNavigate={onNavigate} onClose={onClose} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
