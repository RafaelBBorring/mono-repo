/**
 * abilityGenerationPrompt.js — Prompt para Geracao de Habilidades Iniciais
 *
 * Finalidade: Gera o conjunto base de habilidades de um personagem a partir
 * de uma descricao narrativa (Passiva, Ativa x3, Ultimate, Extras).
 *
 * Tokens estimados: ~500-800 tokens
 *
 * O usuario descreve o conceito do personagem e a IA cria habilidades
 * com placeholders (XdY+MOD) para posterior balanceamento.
 */
export function buildAbilityGenerationPrompt({ char, description, allTipos, tiposList }) {
  return `PERSONAGEM: ${char.nome || 'Sem Nome'} | Classe: ${char.classe || 'N/A'} | Nivel: ${char.nivel || 1} | Faixa: ${getLevelBand(char.nivel || 1)}
FOR ${char.atributos?.FOR} | DES ${char.atributos?.DES} | CON ${char.atributos?.CON} | INT ${char.atributos?.INT} | APA ${char.atributos?.APA} | AM ${char.atributos?.AM}
Triagem: ${char.triagemPrincipal || 'Nenhuma'} (${char.triagemPrincipalNivel || 0})
Modulos: ${(char.modulosAdquiridos || []).map(m => m.name || m.id).join(', ') || 'Nenhum'}
Descricao do jogador: "${description}"

Crie EXATAMENTE ${allTipos.length} habilidades na ORDEM e TIPO abaixo:
${tiposList}

Regras:
- NAO atribua valores finais — use placeholders como XdY+MOD, X rodadas
- Cada habilidade DEVE ter pelo menos 1 efeito mecanico concreto
- EFEITOS NARRATIVOS DEVEM TER TRADUCAO MECANICA:
  - "Teleporte" → concede Vantagem em ataque/esquiva, bonus de posicao
  - "Invisibilidade" → Vantagem em Furtividade, Desvantagem para inimigos
  - "Rapidez" → +NdN em DES, acao extra condicional
- Mantenha coerencia narrativa: todas pertencem ao mesmo personagem
- Respeite Economia de Acoes: nenhuma habilidade concede mais de 1 acao extra por uso

Responda EXCLUSIVAMENTE com JSON:
{
  "habilidades": [
    { "tipo": "Passiva|Ativa|Ultimate|Extra (Triagem)|Extra (Modulo)", "nome": "nome criativo", "descricao": "descricao com mecanicas e placeholders" }
  ]
}`
}

function getLevelBand(nivel) {
  if (nivel <= 7)  return 'N1-7'
  if (nivel <= 15) return 'N8-15'
  if (nivel <= 22) return 'N16-22'
  return 'N23-30'
}
