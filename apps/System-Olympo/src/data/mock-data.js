export const attributeOrder = ['forca', 'destreza', 'constituicao', 'intelecto', 'aparencia', 'alma'];

export const attributeLabels = {
  forca: 'FOR',
  destreza: 'DES',
  constituicao: 'CON',
  intelecto: 'INT',
  aparencia: 'APA',
  alma: 'AM'
};

export const attributeLore = {
  forca: 'Forca bruta, impacto e dominio corporal.',
  destreza: 'Reflexo, mobilidade, mira e reacoes.',
  constituicao: 'Resistencia, vitalidade e folego de guerra.',
  intelecto: 'Tatica, leitura de sistema e precisao tecnica.',
  aparencia: 'Presenca, influencia e magnetismo social.',
  alma: 'Canal mistico, energia e afinidade sobrenatural.'
};

export const skillCatalog = [
  'Lutar',
  'Bloqueio',
  'Atletismo',
  'Fortitude',
  'Percepcao',
  'Furtividade',
  'Pontaria',
  'Sobrevivencia',
  'Conhecimento',
  'Investigacao',
  'Intimidar',
  'Diplomacia'
];

export const classProfiles = {
  guerreiro: {
    id: 'guerreiro',
    name: 'Guerreiro',
    accent: 'var(--accent-solar)',
    aura: 'solar',
    fantasy: 'Tanque de linha de frente com presenca marcial e dano direto.',
    baseHp: 100,
    hpPerLevel: 8,
    energyBase: 25,
    peBase: 16,
    skills: 6,
    baseDamage: '2d10',
    primaryAttribute: 'forca',
    classNotes: [
      'Vida inicial alta e progressao segura.',
      'Escala muito bem com Constituicao.',
      'Recebe melhor retorno em combate prolongado.'
    ]
  },
  operativo: {
    id: 'operativo',
    name: 'Operativo',
    accent: 'var(--accent-cyan)',
    aura: 'cyber',
    fantasy: 'Mobilidade, reacoes e pressao tecnica em janelas curtas.',
    baseHp: 70,
    hpPerLevel: 6,
    energyBase: 35,
    peBase: 12,
    skills: 8,
    baseDamage: '2d8',
    primaryAttribute: 'destreza',
    classNotes: [
      'Mais pericias e leitura tatica.',
      'Explode com boas escolhas de evolucao.',
      'Pede cuidado para nao inflar reacoes demais.'
    ]
  },
  mistico: {
    id: 'mistico',
    name: 'Mistico',
    accent: 'var(--accent-arcane)',
    aura: 'arcane',
    fantasy: 'Canaliza energia em controle, burst e suporte ritual.',
    baseHp: 50,
    hpPerLevel: 4,
    energyBase: 50,
    peBase: 14,
    skills: 10,
    baseDamage: '2d6',
    primaryAttribute: 'alma',
    classNotes: [
      'Energia folgada e explosao magica.',
      'Precisa proteger o proprio corpo.',
      'Escala com Alma e com boas escolhas de modulo.'
    ]
  }
};

