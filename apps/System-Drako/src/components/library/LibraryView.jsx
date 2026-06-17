import React, { useEffect, useMemo, useState } from 'react'
import { listCharacters, listFolders, deleteCharacter, deleteFolder, saveFolder } from '../../lib/db.js'
import { LEVEL_BY_KEY } from '../../data/startingLevels.js'
import { useHashRoute } from '../../hooks/useHashRoute.js'
import { useToast } from '../../contexts/ToastContext.jsx'
import { Button } from '../ui/Button.jsx'
import Modal from '../ui/Modal.jsx'
import { uid } from '../../lib/id.js'
import { exportDatabaseDrako, importDrakoFile } from '../../lib/storage.js'
import { LEVEL_COLORS } from '../sheet/CharacterSheet.jsx'

export default function LibraryView() {
  const { navigate } = useHashRoute()
  const toast = useToast()
  const [chars, setChars] = useState([])
  const [folders, setFolders] = useState([])
  const [search, setSearch] = useState('')
  const [folderFilter, setFolderFilter] = useState(null)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const fileRef = React.useRef(null)

  const reload = async () => { const [c, f] = await Promise.all([listCharacters(), listFolders()]); setChars(c); setFolders(f) }
  useEffect(() => { reload() }, [])

  const filtered = useMemo(() => chars
    .filter(c => folderFilter === null ? true : (c.folderId || null) === folderFilter)
    .filter(c => !search.trim() || (c.name || '').toLowerCase().includes(search.toLowerCase()) || (c.raca || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.name || '').localeCompare(b.name || '')), [chars, folderFilter, search])

  const countInFolder = (fid) => chars.filter(c => (c.folderId || null) === fid).length

  const createFolder = async () => {
    if (!newFolderName.trim()) return
    await saveFolder({ id: uid('fld'), name: newFolderName.trim() })
    setNewFolderName(''); setShowNewFolder(false); reload(); toast.success('Pasta criada.')
  }
  const onImport = async (file) => {
    try { const res = await importDrakoFile(file); if (res.type === 'database') toast.success(`Banco importado: ${res.characters} fichas.`); else toast.success('Ficha importada.'); reload() }
    catch (err) { toast.error(err.message) }
  }

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
        <div>
          <h2 className="gold-text m-0" style={{ fontSize: '1.7rem' }}>Biblioteca</h2>
          <p className="text-muted-drako m-0" style={{ fontSize: '0.92rem' }}>{chars.length} personagem(ns) · clique no ícone para abrir</p>
        </div>
        <div className="d-flex flex-wrap gap-1">
          <Button variant="ghost" onClick={() => setShowNewFolder(true)}><i className="bi bi-folder-plus me-2" />Pasta</Button>
          <Button variant="ghost" onClick={() => exportDatabaseDrako().then(() => toast.success('Banco exportado.'))}><i className="bi bi-download me-2" />Backup</Button>
          <Button variant="ghost" onClick={() => fileRef.current?.click()}><i className="bi bi-upload me-2" />Importar</Button>
          <Button onClick={() => navigate('novo')}><i className="bi bi-hammer me-2" />Forjar</Button>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-3">
          <div className="glass p-3">
            <div className="label-drako">Pastas</div>
            <FolderRow active={folderFilter === null} icon="bi-collection" label="Todas" count={chars.length} onClick={() => setFolderFilter(null)} />
            {folders.map(f => (
              <div key={f.id} className="d-flex align-items-center mt-1">
                <div className="flex-grow-1"><FolderRow active={folderFilter === f.id} icon="bi-folder-fill" label={f.name} count={countInFolder(f.id)} onClick={() => setFolderFilter(f.id)} /></div>
                <button className="btn-ghost ms-1" style={{ width: 26, height: 26, padding: 0 }} onClick={async () => { if (confirm(`Excluir pasta "${f.name}"?`)) { await deleteFolder(f.id); if (folderFilter === f.id) setFolderFilter(null); reload() } }}><i className="bi bi-x" /></button>
              </div>
            ))}
            {folders.length === 0 && <p className="text-muted-drako mt-2" style={{ fontSize: '0.82rem' }}>Nenhuma pasta.</p>}
          </div>
        </div>

        <div className="col-lg-9">
          <div className="glass p-2 mb-3">
            <div className="input-group">
              <span className="input-group-text" style={{ background: 'transparent', border: 'none', color: 'var(--drako-muted)' }}><i className="bi bi-search" /></span>
              <input className="form-control" style={{ background: 'transparent', border: 'none', color: 'var(--drako-text)', fontSize: '1rem' }} placeholder="Buscar por nome ou raça..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="glass p-5 text-center">
              <i className="bi bi-inbox text-gold" style={{ fontSize: '2.2rem' }} />
              <p className="text-muted-drako mt-2 mb-3">Nenhuma ficha encontrada.</p>
              <Button onClick={() => navigate('novo')}><i className="bi bi-hammer me-2" />Forjar ficha</Button>
            </div>
          ) : (
            <div className="row g-3">
              {filtered.map(c => (
                <div className="col-4 col-sm-3 col-md-3 col-lg-2-5 col-xl-2" key={c.id} style={{ maxWidth: 150 }}>
                  <IconTile character={c} onOpen={() => navigate(`ficha/${c.id}`)} onDelete={async () => { await deleteCharacter(c.id); reload() }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <input ref={fileRef} type="file" accept=".drako,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = '' }} />
      <Modal open={showNewFolder} onClose={() => setShowNewFolder(false)} title="Nova pasta" size="sm"
        footer={<><Button variant="ghost" onClick={() => setShowNewFolder(false)}>Cancelar</Button><Button onClick={createFolder}>Criar</Button></>}>
        <label className="label-drako">Nome da pasta</label>
        <input className="input-drako" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Ex: Vilões da Campanha" onKeyDown={(e) => { if (e.key === 'Enter') createFolder() }} autoFocus />
      </Modal>
    </div>
  )
}

function FolderRow({ active, icon, label, count, onClick }) {
  return (
    <button className="d-flex align-items-center gap-2 w-100 px-2 py-2" style={{ borderRadius: 8, border: active ? '1px solid rgba(224,173,51,0.5)' : '1px solid transparent', background: active ? 'rgba(224,173,51,0.08)' : 'transparent', cursor: 'pointer' }} onClick={onClick}>
      <i className={`bi ${icon} text-gold`} /><span style={{ fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span><span className="ms-auto font-mono text-muted-drako" style={{ fontSize: '0.76rem' }}>{count}</span>
    </button>
  )
}

function IconTile({ character: c, onOpen, onDelete }) {
  const lvl = LEVEL_BY_KEY[c.level]
  const color = LEVEL_COLORS[c.level] || '#e0ad33'
  const icon = c.icon
  return (
    <div className="d-flex flex-column align-items-center">
      <div className="position-relative" style={{ width: '100%', aspectRatio: '1/1' }}>
        <button onClick={onOpen} className="card-sheen" style={{ width: '100%', height: '100%', borderRadius: 18, overflow: 'hidden', position: 'relative', cursor: 'pointer', border: `2px solid ${color}aa`, background: 'radial-gradient(circle at 50% 30%, #1c1812, #0a0806)', boxShadow: `0 0 0 2px rgba(5,4,3,0.7), 0 10px 26px -10px rgba(0,0,0,0.8)` }} title="Abrir ficha">
          {icon?.dataUrl
            ? <img src={icon.dataUrl} alt={c.name} draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${icon.x || 50}% ${icon.y || 50}%`, transform: `scale(${icon.scale || 1})`, transformOrigin: 'center' }} />
            : <div className="d-flex align-items-center justify-content-center h-100 font-display gold-text" style={{ fontSize: '2rem' }}>{(c.name || '?').slice(0, 2).toUpperCase()}</div>}
        </button>
        <button onClick={(e) => { e.stopPropagation(); if (confirm(`Excluir "${c.name}"?`)) onDelete() }} title="Excluir" style={{ position: 'absolute', top: 6, right: 6, width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(231,76,60,0.6)', background: 'rgba(192,57,43,0.85)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
          <i className="bi bi-trash" style={{ fontSize: '0.85rem' }} />
        </button>
      </div>
      <span className="tag-chip mt-2" style={{ color, fontSize: '0.7rem', padding: '0.18rem 0.55rem' }}>{lvl?.name}</span>
      <span className="font-display text-center mt-1" style={{ fontSize: '0.95rem', color: 'var(--drako-gold-soft)', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{c.name || 'Sem Nome'}</span>
    </div>
  )
}
