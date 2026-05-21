import { useState, useEffect, useCallback, useRef } from 'react'
import { getSupabaseAdmin } from '../lib/supabase'
import { calcVidaTotal, calcEnergiaTotal, calcPeTotal, calcCA, calcReacoes } from '../utils/calculator'
import { getRaceLabel } from '../utils/raceCalculator'
import SessionSheetModal from './SessionSheetModal'

const LEVEL_TIERS = [
  { min: 1, max: 8, label: 'Novato', color: '#60a5fa', glow: 'rgba(96,165,250,0.25)', border: 'border-sky-400/40', bg: 'bg-sky-400/10', text: 'text-sky-400', bar: 'bg-sky-400' },
  { min: 9, max: 16, label: 'Veterano', color: '#f7bd48', glow: 'rgba(247,189,72,0.25)', border: 'border-primary/40', bg: 'bg-primary/10', text: 'text-primary', bar: 'bg-primary' },
  { min: 17, max: 24, label: 'Elite', color: '#c084fc', glow: 'rgba(192,132,252,0.25)', border: 'border-purple-400/40', bg: 'bg-purple-400/10', text: 'text-purple-400', bar: 'bg-purple-400' },
  { min: 25, max: 30, label: 'Lendário', color: '#f87171', glow: 'rgba(248,113,113,0.3)', border: 'border-rose-400/40', bg: 'bg-rose-400/10', text: 'text-rose-400', bar: 'bg-rose-400' },
]

function getLevelTier(level) {
  return LEVEL_TIERS.find(t => level >= t.min && level <= t.max) || LEVEL_TIERS[0]
}

function getDerivedStats(char) {
  const sk = char.skeletonPoints || {}
  const cls = char.classe
  if (!cls) return { vida: 0, energia: 0, pe: 0, ca: 0, reacoes: 0 }
  return {
    vida: calcVidaTotal(cls, char.nivel, char.atributos, sk, char.choices, char.triagemPrincipal, char.triagemPrincipalNivel, char, char.subTriagem, char.subTriagemNivel),
    energia: calcEnergiaTotal(cls, char.nivel, char.atributos, sk, char.choices, char.triagemPrincipal, char.triagemPrincipalNivel, char.subTriagem, char.subTriagemNivel, char),
    pe: calcPeTotal(cls, char.nivel, char.choices, char),
    ca: calcCA(char.atributos, sk, char.pericias, char),
    reacoes: calcReacoes(char.atributos, sk, char.triagemPrincipal, char.triagemPrincipalNivel, char.subTriagem, char.subTriagemNivel, char),
  }
}

function getInitial(name) {
  return (name || '?').charAt(0).toUpperCase()
}

const RESOURCE_CONFIG = {
  vida: { label: 'Vida', field: 'vidaAtual', color: 'bg-resource-vida', trackBg: 'bg-resource-vida/15', textColor: 'text-resource-vida', icon: 'favorite' },
  energia: { label: 'Energia', field: 'energiaAtual', color: 'bg-resource-energia', trackBg: 'bg-resource-energia/15', textColor: 'text-resource-energia', icon: 'bolt' },
  pe: { label: 'PE', field: 'peAtual', color: 'bg-resource-pe', trackBg: 'bg-resource-pe/15', textColor: 'text-resource-pe', icon: 'diamond' },
}

const SESSION_STORAGE_KEY = 'olympo_session_selected_ids'

