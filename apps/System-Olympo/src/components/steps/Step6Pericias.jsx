import { PERICIAS, getMaxGrauForLevel, GRAU_NAMES, getPericiaBonus } from '../../data/pericias'
import { calcPericiasAvailable } from '../../utils/calculator'
import { getModifier } from '../../data/attributes'

export default function Step6Pericias({ char, update, updateNested }) {
  const classe = char.classe
  const nivel = char.nivel || 1
  const sk = char.skeletonPoints || {}
  const attrs = char.atributos || {}
  const pericias = char.pericias || {}
  const choices = char.choices || {}
  const modulosAdquiridos = char.modulosAdquiridos || []

  const totalAttr = (a) => (attrs[a] || 0) + (sk[a] || 0)

  const available = classe ? calcPericiasAvailable(classe, nivel, choices, modulosAdquiridos) : 0
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
            <button
              key={pericia.name}
              type="button"
              onClick={() => cycleGrau(pericia.name, grau)}
              disabled={!canUpgrade && grau >= maxGrau}
              className={`text-left border rounded p-3 transition-colors ${
                grau > 0
                  ? 'bg-deep border-gold/50 hover:border-gold'
                  : canUpgrade
                    ? 'bg-deep border-sep hover:border-gold/50'
                    : 'bg-deep/50 border-sep/30 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`font-body text-sm ${grau > 0 ? 'text-txt-main' : 'text-txt-dim'}`}>
                  {pericia.name}
                </span>
                <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                  grau > 0 ? 'bg-gold/20 text-gold' : 'bg-void text-txt-dim'
                }`}>
                  {GRAU_NAMES[grau]}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-txt-dim">
                  {pericia.attrs.join('/')}
                  {pericia.attrs.length > 1 && (
                    <span className="text-gold ml-1">({bestAttr.attr})</span>
                  )}
                </span>
                <span className={`font-mono ${grau > 0 ? 'text-gold' : 'text-txt-dim'}`}>
                  {bonus >= 0 ? '+' : ''}{bonus}
                </span>
              </div>
              {grau > 0 && grau < maxGrau && canUpgrade && (
                <div className="mt-1 text-xs text-gold/60">Clique p/ evoluir → {GRAU_NAMES[grau + 1]} (custa 1 ponto)</div>
              )}
              {grau >= maxGrau && (
                <div className="mt-1 text-xs text-ok">Grau máximo atingido</div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
