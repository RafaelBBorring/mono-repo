import { useState, useEffect, useRef, useCallback } from 'react'
import { useCharacter } from './hooks/useCharacter'
import Sidebar from './components/Sidebar'
import Step1Identity from './components/steps/Step1Identity'
import Step2Skeleton from './components/steps/Step2Skeleton'
import Step3Class from './components/steps/Step3Class'
import Step5Progression from './components/steps/Step5Progression'
import Step4SkeletonPoints from './components/steps/Step4SkeletonPoints'
import Step6Pericias from './components/steps/Step6Pericias'
import Step7Modules from './components/steps/Step7Modules'
import Step8Triages from './components/steps/Step8Triages'
import Step9WeaponMartial from './components/steps/Step9WeaponMartial'
import Step10Abilities from './components/steps/Step10Abilities'
import Step11Review from './components/steps/Step11Review'
import ReferencePage from './components/ReferencePage'
import LoginPage from './components/LoginPage'
import ParticleBackground from './components/ParticleBackground'
import LevelUpModal from './components/LevelUpModal'
import { ATTRIBUTES } from './data/attributes'
import { PROGRESSION } from './data/progression'

const STEPS = [
  { id: 1, label: 'Identidade', comp: Step1Identity },
  { id: 2, label: 'Esqueleto', comp: Step2Skeleton },
  { id: 3, label: 'Classe', comp: Step3Class },
  { id: 4, label: 'Progressão', comp: Step5Progression },
  { id: 5, label: 'Pontos Esqueleto', comp: Step4SkeletonPoints },
  { id: 6, label: 'Triagens', comp: Step8Triages },
  { id: 7, label: 'Módulos', comp: Step7Modules },
  { id: 8, label: 'Perícias', comp: Step6Pericias },
  { id: 9, label: 'Arma e Arte Marcial', comp: Step9WeaponMartial },
  { id: 10, label: 'Habilidades', comp: Step10Abilities },
  { id: 11, label: 'Revisão', comp: Step11Review },
]

const TOTAL_STEPS = STEPS.length

