export const ARMOR_SLOTS = [
  { id: 'peitoral', label: 'Peitoral', icon: '🛡️', desc: 'Proteção torso e peito' },
  { id: 'elmo', label: 'Elmo', icon: '⛑️', desc: 'Proteção craniana' },
  { id: 'calcas', label: 'Calças', icon: '👖', desc: 'Proteção pernas e quadril' },
  { id: 'botas', label: 'Botas', icon: '👢', desc: 'Proteção pés e tornozelos' },
]

export const ARMOR_WEIGHTS = [
  { id: 'leve', label: 'Leve', armor: 4, speedPenalty: 0, extraLife: 3, critBonus: 0, desc: 'Mobilidade total, proteção mínima. Sem penalidade.' },
  { id: 'comum', label: 'Comum', armor: 7, speedPenalty: 0, extraLife: 5, critBonus: 0, desc: 'Equilíbrio entre proteção e mobilidade.' },
  { id: 'pesado', label: 'Pesado', armor: 10, speedPenalty: -1, extraLife: 8, critBonus: 0, desc: 'Proteção máxima. -1 DES, reduz velocidade.' },
]

export const ARMOR_TYPES = [
  {
    id: 'guerreiro',
    label: 'Guerreiro',
    color: 'red',
    colorClass: 'text-red-400',
    bgClass: 'bg-red-400/10',
    borderClass: 'border-red-400/30',
    badgeClass: 'bg-red-400/10 text-red-400 border-red-400/20',
    miniBonus: '+2 em Bloqueio enquanto ao menos uma peca Guerreiro estiver equipada.',
    miniPassive: '1 PE para firmar postura e ignorar o primeiro empurrao fraco da cena.',
    desc: 'Proteção física, postura de linha de frente e controle de impacto.',
    bonuses: [
      { pieces: 3, label: 'Linha de Frente', bonus: '+5 Vida temporária ao iniciar combate e +2 em Bloqueio', passive: 'Pode gastar 2 PE ao sofrer dano para reduzir 1d6 do impacto.' },
      { pieces: 4, label: 'Bastião', bonus: '+10 Vida temporária ao iniciar combate e +5 em testes contra empurrão/queda', passive: '1x por combate, ao bloquear, a armadura perde 2 de durabilidade a menos.' },
    ],
  },
  {
    id: 'furtivo',
    label: 'Furtivo',
    color: 'purple',
    colorClass: 'text-purple-400',
    bgClass: 'bg-purple-400/10',
    borderClass: 'border-purple-400/30',
    badgeClass: 'bg-purple-400/10 text-purple-400 border-purple-400/20',
    miniBonus: '+2 em Furtividade enquanto ao menos uma peca Furtivo estiver equipada.',
    miniPassive: '1 PE para nao gerar ruido em um deslocamento curto.',
    desc: 'Mobilidade silenciosa, ocultação e evasão.',
    bonuses: [
      { pieces: 3, label: 'Sombra Viva', bonus: '+10 em Furtividade', passive: 'Pode gastar 3 PE para receber Vantagem em uma esquiva até o fim do turno.' },
      { pieces: 4, label: 'Fantasma Operacional', bonus: '+10 em Furtividade e +5 em Prestidigitação', passive: '1x por cena, após se mover sem ser visto, o próximo teste de Furtividade tem Vantagem.' },
    ],
  },
  {
    id: 'tecnologico',
    label: 'Tecnológico',
    color: 'cyan',
    colorClass: 'text-cyan-400',
    bgClass: 'bg-cyan-400/10',
    borderClass: 'border-cyan-400/30',
    badgeClass: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',
    miniBonus: '+2 em Tecnologia enquanto ao menos uma peca Tecnologico estiver equipada.',
    miniPassive: '1 PE para identificar a fonte de um sinal eletronico proximo.',
    desc: 'Sensores, interfaces e contramedidas eletrônicas.',
    bonuses: [
      { pieces: 3, label: 'Interface Neural', bonus: '+10 em Tecnologia', passive: 'Scan passivo: identifica eletrônicos, rastreadores e armadilhas simples em 10m.' },
      { pieces: 4, label: 'Nexo Cibernético', bonus: '+10 em Tecnologia e +5 em Investigação', passive: 'Pode gastar 4 PE para desativar interferência ou rastreamento por 1 rodada.' },
    ],
  },
  {
    id: 'medico',
    label: 'Médico',
    color: 'emerald',
    colorClass: 'text-emerald-400',
    bgClass: 'bg-emerald-400/10',
    borderClass: 'border-emerald-400/30',
    badgeClass: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    miniBonus: '+2 em Medicina enquanto ao menos uma peca Medico estiver equipada.',
    miniPassive: '1 PE para estabilizar sangramento leve sem consumir carga de kit.',
    desc: 'Primeiros socorros, estabilização e suporte de campo.',
    bonuses: [
      { pieces: 3, label: 'Resposta Rápida', bonus: '+10 em Medicina', passive: 'Pode gastar 3 PE para estabilizar um aliado adjacente como ação bônus.' },
      { pieces: 4, label: 'Suporte de Trauma', bonus: '+10 em Medicina e +5 em Sobrevivência', passive: 'Curas de item ou equipamento recuperam +1d6 Vida.' },
    ],
  },
  {
    id: 'demolidor',
    label: 'Demolidor',
    color: 'amber',
    colorClass: 'text-amber-400',
    bgClass: 'bg-amber-400/10',
    borderClass: 'border-amber-400/30',
    badgeClass: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
    miniBonus: '+2 em testes com explosivos ou arrombamento preparado.',
    miniPassive: '1 PE para reduzir o tempo de preparar uma carga simples.',
    desc: 'Explosivos, arrombamento, brecha e controle de área.',
    bonuses: [
      { pieces: 3, label: 'Carga Controlada', bonus: '+10 em testes com explosivos e arrombamento', passive: 'Pode gastar 3 PE para reduzir em 1 dado o dano colateral de uma explosão que preparou.' },
      { pieces: 4, label: 'Brecha Limpa', bonus: '+10 em explosivos e +5 em Tecnologia', passive: '1x por cena, uma carga plantada por você impõe Desvantagem no teste de resistência.' },
    ],
  },
  {
    id: 'exploracao',
    label: 'Exploração',
    color: 'sky',
    colorClass: 'text-sky-400',
    bgClass: 'bg-sky-400/10',
    borderClass: 'border-sky-400/30',
    badgeClass: 'bg-sky-400/10 text-sky-400 border-sky-400/20',
    miniBonus: '+2 em Sobrevivencia ou Atletismo de travessia.',
    miniPassive: '1 PE para improvisar apoio em escalada, queda curta ou terreno ruim.',
    desc: 'Travessia, escalada, sobrevivência e ferramentas de campo.',
    bonuses: [
      { pieces: 3, label: 'Kit de Campo', bonus: '+10 em Sobrevivência ou Atletismo situacional', passive: 'Pode gastar 2 PE para ignorar terreno difícil por 1 rodada.' },
      { pieces: 4, label: 'Operador de Terreno', bonus: '+10 em Sobrevivência e +5 em Percepção', passive: '1x por cena, encontra rota segura sem teste em terreno conhecido.' },
    ],
  },
]

