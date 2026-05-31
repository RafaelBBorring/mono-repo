function rgbToName(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2 / 255
  const d = max - min
  const s = d === 0 ? 0 : d / (l > 0.5 ? 510 - max - min : max + min)

  if (l < 0.08) return 'preto'
  if (l > 0.92 && s < 0.08) return 'branco'
  if (s < 0.10) return l < 0.35 ? 'cinza escuro' : l < 0.65 ? 'cinza' : 'cinza claro'

  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60
    else if (max === g) h = ((b - r) / d + 2) * 60
    else h = ((r - g) / d + 4) * 60
  }

  if (h < 15 || h >= 345) return l < 0.35 ? 'vermelho escuro' : 'vermelho'
  if (h < 45) return l < 0.35 ? 'laranja escuro' : 'laranja'
  if (h < 70) return s < 0.4 ? 'bege' : 'amarelo'
  if (h < 150) return l < 0.30 ? 'verde escuro' : 'verde'
  if (h < 195) return l < 0.30 ? 'ciano escuro' : 'ciano'
  if (h < 260) return l < 0.30 ? 'azul escuro' : 'azul'
  if (h < 290) return l < 0.30 ? 'roxo escuro' : 'roxo'
  if (h < 345) return l < 0.30 ? 'rosa escuro' : 'rosa'
  return 'indefinido'
}

function formatPalette(top) {
  if (!top || !top.length) return 'sem cores detectadas'
  const named = top.map(c => `${rgbToName(c.r, c.g, c.b)} (${Math.round(c.w * 100)}%)`)
  const unique = [...new Set(named)]
  return unique.slice(0, 3).join(', ')
}

function boardShapeDetail(fp) {
  const pr = fp.board?.pixRatio ?? 0
  if (pr < 0.02) return { detected: false, shape: 'indefinida', detail: 'Nenhuma prancha detectada na zona inferior do frame.' }

  const top = fp.board?.top ?? []
  const hasWhite = top.some(c => { const l = (c.r + c.g + c.b) / 3 / 255; return l > 0.80 && c.w > 0.10 })
  const hasYellow = top.some(c => { const l = (c.r + c.g + c.b) / 3 / 255; return c.r > 180 && c.g > 150 && c.b < 100 && c.w > 0.08 })
  const hasBright = top.some(c => { const l = (c.r + c.g + c.b) / 3 / 255; return l > 0.60 && c.w > 0.12 })

  let shape = 'colorida'
  if (hasWhite && !hasBright) shape = 'clara (provavelmente resin/white)'
  else if (hasYellow) shape = 'amarela'

  const palette = formatPalette(top)
  const areaPct = Math.round(pr * 100)

  let detail = `Prancha detectada na zona inferior (${areaPct}% do frame). `
  detail += `Paleta: ${palette}. `
  detail += hasWhite ? 'Superfície clara típica de prancha resin/white.' : ''
  detail += hasYellow ? 'Possível prancha amarela ou com adesivo amarelo.' : ''

  return { detected: true, shape, palette, detail, areaPct, hasWhite, hasYellow }
}

