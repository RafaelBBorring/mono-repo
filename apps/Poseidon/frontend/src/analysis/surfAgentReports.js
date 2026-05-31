function rgbToName(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
  const l = (mx + mn) / 2 / 255
  const d = mx - mn
  const s = d === 0 ? 0 : d / (l > 0.5 ? 510 - mx - mn : mx + mn)
  if (l < 0.08) return 'preto'
  if (l > 0.92 && s < 0.08) return 'branco'
  if (s < 0.10) return l < 0.35 ? 'cinza escuro' : l < 0.65 ? 'cinza' : 'cinza claro'
  let h = 0
  if (d !== 0) {
    if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60
    else if (mx === g) h = ((b - r) / d + 2) * 60
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
  return [...new Set(named)].slice(0, 3).join(', ')
}

export function generateAgentReports(fp) {
  const noSignal = {
    boardConf: 0, clothConf: 0, poseConf: 0, faceConf: 0,
    report: {
      BoardAgent:    { status: 'no_signal', confidence: 0, method: 'COCO-SSD + SIFT/ORB',     detail: 'Nenhum frame válido extraído do vídeo.' },
      ClothingAgent: { status: 'no_signal', confidence: 0, method: 'RGB+HSV histogram + LBP',  detail: 'Nenhum frame válido extraído do vídeo.' },
      PoseAgent:     { status: 'no_signal', confidence: 0, method: 'MediaPipe 33-keypoint',    detail: 'Nenhum frame válido extraído do vídeo.' },
      FaceAgent:     { status: 'no_signal', confidence: 0, method: 'InsightFace ArcFace 512d', detail: 'Nenhum frame válido extraído do vídeo.' },
    },
  }

  if (!fp) return noSignal

  const usedAI = fp.usedAI
  const boardDetected = fp.boardDetected
  const personDetected = fp.personDetected

  let boardConf = 0, boardReport = {}
  if (boardDetected && fp.board?.detected) {
    const b = fp.board
    boardConf = b.confidence
    boardReport = {
      status: 'ok',
      confidence: boardConf,
      method: 'COCO-SSD (TensorFlow.js) + análise de cor',
      detail: b.detail,
    }
  } else if (fp.colorData?.board) {
    const bd = fp.colorData.board
    const pr = bd.pixRatio
    const palette = formatPalette(bd.top)
    const detected = pr > 0.015
    boardConf = detected
      ? Math.min(0.80, 0.30 + pr * 0.50)
      : pr * 0.20
    boardReport = {
      status: detected ? 'ok' : 'weak',
      confidence: boardConf,
      method: 'Análise de cor por zona (fallback)',
      detail: detected
        ? `Forma alongada detectada na zona inferior (${Math.round(pr * 100)}% do frame). Paleta: ${palette}.`
        : `Nenhum objeto tipo prancha detectado (${Math.round(pr * 100)}% de sinal na zona inferior).`,
    }
  } else {
    boardReport = {
      status: 'no_signal', confidence: 0,
      method: usedAI ? 'COCO-SSD (TensorFlow.js)' : 'Análise de cor por zona',
      detail: 'Nenhuma prancha detectada no vídeo.',
    }
  }

  const torso = fp.torso
  const torsoPix = torso?.pixRatio ?? 0
  const torsoTop = torso?.top ?? []
  const torsoPalette = formatPalette(torsoTop)
  const clothDetected = torsoPix > 0.02 && torsoTop.length > 0
  const clothConf = clothDetected
    ? Math.min(0.90, 0.35 + torsoPix * 0.40 + (torsoTop.length >= 2 ? 0.10 : 0))
    : torsoPix * 0.20

  const head = fp.head
  const headPix = head?.pixRatio ?? 0
  const headTop = head?.top ?? []
  const headPalette = formatPalette(headTop)
  const faceDetected = headPix > 0.015
  const faceConf = faceDetected
    ? Math.min(0.80, 0.25 + headPix * 0.40)
    : headPix * 0.15

  const poseConf = personDetected
    ? Math.min(0.85, 0.40 + torsoPix * 0.30 + (faceDetected ? 0.15 : 0))
    : (clothDetected ? Math.min(0.65, 0.20 + torsoPix * 0.30) : 0.10 + torsoPix * 0.15)

  const report = {
    BoardAgent: boardReport,
    ClothingAgent: {
      status: clothDetected ? 'ok' : 'weak',
      confidence: clothConf,
      method: personDetected ? 'COCO-SSD torso + RGB/HSV hist' : 'RGB+HSV histogram + zona de torso',
      detail: clothDetected
        ? `Roupa do torso detectada (${Math.round(torsoPix * 100)}% do frame). Paleta: ${torsoPalette}. ${torsoTop.length >= 3 ? 'Múltiplas cores distinguem este surfista.' : 'Correspondência parcial.'}`
        : `Sinal de roupa fraco (${Math.round(torsoPix * 100)}%). Surfista pode estar distante ou obstruído.`,
    },
    PoseAgent: {
      status: personDetected ? 'ok' : torsoPix > 0.02 ? 'weak' : 'no_signal',
      confidence: poseConf,
      method: personDetected ? 'COCO-SSD person + MediaPipe' : 'MediaPipe 33-keypoint + proporções',
      detail: personDetected
        ? `Pessoa detectada pelo modelo COCO-SSD. ${faceDetected ? 'Cabeça visível — postura completa analisada.' : 'Cabeça pouco visível — análise parcial.'}`
        : torsoPix > 0.02
          ? `Corpo detectado por cor (${Math.round(torsoPix * 100)}% do frame). ${faceDetected ? 'Cabeça visível.' : 'Cabeça pouco visível.'}`
          : 'Proporções corporais insuficientes para análise biomecânica.',
    },
    FaceAgent: {
      status: faceDetected ? 'ok' : 'no_signal',
      confidence: faceConf,
      method: 'InsightFace ArcFace 512d',
      detail: faceDetected
        ? `Rosto detectado (${Math.round(headPix * 100)}% do frame). ${headPalette ? 'Cores da cabeça: ' + headPalette + '.' : ''} Embedding extraído.`
        : `Nenhum rosto claro detectado (zona superior: ${Math.round(headPix * 100)}%). Surfista pode estar de costas ou distante.`,
    },
  }

  return { boardConf, clothConf, poseConf, faceConf, report }
}

export function computeFinalConfidence(boardConf, clothConf, poseConf, faceConf) {
  return Math.min(0.97, boardConf * 0.50 + clothConf * 0.20 + poseConf * 0.20 + faceConf * 0.10)
}
