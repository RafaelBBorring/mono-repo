# CT-Surf-Photos — PRD (Product Requirements Document)

## 1. Visao Geral

**CT-Surf-Photos** e uma plataforma de e-commerce especializada na venda de fotos e videos de surf. Operadores fotografam sessoes de surf em praias (ex: Costa da Caparica) e disponibilizam o conteudo organizado por horario, lado da praia e surfista. Clientes podem navegar, pre-visualizar com marca d'agua, adicionar ao carrinho e adquirir fotos/videos originais.

### 1.1 Proposta de Valor
- **Para Clientes**: Encontre fotos e videos profissionais de si mesmo surfando, com preview gratuito e compra simplificada.
- **Para Fotografos/Operadores**: Upload em massa organizado por estrutura de pastas, dashboard de vendas e comissoes automaticas.

---

## 2. Stack Tecnica

| Camada | Tecnologia |
|--------|-----------|
| Framework | React 19 + Vite 7 |
| Estilizacao | Tailwind CSS 3.4 + CSS custom |
| 3D/Visual | Three.js (backdrop, particulas, efeitos) |
| Parallax | CSS scroll-driven animations + JS |
| Roteamento | Hash routing (#/) sem router externo |
| Estado | Context API + useReducer (carrinho, auth) |
| Fontes | Inter (corpo), Space Grotesk (titulos), JetBrains Mono (numeros) |
| Icones | Lucide React |
| Storage (MVP) | localStorage + mock data (sem banco) |
| Pagamento (MVP) | UI mock — sem Stripe |
| Deploy | GitHub Pages (SPA hash routing) |

---

## 3. Estrutura de Diretorios

```
apps/CT-Surf-Photos/
├── PRD.md
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
├── public/
│   ├── favicon.svg
│   └── assets/
│       ├── surf-placeholder.jpg
│       └── wave-bg.mp4
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── ThreeBackdrop.jsx
│   │   │   └── ParallaxHero.jsx
│   │   ├── auth/
│   │   │   ├── LoginModal.jsx
│   │   │   └── AdminLogin.jsx
│   │   ├── gallery/
│   │   │   ├── SessionBrowser.jsx
│   │   │   ├── SideSelector.jsx
│   │   │   ├── SurferGrid.jsx
│   │   │   ├── MediaCard.jsx
│   │   │   ├── MediaPreview.jsx
│   │   │   └── WatermarkOverlay.jsx
│   │   ├── cart/
│   │   │   ├── CartSidebar.jsx
│   │   │   ├── CartItem.jsx
│   │   │   ├── CouponInput.jsx
│   │   │   └── CheckoutSummary.jsx
│   │   ├── admin/
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── FolderUploader.jsx
│   │   │   ├── PhotographerManager.jsx
│   │   │   ├── SessionCalendar.jsx
│   │   │   ├── CommissionPanel.jsx
│   │   │   └── MediaWatermarker.jsx
│   │   └── ui/
│   │       ├── Button.jsx
│   │       ├── Badge.jsx
│   │       ├── Modal.jsx
│   │       ├── Card.jsx
│   │       ├── Input.jsx
│   │       └── Toast.jsx
│   ├── contexts/
│   │   ├── AuthContext.jsx
│   │   ├── CartContext.jsx
│   │   └── GalleryContext.jsx
│   ├── hooks/
│   │   ├── useCart.js
│   │   ├── useAuth.js
│   │   ├── useGallery.js
│   │   └── useThreeScene.js
│   ├── services/
│   │   ├── mediaService.js
│   │   ├── watermarkService.js
│   │   └── storageService.js
│   ├── data/
│   │   ├── mockSessions.js
│   │   ├── mockSurfers.js
│   │   ├── mockMedia.js
│   │   └── photographers.js
│   ├── utils/
│   │   ├── folderParser.js
│   │   ├── priceCalculator.js
│   │   ├── watermarkCanvas.js
│   │   └── protectMedia.js
│   └── three/
│       ├── OceanScene.js
│       ├── ParticleWave.js
│       └── WaterDrops.js
```

---

## 4. Tipos de Usuario

### 4.1 Cliente (User)
- Navega sessoes por data/horario/lado
- Visualiza galeria de surfistas
- Preview de fotos e videos (com marca d'agua)
- Adiciona itens ao carrinho
- Aplica cupom de desconto
- Visualiza precos individuais e total
- Finaliza compra (mock no MVP)

### 4.2 Admin (Fotografo/Operador)
- Upload de pastas com estrutura definida
- Gerencia sessoes (criar, editar horarios, lados)
- Visualiza dashboard de vendas
- Acompanha comissoes por fotografo
- Gerencia cupons de desconto
- Define precos por tipo de midia

---

## 5. Fluxo de Upload (Estrutura de Pastas)

A operacao funciona em sessoes de 1 hora, divididas em lado esquerdo e direito da praia.

### 5.1 Estrutura Esperada

```
📁 2025-06-10/
├── 📁 08h-09h/
│   ├── 📁 Esquerdo/
│   │   ├── 📁 Surfista_1_Joao/
│   │   │   ├── IMG_001.jpg
│   │   │   ├── IMG_002.jpg
│   │   │   └── VID_001.mp4
│   │   ├── 📁 Surfista_2_Maria/
│   │   │   └── ...
│   │   └── 📁 Surfista_3_Carlos/
│   │       └── ...
│   └── 📁 Direito/
│       ├── 📁 Surfista_1_Anna/
│       │   └── ...
│       └── 📁 Surfista_2_Pedro/
│           └── ...
├── 📁 09h-10h/
│   ├── 📁 Esquerdo/
│   └── 📁 Direito/
└── 📁 10h-11h/
    ├── 📁 Esquerdo/
    └── 📁 Direito/
```

### 5.2 Parsing Automatico
- `folderParser.js` le a estrutura e extrai: data, horario, lado, nome do surfista
- Fotos e videos sao classificados automaticamente por extensao (.jpg, .png, .mp4, .mov)
- Cada surfista vira uma "colecao" navegavel

---

## 6. Sistema de Protecao de Midia

### 6.1 Marca D'Agua
- **Fotos**: Canvas overlay com logo + texto semi-transparente em tile pattern
- **Videos**: Canvas rendering com watermark em tempo real sobre o video
- A marca d'agua deve ser **evidente** mas nao destruir a visualizacao

### 6.2 Protecao Anti-Download
- `protectMedia.js` implementa:
  - Desabilitar `contextmenu` (botao direito)
  - Desabilitar `dragstart` em imagens
  - CSS `user-select: none` + `-webkit-user-drag: none`
  - Overlay transparente sobre imagens (img real como background)
  - Detecao de DevTools aberto (console.warn + blur)
  - Desabilitar `save as` via atalhos Ctrl+S
  - Video sem atributo `download` e com `controlsList="nodownload"`

---

## 7. Sistema de Precificacao

### 7.1 Precos Base (configuravel pelo admin)
| Tipo | Preco Unitario |
|------|---------------|
| Foto (HD) | R$ 15,00 |
| Foto (Original RAW) | R$ 35,00 |
| Video (HD) | R$ 25,00 |
| Video (4K) | R$ 45,00 |
| Pacote Completo (tudo do surfista) | R$ 89,90 |

### 7.2 Cupons de Desconto
- Percentual (ex: 10% OFF) ou valor fixo (ex: R$ 20 OFF)
- Validade configuravel
- Limite de uso
- Codigo alphanumeric (ex: SURF10, WAVE2025)

---

## 8. Sistema de Comissoes

### 8.1 Regras
- Cada foto/video esta vinculada ao fotografo que capturou
- A operacao pode mudar durante a semana (fotografos diferentes)
- Comissao padrao: 40% para fotografo, 60% para operacao
- Configuravel por fotografo

### 8.2 Dashboard do Fotografo
- Total de vendas no periodo
- Comissoes acumuladas
- Historico de vendas por sessao
- Status de pagamento (pendente/pago)

---

## 9. Design System — "Oceanic Dark"

### 9.1 Paleta de Cores
```
--bg-primary:      #0a0e17    (Azul muito escuro — oceano profundo)
--bg-secondary:    #111827    (Superficie escura)
--bg-card:         #1a2332    (Cards elevados)
--bg-glass:        rgba(17, 24, 39, 0.7)  (Glassmorphism)

--accent-ocean:    #0ea5e9    (Azul oceano — primary)
--accent-foam:     #38bdf8    (Espuma — highlights)
--accent-sunset:   #f97316    (Laranja por do sol — CTAs)
--accent-gold:     #fbbf24    (Dourado — precos/descontos)
--accent-coral:    #fb7185    (Coral — alertas)

--text-primary:    #f1f5f9    (Texto principal)
--text-secondary:  #94a3b8    (Texto secundario)
--text-muted:      #64748b    (Texto discreto)

--border:          #1e293b    (Bordas)
--border-glow:     #0ea5e9    (Bordas com glow)
```

### 9.2 Tipografia
- **Space Grotesk**: Titulos e headings (moderna, geometrica)
- **Inter**: Corpo de texto (legibilidade)
- **JetBrains Mono**: Precos e numeros

### 9.3 Efeitos Visuais
- **Hero**: Three.js com oceano de particulas + ondas animadas
- **Parallax**: Fotos de surf em scroll horizontal com depth layers
- **Cards**: Glassmorphism com border sutil + hover glow azul
- **Botoes**: Gradiente oceano→sunset com ripple effect
- **Loading**: Skeleton screens com shimmer animation
- **Transicoes**: page transitions com fade + slide

### 9.4 Three.js Scenes
1. **OceanScene**: Oceano com ondas geradas por noise (vertex displacement)
2. **ParticleWave**: Particulas formando onda em loop
3. **WaterDrops**: Gotas de agua caindo (efeito cachoeira) com instancing

---

## 10. Telas do MVP

### 10.1 Landing Page (`#/`)
- Hero com Three.js ocean backdrop + parallax scroll
- CTA "Encontre suas fotos"
- Sessoes em destaque do dia
- Navegacao por data

### 10.2 Galeria de Sessoes (`#/sessions/:date`)
- Grid de horarios (08h, 09h, 10h...)
- Seletor de lado (Esquerdo / Direito)
- Grid de surfistas com foto de capa

### 10.3 Galeria do Surfista (`#/surfer/:id`)
- Masonry grid de fotos
- Videos com preview (watermark)
- Botao "Adicionar tudo" vs selecao individual
- Preco visivel em cada item

### 10.4 Preview de Midia (`#/preview/:mediaId`)
- Full-screen preview com watermark
- Informacoes: data, horario, fotografo, preco
- Botao "Adicionar ao carrinho"
- Protecao anti-download ativa

### 10.5 Carrinho (`#/cart`)
- Lista de itens selecionados
- Input de cupom
- Resumo: subtotal, desconto, total
- Botao finalizar compra (mock)

### 10.6 Login (`#/login`)
- Tab: Cliente | Admin
- Cliente: Email simples ou login social
- Admin: Email + senha + 2FA visual

### 10.7 Admin Dashboard (`#/admin`)
- Upload de pasta (drag & drop)
- Calendario de sessoes
- Tabela de vendas
- Comissoes por fotografo
- Gerenciar cupons

---

## 11. Fluxos Principais

### 11.1 Fluxo do Cliente
```
Landing → Selecionar Data → Horario → Lado → Surfista → 
Preview (watermark) → Adicionar ao Carrinho → Checkout → 
Cupom → Resumo → Confirmar (mock)
```

### 11.2 Fluxo do Admin
```
Login Admin → Dashboard → Upload Pasta → 
Sistema parseia estrutura → Confirma mapeamento → 
Midias disponiveis na galeria
```

---

## 12. Roadmap

### Fase 1 — MVP (Atual)
- [x] PRD e arquitetura
- [ ] Setup do projeto (Vite + React + Tailwind + Three.js)
- [ ] Design system e componentes UI
- [ ] Landing page com Three.js backdrop
- [ ] Galeria com mock data
- [ ] Preview com watermark
- [ ] Carrinho funcional
- [ ] Login mock (cliente + admin)
- [ ] Admin dashboard visual

### Fase 2 — Backend
- [ ] Supabase (auth, storage, database)
- [ ] Upload real de pastas para Supabase Storage
- [ ] Persistencia de dados
- [ ] Comissoes reais

### Fase 3 — Pagamento
- [ ] Integracao Stripe
- [ ] Webhooks de confirmacao
- [ ] Entrega automatica das midias originais

### Fase 4 — Extras
- [ ] Notificacoes push (nova sessao disponivel)
- [ ] App mobile (PWA)
- [ ] IA para identificar surfistas automaticamente
- [ ] Video highlights automatico
