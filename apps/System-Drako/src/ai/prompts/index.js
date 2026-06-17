import { SYSTEM_RULES_PROMPT } from './systemRules.js'

export function autoCharacterPrompt({ descricao, nivelPreferido = null, foco = null, gerarHabilidades = true }) {
  return `${SYSTEM_RULES_PROMPT}

# SUA MISSÃO: CRIAR UMA FICHA COMPLETA A PARTIR DE UMA DESCRIÇÃO LIVRE
O usuário vai descrever como se escrevesse para um amigo: arquétipo, foco (suporte/defesa/ataque), base de poderes. Você preenche TUDO com raciocínio lógico, incluindo o que faltar. Seja criativo e inovador, mas fiel ao sistema.

REGRAS OBRIGATÓRIAS:
- Escolha um dos 5 níveis (Recruta/Iniciante/Veterano/Elite/Lenda). Respeite pontos E limite por atributo E mínimo 1 em cada.
- A soma dos 7 atributos DEVE ser exatamente igual aos pontos do nível. Nenhum atributo acima do cap.
- Recursos derivam das fórmulas (Vida=FOR*2+VON+10, Energia=AM*5, PE=VON*2+AGI) SOMADOS ao bônus do nível.
- Crie Conceito, Vínculo e Cicatriz coerentes com a descrição.
${gerarHabilidades ? '- Gere EXATAMENTE: 1 passiva, 3 ativas, 1 ultimate. Passiva sem energia. Ativas/Ultimate com custo de energia coerente (use as referências do sistema). Seja criativo: passivas acumulativas, sinergias entre habilidades, reatividade, redução de custo ao longo da rodada — são bem-vindas. Cada habilidade ganha 1-3 tags curtas.' : '- NÃO gere habilidades (gerarHabilidades=false).'}

ENTRADA DO USUÁRIO:
descrição: """${descricao || '(vazia — use criatividade coerente)'}"""
nivelPreferido: ${nivelPreferido || 'livre'}
foco: ${foco || 'livre'}

Retorne APENAS JSON válido, sem markdown, sem texto extra, neste formato:
{
  "nome": "string",
  "nivel": "recruta|iniciante|veterano|elite|lenda",
  "arquetipo": "string curta",
  "atributos": { "for": N, "agi": N, "per": N, "int": N, "von": N, "pre": N, "am": N },
  "narrativa": { "conceito": "string", "vinculo": "string", "cicatriz": "string" },
  ${gerarHabilidades ? `"habilidades": {
    "passiva": { "nome": "string", "descricao": "string detalhada", "energia": 0, "tags": [{"label":"string","color":"#hex"}] },
    "ativas": [ {3 objetos como a passiva mas com energia>0 e tipo:"ativa"} ],
    "ultimate": { "nome": "string", "descricao": "string", "energia": N, "tags": [...] }
  },` : ''}
  "justificativa": "string curta explicando as escolhas principais"
}`
}

export function abilitiesPrompt({ ficha, descricao }) {
  return `${SYSTEM_RULES_PROMPT}

# SUA MISSÃO: CRIAR AS HABILIDADES PARA UMA FICHA JÁ EXISTENTE
O usuário preencheu a ficha e descreve a BASE DE PODERES que deseja. Você cria 1 PASSIVA + 3 ATIVAS + 1 ULTIMATE.
- Use os ATRIBUTOS e o NÍVEL do personagem para calibrar potência e custo de energia.
- Seja criativo e inovador em mecânicas: passivas acumulativas, sinergias, reatividade, custos que mudam ao longo da rodada, condições, marcos. Até simplicidade deve ter um toque criativo.
- Passiva NÃO custa energia. Ativas e Ultimate custam energia (use referências: dano 2/4/7/12, cura 3, controle 4, proteção 3, suporte 2; ajuste por alcance/tipo duplo).
- Energia total do personagem está abaixo; nenhum custo individual deve inviabilizar o uso. Ultimate é a habilidade mais cara e impactante.
- Cada habilidade ganha 1-3 tags curtas com cores.

FICHA DO PERSONAGEM (JSON):
${JSON.stringify(ficha, null, 2)}

DESCRIÇÃO DO USUÁRIO:
"""${descricao || '(livre — crie algo coerente com o arquétipo)'}"""

Retorne APENAS JSON válido, sem markdown:
{
  "passiva": { "nome": "", "descricao": "", "energia": 0, "tags": [{"label":"","color":"#hex"}] },
  "ativas": [ {"nome":"","descricao":"","energia":N,"tags":[...]}, {...}, {...} ],
  "ultimate": { "nome": "", "descricao": "", "energia": N, "tags": [...] },
  "notas": "string curta com a leitura tática do kit"
}`
}

export function balancePrompt({ habilidade, ficha }) {
  return `${SYSTEM_RULES_PROMPT}

# SUA MISSÃO: AUDITORIA DE BALANCEAMENTO DE UMA HABILIDADE
Avalie a habilidade abaixo no contexto da ficha inteira. Identifique se ela QUEBRA o sistema, é FRACA, ou EQUILIBRADA. Considere: custo de energia vs efeito, sinergias abusivas,escalabilidade acumulativa, bypass de defesa, impacto por rodada, comparação com armas/magia equivalentes, regras de morte e vida zero.

Dê uma NOTA 0-100, um VEREDICTO, PROBLEMAS detectados (lista) e SUGESTÕES acionáveis (lista). Se houver números concretos, proponha valores corrigidos.

FICHA:
${JSON.stringify(ficha, null, 2)}

HABILIDADE EM ANÁLISE:
${JSON.stringify(habilidade, null, 2)}

Retorne APENAS JSON:
{
  "nota": N,
  "veredito": "EQUILIBRADO | LEVEMENTE DESBALANCEADO | DESBALANCEADO | QUEBRA O SISTEMA",
  "resumo": "string curta",
  "problemas": ["string", "..."],
  "sugestoes": ["string acionável", "..."],
  "versao_sugerida": { "nome": "", "descricao": "", "energia": N, "tags": [] } | null
}`
}