export const triageCatalog = {
  guerreiro: [
    {
      id: 'soldado',
      name: 'Soldado',
      levels: [
        'Iniciativa +5 e movimento extra na primeira rodada.',
        'Critico arma impulso ofensivo para os proximos ataques.',
        'Pode atordoar com gasto de PE.',
        'Recebe 1 ataque adicional em janela curta.',
        'Ignora parte da armadura inimiga.',
        'Arma favorita amplificada no auge da progressao.'
      ]
    },
    {
      id: 'tank',
      name: 'Tank',
      levels: [
        '+5 HP por nivel.',
        '+2 CA em guarda ativa.',
        'Provocacao defensiva para segurar frente.',
        'Resistencia a burst pesado.',
        'Aliados atras de voce recebem cobertura.',
        'Colosso de combate em nivel maximo.'
      ]
    },
    {
      id: 'berserker',
      name: 'Berserker',
      levels: [
        'Acumula furia ao sofrer dano.',
        'Explode carga de furia em golpe reforcado.',
        'Modo ofensivo com custo de PE.',
        'Criticos curam em curta escala.',
        'Ativa automaticamente abaixo de 30% de HP.',
        'Recebe reacoes extras enquanto em frenesi.'
      ]
    }
  ],
  operativo: [
    {
      id: 'fantasma',
      name: 'Fantasma',
      levels: [
        'Reposiciona ao errar sem tomar oportunidade.',
        'Ganha dano apos deslocamento.',
        'Invisibilidade curta.',
        'Ataque de reaparecimento com vantagem.',
        'Reposicionamento de longo alcance.',
        'Reacao defensiva de sumico.'
      ]
    },
    {
      id: 'assassino',
      name: 'Assassino',
      levels: [
        '+1 reacao a cada 15 DES.',
        'Criticos ganham dano perfurante.',
        'Entrada furtiva reforca a primeira ativa.',
        'Marca presa e persegue com bonus.',
        'Abre janelas de execucao.',
        'Finalizacao em cena longa.'
      ]
    },
    {
      id: 'hacker',
      name: 'Hacker',
      levels: [
        'Interage com sistemas e portas.',
        'Debuff tecnico em equipamento rival.',
        'Drone de reconhecimento.',
        'EMP tatico em area.',
        'Cancela a proxima acao de alvo tecnologico.',
        'Hack em cadeia para toda a cena.'
      ]
    }
  ],
  mistico: [
    {
      id: 'tecelao',
      name: 'Tecelao',
      levels: [
        'Adiciona segundo efeito elemental.',
        'Segundo conjuro do turno fica mais barato.',
        'Nucleo de magia amplifica dano.',
        'Dissipa nucleo em explosao.',
        'Tecido caotico soma efeito aleatorio.',
        'Duplica uma habilidade em momento epico.'
      ]
    },
    {
      id: 'arauto',
      name: 'Arauto',
      levels: [
        'Invoca espectro de combate.',
        'Comanda espectro como acao livre.',
        'Espectro explode ao cair.',
        'Pode manter 2 espectros.',
        'Espectro aplica condicao.',
        'Entidade maior 1x por sessao.'
      ]
    },
    {
      id: 'intuitivo',
      name: 'Intuitivo',
      levels: [
        '+50% AM por bloco de 5 niveis.',
        'Recupera energia ao encadear efeitos.',
        'Leitura arcana em tempo real.',
        'Pode dobrar alcance de ativa.',
        'Custo de ritual reduzido.',
        'Pico de canalizacao na revisao final.'
      ]
    }
  ]
};

export const moduleCatalog = [
  {
    id: 'reserva_arcana',
    name: 'Reserva Arcana',
    category: 'Recurso',
    description: '+20 Energia total e pressao mistica mais segura.'
  },
  {
    id: 'conhecimento_amplificado',
    name: 'Conhecimento Amplificado',
    category: 'Arcano',
    description: 'Habilidades medias e fortes recebem burst adicional controlado.'
  },
  {
    id: 'passo_anomalo',
    name: 'Passo Anomalo',
    category: 'Mobilidade',
    description: 'Reposicionamento e defesa reativa em combate.'
  },
  {
    id: 'corpo_resiliente',
    name: 'Corpo Resiliente',
    category: 'Passivo',
    description: '+36 HP passivo e sustentacao em encontros longos.'
  },
  {
    id: 'especialista_em_arma',
    name: 'Especialista em Arma',
    category: 'Combate',
    description: '+2 no dano base quando arma favorita esta equipada.'
  }
];

export const evolutionMilestones = [
  {
    id: 'm4',
    level: 4,
    title: 'Marco 4',
    summary: 'Primeira guinada do esqueleto.',
    rewards: [
      {
        id: 'm4_skeleton',
        title: '+2 pontos de esqueleto',
        description: 'Abre dois pontos livres para redistribuir entre os atributos.',
        skeletonPoints: 2
      },
      {
        id: 'm4_vigor',
        title: 'Vigor consagrado',
        description: '+24 HP passivo sem mexer no esqueleto.',
        passiveHp: 24
      }
    ]
  },
  {
    id: 'm8',
    level: 8,
    title: 'Marco 8',
    summary: 'Escolha entre reforco ofensivo ou reserva.',
    rewards: [
      {
        id: 'm8_energy',
        title: 'Pulso de energia',
        description: '+18 Energia total.',
        energyBonus: 18
      },
      {
        id: 'm8_skeleton',
        title: '+1 ponto de esqueleto e +10 HP',
        description: 'Uma melhora estrutural com impacto em corpo e scaling.',
        skeletonPoints: 1,
        passiveHp: 10
      }
    ]
  },
  {
    id: 'm12',
    level: 12,
    title: 'Marco 12',
    summary: 'Tensao entre defesa constante e tecnica.',
    rewards: [
      {
        id: 'm12_guard',
        title: 'Memoria de ferro',
        description: '+1 reacao e +2 CA.',
        reactionsBonus: 1,
        armorBonus: 2
      },
      {
        id: 'm12_skeleton',
        title: '+2 pontos de esqueleto',
        description: 'Ideal para recalibrar Constituicao e Alma.',
        skeletonPoints: 2
      }
    ]
  },
  {
    id: 'm16',
    level: 16,
    title: 'Marco 16',
    summary: 'Abertura de salto epico.',
    rewards: [
      {
        id: 'm16_hp',
        title: 'Corpo resiliente',
        description: '+48 HP passivo e estabilidade de frente.',
        passiveHp: 48
      },
      {
        id: 'm16_skeleton',
        title: '+2 pontos de esqueleto e +12 Energia',
        description: 'Mais maleabilidade de build.',
        skeletonPoints: 2,
        energyBonus: 12
      }
    ]
  },
  {
    id: 'm20',
    level: 20,
    title: 'Marco 20',
    summary: 'A build assume sua forma madura.',
    rewards: [
      {
        id: 'm20_power',
        title: 'Pressao ofensiva',
        description: '+3 no dano base e +10 PE total.',
        damageBonus: 3,
        peBonus: 10
      },
      {
        id: 'm20_skeleton',
        title: '+3 pontos de esqueleto',
        description: 'Mudanca tardia de chassis para quem quer recalcular tudo.',
        skeletonPoints: 3
      }
    ]
  }
];

