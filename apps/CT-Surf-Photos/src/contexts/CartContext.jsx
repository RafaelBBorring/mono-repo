import React, { createContext, useContext, useReducer, useEffect } from 'react'

const CartContext = createContext(null)

const COUPONS = {
  SURF10: { type: 'percent', value: 10, label: '10% OFF' },
  WAVE20: { type: 'fixed', value: 20, label: 'R$ 20 OFF' },
  FIRST50: { type: 'percent', value: 50, label: '50% OFF' },
}

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      if (state.items.find(i => i.id === action.payload.id)) return state
      return { ...state, items: [...state.items, action.payload] }
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(i => i.id !== action.payload) }
    case 'CLEAR_CART':
      return { ...state, items: [], couponCode: null, discount: 0, couponApplied: false }
    case 'APPLY_COUPON': {
      const coupon = COUPONS[action.payload.toUpperCase()]
      if (!coupon) return { ...state, couponError: true }
      return { ...state, couponCode: action.payload.toUpperCase(), couponApplied: true, couponError: false, couponData: coupon }
    }
    case 'REMOVE_COUPON':
      return { ...state, couponCode: null, couponApplied: false, discount: 0, couponData: null, couponError: false }
    case 'CLEAR_ERROR':
      return { ...state, couponError: false }
    default:
      return state
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], couponCode: null, discount: 0, couponApplied: false, couponError: false, couponData: null }, () => {
    try {
      const saved = localStorage.getItem('ct-surf-cart')
      return saved ? JSON.parse(saved) : { items: [], couponCode: null, discount: 0, couponApplied: false, couponError: false, couponData: null }
    } catch { return { items: [], couponCode: null, discount: 0, couponApplied: false, couponError: false, couponData: null } }
  })

  useEffect(() => {
    localStorage.setItem('ct-surf-cart', JSON.stringify({ ...state, couponError: false }))
  }, [state.items, state.couponCode, state.couponApplied, state.couponData])

  const subtotal = state.items.reduce((sum, i) => sum + i.price, 0)
  let discountAmount = 0
  if (state.couponApplied && state.couponData) {
    if (state.couponData.type === 'percent') discountAmount = subtotal * (state.couponData.value / 100)
    else discountAmount = Math.min(state.couponData.value, subtotal)
  }
  const total = Math.max(0, subtotal - discountAmount)

  const addItem = (item) => dispatch({ type: 'ADD_ITEM', payload: item })
  const removeItem = (id) => dispatch({ type: 'REMOVE_ITEM', payload: id })
  const clearCart = () => dispatch({ type: 'CLEAR_CART' })
  const applyCoupon = (code) => dispatch({ type: 'APPLY_COUPON', payload: code })
  const removeCoupon = () => dispatch({ type: 'REMOVE_COUPON' })
  const clearError = () => dispatch({ type: 'CLEAR_ERROR' })

  return (
    <CartContext.Provider value={{ ...state, subtotal, discountAmount, total, addItem, removeItem, clearCart, applyCoupon, removeCoupon, clearError }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be inside CartProvider')
  return ctx
}
