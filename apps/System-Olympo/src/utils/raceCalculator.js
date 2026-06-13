import { RACES } from '../data/races'
import { emptyRaceBonus } from './raceMilestones'

export const ATTR_KEYS = ['FOR', 'DES', 'CON', 'INT', 'APA', 'AM']

export const RACE_SUBRACES = {
  HUMANO: [
    { id: 'GENIO', name: 'Genio', bonus: { attrs: { INT: 2 }, modules: 1 }, note: '+2 INT, +1 Modulo. 1x/cena soma +3 em conhecimento, investigacao ou criacao.', marcos: [
      ['Mente Brilhante', 'Resolver um problema impossivel sem ajuda externa', '+1 INT; aprende 1 Pericia gratuitamente'],
      ['Inovador', 'Criar uma invencao ou descoberta que altera a narrativa', '+2 INT; pode criar 1 item unico por arco'],
      ['Genio Lendario', 'Ser reconhecido como o maior intelecto vivo', '+3 em testes intelectuais; prever 1 acao inimiga por combate'],
    ] },
    { id: 'SOLDADO', name: 'Soldado', bonus: { attrs: { FOR: 1, CON: 1 }, hp: 20 }, note: '+20 HP. Armas marciais causam +2 dano. +2 CON contra medo e exaustao.', marcos: [
      ['Veterano', 'Sobreviver a 10 combates de alto risco', '+1 FOR; +10 Vida'],
      ['Protetor', 'Proteger aliado de morte certa 3 vezes', '+2 em Bloqueio e Protecao'],
      ['Campanhas de Guerra', 'Completar 3 campanhas militares significativas', '+1 CON; imunidade a medo em combate'],
    ] },
    { id: 'ASSASSINO', name: 'Assassino', minLevel: 5, bonus: { attrs: { DES: 2 }, pe: 5 }, note: '+5 PE. Primeiro ataque contra alvo desprevenido causa +30% dano e +2d6 com arma leve.', marcos: [
      ['Lamina Silenciosa', 'Eliminar 10 alvos sem ser detectado', '+3 Furtividade; emboscada +50% dano'],
      ['Fantasma', 'Assassinar alvo de protecao maxima sem ser visto', 'Invisibilidade parcial em ambientes escuros'],
      ['Terror das Nacoes', 'Ser temido em 3 nacoes ou faccoes', 'Inimigos inferiores testam CD 18 para atacar primeiro'],
    ] },
    { id: 'CACADOR', name: 'Cacador', bonus: { attrs: { DES: 1, CON: 1 } }, note: '+1 DES, +1 CON. Vantagem em rastreamento; alvo marcado recebe +2 dano do cacador.', marcos: [
      ['Predador', 'Rastrear e capturar 5 criaturas de nivel superior', '+2 DES; +1 Percepcao'],
      ['Armadilheiro Mestre', 'Criar armadilha que elimine inimigo N15+', '+3 em Preparacao de Armadilhas'],
      ['Lenda da Caca', 'Ser reconhecido como maior cacador conhecido', 'Nunca perde rastro de presa marcada; cheiro a 1km'],
    ] },
    { id: 'ESTRATEGISTA', name: 'Estrategista', bonus: { attrs: { INT: 2 }, pe: 5 }, note: '+5 PE. 1x/combate concede +2 Iniciativa ou +2 em um teste de aliado a 15m.', marcos: [
      ['Mente de Campo', 'Vencer combate em desvantagem de 1 vs 5+', '+2 Lideranca e Tatica'],
      ['Comandante', 'Liderar exercito em grande batalha com sucesso', '+1 atributo para ate 3 aliados por combate'],
      ['Infalivel', 'Nunca perder batalha planejada pessoalmente', 'Aliados +2 Iniciativa seguindo o plano'],
    ] },
  ],

  ELFO: [
    { id: 'FLORESTAS', name: 'Elfo das Florestas', bonus: { attrs: { DES: 1 }, hp: 20 }, note: '+20 HP. Em terreno natural: +2 Percepcao, +2 Furtividade e deslocamento +3m.', marcos: [
      ['Guardiao das Raizes', 'Defender floresta ou territorio natural', '+30 Vida; +2 testes em terrenos naturais'],
      ['Voz da Terra', 'Vincular-se a espirito natural', 'Comunica com plantas e animais da floresta'],
      ['Um com a Floresta', 'Viver 1 arco em natureza selvagem', 'Camuflagem passiva em terrenos naturais'],
    ] },
    { id: 'SOMBRAS', name: 'Elfo das Sombras', minLevel: 10, bonus: { attrs: { DES: 2, APA: -1 }, hp: 15, pe: 5 }, note: '+15 HP, +5 PE. Em baixa luz: +3 Furtividade; primeiro ataque furtivo +2d8.', marcos: [
      ['Assassino Silencioso', 'Eliminar 10 alvos sem deteccao', '+3 Furtividade; emboscadas +50% dano'],
      ['Fantasma', 'Infiltracao de alto risco sozinho', '1x/combate invisivel por 3 turnos'],
      ['Nevoa Eterna', 'Sobreviver a 3 mortes certas com furtividade', 'Movimento silencioso e sem rastros'],
    ] },
    { id: 'ARCANISTA', name: 'Elfo Alto - Arcanista', bonus: { attrs: { AM: 2, INT: 1 }, hp: 10, pe: 10 }, note: '+10 HP, +10 PE. Magias arcanas recebem +1 CD e custam -1 PE (minimo 1).', marcos: [
      ['Mestre das Escolas', 'Usar 5 magias de escolas distintas', 'Magias custam -1 PE'],
      ['Discipulo Anciao', 'Estudar com mestre milenar por 1 arco', '+3 INT'],
      ['Criador de Magia', 'Criar e registrar magia original', 'Magia criada jamais falha conjuracao'],
    ] },
    { id: 'LAMINA_SANGUE', name: 'Elfo Lamina-Sangue', minLevel: 8, requirement: 'FOR 3+', bonus: { attrs: { FOR: 2, CON: 1 }, hp: 30 }, note: '+30 HP. Armas corpo-a-corpo causam +1d6. Apos sofrer dano, proximo ataque recebe +2 dano.', marcos: [
      ['Tempestade de Laminas', 'Vencer 15 combates corpo a corpo sem magia', '+3 FOR; +2 ataques com armas brancas'],
      ['Corpo de Aco', 'Absorver 3x HP maximo em dano na sessao', '+50 Vida; +2 CON'],
      ['Guerreiro Lendario', 'Derrotar inimigo superior em combate direto', 'Criticos concedem ataque adicional'],
    ] },
  ],

  DASARIANO: [
    { id: 'HUMANIZADO', name: 'Dasariano Humanizado', bonus: { attrs: { DES: 2, INT: 1 }, pe: 5 }, note: 'Sem penalidade social. Em forma humana: +2 Diplomacia/Enganacao; troca de forma como acao bonus 1x/combate.' },
    { id: 'BESTIARIO', name: 'Dasariano Bestiario', bonus: { attrs: { FOR: 2, CON: 1 }, hp: 20 }, note: '+20 HP. Ataque natural +2 dano; em hibrida recebe +3m deslocamento.' },
    { id: 'PRIMORDIAL', name: 'Dasariano Primordial', bonus: { attrs: { AM: 2 }, hp: 40 }, note: '+40 HP. Forma Primordial liberada no N15; antes disso, 1x/combate soma +2d8 ao ataque natural.' },
  ],

  BRUXA: [
    { id: 'GAIA', name: 'Bruxa de Gaia', bonus: { attrs: { AM: 1 }, hp: 15, pe: 10 }, note: 'Curas +50% eficacia. Em solo natural regenera +2 HP/rodada e rituais custam -1 PE.' },
    { id: 'SOMBRAS', name: 'Bruxa das Sombras', minLevel: 8, bonus: { attrs: { AM: 1, DES: 1 }, pe: 15 }, note: 'Maldicoes impoem -2 adicional. Em escuridao, magias de sombra causam +1d8.' },
    { id: 'DESTINO', name: 'Bruxa do Destino', minLevel: 12, bonus: { attrs: { INT: 2 }, pe: 20 }, note: '1x/sessao faz uma Profecia: rerola um teste proprio/aliado ou obriga inimigo a rerolar.' },
    { id: 'REGENTE', name: 'Bruxa Regente', requirement: 'Marco — Liderar um conven de bruxas', bonus: { attrs: { AM: 3, APA: 2 }, hp: 30, pe: 25 }, note: 'Lider de conven: divide poder com ate 3 bruxas aliadas (cada uma recebe +2 AM e +10 PE quando em ritual conjunto). Rituais de conven custam -25% PE para todas.' },
    { id: 'ANCESTRAL', name: 'Bruxa Ancestral', requirement: 'Marco — Retornar a vida por feitiço ou viver 500+ anos', bonus: { attrs: { AM: 4, INT: 2, CON: 2 }, hp: 60, pe: 40 }, note: 'Bruxa extremamente antiga e poderosa. Acesso a feitiços ancestrais secretos. Resistencia a magia +4. Marca de Sangue Eterno: rituais pessoais custam -3 PE e maldicoes duram o dobro.' },
  ],

  HUMANO_APRIMORADO: [
    { id: 'GENETICO', name: 'Modificado Genetico', bonus: { attrs: { FOR: 2, CON: 2 }, hp: 30 }, note: '+30 HP. Cura natural dobra; 1x/combate reduz dano fisico recebido em 5.' },
    { id: 'CIBERNETICO', name: 'Cibernetico', bonus: { attrs: { DES: 2, FOR: 1 }, hp: 15 }, note: '+15 HP. Dois implantes: cada um concede +1 FOR ou +1 DES e uma acao tecnica simples por cena.' },
    { id: 'RUNICO', name: 'Runico', bonus: { attrs: { AM: 3 }, pe: 15 }, note: '+15 PE. Acesso a runas; 2 runas ativas simultaneas, cada uma concede +1 CD ou +1d6 elemental.' },
  ],

  MAGO: [
    { id: 'COMBATE', name: 'Mago de Combate', bonus: { attrs: { AM: 1 }, hp: 10, pe: 10 }, note: 'Magias de combate +10% dano; escudo arcano reduz 3 dano 1x/rodada.' },
    { id: 'ARQUIVISTA', name: 'Mago Arquivista', bonus: { attrs: { INT: 2 }, pe: 15, pericias: 1 }, note: '2 magias extras na criacao e +1 Pericia academica. Identificar magia recebe +3.' },
    { id: 'ARCANISTA', name: 'Arcanista', minLevel: 10, bonus: { attrs: { AM: 1, INT: 1 }, pe: 20 }, note: 'Acesso a feiticos de Bruxa; 1 ritual menor por descanso sem componente raro.' },
    { id: 'ETERNO', name: 'Mago Eterno', requirement: 'Marco — Dominar 50+ magias ou completar ritual de transcendencia arcana', bonus: { attrs: { AM: 5, INT: 4, CON: 3 }, hp: 50, pe: 50 }, note: 'Titulo concedido a magos de poder absoluto. Foco magico indestrutivel. Regeneracao de mana: +5 Energia/turno. Magias de circulo 1-2 custam metade do PE. 1x/descanso pode lancar magia sem custo de PE. Resistencia arcana: -5 dano magico recebido.' },
  ],

  VAMPIRO: [
    { id: 'RECEM_CRIADO', name: 'Vampiro Recem-Criado', bonus: { hp: 10 }, note: '+10 HP. Mordida cura 1d10+5 HP; frenesi CD 18 quando fica sem sangue.' },
    { id: 'NOBRE', name: 'Vampiro Nobre', requirement: 'Marco Sobrevivente', bonus: { attrs: { FOR: 1, APA: 1 }, hp: 30, pe: 10 }, note: 'CD da Compulsao aumenta para 18. Testes sociais noturnos recebem +3.' },
    { id: 'SELVAGEM', name: 'Vampiro Selvagem', minLevel: 8, bonus: { attrs: { FOR: 2, APA: -1 }, hp: 40 }, note: '-1 social. Garras 2d8+FOR; ao beber sangue em combate recebe +2 FOR por 1 rodada.' },
  ],

  FEITICEIRO: [
    { id: 'DOM_G4', name: 'Dom Grau 4 - Fraco', bonus: { pe: 5 }, note: '+5 PE. Dom com 1 efeito limitado: dano 1d8+AM ou utilidade simples ate 10m.' },
    { id: 'DOM_G3', name: 'Dom Grau 3 - Moderado', bonus: { attrs: { AM: 1 }, pe: 10 }, note: 'Dom possui 2 efeitos: dano 2d8+AM, alcance 20m ou area pequena.' },
    { id: 'DOM_G2', name: 'Dom Grau 2 - Forte', bonus: { attrs: { AM: 2 }, hp: 15, pe: 15 }, note: 'Dom possui ate 3 efeitos: dano 3d8+AM, alcance 30m, CD +1.' },
    { id: 'DOM_G1', name: 'Dom Grau 1 - Excepcional', requirement: 'Marcos do Grau 2', bonus: { attrs: { AM: 3 }, hp: 25, pe: 25 }, note: 'Dom em plena potencia: dano 4d8+AM, CD +2, ignora 25% de resistencia do alvo.' },
  ],

  FINGER: [
    { id: 'COMUM', name: 'Finger Comum', bonus: { pe: 10 }, note: '+10 PE. Arma hospedeira recebe +1 dano e pode falar mentalmente com o portador a 30m.' },
    { id: 'OVERLORD', name: 'Overlord', minLevel: 20, bonus: { attrs: { FOR: 3, DES: 3, CON: 3, INT: 3, APA: 3, AM: 3 }, hp: 60, pe: 30 }, note: 'Corpo energetico permanente: 1 rodada por combate sem portador; arma +5 dano total.' },
    { id: 'UNIDA', name: 'Finger Unida', requirement: 'Marco narrativo unico', bonus: { attrs: { FOR: 3, DES: 3, CON: 3, INT: 3, APA: 3, AM: 3 }, hp: 100, pe: 50 }, note: 'Capacidades fundidas: portador e Finger agem em sincronia; 1 acao bonus extra 1x/turno.' },
  ],

  DEMONIO: [
    { id: 'INFERIOR', name: 'Demonio Inferior', bonus: { attrs: { FOR: 4, INT: -2 }, hp: 60 }, note: '+60 HP. Garras 2d8+FOR; Aura 5m causa -2 testes em inimigos que falham CD 18+AM.' },
    { id: 'SUPERIOR', name: 'Demonio Superior', requirement: 'Ascensao por kills', bonus: { attrs: { INT: 1, AM: 2 }, hp: 30, pe: 20 }, note: 'Racionalidade plena. Magia infernal +2 dano/CD; controla Aura como acao livre.' },
    { id: 'SENHOR_CIRCULO', name: 'Senhor do Circulo', requirement: 'Reconhecido em 1 Circulo', bonus: { attrs: { FOR: 4, DES: 4, CON: 4, INT: 4, APA: 4, AM: 4 }, hp: 100, pe: 50 }, note: 'Aura Demoniaca 20m: inimigos -2 testes, aliados demoniacos +2 dano, CD 20+AM.' },
  ],

  HUMANO_MISTICO: [
    { id: 'NEOFITO', name: 'Neofito Mistico', bonus: { pe: 10, pericias: 1 }, note: '+10 PE, +1 Pericia magica. Detecta rupturas em 100m e recebe +2 contra efeitos do Abismo.' },
    { id: 'GUARDIAO_ATIVO', name: 'Guardiao Ativo', minLevel: 15, bonus: { attrs: { AM: 2 }, hp: 30, pe: 25, modules: 1 }, note: 'Aura Guardiao 15m: aliados +2 resistencia e +1 PE/turno enquanto estiver consciente.' },
    { id: 'GUARDIAO_SUPREMO', name: 'Guardiao Supremo', requirement: 'Evento unico de campanha', bonus: { attrs: { AM: 4 }, hp: 100, pe: 60, modules: 2 }, note: 'Todos sistemas magicos em plena potencia. Sela portais com teste AM CD 22 e reduz dano magico recebido em 5.' },
  ],

  LOBISOMEM: [
    { id: 'BETA', name: 'Beta - Lobo Comum', bonus: { hp: 20 }, note: '+20 HP. Forma lobo: deslocamento 18m, mordida 2d6+FOR, rastreio por cheiro 1km.' },
    { id: 'ALFA', name: 'Alfa', requirement: 'Marco Reconhecido ou desafio direto', bonus: { attrs: { FOR: 2, APA: 1 }, hp: 60, pe: 10 }, note: 'Pode formar matilha. Urro 1x/combate: aliados a 15m recebem +2 em ataques por 1 rodada.' },
    { id: 'LOBO_DEMONIO', name: 'Lobo-Demonio', minLevel: 15, bonus: { attrs: { FOR: 3, CON: 2 }, hp: 80, pe: 20 }, note: 'Forma lupina demonica: garras 3d10+FOR, resistencia 25% a fogo/sombra, frenesi CD +3.' },
  ],
}

