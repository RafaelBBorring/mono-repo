import React, { useState } from 'react'
import Modal from '../ui/Modal.jsx'
import { Button } from '../ui/Button.jsx'
import { STARTING_LEVELS } from '../../data/startingLevels.js'
import { aiAutoCharacter } from '../../lib/ai.js'
import { createCharacter } from '../../lib/character.js'
import { saveCharacter } from '../../lib/db.js'
import { useToast } from '../../contexts/ToastContext.jsx'
import { LEVEL_BY_KEY } from '../../data/startingLevels.js'
import { validateAttributes, maxResources } from '../../lib/calculator.js'

const FOCOS = ['Livre', 'Ataque', 'Defesa', 'Suporte', 'Controle', 'Híbrido']

export default function AIAutoCharacterModal({ open, onClose, onCreated }) {
  const [desc, setDesc] = useState('')
  const [nivel, setNivel] = useState('veterano')
  const [foco, setFoco] = useState('Livre')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const run = async () => {
    if (!desc.trim()) { toast.warn('Descreva o arquétipo desejado.'); return }
    setLoading(true)
    try {
      const res = await aiAutoCharacter({ descricao: desc, nivelPreferido: nivel, foco: foco === 'Livre' ? null : foco })
      const levelKey = LEVEL_BY_KEY[res.nivel] ? res.nivel : nivel
      const lvl = LEVEL_BY_KEY[levelKey]
      const attrs = normalizeAttrs(res.atributos, lvl)
      const c = createCharacter({
        name: res.nome || 'Sem Nome',
        level: levelKey,
        raca: res.arquetipo || res.raca || '',
        attributes: attrs,
        narrativa: res.narrativa || {},
        abilities: mapAbilities(res.habilidades),
        isNPC: true
      })
      c.resources = maxResources(attrs, levelKey)
      const validation = validateAttributes(attrs, levelKey)
      if (!validation.ok) toast.warn('Ficha gerada — alguns atributos podem precisar de ajuste fino.')
      await saveCharacter(c)
      toast.success('Ficha forjada pelo Oráculo.')
      onCreated?.(c.id)
      setDesc('')
    } catch (err) {
      toast.error(err.message || 'Falha ao invocar o Oráculo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={loading ? undefined : onClose} title="Invocar o Oráculo" size="lg" closable={!loading}
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button onClick={run} disabled={loading}><i className="bi bi-stars me-2" />{loading ? 'Forjando...' : 'Criar ficha'}</Button>
      </>}>
      <p className="text-muted-drako" style={{ fontSize: '0.9rem' }}>
        Descreva como se escrevesse para um amigo. O Oráculo entende o sistema inteiro, preenche o que faltar e devolve uma ficha jogável.
      </p>

      <div className="mb-3">
        <label className="label-drako">Descrição do personagem</label>
        <textarea className="textarea-drako" rows={5} placeholder="Ex: um caçador de recompensas marcado por um espírito de fogo, focado em ataque à distância mas com uma defesa surpresa. Gosto de sinergias acumulativas e uma ultimate explosiva."
          value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>

      <div className="row g-3">
        <div className="col-sm-6">
          <label className="label-drako">Nível preferido</label>
          <select className="select-drako" value={nivel} onChange={(e) => setNivel(e.target.value)}>
            {STARTING_LEVELS.map(l => <option key={l.key} value={l.key}>{l.name} ({l.points} pts)</option>)}
          </select>
        </div>
        <div className="col-sm-6">
          <label className="label-drako">Foco</label>
          <select className="select-drako" value={foco} onChange={(e) => setFoco(e.target.value)}>
            {FOCOS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  )
}

function normalizeAttrs(raw, lvl) {
  const keys = ['for', 'agi', 'per', 'int', 'von', 'pre', 'am']
  let out = {}
  keys.forEach(k => { out[k] = Math.max(1, Math.min(lvl.cap, Number(raw?.[k] ?? 1) || 1)) })
  // fix point total if off
  let sum = keys.reduce((s, k) => s + out[k], 0)
  let target = lvl.points
  let guard = 0
  while (sum !== target && guard++ < 60) {
    if (sum < target) {
      // raise the lowest attribute below cap
      let cand = keys.filter(k => out[k] < lvl.cap).sort((a, b) => out[a] - out[b])[0]
      if (!cand) break
      out[cand]++; sum++
    } else {
      let cand = keys.filter(k => out[k] > 1).sort((a, b) => out[b] - out[a])[0]
      if (!cand) break
      out[cand]--; sum--
    }
  }
  return out
}

function mapAbility(a, kind) {
  return {
    id: 'ab_' + Math.random().toString(36).slice(2, 9),
    kind,
    name: a?.nome || '',
    descricao: a?.descricao || '',
    energia: kind === 'passiva' ? 0 : Math.max(0, Math.round(Number(a?.energia) || 0)),
    tags: (a?.tags || []).filter(t => t && t.label).map(t => ({ label: String(t.label), color: t.color || '#e0ad33' }))
  }
}

function mapAbilities(h) {
  if (!h) return undefined
  return {
    passiva: mapAbility(h.passiva, 'passiva'),
    ativa1: mapAbility(h.ativas?.[0], 'ativa'),
    ativa2: mapAbility(h.ativas?.[1], 'ativa'),
    ativa3: mapAbility(h.ativas?.[2], 'ativa'),
    ultimate: mapAbility(h.ultimate, 'ultimate')
  }
}
