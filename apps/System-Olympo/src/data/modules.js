export const MODULES_PASSIVE = [
  { id: 'treino_intensivo', name: 'Treino Intensivo', desc: '+2 Perícias Treinadas (permanente).', req: 'Nenhum', maxBuy: 3, bought: 0 },
  { id: 'fortuna_inicial', name: 'Fortuna Inicial', desc: '+1500 Pontos de Economia para distribuir entre Dólares e Dracmas.', req: 'Nenhum' },
  { id: 'empreendedor', name: 'Empreendedor', desc: '+1000 Pontos de Economia por sessão.', req: 'Nenhum', maxBuy: 2, bought: 0 },
  { id: 'sentidos_agucados', name: 'Sentidos Aguçados', desc: '+1d6 em Testes de Percepção.', req: 'Nenhum' },
  { id: 'informativo', name: 'Informativo', desc: '+1d6 em Testes de Conhecimento.', req: 'INT 12+' },
  { id: 'especialista_terreno', name: 'Especialista em Terreno', desc: 'Vantagem em Testes Físicos em um Terreno escolhido.', req: 'Nenhum' },
  { id: 'contatos_influentes', name: 'Contatos Influentes', desc: '1×/Missão — Chama favor de NPC com Recursos.', req: 'APA 12+ ou N6+' },
  { id: 'recuperacao_acelerada', name: 'Recuperação Acelerada', desc: 'Recupera +50% de Energia/PE em Descansos Curtos.', req: 'Nenhum' },
  { id: 'portador_nato', name: 'Portador Nato', desc: '+6 kg de Capacidade de Carga por compra.', req: 'CON 12+', maxBuy: 3, bought: 0 },
  { id: 'maestria_armamento', name: 'Maestria em Armamento', desc: 'Permite usar armas de 1 rank acima do permitido pelo nível.', req: 'Nível 10+', maxBuy: 2, bought: 0 },
  { id: 'especializacao_arma', name: 'Especialização em Arma', desc: '2 Vantagens com Arma escolhida para gastar no combate.', req: 'Nível 8+' },
  { id: 'conhecimento_amplificado', name: 'Conhecimento Amplificado', desc: 'Aprende 01 Habilidade comum Extra (exceto Ult & Passiva).', req: 'INT 16+, AM 14+', maxBuy: 3, bought: 0 },
  { id: 'aumento_poder', name: 'Aumento de Poder', desc: 'Concede +1 PEH para investir em evolução de habilidades.', req: 'N12+, AM 18+', maxBuy: 2, bought: 0 },
  { id: 'estudos_alquimia', name: 'Estudos de Alquimia', desc: 'Desbloqueia a disciplina de Alquimia.', req: 'INT 14+' },
  { id: 'vinculo_runico', name: 'Vínculo Rúnico', desc: 'Desbloqueia a disciplina de Runes.', req: 'CON 14+ ou FOR 14+' },
  { id: 'pensamento_agil', name: 'Pensamento Ágil', desc: '+1 teste de Investigação adicional por cena.', req: 'INT 14+' },
  { id: 'ferramentas_misticas', name: 'Ferramentas Místicas', desc: 'Ativa 1 item mágico sem gastar PE. 1×/dia por item.', req: 'AM 12+' },
  { id: 'identificacao_magica', name: 'Identificação Mágica', desc: 'Vantagem detectar/identificar magia. +3 Furtividade com AM.', req: 'AM 12+' },
  { id: 'hacker', name: 'Hacker', desc: 'Vantagem em Conhecimento: Computação.', req: 'INT 12+' },
  { id: 'arcanismo', name: 'Arcanismo', desc: '+30% Efeitos de 1 Habilidade (exceto Ult) a 2× Energia. Custo sobe a cada uso.', req: 'N15+, AM 20+' },
]

