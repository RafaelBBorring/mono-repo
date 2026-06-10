import { useEffect, useMemo, useState } from 'react'
import {
  calcExtraAbilities, calcExtraAbilitiesTypes,
  calcAbilityCostReduction, calcPEHTotal,
} from '../../utils/calculator'
import { generateAbilitiesFromDescription } from '../../services/aiService'
import {
  calcEvolucaoDelta, calcPassivaAutoEvolucao,
  canEvolveSkill, getMaxEvolucao, calcPEHSpent,
  getSkillTagChips, normalizeSkillTags,
} from '../../utils/skillEvolution'

const STATUS_OPTIONS = ['Pendente', 'Aprovada', 'Revisão necessária']
const STATUS_COLORS  = { Pendente: 'text-warn', Aprovada: 'text-ok', 'Revisão necessária': 'text-err' }
const TIPO_STYLES    = {
  Passiva:           'border-ok/40 bg-ok/5',
  Ativa:             'border-sep bg-deep',
  Ultimate:          'border-gold/50 bg-gold/5',
  'Extra (Triagem)': 'border-purple-400/40 bg-purple-500/5',
  'Extra (Módulo)':  'border-sky-400/40 bg-sky-500/5',
}
const TIPO_BADGE = {
  Passiva:           'bg-ok/20 text-ok',
  Ativa:             'bg-panel text-txt-dim',
  Ultimate:          'bg-gold/20 text-gold',
  'Extra (Triagem)': 'bg-purple-400/20 text-purple-400',
  'Extra (Módulo)':  'bg-sky-400/20 text-sky-400',
}
const EVO_STARS = (n, max) =>
  Array.from({ length: max }, (_, i) => (
    <span key={i} className={i < n ? 'text-gold' : 'text-sep'}>★</span>
  ))

function makeEmpty(tipo) {
  return { tipo, nome: '', descricao: '', custoEnergia: 0, dano: '', duracao: '', dt: '', tags: [], valores: {}, camadaSCP: 2, ppEstimado: 0, status: 'Pendente', evolucaoNivel: 0 }
}

