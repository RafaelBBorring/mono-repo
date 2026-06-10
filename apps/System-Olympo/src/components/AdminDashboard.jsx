import { useState, useEffect, useRef, useMemo } from 'react'
import { getSupabaseAdmin } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import * as THREE from 'three'
import { WEAPONS, WEAPON_RANKS, WEAPON_ABILITY_COST, LEGENDARY_WEAPONS, WEAPON_POWER_LEVELS } from '../data/weapons'
import { RANK_COLORS } from '../data/colors'
import { MARTIAL_ARTS, GRAU_LABELS } from '../data/martialArts'
import { PERICIAS, GRAU_NAMES } from '../data/pericias'
import { TRIAGES } from '../data/triages'
import { ALL_MODULES } from '../data/modules'
import { fetchMysticWeapons } from '../services/alchemyService'
import AlchemyAdminPanel from './AlchemyAdminPanel'
import SpellAdminPanel from './SpellAdminPanel'
import RuneAdminPanel from './RuneAdminPanel'
import MagicAdminPanel from './MagicAdminPanel'
import MysticWeaponAdminPanel from './MysticWeaponAdminPanel'
import GrimoireAdminPage from './GrimoireAdminPage'
import { SYSTEM_SKILLS, SYSTEM_SKILL_CATEGORIES, getSystemSkillById, EFFECT_PARAM_DEFS } from '../data/systemSkills'
import { createSystemSkillAssignment, createSystemSkillNotification, createDefaultEffectsForSkill, summarizeSystemSkillBonuses } from '../utils/systemSkills'

const STATUS_COLORS_ADMIN = { Pendente: 'text-warn', Aprovada: 'text-ok', 'Revisão necessária': 'text-err' }
const STATUS_OPTIONS = ['Pendente', 'Aprovada', 'Revisão necessária']

const CLASSES = [
  { id: 'Guerreiro', label: 'Guerreiro' },
  { id: 'Operativo', label: 'Operativo' },
  { id: 'Místico', label: 'Místico' },
]

const RACAS = ['Humano', 'Elfo', 'Anão', 'Halfling', 'Gnomo', 'Meio-Orc', 'Meio-Elfo', 'Tiefling', 'Draconato', 'Outro']

function getAllTriagemOptions() {
  const opts = []
  for (const [classKey, classTriages] of Object.entries(TRIAGES)) {
    for (const [triKey, tri] of Object.entries(classTriages)) {
      opts.push({ id: triKey, name: tri.name, classKey })
    }
  }
  return opts
}

function findTriagem(key) {
  if (!key) return null
  for (const classTriages of Object.values(TRIAGES)) {
    if (classTriages[key]) return classTriages[key]
  }
  return null
}

function AdminBackdrop() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100)
    camera.position.z = 7

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))

    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xc9a84c, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false })
    const blueMaterial = new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false })
    const runeGroup = new THREE.Group()
    scene.add(runeGroup)

    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.008, 8, 160), ringMaterial)
    const inner = new THREE.Mesh(new THREE.TorusKnotGeometry(1.45, 0.005, 160, 8, 2, 5), blueMaterial)
    runeGroup.add(ring, inner)

    const glyphMaterial = new THREE.MeshBasicMaterial({ color: 0xe8c97e, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false })
    const glyphGeometry = new THREE.IcosahedronGeometry(0.028, 0)
    const glyphs = []
    for (let i = 0; i < 28; i++) {
      const glyph = new THREE.Mesh(glyphGeometry, glyphMaterial)
      const angle = (i / 28) * Math.PI * 2
      glyph.position.set(Math.cos(angle) * 2.85, Math.sin(angle) * 2.85, (i % 3) * 0.08)
      runeGroup.add(glyph)
      glyphs.push(glyph)
    }

    const mistMaterial = new THREE.PointsMaterial({ color: 0x9ee7ff, size: 0.015, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false })
    const mistGeometry = new THREE.BufferGeometry()
    const mistPositions = new Float32Array(180 * 3)
    for (let i = 0; i < 180; i++) {
      mistPositions[i * 3] = (Math.random() - 0.5) * 14
      mistPositions[i * 3 + 1] = (Math.random() - 0.5) * 10
      mistPositions[i * 3 + 2] = -1 - Math.random() * 4
    }
    mistGeometry.setAttribute('position', new THREE.BufferAttribute(mistPositions, 3))
    const mist = new THREE.Points(mistGeometry, mistMaterial)
    scene.add(mist)

    let frameId = 0
    const clock = new THREE.Clock()

    function resize() {
      const parent = canvas.parentElement
      const w = parent?.clientWidth || 900
      const h = parent?.clientHeight || 400
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
    }

    function animate() {
      const t = clock.getElapsedTime()
      runeGroup.rotation.z = t * 0.03
      inner.rotation.x = Math.sin(t * 0.2) * 0.16
      inner.rotation.y = t * -0.04
      ring.scale.setScalar(1 + Math.sin(t * 0.5) * 0.02)
      glyphs.forEach((g, i) => { g.scale.setScalar(1 + Math.sin(t * 1.2 + i) * 0.4) })
      mist.rotation.z = t * -0.006
      mist.rotation.y = Math.sin(t * 0.07) * 0.05
      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }

    resize()
    animate()
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(frameId); window.removeEventListener('resize', resize); renderer.dispose(); glyphGeometry.dispose(); mistGeometry.dispose(); ringMaterial.dispose(); blueMaterial.dispose(); glyphMaterial.dispose(); mistMaterial.dispose() }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-hidden="true" />
}