export const MODULES_ACTIVE = [
  { id: 'corpo_resiliente', name: 'Corpo Resiliente', pe: 8, desc: '+8% Vida máxima e +2 Fortitude por 5 rodadas.', req: 'CON 14+' },
  { id: 'inabalavel', name: 'Inabalável', pe: 5, desc: 'Vantagem em Teste de Vontade por 3 rodadas.', req: 'Nenhum' },
  { id: 'postura_defensiva', name: 'Postura Defensiva', pe: 4, desc: '+2 CA por 3 rodadas, ataques sofridos com −1d6 no resultado.', req: 'Nenhum' },
  { id: 'postura_bastiao', name: 'Postura Bastião', pe: 12, desc: 'Postura 3 rodadas: −30% dano recebido, −20% dano causado.', req: 'CON 16+ ou Nível 15+' },
  { id: 'postura_berserker', name: 'Postura Berserker', pe: 10, desc: 'Postura 3 rodadas: +30% dano causado, +20% dano sofrido.', req: 'FOR 16+ ou Nível 15+' },
  { id: 'golpe_devastador', name: 'Golpe Devastador', pe: 12, desc: 'Próximo ataque: +80% FOR no dano e −1 na margem de Crítico.', req: 'FOR 14+' },
  { id: 'mira_letal', name: 'Mira Letal', pe: 12, desc: '+80% INT ao próximo ataque ranged e −1 na margem de Crítico.', req: 'INT 14+' },
  { id: 'critico_aprimorado', name: 'Crítico Aprimorado', pe: 8, desc: 'Reduz margem de crítico em −2 (fixo enquanto ativo).', req: 'DES 14+ ou FOR 14+' },
  { id: 'reflexos_apurados', name: 'Reflexos Apurados', pe: 8, desc: '+2 Reações nesta rodada.', req: 'DES 14+' },
  { id: 'velocista', name: 'Velocista', pe: 10, desc: '+1 Ação de Movimento neste turno.', req: 'DES 12+' },
  { id: 'vinculo_combate', name: 'Vínculo de Combate', pe: 5, desc: 'Você e 1 aliado compartilham iniciativa por 3 rodadas.', req: 'Nível 5+' },
  { id: 'presenca_intimidadora', name: 'Presença Intimidadora', pe: 4, desc: 'Inimigos têm desvantagem em Vontade vs Intimidação.', req: 'APA 12+ ou FOR 14+' },
  { id: 'primeira_impressao', name: 'Primeira Impressão', pe: 3, desc: '+1d6 em aparência/persuasão/enganação.', req: 'APA 12+' },
  { id: 'golpe_preciso', name: 'Golpe Preciso', pe: 5, desc: 'Ataque furtivo ignora 5 pontos de armadura.', req: 'DES 14+' },
  { id: 'mestre_disfarce', name: 'Mestre do Disfarce', pe: 4, desc: 'Vantagem em Enganação/Furtividade por 1 hora.', req: 'Nenhum' },
  { id: 'rajada_automatica', name: 'Rajada Automática', pe: 5, desc: 'Ao acertar ranged, dispara novamente com desvantagem. Máx 2 extras.', req: 'DES 14+' },
  { id: 'sobrecarga_arcana', name: 'Sobrecarga Arcana', pe: 15, desc: 'Próxima Habilidade: +40% Dano OU +2 Rodadas de Duração.', req: 'AM 16+' },
  { id: 'reserva_arcana', name: 'Reserva Arcana', pe: 8, desc: '+40% AM como Energia máxima.', req: 'AM 16+' },
  { id: 'trilha_certa', name: 'Trilha Certa', pe: 3, desc: '+5 no próximo teste de Investigação/Percepção.', req: 'INT 12+' },
  { id: 'maos_rapidas', name: 'Mãos Rápidas', pe: 5, desc: '1 teste de Crime como ação livre por turno.', req: 'DES 14+' },
]

export const MODULES_SPECIAL = []

export const ALL_MODULES = {
  passivos: MODULES_PASSIVE,
  especiais: MODULES_SPECIAL,
  ativos: MODULES_ACTIVE,
}

export const MODULE_PRESETS = [
  {
    id: 'combate',
    name: 'Combate',
    icon: 'swords',
    desc: 'Foco em dano corpo-a-corpo e críticos.',
    modules: [
      { id: 'golpe_devastador', type: 'ativo' },
      { id: 'critico_aprimorado', type: 'ativo' },
      { id: 'treino_intensivo', type: 'passivo' },
      { id: 'postura_berserker', type: 'ativo' },
    ],
  },
  {
    id: 'arcano',
    name: 'Arcano',
    icon: 'auto_awesome',
    desc: 'Amplificação mágica e evolução de habilidades.',
    modules: [
      { id: 'sobrecarga_arcana', type: 'ativo' },
      { id: 'arcanismo', type: 'passivo' },
      { id: 'aumento_poder', type: 'passivo' },
      { id: 'reserva_arcana', type: 'ativo' },
    ],
  },
  {
    id: 'tatico',
    name: 'Tático',
    icon: 'gps_fixed',
    desc: 'Defesa, precisão e controle de campo.',
    modules: [
      { id: 'postura_bastiao', type: 'ativo' },
      { id: 'mira_letal', type: 'ativo' },
      { id: 'portador_nato', type: 'passivo' },
      { id: 'reflexos_apurados', type: 'ativo' },
    ],
  },
  {
    id: 'estudioso',
    name: 'Estudioso',
    icon: 'school',
    desc: 'Desbloqueia Runas, Alquimia e conhecimento.',
    modules: [
      { id: 'vinculo_runico', type: 'passivo' },
      { id: 'estudos_alquimia', type: 'passivo' },
      { id: 'conhecimento_amplificado', type: 'passivo' },
      { id: 'informativo', type: 'passivo' },
    ],
  },
  {
    id: 'sobrevivente',
    name: 'Sobrevivente',
    icon: 'shield',
    desc: 'Sustentação, percepção e recursos.',
    modules: [
      { id: 'recuperacao_acelerada', type: 'passivo' },
      { id: 'corpo_resiliente', type: 'ativo' },
      { id: 'sentidos_agucados', type: 'passivo' },
      { id: 'fortuna_inicial', type: 'passivo' },
    ],
  },
]
