export function rollD6() {
  return 1 + Math.floor(Math.random() * 6)
}

export function rollPool(n) {
  const count = Math.max(0, Math.floor(n))
  const dice = []
  for (let i = 0; i < count; i++) dice.push(rollD6())
  const successes = dice.filter(v => v >= 4).length
  return { dice, successes, pool: count }
}

export function rollAction({ attribute = 0, bonusDice = 0, conditions = { pos: 0, neg: 0 }, spendPE = 0 }) {
  let pool = attribute + bonusDice
  if (conditions.pos) pool += 1
  if (conditions.neg) pool -= 1
  if (spendPE) pool += 2 * spendPE
  return rollPool(pool)
}

export function combinedPool(a, b) {
  const min = Math.min(a, b)
  const max = Math.max(a, b)
  let bonus = 0
  if (max >= 6) bonus = 2
  else if (max >= 4) bonus = 1
  return { pool: min + bonus, min, max, bonus }
}

export function describeRoll({ dice, successes, difficulty = 0 }) {
  const ok = difficulty > 0 ? successes >= difficulty : null
  return {
    dice,
    successes,
    difficulty,
    success: ok,
    text: difficulty > 0
      ? (ok ? `${successes} sucesso(s) — alcançou a dificuldade ${difficulty}.` : `${successes} sucesso(s) — abaixo da dificuldade ${difficulty}.`)
      : `${successes} sucesso(s) em ${dice.length} dados.`
  }
}
