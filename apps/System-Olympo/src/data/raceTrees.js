export const RACE_TREES = {

VAMPIRO: {
  id: 'VAMPIRO',
  name: 'Vampiro',
  branches: [
    { id: 'sombra', name: 'Caminho das Sombras', desc: 'Velocidade, furtividade e controle de sombras', color: '#8b5cf6', icon: 'dark_mode' },
    { id: 'sangue', name: 'Caminho do Sangue', desc: 'Força bruta, regeneração e dominação', color: '#ef4444', icon: 'bloodtype' },
    { id: 'necromancia', name: 'Caminho Necromântico', desc: 'Magia sombria, controle mental e rituais', color: '#22c55e', icon: 'auto_fix_high' },
  ],
  nodes: [
    { id: 'vamp_sombra_1', name: 'Passos Silenciosos', desc: '+2 DES permanente. Seus passos não produzem som.', branch: 'sombra', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'DES', value: 2 }], x: -0.6, y: 0.85 },
    { id: 'vamp_sombra_2', name: 'Olhos na Noite', desc: '+5 Percepção permanente. Visão noturna perfeita.', branch: 'sombra', cost: 1, tier: 1, requires: [], effects: [{ type: 'pericia', pericia: 'Percepção', value: 5 }], x: -0.4, y: 0.85 },
    { id: 'vamp_sombra_3', name: 'Velocidade Sombria', desc: '+10 Vida permanente, +1 CA. Movimento silencioso aumentado.', branch: 'sombra', cost: 1, tier: 2, requires: ['vamp_sombra_1'], effects: [{ type: 'vida', value: 10 }, { type: 'ca', value: 1 }], x: -0.65, y: 0.65 },
    { id: 'vamp_sombra_4', name: 'Forma de Morcego', desc: 'Transforma em morcego. Voo 18m/turno, 1 hora. Mantém sentidos.', branch: 'sombra', cost: 2, tier: 2, requires: ['vamp_sombra_1', 'vamp_sombra_2'], effects: [{ type: 'habilidade', nome: 'Forma de Morcego', tipo: 'ativa', descricao: 'Voo 18m/turno, 1 hora. Mantém sentidos vampíricos.', custoEnergia: '3 PE' }], x: -0.5, y: 0.65 },
    { id: 'vamp_sombra_5', name: 'Reflexos de Predador', desc: '+2 DES, +3 Iniciativa. Reações mais rápidas.', branch: 'sombra', cost: 1, tier: 2, requires: ['vamp_sombra_2'], effects: [{ type: 'attr', attr: 'DES', value: 2 }, { type: 'pericia', pericia: 'Iniciativa', value: 3 }], x: -0.35, y: 0.65 },
    { id: 'vamp_sombra_6', name: 'Passagem Sombria', desc: 'Teleporte 9m entre sombras. Ação de movimento.', branch: 'sombra', cost: 2, tier: 3, requires: ['vamp_sombra_3', 'vamp_sombra_4'], effects: [{ type: 'habilidade', nome: 'Passagem Sombria', tipo: 'ativa', descricao: 'Teleporte 9m entre áreas de escuridão ou sombra. Ação de movimento.', custoEnergia: '5 PE' }], x: -0.6, y: 0.45 },
    { id: 'vamp_sombra_7', name: 'Evasão Noturna', desc: '+2 CA à noite. Vantagem em testes de DES.', branch: 'sombra', cost: 1, tier: 3, requires: ['vamp_sombra_4', 'vamp_sombra_5'], effects: [{ type: 'ca', value: 2 }, { type: 'pericia', pericia: 'DES', value: 0, especial: 'vantagem' }], x: -0.5, y: 0.45 },
    { id: 'vamp_sombra_8', name: 'Passo Dimensional', desc: '+4 DES permanente. Ignora terreno difícil. Desloca-se entre dimensões.', branch: 'sombra', cost: 1, tier: 3, requires: ['vamp_sombra_5'], effects: [{ type: 'attr', attr: 'DES', value: 4 }], x: -0.4, y: 0.45 },
    { id: 'vamp_sombra_9', name: 'Mestre das Sombras', desc: '+20 Vida. Inimigos têm desvantagem contra você à noite. Senhor da escuridão.', branch: 'sombra', cost: 2, tier: 4, requires: ['vamp_sombra_6', 'vamp_sombra_7'], effects: [{ type: 'vida', value: 20 }, { type: 'habilidade', nome: 'Mestre das Sombras', tipo: 'passiva', descricao: 'Inimigos têm desvantagem em ataques contra você à noite.' }], x: -0.6, y: 0.25 },
    { id: 'vamp_sombra_10', name: 'Forma de Neblina', desc: 'Imune a dano físico em forma de neblina. 12m/turno. Não pode atacar.', branch: 'sombra', cost: 2, tier: 4, requires: ['vamp_sombra_7', 'vamp_sombra_8'], effects: [{ type: 'habilidade', nome: 'Forma de Neblina', tipo: 'ativa', descricao: 'Transforma em neblina. Imune a dano físico. 12m/turno. Não pode atacar. Dura 1 cena.', custoEnergia: '8 PE' }], x: -0.4, y: 0.25 },

    { id: 'vamp_sangue_1', name: 'Força do Sangue', desc: '+2 FOR permanente. O poder ancestral do sangue flui nas veias.', branch: 'sangue', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'FOR', value: 2 }], x: -0.1, y: 0.85 },
    { id: 'vamp_sangue_2', name: 'Vitalidade Vampírica', desc: '+20 Vida permanente. Corpo resistente além da morte.', branch: 'sangue', cost: 1, tier: 1, requires: [], effects: [{ type: 'vida', value: 20 }], x: 0.1, y: 0.85 },
    { id: 'vamp_sangue_3', name: 'Mordida Aprimorada', desc: 'Mordida cura +1d10 extra. Dreno de sangue mais eficiente.', branch: 'sangue', cost: 1, tier: 2, requires: ['vamp_sangue_1'], effects: [{ type: 'habilidade', nome: 'Mordida Aprimorada', tipo: 'passiva', descricao: 'Mordida Vampírica cura +1d10 extra (total 3d10+10 HP).' }], x: -0.15, y: 0.65 },
    { id: 'vamp_sangue_4', name: 'Regeneração Dobrada', desc: 'Regeneração 8×ModCON em combate (em vez de 4×). Recuperação acelerada.', branch: 'sangue', cost: 1, tier: 2, requires: ['vamp_sangue_2'], effects: [{ type: 'habilidade', nome: 'Regeneração Dobrada', tipo: 'passiva', descricao: 'Regeneração em combate dobra para 8×ModCON HP/turno.' }], x: 0, y: 0.65 },
    { id: 'vamp_sangue_5', name: 'Constituição Sombria', desc: '+15 Vida, +1 CON. Corpo vampírico endurecido pelo tempo.', branch: 'sangue', cost: 1, tier: 2, requires: ['vamp_sangue_1', 'vamp_sangue_2'], effects: [{ type: 'vida', value: 15 }, { type: 'attr', attr: 'CON', value: 1 }], x: 0.15, y: 0.65 },
    { id: 'vamp_sangue_6', name: 'Absorção Perfeita', desc: 'Mordida recupera 3d10+20 HP e 15 PE. Dreno vital supremo.', branch: 'sangue', cost: 2, tier: 3, requires: ['vamp_sangue_3', 'vamp_sangue_5'], effects: [{ type: 'habilidade', nome: 'Absorção Perfeita', tipo: 'ativa', descricao: 'Mordida recupera 3d10+20 HP e 15 PE. Ação padrão.', custoEnergia: 'Ação padrão' }], x: -0.1, y: 0.45 },
    { id: 'vamp_sangue_7', name: 'Corpo de Aço', desc: '+3 CA permanente. Reduz dano recebido em 3. Carne endurecida.', branch: 'sangue', cost: 1, tier: 3, requires: ['vamp_sangue_4', 'vamp_sangue_5'], effects: [{ type: 'ca', value: 3 }, { type: 'habilidade', nome: 'Redução de Dano', tipo: 'passiva', descricao: 'Reduz todo dano recebido em 3.' }], x: 0.1, y: 0.45 },
    { id: 'vamp_sangue_8', name: 'Fúria de Sangue', desc: '+4 FOR, +1d6 dano corpo-a-corpo. Fúria vampírica desencadeada.', branch: 'sangue', cost: 1, tier: 3, requires: ['vamp_sangue_5'], effects: [{ type: 'attr', attr: 'FOR', value: 4 }, { type: 'habilidade', nome: 'Fúria de Sangue', tipo: 'passiva', descricao: '+1d6 dano em todos os ataques corpo-a-corpo.' }], x: 0.0, y: 0.45 },
    { id: 'vamp_sangue_9', name: 'Imortalidade Verdadeira', desc: 'Regeneração 12×ModCON, +50 Vida. Não morre com sangue no sistema.', branch: 'sangue', cost: 2, tier: 4, requires: ['vamp_sangue_6', 'vamp_sangue_7'], effects: [{ type: 'vida', value: 50 }, { type: 'habilidade', nome: 'Imortalidade Verdadeira', tipo: 'passiva', descricao: 'Regeneração 12×ModCON HP/turno. Não morre enquanto tiver sangue no sistema.' }], x: -0.1, y: 0.25 },
    { id: 'vamp_sangue_10', name: 'Senhor da Noite', desc: '+4 FOR, +4 DES. Aura de dominação 30m: criaturas com AM inferior não atacam.', branch: 'sangue', cost: 2, tier: 4, requires: ['vamp_sangue_7', 'vamp_sangue_8'], effects: [{ type: 'attr', attr: 'FOR', value: 4 }, { type: 'attr', attr: 'DES', value: 4 }, { type: 'habilidade', nome: 'Aura de Dominação', tipo: 'passiva', descricao: 'Criaturas em 30m com AM inferior não ousam atacar.' }], x: 0.1, y: 0.25 },

    { id: 'vamp_necro_1', name: 'Toque Gélido', desc: '+2 AM permanente. Toque causa 1d6 necrótico extra.', branch: 'necromancia', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'AM', value: 2 }], x: 0.4, y: 0.85 },
    { id: 'vamp_necro_2', name: 'Sentido de Morte', desc: '+5 Ocultismo. Detecta mortos-vivos e criaturas necróticas em 100m.', branch: 'necromancia', cost: 1, tier: 1, requires: [], effects: [{ type: 'pericia', pericia: 'Ocultismo', value: 5 }], x: 0.6, y: 0.85 },
    { id: 'vamp_necro_3', name: 'Dominação Menor', desc: 'Habilidade ativa: alvo obedece 1 comando. DT 18+AM resiste.', branch: 'necromancia', cost: 1, tier: 2, requires: ['vamp_necro_1'], effects: [{ type: 'habilidade', nome: 'Dominação Menor', tipo: 'ativa', descricao: 'Alvo obedece 1 comando simples. DT 18+AM resiste. Dura 1 rodada.', custoEnergia: '10 PE' }], x: 0.35, y: 0.65 },
    { id: 'vamp_necro_4', name: 'Sangue Corrompido', desc: '+3 AM, +10 Energia. Sangue enriquecido com poder necrótico.', branch: 'necromancia', cost: 1, tier: 2, requires: ['vamp_necro_1', 'vamp_necro_2'], effects: [{ type: 'attr', attr: 'AM', value: 3 }, { type: 'energia', value: 10 }], x: 0.5, y: 0.65 },
    { id: 'vamp_necro_5', name: 'Aura de Medo', desc: 'Inimigos em 6m fazem teste de Vontade ou ficam com desvantagem.', branch: 'necromancia', cost: 1, tier: 2, requires: ['vamp_necro_2'], effects: [{ type: 'habilidade', nome: 'Aura de Medo', tipo: 'passiva', descricao: 'Inimigos em 6m fazem teste de Vontade CD 16 ou ficam com desvantagem em tudo.' }], x: 0.65, y: 0.65 },
    { id: 'vamp_necro_6', name: 'Controle Mental', desc: 'Dominação dura 1 cena. Pode afetar múltiplos alvos. Poder vampírico supremo.', branch: 'necromancia', cost: 2, tier: 3, requires: ['vamp_necro_3', 'vamp_necro_4'], effects: [{ type: 'habilidade', nome: 'Controle Mental', tipo: 'ativa', descricao: 'Dominação dura 1 cena inteira. Pode afetar até 3 alvos. DT 20+AM resiste.', custoEnergia: '15 PE' }], x: 0.4, y: 0.45 },
    { id: 'vamp_necro_7', name: 'Ritual de Sangue', desc: '+4 AM. Rituais vampíricos custam -50%. Mestre dos rituais proibidos.', branch: 'necromancia', cost: 1, tier: 3, requires: ['vamp_necro_4', 'vamp_necro_5'], effects: [{ type: 'attr', attr: 'AM', value: 4 }, { type: 'habilidade', nome: 'Rituais Vampíricos', tipo: 'passiva', descricao: 'Rituais vampíricos e necromânticos custam -50% PE.' }], x: 0.5, y: 0.45 },
    { id: 'vamp_necro_8', name: 'Invocar Criaturas Sombrias', desc: 'Invoca 1d4 criaturas sombrias menores. Servem por 1 cena.', branch: 'necromancia', cost: 1, tier: 3, requires: ['vamp_necro_5'], effects: [{ type: 'habilidade', nome: 'Invocar Criaturas Sombrias', tipo: 'ativa', descricao: 'Invoca 1d4 criaturas sombrias (stats = nível/3). Duram 1 cena.', custoEnergia: '12 PE' }], x: 0.6, y: 0.45 },
    { id: 'vamp_necro_9', name: 'Príncipe Eterno', desc: 'Luz solar causa apenas 1d6 (reduzido de 3d6). +5 AM. Domina criaturas menores.', branch: 'necromancia', cost: 2, tier: 4, requires: ['vamp_necro_6', 'vamp_necro_7'], effects: [{ type: 'attr', attr: 'AM', value: 5 }, { type: 'habilidade', nome: 'Resistência Solar', tipo: 'passiva', descricao: 'Luz solar causa apenas 1d6/turno em vez de 3d6. Regeneração não é anulada por luz.' }], x: 0.4, y: 0.25 },
    { id: 'vamp_necro_10', name: 'Primordial', desc: 'Regeneração 25×ModCON. Deus menor do sangue. Controle total sobre mortos-vivos.', branch: 'necromancia', cost: 2, tier: 4, requires: ['vamp_necro_7', 'vamp_necro_8'], effects: [{ type: 'habilidade', nome: 'Primordial', tipo: 'passiva', descricao: 'Regeneração 25×ModCON HP/turno. Deus menor do sangue. Controla mortos-vivos em 100m.' }], x: 0.6, y: 0.25 },
  ],
  connections: [
    ['vamp_sombra_1', 'vamp_sombra_3'],
    ['vamp_sombra_1', 'vamp_sombra_4'],
    ['vamp_sombra_2', 'vamp_sombra_4'],
    ['vamp_sombra_2', 'vamp_sombra_5'],
    ['vamp_sombra_3', 'vamp_sombra_6'],
    ['vamp_sombra_4', 'vamp_sombra_7'],
    ['vamp_sombra_5', 'vamp_sombra_8'],
    ['vamp_sombra_5', 'vamp_sombra_7'],
    ['vamp_sombra_6', 'vamp_sombra_9'],
    ['vamp_sombra_7', 'vamp_sombra_9'],
    ['vamp_sombra_7', 'vamp_sombra_10'],
    ['vamp_sombra_8', 'vamp_sombra_10'],

    ['vamp_sangue_1', 'vamp_sangue_3'],
    ['vamp_sangue_1', 'vamp_sangue_5'],
    ['vamp_sangue_2', 'vamp_sangue_4'],
    ['vamp_sangue_2', 'vamp_sangue_5'],
    ['vamp_sangue_3', 'vamp_sangue_6'],
    ['vamp_sangue_4', 'vamp_sangue_7'],
    ['vamp_sangue_5', 'vamp_sangue_8'],
    ['vamp_sangue_5', 'vamp_sangue_7'],
    ['vamp_sangue_6', 'vamp_sangue_9'],
    ['vamp_sangue_7', 'vamp_sangue_10'],
    ['vamp_sangue_8', 'vamp_sangue_10'],

    ['vamp_necro_1', 'vamp_necro_3'],
    ['vamp_necro_1', 'vamp_necro_4'],
    ['vamp_necro_2', 'vamp_necro_4'],
    ['vamp_necro_2', 'vamp_necro_5'],
    ['vamp_necro_3', 'vamp_necro_6'],
    ['vamp_necro_4', 'vamp_necro_7'],
    ['vamp_necro_5', 'vamp_necro_7'],
    ['vamp_necro_5', 'vamp_necro_8'],
    ['vamp_necro_6', 'vamp_necro_9'],
    ['vamp_necro_7', 'vamp_necro_9'],
    ['vamp_necro_7', 'vamp_necro_10'],
    ['vamp_necro_8', 'vamp_necro_10'],
  ],
},

