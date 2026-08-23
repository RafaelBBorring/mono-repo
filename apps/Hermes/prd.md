# Product Requirement Document (PRD) - LicitaTech Radar

## 1. Visão Geral do Produto
O **Hermes** é uma plataforma automatizada de agregador e gerenciador de licitações focada exclusivamente nos mercados de **Desenvolvimento de Software** e **Desenvolvimento de Jogos/Interativos**. O sistema realiza varreduras em portais públicos (PNCP, ComprasGov), editais de incentivo (Finep, Ancine, Rouanet) e plataformas privadas, centralizando oportunidades com resumos gerados por IA e direcionamento direto para a candidatura.

---

## 2. Objetivos Principais
- **Descoberta Centralizada:** Eliminar a busca manual reunindo licitações públicas, privadas e editais culturais/tecnológicos em um único painel.
- **Resumo Inteligente por IA:** Analisar editais densos (PDFs/DOCx) e extrair os pontos cruciais (prazos, requisitos técnicos, orçamento estimado, stack exigida).
- **Acesso Direto:** Disponibilizar links diretos para a página oficial de candidatura e download simplificado do edital completo.
- **Experiência Visual Imersiva:** Interface moderna, estilizada com animações fluidas (GSAP, Anime.js) e componentes gráficos em 3D (Three.js) para visualização visual de métricas.

---

## 3. Funcionalidades Chave

### 3.1. Engine de Agregação e Leitura
- **Varredura Multifonte:** Conectores e Web Scraping integrados às principais APIs públicas (ex: API do PNCP - Portal Nacional de Contratações Públicas).
- **Filtro Temático Rigoroso:** Classificação automática por palavras-chave relevantes: *Software, App, Web, Unity, Unreal Engine, Serious Games, Gamificação, UI/UX, Sistemas Web, API*.

### 3.2. Módulo de IA (Análise de Edital via OpenRouter)
- **Integração OpenRouter:** Utilização de modelos gratuitos (ex: `google/gemma-2-9b-it:free`, `meta-llama/llama-3.3-70b-instruct:free` ou similar) com chave configurada no `.env`.
- **Extração de Insights:**
  - Valor estimado / Teto orçamentário.
  - Prazo final de submissão.
  - Requisitos de atestação técnica (ex: "Exige atestado de capacidade em C++ / Node.js").
  - Nível de complexidade e adequação (Score de Match).

### 3.3. Painel Imersivo & Dashboard
- **Filtros Avançados:** Por modalidade (Pública / Privada / Edital), escopo (Jogo / Software), faixa de orçamento e prazo.
- **Cards Interativos:** Exibição clara do resumo da IA, badge de urgência do prazo, link direto do edital e botão destacado `"Ir para Candidatura"`.
- **Estatísticas em 3D:** Indicadores dinâmicos de oportunidades ativas utilizando Three.js.

---

## 4. Requisitos de UI/UX & Estilização
- **Design System Cyberpunk/Tech Minimalista:** Dark mode por padrão com acentos em neon.
- **Animações (GSAP & Anime.js):** Micro-interações, transições suaves entre abas e animação de entrada de cards.
- **Componentes 3D (Three.js):** Canvas em background/hero mostrando nódulos interconectados representando varredura de dados em tempo real.

---

## 5. Stack Tecnológica Sugerida
- **Frontend:** React / Next.js, TailwindCSS, Framer Motion, GSAP, Anime.js, Three.js (`@react-three/fiber`).
- **Backend/Ingestão:** Node.js (TypeScript) ou Python (FastAPI / Scrapy).
- **LLM Client:** SDK do OpenRouter / OpenAI integrando os modelos gratuitos.
- **Banco de Dados:** PostgreSQL ou Supabase para armazenamento e busca por texto.