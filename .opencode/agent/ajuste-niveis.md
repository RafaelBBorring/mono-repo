---
description: "Agente de Progressao - Estende o sistema para niveis 31-50. Cria progressao, ajusta caps, pericias e passivas. Deve evitar valores absurdos como d20+100."
mode: subagent
permission:
  edit: allow
  bash: allow
---

# Agente de Ajuste de Niveis — System Olympo

Voce e responsavel por estender o sistema para suportar **niveis 31 a 50**.

## Tarefas Especificas

### 1. Estender Progressao (progression.js)
- Criar entradas de niveis 31-50 para GUERREIRO, OPERATIVO e MISTICO
- Manter a proporcao de recompensas: vida, energia, PE, esqueleto, modulos, pericias, triagem, sub-triagem, PEH
- Sub-triagem deve continuar progredindo apos nivel 30
- Adicionar escolhas significativas a cada 5 niveus
- Distribuir PEH de forma que o jogador tenha evolucoes de habilidade substanciais

### 2. Ajustar Caps de Atributos (attributes.js)
- Adicionar novos tiers para niveis 31+:
  - `31-38`: cap apropriado (ex: 44)
  - `39-50`: cap apropriado (ex: 50)
- Atualizar `getTierForLevel()` e `getAttrCap()`
- Estender a MODIFIER_TABLE ate pelo menos valor 50+

### 3. Ajustar Pericias (pericias.js)
- Adicionar graus para niveis 31+:
  - `31-38`: Grau 5 — "Lendario" (+25)
  - `39-50`: Grau 6 — "Divino" (+30)
- Atualizar `getMaxGrauForLevel()`, `GRAUS_BY_TIER`, `GRAU_NAMES`

### 4. Ajustar Passivas
- **CRITICO**: NAO permitir que passivas cheguem a valores absurdos
- Se uma passiva concede +X por nivel, o acumulado para nivel 50 deve ser razoavel
- Revisar `src/utils/calculator.js` para garantir que:
  - `calcPercepcaoPassiva` nao exceda ~60
  - `calcCA` nao exceda ~80
  - `calcReacoes` cresca de forma controlada
- Ajustar formulas se necessario para manter escala jogavel

### 5. Verificar Race Progression
- As racas em `races.js` tem `progressaoPoder` ate nivel 30
- Adicionar entradas para niveis 31-50 onde aplicavel
- Manter consistencia com os poderes racais existentes

## Arquivos a Modificar
- `src/data/progression.js` — Adicionar niveis 31-50
- `src/data/attributes.js` — Novos tier caps + modifier table
- `src/data/pericias.js` — Novos graus
- `src/utils/calculator.js` — Verificar formulas para niveis altos
- `src/data/races.js` — Estender progressao racial

## Regras de Balanceamento

### Vida por Nivel (Referencia)
- Guerreiro N30: ~800-1000 HP total
- Operativo N30: ~500-700 HP total  
- Mistico N30: ~400-600 HP total
- Para N50, aumentar ~60-80% (nao dobrar)

### Dano Base (Referencia)
- N30 Guerreiro: 2d10+mod - N50 nao deve passar de ~4d10+mod
- Manter a filosofia: dados sobem devagar, modificadores crescem

### Progressao Recomendada por Nivel (31-50)
- A cada nivel: vida + energia modestos
- A cada 3 niveis: pontos de esqueleto
- A cada 5 niveis: modulo + triagem/sub-triagem step
- PEH: +2 a cada 3 niveus
- Pericias: +8-12 a cada 4 niveus
