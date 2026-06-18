import React, { useEffect, useRef, useState } from 'react'
import { getCharacter, saveCharacter, deleteCharacter } from '../../lib/db.js'
import { LEVEL_BY_KEY, STARTING_LEVELS } from '../../data/startingLevels.js'
import { maxResources, absorption } from '../../lib/calculator.js'
import { Button } from '../ui/Button.jsx'
import CharacterSheet from './CharacterSheet.jsx'
import Modal from '../ui/Modal.jsx'
import IconPickerModal from '../ui/IconPickerModal.jsx'
import AIBalanceModal from '../ai/AIBalanceModal.jsx'
import { useHashRoute } from '../../hooks/useHashRoute.js'
import { useToast } from '../../contexts/ToastContext.jsx'
import { exportCharacterDrako } from '../../lib/storage.js'

export default function SheetView({ id }) {
  const { navigate } = useHashRoute()
  const toast = useToast()
  const [char, setChar] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [showIcon, setShowIcon] = useState(false)
  const [balanceTarget, setBalanceTarget] = useState(null)
  const [confirmLeave, setConfirmLeave] = useState(null)
  const [showDelete, setShowDelete] = useState(false)
  const printRef = useRef(null)

  useEffect(() => { getCharacter(id).then(c => { setChar(c); setLoaded(true) }) }, [id])

  useEffect(() => {
    if (!dirty) return
    const onHash = () => {
      if (!window.location.hash.endsWith(`ficha/${id}`)) setConfirmLeave(window.location.hash)
    }
    window.addEventListener('hashchange', onHash)
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => { window.removeEventListener('hashchange', onHash); window.removeEventListener('beforeunload', onBeforeUnload) }
  }, [dirty, id])

  const mutate = (fn) => { setChar(c => fn({ ...c })); setDirty(true) }
  const patch = (p) => mutate(c => ({ ...c, ...p }))

  const derivedMax = (c) => maxResources(c.attributes, c.level)
  const maxOf = (c, kind) => c.resources?.[`${kind}Max`] ?? derivedMax(c)[kind]

  const onChange = (p) => patch(p)
  const onResource = (kind, value) => mutate(c => ({ ...c, resources: { ...c.resources, [kind]: value } }))
  const onAbilities = (abilities) => mutate(c => ({ ...c, abilities }))
  const onResourceMax = (kind) => {
    const cur = maxOf(char, kind)
    const v = prompt(`Novo máximo de ${kind}:`, cur)
    if (v == null) return
    const n = Math.max(0, parseInt(v, 10) || 0)
    mutate(c => ({ ...c, resources: { ...c.resources, [`${kind}Max`]: n } }))
  }
  const onAttribute = (key, value) => mutate(c => {
    const attributes = { ...c.attributes, [key]: value }
    const d = maxResources(attributes, c.level)
    const r = { ...c.resources }
    delete r.vidaMax; delete r.energiaMax; delete r.peMax
    return { ...c, attributes, resources: { ...d, vida: Math.min(r.vida ?? d.vida, d.vida), energia: Math.min(r.energia ?? d.energia, d.energia), pe: Math.min(r.pe ?? d.pe, d.pe) } }
  })
  const onLevelUp = () => {
    const order = STARTING_LEVELS.map(s => s.key)
    const idx = order.indexOf(char.level)
    if (idx < 0 || idx >= order.length - 1) { toast.info('Já está no nível máximo (Lenda).'); return }
    const next = order[idx + 1]
    mutate(c => {
      const d = maxResources(c.attributes, next)
      return { ...c, level: next, resources: { ...d, vida: d.vida, energia: d.energia, pe: d.pe } }
    })
    toast.success(`Subiu para ${LEVEL_BY_KEY[next].name}.`)
  }
  const onApplySuggestion = (suggested) => {
    if (!balanceTarget) return
    const slotKey = ['passiva', 'ativa1', 'ativa2', 'ativa3', 'ultimate'].find(k => char.abilities?.[k]?.id === balanceTarget.id)
    if (!slotKey) return
    const existing = char.abilities[slotKey]
    mutate(c => ({ ...c, abilities: { ...c.abilities, [slotKey]: {
      ...existing,
      name: suggested.nome || existing.name,
      descricao: suggested.descricao || existing.descricao,
      energia: existing.kind === 'passiva' ? 0 : (suggested.energia != null ? Math.max(0, Number(suggested.energia)) : existing.energia),
      tags: suggested.tags?.length ? suggested.tags.filter(t => t?.label).map(t => ({ label: String(t.label), color: t.color || '#e0ad33' })) : existing.tags
    } } }))
  }

  const save = async () => {
    const toSave = { ...char, updatedAt: new Date().toISOString() }
    await saveCharacter(toSave); setChar(toSave); setDirty(false); toast.success('Ficha salva.')
  }

  if (!loaded) return <div className="container py-5 text-center"><div className="spinner-border text-gold" /></div>
  if (!char) return <div className="container py-5 text-center"><p className="text-muted-drako">Ficha não encontrada.</p><Button onClick={() => navigate('biblioteca')}>Voltar à biblioteca</Button></div>

  return (
    <div className="container py-4" ref={printRef}>
      <div className="glass p-3 mb-3 d-flex flex-wrap align-items-center justify-content-between gap-2 sticky-top" style={{ zIndex: 20 }}>
        <div className="d-flex align-items-center gap-2">
          <button className="btn-ghost" style={{ width: 40, height: 40, padding: 0 }} onClick={() => navigate('biblioteca')} title="Voltar"><i className="bi bi-arrow-left" /></button>
          <span className="font-display gold-text" style={{ fontSize: '1.15rem' }}>{char.name || 'Sem Nome'}</span>
          {dirty && <span className="text-gold" style={{ fontSize: '0.78rem' }}>• não salvo</span>}
        </div>
        <div className="d-flex flex-wrap gap-1">
          <Button variant="ghost" onClick={() => exportCharacterDrako(char)} title="Exportar .drako"><i className="bi bi-file-earmark-arrow-down" /></Button>
          <Button variant="ghost" onClick={async () => { try { const { exportElementToImage } = await import('../../lib/exporters.js'); await exportElementToImage(printRef.current, char.name); toast.success('Imagem exportada.') } catch { toast.error('Falha ao exportar.') } }} title="PNG"><i className="bi bi-card-image" /></Button>
          <Button variant="ghost" onClick={async () => { try { const { exportElementToPDF } = await import('../../lib/exporters.js'); await exportElementToPDF(printRef.current, char.name); toast.success('PDF exportado.') } catch { toast.error('Falha ao exportar.') } }} title="PDF"><i className="bi bi-filetype-pdf" /></Button>
          <Button variant="ghost" onClick={() => setShowDelete(true)} title="Excluir"><i className="bi bi-trash" /></Button>
          <Button disabled={!dirty} onClick={save}><i className="bi bi-save me-2" />Salvar</Button>
        </div>
      </div>

      <CharacterSheet
        character={char}
        editable
        onChange={onChange}
        onResource={onResource}
        onResourceMax={onResourceMax}
        onAttribute={onAttribute}
        onAbilities={onAbilities}
        onOpenIcon={() => setShowIcon(true)}
        onAIBalance={(a) => setBalanceTarget(a)}
        onLevelUp={onLevelUp}
      />

      <IconPickerModal open={showIcon} onClose={() => setShowIcon(false)} value={char.icon} onConfirm={(icon) => patch({ icon })} />
      <AIBalanceModal open={!!balanceTarget} onClose={() => setBalanceTarget(null)} ability={balanceTarget} character={char} onApply={onApplySuggestion} />

      <Modal open={!!confirmLeave} onClose={() => setConfirmLeave(null)} title="Salvar alterações?" size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setConfirmLeave(null)}>Ficar</Button>
          <Button variant="danger" onClick={() => { setDirty(false); if (confirmLeave) window.location.hash = confirmLeave; setConfirmLeave(null) }}>Sair sem salvar</Button>
          <Button onClick={async () => { await save(); setConfirmLeave(null); if (confirmLeave) window.location.hash = confirmLeave }}><i className="bi bi-save me-2" />Salvar e sair</Button>
        </>}>
        <p className="text-muted-drako" style={{ fontSize: '0.98rem' }}>Você tem alterações não salvas nesta ficha.</p>
      </Modal>

      <Modal open={showDelete} onClose={() => setShowDelete(false)} title="Excluir ficha?" size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setShowDelete(false)}>Cancelar</Button>
          <Button variant="danger" onClick={async () => { await deleteCharacter(id); toast.success('Ficha excluída.'); navigate('biblioteca') }}><i className="bi bi-trash me-2" />Excluir</Button>
        </>}>
        <p className="text-muted-drako" style={{ fontSize: '0.98rem' }}>A ficha de <b className="text-gold">{char.name}</b> será removida do banco local.</p>
      </Modal>
    </div>
  )
}
