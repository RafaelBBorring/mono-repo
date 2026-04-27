import MysticAdminPanel from './MysticAdminPanel'
import { fetchSpellRituals, saveSpellRitual, deleteSpellRitual } from '../services/alchemyService'
import { analyzeSpellDraft } from '../services/aiService'
import { SPELL_CATEGORIES, SPELL_TRADITIONS } from '../data/spellFallbackRituals'
import { getSpellSpaceCost } from '../utils/spellRules'

export default function SpellAdminPanel() {
  return (
    <MysticAdminPanel
      config={{
        title: 'Biblioteca de Feitiços',
        ritualType: 'spell',
        categories: SPELL_CATEGORIES,
        fetchLibrary: fetchSpellRituals,
        saveEntry: saveSpellRitual,
        deleteEntry: deleteSpellRitual,
        analyzeEntry: analyzeSpellDraft,
        getSpaceCost: getSpellSpaceCost,
        sourceWarning: 'Tabela de Feitiços indisponivel no banco. O painel esta lendo o catalogo local.',
        specialTagPrefix: 'tradition',
        specialLabel: 'Tradicao',
        specialPlaceholder: 'Selecione uma tradicao',
        specialOptions: SPELL_TRADITIONS.map((value) => ({ value, label: value === 'arcana' ? 'Arcana' : 'Bruxaria' })),
        sourceNameLabel: 'Escola / Fonte',
        lawNameLabel: 'Lei / Escola',
      }}
    />
  )
}