export const EQUIPMENT_RARITIES = [
  {
    rank: 'Comum', extraLife: 0, armorBonus: 0, activeSkills: 0, passiveSkills: 0,
    critBonus: 0, damageBonus: 0, shieldAmount: 0, color: 'gray',
    desc: 'Equipamento básico sem melhorias.',
  },
  {
    rank: 'Incomum', extraLife: 2, armorBonus: 1, activeSkills: 0, passiveSkills: 0,
    critBonus: 0, damageBonus: 0, shieldAmount: 0, color: 'emerald',
    desc: 'Reforço menor. A vida extra é temporária de sessão enquanto a peça estiver utilizável.',
  },
  {
    rank: 'Raro', extraLife: 4, armorBonus: 1, activeSkills: 0, passiveSkills: 0,
    critBonus: 0, damageBonus: 0, shieldAmount: 1, color: 'sky',
    desc: 'Reforço de campo. Escudo pequeno e vida temporária de sessão.',
  },
  {
    rank: 'Épico', extraLife: 6, armorBonus: 2, activeSkills: 1, passiveSkills: 0,
    critBonus: 0, damageBonus: 0, shieldAmount: 2, color: 'purple',
    desc: '1 habilidade ativa. Armadura aumenta durabilidade/absorção, não soma CA.',
  },
  {
    rank: 'Heroico', extraLife: 8, armorBonus: 2, activeSkills: 1, passiveSkills: 0,
    critBonus: 0, damageBonus: 0, shieldAmount: 3, color: 'rose',
    desc: '1 habilidade ativa. Se a peça quebrar, perde armadura, escudo e habilidade até reparar.',
  },
  {
    rank: 'Ancestral', extraLife: 10, armorBonus: 3, activeSkills: 2, passiveSkills: 0,
    critBonus: 0, damageBonus: 0, shieldAmount: 4, color: 'amber',
    desc: '2 habilidades ativas. Armadura é absorção/durabilidade, não CA. Reparo: rank × 10 PO + 1h.',
  },
  {
    rank: 'Mítico', extraLife: 12, armorBonus: 4, activeSkills: 2, passiveSkills: 0,
    critBonus: 0, damageBonus: 0, shieldAmount: 5, color: 'fuchsia',
    desc: '2 habilidades ativas. Escudo e armadura são camadas defensivas antes da Vida.',
  },
  {
    rank: 'Transcendente', extraLife: 15, armorBonus: 4, activeSkills: 2, passiveSkills: 1,
    critBonus: 0, damageBonus: 0, shieldAmount: 6, color: 'cyan',
    desc: '2 ativas + 1 passiva. Não concede CA. Reparo: 250 PO + 4h de ferraria especializada.',
  },
]

