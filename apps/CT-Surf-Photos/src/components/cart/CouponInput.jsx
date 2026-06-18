import React, { useState } from 'react'
import { Tag, Check, X } from 'lucide-react'
import { useCart } from '../../contexts/CartContext'

export default function CouponInput() {
  const { applyCoupon, removeCoupon, couponApplied, couponData, couponError, clearError } = useCart()
  const [code, setCode] = useState('')

  const handleApply = () => {
    if (code.trim()) {
      applyCoupon(code.trim())
      setCode('')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleApply()
    if (couponError) clearError()
  }

  if (couponApplied && couponData) {
    return (
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <div className="flex items-center gap-2">
          <Check size={14} className="text-emerald-400" />
          <span className="text-sm text-emerald-300 font-medium">{couponData.label}</span>
        </div>
        <button onClick={removeCoupon} className="p-1 rounded hover:bg-white/10 text-emerald-400/60 hover:text-emerald-400">
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); if (couponError) clearError() }}
            onKeyDown={handleKeyPress}
            placeholder="Codigo do cupom"
            className={`w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border text-sm text-white placeholder:text-slate-600 focus:outline-none transition-colors ${couponError ? 'border-rose-500/50 animate-[shake_0.3s_ease-in-out]' : 'border-white/[0.06] focus:border-ocean-500/50'}`}
          />
        </div>
        <button onClick={handleApply} disabled={!code.trim()} className="px-4 py-2 rounded-lg bg-white/[0.06] text-sm font-medium text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
          Aplicar
        </button>
      </div>
      {couponError && <p className="text-xs text-rose-400">Cupom invalido</p>}
    </div>
  )
}
