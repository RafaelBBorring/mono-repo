import { useState, useEffect, useCallback } from 'react'
import {
  getAllFileHandleRecords,
  getNpc,
  removeFileHandle,
  syncNpcFromFile,
  syncAllFromFiles,
  linkNpcFile,
  isFileSystemAccessSupported,
  resolveAvatarUrl,
} from '../../services/codexDb'
import { CODEX_PROFILES } from '../../data/codexProfiles'

const STATUS_META = {
  synced: { label: 'Sincronizado', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: 'cloud_done' },
  local_newer: { label: 'Alteração local', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: 'edit_note' },
  file_newer: { label: 'Atualização disponível', color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20', icon: 'cloud_sync' },
  permission_needed: { label: 'Permissão necessária', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: 'lock' },
  error: { label: 'Erro', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: 'error' },
  no_handle: { label: 'Desvinculado', color: 'text-txt-dim', bg: 'bg-white/5', border: 'border-white/10', icon: 'link_off' },
  pending: { label: 'Verificando…', color: 'text-txt-dim', bg: 'bg-white/5', border: 'border-white/10', icon: 'sync' },
}

export default function SharedNpcManager({ onOpenNpc }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [linking, setLinking] = useState(false)
  const [syncingAll, setSyncingAll] = useState(false)
  const [linkResult, setLinkResult] = useState(null)
  const supported = isFileSystemAccessSupported()

  const loadEntries = useCallback(async () => {
    setLoading(true)
    const records = await getAllFileHandleRecords()
    const items = await Promise.all(records.map(async (rec) => {
      const npc = await getNpc(rec.npcId)
      return {
        npcId: rec.npcId,
        fileName: rec.fileName,
        linkedAt: rec.linkedAt,
        lastSyncAt: rec.lastSyncAt,
        npc,
        syncStatus: 'pending',
      }
    }))
    setEntries(items)
    setLoading(false)
  }, [])

  useEffect(() => { loadEntries() }, [loadEntries])

  async function handleLink() {
    setLinking(true)
    setLinkResult(null)
    const result = await linkNpcFile(null)
    if (result.status === 'linked') {
      await loadEntries()
      setLinkResult({ type: 'success', message: `Ficha "${result.npcName}" vinculada com sucesso!` })
    } else if (result.status === 'cancelled') {
      // silent
    } else if (result.status === 'unsupported') {
      setLinkResult({ type: 'error', message: 'Seu navegador não suporta File System Access API. Use Chrome ou Edge.' })
    } else {
      setLinkResult({ type: 'error', message: result.error || 'Erro ao vincular ficha.' })
    }
    setLinking(false)
  }

  async function handleSync(npcId) {
    setEntries(prev => prev.map(e => e.npcId === npcId ? { ...e, syncStatus: 'pending' } : e))
    const result = await syncNpcFromFile(npcId)
    setEntries(prev => prev.map(e => e.npcId === npcId ? { ...e, syncStatus: result.status, lastSyncAt: new Date().toISOString() } : e))
    if (result.npc) {
      setEntries(prev => prev.map(e => e.npcId === npcId ? { ...e, npc: result.npc } : e))
    }
  }

  async function handleSyncAll() {
    setSyncingAll(true)
    setEntries(prev => prev.map(e => ({ ...e, syncStatus: 'pending' })))
    const results = await syncAllFromFiles()
    const resultMap = new Map(results.map(r => [r.npcId, r.status]))
    setEntries(prev => prev.map(e => ({
      ...e,
      syncStatus: resultMap.get(e.npcId) || e.syncStatus,
      lastSyncAt: new Date().toISOString(),
    })))
    await loadEntries()
    setSyncingAll(false)
  }

  async function handleUnlink(npcId) {
    if (!confirm('Desvincular esta ficha? O NPC permanece salvo localmente, mas não será mais sincronizado.')) return
    await removeFileHandle(npcId)
    await loadEntries()
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-cinzel text-primary text-xl tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">folder_shared</span>
            Fichas Compartilhadas
          </h2>
          <p className="text-outline text-sm mt-1">
            Vincule arquivos .codex recebidos do mestre para sincronização automática.
          </p>
        </div>
        <div className="flex gap-2">
          {entries.length > 0 && (
            <button
              onClick={handleSyncAll}
              disabled={syncingAll}
              className="px-4 py-2 bg-primary/15 border border-primary/30 rounded-lg text-sm text-primary hover:bg-primary/25 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-sm ${syncingAll ? 'animate-spin' : ''}`}>
                {syncingAll ? 'progress_activity' : 'sync'}
              </span>
              {syncingAll ? 'Sincronizando…' : 'Sincronizar Tudo'}
            </button>
          )}
          {supported && (
            <button
              onClick={handleLink}
              disabled={linking}
              className="px-4 py-2 bg-primary/20 border border-primary/30 rounded-lg text-sm text-primary hover:bg-primary/30 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-sm ${linking ? 'animate-spin' : ''}`}>
                {linking ? 'progress_activity' : 'add_link'}
              </span>
              {linking ? 'Vinculando…' : 'Vincular Ficha'}
            </button>
          )}
        </div>
      </div>

      {!supported && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-amber-400 text-xl shrink-0">warning</span>
          <div>
            <p className="text-amber-400 text-sm font-semibold">Navegador sem suporte</p>
            <p className="text-outline text-xs mt-1">
              Seu navegador não suporta File System Access API. Use <strong>Chrome</strong> ou <strong>Edge</strong> para vincular e sincronizar fichas automaticamente.
              No Firefox/Safari, você ainda pode importar manualmente pelo painel do Codex.
            </p>
          </div>
        </div>
      )}

      {linkResult && (
        <div className={`rounded-lg p-3 flex items-center gap-2 text-sm ${
          linkResult.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          <span className="material-symbols-outlined text-sm">
            {linkResult.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {linkResult.message}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16">
          <span className="material-symbols-outlined text-primary text-3xl animate-spin">progress_activity</span>
        </div>
      ) : entries.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <span className="material-symbols-outlined text-outline/30 text-5xl block mb-4">folder_off</span>
          <p className="text-outline text-sm mb-2">Nenhuma ficha vinculada ainda.</p>
          <p className="text-outline/60 text-xs">
            {supported
              ? 'Clique em "Vincular Ficha" e selecione um arquivo .codex recebido do mestre.'
              : 'Use Chrome ou Edge para vincular fichas.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entries.map((entry) => {
            const npc = entry.npc
            const profInfo = npc ? (CODEX_PROFILES[npc.profile] || CODEX_PROFILES.guerreiro) : null
            const statusMeta = STATUS_META[entry.syncStatus] || STATUS_META.pending
            const avatarUrl = npc ? resolveAvatarUrl(npc.avatar) : null
            return (
              <div key={entry.npcId} className="glass-card p-4 flex items-start gap-4">
                <div className="w-14 h-14 rounded-lg border border-primary/20 overflow-hidden bg-surface-container flex items-center justify-center shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-cinzel text-primary text-lg">
                      {(npc?.nome || '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-cinzel text-primary text-sm truncate">
                    {npc?.nome || entry.fileName || 'NPC'}
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    {profInfo && (
                      <span className="text-[10px] font-mono uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded">
                        {profInfo.name} · N{npc.nivel || '?'}
                      </span>
                    )}
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${statusMeta.bg} ${statusMeta.border} ${statusMeta.color} flex items-center gap-1`}>
                      <span className={`material-symbols-outlined text-[11px] ${entry.syncStatus === 'pending' ? 'animate-spin' : ''}`}>
                        {statusMeta.icon}
                      </span>
                      {statusMeta.label}
                    </span>
                  </div>
                  <p className="text-outline/50 text-[10px] mt-1.5">
                    📄 {entry.fileName}
                    {entry.lastSyncAt && ` · Última sync: ${new Date(entry.lastSyncAt).toLocaleString('pt-BR')}`}
                  </p>
                  <div className="flex gap-1.5 mt-2.5">
                    <button
                      onClick={() => onOpenNpc?.(entry.npcId)}
                      className="text-xs px-3 py-1 bg-primary/10 border border-primary/20 rounded text-primary hover:bg-primary/20 transition-colors"
                    >
                      Abrir
                    </button>
                    <button
                      onClick={() => handleSync(entry.npcId)}
                      disabled={entry.syncStatus === 'pending'}
                      className="text-xs px-3 py-1 bg-sky-500/10 border border-sky-500/20 rounded text-sky-400 hover:bg-sky-500/20 transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      <span className={`material-symbols-outlined text-[11px] ${entry.syncStatus === 'pending' ? 'animate-spin' : ''}`}>sync</span>
                      Sync
                    </button>
                    <button
                      onClick={() => handleUnlink(entry.npcId)}
                      className="text-xs px-3 py-1 bg-white/5 border border-white/10 rounded text-outline hover:text-red-400 hover:border-red-400/20 transition-colors"
                    >
                      Desvincular
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
