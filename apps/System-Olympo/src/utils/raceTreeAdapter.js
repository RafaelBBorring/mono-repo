import { getRaceTree } from '../data/raceTrees'
import { RACES } from '../data/races'
import { getEvolutionAbility } from '../data/evolutionAbilities'

const EFFECT_ICONS = {
  vida: 'favorite',
  energia: 'bolt',
  ca: 'shield',
  attr: 'trending_up',
  pericia: 'school',
  habilidade: 'auto_awesome',
  regen: 'healing',
  evolution: 'upgrade',
  pe: 'stars',
}

const CANVAS_WIDTH = 1400
const TIER_HEIGHT = 170
const START_Y = 120
const NODE_GAP = 85
const EVO_OFFSET_X = 48
const EVO_OFFSET_Y = 55

function computeLayout(nodes, branches) {
  const positions = {}
  const branchCount = branches.length
  const colWidth = CANVAS_WIDTH / branchCount
  const branchCenters = branches.map((_, i) => colWidth * (i + 0.5))

  const regularNodes = nodes.filter(n => !n.upgradeOf)
  const evoNodes = nodes.filter(n => n.upgradeOf)

  branches.forEach((branch, bi) => {
    const cx = branchCenters[bi]
    const branchRegulars = regularNodes.filter(n => n.branch === branch.id)

    const byTier = {}
    branchRegulars.forEach(node => {
      if (!byTier[node.tier]) byTier[node.tier] = []
      byTier[node.tier].push(node)
    })

    Object.entries(byTier).forEach(([tierStr, tierNodes]) => {
      const tier = parseInt(tierStr)
      const y = START_Y + (tier - 1) * TIER_HEIGHT
      const count = tierNodes.length
      const totalWidth = (count - 1) * NODE_GAP
      const startX = cx - totalWidth / 2

      tierNodes.forEach((node, i) => {
        positions[node.id] = { x: startX + i * NODE_GAP, y }
      })
    })
  })

  evoNodes.forEach(node => {
    const parentPos = positions[node.upgradeOf]
    if (parentPos) {
      const parentBranchNodes = evoNodes.filter(e => e.upgradeOf === node.upgradeOf)
      const evoIndex = parentBranchNodes.indexOf(node)
      positions[node.id] = {
        x: parentPos.x + EVO_OFFSET_X,
        y: parentPos.y + EVO_OFFSET_Y + evoIndex * 30,
      }
    } else {
      positions[node.id] = { x: CANVAS_WIDTH / 2, y: 400 }
    }
  })

  const maxY = Math.max(...Object.values(positions).map(p => p.y), 0)
  const canvasHeight = Math.max(820, maxY + 120)

  return { positions, canvasWidth: CANVAS_WIDTH, canvasHeight }
}

function effectsToStats(effects) {
  if (!effects || effects.length === 0) return [{ label: 'Bônus', value: 'Especial' }]
  return effects.map(eff => {
    switch (eff.type) {
      case 'vida': return { label: 'Vida', value: `+${eff.value}` }
      case 'energia': return { label: 'Energia', value: `+${eff.value}` }
      case 'pe': return { label: 'PE', value: `+${eff.value}` }
      case 'ca': return { label: 'CA', value: `+${eff.value}` }
      case 'attr': return { label: eff.attr, value: `+${eff.value}` }
      case 'pericia': return { label: eff.pericia, value: `+${eff.value}` }
      case 'regen': return { label: 'Regeneração', value: `${eff.value} HP/rod` }
      case 'habilidade': return { label: 'Habilidade', value: eff.nome }
      case 'evolution': return { label: eff.stat === 'vida' ? 'Vida' : eff.stat === 'energia' ? 'Energia' : eff.stat, value: `+${eff.value}` }
      default: return { label: 'Bônus', value: '+' }
    }
  })
}

function getIconForNode(node, branch) {
  if (node.effects?.some(e => e.type === 'habilidade')) return 'auto_awesome'
  if (node.upgradeOf) return 'upgrade'
  const firstEffect = node.effects?.[0]
  if (firstEffect && EFFECT_ICONS[firstEffect.type]) return EFFECT_ICONS[firstEffect.type]
  return branch?.icon || 'circle'
}

export function adaptRaceTree(raceId) {
  const tree = getRaceTree(raceId)
  if (!tree) return null

  const race = RACES[raceId]
  const { positions, canvasWidth, canvasHeight } = computeLayout(tree.nodes, tree.branches)

  const skillTree = {}
  tree.nodes.forEach(node => {
    const pos = positions[node.id] || { x: canvasWidth / 2, y: 400 }
    const branch = tree.branches.find(b => b.id === node.branch)
    const tier = node.tier
    const hasNoReqs = !node.requires || node.requires.length === 0
    const isEvo = !!node.upgradeOf
    const evoAbility = isEvo ? getEvolutionAbility(node.id) : null

    skillTree[node.id] = {
      id: node.id,
      name: evoAbility ? evoAbility.nome : node.name,
      description: evoAbility ? evoAbility.descricao : node.desc,
      maxRank: 1,
      cost: node.cost || 1,
      dependsOn: node.requires || [],
      requireMode: 'all',
      branch: node.branch,
      tier,
      icon: evoAbility ? 'auto_awesome' : getIconForNode(node, branch),
      position: pos,
      stats: evoAbility
        ? [{ label: 'Custo', value: evoAbility.custo }, ...effectsToStats(node.effects || [])]
        : effectsToStats(node.effects || []),
      isKeystone: tier === 1 && hasNoReqs && !isEvo,
      isUltimate: tier === 4 && !isEvo,
      isEvolution: isEvo,
      isHabilidade: !!evoAbility,
      habilidadeInfo: evoAbility || null,
    }
  })

  const treeMeta = {
    name: tree.name,
    subtitle: `${race?.name || tree.name} — Árvore de Habilidades`,
    branches: {},
  }

  tree.branches.forEach(br => {
    treeMeta.branches[br.id] = {
      name: br.name,
      deity: br.desc,
      color: br.color,
      icon: br.icon,
    }
  })

  return {
    skillTree,
    connections: tree.connections,
    treeMeta,
    canvasSize: { width: canvasWidth, height: canvasHeight },
  }
}
