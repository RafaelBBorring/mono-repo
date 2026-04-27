import MysticLibrarySection, { getTraditionBadge } from './MysticLibrarySection'
import { fetchMagicRituals } from '../services/alchemyService'
import { MAGIC_CATEGORIES } from '../data/magicFallbackRituals'
import { canLearnMagic, getMagicProfile, getMagicSpaceCost, normalizeSelectedMagic } from '../utils/magicRules'
import { MAGIC_COMPLEXITY } from '../utils/magicRules'

const MAGIC_SCHOOLS = [
  { value: 'fogo', label: 'Fogo' },
  { value: 'gelo', label: 'Gelo' },
  { value: 'eletrico', label: 'Eletrico' },
  { value: 'arcano', label: 'Arcano' },
  { value: 'gravidade', label: 'Gravidade' },
  { value: 'ilusao', label: 'Ilusao' },
]

const MAGIC_CIRCLE_NOTES = {
  1: 'Magias basicas e lineares. Entrada natural para qualquer Mago.',
  2: 'Magias de combate e utilidade confiavel. O Mago comeca a definir seu estilo.',
  3: 'Magias densas e com risco real. Identidade de escola muito nitida.',
  4: 'Magias supremas, rarissimas e exigentes. Cada escolha transforma o campo de batalha.',
}

export default function MagicLibrarySection({ char, update, compact = false, wide = false }) {
  return (
    <MysticLibrarySection
      char={char}
      update={update}
      compact={compact}
      wide={wide}
      config={{
        field: 'magics',
        title: 'Magias',
        icon: '🔥',
        accentClass: 'text-orange-300',
        sectionBorder: 'border-orange-400/20',
        fetchLibrary: fetchMagicRituals,
        categories: MAGIC_CATEGORIES,
        getProfile: getMagicProfile,
        canLearn: canLearnMagic,
        normalizeSelected: normalizeSelectedMagic,
        getSpaceCost: getMagicSpaceCost,
        introText: 'Magias sao a forma pura de conjuracao arcana. Apenas Magos possuem acesso nativo a este sistema.',
        sourceErrorText: 'Biblioteca de magias indisponivel no banco. Exibindo catalogo local de apoio.',
        categoryPlaceholder: 'Todas as categorias',
        searchPlaceholder: 'Pesquisar por nome, escola, efeito ou tag...',
        loadingText: 'Carregando biblioteca de magias...',
        emptyText: 'Nenhuma magia encontrada com esses filtros.',
        emptyInspectorTitle: 'Selecione uma magia',
        emptyInspectorText: 'O painel lateral mostra circulo, escola, custo, origem e efeito final da magia.',
        itemLabelPlural: 'magia(s) selecionada(s)',
        sourceChipLabel: (item) => item.source_name || 'Magia',
        metaLines: (item) => [
          { label: 'Escola / principio', value: item.law_name || 'Nao informada' },
          { label: 'Complexidade', value: MAGIC_COMPLEXITY[item.circle] || `${item.circle}o circulo` },
        ],
        circleNotes: MAGIC_CIRCLE_NOTES,
        sourceLabelText: 'Origem',
        hiddenTagPrefixes: ['school'],
        ruleBadges: ({ profile, selectedItems, spaceUsed }) => [
          { label: 'Foco em Poder', value: profile.trainingLabel, tone: 'emerald' },
          { label: 'Espacos', value: `${spaceUsed}/${profile.spaceBudget}`, tone: spaceUsed >= profile.spaceBudget ? 'amber' : 'emerald' },
          { label: 'Circulo Maximo', value: profile.maxCircle ? `${profile.maxCircle}o` : 'Sem acesso', tone: 'purple' },
          { label: 'Magias', value: selectedItems.length, tone: 'gold' },
        ],
        secondaryFilter: {
          allLabel: 'Todas escolas',
          options: MAGIC_SCHOOLS,
          getValue: (item) => {
            const tags = item.tags || []
            const schoolTag = tags.find(t => t.startsWith('school:'))
            return schoolTag ? schoolTag.replace('school:', '') : ''
          },
        },
        getSecondaryBadge: (item) => {
          const tags = item.tags || []
          const schoolTag = tags.find(t => t.startsWith('school:'))
          if (!schoolTag) return null
          const school = schoolTag.replace('school:', '')
          const found = MAGIC_SCHOOLS.find(s => s.value === school)
          return found ? { label: found.label, tone: 'orange' } : null
        },
        renderSummary: ({ profile }) => (
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-3">
            <div className="bg-orange-400/5 border border-orange-400/15 rounded-lg px-3 py-3">
              <div className="text-[11px] uppercase tracking-[0.12em] text-orange-300 font-semibold mb-1">Leitura de acesso</div>
              <p className="text-xs text-txt-dim leading-relaxed">{profile.accessReason}</p>
              {profile.notes.map((note) => (
                <p key={note} className="text-xs text-txt-dim leading-relaxed mt-1">{note}</p>
              ))}
            </div>
            <div className="bg-void/60 border border-sep/30 rounded-lg p-3">
              <div className="text-[11px] uppercase tracking-[0.12em] text-gold font-semibold mb-2">Custos por circulo</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[1, 2, 3, 4].map((circle) => (
                  <div key={circle} className="rounded-lg border border-sep/30 bg-deep px-3 py-2">
                    <div className="text-txt-dim">{circle}o circulo ({MAGIC_COMPLEXITY[circle]})</div>
                    <div className="text-gold font-semibold">{getMagicSpaceCost(circle)} espacos</div>
                    <div className="text-txt-dim mt-1">Limite: {profile.maxByCircle[circle] || 0}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ),
      }}
    />
  )
}
