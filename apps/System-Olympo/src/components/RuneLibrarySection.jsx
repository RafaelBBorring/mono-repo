import MysticLibrarySection, { getRuneGradeBadge } from './MysticLibrarySection'
import { fetchRuneRituals } from '../services/alchemyService'
import { RUNE_CATEGORIES, RUNE_GRADES } from '../data/runeFallbackRituals'
import { canLearnRune, getRuneActiveCount, getRuneProfile, getRuneSpaceCost, normalizeSelectedRune, toggleRuneActiveState } from '../utils/runeRules'

const RUNE_CIRCLE_NOTES = {
  1: 'Runas menores resolvem leitura, defesa curta e impactos simples.',
  2: 'Runas comuns já moldam combate, vínculos e mobilidade com consistência.',
  3: 'Runas pesadas de campo ou sustentação de grupo. Exigem presença real do portador.',
  4: 'Runas maiores tocam a camada épica e quase sempre pedem riscos claros.',
}

export default function RuneLibrarySection({ char, update, compact = false, wide = false }) {
  return (
    <MysticLibrarySection
      char={char}
      update={update}
      compact={compact}
      wide={wide}
      config={{
        field: 'runes',
        title: 'Runas',
        icon: '💎',
        accentClass: 'text-sky-300',
        sectionBorder: 'border-sky-400/20',
        fetchLibrary: fetchRuneRituals,
        categories: RUNE_CATEGORIES,
        getProfile: getRuneProfile,
        canLearn: canLearnRune,
        normalizeSelected: normalizeSelectedRune,
        getSpaceCost: getRuneSpaceCost,
        introText: 'Runas podem ser adotadas por qualquer personagem, mas continuam opcionais. O que muda é quanto espaço, quantas ativações simultâneas e quão longe o vínculo consegue ir.',
        sourceErrorText: 'Biblioteca de runas indisponível no banco. Exibindo catálogo local de apoio.',
        categoryPlaceholder: 'Todas as categorias',
        searchPlaceholder: 'Pesquisar por nome, runa primordial, efeito ou tag...',
        loadingText: 'Carregando biblioteca de runas...',
        emptyText: 'Nenhuma runa encontrada com esses filtros.',
        emptyInspectorTitle: 'Selecione uma runa',
        emptyInspectorText: 'O painel lateral mostra grau, círculo, limite de uso, origem primordial e contrapeso da runa.',
        itemLabelPlural: 'runa(s) selecionada(s)',
        sourceChipLabel: (item) => item.source_name || 'Runa',
        metaLines: (item) => [
          { label: 'Lei / dominio', value: item.law_name || 'Nao informado' },
        ],
        circleNotes: RUNE_CIRCLE_NOTES,
        sourceLabelText: 'Primordial',
        hiddenTagPrefixes: ['grade'],
        ruleBadges: ({ profile, selectedItems, spaceUsed }) => [
          { label: 'Vinculo', value: profile.trainingLabel, tone: 'sky' },
          { label: 'Espacos', value: `${spaceUsed}/${profile.spaceBudget}`, tone: spaceUsed >= profile.spaceBudget ? 'amber' : 'sky' },
          { label: 'Ativas', value: `${getRuneActiveCount(selectedItems)}/${profile.activeSlots}`, tone: 'purple' },
          { label: 'Circulo Maximo', value: `${profile.maxCircle}o`, tone: 'gold' },
          { label: '4o Circulo', value: profile.maxByCircle[4] || 0, tone: 'amber' },
          { label: 'Runas', value: selectedItems.length, tone: 'emerald' },
        ],
        secondaryFilter: {
          allLabel: 'Todos os graus',
          options: RUNE_GRADES.map((value) => ({ value, label: value === 'maior' ? 'Runa Maior' : value === 'comum' ? 'Runa Comum' : 'Runa Menor' })),
          getValue: (item) => getRuneGradeBadge(item)?.label === 'Runa Maior' ? 'maior' : getRuneGradeBadge(item)?.label === 'Runa Comum' ? 'comum' : 'menor',
        },
        getSecondaryBadge: getRuneGradeBadge,
        getInspectorStats: ({ item }) => [
          { label: 'Grau', value: getRuneGradeBadge(item)?.label || 'Livre', color: 'text-sky-300' },
        ],
        getSecondaryAction: ({ char, item, selectedItems, update }) => {
          const isSelected = (selectedItems || []).some((selected) => selected.id === item.id)
          if (!isSelected || !update) return null
          const current = (selectedItems || []).find((selected) => selected.id === item.id)
          return {
            label: current?.active ? 'Desativar Runa' : 'Ativar Runa',
            tone: current?.active ? 'active' : 'default',
            disabled: false,
            reason: current?.active ? 'Esta runa conta como uma das ativações simultâneas.' : '',
            onClick: () => {
              const { next, gate } = toggleRuneActiveState(char, selectedItems, item.id)
              if (!gate.allowed) {
                alert(gate.reason)
                return
              }
              update({ runes: next })
            },
          }
        },
        renderSummary: ({ profile }) => (
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-3">
            <div className="bg-sky-400/5 border border-sky-400/15 rounded-lg px-3 py-3">
              <div className="text-[11px] uppercase tracking-[0.12em] text-sky-300 font-semibold mb-1">Leitura do vínculo rúnico</div>
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
                    <div className="text-gold font-semibold">{getRuneSpaceCost(circle)} espacos</div>
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
