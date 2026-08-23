import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BookOpen,
  Check,
  ChevronRight,
  Database,
  Download,
  Hourglass,
  Landmark,
  Map as MapIcon,
  Orbit,
  Palette,
  Pencil,
  Plus,
  Sparkles,
  Swords,
  Trash2,
  Upload,
  Users,
  Wand2,
  X,
} from 'lucide-react'
import { useMaestro } from '../contexts/MaestroContext'
import {
  DEFAULT_CATEGORIES,
  deleteCanonRule,
  ignoreCanonConflict,
  listCanonConflicts,
  listCanonRules,
  listCustomCategories,
  resolveCanonConflict,
  saveCanonRule,
} from '../services/localVault/canon'
import {
  downloadBlob,
  exportVaultFile,
  importVaultSnapshot,
  parseVaultFile,
  suggestedFileName,
} from '../services/localVault/vaultFile'

const CATEGORY_ICON = {
  cosmologia: Orbit,
  magia: Wand2,
  povos: Users,
  geografia: MapIcon,
  historia: Hourglass,
  sociedade: Landmark,
  conflito: Swords,
  fe: Sparkles,
  tom: Palette,
}
const FALLBACK_ICON = BookOpen

function iconFor(categoryKey) {
  return CATEGORY_ICON[categoryKey] || FALLBACK_ICON
}

