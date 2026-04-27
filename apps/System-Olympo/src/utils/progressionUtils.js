export function scaleTrainedSkillsReward(value) {
  return Math.max(1, Math.ceil((value || 0) / 2))
}

export function normalizeProgressionLabel(label = '') {
  return String(label).replace(/\+(\d+)\s+Per(?:icias|Ã­cias|ícias)\s+Treinadas/g, (_, rawValue) => {
    const scaled = scaleTrainedSkillsReward(Number(rawValue))
    return `+${String(scaled).padStart(2, '0')} Pericias Treinadas`
  })
}
