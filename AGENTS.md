# System-Olympo — Guia de Contexto para Agentes

## Visao Geral
System-Olympo 2.0 e um sistema de gestao de personagens de RPG com tematica grega (mitologia). Permite criacao, gerenciamento e balanceamento de fichas de personagens, com integracao de IA (Oracle) para balanceamento de habilidades.

## Stack Tecnica
- **Frontend**: React 19 + Vite 7 + Tailwind CSS 3.4
- **Database/Auth**: Supabase (anon + service_role keys)
- **IA**: OpenRouter via Supabase Edge Functions (Gemma 4 26B free) + Pollinations fallback
- **3D**: Three.js (backdrop WebGL)
- **Deploy**: Docker (Nginx) + GitHub Pages (SPA hash routing)
- **Fontes**: Cinzel (titulos), Newsreader (corpo), JetBrains Mono (stats)
- **Icones**: Material Symbols Outlined

## Estrutura de Diretorios
```
src/
├── ai/prompts/          — Prompts para IA (balance, abilities, weapons, etc.)
├── components/          — Componentes React (steps do wizard, library, admin)
├── components/steps/    — 11 steps do wizard de criacao
├── contexts/            — AuthContext (Supabase auth)
├── data/                — Dados estaticos do sistema (racas, classes, progressao, etc.)
├── hooks/               — useCharacter (localStorage draft)
├── lib/                 — supabase.js (cliente)
├── services/            — aiService.js (1175+ linhas, Oracle), alchemyService, uploadService
└── utils/               — calculator.js (central), raceCalculator, skillEvolution, etc.
```

## Sistema RPG — Regras Core

### Atributos (6)
FOR (Forca), DES (Destreza), CON (Constituicao), INT (Inteligencia), APA (Aparencia), AM (Aura Magica)
Modificador = floor((valor - 10) / 2)

### Classes (3)
- **Guerreiro**: Alta vida, dano 2d10+FOR, 4 pericias, 16 PE base
- **Operativo**: Equilibrado, dano 2d8+FOR, 5 pericias, 12 PE base
- **Mistico**: Alta energia, dano 2d6+FOR, 6 pericias, 14 PE base

### Niveis (Atual: 1-30 | Objetivo: 1-50)
- Progressao definida em `progression.js` com recompensas por nivel
- Tiers de caps: 1-7 (20), 8-13 (26), 14-22 (32), 23-30 (38)
- Pericias: Graus 1-4 (Treinado +5 a Mestre +20)

### Triagens (Subclasses - 12 total)
4 por classe, 6 niveis cada (0.1 a 0.6)
Ex: Tatico, Lutador, Tank, Soldado (Guerreiro)

### Racas (13)
4 categorias: Humanoides (3), Sobrenaturais (3), Predatorias (2), Lendarias (5)

### Habilidades
Cada personagem tem: 1 Passiva + 3 Ativas + 1 Ultimate + Extras
Oracle (IA) balanceia com base em TDH, IPL/PP, protocolo SCP

## Codex-Arcanum (Sistema de NPCs a Integrar)
- Criacao de fichas de NPC para o mestre
- 3 perfis: Guerreiro (d10), Especialista (d8), Mistico (d6)
- Niveis 5-40 com interpolacao entre niveis-chave
- CD/Nivel de Ameaça: 0.25 (Horda) a 20 (vs 20 PCs)
- Banco local: JSON via Flask (migrar para IndexedDB)
- Board infinito: Canvas com pan/zoom
- Avatar editor: Drag + zoom estilo Miro

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
