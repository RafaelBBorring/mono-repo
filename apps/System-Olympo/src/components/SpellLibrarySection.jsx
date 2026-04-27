import MysticLibrarySection, { getTraditionBadge } from './MysticLibrarySection'
import { fetchSpellRituals } from '../services/alchemyService'
import { SPELL_CATEGORIES, SPELL_TRADITIONS } from '../data/spellFallbackRituals'
import { canLearnSpell, getSpellProfile, getSpellSpaceCost, normalizeSelectedSpell } from '../utils/spellRules'

const SPELL_CIRCLE_NOTES = {
  1: 'Feitiços curtos e responsivos. Custam pouco espaço e servem de entrada para bruxaria ou arcana.',
  2: 'Feitiços de combate e utilidade já confiáveis. O personagem começa a moldar cenas inteiras.',
  3: 'Feitiços densos, com risco real e identidade de escola muito nítida.',
  4: 'Feitiços épicos, raros e exigentes. Cada escolha pesa bastante no repertório.',
}

export default function SpellLibrarySection({ char, update, compact = false, wide = false }) {
  return (
    <MysticLibrarySection
      char={char}
      update={update}
      compact={compact}
      wide={wide}
      config={{
        field: 'spells',
        title: 'Feitiços',
        icon: '✨',
        accentClass: 'text-emerald-300',
        sectionBorder: 'border-emerald-400/20',
        fetchLibrary: fetchSpellRituals,
        categories: SPELL_CATEGORIES,
        getProfile: getSpellProfile,
        canLearn: canLearnSpell,
        normalizeSelected: normalizeSelectedSpell,
        getSpaceCost: getSpellSpaceCost,
        introText: 'Feitiços são repertórios opcionais de conjuração. Bruxas, elfos, magos, humanos místicos e personagens realmente voltados ao arcano conseguem sustentar mais espaço, tradições e círculos.',
        sourceErrorText: 'Biblioteca de feitiços indisponível no banco. Exibindo catálogo local de apoio.',
        categoryPlaceholder: 'Todas as categorias',
        searchPlaceholder: 'Pesquisar por nome, escola, tradição, efeito ou tag...',
        loadingText: 'Carregando biblioteca de feitiços...',
        emptyText: 'Nenhum feitiço encontrado com esses filtros.',
        emptyInspectorTitle: 'Selecione um feitiço',
        emptyInspectorText: 'O painel lateral mostra círculo, tradição, custo, origem e efeito final do feitiço.',
        itemLabelPlural: 'feitiço(s) selecionado(s)',
        sourceChipLabel: (item) => item.source_name || 'Feitiço',
        metaLines: (item) => [
          { label: 'Escola / eixo', value: item.law_name || 'Nao informada' },
          { label: 'Tradicao', value: getTraditionBadge(item)?.label || 'Livre' },
        ],
        circleNotes: SPELL_CIRCLE_NOTES,
        sourceLabelText: 'Origem',
        hiddenTagPrefixes: ['tradition'],
        ruleBadges: ({ profile, selectedItems, spaceUsed }) => [
          { label: 'Foco em Poder', value: profile.trainingLabel, tone: 'emerald' },
          { label: 'Espacos', value: `${spaceUsed}/${profile.spaceBudget}`, tone: spaceUsed >= profile.spaceBudget ? 'amber' : 'emerald' },
          { label: 'Circulo Maximo', value: profile.maxCircle ? `${profile.maxCircle}o` : 'Sem acesso', tone: 'purple' },
          { label: 'Tradicoes', value: profile.traditions.length ? profile.traditions.map((item) => item === 'arcana' ? 'Arcana' : 'Bruxaria').join(' / ') : 'Nenhuma', tone: 'sky' },
          { label: '4o Circulo', value: profile.maxByCircle[4] || 0, tone: 'amber' },
          { label: 'Feitiços', value: selectedItems.length, tone: 'gold' },
        ],
        secondaryFilter: {
          allLabel: 'Todas tradicoes',
          options: SPELL_TRADITIONS.map((value) => ({ value, label: value === 'arcana' ? 'Arcana' : 'Bruxaria' })),
          getValue: (item) => getTraditionBadge(item)?.label === 'Arcana' ? 'arcana' : 'bruxaria',
        },
        getSecondaryBadge: getTraditionBadge,
        renderSummary: ({ profile }) => (
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-3">
            <div className="bg-emerald-400/5 border border-emerald-400/15 rounded-lg px-3 py-3">
              <div className="text-[11px] uppercase tracking-[0.12em] text-emerald-300 font-semibold mb-1">Leitura de acesso</div>
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
                    <div className="text-txt-dim">{circle}o circulo</div>
                    <div className="text-gold font-semibold">{getSpellSpaceCost(circle)} espacos</div>
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