export const systemGuideSections = [
  {
    title: 'Faixas de nivel',
    tone: 'solar',
    columns: ['Faixa', 'Niveis', 'Leitura rapida'],
    rows: [
      ['Iniciante', '1-7', 'Base da identidade, pouco modulo, margem baixa de erro.'],
      ['Intermediario', '8-13', 'Primeiras escolhas realmente definem o chassis.'],
      ['Veterano', '14-22', 'Triagens e modulos viram o centro do power budget.'],
      ['Lendario', '23-30', 'Tudo precisa respeitar teto ou a ficha estoura.']
    ]
  },
  {
    title: 'TVP e dano',
    tone: 'arcane',
    columns: ['Regra', 'Limite', 'Leitura'],
    rows: [
      ['TVP de passivos', 'Vida base x 2.5', 'HP por nivel nao entra no teto de passivos.'],
      ['Energia', '+120% da base', 'Acima disso a pressao de recurso some rapido.'],
      ['PE', '+80% da base', 'Evita spam sem custo real em combate.'],
      ['TDH', 'Por faixa de nivel', 'Ativa e ultimate precisam respeitar a janela do tier.']
    ]
  },
  {
    title: 'Marcos de evolucao',
    tone: 'cyan',
    columns: ['Nivel', 'Escolha A', 'Escolha B'],
    rows: evolutionMilestones.map((milestone) => [
      `Nivel ${milestone.level}`,
      milestone.rewards[0].title,
      milestone.rewards[1].title
    ])
  }
];

export function createAbilitySlot(type, index) {
  return {
    id: `${type.toLowerCase().replaceAll(' ', '_')}_${index}`,
    name: type === 'Passiva' ? 'Vestigio inicial' : `Tecnica ${index}`,
    type,
    cost: type === 'Passiva' ? 0 : type === 'Ultimate' ? 40 : 18 + index * 4,
    duration: type === 'Passiva' ? 'Permanente' : '1 rodada',
    range: type === 'Passiva' ? 'Pessoal' : '6m',
    damage: type === 'Passiva' ? '' : type === 'Ultimate' ? '13d12+45' : '4d10+18',
    effect:
      type === 'Passiva'
        ? 'Descreva o efeito passivo central da build.'
        : 'Descreva efeito, gatilho e custo real em linguagem objetiva.'
  };
}

export function createDraftCharacter() {
  return {
    id: null,
    name: 'Novo Forjado',
    player: 'Perfil local',
    classId: 'mistico',
    level: 8,
    triageId: 'tecelao',
    notes: 'Rascunho em forja.',
    arrayAssignments: {
      forca: 10,
      destreza: 12,
      constituicao: 13,
      intelecto: 14,
      aparencia: 8,
      alma: 15
    },
    bonusAssignments: {
      forca: 0,
      destreza: 0,
      constituicao: 0,
      intelecto: 0,
      aparencia: 0,
      alma: 0
    },
    trainedSkills: ['Percepcao', 'Conhecimento', 'Investigacao', 'Diplomacia'],
    moduleIds: ['reserva_arcana'],
    evolutionChoices: {
      m4: 'm4_skeleton',
      m8: 'm8_energy'
    },
    avatar: '',
    abilities: [
      createAbilitySlot('Passiva', 1),
      createAbilitySlot('Ativa Fraca', 1),
      createAbilitySlot('Ativa Media', 2),
      createAbilitySlot('Ativa Forte', 3),
      createAbilitySlot('Ultimate', 4)
    ],
    saveStatus: 'Rascunho local'
  };
}

