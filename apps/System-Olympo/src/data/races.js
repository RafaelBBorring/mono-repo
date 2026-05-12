export const RACE_CATEGORIES = [
  { id: 'humanoide', label: 'Humanoides', color: 'border-yellow-400/40 bg-yellow-400/5', title: 'text-yellow-400', badge: 'bg-yellow-400/15 text-yellow-400 border-yellow-400/30' },
  { id: 'sobrenatural', label: 'Sobrenaturais', color: 'border-purple-400/40 bg-purple-400/5', title: 'text-purple-400', badge: 'bg-purple-400/15 text-purple-400 border-purple-400/30' },
  { id: 'predatoria', label: 'Predatórias', color: 'border-red-400/40 bg-red-400/5', title: 'text-red-400', badge: 'bg-red-400/15 text-red-400 border-red-400/30' },
  { id: 'lendaria', label: 'Lendárias', color: 'border-amber-300/40 bg-amber-300/5', title: 'text-amber-300', badge: 'bg-amber-300/15 text-amber-300 border-amber-300/30' },
]

export const RACES = {
  HUMANO: {
    id: 'HUMANO', name: 'Humano', category: 'humanoide', icon: '🟡',
    quote: '"A raça que não deveria estar viva, mas está."',
    desc: 'Os humanos são a raça mais versátil e adaptável do mundo. Sem poderes inatos, compensam com determinação, inteligência e capacidade de improvisação. Histórias de humanos superarem adversários muito mais poderosos através de tática e coragem são lendárias.',
    layer0: { attrBonus: {}, hpMod: 0 },
    passivasRaciais: [
      { nome: 'Determinação Humana', tipo: 'Ativa', custo: '0 PE (1×/dia)', duracao: '1 rodada', efeito: 'Quando falha um teste crítico por 2 ou menos, pode rolar novamente. Funciona em ataques, resistências e perícias' },
    ],
    vantagens: [
      'Nenhuma restrição de classe, triagem ou equipamento',
      'Pode aprender qualquer perícia com eficiência (custo reduzido)',
      'Sem fraquezas narrativas ou elementais',
    ],
    desvantagens: [
      'Sem bônus naturais de poder',
      'Expectativa de vida mortal (importante narrativamente)',
    ],
    progressaoPoder: [
      { nivel: 1, ganho: 'Adaptabilidade', desc: '+2 Perícias adicionais na criação' },
      { nivel: 5, ganho: 'Veterano', desc: '+2 Perícias. +1 Módulo de Evolução' },
      { nivel: 10, ganho: 'Aperfeiçoamento Total', desc: '+2 Módulos de Evolução. +3 Pontos de Esqueleto' },
      { nivel: 15, ganho: 'Polímata', desc: '+3 Perícias. Todas as perícias sobem 1 grau automático no próximo descanso' },
      { nivel: 20, ganho: 'Pico Humano', desc: '+2 Módulos. +2 em qualquer atributo. +20 HP permanente' },
      { nivel: 25, ganho: 'Mestria Absoluta', desc: '+4 Perícias. +5 Pontos de Esqueleto. Escolhe 1 perícia: grau máximo permanente' },
      { nivel: 30, ganho: 'Lenda Viva', desc: '+3 em todos os atributos. +50 HP. Imune a medo e encantamento. Praticamente imortal narrativamente' },
    ],
    marcosExperiencia: [
      { marco: 'Sobreviver a 3 encontros com criatura de nível superior', ganho: 'Resiliência: +5 HP permanente. +1 em testes de resistência contra medo' },
      { marco: 'Completar 1 arco narrativo completo', ganho: 'Experiência de Vida: +2 Perícias bônus. Vantagem em 1 perícia à escolha' },
      { marco: 'Vencer combate contra oponente de raça superior sem ajuda', ganho: 'Prova de Força: +1 em qualquer atributo. Determinação Humana passa a 2×/dia' },
      { marco: 'Treinar extensivamente (narrativo, mínimo 1 mês de jogo)', ganho: 'Mestria: 2 perícias à escolha sobem 1 grau. +1 Módulo' },
    ],
    dificuldade: 1,
  },

  HUMANO_APRIMORADO: {
    id: 'HUMANO_APRIMORADO', name: 'Humano Aprimorado', category: 'humanoide', icon: '🟢',
    quote: '"Mais do que humano. Menos que deus."',
    desc: 'Um humano potencializado através de tecnologia (membros mecânicos), genética (experiências) ou magia (runas). Não é exatamente humano, mas carrega a determinação humana em corpo aprimorado.',
    layer0: { attrBonus: { escolher: true, escolherQtd: 2, escolherLabel: 'atributos à escolha' }, hpMod: 20 },
    passivasRaciais: [
      { nome: 'Otimização Adaptativa', tipo: 'Ativa', custo: '0 PE (1×/combate)', duracao: 'Instantâneo', efeito: 'Rola novamente qualquer teste e fica com o novo resultado. Funciona em ataques, resistências, perícias e salvaguardas' },
      { nome: 'Recuperação Acelerada', tipo: 'Passiva', custo: '—', duracao: 'Contínuo', efeito: 'Recupera +100% de Vida e Energia em qualquer descanso. Frações arredondadas para cima' },
    ],
    vantagens: [
      'Imunidade a aprimoramentos menores (não sofre efeito duplo de buffs)',
      'Pode usar artefatos com -2 requisito de nível',
      'Resistência física: +2 em testes de CON contra exaustão e veneno',
    ],
    desvantagens: [
      'Rejeição Mágica: -2 em testes contra magia (origem artificial do corpo)',
      'Incompatibilidade Ritual: Não pode participar de rituais antigos que exigem sangue puro',
    ],
    progressaoPoder: [
      { nivel: 1, ganho: 'Sincronização Inicial', desc: 'Traços raciais ativos. +1 atributo adicional à escolha' },
      { nivel: 5, ganho: 'Otimização Corporal I', desc: '+2 atributos à escolha. +10 HP permanente' },
      { nivel: 10, ganho: 'Reflexos Aprimorados', desc: '+3 Iniciativa. +2 CA. Reação extra 1×/turno' },
      { nivel: 15, ganho: 'Armadura Interna', desc: '+3 CA permanente. Reduz dano recebido em 3. +2 CON permanente' },
      { nivel: 20, ganho: 'Transcendência Corporal', desc: '+2 Modificadores em 2 atributos. +30 HP. Recuperação sobe para +150%' },
      { nivel: 25, ganho: 'Corpo Perfeito', desc: '+5 CA total. Imune a exaustão. +3 FOR e +3 DES permanente' },
      { nivel: 30, ganho: 'Ascensão Artificial', desc: '+3 em todos os modificadores. +50 HP. Regeneração 5 HP/turno. Praticamente sobre-humano' },
    ],
    marcosExperiencia: [
      { marco: 'Substituir 1 membro por versão aprimorada (narrativo)', ganho: '+2 FOR ou +2 DES permanente. Membro aprimorado ignora 1 condição (ex: imobilização)' },
      { marco: 'Sobreviver a dano que reduziria a 0 HP', ganho: 'Sentido de Perigo: +3 Iniciativa permanente. Não pode ser surpreso' },
      { marco: 'Ser rejeitado por sociedade por ser "diferente" (narrativo)', ganho: 'Resolução: +2 em todos os testes quando sozinho. Otimização Adaptativa passa a 2×/combate' },
    ],
    dificuldade: 1,
  },

  ELFO: {
    id: 'ELFO', name: 'Elfo', category: 'humanoide', icon: '🔵',
    quote: '"Velhos demais para lutar, mas muito jovens para morrer."',
    desc: 'Antigos habitantes deste mundo. Elegantes, mágicos, mas frágeis. Não competem em força bruta, mas em graça, sabedoria e magia. Podem ter vivido milênios e conhecem segredos que civilizações esqueceram.',
    layer0: { attrBonus: { DES: 4, AM: 3, CON: -3 }, hpMod: -15 },
    passivasRaciais: [
      { nome: 'Transe Onírico', tipo: 'Ativa', custo: '—', duracao: '4 horas', efeito: 'Descansa completamente em 4 horas. Recupera 100% HP, Energia e PE' },
      { nome: 'Sentidos Élficos', tipo: 'Passiva', custo: '—', duracao: 'Contínuo', efeito: 'Vantagem permanente em Percepção (audição e visão). Visão noturna perfeita 60m. Detecta magia passiva em 30m' },
      { nome: 'Magia Ancestral', tipo: 'Passiva', custo: '—', duracao: 'Contínuo', efeito: '+2 automático em todos os testes de magia e perícias arcanas. Imunidade a sono mágico e charme' },
    ],
    vantagens: [
      'Detecta magia em raio de 30m sem teste (intensidade e escola)',
      'Envelhece 1/4 da velocidade humana',
      '+2 em perícias de conhecimento e pesquisa',
    ],
    desvantagens: [
      'Fragilidade: -2 em testes de CON para resistir dano',
      'Aversão ao Ferro Quente: Toque causa desconforto (-2 em testes)',
      'Obrigação Solar: Sem sol por 3+ dias → melancolia (-1 em tudo)',
    ],
    progressaoPoder: [
      { nivel: 1, ganho: 'Herança Élfica', desc: 'Todos os traços raciais. +1 Perícia arcana bônus' },
      { nivel: 3, ganho: 'Memória Ancestral', desc: 'Escolhe 2 perícias para +3 bônus permanente' },
      { nivel: 6, ganho: 'Conexão Mágica', desc: 'AM regenera +3/turno fora de combate. +2 AM permanente' },
      { nivel: 10, ganho: 'Visão Mística', desc: 'Enxerga auras. Identifica escola de magia automaticamente. +10 HP' },
      { nivel: 15, ganho: 'Canalização Natural', desc: '+4 total em magia. +1 cantrip extra/dia. +5 Pontos de Esqueleto em AM' },
      { nivel: 20, ganho: 'Sabedoria Primal', desc: 'Acesso a conhecimento ancestral (mecânico relevante). +2 INT permanente. +20 HP' },
      { nivel: 25, ganho: 'Forma Etérea', tipo: 'Ativa', custo: '10 PE', duracao: '1d4 rodadas', desc: '1×/descanso longo: invisível e intangível. Imune a dano' },
      { nivel: 30, ganho: 'Ascensão Élfica', desc: 'Imortalidade. +3 em testes mágicos. Cura 2d8/turno em florestas. +3 AM permanente' },
    ],
    marcosExperiencia: [
      { marco: 'Viver 100+ anos', ganho: 'Sabedoria dos Séculos: +2 INT permanente. +1 em todos os testes mentais' },
      { marco: 'Encontrar Árvore da Vida (narrativo)', ganho: 'Regeneração 3 HP/turno em contato com natureza. Magia natural +2' },
      { marco: 'Presenciar morte de mentor élfico', ganho: '+3 INT. Acesso a todas as memórias do mentor (conhecimentos e magias)' },
      { marco: 'Alcançar 500+ anos', ganho: 'Ancião Élfico: +2 em todos os atributos mentais. Aura de Calma (aliados em 10m +2 contra medo)' },
    ],
    dificuldade: 1,
  },

  BRUXA: {
    id: 'BRUXA', name: 'Bruxa', category: 'sobrenatural', icon: '🟣',
    quote: '"Quando a terra fala, nós ouvimos."',
    desc: 'Abençoada diretamente por Gaia. Não escolheu ser bruxa — nasceu assim. Realiza rituais de poder imenso, maldições que ecoam através de gerações, comunica com a natureza como se fosse outro idioma.',
    layer0: { attrBonus: { AM: 5, FOR: -2, CON: -1 }, hpMod: 10 },
    passivasRaciais: [
      { nome: 'Ritual de Poder', tipo: 'Ativa', custo: 'Componentes reduzidos', duracao: 'Variável', efeito: 'Rituais custam -50% tempo e -50% componentes. Empilha com outras reduções' },
      { nome: 'Comunhão de Gaia', tipo: 'Passiva', custo: '—', duracao: 'Contínuo', efeito: 'Comunica com animais e sente criaturas em 100m através de plantas. Imunidade a venenos naturais' },
    ],
    vantagens: [
      'Detecta magia a 1km (intensidade e tipo)',
      'Maldições aplicadas têm +2 em potência',
      'Regeneração 2 HP/hora em contato com terra',
    ],
    desvantagens: [
      'Sem componentes: -4 em todas as magias',
      'Ferro quente: 1d4 dano/rodada de contato, -2 em testes',
      'Destruir natureza voluntariamente: -3 em magia por 24h',
      'Frenesi de Primavera: precisa de 4h em natureza a cada 3 dias ou -2 em tudo',
    ],
    progressaoPoder: [
      { nivel: 1, ganho: 'Bênção de Gaia', desc: 'Traços ativos. Detecta magia a 100m' },
      { nivel: 4, ganho: 'Feitiço Marca', desc: 'Aprende 2 feitiços adicionais da escola naturalista' },
      { nivel: 8, ganho: 'Maldição Menor', custo: '15 PE', duracao: 'Cena', desc: 'Alvo: -3 em 1 atributo. CD 18 resiste. Stack até 2 maldições' },
      { nivel: 12, ganho: 'Elementalista', desc: 'Escolhe 2 elementos. Dano +3. Resistência +50% em ambos. +3 AM permanente' },
      { nivel: 16, ganho: 'Ritualista Perfeita', desc: 'Rituais -75% tempo. 2 rituais simultâneos. +5 Pontos de Esqueleto em AM' },
      { nivel: 20, ganho: 'Invocação', custo: '20 PE', duracao: 'Combate', desc: 'Companheiro animal (stats = nível). +30 HP permanente' },
      { nivel: 24, ganho: 'Aura de Gaia', desc: '+3 AM permanente. Aliados em 15m +2 resistência. Rituais sem componentes menores' },
      { nivel: 30, ganho: 'Lenda Verde', desc: 'Semidivina da natureza. Cura 3d6 em aliados 15m como ação. Rituais sem componentes. Imune a condições naturais' },
    ],
    marcosExperiencia: [
      { marco: 'Criar ritual original próprio', ganho: 'Mestre Ritual: rituais pessoais -25% adicional. +2 AM' },
      { marco: 'Amaldiçoar 10 criaturas diferentes', ganho: 'Maldição Potente: CD +4. Maldições duram 24h em vez de cena' },
      { marco: 'Ser aceita por círculo de bruxas', ganho: '+2 AM permanente. Acesso a rituais do círculo. +1 Módulo' },
      { marco: 'Selar pacto com entidade da natureza', ganho: 'Pacto Verde: 1×/semana pode pedir favor à entidade (narrativo + mecânico)' },
    ],
    dificuldade: 2,
  },

  MAGO: {
    id: 'MAGO', name: 'Mago', category: 'sobrenatural', icon: '🔮',
    quote: '"Todo poder vem do conhecimento."',
    desc: 'A magia é uma ciência. Livros, fórmulas, componentes, foco de poder. Sem foco, é fraco. Com foco, é devastador.',
    layer0: { attrBonus: { AM: 4, INT: 3, CON: -3 }, hpMod: -20 },
    passivasRaciais: [
      { nome: 'Foco Mágico', tipo: 'Ativa', custo: '—', duracao: 'Contínuo', efeito: 'Com foco: +4 em magias. Sem foco: -4 em magias. Foco é item físico (pode ser desarmado)' },
      { nome: 'Análise Arcana', tipo: 'Passiva', custo: '—', duracao: 'Contínuo', efeito: 'Identifica magia automaticamente (escola, potência, duração). Sem teste necessário' },
      { nome: 'Reação Arcana', tipo: 'Passiva', custo: '3 PE', duracao: 'Instantâneo', efeito: 'Negar 1 magia de ataque direcionada a si como reação. 1×/turno' },
    ],
    vantagens: [
      '1 feitiço extra por tier',
      'Biblioteca: +3 em pesquisas arcanas',
      'Resistência Escolhida: 1 tipo de magia -3 dano',
    ],
    desvantagens: [
      'Sem foco: magia -8 efetivo (devastador)',
      'Dano sofrido interrompe concentração (CD = dano)',
      '-2 em testes de FOR e CON',
    ],
    progressaoPoder: [
      { nivel: 1, ganho: 'Despertar Arcano', desc: 'Traços ativos. 2 feitiços extras da escola escolhida' },
      { nivel: 3, ganho: 'Esfera de Magia', desc: 'Especializa 1 esfera. +2 dano/efetividade nela. +3 INT permanente' },
      { nivel: 7, ganho: 'Aprofundamento', desc: '2 feitiços ganham +2d8 dano ou +3 rodadas de duração' },
      { nivel: 11, ganho: 'Escudo de Mana', custo: '1×/combate', duracao: 'Instantâneo', desc: 'Absorve 20×INT de dano mágico antes de quebrar' },
      { nivel: 15, ganho: 'Segunda Esfera', desc: '2ª esfera com +2. +3 AM permanente. +5 Pontos de Esqueleto' },
      { nivel: 20, ganho: 'Maestria Arcana', desc: 'Reação Arcana custa 1 PE. +2 PE/turno regen. Foco embebido (não desarmável). +30 HP' },
      { nivel: 25, ganho: 'Transmutação', custo: '15 PE', duracao: 'Permanente', desc: 'Altera propriedade física de objeto. Pode criar item mágico menor' },
      { nivel: 30, ganho: 'Archimago', desc: 'Todos feitiços de suas esferas. 2 feitiços/turno. +4 AM permanente. CD de magia +4' },
    ],
    marcosExperiencia: [
      { marco: 'Dominar 20 feitiços diferentes', ganho: '+2 INT permanente. +1 dano em todos os feitiços' },
      { marco: 'Criar grimório pessoal (50+ páginas)', ganho: '+3 pesquisas. Acesso a magia única. Feitiços de grimório -1 PE' },
      { marco: 'Derrotar criatura mágica superior com só magia', ganho: '+2 AM permanente. Resistência mágica +2. +1 Resistência elemental' },
    ],
    dificuldade: 2,
  },

  FEITICEIRO: {
    id: 'FEITICEIRO', name: 'Feiticeiro', category: 'sobrenatural', icon: '⚡',
    quote: '"Meu poder é minha identidade."',
    desc: 'Nasceu com 1 dom inato. Não escolheu. Essa magia é parte dele, evolui com ele, reflete sua alma. Mais especialista que mago, menos flexível. Seu poder cresce continuamente.',
    layer0: { attrBonus: { AM: 3, escolher: true, escolherQtd: 2, escolherLabel: 'atributos (1 relacionado ao dom)' }, hpMod: 25 },
    passivasRaciais: [
      { nome: 'Dom Inato', tipo: 'Passiva', custo: '—', duracao: 'Contínuo', efeito: '1 dom elemental/mágico. Sem treino, componentes ou foco. Sucesso automático em testes simples. +1 efetividade a cada 3 níveis' },
      { nome: 'Sinergia Mágica', tipo: 'Passiva', custo: '—', duracao: 'Contínuo', efeito: 'Recupera 2 PE/turno usando dom ativamente. Dom nunca causa backlash' },
    ],
    vantagens: [
      'Sem componentes para o dom',
      'Mutações do dom em tempo reduzido -50%',
      'Pode usar dom como reação (custo normal)',
    ],
    desvantagens: [
      'APENAS 1 dom — não pode aprender outros',
      '-3 em TUDO fora do dom',
      '48h sem usar dom: inquietação (-2 em tudo)',
      'Pode desenvolver loucura temática (narrativo)',
    ],
    progressaoPoder: [
      { nivel: 1, ganho: 'Despertar do Dom', desc: 'Dom ativo. Escolhe tipo (fogo, gelo, eletricidade, gravidade, sangue, sombra, etc)' },
      { nivel: 3, ganho: 'Evolução I', desc: 'Dom +2 dano. Alcance +10m' },
      { nivel: 6, ganho: 'Evolução II', desc: 'Dom +4 total. Molda forma (linha, cone, esfera). +3 AM permanente' },
      { nivel: 9, ganho: 'Mutação I', desc: '1 novo efeito (ex: fogo que não queima aliados). +5 Pontos de Esqueleto em AM' },
      { nivel: 12, ganho: 'Evolução III', desc: 'Dom +6 total. Custo PE -30%. +20 HP permanente' },
      { nivel: 15, ganho: 'Mutação II', desc: '1 efeito extra. Pode sustentar dom (5 PE/rodada). Dom ignora 1 resistência elemental' },
      { nivel: 18, ganho: 'Evolução IV', desc: 'Dom +9 total. Dobra área. Praticamente divino em escala' },
      { nivel: 21, ganho: 'Forma Perfeita', desc: 'Dom +12 total. Ação livre 1×/turno. +3 em todos os atributos mágicos' },
      { nivel: 24, ganho: 'Mutação III', desc: 'Transformação final: escolhe dano dobrado OU área dobrada OU duração dobrada' },
      { nivel: 27, ganho: 'Poder Supremo', desc: '+3 AM permanente. Dom ignora todas as resistências elementais' },
      { nivel: 30, ganho: 'Transcendência', desc: 'Magia de deus. Pode ensinar herança. Imune ao próprio elemento. Dom +15 total. +50 HP' },
    ],
    marcosExperiencia: [
      { marco: 'Salvar aliado à beira da morte com o dom', ganho: 'Determinação: dom +3 dano quando protegendo outros. Permanente' },
      { marco: 'Dominar cenário elemental (vulcão, geleira, tempestade)', ganho: '+4 dom em terreno favorável. Imune ao elemento do cenário' },
      { marco: 'Enfrentar e sobreviver ao oposto do dom', ganho: '+2 AM permanente. Resistência ao oposto. Dom causa +2 dano contra criaturas desse tipo' },
      { marco: 'Canalizar dom por 24h seguidas sem descanso', ganho: 'Reserva Infinita: 1×/semana pode usar dom sem custo de PE por 1 combate inteiro' },
    ],
    dificuldade: 3,
  },

  VAMPIRO: {
    id: 'VAMPIRO', name: 'Vampiro', category: 'predatoria', icon: '🩸',
    quote: '"Cada noite, somos mais fortes. Cada vida consumida, mais antigos."',
    desc: 'Imortal e maldito. Começa relativamente fraco (jovem), mas cresce continuamente. Suas fraquezas são severas, mas sua progressão é inevitável. A idade define tudo — um Ancião de 1000 anos é uma entidade quase divina.',
    layer0: { attrBonus: { DES: 3, FOR: 3, CON: -3, AM: 1 }, hpMod: 45 },
    passivasRaciais: [
      { nome: 'Regeneração Contínua', tipo: 'Passiva', custo: '—', duracao: 'Contínuo', efeito: 'Regenera 4×ModCON HP/turno em combate. Fora: 2/turno. ANULADA por luz solar ou estaca no coração' },
      { nome: 'Força Noturna', tipo: 'Passiva', custo: '—', duracao: 'Contínuo', efeito: '+2 em TODOS os testes à noite. -2 de dia (mesmo sem sol direto)' },
      { nome: 'Absorção de Sangue', tipo: 'Ativa', custo: 'Ação', duracao: 'Instantâneo', efeito: 'Beber sangue vivo cura 2d10+10 HP + recupera 8 PE. Alvo deve estar helpless ou consentir' },
    ],
    vantagens: [
      'Imortalidade: não envelhece, não adoece, imune a venenos',
      'Sentido de Sangue: detecta sangue vivo em 1km (tipo e quantidade)',
      'Sedução: +2 em testes sociais noturnos',
    ],
    desvantagens: [
      'Luz Solar CRÍTICA: 3d6 dano/turno. Anula regeneração',
      'Sangue a cada 7 dias ou frenesi (ataca aliado mais próximo)',
      'Descanso obrigatório em caixão com terra nativa ou -2 em tudo no dia seguinte',
      'Não cruza água corrente sem ritual',
      'Estaca no coração: paralisa completamente',
    ],
    progressaoPoder: [
      { nivel: 1, ganho: 'Maldição do Sangue', desc: 'Traços ativos. Sentido de sangue 1km' },
      { nivel: 5, ganho: 'Forma de Morcego', custo: '3 PE', duracao: '1 hora', desc: 'Voo 18m/turno. Mantém sentidos. +10 HP' },
      { nivel: 10, ganho: 'Regeneração Dobrada', desc: '8×ModCON em combate, 4/turno fora. +3 FOR permanente' },
      { nivel: 15, ganho: 'Dominação Menor', custo: '10 PE', duracao: '1 cena', desc: 'Alvo com AM inferior obedece 1 comando. CD 18+AM resiste' },
      { nivel: 20, ganho: 'Absorção Perfeita', desc: '3d10+20 PE como ação bônus. +3 FOR e +3 DES permanente' },
      { nivel: 25, ganho: 'Forma Neblina', custo: '8 PE', duracao: '1 cena', desc: 'Neblina: imune a dano físico, 12m/turno, não ataca' },
      { nivel: 30, ganho: 'Imortalidade Verdadeira', desc: 'Regeneração 12×ModCON. Não morre com sangue no sistema. Pode criar vampiros-filho' },
    ],
    marcosExperiencia: [
      {
        titulo: 'Recém-Transformado', desc: 'Vampiro jovem, sedento e instintivo. Mais forte que vampiros de 1-3 anos pela energia da transformação',
        marcos: [
          { marco: 'Primeira noite como vampiro', ganho: 'Fúria do Nascedouro: +3 FOR nas primeiras 24h. Depois: +1 FOR permanente' },
          { marco: 'Matar primeiro alvo por sangue', ganho: 'Sede Controlada: CD de frenesi reduz em -3. +5 HP permanente' },
        ],
      },
      {
        titulo: 'Estabelecido (50-200 anos)', desc: 'Controle sobre a sede. Poder consolidado. Pode formar aliados e criar vampiros-filho',
        marcos: [
          { marco: 'Criar primeiro vampiro-filho', ganho: 'Domínio de Sangue: +2 contra seus criados. Pode sentir quando um filho está em perigo (1km)' },
          { marco: 'Sobreviver 50 anos', ganho: '+2 FOR e +2 DES permanente. Sentido de Sangue expande para 5km' },
          { marco: 'Alcançar 200 anos', ganho: 'Poder Mental: +3 testes mentais. Dominação funciona em criaturas com AM até 18' },
        ],
      },
      {
        titulo: 'Ancião (500+ anos)', desc: 'Poder imenso. Domina múltiplos vassalos. Rituais vampíricos potentes',
        marcos: [
          { marco: 'Alcançar 500 anos', ganho: 'Príncipe: +3 em TUDO à noite. Regeneração dobra. Rituais -50%. Pode dominar clã' },
          { marco: 'Alcançar 1000 anos', ganho: 'Ancestral: escolhe 1 poder ancestral único. Transforma em neblina à vontade. +4 AM' },
        ],
      },
      {
        titulo: 'Primordial (5000+ anos)', desc: 'Deus menor. Domina até 10 vampiros jovens simultaneamente. Praticamente imortal',
        marcos: [
          { marco: 'Alcançar 5000 anos', ganho: 'Entidade: deus menor. Regeneração 20×ModCON. Domina 10 vampiros. Cria ghouls permanentes' },
        ],
      },
    ],
    dificuldade: 4,
  },

  LOBISOMEM: {
    id: 'LOBISOMEM', name: 'Lobisomem', category: 'predatoria', icon: '🐺',
    quote: '"Duas naturezas. Uma alma."',
    desc: 'Maldição ou dom da lua. Força brutal em forma lupina, inteligência em forma humana. Nascido para ser soldado, caçar, liderar. Mas é preso entre dois mundos. A hierarquia da matilha define tudo — Beta, Omega, e os muitos caminhos do Alfa.',
    layer0: { attrBonus: { FOR: 4, DES: 3, CON: 2, INT: -2 }, hpMod: 40 },
    passivasRaciais: [
      { nome: 'Transformação Parcial', tipo: 'Ativa', custo: '4 PE', duracao: 'Combate inteiro', efeito: '+3 FOR, +2 DES, garras 2d8+FOR. Perde -2 INT. Não-stack com buffs de transformação' },
      { nome: 'Regeneração Lupina', tipo: 'Passiva', custo: '—', duracao: 'Contínuo', efeito: '3×ModCON HP/turno fora de combate. Em combate: 1×ModCON/turno. ANULADA por prata' },
      { nome: 'Sentido de Presa', tipo: 'Passiva', custo: '—', duracao: 'Contínuo', efeito: 'Detecta sangue em 1km. Vantagem em Percepção e Sobrevivência para rastrear. Identifica emoções em 30m' },
    ],
    vantagens: [
      'Lua Cheia: Transformação completa +6 FOR, +50% vida, garras 2d12+FOR (involuntária)',
      'Forma Lupina: lobo permanente. Velocidade 18m/turno, sentidos ampliados',
      'Matilha: +2 em tudo com 2+ aliados em formação',
    ],
    desvantagens: [
      'Prata CRÍTICA: 2× dano. Anula regeneração. Ferimentos não curam naturalmente',
      'Frenesi: HP <25% ou sangue de aliado → teste CON CD 18 ou ataca 1d4 rodadas',
      'Lua Cheia: transforma involuntariamente (sem controle na primeira vez)',
      'Rastreável: pegadas e cheiro forte. Marcas na pele assustam NPCs (-2 social)',
    ],
    progressaoPoder: [
      { nivel: 1, ganho: 'Despertar da Fera', desc: 'Traços ativos. Transformação parcial. Forma lobo sem custo' },
      { nivel: 5, ganho: 'Controle Lupino', desc: 'A transformação parcial fica controlada: sem novo poder duplicado, agora custa 2 PE para aprimorar garras para 2d10+FOR e recebe +2 em testes de CON contra frenesi' },
      { nivel: 10, ganho: 'Fera Interior', desc: '+3 FOR em híbrida. Garras 3d8+FOR. Regeneração em combate: 2×ModCON/turno' },
      { nivel: 15, ganho: 'Sentidos Ampliados', desc: 'Percepção 2km. Não pode ser surpreendido. +3 Iniciativa. Imune a medo natural' },
      { nivel: 20, ganho: 'Mestre da Forma', desc: 'Forma híbrida indefinida. +2 em todas as formas. Garras 3d10+FOR. +30 HP permanente' },
      { nivel: 25, ganho: 'Controle Total', desc: 'Transformação sem PE. Imune a frenesi. Lua cheia não força mais transformação' },
      { nivel: 30, ganho: 'Forma Bestial', custo: '15 PE', duracao: '1d6+2 rodadas (SEM CONTROLE)', desc: 'Lobo colossal: FOR +10, DES +5, vida +100%, garras 5d12+FOR. ATUA POR INSTINTO — ataca ameaça mais próxima, NÃO distingue aliado de inimigo se ameaçado. Depois: exaustão total por 8h' },
    ],
    marcosExperiencia: [
      {
        titulo: 'Beta', desc: 'Lobisomem base. Membro de alcateia ou solitário. Ainda não provou seu poder',
        marcos: [
          { marco: 'Dominar primeira transformação involuntária sem causar baixas', ganho: '+3 em CON contra frenesi permanente. Vantagem em testes de Percepção sob lua cheia' },
          { marco: 'Sobreviver a combate contra caçador de lobisomens', ganho: '+2 CA contra prata. Sentido de Perigo: +3 Iniciativa contra inimigos que portam prata' },
          { marco: 'Ser aceito por alcateia existente (3+ lobisomens)', ganho: 'Vínculo de Matilha: sente emoções de membros em 500m. +2 em tudo quando junto de 2+ membros' },
        ],
      },
      {
        titulo: 'Omega', desc: 'Solitário. Sem matilha. Auto-suficiente. Mais instintivo e selvagem que Betas',
        marcos: [
          { marco: 'Sobreviver 1 mês sozinho sem aliados (narrativo)', ganho: 'Instinto Solitário: +3 em Sobrevivência e Percepção sozinho. Regeneração +1×ModCON sozinho' },
          { marco: 'Derrotar criatura superior usando só forma híbrida', ganho: 'Fera Concentrada: em híbrida, +2 FOR adicional. Garras crítico em 19-20' },
        ],
      },
      {
        titulo: 'Alfa Comum', desc: 'Líder de alcateia. Pode ser herdado ou arrancado de outro Alfa caído. Bênções padrão',
        marcos: [
          { marco: 'Derrotar Alfa anterior em combate justo ou herdar posição', ganho: 'Urro de Alfa: aliados lobisomem +2 em tudo por 1 rodada (1×/combate). Presença Dominante: inimigos de nível inferior hesitam (+2 CA contra eles)' },
          { marco: 'Liderar alcateia em 5+ combates juntos', ganho: 'Sincronia de Alcateia: membros da alcateia compartilham Vida temporariamente (transferência de dano como reação, 1×/combate)' },
        ],
      },
      {
        titulo: 'Alfa Demônio', desc: 'Alfa que eliminou múltiplos outros Alfas, roubando seu poder. Corrompido, instável, EXTREMAMENTE poderoso',
        marcos: [
          { marco: 'Eliminar 3 Alfas e absorver poder', ganho: 'Poder Roubado: +4 FOR e +4 DES permanente. Garras causam dano necrótico adicional 2d6. Aura de Terror: inimigos em 15m testam CD 20 ou ficam amedrontados' },
          { marco: 'Eliminar 7 Alfas', ganho: 'Alfa Demônio: transforma em lobo demoníaco (FOR +8, vida +75%, resistência a prata 50%). Custo: -4 INT permanente. Frenesi CD sobe +5' },
        ],
      },
      {
        titulo: 'Alfa Verdadeiro', desc: 'Alfa que alcançou poder sem violência desnescessária. Justo, heroico, respeitado. O mais raro',
        marcos: [
          { marco: 'Alcançar liderança sem eliminar outro Alfa (por mérito, escolha ou criação de nova alcateia)', ganho: 'Bênção da Lua: +3 em TUDO sob lua cheia. Forma Bestial SEM risco de atacar aliados (mantém controle). Regeneração dobra sob lua' },
          { marco: 'Salvar 10+ vidas usando forma de lobisomem', ganho: 'Alfa Verdadeiro: +2 em todos os atributos. Aura de Protetor (aliados em 20m +3 contra medo). Pode curar aliados com toque (gasta HP próprio)' },
        ],
      },
    ],
    dificuldade: 3,
  },

  DEMONIO: {
    id: 'DEMONIO', name: 'Demônio', category: 'lendaria', icon: '👹',
    quote: '"Quando as correntes caem, chegamos ao céu infernal."',
    desc: 'Criatura infernal antiga. Serve Hades ou evolui para libertação. Cada morte em combate marca a alma. Quanto mais mata, mais poderoso — sem limite artificial.',
    layer0: { attrBonus: { AM: 3, escolher: true, escolherQtd: 2, escolherLabel: 'FOR ou DES', escolherOpcoes: ['FOR', 'DES'] }, hpMod: 50 },
    passivasRaciais: [
      { nome: 'Aura Amaldiçoada', tipo: 'Passiva', custo: '—', duracao: 'Contínuo', efeito: 'Inimigos em 5m: -2 em todos os testes. AM inferior não resiste. CD 18+AM resiste' },
      { nome: 'Regeneração Infernal', tipo: 'Passiva', custo: '—', duracao: 'Contínuo', efeito: '3×ModCON HP/turno. Dobra em solo de Hades. ANULADA por água benta' },
      { nome: 'Resistência Elemental', tipo: 'Passiva', custo: '—', duracao: 'Contínuo', efeito: '50% redução no elemento escolhido + fogo automático' },
    ],
    vantagens: [
      'A cada 5 níveis: +1 resistência elemental',
      'Poder crescente sem mestre',
      'Não precisa dormir, comer ou beber',
    ],
    desvantagens: [
      'Água Benta CRÍTICA: 2× dano + 1d6 queimadura/rodada por 3 rodadas',
      'Correntes de Hades: aprisionado → -5 em TUDO, perde traços',
      'Sujeição: mestre vivo → deve obedecer ordens diretas',
      'Sagrado: -2 em testes dentro de templos',
    ],
    progressaoPoder: [
      { nivel: 1, ganho: 'Despertar Infernal', desc: 'Traços ativos. Aura 5m' },
      { nivel: 5, ganho: 'Razão Despertada', desc: '+3 INT. Pensamento estratégico completo. Escolhe 1 resistência extra' },
      { nivel: 10, ganho: 'Evolução Infernal', desc: '+2 em 2 atributos. Aura 10m. Garras 2d8+FOR ou +2 AM para magias' },
      { nivel: 15, ganho: 'Ascensão Parcial', desc: 'Parcialmente livre. +2 PE/turno. +3 em tudo sem mestre' },
      { nivel: 20, ganho: 'Libertação', desc: 'Totalmente livre. +4 em tudo. Correntes não funcionam mais. +40 HP' },
      { nivel: 25, ganho: 'Senhor', desc: 'Invoca 1d4 demônios menores (stats = nível/2). Aura 20m: -4 inimigos' },
      { nivel: 30, ganho: 'Imperador', desc: 'Controla círculo. Aura -5. Portais para submundo. +5 AM permanente' },
    ],
    marcosExperiencia: [
      { marco: 'Matar 10 criaturas em combate', ganho: 'Marca da Alma I: +2 em 1 atributo. Garras ou magia +1d6' },
      { marco: 'Matar 25 criaturas', ganho: 'Marca da Alma II: +2 em 2 atributos. Resistência sagrada 25%' },
      { marco: 'Matar 50 criaturas', ganho: 'Poder Infernal Único: escolhe 1 poder exclusivo de demônio' },
      { marco: 'Destruir Correntes de Hades (narrativo + combate)', ganho: 'Libertação absoluta: imune a aprisionamento. +3 AM. Nunca mais pode ser dominado' },
      { marco: 'Matar 100 criaturas', ganho: 'Overlord: praticamente divino. +5 em tudo. Pode desafiar Hades diretamente' },
    ],
    dificuldade: 4,
  },

  DASARIANO: {
    id: 'DASARIANO', name: 'Dasariano', category: 'lendaria', icon: '🧬',
    quote: '"Três formas. Uma vontade."',
    desc: 'Raça primordial. Humanoides que podem transformar em forma animal ou híbrida. Três expressões: Humano (diplomacia), Híbrido (combate), Besta Primordial (poder absoluto).',
    layer0: { attrBonus: {}, hpMod: 30 },
    passivasRaciais: [
      { nome: 'Mudança de Forma', tipo: 'Ativa', custo: 'Ação', duracao: 'Indefinido', efeito: 'Troca formas livremente. Mantém HP, PE e inventário. Máximo 1×/turno' },
      { nome: 'Instinto Predador', tipo: 'Passiva', custo: '—', duracao: 'Contínuo', efeito: 'Vantagem em Percepção e Sobrevivência em TODAS as formas' },
    ],
    formas: [
      { nome: 'Forma Humana', attrBonus: {}, hpExtra: 0, desc: 'Atributos normais. Diplomacia e interação. Indistinguível de humano' },
      { nome: 'Forma Híbrida (Beta)', attrBonus: { FOR: 3, DES: 2, CON: 1 }, hpExtra: 20, garras: '2d8+FOR', desc: 'Equilibrada. Garras naturais. Pode falar. -1 social' },
      { nome: 'Forma Primordial (Alfa)', attrBonus: { FOR: 6, DES: 3, CON: 2, INT: -4 }, hpExtra: 40, garras: '3d10+FOR', desc: 'Poder absoluto. Quase irracional. +2 CA natural. Sem magia complexa' },
    ],
    vantagens: [
      'Versatilidade entre formas',
      'Regeneração 1×ModCON HP/turno em qualquer forma',
      'Em forma humana: sem restrições sociais',
    ],
    desvantagens: [
      'Primordial: INT -4. Sem magia complexa',
      '24h+ em Primordial: teste CD 18 ou perde humanidade temporariamente',
      'Cicatrizes entre formas: -2 social com humanos comuns',
    ],
    progressaoPoder: [
      { nivel: 1, ganho: 'Despertar', desc: '3 formas disponíveis. Troca livre' },
      { nivel: 7, ganho: 'Fusão', desc: 'Customiza: +2 FOR em Híbrida ou +2 DES em Primordial' },
      { nivel: 14, ganho: 'Aperfeiçoamento', desc: '+10 HP em cada forma. Garras +1d em Primordial' },
      { nivel: 21, ganho: 'Forma Perfeita', custo: '5 PE', duracao: 'Combate', desc: '4ª forma: +5 FOR, +3 DES, +2 CON, sem penalidade INT. Garras 3d8+FOR' },
      { nivel: 28, ganho: 'Primal Ancestral', desc: 'Primordial: +3 em tudo adicional. Garras 4d10+FOR. Quase divina' },
      { nivel: 30, ganho: 'Unificação', desc: 'Mescla todas as formas. Bônus total simultâneo. Forma definitiva' },
    ],
    marcosExperiencia: [
      { marco: 'Dominar 1 forma (50+ usos em situações distintas)', ganho: '+3 no atributo-chave da forma. Permanente' },
      { marco: 'Salvar aliado usando Primordial sob controle total', ganho: 'Harmonia: CD de perda de humanidade +5. Permanente' },
      { marco: 'Ser aceito por sociedade apesar da forma', ganho: 'Diplomacia Primordial: sem penalidade social em Híbrida' },
    ],
    dificuldade: 2,
  },

  FINGER: {
    id: 'FINGER', name: 'Finger', category: 'lendaria', icon: '🔫',
    quote: '"Somos a arma que escolheu seu portador."',
    desc: 'Entidade parasita dimensional. Reside em arma. Evolui com a arma. Quanto mais forte a arma, mais poder. Raro e extremamente poderoso. A relação com o portador é tudo — symbiosis ou dominação.',
    layer0: { attrBonus: {}, hpMod: 0, hpLabel: 'Variável (arma/portador)' },
    passivasRaciais: [
      { nome: 'Incorporação', tipo: 'Passiva', custo: '—', duracao: 'Contínuo', efeito: 'Habita corpo ou arma de portador. Fornece poder em troca de hospedagem. Entidade separada' },
      { nome: 'Imortalidade Parasita', tipo: 'Passiva', custo: '—', duracao: 'Contínuo', efeito: 'Não morre enquanto a arma existe. Portador morre → busca novo em 24h ou hiberna' },
      { nome: 'Evolução de Arma', tipo: 'Passiva', custo: '—', duracao: 'Contínuo', efeito: 'Arma +1 dano a cada 5 níveis. Stack com Rank' },
    ],
    vantagens: [
      'Habilidades Roubadas: copia 1 habilidade de inimigos derrotados (nível dias)',
      'Sinergia: portador forte → Finger mais forte',
      'Imune a veneno, doença, exaustão (sem corpo biológico)',
    ],
    desvantagens: [
      'Arma destruída = Finger morre imediatamente',
      'Armas sagradas causam 2× dano ao Finger',
      'Portador pode tentar dominar (confronto AM, CD 20)',
      'Conflito narrativo constante com portador',
    ],
    progressaoPoder: [
      { nivel: 1, ganho: 'Vínculo', desc: 'Incorporação. Escolhe arma e portador' },
      { nivel: 5, ganho: 'Arma Evoluída I', desc: '+2 dano permanente na arma. Brilho elemental' },
      { nivel: 10, ganho: 'Habilidade Roubada', desc: 'Copia 1 habilidade de inimigo. Pode manter 2 simultâneas' },
      { nivel: 15, ganho: 'Materialização', custo: '10 PE', duracao: '1 rodada', desc: 'Corpo energético. Ataca independentemente' },
      { nivel: 20, ganho: 'Arma Evoluída II', desc: '+5 dano total. Pode copiar 3 habilidades' },
      { nivel: 25, ganho: 'Arma Viva', desc: '2 habilidades permanentes. Telecinésia limitada na arma' },
      { nivel: 30, ganho: 'Verdadeiro Overlord', desc: 'Arma indestrutível. Existe sem portador. Domina completamente. +5 AM' },
    ],
    marcosExperiencia: [
      { marco: 'Copiar habilidade de chefe/inimigo poderoso', ganho: 'Habilidade roubada se torna permanente' },
      { marco: 'Encontrar portador compatível (AM 15+)', ganho: '+2 AM. Sinergia: +3 em tudo com portador compatível' },
      { marco: 'Portador proteger arma em combate (arriscando a própria vida)', ganho: 'Vínculo Profundo: +3 em tudo com esse portador. Arma concede +3 CA ao portador' },
    ],
    dificuldade: 4,
  },

  SEMIDEUS: {
    id: 'SEMIDEUS', name: 'Semideus', category: 'lendaria', icon: '⚡',
    quote: '"O sangue divino nos marca. Nada pode mudar isso."',
    desc: 'Filho de deus. Herança divina define completamente seu poder. Começa extremamente poderoso. Crescimento lento mas constante. A linhagem do deus pai é a identidade do semideus.',
    layer0: { attrBonus: {}, hpMod: 60, requiresDeus: true },
    deuses: [
      { id: 'ZEUS', name: 'Zeus', title: 'Deus dos Deuses', attr: { FOR: 4, DES: 2, INT: 2, AM: 1 }, traco: 'Raio Inato (2d8+AM elétrico)', especial: 'Comando: aliados 10m +1. Trovão 1×/dia' },
      { id: 'POSEIDON', name: 'Poseidon', title: 'Deus dos Mares', attr: { DES: 4, FOR: 2, CON: 2, AM: 1 }, traco: 'Controle da Água (manipular 30m)', especial: 'Respiração aquática. Ondas 3d6+AM em cone. Imune a afogamento' },
      { id: 'ATENA', name: 'Atena', title: 'Deusa da Guerra', attr: { INT: 4, DES: 3, CON: 1 }, traco: 'Visão Tática (antecipa 1 ação/combate)', especial: 'Estratégia +3. Inimigos -2 movimento. Concede +2 a aliado como reação' },
      { id: 'ARES', name: 'Ares', title: 'Deus da Guerra', attr: { FOR: 5, DES: 2 }, traco: 'Fúria Marcial (+3 dano corpo-a-corpo)', especial: 'Crítico 19-20. Ataque extra ao matar inimigo. +2 CA em combate' },
      { id: 'ARTEMIS', name: 'Artemis', title: 'Deusa da Lua', attr: { DES: 4, INT: 2, AM: 2 }, traco: 'Rastreamento Divino (localiza em 5km)', especial: 'Crítico automático na primeira surpresa. Imune a fadiga. +3 à noite' },
      { id: 'APOLLO', name: 'Apollo', title: 'Deus do Sol', attr: { AM: 4, INT: 2, FOR: 2 }, traco: 'Cura Solar (3d6+AM, 1×/dia)', especial: 'Luz radiante: inimigos 10m -1. Cura veneno com toque. +2 de dia' },
      { id: 'AFRODITE', name: 'Afrodite', title: 'Deusa do Amor', attr: { APA: 5, AM: 2, DES: 1 }, traco: 'Sedução Divina (1 ação do alvo, CD 18)', especial: '+4 social. Alvo fica lento 1 rodada. Imune a charme' },
      { id: 'HADES', name: 'Hades', title: 'Deus do Inferno', attr: { AM: 4, FOR: 2, CON: 2 }, traco: 'Medo Mortal (inimigos 10m, CD 18 amedrontados)', especial: 'Necromancia +3. Comunica com mortos. Toque 1d8 necrótico extra' },
      { id: 'PERSEFONE', name: 'Persefone', title: 'Deusa do Inferno', attr: { AM: 4, CON: 2, APA: 2 }, traco: 'Pacto Infernal (invoca 1 sombra menor, CD 16 resiste)', especial: 'Dualidade: +2 social à luz, +2 magia na escuridão. Resistência necrótico 50%' },
      { id: 'DIONISIO', name: 'Dionisio', title: 'Deus da Vida', attr: { CON: 4, AM: 2, APA: 2 }, traco: 'Vitalidade (cura 2d8+AM como ação bônus, 3×/dia)', especial: '+30 HP base. Imune a veneno e doença. Aliados em 10m recuperam 1 PE/turno' },
      { id: 'HEFESTO', name: 'Hefesto', title: 'Deus da Forja', attr: { FOR: 4, CON: 3, INT: 1 }, traco: 'Toque da Forja (melhora 1 arma/armadura permanentemente +1)', especial: 'Armas forjadas +1 dano. Armaduras +2 CA. Pode reparar itens como ação' },
      { id: 'HERMES', name: 'Hermes', title: 'Deus da Velocidade', attr: { DES: 5, INT: 2 }, traco: 'Velocidade Divina (+10m movimento. Ação bônus: Dash)', especial: '+5 Iniciativa. Não pode ser surpreso. 1×/dia: teleporte 30m como ação bônus' },
      { id: 'MORPHEU', name: 'Morpheu', title: 'Deus dos Sonhos', attr: { AM: 3, INT: 3, APA: 2 }, traco: 'Manipulação Onírica (alvo dorme 1d4 rodadas, CD 17 resiste)', especial: 'Não precisa dormir. Comunicar com dormindo. Imune a ilusão. +3 em magias mentais' },
      { id: 'HECATE', name: 'Hecate', title: 'Deusa da Magia', attr: { AM: 5, INT: 2 }, traco: 'Tríplice Magia (pode lançar 3 feitiços/turno, custo PE normal)', especial: '+4 em todas as magias. CD +3. Pode preparar 1 magia de qualquer escola/dia' },
      { id: 'NIKE', name: 'Niké', title: 'Deusa da Vitória', attr: { DES: 3, FOR: 2, INT: 2, AM: 1 }, traco: 'Bênção da Vitória (+2 em tudo para aliados em 15m quando HP >50%)', especial: 'Garante 1 sucesso automático/dia. Ao matar inimigo: +1 PE a todos aliados' },
      { id: 'DEIMOS', name: 'Deimos', title: 'Deus do Terror', attr: { AM: 3, FOR: 3, APA: 2 }, traco: 'Aura de Terror (inimigos 10m: -3 em tudo, CD 19 resiste)', especial: 'Grito de Guerra: 1×/combate, inimigos em 15m testam CD 20 ou ficam apavorados 1d4 rodadas' },
      { id: 'BOREAS', name: 'Boreas', title: 'Deus dos Ventos', attr: { DES: 3, AM: 3, FOR: 2 }, traco: 'Domínio dos Ventos (empurra alvo 10m, 1×/turno)', especial: 'Voo: 12m/turno como ação. Vantagem contra projéteis (vento desvia). Dano vento: 2d6+AM' },
      { id: 'NEMESIS', name: 'Nemesis', title: 'Deusa da Vingança', attr: { FOR: 2, DES: 2, AM: 3, INT: 2 }, traco: 'Olho da Vingança (marque 1 alvo. Recebe +4 dano contra ele até o fim do combate)', especial: 'Quando aliado cai a 0 HP: +3 em tudo por 3 rodadas. Contra mesmo tipo: crítico em 19-20' },
      { id: 'HEBE', name: 'Hebe', title: 'Deusa da Vida', attr: { CON: 3, AM: 3, APA: 2 }, traco: 'Toco da Juventude (1×/dia: restaura 50% HP e remove condições)', especial: '+20 HP permanente. Aliados em 10m recuperam 2 HP/turno. Imune a envelhecimento' },
      { id: 'HESTICA', name: 'Héstica', title: 'Deusa do Fogo', attr: { AM: 4, CON: 2, FOR: 2 }, traco: 'Chama Eterna (fogo que não se apaga, 2d6+AM dano, controle total)', especial: 'Imune a fogo. Pode purificar objetos com fogo (remove maldições fracas). Aura quente: aliados em 5m resistem ao frio' },
    ],
    passivasRaciais: [
      { nome: 'Herança Divina', tipo: 'Passiva', custo: '—', duracao: 'Contínuo', efeito: 'Recebe os atributos do deus pai, o bônus numérico da linhagem e o poder descrito no caminho. CDs usam 15 + AM, salvo quando a linhagem define outro valor' },
      { nome: 'Presença Divina', tipo: 'Passiva', custo: '—', duracao: 'Contínuo', efeito: '+2 social. Aura de autoridade 10m: criaturas inferiores não atacam primeiro (CD 15+AM)' },
      { nome: 'Constituição Divina', tipo: 'Passiva', custo: '—', duracao: 'Contínuo', efeito: 'Imune a doenças. Não envelhece (1/100 velocidade). -2 dano mágico. +2 resistência mágica' },
    ],
    vantagens: [
      'Poder do deus pai sempre tem valor mecânico: dano, cura, CD, alcance, resistência ou bônus de ação',
      'Pode invocar o poder maior do pai 1×/descanso longo conforme a linhagem escolhida',
      'Não envelhece normalmente',
    ],
    desvantagens: [
      'Herda uma fraqueza específica do pai definida pelo mestre: -2 em testes contra domínio oposto ou +25% dano de fonte oposta',
      '-2 social com semideuses de outro deus',
      'Alvo de inimigos do deus pai e caçadores de semideuses',
      'Pode ser convocado pelo pai a qualquer momento',
    ],
    progressaoPoder: [
      { nivel: 1, ganho: 'Despertar Divino', desc: '+60 HP base. Recebe atributos do pai, bônus da linhagem, resistência/efeito listado e 1 poder de linhagem ativo' },
      { nivel: 10, ganho: 'Domínio I', desc: 'Poder de linhagem: +3 dano/cura ou +2 CD. Alcance/área +50%. +3 no maior atributo concedido pelo pai' },
      { nivel: 20, ganho: 'Domínio II', desc: 'Poder maior 2×/descanso. Poder de linhagem recebe +3 adicional. Aura divina 25m: aliados +2 resistência. +40 HP' },
      { nivel: 30, ganho: 'Ascensão Divina', desc: 'Poder maior 3×/dia. +4 nos atributos concedidos pelo pai. Reduz dano mágico recebido em 5 e envelhece apenas 1 ano a cada 1000 anos' },
    ],
    marcosExperiencia: [
      { marco: 'Derrotar criatura que o deus pai não conseguiria', ganho: 'Prova de Valor: +3 contra criaturas do mesmo tipo. +2 atributo principal' },
      { marco: 'Salvar civilização inteira', ganho: 'Bênção dos Mortais: +2 em todos os atributos. +50 HP' },
      { marco: 'Visitar o Olimpo e ser reconhecido', ganho: 'Sangue Despertado: linhagem +5. 1 poder adicional do pai. +3 AM permanente' },
      { marco: 'Completar 3 missões de deus diferente do pai', ganho: 'Respeito Panteão: +2 em tudo quando ao lado de semideuses de qualquer deus (cancela desvantagem de arrogância)' },
    ],
    dificuldade: 5,
  },

  HUMANO_MISTICO: {
    id: 'HUMANO_MISTICO', name: 'Humano Místico (Guardião)', category: 'lendaria', icon: '🌟',
    quote: '"Quando a mãe da terra chama, alguém deve responder."',
    desc: 'Raro. Um por geração. Escolhido por Gaia para ser Guardião. Começa fraco, mas escalona diferente — aprende TUDO. Sem restrição de triagem. Em late game, praticamente um deus.',
    layer0: { attrBonus: { AM: 2 }, hpMod: 15 },
    passivasRaciais: [
      { nome: 'Sincronia Mágica', tipo: 'Passiva', custo: '—', duracao: 'Contínuo', efeito: 'Triagem Principal e Sub-Triagem ao mesmo tempo (ignora N16). Qualquer triagem de qualquer classe. Qualquer magia/dom' },
      { nome: 'Sensibilidade ao Véu', tipo: 'Passiva', custo: '—', duracao: 'Contínuo', efeito: 'Detecta rupturas dimensionais, magia antiga e Abismo em 100m. Percepção mágica automática' },
      { nome: 'Evolução Acelerada', tipo: 'Passiva', custo: '—', duracao: 'Contínuo', efeito: 'XP +75% mágicas. Rituais de qualquer origem. -2 dano mágico recebido' },
    ],
    vantagens: [
      'Sem restrição de triagem — qualquer uma',
      'Rituais de qualquer origem',
      'Detecta Abismo e portais automaticamente',
    ],
    desvantagens: [
      'Alvo constante de caçadores e entidades',
      'Pressão social e moral enorme (esperado ser herói)',
      'Gaia pode impor missões imperativas (recusar = perder poder)',
      'Isolamento social (-1 em laços)',
    ],
    progressaoPoder: [
      { nivel: 1, ganho: 'Chamado de Gaia', desc: 'Traços ativos. Começa mais fraco que lendários. +2 Perícias mágicas' },
      { nivel: 10, ganho: 'Primeira Sincronia', desc: 'Triagens em harmonia. +3 AM permanente. +5 Pontos de Esqueleto' },
      { nivel: 15, ganho: 'Domínio Duplo', desc: 'Ambas triagens +1 nível. Pode trocar Sub mantendo progresso. +2 Módulos' },
      { nivel: 20, ganho: 'Conhecimento Ancestral', desc: 'Rituais perdidos de qualquer escola. +3 AM. +30 HP' },
      { nivel: 25, ganho: 'Poder Crescente', desc: '+3 AM permanente. 2 rituais simultâneos. Aura Guardião (aliados 15m +2 em resistência)' },
      { nivel: 30, ganho: 'Ascensão Guardião', desc: 'Poderes de Guardião Supremo. Selar portais. +5 AM total. Praticamente divino' },
    ],
    marcosExperiencia: [
      { marco: 'Completar 1 missão de Gaia', ganho: '+2 AM permanente. Sensibilidade ao Véu: 500m' },
      { marco: 'Selar 1 criatura do Abismo', ganho: 'Purificação: remove maldições com toque (CD 20)' },
      { marco: 'Unir 3+ facções contra ameaça comum', ganho: 'Liderança Guardiã: aliados 20m +2 resistência +2 PE/turno' },
      { marco: 'Salvar mundo de ameaça existencial', ganho: 'Guardião Supremo: +3 em todos os atributos. Aura 50m. Pode selar portais permanentemente' },
    ],
    dificuldade: 1,
  },
}

export function getRacaById(id) {
  return RACES[id] || null
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
    const escolherPart = bonus.escolherQtd ? `+${bonus.escolherQtd} ${bonus.escolherLabel || 'atributos à escolha'}` : ''
    return [escolherPart, ...parts].filter(Boolean).join(', ') || 'Variável'
  }
  const parts = []
  Object.entries(bonus).forEach(([k, v]) => {
    if (typeof v === 'number' && k !== 'escolherQtd') parts.push(`${v >= 0 ? '+' : ''}${v} ${k}`)
  })
  return parts.join(', ') || 'Nenhum'
}
