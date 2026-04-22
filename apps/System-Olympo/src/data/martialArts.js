export const MARTIAL_ARTS = [
  {
    id: 'boxe',
    name: 'Boxe',
    graus: {
      0: { nome: 'Novato', desc: '+15% FOR no soco.' },
      1: { nome: 'Treinado', desc: '+2 no Resultado (1 PE).' },
      2: { nome: 'Formado', desc: '+30% FOR no soco.' },
      3: { nome: 'Especialista', desc: 'Ataca 2× (4 PE).' },
    },
  },
  {
    id: 'karate',
    name: 'Karatê',
    graus: {
      0: { nome: 'Novato', desc: 'Contra-Ataque (4 PE).' },
      1: { nome: 'Treinado', desc: 'Vantagem na reação (3×/combate).' },
      2: { nome: 'Formado', desc: 'Vantagem sempre no Contra-Ataque.' },
      3: { nome: 'Especialista', desc: 'Reação garantida (10 PE, 3×).' },
    },
  },
  {
    id: 'muay_thai',
    name: 'Muay Thai',
    graus: {
      0: { nome: 'Novato', desc: 'Vantagem no Ataque (3×/combate).' },
      1: { nome: 'Treinado', desc: 'Agarrar após acertar (4 PE).' },
      2: { nome: 'Formado', desc: '+2 no Resultado do Ataque (4 PE).' },
      3: { nome: 'Especialista', desc: '+1 ataque extra em Crítico.' },
    },
  },
  {
    id: 'judo',
    name: 'Judô',
    graus: {
      0: { nome: 'Novato', desc: 'Desvantagem oposta ao reagir (5×/combate).' },
      1: { nome: 'Treinado', desc: 'Derrubar alvo (5 PE, FOR vs FOR).' },
      2: { nome: 'Formado', desc: '+5 resultado vs alvo imobilizado.' },
      3: { nome: 'Especialista', desc: 'Imobiliza por 3 Rodadas (10 PE).' },
    },
  },
  {
    id: 'taekwondo',
    name: 'Taekwondo',
    graus: {
      0: { nome: 'Novato', desc: 'Chutes com alcance maior.' },
      1: { nome: 'Treinado', desc: '+20% FOR aos chutes.' },
      2: { nome: 'Formado', desc: '+10 no Chute (3×/combate).' },
      3: { nome: 'Especialista', desc: 'Distância ampliada (4 PE).' },
    },
  },
  {
    id: 'aikido',
    name: 'Aikido',
    graus: {
      0: { nome: 'Novato', desc: '+5 na reação (2 PE).' },
      1: { nome: 'Treinado', desc: 'Desarmar ao acertar (5 PE).' },
      2: { nome: 'Formado', desc: 'Contra-atacar sem penalidade por falha.' },
      3: { nome: 'Especialista', desc: 'Contra-ataque com 1 Sucesso Extra (3×).' },
    },
  },
]

export const GRAU_LABELS = ['Novato', 'Treinado', 'Formado', 'Especialista']
