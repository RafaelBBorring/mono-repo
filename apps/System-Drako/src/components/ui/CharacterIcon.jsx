import React from 'react'
import { ATTR_BY_KEY } from '../../data/attributes.js'

export default function CharacterIcon({ character, size = 64, ring = true, showFallback = true }) {
  const icon = character?.icon
  const lvl = character?.level
  const wrapper = {
    width: size, height: size, borderRadius: '50%',
    position: 'relative', overflow: 'hidden', flex: '0 0 auto',
    border: ring ? '2px solid rgba(224,173,51,0.5)' : 'none',
    boxShadow: ring ? '0 0 0 2px rgba(5,4,3,0.7), 0 6px 18px -6px rgba(0,0,0,0.8)' : 'none',
    background: 'radial-gradient(circle at 50% 30%, #1c1812, #0a0806)'
  }
  const initials = (character?.name || '?').trim().slice(0, 2).toUpperCase()

  return (
    <div style={wrapper} className="no-select">
      {icon?.dataUrl ? (
        <img src={icon.dataUrl} alt={character?.name} draggable={false}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
            objectPosition: `${icon.x || 50}% ${icon.y || 50}%`,
            transform: `scale(${icon.scale || 1})`, transformOrigin: 'center'
          }} />
      ) : showFallback ? (
        <div className="d-flex align-items-center justify-content-center h-100 font-display gold-text" style={{ fontSize: size * 0.34 }}>
          {initials}
        </div>
      ) : null}
      {lvl && size >= 48 && (
        <span style={{
          position: 'absolute', right: -2, bottom: -2,
          background: 'linear-gradient(135deg,#f6d98c,#7c570e)', color: '#1a1408',
          fontFamily: 'Cinzel', fontWeight: 700, fontSize: size * 0.16,
          borderRadius: 999, padding: '1px 6px', border: '2px solid #050403', lineHeight: 1.2
        }}>
          {lvl[0].toUpperCase()}
        </span>
      )}
    </div>
  )
}
