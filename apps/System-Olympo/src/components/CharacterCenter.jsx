import { useState, useRef, useEffect, useMemo } from 'react'
import Chart from 'chart.js/auto'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { CLASSES } from '../data/classes'
import { RACES } from '../data/races'
import { TRIAGES, getAllTriagesForClass } from '../data/triages'
import { ATTR_LABELS, ATTR_ICONS, getModifier } from '../data/attributes'
import { PERICIAS, GRAU_NAMES, getGrauBonus } from '../data/pericias'
import { WEAPONS, WEAPON_RANKS } from '../data/weapons'
import { RANK_COLORS } from '../data/colors'
import { getRaceProfile } from '../data/raceProfiles'
import { MODULES_PASSIVE, MODULES_ACTIVE } from '../data/modules'
import { getRaceTree } from '../data/raceTrees'
import { calcVidaTotal, calcEnergiaTotal, calcPeTotal, calcCA, calcReacoes, calcPercepcaoPassiva, calcDanoBase, calcPARTotal, calcRaceTreePARSpent, calcCarryCapacity, calcCarriedLoad, getAttrValue } from '../utils/calculator'
import { calculateRaceBonus, getRaceLabel, getSelectedSubrace } from '../utils/raceCalculator'
import { normalizeSkillTags, getSkillTagChips, calcEvolucaoDelta, getSkillBracket } from '../utils/skillEvolution'
import { getLevelBand } from '../utils/skillEvolution'
import ResidentInventorySection from './ResidentInventorySection'
import SkillTreeView from './SkillTreeView'

const RESOURCE_COLORS = {
  vida: '#3dff92',
  energia: '#3cbcff',
  pe: '#f8c55f',
}

function getResourceColor(type) {
  return RESOURCE_COLORS[type] || '#f8c55f'
}

function getTierInfo(level) {
  if (level <= 7) return { name: 'Novato', color: '#60a5fa', glow: 'rgba(96,165,250,0.25)' }
  if (level <= 13) return { name: 'Veterano', color: '#f7bd48', glow: 'rgba(247,189,72,0.25)' }
  if (level <= 22) return { name: 'Elite', color: '#c084fc', glow: 'rgba(192,132,252,0.25)' }
  if (level <= 30) return { name: 'Lendário', color: '#f87171', glow: 'rgba(248,113,113,0.25)' }
  if (level <= 38) return { name: 'Mítico', color: '#34d399', glow: 'rgba(52,211,153,0.25)' }
  if (level <= 44) return { name: 'Ascendente', color: '#fb923c', glow: 'rgba(251,146,60,0.25)' }
  return { name: 'Transcendente', color: '#f472b6', glow: 'rgba(244,114,182,0.3)' }
}

function computeStats(char) {
  const classe = char.classe
  const nivel = char.nivel || 1
  const attrs = char.atributos || {}
  const sk = char.skeletonPoints || {}
  const choices = char.choices || char.progressaoChoices || {}
  const raceContext = char

  const vidaTotal = calcVidaTotal(classe, nivel, attrs, sk, choices, char.triagemPrincipal, char.triagemPrincipalNivel, raceContext, char.subTriagem, char.subTriagemNivel)
  const energiaTotal = calcEnergiaTotal(classe, nivel, attrs, sk, choices, char.triagemPrincipal, char.triagemPrincipalNivel, char.subTriagem, char.subTriagemNivel, raceContext)
  const peTotal = calcPeTotal(classe, nivel, choices, raceContext)
  const ca = calcCA(attrs, sk, char.pericias, raceContext)
  const reacoes = calcReacoes(attrs, sk, char.triagemPrincipal, char.triagemPrincipalNivel, char.subTriagem, char.subTriagemNivel, raceContext)
  const percepcao = calcPercepcaoPassiva(attrs, sk, char.pericias, raceContext)
  const danoBase = calcDanoBase(classe, attrs, sk, nivel, char.subTriagem, char.subTriagemNivel, char.triagemPrincipal, char.triagemPrincipalNivel, raceContext)

  const attrValues = {}
  ;['FOR', 'DES', 'CON', 'INT', 'APA', 'AM'].forEach(a => {
    attrValues[a] = getAttrValue(attrs, a, sk, raceContext)
  })

  const modValues = {}
  ;['FOR', 'DES', 'CON', 'INT', 'APA', 'AM'].forEach(a => {
    modValues[a] = getModifier(attrValues[a])
  })

  const raceBonus = calculateRaceBonus(raceContext)
  const raceLabel = getRaceLabel(char.raca) || char.raca || '—'
  const subrace = getSelectedSubrace(char)

  const weapon = WEAPONS.find(w => w.id === char.arma)
  const weaponRank = char.armaRank || 'Comum'

  const parTotal = calcPARTotal(classe, nivel, choices, char.modulosAdquiridos, char)
  const parSpent = calcRaceTreePARSpent(char.raceTreeUnlocked || [], char.raca)

  const carryCap = calcCarryCapacity(attrs, sk, char)
  const carriedLoad = calcCarriedLoad(char)

  let powerScore = 0
  powerScore += Math.floor(vidaTotal * 0.3)
  powerScore += Math.floor(energiaTotal * 0.5)
  powerScore += peTotal * 3
  powerScore += ca * 8
  powerScore += nivel * 40
  ;['FOR', 'DES', 'CON', 'INT', 'APA', 'AM'].forEach(a => {
    powerScore += attrValues[a] * 5
  })

  return {
    vidaTotal, energiaTotal, peTotal, ca, reacoes, percepcao, danoBase,
    attrValues, modValues, raceBonus, raceLabel, subrace, weapon, weaponRank,
    parTotal, parSpent, carryCap, carriedLoad, powerScore,
    nivel, classe, band: getLevelBand(nivel),
  }
}