HUMANO: {
  id: 'HUMANO',
  name: 'Humano',
  branches: [
    { id: 'determinacao', name: 'Caminho da Determinação', desc: 'Resiliência, constituição e força de vontade', color: '#eab308', icon: 'shield' },
    { id: 'adaptabilidade', name: 'Caminho da Adaptabilidade', desc: 'Versatilidade, perícias e flexibilidade', color: '#3b82f6', icon: 'tune' },
    { id: 'engenhosidade', name: 'Caminho da Engenhosidade', desc: 'Intelecto, estratégia e criação', color: '#06b6d4', icon: 'psychology' },
  ],
  nodes: [
    { id: 'hum_det_1', name: 'Resolução Inabalável', desc: '+2 CON permanente. Corpo treinado para resistir.', branch: 'determinacao', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'CON', value: 2 }], x: -0.6, y: 0.85 },
    { id: 'hum_det_2', name: 'Vitalidade Nata', desc: '+15 Vida permanente. Saúde humana no ápice.', branch: 'determinacao', cost: 1, tier: 1, requires: [], effects: [{ type: 'vida', value: 15 }], x: -0.4, y: 0.85 },
    { id: 'hum_det_3', name: 'Determinação Renovada', desc: '+2 CON. Determinação Humana pode ser usada 2×/dia.', branch: 'determinacao', cost: 1, tier: 2, requires: ['hum_det_1'], effects: [{ type: 'attr', attr: 'CON', value: 2 }, { type: 'habilidade', nome: 'Determinação Renovada', tipo: 'passiva', descricao: 'Determinação Humana pode ser usada 2×/dia em vez de 1×.' }], x: -0.6, y: 0.65 },
    { id: 'hum_det_4', name: 'Resistência Interior', desc: '+20 Vida, resistência a venenos e doenças.', branch: 'determinacao', cost: 1, tier: 2, requires: ['hum_det_1', 'hum_det_2'], effects: [{ type: 'vida', value: 20 }, { type: 'pericia', pericia: 'Resistência', value: 2 }], x: -0.4, y: 0.65 },
    { id: 'hum_det_5', name: 'Coração de Ferro', desc: '+3 CON. Resistência a medo e encantamento. Vontade inabalável.', branch: 'determinacao', cost: 2, tier: 3, requires: ['hum_det_3', 'hum_det_4'], effects: [{ type: 'attr', attr: 'CON', value: 3 }, { type: 'habilidade', nome: 'Resistência Mental', tipo: 'passiva', descricao: 'Vantagem em testes contra medo e encantamento.' }], x: -0.6, y: 0.45 },
    { id: 'hum_det_6', name: 'Recuperação Acelerada', desc: 'Recupera +50% HP em qualquer descanso. Corpo humano otimizado.', branch: 'determinacao', cost: 1, tier: 3, requires: ['hum_det_4'], effects: [{ type: 'habilidade', nome: 'Recuperação Acelerada', tipo: 'passiva', descricao: 'Recupera +50% HP em qualquer tipo de descanso.' }], x: -0.4, y: 0.45 },
    { id: 'hum_det_7', name: 'Vontade Inabalável', desc: '+50 Vida. Imune a medo. Espírito humano indomável.', branch: 'determinacao', cost: 2, tier: 4, requires: ['hum_det_5'], effects: [{ type: 'vida', value: 50 }, { type: 'habilidade', nome: 'Imunidade ao Medo', tipo: 'passiva', descricao: 'Imune a efeitos de medo de qualquer origem.' }], x: -0.6, y: 0.25 },
    { id: 'hum_det_8', name: 'Determinação Absoluta', desc: '+4 CON. Imune a encantamento. A mente humana é uma fortaleza.', branch: 'determinacao', cost: 2, tier: 4, requires: ['hum_det_5', 'hum_det_6'], effects: [{ type: 'attr', attr: 'CON', value: 4 }, { type: 'habilidade', nome: 'Imunidade a Encantamento', tipo: 'passiva', descricao: 'Imune a efeitos de encantamento e controle mental.' }], x: -0.4, y: 0.25 },

    { id: 'hum_adapt_1', name: 'Aprendiz Rápido', desc: '+2 perícias adicionais. Aprende mais rápido que qualquer raça.', branch: 'adaptabilidade', cost: 1, tier: 1, requires: [], effects: [{ type: 'habilidade', nome: 'Aprendiz Rápido', tipo: 'passiva', descricao: '+2 perícias adicionais permanentes.' }], x: -0.1, y: 0.85 },
    { id: 'hum_adapt_2', name: 'Versatilidade Natural', desc: '+1 atributo à escolha. Adaptação ao ambiente.', branch: 'adaptabilidade', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'escolha', value: 1 }], x: 0.1, y: 0.85 },
    { id: 'hum_adapt_3', name: 'Polímata', desc: '+3 perícias. Perícias custam -25% XP para aprender.', branch: 'adaptabilidade', cost: 1, tier: 2, requires: ['hum_adapt_1'], effects: [{ type: 'habilidade', nome: 'Polímata', tipo: 'passiva', descricao: '+3 perícias permanentes. Perícias custam -25% XP.' }], x: -0.1, y: 0.65 },
    { id: 'hum_adapt_4', name: 'Adaptar e Superar', desc: '+2 em 1 perícia à escolha. Sempre encontra um jeito.', branch: 'adaptabilidade', cost: 1, tier: 2, requires: ['hum_adapt_1', 'hum_adapt_2'], effects: [{ type: 'pericia', pericia: 'escolha', value: 2 }], x: 0.1, y: 0.65 },
    { id: 'hum_adapt_5', name: 'Mestre Versátil', desc: '+2 em 2 atributos à escolha. Vantagem em 2 perícias à escolha.', branch: 'adaptabilidade', cost: 2, tier: 3, requires: ['hum_adapt_3', 'hum_adapt_4'], effects: [{ type: 'attr', attr: 'escolha', value: 2, quantidade: 2 }, { type: 'habilidade', nome: 'Mestre Versátil', tipo: 'passiva', descricao: 'Vantagem em 2 perícias à escolha.' }], x: -0.1, y: 0.45 },
    { id: 'hum_adapt_6', name: 'Conhecimento Amplo', desc: 'Pode usar qualquer perícia sem treinamento (sem penalidade).', branch: 'adaptabilidade', cost: 1, tier: 3, requires: ['hum_adapt_3'], effects: [{ type: 'habilidade', nome: 'Conhecimento Amplo', tipo: 'passiva', descricao: 'Pode usar qualquer perícia sem treinamento, sem penalidade.' }], x: 0.1, y: 0.45 },
    { id: 'hum_adapt_7', name: 'Transcendência Versátil', desc: '+3 em todos os atributos. O potencial humano realizado.', branch: 'adaptabilidade', cost: 2, tier: 4, requires: ['hum_adapt_5'], effects: [{ type: 'attr', attr: 'FOR', value: 3 }, { type: 'attr', attr: 'DES', value: 3 }, { type: 'attr', attr: 'CON', value: 3 }, { type: 'attr', attr: 'INT', value: 3 }, { type: 'attr', attr: 'APA', value: 3 }, { type: 'attr', attr: 'AM', value: 3 }], x: -0.1, y: 0.25 },
    { id: 'hum_adapt_8', name: 'Mestria Total', desc: 'Qualquer perícia pode atingir grau máximo. Sem limites de aprendizado.', branch: 'adaptabilidade', cost: 2, tier: 4, requires: ['hum_adapt_5', 'hum_adapt_6'], effects: [{ type: 'habilidade', nome: 'Mestria Total', tipo: 'passiva', descricao: 'Qualquer perícia pode atingir grau máximo permanente. Sem limitação.' }], x: 0.1, y: 0.25 },

    { id: 'hum_eng_1', name: 'Mente Brilhante', desc: '+2 INT permanente. Intelecto acima da média.', branch: 'engenhosidade', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'INT', value: 2 }], x: 0.4, y: 0.85 },
    { id: 'hum_eng_2', name: 'Análise Tática', desc: '+5 Investigação. Percebe padrões que outros ignoram.', branch: 'engenhosidade', cost: 1, tier: 1, requires: [], effects: [{ type: 'pericia', pericia: 'Investigação', value: 5 }], x: 0.6, y: 0.85 },
    { id: 'hum_eng_3', name: 'Engenheiro Nato', desc: 'Usa artefatos com -2 nível de requisito. +1 Módulo de Evolução.', branch: 'engenhosidade', cost: 1, tier: 2, requires: ['hum_eng_1'], effects: [{ type: 'habilidade', nome: 'Engenheiro Nato', tipo: 'passiva', descricao: 'Usa artefatos com -2 nível de requisito. +1 Módulo de Evolução.' }], x: 0.4, y: 0.65 },
    { id: 'hum_eng_4', name: 'Tática Avançada', desc: '+3 Iniciativa, +2 INT. Sempre um passo à frente.', branch: 'engenhosidade', cost: 1, tier: 2, requires: ['hum_eng_1', 'hum_eng_2'], effects: [{ type: 'attr', attr: 'INT', value: 2 }, { type: 'pericia', pericia: 'Iniciativa', value: 3 }], x: 0.6, y: 0.65 },
    { id: 'hum_eng_5', name: 'Inventor', desc: '+3 INT. Cria equipamentos e itens básicos. Mestre da criação.', branch: 'engenhosidade', cost: 2, tier: 3, requires: ['hum_eng_3', 'hum_eng_4'], effects: [{ type: 'attr', attr: 'INT', value: 3 }, { type: 'habilidade', nome: 'Inventor', tipo: 'ativa', descricao: 'Cria equipamentos e itens básicos usando materiais. Tempo varia.', custoEnergia: '—' }], x: 0.4, y: 0.45 },
    { id: 'hum_eng_6', name: 'Estrategista de Batalha', desc: 'Aliados em 10m recebem +2 dano. Comandante tático.', branch: 'engenhosidade', cost: 1, tier: 3, requires: ['hum_eng_4'], effects: [{ type: 'habilidade', nome: 'Estrategista de Batalha', tipo: 'passiva', descricao: 'Aliados em 10m recebem +2 em dano de ataques.' }], x: 0.6, y: 0.45 },
    { id: 'hum_eng_7', name: 'Mente Transcendente', desc: '+4 em 3 atributos à escolha. O intelecto humano transcende limites.', branch: 'engenhosidade', cost: 2, tier: 4, requires: ['hum_eng_5'], effects: [{ type: 'attr', attr: 'escolha', value: 4, quantidade: 3 }], x: 0.4, y: 0.25 },
    { id: 'hum_eng_8', name: 'Gênio Absoluto', desc: '+5 INT permanente. Transcende limites mortais do conhecimento.', branch: 'engenhosidade', cost: 2, tier: 4, requires: ['hum_eng_5', 'hum_eng_6'], effects: [{ type: 'attr', attr: 'INT', value: 5 }, { type: 'habilidade', nome: 'Gênio Absoluto', tipo: 'passiva', descricao: 'Transcende limites de conhecimento. Vantagem em todos os testes de INT.' }], x: 0.6, y: 0.25 },
  ],
  connections: [
    ['hum_det_1', 'hum_det_3'],
    ['hum_det_1', 'hum_det_4'],
    ['hum_det_2', 'hum_det_4'],
    ['hum_det_3', 'hum_det_5'],
    ['hum_det_4', 'hum_det_5'],
    ['hum_det_4', 'hum_det_6'],
    ['hum_det_5', 'hum_det_7'],
    ['hum_det_5', 'hum_det_8'],
    ['hum_det_6', 'hum_det_8'],

    ['hum_adapt_1', 'hum_adapt_3'],
    ['hum_adapt_1', 'hum_adapt_4'],
    ['hum_adapt_2', 'hum_adapt_4'],
    ['hum_adapt_3', 'hum_adapt_5'],
    ['hum_adapt_3', 'hum_adapt_6'],
    ['hum_adapt_4', 'hum_adapt_5'],
    ['hum_adapt_5', 'hum_adapt_7'],
    ['hum_adapt_5', 'hum_adapt_8'],
    ['hum_adapt_6', 'hum_adapt_8'],

    ['hum_eng_1', 'hum_eng_3'],
    ['hum_eng_1', 'hum_eng_4'],
    ['hum_eng_2', 'hum_eng_4'],
    ['hum_eng_2', 'hum_eng_3'],
    ['hum_eng_3', 'hum_eng_5'],
    ['hum_eng_4', 'hum_eng_5'],
    ['hum_eng_4', 'hum_eng_6'],
    ['hum_eng_5', 'hum_eng_7'],
    ['hum_eng_5', 'hum_eng_8'],
    ['hum_eng_6', 'hum_eng_8'],
  ],
},

HUMANO_APRIMORADO: {
  id: 'HUMANO_APRIMORADO',
  name: 'Humano Aprimorado',
  branches: [
    { id: 'sintetico', name: 'Caminho Sintético', desc: 'Tecnologia, implantes e aprimoramentos mecânicos', color: '#38bdf8', icon: 'memory' },
    { id: 'biologico', name: 'Caminho Biológico', desc: 'Genética, mutações e evolução orgânica', color: '#22c55e', icon: 'biotech' },
    { id: 'hibrido', name: 'Caminho Híbrido', desc: 'Mistura de tecnologia e biologia', color: '#f59e0b', icon: 'merge_type' },
  ],
  nodes: [
    { id: 'apr_sintetico_1', name: 'Armadura Subcutânea', desc: '+1 CA permanente. Revestimento metálico sob a pele.', branch: 'sintetico', cost: 1, tier: 1, requires: [], effects: [{ type: 'ca', value: 1 }], x: -0.6, y: 0.9 },
    { id: 'apr_sintetico_2', name: 'Reflexos Cibernéticos', desc: '+2 DES permanente. Circuitos neurais aceleram reações.', branch: 'sintetico', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'DES', value: 2 }], x: -0.4, y: 0.9 },
    { id: 'apr_sintetico_3', name: 'Implante de Vitalidade', desc: '+15 Vida, +1 CA. Nano-implantes reforçam o corpo.', branch: 'sintetico', cost: 1, tier: 2, requires: ['apr_sintetico_1'], effects: [{ type: 'vida', value: 15 }, { type: 'ca', value: 1 }], x: -0.65, y: 0.7 },
    { id: 'apr_sintetico_4', name: 'Otimização Adaptativa', desc: 'Reroll 1 teste por cena. Sistema adaptativo recalibra em tempo real.', branch: 'sintetico', cost: 1, tier: 2, requires: ['apr_sintetico_1', 'apr_sintetico_2'], effects: [{ type: 'habilidade', nome: 'Otimização Adaptativa', tipo: 'ativa', descricao: 'Reroll 1 teste por cena. Sistema adaptativo recalibra em tempo real.', custoEnergia: '5 PE' }], x: -0.5, y: 0.7 },
    { id: 'apr_sintetico_5', name: 'Esquema Corporal', desc: '+2 CA, reduz dano recebido em 3. Blindagem interna ativada.', branch: 'sintetico', cost: 1, tier: 3, requires: ['apr_sintetico_3', 'apr_sintetico_4'], effects: [{ type: 'ca', value: 2 }, { type: 'habilidade', nome: 'Redução de Dano', tipo: 'passiva', descricao: 'Reduz todo dano recebido em 3.' }], x: -0.65, y: 0.5 },
    { id: 'apr_sintetico_6', name: 'Armadura Interna', desc: '+3 CA. Placas de titânio integradas ao esqueleto.', branch: 'sintetico', cost: 2, tier: 3, requires: ['apr_sintetico_4'], effects: [{ type: 'ca', value: 3 }, { type: 'habilidade', nome: 'Armadura Interna', tipo: 'passiva', descricao: 'Placas de titânio integradas ao esqueleto fornecem +3 CA permanente.' }], x: -0.5, y: 0.5 },
    { id: 'apr_sintetico_7', name: 'Singularidade', desc: '+4 CA. Fusão perfeita entre carne e máquina.', branch: 'sintetico', cost: 2, tier: 4, requires: ['apr_sintetico_5', 'apr_sintetico_6'], effects: [{ type: 'ca', value: 4 }, { type: 'habilidade', nome: 'Singularidade', tipo: 'passiva', descricao: 'Fusão perfeita entre carne e máquina. +4 CA permanente.' }], x: -0.65, y: 0.3 },
    { id: 'apr_sintetico_8', name: 'Imunidade à Exaustão', desc: '+30 Vida. Imune a exaustão. Corpo sintético não cansa.', branch: 'sintetico', cost: 2, tier: 4, requires: ['apr_sintetico_6'], effects: [{ type: 'vida', value: 30 }, { type: 'habilidade', nome: 'Imune a Exaustão', tipo: 'passiva', descricao: 'Imune a efeitos de exaustão física e mental.' }], x: -0.45, y: 0.3 },

    { id: 'apr_biologico_1', name: 'Constituição Aprimorada', desc: '+2 CON permanente. Genética otimizada para resistência.', branch: 'biologico', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'CON', value: 2 }], x: -0.1, y: 0.9 },
    { id: 'apr_biologico_2', name: 'Vigor Regenerativo', desc: '+15 Vida permanente. Tecidos regeneram mais rápido.', branch: 'biologico', cost: 1, tier: 1, requires: [], effects: [{ type: 'vida', value: 15 }], x: 0.1, y: 0.9 },
    { id: 'apr_biologico_3', name: 'Recuperação Acelerada', desc: '+100% recuperação em descanso. Metabolismo turbinado.', branch: 'biologico', cost: 1, tier: 2, requires: ['apr_biologico_1'], effects: [{ type: 'habilidade', nome: 'Recuperação Acelerada', tipo: 'passiva', descricao: 'Recupera +100% HP em qualquer tipo de descanso.' }], x: -0.15, y: 0.7 },
    { id: 'apr_biologico_4', name: 'Sistema Imune Perfeito', desc: '+2 CON, imune a doenças. Genética purificada.', branch: 'biologico', cost: 1, tier: 2, requires: ['apr_biologico_1', 'apr_biologico_2'], effects: [{ type: 'attr', attr: 'CON', value: 2 }, { type: 'habilidade', nome: 'Imunidade a Doenças', tipo: 'passiva', descricao: 'Imune a todas as doenças naturais e mágicas.' }], x: 0.05, y: 0.7 },
    { id: 'apr_biologico_5', name: 'Regeneração Celular', desc: 'Regenera 3 HP/turno em combate. Células se multiplicam sem parar.', branch: 'biologico', cost: 1, tier: 3, requires: ['apr_biologico_3', 'apr_biologico_4'], effects: [{ type: 'habilidade', nome: 'Regeneração Celular', tipo: 'passiva', descricao: 'Regenera 3 HP/turno em combate automaticamente.' }], x: -0.15, y: 0.5 },
    { id: 'apr_biologico_6', name: 'Corpo Reforçado', desc: '+20 Vida, +1 CA. Estrutura biológica densificada.', branch: 'biologico', cost: 1, tier: 3, requires: ['apr_biologico_4'], effects: [{ type: 'vida', value: 20 }, { type: 'ca', value: 1 }], x: 0.05, y: 0.5 },
    { id: 'apr_biologico_7', name: 'Corpo Perfeito', desc: '+3 FOR, +3 DES. Forma biológica ideal atingida.', branch: 'biologico', cost: 2, tier: 4, requires: ['apr_biologico_5', 'apr_biologico_6'], effects: [{ type: 'attr', attr: 'FOR', value: 3 }, { type: 'attr', attr: 'DES', value: 3 }, { type: 'habilidade', nome: 'Corpo Perfeito', tipo: 'passiva', descricao: '+3 FOR e +3 DES permanente. Forma biológica ideal.' }], x: -0.15, y: 0.3 },
    { id: 'apr_biologico_8', name: 'Supernova Biológica', desc: '+30 Vida, regen 8/turno, imune veneno. Pinnacle da evolução.', branch: 'biologico', cost: 2, tier: 4, requires: ['apr_biologico_5', 'apr_biologico_6'], effects: [{ type: 'vida', value: 30 }, { type: 'habilidade', nome: 'Regeneração Suprema', tipo: 'passiva', descricao: 'Regenera 8 HP/turno. Imune a venenos de qualquer tipo.' }], x: 0.05, y: 0.3 },

    { id: 'apr_hibrido_1', name: 'Interface Neural', desc: '+1 CA permanente. Conexão neural com sistemas externos.', branch: 'hibrido', cost: 1, tier: 1, requires: [], effects: [{ type: 'ca', value: 1 }], x: 0.4, y: 0.9 },
    { id: 'apr_hibrido_2', name: 'Força Biomecânica', desc: '+2 FOR permanente. Músculos reforçados com fibras sintéticas.', branch: 'hibrido', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'FOR', value: 2 }], x: 0.6, y: 0.9 },
    { id: 'apr_hibrido_3', name: 'Membro Aprimorado', desc: '+2 FOR, +2 DES. Membro biomecânico de alta performance.', branch: 'hibrido', cost: 1, tier: 2, requires: ['apr_hibrido_2'], effects: [{ type: 'attr', attr: 'FOR', value: 2 }, { type: 'attr', attr: 'DES', value: 2 }, { type: 'habilidade', nome: 'Membro Aprimorado', tipo: 'passiva', descricao: '+2 FOR e +2 DES. Membro biomecânico de alta performance.' }], x: 0.35, y: 0.7 },
    { id: 'apr_hibrido_4', name: 'Resistência Mágica', desc: '+15 Vida, resistência mágica +1. Escudo bio-arcano.', branch: 'hibrido', cost: 1, tier: 2, requires: ['apr_hibrido_1', 'apr_hibrido_2'], effects: [{ type: 'vida', value: 15 }, { type: 'habilidade', nome: 'Resistência Mágica', tipo: 'passiva', descricao: 'Resistência mágica +1. Reduz dano mágico recebido.' }], x: 0.55, y: 0.7 },
    { id: 'apr_hibrido_5', name: 'Sentido de Perigo', desc: '+3 Iniciativa. Sensores biológicos detectam ameaças.', branch: 'hibrido', cost: 1, tier: 3, requires: ['apr_hibrido_3'], effects: [{ type: 'pericia', pericia: 'Iniciativa', value: 3 }, { type: 'habilidade', nome: 'Sentido de Perigo', tipo: 'passiva', descricao: 'Detecta ameaças automaticamente. +3 Iniciativa.' }], x: 0.35, y: 0.5 },
    { id: 'apr_hibrido_6', name: 'Constituição Híbrida', desc: '+2 FOR, +2 DES, Vantagem em testes de CON.', branch: 'hibrido', cost: 1, tier: 3, requires: ['apr_hibrido_3', 'apr_hibrido_4'], effects: [{ type: 'attr', attr: 'FOR', value: 2 }, { type: 'attr', attr: 'DES', value: 2 }, { type: 'habilidade', nome: 'Vantagem CON', tipo: 'passiva', descricao: 'Vantagem em todos os testes de Constituição.' }], x: 0.55, y: 0.5 },
    { id: 'apr_hibrido_7', name: 'Ascensão Artificial', desc: '+3 em todos os atributos. Transcendência biomecânica.', branch: 'hibrido', cost: 2, tier: 4, requires: ['apr_hibrido_5', 'apr_hibrido_6'], effects: [{ type: 'attr', attr: 'FOR', value: 3 }, { type: 'attr', attr: 'DES', value: 3 }, { type: 'attr', attr: 'CON', value: 3 }, { type: 'habilidade', nome: 'Ascensão Artificial', tipo: 'passiva', descricao: '+3 em todos os atributos. Transcendência biomecânica completa.' }], x: 0.35, y: 0.3 },
    { id: 'apr_hibrido_8', name: 'Perfeição Híbrida', desc: '+40 Vida, +2 CA, imune condições físicas. Forma final.', branch: 'hibrido', cost: 2, tier: 4, requires: ['apr_hibrido_5', 'apr_hibrido_6'], effects: [{ type: 'vida', value: 40 }, { type: 'ca', value: 2 }, { type: 'habilidade', nome: 'Imunidade Física', tipo: 'passiva', descricao: 'Imune a todas as condições físicas negativas.' }], x: 0.55, y: 0.3 },
  ],
  connections: [
    ['apr_sintetico_1', 'apr_sintetico_3'],
    ['apr_sintetico_1', 'apr_sintetico_4'],
    ['apr_sintetico_2', 'apr_sintetico_4'],
    ['apr_sintetico_3', 'apr_sintetico_5'],
    ['apr_sintetico_4', 'apr_sintetico_5'],
    ['apr_sintetico_4', 'apr_sintetico_6'],
    ['apr_sintetico_5', 'apr_sintetico_7'],
    ['apr_sintetico_6', 'apr_sintetico_7'],
    ['apr_sintetico_6', 'apr_sintetico_8'],

    ['apr_biologico_1', 'apr_biologico_3'],
    ['apr_biologico_1', 'apr_biologico_4'],
    ['apr_biologico_2', 'apr_biologico_4'],
    ['apr_biologico_3', 'apr_biologico_5'],
    ['apr_biologico_4', 'apr_biologico_5'],
    ['apr_biologico_4', 'apr_biologico_6'],
    ['apr_biologico_5', 'apr_biologico_7'],
    ['apr_biologico_6', 'apr_biologico_7'],
    ['apr_biologico_5', 'apr_biologico_8'],
    ['apr_biologico_6', 'apr_biologico_8'],

    ['apr_hibrido_1', 'apr_hibrido_4'],
    ['apr_hibrido_2', 'apr_hibrido_3'],
    ['apr_hibrido_2', 'apr_hibrido_4'],
    ['apr_hibrido_3', 'apr_hibrido_5'],
    ['apr_hibrido_3', 'apr_hibrido_6'],
    ['apr_hibrido_4', 'apr_hibrido_6'],
    ['apr_hibrido_5', 'apr_hibrido_7'],
    ['apr_hibrido_6', 'apr_hibrido_7'],
    ['apr_hibrido_5', 'apr_hibrido_8'],
    ['apr_hibrido_6', 'apr_hibrido_8'],

    ['apr_sintetico_4', 'apr_biologico_4'],
    ['apr_biologico_4', 'apr_hibrido_4'],
    ['apr_sintetico_6', 'apr_hibrido_6'],
  ],
},

