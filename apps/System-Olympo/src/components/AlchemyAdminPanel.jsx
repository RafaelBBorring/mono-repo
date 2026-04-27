import { useEffect, useRef, useState } from 'react'
import { ALCHEMY_CATEGORIES, ALCHEMY_SOURCE_KINDS } from '../data/alchemyFallbackRituals'
import { fetchAlchemyRituals, saveAlchemyRitual, deleteAlchemyRitual } from '../services/alchemyService'
import { analyzeAlchemyRitualDraft } from '../services/aiService'
import { useAuth } from '../contexts/AuthContext'
import { getAlchemyRitualSpaceCost } from '../utils/alchemyRules'

const EMPTY_FORM = {
  ritual_type: 'alchemy',
  name: '',
  circle: 1,
  category: 'Ataque',
  pe_cost: 5,
  min_level: 1,
  action_cost: 'Acao Padrao',
  duration: 'Instantaneo',
  range: 'Pessoal',
  short_description: '',
  effect: '',
  source_kind: 'regente',
  source_name: '',
  law_name: '',
  price: '',
  rupture_risk: 1,
  protocol_layer: 2,
  pp_estimate: 4,
  tags: '',
  ai_feedback: '',
}

const CIRCLE_BADGE = {
  1: 'bg-emerald-400/12 text-emerald-300 border-emerald-400/25',
  2: 'bg-sky-400/12 text-sky-300 border-sky-400/25',
  3: 'bg-purple-400/12 text-purple-300 border-purple-400/25',
  4: 'bg-amber-300/12 text-amber-200 border-amber-300/30',
}