function ParticleBackdrop() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    const stars = []
    const starCount = 600
    for (let i = 0; i < starCount; i++) {
      const size = Math.random() * 0.03 + 0.008
      const geo = new THREE.SphereGeometry(size)
      const isGold = Math.random() > 0.7
      const mat = new THREE.MeshBasicMaterial({
        color: isGold ? 0xf7bd48 : 0xffffff,
        transparent: true,
        opacity: Math.random() * 0.6 + 0.2,
      })
      const star = new THREE.Mesh(geo, mat)
      const radius = 15 + Math.random() * 20
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      star.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      )
      scene.add(star)
      stars.push(star)
    }

    camera.position.z = 8

    let frameId
    function animate() {
      frameId = requestAnimationFrame(animate)
      scene.rotation.y += 0.0003
      scene.rotation.x += 0.0001
      stars.forEach((star, i) => {
        star.material.opacity = 0.2 + Math.sin(Date.now() * 0.001 + i * 0.5) * 0.15 + 0.15
      })
      renderer.render(scene, camera)
    }
    animate()

    function onResize() {
      if (!mount) return
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', onResize)
      mount.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [])

  return <div ref={mountRef} className="fixed inset-0 -z-10" style={{ pointerEvents: 'none' }} />
}

function ResourceOrb({ label, current, max, type }) {
  const percent = max > 0 ? Math.min(100, (current / max) * 100) : 0
  const color = getResourceColor(type)
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (percent / 100) * circumference

  return (
    <div className="cc-orb glass-panel flex flex-col items-center" data-gsap>
      <div className="relative" style={{ width: 120, height: 120 }}>
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
          <circle
            cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 1s ease', filter: `drop-shadow(0 0 8px ${color}80)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl font-bold" style={{ color }}>{current}</span>
          <span className="text-[10px] text-txt-dim font-mono">/ {max}</span>
        </div>
      </div>
      <span className="cc-orb-label" style={{ color }}>{label}</span>
    </div>
  )
}

function CombatStat({ label, value, icon, accent }) {
  return (
    <div className="glass-panel cc-combat-stat" data-gsap>
      <span className="material-symbols-outlined cc-combat-icon" style={{ color: accent || 'var(--gold)', fontVariationSettings: "'FILL' 0, 'wght' 300" }}>{icon}</span>
      <div className="cc-combat-value font-mono">{value}</div>
      <div className="cc-combat-label">{label}</div>
    </div>
  )
}

function AbilityCard({ habilidade, index, onExpand }) {
  const tags = normalizeSkillTags(habilidade)
  const chips = getSkillTagChips(habilidade)
  const evoNivel = habilidade.evolucaoNivel || 0

  const tipoStyle = {
    Passiva: { border: '1px solid rgba(0,255,174,0.3)', glow: 'rgba(0,255,174,0.1)', icon: 'shield', color: '#00ffae' },
    Ativa: { border: '1px solid rgba(74,163,255,0.3)', glow: 'rgba(74,163,255,0.1)', icon: 'flash_on', color: '#4aa3ff' },
    Ultimate: { border: '1px solid rgba(247,189,72,0.4)', glow: 'rgba(247,189,72,0.15)', icon: 'stars', color: '#f7bd48' },
  }
  const tipo = habilidade.tipo || 'Ativa'
  const style = tipoStyle[tipo] || tipoStyle.Ativa

  return (
    <div
      className="cc-ability-card glass-panel"
      data-gsap
      style={{
        borderColor: style.border,
        boxShadow: `0 0 24px ${style.glow}`,
      }}
      onClick={() => onExpand && onExpand({ habilidade, index })}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined text-lg" style={{ color: style.color, fontVariationSettings: "'FILL' 1" }}>{style.icon}</span>
        <span className="cc-ability-type" style={{ color: style.color }}>{tipo.toUpperCase()}</span>
        {evoNivel > 0 && (
          <span className="cc-evo-badge">PEH {evoNivel}</span>
        )}
      </div>
      <h4 className="cc-ability-name font-cinzel">{habilidade.nome || `Habilidade ${index + 1}`}</h4>
      {habilidade.custoEnergia > 0 && (
        <div className="cc-ability-cost">{habilidade.custoEnergia}E</div>
      )}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {chips.slice(0, 4).map((chip, i) => (
            <span key={i} className="cc-tag-chip">{chip.label}{chip.value ? ` ${chip.value}` : ''}</span>
          ))}
          {chips.length > 4 && <span className="cc-tag-chip">+{chips.length - 4}</span>}
        </div>
      )}
      <div className="cc-ability-hint">Clique para detalhes</div>
    </div>
  )
}

