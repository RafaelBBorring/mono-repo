/**
 * balanceUserPrompt.js — Prompt de Usuario para Balanceamento de Habilidades
 *
 * Finalidade: Monta o contexto completo do personagem + habilidades para a IA balancear.
 *
 * Tokens estimados: ~2000-4000 tokens (dependendo da quantidade de habilidades)
 *
 * Parametros:
 * - stats: objeto retornado por computeCharStats()
 * - char: ficha completa do personagem
 * - evoCtx: contexto de evolucao das habilidades
 * - pehTotal, pehSpent: PEH disponivel e gasto
 * - habilidadesData: array de habilidades serializadas
 * - armaHabs: habilidades da arma
 * - direction: 'buff' | 'nerf' | null
 * - systemSkills: catalogo de skills sistemicas
 * - effectParamDefs: definicoes de tipos de efeito
 */
import { getRaceProfile } from '../../data/raceProfiles'

export function buildBalanceUserPrompt({ stats, char, evoCtx, pehTotal, pehSpent, habilidadesData, armaHabs, direction, systemSkills, effectParamDefs }) {
  const raceProfile = getRaceProfile(char.raca)
  const raceCtx = raceProfile ? `
CONTEXTO RACIAL:
Fraquezas: ${raceProfile.fraquezas.map(f => `${f.nome} (${f.desc})`).join(' | ')}
Poderes Base: ${raceProfile.poderesBase.map(p => `${p.nome} (${p.desc})`).join(' | ')}` : ''

  const fichaCompleta = `
FICHA CALCULADA REAL DO PERSONAGEM:
Nome: ${char.nome || 'Sem Nome'} | Classe: ${char.classe || 'N/A'} | Nivel: ${stats.nivel} | Faixa: ${stats.band} | Raca: ${char.raca || 'N/A'} (${char.racaTipo || 'N/A'})
Atributos: FOR ${stats.atributos.FOR}(Mod${stats.atributos.modFOR}) | DES ${stats.atributos.DES}(Mod${stats.atributos.modDES}) | CON ${stats.atributos.CON}(Mod${stats.atributos.modCON}) | INT ${stats.atributos.INT}(Mod${stats.atributos.modINT}) | APA ${stats.atributos.APA} | AM ${stats.atributos.AM}(Mod${stats.atributos.modAM})
Vida Total: ${stats.vidaTotal} | Energia: ${stats.energiaTotal} | PE: ${stats.peTotal} | CA: ${stats.caBase} | Reacoes: ${stats.reacoes}
Dano Base: ${stats.danoBase} | Bonus Arma (${char.armaRank}): ${stats.armaDanoBonus} | Ataque Base: ${stats.ataqueBase}
PEH Total: ${pehTotal} | PEH gasto: ${pehSpent} | PEH restante: ${pehTotal - pehSpent}
Triagens: ${stats.triagem}
Amplificadores Triagem: ${stats.triagemAmps}
Amplificadores Modulo: ${stats.moduleAmps}
Modulos: ${(char.modulosAdquiridos || []).map(m => m.id || m).join(', ') || 'Nenhum'}
Pericias: ${Object.entries(char.pericias || {}).filter(([,v]) => v > 0).map(([k,v]) => `${k}(grau${v})`).join(', ') || 'Nenhuma'}
Equipamentos: Armadura ${stats.equipStats.totalArmor}/${stats.equipStats.totalArmorMax} | Crit +${stats.equipStats.totalCrit}% | Dano +${stats.equipStats.totalDamage}
${raceCtx}`

  const directionNote = direction === 'buff'
    ? 'DIRECAO DO MESTRE: BUFF — Aumente danos ~30-50%, reduza custos ~20%, aumente duracoes. Use TDH EFETIVO como MINIMO.'
    : direction === 'nerf'
    ? 'DIRECAO DO MESTRE: NERF — Reduza danos ~30-50%, aumente custos ~20%, reduza duracoes, adicione restricoes.'
    : ''

  return `${fichaCompleta}

HABILIDADES (para revisar e balancear):
${JSON.stringify(habilidadesData, null, 2)}

HABILIDADES DA ARMA:
${JSON.stringify(armaHabs, null, 2)}

CATALOGO DE SKILLS SISTEMICAS:
${JSON.stringify((systemSkills || []).map(s => ({ id: s.id, name: s.name, category: s.category, short: s.short, effectTypes: s.effectTypes })), null, 2)}

TIPOS DE EFEITO E PARAMETROS:
${JSON.stringify(Object.entries(effectParamDefs || {}).map(([type, def]) => ({ type, label: def.label, params: Object.entries(def.params).map(([k, p]) => ({ key: k, label: p.label, type: p.type, default: p.default })) })), null, 2)}

  ${directionNote}
  INSTRUCOES CRITICAS:
  - PARADIGMA PEH: Habilidades comecam BASE. O nivel do personagem NAO escala dano. PEH e o UNICO motor de escala.
  - ESCALA DIMINUINTA: Cada PEH concede MENOS incremento que o anterior. PEH 1->2 da mais que PEH 7->8.
  - TETO DE ENERGIA: NUNCA faca uma habilidade custar mais de 45% da energia total (${stats.energiaTotal}E). Calcule: custo / ${stats.energiaTotal} = percentual.
  - CUSTO = PODER: Se a habilidade custa muito, ela DEVE ser poderosa. Se custa pouco, nao pode ser devastadora. A proporcao e sagrada.
  - Para cada habilidade, verifique o campo "instrucaoIA" no contexto de evolucao — ele indica QUANTOS PEH foram investidos e qual o TDH efetivo.
  - Se evolucaoNivel = 0: use valores BASE (Fraca: 2d6+4, Media: 3d8+8, Forte: 4d10+12, Ult: 5d12+16).
  - Se evolucaoNivel > 0: escale com retornos diminutos. Use PEH^0.7 para dano e PEH^0.65 para energia. Respeite o teto TDH.
  - O dano da habilidade e EXTRA ao dano base+arma+atributo.
  - CUSTO DE ENERGIA OBRIGATORIO para Ativa e Ultimate. Nunca retorne custoEnergia: 0.
  - VERIFICACAO CUMULATIVA OBRIGATORIA (LCP + ANTI-ABUSO).
  - Economia de Acoes: habilidade + conhecimento NAO na mesma acao. Max 2 ataques/turno. Max 3 acoes totais/turno.
  - EVOLUCAO RESPETA CONCEITO: cura evolui cura, dano evolui dano, buff evolui buff. NUNCA adicione efeito contraditorio.
  - TAGS OBRIGATORIAS: retorne tags e valores para cada efeito numerico. Use bonusCA para Classe de Armadura/CA. Use curaEnergia para regeneracao/restauracao de energia/PE por rodada; nao classifique isso como cura de vida. Nao existe tag lentidao: velocidade reduzida deve virar bonusResultado negativo, bonusReacoes negativo ou outra mecanica real. Nao use duracao para habilidades instantaneas.
  - PEH POR TAG: escale somente as tags existentes. Se nao ha tag dano, nao adicione dano; se nao ha tag duracao, nao adicione rodadas.

Responda EXCLUSIVAMENTE com JSON:
{
  "habilidades": [
    {
      "index": 0,
      "nome": "mantenha o nome original",
      "descricao": "MANTEHA EXATAMENTE a descricao original do jogador.",
      "descricaoBalanceada": "Descricao com valores numericos atualizados.",
      "custoEnergia": 0,
      "dano": "XdY+MOD ajustado ou vazio",
      "duracao": "X rodadas ajustado ou vazio/null se instantanea",
      "dt": "DT <numero> <Atributo|Pericia> ou vazio. Ex: DT 18 Constituicao ou DT 22 Fortitude",
      "tags": ["custoEnergia", "bonusCA"],
      "valores": { "custoEnergia": 0, "bonusCA": "+2", "dt": "18", "dtTipo": "atributo|pericia", "dtTeste": "Constituicao|Fortitude" },
      "status": "aprovada|ajustada|irbalanceavel",
      "feedback": "analise completa"
    }
  ],
  "armaHabilidades": [
    {
      "index": 0,
      "nome": "mantenha o nome",
      "descricao": "MANTEHA a descricao original.",
      "descricaoBalanceada": "Descricao com valores atualizados.",
      "tipo": "Ativa ou Passiva",
      "custo": "custo ajustado",
      "feedback": "explicacao"
    }
  ],
  "systemSkillSuggestions": []
}`
}