const SEMIDEUS_SUBRACE_BONUS = {
  ZEUS: { hp: 25, pe: 15, attrs: { FOR: 2, AM: 1 }, note: 'Raio Inato 2d8+AM eletrico a 30m. Resistencia eletrica 50%. 1x/descanso: Trovao 6m, 3d8+AM, CD 16+AM.' },
  POSEIDON: { hp: 30, pe: 10, attrs: { CON: 2 }, note: 'Respira na agua. Hidrocinese 30m. Onda 3d6+AM em cone 9m, CD 15+AM; na agua recebe +3m deslocamento.' },
  ATENA: { hp: 15, pe: 15, attrs: { INT: 2, CON: 1 }, note: 'Visao Tatica 1x/combate: antecipa uma acao e concede +3 CA ou +3 ataque a aliado em 15m.' },
  ARES: { hp: 35, pe: 5, attrs: { FOR: 3 }, note: 'Furia Marcial: +3 dano corpo-a-corpo. Ao reduzir inimigo a 0 HP, faz 1 ataque extra 1x/turno.' },
  ARTEMIS: { hp: 20, pe: 10, attrs: { DES: 2 }, note: 'Rastreamento Divino 5km. Arcos/armas leves +2 dano; a noite recebe +3 Furtividade e +3 Percepcao.' },
  APOLLO: { hp: 20, pe: 20, attrs: { INT: 1, AM: 1 }, note: 'Cura Solar 3d6+AM 1x/dia. Luz 10m: inimigos -1 ataques; de dia recebe +2 magia/medicina.' },
  AFRODITE: { hp: 10, pe: 20, attrs: { APA: 2, AM: 1 }, note: 'Seducao Divina: CD 16+APA, alvo perde 1 acao ou fica lento 1 rodada. +4 social; imune a charme.' },
  HADES: { hp: 30, pe: 15, attrs: { AM: 1, CON: 1 }, note: 'Toque Necrotico +1d8. Medo Mortal 10m, CD 16+AM. Resistencia necrotica 50% e fala com mortos recentes.' },
  PERSEFONE: { hp: 25, pe: 20, attrs: { AM: 1, APA: 1 }, note: 'Invoca sombra menor 1x/descanso por 1 cena. Luz: +2 social; escuridao: +2 magia. Resistencia necrotica 50%.' },
  DIONISIO: { hp: 45, pe: 15, attrs: { CON: 2, APA: 1 }, note: 'Vitalidade 2d8+AM como acao bonus 3x/dia. Imune a veneno/doenca. Aliados 10m recuperam +1 PE/turno.' },
  HEFESTO: { hp: 35, pe: 5, attrs: { FOR: 1, CON: 2 }, note: 'Toque da Forja: melhora 1 item em +1 dano ou +1 CA por descanso longo. Resistencia a fogo 50%.' },
  HERMES: { hp: 15, pe: 20, attrs: { DES: 3 }, note: 'Deslocamento +10m. Dash como acao bonus. +5 Iniciativa. 1x/dia teleporte 30m como acao bonus.' },
  MORPHEU: { hp: 15, pe: 25, attrs: { AM: 2 }, note: 'Sono Onirico: alvo a 18m dorme 1d4 rodadas, CD 15+AM. Imune a ilusao e sono forcado.' },
  HECATE: { hp: 15, pe: 30, attrs: { AM: 2 }, note: '+4 em magia, CD +2. 1x/turno converte 3 PE em +1d8 dano/efeito em magia.' },
  NIKE: { hp: 25, pe: 15, attrs: { DES: 1, FOR: 1 }, note: 'Bencao da Vitoria: aliados 15m com HP >50% recebem +2 em ataques/testes. 1 sucesso automatico por dia.' },
  DEIMOS: { hp: 25, pe: 15, attrs: { AM: 1, FOR: 1 }, note: 'Aura de Terror 10m: inimigos -3 testes por 1 rodada se falham CD 16+AM. Imune a medo.' },
  BOREAS: { hp: 20, pe: 20, attrs: { DES: 2 }, note: 'Voo 12m/turno como acao. Rajada 2d6+AM empurra 10m, CD 15+AM. Resistencia frio 50%.' },
  NEMESIS: { hp: 25, pe: 15, attrs: { AM: 1, FOR: 1 }, note: 'Marca de Vinganca: +4 dano contra 1 alvo ate fim do combate. Reflete 20% do dano recebido ao alvo marcado.' },
  HEBE: { hp: 40, pe: 20, attrs: { CON: 2 }, note: 'Toque da Juventude 1x/dia: restaura 50% HP e remove 1 condicao. Aliados 10m regeneram 2 HP/turno.' },
  HESTICA: { hp: 30, pe: 15, attrs: { AM: 1, CON: 1 }, note: 'Chama Eterna 2d6+AM fogo a 20m. Imune a fogo. Aliados 5m resistem frio e recebem +2 contra medo.' },
}

