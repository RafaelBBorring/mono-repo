import { useState, useCallback, useRef } from 'react'
import { ATTRIBUTES } from '../data/attributes'

const DRAFT_KEY = 'olympo_char_draft'
const DRAFTS_KEY = 'olympo_char_drafts'
const ACTIVE_DRAFT_KEY = 'olympo_active_char_draft'

const initialHabilidade = (tipo) => ({
  tipo,
  nome: '',
  descricao: '',
  custoEnergia: 0,
  dano: '',
  duracao: '',
  camadaSCP: 2,
  ppEstimado: 0,
  status: 'Pendente',
  evolucaoNivel: 0,
})

const initialState = {
  nome: '',
  idade: '',
  altura: '',
  pesoCorporal: '',
  raca: '',
  racaTipo: '',
  racaDeus: null,
  subraca: null,
  racaAttrChoices: {},
  nivel: 1,
  arrayTipo: 'Balanceado',
  atributos: { FOR: 0, DES: 0, CON: 0, INT: 0, APA: 0, AM: 0 },
  skeletonPoints: { FOR: 0, DES: 0, CON: 0, INT: 0, APA: 0, AM: 0 },
  skeletonHistory: [],
  classe: null,
  choices: {},
  pericias: {},
  triagemPrincipal: null,
  triagemPrincipalNivel: 0,
  subTriagem: null,
  subTriagemNivel: 0,
  subTriagemClass: null,
  modulosAdquiridos: [],
  modulosSpecialBought: {},
  arma: null,
  armaRank: 'Comum',
  armaEquipada: true,
  armaLocal: 'equipado',
  armaHabilidades: [],
  arteMarcial: null,
  arteMarcialGrau: 0,
  avatar: null,
  vidaOverride: null,
  energiaOverride: null,
  peOverride: null,
  vidaAtual: null,
  energiaAtual: null,
  peAtual: null,
  habilidades: [
    initialHabilidade('Passiva'),
    initialHabilidade('Ativa'),
    initialHabilidade('Ativa'),
    initialHabilidade('Ativa'),
    initialHabilidade('Ultimate'),
  ],
  systemsOptIn: {
    alchemy: false,
    spells: false,
    runes: false,
    magic: false,
  },
  alchemyRituals: [],
  spells: [],
  runes: [],
  magics: [],
  grimorios: [],
  notas: '',
  inventario: [],
  equipamentos: [],
  systemSkills: [],
  systemSkillNotifications: [],
  dolares: 50,
  dracmas: 5,
}

function createDraftId() {
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function hasDraftContent(state = {}) {
  return !!(state.nome || state.classe || state.raca || state.arma || (state.habilidades || []).some(h => h.nome || h.descricao))
}

function normalizeDraftRecord(record) {
  if (!record?.data) return null
  const id = record.id || record.data.draftId || createDraftId()
  const data = { ...initialState, ...record.data, draftId: id, habilidades: record.data.habilidades || initialState.habilidades }
  return {
    id,
    name: record.name || data.nome || 'Rascunho sem nome',
    step: Number(record.step ?? data.draftStep ?? 0) || 0,
    updatedAt: record.updatedAt || new Date().toISOString(),
    data,
  }
}

function loadDraftList() {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    if (Array.isArray(parsed)) return parsed.map(normalizeDraftRecord).filter(Boolean)
  } catch {}
  return []
}

function saveDraftList(list, activeId) {
  try {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(list))
    if (activeId) localStorage.setItem(ACTIVE_DRAFT_KEY, activeId)
    else localStorage.removeItem(ACTIVE_DRAFT_KEY)
  } catch {}
}

function loadDraft() {
  const drafts = loadDraftList()
  if (drafts.length > 0) {
    const activeId = localStorage.getItem(ACTIVE_DRAFT_KEY)
    return drafts.find(d => d.id === activeId) || drafts[0]
  }
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || (!parsed.nome && !parsed.classe)) return null
    const id = parsed.draftId || createDraftId()
    const legacy = normalizeDraftRecord({ id, data: { ...parsed, draftId: id } })
    saveDraftList([legacy], id)
    localStorage.removeItem(DRAFT_KEY)
    return legacy
  } catch { return null }
}

