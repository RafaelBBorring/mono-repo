export const SYSTEM_SKILL_CATEGORIES = [
  { id: 'progressao', label: 'Progressao', tone: 'text-emerald-300' },
  { id: 'combate', label: 'Combate', tone: 'text-red-300' },
  { id: 'recursos', label: 'Recursos', tone: 'text-sky-300' },
  { id: 'limite', label: 'Limites', tone: 'text-purple-300' },
  { id: 'forja', label: 'Forja', tone: 'text-amber-300' },
]

const ATTR_OPTIONS = [
  { value: 'FOR', label: 'FOR' },
  { value: 'DES', label: 'DES' },
  { value: 'CON', label: 'CON' },
  { value: 'INT', label: 'INT' },
  { value: 'APA', label: 'APA' },
  { value: 'AM', label: 'AM' },
]

export const EFFECT_PARAM_DEFS = {
  skeleton_points_per_level_interval: {
    label: 'Pontos de Esqueleto por nivel',
    short: 'Concede pontos extras em marcos de nivel.',
    params: {
      every: { label: 'A cada X niveis', type: 'number', min: 1, max: 50, default: 5 },
      amount: { label: 'Pontos concedidos', type: 'number', min: 1, max: 20, default: 1 },
    },
  },
  damage_per_level_interval: {
    label: 'Dano por nivel',
    short: 'Adiciona dano base em intervalos de nivel.',
    params: {
      every: { label: 'A cada X niveis', type: 'number', min: 1, max: 50, default: 5 },
      amount: { label: 'Dano concedido', type: 'number', min: 1, max: 100, default: 5 },
    },
  },
  damage_per_attribute_interval: {
    label: 'Dano por atributo',
    short: 'Escala dano conforme um atributo ou seus pontos de esqueleto.',
    params: {
      attr: { label: 'Atributo', type: 'select', default: 'FOR', options: ATTR_OPTIONS },
      source: {
        label: 'Fonte',
        type: 'select',
        default: 'skeleton',
        options: [
          { value: 'skeleton', label: 'Pontos de Esqueleto' },
          { value: 'total', label: 'Atributo total' },
        ],
      },
      every: { label: 'A cada X pontos', type: 'number', min: 1, max: 100, default: 5 },
      amount: { label: 'Dano concedido', type: 'number', min: 1, max: 200, default: 10 },
    },
  },
  resource_per_level: {
    label: 'Recurso por nivel',
    short: 'Aumenta Vida, Energia ou PE por nivel.',
    params: {
      resource: {
        label: 'Recurso',
        type: 'select',
        default: 'energia',
        options: [
          { value: 'vida', label: 'Vida' },
          { value: 'energia', label: 'Energia' },
          { value: 'pe', label: 'PE' },
        ],
      },
      amount: { label: 'Bonus por nivel', type: 'number', min: 1, max: 50, default: 3 },
    },
  },
  attribute_cap_bonus: {
    label: 'Quebra de limite',
    short: 'Permite ultrapassar o limite de um atributo especifico.',
    params: {
      attr: { label: 'Atributo', type: 'select', default: 'FOR', options: ATTR_OPTIONS },
      amount: { label: 'Limite extra por compra', type: 'number', min: 1, max: 10, default: 1 },
      purchases: { label: 'Compras', type: 'number', min: 1, max: 3, default: 1 },
    },
  },
  forge_rank_bonus: {
    label: 'Rank especial de forja',
    short: 'Permite criar armas acima do limite normal de rank.',
    params: {
      rankBonus: { label: 'Ranks alem do limite', type: 'number', min: 1, max: 4, default: 1 },
      label: { label: 'Metal ou tecnica', type: 'text', default: 'Aco Hefestiano' },
    },
  },
  forge_enchantment_slots: {
    label: 'Encantamentos de arma',
    short: 'Libera habilidades extras de arma chamadas Encantamentos.',
    params: {
      slots: { label: 'Encantamentos base', type: 'number', min: 1, max: 8, default: 1 },
      scaling: {
        label: 'Escala',
        type: 'select',
        default: 'flat',
        options: [
          { value: 'flat', label: 'Fixo' },
          { value: 'level_interval', label: 'Por nivel' },
          { value: 'int_interval', label: 'Por INT' },
        ],
      },
      every: { label: 'A cada X', type: 'number', min: 1, max: 50, default: 5 },
      amount: { label: 'Bonus escalado', type: 'number', min: 0, max: 8, default: 1 },
    },
  },
  forge_quality_bonus: {
    label: 'Qualidade de forja',
    short: 'Bonus numerico livre para representar acabamento superior.',
    params: {
      qualityBonus: { label: 'Bonus de qualidade', type: 'number', min: 1, max: 20, default: 1 },
    },
  },
  manual_flag: {
    label: 'Pendencia manual',
    short: 'Registro de uma passiva que ainda precisa de implementacao dedicada.',
    params: {
      label: { label: 'Resumo', type: 'text', default: 'Criar Skill dedicada' },
    },
  },
}