const SEMIDEUS_EVOLUTION_PATHS = [
  {
    id: 'HERDEIRO_OLIMPICO',
    name: 'Herdeiro Olimpico',
    bonus: { hp: 10, pe: 5 },
    note: 'Caminho base de semideus: mantem o foco na heranca do deus pai sem acelerar a ascensao.',
    marcos: [
      ['Sangue Reconhecido', 'Ter a linhagem aceita por um templo, deus ou oraculo', '+10 PE; +1 Pericia social ou mistica'],
      ['Feito Heroico', 'Resolver um conflito acima do proprio nivel', '+20 Vida; +1 Modulo'],
      ['Nome no Olimpo', 'Ser citado entre herois lendarios', '+2 em qualquer atributo concedido pelo pai divino'],
    ],
  },
  {
    id: 'ASCENDENTE_DEUS',
    name: 'Ascendente a Deus',
    minLevel: 15,
    bonus: { attrs: { AM: 2, CON: 1 }, hp: 30, pe: 20 },
    note: 'A divindade deixa de ser somente heranca e vira destino. Poderes divinos ganham escala narrativa maior.',
    marcos: [
      ['Primeiro Dominio', 'Manifestar um dominio proprio alem da esfera do pai', '+2 AM; +20 Energia'],
      ['Adoradores', 'Ser seguido por mortais ou espiritos por um arco', '+25 PE; +1 Habilidade passiva narrativa'],
      ['Corpo Divino', 'Sobreviver a uma execucao ou artefato divino', '+40 Vida; +2 CON'],
    ],
  },
  {
    id: 'NOVO_DEUS',
    name: 'Novo Deus',
    minLevel: 25,
    requirement: 'Marco unico concedido pelo Mestre',
    bonus: { attrs: { FOR: 1, DES: 1, CON: 1, INT: 1, APA: 1, AM: 3 }, hp: 80, pe: 40, modules: 1 },
    note: 'Estado raro de apoteose. Deve representar uma virada de campanha e nao apenas uma escolha comum.',
    marcos: [
      ['Dominio Nomeado', 'Fundar ou roubar um dominio divino reconhecido', '+3 AM; +30 PE'],
      ['Culto Vivo', 'Ter culto ativo e consequencias politicas', '+2 APA; +2 INT'],
      ['Apoteose', 'Concluir o ritual ou feito que transforma a existencia', '+100 Vida; +2 Modulos'],
    ],
  },
]

