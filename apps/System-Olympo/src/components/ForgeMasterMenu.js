import { useState } from 'react'
import { createPortal } from 'react-dom'

export default function ForgeMasterMenu({ char, update, canEdit, onClose }) {
  const [draft, setDraft] = useState({ nome: '', tipo: 'Ativa', alvo: 'Ambos', custo: '', descricao: '' })
  const [analyzingId, setAnalyzingId] = useState(null)
  const [error, setError] = useState('')
  const enchantments = char.forgeEnchantments || []

  function patchEnchantments(next) {
    update?.({ forgeEnchantments: next })
  }

  function addEnchantment() {
    if (!draft.nome.trim() && !draft.descricao.trim()) return
    patchEnchantments([
      ...enchantments,
      {
        id: `enc_${Date.now()}`,
        nome: draft.nome.trim() || 'Novo Encantamento',
        tipo: draft.tipo,
        alvo: draft.alvo,
        custo: draft.custo,
        descricao: draft.descricao,
        status: 'Pendente',
        createdAt: new Date().toISOString(),
      },
    ])
    setDraft({ nome: '', tipo: 'Ativa', alvo: 'Ambos', custo: '', descricao: '' })
  }

  function updateEnchantment(id, patch) {
    patchEnchantments(enchantments.map(item => item.id === id ? { ...item, ...patch } : item))
  }

  function removeEnchantment(id) {
    patchEnchantments(enchantments.filter(item => item.id !== id))
  }

  async function analyzeEnchantment(item) {
    setAnalyzingId(item.id)
    setError('')
    try {
      const result = await window.analyzeForgeEnchantment?.(char, item) || {}
      updateEnchantment(item.id, {
        ...result,
        nome: result.nome || item.nome,
        tipo: result.tipo || item.tipo,
        alvo: result.alvo || item.alvo,
        custo: result.custo || item.custo,
        descricao: result.descricaoBalanceada || result.descricao || item.descricao,
        status: result.status || 'Aprovada',
        analyzedAt: new Date().toISOString(),
      })
    } catch (err) {
      setError(err.message || 'Não foi possível analisar o encantamento.')
    } finally {
      setAnalyzingId(null)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={onClose}>
      <div className="w-full max-w-4xl max-h-[90vh] bg-gradient-to-br from-[#0f0d1a] via-[#1a1a2e] to-[#0f0d1a] border border-amber-400/40 rounded-2xl shadow-[0_0_40px_rgba(251,191,36,0.15)] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M20%200%20L40%2020%20L20%2040%20L0%2020Z%22%20fill%3D%22none%22%20stroke%3D%22rgba(251%2C%20191%2C%2036%2C0.05)%22%20stroke-width%3D%221%22%2F%3E%3C%2Fsvg%3E')] opacity-15 pointer-events-none" />

        <div className="relative px-6 py-5 border-b border-amber-400/30 flex items-start gap-4 bg-amber-400/10 backdrop-blur-sm">
          <div className="w-12 h-12 rounded-xl border-2 border-amber-400/40 bg-gradient-to-br from-amber-400 to-amber-500 text-void grid place-items-center shadow-[0_0_12px_rgba(251,191,36,0.3)]">
            <span className="text-3xl">⚒️</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-cinzel text-amber-50 text-xl uppercase tracking-widest drop-shadow-lg">Mestre Forjador</h3>
            <p className="text-amber-200/90 text-[13px] mt-2 leading-relaxed">
              Forje encantamentos místicos para armas e equipamentos. Os materiais especiais conferem poderes únicos a cada item.
            </p>
          </div>
          <button onClick={onClose} className="ml-auto w-10 h-10 rounded-lg bg-amber-400/20 text-amber-200 hover:bg-amber-400/30 hover:text-white transition-all flex items-center justify-center">
            <span className="text-2xl">✕</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="relative rounded-2xl border border-amber-400/35 bg-gradient-to-br from-amber-900/30 via-amber-800/15 to-amber-900/10 p-6 backdrop-blur-sm">
            <div className="flex items-center gap-4 mb-5 pb-4 border-b border-amber-400/20">
              <span className="text-amber-100 text-xl font-cinzel tracking-wide">⚒️ Materiais Especiais</span>
              <span className="text-amber-300/60 text-sm">Metais lendários forjados em fornalhas místicas</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="text-center p-4 rounded-2xl border-2 border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20 hover:border-amber-400/40 transition-all group">
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">⚒️</div>
                <div className="text-amber-50 font-bold text-base mb-2">Ferro Hefestiano</div>
                <div className="text-amber-200/80 text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-300">+1d6</span>
                    <span className="text-amber-400/60">dano</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-300">+2</span>
                    <span className="text-amber-400/60">armadura</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-300">+8</span>
                    <span className="text-amber-400/60">durab.</span>
                  </div>
                </div>
                <div className="text-amber-400/60 italic text-[11px] mt-2">O mais poderoso</div>
              </div>
              <div className="text-center p-4 rounded-2xl border-2 border-indigo-400/30 bg-indigo-400/10 hover:bg-indigo-400/20 hover:border-indigo-400/40 transition-all group">
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🔥</div>
                <div className="text-indigo-50 font-bold text-base mb-2">Ferro do Tártaro</div>
                <div className="text-indigo-200/80 text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-indigo-300">+1d4</span>
                    <span className="text-indigo-400/60">dano</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-indigo-300">+3</span>
                    <span className="text-indigo-400/60">armadura</span>
                  </div>
                  <div className="text-indigo-400/60 italic text-[11px] mt-2">Ignora 50% resistência física</div>
                </div>
              </div>
              <div className="text-center p-4 rounded-2xl border-2 border-purple-400/30 bg-purple-400/10 hover:bg-purple-400/20 hover:border-purple-400/40 transition-all group">
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">✨</div>
                <div className="text-purple-50 font-bold text-base mb-2">Aço Astrano</div>
                <div className="text-purple-200/80 text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-300">+1d3</span>
                    <span className="text-purple-400/60">dano</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-purple-300">+1</span>
                    <span className="text-purple-400/60">armadura</span>
                  </div>
                  <div className="text-purple-400/60 italic text-[11px] mt-2">+2 identificação mágica</div>
                </div>
              </div>
              <div className="text-center p-4 rounded-2xl border-2 border-cyan-400/30 bg-cyan-400/10 hover:bg-cyan-400/20 hover:border-cyan-400/40 transition-all group">
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">💎</div>
                <div className="text-cyan-50 font-bold text-base mb-2">Vibranium</div>
                <div className="text-cyan-200/80 text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-300">+1d2</span>
                    <span className="text-cyan-400/60">dano</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-300">+4</span>
                    <span className="text-cyan-400/60">armadura</span>
                  </div>
                  <div className="text-cyan-400/60 italic text-[11px] mt-2">Reduz 1d4 dano recebido</div>
                </div>
              </div>
              <div className="text-center p-4 rounded-2xl border-2 border-yellow-400/30 bg-yellow-400/10 hover:bg-yellow-400/20 hover:border-yellow-400/40 transition-all group">
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">🏛️</div>
                <div className="text-yellow-50 font-bold text-base mb-2">Aço Olimpiano</div>
                <div className="text-yellow-200/80 text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-300">+1d3</span>
                    <span className="text-yellow-400/60">dano</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-300">+2</span>
                    <span className="text-yellow-400/60">armadura</span>
                  </div>
                  <div className="text-yellow-400/60 italic text-[11px] mt-2">Vantagem posse</div>
                </div>
              </div>
            </div>
          </div>

          {canEdit && (
            <div className="relative rounded-2xl border border-amber-400/25 bg-void/30 backdrop-blur-sm p-6 space-y-5">
              <div className="flex items-center gap-4 pb-4 border-b border-amber-400/15">
                <span className="text-amber-100 text-lg font-cinzel">✧ Criar Novo Encantamento</span>
                <span className="text-amber-300/60 text-sm">Defina o nome, tipo, alvo, custo e efeito místico</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_180px_140px] gap-4">
                <div className="space-y-3">
                  <label className="text-amber-200/70 text-sm font-bold uppercase tracking-wider">Nome Arcano</label>
                  <input value={draft.nome} onChange={e => setDraft(prev => ({ ...prev, nome: e.target.value }))} placeholder="Ex: Chamas de Hefesto"
                    className="w-full bg-void/80 border-2 border-amber-400/30 rounded-2xl px-4 py-3 text-sm text-amber-50 focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/30 focus:outline-none placeholder:text-amber-900/40" />
                </div>
                <div className="space-y-3">
                  <label className="text-amber-200/70 text-sm font-bold uppercase tracking-wider">Tipo</label>
                  <select value={draft.tipo} onChange={e => setDraft(prev => ({ ...prev, tipo: e.target.value }))}
                    className="w-full bg-[#0f0d1a] border-2 border-amber-400/30 rounded-2xl px-4 py-3 text-sm text-amber-50 focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/30 focus:outline-none">
                    <option className="bg-[#0f0d1a] text-amber-50">Ativa</option>
                    <option className="bg-[#0f0d1a] text-amber-50">Passiva</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-amber-200/70 text-sm font-bold uppercase tracking-wider">Alvo</label>
                  <select value={draft.alvo} onChange={e => setDraft(prev => ({ ...prev, alvo: e.target.value }))}
                    className="w-full bg-[#0f0d1a] border-2 border-amber-400/30 rounded-2xl px-4 py-3 text-sm text-amber-50 focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/30 focus:outline-none">
                    <option className="bg-[#0f0d1a] text-amber-50">Ambos</option>
                    <option className="bg-[#0f0d1a] text-amber-50">Arma</option>
                    <option className="bg-[#0f0d1a] text-amber-50">Equipamento</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-amber-200/70 text-sm font-bold uppercase tracking-wider">Custo</label>
                  <input value={draft.custo} onChange={e => setDraft(prev => ({ ...prev, custo: e.target.value }))} placeholder="Ex: 2 PE"
                    className="w-full bg-void/80 border-2 border-amber-400/30 rounded-2xl px-4 py-3 text-sm text-amber-50 focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/30 focus:outline-none font-mono placeholder:text-amber-900/40" />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-amber-200/70 text-sm font-bold uppercase tracking-wider">Descrição Mística</label>
                <textarea value={draft.descricao} onChange={e => setDraft(prev => ({ ...prev, descricao: e.target.value }))} rows={3}
                  placeholder="Descreva o efeito mágico, gatilho, custo, limites de uso e escala de poder..."
                  className="w-full bg-void/80 border-2 border-amber-400/30 rounded-2xl px-4 py-3 text-sm text-amber-50 focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/30 focus:outline-none resize-none placeholder:text-amber-900/40" />
                <div className="flex items-center gap-3 mt-3">
                  <button onClick={addEnchantment} disabled={!draft.nome.trim() || !draft.descricao.trim()}
                    className="flex-1 bg-gradient-to-r from-amber-400 to-amber-500 text-void px-6 py-3 rounded-2xl font-bold text-sm hover:from-amber-300 hover:to-amber-400 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    <span className="text-2xl">+</span>
                    <span>Forjar Encantamento</span>
                  </button>
                  {error && <p className="text-red-400 text-sm bg-red-400/10 px-4 py-2 rounded-2xl">{error}</p>}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <h3 className="font-cinzel text-amber-100 text-base uppercase tracking-wider">Encantamentos Criados</h3>
              <span className="text-amber-300/60 text-sm">{enchantments.length} encantamentos</span>
            </div>

            {enchantments.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-amber-400/30 bg-amber-400/5 px-8 py-16 text-center">
                <div className="text-6xl mb-4">🔮</div>
                <p className="text-amber-200/70 text-lg mt-2">A forja está vazia</p>
                <p className="text-amber-200/50 text-sm">Crie encantamentos místicos para seus itens.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {enchantments.map(item => (
                  <div key={item.id} className="relative rounded-2xl border-2 border-amber-400/25 bg-gradient-to-br from-amber-900/20 via-amber-800/10 to-transparent overflow-hidden transition-all hover:scale-[1.01] hover:border-amber-400/40">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M15%200%20L30%2020%20L30%2040%20L15%2040%20L15%2020Z%22%20fill%3D%22none%22%20stroke%3D%22rgba(251%2C%20191%2C%2036%2C0.05)%22%20stroke-width%3D%222%22%2F%3E%3C%2Fsvg%3E')] opacity-8 pointer-events-none" />

                    <div className="relative p-5">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-amber-50 text-lg font-bold tracking-wide">{item.nome || 'Encantamento'}</span>
                            <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider border ${item.tipo === 'Ativa' ? 'bg-orange-500 text-white border-orange-500' : 'bg-emerald-500 text-white border-emerald-500'}`}>{item.tipo || 'Ativa'}</span>
                            <span className="text-xs px-3 py-1 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/30">{item.alvo || 'Ambos'}</span>
                            <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider border ${item.status === 'Aprovada' ? 'bg-emerald-500 text-white border-emerald-500' : item.status === 'Pendente' ? 'bg-amber-500 text-white border-amber-500' : 'bg-red-500 text-white border-red-500'}`}>{item.status || 'Pendente'}</span>
                          </div>
                          {item.custo && <div className="flex items-center gap-2 text-gold/80 bg-gold/10 px-3 py-1 rounded-2xl">
                            <span className="text-amber-200/60 text-xs">Custo:</span>
                            <span className="text-gold text-base font-mono">{item.custo} PE</span>
                          </div>}
                        </div>
                        <div className="flex gap-3 shrink-0">
                          {canEdit && (
                            <>
                              <button onClick={() => analyzeEnchantment(item)} disabled={analyzingId === item.id}
                                className="w-11 h-11 rounded-2xl border-2 border-indigo-400/30 text-indigo-300 bg-indigo-400/10 hover:bg-indigo-400/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all"
                                title="Analisar com IA">
                                <span className="text-xl">{analyzingId === item.id ? '⏳' : '🔮'}</span>
                              </button>
                              <button onClick={() => removeEnchantment(item.id)}
                                className="w-11 h-11 rounded-2xl border-2 border-red-400/30 text-red-400/80 bg-red-400/10 hover:bg-red-400/20 hover:text-red-300 flex items-center justify-center transition-all"
                                title="Remover">
                                <span className="text-xl">🗑️</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="border-t border-amber-400/10 pt-4 mt-3">
                        <p className="text-amber-200/90 text-sm leading-relaxed whitespace-pre-wrap">{item.descricao || 'Sem descrição.'}</p>
                        {item.feedback && <p className="text-indigo-200/90 text-xs mt-3 leading-relaxed border-t border-indigo-400/10 bg-indigo-400/5 px-4 py-3 rounded-2xl italic">"{item.feedback}"</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