ELFO: {
  id: 'ELFO',
  name: 'Elfo',
  branches: [
    { id: 'floresta', name: 'Caminho da Floresta', desc: 'Natureza, harmonia e poder ancestral verde', color: '#22c55e', icon: 'park' },
    { id: 'arcano', name: 'Caminho Arcano', desc: 'Magia pura, feitiços e conhecimento mágico', color: '#8b5cf6', icon: 'auto_fix_high' },
    { id: 'ancestral', name: 'Caminho Ancestral', desc: 'Conhecimento milenar, memórias e sabedoria', color: '#3b82f6', icon: 'school' },
  ],
  nodes: [
    { id: 'elfo_floresta_1', name: 'Sentidos da Floresta', desc: '+5 Percepção, +2 DES. Os sentidos élficos se afinam com a natureza.', branch: 'floresta', cost: 1, tier: 1, requires: [], effects: [{ type: 'pericia', pericia: 'Percepção', value: 5 }, { type: 'attr', attr: 'DES', value: 2 }], x: -0.6, y: 0.9 },
    { id: 'elfo_floresta_2', name: 'Pé Leve', desc: '+3 Sobrevivência. Move-se pela floresta sem deixar rastros.', branch: 'floresta', cost: 1, tier: 1, requires: [], effects: [{ type: 'pericia', pericia: 'Sobrevivência', value: 3 }], x: -0.4, y: 0.9 },
    { id: 'elfo_floresta_3', name: 'Vigor Silvestre', desc: '+15 Vida, +1 CA. O corpo élfico se fortalece com a natureza.', branch: 'floresta', cost: 1, tier: 2, requires: ['elfo_floresta_1'], effects: [{ type: 'vida', value: 15 }, { type: 'ca', value: 1 }], x: -0.6, y: 0.7 },
    { id: 'elfo_floresta_4', name: 'Comunhão Natural', desc: 'Comunica-se com plantas e árvores. Pode solicitar ajuda da flora local.', branch: 'floresta', cost: 2, tier: 2, requires: ['elfo_floresta_2'], effects: [{ type: 'habilidade', nome: 'Comunhão Natural', tipo: 'ativa', descricao: 'Comunica-se com plantas e árvores. Pode solicitar ajuda da flora local.', custoEnergia: '5 PE' }], x: -0.4, y: 0.7 },
    { id: 'elfo_floresta_5', name: 'Cura Florestal', desc: 'Cura 2d8 HP por turno em ambiente natural. Dura 1 cena.', branch: 'floresta', cost: 2, tier: 3, requires: ['elfo_floresta_3'], effects: [{ type: 'habilidade', nome: 'Cura Florestal', tipo: 'ativa', descricao: 'Cura 2d8 HP por turno em ambiente natural. Dura 1 cena.', custoEnergia: '10 PE' }], x: -0.6, y: 0.5 },
    { id: 'elfo_floresta_6', name: 'Agilidade Élfica', desc: '+3 DES permanente. Vantagem em testes de Percepção.', branch: 'floresta', cost: 1, tier: 3, requires: ['elfo_floresta_4'], effects: [{ type: 'attr', attr: 'DES', value: 3 }, { type: 'pericia', pericia: 'Percepção', value: 0, especial: 'vantagem' }], x: -0.4, y: 0.5 },
    { id: 'elfo_floresta_7', name: 'Passo Etéreo', desc: 'Teleporte 12m através de vegetação. Ignora obstáculos físicos.', branch: 'floresta', cost: 2, tier: 4, requires: ['elfo_floresta_5', 'elfo_floresta_6'], effects: [{ type: 'habilidade', nome: 'Passo Etéreo', tipo: 'ativa', descricao: 'Teleporte 12m através de vegetação. Ignora obstáculos físicos.', custoEnergia: '10 PE' }], x: -0.6, y: 0.3 },
    { id: 'elfo_floresta_8', name: 'Sangue Verde', desc: '+30 Vida. Regeneração 3 HP/turno em ambiente florestal.', branch: 'floresta', cost: 2, tier: 4, requires: ['elfo_floresta_5', 'elfo_floresta_6'], effects: [{ type: 'vida', value: 30 }, { type: 'habilidade', nome: 'Regeneração Florestal', tipo: 'passiva', descricao: 'Regeneração 3 HP/turno em ambiente florestal ou natural.' }], x: -0.4, y: 0.3 },

    { id: 'elfo_arcano_1', name: 'Essência Arcana', desc: '+2 AM permanente. A magia flui naturalmente pelo sangue élfico.', branch: 'arcano', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'AM', value: 2 }], x: -0.1, y: 0.9 },
    { id: 'elfo_arcano_2', name: 'Estudo Arcano', desc: '+3 Arcanismo. Conhecimento mágico herdado de gerações.', branch: 'arcano', cost: 1, tier: 1, requires: [], effects: [{ type: 'pericia', pericia: 'Arcanismo', value: 3 }], x: 0.1, y: 0.9 },
    { id: 'elfo_arcano_3', name: 'Eficiência Mágica', desc: '+10 Energia, magias custam -1 PE. Mana flui com mais facilidade.', branch: 'arcano', cost: 1, tier: 2, requires: ['elfo_arcano_1'], effects: [{ type: 'energia', value: 10 }, { type: 'habilidade', nome: 'Eficiência Arcana', tipo: 'passiva', descricao: 'Magias custam -1 PE (mínimo 1).' }], x: -0.1, y: 0.7 },
    { id: 'elfo_arcano_4', name: 'Sentido Arcano', desc: 'Detecta magia e itens mágicos em 60m. Dura 1 cena.', branch: 'arcano', cost: 2, tier: 2, requires: ['elfo_arcano_2'], effects: [{ type: 'habilidade', nome: 'Sentido Arcano', tipo: 'ativa', descricao: 'Detecta magia e itens mágicos em 60m. Dura 1 cena.', custoEnergia: '5 PE' }], x: 0.1, y: 0.7 },
    { id: 'elfo_arcano_5', name: 'Poder Arcano', desc: '+3 AM permanente. DT de magias contra você aumenta em +2.', branch: 'arcano', cost: 1, tier: 3, requires: ['elfo_arcano_3'], effects: [{ type: 'attr', attr: 'AM', value: 3 }, { type: 'habilidade', nome: 'Resistência Arcana', tipo: 'passiva', descricao: 'DT de magias contra você aumenta em +2.' }], x: -0.1, y: 0.5 },
    { id: 'elfo_arcano_6', name: 'Transe Onírico', desc: 'Meditação de 2h equivale a descanso longo. Recuperação total.', branch: 'arcano', cost: 2, tier: 3, requires: ['elfo_arcano_4'], effects: [{ type: 'habilidade', nome: 'Transe Onírico', tipo: 'ativa', descricao: 'Meditação de 2h equivale a descanso longo. Recupera HP e PE totalmente.', custoEnergia: '8 PE' }], x: 0.1, y: 0.5 },
    { id: 'elfo_arcano_7', name: 'Canalização Natural', desc: 'Canaliza energia natural: +4 dano ou cura de magias. Dura 1 cena.', branch: 'arcano', cost: 2, tier: 4, requires: ['elfo_arcano_5', 'elfo_arcano_6'], effects: [{ type: 'habilidade', nome: 'Canalização Natural', tipo: 'ativa', descricao: 'Canaliza energia natural para adicionar +4 ao dano ou cura de magias. Dura 1 cena.', custoEnergia: '12 PE' }], x: -0.1, y: 0.3 },
    { id: 'elfo_arcano_8', name: 'Mente Élfica', desc: '+3 INT, imune a sono mágico e letargia arcana.', branch: 'arcano', cost: 2, tier: 4, requires: ['elfo_arcano_5', 'elfo_arcano_6'], effects: [{ type: 'attr', attr: 'INT', value: 3 }, { type: 'habilidade', nome: 'Mente Élfica', tipo: 'passiva', descricao: 'Imune a sono mágico e efeitos de letargia arcana.' }], x: 0.1, y: 0.3 },

    { id: 'elfo_ancestral_1', name: 'Mente Milenar', desc: '+2 INT permanente. Conhecimento acumulado de séculos.', branch: 'ancestral', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'INT', value: 2 }], x: 0.4, y: 0.9 },
    { id: 'elfo_ancestral_2', name: 'Sabedoria Antiga', desc: '+3 Conhecimento. Acesso ao saber dos ancestrais élficos.', branch: 'ancestral', cost: 1, tier: 1, requires: [], effects: [{ type: 'pericia', pericia: 'Conhecimento', value: 3 }], x: 0.6, y: 0.9 },
    { id: 'elfo_ancestral_3', name: 'Tradição Arcana', desc: '+2 Arcanismo, +5 AM. O esqueleto mágico élfico se manifesta.', branch: 'ancestral', cost: 1, tier: 2, requires: ['elfo_ancestral_1'], effects: [{ type: 'pericia', pericia: 'Arcanismo', value: 2 }, { type: 'attr', attr: 'AM', value: 5 }], x: 0.4, y: 0.7 },
    { id: 'elfo_ancestral_4', name: 'Visão Mística', desc: 'Detecta auras mágicas e criaturas invisíveis em 30m.', branch: 'ancestral', cost: 2, tier: 2, requires: ['elfo_ancestral_2'], effects: [{ type: 'habilidade', nome: 'Visão Mística', tipo: 'ativa', descricao: 'Detecta auras mágicas e criaturas invisíveis em 30m. Dura 1 cena.', custoEnergia: '5 PE' }], x: 0.6, y: 0.7 },
    { id: 'elfo_ancestral_5', name: 'Intelecto Ancestral', desc: '+3 INT permanente. Vantagem em testes de Investigação.', branch: 'ancestral', cost: 1, tier: 3, requires: ['elfo_ancestral_3'], effects: [{ type: 'attr', attr: 'INT', value: 3 }, { type: 'pericia', pericia: 'Investigação', value: 0, especial: 'vantagem' }], x: 0.4, y: 0.5 },
    { id: 'elfo_ancestral_6', name: 'Memória Ancestral', desc: 'Acessa memórias ancestrais. Vantagem em INT e Conhecimento por 1 cena.', branch: 'ancestral', cost: 2, tier: 3, requires: ['elfo_ancestral_4'], effects: [{ type: 'habilidade', nome: 'Memória Ancestral', tipo: 'ativa', descricao: 'Acessa memórias de ancestrais élficos. Vantagem em testes de INT e Conhecimento por 1 cena.', custoEnergia: '10 PE' }], x: 0.6, y: 0.5 },
    { id: 'elfo_ancestral_7', name: 'Rituais Ancestrais', desc: '+4 INT, rituais custam -25% PE e tempo de conjuração.', branch: 'ancestral', cost: 2, tier: 4, requires: ['elfo_ancestral_5', 'elfo_ancestral_6'], effects: [{ type: 'attr', attr: 'INT', value: 4 }, { type: 'habilidade', nome: 'Rituais Ancestrais', tipo: 'passiva', descricao: 'Rituais custam -25% PE e tempo de conjuração.' }], x: 0.4, y: 0.3 },
    { id: 'elfo_ancestral_8', name: 'Ascensão Élfica', desc: '+100 HP, imortalidade élfica. Não morre de velhice.', branch: 'ancestral', cost: 2, tier: 4, requires: ['elfo_ancestral_5', 'elfo_ancestral_6'], effects: [{ type: 'vida', value: 100 }, { type: 'habilidade', nome: 'Ascensão Élfica', tipo: 'passiva', descricao: 'Imortalidade élfica: não morre de velhice. +100 HP permanente.' }], x: 0.6, y: 0.3 },
  ],
  connections: [
    ['elfo_floresta_1', 'elfo_floresta_3'],
    ['elfo_floresta_1', 'elfo_floresta_4'],
    ['elfo_floresta_2', 'elfo_floresta_4'],
    ['elfo_floresta_2', 'elfo_floresta_3'],
    ['elfo_floresta_3', 'elfo_floresta_5'],
    ['elfo_floresta_3', 'elfo_floresta_6'],
    ['elfo_floresta_4', 'elfo_floresta_5'],
    ['elfo_floresta_4', 'elfo_floresta_6'],
    ['elfo_floresta_5', 'elfo_floresta_7'],
    ['elfo_floresta_5', 'elfo_floresta_8'],
    ['elfo_floresta_6', 'elfo_floresta_7'],
    ['elfo_floresta_6', 'elfo_floresta_8'],

    ['elfo_arcano_1', 'elfo_arcano_3'],
    ['elfo_arcano_1', 'elfo_arcano_4'],
    ['elfo_arcano_2', 'elfo_arcano_3'],
    ['elfo_arcano_2', 'elfo_arcano_4'],
    ['elfo_arcano_3', 'elfo_arcano_5'],
    ['elfo_arcano_3', 'elfo_arcano_6'],
    ['elfo_arcano_4', 'elfo_arcano_5'],
    ['elfo_arcano_4', 'elfo_arcano_6'],
    ['elfo_arcano_5', 'elfo_arcano_7'],
    ['elfo_arcano_5', 'elfo_arcano_8'],
    ['elfo_arcano_6', 'elfo_arcano_7'],
    ['elfo_arcano_6', 'elfo_arcano_8'],

    ['elfo_ancestral_1', 'elfo_ancestral_3'],
    ['elfo_ancestral_1', 'elfo_ancestral_4'],
    ['elfo_ancestral_2', 'elfo_ancestral_3'],
    ['elfo_ancestral_2', 'elfo_ancestral_4'],
    ['elfo_ancestral_3', 'elfo_ancestral_5'],
    ['elfo_ancestral_3', 'elfo_ancestral_6'],
    ['elfo_ancestral_4', 'elfo_ancestral_5'],
    ['elfo_ancestral_4', 'elfo_ancestral_6'],
    ['elfo_ancestral_5', 'elfo_ancestral_7'],
    ['elfo_ancestral_5', 'elfo_ancestral_8'],
    ['elfo_ancestral_6', 'elfo_ancestral_7'],
    ['elfo_ancestral_6', 'elfo_ancestral_8'],
  ],
},

BRUXA: {
  id: 'BRUXA',
  name: 'Bruxa',
  branches: [
    { id: 'pacto', name: 'Caminho do Pacto', desc: 'Poder sombrio, maldições e pactos com entidades', color: '#a855f7', icon: 'dark_mode' },
    { id: 'ervas', name: 'Caminho das Ervas', desc: 'Cura, natureza e alquimia natural', color: '#22c55e', icon: 'eco' },
    { id: 'encantamento', name: 'Caminho do Encantamento', desc: 'Controle mental, ilusões e manipulação', color: '#ec4899', icon: 'favorite' },
  ],
  nodes: [
    { id: 'bruxa_pacto_1', name: 'Pacto Inicial', desc: '+2 AM permanente. O pacto com entidades sombrias fortalece a magia.', branch: 'pacto', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'AM', value: 2 }], x: -0.6, y: 0.9 },
    { id: 'bruxa_pacto_2', name: 'Maldição Menor', desc: 'Maldição que causa -3 em 1 atributo do alvo. CD 18 resiste. Dura 1 cena.', branch: 'pacto', cost: 2, tier: 1, requires: [], effects: [{ type: 'habilidade', nome: 'Maldição Menor', tipo: 'ativa', descricao: 'Maldição que causa -3 em 1 atributo do alvo. CD 18 resiste. Dura 1 cena.', custoEnergia: '8 PE' }], x: -0.4, y: 0.9 },
    { id: 'bruxa_pacto_3', name: 'Energia Sombria', desc: '+10 Energia, rituais custam -25% PE. Poder do pacto flui.', branch: 'pacto', cost: 1, tier: 2, requires: ['bruxa_pacto_1'], effects: [{ type: 'energia', value: 10 }, { type: 'habilidade', nome: 'Eficiência Ritualística', tipo: 'passiva', descricao: 'Rituais custam -25% PE.' }], x: -0.6, y: 0.7 },
    { id: 'bruxa_pacto_4', name: 'Maldição Maior', desc: 'Maldição que causa -4 em 1 atributo. CD 20 resiste. Dura 1 cena.', branch: 'pacto', cost: 2, tier: 2, requires: ['bruxa_pacto_2'], effects: [{ type: 'habilidade', nome: 'Maldição Maior', tipo: 'ativa', descricao: 'Maldição que causa -4 em 1 atributo do alvo. CD 20 resiste. Dura 1 cena.', custoEnergia: '12 PE' }], x: -0.4, y: 0.7 },
    { id: 'bruxa_pacto_5', name: 'Maldições Cumulativas', desc: '+3 AM, maldições podem ser empilhadas até 3 vezes no mesmo alvo.', branch: 'pacto', cost: 2, tier: 3, requires: ['bruxa_pacto_3'], effects: [{ type: 'attr', attr: 'AM', value: 3 }, { type: 'habilidade', nome: 'Maldições Cumulativas', tipo: 'passiva', descricao: 'Maldições podem ser empilhadas até 3 vezes no mesmo alvo.' }], x: -0.6, y: 0.5 },
    { id: 'bruxa_pacto_6', name: 'Pacto Sombrio', desc: 'Faz pacto com entidade sombria. +20 Vida permanente.', branch: 'pacto', cost: 2, tier: 3, requires: ['bruxa_pacto_4'], effects: [{ type: 'vida', value: 20 }, { type: 'habilidade', nome: 'Pacto Sombrio', tipo: 'ativa', descricao: 'Faz pacto com entidade sombria. +20 Vida permanente mas vulnerável a luz sagrada.', custoEnergia: '15 PE' }], x: -0.4, y: 0.5 },
    { id: 'bruxa_pacto_7', name: 'Maldição Poderosa', desc: 'Maldição devastadora: -6 em 1 atributo. CD 22 resiste. Dura 1 cena.', branch: 'pacto', cost: 2, tier: 4, requires: ['bruxa_pacto_5', 'bruxa_pacto_6'], effects: [{ type: 'habilidade', nome: 'Maldição Poderosa', tipo: 'ativa', descricao: 'Maldição devastadora: -6 em 1 atributo. CD 22 resiste. Dura 1 cena.', custoEnergia: '18 PE' }], x: -0.6, y: 0.3 },
    { id: 'bruxa_pacto_8', name: 'Senhora dos Rituais', desc: '+40 Vida, rituais não requerem componentes materiais.', branch: 'pacto', cost: 2, tier: 4, requires: ['bruxa_pacto_5', 'bruxa_pacto_6'], effects: [{ type: 'vida', value: 40 }, { type: 'habilidade', nome: 'Rituais Puros', tipo: 'passiva', descricao: 'Rituais não requerem componentes materiais.' }], x: -0.4, y: 0.3 },

    { id: 'bruxa_ervas_1', name: 'Vitalidade Natural', desc: '+15 Vida. O corpo da bruxa se fortalece com a natureza.', branch: 'ervas', cost: 1, tier: 1, requires: [], effects: [{ type: 'vida', value: 15 }], x: -0.1, y: 0.9 },
    { id: 'bruxa_ervas_2', name: 'Conhecimento Herbal', desc: '+3 Sobrevivência. Identifica ervas e plantas curativas.', branch: 'ervas', cost: 1, tier: 1, requires: [], effects: [{ type: 'pericia', pericia: 'Sobrevivência', value: 3 }], x: 0.1, y: 0.9 },
    { id: 'bruxa_ervas_3', name: 'Cura Natural', desc: 'Cura 2d8+AM HP em alvo. Magia da terra em suas mãos.', branch: 'ervas', cost: 2, tier: 2, requires: ['bruxa_ervas_1'], effects: [{ type: 'habilidade', nome: 'Cura Natural', tipo: 'ativa', descricao: 'Cura 2d8+ModAM HP em alvo tocado. Ação padrão.', custoEnergia: '8 PE' }], x: -0.1, y: 0.7 },
    { id: 'bruxa_ervas_4', name: 'Constituição Herbária', desc: '+2 CON, imune a venenos naturais. Corpo purificado pelas ervas.', branch: 'ervas', cost: 1, tier: 2, requires: ['bruxa_ervas_2'], effects: [{ type: 'attr', attr: 'CON', value: 2 }, { type: 'habilidade', nome: 'Imunidade Natural', tipo: 'passiva', descricao: 'Imune a venenos de origem natural.' }], x: 0.1, y: 0.7 },
    { id: 'bruxa_ervas_5', name: 'Regeneração Natural', desc: 'Regeneração 3 HP/turno em ambiente natural. Dura 1 cena.', branch: 'ervas', cost: 2, tier: 3, requires: ['bruxa_ervas_3'], effects: [{ type: 'habilidade', nome: 'Regeneração Natural', tipo: 'ativa', descricao: 'Regeneração 3 HP/turno em ambiente natural. Dura 1 cena.', custoEnergia: '10 PE' }], x: -0.1, y: 0.5 },
    { id: 'bruxa_ervas_6', name: 'Proteção da Terra', desc: '+20 Vida, +1 CA. A terra protege a bruxa.', branch: 'ervas', cost: 1, tier: 3, requires: ['bruxa_ervas_4'], effects: [{ type: 'vida', value: 20 }, { type: 'ca', value: 1 }], x: 0.1, y: 0.5 },
    { id: 'bruxa_ervas_7', name: 'Avatar Natural', desc: 'Controla terreno natural em 100m. Planta, terra e água obedecem.', branch: 'ervas', cost: 2, tier: 4, requires: ['bruxa_ervas_5', 'bruxa_ervas_6'], effects: [{ type: 'habilidade', nome: 'Avatar Natural', tipo: 'ativa', descricao: 'Controla terreno natural em 100m. Planta, terra e água obedecem. Dura 1 cena.', custoEnergia: '15 PE' }], x: -0.1, y: 0.3 },
    { id: 'bruxa_ervas_8', name: 'Emissária da Natureza', desc: '+30 Vida, aliados em 10m ganham regeneração 3 HP/turno.', branch: 'ervas', cost: 2, tier: 4, requires: ['bruxa_ervas_5', 'bruxa_ervas_6'], effects: [{ type: 'vida', value: 30 }, { type: 'habilidade', nome: 'Aura Curativa', tipo: 'passiva', descricao: 'Aliados em 10m ganham regeneração 3 HP/turno.' }], x: 0.1, y: 0.3 },

    { id: 'bruxa_encantamento_1', name: 'Toque Encantador', desc: '+2 AM permanente. A magia da bruxa encanta mentes.', branch: 'encantamento', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'AM', value: 2 }], x: 0.4, y: 0.9 },
    { id: 'bruxa_encantamento_2', name: 'Lábios Prateados', desc: '+3 Persuasão. Palavras carregadas de magia.', branch: 'encantamento', cost: 1, tier: 1, requires: [], effects: [{ type: 'pericia', pericia: 'Persuasão', value: 3 }], x: 0.6, y: 0.9 },
    { id: 'bruxa_encantamento_3', name: 'Comunhão de Gaia', desc: 'Sente todas as criaturas vivas em 300m. Conexão com a terra.', branch: 'encantamento', cost: 2, tier: 2, requires: ['bruxa_encantamento_1'], effects: [{ type: 'habilidade', nome: 'Comunhão de Gaia', tipo: 'ativa', descricao: 'Sente todas as criaturas vivas em 300m. Dura 1 cena.', custoEnergia: '8 PE' }], x: 0.4, y: 0.7 },
    { id: 'bruxa_encantamento_4', name: 'Sensor Arcano', desc: '+10 Energia, detecta magia ativa em 1km.', branch: 'encantamento', cost: 1, tier: 2, requires: ['bruxa_encantamento_2'], effects: [{ type: 'energia', value: 10 }, { type: 'habilidade', nome: 'Detectar Magia', tipo: 'ativa', descricao: 'Detecta magia ativa e itens encantados em 1km. Dura 1 cena.', custoEnergia: '5 PE' }], x: 0.6, y: 0.7 },
    { id: 'bruxa_encantamento_5', name: 'Dominação Mental', desc: 'Controla ações do alvo. CD 18+AM resiste. Dura 1 rodada.', branch: 'encantamento', cost: 2, tier: 3, requires: ['bruxa_encantamento_3'], effects: [{ type: 'habilidade', nome: 'Dominação Mental', tipo: 'ativa', descricao: 'Controla ações do alvo por 1 rodada. CD 18+AM resiste.', custoEnergia: '15 PE' }], x: 0.4, y: 0.5 },
    { id: 'bruxa_encantamento_6', name: 'Presença Imponente', desc: '+3 AM, Vantagem em testes de Intimidação.', branch: 'encantamento', cost: 1, tier: 3, requires: ['bruxa_encantamento_4'], effects: [{ type: 'attr', attr: 'AM', value: 3 }, { type: 'pericia', pericia: 'Intimidação', value: 0, especial: 'vantagem' }], x: 0.6, y: 0.5 },
    { id: 'bruxa_encantamento_7', name: 'Controle de Grupo', desc: 'Dominação afeta até 3 alvos simultaneamente. CD 20+AM resiste.', branch: 'encantamento', cost: 2, tier: 4, requires: ['bruxa_encantamento_5', 'bruxa_encantamento_6'], effects: [{ type: 'habilidade', nome: 'Controle de Grupo', tipo: 'ativa', descricao: 'Dominação afeta até 3 alvos simultaneamente. CD 20+AM resiste. Dura 1 rodada.', custoEnergia: '20 PE' }], x: 0.4, y: 0.3 },
    { id: 'bruxa_encantamento_8', name: 'Voz de Gaia', desc: '+4 AM, rituais são conjurados instantaneamente.', branch: 'encantamento', cost: 2, tier: 4, requires: ['bruxa_encantamento_5', 'bruxa_encantamento_6'], effects: [{ type: 'attr', attr: 'AM', value: 4 }, { type: 'habilidade', nome: 'Voz de Gaia', tipo: 'passiva', descricao: 'Rituais são conjurados instantaneamente sem tempo de conjuração.' }], x: 0.6, y: 0.3 },
  ],
  connections: [
    ['bruxa_pacto_1', 'bruxa_pacto_3'],
    ['bruxa_pacto_1', 'bruxa_pacto_4'],
    ['bruxa_pacto_2', 'bruxa_pacto_3'],
    ['bruxa_pacto_2', 'bruxa_pacto_4'],
    ['bruxa_pacto_3', 'bruxa_pacto_5'],
    ['bruxa_pacto_3', 'bruxa_pacto_6'],
    ['bruxa_pacto_4', 'bruxa_pacto_5'],
    ['bruxa_pacto_4', 'bruxa_pacto_6'],
    ['bruxa_pacto_5', 'bruxa_pacto_7'],
    ['bruxa_pacto_5', 'bruxa_pacto_8'],
    ['bruxa_pacto_6', 'bruxa_pacto_7'],
    ['bruxa_pacto_6', 'bruxa_pacto_8'],

    ['bruxa_ervas_1', 'bruxa_ervas_3'],
    ['bruxa_ervas_1', 'bruxa_ervas_4'],
    ['bruxa_ervas_2', 'bruxa_ervas_3'],
    ['bruxa_ervas_2', 'bruxa_ervas_4'],
    ['bruxa_ervas_3', 'bruxa_ervas_5'],
    ['bruxa_ervas_3', 'bruxa_ervas_6'],
    ['bruxa_ervas_4', 'bruxa_ervas_5'],
    ['bruxa_ervas_4', 'bruxa_ervas_6'],
    ['bruxa_ervas_5', 'bruxa_ervas_7'],
    ['bruxa_ervas_5', 'bruxa_ervas_8'],
    ['bruxa_ervas_6', 'bruxa_ervas_7'],
    ['bruxa_ervas_6', 'bruxa_ervas_8'],

    ['bruxa_encantamento_1', 'bruxa_encantamento_3'],
    ['bruxa_encantamento_1', 'bruxa_encantamento_4'],
    ['bruxa_encantamento_2', 'bruxa_encantamento_3'],
    ['bruxa_encantamento_2', 'bruxa_encantamento_4'],
    ['bruxa_encantamento_3', 'bruxa_encantamento_5'],
    ['bruxa_encantamento_3', 'bruxa_encantamento_6'],
    ['bruxa_encantamento_4', 'bruxa_encantamento_5'],
    ['bruxa_encantamento_4', 'bruxa_encantamento_6'],
    ['bruxa_encantamento_5', 'bruxa_encantamento_7'],
    ['bruxa_encantamento_5', 'bruxa_encantamento_8'],
    ['bruxa_encantamento_6', 'bruxa_encantamento_7'],
    ['bruxa_encantamento_6', 'bruxa_encantamento_8'],
  ],
},

