import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useAuth, AuthProvider } from './contexts/AuthContext'
import { supabase, getSupabaseAdmin } from './lib/supabase'
import { useCharacter } from './hooks/useCharacter'
import Sidebar from './components/Sidebar'
import Step1Identity from './components/steps/Step1Identity'
import StepRace from './components/steps/StepRace'
import Step2Skeleton from './components/steps/Step2Skeleton'
import Step3Class from './components/steps/Step3Class'
import Step5Progression from './components/steps/Step5Progression'
import Step4SkeletonPoints from './components/steps/Step4SkeletonPoints'
import Step6Pericias from './components/steps/Step6Pericias'
import Step7Modules from './components/steps/Step7Modules'
import Step8Triages from './components/steps/Step8Triages'
import Step10Abilities from './components/steps/Step10Abilities'
import Step11Review from './components/steps/Step11Review'
import RaceSkillTree from './components/RaceSkillTree'
import SkillTreeView from './components/SkillTreeView'
import ReferencePage from './components/ReferencePage'
import LoginPage from './components/LoginPage'
import HomeMenu from './components/HomeMenu'
import ParticleBackground from './components/ParticleBackground'
import LevelUpModal from './components/LevelUpModal'
import RaceEvolveModal from './components/RaceEvolveModal'
import AdminDashboard from './components/AdminDashboard'
import CharacterWorkspace from './components/CharacterWorkspace'
import CharacterCenter from './components/CharacterCenter'
import CodexDashboard from './components/codex/CodexDashboard'
import NpcCreator from './components/codex/NpcCreator'
import NpcSheet from './components/codex/NpcSheet'
import NpcImportExport from './components/codex/NpcImportExport'
import InfiniteBoard from './components/InfiniteBoard'
import { ATTRIBUTES } from './data/attributes'
import { PROGRESSION } from './data/progression'
import { RACES } from './data/races'
import { WEAPONS } from './data/weapons'
import { calcExtraAbilities, calcExtraAbilitiesTypes } from './utils/calculator'
import { calcPARTotal, calcRaceTreePARSpent } from './utils/calculator'

const BASE_LOCATIONS = [
  { id: 'carregado', label: 'Personagem', icon: 'person' },
  { id: 'quarto', label: 'Quarto', icon: 'bed' },
  { id: 'base', label: 'Base', icon: 'home' },
]

const STEPS = [
  { id: 1, label: 'Identidade', comp: Step1Identity },
  { id: 2, label: 'Raça', comp: StepRace },
  { id: 3, label: 'Esqueleto', comp: Step2Skeleton },
  { id: 4, label: 'Classe', comp: Step3Class },
  { id: 5, label: 'Progressão', comp: Step5Progression },
  { id: 6, label: 'Pontos Esqueleto', comp: Step4SkeletonPoints },
  { id: 7, label: 'Triagens', comp: Step8Triages },
  { id: 8, label: 'Soft-Skills', comp: Step7Modules },
  { id: 9, label: 'Perícias', comp: Step6Pericias },
  { id: 10, label: 'Árvore de Habilidades', comp: SkillTreeView },
  { id: 11, label: 'Habilidades', comp: Step10Abilities },
  { id: 12, label: 'Revisão', comp: Step11Review },
]

const TOTAL_STEPS = STEPS.length

function validateStep(stepIdx, char) {
  const attrs = char.atributos || {}
  const choices = char.choices || {}
  switch (stepIdx) {
    case 0:
      if (!char.nome || char.nome.trim() === '') return 'Informe o nome do personagem.'
      return null
    case 1:
      if (!char.raca) return 'Selecione a raça do personagem.'
      {
        const race = RACES[char.raca]
        const needed = race?.layer0?.attrBonus?.escolherQtd || 0
        const allowed = race?.layer0?.attrBonus?.escolherOpcoes || ATTRIBUTES
        const chosen = Object.entries(char.racaAttrChoices || {})
          .filter(([attr, selected]) => selected && allowed.includes(attr)).length
        if (race?.layer0?.attrBonus?.escolher && chosen < needed) {
          return `Selecione ${needed} bonus raciais de atributo.`
        }
        if (race?.layer0?.requiresDeus && !char.racaDeus) return 'Selecione a linhagem divina do semideus.'
      }
      return null
    case 2: {
      const unassigned = ATTRIBUTES.filter(a => !attrs[a] || attrs[a] === 0)
      if (unassigned.length > 0) return `Distribua todos os atributos. Faltam: ${unassigned.join(', ')}.`
      return null
    }
    case 3:
      if (!char.classe) return 'Selecione uma classe.'
      return null
    case 4: {
      if (!char.classe) return null
      const prog = PROGRESSION[char.classe]
      if (!prog) return null
      const nivel = char.nivel || 1
      const missing = []
      for (let n = 1; n <= nivel; n++) {
        const entry = prog[n]
        if (!entry) continue
        for (const r of entry.rewards) {
          if (r.type === 'escolha' && !choices[r.key]) {
            missing.push(`Nível ${n}`)
            break
          }
        }
      }
      if (missing.length > 0) return `Selecione todas as escolhas de progressão. Faltam: ${missing.join(', ')}.`
      return null
    }
    case 5:
      return null
    default:
      return null
  }
}

