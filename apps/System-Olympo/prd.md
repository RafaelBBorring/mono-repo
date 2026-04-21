# PRD — SISTEMA OLYMPO: PORTAL DE FICHAS
### Product Requirements Document · Versão 1.0
### Classificação: Documento Técnico de Produto — Uso Interno

---

## ÍNDICE

1. [Visão Geral do Produto](#1-visão-geral-do-produto)
2. [Relatório de Balanceamento — Simulações](#2-relatório-de-balanceamento--simulações)
3. [Arquitetura Técnica](#3-arquitetura-técnica)
4. [Design System & Stack Visual](#4-design-system--stack-visual)
5. [Estrutura de Telas — Especificações Completas](#5-estrutura-de-telas--especificações-completas)
   - 5.1 [Tela de Autenticação](#51-tela-de-autenticação)
   - 5.2 [Dashboard Principal](#52-dashboard-principal)
   - 5.3 [Criação de Personagem — Wizard Multi-Step](#53-criação-de-personagem--wizard-multi-step)
   - 5.4 [Ficha do Personagem — Visualização Completa](#54-ficha-do-personagem--visualização-completa)
   - 5.5 [Editor de Personagem — Painel de Evolução](#55-editor-de-personagem--painel-de-evolução)
   - 5.6 [Biblioteca de Feitiços, Runas e Rituais](#56-biblioteca-de-feitiços-runas-e-rituais)
   - 5.7 [Balanceador IA](#57-balanceador-ia)
   - 5.8 [Tela de Raças *(Placeholder para implementação futura)*](#58-tela-de-raças-placeholder-para-implementação-futura)
   - 5.9 [Painel do Mestre](#59-painel-do-mestre)
6. [Banco de Dados — Schema Supabase](#6-banco-de-dados--schema-supabase)
7. [Integração com IA — Prompt Mestre](#7-integração-com-ia--prompt-mestre)
8. [Triagens Futuras — Propostas Balanceadas](#8-triagens-futuras--propostas-balanceadas)
9. [Feitiços, Runas e Rituais — Catálogo Base](#9-feitiços-runas-e-rituais--catálogo-base)
10. [Roadmap de Funcionalidades](#10-roadmap-de-funcionalidades)
11. [Notas de Balanceamento Formais](#11-notas-de-balanceamento-formais)

---

## 1. Visão Geral do Produto

### 1.1 Identidade

**Nome do Produto:** Sistema Olympo — Portal de Fichas  
**Subtítulo:** *Forje seu herói. Imortalize sua lenda.*  
**Público-alvo:** Jogadores e Mestres do Sistema Olympo 2.0  
**Tipo:** Single-Page Application (SPA) com rotas dinâmicas  
**Backend:** Supabase (PostgreSQL + Auth + Storage)  
**Frontend:** Vanilla JS + Three.js + GSAP + bibliotecas de animação  

### 1.2 Objetivo do Produto

Criar uma plataforma digital que:

- **Formalize a criação de personagem** de acordo com todas as regras do Sistema Olympo 2.0, guiando o jogador passo a passo com validações em tempo real.
- **Armazene e exiba fichas** de forma permanente, elegante e interativa — substituindo a ficha em papel ou planilha.
- **Integre IA** para auxílio na criação de habilidades e para análise de balanceamento da ficha via Protocolo de Expansão Épica.
- **Funcione como repositório vivo** de todos os elementos do sistema: triagens, módulos, feitiços, runas, rituais, raças e armas — com suporte à expansão contínua.

### 1.3 Princípios de Design

| Princípio | Descrição |
|---|---|
| **Imersão Total** | Cada interação deve sentir-se como parte do universo do RPG. Animações, partículas, shaders — tudo contribui para a narrativa visual. |
| **Feedback Constante** | Toda ação do usuário gera resposta visual. Nenhum clique "morto". |
| **Legibilidade em Combate** | A ficha deve ser lida em segundos durante uma sessão real de RPG. |
| **Escalabilidade** | Arquitetura preparada para centenas de triagens, feitiços e rituais futuros. |
| **Mobile-First Responsivo** | Jogadores consultam a ficha no celular na mesa de jogo. |

---

## 2. Relatório de Balanceamento — Simulações

> Este capítulo documenta os resultados de **5.000 simulações de combate** e análises matemáticas realizadas sobre o Sistema Olympo 2.0 antes da implementação do site. Os achados informam as validações automáticas do sistema.

### 2.1 Sumário Executivo dos Achados

Após 5.000 duelos simulados por nível (N5, N10, N15, N20, N25, N30) e análise das fórmulas de progressão, foram identificados **6 pontos de atenção** e **2 inconsistências críticas**:

---

#### ⚠ ACHADO 1 — HP Esperado vs. HP Calculado (Inconsistência Crítica)

A tabela de calibração do documento (Seção 14.7) apresenta faixas de HP que **não são atingíveis apenas com as fórmulas base + progressão de nível** para Operativo e Místico em níveis altos.

| Nível | Guerreiro (simulado) | Operativo (simulado) | Místico (simulado) | Range Esperado (doc) |
|---|---|---|---|---|
| N5 | 210–265 ⚠ Acima | 150–195 ✅ | 135–165 ✅ | 140–210 |
| N10 | 345–420 ⚠ | 238–298 ✅ | 207–247 ⚠ Abaixo | 250–380 |
| N15 | 430–525 ✅ | 288–363 ⚠ Abaixo | 247–297 ⚠ Abaixo | 380–560 |
| N20 | 525–640 ✅ | 356–446 ⚠ Abaixo | 302–362 ⚠ Abaixo | 520–760 |
| N25 | 645–780 ✅ | 446–551 ⚠ Abaixo | 363–433 ⚠ Abaixo | 700–980 |
| N30 | 790–945 ⚠ Abaixo | 558–678 ⚠ Abaixo | 449–529 ⚠ Abaixo | 950–1350 |

**Diagnóstico:** A tabela de calibração pressupõe que os jogadores possuem **bônus passivos de HP de Triagens e Módulos** (ex.: Tank 0.1 +5 HP/nível, Corpo Resiliente, bênçãos de campanha) para atingir os valores esperados. Operativo e Místico em N25–N30 precisariam de +400 a +700 HP vindos de fontes passivas para atingir o topo da faixa — o que conflita com o TVP de +150% da Vida Base.

**Recomendação para o Site:** O sistema de validação da ficha usará os ranges simulados (sem bônus passivos) como piso e o TVP máximo (2,5× Vida Base) como teto. A label na ficha exibirá "HP Base" vs "HP Total com Passivos".

---

#### ⚠ ACHADO 2 — Guerreiro domina todos os duelos 1v1

Em 5.000 simulações de duelos diretos sem habilidades, o Guerreiro venceu:
- vs. Operativo: **~99,9%** das lutas em todos os níveis
- vs. Místico: **100%** das lutas em todos os níveis

**Diagnóstico:** Isso é **matematicamente esperado e não é um bug** — o Guerreiro tem HP 45–60% maior e dano base 15–25% maior. O sistema pressupõe que Operativo e Místico compensam via Triagens, Habilidades e posicionamento. O site deve comunicar isso claramente na tela de seleção de classe.

**Recomendação para o Site:** Exibir um "perfil de combate" com gráfico de radar por classe na tela de criação, deixando explícito que Místico é frágil sem suas habilidades.

---

#### ⚠ ACHADO 3 — Tank 0.1 viola o TVP em N15+

A Triagem Tank 0.1 concede +5 HP por nível. Em um Guerreiro com CON 22 (N15+), a combinação de HP base alto + progressão natural + Tank 0.1 **ultrapassa 2,5× a Vida Base** a partir do Nível 15.

| Nível | HP c/ Tank | TVP Máximo | Status |
|---|---|---|---|
| N10 | 455 | 488 | ✅ OK |
| N15 | 625 | 525 | ⚠ +100 acima |
| N20 | 770 | 525 | ⚠ +245 acima |
| N25 | 980 | 562 | ⚠ +418 acima |
| N30 | 1180 | 562 | ⚠ +618 acima |

**Diagnóstico:** A TVP usa `2,5 × Vida Base da Classe`, que é estática. O HP por nível não faz parte da "Vida Base". A interpretação correta é que TVP se aplica **sobre fontes passivas extra** (bônus de raça, habilidades passivas, itens), **não** sobre o próprio hp-por-nível da classe. O site deve clarificar essa distinção.

**Recomendação para o Site:** No cálculo de HP, separar em 4 colunas: `HP Base Classe | HP por Nível | Bônus Triagem/Módulo | Bônus Racial/Item`. O TVP se aplica apenas à soma das duas últimas colunas.

---

#### ⚠ ACHADO 4 — Sobrecarga Arcana na Ultimate viola o TDH

Um Místico N16–22 com Sobrecarga Arcana (+50% dano) aplicada à Ultimate (TDH = 17d12+65, média ~286) alcança **~429 de dano médio** — 50% acima do teto de dano por habilidade.

**Recomendação para o Site:** O formulário de validação de habilidades deve exibir aviso quando Sobrecarga Arcana for marcada na Ultimate. A regra recomendada é: **Sobrecarga Arcana só pode ser aplicada a Ativas (não Ultimates)**, conforme a nota do próprio Módulo ("exceto Ultimate" na Seção 8.2, Conhecimento Amplificado). O sistema deve sugerir ao Mestre que documente explicitamente se autoriza essa combinação.

---

#### ⚠ ACHADO 5 — Energia do Místico/Intuitivo é virtualmente ilimitada em N30

Com Intuitivo 0.1 (50% AM por bloco de 5 níveis) + Reserva Arcana (+50% AM como Energia Máxima), um Místico N30 atinge **~613 pontos de Energia** — o que representa **61 usos** de uma habilidade de custo médio (10 Energia). Nenhum combate real exigirá mais de 15–20 usos.

**Recomendação para o Site:** Exibir na ficha um indicador "Pressão de Recurso" que classifica o ratio Energia/Combate médio. Acima de 40 usos, exibir aviso de balanceamento sugerindo ao Mestre ajustar custos ou criar inimigos que drenem Energia.

---

#### ⚠ ACHADO 6 — Reações do Operativo/Assassino superam o Guerreiro em 2×

Com DES alta e Assassino 0.2 (+1 Reação a cada 15 DES), um Operativo N25 pode acumular **6 Reações por rodada** vs. **3 do Guerreiro** — tornando-o muito mais difícil de acertar do que o tanque da equipe.

**Recomendação para o Site:** O sistema de validação deve sinalizar quando o número de Reações ultrapassar 5. Sugestão ao Mestre: implementar regra de cap opcional em 5 Reações/rodada para classes não-Guerreiro.

---

### 2.2 Validações Automáticas Implementadas no Site

O sistema implementará as seguintes verificações em tempo real durante a criação/edição da ficha:

```
[V01] HP Total ≤ TVP (2,5× Vida Base + HP por Nível)
[V02] Bônus Camada 2 ≤ limite SCP por faixa de nível
[V03] Bônus Camada 3 ≤ limite SCP por faixa de nível
[V04] Dano por Habilidade ≤ TDH da faixa de nível
[V05] Reações ≤ 6 (aviso ao Mestre acima de 5)
[V06] PP total da habilidade ≤ orçamento por tipo e nível
[V07] Energia Total ≤ 500 (aviso de inflação)
[V08] Sobrecarga Arcana não aplicada à Ultimate sem flag do Mestre
```

Cada validação reprovada gera um **card de alerta não-bloqueante** — a ficha pode ser salva, mas o Mestre recebe um relatório de homologação.

---

## 3. Arquitetura Técnica

### 3.1 Stack Completo

| Camada | Tecnologia | Função |
|---|---|---|
| **Frontend** | Vanilla JS (ES2022+) | Lógica de aplicação, roteamento SPA |
| **3D / Visual** | Three.js r158+ | Background 3D, partículas, efeitos de shaders |
| **Animação UI** | GSAP 3.12 + ScrollTrigger | Todas as animações de interface |
| **Física/Partículas** | tsParticles ou Vanta.js | Efeitos de fundo das telas |
| **Fontes** | Cinzel (títulos) + Inter (corpo) | Via Google Fonts |
| **Ícones** | Lucide Icons (SVG inline) | Ícones do sistema |
| **Charts** | Chart.js 4 | Gráfico de radar de atributos |
| **Backend** | Supabase (PostgreSQL) | Database, Auth, Storage |
| **IA** | Anthropic API (Claude Sonnet 4) | Balanceamento e criação de habilidades |
| **Imagens** | Supabase Storage + Sharp (resize) | Avatares e imagens de feitiços |
| **Deploy** | Vercel / Netlify | Hospedagem estática |

### 3.2 Estrutura de Arquivos

```
olympo-portal/
├── index.html
├── src/
│   ├── app.js                    # Roteador SPA principal
│   ├── auth/
│   │   ├── auth.js               # Supabase Auth
│   │   └── auth-screen.js        # UI de login/cadastro
│   ├── character/
│   │   ├── wizard.js             # Wizard de criação multi-step
│   │   ├── sheet.js              # Visualização da ficha
│   │   ├── editor.js             # Painel de evolução
│   │   ├── calculator.js         # Motor de cálculo (HP, CA, PE...)
│   │   └── validator.js          # Validações V01–V08
│   ├── magic/
│   │   ├── spells.js             # Feitiços
│   │   ├── runes.js              # Runas
│   │   └── rituals.js            # Rituais
│   ├── ai/
│   │   ├── ai-client.js          # Wrapper da API Anthropic
│   │   ├── balance-prompt.js     # Prompt Mestre de Balanceamento
│   │   └── ability-prompt.js     # Prompt de criação de habilidades
│   ├── master/
│   │   └── dashboard.js          # Painel do Mestre
│   ├── ui/
│   │   ├── components.js         # Componentes reutilizáveis
│   │   ├── animations.js         # Todas as animações GSAP
│   │   ├── three-bg.js           # Background Three.js
│   │   └── toasts.js             # Sistema de notificações
│   ├── db/
│   │   ├── supabase.js           # Cliente Supabase
│   │   ├── characters.js         # CRUD de personagens
│   │   ├── magic-items.js        # CRUD de feitiços/runas/rituais
│   │   └── images.js             # Upload com resize
│   └── data/
│       ├── classes.js            # Dados estáticos das classes
│       ├── triages.js            # Todas as triagens
│       ├── modules.js            # Módulos de evolução
│       ├── weapons.js            # Armas e ranks
│       ├── martial-arts.js       # Artes marciais
│       ├── skills.js             # Perícias
│       └── races.js              # Raças (placeholder)
├── styles/
│   ├── main.css                  # CSS global + variáveis
│   ├── screens/                  # CSS por tela
│   └── components/               # CSS por componente
└── assets/
    ├── fonts/
    ├── icons/
    └── textures/                 # Texturas para Three.js
```

### 3.3 Roteamento SPA

```javascript
// Rotas da aplicação
const routes = {
  '/':              AuthScreen,
  '/dashboard':     Dashboard,
  '/character/new': CharacterWizard,
  '/character/:id': CharacterSheet,
  '/character/:id/edit': CharacterEditor,
  '/magic':         MagicLibrary,
  '/master':        MasterDashboard,
  '/races':         RacesScreen,   // placeholder
};
```

---

## 4. Design System & Stack Visual

### 4.1 Paleta de Cores

```css
:root {
  /* Cores primárias — ouro olímpico */
  --gold-primary:    #C2A34D;
  --gold-light:      #E8D08A;
  --gold-dark:       #8A6F28;
  --gold-glow:       rgba(194, 163, 77, 0.35);

  /* Fundos — abismo épico */
  --bg-void:         #050508;
  --bg-deep:         #0A0A12;
  --bg-surface:      #111120;
  --bg-elevated:     #1A1A2E;
  --bg-card:         #1E1E32;
  --bg-card-hover:   #252540;

  /* Texto */
  --text-primary:    #F0EAD6;
  --text-secondary:  #9A9AB0;
  --text-muted:      #5A5A70;
  --text-gold:       #C2A34D;

  /* Status / Recursos */
  --hp-color:        #E05050;
  --energia-color:   #4D8FE0;
  --pe-color:        #9F4DE0;
  --ca-color:        #4DE0A0;

  /* Classes */
  --guerreiro-color: #D4691E;
  --operativo-color: #4D9FE0;
  --mistico-color:   #A04DE0;

  /* Raridades */
  --common:     #9E9E9E;
  --uncommon:   #4CAF50;
  --rare:       #2196F3;
  --epic:       #9C27B0;
  --legendary:  #FF9800;
  --mythic:     #F44336;

  /* Alertas */
  --alert-ok:      #4CAF50;
  --alert-warn:    #FF9800;
  --alert-error:   #F44336;

  /* Bordas e efeitos */
  --border-subtle:  rgba(194, 163, 77, 0.15);
  --border-medium:  rgba(194, 163, 77, 0.35);
  --border-strong:  rgba(194, 163, 77, 0.65);
  --glow-sm:        0 0 12px rgba(194, 163, 77, 0.3);
  --glow-md:        0 0 24px rgba(194, 163, 77, 0.4);
  --glow-lg:        0 0 48px rgba(194, 163, 77, 0.5);

  /* Tipografia */
  --font-display:   'Cinzel', serif;
  --font-body:      'Inter', sans-serif;
  --font-mono:      'JetBrains Mono', monospace;
}
```

### 4.2 Biblioteca de Animações — Regras de Uso

Todas as animações são gerenciadas via GSAP. As seguintes regras garantem consistência:

| Evento | Animação | Duração | Easing |
|---|---|---|---|
| Entrada de tela | Fade + slide Y(20px → 0) | 600ms | `power3.out` |
| Hover em card | Scale(1.03) + glow border | 200ms | `power1.out` |
| Click em botão | Scale(0.96) → Scale(1) | 120ms | `bounce.out` |
| Abertura de modal | Scale(0.9) + fade | 350ms | `back.out(1.5)` |
| Fechamento de modal | Scale(0.9) + fade | 250ms | `power2.in` |
| Toast notification | Slide X(-100% → 0) | 400ms | `elastic.out(1, 0.5)` |
| Mudança de stat | Counter animation | 400ms | `power2.inOut` |
| Rolo de dado (3D) | Rotação Three.js | 800ms | `expo.out` |
| Carregamento de ficha | Partículas → form | 1200ms | `stagger 0.08s` |

### 4.3 Three.js Background

Cada tela possui um background Three.js único:

- **Auth:** Campo de estrelas com nebulosa dourada, partículas orbitando um símbolo central
- **Dashboard:** Grid de hexágonos pulsando suavemente, cor varia por classe dos personagens
- **Ficha/Guerreiro:** Partículas avermelhadas + fragmentos de armadura flutuando
- **Ficha/Operativo:** Linhas de dados + chuva de código suave
- **Ficha/Místico:** Runas flutuantes + espirais de energia azul/roxa
- **Biblioteca Mágica:** Partículas de feitiço multicoloridas, densidade aumenta ao scroll

### 4.4 Bibliotecas Externas Recomendadas

```html
<!-- Animação principal -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>

<!-- 3D -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>

<!-- Partículas -->
<script src="https://cdn.jsdelivr.net/npm/tsparticles@2.12.0/tsparticles.bundle.min.js"></script>

<!-- Charts -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>

<!-- Drag and Drop (para módulos e habilidades) -->
<script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"></script>

<!-- Markdown preview (para descrições de habilidades) -->
<script src="https://cdn.jsdelivr.net/npm/marked@12.0.0/marked.min.js"></script>
```

---

## 5. Estrutura de Telas — Especificações Completas

---

### 5.1 Tela de Autenticação

**Rota:** `/`  
**Componentes:** `auth-screen.js` + `auth.js`

#### Layout

```
┌─────────────────────────────────────────────────────────┐
│  [Three.js BG: nebulosa dourada com partículas]         │
│                                                         │
│         ╔═══════════════════════════════╗               │
│         ║   ⚔  SISTEMA OLYMPO  ⚔       ║               │
│         ║   Portal de Fichas            ║               │
│         ╟───────────────────────────────╢               │
│         ║  [Tab: Entrar] [Tab: Criar]   ║               │
│         ║                               ║               │
│         ║  ┌──────────────────────┐    ║               │
│         ║  │ 📧 E-mail            │    ║               │
│         ║  └──────────────────────┘    ║               │
│         ║  ┌──────────────────────┐    ║               │
│         ║  │ 🔒 Senha             │    ║               │
│         ║  └──────────────────────┘    ║               │
│         ║                               ║               │
│         ║  [   FORJAR ENTRADA   ]       ║               │
│         ║                               ║               │
│         ║  ── ou entre com ──           ║               │
│         ║  [Google] [Discord]           ║               │
│         ╚═══════════════════════════════╝               │
└─────────────────────────────────────────────────────────┘
```

#### Especificações Técnicas

- **Modal flutuante** com `backdrop-filter: blur(20px)` e borda `var(--border-medium)`
- **Entrada de campos:** ao focar, a borda muda de `--border-subtle` para `--gold-primary` com glow animado via GSAP
- **Botão "Forjar Entrada":** ao hover, o botão tem um sweep de luz dourada da esquerda para direita (pseudo-element com `translateX` animation)
- **Validação inline:** erro aparece como toast abaixo do campo com slide animation
- **Logo/Título:** fonte `Cinzel`, letter-spacing: 0.2em, text-shadow com glow dourado
- **Background Three.js:** orb central de 200px com pulsação lenta, rodeado por anéis de partículas em órbita. Ao carregar a página, as partículas convergem do exterior para o orb (animação de 2s)

#### Autenticação Supabase

```javascript
// Provedores ativos
const providers = ['google', 'discord'];

// Após login bem-sucedido:
// 1. Verificar se usuário tem personagens → redirecionar para /dashboard
// 2. Primeiro login → redirecionar para /character/new com onboarding
```

---

### 5.2 Dashboard Principal

**Rota:** `/dashboard`  
**Componentes:** `dashboard.js`

#### Layout

```
┌─────────────────────────────────────────────────────────────┐
│ NAVBAR: [⚔ OLYMPO]  [Personagens] [Biblioteca] [Mestre]  👤│
├───────────────────────────────────────────────────────────── │
│                                                              │
│  Bem-vindo, [Nome]              [+ Criar Personagem]        │
│                                                              │
│  SEUS PERSONAGENS  ──────────────────────────────────────── │
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │  [Avatar]      │  │  [Avatar]      │  │  [ + ]       │  │
│  │  NOME          │  │  NOME          │  │              │  │
│  │  Guerreiro     │  │  Místico       │  │  Novo        │  │
│  │  N15           │  │  N8            │  │  Personagem  │  │
│  │  ────────────  │  │  ────────────  │  │              │  │
│  │  HP: 530       │  │  HP: 200       │  │              │  │
│  │  [Ver] [Edit]  │  │  [Ver] [Edit]  │  │              │  │
│  └────────────────┘  └────────────────┘  └──────────────┘  │
│                                                              │
│  CAMPANHAS RECENTES  ──────────────────────────────────── ▾ │
│  BIBLIOTECA RÁPIDA  ───────────────────────────────────── ▾ │
└─────────────────────────────────────────────────────────────┘
```

#### Especificações Técnicas

**Navbar:**
- Sticky, `backdrop-filter: blur(16px)`, fundo `rgba(5, 5, 8, 0.85)`
- Logo com ícone SVG da espada + texto Cinzel
- Links com hover underline animado (scaleX 0→1 via GSAP)
- Avatar/perfil com dropdown suave

**Cards de Personagem:**
- Dimensões: 240×320px (desktop), 160×220px (mobile)
- Background: gradiente radial baseado na cor da classe
- Avatar com clip-path hexagonal
- Ao hover: card sobe 8px (`translateY(-8px)`), sombra aumenta, borda ganha glow
- Barra de HP animada com fill progressivo ao entrar na viewport
- **Badge de nível** no canto superior direito com animação de pulso sutil
- Ícones de raridade da arma principal exibidos como badges

**Card "Novo Personagem":**
- Fundo tracejado com borda animada (dash-offset animation)
- Ícone "+" com rotação em hover (45deg → 0deg, easing elástico)

**Seções colapsáveis:**
- `Campanhas Recentes` e `Biblioteca Rápida` usam accordion com GSAP height animation
- Estado persiste em `localStorage`

---

### 5.3 Criação de Personagem — Wizard Multi-Step

**Rota:** `/character/new`  
**Componentes:** `wizard.js` + `calculator.js` + `validator.js`

O Wizard possui **10 etapas** correspondendo ao Passo a Passo da Seção 15 do documento.

#### Barra de Progresso

```
[1] [2] [3] [4] [5] [6] [7] [8] [9] [10]
 ●───●───●───●───○───○───○───○───○───○
Nível > Esqueleto > Classe > Perícias > Combate > Habilidades > Triagens > Módulos > Armas > Revisão
```

Barra de progresso com GSAP: ao avançar, a linha se preenche da esquerda para direita com gradiente dourado. O ícone do passo atual pulsa.

---

#### Passo 1 — Definir Nível

**Layout:** Slider central com valor numérico grande no centro, rodeado por texto contextual que muda conforme o nível.

- Slider de 1–30 com GSAP smooth value
- Ao mover: o array de atributos disponível aparece abaixo em tempo real
- Badge indica a faixa: "Nível de Iniciante (1–7)" / "Intermediário (8–13)" / etc.
- Texto narrativo: *"Nível 15 — Veterano de batalhas, seus feitos já são lendas locais..."*

**Validação:** Nenhuma (livre)

---

#### Passo 2 — Distribuição do Esqueleto

**Layout:** 6 cards de atributo + pool de pontos do array

```
ARRAY DISPONÍVEL: 15 · 14 · 13 · 12 · 10 · 8    [Pool restante: 0]

┌──────────┐  ┌──────────┐  ┌──────────┐
│  FOR      │  │  DES      │  │  CON      │
│  [  15  ] │  │  [  14  ] │  │  [  13  ] │
│  Mod: +2  │  │  Mod: +2  │  │  Mod: +1  │
└──────────┘  └──────────┘  └──────────┘
┌──────────┐  ┌──────────┐  ┌──────────┐
│  INT      │  │  APA      │  │  AM       │
│  [  12  ] │  │  [  10  ] │  │  [   8  ] │
│  Mod: +1  │  │  Mod: +0  │  │  Mod: -1  │
└──────────┘  └──────────┘  └──────────┘

GRÁFICO DE RADAR ── Pré-visualização em tempo real
```

**Especificações:**
- Cada card tem `<select>` estilizado com os valores disponíveis do array (drag-and-drop opcional via SortableJS)
- Ao selecionar: o modificador atualiza instantaneamente com animação de counter (GSAP)
- Gráfico de radar (Chart.js) centralizado abaixo, atualiza em tempo real
- Os Pontos de Esqueleto da progressão (baseados no nível escolhido) são exibidos como pontos extras a distribuir
- **Hover em cada atributo:** tooltip com descrição completa do atributo e quais mecânicas ele influencia

**Validação:** Todos os valores do array devem estar alocados. Nenhum atributo pode receber dois valores iguais do array simultaneamente.

---

#### Passo 3 — Escolha de Classe

**Layout:** 3 cards grandes, seleção exclusiva

```
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│  🗡 GUERREIRO        │  │  🔪 OPERATIVO        │  │  ✨ MÍSTICO          │
│                     │  │                     │  │                     │
│  [Gráfico Radar]    │  │  [Gráfico Radar]    │  │  [Gráfico Radar]    │
│                     │  │                     │  │                     │
│  Vida:  100+CON×5   │  │  Vida:  70+CON×5    │  │  Vida:  50+CON×5    │
│  /Nível: 8+ModCON   │  │  /Nível: 6+ModCON   │  │  /Nível: 4+ModCON   │
│  Energia: 25+AM×2   │  │  Energia: 35+AM×2   │  │  Energia: 50+AM×2   │
│  PE Base: 16        │  │  PE Base: 12        │  │  PE Base: 14        │
│  Dano: 2d10+FOR     │  │  Dano: 2d8+FOR      │  │  Dano: 2d6+AM       │
│  Perícias: 6        │  │  Perícias: 8-10     │  │  Perícias: 10       │
│                     │  │                     │  │                     │
│  ⚔ Tanque/Dano     │  │  🎯 Suporte/Dano    │  │  ✨ Magia/Suporte   │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

**Especificações:**
- Ao hover: card levita 6px, background ganha gradiente da cor da classe
- Ao selecionar: animação de "seleção épica" — borda percorre o card com luz dourada (GSAP timeline), confetti de partículas na cor da classe
- Cálculo automático de HP/Energia/PE no rodapé baseado nos atributos do Passo 2
- **Aviso de sinergia:** se o usuário alocou o maior valor em AM e escolhe Guerreiro, uma dica aparece sugerindo revisar a distribuição

---

#### Passo 4 — Distribuição de Perícias

**Layout:** Lista das 19 perícias com checkboxes + contador

```
PERÍCIAS DISPONÍVEIS: 6/6 utilizadas    [Guerreiro — 6 treinamentos]

┌───────────────────────────────────────────────────────────┐
│  ☑  Lutar          FOR/DES   ● TREINADO (+5)              │
│  ☑  Bloqueio       FOR/CON   ● TREINADO (+5)              │
│  ☑  Atletismo      FOR/CON   ● TREINADO (+5)              │
│  ☑  Fortitude      CON       ● TREINADO (+5)              │
│  ☑  Intimidar      FOR/APA   ● TREINADO (+5)              │
│  ☑  Percepção      DES/INT   ● TREINADO (+5)              │
│  ○  Alquimia       INT                                     │
│  ○  Conhecimento   INT                                     │
│  ... (expandir restantes)                                 │
└───────────────────────────────────────────────────────────┘
```

**Especificações:**
- Checkboxes customizados com animação de check dourado
- Ao atingir o limite: checkboxes restantes ficam desabilitados com animação shake suave
- Tooltip em cada perícia: atributo vinculado + exemplo de uso
- Para N8+: seletor de grau (Veterano/Especialista/Mestre) aparece ao marcar a perícia
- Graus bloqueados além do permitido pelo nível mostram cadeado animado

---

#### Passo 5 — Cálculo de Combate

**Layout:** Tela de resumo calculado automaticamente, sem inputs manuais

```
┌──────────────────────────────────────────────────────────┐
│  CALCULADO AUTOMATICAMENTE COM BASE NOS SEUS DADOS       │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐│
│  │  HP      │  │  ENERGIA │  │    PE    │  │    CA    ││
│  │  [530]   │  │  [113]   │  │  [76]    │  │  [22]    ││
│  │ ████████ │  │ ████████ │  │ ████████ │  │ ████████ ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘│
│                                                          │
│  REAÇÕES: 3  (DES 15 ÷ 5)                              │
│  CRÍTICO: 20 natural                                     │
│  PERCEPÇÃO PASSIVA: d10 + 15 + 2 = 17+d10             │
│                                                          │
│  DANO BASE: 2d10 + 3 (FOR +3)                          │
│                                                          │
│  [Ver detalhes do cálculo ▼]                            │
└──────────────────────────────────────────────────────────┘
```

**Especificações:**
- Todos os valores animam de 0 ao valor real com GSAP counter
- Barras de recurso preenchem de esquerda para direita com easing
- "Ver detalhes" expande accordion com fórmula completa passo a passo
- Alertas V01–V08 aparecem aqui se houver inconsistências

---

#### Passo 6 — Criação de Habilidades

**Layout:** 5 slots de habilidade com editor por slot

```
┌─────────────────────────────────────────────────────────────────┐
│  HABILIDADES  (1 Passiva · 3 Ativas · 1 Ultimate)               │
│                                                                  │
│  [PASSIVA] ─────────────────────────────────────────────────── │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Nome: [___________________]                              │   │
│  │  Tipo: ● Passiva                                          │   │
│  │  Descrição / Efeito:                                      │   │
│  │  ┌──────────────────────────────────────────────────┐    │   │
│  │  │  [Área de texto markdown com preview inline]     │    │   │
│  │  └──────────────────────────────────────────────────┘    │   │
│  │  [🤖 Solicitar ajuda da IA]                               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [ATIVA 1] [ATIVA 2] [ATIVA 3] [ULTIMATE]  ←── tabs            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Nome: [_____________]   Custo de Energia: [___]         │   │
│  │  Duração: [___] rodadas  Alcance: [___]                   │   │
│  │  Dano: [___] (ex: 4d10+20)  Tipo: [Físico/Mágico/...]   │   │
│  │                                                           │   │
│  │  Efeito:                                                  │   │
│  │  [Área de texto markdown]                                 │   │
│  │                                                           │   │
│  │  INDICADOR DE POTÊNCIA (PP):  ████░░  12/14 ✅          │   │
│  │                                                           │   │
│  │  [🤖 Criar habilidade com IA]  [✅ Validar]              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Especificações:**
- **Indicador de PP** atualiza em tempo real conforme o jogador preenche os campos de dano/efeito
- PP calculado automaticamente com base nos pesos da Seção 14.5
- Barra de PP: verde (dentro do orçamento), amarelo (75–100%), vermelho (acima)
- Botão **"Criar habilidade com IA"**: abre modal de chat com o assistente de IA (ver Seção 7)
- Botão **"Solicitar ajuda da IA"** (passiva): IA sugere uma passiva baseada na classe, triagem e conceito do personagem
- Preview markdown em tempo real no lado direito (split view em desktop)
- Animação ao concluir cada habilidade: checkmark animado em ouro

---

#### Passo 7 — Seleção de Triagens

**Layout:** Grid de cards de triagem, desbloqueados conforme a progressão de nível

```
TRIAGENS DA SUA CLASSE (GUERREIRO)
Pontos de Triagem disponíveis: N5=0.1 | N8=0.2 | ... | N30=0.6

TRIAGEM PRINCIPAL ──────────────────────────────────────────────

  ○ TÁTICO      ○ LUTADOR      ○ TANK      ● SOLDADO [selecionado]

  [Card expandido mostrando todos os 6 níveis do Soldado]
  ┌──────────────────────────────────────────────────────────┐
  │  0.1 ● Ganho iniciativa +5 & Ação de Mov. extra (1ª Rod.)│
  │  0.2 ● Crítico → +2d10 próx. 3 ataques                  │
  │  0.3 ● 6PE — Atordoar (DT CON 16+mod)                   │
  │  0.4 ● 4PE — 1 Ataque adicional                         │
  │  0.5 ● Ignora 15 pts de Armadura                        │
  │  0.6 ○ Arma Favorita +3 Dados (bloqueado — N30)          │
  └──────────────────────────────────────────────────────────┘
```

**Especificações:**
- Triagens bloqueadas mostram cadeado + requisito de nível
- Ao selecionar triagem: animação de "upgrade" — raios de luz percorrem o card
- Níveis 0.1–0.6 são desbloqueados progressivamente conforme o nível informado no Passo 1
- Sub-Triagem disponível a partir de N16 (qualquer classe) com indicador visual diferente

---

#### Passo 8 — Aquisição de Módulos

**Layout:** Grid de todos os módulos organizados por categoria (Passivos / Especiais / Ativos)

**Especificações:**
- Módulos com requisito não atingido: bloqueados com tooltip do requisito
- Ao adicionar módulo: drag do card para área "Módulos Ativos" (SortableJS)
- Contagem de módulos de evolução disponíveis baseada na progressão de nível
- Custo de PE exibido em badge colorido (roxo)

---

#### Passo 9 — Arma e Arte Marcial

**Layout:** Duas seções

**Arma:**
```
ESCOLHA SUA ARMA PRINCIPAL

[Filtro por tipo: ○ Corpo-a-corpo  ○ Distância]

┌────────────┐  ┌────────────┐  ┌────────────┐
│  🗡 Katana  │  │  🏹 Arco   │  │  🔫 Pistola│
│  1d8 DES   │  │  1d8 DES   │  │  1d8 DES   │
│  Iajutsu   │  │  Tiro Prec │  │  Execução  │
└────────────┘  └────────────┘  └────────────┘

RANK DA ARMA (definido pelo Mestre):
○ Comum  ○ Incomum  ● Raro  ○ Épico  ○ Lendário  ○ Mítico
Bônus: +2d6  Slots: 2
```

**Especificações:**
- Cards de arma com animação hover de vibração suave (shake X 2px)
- Rank selecionado acende badge da raridade correspondente com glow colorido
- Habilidades de arma (slots) desbloqueiam inputs adicionais

---

#### Passo 10 — Revisão e Validação Final

**Layout:** Resumo completo da ficha em formato compacto + relatório de validação

```
┌──────────────────────────────────────────────────────────┐
│  REVISÃO FINAL — [Nome do Personagem]                    │
│                                                          │
│  RELATÓRIO DE VALIDAÇÃO OLYMPO 2.0                      │
│  ┌─────────────────────────────────────────────────┐    │
│  │  V01 HP Total ≤ TVP               ✅ OK          │    │
│  │  V02 Camada 2 (N15)               ✅ OK (+12)    │    │
│  │  V03 Camada 3                     ✅ OK          │    │
│  │  V04 Dano Habilidade Ativa        ✅ OK (8 PP)   │    │
│  │  V05 Reações                      ⚠ 5 reações   │    │
│  │  V06 PP Total                     ✅ OK          │    │
│  │  V07 Energia                      ✅ OK          │    │
│  │  V08 Sobrecarga + Ultimate        ✅ OK          │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  [← Voltar e Ajustar]     [⚔ FORJAR PERSONAGEM]        │
└──────────────────────────────────────────────────────────┘
```

**Especificações:**
- Botão "Forjar Personagem": animação épica ao clicar — tela fade to black, logo pulsa, partículas explodem, personagem aparece salvo
- Relatório V01–V08 com ícones coloridos e mensagens descritivas
- Avisos (⚠) são não-bloqueantes; erros (✗) impedem salvar com tooltip explicativo

---

### 5.4 Ficha do Personagem — Visualização Completa

**Rota:** `/character/:id`  
**Componentes:** `sheet.js`

#### Layout Geral (Desktop — Três Colunas)

```
┌─────────────────────────────────────────────────────────────────────┐
│  NAVBAR  [← Dashboard]  [NOME · Classe · N15]  [Editar] [IA ✨]   │
├──────────────┬──────────────────────────────┬───────────────────── │
│  COL. ESQUERDA│      COL. CENTRAL            │   COL. DIREITA      │
│  [Avatar]    │                              │                      │
│  [Radar]     │  ┌─────────────────────────┐ │  HABILIDADES         │
│              │  │ HP  ████████████  530   │ │  ┌───────────────┐   │
│  ATRIBUTOS   │  │ EN  ████████░░░  113   │ │  │ PASSIVA        │   │
│  FOR  15 +2  │  │ PE  ██████░░░░   76   │ │  │ Nome ·desc     │   │
│  DES  13 +1  │  └─────────────────────────┘ │  └───────────────┘   │
│  CON  16 +3  │                              │  ┌───────────────┐   │
│  INT  12 +1  │  CA: 22    REAÇÕES: 3       │  │ ATIVA 1   20E  │   │
│  APA  10 +0  │  CRÍTICO: 20               │  │ Desc...        │   │
│  AM   8  -1  │  PERC. PAS: d10+17        │  └───────────────┘   │
│              │                              │  ... (Ativa 2, 3)   │
│  PERÍCIAS    │  DANO BASE: 2d10+3          │  ┌───────────────┐   │
│  Lutar +7    │                              │  │ ULTIMATE  40E  │   │
│  Bloqueio +8 │  TRIAGENS                    │  │ Desc...  1x/c  │   │
│  ...         │  [Soldado 0.1][0.2][0.3]    │  └───────────────┘   │
│              │  [Sub-Triagem: —]            │                      │
│  ARMAS       │                              │  MÓDULOS ATIVOS      │
│  [Katana]    │  MÓDULOS                     │  [Golpe Dev.] ...    │
│  Raro +2d6   │  Especialista em Arma ●     │                      │
│              │  Recuperação Acelerada ●    │  FEITIÇOS            │
│              │  ...                         │  [Card] [Card]       │
└──────────────┴──────────────────────────────┴───────────────────── │
```

#### Especificações Detalhadas

**Avatar:**
- Área hexagonal (clip-path SVG) de 200×200px
- Borda animada: gradiente rotativo dourado (`conic-gradient` animado via CSS)
- Click no avatar → modal de upload com preview e crop circular
- Imagens armazenadas no Supabase Storage; redimensionadas para **400×400px** (avatar principal) e **80×80px** (thumbnail) antes do upload via Canvas API

**Barras de Recurso:**
- HP: vermelho `#E05050` com neon glow
- Energia: azul `#4D8FE0` com neon glow
- PE: roxo `#9F4DE0` com neon glow
- Preenchem com animação de 800ms ao carregar a ficha (GSAP)
- Click na barra → abre modal de ajuste de valor (modo sessão — não salva no DB)

**Atributos:**
- 6 cards com valor grande + badge do modificador
- Modificador positivo: badge verde; negativo: badge vermelho; zero: badge cinza
- Click em atributo → tooltip com lista de perícias e mecânicas vinculadas

**Gráfico de Radar:**
- Chart.js com tema escuro
- Linhas douradas, fundo com `rgba(194, 163, 77, 0.05)`
- Animação de entrada: os eixos crescem um a um com stagger de 100ms

**Cards de Habilidade:**
- Cabeçalho: nome + tipo (ícone) + custo de Energia
- Corpo: descrição em markdown renderizado
- Footer: duração, alcance, dano (se aplicável)
- Cor do card baseada no tipo: Passiva (dourado), Ativa (azul), Ultimate (roxo)
- **Ultimate:** borda dupla + partículas de fundo + badge "1×/Combate"
- Hover: card expande suavemente + exibe informações completas

**Cards de Feitiços/Runas/Rituais:**
- Card compacto 160×200px
- Imagem (enviada pelo usuário) no topo, com fallback de ícone
- Nome + Tipo + Custo em linha
- Breve descrição (2 linhas, truncado)
- Click → modal com detalhes completos incluindo Dano/Efeito e descrição completa

---

### 5.5 Editor de Personagem — Painel de Evolução

**Rota:** `/character/:id/edit`  
**Componentes:** `editor.js` + `calculator.js`

#### Layout: Painel de Abas

```
[Atributos] [Habilidades] [Triagens] [Módulos] [Armas] [Feitiços] [Validação]
```

**Aba Atributos:**
- Formulário dos 6 atributos com spinners numéricos
- Pontos de Esqueleto disponíveis exibidos como pool
- Modificadores recalculam em tempo real
- HP/Energia/PE recalculados automaticamente com retroação por nível (Seção 12)
- **Histórico de distribuição:** linha do tempo mostrando quando cada ponto foi alocado

**Aba Habilidades:**
- Editor markdown para cada uma das 5 habilidades
- Calculador de PP em tempo real
- Botão de IA por habilidade
- Campo de `Custo de Energia`, `Duração`, `Dano`, `Tipo`

**Aba Feitiços:**
- Botão "+ Adicionar Feitiço/Runa/Ritual"
- Modal de upload com campos:
  - **Imagem:** upload com preview (redimensionado para 300×300px antes de salvar)
  - **Título:** nome do feitiço
  - **Tipo:** Feitiço / Runa / Ritual
  - **Categoria:** Classe A/B/C/S (Feitiço) | Menor/Média/Grande/Primordial (Runa) | 1°/2°/3° Círculo (Ritual)
  - **Custo:** campo livre
  - **Dano/Efeito:** campo livre
  - **Descrição:** textarea markdown
- Feitiços aparecem na ficha como cards clicáveis

**Aba Validação:**
- Relatório completo V01–V08 com explicações detalhadas
- Botão **"Análise de Balanceamento IA"** → chama o Balanceador IA

---

### 5.6 Biblioteca de Feitiços, Runas e Rituais

**Rota:** `/magic`  
**Componentes:** `spells.js` + `runes.js` + `rituals.js`

Esta é a tela de **referência do sistema** — um repositório de todos os feitiços, runas e rituais disponíveis para os jogadores consultarem.

> **Nota de Implementação:** Nesta primeira versão, os feitiços, runas e rituais são entidades **criadas pelos jogadores para seus personagens** (via formulário com imagem+título+descrição). A lista curada de 100+ itens de cada categoria será implementada na versão 2.0. Veja a Seção 9 para o esboço completo do catálogo.

#### Layout

```
BIBLIOTECA MÁGICA
══════════════════════════════════════════════════════════════

[FEITIÇOS] [RUNAS] [RITUAIS]          [Buscar...]  [Filtros ▼]

─── FEITIÇOS ────────────────────────────────────────────────

Filtros: ○ Todos  ○ Classe A  ○ Classe B  ○ Classe C  ○ Classe S

┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐
│ [Imagem]    │  │ [Imagem]    │  │ [Imagem]    │  │   [+]      │
│ Nome        │  │ Nome        │  │ Nome        │  │           │
│ Classe A    │  │ Classe S    │  │ Classe B    │  │  Adicionar │
│ Custo: 30E  │  │ Custo: 80E  │  │ Custo: 15E  │  │           │
│ Dano: 8d12  │  │ Dano: 20d12 │  │ Efeito: ... │  │           │
└─────────────┘  └─────────────┘  └─────────────┘  └───────────┘
```

#### Especificações

**Cards:**
- Grid responsivo: 4 colunas (desktop) / 2 colunas (tablet) / 1 coluna (mobile)
- Background com textura sutil baseada na categoria
- Hover: flip 3D do card revelando a descrição completa no verso (CSS transform: rotateY)
- Badge de categoria com cor: A=verde, B=azul, C=amarelo, S=vermelho+glow

**Modal de Detalhe:**
- Abre ao clicar com animação scale + fade
- Imagem grande no topo, descrição completa, atributos em grid
- Botão "Adicionar à Ficha" → permite vincular ao personagem ativo

**Busca:**
- Busca em tempo real (debounce 300ms) por nome + descrição
- Highlights dos termos encontrados

**Background Three.js:**
- Partículas em espiral lenta, cores variando por aba ativa (feitiços=laranja, runas=verde, rituais=roxo)

---

### 5.7 Balanceador IA

**Rota:** Modal sobreposto em qualquer tela  
**Componente:** `ai-client.js` + `balance-prompt.js`

O Balanceador IA é acessado via botão **"⚔ Analisar Ficha com IA"** na Ficha do Personagem e no Painel de Edição.

#### Interface

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚔ ORÁCULO DE OLYMPO — Análise de Balanceamento              ✕ │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Avatar do Personagem]   [Nome] · [Classe] · [N15]            │
│                                                                 │
│  ══════════════════════════════════════════════════════════     │
│  Analisando ficha... ████████████████████░░░░ 78%               │
│  ══════════════════════════════════════════════════════════     │
│                                                                 │
│  RELATÓRIO DO ORÁCULO:                                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ✅ HP (530): Dentro dos parâmetros N15 (380–560)        │  │
│  │  ✅ Ataque Base (+25): Camada 1 OK para N15             │  │
│  │  ⚠ Habilidade "Lâmina de Fogo" (PP=13/12): 8%          │  │
│  │     acima do orçamento. Sugestão: Reduzir duração       │  │
│  │     de 4 para 3 rodadas ou aumentar custo para 35E.     │  │
│  │  ✅ Ultimate: 14d12+55 (dentro do TDH N15)              │  │
│  │  ✅ PE sustentabilidade: 76 PE (~15 rodadas) — OK       │  │
│  │                                                          │  │
│  │  PONTUAÇÃO DE EQUILÍBRIO: 87/100 — Aprovado ✅          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  [Fazer perguntas ao Oráculo...]                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ "Como posso melhorar minha Ultimate sem violar o TDH?"   │  │
│  └──────────────────────────────────────────────────────────┘  │
│  [Enviar]                                                       │
└─────────────────────────────────────────────────────────────────┘
```

**Especificações:**
- Análise automática ao abrir o modal
- Streaming da resposta (token a token) com cursor animado
- Chat disponível para perguntas de follow-up após a análise
- Pontuação de 0–100 com barra animada
- Cada item do relatório é clicável e expande com explicação detalhada
- Botão "Exportar Relatório" → gera PDF/markdown do relatório

---

### 5.8 Tela de Raças *(Placeholder para implementação futura)*

**Rota:** `/races`  
**Status:** Estrutural — dados registrados, sem impacto sistêmico

> Esta tela existe para **catalogar e visualizar as raças do Sistema Olympo** e preparar a infraestrutura de dados para a implementação futura de bônus raciais sistêmicos.

#### Raças Catalogadas (Sem Efeito Sistêmico Atual)

As seguintes raças estão pré-registradas no banco de dados com descrição lore e imagem, mas **não concedem nenhum bônus mecânico** até a versão futura:

| ID | Raça | Tipo (Futuro) | Descrição Lore |
|---|---|---|---|
| 1 | Humano | Humano Aprimorado | Versáteis e adaptáveis, dominam o mundo moderno. |
| 2 | Anjo Caído | Semi-humano | Celestiais banidos que preservam fragmentos da graça divina. |
| 3 | Vampiro | Raça Sobrenatural | Imortais da noite, senhores da sedução e da escuridão. |
| 4 | Lobisomem | Raça Predatória | Herdeiros da fera, oscilam entre humanidade e fúria. |
| 5 | Golem | Semi-humano | Constructos de pedra e magia, leais e incansáveis. |
| 6 | Elfo das Sombras | Semi-humano | Elfos corrompidos pela escuridão, mestres da ilusão. |
| 7 | Dragônio | Raça Predatória | Descendentes de dragões, portam escamas e fogo nas veias. |
| 8 | Djinn | Raça Sobrenatural | Espíritos elementais aprisionados em forma mortal. |
| 9 | Necrômante Renascido | Raça Sobrenatural | Mortais que voltaram da morte com poderes sobre o fim. |
| 10 | Titã | Raça Lendária | Gigantes da era antiga, cujo sangue carrega a força de mundos. |

#### Layout da Tela

```
RAÇAS DO SISTEMA OLYMPO
═══════════════════════════════════════════════

  ⚠ NOTA: Raças atualmente são cosmético/lore.
     Bônus sistêmicos chegam em versão futura.

┌─────────────────────────────────────────────┐
│  [Filtrar por tipo: Todos / Semi / Predatório...]│
└─────────────────────────────────────────────┘

┌──────────┐  ┌──────────┐  ┌──────────┐
│ [Arte]   │  │ [Arte]   │  │ [Arte]   │
│ Vampiro  │  │ Lobisomem│  │ Dragônio │
│ Sobrenat.│  │ Predatór.│  │ Predatór.│
│ ─────    │  │ ─────    │  │ ─────    │
│ Lore...  │  │ Lore...  │  │ Lore...  │
│[+ Escolher]  [+ Escolher]  [+ Escolher]
└──────────┘  └──────────┘  └──────────┘
```

#### Implementação Futura — Estrutura Preparada

O schema do banco de dados (ver Seção 6) já possui a tabela `races` com campos para:
- `hp_bonus_pct` — bônus percentual de HP (Camada 2)
- `attack_bonus` — bônus de ataque racial máximo
- `damage_bonus` — dano racial em forma alternativa
- `passive_ability` — habilidade racial passiva (JSON)
- `ultimate_ability` — habilidade racial ultimate (JSON)

Quando implementado, a seleção de raça no Wizard (Passo 2.5, entre Esqueleto e Classe) aplicará automaticamente os bônus e os incluirá no relatório de balanceamento V01–V08.

---

### 5.9 Painel do Mestre

**Rota:** `/master`  
**Acesso:** Usuários com role `master` no Supabase

#### Layout

```
PAINEL DO MESTRE
══════════════════════════════════════════════════════════

CAMPANHA ATIVA: [_______________]    [+ Nova Campanha]

PERSONAGENS NA CAMPANHA:
┌──────────────────────────────────────────────────────┐
│  Avatar  Nome         Classe  Nível  Status Val.      │
│  [img]   Aldric       Guerr.  15     ✅ Aprovado       │
│  [img]   Syla         Mísico  15     ⚠ 1 Aviso        │
│  [img]   Rook         Operat. 15     ✅ Aprovado       │
└──────────────────────────────────────────────────────┘

RELATÓRIOS DE HOMOLOGAÇÃO:
┌──────────────────────────────────────────────────────┐
│  [Syla] — Habilidade "Vortex Arcano" (PP=15/14)      │
│  Excede orçamento em 7%. Sugestão da IA disponível.  │
│  [Ver Detalhes] [Aprovar mesmo assim] [Solicitar Rev]│
└──────────────────────────────────────────────────────┘

NPC REFERENCE (N15):
HP: 380–560 | Ataque: d20+25 | Defesa: d20+20
```

**Especificações:**
- Mestre pode **aprovar** ou **solicitar revisão** de fichas pendentes
- Aprovação envia notificação para o jogador (Supabase Realtime)
- Painel de NPC Reference baseado no nível da campanha para referência rápida
- Botão "Gerar NPC com IA" → cria ficha de NPC balanceada para o nível

---

## 6. Banco de Dados — Schema Supabase

### 6.1 Tabelas Principais

```sql
-- Usuários
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users,
  username    TEXT UNIQUE NOT NULL,
  role        TEXT DEFAULT 'player', -- 'player' | 'master' | 'admin'
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Personagens
CREATE TABLE characters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  class           TEXT NOT NULL, -- 'guerreiro' | 'operativo' | 'mistico'
  level           INTEGER NOT NULL DEFAULT 1,
  race_id         INTEGER REFERENCES races(id),
  avatar_url      TEXT,    -- URL no Supabase Storage (400x400px)
  avatar_thumb    TEXT,    -- URL thumbnail (80x80px)
  -- Atributos
  attr_for        INTEGER NOT NULL,
  attr_des        INTEGER NOT NULL,
  attr_con        INTEGER NOT NULL,
  attr_int        INTEGER NOT NULL,
  attr_apa        INTEGER NOT NULL,
  attr_am         INTEGER NOT NULL,
  -- Recursos calculados (cacheados)
  hp_total        INTEGER,
  energia_total   INTEGER,
  pe_total        INTEGER,
  ca              INTEGER,
  reactions       INTEGER,
  -- Metadados
  campaign_id     UUID REFERENCES campaigns(id),
  is_approved     BOOLEAN DEFAULT FALSE,
  validation_data JSONB,   -- Resultado das validações V01-V08
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Habilidades do Personagem
CREATE TABLE character_abilities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id    UUID REFERENCES characters(id) ON DELETE CASCADE,
  ability_type    TEXT NOT NULL, -- 'passive' | 'active' | 'ultimate'
  slot_order      INTEGER NOT NULL, -- 1-5
  name            TEXT NOT NULL,
  description     TEXT,
  energy_cost     INTEGER DEFAULT 0,
  duration        TEXT,
  range_text      TEXT,
  damage          TEXT,
  damage_type     TEXT,
  pp_score        INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Triagens Selecionadas
CREATE TABLE character_triages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id    UUID REFERENCES characters(id) ON DELETE CASCADE,
  triage_type     TEXT NOT NULL, -- 'primary' | 'sub'
  triage_id       TEXT NOT NULL, -- ex: 'soldado', 'assassino'
  triage_level    DECIMAL(2,1), -- 0.1 a 0.6
  acquired_at_lvl INTEGER
);

-- Módulos de Evolução do Personagem
CREATE TABLE character_modules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id    UUID REFERENCES characters(id) ON DELETE CASCADE,
  module_id       TEXT NOT NULL,
  current_uses    INTEGER DEFAULT 0,
  acquired_at_lvl INTEGER
);

-- Armas do Personagem
CREATE TABLE character_weapons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id    UUID REFERENCES characters(id) ON DELETE CASCADE,
  weapon_id       TEXT NOT NULL,
  weapon_rank     TEXT NOT NULL,
  slot_abilities  JSONB,
  is_primary      BOOLEAN DEFAULT FALSE
);

-- Perícias do Personagem
CREATE TABLE character_skills (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id    UUID REFERENCES characters(id) ON DELETE CASCADE,
  skill_id        TEXT NOT NULL,
  training_level  TEXT NOT NULL -- 'trained' | 'veteran' | 'specialist' | 'master'
);

-- Feitiços / Runas / Rituais (criados pelos jogadores)
CREATE TABLE magic_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id    UUID REFERENCES characters(id) ON DELETE CASCADE,
  item_type       TEXT NOT NULL, -- 'spell' | 'rune' | 'ritual'
  category        TEXT,          -- 'A'|'B'|'C'|'S' (feitiços) / 'menor'|'media'|'grande'|'primordial' (runas) / '1'|'2'|'3' (rituais)
  name            TEXT NOT NULL,
  description     TEXT,
  cost            TEXT,
  damage_effect   TEXT,
  image_url       TEXT,          -- Supabase Storage (300x300px)
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Raças (seed data + future expansion)
CREATE TABLE races (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  type            TEXT,          -- 'human' | 'semi' | 'predatory' | 'supernatural' | 'legendary'
  lore_text       TEXT,
  image_url       TEXT,
  -- Campos para implementação futura (NULL até ativação)
  hp_bonus_pct    DECIMAL(4,2)  DEFAULT NULL,
  attack_bonus    INTEGER        DEFAULT NULL,
  damage_bonus    TEXT           DEFAULT NULL,
  passive_ability JSONB          DEFAULT NULL,
  ultimate_ability JSONB         DEFAULT NULL,
  is_active       BOOLEAN        DEFAULT FALSE  -- FALSE = placeholder, TRUE = sistêmico
);

-- Campanhas
CREATE TABLE campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_id       UUID REFERENCES profiles(id),
  name            TEXT NOT NULL,
  level_range     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Logs de IA (para histórico de análises)
CREATE TABLE ai_analysis_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id    UUID REFERENCES characters(id),
  analysis_type   TEXT,   -- 'balance' | 'ability_creation' | 'npc_gen'
  input_snapshot  JSONB,
  ai_response     TEXT,
  score           INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.2 Política de Imagens (Supabase Storage)

```
Bucket: olympo-assets
  ├── avatars/
  │   ├── {character_id}/original.webp    (max 400×400px, max 150KB)
  │   └── {character_id}/thumb.webp       (80×80px, max 10KB)
  └── magic-items/
      └── {magic_item_id}/cover.webp      (300×300px, max 80KB)
```

**Pipeline de upload:**
1. Usuário seleciona imagem
2. Frontend usa `Canvas API` para redimensionar antes do upload
3. Converter para WebP (qualidade 80) via `canvas.toBlob('image/webp', 0.8)`
4. Upload para Supabase Storage
5. URL pública salva no banco

---

## 7. Integração com IA — Prompt Mestre

### 7.1 Arquitetura da Integração

O site faz chamadas diretas à API da Anthropic do frontend (via proxy Supabase Edge Function para não expor a chave).

```javascript
// src/ai/ai-client.js
async function callOracle(type, characterData, userMessage = '') {
  const response = await fetch('/api/ai-oracle', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${supabaseSession.access_token}` },
    body: JSON.stringify({ type, characterData, userMessage })
  });
  return response.body; // ReadableStream para streaming
}
```

### 7.2 Prompt Mestre de Balanceamento

Este prompt é enviado com a ficha completa do personagem para análise de balanceamento.

```
SISTEMA OLYMPO 2.0 — ORÁCULO DE BALANCEAMENTO

Você é o Oráculo do Sistema Olympo, especialista em balanceamento do RPG autoral Sistema Olympo 2.0. Sua função é analisar fichas de personagens e garantir que estejam dentro dos parâmetros matemáticos definidos pelo Protocolo de Expansão Épica Olympo.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SISTEMA DE REFERÊNCIA COMPLETO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TABELA DE MODIFICADORES:
[...tabela completa de modificadores por valor de atributo...]

SISTEMA DE CAMADAS DE PODER (SCP):
- Camada 1 (Base): Treino de Perícia + Modificador. ILIMITADA.
- Camada 2 (Tático - Habilidades/Triagens/Módulos): N1-7: +8 | N8-15: +12 | N16-22: +16 | N23-30: +20
- Camada 3 (Épico - Runas/Artefatos/Equipamentos): N1-7: +5 | N8-15: +8 | N16-22: +12 | N23-30: +16

TVP (TETO DE VIDA POR FONTES PASSIVAS):
- Passiva Racial: máx +60% Vida Base
- Habilidade Passiva: máx +40% Vida Base
- Runas/Artefatos/Equip: máx +30% por item (máx 2 itens)
- Quest/Bênção: máx +25% Vida Base
- TOTAL COMBINADO: máx +150% Vida Base (2,5× máximo)
- Energia: máx +120%; PE: máx +80%

TDH (TETO DE DANO POR HABILIDADE):
- N1-7: Ativa Fraca 3d8+12 | Média 4d10+18 | Forte 6d10+24 | Ult 8d12+30
- N8-15: Ativa Fraca 4d10+18 | Média 6d10+25 | Forte 9d12+32 | Ult 13d12+45
- N16-22: Ativa Fraca 6d12+25 | Média 8d12+38 | Forte 12d12+50 | Ult 17d12+65
- N23-30: Ativa Fraca 8d12+32 | Média 10d12+45 | Forte 14d12+60 | Ult 20d12+80

INDICADORES DE POTÊNCIA (PP):
- Bônus +5 ataque/defesa (temp): 3 PP
- Bônus +10 ataque/defesa (temp): 5 PP
- Bônus +15 ataque/defesa (temp, apenas N16+): 7 PP
- Vantagem no dado: 4 PP
- +1 Ataque Extra: 5 PP
- Dano ≤4d12 (ativa): 2 PP | 4d12 a 12d12: 4 PP | 13d12+ (ult): 6 PP
- +50% HP temp (≤3 rodadas): 3 PP | +100% HP temp (≤2 rodadas): 5 PP
- Regen passiva: 4 PP por 10%HP/rodada
- Ignorar armadura (total): 5 PP
- Efeito em área: +3 PP
- Imunidade total a tipo de dano (≤1 rodada): 6 PP

ORÇAMENTO DE PP:
- Passiva: N1-7: 5 | N8-15: 6 | N16-22: 7 | N23-30: 8
- Ativa Fraca: N1-7: 4 | N8-15: 5 | N16-22: 6 | N23-30: 7
- Ativa Média: N1-7: 6 | N8-15: 7 | N16-22: 8 | N23-30: 10
- Ativa Forte: N1-7: 8 | N8-15: 10 | N16-22: 12 | N23-30: 14
- Ultimate: N1-7: 10 | N8-15: 13 | N16-22: 16 | N23-30: 20

TABELA DE CALIBRAÇÃO:
- N5: HP 140-210 | Ataque base d20+8 a +12 | Máx SCP d20+21
- N10: HP 250-380 | Ataque base d20+12 a +16 | Máx SCP d20+28
- N15: HP 380-560 | Ataque base d20+15 a +20 | Máx SCP d20+36
- N20: HP 520-760 | Ataque base d20+18 a +23 | Máx SCP d20+43
- N25: HP 700-980 | Ataque base d20+22 a +26 | Máx SCP d20+50
- N30: HP 950-1350 | Ataque base d20+26 a +30 | Máx SCP d20+58

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FICHA DO PERSONAGEM A ANALISAR:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{CHARACTER_JSON}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSTRUÇÕES DE ANÁLISE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Execute as seguintes verificações e retorne um relatório estruturado:

1. VERIFICAÇÃO V01: HP Total ≤ TVP (2,5× Vida Base + HP por nível). Calcule a Vida Base da classe, o HP por nível, e compare com o HP total declarado.

2. VERIFICAÇÃO V02: Bônus de Camada 2. Some todos os bônus de habilidades passivas, triagens e módulos. Compare com o limite da faixa de nível.

3. VERIFICAÇÃO V03: Bônus de Camada 3. Se há runas/artefatos/equipamentos especiais declarados.

4. VERIFICAÇÃO V04: Para cada habilidade, classifique como Fraca/Média/Forte/Ultimate e compare o dano com o TDH.

5. VERIFICAÇÃO V05: Calcule as Reações totais. Avisar se > 5.

6. VERIFICAÇÃO V06: Calcule o PP de cada habilidade e compare com o orçamento.

7. VERIFICAÇÃO V07: Verifique se Energia total > 500 (inflação).

8. VERIFICAÇÃO V08: Verifique se Sobrecarga Arcana está combinada com Ultimate.

Para cada verificação, retorne:
- Status: ✅ OK | ⚠ Aviso | ✗ Erro
- Valor calculado vs. limite
- Sugestão de ajuste se necessário (específica e acionável)

Ao final, calcule uma PONTUAÇÃO DE EQUILÍBRIO de 0-100:
- 100: Ficha perfeita dentro de todos os parâmetros
- 85-99: Pequenos ajustes sugeridos, aprovada
- 70-84: Ajustes recomendados, aprovada com ressalvas
- 50-69: Ajustes necessários, aguarda revisão
- <50: Revisão obrigatória

Seja específico, preciso matematicamente, e construtivo nas sugestões.
Use linguagem temática do universo Olympo, mas mantenha a objetividade técnica.
```

### 7.3 Prompt de Criação de Habilidades

```
SISTEMA OLYMPO 2.0 — FORJADOR DE HABILIDADES

Você é o Forjador, responsável por criar habilidades equilibradas e temáticas para o Sistema Olympo 2.0.

CONTEXTO DO PERSONAGEM:
- Classe: {CLASS}
- Nível: {LEVEL}
- Atributos: FOR={FOR} DES={DES} CON={CON} INT={INT} APA={APA} AM={AM}
- Triagem Principal: {TRIAGE}
- Tipo de Habilidade a criar: {ABILITY_TYPE}
- Conceito do jogador: {PLAYER_CONCEPT}

LIMITES MATEMÁTICOS PARA ESTE PERSONAGEM:
- PP máximo disponível: {PP_BUDGET}
- TDH para este tipo: {TDH_LIMIT}
- Atributo primário para dano: {PRIMARY_ATTR} ({PRIMARY_MOD})

Crie UMA habilidade que:
1. Seja temáticamente coerente com classe, triagem e conceito
2. Esteja dentro do orçamento de PP
3. Tenha custo de Energia proporcional ao impacto
4. Inclua nome criativo e flavor text narrativo
5. Seja mecânicamente clara e sem ambiguidades

Formato da resposta:
NOME: [Nome épico da habilidade]
TIPO: [Passiva/Ativa Fraca/Ativa Média/Ativa Forte/Ultimate]
CUSTO: [X Energia / — se passiva]
DURAÇÃO: [X rodadas / permanente / instantâneo]
ALCANCE: [corpo-a-corpo / Xm / pessoal / área]
DANO: [dados + flat, ou —]
EFEITO: [descrição mecânica precisa]
FLAVOR: [1–2 frases narrativas do universo]
PP: [X/Y — dentro ou fora do orçamento]
BALANCEAMENTO: [Breve justificativa das escolhas]
```

---

## 8. Triagens Futuras — Propostas Balanceadas

> As triagens abaixo foram criadas e balanceadas via análise do sistema existente. Cada uma segue a mesma estrutura de 6 níveis, com escalonamento progressivo de custo e impacto.

---

### 8.1 Guerreiro — Berserker *(Nova)*

*Guerreiros que canalizam raiva pura em devastação incontrolável. Alto dano, baixa defesa.*

| Nível | Efeito |
|---|---|
| 0.1 | Ao receber dano, acumula 1 carga de Fúria (máx 5). Cada carga: +2 de dano no próximo ataque. |
| 0.2 | Ao atingir 3 cargas, o próximo ataque acerta com +1d8 adicional e reseta as cargas. |
| 0.3 | Gasta 8 PE para entrar em Modo Berserker: +5 de ataque e +1d10 dano por 3 rodadas, mas −3 CA. |
| 0.4 | Enquanto em Berserker: ataques críticos restauram 15 HP. |
| 0.5 | Ao cair abaixo de 30% HP, ativa Berserker automaticamente 1×/combate sem custo de PE. |
| 0.6 | Modo Berserker agora dura 5 rodadas e concede +2 Reações, mas impede uso de habilidades não-ofensivas. |

**Nota de Balanceamento:** O custo em CA (-3) durante Berserker compensa o ganho ofensivo. Em N20, o combo 0.3+0.6 resulta em +5 ataque + ~15.5 avg dano extra, dentro da Camada 2 (+16 máx N16-22).

---

### 8.2 Guerreiro — Guardião *(Nova)*

*Protetores que sacrificam ofensiva para garantir a sobrevivência dos aliados.*

| Nível | Efeito |
|---|---|
| 0.1 | Ao se posicionar adjacente a aliado, ambos recebem +2 CA. |
| 0.2 | Gasta 4 PE para criar Zona de Proteção de 3m; inimigos dentro têm −2 em ataques contra aliados. |
| 0.3 | 1×/combate, absorve o próximo ataque de um aliado a 5m com sucesso automático (rola defesa por ele). |
| 0.4 | Ao bloquear com sucesso, devolve 1d6 de dano ao atacante (reflexo de escudo). |
| 0.5 | Gasta 8 PE para criar Barreira de 1 rodada: aliados em 5m recebem −30% de todo dano. |
| 0.6 | Zona de Proteção agora aplica também Vantagem em Fortitude para aliados dentro dela. |

---

### 8.3 Operativo — Fantasma *(Nova)*

*Especialistas em desaparecer no momento crítico e atacar de ângulos impossíveis.*

| Nível | Efeito |
|---|---|
| 0.1 | Ao errar um ataque, pode gastar 2 PE para reposicionar 3m sem provocar ataques de oportunidade. |
| 0.2 | Ataques após movimento de 4m+ ganham +1d6 dano (momentum). |
| 0.3 | Gasta 6 PE para sumir por 1 rodada (invisibilidade total, não pode ser alvejado). |
| 0.4 | Ao reaparecer da invisibilidade, o primeiro ataque tem vantagem e +2d8 dano surpresa. |
| 0.5 | Pode gastar 10 PE para reposicionar qualquer distância (máx 15m) como ação de movimento. |
| 0.6 | 1×/combate, após qualquer dano sofrido, pode ativar invisibilidade imediatamente como reação. |

**Nota de Balanceamento:** Invisibilidade por 1 rodada (0.3) é equivalente a ~5 PP, dentro do orçamento N8-15. O combo 0.4+invisibilidade resulta em +2d8 (+9 avg) ao reaparecer — abaixo do TDH de Ativa Fraca N8-15 (4d10+18).

---

### 8.4 Operativo — Hacker *(Nova)*

*Especialistas em tecnologia que transformam o campo de batalha digital em arma.*

| Nível | Efeito |
|---|---|
| 0.1 | 1×/cena, hackeia sistema próximo (câmeras, portas, veículos) com teste INT vs. CD do Mestre. |
| 0.2 | Pode gastar 5 PE para hackear equipamento de inimigo: −2 no próximo ataque dele. |
| 0.3 | Cria drone de reconhecimento (3 PE): fornece percepção passiva +8 por 3 rodadas em área de 10m. |
| 0.4 | Explosivo EMP (10 PE): desativa equipamentos eletrônicos e causa 4d8+INT de dano em área de 5m. |
| 0.5 | Hack Profundo (8 PE, ação padrão): inimigo com equipamento eletrônico perde sua próxima ação (DT INT 16). |
| 0.6 | Sistema de overload: pode gastar 15 PE para que próximo hack cause efeito em todos os inimigos com equipamento na cena. |

---

### 8.5 Místico — Tecelão *(Nova)*

*Constroem feitiços em tempo real, combinando efeitos de formas imprevisíveis.*

| Nível | Efeito |
|---|---|
| 0.1 | Pode gastar 3 PE para adicionar um segundo efeito elementar a qualquer habilidade ativa (fogo/gelo/raio). |
| 0.2 | Ao conjurar 2 habilidades no mesmo turno (combo), a segunda custa −30% Energia. |
| 0.3 | Cria Núcleo de Magia: cristal flutuante que potencializa a próxima habilidade em +40% dano (dura 3 rodadas). |
| 0.4 | Ao dissipar o Núcleo de Magia prematuramente, libera explosão de 3d10 em 5m (dano de área). |
| 0.5 | Tecido Caótico (12 PE): a próxima habilidade tem efeito aleatório adicional (rola 1d6: 1=cura aliados; 2=atordoa; 3=teleporte; 4=dobra dano; 5=área 2×; 6=aplica todos). |
| 0.6 | Uma vez por combate, pode usar qualquer habilidade DUAS vezes no mesmo turno pagando 50% do custo extra. |

**Nota de Balanceamento:** Núcleo de Magia (+40% dano) combinado com Sobrecarga Arcana (+50%) poderia violar TDH. A validação V08 deve verificar também esse combo.

---

### 8.6 Místico — Arauto *(Nova)*

*Invocadores de entidades que lutam por eles, multiplicando a presença de campo.*

| Nível | Efeito |
|---|---|
| 0.1 | Invoca Espectro de Combate (8 PE): entidade com 50 HP que causa 1d8+AM/2 por rodada por 3 rodadas. |
| 0.2 | Espectro pode ser commandado como ação livre (sem custo de ação padrão). |
| 0.3 | Ao espectro ser destruído, explode causando 2d12+AM em 5m (inimigos apenas). |
| 0.4 | Pode invocar 2 Espectros simultâneos gastando 14 PE. |
| 0.5 | Espectro agora aplica uma das condições do Místico ao acertar (escolhida na invocação). |
| 0.6 | 1×/sessão, invoca Entidade Maior: 200 HP, dano 3d10+AM, dura até o fim do combate. |

**Nota de Balanceamento:** A Entidade Maior (0.6) é 1×/sessão e representa ~20 PP — o limite máximo de Ultimate N23-30. Aprovado desde que nível mínimo de 0.6 seja N23+.

---

## 9. Feitiços, Runas e Rituais — Catálogo Base

> **Fase Atual:** Os feitiços, runas e rituais existem como entidades criadas pelos jogadores via upload (imagem + título + descrição). O catálogo curado abaixo representa a **visão para a versão 2.0** — uma biblioteca pré-populada consultável por todos os usuários.

> A lista completa de 100+ itens por categoria será desenvolvida em parceria com o Mestre, mas o schema e a estrutura de apresentação já estão implementados desde a v1.0.

### 9.1 Feitiços de Classe (Estrutura)

| Classe | Custo Energético | Potência | Quantidade Planejada |
|---|---|---|---|
| **Classe C** | 5–20 Energia | Básica (≤4d10) | 30 feitiços |
| **Classe B** | 20–45 Energia | Intermediária (4d10–9d12) | 35 feitiços |
| **Classe A** | 45–80 Energia | Alta (9d12–14d12) | 25 feitiços |
| **Classe S** | 80+ Energia | Épica (≥14d12 ou efeito único) | 15 feitiços |

**Exemplos de Classe S (para referência de design):**

| Nome | Custo | Dano/Efeito | Nível Mínimo |
|---|---|---|---|
| Apocalipse Arcano | 100E | 20d12+AM em área de 15m (1×/sessão) | N23+ |
| Convergência Temporal | 80E | Reverte o turno (alvo age novamente) | N20+ |
| Dissolução da Realidade | 90E | Alvo é banido por 1d4 rodadas (DT AM 25) | N25+ |
| Grande Invocação | 95E | Invoca aliado NPC épico por 1 cena | N20+ |

### 9.2 Runas (Estrutura)

| Categoria | Potência | Bônus Típico | Quantidade Planejada |
|---|---|---|---|
| **Menores** | Camada 3 N1-7 (+5) | +1d4 dano / +2 CA / resistência 10% | 40 runas |
| **Médias** | Camada 3 N8-15 (+8) | +1d8 dano / +4 CA / resistência 20% | 35 runas |
| **Grandes** | Camada 3 N16-22 (+12) | +2d6 dano / +6 CA / imunidade parcial | 20 runas |
| **Primordiais** | Camada 3 N23-30 (+16) | +3d8 dano / efeito único / transformação | 10 runas |

### 9.3 Rituais (Estrutura)

| Círculo | Tempo | Custo | Efeito |
|---|---|---|---|
| **1° Círculo** | 10 min | 5–15 PE | Efeitos menores de preparação e buff |
| **2° Círculo** | 1 hora | 15–30 PE | Efeitos significativos (invocação menor, cura em área, proteção) |
| **3° Círculo** | 8 horas | 30+ PE | Efeitos épicos (ressurreição, criação de artefato, mudança permanente) |

---

## 10. Roadmap de Funcionalidades

### Versão 1.0 — MVP *(Escopo deste PRD)*

- [x] Autenticação (email + Google + Discord)
- [x] Dashboard com cards de personagens
- [x] Wizard de criação de personagem (10 passos)
- [x] Ficha completa do personagem com todas as seções
- [x] Editor de personagem com todas as abas
- [x] Validações automáticas V01–V08
- [x] Feitiços/Runas/Rituais como entidades criadas pelo jogador (upload + formulário)
- [x] Balanceador IA (análise + chat)
- [x] Assistente IA para criação de habilidades
- [x] Tela de Raças (placeholder + lore)
- [x] Painel básico do Mestre
- [x] Three.js backgrounds por tela
- [x] Animações GSAP completas
- [x] Upload de avatar com resize (Canvas API → WebP)
- [x] Schema Supabase completo

### Versão 1.5 — Expansão Social

- [ ] Sistema de campanhas com múltiplos jogadores
- [ ] Chat em tempo real na campanha (Supabase Realtime)
- [ ] Histórico de sessões com log de eventos
- [ ] Compartilhamento público de ficha (link readonly)
- [ ] Notificações de aprovação/revisão do Mestre

### Versão 2.0 — Biblioteca Curada + Raças Sistêmicas

- [ ] Catálogo de 100+ feitiços (Classe A/B/C/S)
- [ ] Catálogo de 100+ runas (Menor/Média/Grande/Primordial)
- [ ] Catálogo de 100+ rituais (1°/2°/3° Círculo)
- [ ] Raças com bônus sistêmicos ativados
- [ ] Novas triagens (Berserker, Guardião, Fantasma, Hacker, Tecelão, Arauto)
- [ ] Modo Combate: tracker de HP/PE/Energia em tempo real na mesa

### Versão 2.5 — Ferramentas do Mestre

- [ ] Gerador de NPC com IA balanceado por nível
- [ ] Bestiary com fichas de monstros/inimigos
- [ ] Planejador de encontros com estimativa de dificuldade
- [ ] Exportação de fichas em PDF

### Versão 3.0 — Plataforma Completa

- [ ] App mobile (PWA ou React Native)
- [ ] Modo offline (Service Worker)
- [ ] Sistema de conquistas e progressão de usuário
- [ ] Marketplace de habilidades criadas pela comunidade
- [ ] Integração com VTT (Virtual Tabletop) via API

---

## 11. Notas de Balanceamento Formais

Esta seção registra formalmente os ajustes e ressalvas identificados pelas simulações, para referência do Mestre durante a homologação de fichas no sistema.

### 11.1 Interpretação do TVP

O Teto de Vida por Fontes Passivas se aplica **exclusivamente sobre bônus externos ao crescimento natural da classe**. A fórmula correta é:

```
TVP_máximo = Vida_Base_Classe × 2.5
Fontes passivas sujeitas ao TVP = Bônus Racial + Bônus Habilidade Passiva + Bônus Runas/Artefatos + Bônus Bênçãos

O HP por Nível (crescimento natural da classe) NÃO é contabilizado no TVP.
```

### 11.2 Sobrecarga Arcana e Ultimate

A combinação de Sobrecarga Arcana (+50% dano) com a Ultimate viola o TDH em todas as faixas de nível em aproximadamente 50%. **Recomendação oficial:** Sobrecarga Arcana não se aplica a Ultimates (o Módulo "Conhecimento Amplificado" explicitamente exclui Ultimates — a mesma lógica se aplica à Sobrecarga Arcana).

### 11.3 Cap de Reações

Para Operativos com Triagem Assassino 0.2, o número de Reações pode exceder 5 em N15+. O sistema exibe aviso automático. **Recomendação opcional para Mestres:** cap de 5 Reações/rodada para classes não-Guerreiro.

### 11.4 Energia do Místico/Intuitivo

Em N30 com Intuitivo 0.1 + Reserva Arcana, a Energia ultrapassa 500 pontos — eliminando efetivamente a gestão de recursos. O sistema exibe aviso V07. O Mestre pode compensar criando inimigos com habilidades de drenagem de Energia ou aumentando os custos das habilidades do personagem.

### 11.5 Ranges de HP e Bônus Passivos

As faixas de HP na Tabela de Calibração (Seção 14.7) **pressupõem** que os personagens possuem bônus passivos de Triagens e itens. Personagens sem bônus passivos ativos estarão no piso inferior dos ranges, o que é matematicamente correto e não constitui bug.

---

*Sistema Olympo — Portal de Fichas · PRD v1.0*  
*Documento gerado com base em análise completa do Sistema Olympo 2.0 e 5.000+ simulações de combate.*  
*Próxima revisão após implementação do MVP.*

---