MAGO: {
  id: 'MAGO',
  name: 'Mago',
  branches: [
    { id: 'arcana', name: 'Caminho Arcana', desc: 'Magia pura, foco arcano e feitiços devastadores', color: '#6366f1', icon: 'auto_awesome' },
    { id: 'elemental', name: 'Caminho Elemental', desc: 'Domínio dos elementos, fogo, gelo e raio', color: '#f97316', icon: 'local_fire_department' },
    { id: 'cronurgia', name: 'Caminho da Cronurgia', desc: 'Tempo, espaço e manipulação da realidade', color: '#06b6d4', icon: 'schedule' },
  ],
  nodes: [
    { id: 'mago_arcana_1', name: 'Foco Arcano', desc: '+2 AM permanente. A essência arcana flui pelo corpo do mago.', branch: 'arcana', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'AM', value: 2 }], x: -0.6, y: 0.9 },
    { id: 'mago_arcana_2', name: 'Erudição Mágica', desc: '+3 Arcanismo. Anos de estudo em tomos arcanos.', branch: 'arcana', cost: 1, tier: 1, requires: [], effects: [{ type: 'pericia', pericia: 'Arcanismo', value: 3 }], x: -0.4, y: 0.9 },
    { id: 'mago_arcana_3', name: 'Reação Arcana', desc: 'Nega 1 magia por combate. Contrafeitiço instintivo.', branch: 'arcana', cost: 2, tier: 2, requires: ['mago_arcana_1'], effects: [{ type: 'habilidade', nome: 'Reação Arcana', tipo: 'ativa', descricao: 'Nega 1 magia por combate como reação. Teste AM vs CD da magia.', custoEnergia: '8 PE' }], x: -0.6, y: 0.7 },
    { id: 'mago_arcana_4', name: 'Eficiência Arcana', desc: '+10 Energia, magias custam -1 PE. Fluxo de mana otimizado.', branch: 'arcana', cost: 1, tier: 2, requires: ['mago_arcana_2'], effects: [{ type: 'energia', value: 10 }, { type: 'habilidade', nome: 'Eficiência Arcana', tipo: 'passiva', descricao: 'Magias custam -1 PE (mínimo 1).' }], x: -0.4, y: 0.7 },
    { id: 'mago_arcana_5', name: 'Poder Arcano Superior', desc: '+3 AM, DT de magias contra você aumenta em +2.', branch: 'arcana', cost: 1, tier: 3, requires: ['mago_arcana_3'], effects: [{ type: 'attr', attr: 'AM', value: 3 }, { type: 'habilidade', nome: 'Resistência Arcana', tipo: 'passiva', descricao: 'DT de magias contra você aumenta em +2.' }], x: -0.6, y: 0.5 },
    { id: 'mago_arcana_6', name: 'Escudo de Mana', desc: 'Absorve 20×INT de dano. Escudo de mana puro.', branch: 'arcana', cost: 2, tier: 3, requires: ['mago_arcana_4'], effects: [{ type: 'habilidade', nome: 'Escudo de Mana', tipo: 'ativa', descricao: 'Absorve 20×INT de dano antes de atingir HP. Dura 1 cena.', custoEnergia: '12 PE' }], x: -0.4, y: 0.5 },
    { id: 'mago_arcana_7', name: 'Maestria Arcana', desc: 'Pode conjurar 2 magias por turno. Domínio total sobre a magia.', branch: 'arcana', cost: 2, tier: 4, requires: ['mago_arcana_5', 'mago_arcana_6'], effects: [{ type: 'habilidade', nome: 'Maestria Arcana', tipo: 'ativa', descricao: 'Pode conjurar 2 magias por turno em vez de 1.', custoEnergia: '15 PE' }], x: -0.6, y: 0.3 },
    { id: 'mago_arcana_8', name: 'Arcanista Supremo', desc: '+3 INT, CD de suas magias aumenta em +4 permanentemente.', branch: 'arcana', cost: 2, tier: 4, requires: ['mago_arcana_5', 'mago_arcana_6'], effects: [{ type: 'attr', attr: 'INT', value: 3 }, { type: 'habilidade', nome: 'Poder Supremo', tipo: 'passiva', descricao: 'CD de todas as suas magias aumenta em +4.' }], x: -0.4, y: 0.3 },

    { id: 'mago_elemental_1', name: 'Afinidade Elemental', desc: '+2 AM permanente. Sintonia com as forças da natureza.', branch: 'elemental', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'AM', value: 2 }], x: -0.1, y: 0.9 },
    { id: 'mago_elemental_2', name: 'Escolha Elemental', desc: 'Escolhe 1 elemento primário. Dano elemental +3 permanente.', branch: 'elemental', cost: 1, tier: 1, requires: [], effects: [{ type: 'habilidade', nome: 'Escolha Elemental', tipo: 'passiva', descricao: 'Escolhe 1 elemento (fogo, gelo, raio, terra). Dano desse elemento +3.' }], x: 0.1, y: 0.9 },
    { id: 'mago_elemental_3', name: 'Resistência Elemental', desc: 'Resistência 50% ao elemento escolhido. Proteção natural.', branch: 'elemental', cost: 2, tier: 2, requires: ['mago_elemental_1'], effects: [{ type: 'habilidade', nome: 'Resistência Elemental', tipo: 'passiva', descricao: 'Resistência 50% ao dano do elemento escolhido.' }], x: -0.1, y: 0.7 },
    { id: 'mago_elemental_4', name: 'Vigor Elemental', desc: '+15 Vida, +1 CA. O corpo absorve energia elemental.', branch: 'elemental', cost: 1, tier: 2, requires: ['mago_elemental_2'], effects: [{ type: 'vida', value: 15 }, { type: 'ca', value: 1 }], x: 0.1, y: 0.7 },
    { id: 'mago_elemental_5', name: 'Segundo Elemento', desc: 'Escolhe um segundo elemento. Dano elemental +3 nesse elemento.', branch: 'elemental', cost: 2, tier: 3, requires: ['mago_elemental_3'], effects: [{ type: 'habilidade', nome: 'Segundo Elemento', tipo: 'ativa', descricao: 'Escolhe um segundo elemento. Dano +3 nesse elemento.', custoEnergia: '5 PE' }], x: -0.1, y: 0.5 },
    { id: 'mago_elemental_6', name: 'Fúria Elemental', desc: '+3 AM, dano elemental +1d6 em todos os elementos.', branch: 'elemental', cost: 1, tier: 3, requires: ['mago_elemental_4'], effects: [{ type: 'attr', attr: 'AM', value: 3 }, { type: 'habilidade', nome: 'Fúria Elemental', tipo: 'passiva', descricao: 'Dano elemental +1d6 em todos os elementos dominados.' }], x: 0.1, y: 0.5 },
    { id: 'mago_elemental_7', name: 'Distorção Elemental', desc: 'Altera elementos em 30m. Terreno e clima obedecem.', branch: 'elemental', cost: 2, tier: 4, requires: ['mago_elemental_5', 'mago_elemental_6'], effects: [{ type: 'habilidade', nome: 'Distorção Elemental', tipo: 'ativa', descricao: 'Altera elementos em 30m. Pode mudar terreno e clima local. Dura 1 cena.', custoEnergia: '18 PE' }], x: -0.1, y: 0.3 },
    { id: 'mago_elemental_8', name: 'Avatar Elemental', desc: '+30 Vida, imune ao dano dos próprios elementos.', branch: 'elemental', cost: 2, tier: 4, requires: ['mago_elemental_5', 'mago_elemental_6'], effects: [{ type: 'vida', value: 30 }, { type: 'habilidade', nome: 'Imunidade Elemental', tipo: 'passiva', descricao: 'Imune a dano dos elementos que domina.' }], x: 0.1, y: 0.3 },

    { id: 'mago_cronurgia_1', name: 'Percepção Temporal', desc: '+2 INT permanente. Percebe o fluxo do tempo de forma única.', branch: 'cronurgia', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'INT', value: 2 }], x: 0.4, y: 0.9 },
    { id: 'mago_cronurgia_2', name: 'Análise Cronológica', desc: '+3 Investigação. Enxerga padrões temporais invisíveis.', branch: 'cronurgia', cost: 1, tier: 1, requires: [], effects: [{ type: 'pericia', pericia: 'Investigação', value: 3 }], x: 0.6, y: 0.9 },
    { id: 'mago_cronurgia_3', name: 'Desacelerar', desc: 'Inimigo perde 1 ação por 1 rodada. DT 16+AM resiste.', branch: 'cronurgia', cost: 2, tier: 2, requires: ['mago_cronurgia_1'], effects: [{ type: 'habilidade', nome: 'Desacelerar', tipo: 'ativa', descricao: 'Inimigo perde 1 ação por 1 rodada. DT 16+AM resiste.', custoEnergia: '10 PE' }], x: 0.4, y: 0.7 },
    { id: 'mago_cronurgia_4', name: 'Fluxo Temporal', desc: '+10 Energia, Vantagem em testes de Iniciativa.', branch: 'cronurgia', cost: 1, tier: 2, requires: ['mago_cronurgia_2'], effects: [{ type: 'energia', value: 10 }, { type: 'pericia', pericia: 'Iniciativa', value: 0, especial: 'vantagem' }], x: 0.6, y: 0.7 },
    { id: 'mago_cronurgia_5', name: 'Acelerar', desc: 'Aliado ganha +1 ação por 1 rodada. Controle temporal.', branch: 'cronurgia', cost: 2, tier: 3, requires: ['mago_cronurgia_3'], effects: [{ type: 'habilidade', nome: 'Acelerar', tipo: 'ativa', descricao: 'Aliado ganha +1 ação adicional por 1 rodada.', custoEnergia: '12 PE' }], x: 0.4, y: 0.5 },
    { id: 'mago_cronurgia_6', name: 'Consciência Temporal', desc: '+3 INT, não pode ser surpreendido. Percebe tudo ao redor.', branch: 'cronurgia', cost: 1, tier: 3, requires: ['mago_cronurgia_4'], effects: [{ type: 'attr', attr: 'INT', value: 3 }, { type: 'habilidade', nome: 'Não Surpreendido', tipo: 'passiva', descricao: 'Não pode ser surpreendido. Sempre age na iniciativa.' }], x: 0.6, y: 0.5 },
    { id: 'mago_cronurgia_7', name: 'Parar Tempo', desc: 'Para o tempo por 1 rodada. Age livremente enquanto outros estão congelados.', branch: 'cronurgia', cost: 2, tier: 4, requires: ['mago_cronurgia_5', 'mago_cronurgia_6'], effects: [{ type: 'habilidade', nome: 'Parar Tempo', tipo: 'ativa', descricao: 'Para o tempo por 1 rodada. Age livremente enquanto outros estão congelados. 1×/dia.', custoEnergia: '20 PE' }], x: 0.4, y: 0.3 },
    { id: 'mago_cronurgia_8', name: 'Senhor do Tempo', desc: '+3 AM, age 2 vezes no primeiro turno de cada combate.', branch: 'cronurgia', cost: 2, tier: 4, requires: ['mago_cronurgia_5', 'mago_cronurgia_6'], effects: [{ type: 'attr', attr: 'AM', value: 3 }, { type: 'habilidade', nome: 'Aceleração Inicial', tipo: 'passiva', descricao: 'Age 2 vezes no primeiro turno de cada combate.' }], x: 0.6, y: 0.3 },
  ],
  connections: [
    ['mago_arcana_1', 'mago_arcana_3'],
    ['mago_arcana_1', 'mago_arcana_4'],
    ['mago_arcana_2', 'mago_arcana_3'],
    ['mago_arcana_2', 'mago_arcana_4'],
    ['mago_arcana_3', 'mago_arcana_5'],
    ['mago_arcana_3', 'mago_arcana_6'],
    ['mago_arcana_4', 'mago_arcana_5'],
    ['mago_arcana_4', 'mago_arcana_6'],
    ['mago_arcana_5', 'mago_arcana_7'],
    ['mago_arcana_5', 'mago_arcana_8'],
    ['mago_arcana_6', 'mago_arcana_7'],
    ['mago_arcana_6', 'mago_arcana_8'],

    ['mago_elemental_1', 'mago_elemental_3'],
    ['mago_elemental_1', 'mago_elemental_4'],
    ['mago_elemental_2', 'mago_elemental_3'],
    ['mago_elemental_2', 'mago_elemental_4'],
    ['mago_elemental_3', 'mago_elemental_5'],
    ['mago_elemental_3', 'mago_elemental_6'],
    ['mago_elemental_4', 'mago_elemental_5'],
    ['mago_elemental_4', 'mago_elemental_6'],
    ['mago_elemental_5', 'mago_elemental_7'],
    ['mago_elemental_5', 'mago_elemental_8'],
    ['mago_elemental_6', 'mago_elemental_7'],
    ['mago_elemental_6', 'mago_elemental_8'],

    ['mago_cronurgia_1', 'mago_cronurgia_3'],
    ['mago_cronurgia_1', 'mago_cronurgia_4'],
    ['mago_cronurgia_2', 'mago_cronurgia_3'],
    ['mago_cronurgia_2', 'mago_cronurgia_4'],
    ['mago_cronurgia_3', 'mago_cronurgia_5'],
    ['mago_cronurgia_3', 'mago_cronurgia_6'],
    ['mago_cronurgia_4', 'mago_cronurgia_5'],
    ['mago_cronurgia_4', 'mago_cronurgia_6'],
    ['mago_cronurgia_5', 'mago_cronurgia_7'],
    ['mago_cronurgia_5', 'mago_cronurgia_8'],
    ['mago_cronurgia_6', 'mago_cronurgia_7'],
    ['mago_cronurgia_6', 'mago_cronurgia_8'],
  ],
},

