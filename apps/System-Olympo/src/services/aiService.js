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

import { WEAPONS as ALL_WEAPONS, WEAPON_RANKS as ALL_WEAPON_RANKS, RANK_LEVEL_BAND as RANK_BAND_MAP } from '../data/weapons'
import {
  calcVidaTotal, calcEnergiaTotal, calcPeTotal,
  calcCA, calcReacoes, calcDanoBase, calcPEHTotal,
  getAttrValue, getClassDef,
} from '../utils/calculator'
import { getModifier } from '../data/attributes'
import { buildEvolucaoContext, calcPEHSpent } from '../utils/skillEvolution'
import { supabase } from '../lib/supabase'
import { getRaceLabel } from '../utils/raceCalculator'
import { calcEquipStats, getEquipmentRarity, EQUIPMENT_TYPES, ARMOR_TYPES } from '../data/equipment'

// ─── Infra (Supabase Edge Function com fallback para env key direto) ────────

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

const MAX_RETRIES = 3
const BASE_DELAY_MS = 1500

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function getRetryDelay(attempt) {
  return BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500
}

function isRetryable(status) {
  return status === 429 || status === 502 || status === 503 || status === 504
}

async function callAI(messages, { maxTokens = 4096 } = {}) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke('openrouter-chat', {
        body: { messages, temperature: 0.35, max_tokens: maxTokens },
      })
      if (error) {
        const status = error?.context?.status || error?.status || 0
        if (isRetryable(status) && attempt < MAX_RETRIES) {
          await sleep(getRetryDelay(attempt))
          continue
        }
        if (status === 429) throw new Error('Limite de requisições atingido. Aguarde alguns segundos e tente novamente.')
        throw error
      }
      if (!data) throw new Error('Resposta vazia da Edge Function.')
      const content = data.choices?.[0]?.message?.content
      if (!content) throw new Error('IA retornou conteúdo vazio.')
      return content
    } catch (edgeError) {
      const status = edgeError?.context?.status || edgeError?.status || 0
      if (isRetryable(status) && attempt < MAX_RETRIES) {
        await sleep(getRetryDelay(attempt))
        continue
      }
      if (!OPENROUTER_API_KEY) throw edgeError
      try {
        for (let fbAttempt = 0; fbAttempt <= MAX_RETRIES; fbAttempt++) {
          const response = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': window.location.origin,
              'X-Title': 'System Olympo 2.0',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.0-flash-001',
              messages,
              temperature: 0.35,
              max_tokens: maxTokens,
            }),
          })
          if (!response.ok) {
            if (isRetryable(response.status) && fbAttempt < MAX_RETRIES) {
              await sleep(getRetryDelay(fbAttempt))
              continue
            }
            const err = await response.json().catch(() => ({}))
            if (response.status === 429) throw new Error('Limite de requisições atingido (OpenRouter). Aguarde alguns segundos e tente novamente.')
            throw new Error(`OpenRouter ${response.status}: ${err.error?.message || 'Erro desconhecido'}`)
          }
          const data = await response.json()
          const content = data.choices?.[0]?.message?.content
          if (!content) throw new Error('A IA retornou uma resposta vazia. Tente novamente.')
          return content
        }
      } catch (fbError) {
        throw fbError
      }
      throw edgeError
    }
  }
  throw new Error('Falha após múltiplas tentativas. Tente novamente em alguns segundos.')
}

