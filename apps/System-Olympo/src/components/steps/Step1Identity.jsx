import { ARRAYS } from '../../data/attributes'
import AvatarCropper from '../AvatarCropper'

export default function Step1Identity({ char, update }) {
  const availableTypes = Object.keys(ARRAYS)
  const currentArray = ARRAYS[char.arrayTipo] || ARRAYS.Balanceado

  return (
    <div className="space-y-6">
      <div className="section-header text-primary mb-8">
        <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>badge</span>
        Identidade do Personagem
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="shrink-0">
          <label className="block text-outline text-sm mb-2 text-center font-mono uppercase tracking-widest" style={{ fontSize: '10px' }}>Retrato</label>
          <AvatarCropper value={char.avatar} onChange={(v) => update({ avatar: v })} />
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <label className="block text-outline text-sm mb-1 font-mono uppercase tracking-wider" style={{ fontSize: '11px' }}>Nome do Personagem *</label>
            <input type="text" value={char.nome} onChange={(e) => update({ nome: e.target.value })}
              placeholder="Insira o nome..."
              className="w-full bg-surface-container border border-primary/20 text-on-surface focus:border-primary rounded px-3 py-2 transition-colors placeholder:text-outline/40" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-outline text-sm mb-1 font-mono uppercase tracking-wider" style={{ fontSize: '11px' }}>Idade</label>
              <input type="text" value={char.idade || ''} onChange={(e) => update({ idade: e.target.value })}
                placeholder="Opcional"
                className="w-full bg-surface-container border border-primary/20 text-on-surface focus:border-primary rounded px-3 py-2 transition-colors placeholder:text-outline/40" />
            </div>
            <div>
              <label className="block text-outline text-sm mb-1 font-mono uppercase tracking-wider" style={{ fontSize: '11px' }}>Altura</label>
              <input type="text" value={char.altura || ''} onChange={(e) => update({ altura: e.target.value })}
                placeholder="Ex: 1,78m"
                className="w-full bg-surface-container border border-primary/20 text-on-surface focus:border-primary rounded px-3 py-2 transition-colors placeholder:text-outline/40" />
            </div>
            <div>
              <label className="block text-outline text-sm mb-1 font-mono uppercase tracking-wider" style={{ fontSize: '11px' }}>Peso</label>
              <input type="text" value={char.pesoCorporal || ''} onChange={(e) => update({ pesoCorporal: e.target.value })}
                placeholder="Ex: 72kg"
                className="w-full bg-surface-container border border-primary/20 text-on-surface focus:border-primary rounded px-3 py-2 transition-colors placeholder:text-outline/40" />
            </div>
          </div>

          {char.raca && (
            <div>
              <label className="block text-outline text-sm mb-1 font-mono uppercase tracking-wider" style={{ fontSize: '11px' }}>Raça</label>
              <div className="bg-surface-container border border-primary/30 text-primary rounded px-3 py-2 text-sm">
                {char.raca} {char.racaTipo ? `(${char.racaTipo})` : ''}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="codex-card p-5 space-y-4">
        <label className="block text-outline text-sm font-mono uppercase tracking-wider" style={{ fontSize: '11px' }}>Nível da Campanha</label>
        <div className="flex items-center gap-4">
          <input type="range" min={1} max={30} value={char.nivel} onChange={(e) => update({ nivel: Number(e.target.value) })}
            className="flex-1 level-slider"
            style={{
              '--fill': char.nivel <= 8 ? '#60a5fa' : char.nivel <= 16 ? '#f7bd48' : char.nivel <= 24 ? '#c084fc' : '#f87171',
              '--pct': `${((char.nivel - 1) / 29) * 100}%`
            }} />
          <input type="number" min={1} max={30} value={char.nivel} onChange={(e) => update({ nivel: Math.min(30, Math.max(1, Number(e.target.value) || 1)) })}
            className="w-14 bg-surface-container border border-outline/30 text-on-surface focus:border-primary rounded px-2 py-1.5 text-center font-mono text-sm" />
        </div>
        <p className="text-outline text-xs font-mono">
          Faixa: <span style={{ color: 'var(--fill)', transition: 'color 600ms ease' }}>
            {char.nivel <= 8 ? 'Novato (1-8)' : char.nivel <= 16 ? 'Veterano (9-16)' : char.nivel <= 24 ? 'Elite (17-24)' : 'Lendário (25-30)'}
          </span>
        </p>
      </div>

      <div className="codex-card p-5 space-y-4">
        <div>
          <label className="block text-outline text-sm mb-2 font-mono uppercase tracking-wider" style={{ fontSize: '11px' }}>
            Tipo de Array <span className="text-outline/40">(definido pelo Mestre)</span>
          </label>
          <div className="flex gap-3 flex-wrap">
            {availableTypes.map((tipo) => (
              <button key={tipo} onClick={() => update({ arrayTipo: tipo })}
                className={`px-4 py-2 rounded font-semibold transition-colors text-sm font-cinzel uppercase tracking-wider ${char.arrayTipo === tipo ? 'bg-primary text-on-primary' : 'sigil-button text-primary hover:text-white'}`}>
                {tipo}
              </button>
            ))}
          </div>
        </div>
        {currentArray.length > 0 && (
          <div>
            <span className="text-outline text-xs font-mono uppercase tracking-wider">Valores para distribuir:</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {currentArray.map((val, i) => (
                <span key={i} className="bg-surface-container border border-primary/20 text-primary font-mono px-3 py-1 rounded text-sm">{val}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
