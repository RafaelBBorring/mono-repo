import { ATTRIBUTES, ATTR_LABELS, ATTR_ICONS, MODIFIER_TABLE, getModifier, ATTR_CAPS, getAttrCap } from '../data/attributes'
import { CLASSES } from '../data/classes'
import { PROGRESSION } from '../data/progression'
import { TRIAGES } from '../data/triages'
import { PERICIAS, GRAU_NAMES, GRAUS_BY_TIER } from '../data/pericias'
import { ALL_MODULES, MODULES_PASSIVE, MODULES_SPECIAL, MODULES_ACTIVE } from '../data/modules'
import { WEAPONS, WEAPON_RANKS, WEAPON_ABILITY_COST, RANK_LEVEL_BAND, WEAPON_LIMITS, MARTIAL_ARTS_LIMITS, LEGENDARY_WEAPONS, WEAPON_POWER_LEVELS } from '../data/weapons'
import { MARTIAL_ARTS, GRAU_LABELS as MA_GRAU_LABELS } from '../data/martialArts'
import { RACES, RACE_CATEGORIES, getAttrBonusText } from '../data/races'
import { ALCHEMY_FALLBACK_RITUALS } from '../data/alchemyFallbackRituals'
import { SPELL_FALLBACK_RITUALS, SPELL_TRADITIONS } from '../data/spellFallbackRituals'
import { RUNE_FALLBACK_RITUALS, RUNE_GRADES } from '../data/runeFallbackRituals'
import { ALCHEMY_TRAINING_RULES, BASE_RULES_BY_LEVEL, CLASS_AFFINITY, RACE_AFFINITY, SPACE_COST_BY_CIRCLE } from '../utils/alchemyRules'
import { fetchMysticWeapons } from '../services/alchemyService'
import { SPELL_TRAINING_RULES } from '../utils/spellRules'
import { RUNE_TRAINING_RULES } from '../utils/runeRules'
import { getRuneGradeBadge, getTraditionBadge } from './MysticLibrarySection'
import { normalizeProgressionLabel } from '../utils/progressionUtils'
import { ARMOR_ABSORPTION_HARD_CAP, ARMOR_ABSORPTION_SOFT_CAP, ARMOR_TYPES, ARMOR_SLOTS, EQUIPMENT_RARITIES, EQUIPMENT_TYPES, EQUIPMENT_STAT_LABELS, SIMPLE_ITEMS } from '../data/equipment'
import { SYSTEM_SKILLS, SYSTEM_SKILL_CATEGORIES, EFFECT_PARAM_DEFS } from '../data/systemSkills'
import { useState, useMemo, useEffect, useRef } from 'react'

const SECTION_CATEGORIES = [
  {
    id: 'quickref',
    label: 'Referência Rápida',
    icon: '⚡',
    color: 'text-amber-300 border-amber-300/30 bg-amber-300/5',
    activeColor: 'bg-amber-300 text-void',
    sections: ['Fórmulas Rápidas', 'Regras de Combate'],
  },
  {
    id: 'character',
    label: 'Personagem',
    icon: '👤',
    color: 'text-sky-400 border-sky-400/30 bg-sky-400/5',
    activeColor: 'bg-sky-400 text-void',
    sections: ['Raças', 'Atributos', 'Classes', 'Progressão', 'Perícias', 'Criação de Personagem'],
  },
  {
    id: 'combat',
    label: 'Combate & Habilidades',
    icon: '⚔️',
    color: 'text-red-400 border-red-400/30 bg-red-400/5',
    activeColor: 'bg-red-400 text-white',
    sections: ['Triagens', 'Módulos Passivos', 'Módulos Especiais', 'Módulos Ativos'],
  },
  {
    id: 'equipment',
    label: 'Equipamento',
    icon: '🛡️',
    color: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5',
    activeColor: 'bg-emerald-400 text-void',
    sections: ['Armas', 'Ranks de Arma', 'Equipamentos', 'Limites de Equipamento', 'Armas Lendárias', 'Artes Marciais', 'Durabilidade', 'Criação & Forja'],
  },
  {
    id: 'magic',
    label: 'Magia & Conhecimento',
    icon: '✨',
    color: 'text-purple-400 border-purple-400/30 bg-purple-400/5',
    activeColor: 'bg-purple-400 text-white',
    sections: ['Alquimia', 'Feitiços', 'Runas', 'Grimórios', 'Hierarquia Mística'],
  },
  {
    id: 'system',
    label: 'Sistema',
    icon: '⚙️',
    color: 'text-gold border-gold/30 bg-gold/5',
    activeColor: 'bg-gold text-void',
    sections: ['Balanceamento', 'Skills Sistemicas'],
  },
]

const ALL_SECTIONS = SECTION_CATEGORIES.flatMap(c => c.sections)

const SECTION_VERSIONS = {
  'Fórmulas Rápidas': 'v2.1 — Mai 2026',
  'Regras de Combate': 'v2.1 — Mai 2026',
  'Raças': 'v2.0',
  'Atributos': 'v2.0',
  'Classes': 'v2.0',
  'Progressão': 'v2.0',
  'Perícias': 'v2.1 — Mai 2026',
  'Triagens': 'v2.1 — Mai 2026',
  'Módulos Passivos': 'v2.0',
  'Módulos Especiais': 'v2.0',
  'Módulos Ativos': 'v2.0',
  'Armas': 'v2.0',
  'Ranks de Arma': 'v2.0',
  'Equipamentos': 'v2.1 — Mai 2026',
  'Limites de Equipamento': 'v2.0',
  'Durabilidade': 'v2.1 — Mai 2026',
  'Criação & Forja': 'v2.1 — Mai 2026',
  'Armas Lendárias': 'v2.0',
  'Artes Marciais': 'v2.0',
  'Alquimia': 'v2.0',
  'Feitiços': 'v2.0',
  'Runas': 'v2.0',
  'Grimórios': 'v2.0',
  'Hierarquia Mística': 'v2.1 — Jun 2026',
  'Criação de Personagem': 'v2.0',
  'Balanceamento': 'v2.0',
  'Skills Sistemicas': 'v2.2 - Mai 2026',
}

const CATEGORY_DESCRIPTIONS = {
  quickref: 'Fórmulas, regras de combate e referência rápida para consultas durante a sessão.',
  character: 'Raças, atributos, classes, progressão e criação de personagem.',
  combat: 'Triagens e módulos que definem o estilo de combate do personagem.',
  equipment: 'Armas, armaduras, categorias de set e artes marciais.',
  magic: 'Alquimia, feitiços, runas, grimórios e hierarquia mística — todo conhecimento místico.',
  system: 'Protocolo de balanceamento SCP/TDH e calibração de poder.',
}

function getSectionCategory(sectionId) {
  return SECTION_CATEGORIES.find(c => c.sections.includes(sectionId))
}