export default function SessionTracker({ onViewSheet }) {
  const [allSheets, setAllSheets] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [showPicker, setShowPicker] = useState(false)
  const [selectedSheet, setSelectedSheet] = useState(null)
  const [adjustingField, setAdjustingField] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [pickerSearch, setPickerSearch] = useState('')
  const inputRef = useRef(null)
  const debounceTimers = useRef({})

  useEffect(() => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(selectedIds))
  }, [selectedIds])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (adjustingField && inputRef.current) {
      inputRef.current.select()
    }
  }, [adjustingField])

  async function loadData() {
    try {
      const [sheetsRes, profilesRes] = await Promise.all([
        getSupabaseAdmin().from('characters').select('*').order('updated_at', { ascending: false }),
        getSupabaseAdmin().from('profiles').select('*'),
      ])
      setAllSheets(sheetsRes.data || [])
      setUsers(profilesRes.data || [])
      setLoading(false)
    } catch (err) {
      console.error('SessionTracker loadData:', err)
      setLoading(false)
    }
  }

  const getUserName = useCallback((uid) => {
    const u = users.find(p => p.id === uid)
    return u?.display_name || uid?.slice(0, 8) || '?'
  }, [users])

  async function adjustResource(sheet, resourceKey, delta) {
    const char = sheet.data || {}
    const derived = getDerivedStats(char)
    const max = derived[resourceKey]
    const cfg = RESOURCE_CONFIG[resourceKey]
    const current = char[cfg.field] ?? max
    const next = Math.max(0, Math.min(max, current + delta))

    const nextData = { ...char, [cfg.field]: next }
    setAllSheets(prev => prev.map(s => s.id === sheet.id ? { ...s, data: nextData } : s))

    if (debounceTimers.current[sheet.id]) clearTimeout(debounceTimers.current[sheet.id])
    debounceTimers.current[sheet.id] = setTimeout(async () => {
      await getSupabaseAdmin()
        .from('characters')
        .update({ data: nextData, updated_at: new Date().toISOString() })
        .eq('id', sheet.id)
    }, 400)
  }

  async function setResourceExact(sheet, resourceKey, value) {
    const char = sheet.data || {}
    const derived = getDerivedStats(char)
    const max = derived[resourceKey]
    const cfg = RESOURCE_CONFIG[resourceKey]
    const next = Math.max(0, Math.min(max, Math.round(Number(value) || 0)))

    const nextData = { ...char, [cfg.field]: next }
    setAllSheets(prev => prev.map(s => s.id === sheet.id ? { ...s, data: nextData } : s))

    await getSupabaseAdmin()
      .from('characters')
      .update({ data: nextData, updated_at: new Date().toISOString() })
      .eq('id', sheet.id)
    setAdjustingField(null)
  }

  async function resetResource(sheet, resourceKey) {
    const char = sheet.data || {}
    const cfg = RESOURCE_CONFIG[resourceKey]
    const nextData = { ...char, [cfg.field]: null }
    setAllSheets(prev => prev.map(s => s.id === sheet.id ? { ...s, data: nextData } : s))

    await getSupabaseAdmin()
      .from('characters')
      .update({ data: nextData, updated_at: new Date().toISOString() })
      .eq('id', sheet.id)
  }

  function toggleSheet(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function selectAll() {
    setSelectedIds(allSheets.map(s => s.id))
  }

  function clearSelection() {
    setSelectedIds([])
  }

  const sessionSheets = allSheets.filter(s => selectedIds.includes(s.id))

  const filteredSessionSheets = searchTerm
    ? sessionSheets.filter(s => {
        const name = (s.name || s.data?.nome || '').toLowerCase()
        const race = (s.data?.raca || '').toLowerCase()
        const cls = (s.data?.classe || '').toLowerCase()
        const term = searchTerm.toLowerCase()
        return name.includes(term) || race.includes(term) || cls.includes(term)
      })
    : sessionSheets

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <span className="material-symbols-outlined text-primary text-4xl animate-spin block mb-3">sync</span>
          <p className="text-txt-dim text-sm animate-pulse">Carregando fichas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}>campaign</span>
          </div>
          <div>
            <h2 className="font-cinzel text-on-surface text-lg tracking-wide">Sessão Ativa</h2>
            <p className="text-txt-dim text-xs">{sessionSheets.length} personagen(s) na mesa · {allSheets.length} total(is)</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial sm:w-48">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-txt-dim text-sm">search</span>
            <input
              type="text"
              placeholder="Buscar na mesa..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-void border border-sep rounded-lg pl-9 pr-3 py-2 text-sm text-txt-main placeholder:text-txt-dim/50 focus:border-primary/40 transition-colors"
            />
          </div>
          <button
            onClick={() => setShowPicker(true)}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-primary/10 border border-primary/30 rounded-lg text-primary text-sm hover:bg-primary/20 transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>group_add</span>
            <span className="hidden sm:inline">Mesa</span>
            {sessionSheets.length > 0 && (
              <span className="bg-primary text-on-primary text-[10px] font-mono font-bold rounded-full w-5 h-5 flex items-center justify-center">{sessionSheets.length}</span>
            )}
          </button>
        </div>
      </div>

      {sessionSheets.length === 0 ? (
        <div className="glass-card text-center py-16">
          <span className="material-symbols-outlined text-5xl text-txt-dim/20 block mb-4">group_off</span>
          <p className="text-txt-dim text-sm mb-1">Nenhum personagem na mesa.</p>
          <p className="text-txt-dim/50 text-xs mb-6">Selecione os jogadores que participarão desta sessão.</p>
          <button
            onClick={() => setShowPicker(true)}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary/10 border border-primary/30 rounded-lg text-primary text-sm hover:bg-primary/20 transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>group_add</span>
            Selecionar Personagens
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredSessionSheets.map(sheet => (
            <SessionCard
              key={sheet.id}
              sheet={sheet}
              getUserName={getUserName}
              onAdjust={adjustResource}
              onSetExact={setResourceExact}
              onReset={resetResource}
              onViewDetails={() => setSelectedSheet(sheet)}
              adjustingField={adjustingField}
              onAdjustingField={setAdjustingField}
              inputRef={inputRef}
              onRemove={() => toggleSheet(sheet.id)}
            />
          ))}
        </div>
      )}

      {showPicker && (
        <PickerModal
          allSheets={allSheets}
          selectedIds={selectedIds}
          getUserName={getUserName}
          pickerSearch={pickerSearch}
          setPickerSearch={setPickerSearch}
          onToggle={toggleSheet}
          onSelectAll={selectAll}
          onClear={clearSelection}
          onClose={() => setShowPicker(false)}
        />
      )}

      {selectedSheet && (
        <SessionSheetModal
          sheet={selectedSheet}
          getUserName={getUserName}
          onClose={() => setSelectedSheet(null)}
          onViewSheet={onViewSheet}
        />
      )}
    </div>
  )
}