export const EQUIPMENT_STAT_LABELS = {
  armorBonus: {
    label: 'Armadura',
    icon: '🛡',
    desc: 'Absorção de Dano — Reduz CADA golpe recebido pelo valor indicado. Acumulável entre peças.',
    lose: 'Se o equipamento quebrar ou for removido, perde-se temporariamente a armadura daquela peça.',
  },
  extraLife: {
    label: 'Vida Temporária',
    icon: '❤',
    desc: 'Concedida na primeira utilização da peça na sessão. Remove-se ao desequipar, quebrar ou encerrar a sessão.',
    lose: 'Perdida ao desequipar ou quando a peça quebra.',
  },
  shieldAmount: {
    label: 'Escudo de Energia',
    icon: '💠',
    desc: 'Camada de proteção que absorve dano ANTES do HP. Regenera completamente no início de cada turno de combate.',
    lose: 'Se o equipamento for removido em combate, o escudo desaparece imediatamente.',
  },
  critBonus: {
    label: 'Chance de Crítico',
    icon: '⚡',
    desc: 'Chance adicional de causar golpe crítico (dano dobrado).',
    lose: null,
  },
  damageBonus: {
    label: 'Dano Extra',
    icon: '⚔',
    desc: 'Adicionado ao dano de cada ataque realizado.',
    lose: null,
  },
}

export const EQUIPMENT_REPAIR_RULES = {
  desc: 'Quando um equipamento recebe dano direto (ataque focado na armadura, explosão, etc.), ele pode quebrar.',
  broken: 'Equipamento quebrado: perde-se armadura, escudo e habilidades até reparo.',
  repair: 'Custo de reparo: Raridade × 10 PO. Tempo: 1 hora de trabalho em ferraria.',
  transcendente: 'Transcendente: 250 PO + 4 horas. Exige ferraria especializada.',
}