export default function ReferencePage() {
  const [section, setSection] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCategory, setExpandedCategory] = useState('quickref')
  const [fadeKey, setFadeKey] = useState(0)
  const contentRef = useRef(null)

  const category = section ? getSectionCategory(section) : null

  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return null
    const term = searchTerm.toLowerCase()
    const keywords = {
      'Fórmulas Rápidas': ['formula', 'ca', 'classe armadura', 'vida', 'energia', 'reacoes', 'percepcao', 'carga', 'capacidade', 'dano base', 'economia'],
      'Regras de Combate': ['combate', 'morrendo', 'morte', 'dying', 'medicina', 'kit medico', 'cura', 'estabilizar', 'inconsciente', 'turno', 'acao', 'reacao', 'movimento', 'iniciativa', 'critico', 'condicao'],
      'Raças': ['raca', 'race', 'humano', 'elfo', 'anao', 'bruxa', 'vampiro', 'lobisomem', 'dasariano', 'fae', 'semideus'],
      'Atributos': ['atributo', 'for', 'des', 'con', 'int', 'apa', 'am', 'forca', 'destreza', 'constituicao', 'inteligencia', 'aparencia', 'abilidade mental', 'modificador'],
      'Classes': ['classe', 'guerreiro', 'operativo', 'mistico', 'class'],
      'Progressão': ['progressao', 'nivel', 'level', 'peh', 'evolucao'],
      'Perícias': ['pericia', 'skill', 'treinamento', 'grau', 'bloqueio', 'reflexo', 'percepcao', 'medicina', 'tecnologia', 'furtividade', 'lutar', 'pontaria', 'alquimia', 'conhecimento', 'dirigir', 'fortitude', 'intimidar', 'investigacao', 'pilotar', 'persuasao', 'poder', 'contra-ataque', 'atletismo', 'crime', 'vontade', 'estabilizar', 'kit medico', 'cura', 'diagnostico', 'veneno', 'escalar', 'arrombar', 'esconder', 'esquivar', 'coagir', 'convencer', 'diagnosticar'],
      'Triagens': ['triagem', 'tank', 'assassino', 'combate', 'atirador', 'tecnico', 'graduado', 'intuitivo', 'suporte'],
      'Módulos Passivos': ['modulo', 'passivo', 'module'],
      'Módulos Especiais': ['modulo', 'especial', 'module'],
      'Módulos Ativos': ['modulo', 'ativo', 'module'],
      'Armas': ['arma', 'weapon', 'dano', 'machado', 'espada', 'rifle', 'pistola', 'escopeta'],
      'Ranks de Arma': ['rank', 'patente', 'comum', 'incomum', 'raro', 'epico', 'heroico', 'ancestral', 'mitico', 'transcendente'],
      'Equipamentos': ['equipamento', 'equipment', 'armadura', 'peitoral', 'elmo', 'calca', 'bota', 'categoria', 'set', 'bonus', 'guerreiro', 'furtivo', 'medico', 'tecnologico', 'demolidor', 'exploracao', 'escudo', 'durabilidade'],
      'Limites de Equipamento': ['limite', 'equipamento', 'rank maximo'],
      'Durabilidade': ['durabilidade', 'quebrar', 'reparo', 'consertar', 'ferraria', 'repair', 'broken', 'desgaste'],
      'Criação & Forja': ['criacao', 'forja', 'crafting', 'craft', 'criar equipamento', 'materia prima', 'ferraria', 'forjar'],
      'Armas Lendárias': ['lendario', 'legendary', 'forja'],
      'Artes Marciais': ['arte marcial', 'boxe', 'karate', 'muay thai', 'judo', 'taekwondo', 'aikido', 'desarmado'],
      'Alquimia': ['alquimia', 'alchemy', 'ritual', 'circulo', 'reagente', 'veu', 'abismo'],
      'Feitiços': ['feitico', 'spell', 'bruxaria', 'arcana', 'magia', 'conjuracao'],
      'Runas': ['runa', 'rune', 'selo', 'menor', 'comum', 'maior'],
      'Grimórios': ['grimorio', 'grimoire', 'tom', 'livro'],
      'Hierarquia Mística': ['hierarquia', 'comparacao', 'ritual vs feitico', 'magia vs feitico', 'conhecimento', 'circulo', 'diferenca'],
      'Criação de Personagem': ['criacao', 'criar', 'personagem', 'guia', 'passo a passo'],
      'Balanceamento': ['balanceamento', 'balance', 'scp', 'tdh', 'pp', 'ipl', 'calibracao', 'protocolo'],
      'Skills Sistemicas': ['skill', 'skills', 'sistemica', 'passiva', 'pendencia', 'mestre', 'forja', 'hefesto', 'zeus', 'esqueleto'],
    }
    return ALL_SECTIONS.filter(s => {
      const kws = keywords[s] || []
      return s.toLowerCase().includes(term) || kws.some(k => k.includes(term) || term.includes(k))
    })
  }, [searchTerm])

  const handleSectionClick = (s) => {
    setSection(s)
    setSearchTerm('')
    setFadeKey(k => k + 1)
    const cat = getSectionCategory(s)
    if (cat) setExpandedCategory(cat.id)
  }

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTo({ top: 0, behavior: 'smooth' })
  }, [section, fadeKey])

  const showHome = section === null

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="section-header text-primary mb-6 justify-center">
        <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>menu_book</span>
        Referência do Sistema Olympo 2.0
      </div>

      <div className="mb-6 max-w-xl mx-auto">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-txt-dim text-lg" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>search</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar seção (ex: carga, morrendo, CA, equipamento...)"
            className="w-full bg-void border border-sep rounded-lg pl-10 pr-4 py-2.5 text-sm text-txt-main placeholder:text-txt-dim/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-txt-dim hover:text-txt-main text-xs">✕</button>
          )}
        </div>
        {searchResults && searchResults.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {searchResults.map(s => {
              const cat = getSectionCategory(s)
              return (
                <button key={s} onClick={() => handleSectionClick(s)}
                  className="px-3 py-1 rounded text-xs font-medium border border-primary/40 text-primary hover:bg-primary hover:text-on-primary transition-colors">
                  {cat?.icon} {s}
                </button>
              )
            })}
          </div>
        )}
        {searchResults && searchResults.length === 0 && (
          <p className="text-txt-dim text-xs mt-2 text-center">Nenhuma seção encontrada para "{searchTerm}"</p>
        )}
      </div>

      <div className="flex gap-4">
        <nav className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-20 space-y-1">
            <button onClick={() => setSection(null)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors mb-1 ${showHome ? 'text-gold bg-gold/10 border border-gold/20' : 'text-txt-dim hover:text-txt-main hover:bg-void/40'}`}>
              <span>🏠</span>
              <span>Painel Inicial</span>
            </button>
            {SECTION_CATEGORIES.map(cat => (
              <div key={cat.id}>
                <button
                  onClick={() => { setExpandedCategory(cat.id); if (!cat.sections.includes(section)) setSection(cat.sections[0]) }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${expandedCategory === cat.id && !showHome ? cat.color : 'text-txt-dim hover:text-txt-main hover:bg-void/40'}`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
                {expandedCategory === cat.id && !showHome && (
                  <div className="ml-3 pl-3 border-l border-sep/30 space-y-0.5 mt-1 mb-2">
                    {cat.sections.map(s => (
                      <button key={s} onClick={() => handleSectionClick(s)}
                        className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${section === s ? 'text-primary font-semibold bg-primary/10' : 'text-txt-dim hover:text-txt-main hover:bg-void/30'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>

        <div className="flex-1 min-w-0" ref={contentRef}>
          <div className="lg:hidden flex flex-wrap gap-1.5 mb-4">
            <button onClick={() => setSection(null)}
              className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors ${showHome ? 'bg-gold text-void border-gold' : 'text-txt-dim border-sep/30 hover:border-gold/30'}`}>
              🏠 Início
            </button>
            {SECTION_CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => { setExpandedCategory(cat.id); if (!cat.sections.includes(section)) handleSectionClick(cat.sections[0]) }}
                className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors ${category?.id === cat.id && !showHome ? cat.activeColor : 'text-txt-dim border-sep/30 hover:border-primary/30'}`}>
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
          <div className="lg:hidden flex flex-wrap gap-1 mb-4">
            {(category?.sections || []).map(s => (
              <button key={s} onClick={() => handleSectionClick(s)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${section === s ? 'bg-primary text-on-primary' : 'border border-outline/30 text-on-surface-variant hover:border-primary hover:text-primary'}`}>
                {s}
              </button>
            ))}
          </div>

          {showHome ? (
            <div>
              <div className="text-center mb-8">
                <h1 className="font-cinzel text-primary text-2xl tracking-wider mb-2">Livro de Regras</h1>
                <p className="text-txt-dim text-sm max-w-lg mx-auto">Selecione uma categoria para explorar as regras do Sistema Olympo, ou use a busca acima para encontrar informações específicas.</p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {SECTION_CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => handleSectionClick(cat.sections[0])}
                    className={`group rounded-xl border p-5 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/5 ${cat.color}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">{cat.icon}</span>
                      <div>
                        <h3 className={`font-cinzel text-base font-bold ${cat.color.split(' ')[0]}`}>{cat.label}</h3>
                        <span className="text-txt-dim text-[10px]">{cat.sections.length} seções</span>
                      </div>
                    </div>
                    <p className="text-txt-dim text-xs leading-relaxed mb-3">{CATEGORY_DESCRIPTIONS[cat.id]}</p>
                    <div className="flex flex-wrap gap-1">
                      {cat.sections.map(s => (
                        <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-void/40 text-txt-dim border border-sep/20 group-hover:border-primary/20 group-hover:text-primary/80 transition-colors">{s}</span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div key={fadeKey} className="animate-[fadeIn_0.2s_ease-out]">
              <div className="sticky top-16 z-10 -mx-6 px-6 py-3 mb-4 bg-background/90 backdrop-blur-md border-b border-sep/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{category?.icon}</span>
                    <h2 className="font-cinzel text-primary text-lg tracking-wider">{section}</h2>
                  </div>
                  <span className="text-txt-dim/50 text-[10px] font-mono">{SECTION_VERSIONS[section] || 'v2.0'}</span>
                </div>
              </div>
              <div className="codex-card p-6">
                {section === 'Fórmulas Rápidas' && <QuickFormulasSection />}
                {section === 'Regras de Combate' && <CombatRulesSection />}
                {section === 'Raças' && <RacasSection />}
                {section === 'Atributos' && <AttributesSection />}
                {section === 'Classes' && <ClassesSection />}
                {section === 'Progressão' && <ProgressionSection />}
                {section === 'Perícias' && <PericiasSection />}
                {section === 'Triagens' && <TriagesSection />}
                {section === 'Módulos Passivos' && <ModulesSection items={MODULES_PASSIVE} title="Módulos Passivos" />}
                {section === 'Módulos Especiais' && <ModulesSection items={MODULES_SPECIAL} title="Módulos Especiais" special />}
                {section === 'Módulos Ativos' && <ModulesSection items={MODULES_ACTIVE} title="Módulos Ativos" active />}
                {section === 'Armas' && <WeaponsSection />}
                {section === 'Ranks de Arma' && <RanksSection />}
                {section === 'Limites de Equipamento' && <EquipLimitsSection />}
                {section === 'Durabilidade' && <DurabilitySection />}
                {section === 'Criação & Forja' && <CraftingSection />}
                {section === 'Equipamentos' && <EquipmentSection />}
                {section === 'Armas Lendárias' && <LegendaryWeaponsSection />}
                {section === 'Artes Marciais' && <MartialArtsSection />}
                {section === 'Alquimia' && <AlchemySection />}
                {section === 'Feitiços' && <SpellsSection />}
                {section === 'Runas' && <RunesSection />}
                {section === 'Grimórios' && <GrimoriosSection />}
                {section === 'Hierarquia Mística' && <MysticHierarchySection />}
                {section === 'Criação de Personagem' && <CreationGuideSection />}
                {section === 'Balanceamento' && <BalanceProtocolSection />}
                {section === 'Skills Sistemicas' && <SystemSkillsRulesSection />}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function RacasSection() {
  const [cat, setCat] = useState('all')
  const [expanded, setExpanded] = useState(null)

  const filtered = cat === 'all'
    ? Object.values(RACES)
    : Object.values(RACES).filter(r => r.category === cat)

  return (
    <div>
      <SectionTitle>Raças</SectionTitle>
      <p className="text-txt-dim text-sm mb-4">
        Cada raça oferece bônus de Camada 0, passivas raciais com valores mecânicos concretos, vantagens e desvantagens. A evolução separa poder (nível) de experiência (marcos narrativos).
      </p>

      <div className="mb-4 bg-void rounded-lg border border-sep p-4">
        <p className="text-gold text-xs font-semibold mb-2">Camada 0 — Bônus Raciais Inatos</p>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="bg-deep rounded-lg border border-sep/50 p-3">
            <span className="text-txt-dim">Bônus de Atributos</span>
            <div className="text-sky-400 font-mono mt-1">+/- direto em atributos base</div>
          </div>
          <div className="bg-deep rounded-lg border border-sep/50 p-3">
            <span className="text-txt-dim">Modificador de Vida</span>
            <div className="text-emerald-400 font-mono mt-1">+/- HP fixo na criação</div>
          </div>
          <div className="bg-deep rounded-lg border border-sep/50 p-3">
            <span className="text-txt-dim">Passivas Raciais</span>
            <div className="text-amber-300 font-mono mt-1">Habilidades com custo, dano e duração</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setCat('all')}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${cat === 'all' ? 'bg-gold text-void' : 'border border-sep text-txt-dim hover:border-gold hover:text-gold'}`}>
          Todas ({Object.keys(RACES).length})
        </button>
        {RACE_CATEGORIES.map(c => {
          const count = Object.values(RACES).filter(r => r.category === c.id).length
          return (
            <button key={c.id} onClick={() => setCat(c.id)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${cat === c.id ? `${c.title} ${c.color} border ${c.color.split(' ')[0]}` : 'border border-sep text-txt-dim hover:border-gold hover:text-gold'}`}>
              {c.label} ({count})
            </button>
          )
        })}
      </div>

      <div className="space-y-3">
        {filtered.map(race => {
          const isExpanded = expanded === race.id
          const catMeta = RACE_CATEGORIES.find(c => c.id === race.category) || RACE_CATEGORIES[0]
          return (
            <div key={race.id} className={`rounded-xl border ${catMeta.color} overflow-hidden`}>
              <button type="button" onClick={() => setExpanded(isExpanded ? null : race.id)}
                className="w-full px-5 py-3 flex items-center gap-4 text-left hover:bg-gold/[0.035] transition-colors">
                <span className="text-2xl shrink-0">{race.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-cinzel text-lg ${catMeta.title}`}>{race.name}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded border ${catMeta.badge}`}>{catMeta.label}</span>
                    <span className="text-txt-dim text-[11px] ml-1">{'⭐'.repeat(race.dificuldade || 1)}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-0.5 text-xs">
                    <span className="text-txt-dim">HP: <span className={race.layer0.hpMod >= 0 ? 'text-emerald-400' : 'text-red-400'}>{race.layer0.hpLabel || `${race.layer0.hpMod >= 0 ? '+' : ''}${race.layer0.hpMod}`}</span></span>
                    <span className="text-txt-dim">Atr: <span className="text-sky-400">{getAttrBonusText(race)}</span></span>
                    <span className="text-txt-dim">Passivas: <span className="text-amber-300">{race.passivasRaciais?.length || 0}</span></span>
                  </div>
                </div>
                <span className="text-txt-dim/40 text-sm shrink-0">{isExpanded ? '▲' : '▼'}</span>
              </button>

              {isExpanded && (
                <div className="px-5 pb-4 border-t border-sep/30 space-y-4">
                  <div className="pt-3">
                    <p className="text-txt-dim text-xs italic">{race.quote}</p>
                    <p className="text-txt-dim text-xs mt-2">{race.desc}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-void/60 rounded-lg p-3 border border-sep/30">
                      <div className="text-gold text-[11px] font-semibold mb-2 uppercase tracking-wider">Camada 0</div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-txt-dim">Atributos</span>
                          <span className="text-sky-400 font-mono">{getAttrBonusText(race)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-txt-dim">Vida</span>
                          <span className={`font-mono ${race.layer0.hpMod >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{race.layer0.hpLabel || `${race.layer0.hpMod >= 0 ? '+' : ''}${race.layer0.hpMod}`}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-void/60 rounded-lg p-3 border border-sep/30">
                      <div className="text-emerald-400 text-[11px] font-semibold mb-2 uppercase tracking-wider">Vantagens ({race.vantagens.length})</div>
                      <ul className="space-y-1">
                        {race.vantagens.map((v, i) => (
                          <li key={i} className="text-[11px] text-txt-dim flex gap-1.5">
                            <span className="text-emerald-400/60 shrink-0">+</span>
                            <span>{v}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-void/60 rounded-lg p-3 border border-red-400/15">
                      <div className="text-red-400 text-[11px] font-semibold mb-2 uppercase tracking-wider">Desvantagens ({race.desvantagens.length})</div>
                      <ul className="space-y-1">
                        {race.desvantagens.map((d, i) => (
                          <li key={i} className="text-[11px] text-txt-dim flex gap-1.5">
                            <span className="text-red-400/60 shrink-0">-</span>
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {race.passivasRaciais?.length > 0 && (
                    <div className="bg-void/60 rounded-lg p-4 border border-amber-300/15">
                      <div className="text-amber-300 text-[11px] font-semibold mb-3 uppercase tracking-wider">Passivas Raciais — Habilidades Inatas com Valores Mecânicos</div>
                      <div className="space-y-3">
                        {race.passivasRaciais.map((pr, i) => (
                          <div key={i} className="bg-deep rounded-lg p-3 border border-sep/40">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${pr.tipo === 'Ativa' ? 'bg-amber-300/15 text-amber-300 border border-amber-300/20' : 'bg-emerald-400/15 text-emerald-400 border border-emerald-400/20'}`}>
                                {pr.tipo}
                              </span>
                              <span className="text-txt-main font-semibold">{pr.nome}</span>
                            </div>
                            <p className="text-txt-main text-xs leading-relaxed">{pr.efeito}</p>
                            <div className="flex gap-4 mt-1.5 text-[11px]">
                              {pr.custo && <span className="text-txt-dim">Custo: <span className="text-amber-300">{pr.custo}</span></span>}
                              {pr.duracao && <span className="text-txt-dim">Duração: <span className="text-sky-400">{pr.duracao}</span></span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {race.layer0.requiresDeus && race.deuses && (
                    <div className="bg-void/60 rounded-lg p-4 border border-amber-300/20">
                      <div className="text-amber-300 text-[11px] font-semibold mb-3 uppercase tracking-wider">Deuses Possíveis — Linhagem do Semideus</div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-sep/40">
                              <th className="py-2 px-3 text-left text-txt-dim font-medium">Deus</th>
                              <th className="py-2 px-3 text-left text-txt-dim font-medium">Atributos</th>
                              <th className="py-2 px-3 text-left text-txt-dim font-medium">Traço Inato</th>
                              <th className="py-2 px-3 text-left text-txt-dim font-medium">Bônus Especial</th>
                            </tr>
                          </thead>
                          <tbody>
                            {race.deuses.map(d => (
                              <tr key={d.id} className="border-b border-sep/20 hover:bg-void/40">
                                <td className="py-2 px-3 font-cinzel text-amber-300 font-bold">{d.name}</td>
                                <td className="py-2 px-3 font-mono text-sky-400 text-[11px]">{Object.entries(d.attr).map(([a, v]) => `${v >= 0 ? '+' : ''}${v}${a}`).join(' ')}</td>
                                <td className="py-2 px-3 text-txt-main text-[11px]">{d.traco}</td>
                                <td className="py-2 px-3 text-txt-dim text-[11px]">{d.especial}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {race.formas && (
                    <div className="bg-void/60 rounded-lg p-4 border border-amber-300/20">
                      <div className="text-amber-300 text-[11px] font-semibold mb-3 uppercase tracking-wider">Formas Disponíveis (Dasariano)</div>
                      <div className="grid grid-cols-3 gap-3">
                        {race.formas.map((f, i) => (
                          <div key={i} className="bg-deep rounded-lg p-3 border border-sep/40">
                            <span className="font-semibold text-amber-300 text-sm">{f.nome}</span>
                            {Object.keys(f.attrBonus).length > 0 && (
                              <div className="text-sky-400 font-mono text-[11px] mt-1">{Object.entries(f.attrBonus).map(([a, v]) => `${v >= 0 ? '+' : ''}${v}${a}`).join(' ')}</div>
                            )}
                            {f.hpExtra > 0 && <span className="text-emerald-400 font-mono text-[11px] ml-2">+{f.hpExtra} HP</span>}
                            {f.garras && <span className="text-red-400 font-mono text-[11px] ml-2">Garras {f.garras}</span>}
                            <p className="text-txt-dim text-[11px] mt-1">{f.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-void/60 rounded-lg p-4 border border-sep/30">
                      <div className="text-gold text-[11px] font-semibold mb-3 uppercase tracking-wider">Evolução de Poder (por Nível)</div>
                      <div className="space-y-1.5">
                        {race.progressaoPoder.map((p, i) => (
                          <div key={i} className="flex gap-3 items-start text-xs py-1">
                            <span className="shrink-0 w-12 text-center font-mono font-bold rounded px-1.5 py-0.5 text-[10px] bg-gold/10 text-gold border border-gold/20">N{p.nivel}</span>
                            <div className="flex-1">
                              <span className="text-txt-main font-semibold">{p.ganho}</span>
                              <span className="text-txt-dim ml-1">— {p.desc}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {race.marcosExperiencia?.length > 0 && (
                      <div className="bg-void/60 rounded-lg p-4 border border-purple-400/15">
                        <div className="text-purple-400 text-[11px] font-semibold mb-3 uppercase tracking-wider">Marcos de Experiência (conquistas narrativas)</div>
                        <div className="space-y-1.5">
                          {race.marcosExperiencia.map((item, i) =>
                            item.marcos ? (
                              <div key={i} className="space-y-1.5">
                                <div className="flex items-center gap-2 text-xs py-1">
                                  <span className="shrink-0 w-4 text-center text-purple-400 text-sm">◆</span>
                                  <span className="text-purple-300 font-cinzel font-bold">{item.titulo}</span>
                                  <span className="text-txt-dim text-[10px]">— {item.desc}</span>
                                </div>
                                {item.marcos.map((m, j) => (
                                  <div key={j} className="flex gap-3 items-start text-xs py-1 pl-5">
                                    <span className="shrink-0 w-4 text-center text-purple-400/60 text-xs">◇</span>
                                    <div className="flex-1">
                                      <span className="text-txt-main font-semibold">{m.marco}</span>
                                      <span className="text-emerald-400 ml-1">→ {m.ganho}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div key={i} className="flex gap-3 items-start text-xs py-1">
                                <span className="shrink-0 w-4 text-center text-purple-400 text-sm">◆</span>
                                <div className="flex-1">
                                  <span className="text-txt-main font-semibold">{item.marco}</span>
                                  <span className="text-emerald-400 ml-1">→ {item.ganho}</span>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getDiffStars(n) {
  return '⭐'.repeat(n || 1)
}

function SectionTitle({ children }) {
  return <h2 className="font-cinzel text-primary text-2xl mb-4 tracking-wider">{children}</h2>
}

function FormulaCard({ label, formula, desc, color = 'gold' }) {
  const colors = {
    gold: 'border-gold/20 bg-gold/5',
    emerald: 'border-emerald-400/20 bg-emerald-400/5',
    sky: 'border-sky-400/20 bg-sky-400/5',
    red: 'border-red-400/20 bg-red-400/5',
    purple: 'border-purple-400/20 bg-purple-400/5',
    amber: 'border-amber-300/20 bg-amber-300/5',
    cyan: 'border-cyan-400/20 bg-cyan-400/5',
  }
  return (
    <div className={`rounded-lg border p-3 ${colors[color] || colors.gold}`}>
      <div className="text-txt-dim text-xs mb-1">{label}</div>
      <div className="text-txt-main font-mono text-sm font-semibold">{formula}</div>
      {desc && <p className="text-txt-dim text-[11px] mt-1">{desc}</p>}
    </div>
  )
}

function QuickFormulasSection() {
  return (
    <div className="space-y-6">
      <SectionTitle>Fórmulas Rápidas</SectionTitle>
      <p className="text-txt-dim text-sm mb-4">
        Todas as fórmulas de cálculo do sistema em um só lugar. Use como referência durante a criação de personagem ou sessão.
      </p>

      <div className="bg-void rounded-xl border border-gold/20 p-4">
        <h3 className="text-gold text-sm font-semibold mb-3">Combate</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <FormulaCard label="Classe de Armadura (CA)" formula="10 + treino(Reflexo ou Bloqueio) + MAX(Mod.CON, Mod.DES) + bônus sistêmicos" desc="Tank 0.3, Skills e marcos raciais podem somar CA/armadura natural." color="red" />
          <FormulaCard label="Reações" formula="⌊DES ÷ 5⌋ (mínimo 1)" desc="DES = valor final do atributo" color="amber" />
          <FormulaCard label="Percepção Passiva" formula="10 + treino(Percepção) + Mod.INT" desc="Percepção passiva é o mínimo que o personagem percebe sem teste" color="cyan" />
          <FormulaCard label="Dano Base" formula="Dado de classe + modificador da classe + triagens + Skills + raça" desc="Combate, Atirador, Técnico, Skills e marcos raciais aparecem como parcelas visíveis." color="red" />
          <FormulaCard label="Modificador de Atributo" formula="⌊(valor − 10) ÷ 2⌋" desc="Consulte a tabela de modificadores em Atributos" color="gold" />
          <FormulaCard label="Armadura (Absorção)" formula="Soma das peças equipadas (caBase + raridade)" desc="Reduz CADA golpe recebido. Não é CA." color="purple" />
        </div>
      </div>

      <div className="bg-void rounded-xl border border-emerald-400/20 p-4">
        <h3 className="text-emerald-400 text-sm font-semibold mb-3">Vida & Recursos</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <FormulaCard label="Vida Total" formula="Base(CON) + [Vida/Nível × N] + Progressão + Raça + Tank + marcos concedidos" color="emerald" />
          <FormulaCard label="Vida Base (por classe)" formula="Guerreiro: 100+CON×5 | Op.: 70+CON×5 | Mist.: 50+CON×5" color="emerald" />
          <FormulaCard label="Energia Total" formula="Base(AM) + [Energia/Nível × N] + Progressão + Intuitivo + raça" desc="Intuitivo: +⌊AM×0.5⌋ × ⌊N/5⌋. Marcos concedidos também entram." color="sky" />
          <FormulaCard label="PE Total" formula="PE Base + PE/Nível × N + Progressão + Raça + marcos concedidos" desc="PE aqui é recurso de poder; Pontos de Esqueleto aparecem na progressão." color="sky" />
          <FormulaCard label="Absorção de Armadura" formula={`Soma das peças equipadas; limite ${ARMOR_ABSORPTION_HARD_CAP}`} desc={`Não é CA. Desgaste por golpe: 1 normal, 2 pesado/sobrecarga ${ARMOR_ABSORPTION_SOFT_CAP}+.`} color="purple" />
        </div>
      </div>

      <div className="bg-void rounded-xl border border-sky-400/20 p-4">
        <h3 className="text-sky-400 text-sm font-semibold mb-3">Inventário & Carga</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <FormulaCard label="Capacidade de Carga" formula="10 + (FOR × 2) + ⌊CON × 0.5⌋" desc="Módulos (Mochila Avançada +10, Forja +5, Portador Nato +8/compra) e itens especiais aumentam" color="sky" />
          <FormulaCard label="Economia Inicial" formula="5000 + (Nível − 1) × 500" desc="Em dracmas ou equivalente" color="amber" />
        </div>
      </div>

      <div className="bg-void/40 border border-sep/30 rounded-lg p-3 text-xs text-txt-dim space-y-1">
        <p className="text-primary font-semibold text-sm mb-1">Notas</p>
        <p>• Pontos de Esqueleto em CON afetam Vida retroativamente em todos os níveis.</p>
        <p>• Pontos de Esqueleto em AM afetam Energia retroativamente em todos os níveis.</p>
        <p>• Armadura de equipamento é absorção de dano (camada separada antes da Vida), não soma na CA.</p>
        <p>• Cada golpe absorvido pela armadura consome Durabilidade: 1 em leve/comum, 2 em pesado ou em sobrecarga acima de {ARMOR_ABSORPTION_SOFT_CAP} absorção.</p>
        <p>• Bônus de categoria (set) acumulam progressivamente: 2 peças ativam 2 peças, 3 peças ativam 2+3, 4 peças ativam 2+3+4.</p>
      </div>
    </div>
  )
}

function CombatRulesSection() {
  return (
    <div className="space-y-6">
      <SectionTitle>Regras de Combate</SectionTitle>
      <p className="text-txt-dim text-sm mb-4">
        Regras essenciais para resolução de combates, condições, morte e cura. Referência rápida para mesas de jogo.
      </p>

      <div className="bg-void rounded-xl border border-red-400/20 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-red-400 text-lg">💀</span>
          <h3 className="text-red-400 text-sm font-semibold">Estado de Morrendo</h3>
        </div>
        <div className="space-y-3">
          <div className="bg-deep rounded-lg border border-red-400/15 p-3">
            <div className="text-red-300 text-xs font-semibold mb-2">Quando um personagem chega a 0 Vida</div>
            <ul className="space-y-1.5 text-xs text-txt-dim">
              <li>• O personagem cai <strong className="text-red-400">Inconsciente</strong> e entra no estado <strong className="text-red-400">Morrendo</strong>.</li>
              <li>• No início de cada turno do personagem, faça um <strong className="text-txt-main">Teste de Morte</strong>: jogue 1d20.</li>
              <li>• <span className="text-emerald-400 font-semibold">10 ou mais:</span> 1 Sucesso. Acumule 3 sucessos → personagem estabiliza com 1 PV.</li>
              <li>• <span className="text-red-400 font-semibold">9 ou menos:</span> 1 Falha. Acumule 3 falhas → personagem morre.</li>
              <li>• <span className="text-amber-300 font-semibold">20 natural:</span> Recupera 1 PV e desperta imediatamente.</li>
              <li>• <span className="text-red-400 font-semibold">1 natural:</span> Conta como 2 falhas.</li>
            </ul>
          </div>
          <div className="bg-deep rounded-lg border border-red-400/15 p-3">
            <div className="text-amber-300 text-xs font-semibold mb-2">Sofrendo dano enquanto Morrendo</div>
            <ul className="space-y-1 text-xs text-txt-dim">
              <li>• Qualquer dano sofrido conta como 1 falha adicional no Teste de Morte.</li>
              <li>• Um ataque crítico sofrido conta como 2 falhas.</li>
              <li>• Dano que exceda o máximo de Vida do personagem causa morte instantânea (sem testes).</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-void rounded-xl border border-emerald-400/20 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-emerald-400 text-lg">🏥</span>
          <h3 className="text-emerald-400 text-sm font-semibold">Cura & Estabilização</h3>
        </div>
        <div className="space-y-3">
          <div className="bg-deep rounded-lg border border-emerald-400/15 p-3">
            <div className="text-emerald-300 text-xs font-semibold mb-2">Estabilizar um aliado Morrendo</div>
            <ul className="space-y-1.5 text-xs text-txt-dim">
              <li>• <strong className="text-txt-main">Kit Médico Portátil:</strong> Consome 1 uso (de 3). Restaura 1d8 + Mod.INT Vida. Pode ser usado em aliados morrendo sem teste.</li>
              <li>• <strong className="text-txt-main">Teste de Medicina:</strong> CD 15 + Nível do alvo ÷ 2 (arredondado para baixo). Sucesso estabiliza com 1 PV. Falha desperdiça a ação.</li>
              <li>• <strong className="text-txt-main">Habilidade de Cura:</strong> Funciona normalmente em aliados morrendo, mas restaura no máximo 30% da Vida máxima do alvo.</li>
              <li>• <strong className="text-txt-main">Sem tratamento:</strong> O personagem continua fazendo Testes de Morte até estabilizar (3 sucessos) ou morrer (3 falhas).</li>
            </ul>
          </div>
          <div className="bg-deep rounded-lg border border-emerald-400/15 p-3">
            <div className="text-emerald-300 text-xs font-semibold mb-2">Regras de Cura Geral</div>
            <ul className="space-y-1.5 text-xs text-txt-dim">
              <li>• Cura via habilidade: máximo 30% da vida máxima por uso individual; máximo 20% em área.</li>
              <li>• Curas de item/equipamento: 1d8 + Mod.INT (Kit Médico), mais bônus de categoria Médico.</li>
              <li>• Vida Temporária de equipamento não pode exceder a Vida Máxima. Vida Temp acima do máximo é perdida.</li>
              <li>• Cura não empilha Vida Temporária — apenas a maior fonte aplica.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-void rounded-xl border border-amber-300/20 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-amber-300 text-lg">🎯</span>
          <h3 className="text-amber-300 text-sm font-semibold">Ações em Combate</h3>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { tipo: 'Padrão', desc: 'Atacar, usar habilidade, interagir com objeto, testes de perícia ativos.' },
            { tipo: 'Movimento', desc: 'Deslocamento até o limite de velocidade. Pode ser dividido antes/depois da ação.' },
            { tipo: 'Bônus', desc: 'Concedida por triagens, módulos ou habilidades específicas. Não pode ser trocada por ação padrão.' },
            { tipo: 'Reação', desc: 'Resposta a evento (ataque de oportunidade, bloqueio, contra-ataque). Limite = Reações por turno.' },
            { tipo: 'Livre', desc: 'Falar, largar item, observar. O Mestre determina o que conta como livre.' },
            { tipo: 'Completa', desc: 'Usa ação padrão + movimento para efeitos poderosos (correr, focar ataque, etc.).' },
          ].map((a, i) => (
            <div key={i} className="bg-deep rounded-lg border border-amber-300/15 p-3">
              <div className="text-amber-200 text-xs font-semibold mb-1">{a.tipo}</div>
              <p className="text-txt-dim text-[11px]">{a.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-void rounded-xl border border-purple-400/20 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-purple-400 text-lg">⚡</span>
          <h3 className="text-purple-400 text-sm font-semibold">Condições</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {[
            { nome: 'Inconsciente', efeito: 'Não pode agir ou reagir. Perde percepção passiva. CA = 10 (sem modificadores).' },
            { nome: 'Atordoado', efeito: 'Não pode agir ou reagir por 1 turno. Ataques contra têm Vantagem.' },
            { nome: 'Cego', efeito: 'Ataques têm Desvantagem. Inimigos têm Vantagem. Percepção passiva −10.' },
            { nome: 'Ensurdecido', efeito: 'Não percebe sons. Desvantagem em Percepção auditiva.' },
            { nome: 'Amedrontado', efeito: 'Desvantagem em testes e ataques enquanto a fonte estiver visível. Não pode se aproximar voluntariamente.' },
            { nome: 'Paralisado', efeito: 'Não pode agir, reagir ou se mover. Ataques corpo a corpo a ≤1m são críticos automáticos.' },
            { nome: 'Envenenado', efeito: 'Desvantagem em testes de ataque e testes de atributo.' },
            { nome: 'Quebrado (Equip.)', efeito: 'Equipamento quebrado: perde armadura, escudo e habilidades até reparo em ferraria.' },
          ].map((c, i) => (
            <div key={i} className="bg-deep rounded-lg border border-purple-400/15 p-2.5">
              <div className="text-purple-300 text-xs font-semibold">{c.nome}</div>
              <p className="text-txt-dim text-[11px] mt-0.5">{c.efeito}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-void rounded-xl border border-sky-400/20 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sky-400 text-lg">🎲</span>
          <h3 className="text-sky-400 text-sm font-semibold">Golpe Crítico & Acerto Crítico</h3>
        </div>
        <div className="space-y-2 text-xs text-txt-dim">
          <p>• <strong className="text-txt-main">Acerto Crítico (20 natural no d20):</strong> O dobro do dano é rolado (role os dados duas vezes e some modificadores uma vez).</p>
          <p>• <strong className="text-txt-main">Erro Crítico (1 natural no d20):</strong> O ataque falha automaticamente. O Mestre pode aplicar consequência narrativa (arma derrubada, abertura de guarda, etc.).</p>
          <p>• <strong className="text-txt-main">Habilidades com crítico:</strong> Seguem o mesmo padrão, mas apenas dados de dano da habilidade são dobrados (não bônus fixos).</p>
        </div>
      </div>

      <div className="bg-void/40 border border-sep/30 rounded-lg p-3 text-xs text-txt-dim space-y-1">
        <p className="text-primary font-semibold text-sm mb-1">CDs de Resistência Recomendados</p>
        <p>• <strong className="text-txt-main">N1-10:</strong> CD 14–16</p>
        <p>• <strong className="text-txt-main">N11-20:</strong> CD 18–22</p>
        <p>• <strong className="text-txt-main">N21-30:</strong> CD 22–28</p>
      </div>

      <div className="bg-void rounded-xl border border-red-400/30 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-red-400 text-lg">⚔</span>
          <h3 className="text-red-400 text-sm font-semibold">Economia de Ações — Limites Rigorosos</h3>
        </div>
        <div className="space-y-3">
          <div className="bg-deep rounded-lg border border-red-400/15 p-3">
            <div className="text-red-300 text-xs font-semibold mb-2">Regras de Acao por Turno</div>
            <ul className="space-y-1.5 text-xs text-txt-dim">
              <li>• Cada personagem tem por turno: <strong className="text-amber-300">1 Acao Padrao</strong> + <strong className="text-amber-300">1 Movimento</strong> + <strong className="text-amber-300">1 Acao Bonus</strong> (se concedida) + Reacoes.</li>
              <li>• <strong className="text-txt-main">MAXIMO de acoes de ATAQUE por turno: 2</strong> (1 padrao + 1 bonus). Independente de triagens ou modulos.</li>
              <li>• <strong className="text-txt-main">MAXIMO total de acoes por turno: 3</strong> (padrao + bonus + reacao).</li>
              <li>• Modulos que permitem "3 habilidades em 1 ataque" contam como <strong className="text-red-300">UMA unica acao</strong>. O dano combinado NAO pode exceder 150% do TDH da mais forte.</li>
            </ul>
          </div>
          <div className="bg-deep rounded-lg border border-red-400/15 p-3">
            <div className="text-red-300 text-xs font-semibold mb-2">Habilidades vs Conhecimentos (Rituais/Feiticos/Runas/Magias)</div>
            <ul className="space-y-1.5 text-xs text-txt-dim">
              <li>• <strong className="text-red-300">Habilidade + Conhecimento NAO podem ser usados na mesma Acao Padrao.</strong> Sao acoes SEPARADAS.</li>
              <li>• Conjurar um conhecimento SEMPRE consome a <strong className="text-amber-300">Acao Padrao</strong> daquele turno.</li>
              <li>• Na mesma rodada, um personagem pode: usar 1 habilidade (padrao) E 1 conhecimento (bonus? NAO — conhecimento usa padrao). Ou: usar 1 conhecimento (padrao) E 1 habilidade que seja Acao Bonus.</li>
              <li>• Nenhum efeito de conhecimento pode conceder acoes extras sem custo severo (40%+ da energia total).</li>
            </ul>
          </div>
          <div className="bg-deep rounded-lg border border-amber-300/15 p-3">
            <div className="text-amber-300 text-xs font-semibold mb-2">Papel dos Conhecimentos no Combate</div>
            <ul className="space-y-1.5 text-xs text-txt-dim">
              <li>• A principal forma de eficacia em combate sao as <strong className="text-txt-main">Habilidades do personagem</strong>.</li>
              <li>• Rituais, feiticos, runas e magias servem como <strong className="text-sky-300">APOIO</strong>: controle, utilidade, burst situacional.</li>
              <li>• Mesmo um Mestre Magia com 9 magias depende de suas habilidades para combate sustentado.</li>
              <li>• Um Ritual poderoso + Feitico poderoso + Habilidade poderosa na mesma rodada e <strong className="text-red-300">IMPOSSIVEL</strong> — cada um exige 1 Acao Padrao separada.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function AttributesSection() {
  return (
    <div>
      <SectionTitle>Atributos (Esqueleto)</SectionTitle>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
        {ATTRIBUTES.map(a => (
          <div key={a} className="bg-void rounded-lg p-3 text-center border border-sep">
            <div className="text-2xl">{ATTR_ICONS[a]}</div>
            <div className="text-gold font-cinzel text-sm mt-1">{a}</div>
            <div className="text-txt-dim text-xs">{ATTR_LABELS[a]}</div>
          </div>
        ))}
      </div>
      <h3 className="text-gold-light text-lg mb-2">Tabela de Modificadores</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sep text-txt-dim">
              <th className="py-2 px-3 text-left">Valor</th>
              <th className="py-2 px-3 text-left">Modificador</th>
            </tr>
          </thead>
          <tbody>
            {MODIFIER_TABLE.map((row, i) => (
              <tr key={i} className="border-b border-sep/50">
                <td className="py-1.5 px-3 font-mono text-txt-main">{row.min}–{row.max}</td>
                <td className="py-1.5 px-3 font-mono text-txt-main">{row.mod >= 0 ? '+' : ''}{row.mod}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-txt-dim text-sm mt-3">Fórmula: Math.floor((valor - 10) / 2), limitado pela tabela canônica acima.</p>

      <h3 className="text-gold-light text-lg mb-2 mt-6">Limites de Atributos por Faixa de Nível</h3>
      <p className="text-txt-dim text-sm mb-3">Após distribuir o Array + Pontos de Esqueleto, nenhum atributo pode exceder o limite da faixa.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sep text-txt-dim">
              <th className="py-2 px-3 text-left">Faixa de Nível</th>
              <th className="py-2 px-3 text-left">Limite Máx por Atributo</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(ATTR_CAPS).map(([tier, cap]) => (
              <tr key={tier} className="border-b border-sep/50">
                <td className="py-1.5 px-3 font-mono text-txt-main">N{tier}</td>
                <td className="py-1.5 px-3 font-mono text-gold">{cap}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const CLASS_META = {
  GUERREIRO: { border: 'border-red-500/40', bg: 'bg-red-500/5', title: 'text-red-400', stat: 'text-red-300', vida: '100+(CON×5)', vidaN: '8+Mod.CON', energia: '25+(AM×2)', energiaN: '2+Mod.AM', icon: '⚔️' },
  OPERATIVO:  { border: 'border-sky-500/40', bg: 'bg-sky-500/5', title: 'text-sky-400', stat: 'text-sky-300', vida: '70+(CON×5)', vidaN: '6+Mod.CON', energia: '35+(AM×2)', energiaN: '4+Mod.AM', icon: '🎯' },
  MISTICO:    { border: 'border-purple-500/40', bg: 'bg-purple-500/5', title: 'text-purple-400', stat: 'text-purple-300', vida: '50+(CON×5)', vidaN: '4+Mod.CON', energia: '50+(AM×2)', energiaN: '6+Mod.AM', icon: '✨' },
}

function StatRow({ label, value, color = 'text-txt-main' }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-sep/20 last:border-0">
      <span className="text-txt-dim text-xs">{label}</span>
      <span className={`font-mono text-xs font-medium ${color}`}>{value}</span>
    </div>
  )
}

function ClassesSection() {
  return (
    <div className="space-y-6">
      <SectionTitle>Classes</SectionTitle>
      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(CLASSES).map(([key, cls]) => {
          const meta = CLASS_META[key] || CLASS_META.GUERREIRO
          return (
            <div key={key} className={`rounded-xl border ${meta.border} ${meta.bg} overflow-hidden`}>
              <div className={`px-4 py-3 border-b ${meta.border}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{meta.icon}</span>
                  <h3 className={`font-cinzel text-xl ${meta.title}`}>{cls.name}</h3>
                </div>
                <p className="text-txt-dim text-xs">{cls.desc}</p>
              </div>
              <div className="px-4 py-3 space-y-0.5">
                <StatRow label="Vida Base" value={meta.vida} color="text-emerald-400" />
                <StatRow label="Vida / Nível" value={meta.vidaN} color="text-emerald-300" />
                <StatRow label="Energia Base" value={meta.energia} color="text-sky-400" />
                <StatRow label="Energia / Nível" value={meta.energiaN} color="text-sky-300" />
                <StatRow label="PE Base" value={String(cls.peBase)} color="text-blue-400" />
                <StatRow label="PE / Nível" value={String(cls.pePorNivel)} color="text-blue-300" />
                <StatRow label="Dano Base" value={`${cls.danoBase} + Mod.FOR`} color="text-red-400" />
                <StatRow label="Perícias Iniciais" value={String(cls.periciasIniciais)} color="text-teal-400" />
              </div>
              <div className={`px-4 pb-3`}>
                <p className="text-txt-dim text-[10px] mb-1">Triagens disponíveis:</p>
                <div className="flex flex-wrap gap-1">
                  {cls.triages.map(t => (
                    <span key={t} className={`text-[10px] px-2 py-0.5 rounded font-mono border ${meta.border} ${meta.title}`}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="bg-void rounded-xl border border-gold/20 p-4">
        <h3 className="text-gold-light font-cinzel text-base mb-3">Combate Derivado</h3>
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          <div className="bg-deep rounded-lg p-3 border border-sep/40">
            <div className="text-txt-dim text-xs mb-1">CA</div>
            <div className="text-txt-main font-mono text-xs">10 + treino(Reflexo/Bloqueio) + MAX(Mod.CON, Mod.DES)</div>
          </div>
          <div className="bg-deep rounded-lg p-3 border border-sep/40">
            <div className="text-txt-dim text-xs mb-1">Reações</div>
            <div className="text-txt-main font-mono text-xs">⌊DES ÷ 5⌋ (mínimo 1)</div>
          </div>
          <div className="bg-deep rounded-lg p-3 border border-sep/40">
            <div className="text-txt-dim text-xs mb-1">Percepção Passiva</div>
            <div className="text-txt-main font-mono text-xs">d10 + treino(Percepção) + Mod.INT</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function colorizeLabel(label) {
  // Tokenizes a label string and wraps keywords in colored spans
  const parts = []
  let remaining = label
  const rules = [
    { re: /\+\d+ PEH/g,                 cls: 'text-amber-300 font-semibold' },
    { re: /Triagem Principal[^&|,]*/g,     cls: 'text-purple-400' },
    { re: /Sub-Triagem[^&|,]*/g,           cls: 'text-pink-400' },
    { re: /\+\d+ Módulo[^&|,]*/g,         cls: 'text-orange-400' },
    { re: /ESCOLHA:[^$]*/g,               cls: 'text-yellow-300' },
    { re: /\+[\d]+ Vida[^&|,]*/g,         cls: 'text-emerald-400' },
    { re: /\+[\d]+ Energia[^&|,]*/g,      cls: 'text-sky-400' },
    { re: /\+[\d]+ PE[^&|,]*/g,           cls: 'text-blue-400' },
    { re: /\+[\d]+ Pontos de Esqueleto[^&|,]*/g, cls: 'text-txt-main' },
    { re: /\+[\d]+ Perícias[^&|,]*/g,     cls: 'text-teal-400' },
  ]
  // Simple approach: split on && and OU, color each chunk
  const tokens = label.split(/(&&|\bOU\b)/)
  return tokens.map((tok, i) => {
    tok = tok.trim()
    if (tok === '&&') return <span key={i} className="text-sep mx-1">&&</span>
    if (tok === 'OU')  return <span key={i} className="text-yellow-300 font-bold mx-1">OU</span>
    // Match one of the rules
    if (/PEH/.test(tok))                               return <span key={i} className="text-amber-300 font-semibold">{tok}</span>
    if (/Triagem Principal/.test(tok))                 return <span key={i} className="text-purple-400">{tok}</span>
    if (/Sub-Triagem/.test(tok))                       return <span key={i} className="text-pink-400">{tok}</span>
    if (/Módulo de Evolução/.test(tok))                return <span key={i} className="text-orange-400">{tok}</span>
    if (/ESCOLHA/.test(tok))                           return <span key={i} className="text-yellow-300">{tok}</span>
    if (/Vida/.test(tok))                              return <span key={i} className="text-emerald-400">{tok}</span>
    if (/Energia/.test(tok))                           return <span key={i} className="text-sky-400">{tok}</span>
    if (/\bPE\b/.test(tok))                           return <span key={i} className="text-blue-400">{tok}</span>
    if (/Perícias/.test(tok))                          return <span key={i} className="text-teal-400">{tok}</span>
    if (/Pontos de Esqueleto/.test(tok))               return <span key={i} className="text-txt-main">{tok}</span>
    return <span key={i} className="text-txt-main">{tok}</span>
  })
}

function rowBg(label) {
  if (/PEH/.test(label))               return 'bg-amber-300/5 border-b border-amber-300/10'
  if (/Sub-Triagem/.test(label))       return 'bg-pink-400/5 border-b border-sep/50'
  if (/Triagem Principal/.test(label)) return 'bg-purple-400/5 border-b border-sep/50'
  if (/Módulo de Evolução/.test(label))return 'bg-orange-400/5 border-b border-sep/50'
  return 'border-b border-sep/50'
}

function ProgressionSection() {
  const [cls, setCls] = useState('GUERREIRO')
  const prog = PROGRESSION[cls]

  const legend = [
    { color: 'bg-amber-300', label: 'PEH — Pontos de Evolução de Habilidade' },
    { color: 'bg-purple-400', label: 'Triagem Principal' },
    { color: 'bg-pink-400',   label: 'Sub-Triagem' },
    { color: 'bg-orange-400', label: 'Módulo de Evolução' },
    { color: 'bg-emerald-400',label: 'Vida' },
    { color: 'bg-sky-400',    label: 'Energia' },
    { color: 'bg-blue-400',   label: 'PE (Pontos de Esqueleto de classe)' },
    { color: 'bg-teal-400',   label: 'Perícias Treinadas' },
    { color: 'bg-yellow-300', label: 'Escolha do jogador' },
  ]

  return (
    <div>
      <SectionTitle>Progressão de Nível</SectionTitle>
      <div className="flex gap-2 mb-4">
        {Object.keys(CLASSES).map(c => (
          <button key={c} onClick={() => setCls(c)}
            className={`px-4 py-2 rounded font-cinzel text-sm transition-colors ${cls === c ? 'bg-gold text-void' : 'border border-gold text-gold hover:bg-gold hover:text-void'}`}>
            {CLASSES[c].name}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-5 p-3 bg-void rounded-lg border border-sep">
        {legend.map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${l.color}`} />
            <span className="text-xs text-txt-dim">{l.label}</span>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sep text-txt-dim">
              <th className="py-2 px-3 text-left w-16">Nível</th>
              <th className="py-2 px-3 text-left">Habilidades</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(prog).map(([lvl, entry]) => (
              <tr key={lvl} className={`hover:brightness-125 transition-all ${rowBg(entry.label)}`}>
                <td className="py-2 px-3 font-mono text-gold font-bold">{lvl}</td>
                <td className="py-2 px-3">{colorizeLabel(normalizeProgressionLabel(entry.label))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function getSkillTheme(color) {
  const t = {
    red:     { border: 'border-red-400/20',     bg: 'bg-red-400/5',     accent: 'text-red-400',     hBg: 'bg-red-400/10' },
    orange:  { border: 'border-orange-400/20',  bg: 'bg-orange-400/5',  accent: 'text-orange-400',  hBg: 'bg-orange-400/10' },
    amber:   { border: 'border-amber-400/20',   bg: 'bg-amber-400/5',   accent: 'text-amber-400',   hBg: 'bg-amber-400/10' },
    sky:     { border: 'border-sky-400/20',     bg: 'bg-sky-400/5',     accent: 'text-sky-400',     hBg: 'bg-sky-400/10' },
    cyan:    { border: 'border-cyan-400/20',    bg: 'bg-cyan-400/5',    accent: 'text-cyan-400',    hBg: 'bg-cyan-400/10' },
    emerald: { border: 'border-emerald-400/20', bg: 'bg-emerald-400/5', accent: 'text-emerald-400', hBg: 'bg-emerald-400/10' },
    purple:  { border: 'border-purple-400/20',  bg: 'bg-purple-400/5',  accent: 'text-purple-400',  hBg: 'bg-purple-400/10' },
    rose:    { border: 'border-rose-400/20',    bg: 'bg-rose-400/5',    accent: 'text-rose-400',    hBg: 'bg-rose-400/10' },
    violet:  { border: 'border-violet-400/20',  bg: 'bg-violet-400/5',  accent: 'text-violet-400',  hBg: 'bg-violet-400/10' },
    blue:    { border: 'border-blue-400/20',    bg: 'bg-blue-400/5',    accent: 'text-blue-400',    hBg: 'bg-blue-400/10' },
    gold:    { border: 'border-gold/20',        bg: 'bg-gold/5',        accent: 'text-gold',        hBg: 'bg-gold/10' },
  }
  return t[color] || t.gold
}

const PERICIA_GUIDE = [
  {
    name: 'Lutar', attrs: 'FOR / DES', icon: '👊', color: 'red',
    desc: 'Combate corpo a corpo — ataques, agarrões, empurrões e desarmes.',
    usos: [
      { titulo: 'Ataque Corpo a Corpo', mecanica: 'Teste de Lutar vs CA do alvo. Sucesso causa dano da arma + Mod.FOR (ou Mod.DES para armas leves/ágeis).', dt: 'CA do alvo' },
      { titulo: 'Desarmar', mecanica: 'Ação padrão. Teste oposto de Lutar/FOR contra Lutar/FOR do alvo. Sucesso: o alvo solta a arma no chão.', dt: 'Teste oposto' },
      { titulo: 'Agarrar', mecanica: 'Teste oposto FOR/Atletismo vs FOR/Atletismo do alvo. Sucesso: alvo fica Agarrado (velocidade 0, Desvantagem em ataques não-ágeis). Escapar exige ação + teste oposto.', dt: 'Teste oposto' },
      { titulo: 'Empurrar / Derrubar', mecanica: 'Teste oposto FOR/Atletismo. Sucesso empurra 2m ou derruba o alvo no chão (Prone: Desvantagem em ataques, Vantagem para ataques corpo a corpo contra ele).', dt: 'Teste oposto' },
    ],
  },
  {
    name: 'Pontaria', attrs: 'DES', icon: '🎯', color: 'orange',
    desc: 'Ataques à distância — tiros, arremessos e mira precisa.',
    usos: [
      { titulo: 'Ataque à Distância', mecanica: 'Teste de Pontaria vs CA do alvo. Sucesso causa dano da arma + Mod.DES. Alcance efetivo depende da arma; além do alcance, Desvantagem.', dt: 'CA do alvo' },
      { titulo: 'Tiro Preciso (Mira)', mecanica: 'Gaste 1 ação preparando a mira. Próximo ataque de Pontaria ganha +2. Acumula com Vantagem.', dt: 'CA do alvo (−2 efetivo)' },
      { titulo: 'Cobrir Aliado', mecanica: 'Ação padrão. Sucesso: o próximo ataque contra o aliado coberto sofre Desvantagem. Dura até seu próximo turno.', dt: 'CD 12' },
      { titulo: 'Tiros em Movimento', mecanica: 'Veterano+ (grau 2). Pode atirar durante o deslocamento sem penalidade. Ainda consome a ação padrão.', dt: '—' },
    ],
  },
  {
    name: 'Bloqueio', attrs: 'FOR / CON', icon: '🛡️', color: 'amber',
    desc: 'Defesa ativa — absorver e mitigar golpes recebidos.',
    usos: [
      { titulo: 'Bloquear Ataque', mecanica: 'Reação ao ser atacado. Reduz dano recebido em Mod.FOR + bônus de grau. Consome 1 Reação. Requer arma ou escudo equipado.', dt: 'Reação (usa slot)' },
      { titulo: 'Bloqueio Total', mecanica: 'Ação completa. Dobra a redução de dano por 1 turno inteiro. Não pode atacar nem usar outras ações enquanto mantém.', dt: 'Ação completa' },
      { titulo: 'Bloqueio Protetor', mecanica: 'Especialista+ (grau 3). Pode bloquear por um aliado adjacente como reação, absorvendo o dano no lugar dele.', dt: 'Reação' },
    ],
  },
  {
    name: 'Alquimia', attrs: 'INT', icon: '⚗️', color: 'cyan',
    desc: 'Criação e análise de substâncias alquímicas — poções, venenos e compostos.',
    usos: [
      { titulo: 'Criar Poções / Itens', mecanica: 'Segue as regras de treinamento de Alquimia (ver seção Alquimia). Custo de espaço, materiais e tempo por círculo.', dt: 'Ver seção Alquimia' },
      { titulo: 'Identificar Substância', mecanica: 'Identifica poções, venenos e compostos por contato visual ou odor. Sem teste para itens comuns já conhecidos.', dt: 'CD 12 (comum), 15 (incomum), 18 (raro+)' },
      { titulo: 'Analisar Composto Desconhecido', mecanica: 'Determina efeitos e composição de material não-identificado. Requer 10 min e equipamento de alquimia.', dt: 'CD 15–20' },
    ],
    equipamento: 'Laboratório ou kit de alquimia para criação. Identificação sem equipamento: Desvantagem.',
  },
  {
    name: 'Conhecimento', attrs: 'INT', icon: '📚', color: 'sky',
    desc: 'Saber geral — identificar criaturas, recordar fatos e analisar itens e magia.',
    usos: [
      { titulo: 'Identificar Criatura', mecanica: 'Recall de informações sobre tipo, vulnerabilidades, resistências e comportamento de uma criatura.', dt: 'CD 10 (comum), 15 (incomum), 20 (raro+)' },
      { titulo: 'Recordar Informação', mecanica: 'Lembre fatos históricos, geográficos, culturais ou técnicos relevantes à cena.', dt: 'CD por obscuridade (10–25)' },
      { titulo: 'Analisar Item / Equipamento', mecanica: 'Identifica função, raridade aproximada e propriedades de itens encontrados. Não identifica maldições.', dt: 'CD 12–20' },
      { titulo: 'Identificar Magia (básico)', mecanica: 'Reconhece escola e potência de um efeito mágico visível. Não identifica detalhes internos.', dt: 'CD 15 + círculo do efeito' },
    ],
  },
  {
    name: 'Dirigir', attrs: 'DES / INT', icon: '🚗', color: 'blue',
    desc: 'Operação de veículos terrestres — carros, motos, transportes pesados.',
    usos: [
      { titulo: 'Manobra de Rotina', mecanica: 'Condução normal em estrada ou trânsito leve não exige teste.', dt: '—' },
      { titulo: 'Manobra Difícil', mecanica: 'Curvas fechadas em alta velocidade, derrapagem controlada, estacionamento em espaço apertado.', dt: 'CD 15' },
      { titulo: 'Perseguição Veicular', mecanica: 'Teste oposto de Dirigir entre perseguidor e fugitivo. Vantagem para quem tiver veículo mais rápido.', dt: 'Teste oposto' },
      { titulo: 'Condições Adversas', mecanica: 'Chuva forte, neve, terreno acidentado, visibilidade baixa. Soma +5 sobre a CD base da manobra.', dt: 'CD base + 5' },
    ],
  },
  {
    name: 'Fortitude', attrs: 'CON', icon: '💪', color: 'amber',
    desc: 'Resistência física — venenos, doenças, exaustão e condições extremas.',
    usos: [
      { titulo: 'Resistir Veneno', mecanica: 'Sucesso nega o efeito do veneno ou reduz dano/condição pela metade (conforme o veneno).', dt: 'CD do veneno (12–22)' },
      { titulo: 'Resistir Doença', mecanica: 'Sucesso previne contração ou acelera recuperação em 1 dia por ponto excedente.', dt: 'CD da doença (12–20)' },
      { titulo: 'Resistir Exaustão', mecanica: 'Evita ganhar nível de exaustão por esforço prolongado (marcha forçada, falta de descanso). Cada nível de exaustão aplica −2 em todos os testes.', dt: 'CD 10 + nível de exaustão atual' },
      { titulo: 'Sobreviver Condições Extremas', mecanica: 'Frio intenso, calor extremo, pressão, falta de ar. Falha acumula níveis de exaustão.', dt: 'CD 15 (moderado), 20 (extremo)' },
    ],
  },
  {
    name: 'Furtividade', attrs: 'DES', icon: '🥷', color: 'purple',
    desc: 'Mover-se sem ser percebido — esconder, esgueirar e emboscar.',
    usos: [
      { titulo: 'Esconder-se', mecanica: 'Teste oposto vs Percepção (ativa) ou Percepção passiva dos inimigos. Requer cobertura ou obscuridade. Falha revela sua posição.', dt: 'Teste oposto vs Percepção' },
      { titulo: 'Mover-se em Silêncio', mecanica: 'Cada turno em Furtividade exige novo teste se houver observadores atentos. Deslocamento normal não impõe penalidade; correr impõe Desvantagem.', dt: 'Teste oposto vs Percepção' },
      { titulo: 'Emboscar', mecanica: 'Se escondido ao realizar o primeiro ataque, o ataque surpresa tem Vantagem no teste de ofensiva.', dt: '—' },
      { titulo: 'Esconder-se em Combate', mecanica: 'Veterano+ (grau 2). Pode tentar se esconder em combate como ação bônus, se tiver cobertura ou obscuridade.', dt: 'Teste oposto vs Percepção' },
    ],
  },
  {
    name: 'Intimidar', attrs: 'FOR / APA', icon: '😠', color: 'rose',
    desc: 'Coerção e medo — forçar obediência, submissão ou rendição.',
    usos: [
      { titulo: 'Coagir NPC', mecanica: 'Força cooperação por medo. Alvo faz o que você quer, mas ganha atitude Hostil. Dura até a cena acabar ou até ser convencido.', dt: 'Teste oposto vs Vontade do alvo' },
      { titulo: 'Demoralizar em Combate', mecanica: 'Ação padrão. Sucesso: alvo sofre Desvantagem no próximo teste ou ataque. Funciona apenas se o alvo puder ver/ouvir você.', dt: 'CD 15' },
      { titulo: 'Forçar Rendição', mecanica: 'Inimigo em desvantagem clara (ferido, cercado, isolado). Falha: o inimigo pode se tornar mais agressivo (Vantagem no próximo ataque).', dt: 'Vontade do alvo + 5' },
    ],
  },
  {
    name: 'Investigação', attrs: 'INT', icon: '🔍', color: 'sky',
    desc: 'Análise dedutiva — buscar pistas, examinar cenas e descobrir o oculto.',
    usos: [
      { titulo: 'Buscar Área', mecanica: 'Procura ativa por itens, passagens secretas ou pistas em até 10m. Cada busca consome 1 minuto.', dt: 'CD 10 (óbvio), 15 (moderado), 20 (bem oculto)' },
      { titulo: 'Analisar Pistas', mecanica: 'Deduzir o que aconteceu em uma cena a partir de evidências físicas: sangue, pegadas, marcas de luta, objetos.', dt: 'CD 12–18' },
      { titulo: 'Detectar Forgery / Disfarce', mecanica: 'Identificar documentos falsificados, disfarces ou mensagens codificadas.', dt: 'CD do criador (teste oposto)' },
    ],
  },
  {
    name: 'Pilotar', attrs: 'DES / INT', icon: '✈️', color: 'blue',
    desc: 'Operação de veículos especiais — aeronaves, embarcações, mechs.',
    usos: [
      { titulo: 'Pilotar em Condição Normal', mecanica: 'Voo ou navegação de rotina não exige teste.', dt: '—' },
      { titulo: 'Manobra Arriscada', mecanica: 'Evasão de projéteis, voo em espaços apertados, aterrissagem difícil ou navegação em tempestade.', dt: 'CD 15–20' },
      { titulo: 'Perseguição Aérea / Aquática', mecanica: 'Teste oposto de Pilotar. Vantagem para o veículo mais rápido ou ágil.', dt: 'Teste oposto' },
      { titulo: 'Pouso de Emergência', mecanica: 'Veículo danificado ou em queda livre. Sucesso: pouso com danos mínimos. Falha: naufrágio ou colisão.', dt: 'CD 18' },
    ],
  },
  {
    name: 'Percepção', attrs: 'DES / INT', icon: '👁️', color: 'sky',
    desc: 'Sentidos aguçados — detectar ameaças, notar detalhes e perceber o invisível.',
    usos: [
      { titulo: 'Percepção Passiva', mecanica: 'Valor fixo: 10 + bônus de Percepção. Usado automaticamente para detectar emboscadas e Furtividade sem ação ativa.', dt: 'Passiva = 10 + bônus' },
      { titulo: 'Percepção Ativa', mecanica: 'Busca ativa e concentrada por algo específico. Usa d20 + bônus de Percepção. Consome ação.', dt: 'CD do que está oculto' },
      { titulo: 'Detectar Ilusão / Engano', mecanica: 'Perceber que algo não é real ou está disfarçado. Não revela a verdade, apenas que há engano.', dt: 'CD do criador da ilusão' },
      { titulo: 'Opor-se a Furtividade', mecanica: 'Teste oposto vs Furtividade do inimigo. Sucesso revela a posição e impede ataque surpresa.', dt: 'Teste oposto vs Furtividade' },
    ],
  },
  {
    name: 'Persuasão', attrs: 'APA / INT', icon: '🗣️', color: 'rose',
    desc: 'Influência social — convencer, negociar, cativar e recrutar.',
    usos: [
      { titulo: 'Convencer NPC', mecanica: 'Mudar atitude ou obter favor. NPCs amigáveis são mais fáceis; hostis são quase impossíveis sem contexto favorável.', dt: 'Teste oposto vs Vontade ou CD fixa' },
      { titulo: 'Negociar', mecanica: 'Obter melhores preços, termos ou condições em comércio, alianças ou contratos.', dt: 'CD 12 (amigável), 18 (hostil)' },
      { titulo: 'Recrutar Aliados', mecanica: 'Conseguir ajuda temporária ou permanente de NPCs. Quanto mais leal o alvo a outra causa, maior a CD.', dt: 'CD 15 + Nível/Lealdade do alvo' },
      { titulo: 'Acalmar Situação', mecanica: 'Reduzir tensão em conflito social iminente. Evita que negociação vire combate.', dt: 'CD 15' },
    ],
  },
  {
    name: 'Poder', attrs: 'AM', icon: '✨', color: 'violet',
    desc: 'Canalização de energia sobrenatural — base do poder místico e habilidades especiais.',
    usos: [
      { titulo: 'Canalizar Habilidade', mecanica: 'Base para ativação de habilidades místicas. Valor de Poder + Mod.AM define a potência do efeito.', dt: 'CD da habilidade' },
      { titulo: 'Resistir Drenagem', mecanica: 'Quando uma força tenta drenar sua Energia, PE ou atributos.', dt: 'CD do efeito de drenagem' },
      { titulo: 'Detectar Magia', mecanica: 'Sentir a presença de energia mágica em até 10m. Não identifica detalhes — apenas presença e potência aproximada.', dt: 'CD 15 (básico), 20 (oculto)' },
      { titulo: 'Descarregar Energia', mecanica: 'Veterano+ (grau 2). Pode gastar PE extra para aumentar dano (+1d6 por 2 PE) ou alcance (+5m por 1 PE) de uma habilidade mística.', dt: '—' },
    ],
  },
  {
    name: 'Reflexo', attrs: 'DES', icon: '⚡', color: 'amber',
    desc: 'Reações rápidas — esquivar, desviar e reagir a perigos súbitos.',
    usos: [
      { titulo: 'Esquivar de Área', mecanica: 'Quando atingido por efeito em área (explosão, magia em área). Sucesso reduz dano pela metade.', dt: 'CD do efeito' },
      { titulo: 'Desviar Projétil Lento', mecanica: 'Defletir objeto arremessado ou projétil lento (facas, flechas). Não funciona contra balas.', dt: 'CD 20' },
      { titulo: 'Apanhar Objeto', mecanica: 'Agarrar item em queda ou arremessado em sua direção como reação.', dt: 'CD 15' },
      { titulo: 'Reagir a Emboscada', mecanica: 'Especialista+ (grau 3). Quando surpreendido, pode rolar Reflexo CD 18 para agir no turno da emboscada (apenas ação limitada).', dt: 'CD 18' },
    ],
  },
  {
    name: 'Contra-Ataque', attrs: 'DES / INT', icon: '⚔️', color: 'red',
    desc: 'Retaliação — responder a ataques com contra-ofensivas imediatas.',
    usos: [
      { titulo: 'Ripostar', mecanica: 'Após defesa bem-sucedida (bloqueio ou esquiva), gasta 1 reação para atacar de volta com dano normal. Deve estar dentro do alcance.', dt: 'CA do alvo (ataque ofensivo)' },
      { titulo: 'Interromper Conjuração', mecanica: 'Ataque rápido contra conjurador enquanto ele conjura. Sucesso interrompe a conjuração e desperdiça a ação.', dt: 'CD conjurador + 5' },
      { titulo: 'Desarmar em Contra-Ataque', mecanica: 'Veterano+ (grau 2). Após bloqueio bem-sucedido, pode desarmar o atacante em vez de causar dano.', dt: 'Teste oposto Lutar + 5' },
    ],
  },
  {
    name: 'Atletismo', attrs: 'FOR / CON', icon: '🏃', color: 'amber',
    desc: 'Proezas físicas — escalar, nadar, saltar e resistir a impedimentos.',
    usos: [
      { titulo: 'Escalar', mecanica: 'Superfície escalável. Falha por ≤4: não progride. Falha por ≥5: cai e sofre dano de queda.', dt: 'CD 10 (fácil), 15 (moderada), 20 (difícil)' },
      { titulo: 'Nadar', mecanica: 'Águas calmas a tempestades. Falha por ≥5: começa a afogar (1 nível de exaustão por turno até sair).', dt: 'CD 10 (calma), 15 (correnteza), 20 (tempestade)' },
      { titulo: 'Pular', mecanica: 'Base horizontal: 1,5m + Mod.FOR. Base vertical: 0,5m + Mod.FOR/2. Pular além da base exige teste.', dt: 'CD por distância extra (15 + 2/m extra)' },
      { titulo: 'Resistir Impedimento', mecanica: 'Soltar de agarrão, escapar de amarras, arrombar porta com força ou derrubar obstáculo.', dt: 'Teste oposto FOR/Atletismo' },
    ],
  },
  {
    name: 'Crime', attrs: 'DES / INT', icon: '🔐', color: 'purple',
    desc: 'Atividades ilícitas — arrombamento, prestidigitação, armadilhas e falsificação.',
    usos: [
      { titulo: 'Arrombar Fechadura', mecanica: 'Abrir porta, cofre ou mecanismo de travamento sem a chave. Falha por ≥5 pode quebrar ferramenta ou disparar armadilha.', dt: 'CD 10 (simples), 15 (média), 20 (complexa)' },
      { titulo: 'Bolsar (Prestidigitação)', mecanica: 'Furtar item pequeno do alvo sem ser notado, ou plantar algo nele. Requer estar adjacente.', dt: 'Teste oposto vs Percepção' },
      { titulo: 'Desarmar Armadilha', mecanica: 'Identificar e neutralizar armadilha mecânica ou mágica simples. Falha pode acionar a armadilha.', dt: 'CD 15 (simples), 18 (moderada), 22 (complexa)' },
      { titulo: 'Falsificar Documento', mecanica: 'Criar ou alterar documento, assinatura ou selo. Qualidade depende do resultado vs CD.', dt: 'CD 15 (simples), 20 (detalhado)' },
    ],
    equipamento: 'Kit de Ladrão concede Vantagem em arrombamento e prestidigitação. Sem ferramentas: Desvantagem.',
  },
  {
    name: 'Vontade', attrs: 'CON / AM', icon: '🧠', color: 'violet',
    desc: 'Força mental — resistir controle, medo e manter concentração sob pressão.',
    usos: [
      { titulo: 'Resistir Controle Mental', mecanica: 'Dominar, encantar, possuir ou qualquer influência mental externa. Sucesso nega o efeito completamente.', dt: 'CD do efeito' },
      { titulo: 'Resistir Medo / Terror', mecanica: 'Evitar condição Amedrontado ou pânico. Mesmo com sucesso, o Mestre pode aplicar tensão narrativa.', dt: 'CD da fonte de medo' },
      { titulo: 'Manter Concentração', mecanica: 'Ao sofrer dano enquanto mantém efeito ativo (magia sustentada, canalização contínua). Falha encerra o efeito.', dt: 'CD 10 + dano sofrido ÷ 2' },
      { titulo: 'Resistir Tortura / Coerção', mecanica: 'Não revelar informações sob coerção física ou psicológica. Pode manter silêncio ou dar informação falsa.', dt: 'CD 15 (leve), 20 (intensa)' },
    ],
  },
  {
    name: 'Medicina', attrs: 'INT', icon: '🏥', color: 'emerald', especial: true,
    desc: 'Primeiros socorros e estabilização — cura, diagnóstico e tratamento de campo. Perícia especial: não está entre as 19 perícias base, mas pode ser treinada via equipamento Médico, habilidades de classe ou kits específicos.',
    usos: [
      { titulo: 'Estabilizar Morrendo', mecanica: 'Tira um aliado do estado Morrendo. Sucesso: estabiliza com 1 PV. Falha: desperdiça a ação (o aliado continua morrendo). Pode ser usada como ação padrão adjacente ao alvo.', dt: 'CD 15 + Nível do alvo ÷ 2' },
      { titulo: 'Diagnosticar Condição', mecanica: 'Identifica veneno, doença, fratura ou condição anormal em um paciente. Requer exame de 1 minuto.', dt: 'CD 12 (comum), 15 (moderada), 18 (grave)' },
      { titulo: 'Curar com Kit Médico', mecanica: 'Kit Médico Portátil: restaura 1d8 + Mod.INT Vida. 3 usos por kit. Não exige teste — consome 1 uso automaticamente como ação. Pode ser usado em aliados morrendo sem teste de Medicina.', dt: 'Sem teste (uso automático do kit)' },
      { titulo: 'Tratar Veneno / Doença', mecanica: 'Primeiros socorros contra envenenamento ou doença ativa. Sucesso neutraliza o veneno ou reduz a CD de recuperação da doença em 5.', dt: 'CD do veneno / doença' },
      { titulo: 'Cirurgia de Campo', mecanica: 'Especialista+ (grau 3). Procedimento avançado em condições precárias. Remove 1 condição grave (fratura, sangramento interno, etc.).', dt: 'CD 18. Requer Kit Médico + 10 min.' },
    ],
    equipamento: 'Kit Médico Portátil (3 usos, 1d8 + INT). Equipamento Médico concede +5 a +20 em Medicina conforme peças. Sem kit: Desvantagem em procedimentos.',
  },
]

function PericiasSection() {
  const [expanded, setExpanded] = useState(null)
  const toggle = (name) => setExpanded(prev => prev === name ? null : name)

  return (
    <div>
      <SectionTitle>Perícias (19)</SectionTitle>
      <p className="text-txt-dim text-sm mb-4">
        Perícias são habilidades treináveis que determinam o bônus de cada personagem em testes específicos.
        Cada perícia usa o melhor modificador entre seus atributos-base + bônus de grau de treinamento.
      </p>

      <div className="bg-void rounded-xl border border-gold/20 p-4 mb-6">
        <h3 className="text-gold text-sm font-semibold mb-2">Mecânica Base de Perícias</h3>
        <div className="space-y-1.5 text-xs text-txt-dim">
          <p>• <strong className="text-txt-main">Teste de Perícia:</strong> d20 + modificador do melhor atributo-base + bônus de grau (treinamento) vs CD fixa ou teste oposto.</p>
          <p>• <strong className="text-txt-main">Não Treinado:</strong> Pode rolar d20 + modificador do atributo, mas sem bônus de grau (+0).</p>
          <p>• <strong className="text-txt-main">Vantagem:</strong> Rola 2d20 e fica com o maior. <strong className="text-txt-main">Desvantagem:</strong> Rola 2d20 e fica com o menor.</p>
          <p>• <strong className="text-txt-main">Teste Oposto:</strong> Ambos rolam d20 + bônus. Quem tirar mais alto vence. Empate: defensor vence.</p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        {PERICIAS.map(p => {
          const guide = PERICIA_GUIDE.find(g => g.name === p.name)
          const theme = getSkillTheme(guide?.color || 'gold')
          return (
            <button key={p.name} onClick={() => toggle(p.name)}
              className={`rounded px-3 py-2 border flex justify-between items-center text-left transition-colors ${expanded === p.name ? `${theme.border} ${theme.bg}` : 'border-sep bg-void hover:border-gold/30'}`}>
              <span className="flex items-center gap-1.5">
                <span className="text-sm">{guide?.icon || '📋'}</span>
                <span className={`text-sm ${expanded === p.name ? theme.accent : 'text-txt-main'}`}>{p.name}</span>
              </span>
              <span className="text-txt-dim text-xs font-mono">{p.attrs.join('/')}</span>
            </button>
          )
        })}
      </div>

      <h3 className="text-gold-light text-lg mb-2">Graus de Treinamento por Faixa</h3>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sep text-txt-dim">
              <th className="py-2 px-3 text-left">Faixa</th>
              <th className="py-2 px-3 text-left">Grau Máximo</th>
              <th className="py-2 px-3 text-left">Bônus</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(GRAUS_BY_TIER).map(([tier, info]) => (
              <tr key={tier} className="border-b border-sep/50">
                <td className="py-1.5 px-3 font-mono text-txt-main">N{tier}</td>
                <td className="py-1.5 px-3 text-gold">{info.nome}</td>
                <td className="py-1.5 px-3 font-mono text-txt-main">+{info.bonus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="text-gold-light text-lg mb-1">Guia de Uso por Perícia</h3>
      <p className="text-txt-dim text-xs mb-4">Clique em uma perícia acima ou expanda os cards abaixo para ver regras detalhadas, CDs e usos de cada perícia.</p>

      <div className="space-y-2">
        {PERICIA_GUIDE.map(skill => {
          const theme = getSkillTheme(skill.color)
          const isOpen = expanded === skill.name
          return (
            <div key={skill.name} className={`rounded-lg border overflow-hidden transition-colors ${isOpen ? theme.border : 'border-sep/50'}`}>
              <button onClick={() => toggle(skill.name)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${isOpen ? theme.hBg : 'bg-void/40 hover:bg-void/60'}`}>
                <span className="flex items-center gap-2">
                  <span className="text-base">{skill.icon}</span>
                  <span className={`font-semibold text-sm ${isOpen ? theme.accent : 'text-txt-main'}`}>{skill.name}</span>
                  <span className="text-txt-dim text-xs font-mono">({skill.attrs})</span>
                  {skill.especial && <span className="text-[10px] bg-emerald-400/15 text-emerald-400 px-1.5 py-0.5 rounded">ESPECIAL</span>}
                </span>
                <span className={`text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {isOpen && (
                <div className={`px-4 py-3 border-t ${theme.border} ${theme.bg} space-y-3`}>
                  <p className="text-txt-dim text-xs leading-relaxed">{skill.desc}</p>
                  <div className="space-y-2">
                    {skill.usos.map((uso, i) => (
                      <div key={i} className="bg-deep rounded-lg border border-sep/30 p-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-semibold ${theme.accent}`}>{uso.titulo}</span>
                          {uso.dt && uso.dt !== '—' && (
                            <span className="text-[10px] font-mono bg-gold/10 text-gold px-1.5 py-0.5 rounded shrink-0 ml-2">
                              {uso.dt.startsWith('CD') || uso.dt.startsWith('CA') || uso.dt.startsWith('Teste') || uso.dt.startsWith('Passiva') || uso.dt.startsWith('Reação') || uso.dt.startsWith('Ação')
                                ? uso.dt
                                : `CD ${uso.dt}`}
                            </span>
                          )}
                        </div>
                        <p className="text-txt-dim text-[11px] leading-relaxed">{uso.mecanica}</p>
                      </div>
                    ))}
                  </div>
                  {skill.equipamento && (
                    <div className="flex items-start gap-1.5 text-[11px] text-amber-300/80 bg-amber-300/5 border border-amber-300/15 rounded px-2.5 py-1.5">
                      <span className="shrink-0">🔧</span>
                      <span>{skill.equipamento}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TriagesSection() {
  const [cls, setCls] = useState('GUERREIRO')
  const triages = TRIAGES[cls]

  return (
    <div>
      <SectionTitle>Triagens</SectionTitle>
      <div className="mb-4">
        <p className="text-txt-dim text-sm mb-3">
          <strong className="text-txt-main">Triagem Principal:</strong> obrigatoriamente da mesma Classe. 6 níveis (0.1→0.6), concluídos até N30.<br />
          <strong className="text-txt-main">Sub-Triagem:</strong> qualquer Classe (inclui a própria). 3 níveis (0.1→0.3), disponível a partir de N16 e concluída até N30.
        </p>
        <div className="flex gap-2">
          {Object.keys(TRIAGES).map(cc => {
            const meta = CLASS_META[cc] || CLASS_META.GUERREIRO
            return (
              <button key={cc} onClick={() => setCls(cc)}
                className={`px-4 py-2 rounded font-cinzel text-sm transition-colors ${cls === cc ? `${meta.bg} border ${meta.border} ${meta.title}` : 'border border-sep text-txt-dim hover:border-gold hover:text-gold'}`}>
                {CLASSES[cc].name}
              </button>
            )
          })}
        </div>
      </div>
      {(() => {
        const meta = CLASS_META[cls] || CLASS_META.GUERREIRO
        return (
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(triages).map(([key, t]) => (
              <div key={key} className={`rounded-xl border ${meta.border} ${meta.bg} overflow-hidden`}>
                <div className={`px-4 py-3 border-b ${meta.border}`}>
                  <h3 className={`font-cinzel text-lg ${meta.title}`}>{t.name}</h3>
                  <p className="text-txt-dim text-xs mt-0.5">{t.desc}</p>
                </div>
                <div className="px-4 py-3 space-y-2">
                  {Object.entries(t.levels).map(([lvl, desc]) => (
                    <div key={lvl} className="flex gap-3 items-start">
                      <span className={`shrink-0 w-10 h-7 rounded border ${meta.border} ${meta.bg} flex items-center justify-center ${meta.title} font-mono text-xs font-bold`}>{lvl}</span>
                      <span className="text-txt-main text-xs leading-relaxed">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      })()}
    </div>
  )
}

function ModulesSection({ items, title, active, special }) {
  const accentColor = active ? 'text-blue-400 border-blue-400/30 bg-blue-400/5' : special ? 'text-orange-400 border-orange-400/30 bg-orange-400/5' : 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5'
  const nameColor   = active ? 'text-blue-300' : special ? 'text-orange-300' : 'text-emerald-300'
  return (
    <div>
      <SectionTitle>{title}</SectionTitle>
      {active  && <p className="text-blue-400/80 text-sm mb-3 bg-blue-400/5 border border-blue-400/20 rounded px-3 py-2">⚡ Módulos Ativos custam PE para ativar. São acionados como uma ação no combate.</p>}
      {special && <p className="text-orange-400/80 text-sm mb-3 bg-orange-400/5 border border-orange-400/20 rounded px-3 py-2">★ Módulos Especiais podem ser adquiridos múltiplas vezes até o limite indicado.</p>}
      <div className="space-y-2">
        {items.map(m => (
          <div key={m.id} className={`rounded-lg border p-3 ${accentColor} bg-void/40`}>
            <div className="flex items-start justify-between gap-3 mb-1">
              <div className="flex items-center gap-2">
                <span className={`font-cinzel text-sm font-bold ${nameColor}`}>{m.name}</span>
                {active  && <span className="text-[10px] font-mono bg-blue-400/20 text-blue-300 px-1.5 py-0.5 rounded">{m.pe} PE</span>}
                {special && m.maxBuy && <span className="text-[10px] font-mono bg-orange-400/20 text-orange-300 px-1.5 py-0.5 rounded">até {m.maxBuy}×</span>}
              </div>
              {m.req && <span className="text-[10px] text-txt-dim shrink-0 text-right">{m.req}</span>}
            </div>
            <p className="text-txt-main text-xs leading-relaxed">{m.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function WeaponsSection() {
  return (
    <div>
      <SectionTitle>Armas</SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sep text-txt-dim">
              <th className="py-2 px-3 text-left">Nome</th>
              <th className="py-2 px-3 text-left">Dano</th>
              <th className="py-2 px-3 text-left">Attr</th>
              <th className="py-2 px-3 text-left">Mecânica Única</th>
            </tr>
          </thead>
          <tbody>
            {WEAPONS.map(w => (
              <tr key={w.id} className="border-b border-sep/50 hover:bg-void/50">
                <td className="py-2 px-3 text-gold font-medium">{w.name}</td>
                <td className="py-2 px-3 font-mono text-red-400 font-medium">{w.dano}</td>
                <td className="py-2 px-3 text-sky-400 font-mono text-xs">{w.attr}</td>
                <td className="py-2 px-3 text-txt-main text-xs">{w.mec}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RanksSection() {
  const rankColorMap = ['text-txt-dim','text-emerald-400','text-sky-400','text-purple-400','text-rose-400','text-amber-300','text-fuchsia-400','text-cyan-300']
  return (
    <div>
      <SectionTitle>Ranks de Arma (8 Patentes)</SectionTitle>
      <p className="text-txt-dim text-sm mb-4">Cada rank define o poder da arma e mapeia para uma faixa de nível equivalente usada pela IA para balancear habilidades.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sep text-txt-dim">
              <th className="py-2 px-3 text-left">Rank</th>
              <th className="py-2 px-3 text-left">Faixa Equiv.</th>
              <th className="py-2 px-3 text-left">Dano Bônus</th>
              <th className="py-2 px-3 text-left">Defesa</th>
              <th className="py-2 px-3 text-left">Slots</th>
            </tr>
          </thead>
          <tbody>
            {WEAPON_RANKS.map((r, i) => (
              <tr key={r.rank} className="border-b border-sep/50 hover:bg-void/60">
                <td className={`py-2 px-3 font-cinzel font-bold ${rankColorMap[i] || 'text-gold'}`}>{r.rank}</td>
                <td className="py-2 px-3 font-mono text-gold/70 text-xs">{RANK_LEVEL_BAND[r.rank]}</td>
                <td className="py-2 px-3 font-mono text-red-400">{r.danoBonus || '—'}</td>
                <td className="py-2 px-3 font-mono text-sky-400">sem CA</td>
                <td className="py-2 px-3 font-mono text-orange-400">{r.slots}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-txt-dim text-sm mt-3">Custo de slot por tipo de habilidade: Fraca=1 | Média=2 | Forte=3. Ranks de arma não somam CA; defesa passiva vem de CA base, escudos específicos, habilidades temporárias e armaduras.</p>
    </div>
  )
}

function EquipLimitsSection() {
  return (
    <div className="space-y-6">
      <SectionTitle>Limites de Equipamento por Nível</SectionTitle>
      <p className="text-txt-dim text-sm mb-4">O nível do personagem define quantas armas ele pode equipar, qual o rank máximo permitido, quantas artes marciais pode praticar e qual grau pode alcançar.</p>

      <div className="bg-void rounded-xl border border-gold/20 p-4">
        <h3 className="text-gold text-sm font-semibold mb-3">Armas por Faixa de Nível</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sep/40">
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Nível Mínimo</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Máx Armas</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Rank Máximo</th>
              </tr>
            </thead>
            <tbody>
              {WEAPON_LIMITS.map((l, i) => (
                <tr key={i} className="border-b border-sep/20 hover:bg-void/40">
                  <td className="py-2 px-3 font-mono text-gold">N{l.minLevel}+</td>
                  <td className="py-2 px-3 font-mono text-orange-400">{l.maxWeapons}</td>
                  <td className="py-2 px-3 font-cinzel text-amber-300">{l.maxRank}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-void rounded-xl border border-orange-400/20 p-4">
        <h3 className="text-orange-400 text-sm font-semibold mb-3">Artes Marciais por Faixa de Nível</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sep/40">
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Nível Mínimo</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Máx Artes Marciais</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Grau Máximo</th>
              </tr>
            </thead>
            <tbody>
              {MARTIAL_ARTS_LIMITS.map((l, i) => (
                <tr key={i} className="border-b border-sep/20 hover:bg-void/40">
                  <td className="py-2 px-3 font-mono text-orange-400">N{l.minLevel}+</td>
                  <td className="py-2 px-3 font-mono text-txt-main">{l.maxArts}</td>
                  <td className="py-2 px-3 text-orange-300">{MA_GRAU_LABELS[l.maxGrau]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-void/40 border border-sep/30 rounded-lg p-3 text-xs text-txt-dim space-y-1">
        <p className="text-gold font-semibold text-sm mb-1">Observações</p>
        <p>• Personagens começam com 1 arma no rank Comum (Nível 1).</p>
        <p>• O rank da arma limita as habilidades disponíveis e o poder máximo que a IA atribui.</p>
        <p>• Artes Marciais seguem progressão de grau: Novato → Treinado → Formado → Especialista.</p>
        <p>• Apenas a partir de N23 um personagem pode ter 2 artes marciais simultâneas.</p>
      </div>
    </div>
  )
}

function EquipmentSection() {
  return (
    <div className="space-y-6">
      <SectionTitle>Sistema de Equipamentos</SectionTitle>
      <p className="text-txt-dim text-sm mb-4">
        Equipamentos complementam as armas e oferecem proteção, utilidades e bônus passivos. Dividem-se em
        <span className="text-primary"> Armaduras</span>,
        <span className="text-purple-400"> Acessórios</span> e
        <span className="text-on-surface-variant"> Itens de Utilidade</span>.
      </p>

      <p className="text-txt-dim text-sm mb-4">
        Na revisão atual, armaduras não aumentam CA diretamente. CA é defesa passiva contra ataques; <strong className="text-primary">Armadura</strong> é uma
        camada de <strong className="text-primary">absorção de dano</strong> que reduz cada golpe recebido pelo valor total das peças equipadas, até o limite ativo de {ARMOR_ABSORPTION_HARD_CAP}. Acima de {ARMOR_ABSORPTION_SOFT_CAP}, o conjunto entra em sobrecarga e desgasta 2 de Durabilidade por golpe absorvido. Quando a Durabilidade chega a 0, a peça quebra até reparo.
      </p>

      <div className="bg-void rounded-xl border border-primary/20 p-4">
        <h3 className="text-primary text-sm font-semibold mb-3">Slots de Equipamento</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ARMOR_SLOTS.map(slot => (
            <div key={slot.id} className="bg-void/60 border border-sep/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{slot.icon}</span>
                <span className="text-txt-main font-semibold text-sm">{slot.label}</span>
              </div>
              <p className="text-txt-dim text-xs">{slot.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-void rounded-xl border border-primary/20 p-4">
        <h3 className="text-primary text-sm font-semibold mb-3">Tipos de Equipamento (Base)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sep/40">
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Tipo</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Slot</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Peso</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Armadura Base</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Penalidade</th>
              </tr>
            </thead>
            <tbody>
              {EQUIPMENT_TYPES.filter(t => t.slot && t.slot !== 'acessorio' && t.slot !== null).map(t => (
                <tr key={t.id} className="border-b border-sep/20 hover:bg-void/40">
                  <td className="py-2 px-3 text-txt-main font-semibold">{t.label}</td>
                  <td className="py-2 px-3 text-txt-dim capitalize">{t.slot}</td>
                  <td className="py-2 px-3 text-txt-dim capitalize">{t.weight || '—'}</td>
                  <td className="py-2 px-3 font-mono text-primary">{t.caBase}</td>
                  <td className="py-2 px-3 font-mono text-red-400">{t.penalty ? `${t.penalty} DES` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          {EQUIPMENT_TYPES.filter(t => !t.slot || t.slot === 'acessorio').map(t => (
            <div key={t.id} className="bg-void/60 border border-sep/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-txt-main font-semibold text-sm">{t.label}</span>
                <span className="text-txt-dim font-mono text-xs">{t.slot || 'Sem slot'}</span>
              </div>
              <p className="text-txt-dim text-xs">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-void rounded-xl border border-purple-400/20 p-4">
        <h3 className="text-purple-400 text-sm font-semibold mb-3">Ranks de Equipamento</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sep/40">
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Rank</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Armadura+</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Habilidades</th>
              </tr>
            </thead>
            <tbody>
              {EQUIPMENT_RARITIES.map(r => (
                <tr key={r.rank} className="border-b border-sep/20 hover:bg-void/40">
                  <td className="py-2 px-3 font-cinzel text-amber-300">{r.rank}</td>
                  <td className="py-2 px-3 font-mono text-primary">{r.armorBonus > 0 ? `+${r.armorBonus}` : '—'}</td>
                  <td className="py-2 px-3 font-mono text-purple-400">
                    {r.activeSkills > 0 ? `${r.activeSkills} ativa${r.activeSkills > 1 ? 's' : ''}` : ''}
                    {r.passiveSkills > 0 ? `${r.activeSkills > 0 ? ' + ' : ''}${r.passiveSkills} passiva` : ''}
                    {!r.activeSkills && !r.passiveSkills ? '—' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-txt-dim text-xs mt-2">Esses valores somam à base do tipo de equipamento. Armadura+ aumenta a camada de Absorção, não a CA.</p>
      </div>

      <div className="bg-void rounded-xl border border-sky-400/20 p-4">
        <h3 className="text-sky-400 text-sm font-semibold mb-3">Estatísticas Explicadas</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(EQUIPMENT_STAT_LABELS).map(([key, stat]) => (
            <div key={key} className="bg-void/60 border border-sep/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span>{stat.icon}</span>
                <span className="text-txt-main font-semibold text-sm">{stat.label}</span>
              </div>
              <p className="text-txt-dim text-xs">{stat.desc}</p>
              {stat.lose && <p className="text-red-400/70 text-[11px] mt-1">⚠ {stat.lose}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-void rounded-xl border border-primary/25 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-primary text-lg">🛡️</span>
          <h3 className="text-primary text-sm font-semibold">Como a Armadura Funciona</h3>
        </div>
        <div className="space-y-2 text-xs text-txt-dim">
          <div className="flex gap-2 items-start">
            <span className="text-primary font-bold shrink-0">1. Absorção:</span>
            <span>A armadura reduz CADA golpe recebido pelo valor total de todas as peças equipadas e não quebradas, com limite ativo de {ARMOR_ABSORPTION_HARD_CAP}. Valores acima do limite ficam como excesso bruto e não reduzem dano adicional.</span>
          </div>
          <div className="flex gap-2 items-start">
            <span className="text-amber-300 font-bold shrink-0">2. Durabilidade:</span>
            <span>Cada vez que a armadura absorve um golpe, todas as peças equipadas perdem Durabilidade: leve/comum perdem 1, pesado perde 2. Se a absorção total passar de {ARMOR_ABSORPTION_SOFT_CAP}, todo o conjunto desgasta 2 por golpe.</span>
          </div>
          <div className="flex gap-2 items-start">
            <span className="text-emerald-400 font-bold shrink-0">3. Não é CA:</span>
            <span>Armadura não altera a Classe de Armadura (CA). CA vem de perícia (Reflexo/Bloqueio) + atributos. Armadura é uma camada separada que reduz o dano que passa pela CA.</span>
          </div>
          <div className="flex gap-2 items-start">
            <span className="text-red-400 font-bold shrink-0">4. Quebra:</span>
            <span>Peças quebradas (Durabilidade 0) perdem toda absorção até serem reparadas em ferraria. Se Durabilidade cair para −5 ou menos, a peça é destruída permanentemente.</span>
          </div>
        </div>
      </div>

      <div className="bg-void rounded-xl border border-emerald-400/20 p-4">
        <h3 className="text-emerald-400 text-sm font-semibold mb-3">Bônus de Categoria (Sets) — Acumulativo</h3>
        <p className="text-txt-dim text-xs mb-3">Cada categoria ativa bônus progressivos conforme o número de peças equipadas. Com 1 peça, recebe o bônus mínimo. Com 2 ou mais, recebe TODOS os bônus das faixas atingidas (2 peças ativa o bônus de 2, 3 peças ativa 2+3, 4 peças ativa 2+3+4).</p>
        <div className="space-y-4">
          {ARMOR_TYPES.map(type => (
            <div key={type.id} className={`rounded-lg border ${type.borderClass} overflow-hidden`}>
              <div className={`px-4 py-2.5 ${type.bgClass} border-b ${type.borderClass}`}>
                <div className="flex items-center gap-2">
                  <span className={`font-cinzel text-sm font-bold ${type.colorClass}`}>{type.label}</span>
                </div>
                <p className="text-txt-dim text-xs mt-0.5">{type.desc}</p>
              </div>
              <div className="px-4 py-3 space-y-2">
                <div className="flex gap-3 text-xs">
                  <span className={`${type.colorClass} font-semibold`}>1 peça:</span>
                  <span className="text-txt-main">{type.miniBonus}</span>
                </div>
                <div className="flex gap-3 text-xs">
                  <span className={`${type.colorClass} font-semibold`}>Passiva (1 peça):</span>
                  <span className="text-txt-dim">{type.miniPassive}</span>
                </div>
                {type.bonuses.map(b => (
                  <div key={b.pieces} className={`bg-void/60 rounded-lg p-2.5 border ${type.borderClass}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${type.badgeClass}`}>{b.pieces} peças</span>
                      <span className="text-txt-main font-semibold text-xs">{b.label}</span>
                    </div>
                    <p className={`${type.colorClass} font-mono text-xs mb-0.5`}>{b.bonus}</p>
                    <p className="text-txt-dim text-[11px] italic">{b.passive}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-void rounded-xl border border-sky-400/20 p-4">
        <h3 className="text-sky-400 text-sm font-semibold mb-3">Itens de Utilidade</h3>
        <div className="grid gap-2">
          {SIMPLE_ITEMS.map(item => (
            <div key={item.id} className="flex items-center justify-between bg-void/40 border border-sep/20 rounded px-3 py-2">
              <div>
                <span className="text-txt-main text-sm font-semibold">{item.nome}</span>
                <p className="text-txt-dim text-xs">{item.efeito}</p>
              </div>
              <span className="text-on-surface-variant font-mono text-xs">{item.peso} kg</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-void rounded-xl border border-amber-400/20 p-4">
        <h3 className="text-amber-400 text-sm font-semibold mb-3">Capacidade de Carga</h3>
        <p className="text-txt-dim text-sm mb-2">Cada personagem possui uma capacidade base de carga derivada de seus atributos:</p>
        <div className="bg-void/60 border border-sep/30 rounded p-3 text-sm text-txt-main font-mono">
          Carga Máxima = 10 + (FOR × 2) + ⌊CON × 0.5⌋ kg
        </div>
        <p className="text-txt-dim text-xs mt-2">Módulos de Evolução (ex: Mochila Avançada +10, Forja Pessoal +5, Portador Nato +8/compra) e itens especiais podem aumentar a capacidade. Armas e equipamentos entram na carga somente quando equipados. Itens de inventário ainda usam local: mochila/carregado pesa; base, casa, case ou veículo ficam registrados, mas não pesam na ficha ativa.</p>
      </div>

      <div className="bg-void/40 border border-sep/30 rounded-lg p-3 text-xs text-txt-dim space-y-1">
        <p className="text-primary font-semibold text-sm mb-1">Observações</p>
        <p>• Equipamentos seguem os mesmos ranks de armas para limites por nível.</p>
        <p>• Capacidade de moeda inicial: 5000 + (Nível − 1) × 500.</p>
        <p>• Peso corporal não conta para a capacidade de carga.</p>
        <p>• Categorias ativam bônus progressivamente — todas as faixas atingidas se acumulam.</p>
        <p>• Armas e equipamentos usam apenas equipado/guardado; só equipados contam na carga.</p>
        <p>• Fichas salvas podem transferir itens e equipamentos entre personagens.</p>
        <p>• A IA balanceia passivas de equipamento usando os mesmos limites SCP/TDH de habilidades.</p>
        <p>• Equipamento pesado impõe penalidade por peça: peitoral −3 DES, elmo −1 DES, calças −2 DES e botas −2 DES.</p>
      </div>
    </div>
  )
}

function DurabilitySection() {
  const durabilityByWeight = [
    { weight: 'Leve', baseHP: 8, repairCost: 'Rank × 5 PO', repairTime: '30 min', desc: 'Couro, tecido reforçado. Durabilidade baixa, reparo rápido.' },
    { weight: 'Comum', baseHP: 12, repairCost: 'Rank × 8 PO', repairTime: '1 hora', desc: 'Cota de malha, couro endurecido. Equilibrado.' },
    { weight: 'Pesado', baseHP: 18, repairCost: 'Rank × 12 PO', repairTime: '2 horas', desc: 'Placas de metal. Alta durabilidade, mas perde 2 por golpe absorvido.' },
  ]

  return (
    <div className="space-y-6">
      <SectionTitle>Sistema de Durabilidade</SectionTitle>
      <p className="text-txt-dim text-sm mb-4">
        Cada peça de equipamento possui pontos de <strong className="text-primary">Durabilidade</strong> independentes da Armadura (absorção).
        Quando a Durabilidade chega a 0, a peça quebra e perde todas as suas propriedades até ser reparada.
      </p>

      <div className="bg-void rounded-xl border border-amber-300/20 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-amber-300 text-lg">⚙️</span>
          <h3 className="text-amber-300 text-sm font-semibold">Regra Principal de Desgaste</h3>
        </div>
        <div className="bg-deep rounded-lg border border-amber-300/15 p-3">
          <p className="text-amber-200 text-xs font-semibold mb-2">Cada golpe absorvido consome Durabilidade de todas as peças equipadas: leve/comum perdem 1, pesado perde 2.</p>
          <p className="text-txt-dim text-xs">Se a absorção total passar de {ARMOR_ABSORPTION_SOFT_CAP}, o conjunto inteiro fica em sobrecarga e cada peça perde 2 por golpe absorvido.</p>
        </div>
        <div className="mt-3 bg-deep rounded-lg border border-amber-300/15 p-3">
          <p className="text-amber-200 text-xs font-semibold mb-2">Ataques focados na armadura causam dano extra à Durabilidade:</p>
          <ul className="space-y-1 text-xs text-txt-dim">
            <li>• <strong className="text-txt-main">Corte/Perfuração normal:</strong> — (desgaste padrão de 1 por golpe)</li>
            <li>• <strong className="text-txt-main">Ataque focado na armadura:</strong> +1d4 pontos de dano à Durabilidade</li>
            <li>• <strong className="text-txt-main">Explosão em área:</strong> +1d6 pontos de dano à Durabilidade</li>
            <li>• <strong className="text-txt-main">Dano elemental (fogo/gelo/ácido):</strong> +1d4 pontos de dano à Durabilidade</li>
            <li>• <strong className="text-txt-main">Crítico direcionado ao equipamento:</strong> +2d4 pontos de dano à Durabilidade</li>
          </ul>
        </div>
      </div>

      <div className="bg-void rounded-xl border border-amber-300/20 p-4">
        <h3 className="text-amber-300 text-sm font-semibold mb-3">Durabilidade por Peso</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sep/40">
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Peso</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Durabilidade</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Custo Reparo</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Tempo</th>
              </tr>
            </thead>
            <tbody>
              {durabilityByWeight.map(d => (
                <tr key={d.weight} className="border-b border-sep/20 hover:bg-void/40">
                  <td className="py-2 px-3 text-txt-main font-semibold capitalize">{d.weight}</td>
                  <td className="py-2 px-3 font-mono text-primary">{d.baseHP} pontos</td>
                  <td className="py-2 px-3 font-mono text-amber-300">{d.repairCost}</td>
                  <td className="py-2 px-3 font-mono text-sky-400">{d.repairTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-txt-dim text-xs mt-2">Fórmula de Durabilidade: Base do Peso + Bônus de Rank. Peças Guerreiro recebem +2 Durabilidade máxima. Acessórios e itens de utilidade não possuem durabilidade.</p>
      </div>

      <div className="bg-void rounded-xl border border-emerald-400/20 p-4">
        <h3 className="text-emerald-400 text-sm font-semibold mb-3">Regras de Quebra & Reparo</h3>
        <div className="space-y-2 text-xs text-txt-dim">
          <div className="flex gap-2 items-start">
            <span className="text-red-400 font-bold shrink-0">Quebra:</span>
            <span>Ao atingir 0 Durabilidade, a peça quebra. Perde-se armadura (absorção) e habilidades da peça até reparo.</span>
          </div>
          <div className="flex gap-2 items-start">
            <span className="text-emerald-400 font-bold shrink-0">Reparo em Campo:</span>
            <span>Teste de Tecnologia CD 12 + Rank × 2. Sucesso restaura 1d4+INT de durabilidade. Falha não causa dano. 1 tentativa por cena por peça.</span>
          </div>
          <div className="flex gap-2 items-start">
            <span className="text-sky-400 font-bold shrink-0">Reparo em Ferraria:</span>
            <span>Restaura durabilidade completa. Custo e tempo conforme tabela acima. Transcendente exige ferraria especializada (250 PO + 4h).</span>
          </div>
          <div className="flex gap-2 items-start">
            <span className="text-amber-300 font-bold shrink-0">Destruição Total:</span>
            <span>Se a durabilidade cair para −5 ou menos, a peça é destruída permanentemente e não pode ser reparada.</span>
          </div>
        </div>
      </div>

      <div className="bg-void rounded-xl border border-sky-400/20 p-4">
        <h3 className="text-sky-400 text-sm font-semibold mb-3">Durabilidade por Rank de Equipamento</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sep/40">
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Rank</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Bônus Durabilidade</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Exemplo (Pesado)</th>
              </tr>
            </thead>
            <tbody>
              {[
                { rank: 'Comum', bonus: '+0', ex: '18' },
                { rank: 'Incomum', bonus: '+2', ex: '20' },
                { rank: 'Raro', bonus: '+4', ex: '22' },
                { rank: 'Épico', bonus: '+6', ex: '24' },
                { rank: 'Heroico', bonus: '+8', ex: '26' },
                { rank: 'Ancestral', bonus: '+10', ex: '28' },
                { rank: 'Mítico', bonus: '+12', ex: '30' },
                { rank: 'Transcendente', bonus: '+16', ex: '34' },
              ].map((r, i) => (
                <tr key={i} className="border-b border-sep/20 hover:bg-void/40">
                  <td className="py-2 px-3 font-cinzel text-amber-300">{r.rank}</td>
                  <td className="py-2 px-3 font-mono text-primary">{r.bonus}</td>
                  <td className="py-2 px-3 font-mono text-txt-dim">{r.ex} pts</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-txt-dim text-xs mt-2">Fórmula: Base do Peso + Bônus de Rank. Transcendente pesado = 18 + 16 = 34 pontos de durabilidade; Guerreiro adiciona +2.</p>
      </div>
    </div>
  )
}

function CraftingSection() {
  const craftingSkills = [
    { skill: 'Tecnologia', cd: 12, desc: 'Armaduras, upgrades eletrônicos, dispositivos' },
    { skill: 'Sobrevivência', cd: 14, desc: 'Armaduras rústicas, armadilhas, itens de campo' },
    { skill: 'Alquimia', cd: 15, desc: 'Poções, elixires, compostos alquímicos' },
    { skill: 'Poder', cd: 15, desc: 'Itens encantados, runas gravadas, artefatos mágicos' },
  ]

  const materials = [
    { tipo: 'Metal Comum', peso: 2, preco: 10, desc: 'Ferro, aço, bronze. Para equipamentos Comum e Incomum.' },
    { tipo: 'Metal Refinado', peso: 1.5, preco: 50, desc: 'Aço liga, titânio. Para equipamentos Raro e Épico.' },
    { tipo: 'Metal Precioso', peso: 1, preco: 200, desc: 'Mithril, oricalco. Para equipamentos Heroico e Ancestral.' },
    { tipo: 'Matéria Primordial', peso: 0.5, preco: 1000, desc: 'Abisso, éter condensado. Para equipamentos Mítico e Transcendente.' },
    { tipo: 'Couro/Courino', peso: 1, preco: 5, desc: 'Para armaduras leves de qualquer rank.' },
    { tipo: 'Reagente Alquímico', peso: 0.2, preco: 30, desc: 'Base para poções, elixires e compostos.' },
    { tipo: 'Essência Mágica', peso: 0.1, preco: 150, desc: 'Cristal de energia. Para encantamentos e runas.' },
  ]

  const recipes = [
    { nome: 'Peitoral Leve', rank: 'Comum', materiais: '4 Metal Comum + 2 Couro', tempo: '4h', cd: 12 },
    { nome: 'Peitoral Comum', rank: 'Comum', materiais: '6 Metal Comum + 3 Couro', tempo: '6h', cd: 14 },
    { nome: 'Peitoral Pesado', rank: 'Incomum', materiais: '8 Metal Refinado + 2 Couro', tempo: '10h', cd: 16 },
    { nome: 'Elmo de Qualidade', rank: 'Raro', materiais: '3 Metal Refinado + 1 Essência Mágica', tempo: '6h', cd: 16 },
    { nome: 'Armadura Encantada', rank: 'Épico', materiais: '5 Metal Precioso + 3 Essência Mágica', tempo: '16h', cd: 18 },
    { nome: 'Peça Ancestral', rank: 'Ancestral', materiais: '8 Metal Precioso + 5 Essência Mágica + 1 Reagente Raro', tempo: '24h', cd: 20 },
    { nome: 'Kit Médico', rank: 'Comum', materiais: '2 Reagente Alquímico + 1 Couro', tempo: '1h', cd: 12 },
    { nome: 'Granada Improvisada', rank: 'Comum', materiais: '3 Metal Comum + 2 Reagente Alquímico', tempo: '2h', cd: 14 },
  ]

  return (
    <div className="space-y-6">
      <SectionTitle>Criação & Forja</SectionTitle>
      <p className="text-txt-dim text-sm mb-4">
        Personagens podem criar equipamentos, itens de utilidade e consumíveis usando perícia, materiais e tempo. A perícia
        utilizada define o tipo de item que pode ser criado e a CD do teste de criação.
      </p>

      <div className="bg-void rounded-xl border border-amber-300/20 p-4">
        <h3 className="text-amber-300 text-sm font-semibold mb-3">Perícias de Criação</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {craftingSkills.map((s, i) => (
            <div key={i} className="bg-void/60 border border-amber-300/15 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-amber-200 font-semibold text-sm">{s.skill}</span>
                <span className="text-amber-300 font-mono text-xs">CD {s.cd}+</span>
              </div>
              <p className="text-txt-dim text-xs">{s.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-txt-dim text-xs mt-2">A CD base é para rank Comum. Cada rank acima de Comum adiciona +2 à CD. Módulo "Forja Pessoal" reduz a CD em 2.</p>
      </div>

      <div className="bg-void rounded-xl border border-sky-400/20 p-4">
        <h3 className="text-sky-400 text-sm font-semibold mb-3">Matérias-Primas</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sep/40">
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Material</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Peso (un.)</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Preço (PO)</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Uso</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((m, i) => (
                <tr key={i} className="border-b border-sep/20 hover:bg-void/40">
                  <td className="py-2 px-3 text-txt-main font-semibold">{m.tipo}</td>
                  <td className="py-2 px-3 font-mono text-txt-dim">{m.peso} kg</td>
                  <td className="py-2 px-3 font-mono text-amber-300">{m.preco} PO</td>
                  <td className="py-2 px-3 text-txt-dim text-xs">{m.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-void rounded-xl border border-emerald-400/20 p-4">
        <h3 className="text-emerald-400 text-sm font-semibold mb-3">Receitas de Exemplo</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sep/40">
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Item</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Rank</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Materiais</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Tempo</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">CD</th>
              </tr>
            </thead>
            <tbody>
              {recipes.map((r, i) => (
                <tr key={i} className="border-b border-sep/20 hover:bg-void/40">
                  <td className="py-2 px-3 text-txt-main font-semibold">{r.nome}</td>
                  <td className="py-2 px-3 font-cinzel text-amber-300">{r.rank}</td>
                  <td className="py-2 px-3 text-txt-dim text-xs">{r.materiais}</td>
                  <td className="py-2 px-3 font-mono text-sky-400">{r.tempo}</td>
                  <td className="py-2 px-3 font-mono text-primary">{r.cd}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-void rounded-xl border border-purple-400/20 p-4">
        <h3 className="text-purple-400 text-sm font-semibold mb-3">Regras de Criação</h3>
        <div className="space-y-2 text-xs text-txt-dim">
          <div className="flex gap-2 items-start">
            <span className="text-purple-300 font-bold shrink-0">1. Preparação:</span>
            <span>O personagem precisa ter os materiais, ferramentas básicas e acesso a uma bancada/ferraria (ou ambiente adequado).</span>
          </div>
          <div className="flex gap-2 items-start">
            <span className="text-purple-300 font-bold shrink-0">2. Teste:</span>
            <span>Teste da perícia relevante contra a CD do item. O grau de treinamento limita o rank máximo criável (Treinado=Comum/Incomum, Veterano=Raro/Épico, Especialista=Heroico/Ancestral, Mestre=Mítico/Transcendente).</span>
          </div>
          <div className="flex gap-2 items-start">
            <span className="text-emerald-400 font-bold shrink-0">Sucesso:</span>
            <span>O item é criado com propriedades completas. Sucesso com margem ≥5: o item recebe +1 em um atributo à escolha.</span>
          </div>
          <div className="flex gap-2 items-start">
            <span className="text-amber-300 font-bold shrink-0">Sucesso parcial (falha por 1-3):</span>
            <span>O item é criado, mas com −2 em um atributo aleatório. Pode ser rerolado como reparo.</span>
          </div>
          <div className="flex gap-2 items-start">
            <span className="text-red-400 font-bold shrink-0">Falha (por 4+):</span>
            <span>Os materiais são desperdiçados. Metade do custo em PO é perdido.</span>
          </div>
          <div className="flex gap-2 items-start">
            <span className="text-sky-400 font-bold shrink-0">Assistência:</span>
            <span>Até 2 aliados podem ajudar, cada um concedendo +2 no teste desde que tenham a mesma perícia treinada.</span>
          </div>
        </div>
      </div>

      <div className="bg-void/40 border border-sep/30 rounded-lg p-3 text-xs text-txt-dim space-y-1">
        <p className="text-primary font-semibold text-sm mb-1">Notas</p>
        <p>• O Mestre pode criar receitas customizadas ou ajustar CDs conforme a complexidade do item.</p>
        <p>• Itens mágicos (encantados) exigem o dobro de Essência Mágica e perícia Poder ou Alquimia.</p>
        <p>• O Módulo "Forja Pessoal" concede proficiência em criação, reduz CD em 2 e permite criar 1 item por descanso longo sem teste.</p>
        <p>• Armas seguem as mesmas regras, usando perícia adequada (Tecnologia para armas de fogo, Sobrevivência para arcos, etc.).</p>
      </div>
    </div>
  )
}

function LegendaryWeaponsSection() {
  const [forgeWeapons, setForgeWeapons] = useState([])

  useEffect(() => {
    let alive = true
    fetchMysticWeapons().then(res => {
      if (alive) setForgeWeapons(res.data || [])
    })
    return () => { alive = false }
  }, [])

  const allLegendary = [
    ...LEGENDARY_WEAPONS,
    ...forgeWeapons.map(fw => ({
      id: fw.id,
      name: fw.name,
      rank: 'Lendária',
      tipo: fw.range || fw.law_name || fw.base || 'Forja Lendária',
      descricao: fw.short_description || fw.effect || '',
      dano: fw.damage || '',
      attr: fw.attribute || '',
      mec: fw.mechanic || fw.effect || '',
      habilidades: fw.abilities || [],
      power_level: fw.power_level || '',
      _source: 'forge',
    })),
  ]

  const powerLabel = (pl) => (WEAPON_POWER_LEVELS.find(p => p.value === pl) || {}).label || pl || ''

  return (
    <div className="space-y-6">
      <SectionTitle>Armas Lendárias</SectionTitle>
      <p className="text-txt-dim text-sm mb-4">
        Armas Lendárias são itens únicos e exclusivos da narrativa. Qualquer jogador pode <span className="text-lime-200">visualizar</span> as armas lendárias existentes,
        mas <span className="text-lime-200 font-semibold">apenas o Mestre (Admin)</span> pode atribuí-las a personagens específicos.
      </p>

      <div className="bg-void rounded-xl border border-lime-300/20 p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lime-300 text-lg">★</span>
          <h3 className="text-lime-300 font-cinzel text-base">Como Funciona</h3>
        </div>
        <ul className="space-y-1.5 text-xs text-txt-dim">
          <li>• Armas Lendárias são peças narrativas exclusivas da Forja Lendária, separadas dos ranks comuns de arma.</li>
          <li>• Elas são <span className="text-lime-200">atributos narrativos</span> — não podem ser compradas, apenas concedidas pelo Mestre.</li>
          <li>• Uma vez atribuída, a arma substitui ou complementa o arsenal do personagem.</li>
          <li>• O Mestre define quando e como a arma entra na campanha.</li>
        </ul>
      </div>

      <div className="space-y-4">
        {allLegendary.length === 0 && (
          <p className="text-txt-dim/50 text-sm italic">Nenhuma arma lendária criada ainda.</p>
        )}
        {allLegendary.map(lw => (
          <div key={lw.id} className="bg-void/60 border border-lime-300/20 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-lg bg-lime-300/10 border border-lime-300/30 flex items-center justify-center text-2xl">⚔</div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lime-200 font-cinzel text-lg font-bold">{lw.name}</span>
                  <span className="text-[10px] bg-lime-300/10 text-lime-300 px-1.5 py-0.5 rounded border border-lime-300/20">{lw.rank}</span>
                  {lw.tipo && <span className="text-[10px] text-txt-dim">{lw.tipo}</span>}
                  {lw._source === 'forge' && <span className="text-[8px] bg-amber-400/10 text-amber-400 px-1 py-0.5 rounded">Forja</span>}
                  {lw.power_level && <span className="text-[8px] bg-purple-400/10 text-purple-400 px-1 py-0.5 rounded">{powerLabel(lw.power_level)}</span>}
                </div>
                {lw.descricao && <p className="text-txt-dim text-xs mt-0.5">{lw.descricao}</p>}
              </div>
            </div>

            {(lw.dano || lw.attr) && (
              <div className="grid grid-cols-3 gap-3 mb-3">
                {lw.dano && (
                  <div className="bg-deep rounded-lg border border-sep/30 p-2 text-center">
                    <span className="text-txt-dim text-[9px] uppercase">Dano</span>
                    <p className="text-red-400 font-mono text-sm">{lw.dano}</p>
                  </div>
                )}
                {lw.attr && (
                  <div className="bg-deep rounded-lg border border-sep/30 p-2 text-center">
                    <span className="text-txt-dim text-[9px] uppercase">Atributo</span>
                    <p className="text-txt-main font-mono text-sm">{lw.attr}</p>
                  </div>
                )}
                <div className="bg-deep rounded-lg border border-sep/30 p-2 text-center">
                  <span className="text-txt-dim text-[9px] uppercase">Rank</span>
                  <p className="text-lime-300 font-mono text-sm">{lw.rank}</p>
                </div>
              </div>
            )}

            {lw.mec && (
              <div className="bg-deep rounded-lg border border-sep/30 p-2.5 mb-3">
                <span className="text-txt-dim text-[9px] uppercase">Mecânica Única</span>
                <p className="text-gold/80 text-xs mt-0.5 leading-relaxed">{lw.mec}</p>
              </div>
            )}

            {(lw.habilidades || []).length > 0 && (
              <div>
                <span className="text-lime-300 text-[10px] uppercase tracking-wider font-semibold">Habilidades</span>
                <div className="space-y-1.5 mt-2">
                  {(lw.habilidades || []).map((h, i) => (
                    <div key={i} className="bg-lime-300/5 border border-lime-300/15 rounded-lg p-2.5">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-lime-200 text-xs font-semibold">{h.nome}</span>
                        {h.potencia && <span className="text-[9px] bg-lime-300/10 text-lime-300 px-1.5 py-0.5 rounded">{h.potencia}</span>}
                        {h.tipo && <span className={`text-[9px] px-1.5 py-0.5 rounded ${h.tipo === 'Passiva' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-sky-400/10 text-sky-400'}`}>{h.tipo}</span>}
                        {h.custo && <span className="text-[9px] text-gold/60 font-mono ml-auto">{h.custo}</span>}
                      </div>
                      <p className="text-txt-dim text-[11px] leading-relaxed">{h.descricao}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function MartialArtsSection() {
  return (
    <div>
      <SectionTitle>Artes Marciais</SectionTitle>
      <p className="text-txt-dim text-sm mb-4">Usadas desarmado. Graus: Novato → Treinado → Formado → Especialista.</p>
      <div className="grid gap-4 md:grid-cols-2">
        {MARTIAL_ARTS.map(art => (
          <div key={art.id} className="bg-void rounded-lg p-4 border border-sep">
            <h3 className="text-gold font-cinzel text-lg mb-2">{art.name}</h3>
            <div className="space-y-2">
              {[0, 1, 2, 3].map(g => {
                const grau = art.graus[g]
                return (
                  <div key={g} className="flex gap-2 items-start">
                    <span className={`shrink-0 px-2 py-1 rounded text-xs font-semibold ${g === 0 ? 'bg-sep text-txt-dim' : g === 1 ? 'bg-gold/20 text-gold' : g === 2 ? 'bg-gold/30 text-gold-light' : 'bg-gold/50 text-gold-light'}`}>
                      {grau.nome}
                    </span>
                    <span className="text-txt-main text-sm">{grau.desc}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AlchemySection() {
  const [expanded, setExpanded] = useState(null)
  const circleGuides = [
    { circle: 1, label: '1o Circulo', focus: 'Uso frequente, baixo risco, efeitos curtos.', examples: 'Mobilidade, pequenos debuffs, empurroes, buffs basicos.' },
    { circle: 2, label: '2o Circulo', focus: 'Ferramentas de combate consistentes.', examples: 'Defesas reativas, zonas pequenas, dano medio, mutacoes pontuais.' },
    { circle: 3, label: '3o Circulo', focus: 'Rituais de pressao alta e custo real.', examples: 'Cura forte, colapsos localizados, perda parcial de acao, controle reativo.' },
    { circle: 4, label: '4o Circulo', focus: 'Fenomenos catastroficos e risco severo ao Veu.', examples: 'Areas devastadoras, estase ampla, colapso energetico, picos corporais.' },
  ]

  const classRows = Object.entries(CLASS_AFFINITY).map(([key, value]) => ({
    name: key,
    budget: value.budget,
    circle: value.circle,
    notes: value.notes.join(' '),
  }))

  const raceRows = Object.entries(RACE_AFFINITY)
    .filter(([, value]) => value.budget !== 0 || value.circle !== 0 || value.notes.length > 0)
    .map(([key, value]) => ({
      name: key,
      budget: value.budget,
      circle: value.circle,
      notes: value.notes.join(' '),
    }))
    .sort((a, b) => (b.budget + b.circle) - (a.budget + a.circle) || a.name.localeCompare(b.name))

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle>Alquimia</SectionTitle>
        <p className="text-txt-dim text-sm">
          Alquimia e o estudo ritual do Abismo, dos Regentes e das Entidades do Limiar. Qualquer personagem pode aprender, mas nivel, grau de treinamento em Alquimia, classe e raca definem quantos espacos ritualisticos consegue sustentar sem quebrar o Veu cedo demais.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-void/60 rounded-xl border border-teal-400/20 p-4">
          <div className="text-teal-300 text-xs font-semibold uppercase tracking-wider mb-2">Como funciona</div>
          <p className="text-txt-dim text-sm leading-relaxed">
            Cada ritual consome PE, pertence a um circulo e nasce de uma origem. O personagem escolhe rituais na finalizacao da ficha, respeitando espacos disponiveis, limite por circulo e nivel minimo.
          </p>
        </div>
        <div className="bg-void/60 rounded-xl border border-purple-400/20 p-4">
          <div className="text-purple-300 text-xs font-semibold uppercase tracking-wider mb-2">Origem do ritual</div>
          <p className="text-txt-dim text-sm leading-relaxed">
            Alem da categoria, cada ritual mostra seu <span className="text-purple-300">Regente Original</span> ou entidade-fonte. Isso ajuda a identificar a escola metafisica da formula e o tipo de risco narrativo envolvido.
          </p>
        </div>
        <div className="bg-void/60 rounded-xl border border-amber-300/20 p-4">
          <div className="text-amber-300 text-xs font-semibold uppercase tracking-wider mb-2">Risco ao Veu</div>
          <p className="text-txt-dim text-sm leading-relaxed">
            Quanto maior o circulo, maior a tensao no Veu. Rituais de 4o circulo costumam tocar a Camada 3 do protocolo e exigem custos, contrapesos e rupturas mais severas.
          </p>
        </div>
      </div>

      <div className="bg-void rounded-xl border border-gold/25 p-4">
        <div className="text-gold text-sm font-semibold mb-3">Fórmula de Espaços</div>
        <p className="text-gold font-mono text-sm text-center py-2">
          Total = Base por Nível + Treinamento + Classe + Raça
        </p>
        <p className="text-txt-dim text-xs mt-2 text-center">
          O <strong className="text-teal-300">Nível</strong> é o maior contribuidor individual (8 espaços no N1 até 28 no N30).
          Treinamento em Alquimia, classe e raça adicionam ou subtraem modificadores.
        </p>
      </div>

      <div className="bg-void rounded-xl border border-sep p-4">
        <div className="text-gold text-sm font-semibold mb-3">Contribuição do Nível (Base)</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sep/40">
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Faixa</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Espacos base</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Circulo maximo</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Limites</th>
              </tr>
            </thead>
            <tbody>
              {BASE_RULES_BY_LEVEL.map((rule) => (
                <tr key={rule.maxLevel} className="border-b border-sep/20 hover:bg-void/40">
                  <td className="py-2 px-3 text-txt-main">Nivel 1-{rule.maxLevel}</td>
                  <td className="py-2 px-3 font-mono text-teal-300">{rule.spaceBudget}</td>
                  <td className="py-2 px-3 font-mono text-gold">{rule.maxCircle}o circulo</td>
                  <td className="py-2 px-3 text-txt-dim text-xs">1o:{rule.maxByCircle[1]} | 2o:{rule.maxByCircle[2]} | 3o:{rule.maxByCircle[3]} | 4o:{rule.maxByCircle[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-void rounded-xl border border-sep p-4">
        <div className="text-gold text-sm font-semibold mb-3">Treinamento em Alquimia</div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          {Object.entries(ALCHEMY_TRAINING_RULES).map(([level, info]) => (
            <div key={level} className="bg-deep rounded-lg border border-sep/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-cinzel text-teal-300">{info.label}</span>
                <span className="text-[10px] bg-sep/20 text-txt-dim px-1.5 py-0.5 rounded">Grau {level}</span>
              </div>
              <div className="mt-2 space-y-1 text-xs">
                <div className="text-txt-dim">Espacos: <span className="text-gold font-mono">{info.budget >= 0 ? '+' : ''}{info.budget}</span></div>
                <div className="text-txt-dim">Teto de circulo: <span className="text-sky-300 font-mono">{info.maxCircle}o</span></div>
                <p className="text-txt-dim leading-relaxed">{info.notes.join(' ')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-void rounded-xl border border-sep p-4">
          <div className="text-gold text-sm font-semibold mb-3">O que a classe te concede</div>
          <div className="space-y-2">
            {classRows.map((row) => (
              <div key={row.name} className="bg-deep rounded-lg border border-sep/30 p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-txt-main font-semibold">{row.name}</span>
                  <span className="text-[10px] bg-teal-400/10 text-teal-300 px-1.5 py-0.5 rounded border border-teal-400/20">
                    {row.budget >= 0 ? '+' : ''}{row.budget} espacos
                  </span>
                  <span className="text-[10px] bg-gold/10 text-gold px-1.5 py-0.5 rounded border border-gold/20">
                    {row.circle >= 0 ? '+' : ''}{row.circle} circulo
                  </span>
                </div>
                <p className="text-txt-dim text-xs mt-2">{row.notes}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-void rounded-xl border border-sep p-4">
          <div className="text-gold text-sm font-semibold mb-3">O que a raça te concede ou limita</div>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {raceRows.map((row) => (
              <div key={row.name} className="bg-deep rounded-lg border border-sep/30 p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-txt-main font-semibold">{row.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${row.budget >= 0 ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' : 'bg-red-400/10 text-red-400 border-red-400/20'}`}>
                    {row.budget >= 0 ? '+' : ''}{row.budget} espacos
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${row.circle >= 0 ? 'bg-gold/10 text-gold border-gold/20' : 'bg-red-400/10 text-red-400 border-red-400/20'}`}>
                    {row.circle >= 0 ? '+' : ''}{row.circle} circulo
                  </span>
                </div>
                <p className="text-txt-dim text-xs mt-2">{row.notes}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-void rounded-xl border border-sep p-4">
        <div className="text-gold text-sm font-semibold mb-3">Leitura dos circulos</div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {circleGuides.map((guide) => (
            <div key={guide.circle} className="bg-deep rounded-lg border border-sep/30 p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-cinzel text-teal-300">{guide.label}</span>
                <span className="text-[10px] bg-sep/20 text-txt-dim px-1.5 py-0.5 rounded">{SPACE_COST_BY_CIRCLE[guide.circle]} espacos</span>
              </div>
              <p className="text-txt-main text-xs leading-relaxed">{guide.focus}</p>
              <p className="text-txt-dim text-xs leading-relaxed mt-2">{guide.examples}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-void rounded-xl border border-sep p-4">
        <div className="text-gold text-sm font-semibold mb-3">Exemplos da biblioteca</div>
        <div className="space-y-3">
          {ALCHEMY_FALLBACK_RITUALS.slice(0, 6).map((ritual) => {
            const isExpanded = expanded === ritual.id
            return (
              <div key={ritual.id} className="rounded-lg border border-sep/30 bg-deep/80 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : ritual.id)}
                  className="w-full px-4 py-3 text-left hover:bg-void/30 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-txt-main font-semibold">{ritual.name}</span>
                    <span className="text-[10px] bg-teal-400/10 text-teal-300 px-1.5 py-0.5 rounded border border-teal-400/20">{ritual.circle}o circulo</span>
                    <span className="text-[10px] bg-sep/20 text-txt-dim px-1.5 py-0.5 rounded">{ritual.category}</span>
                    <span className="text-[10px] bg-purple-400/10 text-purple-300 px-1.5 py-0.5 rounded border border-purple-400/20">{ritual.source_name}</span>
                  </div>
                  <p className="text-txt-dim text-xs mt-1">{ritual.short_description}</p>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-sep/20 space-y-2">
                    <div className="pt-3 flex flex-wrap gap-2 text-[11px] font-mono">
                      <span className="text-amber-300">{ritual.pe_cost} PE</span>
                      <span className="text-gold">{SPACE_COST_BY_CIRCLE[ritual.circle]} espacos</span>
                      <span className="text-sky-300">{ritual.action_cost}</span>
                      <span className="text-txt-dim">{ritual.range}</span>
                      <span className="text-red-300">Ruptura {ritual.rupture_risk}/4</span>
                    </div>
                    <p className="text-txt-main text-xs leading-relaxed">{ritual.effect}</p>
                    <p className="text-txt-dim text-xs"><span className="text-purple-300">Lei:</span> {ritual.law_name}</p>
                    <p className="text-txt-dim text-xs"><span className="text-amber-300">Contrapeso:</span> {ritual.price}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SpellsSection() {
  const [expanded, setExpanded] = useState(null)

  const SPELL_CIRCLES_9 = [
    { circle: 1, label: '1o Circulo', pe: '6-12', cd: '12-14', desc: 'Suporte basico, resposta curta', cost: 4 },
    { circle: 2, label: '2o Circulo', pe: '12-20', cd: '14-16', desc: 'Combate regular, versatilidade', cost: 6 },
    { circle: 3, label: '3o Circulo', pe: '20-30', cd: '17-19', desc: 'Assinatura de escola, impacto alto', cost: 10 },
    { circle: 4, label: '4o Circulo', pe: '30-42', cd: '20-23', desc: 'Raro, epico. Efeitos poderosos', cost: 15 },
    { circle: 5, label: '5o Circulo', pe: '42-55', cd: '22-25', desc: 'Poder elevado. Dominio de escola', cost: 20 },
    { circle: 6, label: '6o Circulo', pe: '55-70', cd: '24-27', desc: 'Devastador. Efeitos de area massivos', cost: 26 },
    { circle: 7, label: '7o Circulo', pe: '70-90', cd: '26-29', desc: 'Lenda viva. Altera o campo de batalha', cost: 33 },
    { circle: 8, label: '8o Circulo', pe: '90-120', cd: '28-31', desc: 'Quase divino. Efeitos persistentes', cost: 42 },
    { circle: 9, label: '9o Circulo', pe: '120-160', cd: '30-34', desc: 'Apice absoluto. Exclusivo de Hierofantes', cost: 52 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle>Feitiços</SectionTitle>
        <p className="text-txt-dim text-sm">
          Feitiços são repertórios de conjuração com <span className="text-gold font-semibold">9 circulos de poder</span> (inspirado em D&D).
          O sistema diferencia <span className="text-emerald-300">Bruxaria</span> e <span className="text-sky-300">Arcana</span>.
          <strong className="text-red-300"> Rituais vao ate 4o circulo. Feitiços ate 9o.</strong>
        </p>
      </div>

      <div className="bg-void rounded-xl border border-gold/25 p-4">
        <div className="text-gold text-sm font-semibold mb-3">Circulos de Feitiço (1-9)</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-sep text-txt-dim">
                <th className="py-2 px-2 text-left">Circulo</th>
                <th className="py-2 px-2 text-left">PE</th>
                <th className="py-2 px-2 text-left">CD</th>
                <th className="py-2 px-2 text-left">Espaco</th>
                <th className="py-2 px-2 text-left">Descricao</th>
              </tr>
            </thead>
            <tbody>
              {SPELL_CIRCLES_9.map(c => (
                <tr key={c.circle} className="border-b border-sep/20 hover:bg-void/40">
                  <td className="py-1.5 px-2 font-cinzel text-gold font-semibold">{c.label}</td>
                  <td className="py-1.5 px-2 font-mono text-sky-300">{c.pe}</td>
                  <td className="py-1.5 px-2 font-mono text-amber-300">{c.cd}</td>
                  <td className="py-1.5 px-2 font-mono text-txt-dim">{c.cost}</td>
                  <td className="py-1.5 px-2 text-txt-dim">{c.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-void rounded-xl border border-red-400/20 p-4">
        <div className="text-red-400 text-sm font-semibold mb-3">Importante: Feitiços NAO substituem Habilidades</div>
        <ul className="space-y-1.5 text-xs text-txt-dim">
          <li>• A principal forma de eficacia em combate sao as <strong className="text-txt-main">Habilidades do personagem</strong>.</li>
          <li>• Feitiços servem como <strong className="text-sky-300">apoio</strong>: controle, utilidade, burst situacional.</li>
          <li>• Mesmo um personagem com 9 feitiços depende de suas habilidades para combate sustentado.</li>
          <li>• Conjurar um feitiço consome a <strong className="text-amber-300">Acao Padrao</strong> daquele turno — nao pode usar habilidade E feitiço na mesma acao.</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-void rounded-xl border border-sep p-4">
          <div className="text-gold text-sm font-semibold mb-3">Quem realmente acessa Feitiços</div>
          <ul className="space-y-2 text-xs text-txt-dim">
            <li><span className="text-emerald-300 font-semibold">Bruxas</span>: acesso ate 6o circulo. Referencia em maldicao e vinculo.</li>
            <li><span className="text-gold font-semibold">Humanos Misticos</span>: unicos com potencial para 9o circulo. Acesso completo.</li>
            <li><span className="text-purple-300 font-semibold">Misticos</span> de outras racas aptas: repertorio limitado.</li>
          </ul>
        </div>

        <div className="bg-void rounded-xl border border-sep p-4">
          <div className="text-gold text-sm font-semibold mb-3">Treino usado no cálculo</div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            {Object.entries(SPELL_TRAINING_RULES).map(([level, info]) => (
              <div key={level} className="bg-deep rounded-lg border border-sep/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-cinzel text-emerald-300">{info.label}</span>
                  <span className="text-[10px] bg-sep/20 text-txt-dim px-1.5 py-0.5 rounded">Poder {level}</span>
                </div>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="text-txt-dim">Espacos: <span className="text-gold font-mono">{info.budget >= 0 ? '+' : ''}{info.budget}</span></div>
                  <div className="text-txt-dim">Teto: <span className="text-sky-300 font-mono">{info.maxCircle}o</span></div>
                  <p className="text-txt-dim leading-relaxed">{info.notes.join(' ')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-void rounded-xl border border-sep p-4">
        <div className="text-gold text-sm font-semibold mb-3">Tradições de Feitiço</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SPELL_TRADITIONS.map((tradition) => (
            <div key={tradition} className="bg-deep rounded-lg border border-sep/30 p-3">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${tradition === 'arcana' ? 'bg-sky-400/12 text-sky-300 border-sky-400/25' : 'bg-emerald-400/12 text-emerald-300 border-emerald-400/25'}`}>
                  {tradition === 'arcana' ? 'Arcana' : 'Bruxaria'}
                </span>
                <span className="text-txt-main font-semibold">{tradition === 'arcana' ? 'Magia Instantânea' : 'Conjuração de Bruxaria'}</span>
              </div>
              <p className="text-txt-dim text-xs mt-2 leading-relaxed">
                {tradition === 'arcana'
                  ? 'Foco em resposta rápida, rajadas, teleporte, barreiras e leitura estrutural. Magos e Humanos Místicos costumam liderar essa linha.'
                  : 'Foco em vínculo, maldição, cura, sacrifício, palavra proibida e interferência narrativa. Bruxas e linhagens mais ritualistas brilham aqui.'}
              </p>
            </div>
          ))}
        </div>
      </div>

      <MysticExamples
        title="Exemplos de Feitiços"
        items={SPELL_FALLBACK_RITUALS.slice(0, 6)}
        expanded={expanded}
        setExpanded={setExpanded}
        badgeGetter={getTraditionBadge}
      />
    </div>
  )
}

function RunesSection() {
  const [expanded, setExpanded] = useState(null)

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle>Runas</SectionTitle>
        <p className="text-txt-dim text-sm">
          Runas são fragmentos jogáveis derivados das Runas Primordiais. O sistema formaliza três graus de uso prático: <span className="text-emerald-300">Menores</span>, <span className="text-sky-300">Comuns</span> e <span className="text-amber-300">Maiores</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-void rounded-xl border border-sep p-4">
          <div className="text-gold text-sm font-semibold mb-3">Leitura rápida</div>
          <ul className="space-y-2 text-xs text-txt-dim">
            <li>Qualquer personagem pode optar por usar runas.</li>
            <li>O treino em <span className="text-sky-300 font-semibold">Poder</span> define quantas runas, quais círculos e quantas ficam <span className="text-gold font-semibold">ativas ao mesmo tempo</span>.</li>
            <li><span className="text-purple-300 font-semibold">Humano Aprimorado Rúnico</span> recebe uma folga extra de ativação e espaço.</li>
          </ul>
        </div>

        <div className="bg-void rounded-xl border border-sep p-4">
          <div className="text-gold text-sm font-semibold mb-3">Treino de vínculo rúnico</div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            {Object.entries(RUNE_TRAINING_RULES).map(([level, info]) => (
              <div key={level} className="bg-deep rounded-lg border border-sep/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-cinzel text-sky-300">{info.label}</span>
                  <span className="text-[10px] bg-sep/20 text-txt-dim px-1.5 py-0.5 rounded">Poder {level}</span>
                </div>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="text-txt-dim">Espaços: <span className="text-gold font-mono">{info.budget >= 0 ? '+' : ''}{info.budget}</span></div>
                  <div className="text-txt-dim">Ativas: <span className="text-purple-300 font-mono">{info.active}</span></div>
                  <div className="text-txt-dim">Teto: <span className="text-sky-300 font-mono">{info.maxCircle}o</span></div>
                  <p className="text-txt-dim leading-relaxed">{info.notes.join(' ')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-void rounded-xl border border-sep p-4">
        <div className="text-gold text-sm font-semibold mb-3">Graus de Runas</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {RUNE_GRADES.map((grade) => {
            const badge = getRuneGradeBadge({ tags: [`grade:${grade}`] })
            return (
              <div key={grade} className="bg-deep rounded-lg border border-sep/30 p-3">
                <div className={`inline-flex text-[10px] px-1.5 py-0.5 rounded border ${badge.className}`}>{badge.label}</div>
                <p className="text-txt-dim text-xs mt-2 leading-relaxed">
                  {grade === 'menor' && 'Ferramentas rápidas e legíveis para defesa curta, leitura e impacto simples.'}
                  {grade === 'comum' && 'Selos táticos robustos para zona, suporte, vínculo e mobilidade real.'}
                  {grade === 'maior' && 'Fragmentos muito mais próximos da origem, com custo alto e presença épica.'}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      <MysticExamples
        title="Exemplos de Runas"
        items={RUNE_FALLBACK_RITUALS.slice(0, 9)}
        expanded={expanded}
        setExpanded={setExpanded}
        badgeGetter={getRuneGradeBadge}
      />
    </div>
  )
}

function GrimoriosSection() {
  const tiers = [
    { id: 'iniciante', name: 'Grimório de Iniciante', maxCircle: 2, maxRituals: 6, color: 'emerald' },
    { id: 'avancado', name: 'Grimório Avançado', maxCircle: 3, maxRituals: 10, color: 'sky' },
    { id: 'mestre', name: 'Grimório de Mestre', maxCircle: 4, maxRituals: 14, color: 'amber' },
  ]
  const tiersColor = {
    emerald: 'border-emerald-400/25 bg-emerald-400/5',
    sky: 'border-sky-400/25 bg-sky-400/5',
    amber: 'border-amber-300/25 bg-amber-300/5',
  }
  const tiersText = {
    emerald: 'text-emerald-400',
    sky: 'text-sky-400',
    amber: 'text-amber-300',
  }
  return (
    <div>
      <SectionTitle>Grimórios</SectionTitle>
      <p className="text-txt-dim text-sm mb-6">
        Grimórios são tomos de conhecimento que organizam rituais por escola e complexidade. Cada conhecimento místico
        (Alquimia, Feitiços, Magias) possui três tiers de grimórios públicos, e personagens também podem criar grimórios
        pessoais. Runas <strong className="text-txt-main">não usam grimórios</strong>.
      </p>

      <div className="text-gold text-sm font-semibold mb-3">Como funciona o acesso</div>
      <p className="text-txt-dim text-sm mb-4">
        O acesso a cada tier é determinado por uma <strong className="text-txt-main">pontuação de afinidade</strong> calculada
        a partir dos atributos do personagem, seu nível e seu grau de treinamento. Grimórios são <strong className="text-txt-main">evolutivos</strong>:
        ao desbloquear Avançado, você também acessa Iniciante; ao desbloquear Mestre, acessa todos.
      </p>

      <div className="bg-void rounded-xl border border-sep p-4 mb-6">
        <div className="text-gold text-sm font-semibold mb-3">Fórmula de Afinidade</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-deep rounded-lg border border-teal-400/20 p-3">
            <div className="text-teal-300 text-xs font-semibold mb-2">Alquimia</div>
            <p className="text-gold font-mono text-sm text-center py-2">
              INT × 0,5 + AM × 0,3 + Alquimia × 4 + Nível
            </p>
            <p className="text-txt-dim text-[10px] mt-1">
              <strong className="text-txt-main">Alquimia</strong> = grau treinado na perícia Alquimia (0–4).
              INT e AM incluem pontos de esqueleto. <strong className="text-teal-300">Nível é o principal fator.</strong>
            </p>
          </div>
          <div className="bg-deep rounded-lg border border-orange-400/20 p-3">
            <div className="text-orange-300 text-xs font-semibold mb-2">Feitiços e Magias</div>
            <p className="text-gold font-mono text-sm text-center py-2">
              AM × 0,5 + INT × 0,3 + Poder × 4 + Nível
            </p>
            <p className="text-txt-dim text-[10px] mt-1">
              <strong className="text-txt-main">Poder</strong> = grau treinado na perícia Poder (0–4).
              AM e INT incluem pontos de esqueleto. <strong className="text-orange-300">Nível é o principal fator.</strong>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-void rounded-xl border border-sep p-4 mb-6">
        <div className="text-gold text-sm font-semibold mb-3">Thresholds de Acesso</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sep/40">
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Tier</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Afinidade necessária</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Círculos</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Rituais máx.</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Tiros de Criação</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Rituais Autorais</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-sep/20">
                <td className={`py-2 px-3 font-semibold ${tiersText.emerald}`}>Iniciante</td>
                <td className="py-2 px-3 font-mono text-gold">≥ 15</td>
                <td className="py-2 px-3 font-mono">1o–2o</td>
                <td className="py-2 px-3 font-mono">6</td>
                <td className="py-2 px-3 font-mono text-gold">3 + ⌊N/5⌋ + ⌊(AM−10)/4⌋</td>
                <td className="py-2 px-3 font-mono">2</td>
              </tr>
              <tr className="border-b border-sep/20">
                <td className={`py-2 px-3 font-semibold ${tiersText.sky}`}>Avançado</td>
                <td className="py-2 px-3 font-mono text-gold">≥ 30</td>
                <td className="py-2 px-3 font-mono">1o–3o</td>
                <td className="py-2 px-3 font-mono">10</td>
                <td className="py-2 px-3 font-mono text-gold">5 + ⌊N/5⌋ + ⌊(AM−10)/4⌋</td>
                <td className="py-2 px-3 font-mono">4</td>
              </tr>
              <tr className="border-b border-sep/20">
                <td className={`py-2 px-3 font-semibold ${tiersText.amber}`}>Mestre</td>
                <td className="py-2 px-3 font-mono text-gold">≥ 50</td>
                <td className="py-2 px-3 font-mono">1o–4o</td>
                <td className="py-2 px-3 font-mono">14</td>
                <td className="py-2 px-3 font-mono text-gold">8 + ⌊N/5⌋ + ⌊(AM−10)/4⌋</td>
                <td className="py-2 px-3 font-mono">6</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-gold text-sm font-semibold mb-3">Os três Tiers</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {tiers.map(t => (
          <div key={t.id} className={`rounded-xl border p-4 ${tiersColor[t.color]}`}>
            <div className={`font-cinzel text-lg font-bold mb-2 ${tiersText[t.color]}`}>{t.name}</div>
            <div className="space-y-1 text-xs text-txt-dim">
              <p><strong className="text-txt-main">Círculos:</strong> até {t.maxCircle}o círculo</p>
              <p><strong className="text-txt-main">Rituais máximos:</strong> {t.maxRituals} por grimório</p>
              <p><strong className="text-txt-main">Descrição:</strong> {
                t.id === 'iniciante'
                  ? 'Fundamentos e rituais de baixo custo. Ideal para quem inicia o caminho místico.'
                  : t.id === 'avancado'
                  ? 'Ferramentas táticas robustas. Combate real com efeitos de maior complexidade.'
                  : 'Rituais de poder máximo. Acesso ao 4o círculo e efeitos catastróficos.'
              }</p>
            </div>
          </div>
        ))}
      </div>

      <div className="text-gold text-sm font-semibold mb-3">Grimórios Públicos vs Pessoais</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-void rounded-xl border border-gold/20 p-4">
          <div className="text-gold text-sm font-semibold mb-2">Grimórios Públicos</div>
          <ul className="space-y-1 text-xs text-txt-dim">
            <li>• Templates predefinidos com rituais prontos para escolha</li>
            <li>• Desbloqueados conforme o tier de afinidade do personagem</li>
            <li>• Cada conhecimento tem 3 grimórios públicos (Iniciante, Avançado, Mestre)</li>
            <li>• O jogador escolhe rituais do grimório para compor sua biblioteca</li>
            <li>• Não é possível adicionar rituais customizados a grimórios públicos</li>
          </ul>
        </div>
        <div className="bg-void rounded-xl border border-purple-400/20 p-4">
          <div className="text-purple-300 text-sm font-semibold mb-2">Grimórios Pessoais</div>
          <ul className="space-y-1 text-xs text-txt-dim">
            <li>• Criados pelo jogador — começam <strong className="text-txt-main">vazios</strong></li>
            <li>• Máximo de 30 rituais por grimório pessoal</li>
            <li>• Rituais criados gastam <strong className="text-amber-300">Tiros de Criação</strong></li>
            <li>• A IA Oráculo revisa e balanceia cada ritual criado</li>
            <li>• Limite de rituais autorais varia por tier (2 / 4 / 6)</li>
          </ul>
        </div>
      </div>

      <div className="bg-void rounded-xl border border-sep p-4 mb-6">
        <div className="text-gold text-sm font-semibold mb-3">Nível mínimo por Círculo</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { circle: 1, min: 1, color: 'emerald' },
            { circle: 2, min: 5, color: 'sky' },
            { circle: 3, min: 11, color: 'purple' },
            { circle: 4, min: 18, color: 'amber' },
          ].map(c => (
            <div key={c.circle} className="bg-deep rounded-lg border border-sep/30 p-3 text-center">
              <div className={`text-lg font-bold font-mono ${c.color === 'emerald' ? 'text-emerald-400' : c.color === 'sky' ? 'text-sky-400' : c.color === 'purple' ? 'text-purple-400' : 'text-amber-300'}`}>
                {c.circle}o Círculo
              </div>
              <div className="text-txt-dim text-xs mt-1">Nível {c.min}+</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-void/40 border border-sep/30 rounded-lg p-3 text-xs text-txt-dim space-y-1">
        <p className="text-gold font-semibold text-sm mb-1">Observações</p>
        <p>• Grimórios são evolutivos: acessar Avançado inclui Iniciante; acessar Mestre inclui todos.</p>
        <p>• Runas <strong className="text-txt-main">não possuem grimórios</strong> — são gerenciadas separadamente por grau (Menor, Comum, Maior).</p>
        <p>• A afinidade é calculada automaticamente na ficha. O card de conhecimento mostra a pontuação atual e o próximo threshold.</p>
        <p>• Tiros de Criação = base do tier + ⌊Nível/5⌋ + ⌊(AM−10)/4⌋. Cada ritual criado consome 1 tiro.</p>
        <p>• Necromancia é classificada como Alquimia para cálculo de acesso.</p>
      </div>
    </div>
  )
}

function MysticExamples({ title, items, expanded, setExpanded, badgeGetter }) {
  return (
    <div className="bg-void rounded-xl border border-sep p-4">
      <div className="text-gold text-sm font-semibold mb-3">{title}</div>
      <div className="space-y-3">
        {items.map((item) => {
          const isExpanded = expanded === item.id
          const badge = badgeGetter(item)
          return (
            <div key={item.id} className="rounded-lg border border-sep/30 bg-deep/80 overflow-hidden">
              <button
                type="button"
                onClick={() => setExpanded(isExpanded ? null : item.id)}
                className="w-full px-4 py-3 text-left hover:bg-void/30 transition-colors"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-txt-main font-semibold">{item.name}</span>
                  <span className="text-[10px] bg-teal-400/10 text-teal-300 px-1.5 py-0.5 rounded border border-teal-400/20">{item.circle}o circulo</span>
                  <span className="text-[10px] bg-sep/20 text-txt-dim px-1.5 py-0.5 rounded">{item.category}</span>
                  {badge && <span className={`text-[10px] px-1.5 py-0.5 rounded border ${badge.className}`}>{badge.label}</span>}
                  <span className="text-[10px] bg-purple-400/10 text-purple-300 px-1.5 py-0.5 rounded border border-purple-400/20">{item.source_name}</span>
                </div>
                <p className="text-txt-dim text-xs mt-1">{item.short_description}</p>
              </button>
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-sep/20 space-y-2">
                  <div className="pt-3 flex flex-wrap gap-2 text-[11px] font-mono">
                    <span className="text-amber-300">{item.pe_cost} PE</span>
                    <span className="text-gold">{SPACE_COST_BY_CIRCLE[item.circle]} espacos</span>
                    <span className="text-sky-300">{item.action_cost}</span>
                    <span className="text-txt-dim">{item.range}</span>
                    <span className="text-red-300">Risco {item.rupture_risk}/4</span>
                  </div>
                  <p className="text-txt-main text-xs leading-relaxed">{item.effect}</p>
                  <p className="text-txt-dim text-xs"><span className="text-purple-300">Lei:</span> {item.law_name}</p>
                  <p className="text-txt-dim text-xs"><span className="text-amber-300">Contrapeso:</span> {item.price}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MysticHierarchySection() {
  return (
    <div className="space-y-6">
      <SectionTitle>Hierarquia Mística</SectionTitle>
      <p className="text-txt-dim text-sm mb-4">
        Os 4 tipos de conhecimento mistico do Sistema Olympo seguem uma hierarquia clara de poder, complexidade e impacto no combate.
        <strong className="text-red-300"> Nenhum conhecimento substitui as Habilidades do personagem.</strong>
      </p>

      <div className="bg-void rounded-xl border border-purple-400/25 p-4">
        <div className="text-purple-400 text-sm font-semibold mb-3">Hierarquia de Poder dos Conhecimentos</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { tipo: 'Rituais (Alquimia)', circulos: '1o - 4o circulo', papel: 'UTILITARIO — suporte, preparo, tatico', poder: 'Mais fraco. Focado em utilidade e preparo.', cor: 'emerald', req: 'Modulo Estudos de Alquimia' },
            { tipo: 'Feitiços', circulos: '1o - 9o circulo', papel: 'APOIO — combate versatil, controle, burst', poder: 'Versatil. De suporte a devastador (9o).', cor: 'sky', req: 'Bruxa ou Humano Mistico' },
            { tipo: 'Runas', circulos: 'Menor / Comum / Maior', papel: 'PERSISTENTE — selos, efeitos duradouros', poder: 'Moderado. Efeitos persistentes passivos/reativos.', cor: 'amber', req: 'Modulo Vinculo Runico' },
            { tipo: 'Magias', circulos: '1o - 4o circulo (Basica a Suprema)', papel: 'PODER PURO — densos, exigentes, devastadores', poder: 'Mais forte por circulo. +10-15% vs Feiticos.', cor: 'red', req: 'Mago, Demonio, Elfo, Humano Mistico' },
          ].map((item, i) => (
            <div key={i} className={`bg-deep rounded-lg border border-${item.cor}-400/25 p-3`}>
              <div className={`text-${item.cor}-300 text-sm font-cinzel font-bold mb-2`}>{item.tipo}</div>
              <div className="space-y-1 text-xs text-txt-dim">
                <div>Circulos: <span className="text-gold font-semibold">{item.circulos}</span></div>
                <div>Papel: <span className="text-txt-main font-semibold">{item.papel}</span></div>
                <div>{item.poder}</div>
                <div className="text-[10px] border-t border-sep/20 pt-1 mt-1">Requisito: <span className="text-sky-300">{item.req}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-void rounded-xl border border-red-400/20 p-4">
        <div className="text-red-400 text-sm font-semibold mb-3">Regra de Ouro: Conhecimentos NAO Substituem Habilidades</div>
        <div className="space-y-3">
          <div className="bg-deep rounded-lg border border-red-400/15 p-3">
            <ul className="space-y-1.5 text-xs text-txt-dim">
              <li>• A <strong className="text-txt-main">principal forma de eficacia em combate</strong> sao as Habilidades do personagem (Passiva, Ativa, Ultimate).</li>
              <li>• Conhecimentos (Rituais, Feitiços, Runas, Magias) servem como <strong className="text-sky-300">APOIO</strong>.</li>
              <li>• Mesmo um personagem com Feitiço de 9o circulo + Magia Suprema + Runa Maior + Ritual de 4o circulo, <strong className="text-red-300">precisa de suas habilidades</strong> para combate sustentado.</li>
              <li>• Cada conhecimento usado em combate consome <strong className="text-amber-300">1 Acao Padrao</strong> — nao acumula com habilidades na mesma acao.</li>
            </ul>
          </div>
          <div className="bg-deep rounded-lg border border-red-400/15 p-3">
            <div className="text-red-300 text-xs font-semibold mb-2">Por que existe essa regra?</div>
            <ul className="space-y-1.5 text-xs text-txt-dim">
              <li>• <strong className="text-txt-main">Balanceamento:</strong> Se conhecimentos substituissem habilidades, personagens magicos teriam poder dobrado vs nao-magicos.</li>
              <li>• <strong className="text-txt-main">Identidade:</strong> Cada personagem deve ter sua forca principal nas habilidades que refletem sua classe, triagem e estilo.</li>
              <li>• <strong className="text-txt-main">Combo Prevention:</strong> Um Ritual de 4o + Feitiço de 9o + Habilidade Ultimate na mesma rodada causaria desequilibrio completo. Por isso, cada um exige 1 Acao Padrao.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-void rounded-xl border border-amber-300/20 p-4">
        <div className="text-amber-300 text-sm font-semibold mb-3">Tabela Comparativa de Tetos de Dano</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-sep text-txt-dim">
                <th className="py-2 px-2 text-left">Circulo</th>
                <th className="py-2 px-2 text-left">Ritual (Alquimia)</th>
                <th className="py-2 px-2 text-left">Feitiço</th>
                <th className="py-2 px-2 text-left">Magia</th>
              </tr>
            </thead>
            <tbody>
              {[
                { c: '1o', ritual: '2d8+MOD', feitico: '2d8+MOD', magia: '2d10+MOD' },
                { c: '2o', ritual: '3d10+8', feitico: '3d10+8', magia: '4d10+10' },
                { c: '3o', ritual: '5d10+15', feitico: '5d10+15', magia: '6d10+18' },
                { c: '4o', ritual: '8d12+20', feitico: '7d12+18', magia: '9d12+24' },
                { c: '5o', ritual: '—', feitico: '9d12+25', magia: '—' },
                { c: '6o', ritual: '—', feitico: '11d12+35', magia: '—' },
                { c: '7o', ritual: '—', feitico: '14d12+45', magia: '—' },
                { c: '8o', ritual: '—', feitico: '18d12+60', magia: '—' },
                { c: '9o', ritual: '—', feitico: '22d12+80', magia: '—' },
              ].map((row, i) => (
                <tr key={i} className="border-b border-sep/20 hover:bg-void/40">
                  <td className="py-1.5 px-2 font-cinzel text-gold font-semibold">{row.c}</td>
                  <td className="py-1.5 px-2 font-mono text-emerald-300">{row.ritual}</td>
                  <td className="py-1.5 px-2 font-mono text-sky-300">{row.feitico}</td>
                  <td className="py-1.5 px-2 font-mono text-red-300">{row.magia}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function CreationGuideSection() {
  const steps = [
    { n: 1, title: 'Identidade', desc: 'Defina o nome e nível do personagem. O Mestre define qual tipo de Array (Balanceado, MinMax ou Extremo) está disponível para a campanha.' },
    { n: 2, title: 'Raça', desc: 'Escolha a raça como marco central do personagem. Em raças como Semideus, a linhagem divina é uma escolha própria e o caminho/sub-raça representa evolução, ascensão ou caso atípico.' },
    { n: 3, title: 'Esqueleto (Atributos)', desc: 'Distribua os 6 valores do Array escolhido entre os atributos FOR, DES, CON, INT, APA e AM. Cada valor só pode ser usado uma vez.' },
    { n: 4, title: 'Classe', desc: 'Escolha entre Guerreiro, Operativo ou Místico. Cada classe define Vida, Energia, PE, Dano Base e quantidade de perícias iniciais.' },
    { n: 5, title: 'Progressão', desc: 'Consulte a tabela de N1 até o nível atual da classe. Recompensas com "OU" exigem uma escolha do jogador. Anote triagens e módulos desbloqueados.' },
    { n: 6, title: 'Pontos de Esqueleto', desc: 'Distribua os Pontos de Esqueleto ganhos na progressão entre os atributos. Cada ponto em CON afeta retroativamente a Vida por Nível. O mesmo vale para AM (Energia).' },
    { n: 7, title: 'Triagens', desc: 'Escolha UMA Triagem Principal (da mesma classe). A partir de N16, pode escolher UMA Sub-Triagem de qualquer classe. A principal alcança 6 níveis (0.1→0.6) e a sub-triagem alcança 3 níveis (0.1→0.3) até N30.' },
    { n: 8, title: 'Módulos de Evolução', desc: 'Gaste os Módulos de Evolução ganhos na progressão. Existem Passivos (sempre ativos), Especiais (aquisição múltipla) e Ativos (custam PE). Verifique os requisitos.' },
    { n: 9, title: 'Perícias', desc: 'Treine perícias usando os pontos disponíveis (classe + progressão). Cada grau custa 1 ponto. O grau máximo depende do nível: N1-7 Treinado, N8-13 Veterano, N14-22 Especialista, N23-30 Mestre.' },
    { n: 10, title: 'Habilidades', desc: 'Crie 5 habilidades: 1 Passiva, 3 Ativas e 1 Ultimate. Defina nome, descrição, custo de energia, dano, duração, camada SCP e PP estimado. Algumas triagens concedem habilidades extras.' },
    { n: 11, title: 'Revisão — Arma, Arte Marcial e Ficha Final', desc: 'Na tela de revisão, escolha sua Arma (19 disponíveis com mecânicas únicas) e seu Rank (Comum a Transcendente, 8 patentes). Opcionalmente escolha uma Arte Marcial (Boxe, Karatê, Muay Thai, Judô, Taekwondo, Aikido) com grau limitado pelo nível. Revise cálculos, use a IA para balancear, e finalize a ficha.' },
  ]

  return (
    <div>
      <SectionTitle>Guia de Criação de Personagem</SectionTitle>
      <p className="text-txt-dim text-sm mb-6">Passo a passo para criar um personagem do Sistema Olympo 2.0. Este guia também serve para criação manual.</p>
      <div className="space-y-4">
        {steps.map((s, idx) => {
          const stepColors = [
            'border-txt-dim/30 bg-txt-dim/5',
            'border-teal-400/30 bg-teal-400/5',
            'border-blue-400/30 bg-blue-400/5',
            'border-red-400/30 bg-red-400/5',
            'border-orange-400/30 bg-orange-400/5',
            'border-teal-400/30 bg-teal-400/5',
            'border-teal-400/30 bg-teal-400/5',
            'border-purple-400/30 bg-purple-400/5',
            'border-orange-400/30 bg-orange-400/5',
            'border-indigo-400/30 bg-indigo-400/5',
            'border-gold/30 bg-gold/5',
          ]
          const numColors = [
            'border-txt-dim text-txt-dim bg-txt-dim/10',
            'border-teal-400 text-teal-400 bg-teal-400/10',
            'border-blue-400 text-blue-400 bg-blue-400/10',
            'border-red-400 text-red-400 bg-red-400/10',
            'border-orange-400 text-orange-400 bg-orange-400/10',
            'border-teal-400 text-teal-400 bg-teal-400/10',
            'border-teal-400 text-teal-400 bg-teal-400/10',
            'border-purple-400 text-purple-400 bg-purple-400/10',
            'border-orange-400 text-orange-400 bg-orange-400/10',
            'border-indigo-400 text-indigo-400 bg-indigo-400/10',
            'border-gold text-gold bg-gold/10',
          ]
          return (
          <div key={s.n} className={`rounded-xl p-4 border ${stepColors[idx] || 'border-sep bg-void'}`}>
            <div className="flex items-start gap-3">
              <span className={`shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center font-cinzel font-bold text-base ${numColors[idx] || 'border-gold text-gold'}`}>{s.n}</span>
              <div>
                <h3 className="text-txt-main font-cinzel text-base mb-1">{s.title}</h3>
                <p className="text-txt-dim text-sm">{s.desc}</p>
              </div>
            </div>
          </div>
        )})}
      </div>
      <div className="mt-6 bg-void rounded-lg p-4 border border-gold/30">
        <h3 className="text-gold font-cinzel text-base mb-2">Regras Importantes</h3>
        <ul className="space-y-1 text-sm text-txt-main list-disc list-inside">
          <li><strong className="text-gold-light">Retroatividade:</strong> Pontos de Esqueleto em CON/AM afetam todos os níveis retroativamente.</li>
          <li><strong className="text-gold-light">CA:</strong> 10 + treinamento(Reflexo ou Bloqueio) + MAX(Mod.CON, Mod.DES)</li>
          <li><strong className="text-gold-light">Reações:</strong> Math.floor(DES / 5), mínimo 1</li>
          <li><strong className="text-gold-light">Percepção Passiva:</strong> 10 + treino_Percepção + Mod.INT</li>
          <li><strong className="text-gold-light">Triagens:</strong> Principal = mesma classe, 6 níveis (0.1→0.6). Sub-Triagem = qualquer classe, 3 níveis (0.1→0.3), disponível a partir de N16.</li>
          <li><strong className="text-gold-light">Módulos Especiais:</strong> Treino Intensivo (até 3×), Aumento de Poder (até 2×), Conhecimento Amplificado (até 4×).</li>
        </ul>
      </div>
    </div>
  )
}

// ─── SEÇÃO: PROTOCOLO DE BALANCEAMENTO ───────────────────────────────────────

function SystemSkillsRulesSection() {
  return (
    <div className="space-y-6">
      <div>
        <SectionTitle>Skills Sistemicas</SectionTitle>
        <p className="text-txt-dim text-sm leading-relaxed">
          Skills sao integracoes raras entre uma passiva narrativa e uma regra que o sistema consegue executar. O jogador continua escrevendo a passiva livremente, mas somente o Mestre pode atribuir uma Skill quando aquela passiva altera progressao, recursos, forja, equipamentos ou outro subsistema.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          ['Texto livre', 'O jogador descreve fantasia, origem e estilo da passiva sem preencher formulario mecanico extra.'],
          ['Skill atribuida', 'O Mestre escolhe uma Skill do catalogo e vincula a passiva quando existe impacto automatizavel.'],
          ['Pendencia', 'Quando nao ha Skill adequada, o sistema cria uma notificacao para futura implementacao ou decisao manual.'],
        ].map(([title, text]) => (
          <div key={title} className="rounded-xl border border-sky-300/20 bg-sky-300/5 p-4">
            <h3 className="font-cinzel text-sky-200 text-sm mb-2">{title}</h3>
            <p className="text-txt-dim text-xs leading-relaxed">{text}</p>
          </div>
        ))}
      </div>

      <TableCard title="Fluxo de Governanca" color="sky">
        <div className="p-4 space-y-2 text-xs text-txt-dim">
          <p><strong className="text-sky-200">1.</strong> A IA de balanceamento pode sugerir uma Skill quando notar que uma passiva mexe no sistema.</p>
          <p><strong className="text-sky-200">2.</strong> A sugestao vira notificacao na Mesa do Mestre, nunca aplicacao automatica.</p>
          <p><strong className="text-sky-200">3.</strong> O Mestre pode atribuir a Skill, excluir a notificacao ou marcar como Integracao Manual.</p>
          <p><strong className="text-sky-200">4.</strong> Skills ativas aparecem na ficha e seus bonus entram nos calculos suportados.</p>
          <p><strong className="text-sky-200">5.</strong> Cada Skill pode conter multiplos efeitos com parametros configuraveis (valores, intervalos, escalas).</p>
        </div>
      </TableCard>

      <TableCard title="Tipos de Efeito e Parametros" color="sky">
        <div className="p-4 space-y-1">
          <p className="text-txt-dim text-[10px] mb-2">Cada Skill contem um ou mais efeitos. Os parametros sao configurados pelo mestre ao atribuir.</p>
          {Object.entries(EFFECT_PARAM_DEFS).map(([type, def]) => {
            const params = Object.entries(def.params)
            return (
              <div key={type} className="flex items-start gap-2 py-1 border-b border-sep/10 last:border-0">
                <span className="text-sky-200 text-[10px] font-medium w-48 shrink-0">{def.label}</span>
                <span className="text-txt-dim/60 text-[10px]">{params.length === 0 ? 'Sem parametros' : params.map(([k, p]) => `${p.label}: ${p.type === 'select' ? (p.options || []).map(o => o.label).join('/') : p.default}`).join(' | ')}</span>
              </div>
            )
          })}
        </div>
      </TableCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SYSTEM_SKILLS.map(skill => {
          const cat = SYSTEM_SKILL_CATEGORIES.find(c => c.id === skill.category)
          return (
            <div key={skill.id} className="rounded-xl border border-sep/30 bg-void/70 p-4">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h3 className="text-txt-main text-sm font-semibold">{skill.name}</h3>
                <span className="text-[9px] border border-gold/25 text-gold rounded px-1.5 py-0.5">{cat?.label || skill.category}</span>
                <span className="text-[9px] border border-sky-300/20 text-sky-200 rounded px-1.5 py-0.5">{skill.rarity}</span>
              </div>
              <p className="text-txt-dim text-xs leading-relaxed">{skill.description}</p>
              <div className="mt-2 space-y-1">
                {(skill.effectTypes || []).map(et => {
                  const eDef = EFFECT_PARAM_DEFS[et]
                  if (!eDef) return null
                  const paramNames = Object.entries(eDef.params).map(([k, p]) => `${p.label} (${p.type === 'number' ? `${p.default}` : p.type === 'select' ? (p.options || []).map(o => o.label).join('/') : p.default})`).join(', ')
                  return (
                    <div key={et} className="text-[10px] bg-sky-300/5 border border-sky-300/10 rounded px-2 py-1">
                      <span className="text-sky-200">{eDef.label}</span>
                      {paramNames && <span className="text-txt-dim/60 ml-1">— {paramNames}</span>}
                    </div>
                  )
                })}
              </div>
              <p className="text-sky-200/70 text-[11px] mt-2">{skill.adminNotes}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TableCard({ title, color = 'gold', children }) {
  const borderMap = { gold: 'border-gold/30', purple: 'border-purple-400/30', sky: 'border-sky-400/30', emerald: 'border-emerald-400/30', amber: 'border-amber-300/30' }
  const titleMap  = { gold: 'text-gold', purple: 'text-purple-400', sky: 'text-sky-400', emerald: 'text-emerald-400', amber: 'text-amber-300' }
  return (
    <div className={`bg-void rounded-xl border ${borderMap[color] || 'border-gold/30'} overflow-hidden`}>
      <div className={`px-4 py-2.5 border-b ${borderMap[color] || 'border-gold/30'} bg-void/80`}>
        <h3 className={`font-cinzel text-sm font-bold tracking-wider ${titleMap[color] || 'text-gold'}`}>{title}</h3>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}

function ProtoTable({ headers, rows, highlight }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-sep/60">
          {headers.map((h, i) => <th key={i} className="py-2 px-3 text-left text-txt-dim font-medium whitespace-nowrap">{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className={`border-b border-sep/30 ${highlight && highlight(row) ? 'bg-gold/5' : 'hover:bg-void/60'}`}>
            {row.map((cell, j) => (
              <td key={j} className={`py-2 px-3 font-mono whitespace-nowrap ${j === 0 ? 'text-gold font-bold' : 'text-txt-main'}`}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function BalanceProtocolSection() {
  const scpRows = [
    ['Camada 1 — Base', 'Treino de Perícia + Mod. Atributo', 'Sem limite', 'Sempre ativa, não consome slot'],
    ['Camada 2 — Tático', 'Habilidades, Triagens, Módulos', 'N1-7:+8 | N8-15:+12 | N16-22:+16 | N23-30:+20', 'Slot de habilidade / triagem'],
    ['Camada 3 — Épico',  'Armas, Runas, Artefatos',          'N1-7:+5 | N8-15:+8 | N16-22:+12 | N23-30:+16', 'Rank de arma / item mágico'],
  ]

  const tdhRows = [
    ['N1-7',   '3d8+12',  '4d10+18', '6d10+24',  '8d12+30'],
    ['N8-15',  '4d10+18', '6d10+25', '9d12+32',  '13d12+45'],
    ['N16-22', '6d12+25', '8d12+38', '12d12+50', '17d12+65'],
    ['N23-30', '8d12+32', '10d12+45','14d12+60', '20d12+80'],
  ]

  const iplRows = [
    ['Passiva (slot)',   '5', '6', '7',  '8'],
    ['Ativa Fraca',      '4', '5', '6',  '7'],
    ['Ativa Média',      '6', '7', '8',  '10'],
    ['Ativa Forte',      '8', '10','12', '14'],
    ['Ultimate',         '10','13','16', '20'],
  ]

  const ppPesoRows = [
    ['+5 Ataque/Defesa (temp)',       '3 PP'],
    ['+10 Ataque/Defesa (temp)',      '5 PP'],
    ['+15 Ataque/Defesa (temp, N16+)','7 PP'],
    ['Vantagem no dado',              '4 PP'],
    ['+1 Ataque Extra',               '5 PP'],
    ['Dano ≤ 4d12 (ativa)',           '2 PP'],
    ['Dano 4d12–12d12 (ativa)',       '4 PP'],
    ['Dano 13d12+ (ultimate)',        '6 PP'],
    ['+50% HP temp (≤3 rod.)',        '3 PP'],
    ['+100% HP temp (≤2 rod.)',       '5 PP'],
    ['Ignorar armadura total',        '5 PP'],
    ['Efeito em área',                '+3 PP ao custo base'],
    ['Imunidade a dano (≤1 rod.)',    '6 PP'],
  ]

  const calibRows = [
    ['N5',  '140–210',   'd20 +8 a +12',   'd20 +21'],
    ['N10', '250–380',   'd20 +12 a +16',  'd20 +28'],
    ['N15', '380–560',   'd20 +15 a +20',  'd20 +36'],
    ['N20', '520–760',   'd20 +18 a +23',  'd20 +43'],
    ['N25', '700–980',   'd20 +22 a +26',  'd20 +50'],
    ['N30', '950–1350',  'd20 +26 a +30',  'd20 +58'],
  ]

  const pehRows = [
    ['Guerreiro',  'N6, N10, N13, N17, N20, N24, N27*', '8 PEH (+1 no N27)'],
    ['Operativo',  'N5, N9, N13, N16, N19, N22, N25, N27, N30', '9 PEH'],
    ['Místico',    'N4, N8, N12, N16, N19, N22, N24, N27**, N30', '10 PEH (+2 no N27)'],
  ]

  const evoRules = [
    { tipo: 'Passiva',   max: 3,  custo: 'Automática', restricao: 'Evolui sozinha nos N10, N20 e N30. Sem custo de PEH.' },
    { tipo: 'Ativa',     max: 5,  custo: '1 PEH / nível', restricao: 'Custo de Energia sobe proporcionalmente com a evolução.' },
    { tipo: 'Ultimate',  max: 3,  custo: '1 PEH / nível', restricao: '1º ponto: N15+ | 2º ponto: N25+ | 3º ponto: N30' },
    { tipo: 'Aum. Poder', max: 2, custo: 'Módulo (até 2×)', restricao: 'Cada compra concede 1 PEH bônus, marcado separadamente.' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <SectionTitle>Protocolo de Expansão Épica Olympo</SectionTitle>
        <p className="text-txt-dim text-sm mb-6">
          Este protocolo define os limites matemáticos de todas as habilidades do sistema. A IA de análise usa estas tabelas para calibrar automaticamente valores de dano, PP e camadas SCP ao revisar uma ficha.
        </p>
      </div>

      {/* SCP */}
      <TableCard title="SCP — Sistema de Camadas de Poder (Seção 14.1)" color="purple">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-sep/60">
              {['Camada', 'Fontes', 'Bônus Máximo por Faixa', 'Observação'].map((h, i) => (
                <th key={i} className="py-2 px-3 text-left text-txt-dim font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scpRows.map((row, i) => (
              <tr key={i} className="border-b border-sep/30 hover:bg-void/60">
                <td className="py-2 px-3 font-mono text-purple-400 font-bold whitespace-nowrap">{row[0]}</td>
                <td className="py-2 px-3 text-txt-main">{row[1]}</td>
                <td className="py-2 px-3 font-mono text-gold text-[10px] whitespace-nowrap">{row[2]}</td>
                <td className="py-2 px-3 text-txt-dim text-[10px]">{row[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2 bg-purple-400/5 text-xs text-purple-300">
          Bônus Total Máximo = Camada 1 (ilimitada) + Camada 2 + Camada 3
        </div>
      </TableCard>

      {/* TDH */}
      <TableCard title="TDH — Teto de Dano por Habilidade (Seção 14.4)" color="sky">
        <div className="px-4 py-2 bg-sky-400/5 text-xs text-sky-300 border-b border-sep/30">
          ⚠ Estes valores são para o dano <strong>gerado pela habilidade isoladamente</strong>. O total do ataque ainda inclui: Dano Base de Classe + Bônus de Arma + Modificadores de Atributo.
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-sep/60">
              {['Faixa', 'Ativa Fraca (<20E)', 'Ativa Média (20–50E)', 'Ativa Forte (>50E)', 'Ultimate'].map((h, i) => (
                <th key={i} className="py-2 px-3 text-left text-txt-dim font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tdhRows.map((row, i) => (
              <tr key={i} className="border-b border-sep/30 hover:bg-void/60">
                <td className="py-2 px-3 font-mono text-gold font-bold">{row[0]}</td>
                {row.slice(1).map((cell, j) => (
                  <td key={j} className={`py-2 px-3 font-mono ${j === 3 ? 'text-amber-300' : 'text-sky-300'}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>

      {/* IPL PP */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TableCard title="IPL — Limite de PP por Tipo e Faixa (Seção 14.5)" color="emerald">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-sep/60">
                {['Tipo', 'N1-7', 'N8-15', 'N16-22', 'N23-30'].map((h, i) => (
                  <th key={i} className="py-2 px-3 text-left text-txt-dim font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {iplRows.map((row, i) => (
                <tr key={i} className={`border-b border-sep/30 hover:bg-void/60 ${row[0] === 'Ultimate' ? 'bg-amber-300/5' : ''}`}>
                  <td className={`py-2 px-3 font-mono ${row[0] === 'Ultimate' ? 'text-amber-300 font-bold' : 'text-emerald-400'}`}>{row[0]}</td>
                  {row.slice(1).map((cell, j) => (
                    <td key={j} className="py-2 px-3 font-mono text-txt-main text-center">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>

        <TableCard title="Peso de Efeitos em PP" color="emerald">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-sep/60">
                {['Efeito', 'Custo PP'].map((h, i) => (
                  <th key={i} className="py-2 px-3 text-left text-txt-dim font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ppPesoRows.map((row, i) => (
                <tr key={i} className="border-b border-sep/30 hover:bg-void/60">
                  <td className="py-1.5 px-3 text-txt-main">{row[0]}</td>
                  <td className="py-1.5 px-3 font-mono text-emerald-400 font-bold whitespace-nowrap">{row[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>

      {/* Calibração */}
      <TableCard title="Calibração de Poder por Nível (Seção 14.7)" color="gold">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-sep/60">
              {['Nível', 'HP Esperado', 'Ataque Base (C1)', 'Máx com SCP (C1+C2+C3)'].map((h, i) => (
                <th key={i} className="py-2 px-3 text-left text-txt-dim font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {calibRows.map((row, i) => (
              <tr key={i} className="border-b border-sep/30 hover:bg-void/60">
                <td className="py-2 px-3 font-mono text-gold font-bold">{row[0]}</td>
                <td className="py-2 px-3 font-mono text-emerald-400">{row[1]}</td>
                <td className="py-2 px-3 font-mono text-txt-main">{row[2]}</td>
                <td className="py-2 px-3 font-mono text-amber-300">{row[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>

      {/* PEH */}
      <TableCard title="PEH — Pontos de Evolução de Habilidade" color="amber">
        <div className="px-4 py-3 space-y-3">
          <p className="text-xs text-txt-dim">
            PEH são distribuídos pela progressão de classe e pelo módulo <strong className="text-amber-300">Aumento de Poder</strong>. Investir pontos em uma habilidade escala todos os seus efeitos (dano, duração, bônus, CDs) proporcionalmente ao bracket de custo de Energia.
          </p>
          <table className="w-full text-xs mt-2">
            <thead>
              <tr className="border-b border-sep/60">
                {['Classe', 'Níveis com PEH', 'Total N30'].map((h, i) => (
                  <th key={i} className="py-2 px-3 text-left text-txt-dim font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pehRows.map((row, i) => (
                <tr key={i} className="border-b border-sep/30">
                  <td className="py-2 px-3 font-mono text-gold font-bold">{row[0]}</td>
                  <td className="py-2 px-3 text-txt-dim text-[10px]">{row[1]}</td>
                  <td className="py-2 px-3 font-mono text-amber-300 font-bold">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-sep/30 p-4 space-y-3">
          <p className="text-xs text-amber-300 font-semibold mb-2">Regras de Evolução por Tipo</p>
          {evoRules.map((r, i) => (
            <div key={i} className="flex items-start gap-3 bg-void/60 rounded-lg p-3 border border-sep/20">
              <span className={`shrink-0 font-cinzel text-xs font-bold px-2 py-1 rounded ${r.tipo === 'Ultimate' ? 'bg-amber-300/20 text-amber-300' : r.tipo === 'Passiva' ? 'bg-ok/20 text-ok' : r.tipo === 'Aum. Poder' ? 'bg-orange-400/20 text-orange-400' : 'bg-sep text-txt-main'}`}>
                {r.tipo}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-0.5">
                  <span className="text-xs text-txt-dim">Máx: <span className="text-gold font-mono">{r.max} nível{r.max > 1 ? 'is' : ''}</span></span>
                  <span className="text-xs text-txt-dim">Custo: <span className="text-amber-300 font-mono">{r.custo}</span></span>
                </div>
                <p className="text-xs text-txt-dim">{r.restricao}</p>
              </div>
            </div>
          ))}
        </div>
      </TableCard>

      <div className="bg-void rounded-xl border border-sep p-4 text-xs text-txt-dim space-y-1.5">
        <p className="text-gold font-cinzel font-bold text-sm mb-2">Notas de Design</p>
        <p>• CDs de resistência recomendados: <span className="text-txt-main">N1-10 → 14-16 | N11-20 → 18-22 | N21-30 → 22-28</span></p>
        <p>• Cura via habilidade: <span className="text-txt-main">máx 30% da vida máxima por uso individual; máx 20% em área</span></p>
        <p>• Habilidades de controle sem dano: calculadas puramente em PP — evite ultrapassar o teto de PP da faixa</p>
        <p>• Amplificadores de Triagem e Módulo contam para o poder real do personagem, não para o dano da habilidade isolada</p>
        <p>• Um personagem N30 com dano base alto <em>pode</em> ter uma habilidade com 14d12+60 de dano extra — os valores são cumulativos, não substitutos</p>
      </div>
    </div>
  )
}
