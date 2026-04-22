export const TRIAGES = {
  GUERREIRO: {
    TÁTICO: {
      name: 'Tático',
      desc: 'Mestres estrategistas que manipulam o campo de batalha.',
      levels: {
        0.1: 'Com uma falha sua ou de aliado, gasta 1 PE para rolar novamente (Limite 2×/Rodada).',
        0.2: '03 PE — Marca Alvo; ataques aliados ganham +10 de Dano contra ele por 03 Rodadas.',
        0.3: 'Marca 02 Inimigos; se ambos caírem em 03 Rodadas, aliados recuperam 05 PE.',
        0.4: 'Com 06 PE, escolhe 01 Aliado para atacar junto; ambos recebem +3 no Resultado.',
        0.5: '1× por Combate, todos os Aliados podem mover 10m sem Ataques de Oportunidade.',
        0.6: 'Gasta 10 PE para conceder 1 Ação Padrão a 01 Aliado por 01 Rodada.',
      },
    },
    LUTADOR: {
      name: 'Lutador',
      desc: 'Versáteis no corpo-a-corpo, mestres em ataques rápidos.',
      levels: {
        0.1: 'Adiciona +1d10+FOR de Dano ao seu Soco.',
        0.2: 'Ao acertar 2 Ataques no Turno, o 3° Ataque tem Vantagem e +2d8 de Dano.',
        0.3: 'Ataque que acerta: usa 06 PE para agarrar o alvo (DT: FOR 18+modFOR para resistir).',
        0.4: '1× por combate, ao atingir 50% da vida, recebe +5 em Ataque.',
        0.5: 'Ao sofrer 2 Ataques na Rodada, ganha +1 Reação até seu Turno.',
        0.6: 'Crítico causa +1,5× o Dano (2× por Combate).',
      },
    },
    TANK: {
      name: 'Tank',
      desc: 'Pilares de resistência, defensores dedicados.',
      levels: {
        0.1: 'Recebe +5 de Vida adicional por Nível.',
        0.2: 'Gasta 3 PE para tentar absorver o dano por um Aliado a 5m (+5 PE Garantido).',
        0.3: '50% da Constituição se torna sua Armadura Natural.',
        0.4: 'Após crítico bem-sucedido, recebe 100% do CON em Vida Temporária (2 Rodadas).',
        0.5: 'Até 3× por Combate, usa 06 PE para reduzir 50% do Dano Físico recebido.',
        0.6: 'Sua Armadura Natural agora equivale a 100% da Constituição.',
      },
    },
    SOLDADO: {
      name: 'Soldado',
      desc: 'Incansáveis na linha de frente, técnicas diretas de combate.',
      levels: {
        0.1: 'Ganha +5 em Iniciativa && +1 Ação de Movimento adicional na 1ª Rodada.',
        0.2: 'Caso tenha crítico, adiciona +2d10 de Dano nos próximos 3 Ataques.',
        0.3: 'Gasta 06 PE para atordoar o alvo (DT: CON 16+modCON); desvantagem na próxima ação.',
        0.4: '4 PE permite realizar 1 Ataque adicional no turno.',
        0.5: 'Consegue ignorar até 15 Pontos de Armadura do Inimigo.',
        0.6: 'Escolhe uma Arma Favorita; ela recebe +3 Dados (ex.: 2d10 → 5d10).',
      },
    },
  },
  OPERATIVO: {
    ASSASSINO: {
      name: 'Assassino',
      desc: 'Especialistas em eliminar alvos com alto dano explosivo.',
      levels: {
        0.1: 'Após 3 Golpes bem-sucedidos em um alvo, o próximo recebe +3d12 de dano.',
        0.2: 'A cada 15 pontos em Destreza, recebe +1 Reação.',
        0.3: '06 PE define um alvo; recebe +1d6 em Testes de Ataque contra ele por 4 Rodadas.',
        0.4: 'Ao atacar um alvo pela primeira vez, recebe +1 Ação de Movimento.',
        0.5: 'Ao atingir crítico no inimigo, aplica +2d8 de Dano por 3 Rodadas.',
        0.6: 'Até 2× por combate, pode fazer uma ação com crítico garantido.',
      },
    },
    INFILTRADO: {
      name: 'Infiltrado',
      desc: 'Especialistas em evitar detecção.',
      levels: {
        0.1: 'Ataques furtivos causam +2d8 de Dano a cada 10 Níveis.',
        0.2: 'Pode se deslocar livremente enquanto furtivo, sem testes.',
        0.3: 'Gastar a ação de movimento e 5 PE dobra o bônus do ataque furtivo neste ataque.',
        0.4: 'Caso ataque furtivo seja crítico, recebe Vantagem no próximo Ataque.',
        0.5: 'Após um ataque, pode gastar 6 PE para receber +12 no teste de furtividade.',
        0.6: 'Se o dano furtivo causar >40% da vida do alvo, ele cai inconsciente (DT CON 20).',
      },
    },
    ATIRADOR: {
      name: 'Atirador',
      desc: 'Especialistas em combate à distância e precisão.',
      levels: {
        0.1: 'Vantagem em Pontaria.',
        0.2: 'Soma o Valor da Inteligência ao dano de Armas.',
        0.3: 'A cada 10 PE gastos, permite disparar mais uma vez (limite 3× no Turno).',
        0.4: 'Usando Armas, pode usar 4 PE para Derrubar/Empurrar (DT FOR 16).',
        0.5: 'Ao Mirar (ação), pode gastar 5 PE para reduzir −1 a chance de Crítico do inimigo.',
        0.6: 'Crítico causa +1,5× no Dano de Arma à Distância (2× por Combate).',
      },
    },
    'TÉCNICO': {
      name: 'Técnico',
      desc: 'Especialistas em tecnologia e gadgets.',
      levels: {
        0.1: 'Ajusta a arma ao Usuário, adicionando o maior Atributo no Dano.',
        0.2: '+10 em Testes de Computação/Engenharia.',
        0.3: 'Após acertar um Ataque, aplica Desvantagem no Ataque ou Defesa por 03 Rodadas.',
        0.4: 'Explosivos causam INT×2 na soma do Dano.',
        0.5: 'Gasta 08 PE para modificar uma Arma e deixá-la com Vantagem até fim do combate.',
        0.6: '1 Ação e 8 PE aplica +5d8 de Dano em uma arma.',
      },
    },
  },
  MISTICO: {
    COMBATE: {
      name: 'Combate',
      desc: 'Especialistas em magia ofensiva.',
      levels: {
        0.1: 'Após atingir o mesmo alvo 3×, recebe +8 de Energia (limite = Aura Mágica).',
        0.2: 'Adiciona +1d6+5 a cada 10 Níveis no Dano Base.',
        0.3: 'Ao sofrer dano mágico, pode gastar 5 PE para reduzi-lo em 30%.',
        0.4: 'Eliminar ou Derrotar um inimigo retorna 50% da Energia gasta (Máx = AM).',
        0.5: 'Ao atingir crítico com habilidade, sua Aura Mágica é somada no Dano.',
        0.6: 'Agora, após atingir o mesmo alvo 3×, recebe +15 de Energia.',
      },
    },
    SUPORTE: {
      name: 'Suporte',
      desc: 'Místicos focados no apoio e cura de aliados.',
      levels: {
        0.1: 'Gasta 10 PE para reduzir 30% do custo de Habilidades que concedem Buffs.',
        0.2: 'Usa 1 Ação de Movimento para remover um efeito negativo de um aliado.',
        0.3: 'Ao ajudar um aliado, usa 5 PE para que ambos recebam +5 em Reações até próximo turno.',
        0.4: '1× por Cena, usa 12 PE para recuperar aliado em "Morrendo" com 25% da Vida.',
        0.5: 'Usa 6 PE para remover um Ferimento recente.',
        0.6: 'Pode usar 6 PE para ampliar em 40% um Buff ativo em aliado.',
      },
    },
    INTUITIVO: {
      name: 'Intuitivo',
      desc: 'Canaliza magia interna espontaneamente.',
      levels: {
        0.1: 'A cada 5 Níveis, recebe 50% de sua Aura Mágica em Energia.',
        0.2: 'Gastando 3 PE, pode aumentar o alcance ou a área de uma Habilidade.',
        0.3: 'Gasta 06 PE para conjurar Habilidade como Ação de Movimento.',
        0.4: 'Usa 10 PE para criar um combo que utilize até 3 Habilidades.',
        0.5: '5 PE para aplicar novo efeito à habilidade: +2 Rodadas / +20% dano / Atordoar.',
        0.6: 'Recebe 1 nova Habilidade Passiva.',
      },
    },
    GRADUADO: {
      name: 'Graduado',
      desc: 'Estudiosos de Alquimia, Rituais e Artefatos.',
      levels: {
        0.1: 'Permite converter 03 Energia em 01 PE e vice-versa.',
        0.2: 'Aprende Mod.INT÷3 habilidades extras (arredondado para baixo).',
        0.3: 'Inimigos que resistem às suas habilidades têm −4 no próximo Teste.',
        0.4: 'Sucesso crítico retorna 50% da Energia/PE gastos na ação (exceto Ultimate).',
        0.5: 'Aprende +Mod.INT÷3 habilidades extras adicionais.',
        0.6: '5 PE identifica fraqueza; recebe Vantagem no Ataque e ignora Armadura.',
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
