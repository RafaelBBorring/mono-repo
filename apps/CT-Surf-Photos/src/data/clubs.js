export const clubs = [
  {
    id: 'club-caparica',
    name: 'Costa da Caparica',
    location: 'Almada, Portugal',
    description: 'Praia principal com as melhores ondas da regiao',
    image: null,
    active: true,
  },
  {
    id: 'club-carcavelos',
    name: 'Carcavelos',
    location: 'Cascais, Portugal',
    description: 'Praia com swell consistente e comunidade ativa',
    image: null,
    active: true,
  },
  {
    id: 'club-ericeira',
    name: 'Ericeira',
    location: 'Mafra, Portugal',
    description: 'Reserva Mundial de Surf — ondas world-class',
    image: null,
    active: true,
  },
]

export const events = [
  {
    id: 'evt-1',
    title: 'Sessao de Quinta',
    date: '2025-06-12',
    clubId: 'club-caparica',
    status: 'ativo',
  },
  {
    id: 'evt-2',
    title: 'Sessao de Quarta',
    date: '2025-06-11',
    clubId: 'club-caparica',
    status: 'ativo',
  },
  {
    id: 'evt-3',
    title: 'Sessao de Terca',
    date: '2025-06-10',
    clubId: 'club-caparica',
    status: 'encerrado',
  },
  {
    id: 'evt-4',
    title: 'Sessao de Segunda',
    date: '2025-06-09',
    clubId: 'club-carcavelos',
    status: 'encerrado',
  },
  {
    id: 'evt-5',
    title: 'Sessao de Domingo',
    date: '2025-06-08',
    clubId: 'club-carcavelos',
    status: 'encerrado',
  },
  {
    id: 'evt-6',
    title: 'Sessao de Sabado',
    date: '2025-06-07',
    clubId: 'club-ericeira',
    status: 'encerrado',
  },
  {
    id: 'evt-7',
    title: 'Sessao de Sexta',
    date: '2025-06-06',
    clubId: 'club-ericeira',
    status: 'encerrado',
  },
]

export function getClubById(id) { return clubs.find(c => c.id === id) }
export function getEventsByClub(clubId) { return events.filter(e => e.clubId === clubId) }
export function getEventById(id) { return events.find(e => e.id === id) }
