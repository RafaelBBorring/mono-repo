import React, { useState } from 'react'
import { formatPrice } from '../../utils/priceCalculator'
import { useCart } from '../../contexts/CartContext'
import { useToast } from '../ui/Toast'

export default function CheckoutSummary({ onNavigate, onClose }) {
  const { subtotal, discountAmount, total, clearCart, items } = useCart()
  const { addToast } = useToast()
  const [processing, setProcessing] = useState(false)

  const handleCheckout = () => {
    setProcessing(true)
    setTimeout(() => {
      clearCart()
      setProcessing(false)
      onClose()
      addToast('Compra simulada com sucesso! Obrigado.', 'success')
      onNavigate('')
    }, 1500)
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">Subtotal ({items.length} {items.length === 1 ? 'item' : 'itens'})</span>
        <span className="font-mono text-slate-300">{formatPrice(subtotal)}</span>
      </div>
      {discountAmount > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-emerald-400">Desconto</span>
          <span className="font-mono text-emerald-400">-{formatPrice(discountAmount)}</span>
        </div>
      )}
      <div className="h-px bg-white/[0.06]" />
      <div className="flex justify-between">
        <span className="font-display font-bold text-white">Total</span>
        <span className="font-mono font-bold text-lg text-sand-400">{formatPrice(total)}</span>
      </div>
      <button
        onClick={handleCheckout}
        disabled={processing || items.length === 0}
        className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-sunset-500 to-sunset-600 hover:shadow-lg hover:shadow-sunset-500/30 hover:-translate-y-0.5 active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
      >
        {processing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Processando...
          </span>
        ) : (
          `Finalizar Compra - ${formatPrice(total)}`
        )}
      </button>
    </div>
  )
}
