import { useState, useEffect, useCallback, useMemo } from 'react'

const TYPE_STYLES = {
  'Passiva': { bg: 'bg-emerald-400/8', border: 'border-emerald-400/25', text: 'text-emerald-400', badge: 'bg-emerald-400/15 text-emerald-400', label: 'PASSIVA' },
  'Ativa': { bg: 'bg-indigo-400/8', border: 'border-indigo-400/25', text: 'text-indigo-300', badge: 'bg-indigo-400/15 text-indigo-300', label: 'ATIVA' },
  'Ultimate': { bg: 'bg-amber-400/8', border: 'border-amber-400/25', text: 'text-amber-300', badge: 'bg-amber-400/15 text-amber-300', label: 'ULTIMATE' },
  'Extra (Triagem)': { bg: 'bg-purple-400/8', border: 'border-purple-400/25', text: 'text-purple-400', badge: 'bg-purple-400/15 text-purple-400', label: 'TRIAGEM' },
  'Extra (Módulo)': { bg: 'bg-sky-400/8', border: 'border-sky-400/25', text: 'text-sky-400', badge: 'bg-sky-400/15 text-sky-400', label: 'MÓDULO' },
  'Arma': { bg: 'bg-rose-400/8', border: 'border-rose-400/25', text: 'text-rose-400', badge: 'bg-rose-400/15 text-rose-400', label: 'ARMA' },
  'Extra': { bg: 'bg-orange-400/8', border: 'border-orange-400/25', text: 'text-orange-400', badge: 'bg-orange-400/15 text-orange-400', label: 'EXTRA' },
  'Feitiço': { bg: 'bg-violet-400/8', border: 'border-violet-400/25', text: 'text-violet-400', badge: 'bg-violet-400/15 text-violet-400', label: 'MAGIA' },
  'Magia': { bg: 'bg-violet-400/8', border: 'border-violet-400/25', text: 'text-violet-400', badge: 'bg-violet-400/15 text-violet-400', label: 'MAGIA' },
  'Runa': { bg: 'bg-cyan-400/8', border: 'border-cyan-400/25', text: 'text-cyan-400', badge: 'bg-cyan-400/15 text-cyan-400', label: 'RUNA' },
  'Ritual': { bg: 'bg-fuchsia-400/8', border: 'border-fuchsia-400/25', text: 'text-fuchsia-400', badge: 'bg-fuchsia-400/15 text-fuchsia-400', label: 'RITUAL' },
}

const DEFAULT_STYLE = { bg: 'bg-gray-400/8', border: 'border-gray-400/25', text: 'text-gray-400', badge: 'bg-gray-400/15 text-gray-400', label: 'OUTRO' }

function getTypeStyle(tipo) {
  return TYPE_STYLES[tipo] || DEFAULT_STYLE
}

function makeId(cat, idx, name) {
  return `${cat}__${idx}__${(name || '').replace(/\s+/g, '_').slice(0, 20)}`
}

function extractDmg(text) {
  if (!text) return null
  const m = text.match(/\d+d\d+[\+\d]*/i)
  return m ? m[0] : null
}

function extractDuration(text) {
  if (!text) return null
  const m = text.match(/\d+\s*(?:turno|rodada|round|minuto|hora|cena)s?/i)
  return m ? m[0] : null
}

function extractDT(text) {
  if (!text) return null
  const m = text.match(/(?:DT|CD|dificuldade)\s*[:=]?\s*\d+/i)
  return m ? m[0] : null
}

function summarize(desc, maxLen = 80) {
  if (!desc) return ''
  const clean = desc.replace(/\n/g, ' ').trim()
  return clean.length > maxLen ? clean.slice(0, maxLen - 1) + '…' : clean
}

