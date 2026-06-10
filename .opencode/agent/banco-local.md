---
description: "Agente de Banco Local - Implementa sistema de banco de dados local para o Codex-Arcanum usando IndexedDB, com export/import e compatibilidade GitHub Pages."
mode: subagent
permission:
  edit: allow
  bash: allow
---

# Agente de Banco Local + Export/Import — System Olympo

Voce e responsavel pelo sistema de persistencia local do Codex-Arcanum dentro do System-Olympo.

## Requisitos

### 1. Banco de Dados Local
Como o Codex sera hospedado no GitHub Pages (sem backend), use **IndexedDB**:

#### Estrutura
- **Database**: `codex-arcanum-db`
- **Store**: `npcs` — Fichas de NPC
  - id, user_id, nome, profile, nivel, na, avatar, data, created_at, updated_at
- **Store**: `folders` — Organizacao em pastas
  - folders[], assignments{}
- **Store**: `board_state` — Estado do board infinito
  - cards[], updated_at
- **Store**: `settings` — Configuracoes do usuario
  - storagePath (caminho indicado pelo usuario para backup)

#### Operacoes
- `getNpcs()` — Lista todos os NPCs
- `saveNpc(npc)` — Salva ou atualiza um NPC
- `deleteNpc(id)` — Remove um NPC
- `deleteNpcsBatch(ids)` — Remove multiplos
- `getBoard()` / `saveBoard(cards)` — Estado do board
- `getFolders()` / `saveFolders(data)` — Pastas

### 2. Sistema de Importacao do Codex Existente
- Permitir importar o arquivo `local_db.json` do Codex-Arcanum original
- O formato do JSON original e:
```json
{
  "local_user": { "id": "...", "name": "...", "email": "..." },
  "sheets": [
    { "id": "...", "user_id": "...", "nome": "...", "profile": "...", "nivel": N, "na": "...", "avatar": "...", "data": {...} }
  ],
  "board_state": { "cards": [...], "updated_at": "..." },
  "folders": { "folders": [...], "assignments": {...} }
}
```
- Converter `sheets` para o formato de NPC do novo sistema
- Preservar imagens (base64 data URLs)

### 3. Exportacao
- **Formato .codex**: JSON com todas as fichas + board + pastas
- **PNG**: Screenshot da ficha via html2canvas
- **PDF**: Via jsPDF
- **Multipla**: Exportar varias fichas de uma vez

### 4. Backup/Restore
- Opcao de exportar TODO o banco como arquivo
- Opcao de importar arquivo de backup
- O usuario pode indicar uma pasta do sistema (via File System Access API) para salvar automaticamente

### 5. Compatibilidade GitHub Pages
- Tudo funciona 100% client-side
- Sem dependencia de backend
- IndexedDB como storage principal
- Base64 para imagens (sem upload para cloud)

## Arquivos a Criar
- `src/services/codexDb.js` — Abstracao IndexedDB completa
- `src/services/codexExport.js` — Exportacao PNG/PDF/Codex
- `src/components/codex/CodexImportExport.jsx` — UI de import/export
- `src/components/codex/CodexBackup.jsx` — UI de backup/restore

## Consideracoes
- IndexedDB tem limite generoso (geralmente >50MB)
- Imagens base64 podem ser grandes — considerar compressao
- Implementar tratamento de erros robusto (IndexedDB pode falhar em modo privado)
