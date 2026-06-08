import { supabase } from '../lib/supabase'
import { CODEX_PROFILES } from '../data/codexProfiles'
import { CODEX_NA_MODS } from '../data/codexNaMods'

const OPENROUTER_MODEL = import.meta.env.VITE_OPENROUTER_MODEL || 'google/gemma-4-26b-a4b-it:free'
const OPENROUTER_FUNCTIONS = ['openrouter-chat', 'openrouter-proxy']
const AI_REQUEST_TIMEOUT_MS = 120000
const MAX_RETRIES = 2

async function invokeOpenRouter(body) {
  let lastError = null
  for (let i = 0; i < OPENROUTER_FUNCTIONS.length; i++) {
    const fn = OPENROUTER_FUNCTIONS[i]
    try {
      const { data, error } = await supabase.functions.invoke(fn, { body })
      if (!error) return data
      lastError = error
    } catch (e) {
      lastError = e
    }
    if (lastError?.status && ![429, 502, 503, 504].includes(lastError.status)) break
  }
  throw lastError || new Error('Nenhuma Edge Function disponível.')
}

function extractJSON(text) {
  let clean = text.trim()
  clean = clean.replace(/```json\s*\n?/gi, '').replace(/```\s*\n?/g, '').trim()
  try { return JSON.parse(clean) } catch {}
  const match = clean.match(/\{[\s\S]*\}/)
  if (match) {
    try { return JSON.parse(match[0]) } catch {}
  }
  throw new Error('IA não retornou JSON válido.')
}

function highlightText(text) {
  if (!text) return text
  let result = text
  result = result.replace(/(\d+d\d+[^\s)]*)/gi, '<span class="text-red-400 font-bold">$1</span>')
  result = result.replace(/(\d+\s*(?:turnos?|rodadas?|rounds?|minutos?|horas?))\b/gi, '<span class="text-blue-400 font-semibold">$1</span>')
  result = result.replace(/(CD\s*\d+|DT\s*\d+|dificuldade\s*\d+)/gi, '<span class="text-amber-400 font-semibold">$1</span>')
  return result
}

