import MysticAdminPanel from './MysticAdminPanel'
import { fetchRuneRituals, saveRuneRitual, deleteRuneRitual } from '../services/alchemyService'
import { analyzeRuneDraft } from '../services/aiService'
import { RUNE_CATEGORIES, RUNE_GRADES } from '../data/runeFallbackRituals'
import { getRuneSpaceCost } from '../utils/runeRules'

export default function RuneAdminPanel() {
  return (
    <MysticAdminPanel
      config={{
        title: 'Biblioteca de Runas',
        ritualType: 'rune',
        categories: RUNE_CATEGORIES,
        fetchLibrary: fetchRuneRituals,
        saveEntry: saveRuneRitual,
        deleteEntry: deleteRuneRitual,
        analyzeEntry: analyzeRuneDraft,
        getSpaceCost: getRuneSpaceCost,
        sourceWarning: 'Tabela de Runas indisponivel no banco. O painel esta lendo o catalogo local.',
        specialTagPrefix: 'grade',
        specialLabel: 'Grau',
        specialPlaceholder: 'Selecione o grau',
        specialOptions: RUNE_GRADES.map((value) => ({ value, label: value === 'maior' ? 'Runa Maior' : value === 'comum' ? 'Runa Comum' : 'Runa Menor' })),
        sourceNameLabel: 'Runa Primordial',
        lawNameLabel: 'Dominio / Lei',
      }}
    />
  )
}
