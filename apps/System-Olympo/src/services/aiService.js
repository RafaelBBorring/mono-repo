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

async function callAI(messages) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke('openrouter-chat', {
        body: { messages, temperature: 0.35, max_tokens: 4096 },
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
              max_tokens: 4096,
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
    magic: {
      title: 'SISTEMA: MAGIAS DO OLYMPO — CONJURACAO ARCANA PURA',
      lore: [
        '- Magias sao a forma pura de conjuracao arcana. Apenas Magos possuem acesso nativo a este sistema.',
        '- Cada escola de magia (Fogo, Gelo, Eletrico, Arcano, Gravidade, Ilusao) tem identidade propria e mecanicas distintas.',
        '- Magias sao mais densas e exigentes que feiticos. Um mago com 3o circulo de magia pode moldar o campo de batalha inteiro.',
        '- O Mago investe PEH pesado em magia — os valores devem refletir esse custo de oportunidade.',
      ],
      balance: [
        '- 1o circulo: magia basica e linear. Entrada natural. PE 6-14. Custo estrutural: 4 espacos.',
        '- 2o circulo: magia de combate e utilidade confiavel. PE 10-22. Custo estrutural: 6 espacos.',
        '- 3o circulo: magia densa, com risco real e identidade de escola nitida. PE 20-35. Custo estrutural: 10 espacos.',
        '- 4o circulo: magia suprema, rarissima e exigente. PE 35-50. Custo estrutural: 15 espacos.',
      ],
      protocol: [
        '- Magias sao mais poderosas que feiticos de mesmo circulo, pois exigem classe dedicada e PEH mais alto.',
        '- Cada magia deve refletir a escola escolhida: Fogo = dano em area, Gelo = controle, Eletrico = rajada rapida, Arcano = versatilidade, Gravidade = manipulacao espacial, Ilusao = engano.',
        '- Cura segue o limite de 30% da vida esperada da faixa por uso imediato, salvo efeitos prolongados.',
        '- Controle total dura no maximo 1 rodada; prefira lentidao, penalidade e supressao temporaria.',
      ],
      extras: [
        '- Se o admin pedir uma magia de escola especifica, complete nome, efeito, custo e contrapeso coerentes com a escola.',
        '- Magias de 4o circulo devem ser realmente catastroficas — justify o custo estrutural de 15 espacos.',
        '- Se houver conflito entre numero e fantasia, preserve a fantasia e ajuste custo, CD, duracao e contrapeso.',
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

export async function analyzeLegendaryWeaponDraft(draft, context = {}) {
  const analysisNote = typeof context.analysis_note === 'string' ? context.analysis_note.trim() : ''
  const powerLevel = draft.power_level || 'notavel'

  const POWER_LEVEL_GUIDE = {
    menor: {
      label: 'Menor',
      powerBudget: 'Poderosa mas contida. Dano base similar a armas Comuns-Incomuns, mas com habilidades lendárias que a tornam superior taticamente.',
      damageScale: '2d6+8 a 4d8+15 para habilidades ofensivas',
      effectCap: 'Efeitos utilitarios e taticos. Pode conceder vantagem, resistencia elemental, mobilidade limitada. Nunca domina o campo de batalha.',
      slotBudget: '2-3 habilidades no maximo',
    },
    notavel: {
      label: 'Notável',
      powerBudget: 'Forte e distinta. Se destaca no combate com habilidades que viram confrontos individuais.',
      damageScale: '3d10+18 a 6d10+25 para habilidades ofensivas',
      effectCap: 'Efeitos de combate significativos. Pode conceder regeneracao parcial, penetracao de armadura, area moderada. Vira combates 1v1.',
      slotBudget: '3-4 habilidades',
    },
    maior: {
      label: 'Maior',
      powerBudget: 'Entre as mais poderosas. Armas que definem o destino de conflitos regionais.',
      damageScale: '6d12+30 a 10d12+45 para habilidades ofensivas',
      effectCap: 'Efeitos que mudam o curso de batalhas. Pode afetar multiplos alvos, conceder imunidade temporaria, abrir portais curtos. Temida por lendas.',
      slotBudget: '4-6 habilidades',
    },
    suprema: {
      label: 'Suprema',
      powerBudget: 'Poder absoluto. Escallibur, a Lança do Destino — armas que moldam a historia do mundo.',
      damageScale: '10d12+50 a 16d12+75 para habilidades ofensivas',
      effectCap: 'Efeitos epicos que transcendem combate normal. Pode selar entidades, rasgar realidade, comandar exercitos. Essas armas SAO a lenda.',
      slotBudget: '5-8 habilidades',
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
VOCE E O ORACULO — MOTOR DE CRIACAO E BALANCEAMENTO DE ARMAS LENDARIAS DO SISTEMA OLYMPO 2.0.

MODO: ${isGenerationMode ? 'GERACAO — Criar arma completa do zero baseado no conceito descrito.' : 'BALANCEAMENTO — Analisar, ajustar e balancear os campos ja preenchidos. Preencha campos vazios se necessario.'}

SISTEMA: ARMAS LENDARIAS DA FORJA LENDARIA
LORE:
- Armas lendarias sao itens unicos e exclusivos da narrativa, criados pelo Mestre.
- Cada arma lendaria possui um NIVEL DE PODER que define quao destrutiva ela e.
- Uma adaga lendaria Menor e muito poderosa para seu tamanho, mas ainda nao causa tanto dano quanto uma escopeta comum — se destaca por suas HABILIDADES.
- Uma arma lendaria Suprema como Escallibur e uma das armas mais poderosas do mundo — seu dano bruto e habilidades sao incomparaveis.
- O dano base da arma e o dano do seu ataque normal. As HABILIDADES da arma e que definem sua verdadeira forca lendaria.
- O sistema possui diversas fontes de poder: Triagens, Modulos, Habilidades de personagem, Rituais, Runas, Magias e equipamentos. Uma arma lendaria NAO deve ser fraca demais — mesmo sem ativar habilidades, seu dano base deve ser superior ao de uma arma comum do mesmo tipo.
- Considere que um personagem de nivel alto tem vida 700-1350, CA 30-50, e causa 20d12+ dano com habilidades. A arma lendária deve ser relevante nesse contexto quando for de nivel Maior ou Supremo.

NIVEL DE PODER: ${guide.label}
GUIA DE PODER:
- Budget: ${guide.powerBudget}
- Escala de dano para habilidades: ${guide.damageScale}
- Limite de efeitos: ${guide.effectCap}
- Quantidade de habilidades: ${guide.slotBudget}

RASCUNHO DA ARMA:
${JSON.stringify(draft, null, 2)}

HABILIDADES ESTRUTURADAS (${totalHabs} total):
Passivas: ${JSON.stringify(habs.passivas, null, 2)}
Ativas: ${JSON.stringify(habs.ativas, null, 2)}
Ultimates: ${JSON.stringify(habs.ultimates, null, 2)}

INSTRUCAO DO MESTRE:
${analysisNote || 'Nenhuma instrucao extra. Revisar, completar e balancear.'}

REGRAS:
1. DANO BASE (campo "dano") — deve ser coerente com tipo de arma e nivel de poder:
   - Menor: 1d6 a 2d6+MOD acima do dano base da arma comum do mesmo tipo
   - Notavel: 2d8 a 3d10+MOD acima do dano base
   - Maior: 3d12 a 5d12+MOD acima do dano base
   - Suprema: 5d12 a 8d12+MOD acima do dano base
   Uma arma lendária com dano base fraco é TRISTE. O dano base deve ser superior ao de uma arma comum.

2. HABILIDADES — sao o que tornam a arma lendária. Analise CADA habilidade:
   - Passivas: Sem custo PE. Efeitos permanentes sutis mas uteis. custoPE: 0.
   - Ativas: Custo PE proporcional ao poder. ${guide.damageScale}
   - Ultimates: Custo PE alto. Efeitos poderosos que mudam o combate. ${guide.damageScale}

3. Se o Mestre nao preencheu campos (nome vazio, sem habilidades, sem efeito), GERE conteudo tematico completo baseado na instrucao e no tipo de arma.

4. NUNCA altere DESCRICOES NARRATIVAS ja escritas pelo Mestre. Apenas ajuste valores NUMERICOS.

5. Custo PE por tipo e nivel:
   - Passivas: 0 PE
   - Ativas Menor: 5-15 | Notavel: 10-25 | Maior: 15-40 | Suprema: 20-60
   - Ultimate Menor: 15-30 | Notavel: 25-50 | Maior: 40-80 | Suprema: 60-120

6. Passivas devem ser mais sutis que ativas. Nunca mais fortes.

7. Preserve a IDENTIDADE da arma. Se e uma adaga furtiva, mantenha furtiva. Se e um martelo de guerra, mantenha brutal.

8. Se uma habilidade estiver sem descricao, preencha com descricao tematica balanceada.

9. Verifique TOTAL de habilidades contra budget (${guide.slotBudget}). Se exceder, NOTIFIQUE no ai_feedback — nao remova (o Mestre tem autoridade final).

10. O campo "effect" deve conter a descricao completa do efeito lendario da arma — narrativa, mecanica, custo de ativacao, riscos, etc.

Responda EXCLUSIVAMENTE com JSON:
{
  "name": "nome refinado ou gerado",
  "dano": "dano base balanceado",
  "attr": "atributo",
  "effect": "efeito lendario completo com numeros balanceados",
  "power_level": "${powerLevel}",
  "lore": "historia e origem mantidas ou geradas",
  "habilidades": {
    "passivas": [
      { "nome": "nome", "descricao": "descricao com numeros balanceados", "custoPE": 0 }
    ],
    "ativas": [
      { "nome": "nome", "descricao": "descricao com numeros balanceados", "custoPE": custo_balanceado }
    ],
    "ultimates": [
      { "nome": "nome", "descricao": "descricao com numeros balanceados", "custoPE": custo_balanceado }
    ]
  },
  "ai_feedback": "explicacao: modo usado, dano base analisado, cada habilidade revisada, total vs budget, decisoes tomadas"
}`

  const response = await callAI([
    { role: 'system', content: buildSystemContext() },
    { role: 'user', content: prompt },
  ])

  try {
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    throw new Error('A IA retornou um formato invalido para a arma lendária.')
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
