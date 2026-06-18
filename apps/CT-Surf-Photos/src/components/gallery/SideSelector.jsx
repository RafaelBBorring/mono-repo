import React, { useState } from 'react'
import SurferGrid from './SurferGrid'

export default function SideSelector({ sides, onSelectSurfer }) {
  const [active, setActive] = useState('esquerdo')

  const tabs = [
    { key: 'esquerdo', label: 'Esquerdo', icon: '←' },
    { key: 'direito', label: 'Direito', icon: '→' },
  ]

  return (
    <div>
      <div className="flex gap-2 mb-5">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`
              flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200
              flex items-center justify-center gap-2
              ${active === tab.key
                ? 'bg-gradient-to-r from-ocean-500 to-ocean-600 text-white shadow-lg shadow-ocean-500/25'
                : 'bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] border border-white/[0.06]'
              }
            `}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            <span className={`text-xs ${active === tab.key ? 'text-white/70' : 'text-slate-500'}`}>
              ({sides[tab.key].surfers.length})
            </span>
          </button>
        ))}
      </div>

      <SurferGrid surfers={sides[active].surfers} onSelect={onSelectSurfer} />
    </div>
  )
}
