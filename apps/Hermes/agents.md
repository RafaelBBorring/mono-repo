# AGENTS.md — Arquitetura de Agentes do Hermes

> O **Hermes** opera como um coletivo de quatro agentes autônomos especializados, inspirados nos papéis do mensageiro grego: ele **voa** (Scout), **decifra** (Inspector), **interpreta** (Analyst) e **entrega** (Publisher).

```
        ┌──────────┐   registros    ┌────────────┐   texto limpo   ┌──────────┐   JSON IA   ┌────────────┐
        │  SCOUT   │ ─────────────▶ │ INSPECTOR  │ ──────────────▶ │ ANALYST  │ ──────────▶ │ PUBLISHER  │
        │ (Varre)  │                │ (Filtra)   │                 │ (OpenRouter)│            │ (UI + Store)│
        └──────────┘                └────────────┘                 └──────────┘             └────────────┘
         PNCP/APIs                   PDF/DOCX +                     gemma-4-26b:free          Dashboard 3D
                                         taxonomia                  gpt-oss-20b:free          links diretos
```

---

## Agente 1 — SCOUT (Varredura)

**Papel:** O explorador alado. Monitora fontes de dados em intervalos programados e captura novos registros.

**Responsabilidades:**
- Consome a **API pública do PNCP** (`https://pncp.gov.br/api/consulta/...`) e portais estaduais/municipais.
- Raspagem leve de plataformas privadas / editais de incentivo (Ancine, Finep, Rouanet, BNDES).
- Extrai metadados canônicos: `title`, `organ`, `modality`, `publishedAt`, `deadlineAt`, `estimatedValue`, `applyUrl`, `documentUrl`.
- **Dedupe** por `id` canônico (`fonte:slug`) para não reprocessar.
- Envia novos registros para a fila do Inspector.

**Contrato de saída:** array de `Bidding` (sem `analysis`).

**Resiliência:** se a API pública falhar, devolve seed dataset para a UI nunca ficar vazia.

**Implementação:** `app/api/scout/route.js` + `lib/pncp.js`.

---

## Agente 2 — INSPECTOR (Filtro & Leitor)

**Papel:** O guardião do portal. Decide o que merece atenção e prepara o texto para a IA.

**Responsabilidades:**
- Aplica a **taxonomia de TI/Games** (`lib/filters.js`): pontua por palavras-chave positivas (Unity, Unreal, Node, React, API, Serious Games, Gamificação...).
- Aplica **lista negra**: hardware, mobiliário, licenças genéricas, obras civis, serviços de limpeza.
- Classifica `scope`: `software` | `games` | `both`.
- Baixa e extrai **texto limpo** do edital (PDF/DOCX) com fallback gracioso.
- Descarta oportunidades abaixo do threshold de relevância.

**Contrato de saída:** `Bidding` enriquecido com `rawSummary` + `scope` + score de relevância.

**Implementação:** `app/api/inspect/route.js` + `lib/pdf.js` + `lib/filters.js`.

---

## Agente 3 — ANALYST (Inteligência via OpenRouter)

**Papel:** O oráculo. Lê o edital decifrado e sintetiza os pontos críticos em JSON.

**Responsabilidades:**
- Conecta à **OpenRouter API** (`https://openrouter.ai/api/v1/chat/completions`).
- Modelo primário `google/gemma-4-26b-a4b-it:free` com **fallback** `openai/gpt-oss-20b:free`.
- Prompt estruturado exigindo **JSON válido** (sem prose envoltória).
- Extrai:
  1. `resumoExecutivo` (3–4 frases).
  2. `requisitosObrigatorios` (atestados, linguagens, certificações).
  3. `faixaFinanceira` (se disponível).
  4. `stackExigida` (tecnologias).
  5. `scoreMatch` (0–100).
  6. `nivelUrgencia` (baixo/médio/alto/crítico conforme prazo).
- **Caching** por `id` para não re-analisar.
- **Fallback determinístico:** se a IA falhar/sem chave, gera análise heurística local (regras) para a UI nunca quebrar.

**Implementação:** `app/api/analyze/route.js` + `lib/openrouter.js` + `lib/analysisPrompt.js`.

**Segurança:** a chave `OPENROUTER_API_KEY` vive **somente no servidor** (`.env.local`), nunca exposta ao client.

---

## Agente 4 — PUBLISHER (Publicação & Interface)

**Papel:** O arauto. Persiste, indexa e entrega a oportunidade com estética imersiva.

**Responsabilidades:**
- Persiste `Bidding` enriquecidos no **store** (`lib/store.js` — JSON file, camada abstraída).
- Garante que `applyUrl` esteja **formatada e válida** (normalização HTTPS).
- Indexa para busca full-text no frontend.
- Renderiza o **dashboard Hermes**: hero 3D (Three.js), stats animadas (GSAP), grid de cards (Anime.js), filtros e busca.
- Botão destacado **"Ir para Candidatura"** com asas do caduceus.

**Implementação:** `app/page.jsx`, `app/bidding/[id]/page.jsx`, `components/*`.

---

## Fluxo de Orquestração

```
GET /api/scout        →  SCOUT retorna Biddings (PNCP + seed fallback)
GET /api/analyze?id=  →  carrega Bidding, roda INSPECTOR (se faltar rawSummary),
                          roda ANALYST (OpenRouter → fallback heurístico),
                          persiste via PUBLISHER, devolve Analysis
GET /api/biddings     →  PUBLISHER serve lista com filtros aplicados
```

## Convenções
- **Sem comentários** no código (salvo solicitação explícita).
- **JS/JSX** (consistente com o mono-repo).
- Nenhum segredo no client; todo acesso a IA/scraping é server-side.
- Toda rota de API trata erros e nunca devolve stack trace ao client.