export default function Step10Abilities({ char, update, updateHabilidade }) {
  const sk          = char.skeletonPoints || {}
  const nivel       = char.nivel || 1
  const extraTypes  = calcExtraAbilitiesTypes(char.triagemPrincipal, char.triagemPrincipalNivel, char.subTriagem, char.subTriagemNivel, char.atributos, sk, char.modulosAdquiridos, char)
  const extraCount  = extraTypes.length
  const triagemCount = extraTypes.filter(t => t === 'Extra (Triagem)' || t === 'Passiva').length
  const moduloCount  = extraTypes.filter(t => t === 'Extra (Módulo)').length
  const costReduction = calcAbilityCostReduction(char.triagemPrincipal, char.triagemPrincipalNivel, char.subTriagem, char.subTriagemNivel)
  const needed   = 5 + extraCount
  const allTipos = ['Passiva', 'Ativa', 'Ativa', 'Ativa', 'Ultimate', ...extraTypes]

  const [showGenerator, setShowGenerator] = useState(false)
  const [genDesc,       setGenDesc]       = useState('')
  const [generating,    setGenerating]    = useState(false)
  const [genError,      setGenError]      = useState('')
  const [previewIdx,    setPreviewIdx]    = useState(null)

  // PEH split by source
  const pehFromProgressao = calcPEHTotal(char.classe, nivel, char.choices || {}, [], char)  // no modules
  const aumentoPoder = (char.modulosAdquiridos || []).find(m => m.id === 'aumento_poder')
  const pehFromModulo = aumentoPoder ? (aumentoPoder.boughtCount || 1) : 0
  const pehTotal = pehFromProgressao + pehFromModulo

  const habilidades = useMemo(() => {
    const raw = char.habilidades || []
    if (raw.length === needed) return raw
    const copy = [...raw]
    while (copy.length < needed) {
      const tipo = allTipos[copy.length] || 'Extra (Triagem)'
      copy.push(makeEmpty(tipo))
    }
    if (copy.length > needed) copy.length = needed
    return copy
  }, [char.habilidades, needed])

  useEffect(() => {
    const raw = char.habilidades || []
    if (raw.length !== needed) {
      const copy = [...raw]
      while (copy.length < needed) {
        const tipo = allTipos[copy.length] || 'Extra (Triagem)'
        copy.push(makeEmpty(tipo))
      }
      if (copy.length > needed) copy.length = needed
      update({ habilidades: copy })
    }
  }, [needed])

  const pehSpent = calcPEHSpent(habilidades)
  const pehLivre = pehTotal - pehSpent

  function handleEvoChange(i, hab, delta) {
    const current = hab.evolucaoNivel || 0
    const next    = current + delta
    if (next < 0) return
    const { allowed, reason } = canEvolveSkill(hab, current, nivel)
    if (delta > 0 && !allowed) return
    if (delta > 0 && pehLivre <= 0) return
    updateHabilidade(i, { evolucaoNivel: next })
  }

  async function handleGenerate() {
    if (!genDesc.trim()) return
    setGenerating(true)
    setGenError('')
    try {
      const data = await generateAbilitiesFromDescription(char, genDesc)
      if (data.habilidades) {
        const habs = [...(char.habilidades || [])]
        data.habilidades.forEach((gc, i) => {
          if (i < habs.length && habs[i]) {
            const next = {
              ...habs[i],
              nome: gc.nome || habs[i].nome,
              descricao: gc.descricao || habs[i].descricao,
              ...(gc.custoEnergia != null && { custoEnergia: gc.custoEnergia }),
              ...(gc.dano != null && { dano: gc.dano }),
              ...(gc.duracao != null && { duracao: gc.duracao || '' }),
              ...(gc.dt != null && { dt: gc.dt }),
              ...(gc.valores && { valores: gc.valores }),
            }
            habs[i] = { ...next, tags: normalizeSkillTags({ ...next, tags: gc.tags }) }
          }
        })
        update({ habilidades: habs })
      }
      setShowGenerator(false)
      setGenDesc('')
    } catch (err) {
      setGenError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="abilities-stage space-y-8">

      {/* ── Header ── */}
      <div>
        <div className="section-header text-primary mb-4">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>auto_awesome</span>
          Habilidades do Personagem
        </div>
        <p className="text-on-surface-variant text-sm mb-3">
          Defina as {needed} habilidades do personagem: 1 Passiva, 3 Ativas, 1 Ultimate
          {triagemCount > 0 && <span className="text-purple-400"> + {triagemCount} de Triagem</span>}
          {moduloCount  > 0 && <span className="text-sky-400"> + {moduloCount} de Módulo</span>}.
        </p>
        {costReduction > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2 text-xs text-blue-400 mb-3">
            Suporte ativo: Buffs têm custo de Energia reduzido em {Math.round(costReduction * 100)}%
          </div>
        )}
        <button
          onClick={() => setShowGenerator(true)}
          className="bg-purple-500/10 border border-purple-400/30 text-purple-400 text-xs px-4 py-2 rounded hover:bg-purple-500/20 transition-colors"
        >
          Gerar Habilidades com IA
        </button>
        {genError && <p className="text-err text-xs mt-2">{genError}</p>}
      </div>

      {/* ── Painel PEH ── */}
      <div className="codex-card !bg-primary/5 border-primary/30 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-cinzel text-primary text-sm tracking-wider">Pontos de Evolução de Habilidades (PEH)</h3>
          <div className="text-right">
            <span className="font-cinzel text-2xl text-primary">{pehLivre}</span>
            <span className="text-on-surface-variant text-xs ml-1">/ {pehTotal} livres</span>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="w-full bg-void rounded-full h-1.5 overflow-hidden">
          {pehTotal > 0 && (
            <div
              className="h-1.5 rounded-full transition-all"
              style={{
                width: `${Math.min(100, (pehSpent / pehTotal) * 100)}%`,
                background: pehLivre === 0
                  ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                  : 'linear-gradient(90deg, #fbbf24, #f59e0b)',
              }}
            />
          )}
        </div>

        {/* Breakdown por fonte */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-void/60 rounded-lg border border-sep/30 px-3 py-2">
            <div className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider mb-1">Progressão de Classe</div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-cinzel text-lg text-gold">{pehFromProgressao}</span>
              <span className="text-txt-dim text-xs">pontos</span>
            </div>
            <div className="text-[10px] text-txt-dim mt-0.5">Desbloqueados ao subir de nível</div>
          </div>
          <div className={`rounded-lg border px-3 py-2 ${pehFromModulo > 0 ? 'bg-orange-400/5 border-orange-400/30' : 'bg-void/40 border-sep/20 opacity-50'}`}>
            <div className="text-[10px] text-orange-400 font-semibold uppercase tracking-wider mb-1">Aumento de Poder</div>
            <div className="flex items-baseline gap-1.5">
              <span className={`font-cinzel text-lg ${pehFromModulo > 0 ? 'text-orange-400' : 'text-txt-dim'}`}>{pehFromModulo}</span>
              <span className="text-txt-dim text-xs">pontos</span>
            </div>
            <div className="text-[10px] text-txt-dim mt-0.5">
              {pehFromModulo > 0
                ? `Módulo comprado ${aumentoPoder?.boughtCount || 1}×`
                : 'Módulo não adquirido'}
            </div>
          </div>
        </div>

        {/* Distribuição atual */}
        {pehTotal > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <div className="flex-1 flex gap-1.5 flex-wrap">
              {habilidades.filter(h => h.tipo !== 'Passiva' && (h.evolucaoNivel || 0) > 0).map((h, idx) => (
                <span key={idx} className="bg-gold/10 text-gold px-2 py-0.5 rounded font-mono text-[10px]">
                  {h.nome ? h.nome.substring(0, 12) + (h.nome.length > 12 ? '…' : '') : `Hab.${idx+1}`}: {h.evolucaoNivel}★
                </span>
              ))}
              {pehSpent === 0 && <span className="text-txt-dim italic">Nenhum ponto distribuído ainda</span>}
            </div>
            <span className="shrink-0 font-mono text-txt-dim">{pehSpent}/{pehTotal} usados</span>
          </div>
        )}

        {pehTotal === 0 && (
          <p className="text-txt-dim text-xs italic">
            Pontos PEH são distribuídos conforme você avança de nível. Complete a progressão no Passo 5.
          </p>
        )}
        <div className="text-xs text-txt-dim border-t border-sep/30 pt-2 space-y-0.5">
          <p><span className="text-ok">Passiva</span> evolui automaticamente nos níveis 10, 20 e 30 — sem custo.</p>
          <p><span className="text-amber-300">Ultimate</span>: 1º ponto requer N15 · 2º requer N25 · 3º requer N30.</p>
          <p className="text-sep/70">Você pode redistribuir pontos até 2× por personagem.</p>
        </div>
      </div>

      {/* ── Gerador IA ── */}
      {showGenerator && (
        <div className="bg-deep border border-purple-400/30 rounded-xl p-5 space-y-3">
          <h3 className="font-cinzel text-purple-400 text-sm">Gerar Habilidades com IA</h3>
          <p className="text-txt-dim text-xs">
            Descreva seu personagem e o estilo de combate desejado. A IA criará conceitos de habilidades para você personalizar.
          </p>
          <textarea
            value={genDesc}
            onChange={e => setGenDesc(e.target.value)}
            placeholder="Ex: Um guerreiro tático que usa magia de fogo combinada com ataques físicos, focado em controle de campo..."
            rows={4}
            className="w-full bg-void/60 border border-sep/40 rounded px-3 py-2 text-sm text-txt-main resize-none focus:border-purple-400/40 focus:outline-none"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowGenerator(false); setGenDesc('') }} className="text-txt-dim text-xs px-3 py-1.5 hover:text-txt-main transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating || !genDesc.trim()}
              className="bg-purple-500 text-white text-xs px-4 py-1.5 rounded font-semibold hover:bg-purple-400 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {generating && <span className="animate-spin inline-block w-3 h-3 border border-gold/30 border-t-gold rounded-full" />}
              {generating ? 'Gerando...' : 'Gerar Habilidades'}
            </button>
          </div>
        </div>
      )}

      {/* ── Habilidades ── */}
      <div className="space-y-5">
        {habilidades.map((hab, i) => {
          const effectiveCost = (hab.tipo !== 'Passiva' && costReduction > 0)
            ? Math.max(0, Math.round(hab.custoEnergia * (1 - costReduction)))
            : hab.custoEnergia

          const isPassiva    = hab.tipo === 'Passiva'
          const autoEvo      = isPassiva ? calcPassivaAutoEvolucao(nivel) : null
          const evoAtual     = isPassiva ? autoEvo : (hab.evolucaoNivel || 0)
          const maxEvo       = getMaxEvolucao(hab.tipo, nivel)
          const delta        = calcEvolucaoDelta(hab, evoAtual)
          const tagChips     = getSkillTagChips(hab)
          const { allowed: canAdd, reason: addReason } = isPassiva
            ? { allowed: false, reason: 'Auto' }
            : canEvolveSkill(hab, evoAtual, nivel)
          const showPreview  = previewIdx === i && delta

          return (
            <div key={i} className={`rounded-lg border p-5 space-y-4 ${TIPO_STYLES[hab.tipo] || 'border-sep bg-deep'}`}>

              {/* Linha de topo: badge + evolução + status */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${TIPO_BADGE[hab.tipo] || 'bg-panel text-txt-dim'}`}>
                    {hab.tipo}
                  </span>

                  {/* Controle de evolução */}
                  <div className="flex items-center gap-2">
                    <span className="text-txt-dim text-xs">Evo:</span>
                    <div className="flex gap-0.5 text-sm">{EVO_STARS(evoAtual, maxEvo)}</div>

                    {!isPassiva && (
                      <>
                        <button
                          onClick={() => handleEvoChange(i, hab, -1)}
                          disabled={evoAtual <= 0}
                          className="w-5 h-5 flex items-center justify-center rounded bg-void border border-sep text-txt-dim text-xs hover:border-err/60 hover:text-err disabled:opacity-30 transition-colors"
                          title="Remover 1 PEH"
                        >−</button>
                        <button
                          onClick={() => handleEvoChange(i, hab, 1)}
                          disabled={!canAdd || pehLivre <= 0}
                          className="w-5 h-5 flex items-center justify-center rounded bg-void border border-sep text-txt-dim text-xs hover:border-gold/60 hover:text-gold disabled:opacity-30 transition-colors"
                          title={!canAdd ? addReason : pehLivre <= 0 ? 'Sem PEH disponível' : `+1 PEH (${pehLivre} restantes)`}
                        >+</button>
                      </>
                    )}

                    {isPassiva && (
                      <span className="text-xs text-ok/70 italic">Automático</span>
                    )}

                    {/* Preview do delta */}
                    {delta && (
                      <button
                        onClick={() => setPreviewIdx(previewIdx === i ? null : i)}
                        className="text-xs text-gold/70 hover:text-gold underline decoration-dotted ml-1 transition-colors"
                      >
                        {showPreview ? 'ocultar' : 'ver bônus'}
                      </button>
                    )}
                  </div>
                </div>

                <select
                  value={hab.status}
                  onChange={e => updateHabilidade(i, { status: e.target.value })}
                  className={`text-xs bg-void border border-sep rounded px-2 py-1 ${STATUS_COLORS[hab.status] || 'text-txt-dim'}`}
                >
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Preview do delta de evolução */}
              {showPreview && delta && (
                <div className="bg-gold/5 border border-gold/20 rounded-lg px-4 py-2 text-xs space-y-0.5">
                  <p className="text-gold font-semibold mb-1">Preview — Evolução {evoAtual}/{maxEvo} ({delta.bracket})</p>
                  {delta.tagBonuses?.length > 0 ? delta.tagBonuses.map(item => (
                    <p key={item.tag} className="text-txt-main">{item.label}: <span className="text-gold font-mono">{item.value}</span></p>
                  )) : <p className="text-txt-dim">Nenhum incremento numerico direto detectado para as tags atuais.</p>}
                  <p className="text-txt-dim italic mt-1">Valores finais são calibrados pela IA durante análise de balanceamento.</p>
                </div>
              )}

              {/* Nome */}
              <div>
                <label className="block text-txt-dim text-xs mb-1">Nome</label>
                <input
                  type="text"
                  value={hab.nome}
                  onChange={e => updateHabilidade(i, { nome: e.target.value })}
                  placeholder={`Nome da habilidade ${hab.tipo}`}
                  className="w-full bg-void border border-sep rounded px-3 py-2 text-sm text-txt-main"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-txt-dim text-xs mb-1">Descrição</label>
                <textarea
                  value={hab.descricao}
                  onChange={e => updateHabilidade(i, { descricao: e.target.value })}
                  placeholder="Descreva o efeito da habilidade..."
                  rows={3}
                  className="w-full bg-void border border-sep rounded px-3 py-2 text-sm text-txt-main resize-none"
                />
              </div>

              {/* Campos numéricos */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-txt-dim text-xs mb-1">Custo Energia</label>
                  <input
                    type="number"
                    value={hab.custoEnergia}
                    onChange={e => updateHabilidade(i, { custoEnergia: Number(e.target.value) || 0 })}
                    className="w-full bg-void border border-sep rounded px-3 py-2 text-sm text-txt-main font-mono"
                  />
                  {costReduction > 0 && hab.tipo !== 'Passiva' && (
                    <span className="text-blue-400 text-xs">Efetivo: {effectiveCost}</span>
                  )}
                </div>
                <div>
                  <label className="block text-txt-dim text-xs mb-1">Dano</label>
                  <input
                    type="text"
                    value={hab.dano}
                    onChange={e => updateHabilidade(i, { dano: e.target.value })}
                    placeholder="ex: 3d8+12"
                    className="w-full bg-void border border-sep rounded px-3 py-2 text-sm text-txt-main font-mono"
                  />
                </div>
                <div>
                  <label className="block text-txt-dim text-xs mb-1">Duração</label>
                  <input
                    type="text"
                    value={hab.duracao}
                    onChange={e => updateHabilidade(i, { duracao: e.target.value })}
                    placeholder="ex: 3 rodadas"
                    className="w-full bg-void border border-sep rounded px-3 py-2 text-sm text-txt-main"
                  />
                </div>
              </div>
              {tagChips.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tagChips.map(chip => (
                    <span key={chip.tag} className="text-[10px] bg-void/50 border border-sep/30 text-txt-dim px-2 py-0.5 rounded font-mono">
                      {chip.tag === 'dt' ? (
                        <>
                          DT: {chip.value || 'tipo?'}{chip.missingType ? <span className="text-amber-300/80"> tipo?</span> : null}
                        </>
                      ) : (
                        <>
                          {chip.label}{chip.value ? ` ${chip.value}` : ''}
                        </>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