export function CanonPage() {
  const { activeProject, notify } = useMaestro()
  const projectId = activeProject?.id || null
  const [rules, setRules] = useState([])
  const [customCategories, setCustomCategories] = useState([])
  const [conflicts, setConflicts] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [creatingCategory, setCreatingCategory] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    const [rows, custom, openConflicts] = await Promise.all([listCanonRules(projectId), listCustomCategories(projectId), listCanonConflicts(projectId)])
    setRules(rows)
    setCustomCategories(custom)
    setConflicts(openConflicts.filter((conflict) => conflict.status === 'open'))
    setLoading(false)
  }, [projectId])

  useEffect(() => { refresh() }, [refresh])

  const grouped = useMemo(() => {
    const map = new Map()
    for (const rule of rules) {
      if (rule.status === 'retired') continue
      const cat = rule.category || 'Geral'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat).push(rule)
    }
    return map
  }, [rules])

  const allCategories = useMemo(() => {
    const base = DEFAULT_CATEGORIES.map((c) => ({ key: c.key, label: c.label, custom: false }))
    for (const name of customCategories) base.push({ key: name, label: name, custom: true })
    return base
  }, [customCategories])

  const handleSave = async (draft) => {
    await saveCanonRule({ ...draft, projectId })
    await refresh()
  }

  const handleDelete = async (id) => {
    await deleteCanonRule(id)
    await refresh()
  }

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim()
    if (!name) return
    setCreatingCategory(false)
    setNewCategoryName('')
    setActiveCategory(name)
  }

  const handleResolve = async (id) => {
    await resolveCanonConflict(id)
    await refresh()
  }

  const handleIgnore = async (id) => {
    await ignoreCanonConflict(id)
    await refresh()
  }

  const handleExport = async () => {
    try {
      const [allRules, allConflicts] = await Promise.all([listCanonRules(projectId), listCanonConflicts(projectId)])
      const blob = await exportVaultFile(projectId, activeProject?.name, allRules, allConflicts)
      downloadBlob(blob, suggestedFileName(activeProject?.name))
      notify(totalRules === 0 ? 'Arquivo .maestro criado.' : 'Arquivo .maestro exportado.')
    } catch {
      notify('Não foi possível exportar o arquivo.', 'error')
    }
  }

  const handleImport = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const snapshot = await parseVaultFile(file)
      const result = await importVaultSnapshot(snapshot, projectId, 'merge')
      await refresh()
      notify(`Arquivo importado: ${result.rules} regra${result.rules === 1 ? '' : 's'} adicionada${result.rules === 1 ? '' : 's'}.`)
    } catch (error) {
      const message = error?.message?.includes('inválido') ? 'Arquivo .maestro inválido ou corrompido.' : 'Não foi possível importar o arquivo.'
      notify(message, 'error')
    }
  }

  const totalRules = grouped.size ? [...grouped.values()].reduce((acc, list) => acc + list.length, 0) : 0
  const hasRules = totalRules > 0

  return (
    <div className="page page--canon">
      <header className="page-heading page-heading--actions">
        <div>
          <span className="eyebrow"><BookOpen size={13} /> Cânone · regras-mor</span>
          <h1>Regras do seu universo</h1>
          <p>Axios autorais que a IA trata como verdade primária. Sempre visíveis, sempre editáveis. Quando algo nas suas ideias bater com uma regra, a IA pergunta antes de mudar qualquer coisa.</p>
        </div>
        <div className="page-heading__actions">
          {hasRules && <button className="button button--ghost" type="button" onClick={() => setGuideOpen(true)}><Sparkles size={15} /> Refazer axiomas</button>}
          <button className="button button--primary" type="button" onClick={() => setGuideOpen(true)}><Wand2 size={15} /> Estabelecer axiomas</button>
        </div>
      </header>

      {!hasRules && !loading && (
        <section className="canon-empty">
          <span className="canon-empty__mark"><BookOpen size={26} /></span>
          <h2>Sem regras ainda</h2>
          <p>Estabeleça os axiomas do seu universo — magia, povos, cosmologia, tom. A IA usa isso como base para tudo o que fizer.</p>
          <button className="button button--primary" type="button" onClick={() => setGuideOpen(true)}><Wand2 size={15} /> Começar pelo guia</button>
        </section>
      )}

      {hasRules && (
        <>
          <section className={`canon-conflicts ${conflicts.length ? 'canon-conflicts--has' : ''}`}>
            <span className="canon-conflicts__icon"><AlertTriangle size={15} /></span>
            <div className="canon-conflicts__body">
              {conflicts.length === 0 ? (
                <>
                  <strong>Nenhum conflito detectado</strong>
                  <span>Quando você conversar e algo contradizer uma regra daqui, a IA sinaliza para você decidir.</span>
                </>
              ) : (
                <>
                  <strong>{conflicts.length} conflito{conflicts.length === 1 ? '' : 's'} em aberto</strong>
                  <ul className="canon-conflicts__list">
                    {conflicts.map((conflict) => (
                      <li key={conflict.id} className={`canon-conflict canon-conflict--${conflict.severity || 'medium'}`}>
                        <div className="canon-conflict__head"><AlertTriangle size={13} /> <strong>{conflict.ruleTitle}</strong></div>
                        {conflict.explanation && <p>{conflict.explanation}</p>}
                        {conflict.userStatement && <small>Você afirmou: “{conflict.userStatement}”</small>}
                        {conflict.suggestedResolution && <em>Sugestão: {conflict.suggestedResolution}</em>}
                        <div className="canon-conflict__actions">
                          <button className="button button--subtle" type="button" onClick={() => handleResolve(conflict.id)}><Check size={13} /> Resolver</button>
                          <button className="text-button" type="button" onClick={() => handleIgnore(conflict.id)}>Ignorar</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </section>

          <div className="canon-toolbar">
            <h2>Categorias</h2>
            {creatingCategory ? (
              <form className="canon-newcat" onSubmit={(e) => { e.preventDefault(); handleCreateCategory() }}>
                <input autoFocus value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Nome da nova categoria" />
                <button className="button button--primary" type="submit"><Check size={14} /> Criar</button>
                <button className="icon-button" type="button" onClick={() => { setCreatingCategory(false); setNewCategoryName('') }} aria-label="Cancelar"><X size={15} /></button>
              </form>
            ) : (
              <button className="button button--ghost" type="button" onClick={() => setCreatingCategory(true)}><Plus size={14} /> Nova categoria</button>
            )}
          </div>

          <section className="canon-grid">
            {allCategories.map((category) => {
              const Icon = iconFor(category.key)
              const count = (grouped.get(category.label) || grouped.get(category.key) || []).length
              const isOpen = activeCategory === category.label || activeCategory === category.key
              return (
                <article key={category.key} className={`canon-card ${isOpen ? 'canon-card--open' : ''} ${category.custom ? 'canon-card--custom' : ''}`}>
                  <button className="canon-card__head" type="button" onClick={() => setActiveCategory(isOpen ? null : category.label)}>
                    <span className="canon-card__icon"><Icon size={18} /></span>
                    <div>
                      <strong>{category.label}</strong>
                      <small>{count} regra{count === 1 ? '' : 's'}</small>
                    </div>
                    <ChevronRight size={15} className="canon-card__chev" />
                  </button>
                  {isOpen && (
                    <CanonCategoryPanel
                      category={category}
                      rules={(grouped.get(category.label) || grouped.get(category.key) || [])}
                      onSave={handleSave}
                      onDelete={handleDelete}
                    />
                  )}
                </article>
              )
            })}
          </section>
        </>
      )}

      <section className="vault-panel">
        <div className="vault-panel__head">
          <span className="eyebrow"><Database size={13} /> Arquivo do universo (.maestro)</span>
          <p>Seu cânone vive no navegador. Crie um arquivo .maestro, leve no Drive e importe em outra máquina para continuar de onde parou.</p>
        </div>
        <div className="vault-panel__stats">
          <span><strong>{totalRules}</strong> regra{totalRules === 1 ? '' : 's'} no arquivo local</span>
          <span><strong>{conflicts.length}</strong> conflito{conflicts.length === 1 ? '' : 's'} em aberto</span>
        </div>
        <div className="vault-panel__actions">
          <button className="button button--primary" type="button" onClick={handleExport}><Download size={15} /> {totalRules === 0 ? 'Criar arquivo .maestro' : 'Exportar .maestro'}</button>
          <label className="button button--ghost">
            <Upload size={15} /> Importar .maestro
            <input type="file" accept=".maestro,application/octet-stream" hidden onChange={handleImport} />
          </label>
        </div>
      </section>

      {guideOpen && (
        <CanonGuide
          projectId={projectId}
          onClose={() => setGuideOpen(false)}
          onSaved={async () => { await refresh() }}
        />
      )}
    </div>
  )
}

function CanonCategoryPanel({ category, rules, onSave, onDelete }) {
  const [draft, setDraft] = useState({ title: '', rule: '' })
  const [editingId, setEditingId] = useState(null)
  const seedPrompt = DEFAULT_CATEGORIES.find((c) => c.key === category.key)?.prompts?.[0] || ''

  const submit = async (e) => {
    e.preventDefault()
    if (!draft.rule.trim()) return
    await onSave({ id: editingId, category: category.label, title: draft.title.trim() || category.label, rule: draft.rule.trim() })
    setDraft({ title: '', rule: '' })
    setEditingId(null)
  }

  const startEdit = (rule) => {
    setEditingId(rule.id)
    setDraft({ title: rule.title || '', rule: rule.rule || '' })
  }

  return (
    <div className="canon-panel">
      {seedPrompt && !editingId && <p className="canon-panel__hint">Pergunta-guia: {seedPrompt}</p>}
      {rules.length === 0 && !editingId && <p className="canon-panel__empty">Nenhuma regra aqui ainda.</p>}
      <ul className="canon-rules">
        {rules.map((rule) => (
          <li key={rule.id} className="canon-rule">
            {editingId === rule.id ? null : (
              <>
                <div className="canon-rule__body">
                  <strong>{rule.title || rule.category}</strong>
                  <p>{rule.rule}</p>
                </div>
                <div className="canon-rule__actions">
                  <button className="icon-button" type="button" onClick={() => startEdit(rule)} aria-label="Editar"><Pencil size={13} /></button>
                  <button className="icon-button" type="button" onClick={() => onDelete(rule.id)} aria-label="Excluir"><Trash2 size={13} /></button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      <form className="canon-form" onSubmit={submit}>
        <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} placeholder={editingId ? 'Título (opcional)' : `Título opcional · ex.: ${category.label}`} />
        <textarea value={draft.rule} onChange={(e) => setDraft((d) => ({ ...d, rule: e.target.value }))} placeholder="Escreva a regra do seu universo..." rows={3} required />
        <div className="canon-form__actions">
          {editingId && <button type="button" className="text-button" onClick={() => { setEditingId(null); setDraft({ title: '', rule: '' }) }}>Cancelar</button>}
          <button className="button button--primary" type="submit"><Check size={14} /> {editingId ? 'Salvar' : 'Adicionar regra'}</button>
        </div>
      </form>
    </div>
  )
}

function CanonGuide({ projectId, onClose, onSaved }) {
  const steps = useMemo(() => {
    const list = []
    for (const category of DEFAULT_CATEGORIES) {
      for (const prompt of category.prompts) list.push({ category: category.label, prompt })
    }
    return list
  }, [])
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [saving, setSaving] = useState(false)

  const step = steps[index]
  const isLast = index >= steps.length - 1

  const saveCurrent = async (goNext) => {
    if (answer.trim()) {
      setSaving(true)
      await saveCanonRule({ projectId, category: step.category, title: step.prompt.slice(0, 80), rule: answer.trim() })
      setSaving(false)
    }
    setAnswer('')
    if (goNext && !isLast) setIndex((i) => i + 1)
    else if (isLast || !goNext) {
      await onSaved()
      onClose()
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--large canon-guide" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div>
            <span className="eyebrow"><Wand2 size={13} /> Guia de axiomas</span>
            <h2>{step.category}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <div className="modal__body">
          <div className="canon-guide__progress">
            <span>{index + 1} / {steps.length}</span>
            <div className="usage-bar"><i style={{ width: `${Math.round(((index) / steps.length) * 100)}%` }} /></div>
          </div>
          <p className="canon-guide__prompt">{step.prompt}</p>
          <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Responda como quiser — vira regra. Pule se não souber agora." rows={5} autoFocus />
          <div className="canon-guide__hint">A IA trata cada resposta como verdade primária. Você pode editar depois.</div>
        </div>
        <div className="modal-actions canon-guide__actions">
          <button className="text-button" type="button" onClick={() => saveCurrent(false)} disabled={saving}>Pular e fechar</button>
          <div className="canon-guide__nav">
            <button className="button button--ghost" type="button" onClick={() => { setAnswer(''); setIndex((i) => Math.max(0, i - 1)) }} disabled={index === 0}>Anterior</button>
            <button className="button button--primary" type="button" onClick={() => saveCurrent(true)} disabled={saving}>
              {isLast ? <>Concluir <Check size={14} /></> : <>Próxima <ChevronRight size={14} /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
