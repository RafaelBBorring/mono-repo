let mediaIdCounter = 1

function createMedia(type, photographerId) {
  return {
    id: `media-${mediaIdCounter++}`,
    type,
    price: type === 'photo' ? 15 : 25,
    photographerId,
  }
}

function createSurfer(name, mediaList) {
  return {
    id: `surfer-${name.toLowerCase().replace(/\s/g, '-')}-${mediaIdCounter}`,
    name,
    photoCount: mediaList.filter(m => m.type === 'photo').length,
    videoCount: mediaList.filter(m => m.type === 'video').length,
    media: mediaList,
  }
}

export const sessions = [
  {
    id: 'sess-1', eventId: 'evt-3', date: '2025-06-10', time: '08h - 09h', photographerId: 'ph-1',
    sides: {
      esquerdo: { surfers: [
        createSurfer('Joao Silva', [createMedia('photo','ph-1'), createMedia('photo','ph-1'), createMedia('video','ph-1'), createMedia('photo','ph-1'), createMedia('video','ph-1')]),
        createSurfer('Maria Santos', [createMedia('photo','ph-1'), createMedia('photo','ph-1'), createMedia('photo','ph-1'), createMedia('video','ph-1')]),
        createSurfer('Pedro Costa', [createMedia('photo','ph-1'), createMedia('video','ph-1'), createMedia('photo','ph-1')]),
      ]},
      direito: { surfers: [
        createSurfer('Ana Oliveira', [createMedia('photo','ph-1'), createMedia('photo','ph-1'), createMedia('video','ph-1'), createMedia('video','ph-1'), createMedia('photo','ph-1'), createMedia('photo','ph-1')]),
        createSurfer('Lucas Ferreira', [createMedia('photo','ph-1'), createMedia('photo','ph-1'), createMedia('video','ph-1')]),
      ]},
    },
  },
  {
    id: 'sess-2', eventId: 'evt-3', date: '2025-06-10', time: '09h - 10h', photographerId: 'ph-2',
    sides: {
      esquerdo: { surfers: [
        createSurfer('Beatriz Lima', [createMedia('photo','ph-2'), createMedia('video','ph-2'), createMedia('photo','ph-2'), createMedia('photo','ph-2')]),
        createSurfer('Carlos Souza', [createMedia('photo','ph-2'), createMedia('photo','ph-2'), createMedia('video','ph-2'), createMedia('photo','ph-2'), createMedia('video','ph-2')]),
      ]},
      direito: { surfers: [
        createSurfer('Diana Rocha', [createMedia('photo','ph-2'), createMedia('video','ph-2'), createMedia('photo','ph-2')]),
        createSurfer('Eduardo Martins', [createMedia('photo','ph-2'), createMedia('photo','ph-2'), createMedia('photo','ph-2'), createMedia('video','ph-2'), createMedia('video','ph-2')]),
        createSurfer('Fernanda Dias', [createMedia('photo','ph-2'), createMedia('video','ph-2')]),
      ]},
    },
  },
  {
    id: 'sess-3', eventId: 'evt-3', date: '2025-06-10', time: '10h - 11h', photographerId: 'ph-3',
    sides: {
      esquerdo: { surfers: [
        createSurfer('Gabriel Pereira', [createMedia('photo','ph-3'), createMedia('photo','ph-3'), createMedia('video','ph-3'), createMedia('photo','ph-3')]),
        createSurfer('Helena Gomes', [createMedia('video','ph-3'), createMedia('photo','ph-3'), createMedia('photo','ph-3'), createMedia('photo','ph-3'), createMedia('video','ph-3')]),
      ]},
      direito: { surfers: [
        createSurfer('Igor Nascimento', [createMedia('photo','ph-3'), createMedia('video','ph-3'), createMedia('photo','ph-3'), createMedia('video','ph-3')]),
      ]},
    },
  },
  {
    id: 'sess-4', eventId: 'evt-3', date: '2025-06-10', time: '11h - 12h', photographerId: 'ph-1',
    sides: {
      esquerdo: { surfers: [
        createSurfer('Julia Cardoso', [createMedia('photo','ph-1'), createMedia('photo','ph-1'), createMedia('video','ph-1')]),
      ]},
      direito: { surfers: [
        createSurfer('Kai Moreira', [createMedia('photo','ph-1'), createMedia('video','ph-1'), createMedia('photo','ph-1'), createMedia('photo','ph-1'), createMedia('video','ph-1'), createMedia('photo','ph-1')]),
        createSurfer('Larissa Ribeiro', [createMedia('photo','ph-1'), createMedia('video','ph-1')]),
      ]},
    },
  },
  {
    id: 'sess-5', eventId: 'evt-4', date: '2025-06-09', time: '08h - 09h', photographerId: 'ph-2',
    sides: {
      esquerdo: { surfers: [
        createSurfer('Ricardo Almeida', [createMedia('photo','ph-2'), createMedia('video','ph-2'), createMedia('photo','ph-2')]),
        createSurfer('Sara Mendes', [createMedia('photo','ph-2'), createMedia('photo','ph-2'), createMedia('video','ph-2'), createMedia('photo','ph-2')]),
      ]},
      direito: { surfers: [
        createSurfer('Tomas Ferreira', [createMedia('photo','ph-2'), createMedia('video','ph-2'), createMedia('photo','ph-2'), createMedia('video','ph-2')]),
      ]},
    },
  },
  {
    id: 'sess-6', eventId: 'evt-4', date: '2025-06-09', time: '09h - 10h', photographerId: 'ph-1',
    sides: {
      esquerdo: { surfers: [
        createSurfer('Vanessa Lopes', [createMedia('photo','ph-1'), createMedia('photo','ph-1'), createMedia('video','ph-1')]),
      ]},
      direito: { surfers: [
        createSurfer('Wagner Santos', [createMedia('photo','ph-1'), createMedia('video','ph-1'), createMedia('photo','ph-1'), createMedia('photo','ph-1')]),
        createSurfer('Xuxa Torres', [createMedia('photo','ph-1'), createMedia('video','ph-1')]),
      ]},
    },
  },
  {
    id: 'sess-7', eventId: 'evt-5', date: '2025-06-08', time: '08h - 09h', photographerId: 'ph-3',
    sides: {
      esquerdo: { surfers: [
        createSurfer('Yuri Costa', [createMedia('photo','ph-3'), createMedia('video','ph-3'), createMedia('photo','ph-3'), createMedia('video','ph-3')]),
      ]},
      direito: { surfers: [
        createSurfer('Zara Oliveira', [createMedia('photo','ph-3'), createMedia('photo','ph-3'), createMedia('video','ph-3')]),
        createSurfer('André Lima', [createMedia('photo','ph-3'), createMedia('video','ph-3'), createMedia('photo','ph-3'), createMedia('photo','ph-3'), createMedia('video','ph-3')]),
      ]},
    },
  },
  {
    id: 'sess-8', eventId: 'evt-6', date: '2025-06-07', time: '09h - 10h', photographerId: 'ph-1',
    sides: {
      esquerdo: { surfers: [
        createSurfer('Bruna Marquezine', [createMedia('photo','ph-1'), createMedia('photo','ph-1'), createMedia('video','ph-1')]),
        createSurfer('Caio Ribeiro', [createMedia('photo','ph-1'), createMedia('video','ph-1'), createMedia('photo','ph-1'), createMedia('video','ph-1')]),
      ]},
      direito: { surfers: [
        createSurfer('Duda Pacheco', [createMedia('photo','ph-1'), createMedia('video','ph-1'), createMedia('photo','ph-1')]),
      ]},
    },
  },
]

export function getAllSurfers() {
  const surfers = []
  sessions.forEach(s => {
    ['esquerdo', 'direito'].forEach(side => {
      s.sides[side].surfers.forEach(surfer => {
        surfers.push({ ...surfer, sessionId: s.id, sessionTime: s.time, date: s.date, side, photographerId: s.photographerId })
      })
    })
  })
  return surfers
}

export function getSurferById(id) {
  return getAllSurfers().find(s => s.id === id)
}

export function getSessionsByEvent(eventId) {
  return sessions.filter(s => s.eventId === eventId)
}

export function getSessionsByDate(date) {
  return sessions.filter(s => s.date === date)
}
