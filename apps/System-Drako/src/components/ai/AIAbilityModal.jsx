import React, { useState } from 'react'
import Modal from '../ui/Modal.jsx'
import { Button } from '../ui/Button.jsx'
import { aiGenerateAbilities } from '../../lib/ai.js'
import { useToast } from '../../contexts/ToastContext.jsx'

export default function AIAbilityModal({ open, onClose, character, onApply }) {
  const [desc, setDesc] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const run = async () => {
    setLoading(true)
    try {
      const res = await aiGenerateAbilities({
        ficha: {
          nome: character.name, nivel: character.level, arquetipo: character.arquetipo,
          atributos: character.attributes, recursos: character.resources,
          narrativa: character.narrativa
        },
        descricao: desc
      })
      onApply?.(res)
      toast.success(res?.notas ? `Kit gerado. ${res.notas}` : 'Kit gerado pelo Oráculo.')
      setDesc('')
      onClose?.()
    } catch (err) {
      toast.error(err.message || 'Falha ao gerar habilidades.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={loading ? undefined : onClose} title="Oráculo de Habilidades" size="md" closable={!loading}
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button onClick={run} disabled={loading}><i className="bi bi-stars me-2" />{loading ? 'Forjando...' : 'Gerar kit'}</Button>
      </>}>
      <p className="text-muted-drako" style={{ fontSize: '0.9rem' }}>
        A IA lê a ficha ({character?.name}) e cria um kit coerente. Pode pedir mecânicas complexas: acumulativos, sinergias, custos que mudam, reatividade.
      </p>
      <label className="label-drako">Base de poderes</label>
      <textarea className="textarea-drako" rows={5} placeholder="Ex: magia de fogo sombrio, gosta de acumular brasas e explodir; ultimate devasta em área mas deixa vulnerável."
        value={desc} onChange={(e) => setDesc(e.target.value)} />
    </Modal>
  )
}
