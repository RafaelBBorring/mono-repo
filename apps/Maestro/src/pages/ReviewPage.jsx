import { useMemo, useState } from 'react'
import { AlertTriangle, Check, ChevronRight, Eye, FileQuestion, Search, ShieldCheck, X } from 'lucide-react'
import { Modal } from '../components/ui/Modal'
import { useMaestro } from '../contexts/MaestroContext'

const typeIcons = {
  'Narrativa incompleta': FileQuestion,
  Contradição: AlertTriangle,
  'Identidade visual': Eye,
}

export function ReviewPage() {
  const { reviews, resolveReview } = useMaestro()
  const [selected, setSelected] = useState(null)
  const [note, setNote] = useState('')
  const [tab, setTab] = useState('pending')
  const visible = useMemo(() => reviews.filter((review) => tab === 'all' || review.status === tab), [reviews, tab])
  const pendingCount = reviews.filter((review) => review.status === 'pending').length

  const resolve = (resolution) => {
    resolveReview(selected.id, resolution, note.trim())
    setSelected(null)
    setNote('')
  }

  return (
    <div className="page">
      <section className="page-heading"><span className="eyebrow">Você mantém o controle</span><h1>Central de revisão</h1><p>Confirme interpretações, resolva conflitos e ensine ao Maestro o que somente você sabe.</p></section>
      <section className="review-summary">
        <article><span className="review-summary__icon"><ShieldCheck size={20} /></span><div><strong>{pendingCount}</strong><p>decisões aguardando você</p></div></article>
        <p>O conteúdo bruto já está pesquisável. Apenas relações e alterações de significado esperam sua aprovação.</p>
        <div className="review-tabs"><button type="button" className={tab === 'pending' ? 'active' : ''} onClick={() => setTab('pending')}>Pendentes</button><button type="button" className={tab === 'approved' ? 'active' : ''} onClick={() => setTab('approved')}>Aprovadas</button><button type="button" className={tab === 'rejected' ? 'active' : ''} onClick={() => setTab('rejected')}>Descartadas</button><button type="button" className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>Todas</button></div>
      </section>
      <section className="review-list">
        {visible.length ? visible.map((review) => {
          const Icon = typeIcons[review.type] || Search
          return (
            <article key={review.id} className={`review-card review-card--${review.status}`}>
              <span className="review-card__icon"><Icon size={19} /></span>
              <div className="review-card__main"><div><span className="review-card__type">{review.type}</span><span className="confidence-chip">{review.confidence}% confiança</span></div><h2>{review.title}</h2><p>{review.description}</p><small><Eye size={12} /> {review.source}</small></div>
              <div className="review-card__actions">{review.status === 'pending' ? <button className="button button--subtle" type="button" onClick={() => setSelected(review)}>Revisar <ChevronRight size={14} /></button> : <span className={`resolution resolution--${review.status}`}>{review.status === 'approved' ? <Check size={13} /> : <X size={13} />}{review.status === 'approved' ? 'Aprovada' : 'Descartada'}</span>}</div>
            </article>
          )
        }) : <div className="empty-state"><Check size={22} /><h3>Nada por aqui</h3><p>Não há revisões com esse estado.</p></div>}
      </section>

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.title || ''} eyebrow={selected?.type} size="large">
        {selected && <div className="review-detail">
          <div className="review-evidence"><h3>Evidências encontradas</h3><p>{selected.description}</p><div>{selected.evidence.map((item) => <span key={item}><Eye size={13} />{item}</span>)}</div><small>Proveniência: {selected.source}</small></div>
          <div className="epistemic-box"><AlertTriangle size={17} /><div><strong>O Maestro não tratará isso como fato sem você.</strong><p>{selected.type === 'Narrativa incompleta' ? 'A proximidade sugere uma cena em comum, mas não revela ações, motivo ou desfecho.' : 'A interpretação possui evidência, porém altera o significado do universo.'}</p></div></div>
          <label className="review-note">O que realmente aconteceu? <span>opcional ao descartar</span><textarea value={note} onChange={(event) => setNote(event.target.value)} rows="5" placeholder="Conte o contexto com suas palavras. Antes de salvar, o Maestro extrairá os fatos e manterá sua resposta como fonte do autor." /></label>
          <div className="review-detail__actions"><button className="button button--ghost" type="button" onClick={() => resolve('rejected')}><X size={15} /> Descartar inferência</button><button className="button button--primary" type="button" onClick={() => resolve('approved')} disabled={selected.type === 'Narrativa incompleta' && !note.trim()}><Check size={15} /> Confirmar e incorporar</button></div>
        </div>}
      </Modal>
    </div>
  )
}
