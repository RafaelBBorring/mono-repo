/**
 * aiService.js — Sistema Olympo 2.0
 * Motor de IA para geração e balanceamento de habilidades.
 *
 * CORREÇÕES v2.0:
 *  1. Passa valores calculados REAIS do personagem (vida, energia, dano base, ataque)
 *  2. Implementa TDH (Seção 14.4) e IPL/PP (Seção 14.5) completos e corretos
 *  3. Calcula e passa bônus de amplificação de Triagens e Módulos
 *  4. Respeita SCP (Seção 14.1) com as três camadas corretas
 *  5. Considera nível de evolução de cada habilidade ao calibrar valores
 */

import { WEAPONS as ALL_WEAPONS, WEAPON_RANKS as ALL_WEAPON_RANKS } from '../data/weapons'
import {
  calcVidaTotal, calcEnergiaTotal, calcPeTotal,
  calcCA, calcReacoes, calcDanoBase, calcPEHTotal,
  getAttrValue, getClassDef,
} from '../utils/calculator'
import { getModifier } from '../data/attributes'
import { buildEvolucaoContext } from '../utils/skillEvolution'
import { supabase } from '../lib/supabase'
import { getRaceLabel } from '../utils/raceCalculator'

// ─── Infra (via Supabase Edge Function) ────────────────────────────────────

