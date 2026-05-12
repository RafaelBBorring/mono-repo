import { SPECIAL_MATERIALS, getMaterialArmorBonus, getMaterialDurabilityBonus } from './materials'

export const ARMOR_SLOTS = [
  { id: 'peitoral', label: 'Peitoral', icon: '🛡️', desc: 'Proteção torso e peito' },
  { id: 'elmo', label: 'Elmo', icon: '⛑️', desc: 'Proteção craniana' },
  { id: 'calcas', label: 'Calças', icon: '👖', desc: 'Proteção pernas e quadril' },
  { id: 'botas', label: 'Botas', icon: '👢', desc: 'Proteção pés e tornozelos' },
]

export const ARMOR_WEIGHTS = [
  { id: 'leve', label: 'Leve', armor: 5, speedPenalty: 0, durability: 8, wear: 1, critBonus: 0, desc: 'Mobilidade total, proteção mínima. Sem penalidade.' },
  { id: 'comum', label: 'Comum', armor: 8, speedPenalty: 0, durability: 12, wear: 1, critBonus: 0, desc: 'Equilíbrio entre proteção e mobilidade.' },
  { id: 'pesado', label: 'Pesado', armor: 12, speedPenalty: -2, durability: 18, wear: 2, critBonus: 0, desc: 'Proteção alta. Desgasta 2 de durabilidade por golpe absorvido.' },
]

export const ARMOR_ABSORPTION_SOFT_CAP = 45
export const ARMOR_ABSORPTION_HARD_CAP = 60

export const DURABILITY_RANK_BONUSES = {
  Comum: 0,
  Incomum: 2,
  Raro: 4,
  'Épico': 6,
  Heroico: 8,
  Ancestral: 10,
  'Mítico': 12,
  Transcendente: 16,
}