export const EQUIPMENT_TYPES = [
  { id: 'peitoral_leve', label: 'Peitoral Leve', slot: 'peitoral', weight: 'leve', armorType: null, caBase: 4, penalty: 0, extraLife: 3, desc: 'Couro fino, tecido reforçado. Leve e ágil.' },
  { id: 'peitoral_comum', label: 'Peitoral Comum', slot: 'peitoral', weight: 'comum', armorType: null, caBase: 7, penalty: 0, extraLife: 6, desc: 'Cota de malha ou couro endurecido. Equilibrado.' },
  { id: 'peitoral_pesado', label: 'Peitoral Pesado', slot: 'peitoral', weight: 'pesado', armorType: null, caBase: 10, penalty: -1, extraLife: 9, desc: 'Placas de metal completo. Proteção máxima.' },
  { id: 'elmo_leve', label: 'Elmo Leve', slot: 'elmo', weight: 'leve', armorType: null, caBase: 2, penalty: 0, extraLife: 2, desc: 'Capacete de couro. Proteção básica craniana.' },
  { id: 'elmo_comum', label: 'Elmo Comum', slot: 'elmo', weight: 'comum', armorType: null, caBase: 4, penalty: 0, extraLife: 3, desc: 'Elmo de metal reforçado. Boa proteção.' },
  { id: 'elmo_pesado', label: 'Elmo Pesado', slot: 'elmo', weight: 'pesado', armorType: null, caBase: 6, penalty: -1, extraLife: 5, desc: 'Elmo completo com viseira. Visão limitada, proteção total.' },
  { id: 'calcas_leve', label: 'Calças Leves', slot: 'calcas', weight: 'leve', armorType: null, caBase: 2, penalty: 0, extraLife: 2, desc: 'Perneiras de couro flexível. Mobilidade total.' },
  { id: 'calcas_comum', label: 'Calças Comuns', slot: 'calcas', weight: 'comum', armorType: null, caBase: 4, penalty: 0, extraLife: 3, desc: 'Grevas de malha. Proteção razoável.' },
  { id: 'calcas_pesado', label: 'Calças Pesadas', slot: 'calcas', weight: 'pesado', armorType: null, caBase: 6, penalty: -1, extraLife: 5, desc: 'Placas articuladas. Máxima proteção nas pernas.' },
  { id: 'botas_leve', label: 'Botas Leves', slot: 'botas', weight: 'leve', armorType: null, caBase: 1, penalty: 0, extraLife: 1, desc: 'Botas de couro. Agilidade e leveza.' },
  { id: 'botas_comum', label: 'Botas Comuns', slot: 'botas', weight: 'comum', armorType: null, caBase: 3, penalty: 0, extraLife: 2, desc: 'Botas reforçadas com placa de metal.' },
  { id: 'botas_pesado', label: 'Botas Pesadas', slot: 'botas', weight: 'pesado', armorType: null, caBase: 4, penalty: -1, extraLife: 4, desc: 'Botas de placa pesada. Máxima proteção nos pés.' },
  { id: 'acessorio', label: 'Acessório', slot: 'acessorio', weight: null, armorType: null, caBase: 0, penalty: 0, extraLife: 0, desc: 'Anéis, amuletos, capas. Concedem passivas especiais.' },
  { id: 'utilidade', label: 'Item de Utilidade', slot: null, weight: null, armorType: null, caBase: 0, penalty: 0, extraLife: 0, desc: 'Escutas, ganchos, tasers, kits. Efeitos situacionais.' },
]

export const EQUIPMENT_LIMITS = [
  { minLevel: 1, maxRank: 'Comum' },
  { minLevel: 4, maxRank: 'Incomum' },
  { minLevel: 7, maxRank: 'Raro' },
  { minLevel: 10, maxRank: 'Épico' },
  { minLevel: 14, maxRank: 'Heroico' },
  { minLevel: 18, maxRank: 'Ancestral' },
  { minLevel: 22, maxRank: 'Mítico' },
  { minLevel: 26, maxRank: 'Transcendente' },
]

export const SET_BONUSES = ARMOR_TYPES.map(type => ({
  id: type.id,
  name: type.label,
  desc: type.desc,
  miniBonus: type.miniBonus,
  miniPassive: type.miniPassive,
  bonuses: type.bonuses,
  colorClass: type.colorClass,
  bgClass: type.bgClass,
  borderClass: type.borderClass,
  badgeClass: type.badgeClass,
}))

