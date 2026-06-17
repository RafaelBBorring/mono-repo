import React from 'react'
import { LEVEL_BY_KEY } from '../../data/startingLevels.js'
import { ATTRIBUTES } from '../../data/attributes.js'
import { absorption } from '../../lib/calculator.js'
import { ABILITY_SLOTS } from '../../lib/character.js'
import HexagonResource from '../ui/HexagonResource.jsx'
import Tag from '../ui/Tag.jsx'
import { SLOT_STYLE } from './abilities/AbilityEditor.jsx'

export const LEVEL_COLORS = {
  recruta: '#8b9a73', iniciante: '#3fb0b5', veterano: '#9b6bd6', elite: '#e8643b', lenda: '#f4c95d'
}

export default function CharacterSheet({ character: c, editable = false, onChange, onResource, onResourceMax, onAttribute, onOpenIcon, onAIBalance, onLevelUp }) {
  const lvl = LEVEL_BY_KEY[c.level]
  const lvlColor = LEVEL_COLORS[c.level] || '#e0ad33'
  const r = c.resources || {}
  const max = { vida: r.vidaMax ?? r.vida ?? 1, energia: r.energiaMax ?? r.energia ?? 1, pe: r.peMax ?? r.pe ?? 1 }
  const ab = c.abilities || {}

  const fld = (field) => ({
    value: c[field] ?? '',
    onChange: editable ? (e) => onChange?.({ [field]: e.target.value }) : undefined
  })

  return (
    <div className="row g-3">
      {/* ============ LEFT ============ */}
      <div className="col-lg-5">
        <div className="glass p-4 mb-3">
          <div className="d-flex align-items-center gap-3">
            <button onClick={onOpenIcon} disabled={!editable} style={{ background: 'none', border: 'none', padding: 0, cursor: editable ? 'pointer' : 'default' }} title={editable ? 'Trocar ícone' : ''}>
              <Portrait c={c} size={132} lvlColor={lvlColor} />
            </button>
            <div className="flex-grow-1 min-w-0">
              {editable ? (
                <input className="font-display" value={c.name} onChange={(e) => onChange?.({ name: e.target.value })}
                  style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--drako-gold-soft)', fontSize: '1.85rem', fontWeight: 700, width: '100%', padding: 0 }} />
              ) : (
                <h2 className="m-0 gold-text" style={{ fontSize: '1.85rem' }}>{c.name || 'Sem Nome'}</h2>
              )}
              <div className="d-flex align-items-center gap-2 mt-2 flex-wrap">
                <span className="tag-chip" style={{ color: lvlColor, fontSize: '0.78rem' }}>{lvl?.name}</span>
                <span className="tag-chip d-inline-flex align-items-center" style={{ color: '#cdc1a6', fontSize: '0.78rem' }}>
                  <i className="bi bi-person-vcard me-1" style={{ opacity: 0.8 }} />
                  {editable
                    ? <input className="font-body" value={c.raca || ''} placeholder="Raça" onChange={(e) => onChange?.({ raca: e.target.value })} style={{ background: 'transparent', border: 'none', outline: 'none', color: 'inherit', fontSize: '0.78rem', width: 110, padding: 0 }} />
                    : <span>{c.raca || 'Sem raça'}</span>}
                </span>
              </div>
              {editable && onLevelUp && (
                <button className="btn-ghost mt-2" style={{ fontSize: '0.82rem', padding: '0.3rem 0.7rem' }} onClick={onLevelUp}><i className="bi bi-arrow-up-circle me-1" />Subir de nível</button>
              )}
            </div>
          </div>

          {/* Resources hexagons */}
          <div className="d-flex justify-content-around gap-2 mt-4">
            <HexagonResource kind="vida" label="Vida" icon="bi-heart-pulse" value={r.vida ?? 0} max={max.vida} editable={editable} onChange={(v) => onResource?.('vida', v)} onMaxChange={() => onResourceMax?.('vida')} />
            <HexagonResource kind="energia" label="Energia" icon="bi-lightning-charge" value={r.energia ?? 0} max={max.energia} editable={editable} onChange={(v) => onResource?.('energia', v)} onMaxChange={() => onResourceMax?.('energia')} />
            <HexagonResource kind="pe" label="Esforço" icon="bi-bullseye" value={r.pe ?? 0} max={max.pe} editable={editable} onChange={(v) => onResource?.('pe', v)} onMaxChange={() => onResourceMax?.('pe')} />
          </div>
        </div>

        {/* Attributes rings */}
        <div className="glass p-4 mb-3">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h4 className="font-display text-gold m-0" style={{ fontSize: '1.05rem' }}>Atributos</h4>
            <span className="tag-chip" style={{ color: '#c0392b', fontSize: '0.72rem' }} title="Redução de dano físico pela Força"><i className="bi bi-shield me-1" />Absorção {absorption(c.attributes?.for || 0)}</span>
          </div>
          <div className="row g-2">
            {ATTRIBUTES.map(a => (
              <div className="col-4 col-md-3" key={a.key}>
                <AttributeRing attr={a} value={c.attributes?.[a.key] || 0} editable={editable} onChange={(v) => onAttribute?.(a.key, v)} />
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="glass p-4">
          <div className="label-drako">Anotações</div>
          {editable ? (
            <textarea className="textarea-drako" rows={3} value={c.anotacoes || ''} onChange={(e) => onChange?.({ anotacoes: e.target.value })} placeholder="Ferro, fraquezas, comportamento, gatilhos..." />
          ) : (
            <p className="m-0" style={{ fontSize: '0.98rem', color: '#cdc1a6', whiteSpace: 'pre-wrap' }}>{c.anotacoes || '—'}</p>
          )}
        </div>
      </div>

      {/* ============ RIGHT — Abilities ============ */}
      <div className="col-lg-7">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h4 className="font-display text-gold m-0" style={{ fontSize: '1.15rem' }}>Habilidades</h4>
          <div className="d-flex gap-2">
            <Legend color="#2ecc71" label="Passiva" />
            <Legend color="#e0ad33" label="Ativa" />
            <Legend color="#f2661b" label="Ultimate" />
          </div>
        </div>
        <div className="d-flex flex-column gap-3">
          {ABILITY_SLOTS.map(slot => {
            const a = ab[slot.key]; if (!a) return null
            const meta = SLOT_STYLE[a.kind]
            return (
              <div key={slot.key} className="glass" style={{ borderLeft: `5px solid ${meta.color}`, borderColor: `${meta.color}66`, boxShadow: `inset 3px 0 0 ${meta.color}, 0 18px 50px -34px rgba(0,0,0,0.9)` }}>
                <div className="p-3">
                  <div className="d-flex align-items-start justify-content-between gap-2">
                    <div className="d-flex align-items-center gap-2 min-w-0">
                      <span style={{ width: 36, height: 36, borderRadius: 10, background: `${meta.color}22`, border: `1px solid ${meta.color}66`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                        <i className={`bi ${meta.icon}`} style={{ color: meta.color, fontSize: '1.05rem' }} />
                      </span>
                      <div className="min-w-0">
                        <div className="font-display" style={{ fontSize: '1.25rem', color: '#fff8e6', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name || '—'}</div>
                        <div className="font-mono text-muted-drako" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{slot.name}</div>
                      </div>
                    </div>
                    {a.kind !== 'passiva' && (
                      <span className="tag-chip" style={{ color: 'var(--energy)', fontSize: '0.82rem', padding: '0.3rem 0.7rem' }} title="Custo de energia">
                        <i className="bi bi-lightning-charge-fill" /> {a.energia}
                      </span>
                    )}
                  </div>
                  {a.descricao && <p className="mt-2 mb-0" style={{ fontSize: '1rem', color: '#d4c8ab', lineHeight: 1.55 }}>{a.descricao}</p>}
                  {a.tags?.length > 0 && (
                    <div className="d-flex flex-wrap gap-2 mt-2">
                      {a.tags.map((t, i) => <Tag key={i} label={t.label} color={t.color} />)}
                    </div>
                  )}
                  {editable && onAIBalance && a.name && (
                    <div className="text-end mt-2">
                      <button className="btn-ghost" style={{ fontSize: '0.82rem', padding: '0.3rem 0.8rem' }} onClick={() => onAIBalance(a)}><i className="bi bi-shield-check me-1" />Auditar balanço</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Portrait({ c, size, lvlColor }) {
  const icon = c.icon
  const wrap = { width: size, height: size, borderRadius: 22, position: 'relative', overflow: 'hidden', flex: '0 0 auto', border: `2px solid ${lvlColor}aa`, boxShadow: `0 0 0 3px rgba(5,4,3,0.7), 0 0 28px ${lvlColor}44`, background: 'radial-gradient(circle at 50% 30%, #1c1812, #0a0806)' }
  const initials = (c.name || '?').trim().slice(0, 2).toUpperCase()
  return (
    <div style={wrap} className="no-select">
      {icon?.dataUrl ? (
        <img src={icon.dataUrl} alt={c.name} draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${icon.x || 50}% ${icon.y || 50}%`, transform: `scale(${icon.scale || 1})`, transformOrigin: 'center' }} />
      ) : (
        <div className="d-flex align-items-center justify-content-center h-100 font-display gold-text" style={{ fontSize: size * 0.34 }}>{initials}</div>
      )}
    </div>
  )
}

function AttributeRing({ attr, value, editable, onChange }) {
  const R = 26, C = 2 * Math.PI * R
  const pct = Math.max(0, Math.min(10, value)) / 10
  return (
    <div className="d-flex flex-column align-items-center">
      <div style={{ position: 'relative', width: 64, height: 64 }}>
        <svg width="64" height="64" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
          <circle cx="32" cy="32" r={R} fill="none" stroke={attr.color} strokeWidth="5" strokeLinecap="round"
            strokeDasharray={`${pct * C} ${C}`} transform="rotate(-90 32 32)" style={{ transition: 'stroke-dasharray .5s', filter: `drop-shadow(0 0 4px ${attr.color}88)` }} />
        </svg>
        <div className="font-display" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff8e6', fontSize: '1.25rem', fontWeight: 700 }}>{value}</div>
      </div>
      <div className="font-mono" style={{ fontSize: '0.66rem', color: attr.color, letterSpacing: '0.06em' }}>{attr.short}</div>
    </div>
  )
}

function Legend({ color, label }) {
  return <span className="d-flex align-items-center gap-1" style={{ fontSize: '0.74rem', color: 'var(--drako-muted)' }}><span style={{ width: 9, height: 9, borderRadius: 999, background: color, display: 'inline-block' }} />{label}</span>
}
