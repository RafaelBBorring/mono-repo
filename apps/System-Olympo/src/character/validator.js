import { deriveCharacter, estimateAbilityAverage, estimateAbilityPp } from './calculator.js';

function buildStatus(code, title, state, detail, hint) {
  return { code, title, state, detail, hint };
}

export function buildValidationReport(character) {
  const derived = deriveCharacter(character);
  const report = [];

  report.push(
    buildStatus(
      'V01',
      'HP passivo vs TVP',
      derived.totalPassiveHp <= derived.tvpPassiveLimit ? 'ok' : 'warn',
      `${derived.totalPassiveHp} HP passivo de ${derived.tvpPassiveLimit} permitidos.`,
      derived.totalPassiveHp <= derived.tvpPassiveLimit
        ? 'Constituicao e HP por nivel estao fora do teto de passivos, como devem estar.'
        : 'Reduza bonus passivo de triagem/modulo ou troque uma recompensa estrutural.'
    )
  );

  report.push(
    buildStatus(
      'V02',
      'Camada 2',
      character.level <= 22 ? 'ok' : 'warn',
      `${derived.profile.name} em ${derived.tier.label} com ${derived.modules.length} modulos ativos.`,
      character.level <= 22
        ? 'Os ganhos de camada 2 ainda estao em zona controlada.'
        : 'Vale revisar com o mestre se a soma de triagem, modulos e passivos esta acima do esperado.'
    )
  );

  report.push(
    buildStatus(
      'V03',
      'Camada 3',
      'ok',
      'Nao ha runas ou artefatos persistentes cadastrados neste mock.',
      'Quando a biblioteca entrar, este bloco deve separar bonus epicos da camada tatico-passiva.'
    )
  );

  const abilityIssues = character.abilities
    .filter((ability) => ability.type !== 'Passiva')
    .filter((ability) => estimateAbilityAverage(ability.damage) > derived.tier.tdh[ability.type]);

  report.push(
    buildStatus(
      'V04',
      'Dano por habilidade',
      abilityIssues.length === 0 ? 'ok' : 'error',
      abilityIssues.length === 0
        ? 'Todas as tecnicas estao dentro do TDH da faixa.'
        : `${abilityIssues.map((ability) => ability.name).join(', ')} estouram o teto do tier.`,
      abilityIssues.length === 0
        ? 'O burst da ficha esta em linha com o nivel atual.'
        : 'Ajuste dados, flat ou area para caber no teto de dano da faixa.'
    )
  );

  report.push(
    buildStatus(
      'V05',
      'Reacoes',
      derived.reactions <= 5 ? 'ok' : 'warn',
      `${derived.reactions} reacoes por rodada.`,
      derived.reactions <= 5
        ? 'Boa leitura de combate sem estourar a mesa.'
        : 'Acima de 5 convem conversar com o mestre sobre cap opcional.'
    )
  );

  const ppIssues = character.abilities.filter((ability) => estimateAbilityPp(ability) > derived.tier.pp[ability.type]);
  report.push(
    buildStatus(
      'V06',
      'Orcamento de PP',
      ppIssues.length === 0 ? 'ok' : 'warn',
      ppIssues.length === 0
        ? 'Nenhuma habilidade excede o budget de potencia do tier.'
        : `${ppIssues.map((ability) => ability.name).join(', ')} passam do budget de PP.`,
      ppIssues.length === 0
        ? 'A build esta com peso de efeito controlado.'
        : 'Reduza area, duracao ou complexidade do efeito para aliviar PP.'
    )
  );

  report.push(
    buildStatus(
      'V07',
      'Inflacao de energia',
      derived.energyTotal <= 500 ? 'ok' : 'warn',
      `${derived.energyTotal} de energia total.`,
      derived.energyTotal <= 500
        ? 'O recurso ainda pressiona decisoes em combate.'
        : 'Acima de 500 o custo pode ficar cosmetico demais.'
    )
  );

  const overloadOnUltimate = character.moduleIds.includes('conhecimento_amplificado') &&
    character.abilities.some((ability) => ability.type === 'Ultimate' && ability.effect.toLowerCase().includes('sobrecarga'));

  report.push(
    buildStatus(
      'V08',
      'Sobrecarga em ultimate',
      overloadOnUltimate ? 'error' : 'ok',
      overloadOnUltimate ? 'Ultimate com sobrecarga declarada.' : 'Nenhuma combinacao proibida encontrada.',
      overloadOnUltimate
        ? 'Retire a sobrecarga da ultimate ou mova esse pico para uma ativa forte.'
        : 'A janela de burst final esta limpa.'
    )
  );

  return report;
}
