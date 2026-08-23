'use client';

export default function Filters({ filters, onChange, count }) {
  const update = (patch) => onChange({ ...filters, ...patch });

  return (
    <div className="surface rounded-2xl p-3 flex flex-wrap items-center gap-2.5">
      <div className="flex-1 min-w-[200px] relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dusk text-sm">⌕</span>
        <input
          type="search"
          value={filters.q}
          onChange={(e) => update({ q: e.target.value })}
          placeholder="Buscar por título, órgão, tecnologia…"
          className="field pl-9"
        />
      </div>

      <div className="flex items-center gap-1.5">
        <Pill label="Tudo" active={filters.scope === 'all'} onClick={() => update({ scope: 'all' })} />
        <Pill label="Software" active={filters.scope === 'software'} onClick={() => update({ scope: 'software' })} />
        <Pill label="Games" active={filters.scope === 'games'} onClick={() => update({ scope: 'games' })} />
      </div>

      <select value={filters.sort} onChange={(e) => update({ sort: e.target.value })} className="field max-w-[170px] !py-2 text-xs">
        <option value="deadline">Prazo (mais próximo)</option>
        <option value="value">Maior valor</option>
        <option value="score">Maior match</option>
      </select>

      <div className="text-xs text-dusk whitespace-nowrap font-mono ml-auto pr-1">
        {count} {count === 1 ? 'edital' : 'editais'}
      </div>
    </div>
  );
}

function Pill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
        active ? 'bg-mint/10 border-mint/40 text-mint-light' : 'bg-transparent border-white/8 text-dusk hover:text-ivory hover:border-white/20'
      }`}
    >
      {label}
    </button>
  );
}
