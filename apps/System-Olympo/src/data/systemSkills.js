export const SYSTEM_SKILL_CATEGORIES = [
  { id: 'progressao', label: 'Progressão' },
  { id: 'forja', label: 'Forja' },
  { id: 'recursos', label: 'Recursos' },
  { id: 'combate', label: 'Combate' },
  { id: 'conhecimento', label: 'Conhecimento' },
  { id: 'manual', label: 'Manual' },
]

export const EFFECT_PARAM_DEFS = {
  skeleton_points_per_level_interval: {
    label: 'Pontos de Esqueleto em Marcos',
    params: {
      every: { type: 'number', default: 5, label: 'A cada X níveis', min: 1, max: 30 },
      amount: { type: 'number', default: 1, label: 'Pontos concedidos', min: 1, max: 20 },
    },
  },
  skeleton_points_on_milestone: {
    label: 'Pontos de Esqueleto em Marco Específico',
    params: {
      levels: { type: 'text', default: '5,10,15,20,25,30', label: 'Níveis (separados por vírgula)' },
      amount: { type: 'number', default: 2, label: 'Pontos por marco', min: 1, max: 20 },
    },
  },
  hp_per_level: {
    label: 'Vida por Nível',
    params: {
      amount: { type: 'number', default: 3, label: 'Vida por nível', min: 1, max: 20 },
    },
  },
  energy_per_level: {
    label: 'Energia por Nível',
    params: {
      amount: { type: 'number', default: 3, label: 'Energia por nível', min: 1, max: 20 },
    },
  },
  pe_per_level_interval: {
    label: 'PE em Marcos',
    params: {
      every: { type: 'number', default: 5, label: 'A cada X níveis', min: 1, max: 30 },
      amount: { type: 'number', default: 2, label: 'PE concedidos', min: 1, max: 10 },
    },
  },
  peh_per_level_interval: {
    label: 'PEH em Marcos',
    params: {
      every: { type: 'number', default: 10, label: 'A cada X níveis', min: 1, max: 30 },
      amount: { type: 'number', default: 1, label: 'PEH concedidos', min: 1, max: 5 },
    },
  },
  attack_bonus: {
    label: 'Bônus de Ataque',
    params: {
      amount: { type: 'number', default: 1, label: 'Bônus', min: 1, max: 10 },
    },
  },
  damage_bonus: {
    label: 'Bônus de Dano',
    params: {
      amount: { type: 'number', default: 2, label: 'Bônus', min: 1, max: 20 },
    },
  },
  armor_bonus: {
    label: 'Bônus de Armadura (Absorção)',
    params: {
      amount: { type: 'number', default: 2, label: 'Bônus', min: 1, max: 20 },
    },
  },
  ca_bonus: {
    label: 'Bônus de CA',
    params: {
      amount: { type: 'number', default: 1, label: 'Bônus', min: 1, max: 5 },
    },
  },
  equipment_durability_bonus: {
    label: 'Bônus de Durabilidade',
    params: {
      amount: { type: 'number', default: 2, label: 'Bônus por peça', min: 1, max: 10 },
    },
  },
  carry_capacity_bonus: {
    label: 'Bônus de Capacidade de Carga',
    params: {
      amount: { type: 'number', default: 5, label: 'kg extras', min: 1, max: 50 },
    },
  },
  forge_rank_bonus: {
    label: 'Forja — Rank Superior',
    params: {
      rankBonus: { type: 'number', default: 1, label: 'Ranks acima do limite', min: 1, max: 3 },
    },
  },
  forge_enchantment_slots: {
    label: 'Forja — Slots de Encantamento',
    params: {
      slots: { type: 'number', default: 1, label: 'Encantamentos simultâneos', min: 1, max: 10 },
      scaling: { type: 'select', default: 'flat', label: 'Escala', options: [
        { value: 'flat', label: 'Fixo' },
        { value: 'int_half', label: 'INT / 2' },
        { value: 'level_half', label: 'Nível / 5' },
      ] },
    },
  },
  forge_quality_bonus: {
    label: 'Forja — Bônus de Qualidade',
    params: {
      qualityBonus: { type: 'number', default: 1, label: 'Bônus em atributo do item', min: 1, max: 5 },
    },
  },
  forge_unlock: {
    label: 'Forja — Desbloqueio de Técnica',
    params: {
      unlocks: { type: 'text', default: '', label: 'Técnicas (separadas por vírgula)' },
    },
  },
  knowledge_unlock: {
    label: 'Acesso a Subsistema',
    params: {
      unlocks: { type: 'text', default: '', label: 'Subsistemas (separados por vírgula)' },
    },
  },
  manual_flag: {
    label: 'Integração Manual',
    params: {},
  },
}