FEITICEIRO: {
  id: 'FEITICEIRO',
  name: 'Feiticeiro',
  branches: [
    { id: 'linhagem', name: 'Caminho da Linhagem', desc: 'Poder inato, dom elemental e herança mágica', color: '#f43f5e', icon: 'bloodtype' },
    { id: 'metamorfose', name: 'Caminho da Metamorfose', desc: 'Transformação, mutações e evolução do dom', color: '#8b5cf6', icon: 'transform' },
    { id: 'caos', name: 'Caminho do Caos', desc: 'Imprevisibilidade, magia selvagem e poder instável', color: '#f59e0b', icon: 'casino' },
  ],
  nodes: [
    { id: 'feiticeiro_linhagem_1', name: 'Sangue Mágico', desc: '+2 AM permanente. O poder da linhagem flui nas veias.', branch: 'linhagem', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'AM', value: 2 }], x: -0.6, y: 0.9 },
    { id: 'feiticeiro_linhagem_2', name: 'Vitalidade Inata', desc: '+15 Vida. O corpo do feiticeiro é mais resistente.', branch: 'linhagem', cost: 1, tier: 1, requires: [], effects: [{ type: 'vida', value: 15 }], x: -0.4, y: 0.9 },
    { id: 'feiticeiro_linhagem_3', name: 'Poder Selvagem', desc: '+10 Energia, magias causam +1d6 dano. Magia bruta.', branch: 'linhagem', cost: 1, tier: 2, requires: ['feiticeiro_linhagem_1'], effects: [{ type: 'energia', value: 10 }, { type: 'habilidade', nome: 'Magia Selvagem', tipo: 'passiva', descricao: 'Magias causam +1d6 dano adicional.' }], x: -0.6, y: 0.7 },
    { id: 'feiticeiro_linhagem_4', name: 'Pulso Arcano', desc: 'Explosão arcana 2d8+AM em 6m. Poder inato descontrolado.', branch: 'linhagem', cost: 2, tier: 2, requires: ['feiticeiro_linhagem_2'], effects: [{ type: 'habilidade', nome: 'Pulso Arcano', tipo: 'ativa', descricao: 'Explosão arcana 2d8+ModAM em 6m. Dano a todos.', custoEnergia: '10 PE' }], x: -0.4, y: 0.7 },
    { id: 'feiticeiro_linhagem_5', name: 'Resistência Mágica', desc: '+3 AM, resistência mágica +2. O sangue protege.', branch: 'linhagem', cost: 1, tier: 3, requires: ['feiticeiro_linhagem_3'], effects: [{ type: 'attr', attr: 'AM', value: 3 }, { type: 'habilidade', nome: 'Resistência Mágica', tipo: 'passiva', descricao: 'Resistência mágica +2 em todas as DTs mágicas.' }], x: -0.6, y: 0.5 },
    { id: 'feiticeiro_linhagem_6', name: 'Drenar Essência', desc: 'Drena essência do alvo. Cura 2d10+AM HP.', branch: 'linhagem', cost: 2, tier: 3, requires: ['feiticeiro_linhagem_4'], effects: [{ type: 'habilidade', nome: 'Drenar Essência', tipo: 'ativa', descricao: 'Drena essência mágica do alvo. Cura 2d10+ModAM HP. Toque.', custoEnergia: '12 PE' }], x: -0.4, y: 0.5 },
    { id: 'feiticeiro_linhagem_7', name: 'Sangue Puro', desc: '+4 AM permanente. A linhagem atinge sua forma pura.', branch: 'linhagem', cost: 2, tier: 4, requires: ['feiticeiro_linhagem_5', 'feiticeiro_linhagem_6'], effects: [{ type: 'attr', attr: 'AM', value: 4 }, { type: 'habilidade', nome: 'Sangue Puro', tipo: 'passiva', descricao: '+4 AM permanente. A linhagem atinge sua forma mais pura.' }], x: -0.6, y: 0.3 },
    { id: 'feiticeiro_linhagem_8', name: 'Transcendência Inata', desc: '+30 Vida, magias ignoram resistência mágica fraca.', branch: 'linhagem', cost: 2, tier: 4, requires: ['feiticeiro_linhagem_5', 'feiticeiro_linhagem_6'], effects: [{ type: 'vida', value: 30 }, { type: 'habilidade', nome: 'Penetração Arcana', tipo: 'passiva', descricao: 'Magias ignoram resistência mágica fraca de alvos.' }], x: -0.4, y: 0.3 },

    { id: 'feiticeiro_metamorfose_1', name: 'Força Bestial', desc: '+2 FOR permanente. O dom físico se manifesta.', branch: 'metamorfose', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'FOR', value: 2 }], x: -0.1, y: 0.9 },
    { id: 'feiticeiro_metamorfose_2', name: 'Pele Resistente', desc: '+1 CA. A pele do feiticeiro endurece.', branch: 'metamorfose', cost: 1, tier: 1, requires: [], effects: [{ type: 'ca', value: 1 }], x: 0.1, y: 0.9 },
    { id: 'feiticeiro_metamorfose_3', name: 'Transformação Parcial', desc: '+2 FOR e DES por 1 cena. Membros alterados.', branch: 'metamorfose', cost: 2, tier: 2, requires: ['feiticeiro_metamorfose_1'], effects: [{ type: 'habilidade', nome: 'Transformação Parcial', tipo: 'ativa', descricao: '+2 FOR e DES por 1 cena. Membros se alteram parcialmente.', custoEnergia: '8 PE' }], x: -0.1, y: 0.7 },
    { id: 'feiticeiro_metamorfose_4', name: 'Vigor Mutante', desc: '+15 Vida, +2 CON. O corpo se adapta e fortalece.', branch: 'metamorfose', cost: 1, tier: 2, requires: ['feiticeiro_metamorfose_2'], effects: [{ type: 'vida', value: 15 }, { type: 'attr', attr: 'CON', value: 2 }], x: 0.1, y: 0.7 },
    { id: 'feiticeiro_metamorfose_5', name: 'Forma Híbrida', desc: '+4 FOR, garras causam 2d8. Forma de combate parcial.', branch: 'metamorfose', cost: 2, tier: 3, requires: ['feiticeiro_metamorfose_3'], effects: [{ type: 'attr', attr: 'FOR', value: 4 }, { type: 'habilidade', nome: 'Garras', tipo: 'ativa', descricao: 'Garras causam 2d8+ModFOR dano. Ataque natural.', custoEnergia: '5 PE' }], x: -0.1, y: 0.5 },
    { id: 'feiticeiro_metamorfose_6', name: 'Armadura Natural', desc: '+1 CA, reduz todo dano recebido em 2. Pele reforçada.', branch: 'metamorfose', cost: 1, tier: 3, requires: ['feiticeiro_metamorfose_4'], effects: [{ type: 'ca', value: 1 }, { type: 'habilidade', nome: 'Redução de Dano', tipo: 'passiva', descricao: 'Reduz todo dano recebido em 2.' }], x: 0.1, y: 0.5 },
    { id: 'feiticeiro_metamorfose_7', name: 'Forma Completa', desc: 'FOR+8 em forma completa. Transformação total por 1 cena.', branch: 'metamorfose', cost: 2, tier: 4, requires: ['feiticeiro_metamorfose_5', 'feiticeiro_metamorfose_6'], effects: [{ type: 'habilidade', nome: 'Forma Completa', tipo: 'ativa', descricao: 'FOR+8 por 1 cena. Transformação total em forma bestial.', custoEnergia: '15 PE' }], x: -0.1, y: 0.3 },
    { id: 'feiticeiro_metamorfose_8', name: 'Regeneração Mutante', desc: '+30 Vida, regeneração 3 HP/turno permanentemente.', branch: 'metamorfose', cost: 2, tier: 4, requires: ['feiticeiro_metamorfose_5', 'feiticeiro_metamorfose_6'], effects: [{ type: 'vida', value: 30 }, { type: 'habilidade', nome: 'Regeneração Mutante', tipo: 'passiva', descricao: 'Regeneração 3 HP/turno permanentemente.' }], x: 0.1, y: 0.3 },

    { id: 'feiticeiro_caos_1', name: 'Instabilidade Arcana', desc: '+2 AM permanente. A magia do caos flui sem controle.', branch: 'caos', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'AM', value: 2 }], x: 0.4, y: 0.9 },
    { id: 'feiticeiro_caos_2', name: 'Sabedoria Oculta', desc: '+5 Ocultismo. Conhecimento de forças além da compreensão.', branch: 'caos', cost: 1, tier: 1, requires: [], effects: [{ type: 'pericia', pericia: 'Ocultismo', value: 5 }], x: 0.6, y: 0.9 },
    { id: 'feiticeiro_caos_3', name: 'Caos Menor', desc: '1d4 efeito aleatório: buff ou debuff em alvo. Imprevisível.', branch: 'caos', cost: 2, tier: 2, requires: ['feiticeiro_caos_1'], effects: [{ type: 'habilidade', nome: 'Caos Menor', tipo: 'ativa', descricao: '1d4 efeito aleatório: buff (+1d4 atributo) ou debuff (-1d4 atributo) em alvo.', custoEnergia: '6 PE' }], x: 0.4, y: 0.7 },
    { id: 'feiticeiro_caos_4', name: 'Fluxo Caótico', desc: '+10 Energia, Vantagem em testes de AM. Energia instável.', branch: 'caos', cost: 1, tier: 2, requires: ['feiticeiro_caos_2'], effects: [{ type: 'energia', value: 10 }, { type: 'pericia', pericia: 'AM', value: 0, especial: 'vantagem' }], x: 0.6, y: 0.7 },
    { id: 'feiticeiro_caos_5', name: 'Caos Maior', desc: '1d8 efeito aleatório poderoso. O caos se intensifica.', branch: 'caos', cost: 2, tier: 3, requires: ['feiticeiro_caos_3'], effects: [{ type: 'habilidade', nome: 'Caos Maior', tipo: 'ativa', descricao: '1d8 efeito aleatório poderoso: buff (+2d6 atributo), debuff (-2d6 atributo) ou efeito especial.', custoEnergia: '10 PE' }], x: 0.4, y: 0.5 },
    { id: 'feiticeiro_caos_6', name: 'Névoa do Caos', desc: '+3 AM, imune a adivinhação e previsão. Imprevisível.', branch: 'caos', cost: 1, tier: 3, requires: ['feiticeiro_caos_4'], effects: [{ type: 'attr', attr: 'AM', value: 3 }, { type: 'habilidade', nome: 'Imunidade a Adivinhação', tipo: 'passiva', descricao: 'Imune a magias de adivinhação e previsão.' }], x: 0.6, y: 0.5 },
    { id: 'feiticeiro_caos_7', name: 'Efeito Caótico', desc: '2d8 efeito caótico devastador. Caos supremo desencadeado.', branch: 'caos', cost: 2, tier: 4, requires: ['feiticeiro_caos_5', 'feiticeiro_caos_6'], effects: [{ type: 'habilidade', nome: 'Efeito Caótico', tipo: 'ativa', descricao: '2d8 efeito caótico devastador: dano, cura, buff ou debuff em área de 12m.', custoEnergia: '15 PE' }], x: 0.4, y: 0.3 },
    { id: 'feiticeiro_caos_8', name: 'Imprevisibilidade Total', desc: '+20 Vida, +10 Energia, totalmente imprevisível para inimigos.', branch: 'caos', cost: 2, tier: 4, requires: ['feiticeiro_caos_5', 'feiticeiro_caos_6'], effects: [{ type: 'vida', value: 20 }, { type: 'energia', value: 10 }, { type: 'habilidade', nome: 'Imprevisível', tipo: 'passiva', descricao: 'Inimigos têm desvantagem em ataques e magias contra você. Totalmente imprevisível.' }], x: 0.6, y: 0.3 },
  ],
  connections: [
    ['feiticeiro_linhagem_1', 'feiticeiro_linhagem_3'],
    ['feiticeiro_linhagem_1', 'feiticeiro_linhagem_4'],
    ['feiticeiro_linhagem_2', 'feiticeiro_linhagem_3'],
    ['feiticeiro_linhagem_2', 'feiticeiro_linhagem_4'],
    ['feiticeiro_linhagem_3', 'feiticeiro_linhagem_5'],
    ['feiticeiro_linhagem_3', 'feiticeiro_linhagem_6'],
    ['feiticeiro_linhagem_4', 'feiticeiro_linhagem_5'],
    ['feiticeiro_linhagem_4', 'feiticeiro_linhagem_6'],
    ['feiticeiro_linhagem_5', 'feiticeiro_linhagem_7'],
    ['feiticeiro_linhagem_5', 'feiticeiro_linhagem_8'],
    ['feiticeiro_linhagem_6', 'feiticeiro_linhagem_7'],
    ['feiticeiro_linhagem_6', 'feiticeiro_linhagem_8'],

    ['feiticeiro_metamorfose_1', 'feiticeiro_metamorfose_3'],
    ['feiticeiro_metamorfose_1', 'feiticeiro_metamorfose_4'],
    ['feiticeiro_metamorfose_2', 'feiticeiro_metamorfose_3'],
    ['feiticeiro_metamorfose_2', 'feiticeiro_metamorfose_4'],
    ['feiticeiro_metamorfose_3', 'feiticeiro_metamorfose_5'],
    ['feiticeiro_metamorfose_3', 'feiticeiro_metamorfose_6'],
    ['feiticeiro_metamorfose_4', 'feiticeiro_metamorfose_5'],
    ['feiticeiro_metamorfose_4', 'feiticeiro_metamorfose_6'],
    ['feiticeiro_metamorfose_5', 'feiticeiro_metamorfose_7'],
    ['feiticeiro_metamorfose_5', 'feiticeiro_metamorfose_8'],
    ['feiticeiro_metamorfose_6', 'feiticeiro_metamorfose_7'],
    ['feiticeiro_metamorfose_6', 'feiticeiro_metamorfose_8'],

    ['feiticeiro_caos_1', 'feiticeiro_caos_3'],
    ['feiticeiro_caos_1', 'feiticeiro_caos_4'],
    ['feiticeiro_caos_2', 'feiticeiro_caos_3'],
    ['feiticeiro_caos_2', 'feiticeiro_caos_4'],
    ['feiticeiro_caos_3', 'feiticeiro_caos_5'],
    ['feiticeiro_caos_3', 'feiticeiro_caos_6'],
    ['feiticeiro_caos_4', 'feiticeiro_caos_5'],
    ['feiticeiro_caos_4', 'feiticeiro_caos_6'],
    ['feiticeiro_caos_5', 'feiticeiro_caos_7'],
    ['feiticeiro_caos_5', 'feiticeiro_caos_8'],
    ['feiticeiro_caos_6', 'feiticeiro_caos_7'],
    ['feiticeiro_caos_6', 'feiticeiro_caos_8'],
  ],
},

LOBISOMEM: {
  id: 'LOBISOMEM',
  name: 'Lobisomem',
  branches: [
    { id: 'fera', name: 'Caminho da Fera', desc: 'Força bruta, garras e instinto predador', color: '#ef4444', icon: 'pets' },
    { id: 'matilha', name: 'Caminho da Matilha', desc: 'Liderança, aura de grupo e sinergia em equipe', color: '#3b82f6', icon: 'groups' },
    { id: 'instinto', name: 'Caminho do Instinto', desc: 'Sentidos aguçados, perícias e sobrevivência', color: '#22c55e', icon: 'visibility' },
  ],
  nodes: [
    { id: 'lobo_fera_1', name: 'Força Bestial', desc: '+2 FOR permanente. O lobo interior fortalece os músculos.', branch: 'fera', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'FOR', value: 2 }], x: -0.6, y: 0.9 },
    { id: 'lobo_fera_2', name: 'Garras Retráteis', desc: 'Garras naturais causam 2d8+FOR de dano.', branch: 'fera', cost: 1, tier: 1, requires: [], effects: [{ type: 'habilidade', nome: 'Garras Retráteis', tipo: 'ativa', descricao: 'Garras naturais causam 2d8+FOR de dano corpo-a-corpo.', custoEnergia: '3 PE' }], x: -0.4, y: 0.9 },
    { id: 'lobo_fera_3', name: 'Vitalidade Lupina', desc: '+15 Vida, +1d6 extra nas garras. Corpo resistente à transformação.', branch: 'fera', cost: 1, tier: 2, requires: ['lobo_fera_1'], effects: [{ type: 'vida', value: 15 }, { type: 'habilidade', nome: 'Garras Aprimoradas', tipo: 'passiva', descricao: 'Garras causam +1d6 de dano extra (total 2d8+1d6+FOR).' }], x: -0.65, y: 0.7 },
    { id: 'lobo_fera_4', name: 'Transformação Parcial', desc: '+3 FOR, +2 DES em forma parcial. Controle parcial da fera.', branch: 'fera', cost: 1, tier: 2, requires: ['lobo_fera_1', 'lobo_fera_2'], effects: [{ type: 'attr', attr: 'FOR', value: 3 }, { type: 'attr', attr: 'DES', value: 2 }, { type: 'habilidade', nome: 'Transformação Parcial', tipo: 'ativa', descricao: 'Ativa forma parcial: +3 FOR, +2 DES. Dura 1 cena.', custoEnergia: '8 PE' }], x: -0.45, y: 0.7 },
    { id: 'lobo_fera_5', name: 'Força Primordial', desc: '+3 FOR permanente. Garras causam 3d8+FOR.', branch: 'fera', cost: 1, tier: 3, requires: ['lobo_fera_3', 'lobo_fera_4'], effects: [{ type: 'attr', attr: 'FOR', value: 3 }, { type: 'habilidade', nome: 'Garras Primordiais', tipo: 'passiva', descricao: 'Garras evoluídas causam 3d8+FOR de dano.' }], x: -0.65, y: 0.5 },
    { id: 'lobo_fera_6', name: 'Fera Interior', desc: 'Garras causam 3d10+FOR. A fera assume o controle.', branch: 'fera', cost: 2, tier: 3, requires: ['lobo_fera_4'], effects: [{ type: 'habilidade', nome: 'Fera Interior', tipo: 'ativa', descricao: 'Garras devastadoras causam 3d10+FOR de dano. A fera assume o controle por 1 cena.', custoEnergia: '12 PE' }], x: -0.45, y: 0.5 },
    { id: 'lobo_fera_7', name: 'Forma Bestial', desc: 'FOR+10, garras 5d12. Transformação completa e aterradora.', branch: 'fera', cost: 2, tier: 4, requires: ['lobo_fera_5', 'lobo_fera_6'], effects: [{ type: 'habilidade', nome: 'Forma Bestial', tipo: 'ativa', descricao: 'FOR+10 em forma bestial. Garras causam 5d12+FOR. Dura 1 cena.', custoEnergia: '20 PE' }], x: -0.65, y: 0.3 },
    { id: 'lobo_fera_8', name: 'Constituição de Lobo', desc: '+40 Vida, regeneração 4×CON em combate.', branch: 'fera', cost: 2, tier: 4, requires: ['lobo_fera_5', 'lobo_fera_6'], effects: [{ type: 'vida', value: 40 }, { type: 'habilidade', nome: 'Regeneração Lupina', tipo: 'passiva', descricao: 'Regeneração 4×CON HP/turno em combate.' }], x: -0.45, y: 0.3 },

    { id: 'lobo_matilha_1', name: 'Resistência da Alcateia', desc: '+2 CON permanente. O vínculo com a matilha fortalece o corpo.', branch: 'matilha', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'CON', value: 2 }], x: -0.1, y: 0.9 },
    { id: 'lobo_matilha_2', name: 'Sobrevivência Natural', desc: '+3 Sobrevivência. Instintos de caça em grupo.', branch: 'matilha', cost: 1, tier: 1, requires: [], effects: [{ type: 'pericia', pericia: 'Sobrevivência', value: 3 }], x: 0.1, y: 0.9 },
    { id: 'lobo_matilha_3', name: 'Urro de Guerra', desc: '+2 para aliados lobisomem em 10m por 1 cena.', branch: 'matilha', cost: 1, tier: 2, requires: ['lobo_matilha_1'], effects: [{ type: 'habilidade', nome: 'Urro de Guerra', tipo: 'ativa', descricao: 'Urro concede +2 em todos os testes para aliados lobisomem em 10m. Dura 1 cena.', custoEnergia: '8 PE' }], x: -0.15, y: 0.7 },
    { id: 'lobo_matilha_4', name: 'Vínculo de Matilha', desc: '+15 Vida. Vantagem em testes com 2+ aliados próximos.', branch: 'matilha', cost: 1, tier: 2, requires: ['lobo_matilha_1', 'lobo_matilha_2'], effects: [{ type: 'vida', value: 15 }, { type: 'habilidade', nome: 'Vínculo de Matilha', tipo: 'passiva', descricao: 'Vantagem em todos os testes quando 2 ou mais aliados estão em 10m.' }], x: 0.05, y: 0.7 },
    { id: 'lobo_matilha_5', name: 'Sentido de Matilha', desc: 'Detecta aliados lobisomem em 500m. Conexão telepática simples.', branch: 'matilha', cost: 1, tier: 3, requires: ['lobo_matilha_3', 'lobo_matilha_4'], effects: [{ type: 'habilidade', nome: 'Sentido de Matilha', tipo: 'passiva', descricao: 'Detecta aliados lobisomem em 500m. Conexão telepática simples com a matilha.' }], x: -0.15, y: 0.5 },
    { id: 'lobo_matilha_6', name: 'Pele de Lobo', desc: '+2 CA, +2 Percepção. Sentidos e resistência da matilha.', branch: 'matilha', cost: 1, tier: 3, requires: ['lobo_matilha_4'], effects: [{ type: 'ca', value: 2 }, { type: 'pericia', pericia: 'Percepção', value: 2 }], x: 0.05, y: 0.5 },
    { id: 'lobo_matilha_7', name: 'Senhor da Alcateia', desc: 'Urro afeta +4 aliados lobisomem. Liderança absoluta.', branch: 'matilha', cost: 2, tier: 4, requires: ['lobo_matilha_5', 'lobo_matilha_6'], effects: [{ type: 'habilidade', nome: 'Senhor da Alcateia', tipo: 'ativa', descricao: 'Urro aprimorado concede +4 para aliados lobisomem em 15m. Dura 1 cena.', custoEnergia: '15 PE' }], x: -0.15, y: 0.3 },
    { id: 'lobo_matilha_8', name: 'Alcateia Eterna', desc: '+30 Vida, +3 FOR, +3 DES. Poder da matilha interiorizado.', branch: 'matilha', cost: 2, tier: 4, requires: ['lobo_matilha_5', 'lobo_matilha_6'], effects: [{ type: 'vida', value: 30 }, { type: 'attr', attr: 'FOR', value: 3 }, { type: 'attr', attr: 'DES', value: 3 }], x: 0.05, y: 0.3 },

    { id: 'lobo_instinto_1', name: 'Agilidade Predadora', desc: '+2 DES permanente. Reflexos de caçador nato.', branch: 'instinto', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'DES', value: 2 }], x: 0.4, y: 0.9 },
    { id: 'lobo_instinto_2', name: 'Sentidos Aguçados', desc: '+3 Percepção permanente. Olfato e audição sobre-humanos.', branch: 'instinto', cost: 1, tier: 1, requires: [], effects: [{ type: 'pericia', pericia: 'Percepção', value: 3 }], x: 0.6, y: 0.9 },
    { id: 'lobo_instinto_3', name: 'Sentido de Presa', desc: 'Rastreia presas em 2km. Faro sobrenatural ativado.', branch: 'instinto', cost: 1, tier: 2, requires: ['lobo_instinto_1'], effects: [{ type: 'habilidade', nome: 'Sentido de Presa', tipo: 'ativa', descricao: 'Rastreia presas específicas em 2km. Faro sobrenatural ativado.', custoEnergia: '5 PE' }], x: 0.35, y: 0.7 },
    { id: 'lobo_instinto_4', name: 'Instinto de Sobrevivência', desc: '+10 Vida, Vantagem em Iniciativa. Nunca é pego desprevenido.', branch: 'instinto', cost: 1, tier: 2, requires: ['lobo_instinto_1', 'lobo_instinto_2'], effects: [{ type: 'vida', value: 10 }, { type: 'habilidade', nome: 'Vantagem em Iniciativa', tipo: 'passiva', descricao: 'Vantagem permanente em testes de Iniciativa.' }], x: 0.55, y: 0.7 },
    { id: 'lobo_instinto_5', name: 'Mente de Predador', desc: 'Não pode ser surpreendido. Imune a medo. Predador supremo.', branch: 'instinto', cost: 2, tier: 3, requires: ['lobo_instinto_3', 'lobo_instinto_4'], effects: [{ type: 'habilidade', nome: 'Mente de Predador', tipo: 'passiva', descricao: 'Não pode ser surpreendido. Imune a efeitos de medo.' }], x: 0.35, y: 0.5 },
    { id: 'lobo_instinto_6', name: 'Reflexos Sobre-humanos', desc: '+3 DES, Vantagem em Sobrevivência. Corpo além dos limites.', branch: 'instinto', cost: 1, tier: 3, requires: ['lobo_instinto_4'], effects: [{ type: 'attr', attr: 'DES', value: 3 }, { type: 'habilidade', nome: 'Vantagem Sobrevivência', tipo: 'passiva', descricao: 'Vantagem permanente em testes de Sobrevivência.' }], x: 0.55, y: 0.5 },
    { id: 'lobo_instinto_7', name: 'Predador Apex', desc: 'Regeneração 4×CON em combate. Controle total na lua cheia.', branch: 'instinto', cost: 2, tier: 4, requires: ['lobo_instinto_5', 'lobo_instinto_6'], effects: [{ type: 'habilidade', nome: 'Predador Apex', tipo: 'passiva', descricao: 'Regeneração 4×CON HP/turno em combate. Controle total durante lua cheia.' }], x: 0.35, y: 0.3 },
    { id: 'lobo_instinto_8', name: 'Lobo Supremo', desc: '+3 FOR, +3 DES. Lua cheia concede controle total sobre a fera.', branch: 'instinto', cost: 2, tier: 4, requires: ['lobo_instinto_5', 'lobo_instinto_6'], effects: [{ type: 'attr', attr: 'FOR', value: 3 }, { type: 'attr', attr: 'DES', value: 3 }, { type: 'habilidade', nome: 'Controle Lunar', tipo: 'passiva', descricao: 'Lua cheia concede controle total sobre a fera. Sem penalidades de transformação.' }], x: 0.55, y: 0.3 },
  ],
  connections: [
    ['lobo_fera_1', 'lobo_fera_3'],
    ['lobo_fera_1', 'lobo_fera_4'],
    ['lobo_fera_2', 'lobo_fera_4'],
    ['lobo_fera_3', 'lobo_fera_5'],
    ['lobo_fera_4', 'lobo_fera_5'],
    ['lobo_fera_4', 'lobo_fera_6'],
    ['lobo_fera_5', 'lobo_fera_7'],
    ['lobo_fera_6', 'lobo_fera_7'],
    ['lobo_fera_5', 'lobo_fera_8'],
    ['lobo_fera_6', 'lobo_fera_8'],

    ['lobo_matilha_1', 'lobo_matilha_3'],
    ['lobo_matilha_1', 'lobo_matilha_4'],
    ['lobo_matilha_2', 'lobo_matilha_4'],
    ['lobo_matilha_3', 'lobo_matilha_5'],
    ['lobo_matilha_4', 'lobo_matilha_5'],
    ['lobo_matilha_4', 'lobo_matilha_6'],
    ['lobo_matilha_5', 'lobo_matilha_7'],
    ['lobo_matilha_6', 'lobo_matilha_7'],
    ['lobo_matilha_5', 'lobo_matilha_8'],
    ['lobo_matilha_6', 'lobo_matilha_8'],

    ['lobo_instinto_1', 'lobo_instinto_3'],
    ['lobo_instinto_1', 'lobo_instinto_4'],
    ['lobo_instinto_2', 'lobo_instinto_4'],
    ['lobo_instinto_3', 'lobo_instinto_5'],
    ['lobo_instinto_4', 'lobo_instinto_5'],
    ['lobo_instinto_4', 'lobo_instinto_6'],
    ['lobo_instinto_5', 'lobo_instinto_7'],
    ['lobo_instinto_6', 'lobo_instinto_7'],
    ['lobo_instinto_5', 'lobo_instinto_8'],
    ['lobo_instinto_6', 'lobo_instinto_8'],

    ['lobo_fera_4', 'lobo_matilha_4'],
    ['lobo_matilha_4', 'lobo_instinto_4'],
    ['lobo_fera_6', 'lobo_instinto_6'],
  ],
},