export async function generateNpcAbilities(nivel, naStr, profile, stats, attrs, description, nome = 'NPC') {
  const profInfo = CODEX_PROFILES[profile]
  const naInfo = CODEX_NA_MODS[naStr]
  const attrNames = ['FOR', 'DES', 'CON', 'INT', 'APA', 'AM']
  const attrStr = attrNames.map((n, i) => `${n}: ${attrs[i]}`).join(', ')

  const npcName = nome || 'NPC'

  const systemPrompt = `Você é um mestre de RPG lendário, especialista em criação de NPCs para o sistema Olympo (mitologia grega).

REGRAS OBRIGATÓRIAS — VIOLAR QUALQUER UMA = FALHA CRÍTICA:

1. MECÂNICAS ÚNICAS: CADA habilidade deve ter uma mecânica DIFERENTE e INOVADORA. Proibido repetir padrões entre habilidades. Nada de "+X em Y" genérico. Pense em: acumuladores, condicionais, reações, stacks, transformações, sacrifícios, riscos/recompensas, sinergias entre habilidades, efeitos em área com zonas, temporização, marcos de HP.
2. NOME PRÓPRIO: Use "${npcName}" nas descrições. NUNCA "O NPC", "O personagem", "a criatura" ou "ele/ela".
3. DESCRIÇÕES VIVIDAS: Dramáticas, específicas, com imagens mentais poderosas. Proibido: "possui", "tem", "pode fazer", "concede". Obrigatório: verbos de ação, metáforas, consequências visuais, sons, cheiros, sensações.
4. NÚMEROS EXATOS: TODO valor deve ser específico — dano (XdY+Z), duração (X rodadas/turnos), CD/DT exata, alcance em metros, área em metros. NADA vago como "dano considerável" ou "duração prolongada".
5. PODER: Cada habilidade deve ser memorável e poderosa. O jogador deve ler e pensar "que incrível!".

EXEMPLOS DE MECÂNICAS CRIATIVAS (NÃO COPIE — crie novas):
- Acumulador: "Cada golpe finalizado marca a vítima com Estigma Sombrio (stack até 5). Quando ${npcName} atinge 5 estigmas, o próximo ataque ignora CA e causa 4d10 necrótico."
- Condicional de HP: "Quando ${npcName} está abaixo de 30% HP, sombras explodem em 8m: inimigos CD 18 ou ficam Amedrontados 1d4 rodadas. ${npcName} cura 2d8 por cada inimigo afetado."
- Zona persistenta: "${npcName} crava a arma no chão criando Círculo de Dor (raio 5m, dura 3 rodadas). Inimigos dentro levam 2d6 ao iniciar turno. ${npcName} ganha +2 ataque contra alvos dentro."
- Sacrifício: "${npcName} pode sacrificar 15 HP para canalizar Fúria Ancestral: próximo ataque causa dano dobrado e aplica atordoamento (CD 16 resiste) em vez de efeito normal."
- Reação poderosa: "Quando um aliado é atacado, ${npcName} pode teleportar até 10m e interceptar o golpe (recebe metade do dano, aliado recebe zero). Após interceptar, ${npcName} ganha +4 no próximo ataque."

Você DEVE retornar APENAS um JSON válido, sem texto antes ou depois, sem blocos de código markdown.
Destaque números de dano, duração e DT de forma natural na descrição.`

  const statsContext = [
    `Perfil: ${profInfo.name} (dado ${profInfo.dice})`,
    `Nível: ${nivel} | NA: ${naStr} (${naInfo?.tag || '1v1'})`,
    `Pontos de Vida: ${stats.vida}`,
    `Armadura: ${stats.arm} | CA: ${stats.ca}`,
    `Bônus de Ataque: +${stats.ba} | Bônus de Defesa: +${stats.bd}`,
    `Reações por turno: ${stats.reac}`,
    `Dano Base: ${stats.dano}${stats.danoExtra || ''}`,
    `Atributos: ${attrStr}`,
  ].join('\n')

  const userPrompt = `Crie as 5 habilidades para ${npcName}.

${npcName} é descrito(a) como: "${description || 'Sem descrição — use o perfil, stats e atributos como guia para criar algo épico e temático'}"

${statsContext}

REGRAS DE ESCALA:
- Perfil ${profInfo.name}, dano base ${stats.dano} — use como REFERÊNCIA (habilidades podem causar mais ou menos dependendo da mecânica)
- Nível ${nivel}, NA ${naStr} — números devem ser coerentes e desafiadores
- Habilidades ativas: dano entre ${stats.dano} e ${stats.dano}+${Math.ceil(nivel/3)}d${profInfo.dice?.replace('d','')||'10'}
- Ultimate: dano entre ${stats.dano}+${Math.ceil(nivel/2)}d${profInfo.dice?.replace('d','')||'10'} e ${stats.dano}+${nivel}d${profInfo.dice?.replace('d','')||'10'}
- CD/DT base: ${10 + Math.floor(nivel/2)} (ajuste ±3 conforme poder da habilidade)

Gere EXATAMENTE 5 habilidades: 1 passiva, 3 ativas, 1 ultimate. CADA UMA com mecânica DISTINTA.
Use "${npcName}" em TODAS as descrições.

Retorne SOMENTE este JSON (sem markdown, sem explicação):
{
  "abilities": [
    {
      "name": "Nome Criativo e Temático",
      "type": "passiva",
      "description": "Descrição vividA de como ${npcName} manifesta este poder, com mecânica clara, números exatos e consequências visuais.",
      "stats": ["Dano: XdY+Z", "Alcance: Ym", "CD: Z"]
    },
    { "name": "...", "type": "ativa", "description": "...", "stats": ["..."] },
    { "name": "...", "type": "ativa", "description": "...", "stats": ["..."] },
    { "name": "...", "type": "ativa", "description": "...", "stats": ["..."] },
    { "name": "...", "type": "ultimate", "description": "...", "stats": ["..."] }
  ]
}`

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const body = {
        model: OPENROUTER_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 4096,
      }

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS)

      const data = await invokeOpenRouter(body)
      clearTimeout(timer)

      const rawText = data?.choices?.[0]?.message?.content || ''
      if (!rawText) throw new Error('IA retornou resposta vazia.')

      const parsed = extractJSON(rawText)
      if (!parsed.abilities || !Array.isArray(parsed.abilities)) {
        throw new Error('Resposta não contém "abilities".')
      }

      return parsed.abilities.map(ab => ({
        ...ab,
        description: highlightText(ab.description),
        stats: (ab.stats || []).map(s => highlightText(s)),
      }))
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        console.error('[codexAi] Falha após retries:', err)
        return generateFallbackAbilities(nivel, profile, stats, nome)
      }
      await new Promise(r => setTimeout(r, 1500 * Math.pow(2, attempt)))
    }
  }

  return generateFallbackAbilities(nivel, profile, stats, nome)
}

