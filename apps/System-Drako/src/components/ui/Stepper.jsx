import React from 'react'

export default function Stepper({ steps, current, onJump, completed = [] }) {
  return (
    <div className="d-flex align-items-center gap-1 flex-wrap">
      {steps.map((s, i) => {
        const isCurrent = i === current
        const isDone = completed.includes(i) || i < current
        return (
          <React.Fragment key={s.key}>
            <button
              type="button"
              onClick={() => onJump?.(i)}
              className="d-flex align-items-center gap-2 px-3 py-2"
              style={{
                borderRadius: 10,
                border: `1px solid ${isCurrent ? 'rgba(224,173,51,0.6)' : 'rgba(224,173,51,0.15)'}`,
                background: isCurrent ? 'rgba(224,173,51,0.12)' : 'transparent',
                cursor: 'pointer',
                transition: 'all .25s'
              }}
            >
              <span style={{
                width: 26, height: 26, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Cinzel', fontSize: '0.8rem', fontWeight: 600,
                background: isDone ? 'linear-gradient(135deg,#f6d98c,#c8921b)' : 'rgba(0,0,0,0.4)',
                color: isDone ? '#1a1408' : 'var(--drako-muted)',
                border: '1px solid rgba(224,173,51,0.3)'
              }}>
                {isDone ? <i className="bi bi-check-lg" /> : i + 1}
              </span>
              <span style={{
                fontFamily: 'Cinzel', fontSize: '0.78rem', letterSpacing: '0.04em',
                color: isCurrent ? 'var(--drako-gold-soft)' : 'var(--drako-muted)',
                textTransform: 'uppercase'
              }}>{s.short || s.title}</span>
            </button>
            {i < steps.length - 1 && <span style={{ width: 18, height: 1, background: 'rgba(224,173,51,0.2)' }} />}
          </React.Fragment>
        )
      })}
    </div>
  )
}
