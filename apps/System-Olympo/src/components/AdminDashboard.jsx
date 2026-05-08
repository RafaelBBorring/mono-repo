import { useState, useEffect } from 'react'
import { getSupabaseAdmin } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
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

export default function AdminDashboard({ initialTab = 'sheets', onViewSheet }) {
  const { profile } = useAuth()
  const [tab, setTab] = useState(initialTab)
  const [sheets, setSheets] = useState([])
  const [users, setUsers] = useState([])
  const [filterUser, setFilterUser] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedSheet, setExpandedSheet] = useState(null)
  const [editingSheet, setEditingSheet] = useState(null)
  const [forgeWeapons, setForgeWeapons] = useState([])

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    fetchMysticWeapons().then(res => {
      setForgeWeapons(res.data || [])
    })
  }, [])

  useEffect(() => {
    setTab(initialTab)
    setExpandedSheet(null)
    setEditingSheet(null)
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

  const filteredSheets = filterUser ? sheets.filter(s => s.user_id === filterUser) : sheets

  function getUserName(uid) {
    const u = users.find(p => p.id === uid)
    return u?.display_name || uid?.slice(0, 8) || '?'
  }

  function countAbilitiesByStatus(data, status) {
    if (!data) return 0
    return (data.habilidades || []).filter(h => h.status === status).length
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
      : { id: fw.id, name: fw.name, rank: 'Lendária', tipo: fw.range || fw.law_name || 'Forja Lendária', source: 'forge' }
    await handlePatch(sheet, { armasLendarias: [...existing, entry] })
  }

  if (loading) return <p className="text-txt-dim p-8 animate-pulse">Carregando painel admin...</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="section-header text-primary mb-0 flex-1">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>admin_panel_settings</span>
          Painel Administrativo
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {[
            { key: 'sheets', label: 'Fichas' },
            { key: 'abilities', label: 'Habilidades' },
            { key: 'grimoire', label: 'Grimório' },
            { key: 'mysticWeapons', label: 'Forja Lendária' },
            { key: 'users', label: 'Usuários' },
          ].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setExpandedSheet(null); setEditingSheet(null) }}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${tab === t.key ? 'bg-primary text-on-primary font-semibold' : 'text-on-surface-variant hover:text-on-surface'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'sheets' && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center">
            <label className="text-txt-dim text-sm">Filtrar:</label>
            <select value={filterUser} onChange={e => setFilterUser(e.target.value)}
              className="bg-void border border-sep rounded px-3 py-1.5 text-sm text-txt-main">
              <option value="">Todos</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}
            </select>
            <span className="text-txt-dim text-xs">{filteredSheets.length} ficha(s)</span>
          </div>
          <div className="grid gap-3">
            {filteredSheets.map(sheet => {
              const isExpanded = expandedSheet === sheet.id
              const isEditing = editingSheet === sheet.id
              return (
                <div key={sheet.id} className="bg-deep border border-sep rounded-lg overflow-hidden">
                  <div className="p-3 flex items-center justify-between cursor-pointer hover:bg-void/30 transition-colors"
                    onClick={() => { setExpandedSheet(isExpanded ? null : sheet.id); setEditingSheet(null) }}>
                    <div className="flex items-center gap-3">
                      {sheet.data?.avatar ? (
                        <img src={sheet.data.avatar} alt="" className="w-10 h-10 rounded-full border border-gold/40 object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full border border-sep bg-void flex items-center justify-center text-txt-dim text-xs">?</div>
                      )}
                      <div>
                        <h4 className="text-txt-main text-sm font-semibold">{sheet.name}</h4>
                        <p className="text-txt-dim text-xs">{sheet.data?.classe || '?'} — Nv {sheet.data?.nivel || 1} · por {getUserName(sheet.user_id)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5 text-[9px]">
                        <span className="bg-warn/10 text-warn px-1.5 py-0.5 rounded">{countAbilitiesByStatus(sheet.data, 'Pendente')} pend.</span>
                        <span className="bg-ok/10 text-ok px-1.5 py-0.5 rounded">{countAbilitiesByStatus(sheet.data, 'Aprovada')} ok</span>
                        <span className="bg-err/10 text-err px-1.5 py-0.5 rounded">{countAbilitiesByStatus(sheet.data, 'Revisão necessária')} rev.</span>
                      </div>
                      <span className="text-txt-dim/50 text-xs">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-sep/30 p-4 space-y-4">
                      {isEditing ? (
                        <FullSheetEditor sheet={sheet} onSave={handleSaveSheet} onCancel={() => setEditingSheet(null)} forgeWeapons={forgeWeapons} />
                      ) : (
                        <>
                          <AdminSheetView sheet={sheet} onPatch={handlePatch} />
                          <div className="flex gap-2 pt-2 border-t border-sep/30">
                            {onViewSheet && (
                              <button onClick={() => onViewSheet(sheet.id)} className="text-xs border border-secondary-fixed-dim/40 text-secondary-fixed-dim px-3 py-1.5 rounded hover:bg-secondary-fixed-dim hover:text-on-primary transition-colors">
                                Ver Ficha
                              </button>
                            )}
                            <button onClick={() => setEditingSheet(sheet.id)} className="text-xs border border-primary/40 text-primary px-3 py-1.5 rounded hover:bg-primary hover:text-on-primary transition-colors">
                              Editar Ficha Completa
                            </button>
                            <button onClick={() => handleDeleteSheet(sheet.id)} className="text-xs border border-err/30 text-err px-3 py-1.5 rounded hover:bg-err hover:text-white transition-colors">
                              Excluir
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'abilities' && (
        <div className="space-y-4">
          <h3 className="text-txt-main text-sm font-semibold">Habilidades Pendentes / Em Revisão</h3>
          <div className="grid gap-3">
            {sheets.filter(s => {
              const p = countAbilitiesByStatus(s.data, 'Pendente')
              const r = countAbilitiesByStatus(s.data, 'Revisão necessária')
              return p > 0 || r > 0
            }).map(sheet => {
              const isExpanded = expandedSheet === sheet.id
              const isEditing = editingSheet === sheet.id
              return (
                <div key={sheet.id} className="bg-deep border border-sep rounded-lg overflow-hidden">
                  <div className="p-3 flex items-center justify-between cursor-pointer hover:bg-void/30 transition-colors"
                    onClick={() => { setExpandedSheet(isExpanded ? null : sheet.id); setEditingSheet(null) }}>
                    <div className="flex items-center gap-3">
                      <div>
                        <h4 className="text-txt-main text-sm font-semibold">{sheet.name}</h4>
                        <p className="text-txt-dim text-xs">{sheet.data?.classe || '?'} · por {getUserName(sheet.user_id)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5 text-[9px]">
                        <span className="bg-warn/10 text-warn px-1.5 py-0.5 rounded">{countAbilitiesByStatus(sheet.data, 'Pendente')} pend.</span>
                        <span className="bg-err/10 text-err px-1.5 py-0.5 rounded">{countAbilitiesByStatus(sheet.data, 'Revisão necessária')} rev.</span>
                      </div>
                      <span className="text-txt-dim/50 text-xs">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-sep/30 p-4 space-y-4">
                      {isEditing ? (
                        <FullSheetEditor sheet={sheet} onSave={handleSaveSheet} onCancel={() => setEditingSheet(null)} forgeWeapons={forgeWeapons} />
                      ) : (
                        <>
                          <AdminSheetView sheet={sheet} onPatch={handlePatch} />
                          <div className="flex gap-2 pt-2 border-t border-sep/30">
                            <button onClick={() => setEditingSheet(sheet.id)} className="text-xs border border-gold/40 text-gold px-3 py-1.5 rounded hover:bg-gold hover:text-void transition-colors">
                              Editar Ficha
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            {sheets.filter(s => countAbilitiesByStatus(s.data, 'Pendente') + countAbilitiesByStatus(s.data, 'Revisão necessária') > 0).length === 0 && (
              <p className="text-txt-dim/50 text-xs italic">Todas as habilidades foram revisadas!</p>
            )}
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-4">
          <h3 className="text-txt-main text-sm font-semibold">Usuários Cadastrados</h3>
          <div className="grid gap-2">
            {users.map(u => {
              const userSheets = sheets.filter(s => s.user_id === u.id)
              return (
                <div key={u.id} className="bg-deep border border-sep rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${u.role === 'admin' ? 'bg-gold/20 text-gold border border-gold/30' : 'bg-sep/30 text-txt-dim'}`}>
                      {u.display_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <span className="text-txt-main text-sm">{u.display_name}</span>
                      <span className={`text-[9px] ml-2 px-1.5 py-0.5 rounded ${u.role === 'admin' ? 'bg-gold/10 text-gold border border-gold/20' : 'bg-sep/20 text-txt-dim'}`}>
                        {u.role}
                      </span>
                    </div>
                  </div>
                  <span className="text-txt-dim text-xs">{userSheets.length} ficha(s)</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'grimoire' && <GrimoireAdminPage />}
      {tab === 'alchemy' && <AlchemyAdminPanel />}
      {tab === 'spells' && <SpellAdminPanel />}
      {tab === 'runes' && <RuneAdminPanel />}
      {tab === 'magic' && <MagicAdminPanel />}
      {tab === 'mysticWeapons' && <MysticWeaponAdminPanel />}
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
      : { id: fw.id, name: fw.name, rank: 'Lendária', tipo: fw.range || fw.law_name || 'Forja Lendária', source: 'forge' }
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
                    {[0,1,2,3,4].map(g => <option key={g} value={g}>{g === 0 ? '—' : GRAU_NAMES[g]}</option>)}
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
