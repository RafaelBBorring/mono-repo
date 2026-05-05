const TRIAGE_IMAGES = {
  GUERREIRO: {
    TATICO: '/triagens/Guerreiro, Tatico.png',
    TÁTICO: '/triagens/Guerreiro, Tatico.png',
    LUTADOR: null,
    TANK: '/triagens/Guerreiro, Tank.png',
    SOLDADO: '/triagens/Guerreiro, Soldado.png',
    ASSASSINO: null,
  },
  OPERATIVO: {
    INFILTRADO: null,
    ATIRADOR: '/triagens/Operativo, Atirador.png',
    TECNICO: '/triagens/Operativo, Tecnico.png',
    TÉCNICO: '/triagens/Operativo, Tecnico.png',
  },
  MISTICO: {
    COMBATE: null,
    SUPORTE: null,
    INTUITIVO: null,
    GRADUADO: '/triagens/Mistico, Graduado.png',
  },
}

export const CLASS_IMAGES = {
  GUERREIRO: '/triagens/Guerreiro, Soldado.png',
  OPERATIVO: '/triagens/Operativo, Atirador.png',
  MISTICO: '/triagens/Mistico, Graduado.png',
}

export function getTriagemImage(classKey, triageKey) {
  return TRIAGE_IMAGES[classKey]?.[triageKey] || TRIAGE_IMAGES[classKey]?.[Object.keys(TRIAGE_IMAGES[classKey] || {})[0]] || null
}

export default TRIAGE_IMAGES
