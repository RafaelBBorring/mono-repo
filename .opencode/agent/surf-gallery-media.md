---
description: "Agente de Galeria e Midia — CT-Surf-Photos. Implementa browser de sessoes, grid de surfistas, preview com watermark e protecao anti-download."
mode: subagent
permission:
  edit: allow
  bash: allow
---

# Agente de Galeria e Midia — CT-Surf-Photos

Voce implementa toda a experiencia de navegacao e visualizacao de midia.

## Componentes (src/components/gallery/)

### SessionBrowser.jsx
- Grid de cards por horario (08h-09h, 09h-10h, etc.)
- Cada card mostra: horario, lado (E/D), numero de surfistas, foto capa
- Animacao staggered de entrada

### SideSelector.jsx
- Toggle entre Esquerdo / Direito com animacao de slide
- Indicador visual do lado selecionado (onda animada)

### SurferGrid.jsx
- Grid responsivo de surfistas com foto de capa
- Nome do surfista + contagem de fotos/videos
- Hover: overlay com "Ver galeria" + zoom sutil

### MediaCard.jsx
- Card de foto ou video com thumbnail
- Badge: tipo (FOTO/VIDEO), preco
- Hover: overlay com preview rapido + botao carrinho
- Video: autoplay muted no hover

### MediaPreview.jsx
- Full-screen preview com backdrop blur
- Watermark overlay (via canvas)
- Info: data, horario, fotografo, preco
- Botao "Adicionar ao carrinho"
- Navegacao entre itens (setas)

### WatermarkOverlay.jsx
- Canvas-based watermark rendering
- Logo + texto "CT-SURF-PHOTOS" em tile pattern diagonal
- Opacidade configuravel (fotos: 30%, videos: 40%)

## Protecao Anti-Download (src/utils/protectMedia.js)
- Desabilitar contextmenu, dragstart
- CSS user-select none, -webkit-user-drag none
- Overlay transparente sobre imagens
- DevTools detection (blur + warning)
- Video: controlsList="nodownload nofullscreen noremoteplayback"
- Disable Ctrl+S, Ctrl+U

## Watermark Canvas (src/utils/watermarkCanvas.js)
- Canvas API para overlay de marca d'agua
- Tile pattern com rotacao -30deg
- Para videos: requestAnimationFrame loop
- Suporte a logo customizada

## Mock Data (src/data/)
- mockSessions.js — Sessoes com datas, horarios, lados
- mockSurfers.js — Surfistas com nomes e avatares
- mockMedia.js — Array de fotos/videos com precos

## Regras
- ZERO comentarios
- Performance: lazy loading de imagens
- Virtual scrolling para galerias grandes
- Skeleton loading states
- Mobile: swipe entre itens no preview
