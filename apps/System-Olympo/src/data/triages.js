export const TRIAGES = {
  GUERREIRO: {
    TÁTICO: {
      name: 'Tático',
      desc: 'Mestres estrategistas que manipulam o campo de batalha através de marcações e comandos.',
      levels: {
        0.1: 'Gasta 1 PE para rolar novamente um teste falho seu ou de aliado (Limite 2×/Rodada).',
        0.2: '03 PE — Marca Alvo; ataques aliados ganham +12 de Dano contra ele por 04 Rodadas.',
        0.3: 'Marca 02 Inimigos simultaneamente; se ambos caírem em 03 Rodadas, aliados recuperam 08 PE.',
        0.4: 'Com 06 PE, escolhe 01 Aliado para atacar junto; ambos recebem +4 no Resultado.',
        0.5: '1× por Combate, todos os Aliados podem mover 15m sem Ataques de Oportunidade e ganham +2 CA por 1 Rodada.',
        0.6: 'Gasta 10 PE para conceder 1 Ação Padrão + 1 Ação de Movimento a 01 Aliado por 01 Rodada.',
      },
    },
    LUTADOR: {
      name: 'Lutador',
      desc: 'Versáteis no corpo-a-corpo, mestres em combos devastadores e reações explosivas.',
      levels: {
        0.1: 'Adiciona +1d12+FOR de Dano ao seu Soco e golpes desarmados.',
        0.2: 'Ao acertar 2 Ataques no Turno, o 3° Ataque tem Vantagem e +3d8 de Dano.',
        0.3: 'Ataque que acerta: usa 05 PE para agarrar o alvo (DT: FOR 16+modFOR para resistir). Grapple causa +1d6/turno.',
        0.4: '1× por combate, ao atingir 50% da vida, recebe +6 em Ataque e +1 Reação até o fim do combate.',
        0.5: 'Ao sofrer 2 Ataques na Rodada, ganha +1 Reação e pode contra-atacar com Vantagem.',
        0.6: 'Crítico causa +2× o Dano (2× por Combate). Se o alvo cair, recupera 3 PE.',
      },
    },
    TANK: {
      name: 'Tank',
      desc: 'Pilares de resistência, defensores dedicados que absorvem punição por seus aliados.',
      levels: {
        0.1: 'Recebe +6 de Vida adicional por Nível. Vantagem em testes de Fortitude.',
        0.2: 'Gasta 3 PE para absorver o dano de um Aliado a 5m (recebe +5 PE ao usar esta habilidade).',
        0.3: '50% da Constituição se torna sua Armadura Natural. +2 CA contra ataques à distância.',
        0.4: 'Após crítico bem-sucedido, recebe 100% do CON em Vida Temporária (3 Rodadas).',
        0.5: 'Até 3× por Combate, usa 05 PE para reduzir 50% do Dano Físico recebido e ganhar Resistência.',
        0.6: 'Armadura Natural equivale a 100% da Constituição. Aliados adjacentes recebam -2 no dano sofrido.',
      },
    },
    SOLDADO: {
      name: 'Soldado',
      desc: 'Incansáveis na linha de frente, especialistas em armas e técnicas de combate direto.',
      levels: {
        0.1: 'Ganha +5 em Iniciativa e +1 Ação de Movimento adicional na 1ª Rodada de cada combate.',
        0.2: 'Caso tenha crítico, adiciona +3d10 de Dano nos próximos 3 Ataques.',
        0.3: 'Gasta 05 PE para atordoar o alvo (DT: CON 16+modCON); alvo tem desvantagem na próxima ação.',
        0.4: '4 PE permite realizar 1 Ataque adicional no turno (limite 2×/rodada).',
        0.5: 'Consegue ignorar até 20 Pontos de Armadura do Inimigo com ataques corpo-a-corpo.',
        0.6: 'Escolhe uma Arma Favorita; ela recebe +3 Dados (ex.: 2d10 → 5d10) e +2 no Resultado.',
      },
    },
  },
  OPERATIVO: {
    ASSASSINO: {
      name: 'Assassino',
      desc: 'Especialistas em eliminar alvos com alto dano explosivo e golpes fatais.',
      levels: {
        0.1: 'Após 3 Golpes bem-sucedidos em um alvo, o próximo recebe +4d12 de dano.',
        0.2: 'A cada 15 pontos em Destreza, recebe +1 Reação. +1d6 em Testes de Ataque contra alvos com <50% vida.',
        0.3: '06 PE define um alvo; recebe +2d6 em Testes de Ataque contra ele por 4 Rodadas.',
        0.4: 'Ao atacar um alvo pela primeira vez no combate, recebe +1 Ação de Movimento e +1d8 de dano.',
        0.5: 'Ao atingir crítico no inimigo, aplica +3d8 de Dano por 3 Rodadas.',
        0.6: 'Até 2× por combate, pode fazer uma ação com crítico garantido. Se eliminar o alvo, recupera 5 PE.',
      },
    },
    INFILTRADO: {
      name: 'Infiltrado',
      desc: 'Especialistas em evitar detecção e atacar onde menos esperam.',
      levels: {
        0.1: 'Ataques furtivos causam +3d8 de Dano. +1d8 adicional a cada 10 Níveis.',
        0.2: 'Pode se deslocar livremente enquanto furtivo, sem testes. Primeiro ataque furtivo do combate tem Vantagem.',
        0.3: 'Gastar a ação de movimento e 5 PE dobra o bônus do ataque furtivo neste ataque.',
        0.4: 'Caso ataque furtivo seja crítico, recebe Vantagem nos próximos 2 Ataque e +2d6 de dano.',
        0.5: 'Após um ataque, pode gastar 5 PE para receber +15 no teste de furtividade (ação livre).',
        0.6: 'Se o dano furtivo causar >30% da vida do alvo, ele cai inconsciente (DT CON 22). 1×/combate.',
      },
    },
    ATIRADOR: {
      name: 'Atirador',
      desc: 'Especialistas em combate à distância e precisão letal.',
      levels: {
        0.1: 'Vantagem em Pontaria. Ataques à distância ganham +1d6 de dano.',
        0.2: 'Soma o Valor total da Inteligência ao dano de Armas à distância.',
        0.3: 'A cada 8 PE gastos em ataques, permite disparar mais uma vez (limite 3× no Turno).',
        0.4: 'Usando Armas à distância, pode usar 4 PE para Derrubar/Empurrar (DT FOR 16). +1d10 se acertar.',
        0.5: 'Ao Mirar (ação), pode gastar 5 PE para aumentar margem de crítico em +2 e ignorar cobertura.',
        0.6: 'Crítico causa +2× no Dano de Arma à Distância (2× por Combate). Alvos a >20m sofrem +3d8.',
      },
    },
    'TÉCNICO': {
      name: 'Técnico',
      desc: 'Especialistas em tecnologia, gadgets e modificações de armamento.',
      levels: {
        0.1: 'Ajusta a arma ao Usuário, adicionando o maior Atributo no Dano de todas as armas equipadas.',
        0.2: '+12 em Testes de Computação/Engenharia. Pode criar gadgets básicos com materiais do ambiente.',
        0.3: 'Após acertar um Ataque, aplica Desvantagem no Ataque ou Defesa do alvo por 03 Rodadas.',
        0.4: 'Explosivos causam INT×2 na soma do Dano. Área de efeito aumentada em 50%.',
        0.5: 'Gasta 06 PE para modificar uma Arma e deixá-la com Vantagem até fim do combate.',
        0.6: '1 Ação e 8 PE aplica +5d10 de Dano em uma arma por 3 Rodadas. Acumula com outros buffs.',
      },
    },
  },
  MISTICO: {
    COMBATE: {
      name: 'Combate',
      desc: 'Especialistas em magia ofensiva, canais de destruição arcanos.',
      levels: {
        0.1: 'Após atingir o mesmo alvo 3×, recebe +10 de Energia (limite = 2× Aura Mágica).',
        0.2: 'Adiciona +1d8+FOR a cada 10 Níveis no Dano Base de habilidades mágicas.',
        0.3: 'Ao sofrer dano mágico, pode gastar 4 PE para reduzi-lo em 40%.',
        0.4: 'Eliminar ou Derrotar um inimigo retorna 60% da Energia gasta na ação (Máx = 2× AM).',
        0.5: 'Ao atingir crítico com habilidade, sua Aura Mágica é somada no Dano e recupera 3 PE.',
        0.6: 'Após atingir o mesmo alvo 3×, recebe +20 de Energia e +1d12 de dano no próximo ataque.',
      },
    },
    SUPORTE: {
      name: 'Suporte',
      desc: 'Místicos focados no apoio e cura de aliados, pilares da sobrevivência do grupo.',
      levels: {
        0.1: 'Gasta 8 PE para reduzir 35% do custo de Habilidades que concedem Buffs a aliados por 3 Rodadas.',
        0.2: 'Usa 1 Ação de Movimento para remover um efeito negativo de um aliado. +1d4 de cura ao aliado.',
        0.3: 'Ao ajudar um aliado, usa 4 PE para que ambos recebam +5 em Reações e +2 CA até próximo turno.',
        0.4: '1× por Cena, usa 10 PE para recuperar aliado em "Morrendo" com 35% da Vida + Vida Temporária (CON).',
        0.5: 'Usa 5 PE para remover um Ferimento recente e conceder +2 Fortitude por 2 Rodadas.',
        0.6: 'Pode usar 6 PE para ampliar em 50% um Buff ativo em aliado e estender em +1 Rodada.',
      },
    },
    INTUITIVO: {
      name: 'Intuitivo',
      desc: 'Canaliza magia interna espontaneamente, adaptando habilidades ao momento.',
      levels: {
        0.1: 'A cada 5 Níveis, recebe 50% de sua Aura Mágica em Energia permanente.',
        0.2: 'Gastando 3 PE, pode aumentar o alcance em 50% ou a área em +2m de uma Habilidade.',
        0.3: 'Gasta 05 PE para conjurar Habilidade como Ação de Movimento (1×/rodada).',
        0.4: 'Usa 8 PE para criar um combo que utilize até 3 Habilidades em 1 ação (limite de custo total = AM×2).',
        0.5: '5 PE para aplicar novo efeito à habilidade: +2 Rodadas / +25% dano / Atordoar (DT AM).',
        0.6: 'Recebe 1 Habilidade Passiva extra. Conjurar habilidades fora de combate custa -30% Energia.',
      },
    },
    GRADUADO: {
      name: 'Graduado',
      desc: 'Estudiosos de Alquimia, Rituais e Artefatos, mestres do conhecimento arcano.',
      levels: {
        0.1: 'Permite converter 02 Energia em 01 PE e vice-versa (ação livre, 1×/turno).',
        0.2: 'Aprende Mod.INT÷3 habilidades extras (arredondado para baixo). +5 em testes de Conhecimento.',
        0.3: 'Inimigos que resistem às suas habilidades têm -5 no próximo Teste e sofrem metade do dano.',
        0.4: 'Sucesso crítico retorna 50% da Energia/PE gastos na ação e concede Vantagem no próximo teste.',
        0.5: 'Aprende +Mod.INT÷3 habilidades extras adicionais. Habilidades de Alquimia causam +20% dano.',
        0.6: '5 PE identifica fraqueza; recebe Vantagem no Ataque, ignora Armadura e +2d8 de dano por 2 Rodadas.',
      },
    },
  },
}

export function getTriageLevels(classKey, triageKey) {
  return TRIAGES[classKey]?.[triageKey]?.levels || {}
}

export function getAllTriagesForClass(classKey) {
  return TRIAGES[classKey] || {}
}

export function getAllTriages() {
  return TRIAGES
}
