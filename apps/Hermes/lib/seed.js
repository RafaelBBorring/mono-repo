function iso(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString();
}

export const EMERGENCY_SEED = [
  {
    id: 'SEED:fallback-1',
    source: 'SEED',
    title: ' PNCP indisponível — conjunto de segurança',
    organ: 'Hermes',
    modality: 'Demonstração',
    scope: 'software',
    publishedAt: iso(-1),
    deadlineAt: iso(15),
    estimatedValue: null,
    currency: 'BRL',
    region: 'Nacional',
    description: 'O serviço do PNCP está temporariamente indisponível. Acione “Nova varredura” para tentar novamente. Em operação normal, o Hermes lista editais reais e ativos capturados diretamente da API pública do PNCP.',
    applyUrl: 'https://pncp.gov.br/app/editais',
    documentUrl: 'https://pncp.gov.br/app/editais'
  }
];
