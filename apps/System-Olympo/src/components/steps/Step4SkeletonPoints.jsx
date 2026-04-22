import { ATTRIBUTES, ATTR_ICONS, ATTR_LABELS, getModifier, getAttrCap } from '../../data/attributes'
import { calcSkeletonPointsAvailable, calcVidaTotal, calcEnergiaTotal } from '../../utils/calculator'

export default function Step4SkeletonPoints({ char, update, updateNested }) {
  const sk = char.skeletonPoints || {}
  const totalAttr = (a) => (char.atributos[a] || 0) + (sk[a] || 0)
  const attrCap = getAttrCap(char.nivel)

  const totalAvailable = char.classe
    ? calcSkeletonPointsAvailable(char.classe, char.nivel, char.choices)
    : 0

  const totalSpent = ATTRIBUTES.reduce((sum, a) => sum + (sk[a] || 0), 0)
  const remaining = totalAvailable - totalSpent

  const vidaNow = char.classe
    ? calcVidaTotal(char.classe, char.nivel, char.atributos, sk, char.choices, char.triagemPrincipal, char.triagemPrincipalNivel)
    : 0
  const energiaNow = char.classe
    ? calcEnergiaTotal(char.classe, char.nivel, char.atributos, sk, char.choices, char.triagemPrincipal, char.triagemPrincipalNivel, char.subTriagem, char.subTriagemNivel)
    : 0

  const vidaNoSk = char.classe
    ? calcVidaTotal(char.classe, char.nivel, char.atributos, {}, char.choices, char.triagemPrincipal, char.triagemPrincipalNivel)
    : 0
  const energiaNoSk = char.classe
    ? calcEnergiaTotal(char.classe, char.nivel, char.atributos, {}, char.choices, char.triagemPrincipal, char.triagemPrincipalNivel, char.subTriagem, char.subTriagemNivel)
    : 0

  function handleAdd(attr) {
    if (remaining <= 0) return
    if (totalAttr(attr) >= attrCap) return
    const newVal = (sk[attr] || 0) + 1
    const newSk = { ...sk, [attr]: newVal }
    const history = [...(char.skeletonHistory || []), { attr, value: newVal }]
    update({ skeletonPoints: newSk, skeletonHistory: history })
  }

  function handleRemove(attr) {
    if ((sk[attr] || 0) <= 0) return
    const newVal = (sk[attr] || 0) - 1
    const newSk = { ...sk, [attr]: newVal }
    const history = [...(char.skeletonHistory || []), { attr, value: newVal }]
    update({ skeletonPoints: newSk, skeletonHistory: history })
  }

  function handleReset() {
    const resetSk = {}
    ATTRIBUTES.forEach((a) => { resetSk[a] = 0 })
    update({ skeletonPoints: resetSk, skeletonHistory: [] })
  }

  if (!char.classe) {
    return (
      <div className="space-y-6">
        <h2 className="font-cinzel text-gold text-xl">Etapa 4 — Pontos de Esqueleto</h2>
        <div className="bg-deep border border-sep rounded-lg p-5">
          <p className="text-warn text-sm">Selecione uma classe na Etapa 3 primeiro.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-cinzel text-gold text-xl">Etapa 4 — Pontos de Esqueleto</h2>
        <button
          onClick={handleReset}
          className="border border-gold text-gold rounded px-4 py-2 hover:bg-gold hover:text-void text-sm transition-colors"
        >
          Resetar
        </button>
      </div>

      <div className="bg-deep border border-sep rounded-lg p-5 hover:border-gold transition-colors">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-txt-dim text-sm">Total Disponível</p>
            <p className="font-mono text-2xl text-gold">{totalAvailable}</p>
          </div>
          <div>
            <p className="text-txt-dim text-sm">Gastos</p>
            <p className="font-mono text-2xl text-warn">{totalSpent}</p>
          </div>
          <div>
            <p className="text-txt-dim text-sm">Restantes</p>
            <p className={`font-mono text-2xl ${remaining > 0 ? 'text-ok' : remaining === 0 ? 'text-txt-dim' : 'text-err'}`}>
              {remaining}
            </p>
          </div>
        </div>
        <p className="text-center text-txt-dim text-xs mt-2">Limite por atributo nesta faixa: <span className="text-gold font-mono">{attrCap}</span></p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {ATTRIBUTES.map((attr) => {
          const baseVal = char.atributos[attr] || 0
          const skVal = sk[attr] || 0
          const total = baseVal + skVal
          const mod = getModifier(total)

          return (
            <div
              key={attr}
              className="bg-deep border border-sep rounded-lg p-4 hover:border-gold transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{ATTR_ICONS[attr]}</span>
                <div>
                  <p className="font-cinzel text-gold text-sm">{attr}</p>
                  <p className="text-txt-dim text-xs">{ATTR_LABELS[attr]}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-lg text-txt-main">{total}</span>
                <span className={`font-mono text-sm ${mod >= 0 ? 'text-ok' : 'text-err'}`}>
                  ({mod >= 0 ? '+' : ''}{mod})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRemove(attr)}
                  disabled={skVal <= 0}
                  className={`w-8 h-8 rounded font-bold text-sm flex items-center justify-center transition-colors ${
                    skVal > 0
                      ? 'border border-gold text-gold hover:bg-gold hover:text-void'
                      : 'border border-sep text-txt-dim cursor-not-allowed'
                  }`}
                >
                  −
                </button>
                <span className="font-mono text-sm text-gold flex-1 text-center">{skVal}</span>
                <button
                  onClick={() => handleAdd(attr)}
                  disabled={remaining <= 0 || total >= attrCap}
                  className={`w-8 h-8 rounded font-bold text-sm flex items-center justify-center transition-colors ${
                    remaining > 0 && total < attrCap
                      ? 'border border-gold text-gold hover:bg-gold hover:text-void'
                      : 'border border-sep text-txt-dim cursor-not-allowed'
                  }`}
                >
                  +
                </button>
              </div>

              {total >= attrCap && (
                <p className="text-warn text-xs mt-1 text-center">Limite atingido</p>
              )}
              <p className="text-txt-dim text-xs mt-1 text-center">
                Base {baseVal} + Esq. {skVal}
              </p>
            </div>
          )
        })}
      </div>

      <div className="bg-deep border border-sep rounded-lg p-5 hover:border-gold transition-colors">
        <h3 className="font-cinzel text-gold text-sm mb-3">Impacto em Derivados</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-txt-dim text-sm">Vida</p>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-lg text-txt-main">{vidaNow}</span>
              {vidaNow !== vidaNoSk && (
                <span className="text-ok text-xs">(+{vidaNow - vidaNoSk})</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-txt-dim text-sm">Energia</p>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-lg text-txt-main">{energiaNow}</span>
              {energiaNow !== energiaNoSk && (
                <span className="text-ok text-xs">(+{energiaNow - energiaNoSk})</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {char.skeletonHistory && char.skeletonHistory.length > 0 && (
        <div className="bg-deep border border-sep rounded-lg p-5">
          <h3 className="font-cinzel text-gold text-sm mb-2">Histórico de Alocação</h3>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {char.skeletonHistory.map((entry, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-txt-dim">
                  {ATTR_ICONS[entry.attr]} {ATTR_LABELS[entry.attr]}
                </span>
                <span className="font-mono text-txt-main">→ {entry.value} pontos</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
