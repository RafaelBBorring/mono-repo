# System-Drako

> Forjador de Fichas — sistema de RPG de mesa em **d6 puro, por atributos, sem perícias**.
> Foco: criar **NPCs em massa, rápido, bonito e confiável**, com banco local, IA opcional (Oráculo) e uma arena de combate infinita.

Estética mística **preto + dourado** (com brasas), glassmorphism, backdrop WebGL (Three.js) e animações de scroll. Tudo roda **offline** no navegador via IndexedDB.

---

## Quickstart

### Desenvolvimento
```bash
npm install
cp .env.example .env        # cole sua chave OpenRouter (opcional — o sistema funciona sem IA)
npm run dev                 # http://localhost:5180
```

### Produção (build)
```bash
npm run build               # gera /dist
npm run preview             # serve o build
```

### Docker (deploy local)
```bash
docker compose up -d --build      # http://localhost:8080
```
> Imagem multi-stage (Node build → Nginx). A chave da IA entra em runtime via variável `OPENROUTER_API_KEY` (lida do `.env` pelo compose → `/config.json`).

### GitHub Pages (deploy online)
O projeto já está plugado no workflow do mono-repo (`.github/workflows/deploy-olympo.yml`) e publica em `https://<owner>.github.io/mono-repo/system-drako/`. Para a IA funcionar lá:
1. Crie o **secret** do repositório: **`DRAKO_OPENROUTER_KEY`** = sua chave OpenRouter.
2. (Opcional) variável `DRAKO_OPENROUTER_MODEL` para mudar o modelo default.
O build injeta a chave (ela fica no bundle client-side — ok para projeto privado). O `VITE_BASE=/mono-repo/system-drako/` é aplicado no CI.

---

## Banco de dados (local + arquivo)

O System-Drako guarda tudo **localmente** (IndexedDB). Para usar 100% online e levar seus dados entre máquinas, abra o **painel Banco de Dados** (ícone no topo) e conecte um **arquivo `.drako`** (Chrome/Edge desktop):
- O Chrome **memoriza a localização** do arquivo — nas próximas visitas o sistema **reconecta sozinho** e **salva automaticamente a cada alteração** (mesmo se você sair sem salvar).
- Você também pode baixar o projeto (com a pasta `db/` de referência) ou importar/exportar um backup `.drako` pela Biblioteca.

Ver [`db/README.md`](./db/README.md) para detalhes.

---

## O Oráculo (IA — opcional)

 Integra a OpenRouter. Três cenários:

1. **Criação automática de ficha** — descreva o arquétipo livremente; a IA devolve uma ficha completa (atributos validados, recursos, narrativa, habilidades).
2. **Geração de kit de habilidades** — a IA lê a ficha e cria 1 passiva + 3 ativas + 1 ultimate (com tags e custos de energia coerentes).
3. **Auditoria de balanceamento** — avalia uma habilidade no contexto da ficha, dá nota 0–100, veredito, problemas e versão sugerida.

Configure no `.env` (lido pelo Vite em dev **e** pelo docker compose no Docker):
```
VITE_OPENROUTER_API_KEY=sk-or-v1-...
VITE_OPENROUTER_MODEL=google/gemma-4-26b-a4b-it:free
```

> **Funciona no Docker sem rebuild**: o container gera `/config.json` em runtime (via nginx + envsubst) a partir das variáveis `OPENROUTER_API_KEY`/`OPENROUTER_MODEL`. O app lê isso ao subir. Trocar a chave = só reiniciar o container.
> **Fallback automático**: se o modelo primário retornar 429/indisponível, o Oráculo tenta automaticamente uma cadeia de modelos free (`ai.js` → `FALLBACK_MODELS`).
> ⚠️ Em app client-only a chave fica acessível no navegador/dispositivo. Para uso compartilhado/público, use um proxy.

---

## Funcionalidades

- **Wizard conciso** — Identidade → Nível → Atributos → Narrativa → Habilidades → Revisão.
- **Atributos com validação** — pontos e limites por nível, mínimo 1 em cada um dos 7.
- **Habilidades estilo MOBA** — 1 passiva + 3 ativas + 1 ultimate, com energia, descrição e **tags coloridas**.
- **Ficha completa (SheetView)** — edição de recursos, atributos, narrativa, condições; **save com botão (desabilita quando limpo)** e **aviso ao sair sem salvar**.
- **Ícone ajustável** — arraste, cole (Ctrl+V) ou importe; ajuste **posição e zoom** dentro da máscara.
- **Biblioteca** — cards com ícone em evidência, **pastas**, **busca**, filtros (tipo/nível), **backup do banco** e **importação** `.drako`.
- **Exportações** — `.drako` (ficha individual com tudo), **PDF**, **PNG**.
- **Quadro Infinito** (estilo Miro) — pan/zoom, notas coloridas, formas, **fichas rápidas** (vida/energia/PE editáveis inline, expansíveis, drawer de detalhes), copiar/colar (Ctrl+C/V), auto-save.
- **Backdrop místico** — Three.js (partículas douradas + brasas, parallax de mouse).

---

## Regras do sistema (resumo)

- **Dados**: só d6. Sucesso = 4, 5, 6.
- **Atributos** (1–10): FOR, AGI, PER, INT, VON, PRE, AM. 3 = comum; 6 = pico humano; 7 = sobre-humano; 10 = absoluto.
- **Recursos**: Vida = `FOR*2 + VON + 10` · Energia = `AM*5` · PE = `VON*2 + AGI`.
- **Ação combinada**: rola o menor dos dois atributos; se o maior ≥6 soma +2d6, 4–5 soma +1d6.
- **PE**: 1 PE antes da rolagem = +2d6. **Condições**: ±1d6 (máx uma de cada).
- **Níveis de início**: Recruta(14/cap3), Iniciante(21/cap4), Veterano(28/cap6), Elite(35/cap8), Lenda(42/cap10).
- **Defesa**: Esquiva (AGI) cancela sucessos; Absorção (FOR): 1-2→0, 3-4→2, 5-6→4, 7-8→6, 9-10→8. **Magia ignora Absorção**.

Documentação completa de regras em `src/data/` e nos prompts do Oráculo (`src/ai/prompts/systemRules.js`).

---

## Estrutura
```
System-Drako/
├── Dockerfile · docker-compose.yml · nginx.conf
├── agents/                 6 agentes especializados (CEO, Design, Regras, Balanceamento, UI, Dev)
├── src/
│   ├── data/               regras puras (atributos, níveis, armas, magia, combate)
│   ├── lib/                calculator, dice, db (IndexedDB), ai (OpenRouter), storage (.drako), exporters (PDF/PNG)
│   ├── ai/prompts/         systemRules + autoCharacter + abilities + balance
│   ├── contexts/           ToastContext
│   ├── hooks/              useHashRoute
│   └── components/         backdrop · layout · ui · library · sheet · wizard · canvas · ai · home
└── AGENTS.md               contexto do projeto para agentes
```

## Formato `.drako`
JSON com `kind`. Dois tipos:
- **`drako-char`** — ficha individual (inclui ícone em dataURL, tags, tudo).
- **`drako-db`** — backup completo do banco (personagens + pastas + quadros).

Importação sempre **mescla** com o que já existe.

---

## Scripts
| Comando | Faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção em `/dist` |
| `npm run preview` | Serve o build |
| `docker compose up -d --build` | Sobe via Docker (porta 8080) |
