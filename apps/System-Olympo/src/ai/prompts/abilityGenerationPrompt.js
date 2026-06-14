/**
 * abilityGenerationPrompt.js — Prompt para Geracao de Habilidades BASE
 *
 * Paradigma: TODAS as habilidades comecam no mesmo nivel base, INDEPENDENTE
 * do nivel do personagem. Os Pontos de Evolucao (PEH) sao o UNICO motor de escala.
 * O jogador investe PEH → aciona o Oraculo → IA recalibra com base no PEH investido.
 *
 * Tokens estimados: ~900-1300 tokens
 */
import { getRaceProfile } from '../../data/raceProfiles'

export function buildAbilityGenerationPrompt({ char, description, allTipos, tiposList, targetContext = null }) {
  const nivel = char.nivel || 1

  const raceProfile = getRaceProfile(char.raca)
  const raceBlock = raceProfile ? `
CONTEXTO RACIAL:
Raca: ${char.raca}
Fraquezas: ${raceProfile.fraquezas.map(f => `${f.nome} (${f.desc})`).join(' | ')}
Poderes Base: ${raceProfile.poderesBase.map(p => `${p.nome} (${p.desc})`).join(' | ')}
Use este contexto para gerar habilidades coerentes com a identidade racial.` : ''

  const npcBlock = targetContext?.isNPC ? `
═════════════════════════════════════════════════════════════════
MODO NPC — NAO E UM PERSONAGEM JOGADOR:
═════════════════════════════════════════════════════════════════
Este alvo e um NPC com Nivel de Ameaca (NA): ${targetContext.na || '1'} (${targetContext.naTag || '1v1'}).
- Perfil: ${targetContext.perfil || 'Guerreiro (d10)'}
- NPCs NAO usam PEH. Gere valores fixos equivalentes ao PEH MEDIO da faixa (aprox. 2-3 PEH por habilidade).
- Se NA < 1 (Horda/Grupo): reduza valores em ~30-50% do base.
- Se NA = 1: use os valores base normalmente.
- Se NA > 1 (Boss): pode exceder o teto base em ate ${Math.round((Number(targetContext.na) || 1) * 15)}%.
- O mestre tem controle total sobre NPCs.
` : ''

  return `VOCE E O ORACULO — MOTOR DE GERACAO DE HABILIDADES DO SISTEMA OLYMPO 2.0.

PERSONAGEM: ${char.nome || 'Sem Nome'} | Classe: ${char.classe || 'N/A'} | Nivel: ${nivel}
FOR ${char.atributos?.FOR} | DES ${char.atributos?.DES} | CON ${char.atributos?.CON} | INT ${char.atributos?.INT} | APA ${char.atributos?.APA} | AM ${char.atributos?.AM}
Triagem: ${char.triagemPrincipal || 'Nenhuma'} (${char.triagemPrincipalNivel || 0})
Modulos: ${(char.modulosAdquiridos || []).map(m => m.name || m.id).join(', ') || 'Nenhum'}
${raceBlock}
Descricao do jogador: "${description}"
${npcBlock}

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
N5:140-210 | N10:250-380 | N15:380-560 | N20:520-760 | N25:700-980 | N30:950-1400 | N35:1100-1300 | N40:1350-1600 | N45:1600-1900 | N50:1900-2200

OBJETIVO DE COMBATE: PvP no mesmo nivel deve durar ~10 rodadas.
- O dano BASE e BAIXO de proposito — o jogador investe PEH para alcancar o poder ideal.
- Cada PEH investido aumenta: ~+1 dado, ~+bonus flat, ~+custo de energia proporcional.
- Estrategia: distribuir PEH entre habilidades OU concentrar tudo em uma.

DT (Dificuldade de Teste) BASE:
- Habilidades que exigem teste do alvo: DT = 10 + modificador do atributo chave do personagem.
- Cada PEH investido aumenta a DT em +1.
- PISO MINIMO DE DT (NUNCA gere abaixo disto):
  N1-7: DT 12 | N8-15: DT 14 | N16-22: DT 16 | N23-30: DT 18 | N31-38: DT 20 | N39-50: DT 22
- Se 10+MOD < piso, USE o piso.
- TODA habilidade ofensiva DEVE dar ao alvo uma chance de resistir. Dano automatico sem teste = dano reduzido (~60% do TDH) OU condicao de ativacao restrita.

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
5. EFEITOS CUMULATIVOS DEVEM TER MECANICA CONCRETA:
   - "Apos X ataques ganha ponto" → defina O QUE o ponto faz: +NdN no proximo ataque, reduz custo em X, concede Vantagem em teste Y
   - "Stack de furia" → +2 FOR por stack (max 3), dura 1 rodada apos ultimo ataque
   - "Acumulo de carga" → ao atingir X stacks, libera efeito amplificado (dobra dados OU dobra duracao, NAO ambos)
   - NUNCA gere "ganha 1 ponto" sem explicar O QUE o ponto FAZ no jogo
   - Max 3-5 stacks (conforme faixa), com dissipacao ao usar ouapos 1 rodada sem gatilho
6. Mantenha coerencia narrativa: todas pertencem ao mesmo personagem.
7. Respeite Economia de Acoes: max 2 ataques/turno, max 3 acoes totais/turno.
8. O DEFENSOR SEMPRE tem chance de resistir com teste especifico (atributo, pericia, CA, DT, etc). Nao use "teste de resistencia" generico.
9. Se a habilidade envolver teste do alvo, inclua a DT base cheia: "DT 14 Constituicao" ou "DT 18 Fortitude". DT por atributo deve ser mais baixa; DT por pericia deve ser 3-5 pontos mais alta por causa do treinamento.
10. Habilidades com PEH=0 sao INTENCIONALMENTE modestas. O poder vem da evolucao.
11. Retorne tags e valores para cada habilidade. CA/Classe de Armadura usa tag "bonusCA". Regeneracao/restauracao de energia usa tag "curaEnergia", nao "cura". Nao existe tag "lentidao": velocidade reduzida deve virar bonusResultado negativo, bonusReacoes negativo ou outra mecanica real. Habilidades instantaneas nao devem ter duracao nem tag "duracao".

Responda EXCLUSIVAMENTE com JSON:
{
  "habilidades": [
    { "tipo": "Passiva|Ativa|Ultimate|Extra (Triagem)|Extra (Modulo)", "nome": "nome criativo", "descricao": "descricao com mecanicas e valores BASE", "custoEnergia": 0, "dano": "XdY+MOD", "duracao": "X rodadas ou vazio/null se instantanea", "dt": "DT <numero> <Atributo|Pericia> ou vazio", "tags": ["custoEnergia"], "valores": { "custoEnergia": 0, "dt": "14", "dtTipo": "atributo|pericia", "dtTeste": "Constituicao|Fortitude" } }
  ]
}`
}

function getLevelBand(nivel) {
  if (nivel <= 7)  return 'N1-7'
  if (nivel <= 13) return 'N8-13'
  if (nivel <= 22) return 'N14-22'
  if (nivel <= 30) return 'N23-30'
  if (nivel <= 38) return 'N31-38'
  return 'N39-50'
}