export const SIMPLE_ITEMS = [
  { id: 'escuta', nome: 'Escuta Eletrônica', desc: 'Microfone direcional com 30m de alcance. Permite ouvir conversas através de paredes finas.', efeito: 'Vantagem em Percepção auditiva', peso: 0.2 },
  { id: 'gancho', nome: 'Gancho de Escalada', desc: 'Gancho de aço com corda de 15m.', efeito: 'Permite escalada sem teste em superfícies adequadas', peso: 1.5 },
  { id: 'taser', nome: 'Taser de Pulso', desc: 'Descarga elétrica de curto alcance (3m).', efeito: 'Ataque: 1d4 + INT mod. Alvo faz teste CON CD 12 ou paralisia 1 turno', peso: 0.3 },
  { id: 'kit_medico', nome: 'Kit Médico Portátil', desc: 'Suprimentos para primeiros socorros de campo.', efeito: 'Restaura 1d8 + INT mod Vida. Usos: 3', peso: 0.5 },
  { id: 'kit_ladroin', nome: 'Kit de Ladrão', desc: 'Gazua, grampo, tensiómetro e alfinetes.', efeito: 'Vantagem em testes de prestidigitação e arrombamento', peso: 0.3 },
  { id: 'lente_noite', nome: 'Lente de Visão Noturna', desc: 'Óculos compactos com amplificação de luz.', efeito: 'Visão no escuro até 30m. Desvantagem em luz forte.', peso: 0.2 },
  { id: 'granada_fumaca', nome: 'Granada de Fumaça', desc: 'Cilindro que libera nuvem densa em 5m de raio.', efeito: 'Área obscurecida por 3 turnos. Vantagem em Furtividade na área.', peso: 0.4 },
  { id: 'granada_frag', nome: 'Granada de Fragmentação', desc: 'Explosivo de arremesso com estilhaços em área curta.', efeito: '4d8 perfurante em raio 4m. DES CD 15 reduz metade. Barulho alto.', peso: 0.4 },
  { id: 'granada_luz', nome: 'Granada Flashbang', desc: 'Dispositivo de luz e som para entrada tática.', efeito: 'Raio 5m. CON CD 15 ou cego/surdo por 1 turno; sucesso reduz para Desvantagem em Percepção.', peso: 0.35 },
  { id: 'granada_incendiaria', nome: 'Granada Incendiária', desc: 'Composto incendiário de dispersão rápida.', efeito: '3d8 fogo em raio 3m e terreno em chamas por 2 turnos. DES CD 15 evita ignição.', peso: 0.5 },
  { id: 'granada_emp', nome: 'Granada EMP', desc: 'Pulso eletromagnético compacto contra eletrônicos.', efeito: 'Desativa dispositivos comuns em 6m por 2 turnos. Tecnologia CD 16 para resistir/reativar.', peso: 0.45 },
  { id: 'c4', nome: 'Carga C4', desc: 'Explosivo plástico moldável com detonador remoto.', efeito: '6d10 explosivo em raio 6m; dobra dano contra estruturas. Requer 1 ação para plantar.', peso: 1.2 },
  { id: 'carga_brecha', nome: 'Carga de Brecha', desc: 'Carga direcionada para portas, cofres leves e paredes frágeis.', efeito: 'Abre uma barreira preparada. Alvos adjacentes sofrem 3d8 explosivo, DES CD 14 metade.', peso: 0.8 },
  { id: 'mina_claymore', nome: 'Mina Claymore', desc: 'Mina direcional com disparo remoto ou fio de tropeço.', efeito: 'Cone 8m, 5d8 perfurante. Percepção CD 16 para notar; DES CD 15 metade.', peso: 1.6 },
  { id: 'drone_batedor', nome: 'Drone Batedor', desc: 'Drone pequeno com câmera e microfone.', efeito: '+10 em reconhecimento a até 80m; 1 PV, CA 12, vulnerável a EMP.', peso: 0.6 },
  { id: 'jammer', nome: 'Jammer Portátil', desc: 'Bloqueador de sinal de curto alcance.', efeito: 'Interfere rádio, GPS e rastreadores em 15m por 10 minutos. Tecnologia CD 16 para contornar.', peso: 0.9 },
  { id: 'rastreador', nome: 'Rastreador Magnético', desc: 'Beacon discreto para veículos e cargas.', efeito: 'Marca alvo por 24h em até 2km urbanos. Percepção ou Tecnologia CD 15 para encontrar.', peso: 0.1 },
  { id: 'corda_aco', nome: 'Corda de Aço (10m)', desc: 'Corda resistente para escalada ou contenção.', efeito: 'Suporta 200kg. Pode ser usada para imobilizar (FOR vs FOR).', peso: 1 },
]

export function getEquipLimitForLevel(nivel) {
  for (let i = EQUIPMENT_LIMITS.length - 1; i >= 0; i--) {
    if (nivel >= EQUIPMENT_LIMITS[i].minLevel) return EQUIPMENT_LIMITS[i]
  }
  return EQUIPMENT_LIMITS[0]
}

export function getEquipRarityIndex(rank) {
  const key = normalizeRank(rank)
  return EQUIPMENT_RARITIES.findIndex(r => normalizeRank(r.rank) === key)
}