DEMONIO: {
  id: 'DEMONIO',
  name: 'Demônio',
  branches: [
    { id: 'abismo', name: 'Caminho do Abismo', desc: 'Destruição, poder bruto e aniquilação', color: '#ef4444', icon: 'whatshot' },
    { id: 'corrupcao', name: 'Caminho da Corrupção', desc: 'Controle, dominação e subversão', color: '#a855f7', icon: 'psychology' },
    { id: 'inferno', name: 'Caminho do Inferno', desc: 'Fogo, magia infernal e destruição elemental', color: '#f97316', icon: 'local_fire_department' },
  ],
  nodes: [
    { id: 'demonio_abismo_1', name: 'Poder do Abismo', desc: '+2 FOR permanente. O abismo fortalece o corpo infernal.', branch: 'abismo', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'FOR', value: 2 }], x: -0.6, y: 0.9 },
    { id: 'demonio_abismo_2', name: 'Garras Infernais', desc: 'Garras demoníacas causam 2d8+FOR de dano.', branch: 'abismo', cost: 1, tier: 1, requires: [], effects: [{ type: 'habilidade', nome: 'Garras Infernais', tipo: 'ativa', descricao: 'Garras demoníacas causam 2d8+FOR de dano corpo-a-corpo.', custoEnergia: '3 PE' }], x: -0.4, y: 0.9 },
    { id: 'demonio_abismo_3', name: 'Carapaça Demoníaca', desc: '+15 Vida, +1d6 extra nas garras. Corpo infernal resistente.', branch: 'abismo', cost: 1, tier: 2, requires: ['demonio_abismo_1'], effects: [{ type: 'vida', value: 15 }, { type: 'habilidade', nome: 'Garras Aprimoradas', tipo: 'passiva', descricao: 'Garras causam +1d6 de dano extra (total 2d8+1d6+FOR).' }], x: -0.65, y: 0.7 },
    { id: 'demonio_abismo_4', name: 'Aura Amaldiçoada', desc: 'Aura de 5m: inimigos recebem -2 em testes.', branch: 'abismo', cost: 1, tier: 2, requires: ['demonio_abismo_1', 'demonio_abismo_2'], effects: [{ type: 'habilidade', nome: 'Aura Amaldiçoada', tipo: 'passiva', descricao: 'Inimigos em 5m recebem -2 em todos os testes.' }], x: -0.45, y: 0.7 },
    { id: 'demonio_abismo_5', name: 'Força Demoníaca', desc: '+3 FOR, +2 Intimidação. O poder do abismo flui.', branch: 'abismo', cost: 1, tier: 3, requires: ['demonio_abismo_3', 'demonio_abismo_4'], effects: [{ type: 'attr', attr: 'FOR', value: 3 }, { type: 'pericia', pericia: 'Intimidação', value: 2 }], x: -0.65, y: 0.5 },
    { id: 'demonio_abismo_6', name: 'Garras Necróticas', desc: 'Garras 3d8+FOR +1d6 necrótico. Toque do abismo.', branch: 'abismo', cost: 2, tier: 3, requires: ['demonio_abismo_4'], effects: [{ type: 'habilidade', nome: 'Garras Necróticas', tipo: 'ativa', descricao: 'Garras causam 3d8+FOR +1d6 de dano necrótico. Drena vida.', custoEnergia: '10 PE' }], x: -0.45, y: 0.5 },
    { id: 'demonio_abismo_7', name: 'Forma Infernal', desc: 'FOR+8 em forma demoníaca. A verdadeira forma do abismo.', branch: 'abismo', cost: 2, tier: 4, requires: ['demonio_abismo_5', 'demonio_abismo_6'], effects: [{ type: 'habilidade', nome: 'Forma Infernal', tipo: 'ativa', descricao: 'FOR+8 em forma demoníaca completa. Dura 1 cena.', custoEnergia: '20 PE' }], x: -0.65, y: 0.3 },
    { id: 'demonio_abismo_8', name: 'Constituição Infernal', desc: '+40 Vida, garras 4d10+FOR. Corpo do abismo realizado.', branch: 'abismo', cost: 2, tier: 4, requires: ['demonio_abismo_5', 'demonio_abismo_6'], effects: [{ type: 'vida', value: 40 }, { type: 'habilidade', nome: 'Garras do Abismo', tipo: 'passiva', descricao: 'Garras evoluídas causam 4d10+FOR de dano permanente.' }], x: -0.45, y: 0.3 },

    { id: 'demonio_corrupcao_1', name: 'Aura Mágica Infernal', desc: '+2 AM permanente. Energia demoníaca flui naturalmente.', branch: 'corrupcao', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'AM', value: 2 }], x: -0.1, y: 0.9 },
    { id: 'demonio_corrupcao_2', name: 'Presença Dominadora', desc: '+3 Intimidação. A simples presença causa temor.', branch: 'corrupcao', cost: 1, tier: 1, requires: [], effects: [{ type: 'pericia', pericia: 'Intimidação', value: 3 }], x: 0.1, y: 0.9 },
    { id: 'demonio_corrupcao_3', name: 'Dominação Menor', desc: 'Alvo obedece 1 comando. CD 18+AM resiste.', branch: 'corrupcao', cost: 1, tier: 2, requires: ['demonio_corrupcao_1'], effects: [{ type: 'habilidade', nome: 'Dominação Menor', tipo: 'ativa', descricao: 'Alvo obedece 1 comando simples. CD 18+AM resiste. Dura 1 rodada.', custoEnergia: '10 PE' }], x: -0.15, y: 0.7 },
    { id: 'demonio_corrupcao_4', name: 'Aura de Dominação', desc: '+10 Energia, aura de controle em 10m.', branch: 'corrupcao', cost: 1, tier: 2, requires: ['demonio_corrupcao_1', 'demonio_corrupcao_2'], effects: [{ type: 'energia', value: 10 }, { type: 'habilidade', nome: 'Aura de Dominação', tipo: 'passiva', descricao: 'Aura de controle em 10m. Inimigos sentem a pressão infernal.' }], x: 0.05, y: 0.7 },
    { id: 'demonio_corrupcao_5', name: 'Controle Mental', desc: 'Dominação afeta 3 alvos simultaneamente. Poder demoníaco supremo.', branch: 'corrupcao', cost: 2, tier: 3, requires: ['demonio_corrupcao_3', 'demonio_corrupcao_4'], effects: [{ type: 'habilidade', nome: 'Controle Mental', tipo: 'ativa', descricao: 'Dominação afeta até 3 alvos simultaneamente. CD 20+AM resiste. Dura 1 cena.', custoEnergia: '15 PE' }], x: -0.15, y: 0.5 },
    { id: 'demonio_corrupcao_6', name: 'Aura Corruptora', desc: '+3 AM. Inimigos em 15m recebem -3 em testes.', branch: 'corrupcao', cost: 1, tier: 3, requires: ['demonio_corrupcao_4'], effects: [{ type: 'attr', attr: 'AM', value: 3 }, { type: 'habilidade', nome: 'Aura Corruptora', tipo: 'passiva', descricao: 'Inimigos em 15m recebem -3 em todos os testes.' }], x: 0.05, y: 0.5 },
    { id: 'demonio_corrupcao_7', name: 'Aura de Terror', desc: 'Inimigos em 20m recebem -5 em testes. Pavor absoluto.', branch: 'corrupcao', cost: 2, tier: 4, requires: ['demonio_corrupcao_5', 'demonio_corrupcao_6'], effects: [{ type: 'habilidade', nome: 'Aura de Terror', tipo: 'passiva', descricao: 'Inimigos em 20m recebem -5 em todos os testes. Pavor absoluto.' }], x: -0.15, y: 0.3 },
    { id: 'demonio_corrupcao_8', name: 'Senhor dos Demônios', desc: '+30 Vida, +4 AM. Domina até 5 criaturas simultaneamente.', branch: 'corrupcao', cost: 2, tier: 4, requires: ['demonio_corrupcao_5', 'demonio_corrupcao_6'], effects: [{ type: 'vida', value: 30 }, { type: 'attr', attr: 'AM', value: 4 }, { type: 'habilidade', nome: 'Dominação Absoluta', tipo: 'ativa', descricao: 'Domina até 5 criaturas simultaneamente. Controle total.', custoEnergia: '25 PE' }], x: 0.05, y: 0.3 },

    { id: 'demonio_inferno_1', name: 'Magia Infernal', desc: '+2 AM permanente. Fogo infernal responde ao comando.', branch: 'inferno', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'AM', value: 2 }], x: 0.4, y: 0.9 },
    { id: 'demonio_inferno_2', name: 'Pele de Brasas', desc: 'Resistência a fogo 50%. O corpo demoníaco é feito de chamas.', branch: 'inferno', cost: 1, tier: 1, requires: [], effects: [{ type: 'habilidade', nome: 'Resistência ao Fogo', tipo: 'passiva', descricao: 'Resistência a dano de fogo 50%. Reduz metade do dano flamejante.' }], x: 0.6, y: 0.9 },
    { id: 'demonio_inferno_3', name: 'Magia de Fogo', desc: '+10 Energia, magias de fogo causam +1d6 extra.', branch: 'inferno', cost: 1, tier: 2, requires: ['demonio_inferno_1'], effects: [{ type: 'energia', value: 10 }, { type: 'habilidade', nome: 'Magia Flamejante', tipo: 'passiva', descricao: 'Magias de fogo causam +1d6 de dano extra.' }], x: 0.35, y: 0.7 },
    { id: 'demonio_inferno_4', name: 'Rajada Infernal', desc: 'Rajada de fogo causa 3d6+AM de dano em cone 9m.', branch: 'inferno', cost: 1, tier: 2, requires: ['demonio_inferno_1', 'demonio_inferno_2'], effects: [{ type: 'habilidade', nome: 'Rajada Infernal', tipo: 'ativa', descricao: 'Rajada de fogo infernal causa 3d6+AM em cone de 9m.', custoEnergia: '8 PE' }], x: 0.55, y: 0.7 },
    { id: 'demonio_inferno_5', name: 'Elemento Gêmeo', desc: 'Resistência 50% a segundo elemento elemental. Versatilidade infernal.', branch: 'inferno', cost: 1, tier: 3, requires: ['demonio_inferno_3', 'demonio_inferno_4'], effects: [{ type: 'habilidade', nome: 'Elemento Gêmeo', tipo: 'passiva', descricao: 'Resistência 50% a um segundo elemento à escolha.' }], x: 0.35, y: 0.5 },
    { id: 'demonio_inferno_6', name: 'Forno Infernal', desc: '+3 AM, magias de fogo causam +2d6 extra. Fogo purificado.', branch: 'inferno', cost: 2, tier: 3, requires: ['demonio_inferno_4'], effects: [{ type: 'attr', attr: 'AM', value: 3 }, { type: 'habilidade', nome: 'Forno Infernal', tipo: 'passiva', descricao: 'Magias de fogo causam +2d6 de dano extra (total +3d6).' }], x: 0.55, y: 0.5 },
    { id: 'demonio_inferno_7', name: 'Portal Infernal', desc: 'Invoca 2d4 demônios menores. Portão para o abismo.', branch: 'inferno', cost: 2, tier: 4, requires: ['demonio_inferno_5', 'demonio_inferno_6'], effects: [{ type: 'habilidade', nome: 'Portal Infernal', tipo: 'ativa', descricao: 'Abre portal e invoca 2d4 demônios menores. Duram 1 cena.', custoEnergia: '20 PE' }], x: 0.35, y: 0.3 },
    { id: 'demonio_inferno_8', name: 'Mestre do Fogo', desc: '+40 Vida, +3 AM. Imune ao próprio elemento. Senhor das chamas.', branch: 'inferno', cost: 2, tier: 4, requires: ['demonio_inferno_5', 'demonio_inferno_6'], effects: [{ type: 'vida', value: 40 }, { type: 'attr', attr: 'AM', value: 3 }, { type: 'habilidade', nome: 'Imunidade Elemental', tipo: 'passiva', descricao: 'Imune ao dano do próprio elemento. Senhor das chamas.' }], x: 0.55, y: 0.3 },
  ],
  connections: [
    ['demonio_abismo_1', 'demonio_abismo_3'],
    ['demonio_abismo_1', 'demonio_abismo_4'],
    ['demonio_abismo_2', 'demonio_abismo_4'],
    ['demonio_abismo_3', 'demonio_abismo_5'],
    ['demonio_abismo_4', 'demonio_abismo_5'],
    ['demonio_abismo_4', 'demonio_abismo_6'],
    ['demonio_abismo_5', 'demonio_abismo_7'],
    ['demonio_abismo_6', 'demonio_abismo_7'],
    ['demonio_abismo_5', 'demonio_abismo_8'],
    ['demonio_abismo_6', 'demonio_abismo_8'],

    ['demonio_corrupcao_1', 'demonio_corrupcao_3'],
    ['demonio_corrupcao_1', 'demonio_corrupcao_4'],
    ['demonio_corrupcao_2', 'demonio_corrupcao_4'],
    ['demonio_corrupcao_3', 'demonio_corrupcao_5'],
    ['demonio_corrupcao_4', 'demonio_corrupcao_5'],
    ['demonio_corrupcao_4', 'demonio_corrupcao_6'],
    ['demonio_corrupcao_5', 'demonio_corrupcao_7'],
    ['demonio_corrupcao_6', 'demonio_corrupcao_7'],
    ['demonio_corrupcao_5', 'demonio_corrupcao_8'],
    ['demonio_corrupcao_6', 'demonio_corrupcao_8'],

    ['demonio_inferno_1', 'demonio_inferno_3'],
    ['demonio_inferno_1', 'demonio_inferno_4'],
    ['demonio_inferno_2', 'demonio_inferno_4'],
    ['demonio_inferno_3', 'demonio_inferno_5'],
    ['demonio_inferno_4', 'demonio_inferno_5'],
    ['demonio_inferno_4', 'demonio_inferno_6'],
    ['demonio_inferno_5', 'demonio_inferno_7'],
    ['demonio_inferno_6', 'demonio_inferno_7'],
    ['demonio_inferno_5', 'demonio_inferno_8'],
    ['demonio_inferno_6', 'demonio_inferno_8'],

    ['demonio_abismo_4', 'demonio_corrupcao_4'],
    ['demonio_corrupcao_4', 'demonio_inferno_4'],
    ['demonio_abismo_6', 'demonio_inferno_6'],
  ],
},

DASARIANO: {
  id: 'DASARIANO',
  name: 'Dasariano',
  branches: [
    { id: 'combate', name: 'Caminho do Combate', desc: 'Forma híbrida, agressividade e poder ofensivo', color: '#ef4444', icon: 'flash_on' },
    { id: 'estavel', name: 'Caminho da Estabilidade', desc: 'Equilíbrio, controle e harmonia entre formas', color: '#3b82f6', icon: 'balance' },
    { id: 'selvagem', name: 'Caminho Selvagem', desc: 'Instinto predador, sentidos e forma bestial', color: '#22c55e', icon: 'pets' },
  ],
  nodes: [
    { id: 'dasa_combate_1', name: 'Força Mutável', desc: '+2 FOR permanente. A forma de combate fortalece os músculos.', branch: 'combate', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'FOR', value: 2 }], x: -0.6, y: 0.9 },
    { id: 'dasa_combate_2', name: 'Garras de Combate', desc: 'Garras naturais causam 2d8+FOR de dano em forma de combate.', branch: 'combate', cost: 1, tier: 1, requires: [], effects: [{ type: 'habilidade', nome: 'Garras de Combate', tipo: 'ativa', descricao: 'Garras naturais causam 2d8+FOR de dano corpo-a-corpo.', custoEnergia: '3 PE' }], x: -0.4, y: 0.9 },
    { id: 'dasa_combate_3', name: 'Forma Resistente', desc: '+15 Vida, +1 CA em forma de combate. Corpo adaptado ao combate.', branch: 'combate', cost: 1, tier: 2, requires: ['dasa_combate_1'], effects: [{ type: 'vida', value: 15 }, { type: 'habilidade', nome: 'CA em Forma', tipo: 'passiva', descricao: '+1 CA enquanto estiver em forma de combate.' }], x: -0.65, y: 0.7 },
    { id: 'dasa_combate_4', name: 'Forma Híbrida', desc: '+3 FOR, +2 DES em forma híbrida. Fusão de formas.', branch: 'combate', cost: 1, tier: 2, requires: ['dasa_combate_1', 'dasa_combate_2'], effects: [{ type: 'attr', attr: 'FOR', value: 3 }, { type: 'attr', attr: 'DES', value: 2 }, { type: 'habilidade', nome: 'Forma Híbrida', tipo: 'ativa', descricao: 'Ativa forma híbrida: +3 FOR, +2 DES. Dura 1 cena.', custoEnergia: '8 PE' }], x: -0.45, y: 0.7 },
    { id: 'dasa_combate_5', name: 'Garras Evoluídas', desc: '+3 FOR, garras causam 3d8+FOR. Forma de combate aprimorada.', branch: 'combate', cost: 1, tier: 3, requires: ['dasa_combate_3', 'dasa_combate_4'], effects: [{ type: 'attr', attr: 'FOR', value: 3 }, { type: 'habilidade', nome: 'Garras Evoluídas', tipo: 'passiva', descricao: 'Garras evoluídas causam 3d8+FOR de dano permanente.' }], x: -0.65, y: 0.5 },
    { id: 'dasa_combate_6', name: 'Forma Primordial', desc: '+6 FOR, +3 DES em forma primordial. Transformação máxima.', branch: 'combate', cost: 2, tier: 3, requires: ['dasa_combate_4'], effects: [{ type: 'attr', attr: 'FOR', value: 6 }, { type: 'attr', attr: 'DES', value: 3 }, { type: 'habilidade', nome: 'Forma Primordial', tipo: 'ativa', descricao: 'Ativa forma primordial: +6 FOR, +3 DES. Dura 1 cena.', custoEnergia: '15 PE' }], x: -0.45, y: 0.5 },
    { id: 'dasa_combate_7', name: 'Garras Supremas', desc: 'Garras causam 5d10+FOR. O auge da forma de combate.', branch: 'combate', cost: 2, tier: 4, requires: ['dasa_combate_5', 'dasa_combate_6'], effects: [{ type: 'habilidade', nome: 'Garras Supremas', tipo: 'ativa', descricao: 'Garras supremas causam 5d10+FOR de dano devastador.', custoEnergia: '10 PE' }], x: -0.65, y: 0.3 },
    { id: 'dasa_combate_8', name: 'Forma Permanente', desc: '+40 Vida, +3 FOR/DES permanente. A forma de combate se fixa.', branch: 'combate', cost: 2, tier: 4, requires: ['dasa_combate_5', 'dasa_combate_6'], effects: [{ type: 'vida', value: 40 }, { type: 'attr', attr: 'FOR', value: 3 }, { type: 'attr', attr: 'DES', value: 3 }], x: -0.45, y: 0.3 },

    { id: 'dasa_estavel_1', name: 'Constituição de Forma', desc: '+2 CON permanente. O corpo se adapta e resiste.', branch: 'estavel', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'CON', value: 2 }], x: -0.1, y: 0.9 },
    { id: 'dasa_estavel_2', name: 'Adaptação Natural', desc: '+3 Sobrevivência. Instinto de adaptação ao ambiente.', branch: 'estavel', cost: 1, tier: 1, requires: [], effects: [{ type: 'pericia', pericia: 'Sobrevivência', value: 3 }], x: 0.1, y: 0.9 },
    { id: 'dasa_estabel_3', name: 'Forma Estável', desc: '+15 Vida, +1 CA. O corpo se estabiliza na forma atual.', branch: 'estavel', cost: 1, tier: 2, requires: ['dasa_estavel_1'], effects: [{ type: 'vida', value: 15 }, { type: 'ca', value: 1 }], x: -0.15, y: 0.7 },
    { id: 'dasa_estabel_4', name: 'Mudança de Forma', desc: 'Mudança de forma como ação bônus. Versatilidade de metamorfo.', branch: 'estavel', cost: 1, tier: 2, requires: ['dasa_estavel_1', 'dasa_estavel_2'], effects: [{ type: 'habilidade', nome: 'Mudança de Forma', tipo: 'ativa', descricao: 'Mudança de forma como ação bônus em vez de ação padrão.', custoEnergia: '3 PE' }], x: 0.05, y: 0.7 },
    { id: 'dasa_estabel_5', name: 'Regeneração de Forma', desc: 'Regeneração 2×CON HP/turno. O corpo se recompõe.', branch: 'estavel', cost: 1, tier: 3, requires: ['dasa_estabel_3', 'dasa_estabel_4'], effects: [{ type: 'habilidade', nome: 'Regeneração de Forma', tipo: 'passiva', descricao: 'Regeneração 2×CON HP/turno em combate.' }], x: -0.15, y: 0.5 },
    { id: 'dasa_estabel_6', name: 'Híbrida Aprimorada', desc: '+2 em todos os atributos em forma Híbrida. Equilíbrio perfeito.', branch: 'estavel', cost: 1, tier: 3, requires: ['dasa_estabel_4'], effects: [{ type: 'habilidade', nome: 'Híbrida Aprimorada', tipo: 'passiva', descricao: '+2 em todos os atributos enquanto em forma Híbrida.' }], x: 0.05, y: 0.5 },
    { id: 'dasa_estabel_7', name: 'Forma Perfeita', desc: '+5 FOR, +3 DES, +2 CON em forma perfeita. A forma ideal.', branch: 'estavel', cost: 2, tier: 4, requires: ['dasa_estabel_5', 'dasa_estabel_6'], effects: [{ type: 'attr', attr: 'FOR', value: 5 }, { type: 'attr', attr: 'DES', value: 3 }, { type: 'attr', attr: 'CON', value: 2 }, { type: 'habilidade', nome: 'Forma Perfeita', tipo: 'ativa', descricao: 'Ativa forma perfeita: +5 FOR, +3 DES, +2 CON. Dura 1 cena.', custoEnergia: '18 PE' }], x: -0.15, y: 0.3 },
    { id: 'dasa_estabel_8', name: 'Mente Intacta', desc: '+30 Vida. Sem penalidade de INT em qualquer forma.', branch: 'estavel', cost: 2, tier: 4, requires: ['dasa_estabel_5', 'dasa_estabel_6'], effects: [{ type: 'vida', value: 30 }, { type: 'habilidade', nome: 'Mente Intacta', tipo: 'passiva', descricao: 'Sem penalidade de INT em qualquer forma. Controle total.' }], x: 0.05, y: 0.3 },

    { id: 'dasa_selvagem_1', name: 'Agilidade Predadora', desc: '+2 DES permanente. Reflexos da forma selvagem.', branch: 'selvagem', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'DES', value: 2 }], x: 0.4, y: 0.9 },
    { id: 'dasa_selvagem_2', name: 'Sentidos de Caça', desc: '+3 Percepção permanente. Sentidos aguçados da forma selvagem.', branch: 'selvagem', cost: 1, tier: 1, requires: [], effects: [{ type: 'pericia', pericia: 'Percepção', value: 3 }], x: 0.6, y: 0.9 },
    { id: 'dasa_selvagem_3', name: 'Instinto Predador', desc: 'Detecta presas em 60m. Faro e audição sobre-humanos.', branch: 'selvagem', cost: 1, tier: 2, requires: ['dasa_selvagem_1'], effects: [{ type: 'habilidade', nome: 'Instinto Predador', tipo: 'ativa', descricao: 'Detecta presas e ameaças em 60m. Faro sobre-humano.', custoEnergia: '5 PE' }], x: 0.35, y: 0.7 },
    { id: 'dasa_selvagem_4', name: 'Sobrevivência Selvagem', desc: '+10 Vida, Vantagem em Sobrevivência. Adaptação extrema.', branch: 'selvagem', cost: 1, tier: 2, requires: ['dasa_selvagem_1', 'dasa_selvagem_2'], effects: [{ type: 'vida', value: 10 }, { type: 'habilidade', nome: 'Vantagem Sobrevivência', tipo: 'passiva', descricao: 'Vantagem permanente em testes de Sobrevivência.' }], x: 0.55, y: 0.7 },
    { id: 'dasa_selvagem_5', name: 'Não Surpreendido', desc: 'Não pode ser surpreendido em nenhuma forma. Instinto supremo.', branch: 'selvagem', cost: 2, tier: 3, requires: ['dasa_selvagem_3', 'dasa_selvagem_4'], effects: [{ type: 'habilidade', nome: 'Instinto Absoluto', tipo: 'passiva', descricao: 'Não pode ser surpreendido em nenhuma forma.' }], x: 0.35, y: 0.5 },
    { id: 'dasa_selvagem_6', name: 'Reflexos Selvagens', desc: '+3 DES, Vantagem em Iniciativa. Predador ágil.', branch: 'selvagem', cost: 1, tier: 3, requires: ['dasa_selvagem_4'], effects: [{ type: 'attr', attr: 'DES', value: 3 }, { type: 'habilidade', nome: 'Vantagem Iniciativa', tipo: 'passiva', descricao: 'Vantagem permanente em testes de Iniciativa.' }], x: 0.55, y: 0.5 },
    { id: 'dasa_selvagem_7', name: 'Forma Genesis', desc: '+8 FOR, +5 DES, +4 CON em forma genesis. Transformação final.', branch: 'selvagem', cost: 2, tier: 4, requires: ['dasa_selvagem_5', 'dasa_selvagem_6'], effects: [{ type: 'attr', attr: 'FOR', value: 8 }, { type: 'attr', attr: 'DES', value: 5 }, { type: 'attr', attr: 'CON', value: 4 }, { type: 'habilidade', nome: 'Forma Genesis', tipo: 'ativa', descricao: 'Ativa forma genesis: +8 FOR, +5 DES, +4 CON. Dura 1 cena.', custoEnergia: '25 PE' }], x: 0.35, y: 0.3 },
    { id: 'dasa_selvagem_8', name: 'Predador Supremo', desc: '+30 Vida, regen 3×CON, voo 18m. Forma selvagem definitiva.', branch: 'selvagem', cost: 2, tier: 4, requires: ['dasa_selvagem_5', 'dasa_selvagem_6'], effects: [{ type: 'vida', value: 30 }, { type: 'habilidade', nome: 'Regeneração Selvagem', tipo: 'passiva', descricao: 'Regeneração 3×CON HP/turno em combate.' }, { type: 'habilidade', nome: 'Voo Selvagem', tipo: 'passiva', descricao: 'Voo 18m/turno em forma selvagem.' }], x: 0.55, y: 0.3 },
  ],
  connections: [
    ['dasa_combate_1', 'dasa_combate_3'],
    ['dasa_combate_1', 'dasa_combate_4'],
    ['dasa_combate_2', 'dasa_combate_4'],
    ['dasa_combate_3', 'dasa_combate_5'],
    ['dasa_combate_4', 'dasa_combate_5'],
    ['dasa_combate_4', 'dasa_combate_6'],
    ['dasa_combate_5', 'dasa_combate_7'],
    ['dasa_combate_6', 'dasa_combate_7'],
    ['dasa_combate_5', 'dasa_combate_8'],
    ['dasa_combate_6', 'dasa_combate_8'],

    ['dasa_estavel_1', 'dasa_estabel_3'],
    ['dasa_estavel_1', 'dasa_estabel_4'],
    ['dasa_estavel_2', 'dasa_estabel_4'],
    ['dasa_estabel_3', 'dasa_estabel_5'],
    ['dasa_estabel_4', 'dasa_estabel_5'],
    ['dasa_estabel_4', 'dasa_estabel_6'],
    ['dasa_estabel_5', 'dasa_estabel_7'],
    ['dasa_estabel_6', 'dasa_estabel_7'],
    ['dasa_estabel_5', 'dasa_estabel_8'],
    ['dasa_estabel_6', 'dasa_estabel_8'],

    ['dasa_selvagem_1', 'dasa_selvagem_3'],
    ['dasa_selvagem_1', 'dasa_selvagem_4'],
    ['dasa_selvagem_2', 'dasa_selvagem_4'],
    ['dasa_selvagem_3', 'dasa_selvagem_5'],
    ['dasa_selvagem_4', 'dasa_selvagem_5'],
    ['dasa_selvagem_4', 'dasa_selvagem_6'],
    ['dasa_selvagem_5', 'dasa_selvagem_7'],
    ['dasa_selvagem_6', 'dasa_selvagem_7'],
    ['dasa_selvagem_5', 'dasa_selvagem_8'],
    ['dasa_selvagem_6', 'dasa_selvagem_8'],

    ['dasa_combate_4', 'dasa_estabel_4'],
    ['dasa_estabel_4', 'dasa_selvagem_4'],
    ['dasa_combate_6', 'dasa_selvagem_6'],
  ],
},

