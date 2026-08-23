import { BOX_TYPES } from './boxesPipeline'

const ACCENTS_BY_CATEGORY = Object.fromEntries(BOX_TYPES.map((box) => [box.entityCategory || box.id, box.accent]))

export function buildGraphFromPipeline(state) {
  const nodes = []
  const edges = []
  const nameIndex = new Map()

  for (const box of BOX_TYPES) {
    const boxData = state?.boxes?.[box.id]
    if (!boxData?.items?.length) continue
    for (const item of boxData.items) {
      const node = {
        id: item.id,
        type: 'entity',
        position: { x: 0, y: 0 },
        data: {
          label: item.title,
          category: box.entityCategory || box.id,
          boxId: box.id,
          boxName: box.name,
          excerpt: item.excerpt,
          polished: item.polished,
          bulletPoints: item.bulletPoints || [],
          sources: item.sources || [],
          confidence: item.confidence || 0,
          reviewNote: item.reviewNote || '',
          status: item.status || 'pending',
          accent: box.accent,
        },
      }
      nodes.push(node)
      const tokens = tokenize(item.title)
      for (const token of tokens) {
        if (!nameIndex.has(token)) nameIndex.set(token, [])
        nameIndex.get(token).push(item.id)
      }
    }
  }

  const edgeSet = new Set()
  for (const ids of nameIndex.values()) {
    if (ids.length < 2) continue
    for (let a = 0; a < ids.length; a += 1) {
      for (let b = a + 1; b < ids.length; b += 1) {
        const key = ids[a] < ids[b] ? `${ids[a]}|${ids[b]}` : `${ids[b]}|${ids[a]}`
        if (edgeSet.has(key)) continue
        edgeSet.add(key)
        const [source, target] = ids[a] < ids[b] ? [ids[a], ids[b]] : [ids[b], ids[a]]
        edges.push({ id: `e-${key}`, source, target, type: 'smoothstep', animated: true })
      }
    }
  }

  detectCrossReferences(nodes, edges, edgeSet)
  return layoutCircle(nodes, edges)
}

function tokenize(text) {
  if (!text) return []
  const stop = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'ou', 'para', 'com', 'sem', 'o', 'a', 'os', 'as', 'um', 'uma', 'no', 'na', 'nos', 'nas', 'que', 'ao', 'aos'])
  return (String(text).toLowerCase().match(/[\p{L}]{4,}/gu) || []).filter((token) => !stop.has(token)).slice(0, 6)
}

function detectCrossReferences(nodes, edges, edgeSet) {
  const nodeTokens = nodes.map((node) => ({ id: node.id, tokens: new Set(tokenize(`${node.data.label} ${node.data.excerpt || ''}`)) }))
  for (let a = 0; a < nodes.length; a += 1) {
    for (let b = a + 1; b < nodes.length; b += 1) {
      if (nodes[a].data.boxId === nodes[b].data.boxId) continue
      const intersection = [...nodeTokens[a].tokens].filter((token) => nodeTokens[b].tokens.has(token))
      if (intersection.length < 1) continue
      const key = nodes[a].id < nodes[b].id ? `${nodes[a].id}|${nodes[b].id}` : `${nodes[b].id}|${nodes[a].id}`
      if (edgeSet.has(key)) continue
      edgeSet.add(key)
      const [source, target] = nodes[a].id < nodes[b].id ? [nodes[a].id, nodes[b].id] : [nodes[b].id, nodes[a].id]
      edges.push({ id: `e-${key}`, source, target, type: 'smoothstep', animated: true, data: { reason: intersection[0] } })
    }
  }
}

function layoutCircle(nodes, edges) {
  const radius = Math.max(280, nodes.length * 26)
  const laidOut = nodes.map((node, index) => {
    const angle = (index / Math.max(1, nodes.length)) * Math.PI * 2
    return {
      ...node,
      position: {
        x: Math.cos(angle) * radius + 420,
        y: Math.sin(angle) * radius + 320,
      },
    }
  })
  return { nodes: laidOut, edges }
}

export function categoryColor(category) {
  return ACCENTS_BY_CATEGORY[category] || '#d9b777'
}

export function categoryLabel(category) {
  const box = BOX_TYPES.find((entry) => (entry.entityCategory || entry.id) === category)
  return box?.name || category
}