function makeDraftRecord(state, id) {
  return {
    id,
    name: state.nome || 'Rascunho sem nome',
    step: Number(state.draftStep || 0) || 0,
    updatedAt: new Date().toISOString(),
    data: { ...state, draftId: id },
  }
}

export function useCharacter() {
  const loaded = useRef(loadDraft())
  const initialDrafts = useRef(loadDraftList())
  const activeDraftId = useRef(loaded.current?.id || createDraftId())
  const [drafts, setDrafts] = useState(initialDrafts.current)
  const [char, setChar] = useState(loaded.current?.data || { ...initialState, draftId: activeDraftId.current })
  const [hasDraft, setHasDraft] = useState(initialDrafts.current.length > 0)

  const persist = (next) => {
    const id = next.draftId || activeDraftId.current || createDraftId()
    activeDraftId.current = id
    if (!hasDraftContent(next)) {
      setHasDraft(drafts.length > 0)
      return
    }
    const record = makeDraftRecord(next, id)
    setDrafts(prev => {
      const without = prev.filter(item => item.id !== id)
      const out = [record, ...without].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      saveDraftList(out, id)
      setHasDraft(out.length > 0)
      return out
    })
  }

  const update = useCallback((patch) => {
    setChar(prev => {
      const next = { ...prev, ...patch }
      persist(next)
      return next
    })
  }, [])

  const updateNested = useCallback((key, patch) => {
    setChar(prev => {
      const next = { ...prev, [key]: { ...prev[key], ...patch } }
      persist(next)
      return next
    })
  }, [])

  const updateHabilidade = useCallback((index, patch) => {
    setChar(prev => {
      const habs = [...prev.habilidades]
      habs[index] = { ...habs[index], ...patch }
      const next = { ...prev, habilidades: habs }
      persist(next)
      return next
    })
  }, [])

  const clearDraft = useCallback(() => {
    const id = activeDraftId.current
    setDrafts(prev => {
      const out = prev.filter(item => item.id !== id)
      saveDraftList(out, out[0]?.id || null)
      setHasDraft(out.length > 0)
      return out
    })
  }, [])

  const reset = useCallback(() => {
    const id = activeDraftId.current
    const nextId = createDraftId()
    activeDraftId.current = nextId
    setChar({ ...initialState, draftId: nextId, draftStep: 0 })
    setDrafts(prev => {
      const out = prev.filter(item => item.id !== id)
      saveDraftList(out, nextId)
      setHasDraft(out.length > 0)
      return out
    })
  }, [])

  const startNewDraft = useCallback(() => {
    const id = createDraftId()
    activeDraftId.current = id
    setChar({ ...initialState, draftId: id, draftStep: 0 })
    setHasDraft(drafts.length > 0)
  }, [drafts.length])

  const loadDraftById = useCallback((id) => {
    const record = drafts.find(item => item.id === id)
    if (!record) return null
    activeDraftId.current = id
    saveDraftList(drafts, id)
    setChar({ ...initialState, ...record.data, draftId: id, habilidades: record.data.habilidades || initialState.habilidades })
    return record
  }, [drafts])

  const deleteDraft = useCallback((id) => {
    setDrafts(prev => {
      const out = prev.filter(item => item.id !== id)
      const nextActive = activeDraftId.current === id ? out[0]?.id || createDraftId() : activeDraftId.current
      saveDraftList(out, nextActive)
      setHasDraft(out.length > 0)
      if (activeDraftId.current === id) {
        activeDraftId.current = nextActive
        const nextRecord = out.find(item => item.id === nextActive)
        setChar(nextRecord?.data || { ...initialState, draftId: nextActive, draftStep: 0 })
      }
      return out
    })
  }, [])

  return { char, update, updateNested, updateHabilidade, reset, clearDraft, hasDraft, drafts, startNewDraft, loadDraftById, deleteDraft }
}
