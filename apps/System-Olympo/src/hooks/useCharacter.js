import { useState, useCallback } from 'react'
import { ATTRIBUTES } from '../data/attributes'

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
  raca: '',
  racaTipo: '',
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
  armaHabilidades: [],
  arteMarcial: null,
  arteMarcialGrau: 0,
  avatar: null,
  vidaOverride: null,
  energiaOverride: null,
  peOverride: null,
  habilidades: [
    initialHabilidade('Passiva'),
    initialHabilidade('Ativa'),
    initialHabilidade('Ativa'),
    initialHabilidade('Ativa'),
    initialHabilidade('Ultimate'),
  ],
  notas: '',
  inventario: [],
  equipamentos: [],
}

export function useCharacter() {
  const [char, setChar] = useState(initialState)

  const update = useCallback((patch) => {
    setChar(prev => ({ ...prev, ...patch }))
  }, [])

  const updateNested = useCallback((key, patch) => {
    setChar(prev => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }))
  }, [])

  const updateHabilidade = useCallback((index, patch) => {
    setChar(prev => {
      const habs = [...prev.habilidades]
      habs[index] = { ...habs[index], ...patch }
      return { ...prev, habilidades: habs }
    })
  }, [])

  const reset = useCallback(() => {
    setChar(initialState)
  }, [])

  return { char, update, updateNested, updateHabilidade, reset }
}