function categorize(char) {
  const cats = []
  const base = (char.habilidades || []).filter(h => h.nome)
  const baseTypes = ['Passiva', 'Ativa', 'Ultimate']
  const baseAbs = base.filter(h => baseTypes.includes(h.tipo))
  if (baseAbs.length > 0) cats.push({ key: 'base', title: 'Habilidades Base', items: baseAbs })

  const triagem = base.filter(h => h.tipo === 'Extra (Triagem)')
  if (triagem.length > 0) cats.push({ key: 'triagem', title: 'Triagens', items: triagem })

  const modulo = base.filter(h => h.tipo === 'Extra (Módulo)')
  if (modulo.length > 0) cats.push({ key: 'modulo', title: 'Módulos', items: modulo })

  const weaponAbs = (char.armaHabilidades || []).filter(h => h.nome)
  if (weaponAbs.length > 0) cats.push({ key: 'weapon', title: 'Arma', items: weaponAbs.map(h => ({ ...h, tipo: h.tipo || 'Arma' })) })

  const extras = (char.habilidadesExtras || []).filter(h => h.nome)
  if (extras.length > 0) cats.push({ key: 'extra', title: 'Extras do Mestre', items: extras.map(h => ({ ...h, tipo: h.tipo || 'Extra' })) })

  const mysticSources = [
    { key: 'spells', title: 'Feitiços', items: char.spells || [], tipo: 'Feitiço' },
    { key: 'runes', title: 'Runas', items: char.runes || [], tipo: 'Runa' },
    { key: 'magics', title: 'Magias', items: char.magics || [], tipo: 'Magia' },
    { key: 'alchemyRituals', title: 'Rituais', items: char.alchemyRituals || [], tipo: 'Ritual' },
  ]
  for (const src of mysticSources) {
    const items = src.items.filter(it => it.name || it.nome)
    if (items.length > 0) {
      cats.push({
        key: src.key,
        title: src.title,
        items: items.map(it => ({
          nome: it.name || it.nome,
          descricao: it.effect || it.descricao || it.short_description || '',
          tipo: src.tipo,
          custoEnergia: it.cost || it.custoEnergia || 0,
          dano: it.damage || it.dano || '',
          duracao: it.duration || it.duracao || '',
        })),
      })
    }
  }

  return cats
}

function Highlight({ text, extractFn, colorClass }) {
  if (!text) return null
  const match = extractFn(text)
  if (!match) return null
  return <span className={`${colorClass} font-mono font-semibold text-[11px]`}>{match}</span>
}

function AbilityCard({ ability, catKey, idx, isFav, onToggleFav }) {
  const style = getTypeStyle(ability.tipo)
  const id = makeId(catKey, idx, ability.nome)
  const desc = summarize(ability.descricao, 100)
  const combined = [ability.descricao, ability.dano, ability.duracao].filter(Boolean).join(' ')

  return (
    <div className={`relative rounded-lg border ${style.border} ${style.bg} p-2.5 transition-all hover:border-opacity-60 group`}>
      <button
        onClick={() => onToggleFav(id)}
        className={`absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded transition-all ${
          isFav ? 'text-amber-400 scale-110' : 'text-white/20 opacity-0 group-hover:opacity-100'
        }`}
        title={isFav ? 'Remover dos favoritos' : 'Favoritar (máx. 6)'}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: isFav ? "'FILL' 1" : "'FILL' 0" }}>
          star
        </span>
      </button>

      <div className="flex items-center gap-2 pr-7 mb-1">
        <span className={`text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded ${style.badge}`}>
          {style.label}
        </span>
        <span className="text-white/90 font-cinzel text-sm font-semibold truncate">
          {ability.nome}
        </span>
      </div>

      {desc && (
        <p className="text-white/50 font-newsreader text-[12px] leading-relaxed mb-1.5">
          {desc}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        {ability.custoEnergia > 0 && (
          <span className="text-sky-400 font-mono text-[11px] flex items-center gap-0.5">
            <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>bolt</span>
            {ability.custoEnergia} PE
          </span>
        )}
        {ability.dano && (
          <span className="text-red-400 font-mono font-semibold text-[11px]">
            ⚔ {ability.dano}
          </span>
        )}
        {!ability.dano && combined && <Highlight text={combined} extractFn={extractDmg} colorClass="text-red-400" />}
        {ability.duracao && (
          <span className="text-blue-400 font-mono font-semibold text-[11px]">
            ⏱ {ability.duracao}
          </span>
        )}
        {!ability.duracao && combined && <Highlight text={combined} extractFn={extractDuration} colorClass="text-blue-400" />}
        {combined && <Highlight text={combined} extractFn={extractDT} colorClass="text-amber-400" />}
      </div>
    </div>
  )
}