function exportToJson(sheet) {
  const blob = new Blob([JSON.stringify(sheet, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(sheet.nome || 'personagem').replace(/[^a-zA-Z0-9À-ÿ]/g, '_')}_olympo.json`
  a.click()
  URL.revokeObjectURL(url)
}

function importFromJson(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        resolve(data)
      } catch {
        reject(new Error('Arquivo JSON inválido.'))
      }
    }
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'))
    reader.readAsText(file)
  })
}

const LIBRARY_TIERS = [
  { min: 1, max: 7, label: 'Novato', color: '#60a5fa', glow: 'rgba(96,165,250,0.3)', text: 'text-sky-400', bg: 'bg-sky-400/10', bar: 'bg-sky-400' },
  { min: 8, max: 13, label: 'Veterano', color: '#f7bd48', glow: 'rgba(247,189,72,0.3)', text: 'text-primary', bg: 'bg-primary/10', bar: 'bg-primary' },
  { min: 14, max: 22, label: 'Elite', color: '#c084fc', glow: 'rgba(192,132,252,0.3)', text: 'text-purple-400', bg: 'bg-purple-400/10', bar: 'bg-purple-400' },
  { min: 23, max: 30, label: 'Lendário', color: '#f87171', glow: 'rgba(248,113,113,0.35)', text: 'text-rose-400', bg: 'bg-rose-400/10', bar: 'bg-rose-400' },
  { min: 31, max: 38, label: 'Mítico', color: '#34d399', glow: 'rgba(52,211,153,0.35)', text: 'text-emerald-400', bg: 'bg-emerald-400/10', bar: 'bg-emerald-400' },
  { min: 39, max: 44, label: 'Ascendente', color: '#fb923c', glow: 'rgba(251,146,60,0.35)', text: 'text-orange-400', bg: 'bg-orange-400/10', bar: 'bg-orange-400' },
  { min: 45, max: 50, label: 'Transcendente', color: '#f472b6', glow: 'rgba(244,114,182,0.4)', text: 'text-pink-400', bg: 'bg-pink-400/10', bar: 'bg-pink-400' },
]

const CLASS_META = {
  Guerreiro: { icon: 'shield', slug: 'is-guerreiro' },
  Operativo: { icon: 'visibility', slug: 'is-operativo' },
  Místico: { icon: 'auto_fix_high', slug: 'is-mistico' },
}

function getLibraryTier(level) {
  return LIBRARY_TIERS.find(t => level >= t.min && level <= t.max) || LIBRARY_TIERS[0]
}

function CharacterLibrary({ sheets, onLoad, onDelete, onImport, canExport }) {
  const importRef = useRef(null)
  const [search, setSearch] = useState('')
  const [filterClass, setFilterClass] = useState('all')

  const filteredSheets = useMemo(() => {
    return sheets.filter(sheet => {
      const name = sheet.name || sheet.data?.nome || ''
      const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase()) ||
        (sheet.data?.classe || '').toLowerCase().includes(search.toLowerCase()) ||
        (sheet.data?.raca || '').toLowerCase().includes(search.toLowerCase())
      const matchClass = filterClass === 'all' ||
        (sheet.data?.classe || '').toLowerCase() === filterClass
      return matchSearch && matchClass
    })
  }, [sheets, search, filterClass])

  const classCounts = useMemo(() => {
    const counts = { all: sheets.length }
    sheets.forEach(s => {
      const c = (s.data?.classe || '').toLowerCase()
      if (c) counts[c] = (counts[c] || 0) + 1
    })
    return counts
  }, [sheets])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-cinzel text-primary text-2xl tracking-wide text-glow-gold">Biblioteca de Personagens</h2>
          <p className="text-on-surface-variant text-sm mt-1 font-mono" style={{ fontSize: '11px', letterSpacing: '0.08em' }}>
            {sheets.length} {sheets.length === 1 ? 'herói registrado' : 'heróis registrados'} neste arquivo
          </p>
        </div>
        <button onClick={() => importRef.current?.click()}
          className="library-action-btn is-export-action px-4 py-2">
          <span className="material-symbols-outlined text-sm">upload_file</span>
          Importar JSON
        </button>
        <input ref={importRef} type="file" accept=".json" onChange={e => {
          const file = e.target.files?.[0]
          if (file) onImport(file)
          e.target.value = ''
        }} className="hidden" />
      </div>

      {sheets.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative w-full sm:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-lg pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, classe ou raça..."
              className="library-search-input"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface-variant text-sm transition-colors"
                style={{ transform: 'translateY(-50%)' }}>
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'Todos' },
              { key: 'guerreiro', label: 'Guerreiro' },
              { key: 'operativo', label: 'Operativo' },
              { key: 'místico', label: 'Místico' },
            ].map(f => (
              <button key={f.key}
                onClick={() => setFilterClass(f.key)}
                className={`library-filter-chip ${filterClass === f.key ? 'is-active' : ''}`}>
                {f.label}
                {classCounts[f.key] !== undefined && (
                  <span className="ml-1 opacity-60">{classCounts[f.key]}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {sheets.length === 0 ? (
        <div className="library-empty-state p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-primary/20 block mb-4">auto_stories</span>
          <p className="font-cinzel text-on-surface text-lg mb-2">O arquivo ainda está vazio</p>
          <p className="text-on-surface-variant text-sm mb-6 max-w-md mx-auto">
            Crie um personagem no wizard ou importe um arquivo JSON para começar sua jornada.
          </p>
          <div className="flex justify-center gap-3">
            <button onClick={() => importRef.current?.click()}
              className="library-action-btn is-export-action px-5 py-2.5">
              <span className="material-symbols-outlined text-sm">upload_file</span>
              Importar Ficha
            </button>
          </div>
        </div>
      ) : filteredSheets.length === 0 ? (
        <div className="library-empty-state p-10 text-center">
          <span className="material-symbols-outlined text-4xl text-primary/20 block mb-3">search_off</span>
          <p className="font-cinzel text-on-surface text-base mb-1">Nenhum resultado encontrado</p>
          <p className="text-on-surface-variant text-sm">
            Tente ajustar os filtros ou o termo de busca.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredSheets.map((sheet, i) => {
            const level = sheet.data?.nivel || 1
            const tier = getLibraryTier(level)
            const classe = sheet.data?.classe || ''
            const classMeta = CLASS_META[classe]
            const name = sheet.name || sheet.data?.nome || 'Sem Nome'
            const initial = name.charAt(0).toUpperCase()

            return (
              <div key={sheet.id}
                className="library-card group relative cursor-pointer"
                style={{
                  '--tier-color': tier.color,
                  '--tier-glow': tier.glow,
                  animation: `staggerFadeIn 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms both`,
                }}
                onClick={() => onLoad(sheet.id)}>
                <div className="library-card-accent" style={{ background: tier.color }} />
                <div className="relative p-5">
                  <button onClick={(e) => { e.stopPropagation(); onDelete(sheet.id) }}
                    className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center bg-void/60 border border-sep/30 text-txt-dim/40 hover:text-rose-400 hover:border-rose-400/30 transition-all opacity-0 group-hover:opacity-100 z-10">
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>

                  <div className="flex flex-col items-center text-center pt-1">
                    <div className="library-avatar-ring shrink-0 mb-3">
                      {sheet.data?.avatar ? (
                        <img src={sheet.data.avatar} alt=""
                          className="w-[56px] h-[56px] rounded-full object-cover"
                          style={{ border: `2px solid ${tier.color}` }} />
                      ) : (
                        <div className="w-[56px] h-[56px] rounded-full flex items-center justify-center font-cinzel text-lg"
                          style={{
                            background: 'rgba(14,14,15,0.9)',
                            border: `2px solid ${tier.color}`,
                            color: tier.color,
                          }}>
                          {initial}
                        </div>
                      )}
                    </div>

                    <h3 className="font-cinzel text-on-surface text-sm truncate w-full group-hover:text-primary transition-colors duration-300">
                      {name}
                    </h3>

                    <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
                      {classe && (
                        <span className={`library-class-badge ${classMeta?.slug || 'is-unknown'}`}>
                          <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>
                            {classMeta?.icon || 'help'}
                          </span>
                          {classe}
                        </span>
                      )}
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${tier.bg} ${tier.text}`}
                        style={{ letterSpacing: '0.05em' }}>
                        NV {level}
                      </span>
                    </div>

                    {sheet.data?.raca && (
                      <span className="text-txt-dim/60 text-[11px] mt-2 truncate w-full">
                        {sheet.data.raca}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TransferItemModal({ item, targets, locations, onConfirm, onConfirmLocation, onClose }) {
  const itemQty = Number(item?.quantidade) || 1
  const [transferQty, setTransferQty] = useState(itemQty)

  return (
    <div className="fixed inset-0 bg-black/80 z-[120] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="codex-card !bg-deep border-primary/25 rounded-xl w-full max-w-2xl shadow-2xl shadow-black/60 max-h-[86vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-sep/30 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-cinzel text-primary text-sm">Transferir Item</h3>
            <p className="text-txt-dim/60 text-[10px] mt-1">{item?.nome || 'Item'} vai para Armas e Equipamentos quando for arma.</p>
          </div>
          <button onClick={onClose} className="text-txt-dim hover:text-err text-sm transition-colors">×</button>
        </div>
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-primary/15 bg-void/45 p-3">
            <div className="w-14 h-14 rounded-lg border border-sep/40 bg-black/25 overflow-hidden grid place-items-center shrink-0">
              {item?.imagem ? <img src={item.imagem} alt="" className="w-full h-full object-cover" /> : <span className="text-txt-dim/45 text-[10px]">ITEM</span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-txt-main text-sm font-semibold truncate">{item?.nome || 'Item'}{itemQty > 1 ? ` x${itemQty}` : ''}</p>
              <p className="text-txt-dim/55 text-[10px]">{item?.categoria || 'Inventario'} {item?.rank ? `- ${item.rank}` : ''}</p>
            </div>
          </div>

          {itemQty > 1 && (
            <div className="flex items-center gap-3 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3">
              <label className="text-txt-dim/70 text-[10px] uppercase shrink-0">Quantidade a transferir</label>
              <input type="number" min="1" max={itemQty} value={transferQty}
                onChange={e => setTransferQty(Math.max(1, Math.min(itemQty, Number(e.target.value) || 1)))}
                className="w-20 bg-void/60 border border-sep/40 rounded px-2 py-1 text-xs text-txt-main text-center" />
              <span className="text-txt-dim/50 text-[10px]">de {itemQty}</span>
            </div>
          )}

          {locations && locations.length > 0 && (
            <div>
              <h4 className="text-txt-dim/70 text-[10px] uppercase tracking-wider mb-2">Locais do Personagem</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {locations.map(loc => (
                  <button key={loc.id} type="button"
                    onClick={() => onConfirmLocation(loc.id, transferQty)}
                    className="rounded-lg border border-sep/35 bg-void/40 p-3 flex items-center gap-2 hover:border-gold/30 hover:bg-gold/5 transition-colors text-left">
                    <span className="material-symbols-outlined text-gold/60 text-sm">{loc.icon}</span>
                    <span className="text-txt-main text-xs">{loc.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {targets.length > 0 && (
            <div>
              <h4 className="text-txt-dim/70 text-[10px] uppercase tracking-wider mb-2">Outros Personagens</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {targets.map(target => (
                  <div key={target.id} className="rounded-lg border border-sep/35 bg-void/40 p-3 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full border border-gold/30 bg-black/25 overflow-hidden grid place-items-center shrink-0">
                      {target.data?.avatar ? <img src={target.data.avatar} alt="" className="w-full h-full object-cover" /> : <span className="text-txt-dim/45 text-sm">?</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-txt-main text-sm font-semibold truncate">{target.data?.nome || target.name || 'Sem Nome'}</p>
                      <p className="text-txt-dim/55 text-[10px] truncate">{target.data?.classe || 'Classe'} - Nivel {target.data?.nivel || 1}</p>
                    </div>
                    <button onClick={() => onConfirm(target, transferQty)}
                      className="text-[10px] border border-sky-400/30 text-sky-300 px-3 py-1.5 rounded-lg hover:bg-sky-400/10 transition-colors shrink-0">
                      Transferir
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FullSheetViewer({ sheetId, onBack }) {
  const { user, profile, isAdmin } = useAuth()
  const [sheet, setSheet] = useState(null)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [showRaceEvolve, setShowRaceEvolve] = useState(false)
  const [mode, setMode] = useState('dashboard')
  const [saveError, setSaveError] = useState('')
  const [transferTargets, setTransferTargets] = useState([])
  const [transferRequest, setTransferRequest] = useState(null)

  const client = isAdmin ? getSupabaseAdmin() : supabase

  useEffect(() => {
    if (sheetId) loadSheet()
  }, [sheetId])

  useEffect(() => {
    if (sheetId) loadTransferTargets()
  }, [sheetId, isAdmin])

  async function loadSheet() {
    const { data, error } = await client.from('characters').select('*').eq('id', sheetId).single()
    if (error || !data) {
      setSheet(null)
    } else {
      setSheet({
        ...data,
        data: {
          atributos: {},
          skeletonPoints: {},
          habilidades: [],
          pericias: {},
          sistemaOptIn: {},
          inventario: [],
          equipamentos: [],
          modulosAdquiridos: [],
          skeletonHistory: [],
          systemSkills: [],
          ...data.data,
        },
      })
    }
  }

  async function loadTransferTargets() {
    if (!user?.id) return
    let query = client.from('characters').select('id,name,user_id').neq('id', sheetId).order('updated_at', { ascending: false })
    if (!isAdmin) query = query.eq('user_id', user.id)
    const { data } = await query
    setTransferTargets(data || [])
  }

  const saveTimerRef = useRef(null)

  const debouncedSave = useCallback((s) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      const { error } = await client.from('characters').update({
        name: s.data?.nome || s.name || 'Sem Nome',
        data: s.data,
      }).eq('id', s.id)
      if (error) {
        console.error('Erro ao salvar ficha:', error.message)
        setSaveError('Falha ao salvar: ' + error.message)
      } else {
        setSaveError('')
      }
    }, 600)
  }, [client])

  const update = useCallback((patch) => {
    setSheet(prev => {
      const next = { ...prev, data: { ...prev.data, ...patch } }
      debouncedSave(next)
      return next
    })
  }, [debouncedSave])

  const updateHabilidade = useCallback((index, patch) => {
    setSheet(prev => {
      const habs = [...(prev.data.habilidades || [])]
      habs[index] = { ...(habs[index] || {}), ...patch }
      const next = { ...prev, data: { ...prev.data, habilidades: habs } }
      debouncedSave(next)
      return next
    })
  }, [debouncedSave])

  async function saveSheet(s) {
    const { error } = await client.from('characters').update({
      name: s.data?.nome || s.name || 'Sem Nome',
      data: s.data,
    }).eq('id', s.id)
    if (error) {
      console.error('Erro ao salvar ficha:', error.message)
      setSaveError('Falha ao salvar: ' + error.message)
    } else {
      setSaveError('')
    }
  }

  function handleLevelUp(newData) {
    setSheet(prev => {
      const next = { ...prev, data: newData }
      debouncedSave(next)
      return next
    })
    setShowLevelUp(false)
  }

  function getTransferItem(collection, index) {
    if (!sheet) return null
    if (collection === 'armaPrincipal') {
      const weapon = WEAPONS.find(w => w.id === sheet.data?.arma)
      if (!weapon) return null
      return {
        id: sheet.data?.arma,
        nome: sheet.data?.armaNome || weapon.name,
        imagem: sheet.data?.armaImagem || null,
        rank: sheet.data?.armaRank || 'Comum',
        categoria: 'Arma',
      }
    }
    if (!['inventario', 'equipamentos'].includes(collection)) return null
    return (sheet.data?.[collection] || [])[index] || null
  }

  function handleTransferItem(collection, index) {
    const previewItem = getTransferItem(collection, index)
    if (!previewItem) return
    const customLocs = Array.isArray(sheet.data?.inventoryLocations) ? sheet.data.inventoryLocations : []
    const allItemLocs = new Set()
    const sources = [sheet.data?.inventario || [], sheet.data?.equipamentos || []]
    sources.forEach(arr => arr.forEach(item => {
      const loc = item?.local
      if (loc && !BASE_LOCATIONS.some(bl => bl.id === loc) && !customLocs.some(cl => cl.id === loc)) {
        allItemLocs.add(loc)
      }
    }))
    if (sheet.data?.armaLocal && !BASE_LOCATIONS.some(bl => bl.id === sheet.data.armaLocal) && !customLocs.some(cl => cl.id === sheet.data.armaLocal)) {
      allItemLocs.add(sheet.data.armaLocal)
    }
    const detectedLocs = [...allItemLocs].map(id => ({ id, label: id, icon: 'inventory_2' }))
    const allLocs = [...BASE_LOCATIONS, ...customLocs, ...detectedLocs]
    if (!transferTargets.length && allLocs.length === 0) {
      alert('Nenhuma outra ficha ou local disponivel para receber o item.')
      return
    }
    setTransferRequest({ collection, index, item: previewItem, locations: allLocs })
  }

  async function confirmTransferItem(target, qty = 0) {
    if (!sheet || !transferRequest || !target) return
    const { collection, index } = transferRequest
    const item = getTransferItem(collection, index)
    if (!item) return

    const itemQty = Number(item.quantidade) || 1
    const transferQty = qty > 0 ? Math.min(qty, itemQty) : itemQty
    const remainingQty = itemQty - transferQty

    let nextSourceData = sheet.data
    let targetCollection = collection
    let movedItem

    if (collection === 'armaPrincipal') {
      const weapon = WEAPONS.find(w => w.id === sheet.data?.arma)
      targetCollection = 'equipamentos'
      movedItem = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        nome: sheet.data?.armaNome || weapon?.name || 'Arma',
        imagem: sheet.data?.armaImagem || null,
        descricao: weapon?.mec || '',
        dano: weapon?.dano || '',
        efeitos: weapon?.mec || '',
        categoria: 'Arma',
        armaId: sheet.data?.arma || null,
        rank: sheet.data?.armaRank || 'Comum',
        habilidades: sheet.data?.armaHabilidades || [],
        equipado: false,
        local: 'guardado',
      }
      nextSourceData = {
        ...sheet.data,
        arma: null,
        armaRank: 'Comum',
        armaEquipada: true,
        armaLocal: 'equipado',
        armaHabilidades: [],
        armaNome: '',
        armaImagem: null,
      }
    } else {
      const sourceItems = sheet.data?.[collection] || []
      movedItem = {
        ...item,
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        equipado: false,
        local: 'guardado',
        quantidade: transferQty > 1 ? transferQty : undefined,
      }

      if (remainingQty > 0) {
        const updatedItems = [...sourceItems]
        updatedItems[index] = { ...item, quantidade: remainingQty }
        nextSourceData = { ...sheet.data, [collection]: updatedItems }
      } else {
        nextSourceData = {
          ...sheet.data,
          [collection]: sourceItems.filter((_, i) => i !== index),
        }
      }
    }

    const targetData = target.data || {}
    const nextTargetData = {
      ...targetData,
      [targetCollection]: [...(targetData[targetCollection] || []), movedItem],
    }

    const { error: targetError } = await client.from('characters').update({
      name: nextTargetData.nome || target.name || 'Sem Nome',
      data: nextTargetData,
    }).eq('id', target.id)
    if (targetError) {
      setSaveError('Falha ao transferir: ' + targetError.message)
      return
    }

    setSheet(prev => {
      const next = { ...prev, data: nextSourceData }
      debouncedSave(next)
      return next
    })
    setTransferTargets(prev => prev.map(t => t.id === target.id ? { ...t, data: nextTargetData } : t))
    setTransferRequest(null)
  }

  function confirmTransferToLocation(locationId, qty = 0) {
    if (!sheet || !transferRequest) return
    const { collection, index } = transferRequest
    const item = getTransferItem(collection, index)
    if (!item) return

    const itemQty = Number(item.quantidade) || 1
    const transferQty = qty > 0 ? Math.min(qty, itemQty) : itemQty
    const remainingQty = itemQty - transferQty

    let nextSourceData = sheet.data

    if (collection === 'armaPrincipal') {
      nextSourceData = {
        ...sheet.data,
        armaLocal: locationId,
        armaEquipada: locationId === 'carregado',
      }
    } else {
      const sourceItems = [...(sheet.data?.[collection] || [])]
      if (remainingQty > 0) {
        sourceItems[index] = { ...item, quantidade: remainingQty }
        const movedItem = { ...item, id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, local: locationId, equipado: false, quantidade: transferQty > 1 ? transferQty : undefined }
        nextSourceData = { ...sheet.data, [collection]: [...sourceItems, movedItem] }
      } else {
        sourceItems[index] = { ...item, local: locationId, equipado: false }
        nextSourceData = { ...sheet.data, [collection]: sourceItems }
      }
    }

    setSheet(prev => {
      const next = { ...prev, data: nextSourceData }
      debouncedSave(next)
      return next
    })
    setTransferRequest(null)
  }

  if (!sheet) return <p className="text-txt-dim p-8">Carregando...</p>

  const char = sheet.data

  if (mode === 'board') {
    return (
      <>
        <CharacterWorkspace char={char} update={update} onBack={() => setMode('dashboard')} />
        {showLevelUp && (
          <LevelUpModal char={char} onApply={handleLevelUp} onClose={() => setShowLevelUp(false)} />
        )}
        {showRaceEvolve && (
          <RaceEvolveModal char={char} update={update}
            onApply={(patch) => { update(patch); setShowRaceEvolve(false) }}
            onClose={() => setShowRaceEvolve(false)} />
        )}
      </>
    )
  }

  if (mode === 'sheet') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setMode('dashboard')} className="text-gold text-sm hover:text-gold-light transition-colors">← Voltar ao Dashboard</button>
          <div className="flex gap-2">
            <button onClick={() => setMode('dashboard')} className="border border-sep text-txt-dim px-3 py-1.5 rounded text-xs hover:border-gold hover:text-gold transition-colors">Dashboard</button>
            <button onClick={() => setMode('sheet')} className="border px-3 py-1.5 rounded text-xs transition-colors border-gold bg-gold text-void font-semibold">Ficha Detalhada</button>
            <button onClick={() => setMode('board')} className="border px-3 py-1.5 rounded text-xs transition-colors border-sep text-txt-dim hover:border-gold hover:text-gold">Quadro</button>
            <button onClick={() => exportToJson(char)} className="border border-sep text-txt-dim px-3 py-1.5 rounded text-xs hover:border-gold hover:text-gold transition-colors">Exportar JSON</button>
          </div>
        </div>
        {saveError && (
          <div className="bg-red-500/15 border border-red-500/40 text-red-300 px-4 py-2 rounded text-sm">{saveError}</div>
        )}
        <Step11Review char={char} update={update} updateHabilidade={updateHabilidade} onSave={() => {}} onEdit={onBack} onNew={() => {}} characterId={sheet.id} normalizeAbilities={false} transferTargets={transferTargets} onTransferItem={handleTransferItem} />
        {transferRequest && (<TransferItemModal item={transferRequest.item} targets={transferTargets} locations={transferRequest.locations || []} onConfirm={confirmTransferItem} onConfirmLocation={confirmTransferToLocation} onClose={() => setTransferRequest(null)} />)}
        {showLevelUp && (<LevelUpModal char={char} onApply={handleLevelUp} onClose={() => setShowLevelUp(false)} />)}
        {showRaceEvolve && (<RaceEvolveModal char={char} update={update} onApply={(patch) => { update(patch); setShowRaceEvolve(false) }} onClose={() => setShowRaceEvolve(false)} />)}
      </div>
    )
  }

  return (
    <>
      <CharacterCenter char={char} update={update} updateHabilidade={updateHabilidade} onShowSheet={() => setMode('sheet')} onShowBoard={() => setMode('board')} onShowRaceTree={() => setMode('sheet')} onLevelUp={() => setShowLevelUp(true)} onRaceEvolve={() => setShowRaceEvolve(true)} characterId={sheet.id} canEdit={true} onTransferItem={handleTransferItem} />
      {saveError && (<div className="fixed bottom-4 right-4 bg-red-500/15 border border-red-500/40 text-red-300 px-4 py-2 rounded text-sm z-50">{saveError}</div>)}
      {showLevelUp && (<LevelUpModal char={char} onApply={handleLevelUp} onClose={() => setShowLevelUp(false)} />)}
      {showRaceEvolve && (<RaceEvolveModal char={char} update={update} onApply={(patch) => { update(patch); setShowRaceEvolve(false) }} onClose={() => setShowRaceEvolve(false)} />)}
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}

function parseHash() {
  const hash = window.location.hash.replace(/^#\/?/, '')
  if (!hash) return { view: 'home', sheetId: null, adminTab: null, codexNpcId: null }
  const parts = hash.split('/')
  const view = parts[0] || 'home'
  const sheetId = parts[1] || null
  const adminTab = parts[1] || null
  let codexNpcId = null
  if (view === 'codex' && parts[1] === 'npc' && parts[2]) codexNpcId = parts[2]
  if (view === 'codex-new') return { view: 'codex-new', sheetId: null, adminTab: null, codexNpcId: null }
  if (view === 'board') return { view: 'board', sheetId: null, adminTab: null, codexNpcId: null }
  return { view, sheetId, adminTab, codexNpcId }
}

function buildHash(view, sheetId = null, adminTab = null, codexNpcId = null) {
  if (view === 'home' || !view) return '#/'
  if (view === 'library' && sheetId) return `#/library/${sheetId}`
  if (view === 'admin') return adminTab ? `#/admin/${adminTab}` : `#/admin`
  if (view === 'codex' && codexNpcId) return `#/codex/npc/${codexNpcId}`
  if (view === 'codex') return `#/codex`
  if (view === 'codex-new') return `#/codex-new`
  if (view === 'board') return `#/board`
  return `#/${view}`
}

function AppInner() {
  const { user, profile, loading, logout, isAdmin } = useAuth()
  const { char, update, updateNested, updateHabilidade, reset, clearDraft, hasDraft, drafts, startNewDraft, loadDraftById, deleteDraft } = useCharacter()

  const initialHash = useRef(parseHash())
  const [currentStep, setCurrentStep] = useState(0)
  const [view, setViewRaw] = useState(() => initialHash.current.view)
  const [validationError, setValidationError] = useState(null)
  const [sheets, setSheets] = useState([])
  const [viewingSheetId, setViewingSheetIdRaw] = useState(() => initialHash.current.sheetId)
  const [adminTab, setAdminTab] = useState(() => initialHash.current.adminTab || 'sheets')
  const [codexNpcId, setCodexNpcId] = useState(() => initialHash.current.codexNpcId)
  const [codexImportFile, setCodexImportFile] = useState(null)
  const prevStepRef = useRef(0)
  const lastUserRef = useRef(null)
  const skipHashSync = useRef(false)

  const setView = useCallback((v) => {
    setViewRaw(v)
    setViewingSheetIdRaw(null)
    setCodexNpcId(null)
    if (!skipHashSync.current) window.location.hash = buildHash(v)
  }, [])

  const setViewingSheetId = useCallback((id) => {
    setViewingSheetIdRaw(id)
    if (!skipHashSync.current) {
      window.location.hash = id ? buildHash('library', id) : buildHash(view)
    }
  }, [view])

  const navigate = useCallback((v, sheetId = null, aTab = null, cNpcId = null) => {
    setViewRaw(v)
    setViewingSheetIdRaw(sheetId)
    setCodexNpcId(cNpcId)
    if (v === 'admin' && aTab) setAdminTab(aTab)
    if (!skipHashSync.current) window.location.hash = buildHash(v, sheetId, aTab, cNpcId)
  }, [])

  useEffect(() => {
    function onHashChange() {
      const { view: hView, sheetId, adminTab: hTab, codexNpcId: hNpcId } = parseHash()
      skipHashSync.current = true
      setViewRaw(hView)
      setViewingSheetIdRaw(sheetId)
      if (hTab) setAdminTab(hTab)
      if (hNpcId) setCodexNpcId(hNpcId)
      else if (hView !== 'codex') setCodexNpcId(null)
      skipHashSync.current = false
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const sheetsLoadedRef = useRef(false)

  useEffect(() => {
    if (user && profile && !sheetsLoadedRef.current) {
      sheetsLoadedRef.current = true
      loadSheets()
    }
    if (!user) sheetsLoadedRef.current = false
  }, [user, profile])

  useEffect(() => {
    if (!user) {
      lastUserRef.current = null
      return
    }
    if (profile && lastUserRef.current !== user.id) {
      lastUserRef.current = user.id
      const { view: hView } = parseHash()
      if (!hView || hView === 'home') navigate('home')
    }
  }, [user, profile])

  useEffect(() => {
    if ((view === 'library' || view === 'board') && user && profile) loadSheets()
  }, [view])

  useEffect(() => {
    if (view !== 'wizard') return
    if (char.draftStep === currentStep) return
    if (!char.nome && !char.classe && !char.raca) return
    update({ draftStep: currentStep })
  }, [currentStep, view])

  useEffect(() => {
    const wentBack = currentStep < prevStepRef.current
    prevStepRef.current = currentStep
    if (!wentBack) return
    const resetPatch = {}
    if (currentStep < 3) resetPatch.classe = null
    if (currentStep < 4) resetPatch.choices = {}
    if (currentStep < 5) {
      resetPatch.skeletonPoints = { FOR: 0, DES: 0, CON: 0, INT: 0, APA: 0, AM: 0 }
      resetPatch.skeletonHistory = []
    }
    if (currentStep < 6) {
      resetPatch.triagemPrincipal = null
      resetPatch.triagemPrincipalNivel = 0
      resetPatch.subTriagem = null
      resetPatch.subTriagemNivel = 0
      resetPatch.subTriagemClass = null
    }
    if (currentStep < 7) resetPatch.modulosAdquiridos = []
    if (currentStep < 8) resetPatch.pericias = {}
    if (currentStep < 9) resetPatch.raceTreeUnlocked = []
    if (Object.keys(resetPatch).length > 0) {
      update(resetPatch)
    }
  }, [currentStep])

  async function loadSheets() {
    const client = profile.role === 'admin' ? getSupabaseAdmin() : supabase
    const query = client.from('characters').select('id,user_id,name,updated_at,data').order('updated_at', { ascending: false })
    if (profile.role !== 'admin') query.eq('user_id', user.id)
    const { data, error } = await query
    if (error) console.error('Erro ao carregar fichas:', error.message)
    setSheets(data || [])
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <ParticleBackground />
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-3 h-3 rounded-full bg-primary/60" style={{ animation: 'goldPulse 1.5s ease-in-out infinite' }} />
            <div className="w-3 h-3 rounded-full bg-primary/60" style={{ animation: 'goldPulse 1.5s ease-in-out 0.3s infinite' }} />
            <div className="w-3 h-3 rounded-full bg-primary/60" style={{ animation: 'goldPulse 1.5s ease-in-out 0.6s infinite' }} />
          </div>
          <div className="font-cinzel text-primary tracking-widest text-lg">Carregando...</div>
          <div className="mt-4 w-48 h-1 bg-surface-container-highest rounded-full overflow-hidden mx-auto">
            <div className="h-full bg-primary rounded-full" style={{ animation: 'shimmer 1.5s infinite', width: '40%' }} />
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <ParticleBackground />
        <LoginPage />
      </>
    )
  }

  const stepProps = { char, update, updateNested, updateHabilidade }
  const StepComponent = STEPS[currentStep].comp

  const canGoNext = currentStep < TOTAL_STEPS - 1
  const canGoPrev = currentStep > 0

  const goNext = () => {
    const err = validateStep(currentStep, char)
    if (err) { setValidationError(err); return }
    setValidationError(null)
    if (canGoNext) setCurrentStep(s => s + 1)
  }
  const goPrev = () => {
    setValidationError(null)
    if (!canGoPrev) return
    setCurrentStep(s => s - 1)
  }

  async function handleSave() {
    const toSave = JSON.parse(JSON.stringify(char))
    const extraTypes = calcExtraAbilitiesTypes(
      toSave.triagemPrincipal, toSave.triagemPrincipalNivel,
      toSave.subTriagem, toSave.subTriagemNivel,
      toSave.atributos, toSave.skeletonPoints || {}, toSave.modulosAdquiridos, toSave
    )
    const needed = 5 + extraTypes.length
    const allTipos = ['Passiva', 'Ativa', 'Ativa', 'Ativa', 'Ultimate', ...extraTypes]
    while ((toSave.habilidades || []).length < needed) {
      if (!toSave.habilidades) toSave.habilidades = []
      const idx = toSave.habilidades.length
      const tipo = allTipos[idx] || 'Extra (Triagem)'
      toSave.habilidades.push({ tipo, nome: '', descricao: '', custoEnergia: 0, dano: '', duracao: '', dt: '', tags: [], valores: {}, camadaSCP: 2, ppEstimado: 0, status: 'Pendente', evolucaoNivel: 0 })
    }
    if (toSave.habilidades.length > needed) toSave.habilidades.length = needed
    const { data, error } = await supabase.from('characters').insert({
      user_id: user.id,
      name: toSave.nome || 'Sem Nome',
      data: toSave,
    }).select().single()

    if (error) {
      alert('Erro ao salvar ficha: ' + (error.message || 'Erro desconhecido'))
      return
    }
    if (data) {
      setSheets(prev => [data, ...prev])
      const reviews = []
      ;(toSave.habilidades || []).forEach((h, i) => {
        reviews.push({
          character_id: data.id,
          ability_key: `habilidade_${i}`,
          ability_name: h.nome || 'Sem nome',
          ability_type: 'character',
          status: 'pendente',
          original_data: h,
          balanced_data: {},
          ai_feedback: '',
        })
      })
      ;(toSave.armaHabilidades || []).forEach((h, i) => {
        reviews.push({
          character_id: data.id,
          ability_key: `arma_${i}`,
          ability_name: h.nome || 'Sem nome',
          ability_type: 'weapon',
          status: 'pendente',
          original_data: h,
          balanced_data: {},
          ai_feedback: '',
        })
      })
      if (reviews.length > 0) {
        await supabase.from('ability_reviews').insert(reviews)
      }
    }
    reset()
    setCurrentStep(0)
    navigate('library')
  }

  async function handleDeleteSheet(id) {
    const { error } = await supabase.from('characters').delete().eq('id', id)
    if (error) {
      alert('Erro ao excluir: ' + error.message)
      return
    }
    setSheets(prev => prev.filter(s => s.id !== id))
    if (viewingSheetId === id) setViewingSheetId(null)
  }

  async function handleImport(file) {
    try {
      const data = await importFromJson(file)
      const { data: inserted, error } = await supabase.from('characters').insert({
        user_id: user.id,
        name: data.nome || 'Personagem Importado',
        data,
      }).select().single()
      if (error) throw new Error(error.message)
      if (inserted) {
        setSheets(prev => [inserted, ...prev])
      }
    } catch (err) {
      alert(err.message || 'Erro ao importar.')
    }
  }

  function handleNew() {
    startNewDraft()
    setCurrentStep(0)
    setView('wizard')
    setValidationError(null)
  }

  function handleResumeDraft(id) {
    const record = id ? loadDraftById(id) : (drafts[0] ? loadDraftById(drafts[0].id) : null)
    if (record) {
      setCurrentStep(Math.min(TOTAL_STEPS - 1, Math.max(0, Number(record.step ?? record.data?.draftStep ?? 0) || 0)))
    }
    setView('wizard')
  }

  function handleDeleteDraft(id) {
    deleteDraft(id)
  }

  const reviewProps = currentStep === TOTAL_STEPS - 1
    ? { char, update, updateHabilidade, onSave: handleSave, onEdit: () => setView('wizard'), onNew: handleNew, characterId: null }
    : stepProps

  const navItems = [
    { key: 'wizard', label: 'Criar' },
    { key: 'library', label: 'Personagens' },
    { key: 'reference', label: 'Livro de Regras' },
  ]
  if (isAdmin) {
    navItems.push({ key: 'admin', label: 'Mesa do Mestre' })
  }

  return (
    <div className="min-h-screen bg-background text-on-background font-body flex flex-col">
      <ParticleBackground />
      <header className="top-app-bar sticky top-0 z-50 w-full px-6 md:px-8 py-3 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => navigate('home')}
            className="flex flex-col text-left hover:opacity-80 transition-opacity" title="Voltar ao menu principal">
            <span className="font-cinzel text-primary tracking-[0.15em] uppercase" style={{ fontSize: 'clamp(1rem, 2vw, 1.35rem)', lineHeight: 1 }}>
              Olympo
            </span>
            <span className="font-mono text-outline uppercase" style={{ fontSize: '10px', letterSpacing: '0.4em' }}>
              Archivist Codex
            </span>
          </button>
          <div className="h-6 w-px bg-primary/20 hidden sm:block" />
          <span className="font-mono text-outline hidden sm:inline" style={{ fontSize: '11px', letterSpacing: '0.08em' }}>
            Olá, {profile?.display_name || user.email?.split('@')[0]}
          </span>
          {isAdmin && (
            <span className="font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 hidden sm:inline" style={{ fontSize: '9px' }}>
              ADMIN
            </span>
          )}
        </div>
        <nav className="hidden md:flex items-center gap-6 lg:gap-8">
          <button onClick={() => navigate('home')}
            className={`font-mono uppercase tracking-[0.15em] transition-colors pb-0.5 ${view === 'home' ? 'text-primary border-b border-primary' : 'text-outline hover:text-primary'}`}
            style={{ fontSize: '11px' }}>
            Visão Geral
          </button>
          {navItems.map(v => (
            <button key={v.key} onClick={() => navigate(v.key)}
              className={`font-mono uppercase tracking-[0.15em] transition-colors pb-0.5 ${view === v.key ? 'text-primary border-b border-primary' : 'text-outline hover:text-primary'}`}
              style={{ fontSize: '11px' }}>
              {v.label}
            </button>
          ))}
          <div className="h-6 w-px bg-primary/20" />
          <button onClick={handleNew}
            className="sigil-button bg-primary-container/20 text-primary px-5 py-1.5 rounded font-cinzel text-xs uppercase tracking-widest hover:text-white">
            <span className="material-symbols-outlined text-sm align-middle mr-1">auto_awesome</span>
            Criar Ficha
          </button>
          <button onClick={logout}
            className="font-mono text-outline hover:text-err transition-colors uppercase" style={{ fontSize: '11px' }}>
            Sair
          </button>
        </nav>
        <button onClick={() => navigate('home')}
          className="md:hidden text-primary p-2" title="Menu">
          <span className="material-symbols-outlined">menu</span>
        </button>
      </header>

      {view === 'home' ? (
        <div className="flex-1 overflow-y-auto">
           <HomeMenu
              userName={profile?.display_name || user.email?.split('@')[0]}
              sheetsCount={sheets.length}
              sheets={sheets}
              onNew={() => handleNew()}
               onContinue={handleResumeDraft}
              onLibrary={() => setView('library')}
              onReference={() => setView('reference')}
              onOpenSheet={(id) => navigate('library', id)}
              onAdminArea={(tab) => navigate('admin', null, tab)}
               hasDraft={hasDraft}
              drafts={drafts}
              onOpenDraft={handleResumeDraft}
              onDeleteDraft={handleDeleteDraft}
              isAdmin={isAdmin}
             />
         </div>
      ) : view === 'wizard' ? (
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto">
            <div className={`mx-auto py-6 ${currentStep === TOTAL_STEPS - 1 ? 'max-w-[1680px] px-2 sm:px-4 2xl:px-6' : currentStep === 1 ? 'max-w-7xl px-4' : currentStep === 9 ? 'max-w-[1600px] px-3 sm:px-4' : 'max-w-3xl px-4'}`}>
              <div className="mb-6 codex-card p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-outline uppercase tracking-widest" style={{ fontSize: '11px' }}>Etapa {currentStep + 1} de {TOTAL_STEPS}</span>
                  <span className="font-cinzel text-primary text-sm font-semibold uppercase tracking-wider">{STEPS[currentStep].label}</span>
                </div>
                <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-primary-fixed rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${((currentStep + 1) / TOTAL_STEPS) * 100}%`, boxShadow: '0 0 8px rgba(247,189,72,0.4)' }} />
                </div>
              </div>

              {validationError && (
                <div className="mb-4 bg-error-container/20 border border-error/30 rounded p-3 text-error text-sm flex items-center justify-between">
                  <span>{validationError}</span>
                  <button onClick={() => setValidationError(null)} className="text-error/60 hover:text-error ml-2">✕</button>
                </div>
              )}

              {currentStep === TOTAL_STEPS - 1 ? (
                <Step11Review {...reviewProps} />
              ) : (
                <>
                  <StepComponent {...stepProps} />
                  <div className="flex justify-between mt-8 pb-6">
                    <button onClick={goPrev} disabled={!canGoPrev}
                      className={`px-5 py-2 rounded font-semibold text-sm transition-colors ${canGoPrev ? 'bg-surface-container text-on-surface hover:bg-surface-container-high border border-outline/20' : 'bg-surface-container/50 text-outline/50 cursor-not-allowed'}`}>
                      ← Anterior
                    </button>
                    <button onClick={goNext} disabled={!canGoNext}
                      className={`px-5 py-2 rounded font-semibold text-sm transition-colors ${canGoNext ? 'bg-primary text-on-primary hover:bg-primary-fixed' : 'bg-primary/30 text-on-primary/50 cursor-not-allowed'}`}>
                      Próximo →
                    </button>
                  </div>
                </>
              )}
            </div>
        </main>
          <Sidebar char={char} step={currentStep + 1} />
        </div>
      ) : view === 'library' ? (
        <main className="flex-1 overflow-y-auto">
          <div className={`${viewingSheetId ? 'max-w-[1680px] px-2 sm:px-4 2xl:px-6' : 'max-w-7xl px-4'} mx-auto py-6`}>
            {viewingSheetId ? (
              <FullSheetViewer sheetId={viewingSheetId} onBack={() => setViewingSheetId(null)} />
            ) : (
              <CharacterLibrary
                sheets={sheets}
                onLoad={(id) => setViewingSheetId(id)}
                onDelete={handleDeleteSheet}
                onImport={handleImport}
                canExport={true}
              />
            )}
          </div>
        </main>
      ) : view === 'board' ? (
        <InfiniteBoard sheets={sheets} />
      ) : view === 'admin' && isAdmin ? (
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <AdminDashboard initialTab={adminTab} onViewSheet={(id) => navigate('library', id)} />
          </div>
        </main>
      ) : view === 'codex' && isAdmin ? (
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 py-6">
            {codexNpcId ? (
              <NpcSheet npcId={codexNpcId}
                onBack={() => navigate('codex')}
                onDeleted={() => navigate('codex')} />
            ) : (
              <CodexDashboard
                onNewNpc={() => navigate('codex-new')}
                onOpenNpc={(id) => navigate('codex', null, null, id)}
                onImportExport={(file) => setCodexImportFile(file)} />
            )}
            {codexImportFile && (
              <NpcImportExport
                file={codexImportFile}
                onImported={() => { setCodexImportFile(null) }}
                onClose={() => setCodexImportFile(null)} />
            )}
          </div>
        </main>
      ) : view === 'codex-new' && isAdmin ? (
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <NpcCreator
              onCreated={() => navigate('codex')}
              onBack={() => navigate('codex')} />
          </div>
        </main>
      ) : (
        <main className="flex-1 overflow-y-auto">
          <ReferencePage />
        </main>
      )}
    </div>
  )
}
