/**
 * abilityGenerationPrompt.js — Prompt para Geracao de Habilidades BASE
 *
 * Paradigma: TODAS as habilidades comecam no mesmo nivel base, INDEPENDENTE
 * do nivel do personagem. Os Pontos de Evolucao (PEH) sao o UNICO motor de escala.
 * O jogador investe PEH → aciona o Oraculo → IA recalibra com base no PEH investido.
 *
 * Tokens estimados: ~900-1300 tokens
 */
export function buildAbilityGenerationPrompt({ char, description, allTipos, tiposList }) {
  const nivel = char.nivel || 1

  return `VOCE E O ORACULO — MOTOR DE GERACAO DE HABILIDADES DO SISTEMA OLYMPO 2.0.

PERSONAGEM: ${char.nome || 'Sem Nome'} | Classe: ${char.classe || 'N/A'} | Nivel: ${nivel}
FOR ${char.atributos?.FOR} | DES ${char.atributos?.DES} | CON ${char.atributos?.CON} | INT ${char.atributos?.INT} | APA ${char.atributos?.APA} | AM ${char.atributos?.AM}
Triagem: ${char.triagemPrincipal || 'Nenhuma'} (${char.triagemPrincipalNivel || 0})
Modulos: ${(char.modulosAdquiridos || []).map(m => m.name || m.id).join(', ') || 'Nenhum'}
Descricao do jogador: "${description}"

Crie EXATAMENTE ${allTipos.length} habilidades na ORDEM e TIPO abaixo:
${tiposList}

════════════════════════════════════════════════════════════════
PARADIGMA DE CRIACAO — HABILIDADES BASE (PEH = 0):
════════════════════════════════════════════════════════════════
TODAS as habilidades comecam no NIVEL BASE, independente do nivel do personagem.
O que torna uma habilidade poderosa sao os PONTOS DE EVOLUCAO (PEH) investidos nela.
Voce esta gerando habilidades com PEH = 0 (sem evolucao). Use os valores BASE abaixo.

VALORES BASE (PEH = 0):
Ativa Fraca:    2d6+4 de dano    | Custo: 5-10E
Ativa Media:    3d8+8 de dano    | Custo: 12-20E
Ativa Forte:    4d10+12 de dano  | Custo: 22-35E
Ultimate:       5d12+16 de dano  | Custo: 35-50E
Passiva:        Efeito passivo sem custo de energia

TETO MAXIMO (TDH) — ALCANCADO APENAS COM PEH MAXIMO:
Ativa Fraca (max 5 PEH):    8d12+32   | Custo: 30-50E
Ativa Media (max 5 PEH):    10d12+45  | Custo: 50-80E
Ativa Forte (max 5 PEH):    14d12+60  | Custo: 70-120E
Ultimate (max 3 PEH):       20d12+80  | Custo: 110-180E

CALIBRACAO HP ESPERADO POR NIVEL:
N5:140-210 | N10:250-380 | N15:380-560 | N20:520-760 | N25:700-980 | N30:950-1400

OBJETIVO DE COMBATE: PvP no mesmo nivel deve durar ~10 rodadas.
- O dano BASE e BAIXO de proposito — o jogador investe PEH para alcancar o poder ideal.
- Cada PEH investido aumenta: ~+1 dado, ~+bonus flat, ~+custo de energia proporcional.
- Estrategia: distribuir PEH entre habilidades OU concentrar tudo em uma.

DT (Dificuldade de Teste) BASE:
- Habilidades que exigem teste do alvo: DT = 10 + modificador do atributo chave do personagem.
- Cada PEH investido aumenta a DT em +1.

════════════════════════════════════════════════════════════════
REGRAS CRITICAS:
════════════════════════════════════════════════════════════════
1. USE OS VALORES BASE acima. NAO escale por nivel de personagem.
   - O dano da habilidade e EXTRA ao dano base+arma+atributo.
2. CUSTO DE ENERGIA OBRIGATORIO: TODA Ativa e Ultimate DEVE ter custoEnergia > 0.
   - Jamais gere custoEnergia: 0 para Ativa ou Ultimate.
   - Se a descricao do jogador pedir sem custo, atribua o MINIMO da tabela base.
3. Cada habilidade DEVE ter pelo menos 1 efeito mecanico concreto com numeros.
4. EFEITOS NARRATIVOS DEVEM TER TRADUCAO MECANICA:
   - "Teleporte" → Vantagem em ataque/esquiva, bonus de posicao
   - "Invisibilidade" → Vantagem em Furtividade, Desvantagem para inimigos
   - "Rapidez" → +NdN em DES, acao extra condicional
5. Mantenha coerencia narrativa: todas pertencem ao mesmo personagem.
6. Respeite Economia de Acoes: max 2 ataques/turno, max 3 acoes totais/turno.
7. O DEFENSOR SEMPRE tem chance de resistir (teste de resistencia, CA, DT, etc).
8. Se a habilidade envolver teste do alvo, inclua a DT base: "DT 10+MOD".
9. Habilidades com PEH=0 sao INTENCIONALMENTE modestas. O poder vem da evolucao.

Responda EXCLUSIVAMENTE com JSON:
{
  "habilidades": [
    { "tipo": "Passiva|Ativa|Ultimate|Extra (Triagem)|Extra (Modulo)", "nome": "nome criativo", "descricao": "descricao com mecanicas e valores BASE", "custoEnergia": 0, "dano": "XdY+MOD", "duracao": "X rodadas" }
  ]
}`
}

function getLevelBand(nivel) {
  if (nivel <= 7)  return 'N1-7'
  if (nivel <= 15) return 'N8-15'
  if (nivel <= 22) return 'N16-22'
  return 'N23-30'
}
