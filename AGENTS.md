# System-Olympo — Guia de Contexto para Agentes

## Visao Geral
System-Olympo 3.0 e um sistema de gestao de personagens de RPG com tematica grega (mitologia). Permite criacao, gerenciamento e balanceamento de fichas de personagens, com integracao de IA (Oracle) para balanceamento de habilidades.

## Stack Tecnica
- **Frontend**: React 19 + Vite 7 + Tailwind CSS 3.4
- **Database/Auth**: Supabase (anon + service_role keys)
- **IA**: OpenRouter via Supabase Edge Functions (Gemma 4 26B free) + Pollinations fallback
- **3D/Visualizacao**: Three.js (backdrop WebGL), Chart.js (radar atributos), GSAP (animacoes)
- **Deploy**: Docker (Nginx) + GitHub Pages (SPA hash routing)
- **Fontes**: Cinzel (titulos), Newsreader (corpo), JetBrains Mono (stats)
- **Icones**: Material Symbols Outlined

## Estrutura de Diretorios
```
src/
├── ai/prompts/          — Prompts para IA (balance, abilities, weapons, etc.)
├── components/          — Componentes React (CharacterCenter, steps, library, admin)
├── components/steps/    — 12 steps do wizard de criacao
├── contexts/            — AuthContext (Supabase auth)
├── data/                — Dados estaticos (racas, classes, progressao, raceTrees, etc.)
├── hooks/               — useCharacter (localStorage draft)
├── lib/                 — supabase.js (cliente)
├── services/            — aiService.js (Oracle), alchemyService, uploadService
└── utils/               — calculator.js (central), raceCalculator, skillEvolution, etc.
```

## Sistema RPG — Regras Core

### Atributos (6)
FOR (Forca), DES (Destreza), CON (Constituicao), INT (Inteligencia), APA (Aparencia), AM (Aura Magica)
Modificador = floor((valor - 10) / 2)

### Classes (3)
- **Guerreiro**: Alta vida, dano 2d10+FOR, 4 pericias, 16 PE base, PEH 16
- **Operativo**: Equilibrado, dano 2d8+FOR, 5 pericias, 12 PE base, 3 PE/nivel, PEH 18
- **Mistico**: Alta energia, dano 2d6+FOR, 6 pericias, 14 PE base, PEH 20

### Niveis (1-50)
- Progressao definida em `progression.js` com recompensas por nivel
- Tiers de caps: 1-7 (20), 8-13 (26), 14-22 (32), 23-30 (38), 31-38 (44), 39-44 (50), 45-50 (55)
- Pericias: Graus 1-4 (Treinado +5 a Mestre +20)

### Triagens (Subclasses - 12 total)
4 por classe, 6 niveis cada (0.1 a 0.6)

### Racas (13)
4 categorias: Humanoides (3), Sobrenaturais (3), Predatorias (2), Lendarias (5)
Arvore de Habilidades Racial: Pontos de Ancestralidade (PAR), habilidades ativas gated a nivel 30+

### Habilidades e Balanceamento PEH v3.0
Cada personagem tem: 1 Passiva + 3 Ativas + 1 Ultimate + Extras
- **PEH Escala com Retornos Decrescentes**: Energia escala como `PEH^0.65`, Dano/Cura como `PEH^0.70`
- **DELTAS Base** (reduzidos ~60% vs v2.0): ULTIMATE energia 20/PEH, FORTE 14, MEDIA 10, FRACA 6
- **Regra dos 45%**: Nenhuma habilidade pode custar mais de 45% da Energia total do personagem
- **Protocolos**: SCP (Camadas de Poder), TDH (Teto de Dano), IPL (Pontos de Poder), LCP (Limite Cumulativo)
- Oracle (IA) balanceia usando prompts em `src/ai/prompts/balanceSystemPrompt.js`

### Soft-Skills (antigos Modulos de Evolucao)
- 2 tipos: Passivas (20) e Ativas (20), sem categoria Especiais
- Cada compra concede bonus permanente; algunas tem multipla compra (maxBuy)
- Presets disponiveis para selecao rapida

## Character Center (Dashboard v3.0)
- Sidebar com 4 abas: Personagem, Raca, Conhecimentos, Inventario
- Personagem: hero, recursos, combate, atributos (radar), pericias, habilidades (modal expansivel), soft-skills (hover tooltips), habilidades raciais ativas
- Raca: poderes raciais, fraquezas, arvore visual (RaceSkillTree)
- Conhecimentos: alquimia, feiticaria, runas, magia (library sections)
- Inventario: ResidentInventorySection (grid slots, mochilas, rotacao, transferencia)
- Botao "Modelo Legado" retorna a Step11Review (ficha detalhada antiga)

## Codex-Arcanum (Sistema de NPCs)
- Criacao de fichas de NPC para o mestre
- 3 perfis: Guerreiro (d10), Especialista (d8), Mistico (d6)
- Niveis 5-40 com interpolacao entre niveis-chave
- Banco local: IndexedDB com export/import

## Convencoes de Codigo
- Componentes React em JSX (sem TypeScript)
- Estado global minimo — props + context
- Hash routing (#/) sem router externo
- Tailwind classes + CSS custom em index.css
- Comentarios: NAO adicionar comentarios a menos que solicitado
- Estilo: "Archivist Codex" (dark + gold + glassmorphism)

## URLs Importantes
- Supabase Project: wmkswavqtqyfcjuiwtbw
- Edge Functions: openrouter-chat, openrouter-proxy
- Codex-Arcanum original: apps/codex-arcanum/