function AbilityDetailModal({ habilidade, index, onClose, onEdit, char }) {
  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState(habilidade)

  useEffect(() => { setDraft(habilidade); setEditMode(false) }, [habilidade])

  if (!habilidade) return null
  const chips = getSkillTagChips(draft)
  const evoNivel = draft.evolucaoNivel || 0
  const delta = evoNivel > 0 ? calcEvolucaoDelta(draft, evoNivel) : null
  const tipo = draft.tipo || 'Ativa'
  const canEdit = onEdit && index != null

  const tipoStyle = {
    Passiva: { color: '#00ffae', icon: 'shield' },
    Ativa: { color: '#4aa3ff', icon: 'flash_on' },
    Ultimate: { color: '#f7bd48', icon: 'stars' },
  }
  const style = tipoStyle[tipo] || tipoStyle.Ativa

  function save() {
    onEdit(index, draft)
    setEditMode(false)
  }

  function patch(p) {
    setDraft(prev => ({ ...prev, ...p }))
  }

  return (
    <div className="cc-modal-overlay" onClick={onClose}>
      <div className="cc-modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ overflow: 'visible' }}>
        <button className="cc-modal-close" onClick={onClose}>
          <span className="material-symbols-outlined">close</span>
        </button>
        <div className="cc-modal-header">
          <span className="material-symbols-outlined" style={{ color: style.color, fontSize: 32, fontVariationSettings: "'FILL' 1" }}>{style.icon}</span>
          <div className="flex-1">
            {editMode ? (
              <input
                className="cc-edit-input cc-edit-input--title"
                value={draft.nome || ''}
                onChange={e => patch({ nome: e.target.value })}
                placeholder="Nome da habilidade"
              />
            ) : (
              <>
                <span className="cc-ability-type" style={{ color: style.color }}>{tipo.toUpperCase()}{index != null ? ` · SLOT ${index + 1}` : ''}</span>
                <h3 className="font-cinzel text-xl text-txt-main mt-1">{draft.nome || 'Habilidade'}</h3>
              </>
            )}
          </div>
          {canEdit && !editMode && (
            <button className="cc-modal-edit-btn" onClick={() => setEditMode(true)}>
              <span className="material-symbols-outlined text-sm">edit</span> Editar
            </button>
          )}
          {editMode && (
            <button className="cc-modal-edit-btn cc-modal-edit-btn--save" onClick={save}>
              <span className="material-symbols-outlined text-sm">check</span> Salvar
            </button>
          )}
        </div>
        <div className="cc-modal-body">
          {editMode ? (
            <div className="space-y-3">
              <textarea
                className="cc-edit-textarea"
                value={draft.descricaoBalanceada || draft.descricao || ''}
                onChange={e => patch({ descricaoBalanceada: e.target.value, descricao: e.target.value })}
                rows={4}
                placeholder="Descrição da habilidade"
              />
              <div className="cc-edit-grid">
                <label className="cc-edit-field">
                  <span>Energia</span>
                  <input type="number" value={draft.custoEnergia || ''} onChange={e => patch({ custoEnergia: parseInt(e.target.value) || 0 })} />
                </label>
                <label className="cc-edit-field">
                  <span>Dano</span>
                  <input type="text" value={draft.dano || ''} onChange={e => patch({ dano: e.target.value })} />
                </label>
                <label className="cc-edit-field">
                  <span>DT</span>
                  <input type="text" value={draft.dt || ''} onChange={e => patch({ dt: e.target.value })} />
                </label>
                <label className="cc-edit-field">
                  <span>Duração</span>
                  <input type="text" value={draft.duracao || ''} onChange={e => patch({ duracao: e.target.value })} />
                </label>
                <label className="cc-edit-field">
                  <span>Alcance</span>
                  <input type="text" value={draft.alcance || ''} onChange={e => patch({ alcance: e.target.value })} />
                </label>
                <label className="cc-edit-field">
                  <span>Recarga</span>
                  <input type="text" value={draft.cooldown || ''} onChange={e => patch({ cooldown: e.target.value })} />
                </label>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-txt-main leading-relaxed mb-3">
                {draft.descricaoBalanceada || draft.descricao || '—'}
              </p>
              <div className="cc-modal-stats">
                {draft.custoEnergia > 0 && <div className="cc-modal-stat"><span className="text-txt-dim">Energia</span><span className="font-mono text-tomato">{draft.custoEnergia}</span></div>}
                {draft.dano && <div className="cc-modal-stat"><span className="text-txt-dim">Dano</span><span className="font-mono text-tomato">{draft.dano}</span></div>}
                {draft.dt && <div className="cc-modal-stat"><span className="text-txt-dim">DT</span><span className="font-mono">{draft.dt}</span></div>}
                {draft.duracao && <div className="cc-modal-stat"><span className="text-txt-dim">Duração</span><span>{draft.duracao}</span></div>}
                {draft.alcance && <div className="cc-modal-stat"><span className="text-txt-dim">Alcance</span><span>{draft.alcance}</span></div>}
                {draft.cooldown && <div className="cc-modal-stat"><span className="text-txt-dim">Recarga</span><span>{draft.cooldown}</span></div>}
              </div>
              {chips.length > 0 && (
                <div className="mt-3">
                  <div className="text-[10px] text-gold/70 mb-1.5 uppercase tracking-wider">Tags</div>
                  <div className="flex flex-wrap gap-1.5">
                    {chips.map((chip, i) => (
                      <span key={i} className="cc-tag-chip cc-tag-chip--lg">{chip.label}{chip.value ? ` ${chip.value}` : ''}</span>
                    ))}
                  </div>
                </div>
              )}
              {delta && delta.tagBonuses.length > 0 && (
                <div className="mt-3 pt-3 border-t border-sep/50">
                  <div className="text-[10px] text-gold/70 mb-1.5 uppercase tracking-wider">Bônus de Evolução (PEH {evoNivel})</div>
                  <div className="flex flex-wrap gap-1.5">
                    {delta.tagBonuses.map((b, i) => (
                      <span key={i} className="cc-evo-bonus">{b.label} {b.value}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function AttributesRadar({ attrValues }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return
    if (chartRef.current) chartRef.current.destroy()

    const ctx = canvasRef.current.getContext('2d')
    chartRef.current = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['FOR', 'DES', 'CON', 'INT', 'APA', 'AM'],
        datasets: [{
          data: ['FOR', 'DES', 'CON', 'INT', 'APA', 'AM'].map(a => attrValues[a] || 0),
          backgroundColor: 'rgba(247,189,72,0.15)',
          borderColor: '#f7bd48',
          borderWidth: 2,
          pointBackgroundColor: '#f7bd48',
          pointBorderColor: '#06070c',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          r: {
            beginAtZero: true,
            max: 50,
            ticks: { display: false, stepSize: 10 },
            grid: { color: 'rgba(255,255,255,0.06)' },
            angleLines: { color: 'rgba(255,255,255,0.06)' },
            pointLabels: {
              color: '#a8a29e',
              font: { family: 'JetBrains Mono', size: 12, weight: 600 },
            },
          },
        },
      },
    })

    return () => { if (chartRef.current) chartRef.current.destroy() }
  }, [attrValues])

  return <canvas ref={canvasRef} />
}

const SIDEBAR_ITEMS = [
  { key: 'personagem', label: 'Personagem', icon: 'person' },
  { key: 'raca', label: 'Raça', icon: 'account_tree' },
  { key: 'conhecimentos', label: 'Conhecimentos', icon: 'auto_stories' },
  { key: 'inventario', label: 'Inventário', icon: 'inventory_2' },
]

const KNOWLEDGE_TYPES = [
  { key: 'alchemyRituals', field: 'alchemyRituals', label: 'Alquimia', icon: 'science', color: '#34d399', accent: 'emerald' },
  { key: 'spells', field: 'spells', label: 'Feitiçaria', icon: 'auto_fix_high', color: '#60a5fa', accent: 'sky' },
  { key: 'runes', field: 'runes', label: 'Runas', icon: 'token', color: '#c084fc', accent: 'purple' },
  { key: 'magics', field: 'magics', label: 'Magia', icon: 'whatshot', color: '#f7bd48', accent: 'amber' },
]

function KnowledgeBookshelf({ char }) {
  const [expanded, setExpanded] = useState(null)

  const sections = KNOWLEDGE_TYPES.map(kt => {
    const items = char[kt.field] || []
    return { ...kt, items, count: items.length }
  }).filter(s => s.count > 0)

  if (sections.length === 0) {
    return (
      <div className="glass-panel" data-gsap style={{ padding: '48px 28px', textAlign: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 56, color: 'rgba(255,255,255,0.1)' }}>menu_book</span>
        <p className="text-txt-dim text-sm mt-4">Nenhum conhecimento místico desbloqueado ainda.</p>
        <p className="text-txt-dim/50 text-xs mt-1">Adquira Soft-Skills como "Estudos de Alquimia" para desbloquear disciplinas.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sections.map(section => {
        const isOpen = expanded === section.key
        return (
          <div key={section.key} className="glass-panel cc-knowledge-shelf" data-gsap style={{ overflow: 'visible' }}>
            <button
              className="cc-knowledge-shelf-header"
              onClick={() => setExpanded(isOpen ? null : section.key)}
              style={{ '--kn-color': section.color }}
            >
              <span className="material-symbols-outlined cc-knowledge-shelf-icon" style={{ color: section.color }}>
                {isOpen ? 'expand_less' : 'menu_book'}
              </span>
              <div className="cc-knowledge-shelf-info">
                <span className="cc-knowledge-shelf-label font-cinzel" style={{ color: section.color }}>{section.label}</span>
                <span className="cc-knowledge-shelf-count">{section.count} {section.count === 1 ? 'item' : 'itens'}</span>
              </div>
              <div className="cc-knowledge-shelf-books">
                {section.items.slice(0, 8).map((item, i) => (
                  <div
                    key={i}
                    className="cc-knowledge-book-spine"
                    style={{
                      '--book-color': section.color,
                      height: `${28 + (item.circle || 1) * 6}px`,
                      animationDelay: `${i * 0.08}s`,
                    }}
                    title={item.name || item.nome}
                  >
                    <span className="cc-knowledge-book-text">{item.name || item.nome || '?'}</span>
                  </div>
                ))}
                {section.count > 8 && (
                  <div className="cc-knowledge-book-spine cc-knowledge-book-more" style={{ '--book-color': section.color }}>
                    <span>+{section.count - 8}</span>
                  </div>
                )}
              </div>
            </button>
            {isOpen && (
              <div className="cc-knowledge-shelf-content">
                {section.items.map((item, i) => (
                  <div key={i} className="cc-knowledge-item">
                    <div className="cc-knowledge-item-header">
                      <span className="material-symbols-outlined cc-knowledge-item-circle" style={{ color: section.color }}>
                        {CIRCLE_ICON[item.circle] || 'brightness_1'}
                      </span>
                      <span className="cc-knowledge-item-name">{item.name || item.nome || '—'}</span>
                      {item.circle && <span className="cc-knowledge-item-circle-label">{item.circle}º Círculo</span>}
                      {item.pe && <span className="cc-knowledge-item-pe">{item.pe} PE</span>}
                    </div>
                    <p className="cc-knowledge-item-desc">{item.effect || item.descricao || item.short_description || '—'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const CIRCLE_ICON = { 1: 'looks_one', 2: 'looks_two', 3: 'looks_3', 4: 'looks_4' }

export default function CharacterCenter({ char, update, updateHabilidade, onShowSheet, onShowBoard, onShowRaceTree, onLevelUp, onRaceEvolve, characterId, canEdit, onTransferItem }) {
  const containerRef = useRef(null)
  const [activeTab, setActiveTab] = useState('personagem')
  const [abilityModal, setAbilityModal] = useState(null)
  const stats = useMemo(() => computeStats(char), [char])
  const tier = getTierInfo(stats.nivel)
  const raceProfile = getRaceProfile(char.raca)
  const classDef = CLASSES[stats.classe]
  const className = classDef?.name || stats.classe || '—'

  const triages = stats.classe ? getAllTriagesForClass(stats.classe) : {}
  const triagemPrincipal = triages[char.triagemPrincipal]
  const subTriagem = triages[char.subTriagem]

  useEffect(() => {
    if (!containerRef.current) return
    const els = containerRef.current.querySelectorAll('[data-gsap]')
    gsap.fromTo(els,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.05, ease: 'power2.out' }
    )
  }, [char, activeTab])

  const habilidades = char.habilidades || []
  const modulos = char.modulosAdquiridos || []
  const pericias = Object.entries(char.pericias || {}).filter(([, v]) => v > 0)

  const currentVida = char.vidaAtual ?? stats.vidaTotal
  const currentEnergia = char.energiaAtual ?? stats.energiaTotal
  const currentPe = char.peAtual ?? stats.peTotal

  const allModuleMap = useMemo(() => {
    const m = {}
    ;[...MODULES_PASSIVE, ...MODULES_ACTIVE].forEach(mod => { m[mod.id] = mod })
    return m
  }, [])

  const racialAbilities = useMemo(() => {
    const tree = getRaceTree(char.raca)
    if (!tree) return []
    const unlocked = char.raceTreeUnlocked || []
    return tree.nodes
      .filter(n => unlocked.includes(n.id))
      .flatMap(n => (n.effects || []).filter(e => e.type === 'habilidade'))
  }, [char.raca, char.raceTreeUnlocked])

  return (
    <div ref={containerRef} className="character-center">
      <ParticleBackdrop />

      <div className="cc-layout">
        {/* SIDEBAR */}
        <aside className="cc-sidebar">
          <div className="cc-sidebar-header">
            <div className="cc-sidebar-avatar" style={{ borderColor: tier.color, boxShadow: `inset 0 0 20px ${tier.glow}` }}>
              {char.avatar ? (
                <img src={char.avatar} alt={char.nome} className="cc-sidebar-avatar-img" />
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: tier.color }}>person</span>
              )}
            </div>
            <div className="cc-sidebar-name font-cinzel">{char.nome || 'Sem Nome'}</div>
            <div className="cc-sidebar-tier" style={{ color: tier.color }}>{tier.name} · Nv {stats.nivel}</div>
          </div>

          <nav className="cc-sidebar-nav">
            {SIDEBAR_ITEMS.map(item => (
              <button
                key={item.key}
                className={`cc-sidebar-btn ${activeTab === item.key ? 'cc-sidebar-btn--active' : ''}`}
                onClick={() => setActiveTab(item.key)}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="cc-sidebar-btn-label">{item.label}</span>
                {item.key === 'conhecimentos' && racialAbilities.length === 0 && (char.spells?.length || char.runes?.length || char.magics?.length || char.alchemyRituals?.length) > 0 && (
                  <span className="cc-sidebar-badge" />
                )}
              </button>
            ))}
          </nav>

          <div className="cc-sidebar-actions">
            <button onClick={onShowSheet} className="cc-sidebar-action">
              <span className="material-symbols-outlined">history</span> Modelo Legado
            </button>
            <button onClick={onShowBoard} className="cc-sidebar-action">
              <span className="material-symbols-outlined">dashboard</span> Quadro
            </button>
            {stats.nivel < 50 && (
              <button onClick={onLevelUp} className="cc-sidebar-action cc-sidebar-action--accent">
                <span className="material-symbols-outlined">arrow_upward</span> Subir Nível
              </button>
            )}
            <button onClick={onRaceEvolve} className="cc-sidebar-action cc-sidebar-action--purple">
              <span className="material-symbols-outlined">auto_awesome</span> Evoluir Raça
            </button>
          </div>
        </aside>

        {/* CONTENT */}
        <div className="cc-content">
          {activeTab === 'personagem' && (
            <div className="cc-container">
              {/* HERO SECTION */}
              <div className="cc-hero">
                <div className="cc-hero-avatar glass-panel" data-gsap>
                  <div className="cc-avatar-frame" style={{ borderColor: tier.color, boxShadow: `inset 0 0 40px ${tier.glow}` }}>
                    {char.avatar ? (
                      <img src={char.avatar} alt={char.nome} className="cc-avatar-img" />
                    ) : (
                      <div className="cc-avatar-placeholder">
                        <span className="material-symbols-outlined" style={{ fontSize: 64, color: tier.color }}>person</span>
                      </div>
                    )}
                    <div className="cc-level-badge" style={{ borderColor: tier.color, background: tier.glow }}>
                      <span className="font-cinzel font-bold text-lg" style={{ color: tier.color }}>{stats.nivel}</span>
                    </div>
                  </div>
                </div>

                <div className="cc-hero-info glass-panel" data-gsap>
                  <h1 className="cc-char-name font-cinzel">{char.nome || 'Sem Nome'}</h1>
                  <div className="cc-char-subtitle" style={{ color: 'var(--gold)' }}>
                    {className.toUpperCase()} · {stats.raceLabel.toUpperCase()}
                    {stats.subrace ? ` (${stats.subrace.name})` : ''} · {tier.name.toUpperCase()}
                  </div>
                  <div className="cc-secondary-info">
                    {char.idade && <div><span className="material-symbols-outlined">cake</span> {char.idade} anos</div>}
                    {char.altura && <div><span className="material-symbols-outlined">height</span> {char.altura}</div>}
                    {char.peso && <div><span className="material-symbols-outlined">monitor_weight</span> {char.peso}</div>}
                    {char.origem && <div><span className="material-symbols-outlined">location_on</span> {char.origem}</div>}
                  </div>

                  <div className="cc-triagem-row">
                    {triagemPrincipal && (
                      <div className="cc-triagem-badge">
                        <span className="material-symbols-outlined text-sm">military_tech</span>
                        {triagemPrincipal.name} {char.triagemPrincipalNivel}
                      </div>
                    )}
                    {subTriagem && (
                      <div className="cc-triagem-badge cc-triagem-badge--sub">
                        <span className="material-symbols-outlined text-sm">stars</span>
                        {subTriagem.name} {char.subTriagemNivel}
                      </div>
                    )}
                  </div>

                  {stats.weapon && (
                    <div className="cc-weapon-info">
                      <span className="material-symbols-outlined text-gold text-sm">gavel</span>
                      <span className="text-sm text-txt-main">{char.armaNome || stats.weapon.name}</span>
                      <span className="cc-rank-badge" style={{ color: RANK_COLORS[stats.weaponRank] || '#aaa' }}>{stats.weaponRank}</span>
                    </div>
                  )}
                </div>

                <div className="cc-hero-power glass-panel" data-gsap>
                  <div className="cc-power-label">PODER GERAL</div>
                  <div className="cc-power-score font-cinzel" style={{ color: tier.color, textShadow: `0 0 30px ${tier.glow}` }}>
                    {stats.powerScore.toLocaleString()}
                  </div>
                  <div className="cc-power-tier" style={{ color: tier.color }}>{tier.name}</div>
                </div>
              </div>

              {/* RESOURCES */}
              <div className="cc-resources-row">
                <ResourceOrb label="VIDA" current={currentVida} max={stats.vidaTotal} type="vida" />
                <ResourceOrb label="ENERGIA" current={currentEnergia} max={stats.energiaTotal} type="energia" />
                <ResourceOrb label="PE" current={currentPe} max={stats.peTotal} type="pe" />
              </div>

              {/* COMBAT STATS */}
              <div className="cc-combat-row">
                <CombatStat label="CLASSE DE ARMADURA" value={stats.ca} icon="shield" />
                <CombatStat label="REAÇÕES" value={stats.reacoes} icon="swap_horiz" accent="#4aa3ff" />
                <CombatStat label="DANO BASE" value={stats.danoBase} icon="casino" accent="#f87171" />
                <CombatStat label="PERCEPÇÃO" value={stats.percepcao} icon="visibility" accent="#c084fc" />
                <CombatStat label="CARGA" value={`${stats.carriedLoad}/${stats.carryCap}kg`} icon="weight" accent="#34d399" />
              </div>

              {/* ATTRIBUTES + PERICIAS */}
              <div className="cc-attrs-skills-grid">
                <div className="glass-panel cc-attrs-panel" data-gsap>
                  <h2 className="cc-section-title">
                    <span className="material-symbols-outlined">radar</span> ATRIBUTOS
                  </h2>
                  <div style={{ height: 280, padding: '8px' }}>
                    <AttributesRadar attrValues={stats.attrValues} />
                  </div>
                  <div className="cc-attr-grid">
                    {['FOR', 'DES', 'CON', 'INT', 'APA', 'AM'].map(attr => (
                      <div key={attr} className="cc-attr-chip">
                        <span className="material-symbols-outlined text-sm" style={{ color: 'var(--gold)' }}>{ATTR_ICONS[attr]}</span>
                        <span className="font-mono text-sm font-bold text-txt-main">{stats.attrValues[attr]}</span>
                        <span className="cc-attr-mod">Mod {stats.modValues[attr] >= 0 ? '+' : ''}{stats.modValues[attr]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-panel cc-pericias-panel" data-gsap>
                  <h2 className="cc-section-title">
                    <span className="material-symbols-outlined">school</span> PERÍCIAS
                  </h2>
                  {pericias.length > 0 ? (
                    <div className="cc-pericias-list">
                      {pericias.map(([nome, grau]) => {
                        const bonus = getGrauBonus(grau)
                        const maxBonus = 20
                        const percent = Math.min(100, (bonus / maxBonus) * 100)
                        return (
                          <div key={nome} className="cc-pericia-item">
                            <div className="cc-pericia-header">
                              <span className="cc-pericia-name">{nome}</span>
                              <span className="cc-pericia-grau" style={{ color: 'var(--gold)' }}>
                                {GRAU_NAMES[grau] || `Grau ${grau}`} · +{bonus}
                              </span>
                            </div>
                            <div className="cc-bar">
                              <span style={{ width: `${percent}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-txt-dim text-sm">Nenhuma perícia treinada.</p>
                  )}
                </div>
              </div>

              {/* RACIAL ABILITIES */}
              {racialAbilities.length > 0 && (
                <div className="glass-panel cc-abilities-panel" data-gsap>
                  <h2 className="cc-section-title">
                    <span className="material-symbols-outlined">spa</span> HABILIDADES RACIAIS
                  </h2>
                  <div className="cc-abilities-grid cc-abilities-grid--racial">
                    {racialAbilities.map((hab, i) => (
                      <div key={i} className="cc-ability-card cc-ability-card--racial glass-panel"
                        data-gsap
                        style={{ borderColor: '1px solid rgba(52,211,153,0.3)', boxShadow: '0 0 24px rgba(52,211,153,0.1)' }}
                        onClick={() => setAbilityModal({ habilidade: hab, index: null })}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="material-symbols-outlined text-lg" style={{ color: '#34d399', fontVariationSettings: "'FILL' 1" }}>spa</span>
                          <span className="cc-ability-type" style={{ color: '#34d399' }}>RACIAL</span>
                        </div>
                        <h4 className="cc-ability-name font-cinzel">{hab.nome}</h4>
                        {hab.custoEnergia && <div className="cc-ability-cost">{hab.custoEnergia}</div>}
                        <p className="text-xs text-txt-dim mt-2 leading-relaxed line-clamp-2">{hab.descricao}</p>
                        <div className="cc-ability-hint">Clique para detalhes</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ABILITIES */}
              <div className="glass-panel cc-abilities-panel" data-gsap>
                <h2 className="cc-section-title">
                  <span className="material-symbols-outlined">auto_awesome</span> HABILIDADES
                </h2>
                <div className="cc-abilities-grid">
                  {habilidades.map((hab, i) => (
                    <AbilityCard key={i} habilidade={hab} index={i} onExpand={setAbilityModal} />
                  ))}
                  {habilidades.length === 0 && (
                    <p className="text-txt-dim text-sm col-span-full">Nenhuma habilidade definida.</p>
                  )}
                </div>
              </div>

              {/* SOFT-SKILLS with hover tooltips */}
              {modulos.length > 0 && (
                <div className="glass-panel cc-modules-panel" data-gsap>
                  <h2 className="cc-section-title">
                    <span className="material-symbols-outlined">extension</span> SOFT-SKILLS
                  </h2>
                  <div className="cc-modules-grid">
                    {modulos.map((mod, i) => {
                      const def = allModuleMap[mod.id]
                      const isActive = def?.pe != null
                      const descText = def?.desc || mod.desc || ''
                      return (
                        <div
                          key={i}
                          className={`cc-module-chip ${isActive ? 'cc-module-chip--active' : ''} cc-module-tooltip-trigger`}
                        >
                          <span className="material-symbols-outlined text-sm">
                            {isActive ? 'flash_on' : 'shield'}
                          </span>
                          <span className="cc-module-name">{mod.name || def?.name || mod.id}</span>
                          {(mod.boughtCount || 1) > 1 && (
                            <span className="cc-module-count">x{mod.boughtCount}</span>
                          )}
                          {isActive && def?.pe && <span className="cc-module-pe">{def.pe}PE</span>}
                          {descText && (
                            <div className="cc-module-tooltip">
                              <p>{descText}</p>
                              {def?.req && <span className="cc-module-tooltip-req">Requisito: {def.req}</span>}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'raca' && (
            <div className="cc-container">
              {/* Race info header */}
              <div className="glass-panel cc-race-header" data-gsap>
                <h2 className="cc-section-title">
                  <span className="material-symbols-outlined">account_tree</span> HERANÇA RACIAL
                </h2>
                <div className="cc-race-info">
                  <h3 className="font-cinzel text-xl text-gold">{stats.raceLabel}{stats.subrace ? ` — ${stats.subrace.name}` : ''}</h3>
                  <div className="cc-par-display">
                    <span className="text-txt-dim text-sm">Pontos de Ancestralidade (PAR):</span>
                    <span className="font-mono text-gold">{stats.parTotal - stats.parSpent}</span>
                    <span className="text-txt-dim text-xs">disponíveis</span>
                    <span className="text-txt-dim/50 text-xs">({stats.parSpent}/{stats.parTotal} usados)</span>
                  </div>
                </div>
              </div>

              {/* Racial Powers */}
              {raceProfile && raceProfile.poderesBase?.length > 0 && (
                <div className="glass-panel cc-racial-panel" data-gsap>
                  <h3 className="cc-section-title cc-section-title--sm">
                    <span className="material-symbols-outlined text-success">add_circle</span> PODERES RACIAIS
                  </h3>
                  {raceProfile.poderesBase.map((p, i) => (
                    <div key={i} className="cc-racial-item cc-racial-item--power">
                      <span className="cc-racial-name">{p.nome}</span>
                      <span className="cc-racial-desc">{p.desc}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Weaknesses */}
              {raceProfile && raceProfile.fraquezas?.length > 0 && (
                <div className="glass-panel cc-racial-panel" data-gsap>
                  <h3 className="cc-section-title cc-section-title--sm">
                    <span className="material-symbols-outlined text-err">remove_circle</span> FRAQUEZAS
                  </h3>
                  {raceProfile.fraquezas.map((f, i) => (
                    <div key={i} className="cc-racial-item cc-racial-item--weak">
                      <span className="cc-racial-name">{f.nome}</span>
                      <span className="cc-racial-desc">{f.desc}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Race tree */}
              <div className="cc-race-tree-container" data-gsap>
                <SkillTreeView char={char} update={update} />
              </div>
            </div>
          )}

          {activeTab === 'conhecimentos' && (
            <div className="cc-container">
              <div className="glass-panel cc-knowledge-header" data-gsap style={{ padding: '20px 28px' }}>
                <h2 className="cc-section-title">
                  <span className="material-symbols-outlined">auto_stories</span> GRIMÓRIOS & CONHECIMENTOS
                </h2>
                <p className="text-txt-dim text-sm mt-1">Disciplinas místicas, rituais e magias dominadas pelo personagem.</p>
              </div>

              <KnowledgeBookshelf char={char} />
            </div>
          )}

          {activeTab === 'inventario' && (
            <div className="cc-container cc-inventory-tab">
              <ResidentInventorySection
                char={char}
                characterId={characterId}
                canEdit={canEdit}
                update={update}
                onTransferItem={onTransferItem}
                maxCarry={stats.carryCap}
                totalCarryWeight={stats.carriedLoad}
              />
            </div>
          )}
        </div>
      </div>

      {abilityModal && (
        <AbilityDetailModal
          habilidade={abilityModal.habilidade}
          index={abilityModal.index}
          onClose={() => setAbilityModal(null)}
          onEdit={updateHabilidade}
          char={char}
        />
      )}
    </div>
  )
}
