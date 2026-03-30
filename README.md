# Mono-Repo — Projetos

Repositório central para hospedagem de múltiplos projetos na VPS via Dokploy.

## Estrutura

```
mono-repo/
├── apps/
│   └── codex-arcanum/      ← Gerador de Fichas RPG
│       ├── Dockerfile
│       ├── proxy.py
│       ├── requirements.txt
│       ├── index.html
│       ├── css/
│       └── js/
└── README.md
```

## Adicionar novos projetos

Crie uma nova pasta em `apps/nome-do-projeto/` com seu próprio `Dockerfile`.
No Dokploy, aponte o "Build Path" para `apps/nome-do-projeto`.

## Projetos

| Projeto | Pasta | Descrição |
|---------|-------|-----------|
| Codex Arcanum | `apps/codex-arcanum` | Gerador de fichas de personagem RPG com IA |
