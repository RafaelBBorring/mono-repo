export const EVOLUTION_ABILITIES = {

  // ═══════════════════════════════════════════
  // VAMPIRO — Sangue / Sombra / Necromancia
  // ═══════════════════════════════════════════
  'vamp_sangue_2_evo': {
    nome: 'Dreno Vital',
    custo: '4 energia',
    tipo: 'Ativa',
    descricao: 'Toque vampírico que suga a força vital do alvo. Causa [⌊Nível÷2⌋]d8 + modFOR de dano necrótico e recupera 50% do dano como HP.',
  },
  'vamp_sombra_3_evo': {
    nome: 'Passo Sombrio',
    custo: '5 energia',
    tipo: 'Ativa',
    descricao: 'Fundir-se nas sombras e ressurgir até [3 + ⌊Nível÷5⌋] metros de distância. O próximo ataque neste turno causa +[⌊Nível÷2⌋]d6 de dano sombrio.',
  },
  'vamp_sangue_3_evo': {
    nome: 'Mordida Voraz',
    custo: '5 energia',
    tipo: 'Ativa',
    descricao: 'Mordida que dilacera carne e alma. Causa [⌊Nível÷2⌋]d10 + modFOR de dano. O alvo sangra por [⌊Nível÷3⌋]d6 de dano por rodada durante [1 + ⌊Nível÷5⌋] rodadas.',
  },
  'vamp_sangue_4_evo': {
    nome: 'Frenesi Sanguíneo',
    custo: '6 energia',
    tipo: 'Ativa',
    descricao: 'Entrar em frenesi ao absorver sangue. Recupera [⌊Nível÷2⌋]d6 + modCON de HP imediatamente e ganha +[⌊Nível÷4⌋] em FOR e DES por [1 + ⌊Nível÷5⌋] rodadas.',
  },
  'vamp_sangue_5_evo': {
    nome: 'Pele Cadavérica',
    custo: '5 energia',
    tipo: 'Ativa',
    descricao: 'A pele se torna pálida e rígida como mármore. Reduz todo dano recebido em [⌊Nível÷3⌋] por [1 + ⌊Nível÷4⌋] rodadas. Imune a atordoamento enquanto ativa.',
  },
  'vamp_necro_4_evo': {
    nome: 'Enxame Escarlate',
    custo: '7 energia',
    tipo: 'Ativa',
    descricao: 'Convocar um enxame de morcegos necróticos em área de [2 + ⌊Nível÷5⌋]m. Causa [⌊Nível÷3⌋]d6 + modAM de dano necrótico a todos os inimigos. Inimigos atingidos ficam cegos por 1 rodada.',
  },
  'vamp_sangue_regen_evo': {
    nome: 'Hibernação Sombria',
    custo: '6 energia',
    tipo: 'Ativa',
    descricao: 'Entrar em estado de hibernação por 1 rodada. Recupera [Nível] + modCON de HP e fica imune a dano neste turno. Quebra-se se atacado por luz solar direta.',
  },

  // ═══════════════════════════════════════════
  // HUMANO — Determinação / Adaptabilidade
  // ═══════════════════════════════════════════
  'hum_det_2_evo': {
    nome: 'Segundo Fôlego',
    custo: '4 energia',
    tipo: 'Ativa',
    descricao: 'Quando abaixo de 30% HP, recuperar [⌊Nível÷2⌋]d8 + modCON de HP instantaneamente. Não pode ser usado novamente por [5 − ⌊Nível÷10⌋] rodadas (mín. 1).',
  },
  'hum_adapt_1_evo': {
    nome: 'Análise Tática',
    custo: '3 energia',
    tipo: 'Ativa',
    descricao: 'Estudar o oponente por 1 rodada. O próximo ataque contra ele causa +[⌊Nível÷2⌋]d6 de dano e ignora CA. Requer CD 10 + ⌊Nível÷2⌋ + modINT.',
  },
  'hum_det_4_evo': {
    nome: 'Vontade Inabalável',
    custo: '5 energia',
    tipo: 'Ativa',
    descricao: 'Por [1 + ⌊Nível÷5⌋] rodadas, fica imune a medo, charme, paralisia e atordoamento. Recupera [⌊Nível÷3⌋]d6 + modCON de HP ao ativar.',
  },
  'hum_adapt_3_evo': {
    nome: 'Adaptação Rápida',
    custo: '4 energia',
    tipo: 'Ativa',
    descricao: 'Ganha proficiência temporária em uma perícia ou tipo de dano escolhido por [1 + ⌊Nível÷4⌋] rodadas. O bônus é +[⌊Nível÷3⌋] na perícia ou resistência.',
  },
  'hum_det_5_evo': {
    nome: 'Fúria Interior',
    custo: '6 energia',
    tipo: 'Ativa',
    descricao: 'Canalizar a determinação humana em poder bruto. Por [1 + ⌊Nível÷4⌋] rodadas, ataques causam +[⌊Nível÷3⌋]d8 de dano e ganha +[⌊Nível÷5⌋] em FOR.',
  },
  'hum_det_regen_evo': {
    nome: 'Recuperação de Batalha',
    custo: '4 energia',
    tipo: 'Ativa',
    descricao: 'Recupera [⌊Nível÷2⌋]d6 + modCON de HP e remove um efeito negativo (sangramento, veneno, doença). Pode ser usado uma vez a cada [3] rodadas.',
  },

  // ═══════════════════════════════════════════
  // HUMANO_APRIMORADO — Sintético / Biológico / Híbrido
  // ═══════════════════════════════════════════
  'apr_sintetico_1_evo': {
    nome: 'Blindagem Tática',
    custo: '4 energia',
    tipo: 'Ativa',
    descricao: 'Ativar blindagem subcutânea reforçada. +[2 + ⌊Nível÷4⌋] CA por [1 + ⌊Nível÷4⌋] rodadas. Reflete [⌊Nível÷4⌋]d6 de dano a atacantes corpo-a-corpo.',
  },
  'apr_biologico_2_evo': {
    nome: 'Regeneração Celular',
    custo: '5 energia',
    tipo: 'Ativa',
    descricao: 'Acelerar a regeneração biológica. Recupera [⌊Nível÷2⌋]d8 + modCON de HP. Próximos [⌊Nível÷5⌋] ataques regeneram +5 HP por rodada automaticamente.',
  },
  'apr_hibrido_1_evo': {
    nome: 'Overclock Neural',
    custo: '5 energia',
    tipo: 'Ativa',
    descricao: 'Sobrecarregar a interface neural. Por [1 + ⌊Nível÷5⌋] rodadas, ganha +[⌊Nível÷4⌋] em DES e INT e age primeiro em turnos. Após o efeito, sofre [⌊Nível÷5⌋]d6 de dano.',
  },
  'apr_sintetico_3_evo': {
    nome: 'Injeção de Adrenalina',
    custo: '4 energia',
    tipo: 'Ativa',
    descricao: 'Liberar um coquetel sintético de combate. Recupera [⌊Nível÷2⌋]d6 de HP e ganha +[⌊Nível÷3⌋] em FOR por [1 + ⌊Nível÷4⌋] rodadas.',
  },
  'apr_sintetico_4_evo': {
    nome: 'Recalibração de Sistemas',
    custo: '6 energia',
    tipo: 'Ativa',
    descricao: 'Reiniciar todos os implantes. Remove todos os efeitos negativos, recupera [⌊Nível÷3⌋]d6 de HP e [⌊Nível÷3⌋] de energia. Recarga: 1 combate.',
  },

  // ═══════════════════════════════════════════
  // ELFO — Floresta / Arcano / Ancestral
  // ═══════════════════════════════════════════
  'elfo_floresta_3_evo': {
    nome: 'Raízes Restritivas',
    custo: '4 energia',
    tipo: 'Ativa',
    descricao: 'Fazer raízes brotarem do solo em área de [2 + ⌊Nível÷5⌋]m. Inimigos presos devem passar CD 10 + ⌊Nível÷2⌋ + modINT ou ficam imobilizados por [1 + ⌊Nível÷6⌋] rodadas.',
  },
  'elfo_arcano_4_evo': {
    nome: 'Leitura Mágica',
    custo: '3 energia',
    tipo: 'Ativa',
    descricao: 'Analisar o fluxo mágico ao redor. Identifica ilusões, magias ativas e pontos fracos. O próximo ataque mágico causa +[⌊Nível÷2⌋]d6 de dano e ignora resistência mágica.',
  },
  'elfo_ancestral_4_evo': {
    nome: 'Visão do Futuro',
    custo: '4 energia',
    tipo: 'Ativa',
    descricao: 'Vislumbrar os próximos segundos de combate. Por [1 + ⌊Nível÷5⌋] rodadas, ganha +[⌊Nível÷4⌋] em DES (esquiva) e pode rerolar um ataque recebido por rodada.',
  },
  'elfo_floresta_5_evo': {
    nome: 'Bênção da Floresta',
    custo: '6 energia',
    tipo: 'Ativa',
    descricao: 'Invocar a energia vital da floresta. Todos os aliados em [3 + ⌊Nível÷4⌋]m recuperam [⌊Nível÷2⌋]d6 + modINT de HP e ganham +[⌊Nível÷5⌋] CA por [1 + ⌊Nível÷5⌋] rodadas.',
  },
  'elfo_arcano_5_evo': {
    nome: 'Descarga Arcana',
    custo: '7 energia',
    tipo: 'Ativa',
    descricao: 'Liberar uma onda de energia arcana em [3 + ⌊Nível÷4⌋]m. Causa [⌊Nível÷2⌋]d6 + modINT de dano arcano a todos os inimigos. Inimigos atingidos têm -[⌊Nível÷5⌋] em testes mágicos por 2 rodadas.',
  },

  // ═══════════════════════════════════════════
  // BRUXA — Ervas / Pacto / Encantamento
  // ═══════════════════════════════════════════
  'bruxa_ervas_1_evo': {
    nome: 'Cataplasma Curativa',
    custo: '3 energia',
    tipo: 'Ativa',
    descricao: 'Preparar rapidamente um ungüento herbal. Recupera [⌊Nível÷2⌋]d6 + modINT de HP e concede resistência a veneno por [1 + ⌊Nível÷4⌋] rodadas.',
  },
  'bruxa_pacto_3_evo': {
    nome: 'Lança das Sombras',
    custo: '5 energia',
    tipo: 'Ativa',
    descricao: 'Materializar uma lança de energia sombria. Ataque à distância causando [⌊Nível÷2⌋]d8 + modAM de dano necrótico. Ignora [⌊Nível÷4⌋] pontos de CA.',
  },
  'bruxa_pacto_4_evo': {
    nome: 'Maldição de Sangue',
    custo: '6 energia',
    tipo: 'Ativa',
    descricao: 'Amaldiçoar o sangue do alvo (CD 10 + ⌊Nível÷2⌋ + modAM). Em caso de falha, o alvo sofre [⌊Nível÷3⌋]d6 de dano por rodada por [1 + ⌊Nível÷4⌋] rodadas e cura a bruxa em 50% do dano.',
  },
  'bruxa_ervas_4_evo': {
    nome: 'Veneno Natural',
    custo: '4 energia',
    tipo: 'Ativa',
    descricao: 'Envenenar sua arma com toxinas vegetais. Pelos próximos [1 + ⌊Nível÷4⌋] ataques, cada golpe causa +[⌊Nível÷3⌋]d6 de dano de veneno e o alvo sofre -[⌊Nível÷5⌋] em FOR.',
  },
  'bruxa_encantamento_3_evo': {
    nome: 'Sussurro da Terra',
    custo: '5 energia',
    tipo: 'Ativa',
    descricao: 'Encantar o oponente com a voz da própria natureza (CD 10 + ⌊Nível÷2⌋ + modAPA). Em caso de falha, o alvo torna-se aliado por [1 + ⌊Nível÷6⌋] rodadas (máx. 3).',
  },
  'bruxa_pacto_pe_evo': {
    nome: 'Pacto Profundo',
    custo: 'Especial',
    tipo: 'Ativa',
    descricao: 'Sacrificar [⌊Nível÷2⌋] HP para recuperar [3 + ⌊Nível÷4⌋] PE instantaneamente. Pode ser usado fora de combate. O sacrifício não pode reduzir HP abaixo de 1.',
  },

  // ═══════════════════════════════════════════
  // MAGO — Elemental / Arcana / Cronurgia
  // ═══════════════════════════════════════════
  'mago_elemental_2_evo': {
    nome: 'Mudança Elemental',
    custo: '3 energia',
    tipo: 'Ativa',
    descricao: 'Alterar o tipo de dano elemental de sua próxima magia (fogo, gelo, raio, ou ácido). A magia causa +[⌊Nível÷3⌋]d6 de dano do elemento escolhido.',
  },
  'mago_arcana_4_evo': {
    nome: 'Vampiro Arcano',
    custo: '5 energia',
    tipo: 'Ativa',
    descricao: 'Drenar energia mágica do alvo. Causa [⌊Nível÷2⌋]d6 + modINT de dano arcano e recupera [⌊Nível÷3⌋] energia para cada magia que o alvo tenha lançado nas últimas 3 rodadas.',
  },
  'mago_elemental_3_evo': {
    nome: 'Aura Elemental',
    custo: '5 energia',
    tipo: 'Ativa',
    descricao: 'Envolver-se em uma aura do elemento escolhido por [1 + ⌊Nível÷4⌋] rodadas. Atacantes corpo-a-corpo sofrem [⌊Nível÷3⌋]d6 de dano elemental. Resistência ao elemento escolhido.',
  },
  'mago_elemental_4_evo': {
    nome: 'Erupção Elemental',
    custo: '7 energia',
    tipo: 'Ativa',
    descricao: 'Liberar uma explosão elemental em [3 + ⌊Nível÷4⌋]m. Causa [⌊Nível÷2⌋]d8 + modINT de dano elemental a todos os inimigos. Deixa o solo ardente/congelante por 2 rodadas.',
  },
  'mago_cronurgia_3_evo': {
    nome: 'Dilatação Temporal',
    custo: '6 energia',
    tipo: 'Ativa',
    descricao: 'Desacelerar o tempo para inimigos em [3 + ⌊Nível÷4⌋]m. Todos os inimigos agem por último e sofrem -[⌊Nível÷4⌋] em DES por [1 + ⌊Nível÷5⌋] rodadas. Aliados ganham +[⌊Nível÷5⌋] em DES.',
  },
  'mago_arcana_pe_evo': {
    nome: 'Poço Arcano',
    custo: 'Especial',
    tipo: 'Ativa',
    descricao: 'Absorver energia do ambiente. Recupera [4 + ⌊Nível÷3⌋] PE instantaneamente. Após usar, todas as magias custam +2 energia por [1 + ⌊Nível÷5⌋] rodadas.',
  },

  // ═══════════════════════════════════════════
  // FEITICEIRO — Linhagem / Metamorfose
  // ═══════════════════════════════════════════
  'feiticeiro_linhagem_2_evo': {
    nome: 'Despertar Ancestral',
    custo: '5 energia',
    tipo: 'Ativa',
    descricao: 'Invocar o poder adormecido de sua linhagem. Por [1 + ⌊Nível÷4⌋] rodadas, ganha +[⌊Nível÷3⌋] em AM e todas as magias causam +[⌊Nível÷3⌋]d6 de dano.',
  },
  'feiticeiro_metamorfose_2_evo': {
    nome: 'Armadura Natural',
    custo: '4 energia',
    tipo: 'Ativa',
    descricao: 'Fazer a pele endurecer como couro espesso. +[2 + ⌊Nível÷4⌋] CA e redução de dano de [⌊Nível÷4⌋] por [1 + ⌊Nível÷4⌋] rodadas.',
  },
  'feiticeiro_linhagem_3_evo': {
    nome: 'Surto Místico',
    custo: '6 energia',
    tipo: 'Ativa',
    descricao: 'Liberar energia mágica bruta do sangue. Causa [⌊Nível÷2⌋]d8 + modAM de dano arcano a um alvo. Efeito secundário aleatório: empurrão, atordoamento, ou queimadura (50% chance).',
  },
  'feiticeiro_metamorfose_3_evo': {
    nome: 'Garras Bestiais',
    custo: '4 energia',
    tipo: 'Ativa',
    descricao: 'Transformar as mãos em garras. Pelos próximos [1 + ⌊Nível÷4⌋] turnos, ataques desarmados causam [⌊Nível÷2⌋]d8 + modFOR de dano cortante e podem escalar superfícies.',
  },
  'feiticeiro_metamorfose_4_evo': {
    nome: 'Mutação Defensiva',
    custo: '5 energia',
    tipo: 'Ativa',
    descricao: 'Adaptar o corpo à ameaça atual. Ganha resistência ao tipo de dano do último ataque recebido por [1 + ⌊Nível÷4⌋] rodadas. Recupera [⌊Nível÷3⌋]d6 de HP.',
  },

  // ═══════════════════════════════════════════
  // LOBISOMEM — Fera / Matilha / Instinto
  // ═══════════════════════════════════════════
  'lobo_fera_2_evo': {
    nome: 'Golpe Lacerante',
    custo: '4 energia',
    tipo: 'Ativa',
    descricao: 'Ataque com garras estendidas que dilacera. Causa [⌊Nível÷2⌋]d8 + modFOR de dano cortante. O alvo sangra por [⌊Nível÷4⌋]d6 por rodada durante [1 + ⌊Nível÷5⌋] rodadas.',
  },
  'lobo_fera_3_evo': {
    nome: 'Fúria Bestial',
    custo: '6 energia',
    tipo: 'Ativa',
    descricao: 'Entrar em fúria lupina. Por [1 + ⌊Nível÷4⌋] rodadas, ganha +[⌊Nível÷3⌋] em FOR, ataques causam +[⌊Nível÷4⌋]d6 de dano, mas sofre -[⌊Nível÷5⌋] CA.',
  },
  'lobo_matilha_4_evo': {
    nome: 'Uivo de Guerra',
    custo: '5 energia',
    tipo: 'Ativa',
    descricao: 'Soltar um uivo que inspira aliados em [4 + ⌊Nível÷3⌋]m. Todos os aliados ganham +[⌊Nível÷3⌋]d6 de dano em seu próximo ataque e +[⌊Nível÷5⌋] em FOR por [1 + ⌊Nível÷5⌋] rodadas.',
  },
  'lobo_instinto_3_evo': {
    nome: 'Caçada Selvagem',
    custo: '4 energia',
    tipo: 'Ativa',
    descricao: 'Marcar um alvo como presa. Por [1 + ⌊Nível÷4⌋] rodadas, você sabe a localização exata do alvo, ganha +[⌊Nível÷4⌋] em DES, e ataques contra o alvo causam +[⌊Nível÷3⌋]d6.',
  },
  'lobo_instinto_4_evo': {
    nome: 'Pelagem Espinhosa',
    custo: '5 energia',
    tipo: 'Ativa',
    descricao: 'A pelina endurece em espinhos. Por [1 + ⌊Nível÷4⌋] rodadas, reflete [⌊Nível÷3⌋]d6 de dano a atacantes corpo-a-corpo e ganha +[⌊Nível÷5⌋] CA.',
  },
  'lobo_fera_regen_evo': {
    nome: 'Regeneração Primal',
    custo: '5 energia',
    tipo: 'Ativa',
    descricao: 'Acelerar a regeneração lupina. Recupera [⌊Nível÷2⌋]d8 + modCON de HP e por [1 + ⌊Nível÷4⌋] rodadas regenera +[⌊Nível÷3⌋] HP por rodada automaticamente.',
  },

  // ═══════════════════════════════════════════
  // DEMONIO — Abismo / Inferno / Corrupção
  // ═══════════════════════════════════════════
  'demonio_abismo_2_evo': {
    nome: 'Laceração Infernal',
    custo: '4 energia',
    tipo: 'Ativa',
    descricao: 'Corte com garras em chamas. Causa [⌊Nível÷2⌋]d8 + modFOR de dano, metade cortante metade fogo. O alvo queima por [⌊Nível÷4⌋]d6 de dano de fogo por [1 + ⌊Nível÷5⌋] rodadas.',
  },
  'demonio_inferno_2_evo': {
    nome: 'Escaldadura',
    custo: '5 energia',
    tipo: 'Ativa',
    descricao: 'A pele demoníaca entra em erupção. Por [1 + ⌊Nível÷4⌋] rodadas, atacantes corpo-a-corpo sofrem [⌊Nível÷3⌋]d6 de dano de fogo. Imune a dano de fogo enquanto ativa.',
  },
  'demonio_abismo_3_evo': {
    nome: 'Armadura do Abismo',
    custo: '5 energia',
    tipo: 'Ativa',
    descricao: 'Invocar uma carapaça das profundezas. +[2 + ⌊Nível÷4⌋] CA e redução de dano de [⌊Nível÷4⌋] por [1 + ⌊Nível÷4⌋] rodadas. Ataques recebidos têm 25% chance de serem refletidos.',
  },
  'demonio_abismo_4_evo': {
    nome: 'Maldição Demoníaca',
    custo: '6 energia',
    tipo: 'Ativa',
    descricao: 'Espalhar uma aura amaldiçoada em [3 + ⌊Nível÷4⌋]m. Todos os inimigos sofrem [⌊Nível÷3⌋]d6 + modAM de dano necrótico e -[⌊Nível÷5⌋] em todas as jogadas por [1 + ⌊Nível÷5⌋] rodadas.',
  },
  'demonio_corrupcao_3_evo': {
    nome: 'Corrupção Mental',
    custo: '6 energia',
    tipo: 'Ativa',
    descricao: 'Infiltrar pensamentos corruptores. CD 10 + ⌊Nível÷2⌋ + modAM. Em caso de falha, o alvo ataca o aliado mais próximo por [1 + ⌊Nível÷6⌋] rodadas e sofre [⌊Nível÷3⌋]d6 de dano psíquico.',
  },

  // ═══════════════════════════════════════════
  // DASARIANO — Combate / Estável / Selvagem
  // ═══════════════════════════════════════════
  'dasa_combate_2_evo': {
    nome: 'Presas Devastadoras',
    custo: '4 energia',
    tipo: 'Ativa',
    descricao: 'Investida com presas e garras. Causa [⌊Nível÷2⌋]d8 + modFOR de dano perfurante. Se o alvo for menor que metade do HP, causa +[⌊Nível÷3⌋]d6 de dano adicional.',
  },
  'dasa_combate_3_evo': {
    nome: 'Postura de Batalha',
    custo: '4 energia',
    tipo: 'Ativa',
    descricao: 'Assumir postura defensiva de combate. Por [1 + ⌊Nível÷4⌋] rodadas, ganha +[⌊Nível÷3⌋] CA e pode fazer um ataque de oportunidade extra por rodada.',
  },
  'dasa_estabel_3_evo': {
    nome: 'Pele Coriácea',
    custo: '4 energia',
    tipo: 'Ativa',
    descricao: 'Endurecer a pele para resistir impacto. Por [1 + ⌊Nível÷4⌋] rodadas, redução de dano de [⌊Nível÷3⌋] e imune a empurrões e quedas.',
  },
  'dasa_selvagem_3_evo': {
    nome: 'Salto Predador',
    custo: '5 energia',
    tipo: 'Ativa',
    descricao: 'Saltar sobre o alvo de até [3 + ⌊Nível÷3⌋]m de distância. Causa [⌊Nível÷2⌋]d10 + modFOR de dano e o alvo deve passar CD 10 + ⌊Nível÷2⌋ + modFOR ou cair preso.',
  },
  'dasa_selvagem_4_evo': {
    nome: 'Adaptação Selvagem',
    custo: '5 energia',
    tipo: 'Ativa',
    descricao: 'Adaptar-se instantaneamente ao ambiente. Por [1 + ⌊Nível÷4⌋] rodadas, ganha resistência ao tipo de dano predominante no ambiente, +[⌊Nível÷5⌋] em todos os atributos, e ignora terreno difícil.',
  },

  // ═══════════════════════════════════════════
  // FINGER — Harmonia / Ascensão / Sabedoria
  // ═══════════════════════════════════════════
  'finger_har_2_evo': {
    nome: 'Cura Compartilhada',
    custo: '4 energia',
    tipo: 'Ativa',
    descricao: 'Transferir ou receber vida do portador vinculado. Cura um aliado (ou o portador) em [⌊Nível÷2⌋]d6 + modINT de HP. Se usado no portador, ambos recuperam HP.',
  },
  'finger_asc_1_evo': {
    nome: 'Golpe Imbuído',
    custo: '4 energia',
    tipo: 'Ativa',
    descricao: 'Imbuir a próxima arma com energia arcana. O ataque causa +[⌊Nível÷2⌋]d8 de dano sagrado e ignora resistência mágica. Pode ser canalizado no portador à distância.',
  },
  'finger_sab_3_evo': {
    nome: 'Análise Arcana',
    custo: '3 energia',
    tipo: 'Ativa',
    descricao: 'Decifrar a estrutura mágica de um alvo. Revela fraquezas elementais, CA exata, e HP aproximado. Próximo ataque contra o alvo causa +[⌊Nível÷2⌋]d6 de dano.',
  },
  'finger_sab_4_evo': {
    nome: 'Drenar Energia',
    custo: 'Especial',
    tipo: 'Ativa',
    descricao: 'Absorver a energia mágica de um alvo. Causa [⌊Nível÷3⌋]d6 + modINT de dano e recupera [3 + ⌊Nível÷4⌋] PE. Não custa energia para ativar.',
  },
  'finger_har_3_evo': {
    nome: 'Proteção Recíproca',
    custo: '5 energia',
    tipo: 'Ativa',
    descricao: 'Criar um vínculo protetor com o portador por [1 + ⌊Nível÷4⌋] rodadas. 50% do dano que um recebe é transferido ao outro. Ambos ganham +[⌊Nível÷5⌋] CA.',
  },

  // ═══════════════════════════════════════════
  // SEMIDEUS — Legado / Domínio
  // ═══════════════════════════════════════════
  'semi_leg_2_evo': {
    nome: 'Bênção de Asclepius',
    custo: '5 energia',
    tipo: 'Ativa',
    descricao: 'Canalizar o poder curativo divino. Recupera [Nível]d6 + modCON de HP e remove todos os efeitos negativos. Aliados em [3 + ⌊Nível÷4⌋]m recuperam metade do valor.',
  },
  'semi_dom_2_evo': {
    nome: 'Pulso Radiante',
    custo: '6 energia',
    tipo: 'Ativa',
    descricao: 'Ondas de energia divina explodem em [3 + ⌊Nível÷4⌋]m. Causa [⌊Nível÷2⌋]d8 + modAM de dano radiante. Mortos-vivos e demônios sofrem dano dobrado.',
  },
  'semi_leg_4_evo': {
    nome: 'Pele Divina',
    custo: '6 energia',
    tipo: 'Ativa',
    descricao: 'O corpo brilha com poder olímpico. Por [1 + ⌊Nível÷5⌋] rodadas, imune a dano não-mágico e reduz dano mágico em [⌊Nível÷3⌋]. Recupera [⌊Nível÷3⌋]d6 de HP ao ativar.',
  },
  'semi_dom_3_evo': {
    nome: 'Aura Majestosa',
    custo: '5 energia',
    tipo: 'Ativa',
    descricao: 'Exalar presença divina impressionante. Inimigos em [4 + ⌊Nível÷3⌋]m devem passar CD 10 + ⌊Nível÷2⌋ + modAPA ou ficam amedrontados por [1 + ⌊Nível÷5⌋] rodadas. Sofrem -[⌊Nível÷4⌋] em ataques.',
  },
  'semi_dom_4_evo': {
    nome: 'Despertar Divino',
    custo: '7 energia',
    tipo: 'Ativa',
    descricao: 'Despertar o sangue divino adormecido. Por [1 + ⌊Nível÷4⌋] rodadas, ganha +[⌊Nível÷3⌋] em todos os atributos e ataques causam +[⌊Nível÷3⌋]d8 de dano sagrado. Após o efeito, fica exausto por 1 rodada.',
  },

  // ═══════════════════════════════════════════
  // HUMANO_MISTICO — Transcendência / Despertar / Canal
  // ═══════════════════════════════════════════
  'mistico_tra_2_evo': {
    nome: 'Barreira Eteréa',
    custo: '4 energia',
    tipo: 'Ativa',
    descricao: 'Materializar um escudo de energia espiritual. Absorve [Nível + modAM × 2] de dano. Dura [1 + ⌊Nível÷4⌋] rodadas ou até ser destruído.',
  },
  'mistico_des_3_evo': {
    nome: 'Visão Espiritual',
    custo: '3 energia',
    tipo: 'Ativa',
    descricao: 'Abrir os olhos para o mundo espiritual por [1 + ⌊Nível÷3⌋] rodadas. Vê criaturas invisíveis, ilusões dissipam-se, e revela a aura de seres vivos em [5 + ⌊Nível÷2⌋]m.',
  },
  'mistico_des_4_evo': {
    nome: 'Selar Brecha',
    custo: '5 energia',
    tipo: 'Ativa',
    descricao: 'Fechar rupturas dimensionais e cancelar invocações. Dissipa uma invocação ou portal mágico (CD 10 + ⌊Nível÷2⌋ + modAM). Em caso de sucesso, causa [⌊Nível÷2⌋]d6 de dano astral ao conjurador.',
  },
  'mistico_can_3_evo': {
    nome: 'Ressonância Mágica',
    custo: '5 energia',
    tipo: 'Ativa',
    descricao: 'Entrar em sincronia com o fluxo mágico. Por [1 + ⌊Nível÷4⌋] rodadas, todas as magias causam +[⌊Nível÷3⌋]d6 de dano e custam -2 energia (mín. 1).',
  },
  'mistico_can_4_evo': {
    nome: 'Ritual de Poder',
    custo: '6 energia',
    tipo: 'Ativa',
    descricao: 'Conduzir um ritual místico de 1 rodada. No turno seguinte, a próxima magia tem seu efeito dobrado (dano, duração, ou alvos). Aliados próximos ganham +[⌊Nível÷5⌋] em AM por 2 rodadas.',
  },
  'mistico_can_pe_evo': {
    nome: 'Fluxo de Mana',
    custo: 'Especial',
    tipo: 'Ativa',
    descricao: 'Canalar energia bruta do plano astral. Recupera [5 + ⌊Nível÷3⌋] PE. Pode ser usado como reação ao receber dano mágico, reduzindo-o em [⌊Nível÷2⌋] e recuperando PE.',
  },
}

export function getEvolutionAbility(evoId) {
  return EVOLUTION_ABILITIES[evoId] || null
}
