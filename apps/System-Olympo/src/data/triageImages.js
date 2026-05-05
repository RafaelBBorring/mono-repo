const TRIAGE_IMAGES = {
  Guerreiro: {
    TATICO: '/triagens/Guerreiro, Tatico.png',
    LUTADOR: null,
    TANK: '/triagens/Guerreiro, Tank.png',
    SOLDADO: '/triagens/Guerreiro, Soldado.png',
    ASSASSINO: null,
  },
  Operativo: {
    INFILTRADO: null,
    ATIRADOR: '/triagens/Operativo, Atirador.png',
    TECNICO: '/triagens/Operativo, Tecnico.png',
  },
  'Místico': {
    COMBATE: null,
    SUPORTE: null,
    INTUITIVO: null,
    GRADUADO: '/triagens/Mistico, Graduado.png',
  },
}

export const CLASS_IMAGES = {
  Guerreiro: '/triagens/Guerreiro, Soldado.png',
  Operativo: '/triagens/Operativo, Atirador.png',
  'Místico': '/triagens/Mistico, Graduado.png',
}

export function getTriagemImage(classKey, triageKey) {
  return TRIAGE_IMAGES[classKey]?.[triageKey] || TRIAGE_IMAGES[classKey]?.[Object.keys(TRIAGE_IMAGES[classKey] || {})[0]] || null
}

export default TRIAGE_IMAGES