export const sampleCharacters = [
  {
    id: 1,
    name: 'Asterion Valen',
    player: 'Mesa Atlas',
    classId: 'mistico',
    level: 18,
    triageId: 'tecelao',
    notes: 'Canalizador veterano focado em dano ritual e controle.',
    arrayAssignments: {
      forca: 8,
      destreza: 10,
      constituicao: 13,
      intelecto: 14,
      aparencia: 12,
      alma: 15
    },
    bonusAssignments: {
      forca: 0,
      destreza: 0,
      constituicao: 3,
      intelecto: 2,
      aparencia: 0,
      alma: 3
    },
    trainedSkills: ['Percepcao', 'Conhecimento', 'Investigacao', 'Diplomacia', 'Fortitude'],
    moduleIds: ['reserva_arcana', 'conhecimento_amplificado'],
    evolutionChoices: {
      m4: 'm4_vigor',
      m8: 'm8_energy',
      m12: 'm12_skeleton',
      m16: 'm16_skeleton'
    },
    avatar: '',
    abilities: [
      {
        id: 'passiva_1',
        name: 'Nexo de Aurion',
        type: 'Passiva',
        cost: 0,
        duration: 'Permanente',
        range: 'Pessoal',
        damage: '',
        effect: 'Sempre que conjura uma ativa media ou forte, gera uma camada de foco ate 2.'
      },
      {
        id: 'ativa_fraca_1',
        name: 'Fio Solar',
        type: 'Ativa Fraca',
        cost: 16,
        duration: 'Instantaneo',
        range: '8m',
        damage: '4d10+18',
        effect: 'Disparo linear que marca o alvo para o proximo efeito mistico.'
      },
      {
        id: 'ativa_media_2',
        name: 'Lanca de Aurion',
        type: 'Ativa Media',
        cost: 24,
        duration: 'Instantaneo',
        range: '10m',
        damage: '8d12+38',
        effect: 'Perfura a linha inimiga e reduz defesa magica ate o fim da rodada.'
      },
      {
        id: 'ativa_forte_3',
        name: 'Circulo Partido',
        type: 'Ativa Forte',
        cost: 34,
        duration: '2 rodadas',
        range: 'Area 4m',
        damage: '12d12+50',
        effect: 'Zona de energia quebrada que pressiona quem atravessa.'
      },
      {
        id: 'ultimate_4',
        name: 'Solsticio Partido',
        type: 'Ultimate',
        cost: 48,
        duration: 'Instantaneo',
        range: 'Area 8m',
        damage: '17d12+65',
        effect: 'Explosao de eclipse que consome o campo e derruba a linha de frente.'
      }
    ],
    saveStatus: 'Em revisao'
  },
  {
    id: 2,
    name: 'Kael Dorne',
    player: 'Mesa Eclipse',
    classId: 'operativo',
    level: 13,
    triageId: 'fantasma',
    notes: 'Infiltrador de burst curto e reposicionamento agressivo.',
    arrayAssignments: {
      forca: 10,
      destreza: 15,
      constituicao: 13,
      intelecto: 14,
      aparencia: 8,
      alma: 12
    },
    bonusAssignments: {
      forca: 0,
      destreza: 3,
      constituicao: 1,
      intelecto: 1,
      aparencia: 0,
      alma: 0
    },
    trainedSkills: ['Percepcao', 'Furtividade', 'Pontaria', 'Investigacao', 'Atletismo', 'Conhecimento'],
    moduleIds: ['passo_anomalo', 'especialista_em_arma'],
    evolutionChoices: {
      m4: 'm4_skeleton',
      m8: 'm8_skeleton',
      m12: 'm12_guard'
    },
    avatar: '',
    abilities: [
      {
        id: 'passiva_1',
        name: 'Rastro Nulo',
        type: 'Passiva',
        cost: 0,
        duration: 'Permanente',
        range: 'Pessoal',
        damage: '',
        effect: 'A primeira vez que erra, ganha reposicionamento curto sem oportunidade.'
      },
      {
        id: 'ativa_fraca_1',
        name: 'Golpe do Vazio',
        type: 'Ativa Fraca',
        cost: 14,
        duration: 'Instantaneo',
        range: 'Corpo a corpo',
        damage: '4d10+18',
        effect: 'Corta a guarda e abre flanco por uma janela curta.'
      },
      createAbilitySlot('Ativa Media', 2),
      createAbilitySlot('Ativa Forte', 3),
      createAbilitySlot('Ultimate', 4)
    ],
    saveStatus: 'Aprovado'
  }
];