async function callAI(messages) {
  const { data, error } = await supabase.functions.invoke('openrouter-chat', {
    body: { messages, temperature: 0.35, max_tokens: 4096 },
  })
  if (error) {
    const msg = error.message || error.msg || error.details || JSON.stringify(error)
    throw new Error(`Erro na API de IA: ${msg}`)
  }
  if (!data) throw new Error('A API de IA não retornou dados. Verifique a Edge Function openrouter-chat.')
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('A IA retornou uma resposta vazia. Tente novamente.')
  return content
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getLevelBand(nivel) {
  if (nivel <= 7)  return 'N1-7'
  if (nivel <= 15) return 'N8-15'
  if (nivel <= 22) return 'N16-22'
  return 'N23-30'
}

function getTriagemAmplifiers(char) {
  const tp   = char.triagemPrincipal || ''
  const tn   = char.triagemPrincipalNivel || 0
  const st   = char.subTriagem || ''
  const sn   = char.subTriagemNivel || 0
  const nivel = char.nivel || 1
  const sk   = char.skeletonPoints || {}
  const attrs = char.atributos || {}
  const valINT = getAttrValue(attrs, 'INT', sk, char)
  const amps = []

  if ((tp === 'ATIRADOR' && tn >= 0.2) || (st === 'ATIRADOR' && sn >= 0.2))
    amps.push(`Atirador 0.2: soma valor INT (${valINT}) no dano de armas`)
  if ((tp === 'COMBATE' && tn >= 0.2) || (st === 'COMBATE' && sn >= 0.2)) {
    const bonus = Math.floor(nivel / 10)
    amps.push(`Combate 0.2: +${bonus}d6+${bonus * 5} no dano base`)
  }
  if ((tp === 'COMBATE' && tn >= 0.5) || (st === 'COMBATE' && sn >= 0.5))
    amps.push('Combate 0.5: +AM no dano ao acertar crítico com habilidade')
  if ((tp === 'TÉCNICO' && tn >= 0.1) || (st === 'TÉCNICO' && sn >= 0.1))
    amps.push('Técnico 0.1: maior atributo somado no dano de arma')
  if ((tp === 'SOLDADO' && tn >= 0.6) || (st === 'SOLDADO' && sn >= 0.6))
    amps.push('Soldado 0.6: arma favorita recebe +3 dados de dano')
  if ((tp === 'LUTADOR' && tn >= 0.6) || (st === 'LUTADOR' && sn >= 0.6))
    amps.push('Lutador 0.6: crítico causa x1,5 no dano (2x/combate)')
  if ((tp === 'ASSASSINO' && tn >= 0.6) || (st === 'ASSASSINO' && sn >= 0.6))
    amps.push('Assassino 0.6: 2x/combate pode fazer ação com crítico garantido')

  return amps.length ? amps.join(' | ') : 'Nenhum amplificador de Triagem ativo'
}

function getModuleAmplifiers(char) {
  const mods = (char.modulosAdquiridos || []).map(m => m.id || m)
  const amps = []

  if (mods.includes('sobrecarga_arcana'))
    amps.push('Sobrecarga Arcana: proxima habilidade +50% dano OU +2 rodadas — 20 PE')
  if (mods.includes('arcanismo'))
    amps.push('Arcanismo: +50% efeito em 1 habilidade (exceto Ult), custo 2x Energia — N15+, AM 20+')
  if (mods.includes('golpe_devastador'))
    amps.push('Golpe Devastador: proximo ataque +100% FOR no dano — 15 PE')
  if (mods.includes('mira_letal'))
    amps.push('Mira Letal: proximo ranged +100% INT no dano — 15 PE')
  if (mods.includes('critico_aprimorado'))
    amps.push('Crítico Aprimorado: -2 na margem de crítico — 10 PE')
  if (mods.includes('aumento_poder'))
    amps.push('Aumento de Poder: pode evoluir 1 habilidade em 1 nível (até 2x) — requer N12+, AM 18+')

  return amps.length ? amps.join(' | ') : 'Nenhum amplificador de Módulo relevante'
}

function computeCharStats(char) {
  const sk     = char.skeletonPoints || {}
  const attrs  = char.atributos || {}
  const nivel  = char.nivel || 1
  const choices = char.choices || {}

  const totalAttr = (a) => getAttrValue(attrs, a, sk, char)
  const mod       = (a) => getModifier(totalAttr(a))

  const vidaTotal    = calcVidaTotal(char.classe, nivel, attrs, sk, choices, char.triagemPrincipal, char.triagemPrincipalNivel, char)
  const energiaTotal = calcEnergiaTotal(char.classe, nivel, attrs, sk, choices, char.triagemPrincipal, char.triagemPrincipalNivel, char.subTriagem, char.subTriagemNivel, char)
  const peTotal      = calcPeTotal(char.classe, nivel, choices, char)
  const caBase       = calcCA(attrs, sk, char.pericias, char)
  const danoBase     = calcDanoBase(char.classe, attrs, sk, nivel, char.subTriagem, char.subTriagemNivel, char.triagemPrincipal, char.triagemPrincipalNivel, char)
  const reacoes      = calcReacoes(attrs, sk, char.triagemPrincipal, char.triagemPrincipalNivel, char.subTriagem, char.subTriagemNivel, char)

  const pericias     = char.pericias || {}
  const maxTreino    = Math.max(pericias.Lutar || 0, pericias.Pontaria || 0)
  const grauBonus    = [0, 5, 10, 15, 20][maxTreino] || 0
  const attrAtaque   = Math.max(mod('FOR'), mod('DES'))
  const ataqueBase   = grauBonus + attrAtaque

  const armaRankDef   = (ALL_WEAPON_RANKS || []).find(r => r.rank === char.armaRank) || {}
  const armaDanoBonus = armaRankDef.danoBonusStr || armaRankDef.danoBonus || '+0'
  const armaSlots     = armaRankDef.slots || 0

  return {
    nivel, band: getLevelBand(nivel),
    atributos: {
      FOR: totalAttr('FOR'), modFOR: mod('FOR'),
      DES: totalAttr('DES'), modDES: mod('DES'),
      CON: totalAttr('CON'), modCON: mod('CON'),
      INT: totalAttr('INT'), modINT: mod('INT'),
      APA: totalAttr('APA'), modAPA: mod('APA'),
      AM:  totalAttr('AM'),  modAM:  mod('AM'),
    },
    vidaTotal, energiaTotal, peTotal, caBase, reacoes,
    danoBase, ataqueBase: `d20+${ataqueBase}`,
    armaDanoBonus, armaSlots,
    triagem: `${char.triagemPrincipal || 'N/A'} (Nv ${char.triagemPrincipalNivel || 0}) | Sub: ${char.subTriagem || 'N/A'} (Nv ${char.subTriagemNivel || 0})`,
    triagemAmps: getTriagemAmplifiers(char),
    moduleAmps: getModuleAmplifiers(char),
  }
}

// ─── System prompt com protocolo real ─────────────────────────────────────

function buildSystemContext() {
  return `Voce e o ORÁCULO, motor de balanceamento oficial do Sistema Olympo 2.0.

PROTOCOLO DE EXPANSÃO ÉPICA OLYMPO (Secao 14)
Você receberá fichas com VALORES CALCULADOS REAIS. Analise SEMPRE com base neles.

SCP — SISTEMA DE CAMADAS DE PODER (Secao 14.1):
Camada 1 (Base): Treino de Perícia + Modificador de Atributo — SEM LIMITE.
Camada 2 (Tático — Habilidades, Triagens, Módulos): N1-7:+8 | N8-15:+12 | N16-22:+16 | N23-30:+20
Camada 3 (Épico — Armas, Runas, Artefatos): N1-7:+5 | N8-15:+8 | N16-22:+12 | N23-30:+16
BÔNUS TOTAL MÁXIMO = Camada 1 (ilimitada) + Camada 2 + Camada 3.

TDH — TETO DE DANO POR HABILIDADE (Secao 14.4):
ATENÇÃO: estes valores são para o dano GERADO PELA HABILIDADE ISOLADAMENTE.
O dano total do ataque ainda inclui: Dano Base de Classe + Bônus de Arma (Rank) + Modificadores.
N1-7:   Fraca=3d8+12    | Media=4d10+18  | Forte=6d10+24  | Ult=8d12+30
N8-15:  Fraca=4d10+18   | Media=6d10+25  | Forte=9d12+32  | Ult=13d12+45
N16-22: Fraca=6d12+25   | Media=8d12+38  | Forte=12d12+50 | Ult=17d12+65
N23-30: Fraca=8d12+32   | Media=10d12+45 | Forte=14d12+60 | Ult=20d12+80

IPL — PP LIMITE POR TIPO E FAIXA (Secao 14.5):
Pesos: +5atk/def(temp)=3PP | +10atk/def(temp)=5PP | +15atk/def(temp,N16+)=7PP
Vantagem=4PP | +1Ataque Extra=5PP | Dano<=4d12=2PP | Dano 4d12-12d12=4PP | Dano 13d12+=6PP
+50%HP temp(<=3rod)=3PP | +100%HP temp(<=2rod)=5PP | Ignorar armadura=5PP | Area=+3PP | Imunidade(<=1rod)=6PP

Passiva: N1-7:5 | N8-15:6 | N16-22:7 | N23-30:8
Ativa Fraca: N1-7:4 | N8-15:5 | N16-22:6 | N23-30:7
Ativa Média: N1-7:6 | N8-15:7 | N16-22:8 | N23-30:10
Ativa Forte: N1-7:8 | N8-15:10 | N16-22:12 | N23-30:14
Ultimate: N1-7:10 | N8-15:13 | N16-22:16 | N23-30:20

CALIBRAÇÃO HP ESPERADO:
N5: 140-210 | N10: 250-380 | N15: 380-560 | N20: 520-760 | N25: 700-980 | N30: 950-1350

REGRAS DE BALANCEAMENTO:
1. Use os valores calculados reais da ficha como âncora matematica.
2. Para habilidades OFENSIVAS: o dano da habilidade e EXTRA, nao inclui Dano Base + Arma + Atributo. Um N30 com dano base alto ainda pode ter habilidade com 14d12+60 de dano extra.
3. Custo de Energia proporcional: Fraca=5-19E, Média=20-50E, Forte=51-80E, Ult=80E+.
4. Durações: Fraca 1-3rod | Média 3-5rod | Forte 4-8rod | Ult combate inteiro.
5. Cura: maximo 30% da vida maxima por uso.
6. Considere amplificadores de Triagem e Modulo — eles aumentam o poder REAL alem da habilidade.
7. Evolução: habilidades com evolucaoNivel > 0 devem ter valores escalados. Escale todos os efeitos (dano, duracao, bonus, CDs) proporcionalmente, respeitando o TDH.
8. Nunca reduza efeitos narrativos importantes — prefira aumentar o custo de Energia.
9. Toda habilidade DEVE ter pelo menos 1 efeito mecanico numerico mensuravel.
10. CDs de resistencia: base 14-16 para N1-10, 18-22 para N11-20, 22-28 para N21-30.

Responda SEMPRE em JSON válido, sem markdown, sem code blocks.`
}

// ─── analyzeBalance ───────────────────────────────────────────────────────

export async function analyzeBalance(char) {
  const stats  = computeCharStats(char)
  const evoCtx = buildEvolucaoContext(char.habilidades, char.nivel || 1)

  const fichaCompleta = `
FICHA CALCULADA REAL DO PERSONAGEM:
Nome: ${char.nome || 'Sem Nome'} | Classe: ${char.classe || 'N/A'} | Nível: ${stats.nivel} | Faixa: ${stats.band} | Raça: ${char.raca || 'N/A'} (${char.racaTipo || 'N/A'})
Atributos: FOR ${stats.atributos.FOR}(Mod${stats.atributos.modFOR}) | DES ${stats.atributos.DES}(Mod${stats.atributos.modDES}) | CON ${stats.atributos.CON}(Mod${stats.atributos.modCON}) | INT ${stats.atributos.INT}(Mod${stats.atributos.modINT}) | APA ${stats.atributos.APA} | AM ${stats.atributos.AM}(Mod${stats.atributos.modAM})
Vida Total: ${stats.vidaTotal} | Energia: ${stats.energiaTotal} | PE: ${stats.peTotal} | CA: ${stats.caBase} | Reações: ${stats.reacoes}
Dano Base de Classe: ${stats.danoBase} | Bônus Arma (${char.armaRank}): ${stats.armaDanoBonus} | Ataque Base: ${stats.ataqueBase}
DANO TOTAL BASE (sem habilidades): ${stats.danoBase} + ${stats.armaDanoBonus}
Triagens: ${stats.triagem}
Amplificadores de Triagem: ${stats.triagemAmps}
Amplificadores de Módulo: ${stats.moduleAmps}
Módulos: ${(char.modulosAdquiridos || []).map(m => m.id || m).join(', ') || 'Nenhum'}
Perícias: ${Object.entries(char.pericias || {}).filter(([,v]) => v > 0).map(([k,v]) => `${k}(grau${v})`).join(', ') || 'Nenhuma'}
`

  const habilidadesData = (char.habilidades || []).map((h, i) => {
    const evo = evoCtx.find(e => e.index === i) || {}
    return {
      index: i, tipo: h.tipo, nome: h.nome || 'Sem nome',
      descricao: h.descricao || '', custoEnergia: h.custoEnergia || 0,
      dano: h.dano || '', duracao: h.duracao || '',
      camadaSCP: h.camadaSCP || 2, ppEstimado: h.ppEstimado || 0,
      status: h.status || 'Pendente',
      evolucaoNivel: evo.evolucaoNivel || 0,
      instrucaoEvolucao: evo.instrucaoIA || 'Calibrar para valores base.',
    }
  })

  const armaHabs = (char.armaHabilidades || []).map((h, i) => ({
    index: i, tipo: 'arma', nome: h.nome || 'Sem nome',
    descricao: h.descricao || '', potencia: h.potencia || 'Fraca',
    tipoHabilidade: h.tipo || 'Ativa', custo: h.custo || '',
  }))

  const userMessage = `${fichaCompleta}

HABILIDADES (para revisar e balancear):
${JSON.stringify(habilidadesData, null, 2)}

HABILIDADES DA ARMA:
${JSON.stringify(armaHabs, null, 2)}

Faixa: ${stats.band}. Use TDH e IPL/PP desta faixa.
O dano da habilidade e EXTRA ao dano base+arma+atributo que o personagem ja possui.
Para habilidades com evolucaoNivel > 0: escale efeitos proporcionalmente ao nivel de evolucao.

Responda EXCLUSIVAMENTE com JSON:
{
  "habilidades": [
    {
      "index": 0,
      "nome": "nome ajustado se necessário",
      "descricao": "descrição com valores concretos (mantenha o espírito)",
      "custoEnergia": numero,
      "dano": "XdY+MOD ou vazio",
      "duracao": "X rodadas ou vazio",
      "camadaSCP": 1ou2ou3,
      "ppEstimado": numero,
      "feedback": "explicação referenciando TDH/IPL/evolução"
    }
  ],
  "armaHabilidades": [
    {
      "index": 0,
      "nome": "nome",
      "descricao": "descrição com valores",
      "tipo": "Ativa ou Passiva",
      "custo": "custo descritivo",
      "feedback": "explicação"
    }
  ]
}`

  const response = await callAI([
    { role: 'system', content: buildSystemContext() },
    { role: 'user',   content: userMessage },
  ])

  try {
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    throw new Error('A IA retornou um formato inválido. Tente novamente.')
  }
}

// ─── generateWeaponAbilities ──────────────────────────────────────────────

export async function generateWeaponAbilities(char, weaponId, weaponRank, slots, userDesc, count) {
  const sk     = char.skeletonPoints || {}
  const attrs  = char.atributos || {}
  const totalAttr = (a) => getAttrValue(attrs, a, sk, char)
  const weaponDef = ALL_WEAPONS.find(w => w.id === weaponId)
  const weaponName = weaponDef?.name || weaponId
  const weaponDano = weaponDef?.dano || '?'

  const prompt = `
PERSONAGEM: ${char.nome || 'Sem Nome'} | Classe: ${char.classe || 'N/A'} | Nível: ${char.nivel || 1} | Faixa: ${getLevelBand(char.nivel || 1)}
FOR ${totalAttr('FOR')}(Mod${getModifier(totalAttr('FOR'))}) | DES ${totalAttr('DES')}(Mod${getModifier(totalAttr('DES'))}) | INT ${totalAttr('INT')}(Mod${getModifier(totalAttr('INT'))}) | AM ${totalAttr('AM')}
Triagem: ${char.triagemPrincipal || 'Nenhuma'} | Módulos: ${getModuleAmplifiers(char)}

ARMA: ${weaponName} | Dano base: ${weaponDano} | Rank: ${weaponRank}
Crie EXATAMENTE ${count} habilidade${count > 1 ? 's' : ''}. Total slots NAO pode exceder ${slots}.
Slots: Fraca=1, Média=2, Forte=3.
${userDesc ? `\nDESCRIÇÃO DO JOGADOR: "${userDesc}"` : ''}
Calibre o dano de habilidades como EXTRA ao dano base da arma. Misture Ativa e Passiva.
Use faixa ${getLevelBand(char.nivel || 1)} do TDH como referência de poder máximo.

Responda EXCLUSIVAMENTE com JSON:
{
  "habilidades": [
    { "nome": "nome criativo", "potencia": "Fraca|Média|Forte", "tipo": "Ativa|Passiva", "custo": "custo", "descricao": "descrição com mecânicas numéricas" }
  ]
}`

  const response = await callAI([
    { role: 'system', content: buildSystemContext() },
    { role: 'user',   content: prompt },
  ])
  try {
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    throw new Error('A IA retornou um formato inválido. Tente novamente.')
  }
}

// ─── generateAbilitiesFromDescription ────────────────────────────────────

export async function generateAbilitiesFromDescription(char, description) {
  const sk     = char.skeletonPoints || {}
  const attrs  = char.atributos || {}
  const totalAttr = (a) => getAttrValue(attrs, a, sk, char)

  // Calculate extra ability slots so IA knows what to generate
  const { calcExtraAbilitiesTypes } = await import('../utils/calculator')
  const extraTypes = calcExtraAbilitiesTypes(
    char.triagemPrincipal, char.triagemPrincipalNivel,
    char.subTriagem, char.subTriagemNivel,
    attrs, sk, char.modulosAdquiridos, char
  )
  const allTipos = ['Passiva', 'Ativa', 'Ativa', 'Ativa', 'Ultimate', ...extraTypes]
  const tiposList = allTipos.map((t, i) => `${i+1}. ${t}`).join('\n')

  const prompt = `
PERSONAGEM: ${char.nome || 'Sem Nome'} | Classe: ${char.classe || 'N/A'} | Nível: ${char.nivel || 1} | Faixa: ${getLevelBand(char.nivel || 1)}
FOR ${totalAttr('FOR')} | DES ${totalAttr('DES')} | CON ${totalAttr('CON')} | INT ${totalAttr('INT')} | APA ${totalAttr('APA')} | AM ${totalAttr('AM')}
Triagem: ${char.triagemPrincipal || 'Nenhuma'} (${char.triagemPrincipalNivel || 0}) | Sub: ${char.subTriagem || 'Nenhuma'} (${char.subTriagemNivel || 0})
Módulos: ${(char.modulosAdquiridos || []).map(m => m.name || m.id).join(', ') || 'Nenhum'}
Descrição do jogador: "${description}"

Crie EXATAMENTE ${allTipos.length} habilidades na ORDEM e TIPO abaixo:
${tiposList}

Regras:
- Habilidades "Extra (Triagem)": devem ser complementares às triagens do personagem e ter efeito passivo ou semi-passivo
- Habilidades "Extra (Módulo)": devem refletir o flavor dos módulos adquiridos (${(char.modulosAdquiridos || []).map(m => m.name || m.id).join(', ')})
- NAO atribua valores finais balanceados — use placeholders como XdY+MOD, X rodadas
- Cada habilidade DEVE ter pelo menos 1 efeito mecânico concreto
- Mantenha coerência narrativa: todas as habilidades devem pertencer ao mesmo personagem

Responda EXCLUSIVAMENTE com JSON (exatamente ${allTipos.length} objetos em "habilidades"):
{
  "habilidades": [
    { "tipo": "Passiva|Ativa|Ultimate|Extra (Triagem)|Extra (Módulo)", "nome": "nome criativo", "descricao": "descrição com mecânicas e placeholders" }
  ]
}`

  const response = await callAI([
    { role: 'system', content: buildSystemContext() },
    { role: 'user',   content: prompt },
  ])
  try {
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    throw new Error('A IA retornou um formato inválido. Tente novamente.')
  }
}

function buildMysticDraftPrompt(systemType, draft, context = {}) {
  const analysisNote = typeof context.analysis_note === 'string' ? context.analysis_note.trim() : ''
  const blocks = {
    alchemy: {
      title: 'SISTEMA: ALQUIMIA DO OLYMPO',
      lore: [
        '- A Alquimia canaliza leis corrompidas do Abismo atraves de Regentes, ou Pactos com Entidades do Limiar.',
        '- Todo ritual enfraquece o Veu e pode gerar Ruptura. Quanto maior o circulo, maior o risco.',
        '- Regentes funcionam como um painel: a lei corrompida e absorvida e descarregada em sigilos.',
        '- Limiar funciona como pacto: poder maior, mas preco narrativo mais severo.',
        '- Rituais de circulos diferentes podem repetir a mesma familia de efeito, mas com numeros, area e custo escalados.',
      ],
      balance: [
        '- 1o circulo: utilitario ou tatico leve. PE 4-10. DT 13-15. Custo estrutural: 4 espacos.',
        '- 2o circulo: impacto consistente. PE 10-20. DT 15-17. Custo estrutural: 6 espacos.',
        '- 3o circulo: poder alto e identidade forte. PE 20-30. DT 18-20. Custo estrutural: 10 espacos.',
        '- 4o circulo: catastrofico e raro. PE 30-45. DT 21-25. Custo estrutural: 15 espacos.',
      ],
      protocol: [
        '- SCP 2 para rituais taticos e corporais.',
        '- SCP 3 apenas quando o ritual age como fenomeno epico, catastrofico ou quase artefato.',
        '- Cura imediata nao passa de 30% da vida maxima esperada da faixa.',
        '- Controle duro total deve durar no maximo 1 rodada em circulos 3-4; prefira penalidade parcial.',
        '- Como o sistema usa espacos por circulo, rituais mais caros podem sustentar efeitos mais densos, mas ainda precisam ter contrapeso, custo energetico e risco coerentes.',
      ],
      extras: [
        '- Se houver uma instrucao direta do admin, trate essa instrucao como prioridade editorial: ela pode apontar um problema do ritual atual ou descrever a ideia-base de um ritual novo.',
        '- Se o rascunho vier incompleto, use a instrucao do admin e o lore para completar nome, fonte, efeito, preco e numeros de modo coerente.',
      ],
    },
    spell: {
      title: 'SISTEMA: FEITICOS E MAGIA INSTANTANEA DO OLYMPO',
      lore: [
        '- Feiticos sao formulas de conjuracao ativas. Alguns nascem da Bruxaria ritual, outros da Arcana instantanea de magos e guardioes.',
        '- Bruxaria tende a trabalhar vinculos, maldicoes, cura, sacrificio, selos e interferencia narrativa.',
        '- Arcana instantanea tende a trabalhar rajadas, barreiras, teleporte, leitura estrutural e manipulacao limpa de mana.',
        '- A tradicao do feitico deve ficar clara no resultado final, inclusive em nome, custo, preco e linguagem visual.',
      ],
      balance: [
        '- 1o circulo: resposta curta, suporte basico ou ataque simples. PE 8-15. Custo estrutural: 4 espacos.',
        '- 2o circulo: consistencia de combate e utilidade forte. PE 10-22. Custo estrutural: 6 espacos.',
        '- 3o circulo: assinatura de escola, impacto alto e mais risco. PE 20-32. Custo estrutural: 10 espacos.',
        '- 4o circulo: raro, epico e exigente. PE 32-45. Custo estrutural: 15 espacos.',
      ],
      protocol: [
        '- Nao trate feiticos como habilidades raciais permanentes; sao conjuracoes escolhidas e opcionais.',
        '- Feiticos de Bruxaria podem cobrar componentes, custo narrativo ou exposição. Feiticos de Arcana podem cobrar janela de vulnerabilidade, foco ou concentração.',
        '- Cura segue o limite de 30% da vida esperada da faixa por uso imediato, salvo efeitos prolongados claramente pagos.',
        '- Controle total deve ser curto; prefira lentidao, queda de resultado, selos parciais e supressao temporaria.',
      ],
      extras: [
        '- Quando houver tag ou contexto de tradicao, respeite esse estilo: bruxaria nao deve soar como canhao de mana puro; arcana nao deve soar como maldicao de sangue ritual.',
        '- Se o admin pedir criacao de novo feitico, complete nome, escola, numeros e contrapeso de forma coerente com a tradicao escolhida.',
      ],
    },
    rune: {
      title: 'SISTEMA: RUNAS DO OLYMPO',
      lore: [
        '- Runas sao fragmentos derivados das 24 Runas Primordiais, mas a biblioteca jogavel trabalha apenas suas expressoes menores, comuns e maiores.',
        '- Toda runa precisa deixar clara sua matriz primordial de origem sem revelar segredos de trama como portadores atuais.',
        '- Runas funcionam como selos de vinculo: algumas ficam latentes, outras podem ser ativadas simultaneamente dentro de um limite.',
      ],
      balance: [
        '- Runas Menores: entrada versatil, leitura rapida e impacto simples. Normalmente 1o circulo. Custo estrutural: 4 espacos.',
        '- Runas Comuns: efeito tatico robusto, zona, vinculo ou mobilidade real. Normalmente 2o ou 3o circulo. Custo estrutural: 6 ou 10 espacos.',
        '- Runas Maiores: proxima da origem primordial, rara e pesada. Normalmente 3o ou 4o circulo. Custo estrutural: 10 ou 15 espacos.',
      ],
      protocol: [
        '- Toda runa precisa indicar seu grau (menor, comum ou maior) e seu primordial-base.',
        '- Runas maiores devem ser potentes, mas precisam de custo real e jamais podem parecer passivas gratuitas sem trade-off.',
        '- Sempre pense em uso opcional pelo jogador: runas devem ser fortes, legiveis e enxutas o bastante para nao sobrecarregar a ficha.',
      ],
      extras: [
        '- Se o admin descrever apenas a fantasia da runa, complete efeito, custo, contrapeso e grau de forma sensata.',
        '- Se houver conflito entre numero e fantasia, prefira preservar a fantasia e ajustar custo, duracao, dt e contrapeso.',
      ],
    },
  }
  const block = blocks[systemType] || blocks.alchemy
  const prompt = `
${block.title}

LORE E LIMITES:
${block.lore.join('\n')}

BALANCEAMENTO POR CIRCULO:
${block.balance.join('\n')}

PROTOCOLO:
${block.protocol.join('\n')}
${block.extras.join('\n')}

RASCUNHO:
${JSON.stringify(draft, null, 2)}

CONTEXTO OPCIONAL:
${JSON.stringify(context, null, 2)}

INSTRUCAO DIRETA DO ADMIN:
${analysisNote || 'Nenhuma. Apenas revisar, completar e balancear o ritual atual.'}

Responda EXCLUSIVAMENTE com JSON:
{
  "name": "nome refinado",
  "circle": 1,
  "category": "Ataque",
  "pe_cost": 0,
  "min_level": 1,
  "action_cost": "Acao Padrao",
  "duration": "Instantaneo",
  "range": "18m",
  "short_description": "resumo curto",
  "effect": "efeito final com numeros concretos",
  "source_kind": "regente|limiar|neutro",
  "source_name": "nome da entidade ou fonte",
  "law_name": "lei ou eixo metafisico",
  "price": "preco ou custo narrativo",
  "rupture_risk": 1,
  "protocol_layer": 2,
  "pp_estimate": 0,
  "tags": ["tag1", "tag2"],
  "ai_feedback": "explicacao curta de balanceamento"
}`

  return prompt
}

async function analyzeMysticDraft(systemType, draft, context = {}) {
  const prompt = buildMysticDraftPrompt(systemType, draft, context)

  const response = await callAI([
    { role: 'system', content: buildSystemContext() },
    { role: 'user', content: prompt },
  ])

  try {
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    throw new Error('A IA retornou um formato invalido para o cadastro mistico.')
  }
}

export async function analyzeAlchemyRitualDraft(draft, context = {}) {
  return analyzeMysticDraft('alchemy', draft, context)
}

export async function analyzeSpellDraft(draft, context = {}) {
  return analyzeMysticDraft('spell', draft, context)
}

export async function analyzeRuneDraft(draft, context = {}) {
  return analyzeMysticDraft('rune', draft, context)
}

export async function analyzeMagicDraft(draft, context = {}) {
  return analyzeMysticDraft('magic', draft, context)
}
