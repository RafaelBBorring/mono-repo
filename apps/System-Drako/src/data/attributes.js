export const ATTRIBUTES = [
  {
    key: 'for',
    name: 'Força',
    short: 'FOR',
    color: '#c0392b',
    blurb: 'Relação com o mundo físico. Dano corpo a corpo, resistência a impactos, força bruta.',
    desc: 'Representa a relação do personagem com o mundo físico. Define dano em combate corpo a corpo, resistência a impactos e qualquer situação onde o corpo precise ser uma ferramenta. Força alta sem controle destrói o que não deveria. Força alta sem Vontade esgota rápido.'
  },
  {
    key: 'agi',
    name: 'Agilidade',
    short: 'AGI',
    color: '#27ae60',
    blurb: 'Reflexos, precisão e posicionamento. Defesa tanto quanto ataque.',
    desc: 'É o atributo do tempo certo. Governa reflexos, precisão e posicionamento. Em combate é defesa tanto quanto ataque — esquivar, se posicionar, criar ou fechar distância no momento exato.'
  },
  {
    key: 'per',
    name: 'Percepção',
    short: 'PER',
    color: '#2980b9',
    blurb: 'Lê ambientes, pessoas e situações antes dos outros perceberem.',
    desc: 'O atributo de quem presta atenção. Lê ambientes, pessoas e situações antes que os outros percebam. Nota detalhes físicos, rastros, sons e objetos fora do lugar — mas também lê o que as pessoas não dizem.'
  },
  {
    key: 'int',
    name: 'Intelecto',
    short: 'INT',
    color: '#8e44ad',
    blurb: 'Qualidade do pensamento, não o volume de conhecimento.',
    desc: 'A qualidade do pensamento, não o volume de conhecimento. Define quantas variáveis o personagem sustenta simultaneamente, com que velocidade aprende e adapta, com que clareza enxerga causa e efeito.'
  },
  {
    key: 'von',
    name: 'Vontade',
    short: 'VON',
    color: '#d35400',
    blurb: 'O que resta quando tudo falha. Agir apesar do medo.',
    desc: 'O que resta quando tudo falha. Não é ausência de medo — é agir apesar dele. Sustenta o personagem além dos limites físicos e psicológicos, resiste a coerção, mantém segredos sob pressão.'
  },
  {
    key: 'pre',
    name: 'Presença',
    short: 'PRE',
    color: '#e67e22',
    blurb: 'Mudar o ambiente ao entrar nele. Peso, não simpatia.',
    desc: 'Mudar o ambiente ao entrar nele. Funciona pela admiração, pelo medo, pela lealdade, pela autoridade — não tem alinhamento moral. A sensação de que aquela figura importa.'
  },
  {
    key: 'am',
    name: 'Aura Mágica',
    short: 'AM',
    color: '#16a085',
    blurb: 'O que permeia todo ser vivo. Inerte em níveis baixos, moldável quando cresce.',
    desc: 'O que permeia todo ser vivo, consciente ou não. Em níveis baixos é inerte. À medida que cresce começa a vazar passivamente. Quem a desenvolve conscientemente molda o arcano com intenção.'
  }
]

export const ATTR_BY_KEY = Object.fromEntries(ATTRIBUTES.map(a => [a.key, a]))

export const SCALE = [
  { v: 1, label: 'Debilitação', note: 'Limitação severa naquela dimensão.' },
  { v: 2, label: 'Abaixo da média', note: 'Fraco na área.' },
  { v: 3, label: 'Comum', note: 'Pessoa comum funcional.' },
  { v: 4, label: 'Acima da média', note: 'Notavelmente acima da média.' },
  { v: 5, label: 'Atleta / Especialista', note: 'Nível de especialista dedicado.' },
  { v: 6, label: 'Pico humano', note: 'O máximo que um ser humano atinge por meios naturais.' },
  { v: 7, label: 'Limiar sobre-humano', note: 'Nenhum treino convencional explica.' },
  { v: 8, label: 'Extraordinário', note: 'Inequívoco e raro.' },
  { v: 9, label: 'Arquétipo', note: 'Entra em mitos; redefine o possível.' },
  { v: 10, label: 'Absoluto', note: 'O limite máximo daquele mundo.' }
]

export const DIFFICULTIES = [
  { succ: 1, label: 'Trivial', note: 'Escalar uma parede com apoios.' },
  { succ: 2, label: 'Moderada', note: 'Persuadir um guarda desconfiado.' },
  { succ: 3, label: 'Difícil', note: 'Operar em silêncio absoluto.' },
  { succ: 4, label: 'Extrema', note: 'Enganar um especialista na própria área.' },
  { succ: 5, label: 'Lendária', note: 'Feitos que entram para a história.' }
]