function addAttrs(total, attrs = {}) {
  for (const attr of ATTR_KEYS) total[attr] = (total[attr] || 0) + (attrs[attr] || 0)
}

export function getSubracesForRace(raceId) {
  if (raceId === 'SEMIDEUS') {
    return SEMIDEUS_EVOLUTION_PATHS
  }
  return RACE_SUBRACES[raceId] || []
}

export function getSelectedSubrace(char = {}) {
  const subraces = getSubracesForRace(char.raca)
  if (!subraces.length) return null
  return subraces.find(s => s.id === char.subraca) || subraces[0]
}

export function getDefaultSubraceId(raceId) {
  return getSubracesForRace(raceId)[0]?.id || null
}

export function calculateRaceBonus(char = {}) {
  const total = emptyRaceBonus()
  const race = RACES[char.raca]
  if (!race) return total

  const layer = race.layer0 || {}
  addAttrs(total.attrs, layer.attrBonus)
  total.hp += layer.hpMod || 0
  if (race.id === 'HUMANO') {
    total.pe += 5
    total.pericias += 2
  }

  const selectedGodId = layer.requiresDeus
    ? (char.racaDeus || (race.deuses?.some(d => d.id === char.subraca) ? char.subraca : null))
    : null

  if (layer.requiresDeus && selectedGodId) {
    const deus = race.deuses?.find(d => d.id === selectedGodId)
    if (deus?.attr) addAttrs(total.attrs, deus.attr)
    const divineBonus = SEMIDEUS_SUBRACE_BONUS[selectedGodId]
    if (divineBonus) {
      addAttrs(total.attrs, divineBonus.attrs)
      total.hp += divineBonus.hp || 0
      total.pe += divineBonus.pe || 0
      if (divineBonus.note) total.notes.push(divineBonus.note)
    }
  }

  const choiceBonus = layer.attrBonus?.escolher ? (layer.attrBonus.escolherValor || 1) : 0
  if (choiceBonus > 0) {
    const max = layer.attrBonus.escolherQtd || 0
    const allowed = layer.attrBonus.escolherOpcoes || ATTR_KEYS
    const choices = Object.entries(char.racaAttrChoices || {})
      .filter(([attr, selected]) => ATTR_KEYS.includes(attr) && allowed.includes(attr) && selected)
      .slice(0, max)
    choices.forEach(([attr]) => { total.attrs[attr] += choiceBonus })
  }

  const subrace = getSelectedSubrace(char)
  if (subrace?.bonus) {
    addAttrs(total.attrs, subrace.bonus.attrs)
    total.hp += subrace.bonus.hp || 0
    total.pe += subrace.bonus.pe || 0
    total.pericias += subrace.bonus.pericias || 0
    total.modules += subrace.bonus.modules || 0
  }
  if (subrace?.note) total.notes.push(subrace.note)

  return total
}

export function getRaceAdjustedAttrs(attrs = {}, skeletonPoints = {}, char = {}) {
  const bonus = calculateRaceBonus(char)
  return Object.fromEntries(ATTR_KEYS.map(attr => [
    attr,
    (attrs[attr] || 0) + (skeletonPoints[attr] || 0) + (bonus.attrs[attr] || 0),
  ]))
}

export function getRaceLabel(char = {}) {
  const race = RACES[char.raca]
  if (!race) return char.raca || ''
  const subrace = getSelectedSubrace(char)
  return [race.name, subrace?.name].filter(Boolean).join(' - ')
}