function PickerModal({ allSheets, selectedIds, getUserName, pickerSearch, setPickerSearch, onToggle, onSelectAll, onClear, onClose }) {
  const filtered = pickerSearch
    ? allSheets.filter(s => {
        const name = (s.name || s.data?.nome || '').toLowerCase()
        const race = (s.data?.raca || '').toLowerCase()
        const cls = (s.data?.classe || '').toLowerCase()
        const player = getUserName(s.user_id).toLowerCase()
        const term = pickerSearch.toLowerCase()
        return name.includes(term) || race.includes(term) || cls.includes(term) || player.includes(term)
      })
    : allSheets

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = '' }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xl max-h-[80vh] bg-deep border border-sep/50 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'modalIn 0.2s ease-out' }}
      >
        <style>{`@keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}</style>

        <div className="flex items-center justify-between p-4 border-b border-sep/30">
          <div>
            <h3 className="font-cinzel text-on-surface text-base">Montar Mesa</h3>
            <p className="text-txt-dim text-[10px] mt-0.5">{selectedIds.length} de {allSheets.length} selecionado(s)</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-void/80 border border-sep/50 flex items-center justify-center text-txt-dim hover:text-err transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
          </button>
        </div>

        <div className="p-3 border-b border-sep/20 space-y-2">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-txt-dim text-sm">search</span>
            <input
              type="text"
              placeholder="Buscar por nome, raça, classe ou jogador..."
              value={pickerSearch}
              onChange={e => setPickerSearch(e.target.value)}
              className="w-full bg-void border border-sep rounded-lg pl-9 pr-3 py-2 text-sm text-txt-main placeholder:text-txt-dim/50 focus:border-primary/40 transition-colors"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button onClick={onSelectAll} className="text-[10px] text-primary/70 hover:text-primary transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>select_all</span> Selecionar todos
            </button>
            <button onClick={onClear} className="text-[10px] text-txt-dim/50 hover:text-err transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>deselect</span> Limpar seleção
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {filtered.length === 0 ? (
            <p className="text-txt-dim/50 text-xs text-center py-8">Nenhum personagem encontrado.</p>
          ) : (
            filtered.map(sheet => {
              const char = sheet.data || {}
              const level = char.nivel || 1
              const tier = getLevelTier(level)
              const isSelected = selectedIds.includes(sheet.id)
              return (
                <button
                  key={sheet.id}
                  onClick={() => onToggle(sheet.id)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left ${
                    isSelected
                      ? 'bg-primary/10 border-primary/30 hover:bg-primary/15'
                      : 'bg-void/40 border-sep/20 hover:border-sep/40 hover:bg-void/60'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? 'bg-primary border-primary' : 'border-sep/50'
                  }`}>
                    {isSelected && <span className="material-symbols-outlined text-on-primary" style={{ fontSize: '14px' }}>check</span>}
                  </div>
                  {char.avatar ? (
                    <img src={char.avatar} alt="" className="w-8 h-8 rounded object-cover border border-sep/40 shrink-0" />
                  ) : (
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center text-xs font-cinzel border shrink-0"
                      style={{ borderColor: tier.color + '40', color: tier.color, background: tier.color + '10' }}
                    >
                      {getInitial(char.nome || sheet.name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm truncate ${isSelected ? 'text-on-surface font-semibold' : 'text-on-surface-variant'}`}>
                      {char.nome || sheet.name || 'Sem nome'}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-txt-dim">
                      <span>{char.raca ? getRaceLabel(char) : '—'}</span>
                      <span className="text-sep">·</span>
                      <span>{char.classe || '—'}</span>
                      <span className="text-sep">·</span>
                      <span>Nv {level}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[9px] text-txt-dim/50">{getUserName(sheet.user_id)}</p>
                  </div>
                </button>
              )
            })
          )}
        </div>

        <div className="flex items-center justify-between p-4 border-t border-sep/30 bg-void/50">
          <span className="text-[10px] text-txt-dim">{selectedIds.length} personagen(s) selecionado(s)</span>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-5 py-2 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check</span>
            Iniciar Sessão
          </button>
        </div>
      </div>
    </div>
  )
}

function ResourceBar({ label, current, max, color, trackBg, textColor, icon, onMinus, onPlus, onReset, onExact, isAdjusting, inputRef }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (current / max) * 100)) : 0
  const isLow = pct > 0 && pct <= 25
  const isCritical = pct > 0 && pct <= 10

  return (
    <div className={`rounded-lg p-2.5 ${trackBg} border border-sep/30`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className={`material-symbols-outlined text-sm ${textColor}`} style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}>{icon}</span>
          <span className="text-xs text-txt-dim uppercase tracking-wider">{label}</span>
        </div>
        {isAdjusting ? (
          <input
            ref={inputRef}
            type="number"
            defaultValue={current}
            onBlur={e => onExact(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onExact(e.target.value); if (e.key === 'Escape') onExact(current) }}
            className="w-16 bg-void border border-primary/40 rounded px-2 py-0.5 text-xs text-on-surface font-mono text-right"
          />
        ) : (
          <button
            onClick={() => onExact(null)}
            className={`font-mono text-xs ${isCritical ? 'text-err animate-pulse' : isLow ? 'text-warn' : textColor} hover:underline cursor-pointer`}
            title="Clique para editar valor exato"
          >
            {current}/{max}
          </button>
        )}
      </div>
      <div className="h-2.5 bg-void/60 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${isCritical ? 'bg-err animate-pulse' : isLow ? 'bg-warn' : color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMinus(5)}
            className="w-6 h-6 rounded bg-void/80 border border-sep/50 flex items-center justify-center text-txt-dim hover:text-err hover:border-err/40 transition-colors text-xs font-mono"
          >
            -5
          </button>
          <button
            onClick={() => onMinus(1)}
            className="w-6 h-6 rounded bg-void/80 border border-sep/50 flex items-center justify-center text-txt-dim hover:text-err hover:border-err/40 transition-colors text-xs"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>remove</span>
          </button>
          <button
            onClick={() => onPlus(1)}
            className="w-6 h-6 rounded bg-void/80 border border-sep/50 flex items-center justify-center text-txt-dim hover:text-ok hover:border-ok/40 transition-colors text-xs"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
          </button>
          <button
            onClick={() => onPlus(5)}
            className="w-6 h-6 rounded bg-void/80 border border-sep/50 flex items-center justify-center text-txt-dim hover:text-ok hover:border-ok/40 transition-colors text-xs font-mono"
          >
            +5
          </button>
        </div>
        <button
          onClick={onReset}
          className="text-[9px] text-txt-dim/50 hover:text-primary transition-colors"
          title="Restaurar máximo"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>refresh</span>
        </button>
      </div>
    </div>
  )
}

function SessionCard({ sheet, getUserName, onAdjust, onSetExact, onReset, onViewDetails, adjustingField, onAdjustingField, inputRef, onRemove }) {
  const char = sheet.data || {}
  const level = char.nivel || 1
  const tier = getLevelTier(level)
  const derived = getDerivedStats(char)
  const vidaAtual = char.vidaAtual ?? derived.vida
  const energiaAtual = char.energiaAtual ?? derived.energia
  const peAtual = char.peAtual ?? derived.pe

  return (
    <div
      className="glass-card rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-black/30 hover:border-primary/20 group"
      style={{ borderColor: 'transparent' }}
    >
      <div className="p-4 border-b border-sep/20">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            {char.avatar ? (
              <img src={char.avatar} alt="" className="w-12 h-12 rounded-lg object-cover border border-sep/50" />
            ) : (
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-cinzel border"
                style={{ borderColor: tier.color + '40', color: tier.color, background: tier.color + '10' }}
              >
                {getInitial(char.nome || sheet.name)}
              </div>
            )}
            <div
              className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${tier.bg} ${tier.text} border`}
              style={{ borderColor: tier.color + '30' }}
            >
              {level}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-cinzel text-on-surface text-sm truncate group-hover:text-primary transition-colors">
              {char.nome || sheet.name || 'Sem nome'}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-txt-dim uppercase tracking-wider">
                {char.raca ? getRaceLabel(char) : '—'}
              </span>
              <span className="text-sep">·</span>
              <span className="text-[10px] text-on-surface-variant">{char.classe || '—'}</span>
              <span className="text-sep">·</span>
              <span className={`text-[9px] font-mono ${tier.text}`}>{tier.label}</span>
            </div>
            <p className="text-[9px] text-txt-dim/50 mt-0.5">por {getUserName(sheet.user_id)}</p>
          </div>
          <div className="flex flex-col gap-1">
            <button
              onClick={onViewDetails}
              className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
              title="Ver detalhes"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>visibility</span>
            </button>
            <button
              onClick={onRemove}
              className="shrink-0 w-8 h-8 rounded-lg bg-void/80 border border-sep/30 flex items-center justify-center text-txt-dim/50 hover:text-err hover:border-err/30 transition-colors"
              title="Remover da mesa"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-2">
        {['vida', 'energia', 'pe'].map(key => {
          const cfg = RESOURCE_CONFIG[key]
          const current = key === 'vida' ? vidaAtual : key === 'energia' ? energiaAtual : peAtual
          const max = derived[key]
          const fieldKey = `${sheet.id}-${key}`
          return (
            <ResourceBar
              key={key}
              label={cfg.label}
              current={current}
              max={max}
              color={cfg.color}
              trackBg={cfg.trackBg}
              textColor={cfg.textColor}
              icon={cfg.icon}
              onMinus={delta => onAdjust(sheet, key, -delta)}
              onPlus={delta => onAdjust(sheet, key, delta)}
              onReset={() => onReset(sheet, key)}
              onExact={val => {
                if (val === null) {
                  onAdjustingField(fieldKey)
                } else {
                  onSetExact(sheet, key, val)
                  onAdjustingField(null)
                }
              }}
              isAdjusting={adjustingField === fieldKey}
              inputRef={inputRef}
            />
          )
        })}

        <div className="flex items-center justify-between pt-1 border-t border-sep/20">
          <div className="flex gap-3 text-[10px]">
            <span className="text-txt-dim">CA <span className="text-on-surface font-mono font-semibold">{derived.ca}</span></span>
            <span className="text-txt-dim">Rea <span className="text-on-surface font-mono font-semibold">{derived.reacoes}</span></span>
          </div>
          <button
            onClick={onViewDetails}
            className="text-[10px] text-primary/60 hover:text-primary flex items-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>open_in_new</span>
            ficha completa
          </button>
        </div>
      </div>
    </div>
  )
}