function generateFallbackAbilities(nivel, profile, stats, nome = 'NPC') {
  const profInfo = CODEX_PROFILES[profile]
  const n = nome || 'NPC'
  return [
    {
      name: 'Pele de Titã',
      type: 'passiva',
      description: `O corpo de ${n} é marcado por cicatrizes ancestrais que brilham sob luz spectral. Cada ferida absorvida fortalece sua resistência — ${n} reduz todo dano recebido em ${Math.floor(nivel / 5)} pontos. Quando ${n} cai abaixo de 25% HP, a redução dobra por 2 rodadas.`,
      stats: [`Redução: ${Math.floor(nivel / 5)}`, 'Stack: dobra abaixo de 25% HP'],
    },
    {
      name: 'Lâmina Sedenta',
      type: 'ativa',
      description: `${n} executa um corte diagonal que abre fendas no ar — o próprio espaço grita. O ataque causa ${stats.dano} de dano e marca o alvo com Sede de Sangue por 2 rodadas. Alvos marcados sofrem +${Math.ceil(nivel/5)} dano dos próximos ataques de ${n}.`,
      stats: [`Dano: ${stats.dano}`, 'Alcance: Corpo-a-corpo', `Marca: +${Math.ceil(nivel/5)} dano por 2 rodadas`],
    },
    {
      name: 'Passo Fantasma',
      type: 'ativa',
      description: `${n} dissolve-se em sombras e reaparece atrás do alvo numa explosão de bruma negra. Teleporta até 8m e causa ${stats.dano}+${Math.floor(nivel / 3)}d6 de dano surpresa. O alvo fica Vulnerável (sem CA de DES) até o início do próximo turno.`,
      stats: [`Dano: ${stats.dano}+${Math.floor(nivel / 3)}d6`, 'Alcance: 8m', 'Efeito: Vulnerável 1 turno'],
    },
    {
      name: 'Parede de Lâminas',
      type: 'ativa',
      description: `${n} gira sua arma criando um redemoinho de aço e energia que dura 1 rodada. Qualquer inimigo que se aproximar a 3m sofre 2d8+${Math.floor(nivel/4)} de dano. ${n} ganha +5 CA durante este turno. Inimigos em 3m: CD ${10 + Math.floor(nivel/2)} ou não podem se afastar.`,
      stats: [`Dano: 2d8+${Math.floor(nivel/4)}`, 'Área: 3m', `CA: +5 | CD: ${10 + Math.floor(nivel/2)}`],
    },
    {
      name: `Execução de ${n}`,
      type: 'ultimate',
      description: `Canalizando toda sua fúria, ${n} ergue a arma enquanto rachaduras de energia percorrem o chão. O golpe desce como um raio — ${stats.dano}+${nivel}d${profInfo?.dice?.replace('d', '') || '10'} de dano devastador em cone de 5m. Inimigos abaixo de 50% HP: dano dobrado. Após usar, ${n} fica Exausto por 1 rodada (-2 em tudo).`,
      stats: [`Dano: ${stats.dano}+${nivel}d${profInfo?.dice?.replace('d', '') || '10'}`, 'Área: Cone 5m', `CD: ${10 + Math.floor(nivel / 2)}`, 'Efeito: Dobro em alvos <50% HP'],
    },
  ]
}
