export const TRIAGES = {
  GUERREIRO: {
    TÁTICO: {
      name: 'Tático',
      desc: 'Mestres estrategistas que manipulam o campo de batalha através de marcações e comandos táticos.',
      levels: {
        0.1: 'Gasta 1 PE para rolar novamente um teste falho seu ou de aliado. Usos por rodada: 1 + N÷10 (arredondado para baixo).',
        0.2: '03 PE — Marca Alvo; ataques aliados ganham +10 + N÷2 de Dano contra ele por 04 Rodadas. 1× marca ativa por vez.',
        0.3: 'Marca 02 Inimigos simultaneamente; se ambos caírem em 03 Rodadas, aliados recuperam 05 + N÷5 PE (1× por combate).',
        0.4: 'Com 06 PE, escolhe 01 Aliado para atacar junto; ambos recebem +3 + N÷5 no Resultado. 1×/rodada.',
        0.5: '1× por Combate, todos os Aliados podem mover 15m sem Ataques de Oportunidade e ganham +2 CA por 1 Rodada.',
        0.6: 'Gasta 12 PE para conceder 1 Ação Padrão + 1 Ação de Movimento a 01 Aliado por 01 Rodada (1×/combate).',
      },
    },
    LUTADOR: {
      name: 'Lutador',
      desc: 'Versáteis no corpo-a-corpo, mestres em combos devastadores que potencializam cada golpe.',
      levels: {
        0.1: 'Adiciona +1d8 + N÷5 de Dano ao Soco e golpes desarmados. A cada 10 Níveis, causa +1d8 adicional.',
        0.2: 'Ao acertar 2 Ataques no Turno, o 3° Ataque tem Vantagem e +2d8 + N÷4 de Dano.',
        0.3: 'Ataque que acerta: usa 05 PE para agarrar o alvo (DT: FOR 16+modFOR para resistir). Grapple causa +1d6/turno.',
        0.4: '1× por combate, ao atingir 50% da vida, recebe +5 + N÷3 em Ataque e +1 Reação até o fim do combate.',
        0.5: 'Ao sofrer 2 Ataques na Rodada, ganha +1 Reação e pode contra-atacar com Vantagem (1×/rodada).',
        0.6: 'Ao atingir 25% da vida, entra em Fúria: +2d10 de Dano em todos os ataques e Vantagem em Fortitude por 3 Rodadas. Gasta 08 PE. 1×/combate.',
      },
    },
    TANK: {
      name: 'Tank',
      desc: 'Pilares de resistência, defensores dedicados que absorvem punição por seus aliados.',
      levels: {
        0.1: 'Recebe +6 de Vida adicional por Nível. Vantagem em testes de Fortitude.',
        0.2: 'Gasta 3 PE para interceptar o dano recebido por um Aliado a até 5m. O Tank recebe o dano com -15% - N÷2%. Usos por combate: 1 + N÷10.',
        0.3: '50% da Constituição se torna sua Armadura Natural. +2 CA contra ataques à distância.',
        0.4: 'Gasta 08 PE para receber (CON + N×3) em Vida Temporária por 3 Rodadas. 1×/combate + N÷15 usos adicionais.',
        0.5: 'Gasta (4 + N÷5) PE para reduzir 40% + N÷2% do Dano Físico recebido. Usos por combate: 2 + N÷10.',
        0.6: 'Forma Bastião: Gasta 12 PE para entrar em postura por 4 Rodadas — recebe -35% de dano mas causa -25% de dano. Forma Berserker: Gasta 08 PE — causa +40% de dano mas sofre +30% de dano. Apenas 1 forma ativa por vez (1×/combate cada).',
      },
    },
    SOLDADO: {
      name: 'Soldado',
      desc: 'Incansáveis na linha de frente, especialistas em armamento que dominam qualquer arma.',
      levels: {
        0.1: 'Ganha +5 em Iniciativa e +1 Ação de Movimento adicional na 1ª Rodada de cada combate.',
        0.2: 'Caso tenha crítico, gasta (3 + N÷5) PE para adicionar +(2d8 + N÷3) de Dano nos próximos 3 Ataques.',
        0.3: 'Gasta (04 + N÷10) PE para atordoar o alvo (DT: CON 16+modCON); desvantagem na próxima ação.',
        0.4: 'Gasta (5 + N÷10) PE para realizar 1 Ataque adicional no turno (limite 2×/rodada).',
        0.5: 'Consegue ignorar (15 + N) Pontos de Armadura do Inimigo com ataques corpo-a-corpo.',
        0.6: 'Escolhe uma Arma Favorita; ela recebe +2 Dados (ex.: 2d10 → 4d10) e +(1 + N÷5) no Resultado.',
      },
    },
  },
  OPERATIVO: {
    ASSASSINO: {
      name: 'Assassino',
      desc: 'Especialistas em eliminar alvos com alto dano explosivo, cada golpe mais letal que o anterior.',
      levels: {
        0.1: 'Após 3 Golpes no mesmo alvo, o próximo causa +(2d10 + N÷3) de dano. Usos por combate: 2 + N÷15.',
        0.2: 'A cada 15 DES, recebe +1 Reação. +(1 + N÷5) em Ataque contra alvos com <50% vida.',
        0.3: '06 PE define um alvo marcado; +(1d6 + N÷5) em Testes de Ataque contra ele por 4 Rodadas (1×/combate).',
        0.4: 'Pode gastar 05 PE para duplicar o dano de um Ataque bem-sucedido como dano verdadeiro (ignora armadura). Usos por combate: 1 + N÷15.',
        0.5: 'Ao atingir crítico, aplica +(2d8 + N÷5) de Dano por 3 Rodadas. 1×/alvo.',
        0.6: 'Até (1 + N÷15)× por combate, pode fazer uma ação com crítico garantido. Se eliminar o alvo, recupera (3 + N÷3) PE.',
      },
    },
    INFILTRADO: {
      name: 'Infiltrado',
      desc: 'Especialistas em evitar detecção, atacar onde não esperam e desaparecer sem deixar rastro.',
      levels: {
        0.1: 'Ataques furtivos causam +(2d8 + N÷4) de Dano. +1d8 adicional a cada 10 Níveis.',
        0.2: 'Pode se deslocar livremente enquanto furtivo, sem testes. Inimigos tentando detectá-lo sofrem DT = 12 + DES + N÷3.',
        0.3: 'Gastar ação de movimento e (5 + N÷5) PE dobra o bônus do ataque furtivo neste ataque (1×/rodada).',
        0.4: 'Após ataque furtivo, pode gastar 06 PE para se reposicionar até 10m em furtividade sem provocar Ataques de Oportunidade (1×/rodada).',
        0.5: 'Após atacar, pode gastar (6 + N÷5) PE para receber +(10 + N÷2) no teste de furtividade (ação livre). 1×/rodada.',
        0.6: 'Se dano furtivo causar >25% da vida do alvo, ele cai inconsciente (DT CON 16 + N÷2). 1×/combate.',
      },
    },
    ATIRADOR: {
      name: 'Atirador',
      desc: 'Especialistas em combate à distância e precisão letal, nenhum alvo está fora de alcance.',
      levels: {
        0.1: 'Vantagem em Pontaria. Ataques à distância ganham +(1d4 + N÷5) de dano.',
        0.2: 'Soma o Valor total da Inteligência ao dano de Armas à distância.',
        0.3: 'Gasta (6 + N÷5) PE para disparar mais uma vez com -1d4 no resultado (limite 2×/turno).',
        0.4: 'Gasta 08 PE para realizar Tiro Perfurante: projétil atravessa inimigos em linha (até 2 alvos), ignora armadura até INT pontos. 1×/rodada.',
        0.5: 'Ao Mirar (ação), gasta (5 + N÷5) PE: margem de crítico +2 e ignora cobertura. OU gasta o dobro do PE para obter o mesmo buff como ação livre.',
        0.6: 'Crítico causa +2× no Dano de Arma à Distância (2× por Combate). Alvos a >20m sofrem +(2d8 + N÷5).',
      },
    },
    'TÉCNICO': {
      name: 'Técnico',
      desc: 'Especialistas em tecnologia e modificações, transformam qualquer arma em uma obra-prima mortal.',
      levels: {
        0.1: 'Gasta 02 PE por combate para calibrar armas — adiciona o maior Atributo no Dano por toda a cena.',
        0.2: 'Gasta 04 PE para improvisar uma modificação em arma de aliado: +(1d6 + N÷5) de dano por 3 rodadas. 1× por arma por combate.',
        0.3: 'Após acertar um Ataque, gasta 03 PE para aplicar Desvantagem no Ataque ou Defesa do alvo por 03 Rodadas (1×/alvo).',
        0.4: 'Explosivos causam INT×2 na soma do Dano. Área de efeito aumentada em 50%.',
        0.5: 'Gasta (8 + N÷5) PE para modificar uma Arma — recebe Vantagem +(1d4 + N÷5) de dano até fim do combate (1 arma por vez).',
        0.6: '1 Ação e (10 + N÷3) PE aplica +(4d10 + N÷3) de Dano em uma arma por 3 Rodadas. Acumula com outros buffs.',
      },
    },
  },
  MISTICO: {
    COMBATE: {
      name: 'Combate',
      desc: 'Especialistas em magia ofensiva, canais de destruição arcanos que consomem inimigos sem piedade.',
      levels: {
        0.1: 'Após atingir o mesmo alvo 3× (qualquer ataque), recebe +(2 + N÷5) de Energia. 1× por alvo por combate.',
        0.2: 'Adiciona +1d6+modAM a cada 10 Níveis no Dano Base de habilidades mágicas.',
        0.3: 'Ao atingir crítico com habilidade, pode gastar 06 PE para aplicar +1d8 de dano por nível da habilidade ao alvo e adjacentes. 1×/rodada.',
        0.4: 'Ao eliminar um inimigo, recupera (AM + N÷2) de Energia. 1× por alvo por combate.',
        0.5: 'Gasta (8 + N÷5) PE — nos próximos 2 Ataques com habilidade, soma AM no Dano e recupera 1 PE por acerto.',
        0.6: 'Após atingir o mesmo alvo 3×, escolhe: recebe +(AM + N÷3) de Energia OU +(2d10 + modAM) no próximo ataque. 1× por alvo por combate.',
      },
    },
    SUPORTE: {
      name: 'Suporte',
      desc: 'Místicos versáteis focados em fortalecer aliados e virar o curso da batalha.',
      levels: {
        0.1: 'Gasta (10 + N÷5) PE para reduzir 30% do custo de Buffs de aliados por 3 Rodadas (1×/combate).',
        0.2: 'Gasta (3 + N÷5) PE e 1 Ação de Movimento para remover um efeito negativo de aliado e curar (1d6 + N÷3) de vida.',
        0.3: 'Gasta (5 + N÷5) PE ao ajudar aliado: ambos recebem +(2 + N÷5) em Reações e +2 CA até próximo turno. 1×/rodada.',
        0.4: '1× por Cena, gasta (12 + N÷3) PE para recuperar aliado em "Morrendo" com (25 + N)% da Vida + Temporária (CON).',
        0.5: 'Gasta (8 + N÷5) PE para criar Vínculo de Vida com 1 aliado por 3 Rodadas: 50% do dano recebido pelo aliado é redirecionado a você (resistido com Fortitude).',
        0.6: 'Gasta (10 + N÷3) PE para ampliar em 1.5× um Buff ativo em aliado e estender em +2 Rodadas. 1× por combate.',
      },
    },
    INTUITIVO: {
      name: 'Intuitivo',
      desc: 'Canaliza magia interna espontaneamente, adapta-se ao combate e transforma adversidade em poder.',
      levels: {
        0.1: 'A cada 5 Níveis, recebe 50% de sua Aura Mágica em Energia permanente.',
        0.2: 'Ao receber dano, pode gastar 04 PE para converter até (AM + N÷3) do dano sofrido em Energia. 1×/rodada.',
        0.3: 'Gasta (8 + N÷5) PE para conjurar Habilidade como Ação de Movimento (1×/rodada).',
        0.4: 'Usa (12 + N÷3) PE para criar combo com até 3 Habilidades em 1 ação. Custo total de Energia ≤ Energia máxima. 1×/combate.',
        0.5: 'Gasta (6 + N÷5) PE para conceder +(1d8 + N÷5) de Dano temporário a todos os aliados por 2 Rodadas. 1×/combate.',
        0.6: 'Recebe 1 Habilidade Passiva extra. Ao conjurar habilidades em combos, o custo total é reduzido em -(5 + N÷5)%.',
      },
    },
    GRADUADO: {
      name: 'Graduado',
      desc: 'Estudiosos de Alquimia, Rituais e Artefatos, mestres do conhecimento arcano que decifram fraquezas.',
      levels: {
        0.1: 'Permite converter 03 Energia em 01 PE e vice-versa (ação livre, até (1 + N÷10)× por combate).',
        0.2: 'Aprende (Mod.INT÷4, mín. 1) habilidades extras. +(3 + N÷3) em testes de Conhecimento.',
        0.3: 'Gasta (6 + N÷5) PE após inimigo resistir à sua habilidade: na próxima ação contra ele, recebe Vantagem e ele sofre -4 na defesa (1×/alvo/combate).',
        0.4: 'Sucesso crítico retorna (10 + N×2) de Energia. 1×/rodada.',
        0.5: 'Aprende +(Mod.INT÷4, mín. 1) habilidades extras (incluindo Ultimate, se N20+). Habilidades de Alquimia causam +20% dano.',
        0.6: 'Gasta (8 + N÷3) PE para identificar fraqueza: Vantagem no Ataque, ignora Armadura e +(2d8 + N÷3) de dano por 2 Rodadas (1×/alvo/combate).',
      },
    },
  },
}

