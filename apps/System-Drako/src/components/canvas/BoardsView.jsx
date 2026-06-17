import React, { useEffect, useState } from 'react'
import { listBoards, saveBoard, deleteBoard } from '../../lib/db.js'
import { useHashRoute } from '../../hooks/useHashRoute.js'
import { useToast } from '../../contexts/ToastContext.jsx'
import { Button } from '../ui/Button.jsx'
import { uid } from '../../lib/id.js'

export default function BoardsView() {
  const { navigate } = useHashRoute()
  const toast = useToast()
  const [boards, setBoards] = useState([])

  const reload = () => listBoards().then(setBoards)
  useEffect(() => { reload() }, [])

  const create = async () => {
    const b = { id: uid('brd'), name: 'Novo Quadro', nodes: [], view: { x: 0, y: 0, scale: 1 }, createdAt: new Date().toISOString() }
    await saveBoard(b)
    toast.success('Quadro criado.')
    navigate(`quadro/${b.id}`)
  }

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h2 className="gold-text m-0" style={{ fontSize: '1.6rem' }}>Quadros</h2>
          <p className="text-muted-drako m-0" style={{ fontSize: '0.85rem' }}>Arena infinita para mestrar combates e organizar a narrativa.</p>
        </div>
        <Button onClick={create}><i className="bi bi-plus-lg me-2" />Novo quadro</Button>
      </div>

      {boards.length === 0 ? (
        <div className="glass p-5 text-center">
          <i className="bi bi-grid-3x3-gap text-gold" style={{ fontSize: '2.4rem' }} />
          <p className="text-muted-drako mt-2 mb-3">Nenhum quadro ainda. Crie sua arena de combate.</p>
          <Button onClick={create}><i className="bi bi-hammer me-2" />Criar primeiro quadro</Button>
        </div>
      ) : (
        <div className="row g-3">
          {boards.map(b => (
            <div className="col-md-6 col-lg-4" key={b.id}>
              <button className="glass glass-hover card-sheen p-4 text-start w-100 h-100" onClick={() => navigate(`quadro/${b.id}`)}>
                <div className="d-flex align-items-center justify-content-between">
                  <i className="bi bi-grid-3x3-gap-fill text-gold" style={{ fontSize: '1.4rem' }} />
                  <span className="font-mono text-muted-drako" style={{ fontSize: '0.68rem' }}>{b.nodes?.length || 0} elementos</span>
                </div>
                <h5 className="font-display gold-text mt-3 mb-1" style={{ fontSize: '1.05rem' }}>{b.name}</h5>
                <div className="text-muted-drako" style={{ fontSize: '0.74rem' }}>{new Date(b.updatedAt || b.createdAt).toLocaleString('pt-BR')}</div>
              </button>
              <div className="text-end mt-1">
                <button className="btn-danger-soft" style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }} onClick={async () => { if (confirm('Excluir quadro?')) { await deleteBoard(b.id); reload() } }}><i className="bi bi-trash me-1" />Excluir</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
