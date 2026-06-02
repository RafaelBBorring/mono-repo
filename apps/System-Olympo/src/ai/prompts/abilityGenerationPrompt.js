/**
 * abilityGenerationPrompt.js — Prompt para Geracao de Habilidades Iniciais
 *
 * Finalidade: Gera o conjunto base de habilidades de um personagem a partir
 * de uma descricao narrativa (Passiva, Ativa x3, Ultimate, Extras).
 *
 * Tokens estimados: ~800-1200 tokens
 *
 * O prompt inclui a tabela TDH completa para que a IA gere valores
 * ja dentro da faixa correta, sem precisar de balanceamento posterior.
 */
export function buildAbilityGenerationPrompt({ char, description, allTipos, tiposList }) {
  const nivel = char.nivel || 1
  const band = getLevelBand(nivel)

  return `VOCE E O ORACULO — MOTOR DE GERACAO DE HABILIDADES DO SISTEMA OLYMPO 2.0.

PERSONAGEM: ${char.nome || 'Sem Nome'} | Classe: ${char.classe || 'N/A'} | Nivel: ${nivel} | Faixa: ${band}
FOR ${char.atributos?.FOR} | DES ${char.atributos?.DES} | CON ${char.atributos?.CON} | INT ${char.atributos?.INT} | APA ${char.atributos?.APA} | AM ${char.atributos?.AM}
Triagem: ${char.triagemPrincipal || 'Nenhuma'} (${char.triagemPrincipalNivel || 0})
Modulos: ${(char.modulosAdquiridos || []).map(m => m.name || m.id).join(', ') || 'Nenhum'}
Descricao do jogador: "${description}"

Crie EXATAMENTE ${allTipos.length} habilidades na ORDEM e TIPO abaixo:
${tiposList}

═══════════════════════════════════════════════════════════════
TETO DE DANO POR HABILIDADE (TDH) — USE ESTA TABELA COMO REFERENCIA:
═══════════════════════════════════════════════════════════════
N1-7:   Fraca=3d8+12    | Media=4d10+18  | Forte=6d10+24  | Ult=8d12+30
N8-15:  Fraca=4d10+18   | Media=6d10+25  | Forte=9d12+32  | Ult=13d12+45
N16-22: Fraca=6d12+25   | Media=8d12+38  | Forte=12d12+50 | Ult=17d12+65
N23-30: Fraca=8d12+32   | Media=10d12+45 | Forte=14d12+60 | Ult=20d12+80

CALIBRACAO HP ESPERADO POR NIVEL:
N5:140-210 | N10:250-380 | N15:380-560 | N20:520-760 | N25:700-980 | N30:950-1400

OBJETIVO DE COMBATE: Combates PvP no mesmo nivel devem durar ~10 rodadas.
- Isso significa que o dano medio por habilidade Ativa deve ser ~8-12% do HP medio da faixa.
- Habilidades Fracas: ~5-7% do HP | Medias: ~8-12% | Fortes: ~12-18% | Ultimate: ~18-25%

CUSTO DE ENERGIA POR TIPO E FAIXA:
Passiva: sem custo
Ativa Fraca: N1-7:3-8E | N8-15:8-15E | N16-22:15-25E | N23-30:25-40E
Ativa Media: N1-7:8-15E | N8-15:15-30E | N16-22:30-50E | N23-30:50-80E
Ativa Forte: N1-7:15-25E | N8-15:25-45E | N16-22:45-70E | N23-30:70-120E
Ultimate: N1-7:25-40E | N8-15:40-70E | N16-22:70-110E | N23-30:110-180E

Voce esta gerando para faixa ${band}. Use os valores desta faixa como referencia.

═══════════════════════════════════════════════════════════════
REGRAS CRITICAS:
═══════════════════════════════════════════════════════════════
1. ATRIBUA VALORES REAIS usando a tabela TDH acima como referencia. NAO use placeholders.
   - O dano da habilidade e EXTRA ao dano base+arma+atributo.
   - Ativas "Fraca" geram ~50-70% do TDH Fraca. "Media" ~70-100% do TDH Media. "Forte" ~80-100% do TDH Forte.
2. Cada habilidade DEVE ter pelo menos 1 efeito mecanico concreto com numeros.
3. EFEITOS NARRATIVOS DEVEM TER TRADUCAO MECANICA:
   - "Teleporte" → Vantagem em ataque/esquiva, bonus de posicao
   - "Invisibilidade" → Vantagem em Furtividade, Desvantagem para inimigos
   - "Rapidez" → +NdN em DES, acao extra condicional
4. Mantenha coerencia narrativa: todas pertencem ao mesmo personagem.
5. Respeite Economia de Acoes: nenhuma habilidade concede mais de 1 acao extra por uso.
6. O DEFENSOR SEMPRE tem chance de resistir (teste de resistencia, CA, etc).
7. Habilidades de nivel alto (N23-30) DEVEM ser poderosas — um semideus nvl 30 com 1400 HP espera habilidades que causem dano significativo.

Responda EXCLUSIVAMENTE com JSON:
{
  "habilidades": [
    { "tipo": "Passiva|Ativa|Ultimate|Extra (Triagem)|Extra (Modulo)", "nome": "nome criativo", "descricao": "descricao com mecanicas e valores reais da tabela TDH", "custoEnergia": 0, "dano": "XdY+MOD", "duracao": "X rodadas" }
  ]
}`
}

function getLevelBand(nivel) {
  if (nivel <= 7)  return 'N1-7'
  if (nivel <= 15) return 'N8-15'
  if (nivel <= 22) return 'N16-22'
  return 'N23-30'
}
