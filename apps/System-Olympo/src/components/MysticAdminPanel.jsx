import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getTagValue, normalizeTags, setTagValue, stripTagPrefix } from '../utils/mysticTagHelpers'

const SOURCE_KINDS = ['regente', 'limiar', 'neutro']

const CIRCLE_BADGE = {
  1: 'bg-emerald-400/12 text-emerald-300 border-emerald-400/25',
  2: 'bg-sky-400/12 text-sky-300 border-sky-400/25',
  3: 'bg-purple-400/12 text-purple-300 border-purple-400/25',
  4: 'bg-amber-300/12 text-amber-200 border-amber-300/30',
}

export default function MysticAdminPanel({ config }) {
  const {
    title,
    ritualType,
    categories,
    fetchLibrary,
    saveEntry,
    deleteEntry,
    analyzeEntry,
    getSpaceCost,
    sourceWarning,
    specialTagPrefix = '',
    specialLabel = '',
    specialOptions = [],
    specialPlaceholder = '',
    sourceNameLabel = 'Entidade / Fonte',
    lawNameLabel = 'Lei / Eixo',
  } = config

  const { user } = useAuth()
  const editorRef = useRef(null)
  const [entries, setEntries] = useState([])
  const [sourceMode, setSourceMode] = useState('database')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [analysisNote, setAnalysisNote] = useState('')
  const [form, setForm] = useState(emptyForm())

  useEffect(() => {
    load()
  }, [])

  function emptyForm() {
    return {
      ritual_type: ritualType,
      name: '',
      circle: 1,
      category: categories[0] || 'Ataque',
      pe_cost: 5,
      min_level: 1,
      action_cost: 'Acao Padrao',
      duration: 'Instantaneo',
      range: 'Pessoal',
      short_description: '',
      effect: '',
      source_kind: 'neutro',
      source_name: '',
      law_name: '',
      price: '',
      rupture_risk: 1,
      protocol_layer: 2,
      pp_estimate: 4,
      tags: '',
      specialValue: '',
      ai_feedback: '',
    }
  }

  async function load(selectId = null) {
    setLoading(true)
    const res = await fetchLibrary()
    setEntries(res.data || [])
    setSourceMode(res.source || 'database')
    setError(res.error ? sourceWarning : '')
    setLoading(false)

    if (selectId) {
      const found = (res.data || []).find((item) => item.id === selectId)
      if (found) {
        setSelectedId(found.id)
        setForm(toForm(found))
      }
    }
  }

  function toForm(entry) {
    const rawTags = normalizeTags(entry.tags)
    return {
      ritual_type: entry.ritual_type || ritualType,
      name: entry.name || '',
      circle: entry.circle || 1,
      category: entry.category || categories[0] || 'Ataque',
      pe_cost: entry.pe_cost || 0,
      min_level: entry.min_level || 1,
      action_cost: entry.action_cost || 'Acao Padrao',
      duration: entry.duration || 'Instantaneo',
      range: entry.range || 'Pessoal',
      short_description: entry.short_description || '',
      effect: entry.effect || '',
      source_kind: entry.source_kind || 'neutro',
      source_name: entry.source_name || '',
      law_name: entry.law_name || '',
      price: entry.price || '',
      rupture_risk: entry.rupture_risk || 1,
      protocol_layer: entry.protocol_layer || 2,
      pp_estimate: entry.pp_estimate || 0,
      tags: stripTagPrefix(rawTags, specialTagPrefix).join(', '),
      specialValue: specialTagPrefix ? getTagValue(rawTags, specialTagPrefix) : '',
      ai_feedback: entry.ai_feedback || '',
    }
  }

  function fromForm() {
    let tags = form.tags.split(',').map((item) => item.trim()).filter(Boolean)
    if (specialTagPrefix) tags = setTagValue(tags, specialTagPrefix, form.specialValue)
    return {
      ...(selectedId ? { id: selectedId } : {}),
      ritual_type: ritualType,
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
      tags,
      ai_feedback: form.ai_feedback.trim(),
      created_by: user?.id || null,
      updated_at: new Date().toISOString(),
    }
  }

  function handleSelect(entry) {
    setSelectedId(entry.id || null)
    setForm(toForm(entry))
    requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function handleNew() {
    setSelectedId(null)
    setForm(emptyForm())
  }

  async function handleAnalyze() {
    setAnalyzing(true)
    setError('')
    try {
      const analyzed = await analyzeEntry(fromForm(), {
        user_role: 'admin',
        current_source: sourceMode,
        analysis_note: analysisNote.trim(),
      })
      setForm(toForm({ ...fromForm(), ...analyzed }))
    } catch (err) {
      setError(err.message || 'Falha ao analisar cadastro.')
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleSave() {
    const payload = fromForm()
    if (!payload.name || !payload.effect) {
      setError('Preencha ao menos nome e efeito.')
      return
    }

    setSaving(true)
    setError('')
    const { data, error: saveError } = await saveEntry(payload)
    setSaving(false)
    if (saveError) {
      setError(saveError.message || 'Nao foi possivel salvar.')
      return
    }
    await load(data?.id || selectedId)
  }

  async function handleDelete() {
    if (!selectedId) return
    if (!confirm(`Excluir este registro de ${title.toLowerCase()}?`)) return

    const { error: deleteError } = await deleteEntry(selectedId)
    if (deleteError) {
      setError(deleteError.message || 'Nao foi possivel excluir.')
      return
    }

    setSelectedId(null)
    setForm(emptyForm())
    await load()
  }

  const selectedEntry = entries.find((entry) => entry.id === selectedId) || null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] gap-5">
      <section className="bg-deep border border-sep rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-cinzel text-gold text-lg">{title}</h3>
            <p className="text-txt-dim text-xs mt-1">
              Fonte atual: <span className={sourceMode === 'database' ? 'text-emerald-400' : 'text-amber-300'}>{sourceMode === 'database' ? 'Banco' : 'Catalogo local'}</span>
            </p>
          </div>
          <button onClick={handleNew} className="border border-gold/30 text-gold px-3 py-1.5 rounded text-xs hover:bg-gold/10 transition-colors">
            Novo
          </button>
        </div>

        {loading ? (
          <p className="text-txt-dim text-sm animate-pulse">Carregando biblioteca...</p>
        ) : (
          <div className="space-y-2 max-h-[760px] overflow-y-auto pr-1">
            {entries.map((entry) => (
              <div
                key={entry.id}
                onClick={() => handleSelect(entry)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    handleSelect(entry)
                  }
                }}
                role="button"
                tabIndex={0}
                className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors cursor-pointer ${
                  selectedId === entry.id ? 'border-gold/40 bg-gold/10' : 'border-sep/40 hover:border-gold/20 bg-void/40'
                }`}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-txt-main text-sm font-semibold">{entry.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${CIRCLE_BADGE[entry.circle] || CIRCLE_BADGE[1]}`}>{entry.circle}o</span>
                  <span className="text-[10px] bg-sep/20 text-txt-dim px-1.5 py-0.5 rounded">{entry.category}</span>
                  <span className="text-[10px] bg-purple-400/10 text-purple-300 px-1.5 py-0.5 rounded border border-purple-400/20">
                    {entry.source_name || entry.source_kind}
                  </span>
                </div>
                <p className="text-txt-dim text-xs mt-1 line-clamp-2">{entry.short_description}</p>
                {selectedId === entry.id && (
                  <div className="mt-3 pt-3 border-t border-sep/20 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <MiniMeta label="PE" value={`${entry.pe_cost} PE`} />
                      <MiniMeta label="Espacos" value={`${getSpaceCost(entry.circle)}`} />
                      <MiniMeta label="Nivel" value={`N${entry.min_level || 1}`} />
                      <MiniMeta label="Lei" value={entry.law_name || 'Nao informada'} />
                      <MiniMeta label="Risco" value={`${entry.rupture_risk || 1}/4`} />
                    </div>
                    <p className="text-txt-dim text-xs leading-relaxed">{entry.effect}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section ref={editorRef} className="bg-deep border border-sep rounded-xl p-4 space-y-4 lg:sticky lg:top-4 self-start">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-cinzel text-gold text-lg">{selectedId ? 'Editar Registro' : 'Novo Registro'}</h3>
            <p className="text-txt-dim text-xs mt-1">
              Cadastro administrativo com apoio de IA e persistencia por `ritual_type`.
            </p>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="border border-indigo-400/30 text-indigo-300 px-3 py-1.5 rounded text-xs hover:bg-indigo-400/10 transition-colors disabled:opacity-50"
          >
            {analyzing ? 'Analisando...' : 'Analisar Ritual'}
          </button>
        </div>

        {error && <div className="text-amber-300 text-xs bg-amber-300/5 border border-amber-300/20 rounded-lg px-3 py-2">{error}</div>}

        <div className="bg-indigo-400/5 border border-indigo-400/20 rounded-lg p-3 space-y-2">
          <div className="flex items-start gap-2">
            <div className="text-indigo-300 text-[11px] font-semibold uppercase tracking-[0.12em]">Diretriz para IA</div>
            <div className="text-txt-dim text-[11px] leading-relaxed">
              Use esta caixa para apontar um problema do registro atual ou descrever a ideia de um novo cadastro antes de clicar em <span className="text-indigo-300">Analisar Ritual</span>.
            </div>
          </div>
          <textarea
            value={analysisNote}
            onChange={(event) => setAnalysisNote(event.target.value)}
            rows={3}
            placeholder="Ex.: esta runa esta forte demais para o grau comum. Ou: quero um feitico arcano de 2o circulo focado em contra-magica."
            className="admin-input resize-y"
          />
        </div>

        {selectedEntry && (
          <div className="bg-void/55 border border-gold/20 rounded-lg p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-gold font-semibold text-sm">{selectedEntry.name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${CIRCLE_BADGE[selectedEntry.circle] || CIRCLE_BADGE[1]}`}>{selectedEntry.circle}o Circulo</span>
              <span className="text-[10px] bg-sep/20 text-txt-dim px-1.5 py-0.5 rounded">{selectedEntry.category}</span>
              <span className="text-[10px] bg-purple-400/10 text-purple-300 px-1.5 py-0.5 rounded border border-purple-400/20">
                {selectedEntry.source_name || selectedEntry.source_kind}
              </span>
            </div>
            <p className="text-txt-dim text-xs mt-2 leading-relaxed">{selectedEntry.short_description}</p>
            <div className="mt-2 text-[11px] font-mono text-gold">{getSpaceCost(selectedEntry.circle)} espacos</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="Nome">
            <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} className="admin-input" />
          </Field>
          <Field label="Circulo">
            <select value={form.circle} onChange={(event) => setForm((prev) => ({ ...prev, circle: Number(event.target.value) }))} className="admin-input">
              {[1, 2, 3, 4].map((item) => <option key={item} value={item}>{item}o Circulo</option>)}
            </select>
          </Field>
          <Field label="Categoria">
            <select value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} className="admin-input">
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
          <Field label="PE">
            <input type="number" value={form.pe_cost} onChange={(event) => setForm((prev) => ({ ...prev, pe_cost: Number(event.target.value) || 0 }))} className="admin-input" />
          </Field>
          <Field label="Nivel Minimo">
            <input type="number" value={form.min_level} onChange={(event) => setForm((prev) => ({ ...prev, min_level: Number(event.target.value) || 1 }))} className="admin-input" />
          </Field>
          <Field label="Acao">
            <input value={form.action_cost} onChange={(event) => setForm((prev) => ({ ...prev, action_cost: event.target.value }))} className="admin-input" />
          </Field>
          <Field label="Duracao">
            <input value={form.duration} onChange={(event) => setForm((prev) => ({ ...prev, duration: event.target.value }))} className="admin-input" />
          </Field>
          <Field label="Alcance">
            <input value={form.range} onChange={(event) => setForm((prev) => ({ ...prev, range: event.target.value }))} className="admin-input" />
          </Field>
          <Field label="Fonte">
            <select value={form.source_kind} onChange={(event) => setForm((prev) => ({ ...prev, source_kind: event.target.value }))} className="admin-input">
              {SOURCE_KINDS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </Field>
          <Field label={sourceNameLabel}>
            <input value={form.source_name} onChange={(event) => setForm((prev) => ({ ...prev, source_name: event.target.value }))} className="admin-input" />
          </Field>
          <Field label={lawNameLabel}>
            <input value={form.law_name} onChange={(event) => setForm((prev) => ({ ...prev, law_name: event.target.value }))} className="admin-input" />
          </Field>
          <Field label="Risco">
            <input type="number" value={form.rupture_risk} onChange={(event) => setForm((prev) => ({ ...prev, rupture_risk: Number(event.target.value) || 1 }))} className="admin-input" />
          </Field>
          <Field label="Camada SCP">
            <select value={form.protocol_layer} onChange={(event) => setForm((prev) => ({ ...prev, protocol_layer: Number(event.target.value) }))} className="admin-input">
              <option value={2}>Camada 2</option>
              <option value={3}>Camada 3</option>
            </select>
          </Field>
          <Field label="PP Estimado">
            <input type="number" value={form.pp_estimate} onChange={(event) => setForm((prev) => ({ ...prev, pp_estimate: Number(event.target.value) || 0 }))} className="admin-input" />
          </Field>
          {specialTagPrefix && (
            <Field label={specialLabel}>
              <select value={form.specialValue} onChange={(event) => setForm((prev) => ({ ...prev, specialValue: event.target.value }))} className="admin-input">
                <option value="">{specialPlaceholder}</option>
                {specialOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </Field>
          )}
          <Field label="Tags">
            <input value={form.tags} onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))} className="admin-input" placeholder="controle, aura, vinculo" />
          </Field>
        </div>

        <Field label="Resumo Curto">
          <input value={form.short_description} onChange={(event) => setForm((prev) => ({ ...prev, short_description: event.target.value }))} className="admin-input" />
        </Field>

        <Field label="Efeito">
          <textarea value={form.effect} onChange={(event) => setForm((prev) => ({ ...prev, effect: event.target.value }))} rows={6} className="admin-input resize-y" />
        </Field>

        <Field label="Preco / Contrapeso Narrativo">
          <textarea value={form.price} onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))} rows={3} className="admin-input resize-y" />
        </Field>

        <Field label="Feedback da IA">
          <textarea value={form.ai_feedback} onChange={(event) => setForm((prev) => ({ ...prev, ai_feedback: event.target.value }))} rows={3} className="admin-input resize-y" />
        </Field>

        <div className="flex gap-2 pt-2 border-t border-sep/30">
          <button onClick={handleSave} disabled={saving} className="bg-gold text-void px-4 py-2 rounded text-sm font-semibold hover:bg-gold-light transition-colors disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar Registro'}
          </button>
          <button onClick={handleNew} className="text-txt-dim px-3 py-2 text-sm hover:text-txt-main transition-colors">
            Limpar
          </button>
          {selectedId && (
            <button onClick={handleDelete} className="text-err px-3 py-2 text-sm hover:bg-err/10 rounded transition-colors">
              Excluir
            </button>
          )}
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
    <div className="bg-void/60 border border-sep/20 rounded px-2 py-1">
      <div className="text-[10px] uppercase tracking-[0.12em] text-txt-dim">{label}</div>
      <div className="text-txt-main text-[11px] mt-1">{value}</div>
    </div>
  )
}
