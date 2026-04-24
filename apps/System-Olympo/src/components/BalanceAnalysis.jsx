import { useState } from 'react'
import { createPortal } from 'react-dom'
import { analyzeBalance } from '../services/aiService'

export default function BalanceAnalysis({ char, onApply, characterId }) {
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  async function handleAnalyze() {
    setAnalyzing(true)
    setError('')
    setResult(null)
    try {
      const data = await analyzeBalance(char)
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  function handleApplyResult() {
    if (!result) return
    onApply(result)
    setResult(null)
    setShowConfirm(false)
  }

  const pendingCount = (char.habilidades || []).filter(h => h.status === 'Pendente').length
  const revisionCount = (char.habilidades || []).filter(h => h.status === 'Revisão necessária').length

  return (
    <>
      <div className="bg-void/50 border border-indigo-400/20 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-indigo-400 text-sm">✦</span>
          <h4 className="text-txt-main text-xs font-semibold">Análise de Balanceamento</h4>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          <span className="text-[9px] bg-warn/10 text-warn px-1.5 py-0.5 rounded">{pendingCount} pendente{pendingCount !== 1 ? 's' : ''}</span>
          <span className="text-[9px] bg-err/10 text-err px-1.5 py-0.5 rounded">{revisionCount} revisão{revisionCount !== 1 ? 'ões' : ''}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowConfirm(true)}
            disabled={analyzing}
            className="flex-1 bg-indigo-500/10 border border-indigo-400/30 text-indigo-400 text-[10px] px-3 py-1.5 rounded hover:bg-indigo-500/20 transition-colors disabled:opacity-50"
          >
            {analyzing ? (
              <span className="flex items-center gap-1.5 justify-center">
                <span className="animate-spin inline-block w-3 h-3 border border-indigo-400/40 border-t-indigo-400 rounded-full" />
                Analisando...
              </span>
            ) : (
              'Analisar Habilidades'
            )}
          </button>
        </div>
        {error && <p className="text-err text-[10px] mt-2">{error}</p>}
      </div>

      {showConfirm && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 modal-bg" onClick={() => setShowConfirm(false)} />
          <div className="relative bg-deep border border-gold/30 rounded-xl p-5 w-full max-w-md modal-content shadow-2xl shadow-black/60">
            <h3 className="font-cinzel text-gold text-sm mb-2">Confirmar Análise de Balanceamento</h3>
            <p className="text-txt-dim text-xs mb-3">
              A IA analisará todas as habilidades do personagem e da arma, considerando atributos, triagens, módulos e equipamentos. Os valores serão ajustados para manter o equilíbrio do sistema.
            </p>
            <textarea
              placeholder="Descreva problemas ou preocupações específicas (opcional)..."
              rows={2}
              className="w-full bg-void/60 border border-sep/40 rounded px-3 py-2 text-xs text-txt-main resize-none focus:border-gold/40 focus:outline-none mb-3"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowConfirm(false)} className="text-txt-dim text-xs px-3 py-1.5 hover:text-txt-main transition-colors">
                Cancelar
              </button>
              <button onClick={() => { setShowConfirm(false); handleAnalyze() }} className="bg-gold text-void text-xs px-4 py-1.5 rounded font-semibold hover:bg-gold-light transition-colors">
                Confirmar Análise
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {result && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 modal-bg" onClick={() => setResult(null)} />
          <div className="relative bg-deep border border-gold/30 rounded-xl p-5 w-full max-w-lg max-h-[80vh] overflow-y-auto modal-content shadow-2xl shadow-black/60">
            <h3 className="font-cinzel text-gold text-sm mb-3">Resultado da Análise</h3>
            <div className="space-y-3 mb-4">
              {(result.habilidades || []).map((h, i) => (
                <div key={i} className="bg-void/50 border border-sep/30 rounded-lg p-2.5">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-txt-main text-[11px] font-semibold">{h.nome}</span>
                    <span className="text-[9px] bg-indigo-400/10 text-indigo-400 px-1.5 py-0.5 rounded">{char.habilidades?.[i]?.tipo || '?'}</span>
                    {(char.habilidades?.[i]?.evolucaoNivel || 0) > 0 && (
                      <span className="text-[9px] bg-gold/10 text-gold px-1.5 py-0.5 rounded">★ Evo {char.habilidades[i].evolucaoNivel}</span>
                    )}
                  </div>
                  <p className="text-txt-dim text-[10px] mb-1">{h.descricao}</p>
                  <div className="flex flex-wrap gap-2 text-[9px] font-mono">
                    {h.custoEnergia > 0 && <span className="text-sky-400">⚡{h.custoEnergia}</span>}
                    {h.dano && <span className="text-red-400">⚔{h.dano}</span>}
                    {h.duracao && <span className="text-txt-dim">⏱{h.duracao}</span>}
                    <span className="text-amber-400/70">SCP:{h.camadaSCP}</span>
                    <span className="text-purple-400/70">PP:{h.ppEstimado}</span>
                  </div>
                  {h.feedback && <p className="text-gold/60 text-[9px] mt-1 italic">💡 {h.feedback}</p>}
                </div>
              ))}
              {(result.armaHabilidades || []).map((h, i) => (
                <div key={`w${i}`} className="bg-void/50 border border-orange-400/20 rounded-lg p-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-txt-main text-[11px] font-semibold">{h.nome}</span>
                    <span className="text-[9px] bg-orange-400/10 text-orange-400 px-1.5 py-0.5 rounded">{h.tipo || 'Ativa'}</span>
                    {h.custo && <span className="text-gold/60 text-[9px] ml-auto font-mono">{h.custo}</span>}
                  </div>
                  <p className="text-txt-dim text-[10px]">{h.descricao}</p>
                  {h.feedback && <p className="text-gold/60 text-[9px] mt-1 italic">💡 {h.feedback}</p>}
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end border-t border-sep/30 pt-3">
              <button onClick={() => setResult(null)} className="text-txt-dim text-xs px-3 py-1.5 hover:text-txt-main transition-colors">
                Cancelar
              </button>
              <button onClick={handleApplyResult} className="bg-gold text-void text-xs px-4 py-1.5 rounded font-semibold hover:bg-gold-light transition-colors">
                Aplicar Valores
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
