import { ATTRIBUTES, ATTR_ICONS, ATTR_LABELS, getModifier, getAttrCap } from '../../data/attributes'
import { calcSkeletonPointsAvailable, calcVidaTotal, calcEnergiaTotal } from '../../utils/calculator'
import { getRaceAdjustedAttrs } from '../../utils/raceCalculator'

export default function Step4SkeletonPoints({ char, update }) {
  const sk = char.skeletonPoints || {}
  const adjustedAttrs = getRaceAdjustedAttrs(char.atributos, sk, char)
  const totalAttr = (a) => adjustedAttrs[a] || 0
  const attrCap = getAttrCap(char.nivel)

  const totalAvailable = char.classe
    ? calcSkeletonPointsAvailable(char.classe, char.nivel, char.choices)
    : 0

  const totalSpent = ATTRIBUTES.reduce((sum, a) => sum + (sk[a] || 0), 0)
  const remaining = totalAvailable - totalSpent

  const vidaNow = char.classe
    ? calcVidaTotal(char.classe, char.nivel, char.atributos, sk, char.choices, char.triagemPrincipal, char.triagemPrincipalNivel, char)
    : 0
  const energiaNow = char.classe
    ? calcEnergiaTotal(char.classe, char.nivel, char.atributos, sk, char.choices, char.triagemPrincipal, char.triagemPrincipalNivel, char.subTriagem, char.subTriagemNivel, char)
    : 0

  const vidaNoSk = char.classe
    ? calcVidaTotal(char.classe, char.nivel, char.atributos, {}, char.choices, char.triagemPrincipal, char.triagemPrincipalNivel, char)
    : 0
  const energiaNoSk = char.classe
    ? calcEnergiaTotal(char.classe, char.nivel, char.atributos, {}, char.choices, char.triagemPrincipal, char.triagemPrincipalNivel, char.subTriagem, char.subTriagemNivel, char)
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
        <div className="section-header text-primary mb-8">
          <span className="material-symbols-outlined text-primary">tune</span>
          Pontos de Esqueleto
        </div>
        <div className="codex-card p-5">
          <p className="text-warn text-sm">Selecione uma classe na Etapa 3 primeiro.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="section-header text-primary mb-0 flex-1">
          <span className="material-symbols-outlined text-primary">tune</span>
          Pontos de Esqueleto
        </div>
        <button onClick={handleReset}
          className="sigil-button text-primary rounded px-4 py-2 text-sm font-cinzel uppercase tracking-wider hover:text-white">
          Resetar
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="codex-card p-4">
          <p className="font-mono text-outline uppercase tracking-[0.2em] mb-1" style={{ fontSize: '10px' }}>Disponível</p>
          <p className="font-mono text-primary leading-none" style={{ fontSize: '28px' }}>{totalAvailable}</p>
        </div>
        <div className="codex-card p-4">
          <p className="font-mono text-outline uppercase tracking-[0.2em] mb-1" style={{ fontSize: '10px' }}>Gastos</p>
          <p className="font-mono text-warn leading-none" style={{ fontSize: '28px' }}>{totalSpent}</p>
        </div>
        <div className="codex-card p-4">
          <p className="font-mono text-outline uppercase tracking-[0.2em] mb-1" style={{ fontSize: '10px' }}>Restantes</p>
          <p className={`font-mono leading-none ${remaining > 0 ? 'text-ok' : remaining === 0 ? 'text-outline' : 'text-err'}`} style={{ fontSize: '28px' }}>
            {remaining}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {ATTRIBUTES.map((attr) => {
          const baseVal = (char.atributos[attr] || 0) + ((adjustedAttrs[attr] || 0) - (char.atributos[attr] || 0) - (sk[attr] || 0))
          const skVal = sk[attr] || 0
          const total = baseVal + skVal
          const mod = getModifier(total)
          const atCap = total >= attrCap

          return (
            <div key={attr}
              className={`codex-card p-4 transition-all ${atCap ? '!border-err/40' : skVal > 0 ? '!border-primary/40' : ''}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-primary text-lg">{ATTR_ICONS[attr]}</span>
                <div>
                  <p className="font-cinzel text-primary text-sm uppercase">{attr}</p>
                  <p className="text-outline text-xs">{ATTR_LABELS[attr]}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-on-surface" style={{ fontSize: '28px' }}>{total}</span>
                <span className={`font-mono font-bold ${mod >= 0 ? 'text-secondary-fixed-dim' : 'text-err'}`} style={{ fontSize: '14px' }}>
                  {mod >= 0 ? '+' : ''}{mod}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => handleRemove(attr)} disabled={skVal <= 0}
                  className={`w-8 h-8 rounded font-bold text-sm flex items-center justify-center transition-colors ${
                    skVal > 0 ? 'border border-primary/40 text-primary hover:bg-primary hover:text-on-primary' : 'border border-outline/20 text-outline/30 cursor-not-allowed'
                  }`}>
                  −
                </button>
                <span className="font-mono text-primary flex-1 text-center text-sm">{skVal}</span>
                <button onClick={() => handleAdd(attr)} disabled={remaining <= 0 || total >= attrCap}
                  className={`w-8 h-8 rounded font-bold text-sm flex items-center justify-center transition-colors ${
                    remaining > 0 && total < attrCap ? 'border border-primary/40 text-primary hover:bg-primary hover:text-on-primary' : 'border border-outline/20 text-outline/30 cursor-not-allowed'
                  }`}>
                  +
                </button>
              </div>

              {atCap && <p className="text-err text-xs mt-2 text-center font-mono">Limite atingido</p>}
              <p className="text-outline text-xs mt-1 text-center font-mono">
                Base {baseVal} + Esq. {skVal}
              </p>
            </div>
          )
        })}
      </div>

      <div className="codex-card p-5">
        <h3 className="font-cinzel text-primary text-sm mb-3 uppercase tracking-wider">Impacto em Derivados</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-mono text-resource-vida/70 uppercase tracking-[0.2em] mb-1" style={{ fontSize: '10px' }}>Vida</p>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-resource-vida text-lg">{vidaNow}</span>
              {vidaNow !== vidaNoSk && <span className="text-ok text-xs font-mono">(+{vidaNow - vidaNoSk})</span>}
            </div>
          </div>
          <div>
            <p className="font-mono text-resource-energia/70 uppercase tracking-[0.2em] mb-1" style={{ fontSize: '10px' }}>Energia</p>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-resource-energia text-lg">{energiaNow}</span>
              {energiaNow !== energiaNoSk && <span className="text-ok text-xs font-mono">(+{energiaNow - energiaNoSk})</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