export function normalizeRank(rank = '') {
  return String(rank).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function getEquipmentRarity(rank) {
  const key = normalizeRank(rank)
  return EQUIPMENT_RARITIES.find(r => normalizeRank(r.rank) === key) || EQUIPMENT_RARITIES[0]
}

export function canEquipRank(nivel, rank) {
  const limit = getEquipLimitForLevel(nivel)
  const maxIdx = getEquipRarityIndex(limit.maxRank)
  const rankIdx = getEquipRarityIndex(rank)
  return rankIdx >= 0 && rankIdx <= maxIdx
}

export function calcEquipStats(equipamentos) {
  if (!Array.isArray(equipamentos)) return { totalArmor: 0, totalArmorMax: 0, totalExtraLife: 0, totalCrit: 0, totalDamage: 0, totalShield: 0, totalSpeedPenalty: 0, activeCategoryBonuses: [], activeSetBonuses: [] }

  let totalArmor = 0
  let totalArmorMax = 0
  let totalExtraLife = 0
  let totalCrit = 0
  let totalDamage = 0
  let totalShield = 0
  let totalSpeedPenalty = 0

  const equipped = equipamentos.filter(e => e.equipado && e.categoria === 'Equipamento')

  for (const eq of equipped) {
    const type = EQUIPMENT_TYPES.find(t => t.id === eq.tipoEquip)
    const rarity = getEquipmentRarity(eq.rank)
    if (!type || !rarity) continue

    const armorMax = (type.caBase || 0) + (rarity.armorBonus || 0)
    const armorCurrent = eq.armorAtual == null ? armorMax : Math.max(0, Number(eq.armorAtual) || 0)
    const broken = eq.quebrado || armorCurrent <= 0

    totalArmorMax += armorMax
    totalArmor += broken ? 0 : Math.min(armorCurrent, armorMax)
    if (!broken) {
      totalExtraLife += (type.extraLife || 0) + (rarity.extraLife || 0)
      totalCrit += rarity.critBonus || 0
      totalDamage += rarity.damageBonus || 0
      totalShield += rarity.shieldAmount || 0
      totalSpeedPenalty += type.penalty || 0
    }
  }

  const setCounts = {}
  equipped.forEach(e => {
    if (e.armorType) {
      setCounts[e.armorType] = (setCounts[e.armorType] || 0) + 1
    }
  })

  const activeCategoryBonuses = []
  const activeSetBonuses = []
  for (const at of ARMOR_TYPES) {
    const count = setCounts[at.id] || 0
    if (count >= 1) {
      activeCategoryBonuses.push({ type: at, count, bonus: at.miniBonus, passive: at.miniPassive })
    }
    if (count >= 3) {
      const applicableBonuses = at.bonuses.filter(b => count >= b.pieces)
      const best = applicableBonuses[applicableBonuses.length - 1]
      if (best) {
        activeSetBonuses.push({ type: at, count, bonus: best })
      }
    }
  }

  return { totalArmor, totalArmorMax, totalExtraLife, totalCrit, totalDamage, totalShield, totalSpeedPenalty, activeCategoryBonuses, activeSetBonuses }
}

export function estimateEquipmentWeight(item = {}) {
  if (item.peso !== '' && item.peso != null && !Number.isNaN(Number(item.peso))) return Number(item.peso)
  const type = EQUIPMENT_TYPES.find(t => t.id === item.tipoEquip)
  const text = `${item.nome || ''} ${item.descricao || ''} ${type?.label || ''}`.toLowerCase()
  if (/peitoral.*pesado|placas|armadura pesada/.test(text)) return 12
  if (/peitoral|cota|colete/.test(text)) return 6
  if (/elmo|capacete/.test(text)) return 1.5
  if (/cal[cç]as|grevas/.test(text)) return 3
  if (/botas/.test(text)) return 1.8
  if (/anel|amuleto|acess[oó]rio/.test(text)) return 0.2
  if (/granada|carga|c4|mina/.test(text)) return 0.8
  if (/drone|jammer|kit|corda|gancho/.test(text)) return 1
  return item.categoria === 'Equipamento' ? 2 : 0.5
}

export function getEquipmentBySlot(equipamentos, slotId) {
  if (!Array.isArray(equipamentos)) return null
  return equipamentos.find(e => {
    if (!e.equipado) return false
    const type = EQUIPMENT_TYPES.find(t => t.id === e.tipoEquip)
    return type?.slot === slotId
  })
}

export function getSkillGrantsForRank(rank) {
  const rarity = getEquipmentRarity(rank)
  if (!rarity) return { activeSkills: 0, passiveSkills: 0 }
  return { activeSkills: rarity.activeSkills, passiveSkills: rarity.passiveSkills }
}

export function getFullSetBonuses(armorTypeId, pieceCount) {
  const armorType = ARMOR_TYPES.find(at => at.id === armorTypeId)
  if (!armorType) return []
  return armorType.bonuses.filter(b => pieceCount >= b.pieces)
}
