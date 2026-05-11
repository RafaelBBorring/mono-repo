import { useState, useCallback, useRef } from 'react'
import { ATTRIBUTES } from '../data/attributes'

const DRAFT_KEY = 'olympo_char_draft'

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
  dolares: 50,
  dracmas: 5,
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || (!parsed.nome && !parsed.classe)) return null
    return { ...initialState, ...parsed, habilidades: parsed.habilidades || initialState.habilidades }
  } catch { return null }
}

function saveDraft(state) {
  try {
    if (!state.nome && !state.classe) {
      localStorage.removeItem(DRAFT_KEY)
      return
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state))
  } catch {}
}

export function useCharacter() {
  const draft = useRef(loadDraft())
  const [char, setChar] = useState(draft.current || initialState)
  const [hasDraft, setHasDraft] = useState(!!draft.current)

  const persist = (next) => {
    setHasDraft(!!next.nome || !!next.classe)
    saveDraft(next)
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
    try { localStorage.removeItem(DRAFT_KEY) } catch {}
    setHasDraft(false)
  }, [])

  const reset = useCallback(() => {
    setChar(initialState)
    try { localStorage.removeItem(DRAFT_KEY) } catch {}
    setHasDraft(false)
  }, [])

  return { char, update, updateNested, updateHabilidade, reset, clearDraft, hasDraft }
}
