import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { getAllNpcs, resolveAvatarUrl } from '../services/codexDb'
import { calcVidaTotal, calcEnergiaTotal, calcPeTotal, calcCA, calcDanoBase, calcReacoes } from '../utils/calculator'

const MIN_ZOOM = 0.25
const MAX_ZOOM = 2
const ZOOM_STEP = 0.1
const GRID_SIZE = 20

const PROFILE_COLORS = {
  guerreiro: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', accent: '#f87171' },
  especialista: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', accent: '#34d399' },
  mistico: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400', accent: '#a78bfa' },
}

const CLASS_COLORS = {
  Guerreiro: '#f87171',
  Operativo: '#34d399',
  Místico: '#a78bfa',
}

function getHpColor(pct) {
  if (pct > 60) return '#4ade80'
  if (pct > 30) return '#fbbf24'
  return '#ef4444'
}

function getDerivedStats(char) {
  const sk = char.skeletonPoints || {}
  const cls = char.classe
  if (!cls) return { vida: 0, energia: 0, pe: 0, ca: 0, dano: '', reacoes: 0 }
  return {
    vida: calcVidaTotal(cls, char.nivel, char.atributos, sk, char.choices, char.triagemPrincipal, char.triagemPrincipalNivel, char, char.subTriagem, char.subTriagemNivel),
    energia: calcEnergiaTotal(cls, char.nivel, char.atributos, sk, char.choices, char.triagemPrincipal, char.triagemPrincipalNivel, char.subTriagem, char.subTriagemNivel, char),
    pe: calcPeTotal(cls, char.nivel, char.choices, char),
    ca: calcCA(char.atributos, sk, char.pericias, char),
    dano: calcDanoBase(cls, char.atributos, sk, char.nivel, char.subTriagem, char.subTriagemNivel, char.triagemPrincipal, char.triagemPrincipalNivel, char),
    reacoes: calcReacoes(char.atributos, sk, char.triagemPrincipal, char.triagemPrincipalNivel, char.subTriagem, char.subTriagemNivel, char),
  }
}

