import { useState, useEffect, useRef, useCallback } from 'react'
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
import ReferencePage from './components/ReferencePage'
import LoginPage from './components/LoginPage'
import HomeMenu from './components/HomeMenu'
import ParticleBackground from './components/ParticleBackground'
import LevelUpModal from './components/LevelUpModal'
import RaceEvolveModal from './components/RaceEvolveModal'
import AdminDashboard from './components/AdminDashboard'
import CharacterWorkspace from './components/CharacterWorkspace'
import { ATTRIBUTES } from './data/attributes'
import { PROGRESSION } from './data/progression'
import { RACES } from './data/races'
import { calcExtraAbilities, calcExtraAbilitiesTypes } from './utils/calculator'

const STEPS = [
  { id: 1, label: 'Identidade', comp: Step1Identity },
  { id: 2, label: 'Raça', comp: StepRace },
  { id: 3, label: 'Esqueleto', comp: Step2Skeleton },
  { id: 4, label: 'Classe', comp: Step3Class },
  { id: 5, label: 'Progressão', comp: Step5Progression },
  { id: 6, label: 'Pontos Esqueleto', comp: Step4SkeletonPoints },
  { id: 7, label: 'Triagens', comp: Step8Triages },
  { id: 8, label: 'Módulos', comp: Step7Modules },
  { id: 9, label: 'Perícias', comp: Step6Pericias },
  { id: 10, label: 'Habilidades', comp: Step10Abilities },
  { id: 11, label: 'Revisão', comp: Step11Review },
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

function CharacterLibrary({ sheets, onLoad, onDelete, onImport, canExport }) {
  const importRef = useRef(null)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-cinzel text-gold text-2xl">Biblioteca de Personagens</h2>
        <div className="flex gap-2">
          <button onClick={() => importRef.current?.click()} className="border border-sep text-txt-dim px-3 py-2 rounded hover:border-gold hover:text-gold transition-colors text-sm">
            Importar JSON
          </button>
          <input ref={importRef} type="file" accept=".json" onChange={e => {
            const file = e.target.files?.[0]
            if (file) onImport(file)
            e.target.value = ''
          }} className="hidden" />
        </div>
      </div>
      {sheets.length === 0 ? (
        <div className="bg-deep border border-sep rounded-lg p-8 text-center">
          <p className="text-txt-dim mb-4">Nenhum personagem criado ainda.</p>
          <p className="text-txt-dim/50 text-xs">Crie um personagem no wizard ou importe um arquivo JSON.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sheets.map((sheet) => (
            <div key={sheet.id} className="bg-deep border border-sep rounded-lg p-4 hover:border-gold transition-colors">
              <div className="flex items-start gap-4 mb-3">
                {sheet.data?.avatar ? (
                  <img src={sheet.data.avatar} alt="" className="w-16 h-16 rounded-full border-2 border-gold/40 object-cover shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-full border-2 border-sep bg-void flex items-center justify-center text-txt-dim text-lg shrink-0">?</div>
                )}
                <div className="min-w-0">
                  <h3 className="text-txt-main font-semibold text-base truncate">{sheet.name || 'Sem Nome'}</h3>
                  <p className="text-txt-dim text-sm">{sheet.data?.classe || '?'} — Nível {sheet.data?.nivel || 1}</p>
                  <p className="text-txt-dim/50 text-xs mt-0.5">{sheet.data?.raca || ''}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onLoad(sheet.id)} className="text-xs border border-gold text-gold px-3 py-1 rounded hover:bg-gold hover:text-void transition-colors">
                  Visualizar
                </button>
                {canExport && (
                  <button onClick={() => exportToJson({ ...sheet.data, nome: sheet.name })} className="text-xs border border-sep text-txt-dim px-3 py-1 rounded hover:border-gold hover:text-gold transition-colors">
                    Exportar
                  </button>
                )}
                <button onClick={() => onDelete(sheet.id)} className="text-xs border border-err/40 text-err px-3 py-1 rounded hover:bg-err hover:text-white transition-colors">
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FullSheetViewer({ sheetId, onBack }) {
  const { user, profile, isAdmin } = useAuth()
  const [sheet, setSheet] = useState(null)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [showRaceEvolve, setShowRaceEvolve] = useState(false)
  const [mode, setMode] = useState('sheet')
  const [saveError, setSaveError] = useState('')
  const [transferTargets, setTransferTargets] = useState([])

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
      setSheet(data)
    }
  }

  async function loadTransferTargets() {
    if (!user?.id) return
    let query = client.from('characters').select('id,name,data,user_id').neq('id', sheetId).order('updated_at', { ascending: false })
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

  async function handleTransferItem(collection, index) {
    if (!sheet || !['inventario', 'equipamentos'].includes(collection)) return
    const sourceItems = sheet.data?.[collection] || []
    const item = sourceItems[index]
    if (!item) return
    if (!transferTargets.length) {
      alert('Nenhuma outra ficha disponível para receber o item.')
      return
    }
    const label = transferTargets.map((target, i) => `${i + 1}. ${target.data?.nome || target.name || 'Sem Nome'}`).join('\n')
    const choice = prompt(`Transferir "${item.nome || 'Item'}" para qual ficha?\n\n${label}`)
    const targetIndex = Number(choice) - 1
    const target = transferTargets[targetIndex]
    if (!target) return

    const movedItem = {
      ...item,
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      equipado: false,
      local: 'guardado',
    }
    const nextSourceData = {
      ...sheet.data,
      [collection]: sourceItems.filter((_, i) => i !== index),
    }
    const targetData = target.data || {}
    const nextTargetData = {
      ...targetData,
      [collection]: [...(targetData[collection] || []), movedItem],
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
  }

  if (!sheet) return <p className="text-txt-dim p-8">Carregando...</p>

  const char = sheet.data

  if (mode === 'board') {
    return (
      <>
        <CharacterWorkspace char={char} update={update} onBack={() => setMode('sheet')} />
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-gold text-sm hover:text-gold-light transition-colors">← Voltar à Biblioteca</button>
        <div className="flex gap-2">
          <button onClick={() => setMode('sheet')} className="border px-3 py-1.5 rounded text-xs transition-colors border-gold bg-gold text-void font-semibold">
            Ficha
          </button>
          <button onClick={() => setMode('board')} className="border px-3 py-1.5 rounded text-xs transition-colors border-sep text-txt-dim hover:border-gold hover:text-gold">
            Quadro
          </button>
          <button onClick={() => exportToJson(char)} className="border border-sep text-txt-dim px-3 py-1.5 rounded text-xs hover:border-gold hover:text-gold transition-colors">
            Exportar JSON
          </button>
          <button onClick={() => setShowRaceEvolve(true)}
            className="bg-purple-400/10 border border-purple-400/40 text-purple-300 px-4 py-1.5 rounded text-sm hover:bg-purple-400 hover:text-void transition-colors font-semibold">
            ⬆ Evoluir Raca
          </button>
          {(char.nivel || 1) < 30 && (
            <button onClick={() => setShowLevelUp(true)}
              className="bg-gold/10 border border-gold/40 text-gold px-4 py-1.5 rounded text-sm hover:bg-gold hover:text-void transition-colors font-semibold">
              ▲ Subir de Nivel ({char.nivel || 1} → {(char.nivel || 1) + 1})
            </button>
          )}
        </div>
      </div>
      {saveError && (
        <div className="bg-red-500/15 border border-red-500/40 text-red-300 px-4 py-2 rounded text-sm">
          {saveError}
        </div>
      )}
      <Step11Review
        char={char}
        update={update}
        updateHabilidade={updateHabilidade}
        onSave={() => {}}
        onEdit={onBack}
        onNew={() => {}}
        characterId={sheet.id}
        normalizeAbilities={false}
        transferTargets={transferTargets}
        onTransferItem={handleTransferItem}
      />
      {showLevelUp && (
        <LevelUpModal char={char} onApply={handleLevelUp} onClose={() => setShowLevelUp(false)} />
      )}
      {showRaceEvolve && (
        <RaceEvolveModal char={char} update={update}
          onApply={(patch) => { update(patch); setShowRaceEvolve(false) }}
          onClose={() => setShowRaceEvolve(false)} />
      )}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}

function AppInner() {
  const { user, profile, loading, logout, isAdmin } = useAuth()
  const { char, update, updateNested, updateHabilidade, reset } = useCharacter()
  const [currentStep, setCurrentStep] = useState(0)
  const [view, setView] = useState('home')
  const [validationError, setValidationError] = useState(null)
  const [sheets, setSheets] = useState([])
  const [viewingSheetId, setViewingSheetId] = useState(null)
  const [adminTab, setAdminTab] = useState('sheets')
  const prevStepRef = useRef(0)
  const lastUserRef = useRef(null)

  useEffect(() => {
    if (user && profile) loadSheets()
  }, [user, profile])

  useEffect(() => {
    if (!user) {
      lastUserRef.current = null
      return
    }
    if (profile && lastUserRef.current !== user.id) {
      lastUserRef.current = user.id
      setView('home')
      setViewingSheetId(null)
    }
  }, [user, profile])

  useEffect(() => {
    if (view === 'library' && user && profile) loadSheets()
  }, [view])

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
    if (Object.keys(resetPatch).length > 0) {
      update(resetPatch)
    }
  }, [currentStep])

  async function loadSheets() {
    const client = profile.role === 'admin' ? getSupabaseAdmin() : supabase
    const query = client.from('characters').select('*').order('updated_at', { ascending: false })
    if (profile.role !== 'admin') query.eq('user_id', user.id)
    const { data, error } = await query
    if (error) console.error('Erro ao carregar fichas:', error.message)
    setSheets(data || [])
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <ParticleBackground />
        <div className="text-primary font-cinzel text-xl animate-pulse tracking-widest">Carregando...</div>
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
      toSave.habilidades.push({ tipo, nome: '', descricao: '', custoEnergia: 0, dano: '', duracao: '', camadaSCP: 2, ppEstimado: 0, status: 'Pendente', evolucaoNivel: 0 })
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
    setView('library')
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
    reset()
    setCurrentStep(0)
    setView('wizard')
    setValidationError(null)
  }

  const reviewProps = currentStep === TOTAL_STEPS - 1
    ? { char, update, updateHabilidade, onSave: handleSave, onEdit: () => setView('wizard'), onNew: handleNew, characterId: null }
    : stepProps

  const navItems = [
    { key: 'wizard', label: 'Criar' },
    { key: 'library', label: 'Personagens' },
    { key: 'reference', label: 'Livro de Regras' },
  ]
  if (isAdmin) navItems.push({ key: 'admin', label: 'Mesa do Mestre' })

  return (
    <div className="min-h-screen bg-background text-on-background font-body flex flex-col">
      <ParticleBackground />
      <header className="top-app-bar sticky top-0 z-50 w-full px-6 md:px-8 py-3 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => { setView('home'); setViewingSheetId(null) }}
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
          <button onClick={() => { setView('home'); setViewingSheetId(null) }}
            className={`font-mono uppercase tracking-[0.15em] transition-colors pb-0.5 ${view === 'home' ? 'text-primary border-b border-primary' : 'text-outline hover:text-primary'}`}
            style={{ fontSize: '11px' }}>
            Visão Geral
          </button>
          {navItems.map(v => (
            <button key={v.key} onClick={() => { setView(v.key); setViewingSheetId(null) }}
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
        <button onClick={() => { setView('home'); setViewingSheetId(null) }}
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
             onNew={() => { handleNew(); setView('wizard') }}
             onContinue={() => setView('wizard')}
             onLibrary={() => setView('library')}
             onReference={() => setView('reference')}
             onOpenSheet={(id) => { setViewingSheetId(id); setView('library') }}
             onAdminArea={(tab) => { setAdminTab(tab); setView('admin'); setViewingSheetId(null) }}
             hasDraft={!!char.nome || !!char.classe}
             isAdmin={isAdmin}
            />
         </div>
      ) : view === 'wizard' ? (
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto">
            <div className={`mx-auto px-4 py-6 ${currentStep === TOTAL_STEPS - 1 || currentStep === 1 ? 'max-w-7xl' : 'max-w-3xl'}`}>
              <div className="mb-6 codex-card p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-outline uppercase tracking-widest" style={{ fontSize: '11px' }}>Etapa {currentStep + 1} de {TOTAL_STEPS}</span>
                  <span className="font-cinzel text-primary text-sm font-semibold uppercase tracking-wider">{STEPS[currentStep].label}</span>
                </div>
                <div className="h-1 bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${((currentStep + 1) / TOTAL_STEPS) * 100}%` }} />
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
          <div className="max-w-7xl mx-auto px-4 py-6">
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
      ) : view === 'admin' && isAdmin ? (
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <AdminDashboard initialTab={adminTab} onViewSheet={(id) => { setViewingSheetId(id); setView('library') }} />
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
