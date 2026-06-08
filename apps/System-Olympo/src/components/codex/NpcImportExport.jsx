import { useState, useRef, useCallback, useEffect } from 'react'
import { importNpcs, getAllNpcs } from '../../services/codexDb'

export default function NpcImportExport({ file: initialFile, onImported, onClose }) {
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const importedRef = useRef(false)

  const handleImport = useCallback(async (file) => {
    setImporting(true)
    setError('')
    setResult(null)
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      let npcs = []

      if (data.format === 'codex-arcanum' && Array.isArray(data.npcs)) {
        npcs = data.npcs
      } else if (Array.isArray(data)) {
        npcs = data
      } else if (data.id && (data.nome || data.name)) {
        npcs = [data]
      } else if (data.sheets && Array.isArray(data.sheets)) {
        npcs = data.sheets.map(s => ({
          id: s.id || `npc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          nome: s.nome || s.name || 'Sem Nome',
          profile: s.profile || 'guerreiro',
          nivel: s.nivel || s.data?.nivel || 10,
          na: String(s.na || '1'),
          stats: s.stats || s.data?.stats || {},
          attrs: s.attrs || s.data?.attrs || [],
          abilities: s.abilities || s.data?.abilities || [],
          avatar: s.avatar || s.data?.avatar || '',
          raca: s.raca || '',
          description: s.description || '',
        }))
      } else {
        throw new Error('Formato não reconhecido.')
      }

      const normalized = npcs.map(npc => ({
        id: npc.id || `npc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        nome: npc.nome || npc.name || 'Sem Nome',
        raca: npc.raca || '',
        profile: npc.profile || 'guerreiro',
        nivel: npc.nivel || 10,
        na: String(npc.na || '1'),
        avatar: npc.avatar || '',
        avatarTransform: npc.avatarTransform || null,
        stats: npc.stats || {},
        attrs: npc.attrs || [],
        abilities: npc.abilities || [],
        distType: npc.distType || 'balanceada',
        description: npc.description || '',
        updated_at: npc.updated_at || new Date().toISOString(),
      }))

      const count = await importNpcs(normalized)
      setResult(`${count} NPC(s) importado(s) com sucesso!`)
      onImported?.()
    } catch (err) {
      setError(err.message || 'Erro ao importar arquivo.')
    }
    setImporting(false)
  }, [onImported])

  useEffect(() => {
    if (initialFile && !importedRef.current) {
      importedRef.current = true
      handleImport(initialFile)
    }
  }, [initialFile, handleImport])

  return (
    <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-deep border border-sep rounded-xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-sep/30 flex items-center justify-between">
          <h3 className="font-cinzel text-primary text-lg">Importar NPCs</h3>
          <button onClick={onClose} className="text-outline hover:text-err transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div
            onClick={() => !importing && fileRef.current?.click()}
            className="border-2 border-dashed border-outline/30 rounded-xl p-8 text-center cursor-pointer hover:border-primary/30 transition-colors">
            <span className="material-symbols-outlined text-outline/40 text-4xl mb-2 block">upload_file</span>
            <p className="text-on-surface-variant text-sm mb-1">Clique para selecionar um arquivo</p>
            <p className="text-outline/50 text-xs">Suporta: .codex, .json (Codex Arcanum ou original)</p>
            <input ref={fileRef} type="file" accept=".codex,.json" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImport(f) }} />
          </div>

          {importing && (
            <div className="text-center py-4">
              <span className="material-symbols-outlined text-primary text-2xl animate-spin">progress_activity</span>
              <p className="text-outline font-mono text-xs mt-2">Importando...</p>
            </div>
          )}

          {result && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-lg text-sm">
              {result}
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