function validateStep(stepIdx, char) {
  const sk = char.skeletonPoints || {}
  const attrs = char.atributos || {}
  const choices = char.choices || {}
  switch (stepIdx) {
    case 0:
      if (!char.nome || char.nome.trim() === '') return 'Informe o nome do personagem.'
      if (!char.raca || char.raca.trim() === '') return 'Informe a raça do personagem.'
      return null
    case 1: {
      const unassigned = ATTRIBUTES.filter(a => !attrs[a] || attrs[a] === 0)
      if (unassigned.length > 0) return `Distribua todos os atributos. Faltam: ${unassigned.join(', ')}.`
      return null
    }
    case 2:
      if (!char.classe) return 'Selecione uma classe.'
      return null
    case 3: {
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
    case 4:
      return null
    case 5:
      return null
    default:
      return null
  }
}

function CharacterLibrary({ sheets, onLoad, onDelete, onNew }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-cinzel text-gold text-2xl">Biblioteca de Personagens</h2>
        <button onClick={onNew} className="bg-gold text-void font-semibold px-4 py-2 rounded hover:bg-gold-light transition-colors text-sm">
          + Novo Personagem
        </button>
      </div>
      {sheets.length === 0 ? (
        <div className="bg-deep border border-sep rounded-lg p-8 text-center">
          <p className="text-txt-dim mb-4">Nenhum personagem criado ainda.</p>
          <button onClick={onNew} className="border border-gold text-gold px-4 py-2 rounded hover:bg-gold hover:text-void transition-colors text-sm">
            Criar Primeiro Personagem
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sheets.map((sheet, idx) => (
            <div key={idx} className="bg-deep border border-sep rounded-lg p-4 hover:border-gold transition-colors">
              <div className="flex items-start gap-3 mb-2">
                {sheet.avatar ? (
                  <img src={sheet.avatar} alt="" className="w-10 h-10 rounded-full border border-gold/40 object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full border border-sep bg-void flex items-center justify-center text-txt-dim text-xs shrink-0">?</div>
                )}
                <div className="min-w-0">
                  <h3 className="text-txt-main font-semibold truncate">{sheet.nome || 'Sem Nome'}</h3>
                  <p className="text-txt-dim text-xs">{sheet.classe || '?'} — Nível {sheet.nivel || 1}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onLoad(idx)} className="text-xs border border-gold text-gold px-3 py-1 rounded hover:bg-gold hover:text-void transition-colors">
                  Visualizar
                </button>
                <button onClick={() => onDelete(idx)} className="text-xs border border-err/40 text-err px-3 py-1 rounded hover:bg-err hover:text-white transition-colors">
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

function FullSheetViewer({ sheet, onBack, onUpdate }) {
  const [local, setLocal] = useState(sheet)
  const [showLevelUp, setShowLevelUp] = useState(false)

  const update = useCallback((patch) => {
    setLocal(prev => {
      const next = { ...prev, ...patch }
      onUpdate(next)
      return next
    })
  }, [onUpdate])

  const updateHabilidade = useCallback((index, patch) => {
    setLocal(prev => {
      const habs = [...(prev.habilidades || [])]
      habs[index] = { ...(habs[index] || {}), ...patch }
      const next = { ...prev, habilidades: habs }
      onUpdate(next)
      return next
    })
  }, [onUpdate])

  function handleLevelUp(newData) {
    setLocal(newData)
    onUpdate(newData)
    setShowLevelUp(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-gold text-sm hover:text-gold-light transition-colors">← Voltar à Biblioteca</button>
        {(local.nivel || 1) < 30 && (
          <button onClick={() => setShowLevelUp(true)}
            className="bg-gold/10 border border-gold/40 text-gold px-4 py-1.5 rounded text-sm hover:bg-gold hover:text-void transition-colors font-semibold">
            ▲ Subir de Nível ({local.nivel || 1} → {(local.nivel || 1) + 1})
          </button>
        )}
      </div>
      <Step11Review
        char={local}
        update={update}
        updateHabilidade={updateHabilidade}
        onSave={() => {}}
        onEdit={onBack}
        onNew={() => {}}
      />
      {showLevelUp && (
        <LevelUpModal char={local} onApply={handleLevelUp} onClose={() => setShowLevelUp(false)} />
      )}
    </div>
  )
}

export default function App() {
  const { char, update, updateNested, updateHabilidade, reset } = useCharacter()
  const [currentStep, setCurrentStep] = useState(0)
  const [view, setView] = useState('wizard')
  const [validationError, setValidationError] = useState(null)
  const [sheets, setSheets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('olympo_sheets') || '[]') } catch { return [] }
  })
  const [viewingSheetIdx, setViewingSheetIdx] = useState(null)
  const [user, setUser] = useState(() => {
    try { return localStorage.getItem('olympo_user') || null } catch { return null }
  })
  const prevStepRef = useRef(0)

  if (!user) {
    return (
      <>
        <ParticleBackground />
        <LoginPage onLogin={(name) => setUser(name)} />
      </>
    )
  }

  useEffect(() => {
    try { localStorage.setItem('olympo_sheets', JSON.stringify(sheets)) } catch {}
  }, [sheets])

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

  useEffect(() => {
    const wentBack = currentStep < prevStepRef.current
    prevStepRef.current = currentStep
    if (!wentBack) return
    const resetPatch = {}
    if (currentStep < 2) resetPatch.classe = null
    if (currentStep < 3) resetPatch.choices = {}
    if (currentStep < 4) {
      resetPatch.skeletonPoints = { FOR: 0, DES: 0, CON: 0, INT: 0, APA: 0, AM: 0 }
      resetPatch.skeletonHistory = []
    }
    if (currentStep < 5) {
      resetPatch.triagemPrincipal = null
      resetPatch.triagemPrincipalNivel = 0
      resetPatch.subTriagem = null
      resetPatch.subTriagemNivel = 0
      resetPatch.subTriagemClass = null
    }
    if (currentStep < 6) resetPatch.modulosAdquiridos = []
    if (currentStep < 7) resetPatch.pericias = {}
    if (currentStep < 8) {
      resetPatch.arma = null
      resetPatch.armaRank = 'Comum'
      resetPatch.armaHabilidades = []
      resetPatch.arteMarcial = null
      resetPatch.arteMarcialGrau = 0
    }
    if (Object.keys(resetPatch).length > 0) {
      update(resetPatch)
    }
  }, [currentStep])

  function handleSave() {
    const toSave = JSON.parse(JSON.stringify(char))
    setSheets(prev => [...prev, toSave])
    reset()
    setCurrentStep(0)
    setView('library')
  }

  function handleEdit() {
    setView('wizard')
  }

  function handleNew() {
    reset()
    setCurrentStep(0)
    setView('wizard')
    setValidationError(null)
  }

  function handleLoadSheet(idx) { setViewingSheetIdx(idx) }
  function handleDeleteSheet(idx) {
    setSheets(prev => prev.filter((_, i) => i !== idx))
    if (viewingSheetIdx === idx) setViewingSheetIdx(null)
  }
  function handleUpdateSheet(updated) {
    setSheets(prev => prev.map((s, i) => i === viewingSheetIdx ? updated : s))
  }

  const reviewProps = currentStep === TOTAL_STEPS - 1
    ? { char, update, updateHabilidade, onSave: handleSave, onEdit: handleEdit, onNew: handleNew }
    : stepProps

  const viewingSheet = viewingSheetIdx !== null ? sheets[viewingSheetIdx] : null

  return (
    <div className="min-h-screen bg-void text-txt-main font-body flex flex-col">
      <ParticleBackground />
      <nav className="bg-deep/95 backdrop-blur border-b border-sep px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <h1 className="font-cinzel text-gold text-lg sm:text-xl tracking-wide">SISTEMA OLYMPO 2.0</h1>
          <span className="text-txt-dim text-xs hidden sm:inline">Olá, {user}</span>
        </div>
        <div className="flex gap-1 items-center">
          {[
            { key: 'wizard', label: 'Criar' },
            { key: 'library', label: 'Personagens' },
            { key: 'reference', label: 'Referência' },
          ].map(v => (
            <button key={v.key} onClick={() => { setView(v.key); setViewingSheetIdx(null) }}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${view === v.key ? 'bg-gold text-void font-semibold' : 'text-txt-dim hover:text-txt-main'}`}>
              {v.label}
            </button>
          ))}
          <button onClick={() => { localStorage.removeItem('olympo_user'); setUser(null) }}
            className="ml-2 text-txt-dim text-xs hover:text-err transition-colors" title="Sair">
            Sair
          </button>
        </div>
      </nav>

      {view === 'wizard' ? (
        <div className="flex flex-1 overflow-hidden">
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-6">
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-txt-dim text-sm">Etapa {currentStep + 1} de {TOTAL_STEPS}</span>
                  <span className="text-gold text-sm font-semibold">{STEPS[currentStep].label}</span>
                </div>
                <div className="h-1.5 bg-panel rounded-full overflow-hidden">
                  <div className="h-full bg-gold rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / TOTAL_STEPS) * 100}%` }} />
                </div>
              </div>

              {validationError && (
                <div className="mb-4 bg-err/10 border border-err/30 rounded p-3 text-err text-sm flex items-center justify-between">
                  <span>{validationError}</span>
                  <button onClick={() => setValidationError(null)} className="text-err/60 hover:text-err ml-2">✕</button>
                </div>
              )}

              {currentStep === TOTAL_STEPS - 1 ? (
                <Step11Review {...reviewProps} />
              ) : (
                <>
                  <StepComponent {...stepProps} />
                  <div className="flex justify-between mt-8 pb-6">
                    <button onClick={goPrev} disabled={!canGoPrev}
                      className={`px-5 py-2 rounded font-semibold text-sm transition-colors ${canGoPrev ? 'bg-panel text-txt-main hover:bg-sep' : 'bg-panel/50 text-txt-dim/50 cursor-not-allowed'}`}>
                      ← Anterior
                    </button>
                    <button onClick={goNext} disabled={!canGoNext}
                      className={`px-5 py-2 rounded font-semibold text-sm transition-colors ${canGoNext ? 'bg-gold text-void hover:bg-gold-light' : 'bg-gold/30 text-void/50 cursor-not-allowed'}`}>
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
          <div className="max-w-5xl mx-auto px-4 py-6">
            {viewingSheet ? (
              <FullSheetViewer sheet={viewingSheet} onBack={() => setViewingSheetIdx(null)} onUpdate={handleUpdateSheet} />
            ) : (
              <CharacterLibrary sheets={sheets} onLoad={handleLoadSheet} onDelete={handleDeleteSheet} onNew={handleNew} />
            )}
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