export const SYSTEM_SKILLS = [
  {
    id: 'skeleton_progression',
    name: 'Progressão de Esqueleto',
    category: 'progressao',
    rarity: 'Variável',
    short: 'Concede Pontos de Esqueleto extras em marcos de nível ou marcos específicos.',
    description: 'Para passivas que alteram a progressão de atributos. Configurável: quantidade, intervalo ou marcos específicos.',
    effectTypes: ['skeleton_points_per_level_interval', 'skeleton_points_on_milestone'],
    defaults: { type: 'skeleton_points_per_level_interval', every: 5, amount: 1 },
    adminNotes: 'Configure "every" e "amount" para match exato da passiva. Ex: "+5 a cada 3 níveis" → every=3, amount=5.',
  },
  {
    id: 'hp_boost',
    name: 'Vigor Aprimorado',
    category: 'recursos',
    rarity: 'Incomum',
    short: 'Aumenta a vida máxima por nível.',
    description: 'Passivas de resistência física permanente, sangue robusto ou constituição sobre-humana.',
    effectTypes: ['hp_per_level'],
    defaults: { type: 'hp_per_level', amount: 3 },
    adminNotes: 'Ajuste "amount" conforme a passiva. Valores altos (5+) são raros.',
  },
  {
    id: 'energy_boost',
    name: 'Reservatório Etéreo',
    category: 'recursos',
    rarity: 'Incomum',
    short: 'Aumenta energia máxima por nível.',
    description: 'Para linhagens arcanas, semideuses de domínio energético ou canalizadores.',
    effectTypes: ['energy_per_level'],
    defaults: { type: 'energy_per_level', amount: 3 },
    adminNotes: 'Ajuste "amount" conforme a passiva.',
  },
  {
    id: 'pe_boost',
    name: 'Patrocínio Divino',
    category: 'recursos',
    rarity: 'Rara',
    short: 'Concede PE extra em marcos de nível.',
    description: 'Para pactos, patronos, heranças nobres e suporte logístico.',
    effectTypes: ['pe_per_level_interval'],
    defaults: { type: 'pe_per_level_interval', every: 5, amount: 2 },
    adminNotes: 'PE é recurso universal; evite conceder muito.',
  },
  {
    id: 'peh_boost',
    name: 'Disciplina de Evolução',
    category: 'progressao',
    rarity: 'Rara',
    short: 'Concede PEH extra em marcos de nível.',
    description: 'Personagens que refinam técnicas mais rápido que a média.',
    effectTypes: ['peh_per_level_interval'],
    defaults: { type: 'peh_per_level_interval', every: 10, amount: 1 },
    adminNotes: 'PEH acelera habilidades. Use com cuidado.',
  },
  {
    id: 'combat_style',
    name: 'Doutrina de Combate',
    category: 'combate',
    rarity: 'Rara',
    short: 'Bônus passivo em ataque, dano e/ou CA.',
    description: 'Para estilos marciais permanentes que não viram habilidade ativa. Configurável: ataque, dano, CA.',
    effectTypes: ['attack_bonus', 'damage_bonus', 'ca_bonus'],
    defaults: { type: 'damage_bonus', amount: 2 },
    adminNotes: 'Pode combinar múltiplos efeitos. Evite acumular muitas Skills de combate.',
  },
  {
    id: 'armor_mastery',
    name: 'Armadura Animada',
    category: 'combate',
    rarity: 'Rara',
    short: 'Melhora armadura e/ou durabilidade de equipamentos.',
    description: 'Passivas que harmonizam corpo, armadura e energia vital.',
    effectTypes: ['armor_bonus', 'equipment_durability_bonus', 'ca_bonus'],
    defaults: { type: 'armor_bonus', amount: 2 },
    adminNotes: 'Combina bem com personagens que investem em armadura pesada.',
  },
  {
    id: 'forge_master',
    name: 'Mestre Forjador',
    category: 'forja',
    rarity: 'Épica',
    short: 'Criacao avancada de armas e equipamentos com bonus configuráveis.',
    description: 'Para passivas de forja. Combinável: rank superior, encantamentos, qualidade, técnicas especiais.',
    effectTypes: ['forge_rank_bonus', 'forge_enchantment_slots', 'forge_quality_bonus', 'forge_unlock'],
    defaults: { type: 'forge_quality_bonus', qualityBonus: 1 },
    adminNotes: 'Adicione múltiplos efeitos para passivas complexas. "Encantamento INT/2" → forge_enchantment_slots com scaling=int_half.',
  },
  {
    id: 'knowledge_access',
    name: 'Licença Arcana',
    category: 'conhecimento',
    rarity: 'Incomum',
    short: 'Permissão para acessar subsistemas (grimórios, runas, alquimia, magia).',
    description: 'Para passivas que abrem portas para subsistemas. A Skill registra a autorização do mestre.',
    effectTypes: ['knowledge_unlock'],
    defaults: { type: 'knowledge_unlock', unlocks: 'grimorios,runas' },
    adminNotes: 'A Skill não cria rituais; registra que o mestre autorizou o acesso.',
  },
  {
    id: 'load_mastery',
    name: 'Portador Eficiente',
    category: 'recursos',
    rarity: 'Comum',
    short: 'Aumenta capacidade de carga.',
    description: 'Para passivas de vigor físico, constituição ou treinamento de carga.',
    effectTypes: ['carry_capacity_bonus'],
    defaults: { type: 'carry_capacity_bonus', amount: 5 },
    adminNotes: 'Útil para personagens que carregam muito equipamento.',
  },
  {
    id: 'manual_integration',
    name: 'Integração Manual',
    category: 'manual',
    rarity: 'Variável',
    short: 'Regra ainda não automatizada. O mestre registra e gerencia manualmente.',
    description: 'Para passivas válidas sem Skill automatizada. Cria governança: o mestre reconhece e documenta.',
    effectTypes: ['manual_flag'],
    defaults: { type: 'manual_flag' },
    adminNotes: 'Use notas para documentar o efeito. Migre para Skill específica quando houver suporte.',
  },
]

export function getSystemSkillById(id) {
  return SYSTEM_SKILLS.find(skill => skill.id === id) || null
}

export function getEffectParamDef(effectType) {
  return EFFECT_PARAM_DEFS[effectType] || null
}

export function getAllEffectTypes() {
  return Object.keys(EFFECT_PARAM_DEFS).map(type => ({
    type,
    label: EFFECT_PARAM_DEFS[type].label,
  }))
}
