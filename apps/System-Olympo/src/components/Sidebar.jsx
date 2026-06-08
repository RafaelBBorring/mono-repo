import { ATTR_ICONS, ATTR_LABELS, getModifier } from '../data/attributes'
import { calcVidaTotal, calcEnergiaTotal, calcPeTotal, calcCA, calcReacoes, calcPercepcaoPassiva } from '../utils/calculator'
import { getRaceAdjustedAttrs, getRaceLabel, calculateRaceBonus } from '../utils/raceCalculator'
import { RACES } from '../data/races'

export default function Sidebar({ char, step }) {
  const sk = char.skeletonPoints || {}
  const adjustedAttrs = getRaceAdjustedAttrs(char.atributos, sk, char)
  const totalAttr = (a) => adjustedAttrs[a] || 0
  const cls = char.classe

  const derived = {
    vida: cls ? calcVidaTotal(cls, char.nivel, char.atributos, sk, char.choices, char.triagemPrincipal, char.triagemPrincipalNivel, char, char.subTriagem, char.subTriagemNivel) : 0,
    energia: cls ? calcEnergiaTotal(cls, char.nivel, char.atributos, sk, char.choices, char.triagemPrincipal, char.triagemPrincipalNivel, char.subTriagem, char.subTriagemNivel, char) : 0,
    pe: cls ? calcPeTotal(cls, char.nivel, char.choices, char) : 0,
    ca: cls ? calcCA(char.atributos, sk, char.pericias, char) : 0,
    reacoes: calcReacoes(char.atributos, sk, char.triagemPrincipal, char.triagemPrincipalNivel, char.subTriagem, char.subTriagemNivel, char),
  }

  return (
    <aside className="hidden lg:block w-72 shrink-0 bg-surface-container-low border-l border-primary/10 p-4 overflow-y-auto max-h-screen sticky top-0">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="font-cinzel text-primary text-lg uppercase tracking-wider">Resumo</h2>
        <div className="flex-1 h-px bg-gradient-to-r from-primary/20 to-transparent" />
      </div>

      {char.nome && <p className="text-on-surface text-sm mb-1"><span className="text-outline">Nome:</span> {char.nome}</p>}
      {char.raca && (
        <div className="text-on-surface text-sm mb-1">
          <span className="text-outline">Raça:</span> {getRaceLabel(char)}
        </div>
      )}
      {(() => {
        const bonus = calculateRaceBonus(char)
        const hasAny = Object.values(bonus.attrs).some(v => v !== 0) || bonus.hp !== 0 || bonus.pe > 0
        if (!hasAny) return null
        return (
          <div className="flex flex-wrap gap-1 mb-2">
            {Object.entries(bonus.attrs).filter(([, v]) => v !== 0).map(([a, v]) => (
              <span key={a} className={`text-xs font-mono px-1 rounded ${v > 0 ? 'text-secondary-fixed-dim bg-secondary-fixed-dim/10' : 'text-err bg-err/10'}`}>
                {v >= 0 ? '+' : ''}{v}{a}
              </span>
            ))}
            {bonus.hp !== 0 && (
              <span className={`text-xs font-mono px-1 rounded ${bonus.hp > 0 ? 'text-resource-vida bg-resource-vida/10' : 'text-err bg-err/10'}`}>
                {bonus.hp >= 0 ? '+' : ''}{bonus.hp}HP
              </span>
            )}
            {bonus.pe > 0 && (
              <span className="text-xs font-mono px-1 rounded text-primary bg-primary/10">
                +{bonus.pe}PE
              </span>
            )}
          </div>
        )
      })()}
      <p className="text-on-surface text-sm mb-1"><span className="text-outline">Nível:</span> {char.nivel}</p>
      {cls && <p className="text-on-surface text-sm mb-3"><span className="text-outline">Classe:</span> {cls}</p>}

      <div className="h-px bg-primary/10 mb-3" />

      <div className="grid grid-cols-2 gap-1.5 mb-4">
        {['FOR','DES','CON','INT','APA','AM'].map(a => {
          const v = totalAttr(a)
          const m = getModifier(v)
          return (
            <div key={a} className="bg-surface-container border border-primary/10 rounded-lg px-2.5 py-1.5 text-xs transition-colors duration-200 hover:border-primary/25">
              <span className="text-outline">{ATTR_ICONS[a]} {a}</span>
              <span className="float-right font-mono text-on-surface">{v} ({m >= 0 ? '+' : ''}{m})</span>
            </div>
          )
        })}
      </div>

      {cls && (
        <div className="space-y-2">
          <Bar label="Vida" value={derived.vida} max={500} color="bg-resource-vida" />
          <Bar label="Energia" value={derived.energia} max={300} color="bg-resource-energia" />
          <Bar label="PE" value={derived.pe} max={50} color="bg-resource-pe" />
          <div className="flex justify-between text-xs text-outline pt-1">
            <span>CA: <span className="text-on-surface font-mono font-semibold">{derived.ca}</span></span>
            <span>Reações: <span className="text-on-surface font-mono font-semibold">{derived.reacoes}</span></span>
          </div>
          {char.triagemPrincipal === 'TANK' && char.triagemPrincipalNivel >= 0.1 && (
            <div className="text-xs text-primary mt-1">Tank: +{char.nivel * 5} Vida</div>
          )}
        </div>
      )}
    </aside>
  )
}

function Bar({ label, value, max, color }) {
  const w = Math.min(100, Math.max(4, (value / max) * 100))
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-outline">{label}</span>
        <span className="font-mono text-on-surface font-semibold">{value}</span>
      </div>
      <div className="h-2 bg-surface-container rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500 ease-out`} style={{ width: `${w}%` }} />
      </div>
    </div>
  )
}