const TRIAGE_ASCENSIONS = {
  GUERREIRO: {
    'TÁTICO': {
      0.7: 'Comando Supremo: 1x/combate, gasta 15 PE para permitir que ate 2 aliados usem uma reacao ofensiva imediata. Aliados recebem +N/4 no resultado.',
      0.8: 'Plano Impossivel: 1x/cena, transforma uma falha critica de aliado em sucesso normal e concede +3 CA para o grupo por 1 rodada.',
    },
    LUTADOR: {
      0.7: 'Combo Ascendente: a cada 4 acertos no mesmo turno, adiciona +3d10 + N/3 ao ultimo golpe e recupera 1 reacao.',
      0.8: 'Corpo Invencivel: 1x/combate, por 2 rodadas, golpes desarmados ignoram 25 de armadura e reduzem dano recebido corpo-a-corpo em 25%.',
    },
    TANK: {
      0.7: 'Muralha Viva: aliados a 5m recebem metade da sua Armadura Natural contra o primeiro dano de cada rodada.',
      0.8: 'Fortaleza Absoluta: 1x/combate, gasta 18 PE para nao cair abaixo de 1 Vida por 1 rodada e reduzir todo dano recebido em N%.',
    },
    SOLDADO: {
      0.7: 'Cadencia Perfeita: a arma favorita recebe +1 dado adicional e +N/4 no resultado enquanto estiver equipada.',
      0.8: 'Veterano Lendario: 1x/combate, apos acertar um ataque, realiza uma sequencia extra com ate 2 ataques com -2 no resultado.',
    },
  },
  OPERATIVO: {
    ASSASSINO: {
      0.7: 'Execucao Limpa: contra alvos abaixo de 35% de Vida, o primeiro ataque da rodada ignora N/2 de armadura.',
      0.8: 'Morte Anunciada: 1x/combate, marca um alvo; se ele cair em 2 rodadas, recupera 10 PE e ganha uma acao de movimento.',
    },
    INFILTRADO: {
      0.7: 'Identidade Fantasma: em furtividade, a primeira deteccao falha automaticamente 1x/cena; ataques furtivos ganham +N/3.',
      0.8: 'Sombra Perfeita: 1x/combate, apos atacar, fica intangivel para ataques de oportunidade ate o inicio do proximo turno.',
    },
    ATIRADOR: {
      0.7: 'Linha Mortal: ataques a distancia contra alvos a mais de 20m recebem +INT/2 no resultado e ignoram cobertura leve.',
      0.8: 'Tiro de Horizonte: 1x/combate, um disparo critico dobra o bonus de INT e perfura ate 3 alvos alinhados.',
    },
    'TÉCNICO': {
      0.7: 'Engenharia de Campo: calibragem passa a afetar 2 armas por cena; cada uma recebe +N/5 dano adicional.',
      0.8: 'Obra-Prima Tática: 1x/cena, cria ou ajusta um modulo temporario em arma/equipamento por 1 combate, sujeito ao Mestre.',
    },
  },
  MISTICO: {
    COMBATE: {
      0.7: 'Canalizador Arcano: o bonus de dano base magico tambem recebe +AM/2 quando o alvo ja sofreu dano seu neste combate.',
      0.8: 'Ruina Convergente: 1x/combate, apos 3 acertos magicos, o proximo ataque adiciona +2d10 + N/2 de dano verdadeiro.',
    },
    SUPORTE: {
      0.7: 'Vinculo Maior: buffs ampliados por voce concedem +N/5 de Vida temporaria ou +N/10 PE ao alvo.',
      0.8: 'Milagre Coordenado: 1x/cena, impede que um aliado caia e restaura 25% da Vida maxima dele como Vida temporaria.',
    },
    INTUITIVO: {
      0.7: 'Fluxo Espontaneo: a cada 10 niveis, recebe +1 PE maximo e reduz em 1 PE o primeiro combo do combate.',
      0.8: 'Instinto Impossivel: 1x/combate, transforma uma habilidade ativa em reacao se seu custo couber na Energia atual.',
    },
    GRADUADO: {
      0.7: 'Teoria Suprema: aprende +1 habilidade extra e recebe +N/5 em testes de conhecimento magico.',
      0.8: 'Formula Final: 1x/cena, reduz pela metade o custo de PE de um ritual, alquimia ou artefato aprovado pelo Mestre.',
    },
  },
}

Object.entries(TRIAGE_ASCENSIONS).forEach(([classKey, triages]) => {
  Object.entries(triages).forEach(([triageKey, levels]) => {
    if (TRIAGES[classKey]?.[triageKey]) Object.assign(TRIAGES[classKey][triageKey].levels, levels)
  })
})

export function getTriageLevels(classKey, triageKey) {
  return TRIAGES[classKey]?.[triageKey]?.levels || {}
}

export function getAllTriagesForClass(classKey) {
  return TRIAGES[classKey] || {}
}

export function getAllTriages() {
  return TRIAGES
}
