export const BOX_TYPES = [
  {
    id: 'universe_rules',
    name: 'Regras do Universo',
    description: 'Sistemas, leis, cosmologia, mecânicas mágicas e tom geral.',
    accent: '#d9b777',
    detectionHints: ['sistema', 'magia', 'regra', 'leis', 'mecânica', 'cosmologia'],
  },
  {
    id: 'world_history',
    name: 'História do Mundo',
    description: 'Linha do tempo canônica, eventos passados, mitos fundadores.',
    accent: '#baa0f6',
    detectionHints: ['anos atrás', 'antigamente', 'guerra', 'fundação', 'império', 'era'],
  },
  {
    id: 'main_characters',
    name: 'Personagens Principais',
    description: 'Protagonistas recorrentes com nome próprio e arco narrativo.',
    accent: '#79d9b1',
    detectionHints: ['silas', 'protagonista', 'herói', 'líder'],
    isEntityBox: true,
    entityCategory: 'main',
  },
  {
    id: 'secondary_characters',
    name: 'Personagens Secundários',
    description: 'NPCs, aliados, antagonistas secundários e figuras menores.',
    accent: '#83bdf0',
    detectionHints: ['mercadante', 'guarda', 'vizinho'],
    isEntityBox: true,
    entityCategory: 'secondary',
  },
  {
    id: 'races_species',
    name: 'Raças e Espécies',
    description: 'Povos, criaturas, etnias e suas características biológicas/culturais.',
    accent: '#f0c875',
    detectionHints: ['elfo', 'anão', 'raca', 'espécie', 'criatura'],
    isEntityBox: true,
    entityCategory: 'race',
  },
  {
    id: 'factions_groups',
    name: 'Grupos e Facções',
    description: 'Ordens, guildas, organizações, bandos, governos.',
    accent: '#ec8992',
    detectionHints: ['ordem', 'guilda', 'facção', 'conselho', 'império'],
    isEntityBox: true,
    entityCategory: 'faction',
  },
  {
    id: 'places_geography',
    name: 'Lugares e Geografia',
    description: 'Cidades, regiões, biome, construções relevantes.',
    accent: '#a8d6c1',
    detectionHints: ['cidade', 'reino', 'montanha', 'rio', 'templo'],
    isEntityBox: true,
    entityCategory: 'place',
  },
  {
    id: 'artifacts_items',
    name: 'Artefatos e Itens',
    description: 'Objetos mágicos, relíquias, tecnologias com importância narrativa.',
    accent: '#c5a3e8',
    detectionHints: ['relíquia', 'artefato', 'espada', 'tombo', 'amuleto'],
    isEntityBox: true,
    entityCategory: 'artifact',
  },
  {
    id: 'campaigns_episodes',
    name: 'Campanhas e Episódios',
    description: 'Acontecimentos narrativos, sessões jogadas, capítulos escritos.',
    accent: '#79b6d9',
    detectionHints: ['episódio', 'campanha', 'sessão', 'capítulo'],
    isEntityBox: true,
    entityCategory: 'event',
  },
]

export const BOX_STAGES = [
  { id: 'collect', label: 'Coleta', description: 'Extrair trechos brutos das fontes relacionados ao tema da caixa.' },
  { id: 'review_classify', label: 'Revisão de classificação', description: 'Verificar se os itens foram para a caixa certa.' },
  { id: 'rewrite', label: 'Lapidação', description: 'Resumir em bullet points e polir a escrita.' },
  { id: 'review_canon', label: 'Revisão canônica', description: 'Confirmar que nenhuma informação foi alterada ou perdida.' },
]

export const DISCARD_REASONS = [
  { id: 'misclassified', label: 'Fora de contexto' },
  { id: 'redundant', label: 'Redundante' },
  { id: 'trivia', label: 'Trivia sem peso narrativo' },
  { id: 'contradiction', label: 'Contradição não resolvida' },
  { id: 'unusable', label: 'Ilegível ou incompleto' },
]

export function emptyBoxState() {
  const boxes = {}
  for (const type of BOX_TYPES) {
    boxes[type.id] = { items: [], stage: 'pending', reviewed: false }
  }
  return {
    boxes,
    discards: [],
    stage: 'idle',
    progress: 0,
    currentBoxId: null,
    currentStageId: null,
    lastUpdate: null,
  }
}

export function newBoxItem(partial = {}) {
  return {
    id: crypto.randomUUID(),
    title: partial.title || 'Item sem título',
    excerpt: partial.excerpt || '',
    polished: partial.polished || '',
    bulletPoints: partial.bulletPoints || [],
    sources: partial.sources || [],
    confidence: partial.confidence || 0,
    reviewNote: partial.reviewNote || '',
    status: partial.status || 'pending',
    createdAt: Date.now(),
  }
}
