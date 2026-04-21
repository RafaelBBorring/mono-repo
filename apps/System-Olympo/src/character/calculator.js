import {
  attributeOrder,
  classProfiles,
  evolutionMilestones,
  moduleCatalog,
  triageCatalog
} from '../data/mock-data.js';

const tierMap = [
  { max: 7, label: 'Iniciante', tdh: { 'Ativa Fraca': 25.5, 'Ativa Media': 40, 'Ativa Forte': 57, Ultimate: 82 }, pp: { Passiva: 5, 'Ativa Fraca': 4, 'Ativa Media': 6, 'Ativa Forte': 8, Ultimate: 10 } },
  { max: 15, label: 'Intermediario', tdh: { 'Ativa Fraca': 40, 'Ativa Media': 58, 'Ativa Forte': 90.5, Ultimate: 129.5 }, pp: { Passiva: 6, 'Ativa Fraca': 5, 'Ativa Media': 7, 'Ativa Forte': 10, Ultimate: 13 } },
  { max: 22, label: 'Veterano', tdh: { 'Ativa Fraca': 64, 'Ativa Media': 90, 'Ativa Forte': 128, Ultimate: 175.5 }, pp: { Passiva: 7, 'Ativa Fraca': 6, 'Ativa Media': 8, 'Ativa Forte': 12, Ultimate: 16 } },
  { max: 30, label: 'Lendario', tdh: { 'Ativa Fraca': 84, 'Ativa Media': 110, 'Ativa Forte': 151, Ultimate: 210 }, pp: { Passiva: 8, 'Ativa Fraca': 7, 'Ativa Media': 10, 'Ativa Forte': 14, Ultimate: 20 } }
];

export function getModifier(score) {
  return Math.floor((Number(score) - 10) / 2);
}

export function getLevelTier(level) {
  return tierMap.find((item) => level <= item.max) ?? tierMap.at(-1);
}

export function getUnlockedMilestones(level) {
  return evolutionMilestones.filter((milestone) => level >= milestone.level);
}

export function getSelectedRewards(character) {
  return getUnlockedMilestones(character.level)
    .map((milestone) => milestone.rewards.find((reward) => reward.id === character.evolutionChoices[milestone.id]))
    .filter(Boolean);
}

export function buildAttributes(character) {
  return attributeOrder.reduce((accumulator, key) => {
    const base = Number(character.arrayAssignments[key] ?? 8);
    const bonus = Number(character.bonusAssignments[key] ?? 0);
    const total = base + bonus;
    accumulator[key] = {
      base,
      bonus,
      total,
      modifier: getModifier(total)
    };
    return accumulator;
  }, {});
}

export function countSpentBonusPoints(character) {
  return attributeOrder.reduce(
    (total, key) => total + Number(character.bonusAssignments[key] ?? 0),
    0
  );
}

export function getAvailableSkeletonPoints(character) {
  return getSelectedRewards(character).reduce(
    (total, reward) => total + Number(reward.skeletonPoints ?? 0),
    0
  );
}

export function estimateAbilityAverage(damage) {
  if (!damage) {
    return 0;
  }

  const match = String(damage).match(/(\d+)d(\d+)([+-]\d+)?/i);
  if (!match) {
    return 0;
  }

  const diceCount = Number(match[1]);
  const diceSides = Number(match[2]);
  const flat = Number(match[3] ?? 0);
  return diceCount * ((diceSides + 1) / 2) + flat;
}

export function estimateAbilityPp(ability) {
  const average = estimateAbilityAverage(ability.damage);
  let total = 0;

  if (ability.type === 'Passiva') {
    total += 3;
  }

  if (average > 0 && average <= 26) {
    total += 2;
  } else if (average > 26 && average <= 90) {
    total += 4;
  } else if (average > 90) {
    total += 6;
  }

  if (/area/i.test(ability.range)) {
    total += 3;
  }

  if (ability.duration && !/instant/i.test(ability.duration) && ability.type !== 'Passiva') {
    total += 1;
  }

  if (ability.effect && ability.effect.length > 120) {
    total += 1;
  }

  return total;
}

export function deriveCharacter(character) {
  const profile = classProfiles[character.classId];
  const attributes = buildAttributes(character);
  const con = attributes.constituicao.total;
  const conMod = attributes.constituicao.modifier;
  const alma = attributes.alma.total;
  const primaryModifier = attributes[profile.primaryAttribute].modifier;
  const selectedRewards = getSelectedRewards(character);
  const modules = moduleCatalog.filter((module) => character.moduleIds.includes(module.id));
  const triage = (triageCatalog[character.classId] ?? []).find((item) => item.id === character.triageId);
  const passiveHp = selectedRewards.reduce((sum, reward) => sum + Number(reward.passiveHp ?? 0), 0);
  const energyBonus = selectedRewards.reduce((sum, reward) => sum + Number(reward.energyBonus ?? 0), 0);
  const peBonus = selectedRewards.reduce((sum, reward) => sum + Number(reward.peBonus ?? 0), 0);
  const damageBonus = selectedRewards.reduce((sum, reward) => sum + Number(reward.damageBonus ?? 0), 0);
  const armorBonus = selectedRewards.reduce((sum, reward) => sum + Number(reward.armorBonus ?? 0), 0);
  const reactionsBonus = selectedRewards.reduce((sum, reward) => sum + Number(reward.reactionsBonus ?? 0), 0);
  const moduleHp = character.moduleIds.includes('corpo_resiliente') ? 36 : 0;
  const moduleEnergy = character.moduleIds.includes('reserva_arcana') ? 20 : 0;
  const tankBonusPerLevel = character.triageId === 'tank' ? character.level * 5 : 0;
  const baseHp = profile.baseHp + con * 5;
  const hpPerLevel = profile.hpPerLevel + conMod;
  const naturalHp = baseHp + Math.max(character.level - 1, 0) * hpPerLevel;
  const totalPassiveHp = passiveHp + moduleHp + tankBonusPerLevel;
  const totalHp = naturalHp + totalPassiveHp;
  const energyTotal = profile.energyBase + alma * 2 + energyBonus + moduleEnergy + character.level * 3;
  const peTotal = profile.peBase + character.level * 3 + Math.max(attributes.intelecto.modifier, 0) * 2 + peBonus;
  const reactions = Math.max(1, 1 + Math.floor(attributes.destreza.total / 5) + reactionsBonus);
  const ca = 10 + attributes.destreza.modifier + attributes.constituicao.modifier + Math.floor(character.level / 4) + armorBonus;
  const damageBase = `${profile.baseDamage}+${Math.max(primaryModifier + damageBonus, 0)}`;
  const tier = getLevelTier(character.level);
  const skillsAllowed = profile.skills + (character.level >= 8 ? 1 : 0) + (character.level >= 16 ? 1 : 0);
  const radarValues = attributeOrder.map((key) => attributes[key].total);
  const spentSkeleton = countSpentBonusPoints(character);
  const availableSkeleton = getAvailableSkeletonPoints(character);

  return {
    profile,
    attributes,
    triage,
    modules,
    selectedRewards,
    tier,
    baseHp,
    hpPerLevel,
    naturalHp,
    totalPassiveHp,
    totalHp,
    energyTotal,
    peTotal,
    reactions,
    ca,
    damageBase,
    damageFlat: primaryModifier + damageBonus,
    tvpPassiveLimit: Math.round(baseHp * 1.5),
    skillsAllowed,
    radarValues,
    spentSkeleton,
    availableSkeleton
  };
}