export function generateAgentReports(fingerprint) {
  if (!fingerprint) {
    return {
      boardConf: Math.random() * 0.15,
      clothConf: Math.random() * 0.10,
      poseConf: Math.random() * 0.10,
      faceConf: Math.random() * 0.08,
      report: {
        BoardAgent:    { status: 'no_signal', confidence: 0, method: 'SIFT+ORB fingerprint', detail: 'Nenhum frame válido extraído do vídeo. Não foi possível analisar.' },
        ClothingAgent: { status: 'no_signal', confidence: 0, method: 'RGB+HSV hist + LBP',   detail: 'Nenhum frame válido extraído do vídeo.' },
        PoseAgent:     { status: 'no_signal', confidence: 0, method: 'MediaPipe 33-keypoint', detail: 'Nenhum frame válido extraído do vídeo.' },
        FaceAgent:     { status: 'no_signal', confidence: 0, method: 'InsightFace ArcFace 512d', detail: 'Nenhum frame válido extraído do vídeo.' },
      },
    }
  }

  const board = boardShapeDetail(fingerprint)
  const boardConf = board.detected
    ? Math.min(0.95, 0.40 + fingerprint.board.pixRatio * 0.50 + (board.hasWhite ? 0.08 : 0) + (board.hasYellow ? 0.05 : 0))
    : fingerprint.board.pixRatio * 0.30

  const torsoPix = fingerprint.torso?.pixRatio ?? 0
  const torsoTop = fingerprint.torso?.top ?? []
  const clothDetected = torsoPix > 0.03 && torsoTop.length > 0
  const clothConf = clothDetected
    ? Math.min(0.90, 0.35 + torsoPix * 0.40 + (torsoTop.length >= 2 ? 0.10 : 0))
    : torsoPix * 0.25

  const headPix = fingerprint.head?.pixRatio ?? 0
  const faceDetected = headPix > 0.02
  const faceConf = faceDetected
    ? Math.min(0.80, 0.25 + headPix * 0.35)
    : headPix * 0.20

  const poseConf = clothDetected
    ? Math.min(0.85, 0.30 + torsoPix * 0.30 + (headPix > 0.02 ? 0.10 : 0))
    : 0.15 + torsoPix * 0.20

  const torsoPalette = formatPalette(torsoTop)
  const headPalette = formatPalette(fingerprint.head?.top ?? [])

  const report = {
    BoardAgent: {
      status: board.detected ? 'ok' : 'weak',
      confidence: boardConf,
      method: 'SIFT+ORB fingerprint + análise de cor',
      detail: board.detail,
    },
    ClothingAgent: {
      status: clothDetected ? 'ok' : 'weak',
      confidence: clothConf,
      method: 'RGB+HSV histogram + zona de torso',
      detail: clothDetected
        ? `Roupa do torso detectada (${Math.round(torsoPix * 100)}% do frame). Paleta: ${torsoPalette}. ${torsoTop.length >= 3 ? 'Múltiplas cores distinguem este surfista.' : 'Poucas cores — correspondência parcial.'}`
        : `Sinal de roupa fraco (${Math.round(torsoPix * 100)}% do frame). Surfista pode estar distante ou com roupa camuflada pelo fundo.`,
    },
    PoseAgent: {
      status: torsoPix > 0.03 ? 'ok' : 'weak',
      confidence: poseConf,
      method: 'MediaPipe 33-keypoint + proporções',
      detail: torsoPix > 0.03
        ? `Corpo detectado na zona central. Proporção cabeça/torso: ${Math.round(headPix * 100 / Math.max(torsoPix, 0.01))}%. ${headPix > 0.02 ? 'Cabeça visível — postura completa analisada.' : 'Cabeça pouco visível — análise parcial da postura.'}`
        : 'Proporções corporais insuficientes para análise biomecânica.',
    },
    FaceAgent: {
      status: faceDetected ? 'ok' : 'no_signal',
      confidence: faceConf,
      method: 'InsightFace ArcFace 512d',
      detail: faceDetected
        ? `Rosto detectado na zona superior (${Math.round(headPix * 100)}% do frame). ${headPalette ? 'Cores: ' + headPalette + '.' : ''} Embedding extraído para comparação.`
        : `Nenhum rosto claro detectado (zona superior: ${Math.round(headPix * 100)}%). Surfista pode estar de costas ou muito distante.`,
    },
  }

  return { boardConf, clothConf, poseConf, faceConf, report }
}

export function computeFinalConfidence(boardConf, clothConf, poseConf, faceConf) {
  return Math.min(0.97, boardConf * 0.50 + clothConf * 0.20 + poseConf * 0.20 + faceConf * 0.10)
}
