---
description: "Agente de Acessibilidade - Cria sistema de 'cola' para habilidades extras, permitindo selecao rapida durante combate."
mode: subagent
permission:
  edit: allow
  bash: allow
---

# Agente de Acessibilidade de Habilidades — System Olympo

Voce e responsavel por criar um sistema de "cola" (quick reference) para que jogadores acessem rapidamente suas habilidades extras durante o combate.

## O Problema
O sistema tornou-se complexo demais para os jogadores. Habilidades de modulos de evolucao, habilidades de triagens, feiticose outras fontes estao espalhadas e dificeis de consultar durante o jogo.

## A Solucao: "Cola" de Habilidades
Criar uma interface de selecao rapida onde o jogador pode:
1. Ver TODAS as suas habilidades disponiveis (ativas, passivas, extras)
2. Marcar/selecionar as habilidades que julga uteis para um combate
3. Ter acesso rapido a essas habilidades durante a sessao

## Tarefas

### 1. Criar Componente QuickAbilitySheet
- Novo componente: `src/components/QuickAbilitySheet.jsx`
- Deve ser acessivel a partir da ficha do personagem (botao flutuante ou aba)
- Lista todas as habilidades do personagem organizadas por categoria:
  - Habilidades Base (Passiva, Ativas, Ultimate)
  - Habilidades de Triagem
  - Habilidades de Modulos
  - Feiticos (se mistico)
  - Habilidades de Arma
  - Habilidades Extras (Mestre-only)

### 2. Sistema de Selecao/Cola
- Cada habilidade tem um checkbox/botao de "favoritar"
- Habilidades favoritadas aparecem em uma barra lateral colapsavel
- A "cola" pode ser aberta rapidamente durante a sessao
- Estado salvo no localStorage ou no proprio personagem

### 3. Visual Compacto
- Cada habilidade na cola mostra:
  - Nome
  - Custo de energia
  - Efeito resumido (1 linha)
  - Dano (se aplicavel, em destaque vermelho)
  - Duracao (se aplicavel, em destaque azul)
- Hover expande para mostrar descricao completa

### 4. Integracao com SessionSheetModal
- A cola deve estar disponivel durante sessoes ao vivo
- Integrar com `src/components/SessionSheetModal.jsx`
- O jogador pode consultar suas habilidades enquanto o mestre gerencia o combate

## Arquivos a Criar/Modificar
- `src/components/QuickAbilitySheet.jsx` — Novo componente
- `src/components/SessionSheetModal.jsx` — Integracao
- `src/App.jsx` — Rota e estado
- `src/index.css` — Estilos da cola
