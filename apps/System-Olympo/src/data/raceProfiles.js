export const RACE_PROFILES = {
  HUMANO: {
    fraquezas: [
      { nome: 'Mortalidade', icon: 'hourglass_top', desc: 'Expectativa de vida mortal — o tempo é o maior inimigo.' },
      { nome: 'Sem poder inato', icon: 'remove_circle', desc: 'Nenhuma habilidade sobrenatural ao nascer. Depende de treino e tática.' },
    ],
    poderesBase: [
      { nome: 'Determinação', icon: 'flag', desc: 'Rerolla um teste falhado por 2 ou menos (1×/dia).' },
      { nome: 'Adaptabilidade', icon: 'psychology', desc: '+2 perícias na criação. A cada 5 níveis, +1 perícia extra.' },
    ],
    bonus: { hp: 0, energia: 0, pe: 0, attrsEscolher: { qtd: 2, valor: 2, opcoes: ['FOR', 'DES', 'CON', 'INT', 'APA', 'AM'] } },
  },
  HUMANO_APRIMORADO: {
    fraquezas: [
      { nome: 'Rejeição Mágica', icon: 'science', desc: '-2 em testes contra magia (origem artificial do corpo).' },
      { nome: 'Incompatibilidade Ritual', icon: 'block', desc: 'Não pode participar de rituais antigos que exigem sangue puro.' },
    ],
    poderesBase: [
      { nome: 'Otimização Adaptativa', icon: 'tune', desc: 'Rerolla qualquer teste e fica com o novo resultado (1×/combate).' },
      { nome: 'Recuperação Acelerada', icon: 'healing', desc: '+100% de Vida e Energia em qualquer descanso.' },
    ],
    bonus: { hp: 20, energia: 0, pe: 0, attrsEscolher: { qtd: 2, valor: 2, opcoes: ['FOR', 'DES', 'CON', 'INT', 'APA', 'AM'] } },
  },
  ELFO: {
    fraquezas: [
      { nome: 'Ferro Quente', icon: 'whatshot', desc: 'Toque de ferro quante causa desconforto (-2 em testes).' },
      { nome: 'Obrigação Solar', icon: 'wb_sunny', desc: 'Sem sol por 3+ dias → melancolia (-1 em tudo).' },
      { nome: 'Fragilidade', icon: 'broken_image', desc: 'Corpo delicado — sofre mais com dano físico direto.' },
    ],
    poderesBase: [
      { nome: 'Transe Onírico', icon: 'bedtime', desc: 'Descansa completamente em 4 horas. Recupera 100% HP, Energia e PE.' },
      { nome: 'Sentidos Élficos', icon: 'visibility', desc: 'Visão noturna perfeita 60m. Vantagem em Percepção.' },
      { nome: 'Magia Ancestral', icon: 'auto_fix_high', desc: '+2 em todos os testes arcanos. Imune a sono mágico e charme.' },
    ],
    bonus: { hp: 0, energia: 0, pe: 0, attrs: [{ attr: 'DES', value: 3 }, { attr: 'AM', value: 3 }] },
  },
  BRUXA: {
    fraquezas: [
      { nome: 'Ferro Quente', icon: 'whatshot', desc: '1d4 dano/rodada de contato. -2 em testes.' },
      { nome: 'Sem Componentes', icon: 'block', desc: 'Sem componentes naturais: -4 em todas as magias.' },
      { nome: 'Pacto com a Natureza', icon: 'eco', desc: 'Destruir natureza voluntariamente: -3 em magia por 24h. Precisa de 4h em natureza a cada 3 dias.' },
    ],
    poderesBase: [
      { nome: 'Comunhão de Gaia', icon: 'pets', desc: 'Comunica com animais e sente criaturas em 100m. Imune a venenos naturais.' },
      { nome: 'Ritual de Poder', icon: 'auto_fix_high', desc: 'Rituais custam -50% tempo e -50% componentes.' },
      { nome: 'Maldição Menor', icon: 'cloud', desc: 'Alvo: -3 em 1 atributo por 1 cena. CD 18 resiste.' },
    ],
    bonus: { hp: 10, energia: 0, pe: 0, attrs: [{ attr: 'AM', value: 4 }] },
  },
  MAGO: {
    fraquezas: [
      { nome: 'Dependência do Foco', icon: 'center_focus_strong', desc: 'Sem foco mágico: magia -8 efetivo (devastador). O foco pode ser desarmado.' },
      { nome: 'Concentração Frágil', icon: 'broken_image', desc: 'Dano sofrido interrompe concentração (CD = dano).' },
      { nome: 'Corpo Frágil', icon: 'remove_circle', desc: '-2 em testes de FOR e CON.' },
    ],
    poderesBase: [
      { nome: 'Foco Mágico', icon: 'auto_awesome', desc: 'Com foco: +4 em magias. Parte da identidade arcana.' },
      { nome: 'Análise Arcana', icon: 'biotech', desc: 'Identifica magia automaticamente (escola, potência, duração) sem teste.' },
      { nome: 'Reação Arcana', icon: 'shield', desc: 'Nega 1 magia de ataque direcionada a si como reação (1×/turno, 3 PE).' },
    ],
    bonus: { hp: 0, energia: 0, pe: 0, attrs: [{ attr: 'AM', value: 4 }, { attr: 'INT', value: 3 }] },
  },
  FEITICEIRO: {
    fraquezas: [
      { nome: 'Único Dom', icon: 'lock', desc: 'APENAS 1 dom — não pode aprender outros. Especialista inflexível.' },
      { nome: 'Fora do Dom', icon: 'remove_circle', desc: '-3 em TUDO que não envolva o dom inato.' },
      { nome: 'Inquietação', icon: 'bolt', desc: '48h sem usar o dom: inquietação (-2 em tudo).' },
    ],
    poderesBase: [
      { nome: 'Dom Inato', icon: 'bolt', desc: '1 dom elemental/mágico sem treino, componentes ou foco. Sucesso automático em testes simples.' },
      { nome: 'Sinergia Mágica', icon: 'sync', desc: 'Recupera 2 PE/turno usando o dom ativamente. Dom nunca causa backlash.' },
      { nome: 'Canalização Instintiva', icon: 'all_inclusive', desc: 'Pode usar o dom como reação e moldar sua forma (linha, cone, esfera).' },
    ],
    bonus: { hp: 25, energia: 0, pe: 0, attrs: [{ attr: 'AM', value: 3 }], attrsEscolher: { qtd: 1, valor: 2, opcoes: ['FOR', 'DES', 'CON', 'INT', 'APA', 'AM'] } },
  },
  VAMPIRO: {
    fraquezas: [
      { nome: 'Luz Solar', icon: 'light_mode', desc: 'CRÍTICO: 3d6 dano/turno. Anula regeneração. Reduz com a idade.' },
      { nome: 'Verbena', icon: 'local_florist', desc: 'Plana sagrada que repele vampiros — contato causa dano e enfraquece.' },
      { nome: 'Sede de Sangue', icon: 'bloodtype', desc: 'Sangue a cada 7 dias ou entra em frenesi (ataca aliado mais próximo).' },
      { nome: 'Estaca no Coração', icon: 'arrow_circle_down', desc: 'Paralisa completamente o vampiro.' },
      { nome: 'Caixão Nativo', icon: 'home', desc: 'Descanso obrigatório em caixão com terra nativa ou -2 em tudo no dia seguinte.' },
    ],
    poderesBase: [
      { nome: 'Regeneração Vampírica', icon: 'healing', desc: 'Regenera 4×ModCON HP/turno em combate. Anulada por luz solar.' },
      { nome: 'Força Noturna', icon: 'dark_mode', desc: '+2 em TODOS os testes à noite. -2 de dia.' },
      { nome: 'Absorção de Sangue', icon: 'bloodtype', desc: 'Beber sangue cura 2d10+10 HP e recupera 8 PE.' },
      { nome: 'Sentido de Sangue', icon: 'sensors', desc: 'Detecta sangue vivo em 1km (tipo e quantidade).' },
    ],
    bonus: { hp: 45, energia: 0, pe: 0, attrs: [{ attr: 'DES', value: 3 }, { attr: 'FOR', value: 3 }] },
  },
  LOBISOMEM: {
    fraquezas: [
      { nome: 'Prata', icon: 'circle', desc: 'CRÍTICA: 2× dano. Anula regeneração. Ferimentos não curam naturalmente.' },
      { nome: 'Aconito', icon: 'local_florist', desc: 'Erva-wolfsbane que envenena e repele lobisomens — causa fraqueza extrema.' },
      { nome: 'Frenesi', icon: 'dangerous', desc: 'HP <25% ou sangue de aliado → teste CON CD 18 ou ataca 1d4 rodadas.' },
      { nome: 'Lua Cheia', icon: 'nightlight', desc: 'Transformação involuntária na primeira lua cheia (sem controle inicial).' },
    ],
    poderesBase: [
      { nome: 'Transformação Parcial', icon: 'pets', desc: '+3 FOR, +2 DES, garras 2d8+FOR em forma híbrida.' },
      { nome: 'Regeneração Lupina', icon: 'healing', desc: '3×ModCON HP/turno fora de combate. Anulada por prata.' },
      { nome: 'Sentidos Aguçados', icon: 'hearing', desc: 'Detecta sangue em 1km. Vantagem em Percepção e Sobrevivência.' },
      { nome: 'Mordida da Alcateia', icon: 'target', desc: 'Marca o alvo como presa: +2 dano por 1 cena. Stack até 3 marcas.' },
    ],
    bonus: { hp: 40, energia: 0, pe: 0, attrs: [{ attr: 'FOR', value: 4 }, { attr: 'DES', value: 3 }] },
  },
  DEMONIO: {
    fraquezas: [
      { nome: 'Água Benta', icon: 'water_drop', desc: 'CRÍTICA: 2× dano + 1d6 queimadura/rodada por 3 rodadas.' },
      { nome: 'Correntes de Hades', icon: 'link', desc: 'Aprisionado → -5 em TUDO, perde traços raciais.' },
      { nome: 'Sujeição', icon: 'handcuffs', desc: 'Mestre vivo → deve obedecer ordens diretas.' },
      { nome: 'Sagrado', icon: 'church', desc: '-2 em testes dentro de templos consagrados.' },
    ],
    poderesBase: [
      { nome: 'Aura Amaldiçoada', icon: 'cloud', desc: 'Inimigos em 5m: -2 em todos os testes. CD 18+AM resiste.' },
      { nome: 'Regeneração Infernal', icon: 'healing', desc: '3×ModCON HP/turno. Dobra em solo de Hades. Anulada por água benta.' },
      { nome: 'Resistência Elemental', icon: 'shield', desc: '50% redução no elemento escolhido + fogo automático.' },
      { nome: 'Marca da Alma', icon: 'swords', desc: 'Cada criatura morta fortalece o demônio. A cada 10 mortes: +2 em 1 atributo.' },
    ],
    bonus: { hp: 50, energia: 0, pe: 0, attrs: [{ attr: 'AM', value: 3 }], attrsEscolher: { qtd: 1, valor: 2, opcoes: ['FOR', 'DES'] } },
  },
  DASARIANO: {
    fraquezas: [
      { nome: 'Bestialidade', icon: 'psychology_alt', desc: 'Forma Primordial: INT -4, sem magia complexa. 24h+ → teste CD 18 ou perde humanidade.' },
      { nome: 'Cicatrizes Entre Formas', icon: 'broken_image', desc: 'Marcas na pele assustam NPCs (-2 social com humanos comuns).' },
    ],
    poderesBase: [
      { nome: 'Mudança de Forma', icon: 'change_circle', desc: 'Troca entre 3 formas (Humana, Híbrida, Primordial) livremente. Mantém HP, PE e inventário.' },
      { nome: 'Instinto Predador', icon: 'visibility', desc: 'Vantagem em Percepção e Sobrevivência em todas as formas.' },
      { nome: 'Regeneração Primordial', icon: 'healing', desc: '1×ModCON HP/turno em qualquer forma. Stack com regeneração de forma.' },
    ],
    bonus: { hp: 30, energia: 0, pe: 0, attrsEscolher: { qtd: 2, valor: 2, opcoes: ['FOR', 'DES', 'CON', 'INT', 'APA', 'AM'] } },
  },
  FINGER: {
    fraquezas: [
      { nome: 'Arma Destruída', icon: 'dangerous', desc: 'Se a arma hospedeira for destruída, o Finger morre imediatamente.' },
      { nome: 'Armas Sagradas', icon: 'shield', desc: 'Armas sagradas causam 2× dano ao Finger.' },
      { nome: 'Dominação do Portador', icon: 'handcuffs', desc: 'O portador pode tentar dominar (confronto AM, CD 20).' },
    ],
    poderesBase: [
      { nome: 'Incorporação Parasita', icon: 'integration_instructions', desc: 'Habita corpo ou arma de portador. Fornece poder em troca de hospedagem.' },
      { nome: 'Imortalidade Parasita', icon: 'all_inclusive', desc: 'Não morre enquanto a arma existe. Portador morre → busca novo em 24h.' },
      { nome: 'Absorção de Habilidades', icon: 'copy_all', desc: 'Copia 1 habilidade de inimigos derrotados (dura nível dias). Mantém 2 simultâneas.' },
    ],
    bonus: { hp: 0, energia: 0, pe: 0, attrs: [{ attr: 'AM', value: 2 }, { attr: 'DES', value: 1 }] },
  },
  SEMIDEUS: {
    fraquezas: [
      { nome: 'Aço Olímpiano', icon: 'shield_lock', desc: 'Bloqueia a Aura Mágica por si só, interrompendo o fluxo da energia. O alvo não pode usar nada que envolva sua energia. Criaturas naturalmente fortes (como vampiros centenários) podem se libertar.' },
      { nome: 'Fraqueza Paterna', icon: 'family_restroom', desc: 'Herda uma fraqueza específica do deus pai (definida pelo mestre).' },
      { nome: 'Caçadores', icon: 'crosshairs', desc: 'Alvo constante de inimigos do deus pai e caçadores de semideuses.' },
      { nome: 'Chamado Divino', icon: 'notifications_active', desc: 'Pode ser convocado pelo pai a qualquer momento.' },
    ],
    poderesBase: [
      { nome: 'Herança Divina', icon: 'auto_awesome', desc: 'Recebe os atributos e o poder do deus pai. CDs usam 15 + AM.' },
      { nome: 'Presença Divina', icon: 'military_tech', desc: '+2 social. Aura de autoridade: criaturas inferiores não atacam primeiro (CD 15+AM).' },
      { nome: 'Pulso Divino', icon: 'flare', desc: 'Canaliza poder do deus pai em explosão de energia. 2d8+AM. CD 15+AM.' },
      { nome: 'Constituição Divina', icon: 'shield', desc: 'Imune a doenças. Não envelhece. -2 dano mágico.' },
    ],
    bonus: { hp: 60, energia: 0, pe: 0, attrsDeus: true },
  },
  HUMANO_MISTICO: {
    fraquezas: [
      { nome: 'Alvo dos Caçadores', icon: 'crosshairs', desc: 'Alvo constante de caçadores e entidades que temem seu potencial.' },
      { nome: 'Pressão Moral', icon: 'balance', desc: 'Esperado ser herói. Pressão social e moral enorme.' },
      { nome: 'Chamado de Gaia', icon: 'eco', desc: 'Gaia pode impor missões imperativas. Recusar = perder poder.' },
      { nome: 'Isolamento', icon: 'person_off', desc: 'Isolamento social (-1 em laços). Um por geração.' },
    ],
    poderesBase: [
      { nome: 'Sincronia Mágica', icon: 'sync', desc: 'Triagem Principal e Sub-Triagem ao mesmo tempo. Qualquer triagem de qualquer classe.' },
      { nome: 'Sensibilidade ao Véu', icon: 'visibility', desc: 'Detecta rupturas dimensionais, magia antiga e Abismo em 100m.' },
      { nome: 'Evolução Acelerada', icon: 'trending_up', desc: 'XP +75% em habilidades mágicas. Rituais de qualquer origem.' },
      { nome: 'Purificação Guardiã', icon: 'cleaning_services', desc: 'Remove maldições e efeitos mágicos hostis com toque. CD 20.' },
    ],
    bonus: { hp: 15, energia: 0, pe: 0, attrs: [{ attr: 'AM', value: 2 }, { attr: 'INT', value: 1 }] },
  },
}

export function getRaceProfile(raceId) {
  return RACE_PROFILES[raceId] || null
}

export function getRaceBonusSummary(raceId) {
  const p = RACE_PROFILES[raceId]
  if (!p) return []
  const parts = []
  if (p.bonus.hp) parts.push(`${p.bonus.hp > 0 ? '+' : ''}${p.bonus.hp} HP`)
  if (p.bonus.energia) parts.push(`${p.bonus.energia > 0 ? '+' : ''}${p.bonus.energia} Energia`)
  if (p.bonus.pe) parts.push(`+${p.bonus.pe} PE`)
  if (p.bonus.attrs) p.bonus.attrs.forEach(a => parts.push(`${a.value > 0 ? '+' : ''}${a.value} ${a.attr}`))
  if (p.bonus.attrsEscolher) parts.push(`+${p.bonus.attrsEscolher.qtd} atrib. à escolha`)
  if (p.bonus.attrsDeus) parts.push('Atributos do deus pai')
  return parts
}
