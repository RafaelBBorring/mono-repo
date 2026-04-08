# Como corrigir a chave do Supabase (causa raiz de todos os problemas)

## O problema

O arquivo `js/supabase.js` tinha uma chave no formato errado:

```
sb_publishable_xVx8S_bFDhbO0Hs9fNtNSw_vDqSTs0l  ← ERRADO
```

A chave correta do Supabase é um JWT longo que começa com `eyJ`:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  ← CORRETO
```

Enquanto a chave estiver errada, **nenhuma** chamada ao banco funciona —
fichas não carregam, nome não aparece, quadro fica vazio.

---

## Como pegar a chave correta (2 minutos)

### Passo 1
Acesse **[supabase.com](https://supabase.com)** e entre no seu projeto `codex-arcanum`.

### Passo 2
No menu lateral esquerdo, clique no ícone de **engrenagem** (⚙️) → **Project Settings**.

### Passo 3
No submenu que aparecer, clique em **API**.

### Passo 4
Na seção **"Project API keys"**, você verá:

```
anon   public   eyJhbGci...    [Copy]
```

Clique em **Copy** ao lado da chave `anon public`.

### Passo 5
Abra o arquivo `js/supabase.js` do projeto e substitua a linha:

```js
const SUPABASE_ANON_KEY = 'COLE_SUA_ANON_KEY_AQUI';
```

pela chave copiada:

```js
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

### Passo 6
Salve o arquivo e reconstrua o Docker:

```bash
docker build -t codex-arcanum .
docker run --env-file .env -p 5000:5000 codex-arcanum
```

---

## O que foi corrigido neste ZIP além da chave

| Arquivo | Bug corrigido |
|---------|---------------|
| `fichas.html` | Nome do usuário não aparecia na topbar (falta de fallback para `full_name`) |
| `fichas.html` | `exportSheet` e `exportSheetFromViewer` chamavam `_getSheets()` assíncrono de forma síncrona — exportação não funcionava |
| `fichas.html` | Barra de seleção duplicada no HTML — aparecia dois menus sobrepostos |
| `fichas.html` | `loadPage` e `initAuth` sem tratamento de erro — tela travava sem aviso |
| `board.html` | `const BOARD_KEY = \`codex_board_${session.id}\`` em escopo global antes de `session` existir — erro de runtime |
| `hub.html` | Mesmo fix de displayName para consistência |
| `js/supabase.js` | Chave errada substituída por placeholder com instrução clara |