export const SYSTEM_SKILLS = [
  {
    id: 'skeleton_progression',
    name: 'Progressao de Esqueleto',
    category: 'progressao',
    rarity: 'Variavel',
    short: 'Concede Pontos de Esqueleto extras em marcos de nivel configurados pelo Mestre.',
    description: 'Use quando uma passiva acelera crescimento estrutural do personagem, como receber pontos extras a cada X niveis.',
    effectTypes: ['skeleton_points_per_level_interval'],
    defaults: { type: 'skeleton_points_per_level_interval', every: 5, amount: 1 },
  },
  {
    id: 'scaling_damage',
    name: 'Dano Escalavel',
    category: 'combate',
    rarity: 'Rara',
    short: 'Adiciona dano base por nivel, atributo total ou pontos de esqueleto.',
    description: 'Use para passivas que transformam evolucao ou investimento em atributo em dano permanente na ficha.',
    effectTypes: ['damage_per_level_interval', 'damage_per_attribute_interval'],
    defaults: { type: 'damage_per_attribute_interval', attr: 'FOR', source: 'skeleton', every: 5, amount: 10 },
  },
  {
    id: 'resource_growth',
    name: 'Reservatorio Vital',
    category: 'recursos',
    rarity: 'Incomum',
    short: 'Aumenta Vida, Energia ou PE maximo por nivel.',
    description: 'Use para passivas que criam uma reserva natural maior de sobrevivencia, energia mistica ou potencial heroico.',
    effectTypes: ['resource_per_level'],
    defaults: { type: 'resource_per_level', resource: 'energia', amount: 3 },
  },
  {
    id: 'attribute_cap_break',
    name: 'Quebra de Limite',
    category: 'limite',
    rarity: 'Rara',
    short: 'Permite ultrapassar o limite de um atributo escolhido em ate 3 compras.',
    description: 'Use quando uma passiva ou linhagem permite ir alem do teto normal de atributo imposto pelo nivel.',
    effectTypes: ['attribute_cap_bonus'],
    defaults: { type: 'attribute_cap_bonus', attr: 'FOR', amount: 1, purchases: 1 },
  },
  {
    id: 'forge_master',
    name: 'Mestre Forjador',
    category: 'forja',
    rarity: 'Exclusiva',
    short: 'Libera ranks especiais, encantamentos e acabamento superior em armas criadas.',
    description: 'Use para personagens que constroem armas para o grupo. A criacao de arma passa a mostrar o rank especial e os slots de Encantamento.',
    effectTypes: ['forge_rank_bonus', 'forge_enchantment_slots', 'forge_quality_bonus'],
    defaults: { type: 'forge_enchantment_slots', slots: 1, scaling: 'flat', every: 5, amount: 1 },
  },
]

const MANUAL_SKILL = {
  id: 'manual_integration',
  name: 'Pendencia de Skill',
  category: 'progressao',
  rarity: 'Manual',
  short: 'O Mestre precisa decidir se esta passiva merece uma Skill dedicada.',
  description: 'Registro administrativo para casos raros que ainda nao possuem implementacao propria.',
  effectTypes: ['manual_flag'],
  defaults: { type: 'manual_flag', label: 'Criar Skill dedicada' },
}

const LEGACY_SKILL_ALIASES = {
  hp_boost: 'resource_growth',
  energy_boost: 'resource_growth',
  pe_boost: 'resource_growth',
  peh_boost: 'resource_growth',
  combat_style: 'scaling_damage',
  armor_mastery: 'attribute_cap_break',
  load_mastery: 'attribute_cap_break',
  knowledge_access: 'manual_integration',
}

export function getSystemSkillById(id) {
  if (id === MANUAL_SKILL.id) return MANUAL_SKILL
  const normalized = LEGACY_SKILL_ALIASES[id] || id
  if (normalized === MANUAL_SKILL.id) return MANUAL_SKILL
  return SYSTEM_SKILLS.find(skill => skill.id === normalized) || null
}

export function getEffectParamDef(type) {
  return EFFECT_PARAM_DEFS[type] || null
}

export function getAllEffectTypes() {
  return Object.keys(EFFECT_PARAM_DEFS)
}
