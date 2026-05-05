const TRIAGE_IMAGES = {
  GUERREIRO: {
    TATICO: '/triagens/Guerreiro-Tatico.png',
    TÁTICO: '/triagens/Guerreiro-Tatico.png',
    LUTADOR: '/triagens/Guerreiro-Lutador.png',
    TANK: '/triagens/Guerreiro-Tank.png',
    SOLDADO: '/triagens/Guerreiro-Soldado.png',
    ASSASSINO: '/triagens/Operativo-Assassino.png',
  },
  OPERATIVO: {
    ASSASSINO: '/triagens/Operativo-Assassino.png',
    INFILTRADO: '/triagens/Operativo-Infiltrado.png',
    ATIRADOR: '/triagens/Operativo-Atirador.png',
    TECNICO: '/triagens/Operativo-Tecnico.png',
    TÉCNICO: '/triagens/Operativo-Tecnico.png',
  },
  MISTICO: {
    COMBATE: '/triagens/Mistico-Combate.png',
    SUPORTE: '/triagens/Mistico-Suporte.png',
    INTUITIVO: '/triagens/Mistico-Intuitivo.png',
    GRADUADO: '/triagens/Mistico-Graduado.png',
  },
}

export const CLASS_IMAGES = {
  GUERREIRO: '/triagens/Guerreiro-Soldado.png',
  OPERATIVO: '/triagens/Operativo-Atirador.png',
  MISTICO: '/triagens/Mistico-Graduado.png',
}

export function getTriagemImage(classKey, triageKey) {
  return TRIAGE_IMAGES[classKey]?.[triageKey] || TRIAGE_IMAGES[classKey]?.[Object.keys(TRIAGE_IMAGES[classKey] || {})[0]] || null
}

export default TRIAGE_IMAGES
