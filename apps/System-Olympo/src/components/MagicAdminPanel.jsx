import MysticAdminPanel from './MysticAdminPanel'
import { fetchMagicRituals, saveMagicRitual, deleteMagicRitual } from '../services/alchemyService'
import { analyzeMagicDraft } from '../services/aiService'
import { MAGIC_CATEGORIES } from '../data/magicFallbackRituals'
import { getMagicSpaceCost } from '../utils/magicRules'

const MAGIC_SCHOOLS = [
  { value: 'fogo', label: 'Fogo' },
  { value: 'gelo', label: 'Gelo' },
  { value: 'eletrico', label: 'Eletrico' },
  { value: 'arcano', label: 'Arcano' },
  { value: 'gravidade', label: 'Gravidade' },
  { value: 'ilusao', label: 'Ilusao' },
]

export default function MagicAdminPanel() {
  return (
    <MysticAdminPanel
      config={{
        title: 'Biblioteca de Magias',
        ritualType: 'magic',
        categories: MAGIC_CATEGORIES,
        fetchLibrary: fetchMagicRituals,
        saveEntry: saveMagicRitual,
        deleteEntry: deleteMagicRitual,
        analyzeEntry: analyzeMagicDraft,
        getSpaceCost: getMagicSpaceCost,
        sourceWarning: 'Tabela de Magias indisponivel no banco. O painel esta lendo o catalogo local.',
        specialTagPrefix: 'school',
        specialLabel: 'Escola',
        specialPlaceholder: 'Selecione uma escola',
        specialOptions: MAGIC_SCHOOLS,
        sourceNameLabel: 'Escola de Magia',
        lawNameLabel: 'Lei / Principio',
      }}
    />
  )
}
