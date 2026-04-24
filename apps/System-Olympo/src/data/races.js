export const RACE_CATEGORIES = [
  { id: 'humanoide', label: 'Humanoides', color: 'border-yellow-400/40 bg-yellow-400/5', title: 'text-yellow-400', badge: 'bg-yellow-400/15 text-yellow-400 border-yellow-400/30' },
  { id: 'sobrenatural', label: 'Sobrenaturais', color: 'border-purple-400/40 bg-purple-400/5', title: 'text-purple-400', badge: 'bg-purple-400/15 text-purple-400 border-purple-400/30' },
  { id: 'predatoria', label: 'Predatórias', color: 'border-red-400/40 bg-red-400/5', title: 'text-red-400', badge: 'bg-red-400/15 text-red-400 border-red-400/30' },
  { id: 'lendaria', label: 'Lendárias', color: 'border-amber-300/40 bg-amber-300/5', title: 'text-amber-300', badge: 'bg-amber-300/15 text-amber-300 border-amber-300/30' },
]

export const RACES = {
  HUMANO: {
    id: 'HUMANO',
    name: 'Humano',
    category: 'humanoide',
    icon: '🟡',
    quote: '"A raça que não deveria estar viva, mas está."',
    desc: 'Os humanos são a raça mais versátil e adaptável do mundo. Sem poderes inatos, compensam com determinação, inteligência e capacidade de improvisação.',
    layer0: {
      attrBonus: {},
      hpMod: 0,
      tracoAtivo: null,
      tracoPassivo: null,
    },
    vantagens: [
      'Nenhuma restrição de classe ou triagem',
      'Pode aprender qualquer perícia com eficiência',
      'Sem fraquezas narrativas',
    ],
    desvantagens: [
      'Sem bônus naturais de poder',
      'Expectativa de vida mortal',
    ],
    progressao: [
      { nivel: 1, ganho: '+1 Perícia', desc: 'Adaptabilidade instintiva' },
      { nivel: 5, ganho: '+1 Perícia', desc: 'Experiência em combate' },
      { nivel: 10, ganho: '+1 Módulo', desc: 'Aperfeiçoamento contínuo' },
      { nivel: 15, ganho: '+1 Perícia', desc: 'Conhecimento consolidado' },
      { nivel: 20, ganho: '+1 Módulo + +1 Atributo', desc: 'Pico humano' },
      { nivel: 25, ganho: '+2 Perícias', desc: 'Mestria' },
      { nivel: 30, ganho: 'Lenda Humana', desc: 'Torna-se praticamente imortal narrativamente' },
    ],
    dificuldade: 1,
  },

  HUMANO_APRIMORADO: {
    id: 'HUMANO_APRIMORADO',
    name: 'Humano Aprimorado',
    category: 'humanoide',
    icon: '🟢',
    quote: '"Mais do que humano. Menos que deus."',
    desc: 'Um humano potencializado através de tecnologia, genética ou magia. Não é exatamente humano, mas carrega a determinação humana em corpo aprimorado.',
    layer0: {
      attrBonus: { escolher: true, escolherQtd: 1 },
      hpMod: 15,
      tracoAtivo: { nome: 'Otimização Adaptativa', desc: '1× por combate, pode rolar novamente um teste crítico (sem PE)' },
      tracoPassivo: { nome: 'Recuperação Acelerada', desc: 'Recupera +50% em descanso' },
    },
    vantagens: [
      'Imunidade a aprimoramentos menores',
      'Pode usar artefatos com menos treinamento',
      'Resistência física aumentada',
    ],
    desvantagens: [
      'Rejeição Mágica: -2 em testes contra magia',
      'Incompatibilidade Ritual: Não pode participar de certos rituais antigos',
    ],
    progressao: [
      { nivel: 1, ganho: 'Otimização Ativa', desc: 'Usa traço inato' },
      { nivel: 8, ganho: '+1 Atributo', desc: 'Sincronização corporal aprimorada' },
      { nivel: 12, ganho: 'Capacidade Extra', desc: 'Escolhe 1 capacidade extra (narrativa)' },
      { nivel: 16, ganho: 'Flexibilidade', desc: 'Pode trocar qual atributo recebeu bônus inicial' },
      { nivel: 20, ganho: '+1 Modificador', desc: 'Refinamento total' },
      { nivel: 24, ganho: 'Transcendência', desc: 'Recuperação sobe para +100%' },
      { nivel: 30, ganho: 'Ascensão Artificial', desc: '+2 em modificadores' },
    ],
    dificuldade: 1,
  },

  ELFO: {
    id: 'ELFO',
    name: 'Elfo',
    category: 'humanoide',
    icon: '🔵',
    quote: '"Velhos demais para lutar, mas muito jovens para morrer."',
    desc: 'Antigos habitantes deste mundo. Elegantes, mágicos, mas frágeis. Não competem em força bruta, mas em graça, sabedoria e magia. Podem ter vivido milênios.',
    layer0: {
      attrBonus: { DES: 3, AM: 2, CON: -2 },
      hpMod: -20,
      tracoAtivo: { nome: 'Transe Onírico', desc: 'Descansa completamente em 4 horas em vez de 8' },
      tracoPassivo: { nome: 'Sentidos Élficos', desc: 'Vantagem permanente em Percepção (audição/visão)' },
    },
    vantagens: [
      'Detecta magia em raio de 30m passivamente',
      'Visão noturna perfeita até 60m',
      '+2 automático em perícias de magia',
      'Imunidade a sono mágico',
      'Envelhece 1/4 da velocidade humana',
    ],
    desvantagens: [
      'Fragilidade Constitucional: -2 em testes de CON para resistir dano',
      'Aversão ao Ferro Quente: Incômodo narrativo',
      'Obrigação Solar: Necessita exposição solar regular',
    ],
    progressao: [
      { nivel: 1, ganho: 'Transe Ativo', desc: 'Repouso em 4 horas' },
      { nivel: 3, ganho: 'Memória Ancestral', desc: 'Escolhe 1 perícia para +3 permanente' },
      { nivel: 6, ganho: 'Conexão Mágica', desc: 'AM regenera +1 por turno fora de combate' },
      { nivel: 10, ganho: 'Visão Mística', desc: 'Enxerga auras mágicas' },
      { nivel: 15, ganho: 'Magia Nativa Aprofundada', desc: '+2 em magia (total +4)' },
      { nivel: 20, ganho: 'Sabedoria Primal', desc: 'Escolhe 1 conhecimento esquecido (narrativa)' },
      { nivel: 25, ganho: 'Forma Etérea Menor', desc: '1× por descanso, invisível por 1 rodada' },
      { nivel: 30, ganho: 'Ascensão Élfica', desc: 'Imortalidade, +1 em todos os testes mágicos' },
    ],
    dificuldade: 1,
  },

  BRUXA: {
    id: 'BRUXA',
    name: 'Bruxa',
    category: 'sobrenatural',
    icon: '🟣',
    quote: '"Quando a terra fala, nós ouvimos."',
    desc: 'Abençoada diretamente por Gaia. Não escolheu ser bruxa — nasceu assim. Realiza rituais de poder imenso, maldições que ecoam através de gerações.',
    layer0: {
      attrBonus: { AM: 4, FOR: -2 },
      hpMod: 5,
      tracoAtivo: { nome: 'Ritual de Poder', desc: 'Rituais custam -50% tempo e -50% componentes' },
      tracoPassivo: { nome: 'Comunidade de Gaia', desc: 'Pode comunicar com animais selvagens' },
    },
    vantagens: [
      'Detecta presença mágica a 1km',
      'Comunicação com plantas: Sabe se há água/perigo próximo',
      'Maldições aplicadas têm +1 em potência',
      'Regeneração lenta: 1 HP por hora em contato com terra',
      'Imunidade a veneno natural',
    ],
    desvantagens: [
      'Dependência de Componentes: Sem componentes, -4 em magias',
      'Aversão ao Ferro: Ferro quente reduz capacidade em -1',
      'Obrigação Ambiental: Não pode destruir natureza (perde poder)',
      'Frenesi de Primavera: Precisa de descanso com natureza',
    ],
    progressao: [
      { nivel: 1, ganho: 'Bênção Gaia', desc: 'Ritual ativo' },
      { nivel: 4, ganho: 'Feitiço Marca', desc: 'Aprender feitiço inicial extra' },
      { nivel: 8, ganho: 'Maldição Menor', desc: 'Pode amaldiçoar (narrativa)' },
      { nivel: 12, ganho: 'Elementalista', desc: 'Afinidade com 1 elemento (+1 dano)' },
      { nivel: 16, ganho: 'Ritualista Perfeita', desc: 'Rituais agora -75% tempo' },
      { nivel: 20, ganho: 'Invocação', desc: 'Convocar companheiro animal espiritual (1×/descanso)' },
      { nivel: 24, ganho: '+1 AM Permanente', desc: 'Aura mágica amplificada' },
      { nivel: 28, ganho: 'Avatar de Gaia', desc: 'Acesso a rituais de poder supremo' },
      { nivel: 30, ganho: 'Lenda Verde', desc: 'Considerada semidivina da natureza' },
    ],
    dificuldade: 2,
  },

  MAGO: {
    id: 'MAGO',
    name: 'Mago',
    category: 'sobrenatural',
    icon: '🔮',
    quote: '"Todo poder vem do conhecimento."',
    desc: 'A magia é uma ciência. Livros, fórmulas, componentes, foco de poder. Sem foco, é fraco. Com foco, é devastador.',
    layer0: {
      attrBonus: { AM: 3, INT: 2, CON: -2 },
      hpMod: -25,
      tracoAtivo: { nome: 'Foco Mágico', desc: 'Com foco: +3 magia. Sem foco: -3 magia' },
      tracoPassivo: { nome: 'Análise Arcana', desc: 'Identifica magia com sucesso automático' },
    },
    vantagens: [
      'Conhece 1 feitiço adicional por tier',
      'Reação Arcana: Pode negar magia de ataque gastando 3 PE (1×/turno)',
      'Biblioteca: Acesso a conhecimentos mágicos antigos',
      'Resistência: Tipo de magia escolhida recebe -1 dano',
    ],
    desvantagens: [
      'Dependência Total de Foco: Sem foco, magia praticamente não funciona',
      'Quebra de Concentração: Dano interrompe concentração',
      'Fraqueza Física: -2 em testes de FOR e CON',
      'Aversão a Improviso: Sem tempo para preparar, -2 em magia rápida',
    ],
    progressao: [
      { nivel: 1, ganho: 'Foco Ativo', desc: 'Magia funciona com foco' },
      { nivel: 3, ganho: 'Esfera de Magia', desc: 'Escolhe 1 esfera especializada' },
      { nivel: 7, ganho: 'Feitiço Aprofundado', desc: '1 feitiço ganha +1d8 dano' },
      { nivel: 11, ganho: 'Escudo de Mana', desc: 'Absorve 15×INT de dano mágico (1×/combate)' },
      { nivel: 15, ganho: 'Segunda Esfera', desc: 'Especialização em 2ª esfera' },
      { nivel: 19, ganho: 'Reação Arcana Aprimorada', desc: 'Custa 1 PE apenas' },
      { nivel: 23, ganho: 'Transmutação', desc: 'Pode alterar propriedade de objeto' },
      { nivel: 27, ganho: '+2 AM Permanente', desc: 'Poder arcano amplificado' },
      { nivel: 30, ganho: 'Archimago', desc: 'Conhece todos os feitiços de suas esferas' },
    ],
    dificuldade: 2,
  },

  FEITICEIRO: {
    id: 'FEITICEIRO',
    name: 'Feiticeiro',
    category: 'sobrenatural',
    icon: '⚡',
    quote: '"Meu poder é minha identidade."',
    desc: 'Nasceu com 1 dom inato. Não escolheu. Essa magia é parte dele, evolui com ele, reflete sua alma. Mais especialista que mago, mas menos flexível.',
    layer0: {
      attrBonus: { AM: 2, escolher: true, escolherQtd: 1, escolherLabel: 'atributo relacionado ao dom' },
      hpMod: 20,
      tracoAtivo: { nome: 'Dom Inato', desc: 'Nasceu com 1 dom, pode usar sem treino' },
      tracoPassivo: { nome: 'Especialista Puro', desc: 'Dom recebe +1 em efetividade a cada 3 níveis' },
    },
    vantagens: [
      'Não precisa de componentes para seu dom',
      'Dom nunca falha (sucesso automático em testes simples)',
      'Pode aprender mutações do dom rapidamente',
      'Regeneração: Recupera 1 PE por turno se usar dom',
      'Sinergia: Dom se torna mais forte com perícias relacionadas',
    ],
    desvantagens: [
      'Especialista Extremo: Tem APENAS 1 dom, não pode aprender outros',
      'Sem Flexibilidade: -2 em TUDO fora de seu dom',
      'Foco Obsessivo: Precisa usar dom regularmente ou sofre inquietação',
      'Loucura Temática: Pode desenvolver obsessão pelo seu dom',
    ],
    progressao: [
      { nivel: 1, ganho: 'Dom Ativo', desc: 'Usa dom inato' },
      { nivel: 3, ganho: 'Evolução Dom N1', desc: 'Dom melhora, +1 dano/efetividade' },
      { nivel: 6, ganho: 'Evolução Dom N2', desc: 'Dom melhora novamente' },
      { nivel: 9, ganho: 'Mutação Dom +1', desc: 'Dom ganha 1 novo efeito/variação' },
      { nivel: 12, ganho: 'Evolução Dom N3', desc: 'Dom melhora novamente' },
      { nivel: 15, ganho: 'Mutação Dom +2', desc: 'Dom ganha 1 novo efeito extra' },
      { nivel: 18, ganho: 'Evolução Dom N4', desc: 'Dom é praticamente divino' },
      { nivel: 21, ganho: 'Forma Perfeita', desc: 'Dom atinge máximo (+3 em tudo)' },
      { nivel: 24, ganho: 'Mutação Dom +3', desc: 'Dom ganha transformação final' },
      { nivel: 27, ganho: '+2 AM Permanente', desc: 'Poder amplificado' },
      { nivel: 30, ganho: 'Transcendência', desc: 'Dom é praticamente magia de deus' },
    ],
    dificuldade: 3,
  },

  VAMPIRO: {
    id: 'VAMPIRO',
    name: 'Vampiro',
    category: 'predatoria',
    icon: '🩸',
    quote: '"Cada noite, somos mais fortes. Cada vida consumida, mais antigos."',
    desc: 'Imortal e maldito. Começa fraco (jovem), mas cresce continuamente. A cada século, torna-se exponencialmente mais poderoso. Suas fraquezas são severas, mas sua progressão é inevitável.',
    layer0: {
      attrBonus: { DES: 2, FOR: 2, CON: -3 },
      hpMod: 40,
      tracoAtivo: { nome: 'Regeneração Contínua', desc: 'Regenera 4×modCON HP por turno (fora de combate: 2/turno)' },
      tracoPassivo: { nome: 'Força Noturna', desc: '+1 em TODOS testes durante a noite' },
    },
    vantagens: [
      'Absorção de Sangue: Beber sangue cura 2d10 + recupera 5 PE',
      'Imortalidade: Não envelhece, não fica doente',
      'Transformação de Morcego: Viaja de noite rapidamente',
      'Sentido de Sangue: Detecta sangue vivo em 1km',
      'Sedução: +1 em testes sociais noturnos',
    ],
    desvantagens: [
      'Fraqueza Solar CRÍTICA: Luz solar direta causa 3d6 dano/turno',
      'Necessidade Biológica: Precisa beber sangue a cada semana ou entra em frenesi',
      'Repouso Obrigatório: Descansar em caixão com terra nativa',
      'Água Corrente: Não pode cruzar rios sem ritual',
      'Frenesi Descontrolado: Se sangue baixo, pode atacar aliados',
    ],
    progressao: [
      { nivel: 1, ganho: 'Regeneração Base', desc: 'Ativo' },
      { nivel: 5, ganho: 'Transformação Morcego', desc: 'Pode voar' },
      { nivel: 10, ganho: 'Regeneração Dobrada', desc: '8×modCON' },
      { nivel: 15, ganho: '+1 FOR Adicional', desc: 'Força amplificada' },
      { nivel: 20, ganho: 'Absorção Perfeita', desc: '3d10 + 10 PE' },
      { nivel: 25, ganho: 'Forma Neblina', desc: 'Pode se transformar em neblina' },
      { nivel: 30, ganho: 'Imortalidade Completa', desc: 'Imune a envelhecimento' },
    ],
    progressaoIdade: [
      { idade: '20 anos', ganho: 'Recém-virado', efeito: '+0 bônus' },
      { idade: '50 anos', ganho: 'Iniciado', efeito: '+1 FOR permanente' },
      { idade: '100 anos', ganho: 'Experiente', efeito: '+1 DES permanente, +1 ataque' },
      { idade: '200 anos', ganho: 'Antigo', efeito: '+1 testes mentais, domina 1 vassalo' },
      { idade: '300 anos', ganho: 'Metusalém', efeito: '+1 AM permanente, rituais -50%' },
      { idade: '500 anos', ganho: 'Príncipe', efeito: '+2 em TODOS testes, regeneração dobra' },
      { idade: '800 anos', ganho: 'Lendário', efeito: '+2 DES adicional, domina clã' },
      { idade: '1000+', ganho: 'Ancestral', efeito: 'Imortal, escolhe 1 poder ancestral' },
      { idade: '5000+', ganho: 'Entidade', efeito: 'Deus menor' },
    ],
    dificuldade: 4,
  },

  LOBISOMEM: {
    id: 'LOBISOMEM',
    name: 'Lobisomem',
    category: 'predatoria',
    icon: '🐺',
    quote: '"Duas naturezas. Uma alma."',
    desc: 'Maldição ou dom da lua. Força brutal em forma lupina, inteligência em forma humana. Nascido para ser soldado, liderar matilha, caçar. Mas é preso entre dois mundos.',
    layer0: {
      attrBonus: { FOR: 3, DES: 2, INT: -1 },
      hpMod: 35,
      tracoAtivo: { nome: 'Transformação Parcial', desc: 'Gasta 4 PE para ficar entre formas (+2 FOR, +1 DES, garras 1d8, 4 rodadas)' },
      tracoPassivo: { nome: 'Regeneração Menor', desc: 'Regenera 2×modCON HP por turno fora de combate' },
    },
    vantagens: [
      'Sentido de Presa: Detecta sangue vivo em 1km',
      'Transformação Completa (Lua Cheia): FOR +5, vida dobra, garras 2d10',
      'Forma Lupina Permanente: Pode permanecer como lobo',
      'Matilha: Pode formar grupo, +1 em testes em grupo',
      'Regeneração: Cicatrizes desaparecem em dias',
    ],
    desvantagens: [
      'Prata CRÍTICA: Prata causa 2× dano, anula regeneração',
      'Frenesi: Se vê sangue de aliado, teste CON 18 ou ataca',
      'Controle Difícil: Primeira transformação requer teste',
      'Maldição Lunar: Lua cheia força transformação involuntária',
      'Rastreável: Deixa pegadas, pode ser seguido',
    ],
    progressao: [
      { nivel: 1, ganho: 'Transformação Parcial', desc: 'Ativo' },
      { nivel: 5, ganho: 'Controle Aprimorado', desc: 'Custa 2 PE' },
      { nivel: 10, ganho: 'Beta', desc: 'Pode formar matilha' },
      { nivel: 15, ganho: 'Transformação Completa', desc: 'Forma lobo gigante' },
      { nivel: 20, ganho: 'Alfa', desc: 'Lidera matilha, ganham +2' },
      { nivel: 25, ganho: 'Ancestral', desc: 'Transformação sem custo' },
      { nivel: 30, ganho: 'Primogênito', desc: 'Regeneração 3×modCON' },
    ],
    dificuldade: 3,
  },

  DEMONIO: {
    id: 'DEMONIO',
    name: 'Demônio',
    category: 'lendaria',
    icon: '👹',
    quote: '"Quando as correntes caem, chegamos ao céu infernal."',
    desc: 'Criatura infernal antiga. Servem Hades ou evoluem para libertação. Começam fracas, mas se libertadas, tornam-se supremas. Cada morte em combate fortalece.',
    layer0: {
      attrBonus: { AM: 2, escolher: true, escolherQtd: 1, escolherLabel: 'FOR ou DES' },
      hpMod: 45,
      tracoAtivo: { nome: 'Aura Amaldiçoada', desc: 'Inimigos a 5m sofrem -1 em todos os testes' },
      tracoPassivo: { nome: 'Regeneração Amaldiçoada', desc: 'Regenera 3×modCON HP por turno' },
    },
    vantagens: [
      'Resistência Elemental: 50% redução em dano do elemento escolhido',
      'Resistência ao Fogo: Automática',
      'Adaptação: A cada 5 níveis, ganha 1 resistência adicional',
      'Evolução por Morte: +0.1 em 1 atributo por morte (máx 10/atributo)',
      'Poder crescente com liberdade',
    ],
    desvantagens: [
      'Água Benta CRÍTICA: 2× dano, queima constantemente',
      'Correntes de Hades: Se aprisionado, -5 em TUDO',
      'Sujeição: Se mestre/Hades vivo, deve obedecer',
      'Aversão ao Sagrado: Objetos sagrados causam desconforto',
    ],
    progressao: [
      { nivel: 1, ganho: 'Aura Ativa', desc: '-1 inimigos próximos' },
      { nivel: 5, ganho: 'Razão Despertada', desc: 'Ganha inteligência genuína' },
      { nivel: 10, ganho: 'Evoluído', desc: '+1 atributo permanente' },
      { nivel: 15, ganho: 'Ascensão', desc: 'Deixa Hades parcialmente, +1 PE/turno' },
      { nivel: 20, ganho: 'Liberto', desc: 'Totalmente livre, +2 em tudo' },
      { nivel: 25, ganho: 'Senhor Círculo', desc: 'Rege 1 círculo infernal' },
      { nivel: 30, ganho: 'Imperador', desc: 'Controla círculo inteiro' },
    ],
    bonusMorte: [
      { mortes: 10, ganho: '+1 em 1 atributo' },
      { mortes: 20, ganho: '+1 em 2 atributos' },
      { mortes: 50, ganho: '1 habilidade especial única' },
      { mortes: 100, ganho: 'Ascende para Overlord (praticamente divino)' },
    ],
    dificuldade: 4,
  },

  DASARIANO: {
    id: 'DASARIANO',
    name: 'Dasariano',
    category: 'lendaria',
    icon: '🧬',
    quote: '"Três formas. Uma vontade."',
    desc: 'Raça primordial. Humanoides que podem transformar em forma animal ou híbrida. Três expressões: Humano (diplomacia), Híbrido (combate), Besta Primordial (poder absoluto).',
    layer0: {
      attrBonus: {},
      hpMod: 25,
      tracoAtivo: { nome: 'Mudança de Forma', desc: 'Muda forma gratuitamente como ação' },
      tracoPassivo: { nome: 'Instinto Predador', desc: 'Vantagem em Percepção' },
    },
    formas: [
      { nome: 'Forma Humana', attrBonus: {}, hpExtra: 0, desc: 'Pode se disfarçar, diplomacia' },
      { nome: 'Forma Híbrida (Beta)', attrBonus: { FOR: 2, DES: 1 }, hpExtra: 15, garras: '1d8', desc: 'Equilibrada, combate rápido' },
      { nome: 'Forma Primordial (Alfa)', attrBonus: { FOR: 5, DES: 2, INT: -3 }, hpExtra: 35, garras: '2d10', desc: 'Poder absoluto, mas irracional' },
    ],
    vantagens: [
      'Mudança de forma gratuita como ação',
      'Instinto Predador: Vantagem em Percepção',
      'Versatilidade entre formas',
    ],
    desvantagens: [
      'Forma Primordial reduz INT drasticamente',
      'Risco narrativo de perder humanidade',
      'Formas podem assustar NPCs',
    ],
    progressao: [
      { nivel: 1, ganho: 'Mudança Forma', desc: 'Ativo' },
      { nivel: 7, ganho: 'Fusão', desc: 'Customiza formas (+1 FOR em Beta ou +1 DES em Primal)' },
      { nivel: 14, ganho: 'Aperfeiçoamento', desc: '+1 HP em todas as formas' },
      { nivel: 21, ganho: 'Forma Perfeita', desc: 'Cria 4ª forma balanceada (+2 FOR, +2 DES)' },
      { nivel: 28, ganho: 'Primal Ancestral', desc: 'Forma Primordial quase divina' },
      { nivel: 30, ganho: 'Unificação', desc: 'Pode mesclar formas, ganho total' },
    ],
    dificuldade: 2,
  },

  FINGER: {
    id: 'FINGER',
    name: 'Finger',
    category: 'lendaria',
    icon: '🔫',
    quote: '"Somos a arma que escolheu seu portador."',
    desc: 'Entidade parasita dimensional. Reside em arma. Não evolui com idade, mas com a arma. Quanto mais forte a arma, mais poder. Raro e extremamente poderoso desde o início.',
    layer0: {
      attrBonus: {},
      hpMod: 0,
      hpLabel: 'Variável conforme arma',
      tracoAtivo: { nome: 'Incorporação', desc: 'Habita corpo ou arma, não mescla' },
      tracoPassivo: { nome: 'Imortalidade Parasita', desc: 'Não morre enquanto arma existir' },
    },
    vantagens: [
      'Evolução de Arma: Arma ganha +1 bônus a cada 5 níveis',
      'Habilidades Roubadas: Finger rouba habilidades de inimigos',
      'Poder Parasita: MUITO mais forte que humano sozinho',
      'Materialização Parcial: Corpo energético (1 rodada, 10 PE)',
      'Sinergia com Portador: Se portador é forte, Finger é mais forte',
    ],
    desvantagens: [
      'Preso à Arma: Se arma é destruída, Finger morre',
      'Vulnerabilidade Sagrada: Armas sagradas causam 2× dano',
      'Risco de Dominação: Portador pode tentar dominar Finger',
      'Conflito Narrativo: Finger quer dominar, criando tensão',
    ],
    progressao: [
      { nivel: 1, ganho: 'Incorporação', desc: 'Habita arma' },
      { nivel: 5, ganho: 'Arma Evoluída', desc: '+1 dano permanente' },
      { nivel: 10, ganho: 'Habilidade Roubada', desc: 'Arma ganha 1 habilidade especial' },
      { nivel: 15, ganho: 'Overlord Parcial', desc: 'Pode materializar por 1 rodada' },
      { nivel: 20, ganho: 'Poder Crescente', desc: '+2 dano permanente' },
      { nivel: 25, ganho: 'Habilidade Extra', desc: 'Arma ganha 2ª habilidade' },
      { nivel: 30, ganho: 'Verdadeiro Overlord', desc: 'Arma praticamente imortal' },
    ],
    dificuldade: 4,
  },

  SEMIDEUS: {
    id: 'SEMIDEUS',
    name: 'Semideus',
    category: 'lendaria',
    icon: '⚡',
    quote: '"O sangue divino nos marca. Nada pode mudar isso."',
    desc: 'Filho de deus. Herança divina corre em sangue. Começa extremamente poderoso. Crescimento lento mas constante. Um Semideus N30 é praticamente uma entidade divina.',
    layer0: {
      attrBonus: {},
      hpMod: 50,
      tracoAtivo: { nome: 'Herança Divina', desc: 'Varia conforme o deus pai' },
      tracoPassivo: { nome: 'Presença Divina', desc: 'Aura que causa respeito, +1 em teste social' },
      requiresDeus: true,
    },
    deuses: [
      { id: 'ZEUS', name: 'Zeus', attr: { FOR: 3, DES: 2, INT: 2 }, traco: 'Raio Inato (dano 2d8)', especial: 'Comando natural, aliados +1' },
      { id: 'POSEIDON', name: 'Poseidon', attr: { DES: 3, FOR: 2, CON: 2 }, traco: 'Controle da Água', especial: 'Respiração aquática, invoca ondas' },
      { id: 'ATENA', name: 'Atena', attr: { INT: 3, DES: 2, CON: 2 }, traco: 'Visão Tática', especial: 'Estratégia +2, inimigos -1 movimento' },
      { id: 'ARES', name: 'Ares', attr: { FOR: 3, DES: 3, INT: -1 }, traco: 'Combate Extremo', especial: '+2 dano, crítico em 19-20' },
      { id: 'ARTEMIS', name: 'Artemis', attr: { DES: 3, INT: 2, AM: 2 }, traco: 'Rastreamento', especial: 'Vê presas em 5km, crítico automático' },
      { id: 'APOLLO', name: 'Apollo', attr: { AM: 3, INT: 2, FOR: 2 }, traco: 'Cura Solar', especial: 'Cura 3d6 1×/dia, luz radiante' },
      { id: 'AFRODITE', name: 'Afrodite', attr: { APA: 3, AM: 2, DES: 2 }, traco: 'Sedução', especial: '+3 teste social, alvo fica lento' },
      { id: 'HADES', name: 'Hades', attr: { AM: 3, FOR: 2, CON: 2 }, traco: 'Medo Mortal', especial: 'Inimigos assustam, necromancia +1' },
    ],
    vantagens: [
      'Imunidade a doença',
      'Não envelhece normalmente',
      'Resistência a magia: -1 em testes mágicos contra',
      'Poder do Deus Pai: Específico por linhagem',
    ],
    desvantagens: [
      'Fraqueza Divina: Herda fraquezas do pai',
      'Arrogância: -2 em testes sociais com semideuses de outro deus',
      'Alvo: Inimigos do deus pai também o veem como alvo',
    ],
    progressao: [
      { nivel: 1, ganho: 'Herança Divina', desc: 'Poder do deus pai ativo' },
      { nivel: 10, ganho: 'Domínio +1', desc: 'Poder herança melhora (+1 dano/efetividade)' },
      { nivel: 20, ganho: 'Domínio +2', desc: 'Pode usar poder herança 2× por dia' },
      { nivel: 30, ganho: 'Ascensão Divina', desc: 'Pode desafiar próprio deus pai' },
    ],
    dificuldade: 5,
  },

  HUMANO_MISTICO: {
    id: 'HUMANO_MISTICO',
    name: 'Humano Místico (Guardião)',
    category: 'lendaria',
    icon: '🌟',
    quote: '"Quando a mãe da terra chama, alguém deve responder."',
    desc: 'Raro. Um por geração. Escolhido por Gaia para ser Guardião. Começa fraco, mas escalona diferente — aprende TUDO. Em late game, é praticamente um deus.',
    layer0: {
      attrBonus: { AM: 1 },
      hpMod: 10,
      tracoAtivo: { nome: 'Sincronia Mágica', desc: 'Pode aprender Triagem Principal E Sub-Triagem ao mesmo tempo' },
      tracoPassivo: { nome: 'Sensibilidade ao Véu', desc: 'Detecta rupturas dimensionais, magia antiga' },
    },
    vantagens: [
      'Aprende qualquer magia/dom com eficiência',
      'Evolução XP +75% para habilidades mágicas',
      'Pode usar rituais de qualquer origem',
      'Resistência Dimensional: -1 dano de magia',
      'Detecta criaturas do Abismo',
    ],
    desvantagens: [
      'Raro Demais: Praticamente único, alvo constante',
      'Peso Narrativo: Esperado ser herói, pressão social',
      'Missão Divina: Pode ser forçado a cumprir missão por Gaia',
      'Isolamento: Ninguém realmente entende',
    ],
    progressao: [
      { nivel: 1, ganho: 'Sincronia Básica', desc: 'Começa fraco' },
      { nivel: 10, ganho: 'Primeira Sincronia', desc: 'Triagem Principal + Sub funcionam juntas' },
      { nivel: 15, ganho: 'Domínio Duplo', desc: 'Ambas triagens +1' },
      { nivel: 20, ganho: 'Conhecimento Ancestral', desc: 'Acesso a rituais perdidos' },
      { nivel: 25, ganho: 'Poder Crescente', desc: '+1 AM permanente' },
      { nivel: 30, ganho: 'Ascensão Guardião', desc: 'Acesso a poderes de Guardião Supremo' },
    ],
    dificuldade: 1,
  },
}

