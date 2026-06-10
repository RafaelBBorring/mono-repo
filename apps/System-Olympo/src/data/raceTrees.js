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
    { id: 'sintetico', name: 'Caminho Sintético', desc: 'Tecnologia, implantes e aprimoramentos mecânicos', color: '#a3a3a3', icon: 'precision_manufacturing' },
    { id: 'biologico', name: 'Caminho Biológico', desc: 'Genética, mutações e evolução orgânica', color: '#22c55e', icon: 'biotech' },
    { id: 'hibrido', name: 'Caminho Híbrido', desc: 'Mistura de tecnologia e biologia', color: '#8b5cf6', icon: 'merge_type' },
  ],
  nodes: [],
  connections: [],
},

ELFO: {
  id: 'ELFO',
  name: 'Elfo',
  branches: [
    { id: 'floresta', name: 'Caminho da Floresta', desc: 'Natureza, harmonia e poder ancestral verde', color: '#22c55e', icon: 'forest' },
    { id: 'arcano', name: 'Caminho Arcano', desc: 'Magia pura, feitiços e conhecimento mágico', color: '#8b5cf6', icon: 'auto_awesome' },
    { id: 'ancestral', name: 'Caminho Ancestral', desc: 'Conhecimento milenar, memórias e sabedoria', color: '#06b6d4', icon: 'history_edu' },
  ],
  nodes: [],
  connections: [],
},

BRUXA: {
  id: 'BRUXA',
  name: 'Bruxa',
  branches: [
    { id: 'pacto', name: 'Caminho do Pacto', desc: 'Poder sombrio, maldições e pactos com entidades', color: '#7c3aed', icon: 'science' },
    { id: 'ervas', name: 'Caminho das Ervas', desc: 'Cura, natureza e alquimia natural', color: '#22c55e', icon: 'local_florist' },
    { id: 'encantamento', name: 'Caminho do Encantamento', desc: 'Controle mental, ilusões e manipulação', color: '#ec4899', icon: 'flutter_dash' },
  ],
  nodes: [],
  connections: [],
},

MAGO: {
  id: 'MAGO',
  name: 'Mago',
  branches: [
    { id: 'arcana', name: 'Caminho Arcana', desc: 'Magia pura, foco arcano e feitiços devastadores', color: '#3b82f6', icon: 'auto_fix_high' },
    { id: 'elemental', name: 'Caminho Elemental', desc: 'Domínio dos elementos, fogo, gelo e raio', color: '#ef4444', icon: 'local_fire_department' },
    { id: 'cronurgia', name: 'Caminho da Cronurgia', desc: 'Tempo, espaço e manipulação da realidade', color: '#8b5cf6', icon: 'hourglass_empty' },
  ],
  nodes: [],
  connections: [],
},

FEITICEIRO: {
  id: 'FEITICEIRO',
  name: 'Feiticeiro',
  branches: [
    { id: 'linhagem', name: 'Caminho da Linhagem', desc: 'Poder inato, dom elemental e herança mágica', color: '#f59e0b', icon: 'bolt' },
    { id: 'metamorfose', name: 'Caminho da Metamorfose', desc: 'Transformação, mutações e evolução do dom', color: '#10b981', icon: 'transform' },
    { id: 'caos', name: 'Caminho do Caos', desc: 'Imprevisibilidade, magia selvagem e poder instável', color: '#ef4444', icon: 'casino' },
  ],
  nodes: [],
  connections: [],
},

LOBISOMEM: {
  id: 'LOBISOMEM',
  name: 'Lobisomem',
  branches: [
    { id: 'fera', name: 'Caminho da Fera', desc: 'Força bruta, garras e instinto predador', color: '#ef4444', icon: 'pets' },
    { id: 'matilha', name: 'Caminho da Matilha', desc: 'Liderança, aura de grupo e sinergia em equipe', color: '#f59e0b', icon: 'groups' },
    { id: 'instinto', name: 'Caminho do Instinto', desc: 'Sentidos aguçados, perícias e sobrevivência', color: '#22c55e', icon: 'visibility' },
  ],
  nodes: [],
  connections: [],
},

DEMONIO: {
  id: 'DEMONIO',
  name: 'Demônio',
  branches: [
    { id: 'abismo', name: 'Caminho do Abismo', desc: 'Destruição, poder bruto e aniquilação', color: '#dc2626', icon: 'whatshot' },
    { id: 'corrupcao', name: 'Caminho da Corrupção', desc: 'Controle, dominação e subversão', color: '#7c3aed', icon: 'corrupted' },
    { id: 'inferno', name: 'Caminho do Inferno', desc: 'Fogo, magia infernal e destruição elemental', color: '#f97316', icon: 'local_fire_department' },
  ],
  nodes: [],
  connections: [],
},

DASARIANO: {
  id: 'DASARIANO',
  name: 'Dasariano',
  branches: [
    { id: 'forma_base', name: 'Caminho da Forma Base', desc: 'Estabilidade, controle e equilíbrio entre formas', color: '#3b82f6', icon: 'accessibility_new' },
    { id: 'forma_combate', name: 'Caminho da Forma de Combate', desc: 'Forma híbrida, agressividade e poder ofensivo', color: '#ef4444', icon: 'front_hand' },
    { id: 'forma_selvagem', name: 'Caminho da Forma Selvagem', desc: 'Forma primordial, instinto e poder bestial', color: '#22c55e', icon: 'cruelty_free' },
  ],
  nodes: [],
  connections: [],
},

FINGER: {
  id: 'FINGER',
  name: 'Finger',
  branches: [
    { id: 'sabedoria', name: 'Caminho da Sabedoria', desc: 'Conhecimento, percepção e compreensão arcana', color: '#06b6d4', icon: 'menu_book' },
    { id: 'harmonia', name: 'Caminho da Harmonia', desc: 'Equilíbrio com portador, sinergia e cooperação', color: '#22c55e', icon: 'handshake' },
    { id: 'ascensao', name: 'Caminho da Ascensão', desc: 'Poder interior, dominação e independência', color: '#f59e0b', icon: 'trending_up' },
  ],
  nodes: [],
  connections: [],
},

SEMIDEUS: {
  id: 'SEMIDEUS',
  name: 'Semideus',
  branches: [
    { id: 'legado', name: 'Caminho do Legado', desc: 'Atributos divinos, herança e poder do deus pai', color: '#fbbf24', icon: 'workspace_premium' },
    { id: 'dominio', name: 'Caminho do Domínio', desc: 'Poder divino, aura e autoridade olímpica', color: '#8b5cf6', icon: 'star' },
    { id: 'olimpo', name: 'Caminho do Olimpo', desc: 'Transcendência, ascensão e divindade menor', color: '#f8fafc', icon: 'wb_sunny' },
  ],
  nodes: [],
  connections: [],
},

HUMANO_MISTICO: {
  id: 'HUMANO_MISTICO',
  name: 'Humano Místico',
  branches: [
    { id: 'despertar', name: 'Caminho do Despertar', desc: 'Magia emergente, sensibilidade e primeiros poderes', color: '#06b6d4', icon: 'flare' },
    { id: 'canal', name: 'Caminho do Canal', desc: 'Mediunidade, comunicação com entidades e purificação', color: '#8b5cf6', icon: 'waves' },
    { id: 'transcendencia', name: 'Caminho da Transcendência', desc: 'Poder total, guardião supremo e proteção mundial', color: '#fbbf24', icon: 'shield' },
  ],
  nodes: [],
  connections: [],
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