FINGER: {
  id: 'FINGER',
  name: 'Finger',
  branches: [
    { id: 'sabedoria', name: 'Caminho da Sabedoria', desc: 'Conhecimento, percepção e compreensão arcana', color: '#06b6d4', icon: 'menu_book' },
    { id: 'harmonia', name: 'Caminho da Harmonia', desc: 'Equilíbrio com portador, sinergia e cooperação', color: '#22c55e', icon: 'handshake' },
    { id: 'ascensao', name: 'Caminho da Ascensão', desc: 'Poder interior, dominação e independência', color: '#f59e0b', icon: 'trending_up' },
  ],
  nodes: [
    { id: 'finger_sab_1', name: 'Conhecimento Arcano', desc: '+2 INT permanente. Compreensão inata da magia em armas.', branch: 'sabedoria', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'INT', value: 2 }], x: -0.6, y: 0.85 },
    { id: 'finger_sab_2', name: 'Percepção Mágica', desc: '+3 Percepção Mágica. Detecta encantamentos com facilidade.', branch: 'sabedoria', cost: 1, tier: 1, requires: [], effects: [{ type: 'pericia', pericia: 'Percepção Mágica', value: 3 }], x: -0.4, y: 0.85 },
    { id: 'finger_sab_3', name: 'Identificar Magia', desc: 'Identifica magia em armas automaticamente ao toque.', branch: 'sabedoria', cost: 1, tier: 2, requires: ['finger_sab_1'], effects: [{ type: 'habilidade', nome: 'Identificar Magia', tipo: 'passiva', descricao: 'Identifica magia em armas automaticamente ao toque.' }], x: -0.6, y: 0.65 },
    { id: 'finger_sab_4', name: 'Energia Arcana', desc: '+10 Energia. Vantagem em Investigação de itens mágicos.', branch: 'sabedoria', cost: 1, tier: 2, requires: ['finger_sab_1', 'finger_sab_2'], effects: [{ type: 'energia', value: 10 }, { type: 'pericia', pericia: 'Investigação', value: 0, especial: 'vantagem' }], x: -0.4, y: 0.65 },
    { id: 'finger_sab_5', name: 'Absorção', desc: 'Copia 2 habilidades de armas tocadas permanentemente.', branch: 'sabedoria', cost: 2, tier: 3, requires: ['finger_sab_3', 'finger_sab_4'], effects: [{ type: 'habilidade', nome: 'Absorção', tipo: 'ativa', descricao: 'Copia 2 habilidades de armas tocadas. Permanente até trocar.', custoEnergia: '2 PE' }], x: -0.6, y: 0.45 },
    { id: 'finger_sab_6', name: 'Sabedoria Profunda', desc: '+3 INT, +3 Perícia arcana.', branch: 'sabedoria', cost: 1, tier: 3, requires: ['finger_sab_4'], effects: [{ type: 'attr', attr: 'INT', value: 3 }, { type: 'pericia', pericia: 'Arcana', value: 3 }], x: -0.4, y: 0.45 },
    { id: 'finger_sab_7', name: 'Absorção Suprema', desc: 'Copia 5 habilidades permanentemente de armas tocadas.', branch: 'sabedoria', cost: 2, tier: 4, requires: ['finger_sab_5'], effects: [{ type: 'habilidade', nome: 'Absorção Suprema', tipo: 'ativa', descricao: 'Copia 5 habilidades permanentemente de armas tocadas.', custoEnergia: '2 PE' }], x: -0.6, y: 0.25 },
    { id: 'finger_sab_8', name: 'Mestre do Conhecimento', desc: '+20 Vida, +3 AM. Identifica o criador de qualquer magia.', branch: 'sabedoria', cost: 2, tier: 4, requires: ['finger_sab_5', 'finger_sab_6'], effects: [{ type: 'vida', value: 20 }, { type: 'attr', attr: 'AM', value: 3 }, { type: 'habilidade', nome: 'Identificar Criador', tipo: 'passiva', descricao: 'Identifica o criador de qualquer magia ao toque.' }], x: -0.4, y: 0.25 },

    { id: 'finger_har_1', name: 'Aura Magica', desc: '+2 AM permanente. Conexão espiritual com o portador.', branch: 'harmonia', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'AM', value: 2 }], x: -0.1, y: 0.85 },
    { id: 'finger_har_2', name: 'Vitalidade Compartilhada', desc: '+15 Vida permanente. Energia vital flui entre arma e portador.', branch: 'harmonia', cost: 1, tier: 1, requires: [], effects: [{ type: 'vida', value: 15 }], x: 0.1, y: 0.85 },
    { id: 'finger_har_3', name: 'Vínculo com Portador', desc: '+2 em todos os atributos enquanto vinculado ao portador.', branch: 'harmonia', cost: 1, tier: 2, requires: ['finger_har_1'], effects: [{ type: 'habilidade', nome: 'Vínculo com Portador', tipo: 'passiva', descricao: '+2 em todos os atributos enquanto vinculado ao portador.' }], x: -0.1, y: 0.65 },
    { id: 'finger_har_4', name: 'Sinergia Compatível', desc: '+1 CA. Sinergia +3 com portador compatível.', branch: 'harmonia', cost: 1, tier: 2, requires: ['finger_har_1', 'finger_har_2'], effects: [{ type: 'ca', value: 1 }, { type: 'pericia', pericia: 'Sinergia', value: 3 }], x: 0.1, y: 0.65 },
    { id: 'finger_har_5', name: 'Materialização', desc: 'Materializa corpo energético por 1 rodada. Forma física temporária.', branch: 'harmonia', cost: 2, tier: 3, requires: ['finger_har_3', 'finger_har_4'], effects: [{ type: 'habilidade', nome: 'Materialização', tipo: 'ativa', descricao: 'Materializa corpo energético por 1 rodada. Forma física temporária.', custoEnergia: '2 PE' }], x: -0.1, y: 0.45 },
    { id: 'finger_har_6', name: 'Energia Interior', desc: '+10 Energia, +2 AM. Poder interior crescente.', branch: 'harmonia', cost: 1, tier: 3, requires: ['finger_har_4'], effects: [{ type: 'energia', value: 10 }, { type: 'attr', attr: 'AM', value: 2 }], x: 0.1, y: 0.45 },
    { id: 'finger_har_7', name: 'Vínculo Profundo', desc: '+3 em todos os atributos do portador vinculado.', branch: 'harmonia', cost: 2, tier: 4, requires: ['finger_har_5'], effects: [{ type: 'habilidade', nome: 'Vínculo Profundo', tipo: 'ativa', descricao: '+3 em todos os atributos do portador vinculado. Sinergia total.', custoEnergia: '2 PE' }], x: -0.1, y: 0.25 },
    { id: 'finger_har_8', name: 'Guardião do Portador', desc: '+30 Vida. Concede +3 CA ao portador vinculado.', branch: 'harmonia', cost: 2, tier: 4, requires: ['finger_har_5', 'finger_har_6'], effects: [{ type: 'vida', value: 30 }, { type: 'habilidade', nome: 'Proteção do Portador', tipo: 'passiva', descricao: 'Concede +3 CA ao portador vinculado permanentemente.' }], x: 0.1, y: 0.25 },

    { id: 'finger_asc_1', name: 'Dano Reforçado', desc: '+2 dano permanente em armas empunhadas.', branch: 'ascensao', cost: 1, tier: 1, requires: [], effects: [{ type: 'habilidade', nome: 'Dano Reforçado', tipo: 'passiva', descricao: '+2 dano permanente em armas empunhadas.' }], x: 0.4, y: 0.85 },
    { id: 'finger_asc_2', name: 'Presença Ameaçadora', desc: '+3 Intimidação. A arma irradia poder.', branch: 'ascensao', cost: 1, tier: 1, requires: [], effects: [{ type: 'pericia', pericia: 'Intimidação', value: 3 }], x: 0.6, y: 0.85 },
    { id: 'finger_asc_3', name: 'Arma Evoluída', desc: '+3 dano permanente na arma. Evolução natural da arma.', branch: 'ascensao', cost: 1, tier: 2, requires: ['finger_asc_1'], effects: [{ type: 'habilidade', nome: 'Arma Evoluída', tipo: 'passiva', descricao: '+3 dano permanente na arma. Evolução natural.' }], x: 0.4, y: 0.65 },
    { id: 'finger_asc_4', name: 'Brilho Elemental', desc: '+10 Energia. Arma emite brilho elemental e causa 1d4 extra.', branch: 'ascensao', cost: 1, tier: 2, requires: ['finger_asc_1', 'finger_asc_2'], effects: [{ type: 'energia', value: 10 }, { type: 'habilidade', nome: 'Brilho Elemental', tipo: 'passiva', descricao: 'Arma emite brilho elemental. Ilumina 6m e causa 1d4 extra elemental.' }], x: 0.6, y: 0.65 },
    { id: 'finger_asc_5', name: 'Telecinésia na Arma', desc: 'Controla a arma telecineticamente em 9m. Ataque como ação.', branch: 'ascensao', cost: 1, tier: 3, requires: ['finger_asc_3', 'finger_asc_4'], effects: [{ type: 'habilidade', nome: 'Telecinésia na Arma', tipo: 'ativa', descricao: 'Controla a arma telecineticamente em 9m. Ataque como ação.', custoEnergia: '5 PE' }], x: 0.4, y: 0.45 },
    { id: 'finger_asc_6', name: 'Dano Total', desc: '+5 dano total em armas. Poder ofensivo máximo.', branch: 'ascensao', cost: 1, tier: 3, requires: ['finger_asc_4'], effects: [{ type: 'habilidade', nome: 'Dano Total', tipo: 'passiva', descricao: '+5 dano total em armas empunhadas permanentemente.' }], x: 0.6, y: 0.45 },
    { id: 'finger_asc_7', name: 'Arma Absoluta', desc: 'Causa dano verdadeiro ignorando resistências por 1 cena.', branch: 'ascensao', cost: 2, tier: 4, requires: ['finger_asc_5'], effects: [{ type: 'habilidade', nome: 'Arma Absoluta', tipo: 'ativa', descricao: 'Causa dano verdadeiro ignorando resistências por 1 cena.', custoEnergia: '2 PE' }], x: 0.4, y: 0.25 },
    { id: 'finger_asc_8', name: 'Independência', desc: '+30 Vida, +4 AM. Existe e age sem portador. Consciência própria.', branch: 'ascensao', cost: 2, tier: 4, requires: ['finger_asc_5', 'finger_asc_6'], effects: [{ type: 'vida', value: 30 }, { type: 'attr', attr: 'AM', value: 4 }, { type: 'habilidade', nome: 'Independência', tipo: 'passiva', descricao: 'Existe e age sem portador. Consciência própria permanente.' }], x: 0.6, y: 0.25 },
  ],
  connections: [
    ['finger_sab_1', 'finger_sab_3'],
    ['finger_sab_1', 'finger_sab_4'],
    ['finger_sab_2', 'finger_sab_4'],
    ['finger_sab_3', 'finger_sab_5'],
    ['finger_sab_4', 'finger_sab_5'],
    ['finger_sab_4', 'finger_sab_6'],
    ['finger_sab_5', 'finger_sab_7'],
    ['finger_sab_5', 'finger_sab_8'],
    ['finger_sab_6', 'finger_sab_8'],

    ['finger_har_1', 'finger_har_3'],
    ['finger_har_1', 'finger_har_4'],
    ['finger_har_2', 'finger_har_4'],
    ['finger_har_3', 'finger_har_5'],
    ['finger_har_4', 'finger_har_5'],
    ['finger_har_4', 'finger_har_6'],
    ['finger_har_5', 'finger_har_7'],
    ['finger_har_5', 'finger_har_8'],
    ['finger_har_6', 'finger_har_8'],

    ['finger_asc_1', 'finger_asc_3'],
    ['finger_asc_1', 'finger_asc_4'],
    ['finger_asc_2', 'finger_asc_4'],
    ['finger_asc_3', 'finger_asc_5'],
    ['finger_asc_4', 'finger_asc_5'],
    ['finger_asc_4', 'finger_asc_6'],
    ['finger_asc_5', 'finger_asc_7'],
    ['finger_asc_5', 'finger_asc_8'],
    ['finger_asc_6', 'finger_asc_8'],

    ['finger_sab_2', 'finger_har_1'],
    ['finger_har_2', 'finger_asc_2'],
    ['finger_sab_4', 'finger_har_3'],
  ],
},

