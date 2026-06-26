import { listCharacters, saveCharacter, getSetting, setSetting } from './db.js'

const SCHEMA_KEY = 'schemaVersion'
const CURRENT_SCHEMA = 2

function oldDerivedVidaMax(attributes, levelKey) {
  const lvlBonus = { recruta: 0, iniciante: 5, veterano: 10, elite: 20, lenda: 35 }[levelKey] || 0
  return (attributes?.for || 1) * 2 + (attributes?.von || 1) + 10 + lvlBonus
}

export async function runMigrations() {
  try {
    const stored = await getSetting(SCHEMA_KEY, 0)
    const version = Number(stored) || 0
    if (version >= CURRENT_SCHEMA) return { migrated: 0, from: version }

    const chars = await listCharacters()
    let changed = 0
    for (const c of chars) {
      if (!c || !c.attributes) continue
      const patch = {}
      if (version < 2) {
        const oldMax = oldDerivedVidaMax(c.attributes, c.level)
        const cur = c.resources?.vida
        const resources = { ...(c.resources || {}) }
        if (cur != null && cur >= oldMax) {
          resources.vida = oldMax + 5
        }
        delete resources.vidaMax
        delete resources.energiaMax
        delete resources.peMax
        patch.resources = resources
      }
      if (Object.keys(patch).length) {
        await saveCharacter({ ...c, ...patch })
        changed++
      }
    }
    await setSetting(SCHEMA_KEY, CURRENT_SCHEMA)
    return { migrated: changed, from: version }
  } catch (e) {
    return { migrated: 0, error: e?.message || String(e) }
  }
}
