import { useEffect, useMemo } from 'react'
import { calcExtraAbilities, calcAbilityCostReduction } from '../../utils/calculator'

const STATUS_OPTIONS = ['Pendente', 'Aprovada', 'Revisão necessária']
const STATUS_COLORS = { Pendente: 'text-warn', Aprovada: 'text-ok', 'Revisão necessária': 'text-err' }
const TIPO_STYLES = { Passiva: 'border-ok/40 bg-ok/5', Ativa: 'border-sep bg-deep', Ultimate: 'border-gold/50 bg-gold/5', 'Extra (Triagem)': 'border-purple-400/40 bg-purple-500/5' }
const TIPO_BADGE = { Passiva: 'bg-ok/20 text-ok', Ativa: 'bg-panel text-txt-dim', Ultimate: 'bg-gold/20 text-gold', 'Extra (Triagem)': 'bg-purple-400/20 text-purple-400' }

function makeEmpty(tipo) {
  return { tipo, nome: '', descricao: '', custoEnergia: 0, dano: '', duracao: '', camadaSCP: 2, ppEstimado: 0, status: 'Pendente' }
}

export default function Step10Abilities({ char, update, updateHabilidade }) {
  const sk = char.skeletonPoints || {}
  const extraCount = calcExtraAbilities(char.triagemPrincipal, char.triagemPrincipalNivel, char.subTriagem, char.subTriagemNivel, char.atributos, sk, char.modulosAdquiridos)
  const costReduction = calcAbilityCostReduction(char.triagemPrincipal, char.triagemPrincipalNivel, char.subTriagem, char.subTriagemNivel)
  const needed = 5 + extraCount

  const habilidades = useMemo(() => {
    const raw = char.habilidades || []
    if (raw.length === needed) return raw
    const copy = [...raw]
    while (copy.length < needed) copy.push(makeEmpty('Extra (Triagem)'))
    if (copy.length > needed) copy.length = needed
    return copy
  }, [char.habilidades, needed])

  useEffect(() => {
    const raw = char.habilidades || []
    if (raw.length !== needed) {
      const copy = [...raw]
      while (copy.length < needed) copy.push(makeEmpty('Extra (Triagem)'))
      if (copy.length > needed) copy.length = needed
      update({ habilidades: copy })
    }
  }, [needed])

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-cinzel text-gold text-2xl mb-1">Etapa 10: Habilidades do Personagem</h2>
        <p className="text-txt-dim text-sm mb-2">
          Defina as {needed} habilidades do personagem: 1 Passiva, 3 Ativas, 1 Ultimate
          {extraCount > 0 && <span className="text-purple-400"> + {extraCount} extra(s) de Triagem</span>}.
        </p>
        {costReduction > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2 text-xs text-blue-400 mb-4">
            Suporte ativo: Buffs têm custo de Energia reduzido em {Math.round(costReduction * 100)}%
          </div>
        )}
      </div>

      <div className="space-y-5">
        {habilidades.map((hab, i) => {
          const effectiveCost = (hab.tipo !== 'Passiva' && costReduction > 0)
            ? Math.max(0, Math.round(hab.custoEnergia * (1 - costReduction)))
            : hab.custoEnergia

          return (
            <div key={i} className={`rounded-lg border p-5 space-y-4 ${TIPO_STYLES[hab.tipo] || 'border-sep bg-deep'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${TIPO_BADGE[hab.tipo] || 'bg-panel text-txt-dim'}`}>
                    {hab.tipo} {i < 5 ? (hab.tipo === 'Passiva' ? '' : hab.tipo === 'Ultimate' ? '★' : `#${i}`) : ''}
                  </span>
                </div>
                <select
                  value={hab.status}
                  onChange={e => updateHabilidade(i, { status: e.target.value })}
                  className={`text-xs bg-void border border-sep rounded px-2 py-1 ${STATUS_COLORS[hab.status] || 'text-txt-dim'}`}
                >
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-txt-dim text-xs mb-1">Nome</label>
                <input type="text" value={hab.nome} onChange={e => updateHabilidade(i, { nome: e.target.value })} placeholder={`Nome da habilidade ${hab.tipo}`} className="w-full bg-void border border-sep rounded px-3 py-2 text-sm text-txt-main" />
              </div>

              <div>
                <label className="block text-txt-dim text-xs mb-1">Descrição</label>
                <textarea value={hab.descricao} onChange={e => updateHabilidade(i, { descricao: e.target.value })} placeholder="Descreva o efeito da habilidade..." rows={3} className="w-full bg-void border border-sep rounded px-3 py-2 text-sm text-txt-main resize-none" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-txt-dim text-xs mb-1">Custo Energia</label>
                  <input type="number" value={hab.custoEnergia} onChange={e => updateHabilidade(i, { custoEnergia: Number(e.target.value) || 0 })} className="w-full bg-void border border-sep rounded px-3 py-2 text-sm text-txt-main font-mono" />
                  {costReduction > 0 && hab.tipo !== 'Passiva' && (
                    <span className="text-blue-400 text-xs">Efetivo: {effectiveCost}</span>
                  )}
                </div>
                <div>
                  <label className="block text-txt-dim text-xs mb-1">Dano</label>
                  <input type="text" value={hab.dano} onChange={e => updateHabilidade(i, { dano: e.target.value })} placeholder="ex: 3d8" className="w-full bg-void border border-sep rounded px-3 py-2 text-sm text-txt-main font-mono" />
                </div>
                <div>
                  <label className="block text-txt-dim text-xs mb-1">Duração</label>
                  <input type="text" value={hab.duracao} onChange={e => updateHabilidade(i, { duracao: e.target.value })} placeholder="ex: 3 rodadas" className="w-full bg-void border border-sep rounded px-3 py-2 text-sm text-txt-main" />
                </div>
                <div>
                  <label className="block text-txt-dim text-xs mb-1">Camada SCP</label>
                  <select value={hab.camadaSCP} onChange={e => updateHabilidade(i, { camadaSCP: Number(e.target.value) })} className="w-full bg-void border border-sep rounded px-3 py-2 text-sm text-txt-main">
                    <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-txt-dim text-xs mb-1">PP Estimado</label>
                  <input type="number" value={hab.ppEstimado} onChange={e => updateHabilidade(i, { ppEstimado: Number(e.target.value) || 0 })} className="w-full bg-void border border-sep rounded px-3 py-2 text-sm text-txt-main font-mono" />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