export default function AlchemyAdminPanel() {
  const { user } = useAuth()
  const editorRef = useRef(null)
  const [rituals, setRituals] = useState([])
  const [sourceMode, setSourceMode] = useState('database')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [analysisNote, setAnalysisNote] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load(selectId = null) {
    setLoading(true)
    const res = await fetchAlchemyRituals()
    setRituals(res.data || [])
    setSourceMode(res.source || 'database')
    setError(res.error ? 'Tabela de Alquimia indisponivel no banco. O painel esta lendo o catalogo local.' : '')
    setLoading(false)

    if (selectId) {
      const found = (res.data || []).find(item => item.id === selectId)
      if (found) {
        setSelectedId(found.id)
        setForm(toForm(found))
      }
    }
  }

  function toForm(ritual) {
    return {
      ritual_type: ritual.ritual_type || 'alchemy',
      name: ritual.name || '',
      circle: ritual.circle || 1,
      category: ritual.category || 'Ataque',
      pe_cost: ritual.pe_cost || 0,
      min_level: ritual.min_level || 1,
      action_cost: ritual.action_cost || 'Acao Padrao',
      duration: ritual.duration || 'Instantaneo',
      range: ritual.range || 'Pessoal',
      short_description: ritual.short_description || '',
      effect: ritual.effect || '',
      source_kind: ritual.source_kind || 'regente',
      source_name: ritual.source_name || '',
      law_name: ritual.law_name || '',
      price: ritual.price || '',
      rupture_risk: ritual.rupture_risk || 1,
      protocol_layer: ritual.protocol_layer || 2,
      pp_estimate: ritual.pp_estimate || 0,
      tags: Array.isArray(ritual.tags) ? ritual.tags.join(', ') : '',
      ai_feedback: ritual.ai_feedback || '',
    }
  }

  function fromForm() {
    return {
      ...(selectedId ? { id: selectedId } : {}),
      ritual_type: 'alchemy',
      name: form.name.trim(),
      circle: Number(form.circle) || 1,
      category: form.category,
      pe_cost: Number(form.pe_cost) || 0,
      min_level: Number(form.min_level) || 1,
      action_cost: form.action_cost.trim(),
      duration: form.duration.trim(),
      range: form.range.trim(),
      short_description: form.short_description.trim(),
      effect: form.effect.trim(),
      source_kind: form.source_kind,
      source_name: form.source_name.trim(),
      law_name: form.law_name.trim(),
      price: form.price.trim(),
      rupture_risk: Number(form.rupture_risk) || 1,
      protocol_layer: Number(form.protocol_layer) || 2,
      pp_estimate: Number(form.pp_estimate) || 0,
      tags: form.tags.split(',').map(item => item.trim()).filter(Boolean),
      ai_feedback: form.ai_feedback.trim(),
      created_by: user?.id || null,
      updated_at: new Date().toISOString(),
    }
  }

  function handleSelect(ritual) {
    setSelectedId(ritual.id || null)
    setForm(toForm(ritual))
    requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function handleNew() {
    setSelectedId(null)
    setForm(EMPTY_FORM)
  }

  async function handleAnalyze() {
    setAnalyzing(true)
    setError('')
    try {
      const analyzed = await analyzeAlchemyRitualDraft(fromForm(), {
        user_role: 'admin',
        current_source: sourceMode,
        analysis_note: analysisNote.trim(),
      })
      setForm({
        ritual_type: 'alchemy',
        name: analyzed.name || form.name,
        circle: analyzed.circle || form.circle,
        category: analyzed.category || form.category,
        pe_cost: analyzed.pe_cost ?? form.pe_cost,
        min_level: analyzed.min_level ?? form.min_level,
        action_cost: analyzed.action_cost || form.action_cost,
        duration: analyzed.duration || form.duration,
        range: analyzed.range || form.range,
        short_description: analyzed.short_description || form.short_description,
        effect: analyzed.effect || form.effect,
        source_kind: analyzed.source_kind || form.source_kind,
        source_name: analyzed.source_name || form.source_name,
        law_name: analyzed.law_name || form.law_name,
        price: analyzed.price || form.price,
        rupture_risk: analyzed.rupture_risk ?? form.rupture_risk,
        protocol_layer: analyzed.protocol_layer ?? form.protocol_layer,
        pp_estimate: analyzed.pp_estimate ?? form.pp_estimate,
        tags: Array.isArray(analyzed.tags) ? analyzed.tags.join(', ') : form.tags,
        ai_feedback: analyzed.ai_feedback || '',
      })
    } catch (err) {
      setError(err.message || 'Falha ao analisar ritual.')
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleSave() {
    const payload = fromForm()
    if (!payload.name || !payload.effect) {
      setError('Preencha ao menos nome e efeito do ritual.')
      return
    }

    setSaving(true)
    setError('')
    const { data, error: saveError } = await saveAlchemyRitual(payload)
    setSaving(false)

    if (saveError) {
      setError(saveError.message || 'Nao foi possivel salvar no banco.')
      return
    }

    await load(data?.id || selectedId)
  }

  async function handleDelete() {
    if (!selectedId) return
    if (!confirm('Excluir este ritual de alquimia?')) return

    const { error: deleteError } = await deleteAlchemyRitual(selectedId)
    if (deleteError) {
      setError(deleteError.message || 'Nao foi possivel excluir o ritual.')
      return
    }

    setSelectedId(null)
    setForm(EMPTY_FORM)
    await load()
  }

  const selectedRitual = rituals.find((ritual) => ritual.id === selectedId) || null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-5">
      <section className="bg-deep border border-sep rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-cinzel text-gold text-lg">Biblioteca Alquimica</h3>
            <p className="text-txt-dim text-xs mt-1">
              Fonte atual: <span className={sourceMode === 'database' ? 'text-emerald-400' : 'text-amber-300'}>{sourceMode === 'database' ? 'Banco' : 'Catalogo local'}</span>
            </p>
          </div>
          <button onClick={handleNew} className="border border-gold/30 text-gold px-3 py-1.5 rounded text-xs hover:bg-gold/10 transition-colors">
            Novo
          </button>
        </div>

        {loading ? (
          <p className="text-txt-dim text-sm animate-pulse">Carregando rituais...</p>
        ) : (
          <div className="space-y-2 max-h-[760px] overflow-y-auto pr-1">
            {rituals.map(ritual => (
              <div
                key={ritual.id}
                onClick={() => handleSelect(ritual)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    handleSelect(ritual)
                  }
                }}
                role="button"
                tabIndex={0}
                className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors cursor-pointer ${
                  selectedId === ritual.id ? 'border-gold/40 bg-gold/10' : 'border-sep/40 hover:border-gold/20 bg-void/40'
                }`}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-txt-main text-sm font-semibold">{ritual.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${CIRCLE_BADGE[ritual.circle] || CIRCLE_BADGE[1]}`}>{ritual.circle}o</span>
                  <span className="text-[10px] bg-sep/20 text-txt-dim px-1.5 py-0.5 rounded">{ritual.category}</span>
                  <span className="text-[10px] bg-purple-400/10 text-purple-300 px-1.5 py-0.5 rounded border border-purple-400/20">
                    {ritual.source_name || ritual.source_kind}
                  </span>
                </div>
                <p className="text-txt-dim text-xs mt-1 line-clamp-2">{ritual.short_description}</p>
                {selectedId === ritual.id && (
                  <div className="mt-3 pt-3 border-t border-sep/20 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <MiniMeta label="PE" value={`${ritual.pe_cost} PE`} />
                      <MiniMeta label="Espacos" value={`${getAlchemyRitualSpaceCost(ritual.circle)}`} />
                      <MiniMeta label="Nivel" value={`N${ritual.min_level || 1}`} />
                      <MiniMeta label="Lei" value={ritual.law_name || 'Nao informada'} />
                      <MiniMeta label="Ruptura" value={`${ritual.rupture_risk || 1}/4`} />
                    </div>
                    <p className="text-txt-dim text-xs leading-relaxed">{ritual.effect}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section ref={editorRef} className="bg-deep border border-sep rounded-xl p-5 space-y-4 lg:sticky lg:top-4 self-start">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-cinzel text-gold text-lg">{selectedId ? 'Editar Ritual' : 'Novo Ritual'}</h3>
            <p className="text-txt-dim text-xs mt-1">
              Cadastro orientado para Alquimia agora, mas ja preparado com `ritual_type` para Feiticos e Runas depois.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAnalyze} disabled={analyzing} className="border border-indigo-400/30 text-indigo-300 px-3 py-1.5 rounded text-xs hover:bg-indigo-400/10 transition-colors disabled:opacity-50">
              {analyzing ? 'Analisando...' : 'Analisar Ritual'}
            </button>
            {selectedId && (
              <button onClick={handleDelete} className="border border-err/30 text-err px-3 py-1.5 rounded text-xs hover:bg-err/10 transition-colors">
                Excluir
              </button>
            )}
          </div>
        </div>

        {error && <div className="bg-amber-300/10 border border-amber-300/20 rounded px-3 py-2 text-xs text-amber-200">{error}</div>}

        <div className="bg-indigo-400/5 border border-indigo-400/20 rounded-lg p-3">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <div>
              <div className="text-indigo-300 text-[11px] font-semibold uppercase tracking-[0.12em]">Diretriz para IA</div>
              <p className="text-txt-dim text-xs mt-1">
                Use esta caixa para apontar um problema do ritual atual ou descrever a ideia de um ritual novo antes de clicar em <span className="text-indigo-300">Analisar Ritual</span>.
              </p>
            </div>
          </div>
          <textarea
            value={analysisNote}
            onChange={e => setAnalysisNote(e.target.value)}
            rows={3}
            placeholder="Ex.: este ritual esta forte demais para 2o circulo; reduza o controle e aumente o custo. Ou: quero um ritual de 3o circulo focado em cura biologica e risco alto."
            className="admin-input resize-y"
          />
        </div>

        {selectedRitual && (
          <div className="bg-void/55 border border-gold/20 rounded-lg p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-gold font-semibold text-sm">{selectedRitual.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${CIRCLE_BADGE[selectedRitual.circle] || CIRCLE_BADGE[1]}`}>{selectedRitual.circle}o Circulo</span>
              <span className="text-[10px] bg-sep/20 text-txt-dim px-1.5 py-0.5 rounded">{selectedRitual.category}</span>
              <span className="text-[10px] bg-purple-400/10 text-purple-300 px-1.5 py-0.5 rounded border border-purple-400/20">
                {selectedRitual.source_name || selectedRitual.source_kind}
              </span>
            </div>
            <p className="text-txt-dim text-xs mt-2 leading-relaxed">{selectedRitual.short_description}</p>
            <div className="mt-2 text-[11px] font-mono text-gold">{getAlchemyRitualSpaceCost(selectedRitual.circle)} espacos</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="Nome">
            <input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} className="admin-input" />
          </Field>
          <Field label="Circulo">
            <select value={form.circle} onChange={e => setForm(prev => ({ ...prev, circle: Number(e.target.value) }))} className="admin-input">
              {[1, 2, 3, 4].map(item => <option key={item} value={item}>{item}o Circulo</option>)}
            </select>
          </Field>
          <Field label="Categoria">
            <select value={form.category} onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))} className="admin-input">
              {ALCHEMY_CATEGORIES.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="PE">
            <input type="number" value={form.pe_cost} onChange={e => setForm(prev => ({ ...prev, pe_cost: Number(e.target.value) || 0 }))} className="admin-input" />
          </Field>
          <Field label="Nivel Minimo">
            <input type="number" value={form.min_level} onChange={e => setForm(prev => ({ ...prev, min_level: Number(e.target.value) || 1 }))} className="admin-input" />
          </Field>
          <Field label="Acao">
            <input value={form.action_cost} onChange={e => setForm(prev => ({ ...prev, action_cost: e.target.value }))} className="admin-input" />
          </Field>
          <Field label="Duracao">
            <input value={form.duration} onChange={e => setForm(prev => ({ ...prev, duration: e.target.value }))} className="admin-input" />
          </Field>
          <Field label="Alcance">
            <input value={form.range} onChange={e => setForm(prev => ({ ...prev, range: e.target.value }))} className="admin-input" />
          </Field>
          <Field label="Fonte">
            <select value={form.source_kind} onChange={e => setForm(prev => ({ ...prev, source_kind: e.target.value }))} className="admin-input">
              {ALCHEMY_SOURCE_KINDS.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="Entidade / Fonte">
            <input value={form.source_name} onChange={e => setForm(prev => ({ ...prev, source_name: e.target.value }))} className="admin-input" />
          </Field>
          <Field label="Lei / Eixo">
            <input value={form.law_name} onChange={e => setForm(prev => ({ ...prev, law_name: e.target.value }))} className="admin-input" />
          </Field>
          <Field label="Ruptura">
            <input type="number" value={form.rupture_risk} onChange={e => setForm(prev => ({ ...prev, rupture_risk: Number(e.target.value) || 1 }))} className="admin-input" />
          </Field>
          <Field label="Camada SCP">
            <select value={form.protocol_layer} onChange={e => setForm(prev => ({ ...prev, protocol_layer: Number(e.target.value) }))} className="admin-input">
              <option value={2}>Camada 2</option>
              <option value={3}>Camada 3</option>
            </select>
          </Field>
          <Field label="PP Estimado">
            <input type="number" value={form.pp_estimate} onChange={e => setForm(prev => ({ ...prev, pp_estimate: Number(e.target.value) || 0 }))} className="admin-input" />
          </Field>
          <Field label="Tags">
            <input value={form.tags} onChange={e => setForm(prev => ({ ...prev, tags: e.target.value }))} className="admin-input" placeholder="espaco, controle, aura" />
          </Field>
        </div>

        <Field label="Resumo Curto">
          <input value={form.short_description} onChange={e => setForm(prev => ({ ...prev, short_description: e.target.value }))} className="admin-input" />
        </Field>

        <Field label="Efeito">
          <textarea value={form.effect} onChange={e => setForm(prev => ({ ...prev, effect: e.target.value }))} rows={6} className="admin-input resize-y" />
        </Field>

        <Field label="Preco / Contrapeso Narrativo">
          <textarea value={form.price} onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))} rows={3} className="admin-input resize-y" />
        </Field>

        <Field label="Feedback da IA">
          <textarea value={form.ai_feedback} onChange={e => setForm(prev => ({ ...prev, ai_feedback: e.target.value }))} rows={3} className="admin-input resize-y" />
        </Field>

        <div className="flex gap-2 pt-2 border-t border-sep/30">
          <button onClick={handleSave} disabled={saving} className="bg-gold text-void px-4 py-2 rounded text-sm font-semibold hover:bg-gold-light transition-colors disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar Ritual'}
          </button>
          <button onClick={handleNew} className="text-txt-dim px-3 py-2 text-sm hover:text-txt-main transition-colors">
            Limpar
          </button>
        </div>
      </section>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-txt-dim text-[11px] uppercase tracking-[0.12em] mb-1.5">{label}</span>
      {children}
    </label>
  )
}

function MiniMeta({ label, value }) {
  return (
    <div className="bg-deep/70 border border-sep/20 rounded px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-[0.12em] text-txt-dim">{label}</div>
      <div className="text-txt-main mt-1">{value}</div>
    </div>
  )
}
