import { useState, useEffect, useRef, useCallback } from 'react'
import {
  getAllNpcs,
  deleteNpc,
  exportAllNpcs,
  getAllFolders,
  saveFolder,
  deleteFolder,
  getFolderAssignments,
  assignToFolder,
  removeFromFolder,
  migrateCodexIfNeeded,
  resolveAvatarUrl,
} from '../../services/codexDb'

const PROFILE_COLORS = {
  guerreiro: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
  especialista: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  mistico: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400' },
}

function FolderModal({ title, placeholder, initialValue, onConfirm, onClose }) {
  const [value, setValue] = useState(initialValue || '')
  const inputRef = useRef(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    if (!value.trim()) return
    onConfirm(value.trim())
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={handleSubmit} onClick={e => e.stopPropagation()}
        className="bg-deep border border-sep rounded-xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-sep/30 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-sm">create_new_folder</span>
          <span className="font-cinzel text-primary text-sm">{title}</span>
        </div>
        <div className="p-5">
          <input ref={inputRef} type="text" value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-surface-container border border-outline/30 rounded-lg px-4 py-2.5 text-sm text-on-surface placeholder:text-outline/40 focus:border-primary/50 focus:outline-none transition-colors" />
        </div>
        <div className="px-5 py-3 border-t border-sep/30 flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 border border-sep rounded-lg text-xs text-outline hover:text-primary transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={!value.trim()}
            className="px-4 py-2 bg-primary/20 border border-primary/30 rounded-lg text-xs text-primary hover:bg-primary/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Confirmar
          </button>
        </div>
      </form>
    </div>
  )
}