export const ARMOR_TYPES = [
  {
    id: 'guerreiro',
    label: 'Guerreiro',
    color: 'red',
    colorClass: 'text-red-400',
    bgClass: 'bg-red-400/10',
    borderClass: 'border-red-400/30',
    badgeClass: 'bg-red-400/10 text-red-400 border-red-400/20',
    miniBonus: '+5 em Bloqueio e +2 Durabilidade maxima em pecas Guerreiro equipadas.',
    miniPassive: '1 PE para firmar postura e ignorar o primeiro empurrao ou queda da cena.',
    desc: 'Protecao fisica, durabilidade extra, postura de linha de frente e controle de impacto.',
    bonuses: [
      { pieces: 2, label: 'Postura Firme', bonus: '+8 Vida temporária ao iniciar combate e +4 em Bloqueio', passive: 'Pode gastar 1 PE ao sofrer dano para reduzir 1d6 do impacto.' },
      { pieces: 3, label: 'Linha de Frente', bonus: '+15 Vida temporária ao iniciar combate e +7 em Bloqueio', passive: 'Pode gastar 2 PE ao sofrer dano para reduzir 1d8+2 do impacto. Vantagem em testes contra ser movido.' },
      { pieces: 4, label: 'Bastião', bonus: '+22 Vida temporária ao iniciar combate e +10 em testes contra empurrão/queda', passive: '1x por combate, ao bloquear, a armadura perde 1 de durabilidade a menos. Pode gastar 3 PE para conceder +5 CA a um aliado adjacente por 1 turno.' },
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
    miniBonus: '+5 em Furtividade enquanto ao menos uma peça Furtivo estiver equipada.',
    miniPassive: '1 PE para não gerar ruído em um deslocamento curto.',
    desc: 'Mobilidade silenciosa, ocultação e evasão.',
    bonuses: [
      { pieces: 2, label: 'Sombra Leve', bonus: '+8 em Furtividade', passive: 'Movimento silencioso: não gera ruído ao caminhar. +2m de deslocamento em Furtividade.' },
      { pieces: 3, label: 'Sombra Viva', bonus: '+15 em Furtividade', passive: 'Pode gastar 2 PE para receber Vantagem em uma esquiva até o fim do turno. Ataques surpresa causam +1d6 de dano.' },
      { pieces: 4, label: 'Fantasma Operacional', bonus: '+20 em Furtividade e +8 em Prestidigitação', passive: '1x por cena, após se mover sem ser visto, o próximo teste de Furtividade tem Vantagem. Pode gastar 3 PE para se tornar invisível por 1 turno.' },
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
    miniBonus: '+5 em Tecnologia enquanto ao menos uma peça Tecnológico estiver equipada.',
    miniPassive: '1 PE para identificar a fonte e o tipo de um sinal eletrônico em 15m.',
    desc: 'Sensores, interfaces e contramedidas eletrônicas.',
    bonuses: [
      { pieces: 2, label: 'Interface Básica', bonus: '+8 em Tecnologia', passive: 'Scan passivo: identifica eletrônicos simples em 10m. Vantagem em testes de Tecnologia para hackear.' },
      { pieces: 3, label: 'Interface Neural', bonus: '+15 em Tecnologia', passive: 'Scan passivo: identifica eletrônicos, rastreadores e armadilhas em 15m. Pode gastar 2 PE para desativar um dispositivo simples em 5m.' },
      { pieces: 4, label: 'Nexo Cibernético', bonus: '+20 em Tecnologia e +8 em Investigação', passive: 'Pode gastar 3 PE para desativar interferência, rastreamento ou câmeras em 20m por 1 minuto. Scan detecta entidades eletrônicas em 25m.' },
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
    miniBonus: '+5 em Medicina enquanto ao menos uma peça Médico estiver equipada.',
    miniPassive: '1 PE para estabilizar sangramento leve ou veneno de baixa intensidade sem consumir carga de kit.',
    desc: 'Primeiros socorros, estabilização e suporte de campo.',
    bonuses: [
      { pieces: 2, label: 'Primeiros Socorros', bonus: '+8 em Medicina', passive: 'Curas de item ou equipamento recuperam +1d6 Vida. Testes de Medicina para diagnóstico ganham Vantagem.' },
      { pieces: 3, label: 'Resposta Rápida', bonus: '+15 em Medicina', passive: 'Pode gastar 2 PE para estabilizar um aliado adjacente como ação bônus. Curas recuperam +2d6 Vida. Pode tentar curar aliados em estado de Morrendo (ver Regras de Combate).' },
      { pieces: 4, label: 'Suporte de Trauma', bonus: '+20 em Medicina e +8 em Sobrevivência', passive: 'Curas de item ou equipamento recuperam +3d6 Vida. 2x por cena, pode curar sem usar carga de kit (CD 15 + Nível do alvo / 2). Pode remover 1 condição grave (maldição, fratura, etc.) com teste CD 18.' },
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
    miniBonus: '+5 em testes com explosivos ou arrombamento preparado.',
    miniPassive: '1 PE para reduzir o tempo de preparar uma carga simples pela metade.',
    desc: 'Explosivos, arrombamento, brecha e controle de área.',
    bonuses: [
      { pieces: 2, label: 'Carga Básica', bonus: '+8 em testes com explosivos e arrombamento', passive: 'Pode gastar 1 PE para reduzir tempo de preparo de carga simples pela metade. Granadas ganham +2m de alcance.' },
      { pieces: 3, label: 'Carga Controlada', bonus: '+15 em testes com explosivos e arrombamento', passive: 'Pode gastar 2 PE para reduzir em 1d6 o dano colateral ou aumentar em 1d6 o dano principal de uma explosão. Resistência a explosões próprias: +5.' },
      { pieces: 4, label: 'Brecha Limpa', bonus: '+20 em explosivos e +8 em Tecnologia', passive: '1x por cena, uma carga plantada por você impõe Desvantagem no teste de resistência dos inimigos e Vantagem para aliados. Explosões em área ganham +2m de raio.' },
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
    miniBonus: '+5 em Sobrevivência e Atletismo de travessia.',
    miniPassive: '1 PE para improvisar apoio em escalada, amortecer queda curta ou ignorar terreno ruim por 1 turno.',
    desc: 'Travessia, escalada, sobrevivência e ferramentas de campo.',
    bonuses: [
      { pieces: 2, label: 'Trilheiro', bonus: '+8 em Sobrevivência e Atletismo situacional', passive: 'Identifica trilhas e pegadas em terreno natural. Não sofre penalidade por terreno acidentado.' },
      { pieces: 3, label: 'Kit de Campo', bonus: '+15 em Sobrevivência e Atletismo situacional', passive: 'Pode gastar 1 PE para ignorar terreno difícil por 2 rodadas. Vantagem em testes de Percepção em ambientes naturais.' },
      { pieces: 4, label: 'Operador de Terreno', bonus: '+20 em Sobrevivência e +8 em Percepção', passive: '1x por cena, encontra rota segura sem teste em terreno conhecido. Pode conceder +3 de deslocamento a todos os aliados em terreno natural por 1 cena.' },
    ],
  },
  {
    id: 'opala',
    label: 'Opala',
    color: 'pink',
    colorClass: 'text-pink-400',
    bgClass: 'bg-pink-400/10',
    borderClass: 'border-pink-400/30',
    badgeClass: 'bg-pink-400/10 text-pink-400 border-pink-400/20',
    miniBonus: '+4 em Diplomacia e Liderança enquanto ao menos uma peça Opala estiver equipada.',
    miniPassive: '1 PE para evitar que uma interação social negativa escale para conflito.',
    desc: 'Carisma, persuasão, negociação e influência social.',
    bonuses: [
      { pieces: 2, label: 'Presença Marcante', bonus: '+8 em Diplomacia e Liderança', passive: 'Vantagem em testes de iniciativa em situações sociais. Aliados adjacentes ganham +2 em testes sociais.' },
      { pieces: 3, label: 'Orador Inspirador', bonus: '+15 em Diplomacia e Liderança', passive: 'Pode gastar 2 PE para conceder Vantagem em um teste social de um aliado em até 10m. Inimigos hostis em 5m sofrem -2 em testes de Intimidação.' },
      { pieces: 4, label: 'Influência Suprema', bonus: '+20 em Diplomacia e Liderança', passive: '1x por cena, pode tentar converter um inimigo hostil em neutro (CD 15 + Nível inimigo / 2). Aliados em 10m ganham +5 em todos os testes sociais por 1 cena.' },
    ],
  },
  {
    id: 'feiticaria',
    label: 'Feitiçaria',
    color: 'violet',
    colorClass: 'text-violet-400',
    bgClass: 'bg-violet-400/10',
    borderClass: 'border-violet-400/30',
    badgeClass: 'bg-violet-400/10 text-violet-400 border-violet-400/20',
    miniBonus: '+4 em Arcanismo e Identificação Mágica enquanto ao menos uma peça Feitiçaria estiver equipada.',
    miniPassive: '1 PE para identificar a escola e a potência de um efeito mágico observado.',
    desc: 'Canalização, controle e eficiência de energia mágica.',
    bonuses: [
      { pieces: 2, label: 'Canalizador', bonus: '+8 em Arcanismo', passive: 'Custo de Energia de habilidades mágicas reduzido em 1 (mínimo 1E). Vantagem em testes para identificar itens mágicos.' },
      { pieces: 3, label: 'Arcano Eficiente', bonus: '+15 em Arcanismo e +8 em Identificação Mágica', passive: 'Pode gastar 2 PE para recuperar 15E após conjurar uma habilidade mágica. Dano mágico causado ganha +1d4.' },
      { pieces: 4, label: 'Conduito Arcano', bonus: '+20 em Arcanismo e +8 em AM', passive: '1x por combate, a próxima habilidade mágica não consome Energia. Pode gastar 3 PE para refletir uma habilidade mágica de até 3o círculo (CD do atacante + 5).' },
    ],
  },
  {
    id: 'sobrenatural',
    label: 'Sobrenatural',
    color: 'rose',
    colorClass: 'text-rose-400',
    bgClass: 'bg-rose-400/10',
    borderClass: 'border-rose-400/30',
    badgeClass: 'bg-rose-400/10 text-rose-400 border-rose-400/20',
    miniBonus: '+4 em Resistência contra efeitos sobrenaturais enquanto ao menos uma peça Sobrenatural estiver equipada.',
    miniPassive: '1 PE para resistir a um efeito de medo, dominação ou maldição leve.',
    desc: 'Proteção contra energias espirituais, maldições e influências externas.',
    bonuses: [
      { pieces: 2, label: 'Proteção Espiritual', bonus: '+8 em Resistência contra sobrenatural', passive: 'Vantagem em testes para resistir controle mental. Reduz dano sobrenatural em 3 por turno.' },
      { pieces: 3, label: 'Escudo Anímico', bonus: '+5 Escudo de Energia', passive: 'Pode gastar 2 PE para anular um efeito de maldição de nível 1 ou 2. Escudo de Energia regenera +2 por turno em combate contra inimigos sobrenaturais.' },
      { pieces: 4, label: 'Ancoragem Espiritual', bonus: '+8 Escudo de Energia e +15 em Resistência contra sobrenatural', passive: 'Imune a efeitos de medo e controle de nível 1 ou 2. 1x por cena, pode purificar uma área de 5m de influência sobrenatural por 1 hora.' },
    ],
  },
  {
    id: 'elemental',
    label: 'Elemental',
    color: 'orange',
    colorClass: 'text-orange-400',
    bgClass: 'bg-orange-400/10',
    borderClass: 'border-orange-400/30',
    badgeClass: 'bg-orange-400/10 text-orange-400 border-orange-400/20',
    miniBonus: '+4 em Resistência ao elemento escolhido (fogo, gelo, elétrico ou veneno).',
    miniPassive: '1 PE para absorver metade do dano de um ataque do elemento escolhido, arredondado para cima.',
    desc: 'Resistência elemental, manipulação e conversão de energia natural.',
    bonuses: [
      { pieces: 2, label: 'Resistência Elemental', bonus: '+5 em Resistência ao elemento escolhido', passive: 'Reduz dano do elemento escolhido em 3 por turno. Ataques do elemento causam Desvantagem contra você.' },
      { pieces: 3, label: 'Conduito Elemental', bonus: '+10 em Resistência ao elemento escolhido', passive: 'Pode gastar 2 PE para converter dano recebido do elemento em Energia (50% do dano). Ataques do elemento escolhido causam -25% de dano.' },
      { pieces: 4, label: 'Senhor Elemental', bonus: '+15 em Resistência ao elemento escolhido e +3d6 dano do elemento em ataques', passive: 'Imune a efeitos secundários do elemento escolhido (queimadura, congelamento, etc.). 1x por combate, pode liberar uma explosão do elemento em raio de 5m causando 4d8 de dano (DES CD 16 metade).' },
    ],
  },
  {
    id: 'elementalista',
    label: 'Elementalista',
    color: 'lime',
    colorClass: 'text-lime-400',
    bgClass: 'bg-lime-400/10',
    borderClass: 'border-lime-400/30',
    badgeClass: 'bg-lime-400/10 text-lime-400 border-lime-400/20',
    miniBonus: '+3 em testes de habilidade envolvendo qualquer elemento.',
    miniPassive: '1 PE para mudar o elemento de uma habilidade já preparada para outro disponível.',
    desc: 'Maestria em múltiplos elementos e sinergia entre eles.',
    bonuses: [
      { pieces: 2, label: 'Polielemental', bonus: '+4 em Resistência a todos os elementos', passive: 'Pode escolher o elemento de cada habilidade separadamente. Reduz dano de qualquer elemento em 2.' },
      { pieces: 3, label: 'Fusão Elemental', bonus: '+8 em Resistência a todos os elementos', passive: 'Habilidades com múltiplos elementos ganham +1d6 de dano. Pode gastar 2 PE para combinar dois elementos em um único ataque.' },
      { pieces: 4, label: 'Convergência Primordial', bonus: '+12 em Resistência a todos os elementos', passive: '1x por combate, uma habilidade pode ter dois elementos sem custo extra. Imune a efeitos secundários de todos os elementos. Ataques elementais causam +2d6 de dano.' },
    ],
  },
]

export const EQUIPMENT_RARITIES = [
  {
    rank: 'Comum', armorBonus: 0, activeSkills: 0, passiveSkills: 0,
    critBonus: 0, damageBonus: 0, color: 'gray',
    desc: 'Equipamento básico sem melhorias.',
  },
  {
    rank: 'Incomum', armorBonus: 2, activeSkills: 0, passiveSkills: 0,
    critBonus: 0, damageBonus: 0, color: 'emerald',
    desc: 'Reforço menor. Armadura levemente aumentada.',
  },
  {
    rank: 'Raro', armorBonus: 3, activeSkills: 0, passiveSkills: 0,
    critBonus: 0, damageBonus: 0, color: 'sky',
    desc: 'Reforço de campo. Armadura moderada.',
  },
  {
    rank: 'Épico', armorBonus: 5, activeSkills: 0, passiveSkills: 1,
    critBonus: 0, damageBonus: 0, color: 'purple',
    desc: 'Armadura aumentada e 1 passiva. Proteção significativa.',
  },
  {
    rank: 'Heroico', armorBonus: 6, activeSkills: 1, passiveSkills: 0,
    critBonus: 0, damageBonus: 0, color: 'rose',
    desc: '1 habilidade ativa. Se a peça quebrar, perde armadura e habilidade até reparar.',
  },
  {
    rank: 'Ancestral', armorBonus: 8, activeSkills: 1, passiveSkills: 1,
    critBonus: 0, damageBonus: 0, color: 'amber',
    desc: '1 ativa + 1 passiva. Armadura robusta. Reparo: rank × 10 PO + 1h.',
  },
  {
    rank: 'Mítico', armorBonus: 10, activeSkills: 1, passiveSkills: 1,
    critBonus: 0, damageBonus: 0, color: 'fuchsia',
    desc: '1 ativa + 1 passiva. Armadura de elite.',
  },
  {
    rank: 'Transcendente', armorBonus: 12, activeSkills: 2, passiveSkills: 1,
    critBonus: 0, damageBonus: 0, color: 'cyan',
    desc: '2 ativas + 1 passiva. Reparo: 250 PO + 4h de ferraria especializada.',
  },
]

export const EQUIPMENT_STAT_LABELS = {
  armorBonus: {
    label: 'Armadura',
    icon: '🛡',
    desc: `Absorção de Dano — reduz cada golpe recebido. Soma entre peças até ${ARMOR_ABSORPTION_HARD_CAP}; acima de ${ARMOR_ABSORPTION_SOFT_CAP}, o desgaste por golpe aumenta.`,
    lose: 'Se o equipamento quebrar (Durabilidade 0) ou for removido, perde-se a armadura daquela peça.',
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
  desc: `Cada golpe absorvido consome Durabilidade. Leve e comum perdem 1; pesado perde 2. Acima de ${ARMOR_ABSORPTION_SOFT_CAP} de absorção total, qualquer conjunto perde 2 por golpe.`,
  broken: 'Equipamento quebrado (Durabilidade 0): perde-se armadura e habilidades até reparo.',
  repair: 'Custo de reparo: Raridade × 10 PO. Tempo: 1 hora de trabalho em ferraria.',
  transcendente: 'Transcendente: 250 PO + 4 horas. Exige ferraria especializada.',
}

export const EQUIPMENT_TYPES = [
  { id: 'peitoral_leve', label: 'Peitoral Leve', slot: 'peitoral', weight: 'leve', armorType: null, caBase: 6, penalty: 0, desc: 'Couro fino, tecido reforçado. Leve e ágil.' },
  { id: 'peitoral_comum', label: 'Peitoral Comum', slot: 'peitoral', weight: 'comum', armorType: null, caBase: 10, penalty: 0, desc: 'Cota de malha ou couro endurecido. Equilibrado.' },
  { id: 'peitoral_pesado', label: 'Peitoral Pesado', slot: 'peitoral', weight: 'pesado', armorType: null, caBase: 16, penalty: -3, desc: 'Placas de metal completo. Proteção máxima, mobilidade baixa.' },
  { id: 'elmo_leve', label: 'Elmo Leve', slot: 'elmo', weight: 'leve', armorType: null, caBase: 3, penalty: 0, desc: 'Capacete de couro. Proteção básica craniana.' },
  { id: 'elmo_comum', label: 'Elmo Comum', slot: 'elmo', weight: 'comum', armorType: null, caBase: 5, penalty: 0, desc: 'Elmo de metal reforçado. Boa proteção.' },
  { id: 'elmo_pesado', label: 'Elmo Pesado', slot: 'elmo', weight: 'pesado', armorType: null, caBase: 8, penalty: -1, desc: 'Elmo completo com viseira. Visão limitada, proteção alta.' },
  { id: 'calcas_leve', label: 'Calças Leves', slot: 'calcas', weight: 'leve', armorType: null, caBase: 3, penalty: 0, desc: 'Perneiras de couro flexível. Mobilidade total.' },
  { id: 'calcas_comum', label: 'Calças Comuns', slot: 'calcas', weight: 'comum', armorType: null, caBase: 5, penalty: 0, desc: 'Grevas de malha. Proteção razoável.' },
  { id: 'calcas_pesado', label: 'Calças Pesadas', slot: 'calcas', weight: 'pesado', armorType: null, caBase: 8, penalty: -2, desc: 'Placas articuladas. Alta proteção nas pernas.' },
  { id: 'botas_leve', label: 'Botas Leves', slot: 'botas', weight: 'leve', armorType: null, caBase: 2, penalty: 0, desc: 'Botas de couro. Agilidade e leveza.' },
  { id: 'botas_comum', label: 'Botas Comuns', slot: 'botas', weight: 'comum', armorType: null, caBase: 4, penalty: 0, desc: 'Botas reforçadas com placa de metal.' },
  { id: 'botas_pesado', label: 'Botas Pesadas', slot: 'botas', weight: 'pesado', armorType: null, caBase: 6, penalty: -2, desc: 'Botas de placa pesada. Alta proteção nos pés.' },
  { id: 'acessorio', label: 'Acessório', slot: 'acessorio', weight: null, armorType: null, caBase: 0, penalty: 0, desc: 'Anéis, amuletos, capas. Concedem passivas especiais.' },
  { id: 'utilidade', label: 'Item de Utilidade', slot: null, weight: null, armorType: null, caBase: 0, penalty: 0, desc: 'Escutas, ganchos, tasers, kits. Efeitos situacionais.' },
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

export function getEquipmentArmorValue(item = {}) {
  const type = EQUIPMENT_TYPES.find(t => t.id === item.tipoEquip)
  const rarity = getEquipmentRarity(item.rank)
  if (!type || !rarity) return 0
  const materialBonus = getMaterialArmorBonus(item.materialEspecial)
  return (type.caBase || 0) + (rarity.armorBonus || 0) + materialBonus
}

export function getEquipmentDurabilityMax(item = {}) {
  const type = EQUIPMENT_TYPES.find(t => t.id === item.tipoEquip)
  if (!type?.weight) return 0
  const baseByWeight = { leve: 8, comum: 12, pesado: 18 }
  const rankBonus = DURABILITY_RANK_BONUSES[item.rank] ?? DURABILITY_RANK_BONUSES[getEquipmentRarity(item.rank).rank] ?? 0
  const categoryBonus = item.armorType === 'guerreiro' || item.setId === 'guerreiro' ? 2 : 0
  const materialBonus = getMaterialDurabilityBonus(item.materialEspecial)
  return (baseByWeight[type.weight] || 0) + rankBonus + categoryBonus + materialBonus
}

export function getEquipmentDurabilityCurrent(item = {}) {
  const max = getEquipmentDurabilityMax(item)
  if (!max) return 0
  const raw = item.durabilidadeAtual ?? item.durabilityAtual ?? item.armorAtual
  if (raw === '' || raw == null || Number.isNaN(Number(raw))) return max
  return Math.min(max, Math.max(0, Number(raw)))
}

export function calcEquipStats(equipamentos) {
  if (!Array.isArray(equipamentos)) return { totalArmor: 0, totalArmorRaw: 0, totalArmorMax: 0, totalArmorCap: ARMOR_ABSORPTION_HARD_CAP, totalDurability: 0, totalDurabilityMax: 0, totalCrit: 0, totalDamage: 0, totalSpeedPenalty: 0, activeCategoryBonuses: [], activeSetBonuses: [] }

  let totalArmor = 0
  let totalArmorRaw = 0
  let totalArmorMax = 0
  let totalDurability = 0
  let totalDurabilityMax = 0
  let totalCrit = 0
  let totalDamage = 0
  let totalSpeedPenalty = 0

  const equipped = equipamentos.filter(e => e.equipado && e.categoria === 'Equipamento')
  const setCounts = {}
  equipped.forEach(e => {
    if (e.armorType) {
      setCounts[e.armorType] = (setCounts[e.armorType] || 0) + 1
    }
  })

  for (const eq of equipped) {
    const type = EQUIPMENT_TYPES.find(t => t.id === eq.tipoEquip)
    const rarity = getEquipmentRarity(eq.rank)
    if (!type || !rarity) continue

    const armorMax = getEquipmentArmorValue(eq)
    const durabilityMax = getEquipmentDurabilityMax(eq)
    const durabilityCurrent = getEquipmentDurabilityCurrent(eq)
    const broken = eq.quebrado || (durabilityMax > 0 && durabilityCurrent <= 0)

    totalArmorMax += armorMax
    totalDurabilityMax += durabilityMax
    totalDurability += broken ? 0 : durabilityCurrent
    totalArmorRaw += broken ? 0 : armorMax
    if (!broken) {
      totalCrit += rarity.critBonus || 0
      totalDamage += rarity.damageBonus || 0
      totalSpeedPenalty += type.penalty || 0
    }
  }

  totalArmor = Math.min(totalArmorRaw, ARMOR_ABSORPTION_HARD_CAP)

  const activeCategoryBonuses = []
  const activeSetBonuses = []
  for (const at of ARMOR_TYPES) {
    const count = setCounts[at.id] || 0
    if (count >= 1) {
      activeCategoryBonuses.push({ type: at, count, bonus: at.miniBonus, passive: at.miniPassive })
    }
    if (count >= 2) {
      const applicableBonuses = at.bonuses.filter(b => count >= b.pieces)
      for (const bonus of applicableBonuses) {
        activeSetBonuses.push({ type: at, count, bonus })
      }
    }
  }

  return { totalArmor, totalArmorRaw, totalArmorMax, totalArmorCap: ARMOR_ABSORPTION_HARD_CAP, totalArmorSoftCap: ARMOR_ABSORPTION_SOFT_CAP, totalDurability, totalDurabilityMax, totalCrit, totalDamage, totalSpeedPenalty, activeCategoryBonuses, activeSetBonuses }
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
