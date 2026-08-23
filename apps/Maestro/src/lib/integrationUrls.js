export function getMiroBoardUrlState(value) {
  const input = value.trim()
  if (!input) {
    return {
      status: 'empty',
      message: 'Opcional. Se informar, cole o link completo exibido ao abrir o board no Miro.',
    }
  }

  if (!/^https:\/\//i.test(input)) {
    return {
      status: 'incomplete',
      message: 'Link incompleto: inclua https:// e copie o endereço completo do board.',
    }
  }

  let url
  try {
    url = new URL(input)
  } catch {
    return {
      status: 'invalid',
      message: 'Link inválido: confira se o endereço foi copiado sem espaços ou cortes.',
    }
  }

  const hostname = url.hostname.toLowerCase().replace(/^www\./, '')
  if (url.protocol !== 'https:' || hostname !== 'miro.com' || url.port || url.username || url.password) {
    return {
      status: 'invalid',
      message: 'Link inválido: use um endereço oficial em miro.com.',
    }
  }

  const pathParts = url.pathname.split('/').filter(Boolean)
  const isBoardPath = pathParts[0] === 'app' && pathParts[1] === 'board'
  if (isBoardPath && (!pathParts[2] || pathParts[2] === '...')) {
    return {
      status: 'incomplete',
      message: 'Link incompleto: falta o identificador que aparece depois de /app/board/.',
    }
  }

  const hasBoardIdShape = /^[A-Za-z0-9_-]+={0,2}$/.test(pathParts[2] || '')
  if (!isBoardPath || pathParts.length !== 3 || !hasBoardIdShape) {
    return {
      status: 'invalid',
      message: 'Este endereço não aponta para um board. O formato esperado é miro.com/app/board/identificador.',
    }
  }

  return {
    status: 'valid',
    message: 'Formato reconhecido. A existência e o acesso ao board serão confirmados pelo Miro após a autorização.',
  }
}

export function getMiroBoardId(value) {
  if (getMiroBoardUrlState(value).status !== 'valid') return null
  return new URL(value.trim()).pathname.split('/').filter(Boolean)[2] || null
}

function normalizedReference(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ')
    .trim()
}

export function findReferencedMiroBoard(boards, reference = {}) {
  const boardId = getMiroBoardId(reference.boardUrl || '')
  if (boardId) {
    const byId = boards.find((board) => String(board.id) === boardId)
    if (byId) return byId
  }

  const expectedName = normalizedReference(reference.name)
  if (!expectedName) return null
  return boards.find((board) => normalizedReference(board.name) === expectedName) || null
}
