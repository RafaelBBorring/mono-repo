# System-Drako — Guia de Contexto para Agentes

## Visão Geral
System-Drako é um **forjador de fichas de RPG** baseado em um sistema de **d6 puro, por atributos, sem perícias**. O produto serve principalmente ao **Mestre** que precisa criar **muitos NPCs rapidamente**. Tudo roda **localmente** no navegador (IndexedDB), com IA opcional (Oráculo via OpenRouter) e um **quadro infinito** para mestrar combates.

## Stack
- **Frontend**: React 18 + Vite 5 (JSX, sem TypeScript)
- **Estilo**: Tailwind CSS 3 + Bootstrap 5 + CSS custom (`src/index.css`)
- **3D**: Three.js (backdrop WebGL — `MysticBackdrop.jsx`)
- **Anim**: GSAP + CSS keyframes + IntersectionObserver
- **DB local**: IndexedDB via `idb` (`src/lib/db.js`)
- **IA**: OpenRouter (`src/lib/ai.js` + `src/ai/prompts/`)
- **Export**: jsPDF + html2canvas (lazy — `src/lib/exporters.js`)
- **Deploy**: Docker multi-stage (Node build → Nginx serve)

## Identidade Visual
- **Paleta**: preto profundo + dourado + brasas (#f2661b). NUNCA verde/amarelo/azul soltos.
- **Tom**: místico, lendário, peso — nível de estúdio.
- **Fontes**: Fraunces (display), Lexend (corpo), JetBrains Mono (stats).
- **Cores de recurso**: Vida=verde, Energia=laranja, PE=roxo. Sempre aplicadas para reconhecimento instantâneo.
- **Cores de habilidade**: Passiva=verde, Ativa=dourado, Ultimate=brasa (#f2661b).
- **Glassmorphism** escuro com bordas douradas finas.

## Sistema RPG — Regras Core
- **Dados**: só d6. Sucesso = 4,5,6. Dificuldade = nº de sucessos (1 trivial → 5+ lendária).
- **7 Atributos** (1–10): FOR, AGI, PER, INT, VON, PRE, AM. Mínimo 1. 3=comum, 6=pico humano, 7=sobre-humano, 10=absoluto.
- **Recursos**: Vida=`FOR*2+VON+15` (+ bônus do nível) · Energia=`AM*5` · PE=`VON*2+AGI`.
- **Ação combinada**: menor dos dois atributos; maior ≥6 → +2d6; 4–5 → +1d6; ≤3 → +0.
- **PE**: 1 PE antes da rolagem = +2d6. **Condições**: ±1d6 (máx uma de cada).
- **Níveis de início**: Recruta(14/cap3), Iniciante(21/cap4/+5/5/2), Veterano(28/cap6/+10/15/5), Elite(35/cap8/+20/30/10), Lenda(42/cap10/+35/50/18). (Vida máx exemplo: 24/32/43/59/80.)
- **Combate — duas rolagens**: (1) **Acerto**: atacante rola o atributo relevante em d6, conta sucessos, precisa atingir dificuldade 2; defensor rola AGI — sucessos iguais/maiores = esquiva total. (2) **Dano**: se o golpe passou, rolam-se os dados de dano da arma e **somam-se** os valores (sem contar sucessos); bruto − Absorção = dano final.
- **Armas** (`data/weapons.js`): cada uma define `hitAttr`, `damage` (nº de d6 somados), `attacks` (1/2), `peCost`, `dodgePenalty` (d6 subtraídos da esquiva do portador), `ocultavel`, `socialReach`, `reload` (rodadas; AGI 6+ reduz 1). Magia (`ignoresArmor`) ignora Absorção; dano mágico 1d6–5d6 (menor→celeste). Ambiental 2d6–6d6+ sem acerto.
- **Ações alternativas** (`data/combat.js` → `ALT_ACTIONS`): Empurrar (FOR+AGI, dif 2 → Desequilibrado), Desarmar (AGI+PER, dif 3/4 com FOR 7+), Segurar (FOR+VON vs FOR+AGI → Preso; aliados ignoram esquiva), Criar Abertura (PER+PRE, dif 2 → Exposto, +2d6 no próximo dano).
- **Defesa**: Esquiva (AGI, pool nunca < 1d6); Absorção (FOR): 1-2→0, 3-4→3, 5-6→4, 7-8→6, 9-10→8. **Magia ignora Absorção**. Absorção pode ser sobreposta manualmente via `resources.absorbOverride` (`effectiveAbsorption()`).
- **Morte**: Vida 0 = crítico; 1d6/rodada (1-2 piora, 3+ estável); 3 pioras sem intervenção = morte.
- **Habilidades**: 1 passiva (sem energia) + 3 ativas + 1 ultimate (consomem energia), com **tags** coloridas.
- **Migração**: `lib/migrate.js` roda uma vez (setting `schemaVersion=2`); bumpa Vida de fichas full-health em +5 (constante 10→15) e limpa overrides de máximo.

## Estrutura
```
src/
├── data/         regras puras (attributes, startingLevels, weapons, magic, combat)
├── lib/          calculator, dice, db, ai, storage, exporters, character, id
├── ai/prompts/   systemRules + autoCharacter + abilities + balance
├── contexts/     ToastContext
├── hooks/        useHashRoute
└── components/   backdrop · layout · ui · library · sheet · wizard · canvas · ai · home
```
Rotas (hash): `#/` Home · `#/biblioteca` · `#/novo` · `#/ficha/:id` · `#/quadros` · `#/quadro/:id`.

## Convenções
- JSX sem TS. **Não adicionar comentários** salvo pedido explícito.
- Imports relativos (atentar à profundidade em subpastas).
- Lazy-load de chunks pesados (Three, jsPDF, html2canvas).
- `vite build` deve passar limpo antes de qualquer entrega.
- Env só com prefixo `VITE_` chega ao cliente.
- Tudo deve funcionar **offline** (banco local, IA opcional).

## Agentes do projeto
Ver `agents/README.md`. Seis agentes: CEO, Design, Regras, Balanceamento, UI, Desenvolvimento.