async function callAIStream(messages, onChunk) {
  const body = { messages, temperature: 0.35, max_tokens: 4096, stream: true }

  try {
    const { data, error } = await supabase.functions.invoke('openrouter-chat', {
      body,
    })
    if (error) throw error

    if (data && typeof data === 'object' && data.choices) {
      const content = data.choices?.[0]?.message?.content || ''
      if (onChunk) onChunk(content)
      return content
    }

    if (typeof data === 'string') {
      let full = ''
      const lines = data.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') break
          try {
            const parsed = JSON.parse(raw)
            const delta = parsed.choices?.[0]?.delta?.content || ''
            if (delta) {
              full += delta
              if (onChunk) onChunk(delta, full)
            }
          } catch {}
        }
      }
      return full
    }

    return typeof data === 'string' ? data : ''
  } catch (edgeErr) {
    if (!OPENROUTER_API_KEY) throw edgeErr
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'System Olympo 2.0',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages,
        temperature: 0.35,
        max_tokens: 4096,
        stream: true,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(`OpenRouter ${response.status}: ${err.error?.message || 'Erro desconhecido'}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let full = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') break
          try {
            const parsed = JSON.parse(raw)
            const delta = parsed.choices?.[0]?.delta?.content || ''
            if (delta) {
              full += delta
              if (onChunk) onChunk(delta, full)
            }
          } catch {}
        }
      }
    }
    return full
  }
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
  const equipStats    = calcEquipStats(char.equipamentos || [])

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
    vidaTotal, energiaTotal, peTotal, caBase, reacoes, equipStats,
    danoBase, ataqueBaseNum: ataqueBase, ataqueBase: `d20+${ataqueBase}`,
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

PRINCÍPIO FUNDAMENTAL — RESPEITO AO JOGADOR:
1. NUNCA altere a estrutura narrativa ou reescreva a descrição da habilidade. O jogador escreveu com propósito.
2. Se o jogador já atribuiu valores (dano, energia, duração), ANALISE esses valores e ajuste APENAS os números se necessário, mantendo a estrutura e o texto original. Os valores numéricos dentro da descrição TAMBÉM devem ser balanceados.
3. Habilidades complexas com múltiplos sub-efeitos (ex: passiva que concede 3 benefícios) são NORMAIS. Analise cada sub-efeito separadamente e some os PP.
4. Interprete descrições narrativas: "alta velocidade" pode ser Vantagem, "ataque garantido" ignora teste de ataque, etc.
5. Personagens de NÍVEL ALTO devem ter habilidades PODEROSAS. Nunca empobreça um N25-30. O TDH é um TETO, não uma meta a reduzir.
6. O NÍVEL DO PERSONAGEM é a referência principal. Habilidades de um N30 devem ser proporcionalmente mais fortes que as de um N10.

PEH — PONTOS DE EVOLUÇÃO DE HABILIDADE (Referência Principal de Poder):
O PEH total do personagem indica QUANTOS pontos de evolução ele distribuiu.
- evolucaoNivel > 0 significa que o jogador INVESTIU recursos nessa habilidade — ela deve ser proporcionalmente mais forte.
- Cada nível de evolução deve aumentar TODOS os efeitos proporcionalmente ao bracket:
  Fraca (<20E): +1d6 dano, +4 flat, +2 Energia por nível
  Média (20-50E): +1d8 dano, +6 flat, +3 Energia por nível
  Forte (>50E): +1d10 dano, +8 flat, +5 Energia por nível
  Ultimate: +2d10 dano, +12 flat, +8 Energia por nível
- Se evolucaoNivel = 0 e o jogador sugeriu valores altos, ANALISE se faz sentido para o nível e tipo. Ajuste para baixo APENAS se exceder o TDH bruscamente.

SCP — SISTEMA DE CAMADAS DE PODER (Secao 14.1):
Camada 1 (Base): Treino de Perícia + Modificador de Atributo — SEM LIMITE.
Camada 2 (Tático — Habilidades, Triagens, Módulos): N1-7:+8 | N8-15:+12 | N16-22:+16 | N23-30:+20
Camada 3 (Épico — Armas, Runas, Artefatos): N1-7:+5 | N8-15:+8 | N16-22:+12 | N23-30:+16
BÔNUS TOTAL MÁXIMO = Camada 1 (ilimitada) + Camada 2 + Camada 3.

EQUIPAMENTOS E ARMADURA:
- Armadura de equipamento NAO aumenta CA base. Ela funciona como absorcao/reducao de dano antes da vida, com escudo temporario separado quando existir.
- Cada peca equipada soma Vida Extra e Armadura conforme peca + rank. Estes valores entram no contexto real de sobrevivencia.
- Ranks de equipamento concedem habilidades proprias: Comum/Incomum/Raro 0, Epico/Heroico 1 ativa, Ancestral/Mitico 2 ativas, Transcendente 2 ativas + 1 passiva.
- Sets por tipo (Guerreiro, Assassino, Tecnologico) ativam bonus em 2, 3 e 4 pecas. Considere bonus de set como poder acumulado e evite empilhar efeitos permanentes altos sem custo.
- Equipamentos podem conceder sobrevida, absorcao, escudo, critico ou dano leve. Dano direto grande continua sendo funcao de armas e habilidades.

TDH — TETO DE DANO POR HABILIDADE (Secao 14.4):
ATENÇÃO: estes valores são para o dano GERADO PELA HABILIDADE ISOLADAMENTE.
O dano total do ataque ainda inclui: Dano Base de Classe + Bônus de Arma (Rank) + Modificadores.
N1-7:   Fraca=3d8+12    | Media=4d10+18  | Forte=6d10+24  | Ult=8d12+30
N8-15:  Fraca=4d10+18   | Media=6d10+25  | Forte=9d12+32  | Ult=13d12+45
N16-22: Fraca=6d12+25   | Media=8d12+38  | Forte=12d12+50 | Ult=17d12+65
N23-30: Fraca=8d12+32   | Media=10d12+45 | Forte=14d12+60 | Ult=20d12+80

IMPORTANTE SOBRE TDH: Esses valores são TETOS para a faixa. Personagens no topo da faixa (ex: N14-15) podem se aproximar do teto da próxima. NUNCA reduza valores de um N28-30 para o teto de N23-30 se a descrição e o PEH justificam estar próximo do teto.

IPL — PP LIMITE POR TIPO E FAIXA (Secao 14.5):
Pesos: +5atk/def(temp)=3PP | +10atk/def(temp)=5PP | +15atk/def(temp,N16+)=7PP
Vantagem=4PP | +1Ataque Extra=5PP | Dano<=4d12=2PP | Dano 4d12-12d12=4PP | Dano 13d12+=6PP
+50%HP temp(<=3rod)=3PP | +100%HP temp(<=2rod)=5PP | Ignorar armadura=5PP | Area=+3PP | Imunidade(<=1rod)=6PP

Passiva: N1-7:5 | N8-15:6 | N16-22:7 | N23-30:8
Ativa Fraca: N1-7:4 | N8-15:5 | N16-22:6 | N23-30:7
Ativa Média: N1-7:6 | N8-15:7 | N16-22:8 | N23-30:10
Ativa Forte: N1-7:8 | N8-15:10 | N16-22:12 | N23-30:14
Ultimate: N1-7:10 | N8-15:13 | N16-22:16 | N23-30:20

LCP — LIMITE CUMULATIVO DE PODER (Secao 14.6):
CRÍTICO: Analise TODAS as habilidades JUNTAS. O ORÁCULO deve SOMAR todos os bônus de todas as habilidades e garantir que o TOTAL não exceda os limites abaixo. Cada habilidade NÃO é analisada isoladamente — o ACÚMULO é o que importa.

Limites TOTAIS (Base da ficha + soma de TODAS as habilidades) por faixa de nível:

Bônus Total no dado de ATAQUE (d20+X):
N1-7: máximo +18 | N8-15: máximo +26 | N16-22: máximo +30 | N23-30: máximo +42

Bônus Total no dado de ESQUIVA/DEFESA (d20+X):
N1-7: máximo +18 | N8-15: máximo +26 | N16-22: máximo +30 | N23-30: máximo +42

Bônus Total de CA (soma de todas as habilidades):
N1-7: máximo +4 | N8-15: máximo +6 | N16-22: máximo +6 | N23-30: máximo +10

Ataques Extras Totais (soma de todas as habilidades):
N1-7: máximo +1 | N8-15: máximo +1 | N16-22: máximo +1 | N23-30: máximo +2

REGRA DE CÁLCULO CUMULATIVO:
1. Pegue o valor BASE da ficha (ex: Ataque Base = d20+22).
2. SOMA todos os bônus de ATAQUE de TODAS as habilidades (passivas + ativas + buff).
3. Se BASE + SOMA > LIMITE DA FAIXA, REDUZA os bônus individuais até caber no limite.
4. Priorize manter a identidade da habilidade — reduza bônus numéricos antes de remover efeitos.
5. Bônus temporários (1-2 rodadas) com custo alto de Energia ou condição difícil podem exceder o limite em até +5, mas NUNCA mais que isso.
6. Bônus passivos permanentos SEM custo devem ser mais conservadores.
7. Se uma habilidade concede Vantagem em ataques, isso NÃO soma como número, mas conta como 4PP.

EXEMPLO PRÁTICO: Personagem N16 com Ataque Base d20+22. Limite N16-22 = +30. Todas as habilidades juntas podem dar NO MÁXIMO +8 de bônus acumulado no ataque. Se três habilidades concedem +5 cada, o total seria +15 → excederia o limite. Reduza proporcionalmente para +8 total.

CALIBRAÇÃO HP ESPERADO:
N5: 140-210 | N10: 250-380 | N15: 380-560 | N20: 520-760 | N25: 700-980 | N30: 950-1350

REGRAS DE BALANCEAMENTO:
1. Use os valores calculados reais da ficha como âncora matematica.
2. Para habilidades OFENSIVAS: o dano da habilidade e EXTRA, nao inclui Dano Base + Arma + Atributo.
3. Custo de Energia proporcional: Fraca=5-19E, Média=20-50E, Forte=51-80E, Ult=80E+.
4. Durações: Fraca 1-3rod | Média 3-5rod | Forte 4-8rod | Ult combate inteiro.
5. Cura: maximo 30% da vida maxima por uso.
6. Considere amplificadores de Triagem e Modulo — eles aumentam o poder REAL alem da habilidade.
7. Evolução: habilidades com evolucaoNivel > 0 devem ter valores escalados proporcionalmente ao bracket e PEH investido.
8. NUNCA reduza efeitos narrativos — prefira ajustar o custo de Energia ou CDs.
9. Toda habilidade DEVE ter pelo menos 1 efeito mecanico numerico mensuravel.
10. CDs de resistencia: base 14-16 para N1-10, 18-22 para N11-20, 22-28 para N21-30.
11. Habilidades com condições (ex: "se atingir 2 disparos", "se em desvantagem numérica") são mais difíceis de ativar e podem ter valores mais altos que o teto do bracket — considere a dificuldade de ativação.
12. Para passivas complexas com múltiplos sub-efeitos: some os PP de cada sub-efeito e verifique se o total está dentro do limite da passiva para a faixa.
13. REGRAS DE BALANCEAMENTO DA DESCRIÇÃO: A descrição do jogador contém os valores REAIS das mecânicas. Você DEVE:
    a) Preservar a estrutura narrativa e o texto do jogador — não reescreva, não reformule.
    b) Identificar TODOS os valores numéricos mecânicos na descrição (bônus de ataque, esquiva, CA, dano, vida, energia, dados, etc.).
    c) Substituir APENAS os valores numéricos pelos valores balanceados, mantendo o texto ao redor idêntico.
    d) Retornar o campo "descricaoBalanceada" com a descrição ORIGINAL mas com os números atualizados.
    e) Se a descrição contém bônus cumulativos com custo (ex: "+10 no Ataque (-20 de Vida: +15 no Ataque)"), balanceie AMBOS os valores proporcionalmente.
    f) NUNCA adicione efeitos que não existiam. NUNCA remova efeitos. Apenas ajuste os números.
    g) Exemplo: se o jogador escreveu "+10 no Ataque" e o balanceamento indica +6, a descrição balanceada fica "+6 no Ataque".

Responda SEMPRE em JSON válido, sem markdown, sem code blocks.`
}

// ─── analyzeBalance ───────────────────────────────────────────────────────

export async function analyzeBalance(char) {
  const stats  = computeCharStats(char)
  const evoCtx = buildEvolucaoContext(char.habilidades, char.nivel || 1)
  const pehTotal = calcPEHTotal(char.classe || '', char.nivel || 1, char.choices || {}, char.modulosAdquiridos || [])
  const pehSpent = calcPEHSpent(char.habilidades)

  const fichaCompleta = `
FICHA CALCULADA REAL DO PERSONAGEM:
Nome: ${char.nome || 'Sem Nome'} | Classe: ${char.classe || 'N/A'} | Nível: ${stats.nivel} | Faixa: ${stats.band} | Raça: ${char.raca || 'N/A'} (${char.racaTipo || 'N/A'})
Atributos: FOR ${stats.atributos.FOR}(Mod${stats.atributos.modFOR}) | DES ${stats.atributos.DES}(Mod${stats.atributos.modDES}) | CON ${stats.atributos.CON}(Mod${stats.atributos.modCON}) | INT ${stats.atributos.INT}(Mod${stats.atributos.modINT}) | APA ${stats.atributos.APA} | AM ${stats.atributos.AM}(Mod${stats.atributos.modAM})
Vida Total: ${stats.vidaTotal} | Energia: ${stats.energiaTotal} | PE: ${stats.peTotal} | CA: ${stats.caBase} | Reações: ${stats.reacoes}
Equipamentos equipados: Armadura ${stats.equipStats.totalArmor} | Vida Extra ${stats.equipStats.totalExtraLife} | Escudo ${stats.equipStats.totalShield} | Crit +${stats.equipStats.totalCrit}% | Dano +${stats.equipStats.totalDamage}
Sets ativos: ${stats.equipStats.activeSetBonuses.map(s => `${s.type.label} ${s.count}/4 (${s.bonus.label}: ${s.bonus.bonus})`).join(' | ') || 'Nenhum'}
Dano Base de Classe: ${stats.danoBase} | Bônus Arma (${char.armaRank}): ${stats.armaDanoBonus} | Ataque Base: ${stats.ataqueBase} (valor numérico: +${stats.ataqueBaseNum})
DANO TOTAL BASE (sem habilidades): ${stats.danoBase} + ${stats.armaDanoBonus}
PEH Total disponível: ${pehTotal} | PEH gasto: ${pehSpent} | PEH restante: ${pehTotal - pehSpent}
Triagens: ${stats.triagem}
Amplificadores de Triagem: ${stats.triagemAmps}
Amplificadores de Módulo: ${stats.moduleAmps}
Módulos: ${(char.modulosAdquiridos || []).map(m => m.id || m).join(', ') || 'Nenhum'}
Perícias: ${Object.entries(char.pericias || {}).filter(([,v]) => v > 0).map(([k,v]) => `${k}(grau${v})`).join(', ') || 'Nenhuma'}

VALORES BASE PARA CÁLCULO LCP:
- Ataque Base numérico: +${stats.ataqueBaseNum}
- CA Base: ${stats.caBase}
- Limite LCP Ataque para ${stats.band}: ${stats.band === 'N1-7' ? '+18' : stats.band === 'N8-15' ? '+26' : stats.band === 'N16-22' ? '+30' : '+42'}
- Limite LCP Esquiva para ${stats.band}: ${stats.band === 'N1-7' ? '+18' : stats.band === 'N8-15' ? '+26' : stats.band === 'N16-22' ? '+30' : '+42'}
- Limite LCP CA bônus para ${stats.band}: ${stats.band === 'N1-7' ? '+4' : stats.band === 'N8-15' ? '+6' : stats.band === 'N16-22' ? '+6' : '+10'}
- Limite LCP Ataques Extras para ${stats.band}: ${stats.band === 'N1-7' ? '+1' : stats.band === 'N8-15' ? '+1' : stats.band === 'N16-22' ? '+1' : '+2'}
- Bônus MÁXIMO de habilidades no Ataque: ${(() => { const cap = stats.band === 'N1-7' ? 18 : stats.band === 'N8-15' ? 26 : stats.band === 'N16-22' ? 30 : 42; return '+' + (cap - stats.ataqueBaseNum); })()}
`

  const habilidadesData = (char.habilidades || []).map((h, i) => {
    const evo = evoCtx.find(e => e.index === i) || {}
    return {
      index: i, tipo: h.tipo, nome: h.nome || 'Sem nome',
      descricao: h.descricao || '', custoEnergia: h.custoEnergia || 0,
      dano: h.dano || '', duracao: h.duracao || '',
      status: h.status || 'Pendente',
      evolucaoNivel: evo.evolucaoNivel || 0,
      bracket: evo.bracket || 'FRACA',
      instrucaoEvolucao: evo.instrucaoIA || 'Calibrar para valores base.',
      jogadorJaDefiniuValores: !!(h.dano || h.custoEnergia || h.duracao),
    }
  })

  const armaHabs = (char.armaHabilidades || []).map((h, i) => ({
    index: i, tipo: 'arma', nome: h.nome || 'Sem nome',
    descricao: h.descricao || '', potencia: h.potencia || 'Fraca',
    tipoHabilidade: h.tipo || 'Ativa', custo: h.custo || '',
    armaRank: char.armaRank || 'Comum',
    armaFaixa: RANK_BAND_MAP[char.armaRank] || 'N1-5',
  }))

  const userMessage = `${fichaCompleta}

HABILIDADES (para revisar e balancear):
${JSON.stringify(habilidadesData, null, 2)}

HABILIDADES DA ARMA:
${JSON.stringify(armaHabs, null, 2)}

  INSTRUÇÕES CRÍTICAS:
- Faixa: ${stats.band}. Use TDH e IPL/PP desta faixa como referência.
- O dano da habilidade é EXTRA ao dano base+arma+atributo que o personagem já possui.
- PEH Total: ${pehTotal} | Gasto: ${pehSpent}. Habilidades com evolucaoNivel > 0 receberam INVESTIMENTO do jogador e devem ser proporcionais.
- IMPORTANTE: Se jogadorJaDefiniuValores=true, o jogador JÁ ESCREVEU valores. ANALISE se estão adequados para o nível/bracket/PEH. Ajuste APENAS se exceder o TDH bruscamente.
- Para habilidades complexas com múltiplos sub-efeitos (ex: passivas que concedem 3 benefícios): some os PP de cada sub-efeito individualmente.
- Habilidades com condições de ativação difíceis (ex: "precisa acertar 2 disparos primeiro") podem ter valores maiores que o teto do bracket.
- Respeite o NÍVEL do personagem. Um N${stats.nivel} DEVE ter habilidades impactantes. Não empobreça personagens de nível alto.

VERIFICAÇÃO CUMULATIVA OBRIGATÓRIA (LCP — Seção 14.6):
ANTES de responder, VOCÊ DEVE:
1. Listar TODOS os bônus de ataque de todas as habilidades. Somar: ${stats.ataqueBaseNum} (base) + TOTAL_BONUS_HABILIDADES. Se > limite da faixa, REDUZA.
2. Listar TODOS os bônus de esquiva/defesa de todas as habilidades. Mesma verificação.
3. Listar TODOS os bônus de CA de todas as habilidades. Verificar contra limite CA da faixa.
4. Listar TODOS os ataques extras de todas as habilidades. Verificar contra limite de ataques extras.
5. Se o jogador descreveu bônus narrativos como "+10 no Ataque", "+5 na Esquiva", "+8 CA" etc., esses SÃO bônus numéricos que contam para o LCP.
6. No campo "feedback" de cada habilidade, INCLUA a verificação: "Soma cumulativa de bônus de [ataque/esquiva/CA]: +X (base +Y, limite da faixa +Z)".

Esta verificação é OBRIGATÓRIA. Personagens que acumulam bônus absurdos de múltiplas habilidades precisam ser balanceados GLOBALMENTE, não habilidade por habilidade.

Responda EXCLUSIVAMENTE com JSON:
{
  "habilidades": [
    {
      "index": 0,
      "nome": "mantenha o nome original",
      "descricao": "MANTEHA EXATAMENTE a descrição original do jogador, palavra por palavra, sem alterações.",
      "descricaoBalanceada": "A MESMA descrição do jogador, mas com TODOS os valores numéricos mecânicos substituídos pelos valores balanceados. Preserve estrutura, formatação e narrativa — apenas troque os números.",
      "custoEnergia": numero_ajustado,
      "dano": "XdY+MOD ajustado ou vazio",
      "duracao": "X rodadas ajustado ou vazio",
      "feedback": "explique: 1) o que analisou 2) quais valores na descrição foram alterados (antes→depois) 3) referência ao TDH/PEH/bracket/LCP"
    }
  ],
  "armaHabilidades": [
    {
      "index": 0,
      "nome": "mantenha o nome",
      "descricao": "MANTEHA a descrição original. Apenas ajuste valores numéricos se necessário.",
      "descricaoBalanceada": "Descrição com valores numéricos atualizados, preservando narrativa.",
      "tipo": "Ativa ou Passiva",
      "custo": "custo ajustado",
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
  const weaponMec = weaponDef?.mec || ''
  const weaponBand = RANK_BAND_MAP[weaponRank] || 'N1-7'

  const existingHabs = (char.armaHabilidades || []).map((h, i) => ({
    index: i, nome: h.nome || '', descricao: h.descricao || '', potencia: h.potencia || 'Fraca', tipo: h.tipo || 'Ativa', custo: h.custo || '',
  }))

  const prompt = `
VOCE E O ORACULO — MOTOR DE BALANCEAMENTO DE ARMAS DO SISTEMA OLYMPO 2.0.

CONTEXTO DO BALANCEAMENTO DE ARMA:
O nivel de referencia para balancear as habilidades da arma NAO e o nivel do personagem — e o RANK DA ARMA.
Cada rank mapeia para uma faixa de poder equivalente a um nivel de personagem:
- Comum → N1-5 | Incomum → N3-8 | Raro → N6-12
- Épico → N10-16 | Heroico → N14-20 | Ancestral → N18-25
- Mítico → N22-28 | Transcendente → N26-30

ARMA ATUAL: ${weaponName} | Dano base: ${weaponDano} | Mecânica: ${weaponMec}
RANK DA ARMA: ${weaponRank} | Faixa de poder equivalente: ${weaponBand}
Crie EXATAMENTE ${count} habilidade${count > 1 ? 's' : ''}. Total slots NAO pode exceder ${slots}.
Slots: Fraca=1, Média=2, Forte=3.

PERSONAGEM (contexto adicional): ${char.nome || 'Sem Nome'} | Classe: ${char.classe || 'N/A'} | Nível: ${char.nivel || 1}
FOR ${totalAttr('FOR')}(Mod${getModifier(totalAttr('FOR'))}) | DES ${totalAttr('DES')}(Mod${getModifier(totalAttr('DES'))}) | INT ${totalAttr('INT')}(Mod${getModifier(totalAttr('INT'))}) | AM ${totalAttr('AM')}
Triagem: ${char.triagemPrincipal || 'Nenhuma'} | Módulos: ${getModuleAmplifiers(char)}
${userDesc ? `\nDESCRIÇÃO DO JOGADOR: "${userDesc}"` : ''}

REGRAS DE BALANCEAMENTO POR RANK DA ARMA:
Use a faixa ${weaponBand} como referencia para o TDH e IPL:

TDH (TETO DE DANO POR HABILIDADE DA ARMA):
N1-5:  Fraca=2d6+8   | Media=3d8+12  | Forte=5d8+18
N3-8:  Fraca=3d8+12  | Media=4d10+18 | Forte=6d10+24
N6-12: Fraca=4d10+15 | Media=6d10+22 | Forte=8d12+30
N10-16: Fraca=5d10+20| Media=7d12+28 | Forte=10d12+38
N14-20: Fraca=6d12+25| Media=9d12+35 | Forte=12d12+48
N18-25: Fraca=8d12+30| Media=10d12+42| Forte=14d12+58
N22-28: Fraca=9d12+35| Media=12d12+48| Forte=16d12+65
N26-30: Fraca=10d12+40|Media=14d12+55| Forte=20d12+75

CUSTO DE ENERGIA: Fraca=3-10E | Media=10-25E | Forte=25-50E
DURAÇÃO: Fraca 1-2rod | Media 2-4rod | Forte 3-6rod

IMPORTANTE:
1. O dano da habilidade e EXTRA ao dano base da arma + bônus do rank.
2. Habilidades Passivas não devem ter custo de Energia — elas são efeitos permanentes.
3. Habilidades devem interagir com a mecânica única da arma (${weaponMec}).
4. Armas de rank alto (Ancestral, Mítico, Transcendente) DEVEM ter habilidades poderosas.
5. Cada habilidade DEVE ter pelo menos 1 efeito mecânico numerico mensuravel.
6. Misture tipos Ativa e Passiva de forma criativa.
7. O nome da habilidade deve ser tematico e combinar com o tipo de arma.

${existingHabs.length > 0 ? `
HABILIDADES EXISTENTES DA ARMA (para contexto):
${JSON.stringify(existingHabs, null, 2)}
` : ''}

Responda EXCLUSIVAMENTE com JSON:
{
  "habilidades": [
    { "nome": "nome criativo e tematico", "potencia": "Fraca|Média|Forte", "tipo": "Ativa|Passiva", "custo": "custo em PE/Energia", "descricao": "descrição com mecânicas numéricas detalhadas e balanceadas para a faixa ${weaponBand}" }
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

  const REGENT_LORE = `
UNIVERSO NARRATIVO — REGENTES E DISTORÇÃO DE LEIS FÍSICAS:
Todo ritual é uma CHAMADA a um Regente de outra dimensão que DISTORCE sua respectiva lei da física.
Os 4 Regentes:
1. Senhor da Anti-Termodinâmica — Distorce calor, frio, energia térmica, entropia, mudanças de fase. Rituais desta linha manipulam temperatura, invertem processos entrópicos, transferem energia térmica entre corpos.
2. Senhor da Anti-Relatividade — Distorce espaço, tempo, gravidade, velocidade da luz. Rituais desta linha curvam espaço-tempo, deslocam massas, comprimem distâncias, manipulam gravidade.
3. Senhor da Anti-Inércia — Distorce força, momento, movimento, energia cinética. Rituais desta linha criam barreiras de força, redirecionam impactos, alteram velocidade, aplicam ou removem momento.
4. Senhor da Biofísica e Entropia Genética — Distorce vida, genética, mutação, decomposição. Rituais desta linha aceleram ou revertem decomposição, manipulam código genético, controlam processos vitais.

REGRA CRUCIAL DE MECÂNICA:
- NADA no efeito é puramente narrativo. "Empurra o alvo 10m" NÃO é aceitável.
- Todo efeito DEVE ter um mecânico de jogo: teste de resistência (FOR/DES/CON/INT/AM), CD, vantagem/desvantagem, dano (NdN+MOD), condição (caído, lento, cego, envenenado, etc.), duração em rodadas.
- Se o ritual empurra, isso é: "Teste FOR vs FOR. Falha: alvo é deslocado 1 espaço e cai caído. Sucesso: alvo permanece."
- Se o ritual protege, isso é: "Barreira com X PV e CA Y. Absorve dano até ser destruída. Dura X rodadas."
- Cada efeito deve incluir: o que acontece, como resistir (se aplicável), dano/condição/resultados de sucesso e falha, duração, alcance, contrapeso.

No campo "short_description", inclua UMA frase breve explicando como a lei física do regente é distorcida para alcançar o efeito. Exemplo: "Distorção termodinâmica: o calor do alvo é instantaneamente transferido para o ambiente, causando congelamento superficial."
`

  const blocks = {
    alchemy: {
      title: 'SISTEMA: ALQUIMIA DO OLYMPO — RITUAIS DE DISTORÇÃO',
      lore: [
        '- Alquimia canaliza distorções de leis físicas através de Regentes interdimensionais.',
        '- Cada ritual é um pedido a um Regente que dobra temporariamente uma lei da física.',
        '- O efeito do ritual deve refletir a lei distorcida: termodinâmica = calor/frio/energia, relatividade = espaço/tempo/gravidade, inércia = força/movimento, biofísica = vida/morte/mutação.',
        '- A descrição curta (short_description) deve explicar BREVEMENTE como a lei física é distorcida.',
        '- Todo ritual enfraquece o Véu. Quanto maior o círculo, maior o risco de Ruptura.',
      ],
      balance: [
        '- 1o círculo: utilitário ou tático leve. PE 4-10. CD 13-15. Custo estrutural: 4 espaços.',
        '- 2o círculo: impacto consistente. PE 10-20. CD 15-17. Custo estrutural: 6 espaços.',
        '- 3o círculo: poder alto e identidade forte. PE 20-30. CD 18-20. Custo estrutural: 10 espaços.',
        '- 4o círculo: catastrófico e raro. PE 30-45. CD 21-25. Custo estrutural: 15 espaços.',
      ],
      protocol: [
        '- SCP 2 para rituais táticos. SCP 3 apenas para fenômenos épicos/catastróficos.',
        '- Cura imediata: máximo 30% da vida esperada da faixa.',
        '- Controle total: máximo 1 rodada em círculos 3-4; prefira penalidade parcial.',
        '- TODO efeito deve ter mecânica de jogo concreta: testes, CD, NdN, condições, durações.',
      ],
    },
    spell: {
      title: 'SISTEMA: FEITIÇOS DO OLYMPO — RITUAIS DE DISTORÇÃO',
      lore: [
        '- Feitiços são conjurações que chamam Regentes para distorcer leis físicas no campo de batalha.',
        '- Bruxaria tende a rituais de vínculo, maldição, sacrifício — usando biofísica e termodinâmica.',
        '- Arcana tende a rajadas, barreiras, teleporte — usando relatividade e inércia.',
        '- A descrição curta deve explicar BREVEMENTE como a lei física é distorcida.',
      ],
      balance: [
        '- 1o círculo: resposta curta, suporte básico. PE 8-15. Custo estrutural: 4 espaços.',
        '- 2o círculo: consistência de combate. PE 10-22. Custo estrutural: 6 espaços.',
        '- 3o círculo: assinatura de escola, impacto alto. PE 20-32. Custo estrutural: 10 espaços.',
        '- 4o círculo: raro, épico. PE 32-45. Custo estrutural: 15 espaços.',
      ],
      protocol: [
        '- Feitiços de Bruxaria podem cobrar componentes ou custo narrativo. Arcana pode cobrar janela de vulnerabilidade.',
        '- Cura: máximo 30% da vida da faixa por uso imediato.',
        '- Controle total: máximo 1 rodada; prefira lentidão, queda de resultado, selos parciais.',
        '- TODO efeito deve ter mecânica de jogo concreta.',
      ],
    },
    rune: {
      title: 'SISTEMA: RUNAS DO OLYMPO',
      lore: [
        '- Runas são fragmentos das Runas Primordiais — selos de vínculo com poder ancestral.',
        '- Cada runa carrega uma distorção específica de uma lei física, cristalizada em forma de selo.',
      ],
      balance: [
        '- Menores: 1o círculo. Custo estrutural: 4 espaços.',
        '- Comuns: 2o-3o círculo. Custo estrutural: 6 ou 10 espaços.',
        '- Maiores: 3o-4o círculo. Custo estrutural: 10 ou 15 espaços.',
      ],
      protocol: [
        '- Toda runa indica grau (menor, comum, maior) e primordial-base.',
        '- TODO efeito deve ter mecânica de jogo concreta.',
      ],
    },
    magic: {
      title: 'SISTEMA: MAGIAS DO OLYMPO — RITUAIS DE DISTORÇÃO',
      lore: [
        '- Magias são a forma pura de conjurar Regentes para distorcer leis físicas em escala devastadora.',
        '- Cada escola reflete o Regente chamado: Fogo/Gelo = termodinâmica, Gravidade = relatividade, Impacto = inércia, Cura/Morte = biofísica.',
        '- Magias são mais densas e exigentes que feitiços. Investem PEH pesado.',
        '- A descrição curta deve explicar BREVEMENTE como a lei física é distorcida.',
      ],
      balance: [
        '- 1o círculo: magia básica. PE 6-14. Custo estrutural: 4 espaços.',
        '- 2o círculo: magia de combate confiável. PE 10-22. Custo estrutural: 6 espaços.',
        '- 3o círculo: magia densa, risco real. PE 20-35. Custo estrutural: 10 espaços.',
        '- 4o círculo: magia suprema. PE 35-50. Custo estrutural: 15 espaços.',
      ],
      protocol: [
        '- Magias são mais poderosas que feitiços do mesmo círculo.',
        '- Cada magia reflete a escola/regente: termodinâmica = dano/controle térmico, relatividade = espaço/gravidade, inércia = força/movimento, biofísica = vida/morte.',
        '- Cura: máximo 30% da vida da faixa. Controle total: 1 rodada.',
        '- TODO efeito deve ter mecânica de jogo concreta.',
      ],
    },
  }
  const block = blocks[systemType] || blocks.alchemy
  const prompt = `
${block.title}

${REGENT_LORE}

LORE E LIMITES:
${block.lore.join('\n')}

BALANCEAMENTO POR CÍRCULO:
${block.balance.join('\n')}

PROTOCOLO:
${block.protocol.join('\n')}

RASCUNHO:
${JSON.stringify(draft, null, 2)}

CONTEXTO OPCIONAL:
${JSON.stringify(context, null, 2)}

INSTRUÇÃO DIRETA DO ADMIN:
${analysisNote || 'Você tem LIBERDADE CRIATIVA TOTAL para reescrever o ritual. REGRAS: (1) Mantenha o nome do ritual original, a menos que ele seja incoerente com a lei física do Regente — nesse caso, sugira um nome alternativo que preserve a intenção. (2) A descrição e mecânica DEVEM ser coerentes com a lei distorcida do Regente indicado em source_name. (3) Se a descrição original do jogador não faz sentido dentro da lei do Regente, REESCREVA completamente a explicação para que seja coerente. Exemplo: se o ritual cura ferimentos usando Biofísica, não diga que "retrocede o tempo" — diga que "sobrecarrega o organismo criando células regenerativas beyond natural limits". (4) O efeito é DEFINITIVO — o jogador não pode manter a versão original. Seja criativo, preciso e balanceado.'}

Responda EXCLUSIVAMENTE com JSON:
{
  "name": "nome refinado",
  "circle": 1,
  "category": "Ataque",
  "pe_cost": 0,
  "min_level": 1,
  "action_cost": "Ação Padrão",
  "duration": "Instantâneo",
  "range": "18m",
  "short_description": "Distorção [REGENTE]: breve explicação de como a lei física é distorcida + resumo do efeito.",
  "effect": "efeito final com mecânicas concretas: testes, CD, NdN+MOD, condições, durações, contrapesos",
  "source_kind": "regente|limiar|neutro",
  "source_name": "nome do Regente ou fonte",
  "law_name": "lei física distorcida",
  "price": "custo narrativo ou contrapeso",
  "rupture_risk": 1,
  "protocol_layer": 2,
  "pp_estimate": 0,
  "tags": ["tag1", "tag2"],
  "ai_feedback": "explicação curta de balanceamento"
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

export async function analyzeLegendaryWeaponDraft(draft, context = {}) {
  const analysisNote = typeof context.analysis_note === 'string' ? context.analysis_note.trim() : ''
  const improveWriting = !!context.improve_writing
  const powerLevel = draft.power_level || 'notavel'

  const POWER_LEVEL_GUIDE = {
    menor: {
      label: 'Menor',
      desc: 'Poderosa mas contida. Superior ao comum, mas nao esmaga exercitos.',
      danoBase: '2d8 a 3d10+MOD — acima do rank Incomum (+1d6) e Raro (+2d6)',
      danoHabilidade: '2d6+8 a 4d8+15',
      peAtiva: '5-15 PE', peUltimate: '15-30 PE',
      slotBudget: '2-3',
    },
    notavel: {
      label: 'Notavel',
      desc: 'Forte e distinta. Vira combates com habilidades unicas.',
      danoBase: '3d10 a 5d10+MOD — acima do rank Heroico (+4d8) e ANCESTRAL (+5d10)',
      danoHabilidade: '3d10+18 a 6d10+25',
      peAtiva: '10-25 PE', peUltimate: '25-50 PE',
      slotBudget: '3-4',
    },
    maior: {
      label: 'Maior',
      desc: 'Entre as mais poderosas. Define o destino de conflitos regionais.',
      danoBase: '5d12 a 8d12+MOD — acima do rank Ancestral (+5d10) e Mitico (+6d12)',
      danoHabilidade: '6d12+30 a 10d12+45',
      peAtiva: '15-40 PE', peUltimate: '40-80 PE',
      slotBudget: '4-6',
    },
    suprema: {
      label: 'Suprema',
      desc: 'Poder absoluto. Escallibur — molda a historia do mundo.',
      danoBase: '8d12+8 a 12d12+15 — MUITO acima do rank Transcendente (+8d12). Uma arma Suprema causa dano ABSURDO, superior a QUALQUER arma criada por jogadores.',
      danoHabilidade: '10d12+50 a 16d12+75',
      peAtiva: '20-60 PE', peUltimate: '60-120 PE',
      slotBudget: '5-8',
    },
  }

  const guide = POWER_LEVEL_GUIDE[powerLevel] || POWER_LEVEL_GUIDE.notavel

  const habs = draft.habilidades || { passivas: [], ativas: [], ultimates: [] }
  const totalHabs = habs.passivas.length + habs.ativas.length + habs.ultimates.length

  const hasName = draft.name && draft.name.length > 0
  const hasDano = draft.dano && draft.dano.length > 0
  const hasEffect = draft.effect && draft.effect.length > 0
  const hasHabilidades = totalHabs > 0
  const isGenerationMode = !hasName && !hasDano && !hasEffect && !hasHabilidades && analysisNote.length > 0

  const prompt = `
VOCE E O ORACULO — ARTIFICE LENDARIO DO SISTEMA OLYMPO 2.0.
Voce NAO e um corretor de texto. Voce e um CRIADOR e BALANCEADOR de armas lendarias.
Sua job: quando o Mestre traz um conceito, RESPEITE o conceito e PRESERVE a mecanica. Quando cria do zero, seja AUDACIOSO e criativo.

MODO: ${isGenerationMode ? 'GERACAO — Criar arma completa do zero.' : 'BALANCEAMENTO — Preservar conceitos, ajustar valores, completar campos vazios.'}

==
TABELA DE ARMAS (dano base COMUM — para referencia)
==
Pistola: 1d8 | Sub-Metralhadora: 1d6 | Rifle: 1d10 | Escopeta: 2d6 | Sniper: 2d8
Espada Longa: 1d8 | Katana: 1d8 | Machado Guerra: 1d10 | Martelo Guerra: 1d10 | Adaga: 1d4 | Lana: 1d6
Besta: 1d10 | Arco Longo: 1d8 | Mangual: 1d8 | Chicote: 1d4 | Manopla: 1d6 | Foice: 1d6
Escudo Pequeno: 1d4 | Escudo Grande: 1d6

RANKS (bonus de dano cumulativos sobre a arma base):
Comum(0) | Incomum(+1d6) | Raro(+2d6) | Epico(+3d8) | Heroico(+4d8) | Ancestral(+5d10) | Mitico(+6d12) | Transcendente(+8d12)
LENDARIA esta ACIMA de Transcendente. O dano base de uma arma lendaria deve SUPERAR o bonus de Transcendente.

==
TERMINOLOGIA DO SISTEMA (USE ESTES TERMOS)
==
- PE = Pontos de Esforco (NUNCA use "Energia", "Mana", "PM" — sempre "PE" ou "Pontos de Esforco")
- CA = Classe de Armadura
- CD = Classe de Dificuldade
- NdN = formato de dados (3d10 = 3 dados de 10 lados)
- MOD = modificador de atributo (FOR, DES, CON, INT, AM)
- Vantagem / Desvantagem = mecanica de rolar 2d20 e ficar com o melhor/pior
- Teste de Resistencia = FOR/DES/CON/INT/AM contra CD

==
NIVEL DE PODER: ${guide.label}
==
${guide.desc}
Dano base esperado: ${guide.danoBase}
Dano de habilidades ofensivas: ${guide.danoHabilidade}
Custo PE — Ativas: ${guide.peAtiva} | Ultimate: ${guide.peUltimate}
Quantidade de habilidades: ${guide.slotBudget}
Passivas: 0 PE (efeito permanente, sempre ativo)

==
RASCUNHO DA ARMA
==
${JSON.stringify(draft, null, 2)}

Habilidades estruturadas (${totalHabs} total):
Passivas (${habs.passivas.length}): ${JSON.stringify(habs.passivas, null, 2)}
Ativas (${habs.ativas.length}): ${JSON.stringify(habs.ativas, null, 2)}
Ultimates (${habs.ultimates.length}): ${JSON.stringify(habs.ultimates, null, 2)}

==
INSTRUCAO DO MESTRE
==
${analysisNote || 'Nenhuma instrucao extra. Revisar, completar e balancear.'}

==
!!! REGRA #1 — PRESERVACAO DE MECANICAS (A MAIS IMPORTANTE) !!!
==

Se o Mestre descreveu uma habilidade — seja nos campos estruturados ou na instrucao — voce DEVE PRESERVAR a MECANICA CENTRAL.

ISSO SIGNIFICA:
- Se o Mestre disse "chance de critico" → a habilidade E sobre chance de critico. PODE adicionar condicoes ("apenas abaixo de 40% de vida", "a cada 3 disparos"), mas NUNCA mudar para "furia" ou "vantagem em ataques".
- Se o Mestre disse "3 disparos rapidos" → sao 3 disparos rapidos. PODE ajustar dano e custo, mas NUNCA mudar para "disparo em area".
- Se o Mestre disse "disparo extra ao acertar % da vida" → e sobre disparo extra condicional. PODE definir a % e o dano, mas NUNCA mudar para "concentrar energia para disparo devastador".
- Se o Mestre disse "sobrecarregar a arma com dano extremo, precisao reduzida, risco ao portador" → e sobre sobrecarga com trade-offs. PODE definir os valores, mas NUNCA mudar para outra coisa.

BALANCEAR != SUBSTITUIR. Balancear significa: adicionar condicoes, ajustar valores, definir custos, limitar Gatilhos. NUNCA trocar a mecanica por outra completamente diferente.

Se o Mestre pediu para RENOMEAR ("deixe nomes mais imponentes") — renomeie, mas mantenha a mecanica.
Se o Mestre pediu para CRIAR uma nova habilidade — crie com mecanica inovadora.
Se o Mestre NAO pediu para mudar a mecanica — NAO MUDE.

===
!!! REGRA #2 — ANALISE OBRIGATORIA DE CADA HABILIDADE, UMA POR UMA !!!
===

Voce DEVE processar CADA habilidade individualmente. O processo OBRIGATORIO para CADA habilidade e:
1. Ler o conceito/mechanica descrita pelo Mestre
2. PRESERVAR essa mechanica (Regra #1)
3. Aplicar valores balanceados (NdN, PE, CD, condicoes)
4. Colocar a habilidade resultante no array correto (passivas/ativas/ultimates)

NUNCA pule uma habilidade. NUNCA agrupe habilidades. NUNCA ignore uma habilidade porque parece "dificil de balancear".
Se uma habilidade esta no input, ela DEVE estar no output — ESPECIALMENTE ULTIMATES.
Se o input tem 1 passiva, 2 ativas e 1 ultimate, o output DEVE ter PELO MENOS 1 passiva, 2 ativas e 1 ultimate.
Se o Mestre pediu para criar mais, ADICIONE alem das existentes.

No ai_feedback, liste CADA habilidade individualmente com o que voce fez.

===
REGRA #3 — FORMATO DE MECANICAS DE JOGO
===

TODOS os efeitos devem usar MECANICAS CONCRETAS com valores. PROIBIDO prosa sem suporte mecanico.

FORMATO CORRETO:
- "Causa 3d10+8 de dano perfurante. Alvos devem realizar Teste de Resistencia CON CD 22 ou ficam atordoados por 1 rodada."
- "Concede +15% de chance de critico. O critico desta arma causa 3x de dano (1.5x adicional). Ativa apenas quando o portador esta abaixo de 50% de vida maxima."
- "+2d6 em Testes de Percepcao com Vantagem contra ilusoes e criaturas ocultas."
- "Ignora +3 de CA do alvo. Penetra armaduras de ate 5 pontos."
- "Disparo adicional: ao causar mais de 25% da vida maxima do alvo em um unico ataque, o portador pode realizar um disparo extra causando 2d10+MOD de dano."

FORMATO ERRADO:
- "A arma detecta inimigos atraves de barreiras" ← SEM VALORES! Use "+NdN Percepcao com Vantagem..."
- "A arma responde a determinacao do portador" ← O que isso faz mecanicamente?
- "Transforma energia vital em poder destrutivo" ← Prosa sem mecanica.
- "Garante que nunca falte poder de fogo" ← O que isso significa em dados?

===
REGRA #4 — CAMPO "effect" (Efeito Lendario)
===

${improveWriting ? 'O Mestre ativou melhoria de escrita. Reescreva o campo "effect" com redacao RICA e IMERSIVA, mas com MECANICAS CONCRETAS (NdN, CDs, condicoes). O efeito lendario deve ser um poder SIGNIFICATIVO — nao apenas flavor text.' : 'PRESERVE o campo "effect" EXATAMENTE como o Mestre escreveu. Apenas ajuste valores NUMERICOS (NdN, +MOD, CDs). NAO reescreva.'}
Se o effect esta vazio: crie um efeito lendario com MECANICAS CONCRETAS — um poder passivo significativo que a arma concede ao portador (bonus de acerto, penetracao de armadura, critico aumentado, resistencia a tipo de dano, etc.). NAO crie flavor text vazio.

===
REGRA #5 — DANO BASE (MUITO IMPORTANTE)
===

Referencia a tabela de armas acima. O tipo de arma (campo "base") define o dano comum.
O dano de uma Lendaria ${guide.label} deve ser: ${guide.danoBase}
IMPORTANTE: Uma arma Lendaria e SUPERIOR a QUALQUER arma que jogadores possam criar. A maior rank jogavel e Transcendente (+8d12). Uma Lendaria ${guide.label} causa MAIS dano que isso.
NAO tenha medo de dar dano alto. Uma arma Suprema com 8d12+15 de dano base esta CORRETA.

===
RESPONDA EXCLUSIVAMENTE COM JSON VALIDO
===
{
  "name": "nome",
  "dano": "dano base (ex: 8d12+10 para Suprema)",
  "attr": "atributo",
  "effect": "efeito lendario com mecanicas concretas",
  "power_level": "${powerLevel}",
  "lore": "historia preservada ou gerada",
  "habilidades": {
    "passivas": [
      { "nome": "nome", "descricao": "descricao detalhada com mecanicas concretas e valores balanceados", "custoPE": 0 }
    ],
    "ativas": [
      { "nome": "nome", "descricao": "descricao detalhada com mecanicas concretas e valores balanceados", "custoPE": X }
    ],
    "ultimates": [
      { "nome": "nome", "descricao": "descricao detalhada com mecanicas concretas e valores balanceados", "custoPE": X }
    ]
  },
  "ai_feedback": "Resumo: dano base escolhido (referencia da tabela). Cada habilidade: nome, mecanica preservada/criada, custoPE. Pedidos do Mestre atendidos."
}`

  const response = await callAI([
    { role: 'system', content: buildSystemContext() },
    { role: 'user', content: prompt },
  ], { maxTokens: 8192 })

  try {
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    throw new Error('A IA retornou um formato invalido para a arma lendaria.')
  }
}

export async function chatAboutAbility(char, userMessage, history = []) {
  const stats = computeCharStats(char)
  const pehTotal = calcPEHTotal(char.classe || '', char.nivel || 1, char.choices || {}, char.modulosAdquiridos || [])
  const pehSpent = calcPEHSpent(char.habilidades)

  const LCP_CAPS = { 'N1-7': { atk: 18, def: 18, ca: 4, extra: 1 }, 'N8-15': { atk: 26, def: 26, ca: 6, extra: 1 }, 'N16-22': { atk: 30, def: 30, ca: 6, extra: 1 }, 'N23-30': { atk: 42, def: 42, ca: 10, extra: 2 } }
  const lcp = LCP_CAPS[stats.band] || LCP_CAPS['N16-22']
  const remainingAtk = Math.max(0, lcp.atk - stats.ataqueBaseNum)

  const charContext = `
PERSONAGEM: ${char.nome || 'Sem Nome'} | ${char.raca || 'N/A'} (${char.racaTipo || '?'}) | ${char.classe || '?'} | Nível ${stats.nivel} | Faixa ${stats.band}
Atributos: FOR ${stats.atributos.FOR}(+${stats.atributos.modFOR}) | DES ${stats.atributos.DES}(+${stats.atributos.modDES}) | CON ${stats.atributos.CON}(+${stats.atributos.modCON}) | INT ${stats.atributos.INT}(+${stats.atributos.modINT}) | APA ${stats.atributos.APA} | AM ${stats.atributos.AM}(+${stats.atributos.modAM})
Vida: ${stats.vidaTotal} | Energia: ${stats.energiaTotal} | PE: ${stats.peTotal} | CA: ${stats.caBase}
Equipamentos: Armadura ${stats.equipStats.totalArmor} | Vida Extra ${stats.equipStats.totalExtraLife} | Escudo ${stats.equipStats.totalShield} | Crit +${stats.equipStats.totalCrit}% | Dano +${stats.equipStats.totalDamage}
Ataque Base: d20+${stats.ataqueBaseNum} | Dano Base: ${stats.danoBase} | Arma Bônus: ${stats.armaDanoBonus}
PEH: ${pehSpent}/${pehTotal}
LCP — Limite cumulativo para ${stats.band}: Ataque total ≤ +${lcp.atk} | Esquiva ≤ +${lcp.def} | CA bônus ≤ +${lcp.ca} | Ataques extras ≤ +${lcp.extra}
BUDGET RESTANTE para habilidades: +${remainingAtk} no ataque (base já é +${stats.ataqueBaseNum})
Triagem: ${stats.triagem}
Amplificadores Triagem: ${stats.triagemAmps}
Amplificadores Módulo: ${stats.moduleAmps}

HABILIDADES ATUAIS:
${(char.habilidades || []).map((h, i) => `${i + 1}. [${h.tipo}] ${h.nome || '—'} — Energia:${h.custoEnergia || 0} | Dano:${h.dano || '—'} | Duração:${h.duracao || '—'} | Evo:${h.evolucaoNivel || 0} | Status:${h.status || '?'}
   Descrição: ${h.descricao || '—'}`).join('\n')}
${(char.armaHabilidades || []).length > 0 ? `\nHABILIDADES DA ARMA:\n${(char.armaHabilidades || []).map((h, i) => `${i + 1}. ${h.nome || '—'} — ${h.tipo || 'Ativa'} | ${h.potencia || '?'}\n   ${h.descricao || '—'}`).join('\n')}` : ''}`

  const systemPrompt = `Voce e o ORÁCULO, motor de balanceamento do Sistema Olympo 2.0.
Você está em modo CONVERSACIONAL. Responda em português de forma clara e didática.

Você tem acesso completo à ficha do personagem e suas habilidades. O jogador pode:
- Pedir análise de uma habilidade específica
- Pedir explicação sobre balanceamento
- Relatar problemas com valores
- Pedir sugestões de ajuste

REGRAS QUE VOCÊ DEVE SEGUIR AO ANALISAR:
1. O personagem está na faixa ${stats.band}. Respeite os limites desta faixa.
2. LCP (Limite Cumulativo): Ataque total (base + habilidades) NÃO pode exceder +${lcp.atk}. Base já é +${stats.ataqueBaseNum}, sobrando apenas +${remainingAtk} para TODAS as habilidades combinadas.
3. TDH (Teto de Dano): Cada habilidade tem um teto de dano conforme tipo e faixa.
4. Se uma habilidade concede bônus de ataque/defesa, esse bônus CONTA para o LCP.
5. Bônus passivos permanentes devem ser CONSERVADORES (metade do budget temporário).
6. O nível do personagem é a referência — habilidades devem ser proporcionais.
7. Considere raça e triagens — elas já adicionam poder base.

Seja direto e objetivo. Cite números e limites quando relevante.`

  const chatHistory = history.slice(-6).map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }))

  const messages = [
    { role: 'system', content: systemPrompt },
    ...chatHistory,
    { role: 'user', content: `${charContext}\n\nPERGUNTA DO JOGADOR: ${userMessage}` },
  ]

  return await callAIStream(messages)
}

export async function generateEquipmentAbilities(char, equipType, equipRank, activeSlotsOrPassiveSlots, passiveSlotsArg, userDescArg = '', armorTypeArg = '') {
  const nivel = char.nivel || 1
  const attrs = char.atributos || {}
  const sk = char.skeletonPoints || {}
  const cls = char.classe || ''

  const attrVals = {}
  for (const a of ['FOR', 'DES', 'CON', 'INT', 'APA', 'AM']) {
    attrVals[a] = getAttrValue(attrs, a, sk, char)
  }

  const vida = cls ? calcVidaTotal(cls, nivel, attrs, sk, char.choices, char.triagemPrincipal, char.triagemPrincipalNivel, char) : 100
  const ca = cls ? calcCA(attrs, sk, char.pericias, char) : 10
  const oldSignature = typeof passiveSlotsArg === 'string' || passiveSlotsArg == null
  const activeSlots = oldSignature ? 0 : Number(activeSlotsOrPassiveSlots) || 0
  const passiveSlots = oldSignature ? Number(activeSlotsOrPassiveSlots) || 0 : Number(passiveSlotsArg) || 0
  const userDesc = oldSignature ? (passiveSlotsArg || '') : (userDescArg || '')
  const armorType = oldSignature ? '' : armorTypeArg
  const totalSlots = activeSlots + passiveSlots
  const typeDef = EQUIPMENT_TYPES.find(t => t.id === equipType)
  const armorTypeDef = ARMOR_TYPES.find(t => t.id === armorType)
  const rarity = getEquipmentRarity(equipRank)

  const systemPrompt = `Você é um sistema de balanceamento para um RPG chamado Olympo 2.0.
Sua tarefa é criar habilidades ativas e passivas para equipamentos (armaduras, coletes, escudos, acessórios).

CONTEXTO DO PERSONAGEM:
- Classe: ${cls} | Nível: ${nivel}
- Atributos: FOR ${attrVals.FOR} | DES ${attrVals.DES} | CON ${attrVals.CON} | INT ${attrVals.INT} | APA ${attrVals.APA} | AM ${attrVals.AM}
- Vida: ${vida} | CA base: ${ca}
- Triagem: ${char.triagemPrincipal || 'Nenhuma'} (${char.triagemPrincipalNivel || 0})

EQUIPAMENTO:
- Tipo: ${typeDef?.label || equipType}
- Slot: ${typeDef?.slot || 'utilidade'} | Peso: ${typeDef?.weight || 'n/a'} | Set: ${armorTypeDef?.label || 'sem set'}
- Rank: ${equipRank}
- Armadura base da peca: ${typeDef?.caBase || 0} | Vida extra base: ${typeDef?.extraLife || 0} | Penalidade: ${typeDef?.penalty || 0}
- Bonus por rank: Armadura +${rarity.armorBonus} | Vida +${rarity.extraLife} | Escudo ${rarity.shieldAmount} | Crit +${rarity.critBonus}% | Dano +${rarity.damageBonus}
- Slots disponiveis: ${activeSlots} ativa(s), ${passiveSlots} passiva(s)
${userDesc ? `- Descrição do jogador: ${userDesc}` : ''}

REGRAS DE BALANCEAMENTO PARA EQUIPAMENTOS:
1. PASSIVAS devem ser SUTIS — equipamentos NÃO são armas. Eles oferecem:
   - Sobrevida: redução de dano fixa (máx 3/nível band), +Vida temporária, resistência a condição
   - Utilidade: vantagem em testes específicos, movimento especial, sense amplificado
   - Sinergia: bônus quando condição X acontece (ex: "+2 CA quando adjacente a aliado")
2. NÃO crie passivas que adicionam dano direto — isso é para armas
3. Coletes balísticos: redução de dano balístico, absorção de impacto
4. Armaduras: CA bonus + resistência a tipo de dano
5. Escudos: bloqueio ativo (REAÇÃO), proteção contra projéteis
6. Acessórios: bônus passivos sutis (sentidos, resistência mental, etc.)
7. MÁXIMO de efeitos por passiva: 1 efeito principal + 1 condição
8. Use formato de dano do sistema: NdN+mod (ex: reduz 1d6 de dano balístico)

LIMITES POR RANK:
- Comum: sem passiva
- Incomum: efeito menor (ex: vantagem em 1 teste específico)
- Raro: efeito moderado (redução de dano 1-2, +1-3 em condição específica)
- Epico: efeito forte (redução 2-3, resistência a tipo, +5 Vida temporária)
- Heroico+: efeitos combinados permitidos

CONCESSAO DE HABILIDADES POR RANK:
- Gere exatamente ${activeSlots} habilidade(s) Ativa(s) e ${passiveSlots} Passiva(s), total ${totalSlots}.
- Ativas de equipamento precisam ter gatilho, duracao, custo/recarga e efeito defensivo/utilitario claro.
- Passivas permanentes devem ser menores que ativas e nao devem somar CA; prefira absorcao, escudo pequeno, critico leve, movimento ou resistencia situacional.

Responda APENAS com JSON:
{
  "passivas": [
    {
      "nome": "string",
      "descricao": "string detalhada",
      "tipo": "Ativa ou Passiva",
      "efeito": "string resumido do efeito mecânico"
    }
  ]
}`

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Crie ${totalSlots} habilidade(s) para este equipamento tipo "${typeDef?.label || equipType}" rank ${equipRank}: ${activeSlots} ativa(s) e ${passiveSlots} passiva(s). Seja conciso e balanceado.` },
  ]

  const data = await callAI(messages)
  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data
    return { passivas: (parsed.passivas || []).slice(0, totalSlots) }
  } catch {
    return { passivas: [] }
  }
}

export async function suggestItemWeight(nome, descricao) {
  const messages = [
    {
      role: 'system',
      content: `Você é um sistema de RPG. Dado o nome e opcionalmente a descrição de um item, estime um peso realista em quilogramas (kg). Responda APENAS com um número de 0 a 999 com até 1 casa decimal. Exemplos: "Espada longa" → 1.5, "Poção de cura" → 0.2, "Baú de tesouro" → 25.0, "Anel de prata" → 0.1, "Escudo de ferro" → 6.0. Não explique, não use unidades, apenas o número.`
    },
    {
      role: 'user',
      content: `Nome: ${nome || 'Item desconhecido'}${descricao ? `\nDescrição: ${descricao}` : ''}`
    }
  ]
  const data = await callAI(messages, { maxTokens: 16 })
  const raw = typeof data === 'string' ? data : data?.content || ''
  const match = raw.match(/[\d]+(?:[.,][\d])?/)
  if (!match) return null
  const val = parseFloat(match[0].replace(',', '.'))
  if (Number.isNaN(val) || val < 0) return null
  return Math.round(val * 10) / 10
}
