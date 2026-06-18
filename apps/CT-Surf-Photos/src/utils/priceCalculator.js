export const PRICES = { photo: 15, video: 25, package: 89.90 }

export function formatPrice(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function calculateDiscount(subtotal, couponData) {
  if (!couponData) return { discountAmount: 0, total: subtotal }
  let discountAmount = 0
  if (couponData.type === 'percent') discountAmount = subtotal * (couponData.value / 100)
  else discountAmount = Math.min(couponData.value, subtotal)
  return { discountAmount, total: Math.max(0, subtotal - discountAmount) }
}
