import { useState, useEffect, useRef, useCallback } from 'react'
import { getAllNpcs, deleteNpc, exportAllNpcs } from '../../services/codexDb'

const PROFILE_COLORS = {
  guerreiro: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
  especialista: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  mistico: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400' },
}

export default function CodexDashboard({ onNewNpc, onOpenNpc, onImportExport }) {
  const [npcs, setNpcs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterProfile, setFilterProfile] = useState('all')
  const importRef = useRef(null)

  const loadNpcs = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAllNpcs()
      setNpcs(data)
    } catch (err) {
      console.error('[CodexDashboard] erro ao carregar NPCs:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadNpcs() }, [loadNpcs])

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!confirm('Excluir este NPC?')) return
    await deleteNpc(id)
    setNpcs(prev => prev.filter(n => n.id !== id))
  }

  async function handleExportAll() {
    const data = await exportAllNpcs()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `codex-arcanum-export-${Date.now()}.codex`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = npcs.filter(npc => {
    const matchSearch = !search || (npc.nome || '').toLowerCase().includes(search.toLowerCase())
    const matchProfile = filterProfile === 'all' || npc.profile === filterProfile
    return matchSearch && matchProfile
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => window.location.hash = '#/admin'}
            className="text-gold/70 hover:text-gold transition-colors flex items-center gap-1 text-xs">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Mesa do Mestre
          </button>
        </div>
        <div>
          <h1 className="font-cinzel text-primary text-2xl tracking-wider">Codex Arcanum</h1>
          <p className="text-on-surface-variant text-xs mt-1 font-mono uppercase tracking-widest">
            Sistema de NPCs — {npcs.length} fichas registradas
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={onNewNpc}
            className="sigil-button px-4 py-2 bg-primary/15 border border-primary/30 rounded-lg font-cinzel text-xs text-primary tracking-widest hover:bg-primary/25 transition-colors">
            <span className="material-symbols-outlined text-sm align-middle mr-1">person_add</span>
            Novo NPC
          </button>
          <button onClick={handleExportAll}
            className="px-3 py-2 border border-sep rounded-lg text-xs text-txt-dim hover:border-gold hover:text-gold transition-colors">
            <span className="material-symbols-outlined text-sm align-middle mr-1">download</span>
            Exportar Todos
          </button>
          <button onClick={() => importRef.current?.click()}
            className="px-3 py-2 border border-sep rounded-lg text-xs text-txt-dim hover:border-gold hover:text-gold transition-colors">
            <span className="material-symbols-outlined text-sm align-middle mr-1">upload</span>
            Importar
          </button>
          <input ref={importRef} type="file" accept=".codex,.json" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onImportExport?.(f); e.target.value = '' }} />
        </div>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex-1 min-w-[200px] relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">search</span>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar NPC por nome..."
            className="w-full bg-surface-container border border-outline/20 rounded-lg pl-9 pr-3 py-2 text-sm text-on-surface placeholder:text-outline/50" />
        </div>
        <div className="flex gap-1">
          {['all', 'guerreiro', 'especialista', 'mistico'].map(p => (
            <button key={p} onClick={() => setFilterProfile(p)}
              className={`px-3 py-1.5 rounded text-xs font-mono uppercase tracking-wider transition-colors ${
                filterProfile === p
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-outline hover:text-primary border border-transparent'
              }`}>
              {p === 'all' ? 'Todos' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <span className="material-symbols-outlined text-primary text-4xl animate-spin">progress_activity</span>
          <p className="text-outline font-mono text-xs mt-4 uppercase tracking-widest">Carregando arquivos...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card text-center py-16 px-8">
          <span className="material-symbols-outlined text-6xl text-primary/20 mb-4 block">auto_stories</span>
          <p className="font-cinzel text-on-surface text-lg mb-2">
            {search || filterProfile !== 'all' ? 'Nenhum NPC encontrado.' : 'O Codex está vazio.'}
          </p>
          <p className="text-on-surface-variant text-sm mb-6">
            {search || filterProfile !== 'all' ? 'Tente outros filtros.' : 'Crie o primeiro NPC para começar.'}
          </p>
          {!search && filterProfile === 'all' && (
            <button onClick={onNewNpc}
              className="sigil-button px-8 py-3 bg-primary/15 rounded-xl font-cinzel text-sm text-primary tracking-widest">
              <span className="material-symbols-outlined text-sm align-middle mr-2">person_add</span>
              Criar Primeiro NPC
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(npc => {
            const colors = PROFILE_COLORS[npc.profile] || PROFILE_COLORS.guerreiro
            return (
              <div key={npc.id}
                onClick={() => onOpenNpc(npc.id)}
                className="glass-card group p-5 cursor-pointer hover:bg-primary/5 transition-all">
                <div className="flex items-start gap-4 mb-3">
                  <div className="w-14 h-14 rounded-xl border border-sep bg-surface-container flex items-center justify-center text-2xl font-cinzel text-primary shrink-0 overflow-hidden">
                    {npc.avatar ? (
                      <img src={npc.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (npc.nome || '?').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-cinzel text-on-surface text-base truncate group-hover:text-primary transition-colors">
                      {npc.nome || 'Sem Nome'}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider ${colors.bg} ${colors.text} border ${colors.border}`}>
                        {npc.profile || '?'}
                      </span>
                      <span className="text-[10px] font-mono text-outline uppercase">
                        Nv {npc.nivel} · NA {npc.na}
                      </span>
                    </div>
                  </div>
                  <button onClick={(e) => handleDelete(npc.id, e)}
                    className="w-8 h-8 grid place-items-center rounded border border-err/20 text-err/50 hover:bg-err/10 hover:text-err transition-colors opacity-0 group-hover:opacity-100"
                    title="Excluir NPC">
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
                <div className="flex gap-4 text-[10px] font-mono text-outline uppercase">
                  <span>PV: {npc.stats?.vida || '?'}</span>
                  <span>CA: {npc.stats?.ca || '?'}</span>
                  <span>BA: +{npc.stats?.ba || '?'}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
