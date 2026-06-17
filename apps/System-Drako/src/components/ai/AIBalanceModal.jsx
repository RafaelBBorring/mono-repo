import React, { useEffect, useState } from 'react'
import Modal from '../ui/Modal.jsx'
import { Button } from '../ui/Button.jsx'
import { aiBalanceAbility } from '../../lib/ai.js'
import { useToast } from '../../contexts/ToastContext.jsx'
import AutoGrow from '../ui/AutoGrow.jsx'

export default function AIBalanceModal({ open, onClose, ability, character, onApply }) {
  const [loading, setLoading] = useState(false)
  const [res, setRes] = useState(null)
  const [extra, setExtra] = useState('')
  const toast = useToast()

  useEffect(() => { setRes(null); setExtra('') }, [ability, open])

  const run = async (considerations = '') => {
    setLoading(true)
    try {
      const out = await aiBalanceAbility({
        habilidade: ability,
        ficha: {
          nome: character?.name, nivel: character?.level, raca: character?.raca,
          atributos: character?.attributes, recursos: character?.resources,
          anotacoes: considerations ? `${character?.anotacoes || ''}\n[Consideração extra do Mestre: ${considerations}]` : character?.anotacoes
        }
      })
      setRes(out)
    } catch (err) {
      toast.error(err.message || 'Falha na auditoria.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (open && ability && !res && !loading) run() /* eslint-disable-line */ }, [open, ability])

  const verColor = { 'EQUILIBRADO': '#2ecc71', 'LEVEMENTE DESBALANCEADO': '#f1c40f', 'DESBALANCEADO': '#f2661b', 'QUEBRA O SISTEMA': '#e74c3c' }[res?.veredito] || '#e0ad33'
  const hasSuggestion = res?.versao_sugerida?.nome

  const apply = () => {
    if (!hasSuggestion) return
    onApply?.(res.versao_sugerida)
    toast.success('Versão sugerida aplicada.')
    onClose?.()
  }

  return (
    <Modal open={open} onClose={onClose} title="Auditoria de Balanceamento" size="md"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        {hasSuggestion && <Button onClick={apply}><i className="bi bi-check-lg me-2" />Aplicar versão sugerida</Button>}
      </>}>
      {ability && (
        <div className="glass glass-tight p-3 mb-3">
          <div className="font-display text-gold" style={{ fontSize: '1.15rem' }}>{ability.name || '(sem nome)'}</div>
          <div className="text-muted-drako" style={{ fontSize: '0.9rem' }}>{ability.descricao || '—'}</div>
          <div className="mt-1 font-mono text-muted-drako" style={{ fontSize: '0.78rem' }}>{ability.kind} · {ability.energia} energia</div>
        </div>
      )}

      {loading && <div className="text-center py-4"><div className="spinner-border text-gold" /><div className="text-muted-drako mt-2" style={{ fontSize: '0.9rem' }}>O Oráculo está analisando...</div></div>}

      {!loading && res && (
        <div>
          <div className="d-flex align-items-center gap-3 mb-3">
            <div style={{ position: 'relative', width: 72, height: 72 }}>
              <svg width="72" height="72" viewBox="0 0 72 72">
                <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(224,173,51,0.15)" strokeWidth="6" />
                <circle cx="36" cy="36" r="30" fill="none" stroke={verColor} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(res.nota / 100) * 188} 188`} transform="rotate(-90 36 36)" />
              </svg>
              <span className="font-display" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: verColor, fontSize: '1.3rem' }}>{res.nota}</span>
            </div>
            <div>
              <div className="font-mono text-muted-drako" style={{ fontSize: '0.72rem', letterSpacing: '0.1em' }}>VEREDITO</div>
              <div className="font-display" style={{ color: verColor, fontSize: '1.25rem' }}>{res.veredito}</div>
            </div>
          </div>
          {res.resumo && <p style={{ fontSize: '0.98rem', color: '#d4c8ab' }}>{res.resumo}</p>}

          {res.problemas?.length > 0 && (
            <div className="mt-3">
              <div className="label-drako"><i className="bi bi-exclamation-triangle me-1" />Problemas</div>
              <ul style={{ fontSize: '0.95rem', color: '#d4c8ab' }}>{res.problemas.map((p, i) => <li key={i}>{p}</li>)}</ul>
            </div>
          )}
          {res.sugestoes?.length > 0 && (
            <div className="mt-2">
              <div className="label-drako"><i className="bi bi-lightbulb me-1" />Sugestões</div>
              <ul style={{ fontSize: '0.95rem', color: '#d4c8ab' }}>{res.sugestoes.map((p, i) => <li key={i}>{p}</li>)}</ul>
            </div>
          )}
          {hasSuggestion && (
            <div className="glass glass-tight p-3 mt-3" style={{ borderColor: 'rgba(46,204,113,0.4)' }}>
              <div className="label-drako text-life">Versão sugerida</div>
              <div className="font-display text-gold" style={{ fontSize: '1.1rem' }}>{res.versao_sugerida.nome}</div>
              <div style={{ fontSize: '0.92rem', color: '#d4c8ab' }}>{res.versao_sugerida.descricao}</div>
              {res.versao_sugerida.energia != null && <div className="font-mono text-muted-drako mt-1" style={{ fontSize: '0.78rem' }}>energia: {res.versao_sugerida.energia}</div>}
            </div>
          )}
        </div>
      )}

      <div className="mt-3">
        <div className="label-drako">Considerações extras para o Oráculo</div>
        <AutoGrow value={extra} onChange={setExtra} placeholder="Ex: na minha mesa o personagem enfrenta grupos grandes, então dano em área vale mais..." minRows={2} />
        <div className="text-end mt-2">
          <Button variant="ghost" onClick={() => run(extra)} disabled={loading}><i className="bi bi-arrow-repeat me-2" />Reanalisar</Button>
        </div>
      </div>
    </Modal>
  )
}
