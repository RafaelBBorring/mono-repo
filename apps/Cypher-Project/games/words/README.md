# CHYPER — Hacker Typing Game
> v1.1.0

## Estrutura do Projeto

```
chyper/
├── index.html          ← Ponto de entrada
├── README.md
├── css/
│   └── main.css        ← Todos os estilos
└── js/
    ├── config.js       ← Dificuldades, fases, pool de palavras, helpers
    ├── matrix.js       ← Efeito chuva matrix no fundo
    ├── ui.js           ← Rendering, DOM, overlays, HUD, animações
    ├── game.js         ← Loop principal, spawn, scoring, fases
    └── main.js         ← Entry point: boot, eventos, wiring
```

## Como Jogar

- Digite as palavras flutuando antes que cruzem o firewall (linha vermelha à esquerda)
- A palavra é confirmada automaticamente ao digitar completa, ou com `Enter`/`Espaço`
- Cada acerto consecutivo aumenta o multiplicador de COMBO (máx ×10)
- Perca todas as vidas → Game Over
- Acumule pontos suficientes → Avança de fase

## Dificuldades

| Dificuldade | Velocidade | Palavras na tela | Bônus de pontos |
|-------------|-----------|-----------------|-----------------|
| EASY        | Lenta     | 4               | ×1.0            |
| NORMAL      | Média     | 6               | ×1.25           |
| HARD        | Rápida    | 8               | ×1.6            |
| INSANE      | Extrema   | 10              | ×2.2            |

## Fases

1. **Firewall Externo** — Introdução, palavras curtas
2. **Camada de Rede** — Velocidade aumenta
3. **Criptografia AES-256** — Palavras médias e longas
4. **Núcleo do Sistema** — Alta pressão
5. **Root Access** — Fase final, palavras longas e xlarge

## Próximas Melhorias (Backlog)

- [ ] Sistema de high score com localStorage
- [ ] Power-ups (slow time, extra life, word clear)
- [ ] Modo survival sem fases (endless)
- [ ] Sons e efeitos sonoros
- [ ] Leaderboard online
- [ ] Personalização de tema (cores)
