import React from 'react'
import { ABILITY_SLOTS } from '../../../lib/character.js'
import Tag, { TagEditor } from '../../ui/Tag.jsx'
import { Button } from '../../ui/Button.jsx'
import AutoGrow from '../../ui/AutoGrow.jsx'

export const SLOT_STYLE = {
  passiva: { color: '#2ecc71', glow: 'rgba(46,204,113,0.35)', icon: 'bi-patch-check', label: 'Passiva', energy: false },
  ativa: { color: '#e0ad33', glow: 'rgba(224,173,51,0.35)', icon: 'bi-lightning-charge', label: 'Ativa', energy: true },
  ultimate: { color: '#f2661b', glow: 'rgba(242,102,27,0.4)', icon: 'bi-stars', label: 'Ultimate', energy: true }
}

export default function AbilityEditor({ abilities, onChange, onAIGenerate, onAIBalance }) {
  const set = (slotKey, patch) => onChange({ ...abilities, [slotKey]: { ...abilities[slotKey], ...patch } })

  return (
    <div className="d-flex flex-column gap-3">
      {onAIGenerate && (
        <div className="glass glass-tight p-4 d-flex flex-wrap align-items-center justify-content-between gap-3 card-sheen" style={{ borderColor: 'rgba(224,173,51,0.4)' }}>
          <div className="d-flex align-items-center gap-3">
            <span style={{ width: 50, height: 50, borderRadius: 14, background: 'linear-gradient(135deg,#f6d98c,#7c570e)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 22px rgba(224,173,51,0.4)' }}>
              <i className="bi bi-stars" style={{ color: '#1a1408', fontSize: '1.5rem' }} />
            </span>
            <div>
              <div className="font-display text-gold" style={{ fontSize: '1.15rem' }}>Oráculo de Habilidades</div>
              <div className="text-muted-drako" style={{ fontSize: '0.9rem' }}>Descreva a base de poderes e a IA cria o kit completo.</div>
            </div>
          </div>
          <Button onClick={onAIGenerate} style={{ fontSize: '1.02rem' }}><i className="bi bi-magic me-2" />Gerar kit</Button>
        </div>
      )}

      {ABILITY_SLOTS.map((slot) => {
        const ab = abilities[slot.key]
        const meta = SLOT_STYLE[ab.kind]
        return (
          <div key={slot.key} className="glass glass-tight" style={{ borderColor: `${meta.color}55`, boxShadow: `inset 0 0 0 1px ${meta.color}22, 0 18px 50px -30px rgba(0,0,0,0.8)` }}>
            <div className="d-flex align-items-center gap-2 px-4 pt-3 pb-2" style={{ borderBottom: `1px solid ${meta.color}33` }}>
              <span style={{ width: 40, height: 40, borderRadius: 11, background: `${meta.color}22`, border: `1px solid ${meta.color}66`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`bi ${meta.icon}`} style={{ color: meta.color, fontSize: '1.2rem' }} />
              </span>
              <div>
                <div className="font-display" style={{ color: meta.color, fontSize: '0.92rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{slot.name}</div>
                <div className="text-muted-drako" style={{ fontSize: '0.82rem' }}>{ab.kind === 'passiva' ? 'Sem custo — sempre ativa' : `Custo ${ab.energia} de energia`}</div>
              </div>
              {onAIBalance && ab.name && (
                <button className="btn-ghost ms-auto" style={{ padding: '0.4rem 0.85rem', fontSize: '0.84rem' }} onClick={() => onAIBalance(ab)}><i className="bi bi-shield-check me-1" />Auditar</button>
              )}
            </div>

            <div className="p-4">
              <div className="row g-3">
                <div className={meta.energy ? 'col-md-7' : 'col-12'}>
                  <label className="label-drako">Nome</label>
                  <input className="input-drako" style={{ fontSize: '1.1rem' }} value={ab.name} onChange={(e) => set(slot.key, { name: e.target.value })} placeholder={`Nome da habilidade ${meta.label.toLowerCase()}`} />
                </div>
                {meta.energy && (
                  <div className="col-md-5 col-lg-5">
                    <label className="label-drako">Custo de energia</label>
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-lightning-charge-fill" style={{ color: 'var(--energy)', fontSize: '1.3rem' }} />
                      <input type="number" min={0} className="input-drako no-spin" style={{ flex: 1, fontSize: '1.1rem' }} value={ab.energia}
                        onChange={(e) => set(slot.key, { energia: Math.max(0, Number(e.target.value) || 0) })} />
                    </div>
                  </div>
                )}
                <div className="col-12">
                  <label className="label-drako">Descrição</label>
                  <AutoGrow value={ab.descricao} onChange={(v) => set(slot.key, { descricao: v })} placeholder="Descreva a mecânica: dano, condições, acumuladores, sinergias, reatividade..." style={{ fontSize: '1rem' }} />
                </div>
                <div className="col-12">
                  <label className="label-drako">Tags</label>
                  <TagEditor tags={ab.tags} onChange={(tags) => set(slot.key, { tags })} />
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