export default function AdminDashboard({ initialTab = 'menu', onViewSheet }) {
  const { profile } = useAuth()
  const [tab, setTab] = useState(initialTab === 'menu' ? 'menu' : initialTab)
  const [sheets, setSheets] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [forgeWeapons, setForgeWeapons] = useState([])
  const [expandedSheet, setExpandedSheet] = useState(null)
  const [editingSheet, setEditingSheet] = useState(null)

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    fetchMysticWeapons().then(res => {
      setForgeWeapons(res.data || [])
    })
  }, [])

  useEffect(() => {
    setTab(initialTab)
  }, [initialTab])

  async function loadData() {
    setLoading(true)
    try {
      const [sheetsRes, profilesRes] = await Promise.all([
        getSupabaseAdmin().from('characters').select('*').order('updated_at', { ascending: false }),
        getSupabaseAdmin().from('profiles').select('*'),
      ])
      setSheets(sheetsRes.data || [])
      setUsers(profilesRes.data || [])
    } catch (err) {
      console.error('AdminDashboard loadData error:', err)
      setSheets([])
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  function getUserName(uid) {
    const u = users.find(p => p.id === uid)
    return u?.display_name || uid?.slice(0, 8) || '?'
  }

  function countOpenSkillNotifications(data) {
    return (data?.systemSkillNotifications || []).filter(n => n.status !== 'closed').length
  }

  async function handleDeleteSheet(id) {
    if (!confirm('Excluir este personagem permanentemente?')) return
    await getSupabaseAdmin().from('characters').delete().eq('id', id)
    setSheets(prev => prev.filter(s => s.id !== id))
    if (expandedSheet === id) setExpandedSheet(null)
  }

  async function handleSaveSheet(sheet) {
    if (!sheet?.id) {
      alert('Erro: ID da ficha não encontrado.')
      return
    }
    const payload = {
      name: sheet.data?.nome || sheet.name || 'Sem Nome',
      data: sheet.data,
      updated_at: new Date().toISOString(),
    }
    const { data: updated, error } = await getSupabaseAdmin()
      .from('characters')
      .update(payload)
      .eq('id', sheet.id)
      .select()
      .single()
    if (error) {
      alert('Erro ao salvar: ' + error.message)
      return
    }
    setSheets(prev => prev.map(s => s.id === sheet.id ? (updated || sheet) : s))
    setEditingSheet(null)
  }

  async function handlePatch(sheet, patch) {
    const nextData = { ...(sheet.data || {}), ...patch }
    const payload = {
      name: nextData.nome || sheet.name || 'Sem Nome',
      data: nextData,
      updated_at: new Date().toISOString(),
    }
    const { data: updated, error } = await getSupabaseAdmin()
      .from('characters')
      .update(payload)
      .eq('id', sheet.id)
      .select()
      .single()
    if (error) {
      alert('Erro ao atualizar: ' + error.message)
      return
    }
    setSheets(prev => prev.map(s => s.id === sheet.id ? (updated || sheet) : s))
  }

  async function handleAssignLegendary(sheet, legendaryId) {
    const lw = LEGENDARY_WEAPONS.find(l => l.id === legendaryId)
    const fw = !lw ? forgeWeapons.find(w => w.id === legendaryId) : null
    if (!lw && !fw) return
    const existing = sheet.data?.armasLendarias || []
    if (existing.some(l => l.id === legendaryId)) {
      alert('Esta arma lendária já está atribuída a este personagem.')
      return
    }
    const entry = lw
      ? { id: lw.id, name: lw.name, rank: lw.rank, tipo: lw.tipo }
      : { id: fw.id, name: fw.name, rank: 'Lendária', tipo: fw.range || fw.law_name || 'Forja Lendária', source: 'forge', sourceId: fw.id }
    await handlePatch(sheet, { armasLendarias: [...existing, entry] })
  }

  if (loading) return <p className="text-txt-dim p-8 animate-pulse">Carregando painel admin...</p>

  if (tab === 'menu') {
    return (
      <div className="space-y-6">
        <div className="relative min-h-[320px] rounded-2xl overflow-hidden border border-gold/20 shadow-2xl shadow-black/40">
          <AdminBackdrop />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-void/90 pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center justify-center h-full min-h-[320px] text-center px-6 py-8">
            <span className="material-symbols-outlined text-primary text-5xl mb-4" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>admin_panel_settings</span>
            <h1 className="font-cinzel text-primary text-3xl tracking-[0.2em] mb-2">Mesa do Mestre</h1>
            <p className="text-txt-dim/60 text-sm max-w-md">Painel de controle do mestre. Gerencie heróis, rituais, NPCs e a sessão da campanha.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { key: 'sheets', icon: 'groups', label: 'Heróis', desc: `${sheets.length} fichas registradas`, accent: 'from-amber-400/15 to-amber-600/5', border: 'border-amber-400/20', iconColor: 'text-amber-400' },
            { key: 'skills', icon: 'auto_awesome', label: 'Skills', desc: 'Notificações e catálogo', accent: 'from-sky-400/15 to-sky-600/5', border: 'border-sky-400/20', iconColor: 'text-sky-400' },
            { key: 'grimoire', icon: 'auto_stories', label: 'Grimório', desc: 'Rituais e grimórios', accent: 'from-purple-400/15 to-purple-600/5', border: 'border-purple-400/20', iconColor: 'text-purple-400' },
            { key: 'mysticWeapons', icon: 'shield', label: 'Forja Lendária', desc: `${forgeWeapons.length} armas`, accent: 'from-lime-400/15 to-lime-600/5', border: 'border-lime-400/20', iconColor: 'text-lime-400' },
            { key: 'codex', icon: 'person_add', label: 'Codex Arcanum', desc: 'Sistema de NPCs', accent: 'from-cyan-400/15 to-cyan-600/5', border: 'border-cyan-400/20', iconColor: 'text-cyan-400', external: true },
            { key: 'board', icon: 'dashboard', label: 'Quadro de Sessão', desc: 'Mesa virtual interativa', accent: 'from-rose-400/15 to-rose-600/5', border: 'border-rose-400/20', iconColor: 'text-rose-400', external: true },
            { key: 'users', icon: 'manage_accounts', label: 'Usuários', desc: `${users.length} cadastrados`, accent: 'from-teal-400/15 to-teal-600/5', border: 'border-teal-400/20', iconColor: 'text-teal-400' },
          ].map(item => (
            <button key={item.key} onClick={() => {
              if (item.key === 'codex') { window.location.hash = '#/codex'; return }
              if (item.key === 'board') { window.location.hash = '#/board'; return }
              setTab(item.key)
            }}
              className={`group relative bg-gradient-to-br ${item.accent} ${item.border} border rounded-xl p-5 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20`}>
              <span className={`material-symbols-outlined text-3xl ${item.iconColor} mb-3 block transition-transform duration-300 group-hover:scale-110`} style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>{item.icon}</span>
              <h3 className="font-cinzel text-txt-main text-base tracking-wider mb-1">{item.label}</h3>
              <p className="text-txt-dim/50 text-xs">{item.desc}</p>
              {item.external && (
                <span className="material-symbols-outlined absolute top-3 right-3 text-outline/30 text-sm">open_in_new</span>
              )}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="relative rounded-2xl overflow-hidden border border-gold/20 shadow-xl shadow-black/30">
        <AdminBackdrop />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-void/90 pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between p-4">
          <button onClick={() => setTab('menu')}
            className="text-gold text-sm hover:text-gold-light transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Mesa do Mestre
          </button>
          <div className="flex flex-wrap justify-end gap-1">
            {[
              { key: 'sheets', label: `Heróis (${sheets.length})` },
              { key: 'skills', label: `Skills${sheets.reduce((sum, s) => sum + countOpenSkillNotifications(s.data), 0) ? ` (${sheets.reduce((sum, s) => sum + countOpenSkillNotifications(s.data), 0)})` : ''}` },
              { key: 'grimoire', label: 'Grimório' },
              { key: 'mysticWeapons', label: 'Forja Lendária' },
              { key: 'users', label: 'Usuários' },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${tab === t.key ? 'bg-primary text-on-primary font-semibold' : 'text-on-surface-variant hover:text-on-surface'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tab === 'skills' && (
        <AdminSkillsPanel
          sheets={sheets}
          getUserName={getUserName}
          onPatch={handlePatch}
          onViewSheet={onViewSheet}
        />
      )}

      {tab === 'users' && (
        <AdminUsersPanel users={users} sheets={sheets} />
      )}

      {tab === 'grimoire' && <GrimoireAdminPage />}
      {tab === 'alchemy' && <AlchemyAdminPanel />}
      {tab === 'spells' && <SpellAdminPanel />}
      {tab === 'runes' && <RuneAdminPanel />}
      {tab === 'magic' && <MagicAdminPanel />}
      {tab === 'mysticWeapons' && <MysticWeaponAdminPanel />}

      {tab === 'sheets' && (
        editingSheet ? (
          <FullSheetEditor
            sheet={editingSheet}
            onSave={handleSaveSheet}
            onCancel={() => setEditingSheet(null)}
            forgeWeapons={forgeWeapons}
          />
        ) : (
          <AdminSheetsLibrary
            sheets={sheets}
            users={users}
            getUserName={getUserName}
            expandedSheet={expandedSheet}
            setExpandedSheet={setExpandedSheet}
            setEditingSheet={setEditingSheet}
            onDelete={handleDeleteSheet}
            onPatch={handlePatch}
            onViewSheet={onViewSheet}
          />
        )
      )}
    </div>
  )
}

const LIBRARY_CLASS_META = {
  Guerreiro: { bg: 'bg-rose-400/10', text: 'text-rose-400', border: 'border-rose-400/25', accent: '#f87171', glow: 'rgba(248,113,113,0.12)' },
  Operativo: { bg: 'bg-sky-400/10', text: 'text-sky-400', border: 'border-sky-400/25', accent: '#60a5fa', glow: 'rgba(96,165,250,0.12)' },
  'Místico': { bg: 'bg-purple-400/10', text: 'text-purple-400', border: 'border-purple-400/25', accent: '#c084fc', glow: 'rgba(192,132,252,0.12)' },
}

const LIBRARY_TIERS = [
  { min: 1, max: 8, label: 'Novato', color: '#60a5fa', bg: 'bg-sky-400/10', text: 'text-sky-400', border: 'border-sky-400/25' },
  { min: 9, max: 16, label: 'Veterano', color: '#f7bd48', bg: 'bg-amber-400/10', text: 'text-amber-400', border: 'border-amber-400/25' },
  { min: 17, max: 24, label: 'Elite', color: '#c084fc', bg: 'bg-purple-400/10', text: 'text-purple-400', border: 'border-purple-400/25' },
  { min: 25, max: 50, label: 'Lendário', color: '#f87171', bg: 'bg-rose-400/10', text: 'text-rose-400', border: 'border-rose-400/25' },
]

function getLibraryTier(level) {
  return LIBRARY_TIERS.find(t => level >= t.min && level <= t.max) || LIBRARY_TIERS[0]
}

function AdminSheetsLibrary({ sheets, users, getUserName, expandedSheet, setExpandedSheet, setEditingSheet, onDelete, onPatch, onViewSheet }) {
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [sortBy, setSortBy] = useState('updated')

  const filtered = useMemo(() => {
    let result = [...sheets]
    if (search.trim()) {
      const term = search.toLowerCase()
      result = result.filter(s =>
        `${s.name || ''} ${s.data?.nome || ''} ${s.data?.classe || ''} ${s.data?.raca || ''} ${getUserName(s.user_id)}`
          .toLowerCase().includes(term)
      )
    }
    if (classFilter !== 'all') {
      result = result.filter(s => s.data?.classe === classFilter)
    }
    if (sortBy === 'updated') {
      result.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    } else if (sortBy === 'name') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    } else if (sortBy === 'level') {
      result.sort((a, b) => (b.data?.nivel || 1) - (a.data?.nivel || 1))
    }
    return result
  }, [sheets, search, classFilter, sortBy, getUserName])

  const classCounts = useMemo(() => {
    const counts = { all: sheets.length }
    for (const s of sheets) {
      const c = s.data?.classe
      if (c) counts[c] = (counts[c] || 0) + 1
    }
    return counts
  }, [sheets])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-txt-dim/40 text-[10px] uppercase tracking-wider">Arquivo</span>
          <h3 className="font-cinzel text-txt-main text-xl flex items-center gap-3">
            <span className="material-symbols-outlined text-gold text-xl" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>groups</span>
            Heróis Registrados
          </h3>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-txt-dim/40 text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>search</span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar personagem..."
              className="bg-void border border-sep/50 rounded-lg pl-9 pr-4 py-2 text-sm text-txt-main focus:border-gold/40 outline-none w-64 transition-colors" />
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="bg-void border border-sep/50 rounded-lg px-3 py-2 text-sm text-txt-main focus:border-gold/40 outline-none transition-colors">
            <option value="updated">Recentes</option>
            <option value="name">Nome</option>
            <option value="level">Nível</option>
          </select>
          <span className="text-txt-dim/40 text-[10px] font-mono">{filtered.length}/{sheets.length}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: 'all', label: 'Todos', accent: '#f7bd48' },
          { key: 'Guerreiro', label: 'Guerreiro', accent: '#f87171' },
          { key: 'Operativo', label: 'Operativo', accent: '#60a5fa' },
          { key: 'Místico', label: 'Místico', accent: '#c084fc' },
        ].map(c => {
          const isActive = classFilter === c.key
          const classMeta = LIBRARY_CLASS_META[c.key]
          return (
            <button key={c.key} type="button" onClick={() => setClassFilter(c.key)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                isActive
                  ? classMeta
                    ? `${classMeta.bg} ${classMeta.text} ${classMeta.border}`
                    : 'bg-gold/15 text-gold border-gold/30'
                  : 'bg-void/40 text-txt-dim border-sep/30 hover:border-sep/50 hover:text-txt-main'
              }`}
              style={isActive && !classMeta ? { boxShadow: `0 0 16px rgba(247,189,72,0.15)` } : undefined}>
              {c.label}
              <span className="ml-1.5 font-mono text-[10px] opacity-70">{classCounts[c.key] || 0}</span>
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-24 rounded-2xl border border-sep/15 bg-gradient-to-br from-deep/60 to-deep/30">
          <span className="material-symbols-outlined text-6xl text-gold/15 mb-4 block" style={{ fontVariationSettings: "'FILL' 0, 'wght' 200" }}>
            {sheets.length === 0 ? 'explore' : 'search_off'}
          </span>
          <p className="font-cinzel text-lg text-txt-main/70 mb-2">
            {sheets.length === 0 ? 'O arquivo ainda está vazio.' : 'Nenhum herói encontrado.'}
          </p>
          <p className="text-txt-dim/50 text-sm max-w-sm mx-auto">
            {sheets.length === 0 ? 'Quando personagens forem criados, eles aparecerão aqui como cartas no arquivo.' : 'Tente ajustar os filtros ou termo de busca.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((sheet, index) => {
            const level = sheet.data?.nivel || 1
            const tier = getLibraryTier(level)
            const classe = sheet.data?.classe || ''
            const classMeta = LIBRARY_CLASS_META[classe]
            const isExpanded = expandedSheet === sheet.id
            const charName = sheet.name || sheet.data?.nome || 'Sem nome'
            const initial = charName.charAt(0).toUpperCase()

            return (
              <div key={sheet.id} className="relative">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedSheet(isExpanded ? null : sheet.id)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedSheet(isExpanded ? null : sheet.id) }}}
                  className={`group relative w-full rounded-2xl overflow-hidden text-left cursor-pointer transition-all duration-300 focus-visible:outline-2 focus-visible:outline-gold/50 ${isExpanded ? 'border-gold/40 shadow-lg shadow-gold/[0.06]' : 'border-white/[0.06] hover:border-gold/25 hover:shadow-xl hover:shadow-black/30'}`}
                  style={{
                    animation: `cardEntrance 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${index * 60}ms both`,
                    background: 'linear-gradient(145deg, rgba(24,24,27,0.95), rgba(14,14,15,0.92))',
                    backdropFilter: 'blur(12px)',
                    border: isExpanded ? undefined : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="absolute top-0 left-0 right-0 h-[2px] z-10"
                    style={{ background: `linear-gradient(90deg, transparent, ${tier.color}80, transparent)` }} />

                  {classMeta && (
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] z-10 rounded-l-2xl"
                      style={{ background: `linear-gradient(180deg, ${classMeta.accent}, ${classMeta.accent}50)` }} />
                  )}

                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ background: `linear-gradient(145deg, ${classMeta?.glow || 'rgba(247,189,72,0.04)'} 0%, transparent 60%)` }} />

                  <div className="relative w-full aspect-[16/10] overflow-hidden">
                    {sheet.data?.avatar ? (
                      <img src={sheet.data.avatar} alt=""
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"
                        style={{ background: `radial-gradient(circle at center, ${tier.color}12, transparent 70%), rgba(7,8,10,0.95)` }}>
                        <span className="text-5xl font-cinzel transition-colors duration-300 group-hover:opacity-100"
                          style={{ color: tier.color + '25' }}>
                          {initial}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0f] via-[#0e0e0f]/30 to-transparent" />

                    <div className="absolute top-3 right-3 z-10"
                      style={{ animation: 'floatBadge 3s ease-in-out infinite' }}>
                      <div className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-bold ${tier.bg} ${tier.text}`}
                        style={{ borderColor: tier.color + '40', textShadow: `0 0 8px ${tier.color}40` }}>
                        LV {level}
                      </div>
                    </div>

                    <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
                      <span className="text-[9px] font-mono uppercase tracking-widest"
                        style={{ color: tier.color + '90' }}>{tier.label}</span>
                    </div>
                  </div>

                  <div className="relative p-4 space-y-2">
                    <h3 className="font-cinzel text-[15px] text-txt-main truncate group-hover:text-gold transition-colors duration-300">
                      {charName}
                    </h3>
                    <div className="flex items-center gap-2">
                      {classMeta ? (
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-semibold ${classMeta.bg} ${classMeta.text} ${classMeta.border}`}>
                          {classe}
                        </span>
                      ) : classe ? (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full border border-sep/25 bg-sep/10 text-txt-dim font-semibold">{classe}</span>
                      ) : null}
                      <span className="text-txt-dim/50 text-[10px]">•</span>
                      <span className="text-txt-dim/60 text-xs truncate">
                        {sheet.data?.raca || sheet.data?.racaTipo || '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-txt-dim/40 text-[10px] truncate max-w-[60%]">{getUserName(sheet.user_id)}</span>
                      <span className="text-txt-dim/25 text-[10px]">
                        {sheet.updated_at ? new Date(sheet.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : ''}
                      </span>
                    </div>
                  </div>

                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                      style={{
                        background: 'linear-gradient(105deg, transparent 40%, rgba(247,189,72,0.04) 45%, rgba(247,189,72,0.08) 50%, rgba(247,189,72,0.04) 55%, transparent 60%)',
                        animation: 'none',
                      }} />
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-2 rounded-2xl border border-gold/15 overflow-hidden"
                    style={{
                      animation: 'cardEntrance 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
                      background: 'linear-gradient(180deg, rgba(24,24,27,0.95), rgba(14,14,15,0.92))',
                      backdropFilter: 'blur(12px)',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.3), 0 0 24px rgba(247,189,72,0.04)',
                    }}>
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-sep/15 bg-gradient-to-r from-void/40 via-void/20 to-transparent">
                      <span className="text-gold/80 text-xs font-cinzel tracking-wider uppercase">Detalhes do Herói</span>
                      <div className="flex items-center gap-1.5">
                        {onViewSheet && (
                          <button onClick={(e) => { e.stopPropagation(); onViewSheet(sheet.id) }}
                            className="text-[10px] bg-sky-400/10 text-sky-400 px-3 py-1.5 rounded-lg border border-sky-400/20 hover:bg-sky-400/20 transition-colors font-semibold">
                            <span className="material-symbols-outlined text-xs align-middle mr-0.5" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>visibility</span>
                            Ver Ficha
                          </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); setEditingSheet(sheet) }}
                          className="text-[10px] bg-gold/10 text-gold px-3 py-1.5 rounded-lg border border-gold/20 hover:bg-gold/25 transition-colors font-semibold">
                          <span className="material-symbols-outlined text-xs align-middle mr-0.5" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>edit</span>
                          Editar
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(sheet.id) }}
                          className="text-[10px] bg-err/10 text-err px-3 py-1.5 rounded-lg border border-err/20 hover:bg-err/20 transition-colors font-semibold">
                          <span className="material-symbols-outlined text-xs align-middle mr-0.5" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>delete</span>
                          Excluir
                        </button>
                      </div>
                    </div>
                    <div className="p-4 max-h-[420px] overflow-y-auto">
                      <AdminSheetView sheet={sheet} onPatch={(patch) => onPatch(sheet, patch)} />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AdminUsersPanel({ users, sheets }) {
  const [search, setSearch] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = users.filter(u => {
    const term = search.trim().toLowerCase()
    if (!term) return true
    return `${u.display_name || ''} ${u.email || ''} ${u.role || ''}`.toLowerCase().includes(term)
  })

  async function handleRemoveUser(uid) {
    setDeleting(true)
    try {
      await getSupabaseAdmin().from('profiles').delete().eq('id', uid)
      setConfirmDeleteId(null)
    } catch (err) {
      alert('Erro ao remover usuário: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="text-txt-dim/40 text-[10px] uppercase tracking-wider">Gerenciamento</span>
          <h3 className="font-cinzel text-txt-main text-lg">Usuários Cadastrados</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-txt-dim/40 text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>search</span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou email..."
              className="bg-void border border-sep/50 rounded-lg pl-9 pr-4 py-2 text-sm text-txt-main focus:border-gold/40 outline-none w-64 transition-colors" />
          </div>
          <span className="text-txt-dim/40 text-[10px] font-mono">{filtered.length}/{users.length}</span>
        </div>
      </div>

      <div className="grid gap-3">
        {filtered.map(u => {
          const userSheets = sheets.filter(s => s.user_id === u.id)
          const lastAccess = u.updated_at ? new Date(u.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
          const isConfirming = confirmDeleteId === u.id
          return (
            <div key={u.id} className="bg-gradient-to-r from-deep/95 to-deep/70 backdrop-blur-sm border border-sep/30 rounded-xl p-4 flex items-center gap-4 transition-all duration-200 hover:border-sep/50 hover:shadow-lg hover:shadow-black/20">
              <div className="relative">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="w-12 h-12 rounded-full border-2 border-gold/30 object-cover shadow-md shadow-black/30" />
                ) : (
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-semibold shadow-md shadow-black/20 ${u.role === 'admin' ? 'bg-gradient-to-br from-gold/30 to-gold/10 text-gold border-2 border-gold/40' : 'bg-sep/20 text-txt-dim border-2 border-sep/30'}`}>
                    {u.display_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
                {u.role === 'admin' && (
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-gold rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-void text-[7px] font-bold">★</span>
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-txt-main text-sm font-semibold truncate">{u.display_name || 'Sem nome'}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full border font-semibold ${u.role === 'admin' ? 'bg-gold/10 text-gold border-gold/25' : 'bg-sep/15 text-txt-dim border-sep/25'}`}>
                    {u.role === 'admin' ? 'Admin' : 'Usuário'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-txt-dim/50 text-xs truncate">{u.email || ''}</span>
                  <span className="text-txt-dim/30 text-[10px]">•</span>
                  <span className="text-txt-dim/40 text-[10px]">{lastAccess}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <span className="text-gold/70 text-sm font-mono font-semibold">{userSheets.length}</span>
                  <span className="text-txt-dim/40 text-[10px] block">ficha(s)</span>
                </div>
                {u.role !== 'admin' && (
                  isConfirming ? (
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => handleRemoveUser(u.id)} disabled={deleting}
                        className="text-[10px] bg-err text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-red-500 transition-colors disabled:opacity-50">
                        {deleting ? '...' : 'Confirmar'}
                      </button>
                      <button onClick={() => setConfirmDeleteId(null)}
                        className="text-[10px] text-txt-dim px-2 py-1.5 rounded-lg border border-sep/30 hover:text-txt-main transition-colors">
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(u.id)}
                      className="text-txt-dim/30 hover:text-err transition-colors p-1.5 rounded-lg hover:bg-err/10" title="Remover usuário">
                      <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>person_remove</span>
                    </button>
                  )
                )}
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-txt-dim/20 text-4xl mb-2 block" style={{ fontVariationSettings: "'FILL' 0, 'wght' 200" }}>person_off</span>
            <p className="text-txt-dim/40 text-sm">Nenhum usuário encontrado.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function AdminSkillsPanel({ sheets, getUserName, onPatch, onViewSheet }) {
  const [expanded, setExpanded] = useState(null)
  const openNotices = sheets.flatMap(sheet => (sheet.data?.systemSkillNotifications || [])
    .filter(n => n.status !== 'closed')
    .map(notice => ({ sheet, notice })))
  const assignedCount = sheets.reduce((sum, sheet) => sum + (sheet.data?.systemSkills || []).length, 0)

  function assignFromNotice(sheet, notice) {
    const current = sheet.data?.systemSkills || []
    const already = current.some(s => s.skillId === notice.skillId && s.sourceAbilityIndex === notice.abilityIndex)
    const nextSkills = already ? current : [
      ...current,
      createSystemSkillAssignment(notice.skillId, {
        sourceAbilityIndex: notice.abilityIndex ?? null,
        notes: notice.message || '',
        effects: notice.suggestedEffects?.length ? notice.suggestedEffects : createDefaultEffectsForSkill(notice.skillId),
      }),
    ]
    const nextNotices = (sheet.data?.systemSkillNotifications || []).map(n => n.id === notice.id ? { ...n, status: 'closed', resolvedAt: new Date().toISOString() } : n)
    onPatch(sheet, { systemSkills: nextSkills, systemSkillNotifications: nextNotices })
  }

  function closeNotice(sheet, noticeId) {
    onPatch(sheet, {
      systemSkillNotifications: (sheet.data?.systemSkillNotifications || []).map(n => n.id === noticeId ? { ...n, status: 'closed', resolvedAt: new Date().toISOString() } : n),
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-sky-300/20 bg-sky-300/5 p-3">
          <span className="text-sky-200 text-[10px] uppercase tracking-wider">Skills disponiveis</span>
          <strong className="block text-txt-main text-xl font-mono mt-1">{SYSTEM_SKILLS.length}</strong>
        </div>
        <div className="rounded-lg border border-warn/20 bg-warn/5 p-3">
          <span className="text-warn text-[10px] uppercase tracking-wider">Notificacoes abertas</span>
          <strong className="block text-txt-main text-xl font-mono mt-1">{openNotices.length}</strong>
        </div>
        <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/5 p-3">
          <span className="text-emerald-300 text-[10px] uppercase tracking-wider">Atribuidas</span>
          <strong className="block text-txt-main text-xl font-mono mt-1">{assignedCount}</strong>
        </div>
      </div>

      <div className="rounded-xl border border-sep/30 bg-deep/70 p-4">
        <h3 className="font-cinzel text-gold text-sm mb-3">Catalogo de Skills</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {SYSTEM_SKILLS.map(skill => {
            const cat = SYSTEM_SKILL_CATEGORIES.find(c => c.id === skill.category)
            return (
              <div key={skill.id} className="rounded-lg border border-sep/25 bg-void/40 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-txt-main text-xs font-semibold">{skill.name}</span>
                  <span className="text-[9px] border border-gold/20 text-gold/80 rounded px-1.5 py-0.5">{cat?.label || skill.category}</span>
                  <span className="text-[9px] border border-sky-300/20 text-sky-200/70 rounded px-1.5 py-0.5">{skill.rarity}</span>
                </div>
                <p className="text-txt-dim/75 text-[11px] leading-relaxed">{skill.short}</p>
                <p className="text-txt-dim/45 text-[10px] mt-1">{skill.adminNotes}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-txt-main text-sm font-semibold">Notificacoes do Mestre</h3>
        {openNotices.length === 0 && <p className="text-txt-dim/50 text-xs italic">Nenhuma passiva aguardando decisao sistemica.</p>}
        {openNotices.map(({ sheet, notice }) => {
          const skill = getSystemSkillById(notice.skillId)
          const isOpen = expanded === notice.id
          return (
            <div key={notice.id} className="rounded-lg border border-warn/20 bg-warn/5 overflow-hidden">
              <button type="button" onClick={() => setExpanded(isOpen ? null : notice.id)}
                className="w-full p-3 flex items-center justify-between text-left hover:bg-void/20 transition-colors">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-txt-main text-sm font-semibold">{notice.title}</span>
                    <span className="text-[9px] bg-gold/10 text-gold px-1.5 py-0.5 rounded">{skill?.name || 'Skill'}</span>
                  </div>
                  <p className="text-txt-dim text-xs mt-0.5">{sheet.name} - {getUserName(sheet.user_id)}</p>
                </div>
                <span className="text-txt-dim/50 text-xs">{isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && (
                <div className="border-t border-sep/25 p-3 space-y-3">
                  <p className="text-txt-main/80 text-xs leading-relaxed">{notice.message}</p>
                  {notice.details && <p className="text-txt-dim/70 text-[11px] leading-relaxed bg-void/45 border border-sep/20 rounded p-2">{notice.details}</p>}
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => assignFromNotice(sheet, notice)} className="text-xs bg-gold text-void px-3 py-1.5 rounded font-semibold hover:bg-gold-light transition-colors">
                      Atribuir Skill
                    </button>
                    <button onClick={() => closeNotice(sheet, notice.id)} className="text-xs border border-err/30 text-err px-3 py-1.5 rounded hover:bg-err/10 transition-colors">
                      Excluir notificacao
                    </button>
                    {onViewSheet && (
                      <button onClick={() => onViewSheet(sheet.id)} className="text-xs border border-sky-300/30 text-sky-200 px-3 py-1.5 rounded hover:bg-sky-300/10 transition-colors">
                        Ver ficha
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AdminSheetView({ sheet, onPatch }) {
  const char = sheet.data || {}
  const attrs = char.atributos || {}
  const sk = char.skeletonPoints || {}
  const total = (a) => (attrs[a] || 0) + (sk[a] || 0)
  const weapon = WEAPONS.find(w => w.id === char.arma)
  const weaponRank = WEAPON_RANKS.find(r => r.rank === char.armaRank) || WEAPON_RANKS[0]
  const art = MARTIAL_ARTS.find(a => a.id === char.arteMarcial)
  const triagemDef = findTriagem(char.triagemPrincipal)
  const subTriagemDef = findTriagem(char.subTriagem)
  const periciasArr = Object.entries(char.pericias || {}).filter(([, v]) => v > 0)
  const equipamentos = char.equipamentos || []
  const legendaryAssigned = char.armasLendarias || []
  const systemSkillSummary = summarizeSystemSkillBonuses(char)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
        <div><span className="text-txt-dim">Nome:</span> <span className="text-txt-main font-semibold">{char.nome || '—'}</span></div>
        <div><span className="text-txt-dim">Raça:</span> <span className="text-txt-main">{char.raca || '—'}</span></div>
        <div><span className="text-txt-dim">Classe:</span> <span className="text-txt-main">{char.classe || '—'}</span></div>
        <div><span className="text-txt-dim">Nível:</span> <span className="text-txt-main">{char.nivel || 1}</span></div>
        <div><span className="text-txt-dim">Triagem:</span> <span className="text-txt-main">{triagemDef?.name || char.triagemPrincipal || '—'} ({char.triagemPrincipalNivel || 0})</span></div>
        <div><span className="text-txt-dim">Sub-Triagem:</span> <span className="text-txt-main">{subTriagemDef?.name || char.subTriagem || '—'} ({char.subTriagemNivel || 0})</span></div>
      </div>

      <div>
        <h4 className="text-txt-dim text-xs font-semibold mb-2 uppercase tracking-wider">Atributos</h4>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {['FOR','DES','CON','INT','APA','AM'].map(a => (
            <div key={a} className="bg-void rounded px-2 py-1.5 text-center">
              <span className="text-txt-dim text-xs">{a}</span>
              <span className="block text-txt-main font-mono text-lg">{total(a)}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-txt-dim text-xs font-semibold uppercase tracking-wider">Arma Principal</h4>
          {weapon && onPatch && (
            <button onClick={() => onPatch(sheet, { arma: null, armaRank: 'Comum', armaHabilidades: [] })}
              className="text-[10px] bg-err/10 text-err px-2 py-0.5 rounded border border-err/20 hover:bg-err/20 transition-colors">
              Remover Arma
            </button>
          )}
        </div>
        {weapon ? (
          <div className="bg-void/50 border border-sep/40 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-txt-main text-sm font-semibold">{weapon.name}</span>
              <span className="text-[10px] bg-gold/10 text-gold px-1.5 py-0.5 rounded border border-gold/20">{weaponRank.rank}</span>
            </div>
            <div className="flex gap-4 text-xs">
              <span className="text-red-400 font-mono">Dano: {weapon.dano}{weaponRank.danoBonus ? ` +${weaponRank.danoBonus}` : ''}</span>
              <span className="text-txt-dim">{weapon.attr}</span>
              <span className="text-gold/70">Slots: {weaponRank.slots}</span>
            </div>
            {(char.armaHabilidades || []).length > 0 && (
              <div className="mt-2 pt-2 border-t border-sep/20 space-y-1">
                {(char.armaHabilidades || []).map((h, i) => (
                  <div key={i} className="text-xs flex items-start gap-2">
                    <span className="text-txt-main font-semibold">{h.nome || 'Hab'}</span>
                    <span className="text-txt-dim">({h.potencia}, {h.tipo || 'Ativa'})</span>
                    {onPatch && (
                      <button onClick={() => {
                        const habs = (char.armaHabilidades || []).filter((_, j) => j !== i)
                        onPatch(sheet, { armaHabilidades: habs })
                      }} className="text-err/50 hover:text-err text-[10px] ml-auto shrink-0">✕</button>
                    )}
                    {h.descricao && <p className="text-txt-dim/70 mt-0.5 w-full">{h.descricao}</p>}
                  </div>
                ))}
                {onPatch && (
                  <button onClick={() => onPatch(sheet, { armaHabilidades: [] })}
                    className="text-[10px] text-err/50 hover:text-err mt-1">Limpar todas habilidades</button>
                )}
              </div>
            )}
          </div>
        ) : <p className="text-txt-dim/50 text-xs italic">Nenhuma arma</p>}
      </div>

      {art && (
        <div>
          <h4 className="text-txt-dim text-xs font-semibold mb-2 uppercase tracking-wider">Arte Marcial</h4>
          <p className="text-txt-main text-sm">{art.name} — {art.graus[char.arteMarcialGrau || 0]?.nome || 'Novato'}</p>
        </div>
      )}

      {periciasArr.length > 0 && (
        <div>
          <h4 className="text-txt-dim text-xs font-semibold mb-2 uppercase tracking-wider">Perícias</h4>
          <div className="flex flex-wrap gap-1.5">
            {periciasArr.map(([name, grau]) => (
              <span key={name} className="text-[10px] bg-cyan-400/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-400/20">
                {name} ({GRAU_NAMES[grau]})
              </span>
            ))}
          </div>
        </div>
      )}

      {(char.habilidades || []).length > 0 && (
        <div>
          <h4 className="text-txt-dim text-xs font-semibold mb-2 uppercase tracking-wider">Habilidades</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(char.habilidades || []).map((h, i) => (
              <div key={i} className={`rounded-lg border p-3 ${
                h.status === 'Aprovada' ? 'border-ok/20 bg-ok/5' :
                h.status === 'Revisão necessária' ? 'border-err/20 bg-err/5' :
                'border-warn/20 bg-warn/5'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold ${STATUS_COLORS_ADMIN[h.status] || 'text-txt-dim'}`}>{h.status}</span>
                  <span className="text-[9px] bg-sep/20 text-txt-dim px-1.5 py-0.5 rounded">{h.tipo}</span>
                </div>
                <h5 className="text-txt-main text-sm font-semibold">{h.nome || '—'}</h5>
                <p className="text-txt-dim text-xs mt-1 leading-relaxed">{h.descricao || 'Sem descrição'}</p>
                <div className="flex flex-wrap gap-2 text-xs mt-2">
                  {h.custoEnergia > 0 && <span className="text-sky-400 font-mono">⚡{h.custoEnergia}</span>}
                  {h.dano && <span className="text-red-400 font-mono">⚔{h.dano}</span>}
                  {h.duracao && <span className="text-amber-400">⏱{h.duracao}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {((char.systemSkills || []).length > 0 || (char.systemSkillNotifications || []).some(n => n.status !== 'closed')) && (
        <div>
          <h4 className="text-txt-dim text-xs font-semibold mb-2 uppercase tracking-wider">Skills Sistêmicas</h4>
          {(char.systemSkills || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(char.systemSkills || []).map((entry, i) => {
                const skill = getSystemSkillById(entry.skillId)
                return (
                  <span key={entry.id || i} className="text-[10px] bg-sky-300/10 text-sky-200 px-2 py-0.5 rounded border border-sky-300/20">
                    {skill?.name || entry.skillId}{entry.active === false ? ' (inativa)' : ''}
                  </span>
                )
              })}
            </div>
          )}
          {systemSkillSummary.length > 0 && (
            <p className="text-emerald-300/80 text-[11px] mb-2">{systemSkillSummary.join(' | ')}</p>
          )}
          {(char.systemSkillNotifications || []).filter(n => n.status !== 'closed').length > 0 && (
            <p className="text-warn text-[11px]">
              {(char.systemSkillNotifications || []).filter(n => n.status !== 'closed').length} notificacao(oes) aguardando decisao do mestre.
            </p>
          )}
        </div>
      )}

      {(char.alchemyRituals || []).length > 0 && (
        <div>
          <h4 className="text-txt-dim text-xs font-semibold mb-2 uppercase tracking-wider">Rituais de Alquimia</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(char.alchemyRituals || []).map((ritual, i) => (
              <div key={`${ritual.id || ritual.name}-${i}`} className="rounded-lg border border-teal-400/20 bg-teal-400/5 p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-txt-main text-sm font-semibold">{ritual.name || '—'}</span>
                  <span className="text-[10px] bg-teal-400/10 text-teal-300 px-1.5 py-0.5 rounded border border-teal-400/20">
                    {ritual.circle || 1}o circulo
                  </span>
                  <span className="text-[10px] bg-sep/20 text-txt-dim px-1.5 py-0.5 rounded">
                    {ritual.category || 'Sem categoria'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2 text-[11px] font-mono">
                  <span className="text-amber-300">{ritual.pe_cost || 0} PE</span>
                  {ritual.action_cost && <span className="text-sky-300">{ritual.action_cost}</span>}
                  {ritual.duration && <span className="text-txt-dim">{ritual.duration}</span>}
                </div>
                <p className="text-txt-dim text-xs mt-2 leading-relaxed">{ritual.effect || ritual.short_description || 'Sem efeito descrito.'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(char.spells || []).length > 0 && (
        <div>
          <h4 className="text-txt-dim text-xs font-semibold mb-2 uppercase tracking-wider">Feitiços</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(char.spells || []).map((spell, i) => (
              <div key={`${spell.id || spell.name}-${i}`} className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-txt-main text-sm font-semibold">{spell.name || 'â€”'}</span>
                  <span className="text-[10px] bg-emerald-400/10 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-400/20">
                    {spell.circle || 1}o circulo
                  </span>
                  <span className="text-[10px] bg-sep/20 text-txt-dim px-1.5 py-0.5 rounded">
                    {spell.category || 'Sem categoria'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2 text-[11px] font-mono">
                  <span className="text-amber-300">{spell.pe_cost || 0} PE</span>
                  {spell.action_cost && <span className="text-sky-300">{spell.action_cost}</span>}
                  {spell.duration && <span className="text-txt-dim">{spell.duration}</span>}
                </div>
                <p className="text-txt-dim text-xs mt-2 leading-relaxed">{spell.effect || spell.short_description || 'Sem efeito descrito.'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(char.runes || []).length > 0 && (
        <div>
          <h4 className="text-txt-dim text-xs font-semibold mb-2 uppercase tracking-wider">Runas</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(char.runes || []).map((rune, i) => (
              <div key={`${rune.id || rune.name}-${i}`} className="rounded-lg border border-sky-400/20 bg-sky-400/5 p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-txt-main text-sm font-semibold">{rune.name || '—'}</span>
                  <span className="text-[10px] bg-sky-400/10 text-sky-300 px-1.5 py-0.5 rounded border border-sky-400/20">
                    {rune.circle || 1}o circulo
                  </span>
                  <span className="text-[10px] bg-sep/20 text-txt-dim px-1.5 py-0.5 rounded">
                    {rune.category || 'Sem categoria'}
                  </span>
                  {rune.active && (
                    <span className="text-[10px] bg-gold/10 text-gold px-1.5 py-0.5 rounded border border-gold/20">Ativa</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-2 text-[11px] font-mono">
                  <span className="text-amber-300">{rune.pe_cost || 0} PE</span>
                  {rune.action_cost && <span className="text-sky-300">{rune.action_cost}</span>}
                  {rune.duration && <span className="text-txt-dim">{rune.duration}</span>}
                </div>
                <p className="text-txt-dim text-xs mt-2 leading-relaxed">{rune.effect || rune.short_description || 'Sem efeito descrito.'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(char.magics || []).length > 0 && (
        <div>
          <h4 className="text-txt-dim text-xs font-semibold mb-2 uppercase tracking-wider">Magias</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(char.magics || []).map((magic, i) => (
              <div key={`${magic.id || magic.name}-${i}`} className="rounded-lg border border-orange-400/20 bg-orange-400/5 p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-txt-main text-sm font-semibold">{magic.name || '—'}</span>
                  <span className="text-[10px] bg-orange-400/10 text-orange-300 px-1.5 py-0.5 rounded border border-orange-400/20">
                    {magic.circle || 1}o circulo
                  </span>
                  <span className="text-[10px] bg-sep/20 text-txt-dim px-1.5 py-0.5 rounded">
                    {magic.category || 'Sem categoria'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2 text-[11px] font-mono">
                  <span className="text-amber-300">{magic.pe_cost || 0} PE</span>
                  {magic.action_cost && <span className="text-sky-300">{magic.action_cost}</span>}
                  {magic.duration && <span className="text-txt-dim">{magic.duration}</span>}
                </div>
                <p className="text-txt-dim text-xs mt-2 leading-relaxed">{magic.effect || magic.short_description || 'Sem efeito descrito.'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(char.modulosAdquiridos || []).length > 0 && (
        <div>
          <h4 className="text-txt-dim text-xs font-semibold mb-2 uppercase tracking-wider">Módulos</h4>
          <div className="flex flex-wrap gap-1.5">
            {(char.modulosAdquiridos || []).map((m, i) => (
              <span key={i} className="text-[10px] bg-amber-400/10 text-amber-400 px-2 py-0.5 rounded border border-amber-400/20">
                {m.id} {(m.boughtCount || 1) > 1 ? `×${m.boughtCount}` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {(char.inventario || []).length > 0 && (
        <div>
          <h4 className="text-txt-dim text-xs font-semibold mb-2 uppercase tracking-wider">Inventário ({(char.inventario || []).length} itens)</h4>
          <div className="flex flex-wrap gap-1.5">
            {(char.inventario || []).map((item, i) => (
              <span key={i} className="text-[10px] bg-sep/20 text-txt-dim px-2 py-0.5 rounded">{item.nome || `Item ${i+1}`}</span>
            ))}
          </div>
        </div>
      )}

      {equipamentos.length > 0 && (
        <div>
          <h4 className="text-txt-dim text-xs font-semibold mb-2 uppercase tracking-wider">Equipamentos ({equipamentos.length})</h4>
          <div className="space-y-1.5">
            {equipamentos.map((eq, i) => {
              const eqW = WEAPONS.find(w => w.id === eq.armaId)
              const eqR = WEAPON_RANKS.find(r => r.rank === eq.rank) || WEAPON_RANKS[0]
              const eqRc = RANK_COLORS[eq.rank] || RANK_COLORS.Comum
              return (
                <div key={eq.id || i} className={`bg-void/40 border rounded-lg px-3 py-2 ${eqRc.border}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-txt-main text-xs font-semibold">{eq.nome || `Equip ${i+1}`}</span>
                    {eq.rank && <span className={`text-[9px] px-1.5 py-0.5 rounded border ${eqRc.badge}`}>{eq.rank}</span>}
                    {eq.dano && <span className="text-red-400/70 text-[10px] font-mono">{eq.dano}</span>}
                    {onPatch && (
                      <button onClick={() => {
                        const next = equipamentos.filter((_, j) => j !== i)
                        onPatch(sheet, { equipamentos: next })
                      }} className="text-err/50 hover:text-err text-[10px] ml-auto">✕ Remover</button>
                    )}
                  </div>
                  {eq.efeitos && <p className="text-txt-dim/50 text-[10px] mt-0.5">{eq.efeitos}</p>}
                  {(eq.habilidades || []).length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(eq.habilidades || []).map((h, hi) => (
                        <span key={hi} className="text-[9px] bg-sep/20 text-txt-dim px-1.5 py-0.5 rounded">{h.nome || 'Hab'} ({h.potencia})</span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            {onPatch && (
              <button onClick={() => onPatch(sheet, { equipamentos: [] })}
                className="text-[10px] text-err/50 hover:text-err mt-1">Limpar todos equipamentos</button>
            )}
          </div>
        </div>
      )}

      {legendaryAssigned.length > 0 && (
        <div>
          <h4 className="text-lime-300 text-xs font-semibold mb-2 uppercase tracking-wider">★ Armas Lendárias Atribuídas</h4>
          <div className="space-y-1.5">
            {legendaryAssigned.map((lw, i) => (
              <div key={lw.id || i} className="bg-lime-300/5 border border-lime-300/20 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-amber-300 text-sm">★</span>
                  <span className="text-txt-main text-xs font-semibold">{lw.name}</span>
                  <span className="text-[9px] bg-lime-300/10 text-lime-300 px-1.5 py-0.5 rounded border border-lime-300/20">{lw.rank}</span>
                  {onPatch && (
                    <button onClick={() => {
                      const next = legendaryAssigned.filter((_, j) => j !== i)
                      onPatch(sheet, { armasLendarias: next })
                    }} className="text-err/50 hover:text-err text-[10px] ml-auto">✕ Remover</button>
                  )}
                </div>
                <p className="text-txt-dim/60 text-[10px] mt-0.5">{lw.descricao}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {char.notas && (
        <div>
          <h4 className="text-txt-dim text-xs font-semibold mb-1 uppercase tracking-wider">Notas</h4>
          <p className="text-txt-dim text-xs whitespace-pre-wrap">{char.notas}</p>
        </div>
      )}
    </div>
  )
}

function SectionCard({ id, icon, title, color, children, rightSlot }) {
  return (
    <section
      id={`section-${id}`}
      className="bg-gradient-to-br from-deep/95 to-deep/70 backdrop-blur-sm border border-sep/30 rounded-xl overflow-hidden shadow-lg shadow-black/20 transition-all duration-300 hover:shadow-xl hover:shadow-black/30 hover:border-sep/50"
    >
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-sep/15 bg-gradient-to-r from-void/50 via-void/30 to-transparent">
        <div className={`w-1.5 h-5 rounded-full shrink-0 ${color}`} />
        <span className="text-txt-dim text-sm shrink-0">{icon}</span>
        <h3 className="font-cinzel text-txt-main text-[11px] uppercase tracking-[0.15em] font-semibold whitespace-nowrap">{title}</h3>
        <div className="flex-1 h-px bg-gradient-to-r from-sep/40 to-transparent" />
        {rightSlot}
      </div>
      <div className="p-5 space-y-3.5">
        {children}
      </div>
    </section>
  )
}

function FullSheetEditor({ sheet, onSave, onCancel, forgeWeapons }) {
  const [data, setData] = useState(JSON.parse(JSON.stringify(sheet.data || {})))
  const [activeSection, setActiveSection] = useState('identidade')

  const SECTIONS = [
    { id: 'identidade', label: 'Identidade', icon: '👤', color: 'bg-gold' },
    { id: 'atributos', label: 'Atributos', icon: '📊', color: 'bg-amber-400' },
    { id: 'recursos', label: 'Recursos', icon: '💎', color: 'bg-emerald-400' },
    { id: 'triagens', label: 'Triagens', icon: '★', color: 'bg-purple-400' },
    { id: 'pericias', label: 'Perícias', icon: '📜', color: 'bg-cyan-400' },
    { id: 'arma', label: 'Arma', icon: '⚔', color: 'bg-red-400' },
    { id: 'arteMarcial', label: 'Arte Marcial', icon: '👊', color: 'bg-orange-400' },
    { id: 'modulos', label: 'Módulos', icon: '⚙', color: 'bg-yellow-400' },
    { id: 'habilidades', label: 'Habilidades', icon: '✦', color: 'bg-indigo-400' },
    { id: 'skills', label: 'Skills', icon: '◆', color: 'bg-sky-300' },
    { id: 'inventario', label: 'Inventário', icon: '🎒', color: 'bg-teal-400' },
    { id: 'equipamentos', label: 'Equipamentos', icon: '🗡', color: 'bg-orange-400' },
    { id: 'lendarias', label: 'Lendárias', icon: '★', color: 'bg-lime-300' },
    { id: 'notas', label: 'Notas', icon: '📝', color: 'bg-gray-400' },
    { id: 'json', label: 'JSON', icon: '{ }', color: 'bg-sep' },
  ]

  function scrollTo(id) {
    setActiveSection(id)
    document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function up(path, value) {
    setData(prev => {
      const next = { ...prev }
      const keys = path.split('.')
      let obj = next
      for (let i = 0; i < keys.length - 1; i++) {
        const k = isNaN(keys[i]) ? keys[i] : Number(keys[i])
        if (Array.isArray(obj[k])) obj[k] = [...obj[k]]
        else if (typeof obj[k] === 'object' && obj[k] !== null) obj[k] = { ...obj[k] }
        else obj[k] = {}
        obj = obj[k]
      }
      const last = isNaN(keys[keys.length - 1]) ? keys[keys.length - 1] : Number(keys[keys.length - 1])
      if (Array.isArray(obj)) obj[last] = value
      else obj[last] = value
      return next
    })
  }

  function updateAttr(attr, val) {
    setData(prev => ({
      ...prev,
      atributos: { ...(prev.atributos || {}), [attr]: Number(val) || 0 },
    }))
  }

  function updateSk(attr, val) {
    setData(prev => ({
      ...prev,
      skeletonPoints: { ...(prev.skeletonPoints || {}), [attr]: Number(val) || 0 },
    }))
  }

  function updateHabilidade(index, patch) {
    setData(prev => {
      const habs = [...(prev.habilidades || [])]
      habs[index] = { ...habs[index], ...patch }
      return { ...prev, habilidades: habs }
    })
  }

  function addHabilidade(tipo = 'Ativa') {
    setData(prev => ({
      ...prev,
      habilidades: [...(prev.habilidades || []), {
        tipo,
        nome: '',
        descricao: '',
        custoEnergia: 0,
        dano: '',
        duracao: '',
        dt: '',
        tags: [],
        valores: {},
        camadaSCP: 2,
        ppEstimado: 0,
        status: 'Aprovada',
        evolucaoNivel: 0,
      }],
    }))
  }

  function removeHabilidade(index) {
    setData(prev => ({
      ...prev,
      habilidades: (prev.habilidades || []).filter((_, i) => i !== index),
    }))
  }

  function assignSystemSkill(skillId, sourceAbilityIndex = null, effects = null) {
    const defaultEffects = effects && effects.length > 0 ? effects : createDefaultEffectsForSkill(skillId)
    setData(prev => ({
      ...prev,
      systemSkills: [...(prev.systemSkills || []), createSystemSkillAssignment(skillId, { sourceAbilityIndex, effects: defaultEffects })],
    }))
  }

  function updateSystemSkill(index, patch) {
    setData(prev => {
      const arr = [...(prev.systemSkills || [])]
      arr[index] = { ...arr[index], ...patch }
      return { ...prev, systemSkills: arr }
    })
  }

  function removeSystemSkill(index) {
    setData(prev => ({
      ...prev,
      systemSkills: (prev.systemSkills || []).filter((_, i) => i !== index),
    }))
  }

  function addSkillEffect(skillIndex, effectType) {
    const paramDef = EFFECT_PARAM_DEFS[effectType]
    if (!paramDef) return
    const newEffect = { type: effectType }
    for (const [key, p] of Object.entries(paramDef.params)) {
      if (p.default != null) newEffect[key] = p.default
    }
    setData(prev => {
      const arr = [...(prev.systemSkills || [])]
      const entry = { ...arr[skillIndex] }
      entry.effects = [...(entry.effects || []), newEffect]
      arr[skillIndex] = entry
      return { ...prev, systemSkills: arr }
    })
  }

  function updateSkillEffect(skillIndex, effectIndex, patch) {
    setData(prev => {
      const arr = [...(prev.systemSkills || [])]
      const entry = { ...arr[skillIndex] }
      entry.effects = (entry.effects || []).map((e, i) => i === effectIndex ? { ...e, ...patch } : e)
      arr[skillIndex] = entry
      return { ...prev, systemSkills: arr }
    })
  }

  function removeSkillEffect(skillIndex, effectIndex) {
    setData(prev => {
      const arr = [...(prev.systemSkills || [])]
      const entry = { ...arr[skillIndex] }
      entry.effects = (entry.effects || []).filter((_, i) => i !== effectIndex)
      arr[skillIndex] = entry
      return { ...prev, systemSkills: arr }
    })
  }

  function closeSystemNotice(noticeId) {
    setData(prev => ({
      ...prev,
      systemSkillNotifications: (prev.systemSkillNotifications || []).map(n => n.id === noticeId ? { ...n, status: 'closed', resolvedAt: new Date().toISOString() } : n),
    }))
  }

  function createManualSystemNotice() {
    setData(prev => ({
      ...prev,
      systemSkillNotifications: [
        ...(prev.systemSkillNotifications || []),
        createSystemSkillNotification({
          skillId: 'manual_integration',
          title: 'Passiva requer avaliacao sistemica',
          message: 'O mestre marcou esta ficha para revisar uma possivel Skill personalizada.',
          source: 'admin',
        }),
      ],
    }))
  }

  function updateArmaHab(index, patch) {
    setData(prev => {
      const habs = [...(prev.armaHabilidades || [])]
      habs[index] = { ...habs[index], ...patch }
      return { ...prev, armaHabilidades: habs }
    })
  }

  function updatePericia(name, grau) {
    setData(prev => ({
      ...prev,
      pericias: { ...(prev.pericias || {}), [name]: grau },
    }))
  }

  function updateModulo(index, patch) {
    setData(prev => {
      const mods = [...(prev.modulosAdquiridos || [])]
      mods[index] = { ...mods[index], ...patch }
      return { ...prev, modulosAdquiridos: mods }
    })
  }

  function addModulo(moduleId) {
    setData(prev => ({
      ...prev,
      modulosAdquiridos: [...(prev.modulosAdquiridos || []), { id: moduleId, boughtCount: 1 }],
    }))
  }

  function removeModulo(index) {
    setData(prev => ({
      ...prev,
      modulosAdquiridos: (prev.modulosAdquiridos || []).filter((_, i) => i !== index),
    }))
  }

  function updateInvItem(index, patch) {
    setData(prev => {
      const arr = [...(prev.inventario || [])]
      arr[index] = { ...arr[index], ...patch }
      return { ...prev, inventario: arr }
    })
  }

  function removeInvItem(index) {
    setData(prev => ({
      ...prev,
      inventario: (prev.inventario || []).filter((_, i) => i !== index),
    }))
  }

  function addInvItem() {
    setData(prev => ({
      ...prev,
      inventario: [...(prev.inventario || []), { nome: '', descricao: '', quantidade: 1 }],
    }))
  }

  function updateEquipItem(index, patch) {
    setData(prev => {
      const arr = [...(prev.equipamentos || [])]
      arr[index] = { ...arr[index], ...patch }
      return { ...prev, equipamentos: arr }
    })
  }

  function removeEquipItem(index) {
    setData(prev => ({
      ...prev,
      equipamentos: (prev.equipamentos || []).filter((_, i) => i !== index),
    }))
  }

  function addEquipItem() {
    setData(prev => ({
      ...prev,
      equipamentos: [...(prev.equipamentos || []), { id: Date.now(), nome: '', rank: 'Comum', dano: '', efeitos: '', descricao: '', categoria: 'Arma' }],
    }))
  }

  function assignLegendary(legendaryId) {
    const lw = LEGENDARY_WEAPONS.find(l => l.id === legendaryId)
    const fw = !lw ? forgeWeapons.find(w => w.id === legendaryId) : null
    if (!lw && !fw) return
    const existing = data.armasLendarias || []
    if (existing.some(l => l.id === legendaryId)) return
    const entry = lw
      ? { id: lw.id, name: lw.name, rank: lw.rank, tipo: lw.tipo, descricao: lw.descricao }
      : { id: fw.id, name: fw.name, rank: 'Lendária', tipo: fw.range || fw.law_name || 'Forja Lendária', source: 'forge', sourceId: fw.id, image: fw.image || null, descricao: fw.short_description || fw.effect || '', dano: fw.damage || fw.dano || '', attr: fw.attribute || fw.attr || '', effect: fw.effect || '', lore: fw.lore || '', power_level: fw.power_level || '', habilidades: fw.abilities || fw.habilidades || '' }
    setData(prev => ({
      ...prev,
      armasLendarias: [...existing, entry],
    }))
  }

  function removeLegendary(index) {
    setData(prev => ({
      ...prev,
      armasLendarias: (prev.armasLendarias || []).filter((_, i) => i !== index),
    }))
  }

  const attrs = data.atributos || {}
  const sk = data.skeletonPoints || {}

  return (
    <div className="flex gap-5">
      <aside className="w-[180px] shrink-0 sticky top-2 self-start max-h-[calc(100vh-4rem)] overflow-y-auto py-3 pr-2 space-y-0.5">
        <div className="px-3 mb-4">
          <div className="font-cinzel text-gold text-[11px] uppercase tracking-[0.2em] mb-1">Editor</div>
          <div className="text-txt-dim/40 text-[9px] truncate">{sheet.name}</div>
        </div>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => scrollTo(s.id)}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-2.5 transition-all duration-200 group ${
              activeSection === s.id
                ? 'bg-gold/10 text-gold border border-gold/20 shadow-sm shadow-gold/5'
                : 'text-txt-dim hover:text-txt-main hover:bg-void/40 border border-transparent'
            }`}
          >
            <span className={`w-1 h-4 rounded-full transition-all duration-200 ${activeSection === s.id ? s.color : 'bg-sep/40 group-hover:bg-sep/60'}`} />
            <span className="text-[11px]">{s.icon}</span>
            <span className="truncate text-[11px]">{s.label}</span>
          </button>
        ))}
        <div className="pt-4 mt-4 border-t border-sep/20 space-y-2 px-1">
          <button
            onClick={() => onSave({ ...sheet, data })}
            className="w-full bg-gold text-void text-[11px] px-3 py-2 rounded-lg font-semibold hover:bg-gold-light transition-colors shadow-md shadow-gold/10"
          >
            Salvar Alterações
          </button>
          <button
            onClick={onCancel}
            className="w-full text-txt-dim text-[11px] px-3 py-2 rounded-lg border border-sep/30 hover:text-txt-main hover:border-sep/50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 space-y-4 pb-6">

        <SectionCard id="identidade" icon="👤" title="Identidade" color="bg-gold">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-txt-dim/60 text-[9px] uppercase tracking-wider block mb-1.5">Nome</label>
              <input type="text" value={data.nome || ''} onChange={e => up('nome', e.target.value)} className="admin-input" />
            </div>
            <div>
              <label className="text-txt-dim/60 text-[9px] uppercase tracking-wider block mb-1.5">Raça</label>
              <select value={data.raca || ''} onChange={e => up('raca', e.target.value)} className="admin-input">
                <option value="">—</option>
                {RACAS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-txt-dim/60 text-[9px] uppercase tracking-wider block mb-1.5">Classe</label>
              <select value={data.classe || ''} onChange={e => up('classe', e.target.value)} className="admin-input">
                <option value="">—</option>
                {CLASSES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-txt-dim/60 text-[9px] uppercase tracking-wider block mb-1.5">Nível</label>
              <input type="number" value={data.nivel || 1} onChange={e => up('nivel', Number(e.target.value) || 1)} className="admin-input" />
            </div>
          </div>
          <div>
            <label className="text-txt-dim/60 text-[9px] uppercase tracking-wider block mb-1.5">Avatar URL</label>
            <input type="text" value={data.avatar || ''} onChange={e => up('avatar', e.target.value)} className="admin-input text-xs" />
          </div>
        </SectionCard>
        <SectionCard id="atributos" icon="📊" title="Atributos & Pontos de Esqueleto" color="bg-amber-400">
          <div className="grid grid-cols-6 gap-2.5">
            {['FOR','DES','CON','INT','APA','AM'].map(a => (
              <div key={a} className="text-center space-y-1.5 bg-void/40 border border-sep/20 rounded-lg p-2.5 hover:border-gold/20 transition-colors">
                <span className="text-txt-dim text-[10px] block font-cinzel tracking-wider">{a}</span>
                <input type="number" value={attrs[a] || 0} onChange={e => updateAttr(a, e.target.value)}
                  className="w-full bg-void/80 border border-sep/40 rounded-md px-1 py-1.5 text-sm text-txt-main font-mono text-center focus:border-gold/40 focus:outline-none transition-colors" />
                <input type="number" value={sk[a] || 0} onChange={e => updateSk(a, e.target.value)}
                  className="w-full bg-void/80 border border-gold/20 rounded-md px-1 py-1 text-[10px] text-gold/80 font-mono text-center focus:border-gold/40 focus:outline-none transition-colors" placeholder="SK" />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard id="recursos" icon="💎" title="Recursos — Bônus Manual (Mestre)" color="bg-emerald-400">
          <p className="text-txt-dim/50 text-[10px] leading-relaxed">Valores somados ao total calculado. Use para conceder extras ao personagem.</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center bg-void/40 border border-red-400/15 rounded-lg p-3 hover:border-red-400/30 transition-colors">
              <label className="text-red-400 text-[10px] uppercase tracking-wider block mb-2 font-semibold">+ Vida</label>
              <input type="number" value={data.vidaBonus || 0}
                onChange={e => up('vidaBonus', Number(e.target.value) || 0)}
                className="w-full bg-void/80 border border-red-400/20 rounded-lg px-2 py-2 text-xl text-red-400 font-mono text-center focus:border-red-400/50 focus:outline-none transition-colors" />
            </div>
            <div className="text-center bg-void/40 border border-sky-400/15 rounded-lg p-3 hover:border-sky-400/30 transition-colors">
              <label className="text-sky-400 text-[10px] uppercase tracking-wider block mb-2 font-semibold">+ Energia</label>
              <input type="number" value={data.energiaBonus || 0}
                onChange={e => up('energiaBonus', Number(e.target.value) || 0)}
                className="w-full bg-void/80 border border-sky-400/20 rounded-lg px-2 py-2 text-xl text-sky-400 font-mono text-center focus:border-sky-400/50 focus:outline-none transition-colors" />
            </div>
            <div className="text-center bg-void/40 border border-amber-400/15 rounded-lg p-3 hover:border-amber-400/30 transition-colors">
              <label className="text-amber-400 text-[10px] uppercase tracking-wider block mb-2 font-semibold">+ PE</label>
              <input type="number" value={data.peBonus || 0}
                onChange={e => up('peBonus', Number(e.target.value) || 0)}
                className="w-full bg-void/80 border border-amber-400/20 rounded-lg px-2 py-2 text-xl text-amber-400 font-mono text-center focus:border-amber-400/50 focus:outline-none transition-colors" />
            </div>
          </div>
        </SectionCard>

        <SectionCard id="triagens" icon="★" title="Triagens" color="bg-purple-400">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-txt-dim/60 text-[9px] uppercase tracking-wider block mb-1.5">Principal</label>
              <select value={data.triagemPrincipal || ''} onChange={e => up('triagemPrincipal', e.target.value)} className="admin-input">
                <option value="">—</option>
                {getAllTriagemOptions().map(t => <option key={t.id} value={t.id}>{t.name} ({t.classKey})</option>)}
              </select>
            </div>
            <div>
              <label className="text-txt-dim/60 text-[9px] uppercase tracking-wider block mb-1.5">Nível Triagem</label>
              <input type="number" step="0.1" value={data.triagemPrincipalNivel || 0} onChange={e => up('triagemPrincipalNivel', Number(e.target.value))} className="admin-input" />
            </div>
            <div>
              <label className="text-txt-dim/60 text-[9px] uppercase tracking-wider block mb-1.5">Sub-Triagem</label>
              <select value={data.subTriagem || ''} onChange={e => up('subTriagem', e.target.value)} className="admin-input">
                <option value="">—</option>
                {getAllTriagemOptions().map(t => <option key={t.id} value={t.id}>{t.name} ({t.classKey})</option>)}
              </select>
            </div>
            <div>
              <label className="text-txt-dim/60 text-[9px] uppercase tracking-wider block mb-1.5">Nível Sub-Triagem</label>
              <input type="number" step="0.1" value={data.subTriagemNivel || 0} onChange={e => up('subTriagemNivel', Number(e.target.value))} className="admin-input" />
            </div>
          </div>
        </SectionCard>

        <SectionCard id="pericias" icon="📜" title="Perícias" color="bg-cyan-400">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
            {PERICIAS.map(p => {
              const grau = (data.pericias || {})[p.name] || 0
              return (
                <div key={p.name} className="flex items-center gap-1.5 bg-void/40 border border-sep/20 rounded-lg px-2.5 py-1.5 hover:border-cyan-400/20 transition-colors">
                  <span className="text-txt-dim text-xs flex-1 truncate">{p.name}</span>
                  <select value={grau} onChange={e => updatePericia(p.name, Number(e.target.value))}
                    className="bg-void/80 border border-sep/30 rounded px-1.5 py-0.5 text-[10px] text-txt-main focus:border-gold/40 focus:outline-none">
                    {[0,1,2,3,4,5,6].map(g => <option key={g} value={g}>{g === 0 ? '—' : GRAU_NAMES[g]}</option>)}
                  </select>
                </div>
              )
            })}
          </div>
        </SectionCard>

        <SectionCard id="arma" icon="⚔" title="Arma" color="bg-red-400">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-txt-dim/60 text-[9px] uppercase tracking-wider block mb-1.5">Tipo</label>
              <select value={data.arma || ''} onChange={e => up('arma', e.target.value)} className="admin-input">
                <option value="">— Nenhuma —</option>
                {WEAPONS.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-txt-dim/60 text-[9px] uppercase tracking-wider block mb-1.5">Rank</label>
              <select value={data.armaRank || 'Comum'} onChange={e => up('armaRank', e.target.value)} className="admin-input">
                {WEAPON_RANKS.map(r => <option key={r.rank} value={r.rank}>{r.rank}</option>)}
              </select>
            </div>
          </div>
          {(data.armaHabilidades || []).length > 0 && (
            <div className="space-y-2 mt-2">
              <h6 className="text-txt-dim/60 text-[10px] uppercase tracking-wider">Habilidades da Arma</h6>
              {(data.armaHabilidades || []).map((h, i) => (
                <div key={i} className="bg-void/40 border border-sep/20 rounded-lg p-3 space-y-2 hover:border-red-400/20 transition-colors">
                  <div className="flex gap-2">
                    <input type="text" value={h.nome || ''} onChange={e => updateArmaHab(i, { nome: e.target.value })}
                      placeholder="Nome" className="flex-1 admin-input text-xs" />
                    <select value={h.potencia || 'Fraca'} onChange={e => updateArmaHab(i, { potencia: e.target.value })}
                      className="admin-input text-xs w-28">
                      {Object.entries(WEAPON_ABILITY_COST).map(([l,c]) => <option key={l} value={l}>{l} ({c})</option>)}
                    </select>
                    <select value={h.tipo || 'Ativa'} onChange={e => updateArmaHab(i, { tipo: e.target.value })}
                      className="admin-input text-xs w-24">
                      <option>Ativa</option><option>Passiva</option>
                    </select>
                    <button onClick={() => setData(prev => ({ ...prev, armaHabilidades: prev.armaHabilidades.filter((_, j) => j !== i) }))}
                      className="text-err/60 hover:text-err text-xs px-2 transition-colors">✕</button>
                  </div>
                  <textarea value={h.descricao || ''} onChange={e => updateArmaHab(i, { descricao: e.target.value })}
                    rows={2} placeholder="Descrição..." className="admin-input text-xs resize-none" />
                  <input type="text" value={h.custo || ''} onChange={e => updateArmaHab(i, { custo: e.target.value })}
                    placeholder="Custo" className="admin-input text-xs" />
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard id="arteMarcial" icon="👊" title="Arte Marcial" color="bg-orange-400">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-txt-dim/60 text-[9px] uppercase tracking-wider block mb-1.5">Estilo</label>
              <select value={data.arteMarcial || ''} onChange={e => up('arteMarcial', e.target.value)} className="admin-input">
                <option value="">— Nenhuma —</option>
                {MARTIAL_ARTS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-txt-dim/60 text-[9px] uppercase tracking-wider block mb-1.5">Grau</label>
              <select value={data.arteMarcialGrau || 0} onChange={e => up('arteMarcialGrau', Number(e.target.value))} className="admin-input">
                {GRAU_LABELS.map((l, i) => <option key={i} value={i}>{l}</option>)}
              </select>
            </div>
          </div>
        </SectionCard>

        <SectionCard id="modulos" icon="⚙" title="Módulos" color="bg-yellow-400">
          {(data.modulosAdquiridos || []).length > 0 && (
            <div className="space-y-1.5 mb-3">
              {(data.modulosAdquiridos || []).map((m, i) => {
                const allMods = [...(ALL_MODULES.passivos || []), ...(ALL_MODULES.especiais || []), ...(ALL_MODULES.ativos || [])]
                const found = allMods.find(mod => mod.id === m.id)
                return (
                  <div key={i} className="flex items-center gap-2 bg-void/50 rounded-lg px-3 py-2 border border-sep/20">
                    <span className="text-txt-main text-xs font-semibold flex-1">{found?.name || m.id}</span>
                    {found?.req && <span className="text-[10px] text-txt-dim">{found.req}</span>}
                    <input type="number" value={m.boughtCount || 1} min={1}
                      onChange={e => updateModulo(i, { boughtCount: Number(e.target.value) || 1 })}
                      className="w-14 admin-input text-xs text-center" />
                    <button onClick={() => removeModulo(i)} className="text-err/60 hover:text-err text-xs px-1 transition-colors">✕</button>
                  </div>
                )
              })}
            </div>
          )}
          <select value="" onChange={e => { if (e.target.value) addModulo(e.target.value) }}
            className="admin-input text-xs w-full">
            <option value="">+ Adicionar módulo...</option>
            {[
              { group: 'Passivos', items: ALL_MODULES.passivos || [] },
              { group: 'Especiais', items: ALL_MODULES.especiais || [] },
              { group: 'Ativos', items: ALL_MODULES.ativos || [] },
            ].map(cat => (
              <optgroup key={cat.group} label={cat.group}>
                {cat.items.map(mod => (
                  <option key={mod.id} value={mod.id}>{mod.name} ({mod.req})</option>
                ))}
              </optgroup>
            ))}
          </select>
        </SectionCard>

        <SectionCard
          id="habilidades"
          icon="✦"
          title={'Habilidades (' + (data.habilidades || []).length + ')'}
          color="bg-indigo-400"
          rightSlot={
            <div className="flex gap-1">
              <button onClick={() => addHabilidade('Passiva')} className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded hover:bg-emerald-500/20 transition-colors">+ Passiva</button>
              <button onClick={() => addHabilidade('Ativa')} className="text-[9px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded hover:bg-sky-500/20 transition-colors">+ Ativa</button>
              <button onClick={() => addHabilidade('Ultimate')} className="text-[9px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded hover:bg-purple-500/20 transition-colors">+ Ultimate</button>
              <button onClick={() => addHabilidade('Extra (Triagem)')} className="text-[9px] bg-gold/10 text-gold border border-gold/20 px-2 py-0.5 rounded hover:bg-gold/20 transition-colors">+ Extra</button>
            </div>
          }
        >
          {(data.habilidades || []).length === 0 && (
            <p className="text-txt-dim/40 text-xs italic">Nenhuma habilidade. Use os botões acima para adicionar.</p>
          )}
          <div className="space-y-2">
            {(data.habilidades || []).map((h, i) => {
              const typeBorder = h.tipo === 'Passiva' ? 'border-emerald-500/30 hover:border-emerald-500/50'
                : h.tipo === 'Ultimate' ? 'border-purple-500/30 hover:border-purple-500/50'
                : h.tipo === 'Extra (Triagem)' || h.tipo === 'Extra (Módulo)' ? 'border-gold/30 hover:border-gold/50'
                : 'border-sky-500/30 hover:border-sky-500/50'
              const typeBg = h.tipo === 'Passiva' ? 'bg-emerald-500/5'
                : h.tipo === 'Ultimate' ? 'bg-purple-500/5'
                : h.tipo === 'Extra (Triagem)' || h.tipo === 'Extra (Módulo)' ? 'bg-gold/5'
                : 'bg-sky-500/5'
              return (
                <div key={i} className={'rounded-xl p-3.5 space-y-2.5 border transition-all duration-200 backdrop-blur-sm ' + typeBorder + ' ' + typeBg}>
                  <div className="flex gap-2 items-center">
                    <select value={h.tipo || ''} onChange={e => updateHabilidade(i, { tipo: e.target.value })}
                      className="admin-input !py-1 !px-2 !text-[10px] w-28">
                      <option value="Passiva">Passiva</option>
                      <option value="Ativa">Ativa</option>
                      <option value="Ultimate">Ultimate</option>
                      <option value="Extra (Triagem)">Extra (Triagem)</option>
                      <option value="Extra (Módulo)">Extra (Módulo)</option>
                    </select>
                    <input type="text" value={h.nome || ''} onChange={e => updateHabilidade(i, { nome: e.target.value })}
                      className="flex-1 admin-input !py-1 !text-sm" placeholder="Nome da habilidade" />
                    <select value={h.status || 'Pendente'} onChange={e => updateHabilidade(i, { status: e.target.value })}
                      className={'admin-input !py-1 !px-2 !text-xs w-36 ' + (STATUS_COLORS_ADMIN[h.status] || 'text-txt-dim')}>
                      {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <button onClick={() => removeHabilidade(i)} className="text-err/50 hover:text-err text-sm px-2 transition-colors" title="Remover habilidade">✕</button>
                  </div>
                  <textarea value={h.descricao || ''} onChange={e => updateHabilidade(i, { descricao: e.target.value })}
                    rows={2} className="admin-input !text-xs resize-none" placeholder="Descrição da habilidade..." />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-txt-dim/50 text-[9px] uppercase tracking-wider block mb-1">Energia</label>
                      <input type="number" value={h.custoEnergia || 0} onChange={e => updateHabilidade(i, { custoEnergia: Number(e.target.value) })}
                        className="admin-input !text-xs !py-1 font-mono text-center" />
                    </div>
                    <div>
                      <label className="text-txt-dim/50 text-[9px] uppercase tracking-wider block mb-1">Dano</label>
                      <input type="text" value={h.dano || ''} onChange={e => updateHabilidade(i, { dano: e.target.value })}
                        className="admin-input !text-xs !py-1 font-mono text-center" />
                    </div>
                    <div>
                      <label className="text-txt-dim/50 text-[9px] uppercase tracking-wider block mb-1">Duração</label>
                      <input type="text" value={h.duracao || ''} onChange={e => updateHabilidade(i, { duracao: e.target.value })}
                        className="admin-input !text-xs !py-1 text-center" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </SectionCard>

        <SectionCard
          id="skills"
          icon="◆"
          title={'Skills Sistêmicas (' + (data.systemSkills || []).length + ')'}
          color="bg-sky-300"
          rightSlot={
            <button onClick={createManualSystemNotice} className="text-[9px] bg-warn/10 text-warn border border-warn/20 px-2 py-0.5 rounded hover:bg-warn/20 transition-colors">
              + Pendencia
            </button>
          }
        >
          <div className="rounded-lg border border-sky-300/15 bg-sky-300/5 px-3 py-2">
            <p className="text-sky-100/80 text-[11px] leading-relaxed">
              Skills sao integracoes raras de passivas no sistema. Somente o Mestre atribui, remove ou resolve pendencias.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_220px] gap-3">
            <div className="space-y-2">
              {(data.systemSkills || []).length === 0 && (
                <p className="text-txt-dim/45 text-xs italic">Nenhuma Skill atribuida.</p>
              )}
              {(data.systemSkills || []).map((entry, i) => {
                const skill = getSystemSkillById(entry.skillId)
                const effects = entry.effects || []
                const availableEffectTypes = skill?.effectTypes || Object.keys(EFFECT_PARAM_DEFS)
                const repeatableTypes = ['damage_per_level_interval', 'damage_per_attribute_interval', 'resource_per_level', 'attribute_cap_bonus', 'forge_rank_bonus', 'forge_enchantment_slots', 'forge_quality_bonus', 'manual_flag']
                const addableTypes = availableEffectTypes.filter(t => !effects.some(e => e.type === t) || repeatableTypes.includes(t))
                return (
                  <div key={entry.id || i} className="rounded-lg border border-sky-300/20 bg-void/45 p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <select value={entry.skillId || ''} onChange={e => updateSystemSkill(i, { skillId: e.target.value })}
                        className="admin-input text-xs flex-1">
                        {SYSTEM_SKILLS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <button onClick={() => removeSystemSkill(i)} className="text-err/60 hover:text-err text-xs px-2">x</button>
                    </div>
                    <p className="text-txt-dim/70 text-[11px]">{skill?.short || 'Skill desconhecida.'}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <select value={entry.sourceAbilityIndex ?? ''} onChange={e => updateSystemSkill(i, { sourceAbilityIndex: e.target.value === '' ? null : Number(e.target.value) })}
                        className="admin-input text-xs">
                        <option value="">Sem passiva vinculada</option>
                        {(data.habilidades || []).map((h, hi) => <option key={hi} value={hi}>{hi + 1}. {h.nome || h.tipo}</option>)}
                      </select>
                      <input type="text" value={entry.notes || ''} onChange={e => updateSystemSkill(i, { notes: e.target.value })}
                        className="admin-input text-xs" placeholder="Notas do mestre" />
                    </div>

                    <div className="border-t border-sky-300/10 pt-2 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sky-300/60 text-[9px] uppercase tracking-wider">Efeitos ({effects.length})</span>
                        {addableTypes.length > 0 && (
                          <select onChange={e => { if (e.target.value) { addSkillEffect(i, e.target.value); e.target.value = '' } }}
                            className="admin-input !text-[10px] !py-0.5 w-auto">
                            <option value="">+ Efeito...</option>
                            {addableTypes.map(t => <option key={t} value={t}>{EFFECT_PARAM_DEFS[t]?.label || t}</option>)}
                          </select>
                        )}
                      </div>
                      {effects.length === 0 && (
                        <p className="text-txt-dim/35 text-[10px] italic">Nenhum efeito configurado.</p>
                      )}
                      {effects.map((effect, ei) => {
                        const def = EFFECT_PARAM_DEFS[effect.type]
                        if (!def) return null
                        return (
                          <div key={ei} className="rounded border border-sep/20 bg-void/30 p-2 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-txt-dim text-[10px] font-medium">{def.label}</span>
                              <button onClick={() => removeSkillEffect(i, ei)} className="text-err/50 hover:text-err text-[10px]">x</button>
                            </div>
                            {Object.entries(def.params).map(([pKey, pDef]) => {
                              if (pDef.type === 'select') {
                                return (
                                  <div key={pKey} className="flex items-center gap-1.5">
                                    <label className="text-txt-dim/50 text-[9px] w-28 shrink-0">{pDef.label}</label>
                                    <select value={effect[pKey] ?? pDef.default} onChange={e => updateSkillEffect(i, ei, { [pKey]: e.target.value })}
                                      className="admin-input !text-[10px] !py-1 flex-1 !bg-[#11141c] !text-txt-main !border-sky-300/25">
                                      {(pDef.options || []).map(o => <option key={o.value} value={o.value} className="bg-[#11141c] text-txt-main">{o.label}</option>)}
                                    </select>
                                  </div>
                                )
                              }
                              if (pDef.type === 'number') {
                                return (
                                  <div key={pKey} className="flex items-center gap-1.5">
                                    <label className="text-txt-dim/50 text-[9px] w-28 shrink-0">{pDef.label}</label>
                                    <input type="number" value={effect[pKey] ?? pDef.default}
                                      min={pDef.min} max={pDef.max}
                                      onChange={e => updateSkillEffect(i, ei, { [pKey]: e.target.value === '' ? '' : Number(e.target.value) })}
                                      className="admin-input !text-[10px] !py-0.5 flex-1 text-center" />
                                  </div>
                                )
                              }
                              return (
                                <div key={pKey} className="flex items-center gap-1.5">
                                  <label className="text-txt-dim/50 text-[9px] w-28 shrink-0">{pDef.label}</label>
                                  <input type="text" value={effect[pKey] ?? pDef.default ?? ''}
                                    onChange={e => updateSkillEffect(i, ei, { [pKey]: e.target.value })}
                                    className="admin-input !text-[10px] !py-0.5 flex-1" />
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="space-y-2">
              <select onChange={e => { if (e.target.value) { assignSystemSkill(e.target.value); e.target.value = '' } }} className="admin-input text-xs">
                <option value="">Atribuir Skill...</option>
                {SYSTEM_SKILL_CATEGORIES.map(cat => (
                  <optgroup key={cat.id} label={cat.label}>
                    {SYSTEM_SKILLS.filter(s => s.category === cat.id).map(skill => <option key={skill.id} value={skill.id}>{skill.name}</option>)}
                  </optgroup>
                ))}
              </select>
              {summarizeSystemSkillBonuses(data).length > 0 && (
                <div className="rounded-lg border border-emerald-300/15 bg-emerald-300/5 p-2 space-y-1">
                  {summarizeSystemSkillBonuses(data).map((line, i) => (
                    <p key={i} className="text-emerald-300/80 text-[10px]">{line}</p>
                  ))}
                </div>
              )}
            </div>
          </div>

          {(data.systemSkillNotifications || []).filter(n => n.status !== 'closed').length > 0 && (
            <div className="space-y-2 border-t border-sep/20 pt-3">
              <h5 className="text-warn text-[10px] uppercase tracking-wider">Notificacoes abertas</h5>
              {(data.systemSkillNotifications || []).filter(n => n.status !== 'closed').map(notice => (
                <div key={notice.id} className="rounded-lg border border-warn/20 bg-warn/5 p-2">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-txt-main text-xs font-semibold">{notice.title}</p>
                      <p className="text-txt-dim/75 text-[11px] mt-0.5">{notice.message}</p>
                      {notice.suggestedEffects && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {notice.suggestedEffects.map((ef, ei) => (
                            <span key={ei} className="text-[8px] bg-sky-300/10 text-sky-300 px-1 py-0.5 rounded border border-sky-300/20">
                              {EFFECT_PARAM_DEFS[ef.type]?.label || ef.type}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => { assignSystemSkill(notice.skillId, notice.abilityIndex, notice.suggestedEffects); closeSystemNotice(notice.id) }} className="text-[10px] bg-gold text-void px-2 py-1 rounded font-semibold">Atribuir</button>
                    <button onClick={() => closeSystemNotice(notice.id)} className="text-[10px] border border-err/25 text-err px-2 py-1 rounded">Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard id="inventario" icon="🎒" title="Inventário" color="bg-teal-400">
          {(data.inventario || []).map((item, i) => (
            <div key={i} className="flex gap-2 items-start">
              <input type="text" value={item.nome || ''} onChange={e => updateInvItem(i, { nome: e.target.value })}
                placeholder="Nome" className="flex-1 admin-input text-xs" />
              <input type="number" value={item.quantidade || 1} onChange={e => updateInvItem(i, { quantidade: Number(e.target.value) || 1 })}
                className="w-16 admin-input text-xs text-center" />
              <button onClick={() => removeInvItem(i)} className="text-err/60 hover:text-err text-xs px-2 mt-2 transition-colors">✕</button>
            </div>
          ))}
          <button onClick={addInvItem} className="text-gold/60 hover:text-gold text-xs transition-colors">+ Item</button>
        </SectionCard>

        <SectionCard id="equipamentos" icon="🗡" title="Equipamentos" color="bg-orange-400">
          <p className="text-txt-dim/50 text-[10px] leading-relaxed">Equipamentos criados pelo jogador. Remova itens indesejados aqui.</p>
          {(data.equipamentos || []).length === 0 && (
            <p className="text-txt-dim/40 text-xs italic">Nenhum equipamento</p>
          )}
          {(data.equipamentos || []).map((eq, i) => {
            const eqRc = RANK_COLORS[eq.rank] || RANK_COLORS.Comum
            return (
              <div key={eq.id || i} className={`rounded-lg border ${eqRc.border} bg-void/40 p-3 space-y-2`}>
                <div className="flex items-center gap-2">
                  <input type="text" value={eq.nome || ''} onChange={e => updateEquipItem(i, { nome: e.target.value })}
                    className="flex-1 admin-input text-xs" placeholder="Nome" />
                  <select value={eq.rank || 'Comum'} onChange={e => updateEquipItem(i, { rank: e.target.value })}
                    className="admin-input text-xs w-32">
                    {WEAPON_RANKS.map(r => <option key={r.rank} value={r.rank}>{r.rank}</option>)}
                  </select>
                  <button onClick={() => removeEquipItem(i)} className="text-err/60 hover:text-err text-xs px-2 transition-colors">✕</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={eq.dano || ''} onChange={e => updateEquipItem(i, { dano: e.target.value })}
                    className="admin-input text-xs" placeholder="Dano" />
                  <input type="text" value={eq.efeitos || ''} onChange={e => updateEquipItem(i, { efeitos: e.target.value })}
                    className="admin-input text-xs" placeholder="Efeitos" />
                </div>
                <textarea value={eq.descricao || ''} onChange={e => updateEquipItem(i, { descricao: e.target.value })}
                  rows={2} placeholder="Descrição" className="admin-input text-xs resize-none" />
                {(eq.habilidades || []).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {(eq.habilidades || []).map((h, hi) => (
                      <span key={hi} className="text-[9px] bg-sep/20 text-txt-dim px-1.5 py-0.5 rounded">{h.nome || 'Hab'} ({h.potencia})</span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          {(data.equipamentos || []).length > 0 && (
            <button onClick={() => setData(prev => ({ ...prev, equipamentos: [] }))}
              className="text-[10px] text-err/50 hover:text-err transition-colors">Limpar todos</button>
          )}
        </SectionCard>

        <SectionCard id="lendarias" icon="★" title="Armas Lendárias" color="bg-lime-300">
          <p className="text-txt-dim/50 text-[10px] leading-relaxed">Atribua armas lendárias da biblioteca a este personagem. Apenas o Mestre pode conceder essas armas.</p>

          {(data.armasLendarias || []).length > 0 && (
            <div className="space-y-1.5">
              <h6 className="text-amber-400 text-[10px] uppercase tracking-wider">Atribuídas</h6>
              {(data.armasLendarias || []).map((lw, i) => (
                <div key={lw.id || i} className="bg-lime-300/5 border border-lime-300/20 rounded-lg px-3 py-2 flex items-center gap-2">
                  <span className="text-lime-300 text-sm">★</span>
                  <span className="text-txt-main text-xs font-semibold">{lw.name}</span>
                  <span className="text-[9px] bg-lime-300/10 text-lime-300 px-1.5 py-0.5 rounded border border-lime-300/20">{lw.rank}</span>
                  <button onClick={() => removeLegendary(i)} className="text-err/50 hover:text-err text-[10px] ml-auto">✕</button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <h6 className="text-txt-dim/60 text-[10px] uppercase tracking-wider">Biblioteca</h6>
            {(() => {
              const allLegendary = [
                ...LEGENDARY_WEAPONS.filter(lw => !(data.armasLendarias || []).some(a => a.id === lw.id)).map(lw => ({ ...lw, _source: 'static' })),
                ...forgeWeapons.filter(fw => !(data.armasLendarias || []).some(a => a.id === fw.id)).map(fw => ({
                  id: fw.id,
                  name: fw.name,
                  tipo: fw.range || fw.law_name || 'Forja Lendária',
                  descricao: fw.short_description || fw.effect || '',
                  _source: 'forge',
                })),
              ]
              return allLegendary.length === 0 ? (
                <p className="text-txt-dim/40 text-[10px] italic">Nenhuma arma lendária disponível para atribuir</p>
              ) : allLegendary.map(item => (
                <div key={item.id} className="bg-void/40 border border-sep/20 rounded-lg px-3 py-2 flex items-center gap-2 hover:border-lime-300/30 transition-colors">
                  <span className="text-amber-400/60 text-sm">★</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-txt-main text-xs font-semibold">{item.name}</span>
                    <span className="text-[9px] text-txt-dim ml-1">({item.tipo})</span>
                    {item._source === 'forge' && <span className="text-[8px] bg-lime-300/10 text-lime-300 px-1 py-0.5 rounded ml-1">Forja</span>}
                  </div>
                  <button onClick={() => assignLegendary(item.id)}
                    className="text-[10px] bg-amber-400/10 text-amber-400 px-2 py-0.5 rounded border border-amber-400/20 hover:bg-amber-400/20 transition-colors">
                    + Atribuir
                  </button>
                </div>
              ))
            })()}
          </div>
        </SectionCard>

        <SectionCard id="notas" icon="📝" title="Notas" color="bg-gray-400">
          <textarea value={data.notas || ''} onChange={e => up('notas', e.target.value)}
            rows={4} className="admin-input text-sm resize-none" />
        </SectionCard>

        <details id="section-json" className="bg-gradient-to-br from-deep/95 to-deep/70 backdrop-blur-sm border border-sep/30 rounded-xl overflow-hidden shadow-lg shadow-black/20 transition-all duration-300 hover:border-sep/50">
          <summary className="flex items-center gap-2.5 px-5 py-3 border-b border-sep/15 bg-gradient-to-r from-void/50 via-void/30 to-transparent cursor-pointer hover:bg-void/20 transition-colors list-none">
            <div className="w-1.5 h-5 rounded-full shrink-0 bg-sep" />
            <span className="text-txt-dim text-sm">{'{ }'}</span>
            <h3 className="font-cinzel text-txt-dim text-[11px] uppercase tracking-[0.15em] font-semibold whitespace-nowrap">JSON Bruto</h3>
            <div className="flex-1 h-px bg-gradient-to-r from-sep/40 to-transparent" />
            <span className="text-txt-dim/30 text-[10px]">▼</span>
          </summary>
          <div className="p-5">
            <pre className="text-[9px] text-txt-dim/70 overflow-x-auto max-h-60 overflow-y-auto bg-void/60 rounded-lg p-4 border border-sep/20">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </details>

        <div className="flex gap-3 pt-2 border-t border-sep/20">
          <button onClick={() => onSave({ ...sheet, data })} className="bg-gold text-void text-xs px-5 py-2 rounded-lg font-semibold hover:bg-gold-light transition-colors shadow-md shadow-gold/10">
            Salvar Alterações
          </button>
          <button onClick={onCancel} className="text-txt-dim text-xs px-4 py-2 rounded-lg border border-sep/30 hover:text-txt-main hover:border-sep/50 transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