export function getRacaById(id) {
  return RACES[id] || null
}

export function getRacasByCategory(categoryId) {
  return Object.values(RACES).filter(r => r.category === categoryId)
}

export function getAttrBonusText(raca) {
  if (!raca.layer0?.attrBonus) return 'Nenhum'
  const bonus = raca.layer0.attrBonus
  if (bonus.escolher) {
    const parts = []
    Object.entries(bonus).forEach(([k, v]) => {
      if (k === 'escolher' || k === 'escolherQtd' || k === 'escolherLabel') return
      if (typeof v === 'number') parts.push(`${v >= 0 ? '+' : ''}${v} ${k}`)
    })
    const escolherPart = bonus.escolherQtd ? `+${bonus.escolherQtd} ${bonus.escolherLabel || 'atributo à escolha'}` : ''
    return [escolherPart, ...parts].filter(Boolean).join(', ') || 'Variável'
  }
  const parts = []
  Object.entries(bonus).forEach(([k, v]) => {
    if (typeof v === 'number' && k !== 'escolherQtd') parts.push(`${v >= 0 ? '+' : ''}${v} ${k}`)
  })
  return parts.join(', ') || 'Nenhum'
}

export function getDiffStars(dificuldade) {
  return '⭐'.repeat(dificuldade || 1)
}
