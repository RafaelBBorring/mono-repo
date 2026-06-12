import { SKILL_TREE } from '../data/skillTreeData'

export function getSkill(skillId) {
  return SKILL_TREE[skillId] || null
}

export function getAllSkills() {
  return Object.values(SKILL_TREE)
}

export function getRank(character, skillId) {
  return character.unlockedSkills?.[skillId] || 0
}

export function isMaxed(character, skillId) {
  const skill = getSkill(skillId)
  return skill ? getRank(character, skillId) >= skill.maxRank : false
}

export function isUnlocked(character, skillId) {
  return getRank(character, skillId) > 0
}

export function canUnlockSkill(character, skillId) {
  const skill = getSkill(skillId)
  if (!skill) return false

  if (isMaxed(character, skillId)) return false

  const cost = skill.cost || 1
  if (cost > 0 && (character.skillPoints || 0) < cost) return false

  if (skill.dependsOn && skill.dependsOn.length > 0) {
    const mode = skill.requireMode || 'all'
    if (mode === 'all') {
      if (!skill.dependsOn.every(id => isUnlocked(character, id))) return false
    } else {
      if (!skill.dependsOn.some(id => isUnlocked(character, id))) return false
    }
  }

  return true
}

export function investPoint(character, skillId) {
  const skill = getSkill(skillId)
  if (!skill || !canUnlockSkill(character, skillId)) return character

  const newRank = Math.min(getRank(character, skillId) + 1, skill.maxRank)

  return {
    ...character,
    skillPoints: character.skillPoints - (skill.cost || 1),
    unlockedSkills: {
      ...character.unlockedSkills,
      [skillId]: newRank,
    },
  }
}

export function canRefundPoint(character, skillId) {
  const skill = getSkill(skillId)
  if (!skill || !isUnlocked(character, skillId)) return false
  if (skill.cost === 0) return false

  const rank = getRank(character, skillId)
  if (rank > 1) return true

  for (const s of getAllSkills()) {
    if (!s.dependsOn || !s.dependsOn.includes(skillId)) continue
    if (!isUnlocked(character, s.id)) continue

    const mode = s.requireMode || 'all'
    if (mode === 'all') return false

    const hasOtherPath = s.dependsOn.some(d => d !== skillId && isUnlocked(character, d))
    if (!hasOtherPath) return false
  }

  return true
}

export function refundPoint(character, skillId) {
  const skill = getSkill(skillId)
  if (!skill || !canRefundPoint(character, skillId)) return character

  const rank = getRank(character, skillId)
  const newUnlocked = { ...character.unlockedSkills }

  if (rank <= 1) delete newUnlocked[skillId]
  else newUnlocked[skillId] = rank - 1

  return {
    ...character,
    skillPoints: character.skillPoints + (skill.cost || 1),
    unlockedSkills: newUnlocked,
  }
}

export function getSkillState(skillId, character) {
  const skill = getSkill(skillId)
  if (!skill) return 'locked'

  const rank = getRank(character, skillId)
  if (rank >= skill.maxRank) return 'maxed'
  if (rank > 0) return 'purchased'
  if (canUnlockSkill(character, skillId)) return 'available'
  return 'locked'
}

export function getPointsSpent(character) {
  return Object.entries(character.unlockedSkills || {}).reduce((sum, [id, rank]) => {
    const skill = getSkill(id)
    return sum + (skill ? rank * (skill.cost || 1) : 0)
  }, 0)
}

export function getConnectionState(fromId, toId, character) {
  if (isUnlocked(character, fromId) && isUnlocked(character, toId)) return 'active'
  if (isUnlocked(character, fromId) && !isUnlocked(character, toId)) return 'available'
  return 'inactive'
}

export function getBranchProgress(character, branchId) {
  const branchSkills = getAllSkills().filter(s => s.branch === branchId && !s.isKeystone && !s.isUltimate)
  const totalRanks = branchSkills.reduce((sum, s) => sum + s.maxRank, 0)
  const spentRanks = branchSkills.reduce((sum, s) => sum + getRank(character, s.id), 0)
  return { spent: spentRanks, total: totalRanks }
}
