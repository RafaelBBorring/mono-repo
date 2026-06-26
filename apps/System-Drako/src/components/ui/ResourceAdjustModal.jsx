import React, { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import { Button } from './Button.jsx'
import { absorption } from '../../lib/calculator.js'

const KIND_META = {
  vida: { label: 'Vida', icon: 'bi-heart-pulse', tone: '#2ecc71' },
  energia: { label: 'Energia', icon: 'bi-lightning-charge', tone: '#f39c12' },
  pe: { label: 'Esforço', icon: 'bi-bullseye', tone: '#9b59b6' }
}

export default function ResourceAdjustModal({ state, character, onClose, onApply, onResetMax }) {
  const meta = state ? KIND_META[state.kind] : null
  const [value, setValue] = useState('')
  const [mode, setMode] = useState('dmg')
  const [useAbsorb, setUseAbsorb] = useState(true)
  const isOpen = !!state

  useEffect(() => {
    if (isOpen) { setValue(''); setMode(state?.mode || 'dmg'); setUseAbsorb(true) }
  }, [isOpen, state?.kind, state?.cid, state?.mode])

  if (!isOpen || !meta || !character) return null

  const cur = character.resources?.[state.kind] ?? 0
  const max = character.resources?.[`${state.kind}Max`]
  const num = Math.max(0, Number(value) || 0)
  const isVida = state.kind === 'vida'
  const abs = absorption(character.attributes?.for || 0)
  const effective = mode === 'dmg' && isVida && useAbsorb ? Math.max(0, num - abs) : num
  let projected
  if (mode === 'dmg') projected = Math.max(0, cur - effective)
  else if (mode === 'heal') projected = cur + num
  else projected = max ?? cur
  const accent = mode === 'dmg' ? '#e05252' : mode === 'heal' ? '#34d399' : meta.tone

  const apply = () => {
    if (mode === 'reset') { onResetMax?.(state.kind); onClose(); return }
    onApply?.({ kind: state.kind, mode, value: num, useAbsorb: mode === 'dmg' && isVida ? useAbsorb : false })
    onClose()
  }

  return (
    <Modal open={isOpen} onClose={onClose} title={
      <span className="d-inline-flex align-items-center gap-2">
        <i className={`bi ${meta.icon}`} style={{ color: meta.tone }} />
        Ajustar {meta.label}
      </span>
    } size="sm" closable
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={apply} disabled={mode !== 'reset' && !num}>
          <i className={`bi ${mode === 'dmg' ? 'bi-check-lg' : mode === 'heal' ? 'bi-plus-lg' : 'bi-arrow-repeat'} me-1`} />
          {mode === 'reset' ? 'Restaurar máximo' : `Aplicar ${num || 0}`}
        </Button>
      </>}>
      <div className="text-center mb-3">
        <div className="font-mono text-muted-drako" style={{ fontSize: '0.74rem' }}>{meta.label} atual: <b style={{ color: meta.tone }}>{cur}</b>{max != null ? ` / ${max}` : ''}</div>
      </div>

      <div className="d-flex gap-1 mb-3">
        <ModeTab active={mode === 'dmg'} onClick={() => setMode('dmg')} color="#e05252" icon="bi-dash-circle" label="Dano" />
        <ModeTab active={mode === 'heal'} onClick={() => setMode('heal')} color="#34d399" icon="bi-plus-circle" label="Cura" />
        <ModeTab active={mode === 'reset'} onClick={() => setMode('reset')} color={meta.tone} icon="bi-arrow-repeat" label="Máx" />
      </div>

      {mode !== 'reset' ? (
        <>
          <div className="text-center mb-3" style={{ padding: '0.7rem', border: `1px solid ${accent}44`, borderRadius: 12, background: `${accent}10` }}>
            <div className="font-mono" style={{ fontSize: '0.62rem', color: accent, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{mode === 'dmg' ? 'DANO' : 'CURA'}</div>
            <input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && num) apply() }}
              className="no-spin" autoFocus
              style={{ width: '100%', background: 'transparent', border: 'none', color: accent, fontSize: '2.4rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', textAlign: 'center', outline: 'none' }}
              placeholder="0" />
          </div>

          {mode === 'dmg' && isVida && abs > 0 && (
            <label className="d-flex align-items-center gap-2 mb-2" style={{ padding: '0.5rem 0.7rem', border: '1px solid rgba(192,57,43,0.3)', borderRadius: 10, background: 'rgba(192,57,43,0.05)', cursor: 'pointer' }}>
              <input type="checkbox" checked={useAbsorb} onChange={(e) => setUseAbsorb(e.target.checked)} style={{ accentColor: '#c0392b', width: 18, height: 18 }} />
              <div className="flex-grow-1">
                <div style={{ fontSize: '0.86rem', color: '#ffb4a8' }}><i className="bi bi-shield me-1" />Considerar absorção <b>({abs})</b></div>
                <div className="font-mono text-muted-drako" style={{ fontSize: '0.66rem' }}>Subtrai {abs} do dano (Força). Magia ignora absorção.</div>
              </div>
            </label>
          )}

          <div className="d-flex justify-content-around gap-2" style={{ padding: '0.6rem', border: '1px solid rgba(224,173,51,0.15)', borderRadius: 10, background: 'rgba(0,0,0,0.3)' }}>
            <div className="text-center">
              <div className="font-mono text-muted-drako" style={{ fontSize: '0.62rem' }}>ATUAL</div>
              <div className="font-display" style={{ fontSize: '1.1rem', color: '#fff8e6' }}>{cur}</div>
            </div>
            {mode === 'dmg' && isVida && useAbsorb && abs > 0 && (
              <>
                <i className="bi bi-dash self-center" style={{ color: 'var(--drako-muted)', alignSelf: 'center' }} />
                <div className="text-center">
                  <div className="font-mono text-muted-drako" style={{ fontSize: '0.62rem' }}>ABSORÇÃO</div>
                  <div className="font-display" style={{ fontSize: '1.1rem', color: '#c0392b' }}>{abs}</div>
                </div>
              </>
            )}
            <i className="bi bi-arrow-right-short self-center" style={{ color: accent, fontSize: '1.4rem', alignSelf: 'center' }} />
            <div className="text-center">
              <div className="font-mono" style={{ fontSize: '0.62rem', color: accent }}>NOVO</div>
              <div className="font-display" style={{ fontSize: '1.1rem', color: projected <= 0 && mode === 'dmg' ? '#ff6b6b' : accent }}>{projected}{projected <= 0 && mode === 'dmg' && <i className="bi bi-skull ms-1" style={{ fontSize: '0.8rem' }} />}</div>
            </div>
          </div>

          <div className="d-flex gap-1 mt-3">
            {[5, 10, 15, 20, 30].map(n => (
              <button key={n} className="btn-ghost flex-grow-1" style={{ padding: '0.3rem', fontSize: '0.78rem' }} onClick={() => setValue(String(n))}>+{n}</button>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center" style={{ padding: '1rem', border: `1px solid ${meta.tone}44`, borderRadius: 12, background: `${meta.tone}10` }}>
          <i className="bi bi-arrow-repeat" style={{ color: meta.tone, fontSize: '1.8rem' }} />
          <p className="text-muted-drako mt-2 mb-0" style={{ fontSize: '0.9rem' }}>Redefine {meta.label} para o valor máximo{max != null ? ` (${max})` : ''}.</p>
        </div>
      )}
    </Modal>
  )
}

function ModeTab({ active, onClick, color, icon, label }) {
  return (
    <button onClick={onClick} className="flex-grow-1 d-flex flex-column align-items-center gap-1" style={{
      padding: '0.5rem', borderRadius: 10, cursor: 'pointer',
      border: `1px solid ${active ? color : 'rgba(224,173,51,0.18)'}`,
      background: active ? `${color}1f` : 'rgba(0,0,0,0.25)',
      color: active ? color : 'var(--drako-muted)', fontSize: '0.78rem'
    }}>
      <i className={`bi ${icon}`} style={{ fontSize: '1rem' }} />{label}
    </button>
  )
}