SEMIDEUS: {
  id: 'SEMIDEUS',
  name: 'Semideus',
  branches: [
    { id: 'legado', name: 'Caminho do Legado', desc: 'Atributos divinos, herança e poder do deus pai', color: '#fbbf24', icon: 'workspace_premium' },
    { id: 'dominio', name: 'Caminho do Domínio', desc: 'Poder divino, aura e autoridade olímpica', color: '#8b5cf6', icon: 'star' },
    { id: 'olimpo', name: 'Caminho do Olimpo', desc: 'Transcendência, ascensão e divindade menor', color: '#f8fafc', icon: 'wb_sunny' },
  ],
  nodes: [
    { id: 'semi_leg_1', name: 'Herança Divina', desc: '+2 no maior atributo do deus pai. Sangue divino flui nas veias.', branch: 'legado', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'escolha', value: 2 }], x: -0.6, y: 0.85 },
    { id: 'semi_leg_2', name: 'Vitalidade Olímpica', desc: '+20 Vida permanente. Corpo semidivino resistente.', branch: 'legado', cost: 1, tier: 1, requires: [], effects: [{ type: 'vida', value: 20 }], x: -0.4, y: 0.85 },
    { id: 'semi_leg_3', name: 'Dádiva do Pai', desc: '+2 em 2 atributos do deus pai permanentemente.', branch: 'legado', cost: 1, tier: 2, requires: ['semi_leg_1'], effects: [{ type: 'habilidade', nome: 'Dádiva do Pai', tipo: 'passiva', descricao: '+2 em 2 atributos do deus pai permanentemente.' }], x: -0.6, y: 0.65 },
    { id: 'semi_leg_4', name: 'Resiliência Divina', desc: '+15 Vida, +1 CA. Corpo fortalecido pelo legado.', branch: 'legado', cost: 1, tier: 2, requires: ['semi_leg_1', 'semi_leg_2'], effects: [{ type: 'vida', value: 15 }, { type: 'ca', value: 1 }], x: -0.4, y: 0.65 },
    { id: 'semi_leg_5', name: 'Poder do Sangue', desc: '+3 no maior atributo, resistência mágica +1.', branch: 'legado', cost: 1, tier: 3, requires: ['semi_leg_3', 'semi_leg_4'], effects: [{ type: 'attr', attr: 'escolha', value: 3 }, { type: 'habilidade', nome: 'Resistência Mágica', tipo: 'passiva', descricao: '+1 em resistência a dano mágico permanentemente.' }], x: -0.6, y: 0.45 },
    { id: 'semi_leg_6', name: 'Constituição Divina', desc: '+3 em 3 atributos à escolha. Ativação divina.', branch: 'legado', cost: 2, tier: 3, requires: ['semi_leg_4'], effects: [{ type: 'habilidade', nome: 'Constituição Divina', tipo: 'ativa', descricao: '+3 em 3 atributos à escolha. Ativação divina.', custoEnergia: '2 PE' }], x: -0.4, y: 0.45 },
    { id: 'semi_leg_7', name: 'Sangue Puro', desc: '+4 em atributos do deus pai. Herança completa.', branch: 'legado', cost: 2, tier: 4, requires: ['semi_leg_5'], effects: [{ type: 'habilidade', nome: 'Sangue Puro', tipo: 'ativa', descricao: '+4 em atributos do deus pai permanentemente. Herança completa.', custoEnergia: '2 PE' }], x: -0.6, y: 0.25 },
    { id: 'semi_leg_8', name: 'Imunidade Divina', desc: '+40 Vida. Imune a todas as doenças mágicas.', branch: 'legado', cost: 2, tier: 4, requires: ['semi_leg_5', 'semi_leg_6'], effects: [{ type: 'vida', value: 40 }, { type: 'habilidade', nome: 'Imunidade a Doença Mágica', tipo: 'passiva', descricao: 'Imune a todas as doenças mágicas e maldições de doença.' }], x: -0.4, y: 0.25 },

    { id: 'semi_dom_1', name: 'Despertar Divino', desc: '+2 AM permanente. Poder divino desperta.', branch: 'dominio', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'AM', value: 2 }], x: -0.1, y: 0.85 },
    { id: 'semi_dom_2', name: 'Pulso Divino', desc: 'Emita pulso de energia divina: 2d8+AM dano em 6m.', branch: 'dominio', cost: 1, tier: 1, requires: [], effects: [{ type: 'habilidade', nome: 'Pulso Divino', tipo: 'ativa', descricao: 'Emita pulso de energia divina: 2d8+AM dano em 6m.', custoEnergia: '10 PE' }], x: 0.1, y: 0.85 },
    { id: 'semi_dom_3', name: 'Presença Divina', desc: 'Aura divina 15m. Aliados +2 em testes, inimigos -1.', branch: 'dominio', cost: 1, tier: 2, requires: ['semi_dom_1'], effects: [{ type: 'habilidade', nome: 'Presença Divina', tipo: 'ativa', descricao: 'Aura divina 15m. Aliados +2 em testes, inimigos -1.', custoEnergia: '8 PE' }], x: -0.1, y: 0.65 },
    { id: 'semi_dom_4', name: 'Linhagem Fortalecida', desc: '+10 Energia. DT de linhagem +1 em poderes divinos.', branch: 'dominio', cost: 1, tier: 2, requires: ['semi_dom_1', 'semi_dom_2'], effects: [{ type: 'energia', value: 10 }, { type: 'habilidade', nome: 'DT Linhagem', tipo: 'passiva', descricao: 'DT de linhagem +1 em todos os poderes divinos.' }], x: 0.1, y: 0.65 },
    { id: 'semi_dom_5', name: 'Poder de Linhagem', desc: '+3 AM. Poderes de linhagem causam +2 dano.', branch: 'dominio', cost: 1, tier: 3, requires: ['semi_dom_3', 'semi_dom_4'], effects: [{ type: 'attr', attr: 'AM', value: 3 }, { type: 'habilidade', nome: 'Poder de Linhagem', tipo: 'passiva', descricao: '+2 dano em poderes de linhagem divina.' }], x: -0.1, y: 0.45 },
    { id: 'semi_dom_6', name: 'Domínio', desc: 'Usa poder de domínio 2x/descanso. Efeito baseado no deus pai.', branch: 'dominio', cost: 2, tier: 3, requires: ['semi_dom_4'], effects: [{ type: 'habilidade', nome: 'Domínio', tipo: 'ativa', descricao: 'Usa poder de domínio 2x/descanso. Efeito baseado no deus pai.', custoEnergia: '2 PE' }], x: 0.1, y: 0.45 },
    { id: 'semi_dom_7', name: 'Ascensão Divina', desc: 'Usa poder de domínio 3x/dia. Poder divino pleno.', branch: 'dominio', cost: 2, tier: 4, requires: ['semi_dom_5'], effects: [{ type: 'habilidade', nome: 'Ascensão Divina', tipo: 'ativa', descricao: 'Usa poder de domínio 3x/dia. Poder divino pleno.', custoEnergia: '2 PE' }], x: -0.1, y: 0.25 },
    { id: 'semi_dom_8', name: 'Aura de Resistência', desc: '+30 Vida. Aura 50m: aliados +3 em resistência.', branch: 'dominio', cost: 2, tier: 4, requires: ['semi_dom_5', 'semi_dom_6'], effects: [{ type: 'vida', value: 30 }, { type: 'habilidade', nome: 'Aura de Resistência', tipo: 'passiva', descricao: 'Aura 50m. Aliados recebem +3 em resistência a dano.' }], x: 0.1, y: 0.25 },

    { id: 'semi_oli_1', name: 'Energia Olímpica', desc: '+2 AM permanente. Conexão direta com o Olimpo.', branch: 'olimpo', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'AM', value: 2 }], x: 0.4, y: 0.85 },
    { id: 'semi_oli_2', name: 'Carisma Divino', desc: '+3 Persuasão. Mortais sentem a presença divina.', branch: 'olimpo', cost: 1, tier: 1, requires: [], effects: [{ type: 'pericia', pericia: 'Persuasão', value: 3 }], x: 0.6, y: 0.85 },
    { id: 'semi_oli_3', name: 'Aura Divina', desc: 'Aura divina 25m. Aliados recebem +2 em testes de resistência.', branch: 'olimpo', cost: 1, tier: 2, requires: ['semi_oli_1'], effects: [{ type: 'habilidade', nome: 'Aura Divina', tipo: 'ativa', descricao: 'Aura divina 25m. Aliados recebem +2 em testes de resistência.', custoEnergia: '8 PE' }], x: 0.4, y: 0.65 },
    { id: 'semi_oli_4', name: 'Influência Social', desc: '+15 Vida, +2 Persuasão. Autoridade divina inata.', branch: 'olimpo', cost: 1, tier: 2, requires: ['semi_oli_1', 'semi_oli_2'], effects: [{ type: 'vida', value: 15 }, { type: 'pericia', pericia: 'Persuasão', value: 2 }], x: 0.6, y: 0.65 },
    { id: 'semi_oli_5', name: 'Redução Mágica', desc: 'Reduz dano mágico recebido em 3 permanentemente.', branch: 'olimpo', cost: 1, tier: 3, requires: ['semi_oli_3', 'semi_oli_4'], effects: [{ type: 'habilidade', nome: 'Redução Mágica', tipo: 'passiva', descricao: 'Reduz dano mágico recebido em 3 permanentemente.' }], x: 0.4, y: 0.45 },
    { id: 'semi_oli_6', name: 'Avatar do Pai', desc: 'Canaliza o deus pai. Dobra atributos por 1 cena. 1x/semana.', branch: 'olimpo', cost: 2, tier: 3, requires: ['semi_oli_4'], effects: [{ type: 'habilidade', nome: 'Avatar do Pai', tipo: 'ativa', descricao: 'Canaliza o deus pai. Dobra atributos por 1 cena. 1x/semana.', custoEnergia: '2 PE' }], x: 0.6, y: 0.45 },
    { id: 'semi_oli_7', name: 'Ascensão Olimpiana', desc: 'Aura 100m. Todos os aliados recebem +5 em resistência.', branch: 'olimpo', cost: 2, tier: 4, requires: ['semi_oli_5'], effects: [{ type: 'habilidade', nome: 'Ascensão Olimpiana', tipo: 'ativa', descricao: 'Aura 100m. Todos os aliados recebem +5 em resistência. Dura 1 cena.', custoEnergia: '2 PE' }], x: 0.4, y: 0.25 },
    { id: 'semi_oli_8', name: 'Transcendência Olímpica', desc: '+50 Vida, +4 em todos os atributos. Imune a condições.', branch: 'olimpo', cost: 2, tier: 4, requires: ['semi_oli_5', 'semi_oli_6'], effects: [{ type: 'vida', value: 50 }, { type: 'attr', attr: 'FOR', value: 4 }, { type: 'attr', attr: 'DES', value: 4 }, { type: 'attr', attr: 'CON', value: 4 }, { type: 'attr', attr: 'INT', value: 4 }, { type: 'attr', attr: 'APA', value: 4 }, { type: 'attr', attr: 'AM', value: 4 }, { type: 'habilidade', nome: 'Imunidade a Condições', tipo: 'passiva', descricao: 'Imune a todas as condições negativas. Corpo divino perfeito.' }], x: 0.6, y: 0.25 },
  ],
  connections: [
    ['semi_leg_1', 'semi_leg_3'],
    ['semi_leg_1', 'semi_leg_4'],
    ['semi_leg_2', 'semi_leg_4'],
    ['semi_leg_3', 'semi_leg_5'],
    ['semi_leg_4', 'semi_leg_5'],
    ['semi_leg_4', 'semi_leg_6'],
    ['semi_leg_5', 'semi_leg_7'],
    ['semi_leg_5', 'semi_leg_8'],
    ['semi_leg_6', 'semi_leg_8'],

    ['semi_dom_1', 'semi_dom_3'],
    ['semi_dom_1', 'semi_dom_4'],
    ['semi_dom_2', 'semi_dom_4'],
    ['semi_dom_3', 'semi_dom_5'],
    ['semi_dom_4', 'semi_dom_5'],
    ['semi_dom_4', 'semi_dom_6'],
    ['semi_dom_5', 'semi_dom_7'],
    ['semi_dom_5', 'semi_dom_8'],
    ['semi_dom_6', 'semi_dom_8'],

    ['semi_oli_1', 'semi_oli_3'],
    ['semi_oli_1', 'semi_oli_4'],
    ['semi_oli_2', 'semi_oli_4'],
    ['semi_oli_3', 'semi_oli_5'],
    ['semi_oli_4', 'semi_oli_5'],
    ['semi_oli_4', 'semi_oli_6'],
    ['semi_oli_5', 'semi_oli_7'],
    ['semi_oli_5', 'semi_oli_8'],
    ['semi_oli_6', 'semi_oli_8'],

    ['semi_leg_2', 'semi_dom_1'],
    ['semi_dom_2', 'semi_oli_2'],
    ['semi_leg_4', 'semi_dom_3'],
  ],
},

HUMANO_MISTICO: {
  id: 'HUMANO_MISTICO',
  name: 'Humano Místico',
  branches: [
    { id: 'despertar', name: 'Caminho do Despertar', desc: 'Magia emergente, sensibilidade e primeiros poderes', color: '#06b6d4', icon: 'flare' },
    { id: 'canal', name: 'Caminho do Canal', desc: 'Mediunidade, comunicação com entidades e purificação', color: '#8b5cf6', icon: 'waves' },
    { id: 'transcendencia', name: 'Caminho da Transcendência', desc: 'Poder total, guardião supremo e proteção mundial', color: '#fbbf24', icon: 'shield' },
  ],
  nodes: [
    { id: 'mistico_des_1', name: 'Despertar Místico', desc: '+2 AM permanente. Magia emergente desperta.', branch: 'despertar', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'AM', value: 2 }], x: -0.6, y: 0.85 },
    { id: 'mistico_des_2', name: 'Estudos Ocultos', desc: '+3 Ocultismo. Conhecimento do sobrenatural.', branch: 'despertar', cost: 1, tier: 1, requires: [], effects: [{ type: 'pericia', pericia: 'Ocultismo', value: 3 }], x: -0.4, y: 0.85 },
    { id: 'mistico_des_3', name: 'Sensibilidade ao Véu', desc: 'Detecta atividade mágica e sobrenatural em 500m.', branch: 'despertar', cost: 1, tier: 2, requires: ['mistico_des_1'], effects: [{ type: 'habilidade', nome: 'Sensibilidade ao Véu', tipo: 'passiva', descricao: 'Detecta atividade mágica e sobrenatural em 500m.' }], x: -0.6, y: 0.65 },
    { id: 'mistico_des_4', name: 'Detectar Rupturas', desc: '+10 Energia. Detecta rupturas dimensionais e portais em 200m.', branch: 'despertar', cost: 1, tier: 2, requires: ['mistico_des_1', 'mistico_des_2'], effects: [{ type: 'energia', value: 10 }, { type: 'habilidade', nome: 'Detectar Rupturas', tipo: 'passiva', descricao: 'Detecta rupturas dimensionais e portais em 200m automaticamente.' }], x: -0.4, y: 0.65 },
    { id: 'mistico_des_5', name: 'Eficiência Mágica', desc: '+3 AM. Magias e rituais custam -1 PE (mínimo 1).', branch: 'despertar', cost: 1, tier: 3, requires: ['mistico_des_3', 'mistico_des_4'], effects: [{ type: 'attr', attr: 'AM', value: 3 }, { type: 'habilidade', nome: 'Eficiência Mágica', tipo: 'passiva', descricao: 'Magias e rituais custam -1 PE (mínimo 1).' }], x: -0.6, y: 0.45 },
    { id: 'mistico_des_6', name: 'Purificação Guardiã', desc: 'Remove maldições e efeitos negativos em 1 criatura tocada.', branch: 'despertar', cost: 2, tier: 3, requires: ['mistico_des_4'], effects: [{ type: 'habilidade', nome: 'Purificação Guardiã', tipo: 'ativa', descricao: 'Remove maldições e efeitos negativos em 1 criatura tocada.', custoEnergia: '2 PE' }], x: -0.4, y: 0.45 },
    { id: 'mistico_des_7', name: 'Evolução Acelerada', desc: 'Pode realizar rituais simultâneos e aprender magias acelerado.', branch: 'despertar', cost: 2, tier: 4, requires: ['mistico_des_5'], effects: [{ type: 'habilidade', nome: 'Evolução Acelerada', tipo: 'ativa', descricao: 'Pode realizar rituais simultâneos e aprender magias acelerado.', custoEnergia: '2 PE' }], x: -0.6, y: 0.25 },
    { id: 'mistico_des_8', name: 'Mestria Mágica', desc: '+30 Vida. Ganha +100% XP em atividades mágicas e rituais.', branch: 'despertar', cost: 2, tier: 4, requires: ['mistico_des_5', 'mistico_des_6'], effects: [{ type: 'vida', value: 30 }, { type: 'habilidade', nome: 'XP Mágico Dobrado', tipo: 'passiva', descricao: 'Ganha +100% XP em atividades mágicas e rituais.' }], x: -0.4, y: 0.25 },

    { id: 'mistico_can_1', name: 'Mente Mediúnica', desc: '+2 INT permanente. Canal mediúnico aberto.', branch: 'canal', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'INT', value: 2 }], x: -0.1, y: 0.85 },
    { id: 'mistico_can_2', name: 'Talento Versátil', desc: '+5 em 1 perícia à escolha. Aptidão mística ampla.', branch: 'canal', cost: 1, tier: 1, requires: [], effects: [{ type: 'pericia', pericia: 'escolha', value: 5 }], x: 0.1, y: 0.85 },
    { id: 'mistico_can_3', name: 'Sincronia Mágica', desc: 'Pode usar habilidades de qualquer triagem mágica sem restrição.', branch: 'canal', cost: 1, tier: 2, requires: ['mistico_can_1'], effects: [{ type: 'habilidade', nome: 'Sincronia Mágica', tipo: 'passiva', descricao: 'Pode usar habilidades de qualquer triagem mágica sem restrição.' }], x: -0.1, y: 0.65 },
    { id: 'mistico_can_4', name: 'Rituais Universais', desc: '+10 Energia. Pode realizar rituais de qualquer escola mágica.', branch: 'canal', cost: 1, tier: 2, requires: ['mistico_can_1', 'mistico_can_2'], effects: [{ type: 'energia', value: 10 }, { type: 'habilidade', nome: 'Rituais Universais', tipo: 'passiva', descricao: 'Pode realizar rituais de qualquer escola mágica.' }], x: 0.1, y: 0.65 },
    { id: 'mistico_can_5', name: 'Comunicação com Entidades', desc: 'Comunica-se com entidades espirituais e dimensionais livremente.', branch: 'canal', cost: 2, tier: 3, requires: ['mistico_can_3', 'mistico_can_4'], effects: [{ type: 'habilidade', nome: 'Comunicação com Entidades', tipo: 'ativa', descricao: 'Comunica-se com entidades espirituais e dimensionais livremente.', custoEnergia: '2 PE' }], x: -0.1, y: 0.45 },
    { id: 'mistico_can_6', name: 'Poder Canalizado', desc: '+3 INT, +3 AM. Vantagem em magia mental.', branch: 'canal', cost: 1, tier: 3, requires: ['mistico_can_4'], effects: [{ type: 'attr', attr: 'INT', value: 3 }, { type: 'attr', attr: 'AM', value: 3 }, { type: 'pericia', pericia: 'Magia Mental', value: 0, especial: 'vantagem' }], x: 0.1, y: 0.45 },
    { id: 'mistico_can_7', name: 'Canal Divino', desc: 'Acessa qualquer escola mágica como se fosse primária. Sem restrições.', branch: 'canal', cost: 2, tier: 4, requires: ['mistico_can_5'], effects: [{ type: 'habilidade', nome: 'Canal Divino', tipo: 'ativa', descricao: 'Acessa qualquer escola mágica como se fosse primária. Sem restrições.', custoEnergia: '2 PE' }], x: -0.1, y: 0.25 },
    { id: 'mistico_can_8', name: 'Rituais Sem Restrição', desc: '+20 Vida, +15 Energia. Rituais de qualquer escola sem limite.', branch: 'canal', cost: 2, tier: 4, requires: ['mistico_can_5', 'mistico_can_6'], effects: [{ type: 'vida', value: 20 }, { type: 'energia', value: 15 }, { type: 'habilidade', nome: 'Rituais Sem Restrição', tipo: 'passiva', descricao: 'Realiza rituais de qualquer escola sem limite de nível ou tipo.' }], x: 0.1, y: 0.25 },

    { id: 'mistico_tra_1', name: 'Poder Guardião', desc: '+2 AM permanente. Energia guardiã desperta.', branch: 'transcendencia', cost: 1, tier: 1, requires: [], effects: [{ type: 'attr', attr: 'AM', value: 2 }], x: 0.4, y: 0.85 },
    { id: 'mistico_tra_2', name: 'Resistência Guardiã', desc: '+15 Vida permanente. Corpo fortalecido pelo véu.', branch: 'transcendencia', cost: 1, tier: 1, requires: [], effects: [{ type: 'vida', value: 15 }], x: 0.6, y: 0.85 },
    { id: 'mistico_tra_3', name: 'Barreira Mística', desc: '+10 Energia. Reduz dano mágico recebido em 2.', branch: 'transcendencia', cost: 1, tier: 2, requires: ['mistico_tra_1'], effects: [{ type: 'energia', value: 10 }, { type: 'habilidade', nome: 'Resistência Mágica', tipo: 'passiva', descricao: 'Reduz dano mágico recebido em 2 permanentemente.' }], x: 0.4, y: 0.65 },
    { id: 'mistico_tra_4', name: 'Escudo Guardião', desc: 'Escudo absorve 15xAM de dano antes de quebrar. Dura 1 cena.', branch: 'transcendencia', cost: 1, tier: 2, requires: ['mistico_tra_1', 'mistico_tra_2'], effects: [{ type: 'habilidade', nome: 'Escudo Guardião', tipo: 'ativa', descricao: 'Escudo absorve 15xAM de dano antes de quebrar. Dura 1 cena.', custoEnergia: '10 PE' }], x: 0.6, y: 0.65 },
    { id: 'mistico_tra_5', name: 'Visão Verdadeira', desc: '+3 AM. Imune a ilusões e efeitos visuais mágicos.', branch: 'transcendencia', cost: 1, tier: 3, requires: ['mistico_tra_3', 'mistico_tra_4'], effects: [{ type: 'attr', attr: 'AM', value: 3 }, { type: 'habilidade', nome: 'Imunidade a Ilusão', tipo: 'passiva', descricao: 'Imune a ilusões e efeitos visuais mágicos.' }], x: 0.4, y: 0.45 },
    { id: 'mistico_tra_6', name: 'Guardião Total', desc: 'Cura 3d8+AM HP de todos os aliados em 9m. Proteção suprema.', branch: 'transcendencia', cost: 2, tier: 3, requires: ['mistico_tra_4'], effects: [{ type: 'habilidade', nome: 'Guardião Total', tipo: 'ativa', descricao: 'Cura 3d8+AM HP de todos os aliados em 9m. Proteção suprema.', custoEnergia: '2 PE' }], x: 0.6, y: 0.45 },
    { id: 'mistico_tra_7', name: 'Transcendência', desc: 'Realiza rituais de qualquer escola sem limite de nível ou custo.', branch: 'transcendencia', cost: 2, tier: 4, requires: ['mistico_tra_5'], effects: [{ type: 'habilidade', nome: 'Transcendência', tipo: 'ativa', descricao: 'Realiza rituais de qualquer escola sem limite de nível ou custo.', custoEnergia: '2 PE' }], x: 0.4, y: 0.25 },
    { id: 'mistico_tra_8', name: 'Guardião Supremo', desc: '+50 Vida, +5 AM. Imune a condições mágicas negativas.', branch: 'transcendencia', cost: 2, tier: 4, requires: ['mistico_tra_5', 'mistico_tra_6'], effects: [{ type: 'vida', value: 50 }, { type: 'attr', attr: 'AM', value: 5 }, { type: 'habilidade', nome: 'Imunidade a Condições Mágicas', tipo: 'passiva', descricao: 'Imune a todas as condições mágicas negativas. Guardião supremo.' }], x: 0.6, y: 0.25 },
  ],
  connections: [
    ['mistico_des_1', 'mistico_des_3'],
    ['mistico_des_1', 'mistico_des_4'],
    ['mistico_des_2', 'mistico_des_4'],
    ['mistico_des_3', 'mistico_des_5'],
    ['mistico_des_4', 'mistico_des_5'],
    ['mistico_des_4', 'mistico_des_6'],
    ['mistico_des_5', 'mistico_des_7'],
    ['mistico_des_5', 'mistico_des_8'],
    ['mistico_des_6', 'mistico_des_8'],

    ['mistico_can_1', 'mistico_can_3'],
    ['mistico_can_1', 'mistico_can_4'],
    ['mistico_can_2', 'mistico_can_4'],
    ['mistico_can_3', 'mistico_can_5'],
    ['mistico_can_4', 'mistico_can_5'],
    ['mistico_can_4', 'mistico_can_6'],
    ['mistico_can_5', 'mistico_can_7'],
    ['mistico_can_5', 'mistico_can_8'],
    ['mistico_can_6', 'mistico_can_8'],

    ['mistico_tra_1', 'mistico_tra_3'],
    ['mistico_tra_1', 'mistico_tra_4'],
    ['mistico_tra_2', 'mistico_tra_4'],
    ['mistico_tra_3', 'mistico_tra_5'],
    ['mistico_tra_4', 'mistico_tra_5'],
    ['mistico_tra_4', 'mistico_tra_6'],
    ['mistico_tra_5', 'mistico_tra_7'],
    ['mistico_tra_5', 'mistico_tra_8'],
    ['mistico_tra_6', 'mistico_tra_8'],

    ['mistico_des_2', 'mistico_can_1'],
    ['mistico_can_2', 'mistico_tra_2'],
    ['mistico_des_4', 'mistico_can_3'],
  ],
},

}

export function getRaceTree(raceId) {
  return RACE_TREES[raceId] || null
}

export function getRaceTreeBranch(raceId, branchId) {
  const tree = RACE_TREES[raceId]
  if (!tree) return null
  return tree.branches.find(b => b.id === branchId) || null
}

export function getRaceTreeNode(raceId, nodeId) {
  const tree = RACE_TREES[raceId]
  if (!tree) return null
  return tree.nodes.find(n => n.id === nodeId) || null
}

export function getNodesByBranch(raceId, branchId) {
  const tree = RACE_TREES[raceId]
  if (!tree) return []
  return tree.nodes.filter(n => n.branch === branchId)
}

export function getNodesByTier(raceId, tier) {
  const tree = RACE_TREES[raceId]
  if (!tree) return []
  return tree.nodes.filter(n => n.tier === tier)
}

export function getConnectedNodes(raceId, nodeId) {
  const tree = RACE_TREES[raceId]
  if (!tree) return []
  const connected = []
  for (const [from, to] of tree.connections) {
    if (from === nodeId) connected.push(to)
    if (to === nodeId) connected.push(from)
  }
  return [...new Set(connected)]
}

export function getPrerequisites(raceId, nodeId) {
  const tree = RACE_TREES[raceId]
  if (!tree) return []
  const node = tree.nodes.find(n => n.id === nodeId)
  if (!node) return []
  return node.requires
}

export function canUnlockNode(raceId, nodeId, unlockedNodeIds) {
  const tree = RACE_TREES[raceId]
  if (!tree) return false
  const node = tree.nodes.find(n => n.id === nodeId)
  if (!node) return false
  if (unlockedNodeIds.includes(nodeId)) return false
  return node.requires.every(reqId => unlockedNodeIds.includes(reqId))
}

export function getTotalParCost(unlockedNodeIds, raceId) {
  const tree = RACE_TREES[raceId]
  if (!tree) return 0
  return unlockedNodeIds.reduce((total, nodeId) => {
    const node = tree.nodes.find(n => n.id === nodeId)
    return total + (node ? node.cost : 0)
  }, 0)
}

export function aggregateEffects(unlockedNodeIds, raceId) {
  const tree = RACE_TREES[raceId]
  if (!tree) return { attrs: {}, vida: 0, energia: 0, ca: 0, pericias: {}, habilidades: [] }
  const attrs = {}
  let vida = 0
  let energia = 0
  let ca = 0
  const pericias = {}
  const habilidades = []
  for (const nodeId of unlockedNodeIds) {
    const node = tree.nodes.find(n => n.id === nodeId)
    if (!node) continue
    for (const effect of node.effects) {
      if (effect.type === 'attr') {
        const key = effect.attr
        attrs[key] = (attrs[key] || 0) + effect.value
      } else if (effect.type === 'vida') {
        vida += effect.value
      } else if (effect.type === 'energia') {
        energia += effect.value
      } else if (effect.type === 'ca') {
        ca += effect.value
      } else if (effect.type === 'pericia') {
        pericias[effect.pericia] = (pericias[effect.pericia] || 0) + effect.value
      } else if (effect.type === 'habilidade') {
        habilidades.push({ nome: effect.nome, tipo: effect.tipo, descricao: effect.descricao, custoEnergia: effect.custoEnergia })
      }
    }
  }
  return { attrs, vida, energia, ca, pericias, habilidades }
}
