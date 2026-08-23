export function answerDemoQuestion(question, mode = 'canon') {
  const normalized = question
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
  const isCreativePlan = mode === 'create' && ['episod', 'campanha', 'nova orleans', 'primordiais', 'arco', 'cena', 'gancho'].some((term) => normalized.includes(term))

  if (isCreativePlan) {
    return {
      answerState: 'creative',
      content: 'Preparei um arco em três episódios que parte do estado atual de Nova Orleans sem transformar as sugestões em cânone. A progressão começa com uma pista sobre Silas, atravessa a ruptura do bayou e termina em uma escolha sobre o Véu. Abra cada episódio para ver os fatos usados, as lacunas preservadas e a proposta criativa.',
      citations: [
        { label: 'Episódios 16–18', source: 'Linha do Tempo', confidence: 'confirmado' },
        { label: 'Mapa de facções', source: 'Facções & Famílias', confidence: 'confirmado' },
        { label: 'Cosmologia v2', source: 'Universe Board', confidence: 'ambíguo' },
      ],
      followUp: 'Quer que eu desenvolva as cenas do primeiro episódio ou ajuste o arco para um tom mais político, investigativo ou sobrenatural?',
      suggestions: ['Desenvolva as cenas do episódio 1', 'Deixe o arco mais investigativo', 'Crie ganchos para cada personagem'],
      presentation: {
        type: 'story-plan',
        title: 'Próximos passos em Nova Orleans',
        subtitle: 'Rascunho criativo · 3 episódios',
        episodes: [
          {
            number: '01',
            title: 'A procissão sem santos',
            hook: 'Os Primordiais descobrem um ritual atravessando o French Quarter.',
            canon: 'A Ordem do Sal vigia as rupturas no Véu e Silas continua desaparecido.',
            gap: 'O objetivo do grupo no Cemitério Lafayette ainda não foi registrado.',
            idea: 'A procissão oferece uma pista sobre Silas, mas cobra uma memória de cada personagem.',
          },
          {
            number: '02',
            title: 'O nome no fundo do rio',
            hook: 'Uma aliança improvável leva o grupo de volta ao bayou.',
            canon: 'A ruptura temporal do bayou apareceu pela primeira vez no episódio 16.',
            gap: 'Não existe confirmação sobre quem controla a passagem.',
            idea: 'A travessia força uma escolha entre recuperar uma verdade e preservar uma relação.',
          },
          {
            number: '03',
            title: 'Tudo que o Véu devolve',
            hook: 'As consequências convergem em uma decisão que muda Nova Orleans.',
            canon: 'O Clã Carmesim mantém influência política no French Quarter.',
            gap: 'As fontes divergem sobre a origem do Véu.',
            idea: 'Revele apenas parte da origem e transforme a contradição no motor do próximo arco.',
          },
        ],
      },
    }
  }

  if (mode === 'investigate' && ['mister', 'conflit', 'abert', 'ponta solta', 'lacuna', 'contrad'].some((term) => normalized.includes(term))) {
    return {
      answerState: 'mixed',
      content: 'Há três pontos que merecem investigação: o objetivo não documentado da cena no Cemitério Lafayette, as duas versões incompatíveis sobre a origem do Véu e a identidade ainda incerta do retrato ligado à Família Laurent. O primeiro afeta diretamente a campanha atual; eu começaria por ele.',
      citations: [
        { label: 'Episódio 18 · região 8', source: 'Linha do Tempo', confidence: 'inferência visual' },
        { label: 'Cosmologia v2', source: 'Universe Board', confidence: 'confirmado' },
        { label: 'Relato de Agnes Bell', source: 'Universe Board', confidence: 'confirmado' },
      ],
      followUp: 'Quer comparar as evidências sobre o Véu ou reconstruir o contexto ausente do cemitério?',
      suggestions: ['Compare as versões sobre o Véu', 'Investigue a cena do cemitério'],
      presentation: {
        type: 'constellation',
        state: 'mixed',
        title: 'Pontas soltas',
        subtitle: '3 investigações abertas',
        initials: '?',
        nodes: [
          { label: 'Cemitério Lafayette', kind: 'cena incompleta', state: 'inferred' },
          { label: 'Origem do Véu', kind: 'contradição', state: 'inferred' },
          { label: 'Retrato de Éloïse', kind: 'identidade incerta', state: 'inferred' },
        ],
      },
    }
  }

  if (normalized.includes('silas')) {
    return {
      answerState: 'mixed',
      content: 'Silas Vane é um feiticeiro e pesquisador do Véu ligado à Ordem do Sal. As fontes confirmam que ele está em Nova Orleans e aparece no episódio 18 ao lado de Maëlle e Jonas, próximo às referências do Cemitério Lafayette. O motivo exato da ida ao cemitério não foi registrado; a hipótese de que investigavam a ruptura é uma inferência, não um fato canônico.',
      citations: [
        { label: 'Ficha de Silas', source: 'Universe Board', confidence: 'confirmado' },
        { label: 'Episódio 18 · região 8', source: 'Linha do Tempo', confidence: 'inferência visual' },
      ],
      followUp: 'Você quer registrar o que realmente aconteceu no cemitério?',
      presentation: {
        type: 'character',
        state: 'mixed',
        title: 'Silas Vane',
        subtitle: 'Feiticeiro · pesquisador do Véu',
        initials: 'SV',
        nodes: [
          { label: 'Ordem do Sal', kind: 'organização', state: 'confirmed' },
          { label: 'Nova Orleans', kind: 'local atual', state: 'confirmed' },
          { label: 'Cemitério Lafayette', kind: 'cena associada', state: 'inferred' },
          { label: 'O Véu', kind: 'campo de estudo', state: 'confirmed' },
        ],
      },
    }
  }
  if (normalized.includes('facc') || normalized.includes('organiza')) {
    return {
      answerState: 'mixed',
      content: 'As organizações mais recorrentes são a Ordem do Sal, o Clã Carmesim, a Família Laurent e as Sete Casas. A Ordem do Sal e o Clã Carmesim têm relações explícitas com a campanha atual. A classificação das Sete Casas como uma única facção ainda é ambígua nas fontes.',
      citations: [
        { label: 'Mapa de facções', source: 'Facções & Famílias', confidence: 'confirmado' },
        { label: 'Cosmologia v2', source: 'Universe Board', confidence: 'ambíguo' },
      ],
      presentation: {
        type: 'constellation',
        state: 'mixed',
        title: 'Ordem do Sal',
        subtitle: 'órbita de poder atual',
        initials: 'OS',
        nodes: [
          { label: 'Silas Vane', kind: 'membro ligado', state: 'confirmed' },
          { label: 'Clã Carmesim', kind: 'pacto', state: 'confirmed' },
          { label: 'Sete Casas', kind: 'classificação ambígua', state: 'inferred' },
          { label: 'O Véu', kind: 'objeto de estudo', state: 'confirmed' },
        ],
      },
    }
  }
  if (['episod', 'campanha', 'nova orleans', 'estado atual', 'historia', 'ultim', 'recent'].some((term) => normalized.includes(term))) {
    return {
      answerState: 'mixed',
      content: 'Nos dois episódios mais recentes, o grupo primeiro se infiltrou no baile do Clã Carmesim e descobriu um pacto com a Ordem do Sal. Depois, Silas, Maëlle e Jonas foram associados visualmente ao Cemitério Lafayette. Não encontrei registro do objetivo, conflito ou desfecho dessa segunda cena, então não consigo completar esse acontecimento sem sua confirmação.',
      citations: [
        { label: 'Episódio 17 · notas completas', source: 'Linha do Tempo', confidence: 'confirmado' },
        { label: 'Episódio 18 · região 8', source: 'Linha do Tempo', confidence: 'inferência visual' },
      ],
      followUp: 'O que eles pretendiam fazer no Cemitério Lafayette?',
      presentation: {
        type: 'scene',
        state: 'mixed',
        title: 'Os nomes que as pedras guardam',
        subtitle: 'Episódio 18 · associação espacial',
        location: 'Cemitério Lafayette',
        entities: [
          { id: 'silas', name: 'Silas', initials: 'SV', confidence: 96, accent: '#d7b26d' },
          { id: 'maelle', name: 'Maëlle', initials: 'ML', confidence: 82, state: 'inferred', accent: '#baa0f6' },
          { id: 'jonas', name: 'Jonas', initials: 'JR', confidence: 81, state: 'inferred', accent: '#83bdf0' },
        ],
        unknown: 'Objetivo, conflito e desfecho não registrados',
      },
    }
  }
  return {
    answerState: 'unknown',
    content: 'Não encontrei informação suficiente nas fontes indexadas para responder isso como fato do seu universo. Posso procurar por nomes relacionados ou você pode me contar o contexto ausente; antes de incorporá-lo ao cânone, mostrarei exatamente o que será salvo.',
    citations: [],
    followUp: 'Qual parte dessa informação já está definida por você?',
    presentation: {
      type: 'unknown',
      title: 'Nenhuma evidência suficiente encontrada',
      unknown: 'Esta área permanece vazia até que uma fonte ou uma confirmação sua defina o que pertence ao universo.',
    },
  }
}
