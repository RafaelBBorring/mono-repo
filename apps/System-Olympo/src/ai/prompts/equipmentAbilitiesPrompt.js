/**
 * equipmentAbilitiesPrompt.js — Prompt para Habilidades de Equipamento
 *
 * Finalidade: Gera habilidades ativas e passivas para equipamentos
 * (armaduras, coletes, escudos, acessorios).
 *
 * Tokens estimados: ~600-900 tokens
 */
export function buildEquipmentAbilitiesPrompt({ char, equipType, equipRank, activeSlots, passiveSlots, totalSlots, userDesc, typeDef, armorTypeDef, rarity }) {
  return `Voce e um sistema de balanceamento para equipamentos do Sistema Olympo 2.0.

PERSONAGEM: ${char.classe || 'N/A'} | Nivel: ${char.nivel || 1}
FOR ${char.atributos?.FOR || 10} | DES ${char.atributos?.DES || 10} | CON ${char.atributos?.CON || 10}

EQUIPAMENTO:
- Tipo: ${typeDef?.label || equipType} | Rank: ${equipRank}
- Armadura base: ${typeDef?.caBase || 0} | Bonus rank: +${rarity?.armorBonus || 0}
- Slots: ${activeSlots} ativa(s), ${passiveSlots} passiva(s), total ${totalSlots}
${userDesc ? `- Descricao: ${userDesc}` : ''}

REGRAS:
1. PASSIVAS devem ser SUTIS — equipamentos NAO sao armas.
2. NAO crie passivas que adicionam dano direto.
3. Armaduras: absorcao de dano (durabilidade), NAO CA.
4. Max 1 efeito principal + 1 condicao por passiva.
5. NAO gere bonus permanente de CA.
6. Efeitos narrativos DEVEM ter traducao mecanica (NdN, Vantagem, reducao de dano).

LIMITES POR RANK:
- Comum: sem passiva
- Incomum: efeito menor
- Raro: efeito moderado
- Epico: efeito forte
- Heroico+: efeitos combinados

Gere exatamente ${activeSlots} ativa(s) e ${passiveSlots} passiva(s).

Responda APENAS com JSON:
{
  "passivas": [
    { "nome": "string", "descricao": "string detalhada", "tipo": "Ativa ou Passiva", "efeito": "string resumido" }
  ]
}`
}
