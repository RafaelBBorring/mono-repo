import React from 'react'
import Modal from './Modal.jsx'
import { Button } from './Button.jsx'
import { useDatabase } from '../../contexts/DatabaseContext.jsx'

export default function DatabasePanel({ open, onClose }) {
  const db = useDatabase()
  const dot = (c) => ({ width: 9, height: 9, borderRadius: 999, background: c, display: 'inline-block', boxShadow: `0 0 8px ${c}` })
  const statusLabel = { checking: 'Verificando…', local: 'Banco local (IndexedDB)', connected: `Arquivo: ${db.fileName}`, pending: `Aguardando permissão: ${db.fileName || ''}` }[db.status]

  return (
    <Modal open={open} onClose={onClose} title="Banco de Dados" size="md"
      footer={<Button variant="ghost" onClick={onClose}>Fechar</Button>}>
      <div className="glass glass-tight p-3 mb-3 d-flex align-items-center gap-3">
        <span style={dot(db.status === 'connected' ? '#2ecc71' : db.status === 'pending' ? '#f1c40f' : '#9b59b6')} />
        <div className="flex-grow-1">
          <div className="font-display text-gold" style={{ fontSize: '1.05rem' }}>{statusLabel}</div>
          <div className="text-muted-drako" style={{ fontSize: '0.82rem' }}>
            {db.lastSaved ? `última gravação: ${db.lastSaved.toLocaleTimeString('pt-BR')}` : db.status === 'connected' ? 'auto-save ativo a cada alteração' : ''}
          </div>
        </div>
      </div>

      <p className="text-muted-drako" style={{ fontSize: '0.92rem' }}>
        Mantemos o banco local no navegador. Para usar 100% online e levar seus dados para qualquer máquina,
        conecte um <b>arquivo de banco</b> (.drako) no seu computador — o Chrome guarda a localização e salva
        automaticamente a cada alteração (mesmo se você sair sem salvar). Na próxima visita, o sistema
        reconecta ao mesmo arquivo.
      </p>

      {!db.supported && (
        <div className="glass glass-tight p-3 mb-3" style={{ borderColor: 'rgba(241,196,64,0.4)' }}>
          <i className="bi bi-exclamation-triangle text-gold" /> Seu navegador não suporta File System Access API.
          Use Chrome/Edge no desktop para o banco em arquivo. O banco local segue funcionando normalmente.
        </div>
      )}

      <div className="d-flex flex-wrap gap-2">
        <Button onClick={db.connectNew} disabled={!db.supported}><i className="bi bi-file-earmark-plus me-2" />Criar arquivo de banco</Button>
        <Button variant="ghost" onClick={db.openExisting} disabled={!db.supported}><i className="bi bi-folder2-open me-2" />Abrir existente</Button>
        {db.status === 'pending' && <Button variant="ghost" onClick={db.reconnect}><i className="bi bi-arrow-repeat me-2" />Reconectar</Button>}
        {db.status === 'connected' && <Button variant="danger" onClick={db.disconnect}><i className="bi bi-plug-fill me-2" />Desconectar</Button>}
      </div>

      <div className="gold-rule my-3" />
      <div className="text-muted-drako" style={{ fontSize: '0.82rem' }}>
        <i className="bi bi-info-circle me-1" />Também é possível baixar o projeto inteiro (com a pasta de referência <span className="kbd">db/</span>) ou exportar/importar um backup <span className="kbd">.drako</span> pela Biblioteca.
      </div>
    </Modal>
  )
}