function buildFolderTree(folders, assignments, activeFolder, onSelect) {
  const childrenMap = {}
  const roots = []
  folders.forEach(f => {
    if (!f.parentId) {
      roots.push(f)
    } else {
      if (!childrenMap[f.parentId]) childrenMap[f.parentId] = []
      childrenMap[f.parentId].push(f)
    }
  })

  function countInFolder(folderId) {
    return Object.values(assignments).filter(fid => fid === folderId).length
  }

  function renderNode(folder, depth = 0) {
    const children = childrenMap[folder.id] || []
    const count = countInFolder(folder.id)
    const isActive = activeFolder === folder.id

    return (
      <div key={folder.id}>
        <div
          onClick={() => onSelect(folder.id)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer text-xs transition-all ${
            isActive
              ? 'bg-primary/15 text-primary border border-primary/30'
              : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface border border-transparent'
          }`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          <span className="material-symbols-outlined text-sm">folder</span>
          <span className="truncate flex-1 font-cinzel">{folder.name}</span>
          <span className="text-[10px] font-mono text-outline">{count}</span>
        </div>
        {children.map(child => renderNode(child, depth + 1))}
      </div>
    )
  }

  return roots.map(root => renderNode(root))
}

export default function CodexDashboard({ onNewNpc, onOpenNpc, onImportExport }) {
  const [npcs, setNpcs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterProfile, setFilterProfile] = useState('all')
  const importRef = useRef(null)

  const [folders, setFolders] = useState([])
  const [assignments, setAssignments] = useState({})
  const [activeFolder, setActiveFolder] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [folderMenuNpcId, setFolderMenuNpcId] = useState(null)
  const [contextFolder, setContextFolder] = useState(null)
  const [contextPos, setContextPos] = useState({ x: 0, y: 0 })
  const folderMenuRef = useRef(null)

  const [folderModal, setFolderModal] = useState(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      await migrateCodexIfNeeded()
      const [npcData, folderData, assignData] = await Promise.all([
        getAllNpcs(),
        getAllFolders(),
        getFolderAssignments(),
      ])
      setNpcs(npcData)
      setFolders(folderData)
      setAssignments(assignData)
    } catch (err) {
      console.error('[CodexDashboard] erro ao carregar dados:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  useEffect(() => {
    function handleClickOutside(e) {
      if (folderMenuRef.current && !folderMenuRef.current.contains(e.target)) {
        setFolderMenuNpcId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    function handleBeforeUnload(e) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!confirm('Excluir este NPC?')) return
    await deleteNpc(id)
    setNpcs(prev => prev.filter(n => n.id !== id))
    setAssignments(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
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

  function openCreateFolderModal(parentId = null) {
    setFolderModal({
      title: 'Nova Pasta',
      placeholder: 'Nome da pasta...',
      initialValue: '',
      onConfirm: async (name) => {
        const folder = { id: crypto.randomUUID(), name, parentId }
        await saveFolder(folder)
        setFolders(prev => [...prev, folder])
        setFolderModal(null)
      }
    })
  }

  function openRenameFolderModal(folderId) {
    const folder = folders.find(f => f.id === folderId)
    if (!folder) return
    setFolderModal({
      title: 'Renomear Pasta',
      placeholder: 'Novo nome...',
      initialValue: folder.name,
      onConfirm: async (name) => {
        if (name === folder.name) { setFolderModal(null); return }
        await saveFolder({ ...folder, name })
        setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name } : f))
        setFolderModal(null)
      }
    })
    setContextFolder(null)
  }

  async function handleDeleteFolder(folderId) {
    const folder = folders.find(f => f.id === folderId)
    if (!folder) return
    if (!confirm(`Excluir pasta "${folder.name}"? As fichas não serão excluídas.`)) return
    await deleteFolder(folderId)
    setFolders(prev => prev.filter(f => f.id !== folderId))
    setAssignments(prev => {
      const next = {}
      Object.entries(prev).forEach(([npcId, fid]) => {
        if (fid !== folderId) next[npcId] = fid
      })
      return next
    })
    if (activeFolder === folderId) setActiveFolder(null)
    setContextFolder(null)
  }

  async function handleAssignNpc(npcId, folderId) {
    if (folderId === '__root__') {
      await removeFromFolder(npcId)
      setAssignments(prev => {
        const next = { ...prev }
        delete next[npcId]
        return next
      })
    } else {
      await assignToFolder(npcId, folderId)
      setAssignments(prev => ({ ...prev, [npcId]: folderId }))
    }
    setFolderMenuNpcId(null)
  }

  function handleFolderContextMenu(e, folderId) {
    e.preventDefault()
    e.stopPropagation()
    setContextFolder(folderId)
    setContextPos({ x: e.clientX, y: e.clientY })
  }

  useEffect(() => {
    function closeContext() { setContextFolder(null) }
    if (contextFolder) {
      document.addEventListener('click', closeContext)
      return () => document.removeEventListener('click', closeContext)
    }
  }, [contextFolder])

  const filtered = npcs.filter(npc => {
    const matchSearch = !search || (npc.nome || '').toLowerCase().includes(search.toLowerCase())
    const matchProfile = filterProfile === 'all' || npc.profile === filterProfile
    const matchFolder = activeFolder === null || assignments[npc.id] === activeFolder
    return matchSearch && matchProfile && matchFolder
  })

  function getNpcFolderName(npcId) {
    const fid = assignments[npcId]
    if (!fid) return null
    const folder = folders.find(f => f.id === fid)
    return folder?.name || null
  }

  return (
    <div className="flex gap-0 relative" style={{ minHeight: 'calc(100vh - 120px)' }}>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        fixed lg:relative z-40 lg:z-auto top-0 left-0 h-full
        w-64 shrink-0 glass-card rounded-none lg:rounded-xl border-r lg:border border-sep
        flex flex-col transition-transform duration-200 ease-out overflow-hidden
      `}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-sep">
          <h2 className="font-cinzel text-primary text-sm tracking-wider">Pastas</h2>
          <div className="flex gap-1">
            <button
              onClick={() => openCreateFolderModal(null)}
              className="w-7 h-7 grid place-items-center rounded text-outline hover:text-primary hover:bg-primary/10 transition-colors"
              title="Nova Pasta"
            >
              <span className="material-symbols-outlined text-sm">create_new_folder</span>
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="w-7 h-7 grid place-items-center rounded text-outline hover:text-primary hover:bg-primary/10 transition-colors lg:hidden"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <div
            onClick={() => setActiveFolder(null)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer text-xs transition-all ${
              activeFolder === null
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface border border-transparent'
            }`}
          >
            <span className="material-symbols-outlined text-sm">auto_stories</span>
            <span className="truncate flex-1 font-cinzel">Todas as Fichas</span>
            <span className="text-[10px] font-mono text-outline">{npcs.length}</span>
          </div>

          {buildFolderTree(folders, assignments, activeFolder, setActiveFolder).map(node => (
            <div
              key={node.key}
              onContextMenu={(e) => {
                const folderId = node.key
                handleFolderContextMenu(e, folderId)
              }}
            >
              {node}
            </div>
          ))}

          {folders.length === 0 && (
            <p className="text-[10px] font-mono text-outline/50 text-center py-4 uppercase tracking-widest">
              Nenhuma pasta criada
            </p>
          )}
        </div>
      </aside>

      {contextFolder && (
        <div
          className="fixed z-50 glass-card border border-sep rounded-lg py-1 min-w-[160px] shadow-xl"
          style={{ left: contextPos.x, top: contextPos.y }}
        >
          <button
            onClick={() => {
              openCreateFolderModal(contextFolder)
              setContextFolder(null)
            }}
            className="w-full text-left px-3 py-1.5 text-xs text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">create_new_folder</span>
            Subpasta
          </button>
          <button
            onClick={() => openRenameFolderModal(contextFolder)}
            className="w-full text-left px-3 py-1.5 text-xs text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
            Renomear
          </button>
          <div className="my-1 border-t border-sep" />
          <button
            onClick={() => handleDeleteFolder(contextFolder)}
            className="w-full text-left px-3 py-1.5 text-xs text-err/70 hover:bg-err/10 hover:text-err transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
            Excluir Pasta
          </button>
        </div>
      )}

      {folderModal && (
        <FolderModal
          title={folderModal.title}
          placeholder={folderModal.placeholder}
          initialValue={folderModal.initialValue}
          onConfirm={folderModal.onConfirm}
          onClose={() => setFolderModal(null)}
        />
      )}

      <main className="flex-1 min-w-0 space-y-6 pl-0 lg:pl-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(prev => !prev)}
              className="w-8 h-8 grid place-items-center rounded border border-sep text-outline hover:text-primary hover:border-primary/30 transition-colors"
              title="Toggle Pastas"
            >
              <span className="material-symbols-outlined text-sm">menu</span>
            </button>
            <button onClick={() => window.location.hash = '#/admin'}
              className="text-gold/70 hover:text-gold transition-colors flex items-center gap-1 text-xs">
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Mesa do Mestre
            </button>
          </div>
          <div>
            <h1 className="font-cinzel text-primary text-2xl tracking-wider">
              Codex Arcanum
              {activeFolder && folders.find(f => f.id === activeFolder) && (
                <span className="text-base text-on-surface-variant font-mono ml-2">
                  / {folders.find(f => f.id === activeFolder).name}
                </span>
              )}
            </h1>
            <p className="text-on-surface-variant text-xs mt-1 font-mono uppercase tracking-widest">
              {activeFolder ? `${filtered.length} fichas na pasta` : `${npcs.length} fichas registradas`}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={onNewNpc}
              className="sigil-button px-4 py-2 bg-primary/15 border border-primary/30 rounded-lg font-cinzel text-xs text-primary tracking-widest hover:bg-primary/25 transition-colors">
              <span className="material-symbols-outlined text-sm align-middle mr-1">person_add</span>
              Novo NPC
            </button>
            <button onClick={handleExportAll}
              className="px-3 py-2 border border-sep rounded-lg text-xs text-txt-dim hover:border-gold hover:text-gold transition-colors"
              title="Salvar Banco (.codex)">
              <span className="material-symbols-outlined text-sm align-middle mr-1">save</span>
              Salvar Banco
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
              {search || filterProfile !== 'all' || activeFolder ? 'Nenhum NPC encontrado.' : 'O Codex está vazio.'}
            </p>
            <p className="text-on-surface-variant text-sm mb-6">
              {search || filterProfile !== 'all' || activeFolder ? 'Tente outros filtros ou selecione outra pasta.' : 'Crie o primeiro NPC para começar.'}
            </p>
            {!search && filterProfile === 'all' && !activeFolder && (
              <button onClick={onNewNpc}
                className="sigil-button px-8 py-3 bg-primary/15 rounded-xl font-cinzel text-sm text-primary tracking-widest">
                <span className="material-symbols-outlined text-sm align-middle mr-2">person_add</span>
                Criar Primeiro NPC
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(npc => {
              const colors = PROFILE_COLORS[npc.profile] || PROFILE_COLORS.guerreiro
              const npcFolder = getNpcFolderName(npc.id)
              const currentFolderId = assignments[npc.id]
              return (
                <div key={npc.id}
                  onClick={() => onOpenNpc(npc.id)}
                  className={`glass-card group p-5 cursor-pointer hover:bg-primary/5 transition-all relative ${folderMenuNpcId === npc.id ? 'z-[100]' : ''}`}>
                  <div className="flex items-start gap-4 mb-3">
                    <div className="w-14 h-14 rounded-xl border border-sep bg-surface-container flex items-center justify-center text-2xl font-cinzel text-primary shrink-0 overflow-hidden">
                      {npc.avatar ? (
                        <img src={resolveAvatarUrl(npc.avatar)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (npc.nome || '?').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-cinzel text-on-surface text-base truncate group-hover:text-primary transition-colors">
                        {npc.nome || 'Sem Nome'}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider ${colors.bg} ${colors.text} border ${colors.border}`}>
                          {npc.profile || '?'}
                        </span>
                        <span className="text-[10px] font-mono text-outline uppercase">
                          Nv {npc.nivel} · NA {npc.na}
                        </span>
                      </div>
                      {npcFolder && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-mono text-primary/60 uppercase tracking-wider">
                          <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>folder</span>
                          {npcFolder}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setFolderMenuNpcId(prev => prev === npc.id ? null : npc.id)
                          }}
                          className="w-8 h-8 grid place-items-center rounded border border-sep text-outline hover:text-primary hover:border-primary/30 transition-colors opacity-0 group-hover:opacity-100"
                          title="Mover para pasta"
                        >
                          <span className="material-symbols-outlined text-sm">folder_open</span>
                        </button>

                        {folderMenuNpcId === npc.id && (
                          <div
                            ref={folderMenuRef}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-9 z-50 w-56 rounded-xl shadow-2xl border border-primary/20 overflow-hidden"
                            style={{ background: 'linear-gradient(135deg, rgba(15,15,25,0.97), rgba(25,20,40,0.97))', backdropFilter: 'blur(20px)' }}
                          >
                            <div className="px-3 py-2 border-b border-primary/15 bg-primary/5">
                              <p className="text-[10px] font-mono text-primary/70 uppercase tracking-widest">
                                Mover para pasta
                              </p>
                            </div>
                            <div className="py-1 max-h-48 overflow-y-auto">
                              <button
                                onClick={() => handleAssignNpc(npc.id, '__root__')}
                                className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2.5 ${
                                  !currentFolderId
                                    ? 'text-primary bg-primary/10'
                                    : 'text-on-surface-variant/80 hover:bg-white/5 hover:text-on-surface'
                                }`}
                              >
                                <span className="material-symbols-outlined text-sm opacity-70">auto_stories</span>
                                <span className="flex-1">Sem pasta</span>
                                {!currentFolderId && (
                                  <span className="material-symbols-outlined text-xs text-primary">check</span>
                                )}
                              </button>
                              {folders.map(f => (
                                <button
                                  key={f.id}
                                  onClick={() => handleAssignNpc(npc.id, f.id)}
                                  className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2.5 ${
                                    currentFolderId === f.id
                                      ? 'text-primary bg-primary/10'
                                      : 'text-on-surface-variant/80 hover:bg-white/5 hover:text-on-surface'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-sm opacity-70">folder</span>
                                  <span className="flex-1 truncate">{f.name}</span>
                                  {currentFolderId === f.id && (
                                    <span className="material-symbols-outlined text-xs text-primary">check</span>
                                  )}
                                </button>
                              ))}
                              {folders.length === 0 && (
                                <p className="px-3 py-2 text-[10px] text-outline/40 text-center italic">
                                  Nenhuma pasta criada
                                </p>
                              )}
                            </div>
                            <div className="border-t border-primary/15">
                              <button
                                onClick={() => {
                                  openCreateFolderModal(null)
                                  setFolderMenuNpcId(null)
                                }}
                                className="w-full text-left px-3 py-2 text-xs text-primary hover:bg-primary/10 transition-colors flex items-center gap-2.5"
                              >
                                <span className="material-symbols-outlined text-sm">add</span>
                                Criar nova pasta
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <button onClick={(e) => handleDelete(npc.id, e)}
                        className="w-8 h-8 grid place-items-center rounded border border-err/20 text-err/50 hover:bg-err/10 hover:text-err transition-colors opacity-0 group-hover:opacity-100"
                        title="Excluir NPC">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
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
      </main>
    </div>
  )
}
