const BASE_URL = import.meta.env.BASE_URL || '/'
const ASSET_BASE = BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`
const triageAsset = (file) => `${ASSET_BASE}triagens/${file}`

function normalizeKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

const TRIAGE_IMAGES = {
  GUERREIRO: {
    TATICO: triageAsset('Guerreiro-Tatico.png'),
    LUTADOR: triageAsset('Guerreiro-Lutador.png'),
    TANK: triageAsset('Guerreiro-Tank.png'),
    SOLDADO: triageAsset('Guerreiro-Soldado.png'),
  },
  OPERATIVO: {
    ASSASSINO: triageAsset('Operativo-Assassino.png'),
    INFILTRADO: triageAsset('Operativo-Infiltrado.png'),
    ATIRADOR: triageAsset('Operativo-Atirador.png'),
    TECNICO: triageAsset('Operativo-Tecnico.png'),
  },
  MISTICO: {
    COMBATE: triageAsset('Mistico-Combate.png'),
    SUPORTE: triageAsset('Mistico-Suporte.png'),
    INTUITIVO: triageAsset('Mistico-Intuitivo.png'),
    GRADUADO: triageAsset('Mistico-Graduado.png'),
  },
}

export const CLASS_IMAGES = {
  GUERREIRO: triageAsset('Guerreiro-Soldado.png'),
  OPERATIVO: triageAsset('Operativo-Atirador.png'),
  MISTICO: triageAsset('Mistico-Graduado.png'),
}

export function getTriagemImage(classKey, triageKey) {
  const normalizedClass = normalizeKey(classKey)
  const normalizedTriage = normalizeKey(triageKey)
  const classImages = TRIAGE_IMAGES[normalizedClass]

  return classImages?.[normalizedTriage] || CLASS_IMAGES[normalizedClass] || null
}

export default TRIAGE_IMAGES