function CombatBarItem({ ability, catKey, idx, onClick }) {
  const style = getTypeStyle(ability.tipo)
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center min-w-[56px] rounded-lg border ${style.border} ${style.bg} px-1.5 py-1.5 hover:border-opacity-80 transition-all cursor-pointer group`}
      title={`${ability.nome}${ability.custoEnergia > 0 ? ` — ${ability.custoEnergia} PE` : ''}`}
    >
      <span className="material-symbols-outlined text-amber-400 mb-0.5" style={{ fontSize: '10px', fontVariationSettings: "'FILL' 1" }}>
        star
      </span>
      <span className="text-white/80 text-[10px] font-cinzel leading-tight truncate max-w-[52px]">
        {ability.nome.length > 8 ? ability.nome.slice(0, 7) + '…' : ability.nome}
      </span>
      {ability.custoEnergia > 0 && (
        <span className="text-sky-400 font-mono text-[8px]">{ability.custoEnergia}PE</span>
      )}
    </button>
  )
}

export default function QuickAbilitySheet({ char, onUpdateChar }) {
  const [open, setOpen] = useState(false)
  const [expandedCat, setExpandedCat] = useState(null)

  const favorites = useMemo(() => char?.habilidadesFavoritas || [], [char?.habilidadesFavoritas])

  const categories = useMemo(() => categorize(char || {}), [char])

  const allItems = useMemo(() => {
    const map = new Map()
    for (const cat of categories) {
      cat.items.forEach((item, idx) => {
        map.set(makeId(cat.key, idx, item.nome), { ...item, catKey: cat.key, idx })
      })
    }
    return map
  }, [categories])

  const favItems = useMemo(() => {
    return favorites
      .map(id => {
        const item = allItems.get(id)
        return item ? { ...item, _id: id } : null
      })
      .filter(Boolean)
  }, [favorites, allItems])

  const toggleFav = useCallback((id) => {
    const current = [...favorites]
    const idx = current.indexOf(id)
    if (idx >= 0) {
      current.splice(idx, 1)
    } else {
      if (current.length >= 6) return
      current.push(id)
    }
    if (onUpdateChar) onUpdateChar({ habilidadesFavoritas: current })
  }, [favorites, onUpdateChar])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') setOpen(false)
  }, [])

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleKeyDown])

  const hasContent = categories.length > 0

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-amber-600/90 to-amber-900/90 border-2 border-amber-400/50 shadow-lg shadow-amber-900/30 flex items-center justify-center text-white hover:scale-110 hover:border-amber-300 transition-all backdrop-blur-sm"
        title="Quick Ability Sheet"
      >
        <span className="text-2xl leading-none select-none">⚔</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <style>{`
            @keyframes qasSlideIn {
              from { transform: translateX(100%); opacity: 0.5; }
              to { transform: translateX(0); opacity: 1; }
            }
          `}</style>
          <div
            className="absolute top-0 right-0 h-full w-full max-w-[420px] bg-black/85 backdrop-blur-xl border-l border-amber-400/15 shadow-2xl shadow-black/60 flex flex-col"
            style={{ animation: 'qasSlideIn 0.3s ease-out' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 bg-gradient-to-r from-amber-900/15 to-transparent shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⚔</span>
                <h2 className="font-cinzel text-amber-200 text-lg tracking-wide">Quick Ability Sheet</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-red-400 hover:border-red-400/30 transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
              </button>
            </div>

            {favItems.length > 0 && (
              <div className="px-4 py-3 border-b border-white/8 bg-amber-400/3 shrink-0">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="material-symbols-outlined text-amber-400" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="text-amber-300/80 font-cinzel text-[11px] tracking-wider uppercase">Combat Bar ({favItems.length}/6)</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {favItems.map(item => (
                    <CombatBarItem
                      key={item._id}
                      ability={item}
                      catKey={item.catKey}
                      idx={item.idx}
                      onClick={() => setExpandedCat(item.catKey)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
              {!hasContent && (
                <div className="flex flex-col items-center justify-center py-16 text-white/25">
                  <span className="material-symbols-outlined mb-3" style={{ fontSize: '48px' }}>auto_awesome</span>
                  <p className="font-cinzel text-sm">Nenhuma habilidade encontrada</p>
                  <p className="text-[11px] mt-1 text-white/15">Crie habilidades na ficha do personagem</p>
                </div>
              )}

              {categories.map(cat => {
                const isExpanded = expandedCat === cat.key
                return (
                  <div key={cat.key}>
                    <button
                      onClick={() => setExpandedCat(isExpanded ? null : cat.key)}
                      className="w-full flex items-center justify-between mb-2 group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-white/30 text-[10px] font-mono">{cat.items.length}</span>
                        <h3 className="font-cinzel text-white/70 text-sm tracking-wide group-hover:text-amber-300 transition-colors">
                          {cat.title}
                        </h3>
                      </div>
                      <span className="material-symbols-outlined text-white/25 transition-transform" style={{ fontSize: '16px', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        expand_more
                      </span>
                    </button>

                    <div className={`space-y-2 transition-all duration-200 ${isExpanded ? '' : 'max-h-[500px] overflow-hidden'}`}>
                      {cat.items.map((item, idx) => {
                        const id = makeId(cat.key, idx, item.nome)
                        return (
                          <AbilityCard
                            key={id}
                            ability={item}
                            catKey={cat.key}
                            idx={idx}
                            isFav={favorites.includes(id)}
                            onToggleFav={toggleFav}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="px-4 py-3 border-t border-white/8 bg-black/40 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-white/25 text-[10px] font-mono">
                  {allItems.size} habilidades · {favorites.length}/6 favoritas
                </span>
                <span className="text-white/15 text-[9px]">ESC para fechar</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
