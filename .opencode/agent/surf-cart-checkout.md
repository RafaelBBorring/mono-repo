---
description: "Agente de Carrinho e Checkout — CT-Surf-Photos. Implementa carrinho, cupons, precificacao e fluxo de checkout."
mode: subagent
permission:
  edit: allow
  bash: allow
---

# Agente de Carrinho e Checkout — CT-Surf-Photos

Voce implementa toda a experiencia de compra.

## Componentes (src/components/cart/)

### CartSidebar.jsx
- Sidebar deslizante pela direita com backdrop blur
- Header: "Seu Carrinho" + contador de itens
- Lista de CartItems
- Footer: subtotal + botao checkout
- Animacao slide-in com spring

### CartItem.jsx
- Thumbnail + tipo badge + nome surfista + data
- Preco unitario
- Botao remover com confirmacao
- Quantidade (se aplicavel)

### CouponInput.jsx
- Input com botao "Aplicar"
- Feedback visual: sucesso (verde) ou invalido (vermelho)
- Badge mostrando desconto aplicado
- Animacao de shake se invalido

### CheckoutSummary.jsx
- Lista de itens com subtotal
- Linha de desconto (se cupom aplicado) em verde
- Total em destaque (font grande + cor gold)
- Botao "Finalizar Compra" (sunset gradient)
- Mock: mostra modal "Compra simulada com sucesso!"

## Context (src/contexts/CartContext.jsx)
- Estado: items[], coupon, discount
- Actions: addItem, removeItem, applyCoupon, clearCart
- Persistencia: localStorage
- Calculo automatico de total com desconto

## Precificacao (src/utils/priceCalculator.js)
- Precos base: Foto R$15, Video R$25, Pacote R$89.90
- Calculo de desconto por cupom
- Formatacao BRL (Intl.NumberFormat)

## Mock Cupons
- SURF10 — 10% de desconto
- WAVE20 — R$20 de desconto fixo
- FIRST50 — 50% de desconto (primeira compra)

## Regras
- ZERO comentarios
- Animacoes suaves em todas as transicoes
- Feedback visual imediato em cada acao
- Carrinho persiste entre paginas (Context)
- Toast notification ao adicionar item
