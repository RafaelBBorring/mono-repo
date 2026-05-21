import { useEffect, useCallback } from 'react'
import { calcVidaTotal, calcEnergiaTotal, calcPeTotal, calcCA, calcReacoes, calcDanoBase } from '../utils/calculator'
import { getRaceLabel } from '../utils/raceCalculator'
import { getModifier } from '../data/attributes'
import { CLASSES } from '../data/classes'
import { GRAU_NAMES } from '../data/pericias'

const LEVEL_TIERS = [
  { min: 1, max: 8, label: 'Novato', color: '#60a5fa', text: 'text-sky-400', bg: 'bg-sky-400/10', border: 'border-sky-400/30' },
  { min: 9, max: 16, label: 'Veterano', color: '#f7bd48', text: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30' },
  { min: 17, max: 24, label: 'Elite', color: '#c084fc', text: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30' },
  { min: 25, max: 30, label: 'Lendário', color: '#f87171', text: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/30' },
]

function getLevelTier(level) {
  return LEVEL_TIERS.find(t => level >= t.min && level <= t.max) || LEVEL_TIERS[0]
}

function getDerivedStats(char) {
  const sk = char.skeletonPoints || {}
  const cls = char.classe
  if (!cls) return { vida: 0, energia: 0, pe: 0, ca: 0, reacoes: 0, dano: '' }
  return {
    vida: calcVidaTotal(cls, char.nivel, char.atributos, sk, char.choices, char.triagemPrincipal, char.triagemPrincipalNivel, char, char.subTriagem, char.subTriagemNivel),
    energia: calcEnergiaTotal(cls, char.nivel, char.atributos, sk, char.choices, char.triagemPrincipal, char.triagemPrincipalNivel, char.subTriagem, char.subTriagemNivel, char),
    pe: calcPeTotal(cls, char.nivel, char.choices, char),
    ca: calcCA(char.atributos, sk, char.pericias, char),
    reacoes: calcReacoes(char.atributos, sk, char.triagemPrincipal, char.triagemPrincipalNivel, char.subTriagem, char.subTriagemNivel, char),
    dano: calcDanoBase(cls, char.atributos, sk, char.nivel, char.subTriagem, char.subTriagemNivel, char.triagemPrincipal, char.triagemPrincipalNivel, char),
  }
}

const ATTR_ICONS = { FOR: '🏋', DES: '🎯', CON: '🛡', INT: '🧠', APA: '✨', AM: '🔮' }

export default function SessionSheetModal({ sheet, getUserName, onClose, onViewSheet }) {
  const char = sheet.data || {}
  const sk = char.skeletonPoints || {}
  const level = char.nivel || 1
  const tier = getLevelTier(level)
  const derived = getDerivedStats(char)

  const vidaAtual = char.vidaAtual ?? derived.vida
  const energiaAtual = char.energiaAtual ?? derived.energia
  const peAtual = char.peAtual ?? derived.pe

  const totalAttr = (a) => (char.atributos?.[a] || 0) + (sk[a] || 0)

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  const periciasArr = Object.entries(char.pericias || {}).filter(([, v]) => v > 0)
  const habilidades = (char.habilidades || []).filter(h => h.nome)
  const weapon = char.arma ? { id: char.arma, rank: char.armaRank || 'Comum' } : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl max-h-[85vh] bg-deep border border-sep/50 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col animate-in"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'modalIn 0.25s ease-out' }}
      >
        <style>{`
          @keyframes modalIn {
            from { opacity: 0; transform: scale(0.95) translateY(10px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        <div className="flex items-center justify-between p-5 border-b border-sep/30 bg-gradient-to-r from-void/80 to-transparent">
          <div className="flex items-center gap-4">
            {char.avatar ? (
              <img src={char.avatar} alt="" className="w-14 h-14 rounded-xl object-cover border-2 border-sep/50" />
            ) : (
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-cinzel border-2"
                style={{ borderColor: tier.color + '50', color: tier.color, background: tier.color + '15' }}
              >
                {(char.nome || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="font-cinzel text-on-surface text-xl">{char.nome || sheet.name || 'Sem nome'}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-txt-dim">{char.raca ? getRaceLabel(char) : '—'}</span>
                <span className="text-sep text-xs">·</span>
                <span className="text-xs text-on-surface-variant">{char.classe || '—'}</span>
                <span className="text-sep text-xs">·</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${tier.bg} ${tier.text} ${tier.border}`}>
                  Nv {level} — {tier.label}
                </span>
              </div>
              <p className="text-[10px] text-txt-dim/50 mt-0.5">Jogador: {getUserName(sheet.user_id)}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-void/80 border border-sep/50 flex items-center justify-center text-txt-dim hover:text-err transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Vida" value={vidaAtual} max={derived.vida} color="text-resource-vida" barColor="bg-resource-vida" />
            <MiniStat label="Energia" value={energiaAtual} max={derived.energia} color="text-resource-energia" barColor="bg-resource-energia" />
            <MiniStat label="PE" value={peAtual} max={derived.pe} color="text-resource-pe" barColor="bg-resource-pe" />
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            <StatBox label="CA" value={derived.ca} />
            <StatBox label="Reações" value={derived.reacoes} />
            <StatBox label="Dano" value={derived.dano || '—'} small />
            <StatBox label="Classe" value={CLASSES[char.classe]?.name || char.classe || '—'} small />
            <StatBox label="Nível" value={level} />
          </div>

          <div>
            <h4 className="text-txt-dim text-[10px] font-semibold uppercase tracking-wider mb-2">Atributos</h4>
            <div className="grid grid-cols-6 gap-2">
              {['FOR', 'DES', 'CON', 'INT', 'APA', 'AM'].map(a => {
                const v = totalAttr(a)
                const m = getModifier(v)
                return (
                  <div key={a} className="bg-void/80 border border-sep/30 rounded-lg px-2 py-2 text-center">
                    <span className="text-txt-dim text-[9px] block">{ATTR_ICONS[a]} {a}</span>
                    <span className="text-on-surface font-mono text-sm font-semibold block">{v}</span>
                    <span className={`text-[9px] font-mono block ${m >= 0 ? 'text-ok' : 'text-err'}`}>
                      {m >= 0 ? '+' : ''}{m}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {char.triagemPrincipal && (
            <div>
              <h4 className="text-txt-dim text-[10px] font-semibold uppercase tracking-wider mb-2">Triagem</h4>
              <div className="flex gap-2">
                <span className="text-[10px] bg-amber-400/10 text-amber-400 px-2 py-1 rounded border border-amber-400/20">
                  {char.triagemPrincipal} ({char.triagemPrincipalNivel || 0})
                </span>
                {char.subTriagem && (
                  <span className="text-[10px] bg-cyan-400/10 text-cyan-400 px-2 py-1 rounded border border-cyan-400/20">
                    {char.subTriagem} ({char.subTriagemNivel || 0})
                  </span>
                )}
              </div>
            </div>
          )}

          {periciasArr.length > 0 && (
            <div>
              <h4 className="text-txt-dim text-[10px] font-semibold uppercase tracking-wider mb-2">Perícias ({periciasArr.length})</h4>
              <div className="flex flex-wrap gap-1.5">
                {periciasArr.map(([name, grau]) => (
                  <span key={name} className="text-[10px] bg-cyan-400/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-400/20">
                    {name} ({GRAU_NAMES[grau]})
                  </span>
                ))}
              </div>
            </div>
          )}

          {habilidades.length > 0 && (
            <div>
              <h4 className="text-txt-dim text-[10px] font-semibold uppercase tracking-wider mb-2">Habilidades ({habilidades.length})</h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {habilidades.map((h, i) => (
                  <div key={i} className="rounded-lg border border-sep/30 bg-void/40 p-2.5">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                        h.status === 'Aprovada' ? 'bg-ok/10 text-ok border border-ok/20' :
                        h.status === 'Revisão necessária' ? 'bg-err/10 text-err border border-err/20' :
                        'bg-warn/10 text-warn border border-warn/20'
                      }`}>{h.status}</span>
                      <span className="text-[9px] bg-sep/20 text-txt-dim px-1.5 py-0.5 rounded">{h.tipo}</span>
                      <span className="text-on-surface text-xs font-semibold flex-1">{h.nome}</span>
                    </div>
                    {h.descricao && <p className="text-txt-dim text-[11px] leading-relaxed">{h.descricao}</p>}
                    <div className="flex gap-3 text-[10px] mt-1">
                      {h.custoEnergia > 0 && <span className="text-sky-400 font-mono">⚡{h.custoEnergia}</span>}
                      {h.dano && <span className="text-red-400 font-mono">⚔{h.dano}</span>}
                      {h.duracao && <span className="text-amber-400">⏱{h.duracao}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {weapon && (
            <div>
              <h4 className="text-txt-dim text-[10px] font-semibold uppercase tracking-wider mb-2">Arma</h4>
              <div className="bg-void/40 border border-sep/30 rounded-lg p-2.5">
                <span className="text-on-surface text-xs font-semibold">{char.arma}</span>
                <span className="text-[9px] bg-gold/10 text-gold px-1.5 py-0.5 rounded ml-2">{char.armaRank || 'Comum'}</span>
              </div>
            </div>
          )}

          {(char.inventario || []).length > 0 && (
            <div>
              <h4 className="text-txt-dim text-[10px] font-semibold uppercase tracking-wider mb-2">Inventário ({(char.inventario || []).length})</h4>
              <div className="flex flex-wrap gap-1.5">
                {(char.inventario || []).slice(0, 15).map((item, i) => (
                  <span key={i} className="text-[10px] bg-sep/20 text-txt-dim px-2 py-0.5 rounded">{item.nome || `Item ${i + 1}`}</span>
                ))}
                {(char.inventario || []).length > 15 && (
                  <span className="text-[10px] text-txt-dim/50">+{(char.inventario || []).length - 15} mais</span>
                )}
              </div>
            </div>
          )}

          {(char.modulosAdquiridos || []).length > 0 && (
            <div>
              <h4 className="text-txt-dim text-[10px] font-semibold uppercase tracking-wider mb-2">Módulos ({(char.modulosAdquiridos || []).length})</h4>
              <div className="flex flex-wrap gap-1.5">
                {(char.modulosAdquiridos || []).map((m, i) => (
                  <span key={i} className="text-[10px] bg-amber-400/10 text-amber-400 px-2 py-0.5 rounded border border-amber-400/20">
                    {m.id}{(m.boughtCount || 1) > 1 ? ` ×${m.boughtCount}` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-sep/30 bg-void/50">
          {onViewSheet && (
            <button
              onClick={() => { onClose(); onViewSheet(sheet.id) }}
              className="flex items-center gap-1.5 text-xs border border-primary/40 text-primary px-4 py-2 rounded-lg hover:bg-primary hover:text-on-primary transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>description</span>
              Abrir Ficha Completa
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs border border-sep/50 text-txt-dim px-4 py-2 rounded-lg hover:text-on-surface transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

function MiniStat({ label, value, max, color, barColor }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const isLow = pct > 0 && pct <= 25
  return (
    <div className="rounded-lg bg-void/60 border border-sep/30 p-3 text-center">
      <span className="text-[9px] text-txt-dim uppercase tracking-wider block mb-1">{label}</span>
      <span className={`font-mono text-lg font-bold block ${isLow ? 'text-err' : color}`}>{value}</span>
      <span className="text-[9px] text-txt-dim block">/ {max}</span>
      <div className="h-1.5 bg-void rounded-full overflow-hidden mt-1.5">
        <div className={`h-full rounded-full transition-all duration-500 ${isLow ? 'bg-err' : barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function StatBox({ label, value, small }) {
  return (
    <div className="rounded-lg bg-void/60 border border-sep/30 p-2.5 text-center">
      <span className="text-[9px] text-txt-dim uppercase tracking-wider block mb-0.5">{label}</span>
      <span className={`font-mono text-on-surface block ${small ? 'text-xs' : 'text-sm font-semibold'}`}>{value}</span>
    </div>
  )
}