function NpcCard({ card, isSelected, onSelect, onDrag, zoom }) {
  const ref = useRef(null)
  const dragStart = useRef(null)
  const npc = card.data
  const pct = card.hpMax > 0 ? (card.hpCurrent / card.hpMax) * 100 : 0
  const hpColor = getHpColor(pct)
  const profileColor = PROFILE_COLORS[npc.profile] || PROFILE_COLORS.guerreiro

  function handleMouseDown(e) {
    if (e.button !== 0) return
    e.stopPropagation()
    onSelect(card.id)
    dragStart.current = { mx: e.clientX, my: e.clientY, cx: card.x, cy: card.y }
    function onMove(ev) {
      if (!dragStart.current) return
      const dx = (ev.clientX - dragStart.current.mx) / zoom
      const dy = (ev.clientY - dragStart.current.my) / zoom
      onDrag(card.id, dragStart.current.cx + dx, dragStart.current.cy + dy)
    }
    function onUp() {
      dragStart.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div
      ref={ref}
      onMouseDown={handleMouseDown}
      className="absolute select-none cursor-grab active:cursor-grabbing"
      style={{
        left: card.x,
        top: card.y,
        width: 200,
        transform: `scale(${1})`,
        transformOrigin: 'top left',
      }}
    >
      <div
        className="rounded-xl border overflow-hidden transition-shadow duration-200"
        style={{
          background: 'rgba(10,12,20,0.92)',
          backdropFilter: 'blur(12px)',
          borderColor: isSelected ? 'rgba(247,189,72,0.7)' : 'rgba(255,255,255,0.08)',
          boxShadow: isSelected
            ? '0 0 20px rgba(247,189,72,0.25), 0 4px 16px rgba(0,0,0,0.5)'
            : '0 4px 16px rgba(0,0,0,0.4)',
        }}
      >
        <div className="flex items-center gap-3 p-3 pb-2">
          <div
            className="w-10 h-10 rounded-lg border flex items-center justify-center text-base font-cinzel shrink-0 overflow-hidden"
            style={{ borderColor: profileColor.accent + '40', background: profileColor.accent + '15', color: profileColor.accent }}
          >
            {npc.avatar ? (
              <img src={resolveAvatarUrl(npc.avatar)} alt="" className="w-full h-full object-cover" />
            ) : (
              (npc.nome || '?').charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-cinzel text-on-surface text-sm truncate leading-tight">{npc.nome || 'NPC'}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: profileColor.accent }}>
                {npc.profile || '?'}
              </span>
              <span className="text-[9px] text-outline/50">·</span>
              <span className="text-[9px] font-mono text-outline/60">Nv {npc.nivel || '?'}</span>
              <span className="text-[9px] font-mono px-1 rounded" style={{ background: 'rgba(247,189,72,0.1)', color: '#f7bd48' }}>
                NA {npc.na || 0}
              </span>
            </div>
          </div>
        </div>
        <div className="px-3 pb-2">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: hpColor }}
            />
          </div>
          <p className="text-[9px] font-mono text-outline/50 mt-0.5 text-right">
            {card.hpCurrent}/{card.hpMax}
          </p>
        </div>
      </div>
    </div>
  )
}

function PlayerCard({ card, isSelected, onSelect, onDrag, onValueChange, zoom }) {
  const dragStart = useRef(null)
  const char = card.data
  const derived = useMemo(() => getDerivedStats(char), [char])
  const pctHp = derived.vida > 0 ? (card.hpCurrent / derived.vida) * 100 : 0
  const pctEn = derived.energia > 0 ? (card.energyCurrent / derived.energia) * 100 : 0
  const hpColor = getHpColor(pctHp)
  const classColor = CLASS_COLORS[char.classe] || '#f7bd48'
  const peDots = derived.pe || 0

  function handleMouseDown(e) {
    if (e.button !== 0) return
    e.stopPropagation()
    onSelect(card.id)
    dragStart.current = { mx: e.clientX, my: e.clientY, cx: card.x, cy: card.y }
    function onMove(ev) {
      if (!dragStart.current) return
      const dx = (ev.clientX - dragStart.current.mx) / zoom
      const dy = (ev.clientY - dragStart.current.my) / zoom
      onDrag(card.id, dragStart.current.cx + dx, dragStart.current.cy + dy)
    }
    function onUp() {
      dragStart.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      className="absolute select-none cursor-grab active:cursor-grabbing"
      style={{ left: card.x, top: card.y, width: 220, transformOrigin: 'top left' }}
    >
      <div
        className="rounded-xl border overflow-hidden transition-shadow duration-200"
        style={{
          background: 'rgba(10,12,20,0.92)',
          backdropFilter: 'blur(12px)',
          borderColor: isSelected ? 'rgba(247,189,72,0.7)' : 'rgba(255,255,255,0.08)',
          boxShadow: isSelected
            ? '0 0 20px rgba(247,189,72,0.25), 0 4px 16px rgba(0,0,0,0.5)'
            : '0 4px 16px rgba(0,0,0,0.4)',
        }}
      >
        <div className="flex items-center gap-3 p-3 pb-2">
          <div
            className="w-10 h-10 rounded-lg border flex items-center justify-center text-base font-cinzel shrink-0 overflow-hidden"
            style={{ borderColor: classColor + '40', background: classColor + '15', color: classColor }}
          >
            {char.avatar ? (
              <img src={char.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              (char.nome || '?').charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-cinzel text-on-surface text-sm truncate leading-tight">{char.nome || 'Jogador'}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: classColor }}>
                {char.classe || '?'}
              </span>
              <span className="text-[9px] text-outline/50">·</span>
              <span className="text-[9px] font-mono text-outline/60">Nv {char.nivel || 1}</span>
            </div>
          </div>
        </div>
        <div className="px-3 pb-1 space-y-1">
          <div>
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[8px] font-mono text-red-400/70 uppercase">HP</span>
              <div className="flex items-center gap-0.5">
                <input
                  type="number"
                  value={card.hpCurrent}
                  onChange={e => { e.stopPropagation(); onValueChange(card.id, 'hpCurrent', Number(e.target.value) || 0) }}
                  onMouseDown={e => e.stopPropagation()}
                  className="w-8 bg-transparent text-[9px] font-mono text-on-surface-variant text-right outline-none border-b border-transparent focus:border-primary/50"
                  style={{ '-moz-appearance': 'textfield' }}
                />
                <span className="text-[9px] font-mono text-outline/40">/</span>
                <span className="text-[9px] font-mono text-outline/40">{derived.vida}</span>
              </div>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.max(0, Math.min(100, pctHp))}%`, background: hpColor }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[8px] font-mono text-blue-400/70 uppercase">Energia</span>
              <div className="flex items-center gap-0.5">
                <input
                  type="number"
                  value={card.energyCurrent}
                  onChange={e => { e.stopPropagation(); onValueChange(card.id, 'energyCurrent', Number(e.target.value) || 0) }}
                  onMouseDown={e => e.stopPropagation()}
                  className="w-8 bg-transparent text-[9px] font-mono text-on-surface-variant text-right outline-none border-b border-transparent focus:border-primary/50"
                  style={{ '-moz-appearance': 'textfield' }}
                />
                <span className="text-[9px] font-mono text-outline/40">/</span>
                <span className="text-[9px] font-mono text-outline/40">{derived.energia}</span>
              </div>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.max(0, Math.min(100, pctEn))}%`, background: '#60a5fa' }} />
            </div>
          </div>
          <div className="flex items-center gap-1 pt-0.5">
            <span className="text-[8px] font-mono text-amber-400/70 uppercase">PE</span>
            <div className="flex gap-0.5">
              {Array.from({ length: Math.min(peDots, 30) }).map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: i < card.peCurrent ? '#f7bd48' : 'rgba(255,255,255,0.08)' }}
                />
              ))}
            </div>
            <input
              type="number"
              value={card.peCurrent}
              onChange={e => { e.stopPropagation(); onValueChange(card.id, 'peCurrent', Number(e.target.value) || 0) }}
              onMouseDown={e => e.stopPropagation()}
              className="w-6 bg-transparent text-[9px] font-mono text-amber-400/70 text-right outline-none border-b border-transparent focus:border-primary/50 ml-auto"
              style={{ '-moz-appearance': 'textfield' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function SidePanel({ card, onClose }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setOpen(true))
  }, [])

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') closePanel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function closePanel() {
    setOpen(false)
    setTimeout(onClose, 300)
  }

  if (!card) return null

  const isNpc = card.type === 'npc'
  const data = card.data
  const derived = !isNpc ? getDerivedStats(data) : null
  const npcStats = isNpc ? data.stats : null
  const abilities = isNpc ? (data.abilities || []) : (data.habilidades || []).filter(h => h.nome)
  const profileColor = isNpc ? (PROFILE_COLORS[data.profile] || PROFILE_COLORS.guerreiro) : null
  const classColor = !isNpc ? (CLASS_COLORS[data.classe] || '#f7bd48') : null

  return (
    <div
      className="fixed top-0 right-0 h-full z-[60] flex"
      style={{ pointerEvents: open ? 'auto' : 'none' }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: open ? 'rgba(0,0,0,0.3)' : 'transparent',
          pointerEvents: open ? 'auto' : 'none',
          transition: 'background 0.3s ease',
        }}
        onClick={closePanel}
      />
      <div
        className="relative w-[380px] max-w-[90vw] h-full border-l overflow-y-auto"
        style={{
          background: 'rgba(5,7,14,0.95)',
          backdropFilter: 'blur(24px)',
          borderColor: 'rgba(247,189,72,0.15)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(5,7,14,0.9)', backdropFilter: 'blur(12px)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg border flex items-center justify-center text-lg font-cinzel overflow-hidden shrink-0"
              style={{
                borderColor: (profileColor?.accent || classColor || '#f7bd48') + '40',
                background: (profileColor?.accent || classColor || '#f7bd48') + '15',
                color: profileColor?.accent || classColor || '#f7bd48',
              }}
            >
              {data.avatar ? (
                <img src={data.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                (data.nome || '?').charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h3 className="font-cinzel text-on-surface text-base">{data.nome || 'Sem Nome'}</h3>
              <div className="flex items-center gap-1.5 text-[10px] font-mono">
                {isNpc ? (
                  <>
                    <span style={{ color: profileColor.accent }} className="uppercase tracking-wider">{data.profile || '?'}</span>
                    <span className="text-outline/40">·</span>
                    <span className="text-outline/60">Nv {data.nivel || '?'}</span>
                    <span className="text-outline/40">·</span>
                    <span className="px-1 rounded" style={{ background: 'rgba(247,189,72,0.1)', color: '#f7bd48' }}>NA {data.na || 0}</span>
                  </>
                ) : (
                  <>
                    <span style={{ color: classColor }} className="uppercase tracking-wider">{data.classe || '?'}</span>
                    <span className="text-outline/40">·</span>
                    <span className="text-outline/60">Nv {data.nivel || 1}</span>
                    <span className="text-outline/40">·</span>
                    <span className="text-outline/50">{data.raca || '?'}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button onClick={closePanel} className="w-8 h-8 rounded-lg border flex items-center justify-center text-outline hover:text-err hover:border-err/30 transition-colors" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {!isNpc && derived && (
            <div>
              <h4 className="font-cinzel text-primary text-xs uppercase tracking-widest mb-3">Recursos</h4>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'HP', val: card.hpCurrent, max: derived.vida, color: '#4ade80' },
                  { label: 'Energia', val: card.energyCurrent, max: derived.energia, color: '#60a5fa' },
                  { label: 'PE', val: card.peCurrent, max: derived.pe, color: '#f7bd48' },
                ].map(r => (
                  <div key={r.label} className="rounded-lg border p-2.5 text-center" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                    <p className="text-[9px] font-mono uppercase tracking-wider" style={{ color: r.color + '99' }}>{r.label}</p>
                    <p className="font-mono text-on-surface text-base font-bold mt-0.5">{r.val}<span className="text-outline/30 text-xs">/{r.max}</span></p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div className="rounded-lg border p-2 text-center" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                  <p className="text-[9px] font-mono text-outline/60 uppercase">CA</p>
                  <p className="font-mono text-on-surface text-sm font-bold mt-0.5">{derived.ca}</p>
                </div>
                <div className="rounded-lg border p-2 text-center" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                  <p className="text-[9px] font-mono text-outline/60 uppercase">Reações</p>
                  <p className="font-mono text-on-surface text-sm font-bold mt-0.5">{derived.reacoes}</p>
                </div>
                <div className="rounded-lg border p-2 text-center" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                  <p className="text-[9px] font-mono text-outline/60 uppercase">Dano</p>
                  <p className="font-mono text-on-surface text-sm font-bold mt-0.5">{derived.dano || '-'}</p>
                </div>
              </div>
            </div>
          )}

          {isNpc && npcStats && (
            <div>
              <h4 className="font-cinzel text-primary text-xs uppercase tracking-widest mb-3">Stats</h4>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'PV', val: card.hpCurrent, max: npcStats.vida || card.hpMax, color: '#4ade80' },
                  { label: 'CA', val: npcStats.ca || 0, max: null, color: '#60a5fa' },
                  { label: 'BA', val: `+${npcStats.ba || 0}`, max: null, color: '#f7bd48' },
                ].map(r => (
                  <div key={r.label} className="rounded-lg border p-2.5 text-center" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                    <p className="text-[9px] font-mono uppercase tracking-wider" style={{ color: r.color + '99' }}>{r.label}</p>
                    <p className="font-mono text-on-surface text-base font-bold mt-0.5">
                      {r.val}{r.max ? <span className="text-outline/30 text-xs">/{r.max}</span> : ''}
                    </p>
                  </div>
                ))}
              </div>
              {data.atributos && (
                <div className="grid grid-cols-6 gap-1 mt-2">
                  {Object.entries(data.atributos).map(([k, v]) => (
                    <div key={k} className="rounded border p-1.5 text-center" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                      <p className="text-[8px] font-mono text-outline/50 uppercase">{k.slice(0, 3)}</p>
                      <p className="font-mono text-on-surface text-xs font-bold">{v || 0}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!isNpc && (
            <div>
              <h4 className="font-cinzel text-primary text-xs uppercase tracking-widest mb-2">Atributos</h4>
              <div className="grid grid-cols-6 gap-1">
                {['FOR', 'DES', 'CON', 'INT', 'APA', 'AM'].map(a => {
                  const total = ((data.atributos?.[a] || 0) + (data.skeletonPoints?.[a] || 0))
                  const mod = Math.floor((total - 10) / 2)
                  return (
                    <div key={a} className="rounded border p-1.5 text-center" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                      <p className="text-[8px] font-mono text-outline/50">{a}</p>
                      <p className="font-mono text-on-surface text-xs font-bold">{total}</p>
                      <p className="text-[9px] font-mono text-outline/40">{mod >= 0 ? '+' : ''}{mod}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {abilities.length > 0 && (
            <div>
              <h4 className="font-cinzel text-primary text-xs uppercase tracking-widest mb-3">
                {isNpc ? 'Habilidades' : 'Habilidades'}
              </h4>
              <div className="space-y-2">
                {abilities.map((hab, i) => {
                  const tipo = hab.tipo || hab.type || ''
                  const isPassive = tipo === 'passiva' || tipo === 'Passiva'
                  const isUltimate = tipo === 'ultimate' || tipo === 'Ultimate'
                  const borderAcc = isUltimate ? 'rgba(247,189,72,0.4)' : isPassive ? 'rgba(52,211,153,0.25)' : 'rgba(96,165,250,0.25)'
                  return (
                    <div
                      key={i}
                      className="rounded-lg border p-3"
                      style={{ borderColor: borderAcc, background: 'rgba(255,255,255,0.02)' }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-cinzel text-on-surface text-xs flex-1 truncate">{hab.nome || hab.name || `Hab ${i + 1}`}</span>
                        {tipo && (
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider" style={{ background: borderAcc.replace(/[\d.]+\)$/, '0.15)'), color: borderAcc.replace(/[\d.]+\)$/, '1)') }}>
                            {tipo}
                          </span>
                        )}
                      </div>
                      {(hab.descricao || hab.description || hab.effect) && (
                        <p className="text-[10px] text-on-surface-variant leading-relaxed">{hab.descricao || hab.description || hab.effect}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {hab.dano && <span className="text-[9px] font-mono text-red-400">Dano: {hab.dano}</span>}
                        {hab.duracao && <span className="text-[9px] font-mono text-blue-400">Duração: {hab.duracao}</span>}
                        {hab.dt && <span className="text-[9px] font-mono text-amber-400">DT {hab.dt}</span>}
                        {hab.custo && <span className="text-[9px] font-mono text-violet-400">Custo: {hab.custo}</span>}
                        {hab.cooldown && <span className="text-[9px] font-mono text-outline/50">CD: {hab.cooldown}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DropdownButton({ label, icon, children, isOpen, onToggle }) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono uppercase tracking-wider transition-colors"
        style={{
          borderColor: isOpen ? 'rgba(247,189,72,0.4)' : 'rgba(255,255,255,0.1)',
          color: isOpen ? '#f7bd48' : 'rgba(255,255,255,0.5)',
          background: isOpen ? 'rgba(247,189,72,0.08)' : 'rgba(255,255,255,0.03)',
        }}
      >
        <span className="material-symbols-outlined text-sm">{icon}</span>
        {label}
        <span className="material-symbols-outlined text-sm">{isOpen ? 'expand_less' : 'expand_more'}</span>
      </button>
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 w-64 max-h-60 overflow-y-auto rounded-lg border z-50"
          style={{
            background: 'rgba(10,12,20,0.97)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(247,189,72,0.2)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

export default function InfiniteBoard({ sheets = [] }) {
  const containerRef = useRef(null)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [cards, setCards] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [showAddNpc, setShowAddNpc] = useState(false)
  const [npcs, setNpcs] = useState([])
  const [npcsLoaded, setNpcsLoaded] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const isPanning = useRef(false)
  const panStart = useRef(null)
  const nextCardPos = useRef({ x: 100, y: 100 })

  useEffect(() => {
    if (!npcsLoaded) {
      getAllNpcs().then(data => { setNpcs(data); setNpcsLoaded(true) }).catch(() => setNpcsLoaded(true))
    }
  }, [])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') setSelectedId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('olympo-board-state')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.cards && parsed.cards.length > 0) {
          setCards(parsed.cards)
          nextCardPos.current = {
            x: Math.max(...parsed.cards.map(c => c.x)) + 240,
            y: 100,
          }
        }
        if (parsed.pan) setPan(parsed.pan)
        if (parsed.zoom) setZoom(parsed.zoom)
      }
    } catch {}
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('olympo-board-state', JSON.stringify({ cards, pan, zoom }))
      } catch {}
    }, 500)
    return () => clearTimeout(timer)
  }, [cards, pan, zoom])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
    setZoom(prev => {
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta))
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return next
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const scale = next / prev
      setPan(p => ({
        x: mouseX - (mouseX - p.x) * scale,
        y: mouseY - (mouseY - p.y) * scale,
      }))
      return next
    })
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  function handleCanvasMouseDown(e) {
    if (e.target !== containerRef.current && !e.target.dataset.canvas) return
    if (e.button === 1 || e.button === 0) {
      isPanning.current = true
      panStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y }
      setSelectedId(null)
      setShowAddPlayer(false)
      setShowAddNpc(false)
    }
  }

  useEffect(() => {
    function onMove(e) {
      if (!isPanning.current || !panStart.current) return
      const dx = e.clientX - panStart.current.mx
      const dy = e.clientY - panStart.current.my
      setPan({ x: panStart.current.px + dx, y: panStart.current.py + dy })
    }
    function onUp() {
      isPanning.current = false
      panStart.current = null
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  function addPlayerCard(sheet) {
    const char = sheet.data || {}
    const derived = getDerivedStats(char)
    const id = `player_${sheet.id}_${Date.now()}`
    const card = {
      id,
      type: 'player',
      sheetId: sheet.id,
      data: char,
      x: nextCardPos.current.x,
      y: nextCardPos.current.y,
      hpCurrent: derived.vida,
      energyCurrent: derived.energia,
      peCurrent: derived.pe,
    }
    setCards(prev => [...prev, card])
    nextCardPos.current = { x: nextCardPos.current.x + 240, y: nextCardPos.current.y }
    if (nextCardPos.current.x > 1200) {
      nextCardPos.current = { x: 100, y: nextCardPos.current.y + 200 }
    }
    setShowAddPlayer(false)
  }

  function addNpcCard(npc) {
    const id = `npc_${npc.id}_${Date.now()}`
    const hpMax = npc.stats?.vida || 0
    const card = {
      id,
      type: 'npc',
      npcId: npc.id,
      data: npc,
      x: nextCardPos.current.x,
      y: nextCardPos.current.y,
      hpCurrent: hpMax,
      hpMax,
    }
    setCards(prev => [...prev, card])
    nextCardPos.current = { x: nextCardPos.current.x + 220, y: nextCardPos.current.y }
    if (nextCardPos.current.x > 1200) {
      nextCardPos.current = { x: 100, y: nextCardPos.current.y + 200 }
    }
    setShowAddNpc(false)
  }

  function handleDrag(id, x, y) {
    setCards(prev => prev.map(c => c.id === id ? { ...c, x, y } : c))
  }

  function handleValueChange(id, field, value) {
    setCards(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  function handleClearBoard() {
    setCards([])
    setPan({ x: 0, y: 0 })
    setZoom(1)
    setSelectedId(null)
    nextCardPos.current = { x: 100, y: 100 }
    setShowClearConfirm(false)
    try { localStorage.removeItem('olympo-board-state') } catch {}
  }

  function handleResetView() {
    if (cards.length === 0) {
      setPan({ x: 0, y: 0 })
      setZoom(1)
      return
    }
    const minX = Math.min(...cards.map(c => c.x))
    const minY = Math.min(...cards.map(c => c.y))
    const maxX = Math.max(...cards.map(c => c.x + 220))
    const maxY = Math.max(...cards.map(c => c.y + 160))
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const contentW = maxX - minX + 100
    const contentH = maxY - minY + 100
    const scaleX = rect.width / contentW
    const scaleY = rect.height / contentH
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.min(scaleX, scaleY)))
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    setZoom(newZoom)
    setPan({
      x: rect.width / 2 - centerX * newZoom,
      y: rect.height / 2 - centerY * newZoom,
    })
  }

  const selectedCard = cards.find(c => c.id === selectedId) || null

  const existingPlayerIds = new Set(cards.filter(c => c.type === 'player').map(c => c.sheetId))
  const existingNpcIds = new Set(cards.filter(c => c.type === 'npc').map(c => c.npcId))
  const availablePlayers = sheets.filter(s => !existingPlayerIds.has(s.id))
  const availableNpcs = npcs.filter(n => !existingNpcIds.has(n.id))

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center gap-3 px-4 py-2.5 border-b shrink-0 flex-wrap"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(5,7,14,0.95)', backdropFilter: 'blur(12px)' }}
      >
        <button onClick={() => window.location.hash = '#/admin'}
          className="text-gold/70 hover:text-gold transition-colors flex items-center gap-1 text-xs">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
        </button>
        <h2 className="font-cinzel text-primary text-sm tracking-widest mr-2">Quadro de Sessão</h2>
        <div className="h-5 w-px" style={{ background: 'rgba(255,255,255,0.08)' }} />

        <DropdownButton label="Adicionar Jogador" icon="person_add" isOpen={showAddPlayer} onToggle={() => { setShowAddPlayer(!showAddPlayer); setShowAddNpc(false) }}>
          {availablePlayers.length === 0 ? (
            <div className="px-3 py-4 text-center text-[10px] text-outline/50 font-mono">Nenhum personagem disponível</div>
          ) : availablePlayers.map(s => (
            <button
              key={s.id}
              onClick={() => addPlayerCard(s)}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-primary/10 transition-colors text-left"
            >
              <div className="w-7 h-7 rounded border flex items-center justify-center text-[10px] font-cinzel overflow-hidden shrink-0" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                {s.data?.avatar ? <img src={s.data.avatar} alt="" className="w-full h-full object-cover" /> : (s.data?.nome || '?').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-on-surface truncate">{s.data?.nome || s.name || 'Sem nome'}</p>
                <p className="text-[9px] text-outline/50 font-mono">{s.data?.classe || '?'} · Nv {s.data?.nivel || 1}</p>
              </div>
            </button>
          ))}
        </DropdownButton>

        <DropdownButton label="Adicionar NPC" icon="auto_stories" isOpen={showAddNpc} onToggle={() => { setShowAddNpc(!showAddNpc); setShowAddPlayer(false) }}>
          {!npcsLoaded ? (
            <div className="px-3 py-4 text-center text-[10px] text-outline/50 font-mono">Carregando...</div>
          ) : availableNpcs.length === 0 ? (
            <div className="px-3 py-4 text-center text-[10px] text-outline/50 font-mono">Nenhum NPC disponível</div>
          ) : availableNpcs.map(npc => {
            const pc = PROFILE_COLORS[npc.profile] || PROFILE_COLORS.guerreiro
            return (
              <button
                key={npc.id}
                onClick={() => addNpcCard(npc)}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-primary/10 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded border flex items-center justify-center text-[10px] font-cinzel overflow-hidden shrink-0" style={{ borderColor: pc.accent + '30', background: pc.accent + '10', color: pc.accent }}>
                  {npc.avatar ? <img src={resolveAvatarUrl(npc.avatar)} alt="" className="w-full h-full object-cover" /> : (npc.nome || '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-on-surface truncate">{npc.nome || 'NPC'}</p>
                  <p className="text-[9px] font-mono" style={{ color: pc.accent }}>{npc.profile || '?'} · Nv {npc.nivel || '?'}</p>
                </div>
              </button>
            )
          })}
        </DropdownButton>

        <div className="h-5 w-px" style={{ background: 'rgba(255,255,255,0.08)' }} />

        <button onClick={handleResetView}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono uppercase tracking-wider transition-colors"
          style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.03)' }}
        >
          <span className="material-symbols-outlined text-sm">center_focus_strong</span>
          Reset View
        </button>

        {showClearConfirm ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-err/70 font-mono">Confirmar?</span>
            <button onClick={handleClearBoard} className="px-2 py-1 rounded text-[10px] font-mono text-err border border-err/30 hover:bg-err/10 transition-colors">Sim</button>
            <button onClick={() => setShowClearConfirm(false)} className="px-2 py-1 rounded text-[10px] font-mono text-outline/50 border border-outline/20 hover:bg-outline/10 transition-colors">Não</button>
          </div>
        ) : (
          <button onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono uppercase tracking-wider transition-colors"
            style={{ borderColor: 'rgba(248,113,113,0.2)', color: 'rgba(248,113,113,0.6)', background: 'rgba(248,113,113,0.05)' }}
          >
            <span className="material-symbols-outlined text-sm">delete_sweep</span>
            Limpar
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setZoom(z => Math.max(MIN_ZOOM, z - ZOOM_STEP))}
            className="w-6 h-6 rounded border flex items-center justify-center text-outline/50 hover:text-primary hover:border-primary/30 transition-colors"
            style={{ borderColor: 'rgba(255,255,255,0.1)' }}
          >
            <span className="material-symbols-outlined text-sm">remove</span>
          </button>
          <span className="font-mono text-xs text-outline/50 w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(z => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
            className="w-6 h-6 rounded border flex items-center justify-center text-outline/50 hover:text-primary hover:border-primary/30 transition-colors"
            style={{ borderColor: 'rgba(255,255,255,0.1)' }}
          >
            <span className="material-symbols-outlined text-sm">add</span>
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing"
        style={{ background: '#0a0c14' }}
        onMouseDown={handleCanvasMouseDown}
      >
        <div
          data-canvas="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(201,168,76,0.06) 1px, transparent 1px),
              linear-gradient(90deg, rgba(201,168,76,0.06) 1px, transparent 1px)
            `,
            backgroundSize: `${GRID_SIZE * zoom}px ${GRID_SIZE * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        />

        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          {cards.map(card =>
            card.type === 'npc' ? (
              <NpcCard
                key={card.id}
                card={card}
                isSelected={selectedId === card.id}
                onSelect={setSelectedId}
                onDrag={handleDrag}
                zoom={zoom}
              />
            ) : (
              <PlayerCard
                key={card.id}
                card={card}
                isSelected={selectedId === card.id}
                onSelect={setSelectedId}
                onDrag={handleDrag}
                onValueChange={handleValueChange}
                zoom={zoom}
              />
            )
          )}
        </div>

        {cards.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <span className="material-symbols-outlined text-6xl text-primary/10 block mb-3">dashboard</span>
              <p className="font-cinzel text-primary/25 text-lg tracking-widest">Quadro Vazio</p>
              <p className="text-[10px] font-mono text-outline/30 mt-2 uppercase tracking-wider">Adicione jogadores e NPCs para começar</p>
            </div>
          </div>
        )}
      </div>

      {selectedCard && (
        <SidePanel card={selectedCard} onClose={() => setSelectedId(null)} />
      )}
    </div>
  )
}
