/**
 * weaponAbilitiesPrompt.js — Prompt para Geracao de Habilidades de Arma
 *
 * Finalidade: Gera habilidades balanceadas para armas comuns baseadas no rank.
 *
 * Tokens estimados: ~800-1200 tokens
 *
 * Contexto: O rank da arma define a faixa de poder (N1-5 a N26-30).
 * Habilidades de arma sao EXTRA ao dano base + bonus do rank.
 */
export function buildWeaponAbilitiesPrompt({ char, weaponName, weaponDano, weaponMec, weaponRank, weaponBand, slots, count, userDesc, existingHabs }) {
  return `VOCE E O ORACULO — MOTOR DE BALANCEAMENTO DE ARMAS DO SISTEMA OLYMPO 2.0.

CONTEXTO: O rank da arma define a faixa de poder:
- Comum → N1-5 | Incomum → N3-8 | Raro → N6-12
- Epico → N10-16 | Heroico → N14-20 | Ancestral → N18-25
- Mitico → N22-28 | Transcendente → N26-30

ARMA: ${weaponName} | Dano base: ${weaponDano} | Mecanica: ${weaponMec}
RANK: ${weaponRank} | Faixa: ${weaponBand}
Crie EXATAMENTE ${count} habilidade${count > 1 ? 's' : ''}. Slots max: ${slots}.
Slots: Fraca=1, Media=2, Forte=3.

PERSONAGEM: ${char.nome || 'Sem Nome'} | Classe: ${char.classe || 'N/A'} | Nivel: ${char.nivel || 1}
${userDesc ? `DESCRICAO DO JOGADOR: "${userDesc}"` : ''}

TDH POR RANK DA ARMA:
N1-5:  Fraca=2d6+8   | Media=3d8+12  | Forte=5d8+18
N3-8:  Fraca=3d8+12  | Media=4d10+18 | Forte=6d10+24
N6-12: Fraca=4d10+15 | Media=6d10+22 | Forte=8d12+30
N10-16: Fraca=5d10+20| Media=7d12+28 | Forte=10d12+38
N14-20: Fraca=6d12+25| Media=9d12+35 | Forte=12d12+48
N18-25: Fraca=8d12+30| Media=10d12+42| Forte=14d12+58
N22-28: Fraca=9d12+35| Media=12d12+48| Forte=16d12+65
N26-30: Fraca=10d12+40|Media=14d12+55| Forte=20d12+75

CUSTO: Fraca=3-10E | Media=10-25E | Forte=25-50E

REGRAS:
1. Dano EXTRA ao dano base da arma + bonus do rank.
2. Passivas NAO tem custo de Energia.
3. Interaja com a mecanica da arma (${weaponMec}).
4. Cada habilidade DEVE ter efeito mecanico numerico mensuravel.
5. EFEITOS NARRATIVOS DEVEM TER TRADUCAO MECANICA:
   - "Teleporte 30m" → Vantagem no proximo ataque + Vantagem em esquiva por 1 rodada
   - "Movimento rapido" → +NdN em Testes de DES ou ataque extra condicional
   - "Camuflagem" → Vantagem em Furtividade, inimigos tem Desvantagem para detectar
6. Economia de Acoes: cada habilidade ativa consome 1 Acao Padrao. Nenhuma habilidade de arma pode conceder acoes extras.

${existingHabs?.length > 0 ? `HABILIDADES EXISTENTES:\n${JSON.stringify(existingHabs, null, 2)}` : ''}

Responda EXCLUSIVAMENTE com JSON:
{
  "habilidades": [
    { "nome": "nome criativo", "potencia": "Fraca|Media|Forte", "tipo": "Ativa|Passiva", "custo": "custo em PE/Energia", "descricao": "descricao com mecanicas numericas detalhadas" }
  ]
}`
}
