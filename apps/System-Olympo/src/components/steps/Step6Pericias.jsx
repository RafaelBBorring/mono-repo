import { PERICIAS, getMaxGrauForLevel, GRAU_NAMES, getPericiaBonus } from '../../data/pericias'
import { calcPericiasAvailable } from '../../utils/calculator'
import { getModifier } from '../../data/attributes'
import { getRaceAdjustedAttrs } from '../../utils/raceCalculator'

export default function Step6Pericias({ char, update, updateNested }) {
  const classe = char.classe
  const nivel = char.nivel || 1
  const sk = char.skeletonPoints || {}
  const attrs = char.atributos || {}
  const pericias = char.pericias || {}
  const choices = char.choices || {}
  const modulosAdquiridos = char.modulosAdquiridos || []

  const adjustedAttrs = getRaceAdjustedAttrs(attrs, sk, char)
  const totalAttr = (a) => adjustedAttrs[a] || 0

  const available = classe ? calcPericiasAvailable(classe, nivel, choices, modulosAdquiridos, char) : 0
  const maxGrau = getMaxGrauForLevel(nivel)

  const used = Object.values(pericias).reduce((sum, g) => sum + (g > 0 ? g : 0), 0)
  const remaining = available - used

  function getEffectiveAttrs(pericia) {
    return pericia.attrs.map(a => {
      const val = totalAttr(a)
      return { attr: a, val, mod: getModifier(val) }
    })
  }

  function cycleGrau(periciaName, currentGrau) {
    if (currentGrau === 0) {
      if (remaining <= 0) return
      updateNested('pericias', { [periciaName]: 1 })
    } else if (currentGrau < maxGrau) {
      if (remaining <= 0) return
      updateNested('pericias', { [periciaName]: currentGrau + 1 })
    } else {
      updateNested('pericias', { [periciaName]: 0 })
    }
  }

  function getBonus(pericia, grau) {
    const resolved = getEffectiveAttrs(pericia)
    const bestMod = Math.max(...resolved.map(r => r.mod))
    return bestMod + grau * 5
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-cinzel text-gold text-xl">Etapa 6: Perícias</h2>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-sm ${remaining < 0 ? 'text-err' : remaining === 0 ? 'text-ok' : 'text-txt-main'}`}>
            {used}/{available}
          </span>
          <span className="text-txt-dim text-xs">pontos usados</span>
        </div>
      </div>

      <div className="bg-deep border border-sep rounded p-3 flex flex-wrap items-center gap-4 text-xs text-txt-dim">
        <span>Grau máximo: <span className="text-gold font-mono">{maxGrau}</span> ({GRAU_NAMES[maxGrau]})</span>
        <span>Disponíveis: <span className={`font-mono ${remaining > 0 ? 'text-ok' : remaining === 0 ? 'text-txt-dim' : 'text-err'}`}>{remaining}</span></span>
        <span className="text-gold-light">Cada grau custa 1 ponto</span>
        <span className="text-teal-300">Alquimia aumenta espacos e circulos dos rituais.</span>
        {(modulosAdquiridos || []).filter(m => m.id === 'treino_intensivo').length > 0 && (() => {
          const ti = modulosAdquiridos.find(m => m.id === 'treino_intensivo')
          return <span className="text-blue-400">Treino Intensivo: +{(ti.boughtCount || 1) * 2} pontos</span>
        })()}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {PERICIAS.map(pericia => {
          const grau = pericias[pericia.name] || 0
          const resolved = getEffectiveAttrs(pericia)
          const bestAttr = resolved.reduce((a, b) => a.mod >= b.mod ? a : b)
          const bonus = getBonus(pericia, grau)
          const canUpgrade = remaining > 0 && (grau === 0 || grau < maxGrau)

          return (
            <div
              key={pericia.name}
              className={`text-left border rounded p-3 transition-colors ${
                grau > 0
                  ? 'bg-deep border-gold/50 hover:border-gold'
                  : canUpgrade
                    ? 'bg-deep border-sep hover:border-gold/50'
                    : 'bg-deep border-sep/30'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`font-body text-sm truncate mr-2 ${grau > 0 ? 'text-txt-main' : 'text-txt-dim'}`}>
                  {pericia.name}
                </span>
                <span className={`font-mono text-xs shrink-0 ${grau > 0 ? 'text-gold' : 'text-txt-dim'}`}>
                  {bonus >= 0 ? '+' : ''}{bonus}
                </span>
              </div>
              <div className="text-xs text-txt-dim mb-2">
                {pericia.attrs.join('/')}
                {pericia.attrs.length > 1 && (
                  <span className="text-gold ml-1">({bestAttr.attr})</span>
                )}
              </div>
              {pericia.name === 'Alquimia' && (
                <div className="mb-2 text-[10px] text-teal-300 bg-teal-400/10 border border-teal-400/15 rounded px-2 py-1">
                  Cada grau em Alquimia expande seu orcamento ritualistico e o teto de circulos acessiveis.
                </div>
              )}
              {pericia.name === 'Poder' && (
                <div className="mb-2 text-[10px] text-sky-300 bg-sky-400/10 border border-sky-400/15 rounded px-2 py-1">
                  Cada grau em Poder fortalece Feitiços e Runas, aumentando espacos, circulos e a capacidade de manter runas ativas.
                </div>
              )}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => grau > 0 && updateNested('pericias', { [pericia.name]: grau - 1 })}
                  disabled={grau <= 0}
                  className={`w-5 h-5 flex items-center justify-center rounded text-xs transition-colors ${grau > 0 ? 'bg-err/10 text-err/70 hover:bg-err/20 hover:text-err' : 'bg-void border border-sep/20 text-sep/30 cursor-not-allowed'}`}
                  title={grau > 0 ? 'Diminuir grau' : 'Grau mínimo'}
                >
                  −
                </button>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded text-center flex-1 min-w-0 truncate ${
                  grau > 0 ? 'bg-gold/20 text-gold' : 'bg-void text-txt-dim'
                }`}>
                  {GRAU_NAMES[grau]}
                </span>
                <button
                  type="button"
                  onClick={() => canUpgrade && cycleGrau(pericia.name, grau)}
                  disabled={!canUpgrade}
                  className={`w-5 h-5 flex items-center justify-center rounded text-xs transition-colors ${canUpgrade ? 'bg-ok/10 text-ok/70 hover:bg-ok/20 hover:text-ok' : 'bg-void border border-sep/20 text-sep/30 cursor-not-allowed'}`}
                  title={!canUpgrade ? (grau >= maxGrau ? 'Grau máximo atingido' : 'Sem pontos disponíveis') : 'Aumentar grau'}
                >
                  +
                </button>
              </div>
              {grau >= maxGrau && grau > 0 && (
                <div className="mt-1 text-[10px] text-ok">Grau máx. atingido</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
