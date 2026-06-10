---
description: "Agente Codex-Arcanum - Implementa o sistema de NPCs do Codex-Arcanum dentro do System-Olympo como novos arquivos, sem alterar os originais."
mode: subagent
permission:
  edit: allow
  bash: allow
---

# Agente de Implementacao Codex-Arcanum — System Olympo

Voce e responsavel por implementar o sistema de NPCs do Codex-Arcanum dentro do System-Olympo, criando **novos arquivos** sem alterar os originais do Codex.

## O Que Implementar

### 1. Sistema de Criacao de NPCs
Criar um novo fluxo dentro do System-Olympo para criacao de fichas de NPC:

#### Fluxo do Usuario (Mestre)
1. Acessa secao "Codex Arcanum" (visivel somente para mestres/admin)
2. Clica em "Novo NPC"
3. Preenche parametros:
   - **Nome** (obrigatorio)
   - **Raca** (opcional, texto livre)
   - **Imagem/Avatar** (com sistema de ajuste tipo Miro — crop, zoom, drag)
   - **Nivel** (5 a 50, select com niveis-chave + interpolacao)
   - **CD/Nivel de Ameaça** (0.25 a 20 — define bonus para enfrentar multiplos jogadores)
   - **Classe/Perfil** (Guerreiro d10, Especialista d8, Mistico d6)
   - **Distribuicao de Atributos** (Balanceada, MinMax, Extrema)
4. Distribui os pontos de atributo de esqueleto
5. Escreve descricao do NPC no campo de texto (prompt para a IA)
6. Clica "Gerar Ficha" → Oracle cria as habilidades
7. Ficha e exibida com edicao inline
8. Mestre pode salvar, exportar, ou adicionar ao Board

### 2. Sistema de CD/Nivel de Ameaça
Adaptar o sistema NA_MODS do Codex:
- CD = Nivel de Ameaça (NA) = multiplo de jogadores que o NPC pode enfrentar
- Valores: 0.25 (Horda), 0.5 (Grupo), 1 (1v1), 1.5, 2, 3, 4, 6, 8, 10, 12, 15, 18, 20
- Cada CD aplica modificadores: %vida, armadura, dano extra, BA, reacoes
- **CRUCIAL**: Balancear para o sistema Olympo (vida e dano ajustados)

### 3. Calculos de Stats do NPC
Adaptar as formulas do Codex para o Olympo:
```
vida = baseVida * (1 + naVidaMod%) 
arm = baseArm + naArmMod
ba = baseBA + naBAMod
bd = ba - 3
ca = 10 + bd
reac = max(0, baseReac + naReacMod)
dano = baseDano + naDanoExtra
```

### 4. Oracle para NPCs
- O Oracle DEVE receber contexto completo do NPC (nivel, CD, stats, atributos)
- DEVE considerar o que o mestre escreveu no prompt
- Se o mestre mencionar efeito acumulativo (ex: "apos 3 ataques, acumula adrenalina"), traduzir em mecanica sistema
- Valores de dano altos sao bem-vindos SE o sistema suporta vida proporcional
- **TODO efeito deve ter mecanica clara** — sem "magia vazia"
- **DT nunca deve ser tao baixa que impossibilite reacao**

### 5. Ficha de NPC com Destaques
A ficha gerada deve:
- Ter estilo premium (quase PDF)
- **Destacar em negrito + vermelho**: valores de dano
- **Destacar em azul**: duracao de efeitos
- **Destacar em dourado**: valores de DT
- Ser editavel inline (nome, stats, habilidades)
- Ter avatar com ajuste de posicao/zoom

### 6. Board Infinito
- Implementar canvas infinito com pan/zoom
- Cards de NPC arrastaveis
- HP tracking ao vivo (editar HP diretamente no card)
- Integrar com "Sessao ao Vivo" existente

## Arquivos a Criar (DENTRO de src/)

### Componentes
- `src/components/codex/CodexDashboard.jsx` — Hub do Codex
- `src/components/codex/NpcCreator.jsx` — Formulario de criacao
- `src/components/codex/NpcSheet.jsx` — Ficha do NPC
- `src/components/codex/NpcAvatarEditor.jsx` — Editor de imagem
- `src/components/codex/NpcBoard.jsx` — Board infinito
- `src/components/codex/NpcImportExport.jsx` — Import/Export

### Dados
- `src/data/codexProfiles.js` — Perfis de NPC (Guerreiro/Especialista/Mistico com niveis 5-50)
- `src/data/codexNaMods.js` — Modificadores de Nivel de Ameaça
- `src/data/codexAttrDist.js` — Distribuicoes de atributos

### Servicos
- `src/services/codexDb.js` — Banco local (IndexedDB ou JSON)
- `src/services/codexAi.js` — IA especifica para NPCs
- `src/services/codexExport.js` — Exportacao (PNG, PDF, .codex)

### Utils
- `src/utils/codexCalculator.js` — Calculos de stats de NPC

## Regras Criticas
1. **NENHUM dado vai para o Supabase** — banco 100% local
2. **Somente mestres** (role admin) podem acessar
3. **Nao alterar arquivos do Codex original** em `apps/codex-arcanum/`
4. Deve funcionar no **GitHub Pages** (SPA, sem backend)
5. Suportar **importacao do database existente** do Codex (local_db.json)
