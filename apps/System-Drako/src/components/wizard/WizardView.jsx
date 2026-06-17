import React, { useState, useRef, useEffect } from 'react'
import Stepper from '../ui/Stepper.jsx'
import { Button } from '../ui/Button.jsx'
import IconPickerModal from '../ui/IconPickerModal.jsx'
import AbilityEditor from '../sheet/abilities/AbilityEditor.jsx'
import CharacterSheet from '../sheet/CharacterSheet.jsx'
import { ATTRIBUTES } from '../../data/attributes.js'
import { STARTING_LEVELS, LEVEL_BY_KEY } from '../../data/startingLevels.js'
import { createCharacter } from '../../lib/character.js'
import { maxResources, validateAttributes, pointsSpent, pointBudget, capFor } from '../../lib/calculator.js'
import { saveCharacter, listFolders } from '../../lib/db.js'
import { useHashRoute } from '../../hooks/useHashRoute.js'
import { useToast } from '../../contexts/ToastContext.jsx'
import AIAbilityModal from '../ai/AIAbilityModal.jsx'
import { LEVEL_COLORS } from '../sheet/CharacterSheet.jsx'

const STEPS = [
  { key: 'id', title: 'Identidade', short: 'Identidade' },
  { key: 'nivel', title: 'Nível', short: 'Nível' },
  { key: 'attr', title: 'Atributos', short: 'Atributos' },
  { key: 'hab', title: 'Habilidades', short: 'Habilidades' },
  { key: 'rev', title: 'Revisão', short: 'Revisão' }
]

export default function WizardView() {
  const { navigate } = useHashRoute()
  const toast = useToast()
  const [step, setStep] = useState(0)
  const [char, setChar] = useState(() => createCharacter({ name: '', isNPC: true }))
  const [folders, setFolders] = useState([])
  const [showAI, setShowAI] = useState(false)
  const [showIcon, setShowIcon] = useState(false)

  React.useEffect(() => { listFolders().then(setFolders) }, [])

  const lvl = LEVEL_BY_KEY[char.level]
  const spent = pointsSpent(char.attributes)
  const budget = pointBudget(char.level)
  const cap = capFor(char.level)
  const left = budget - spent
  const valid = validateAttributes(char.attributes, char.level)

  const patch = (p) => setChar({ ...char, ...p })

  const onLevel = (key) => {
    const newLvl = LEVEL_BY_KEY[key]
    const attrs = { ...char.attributes }
    for (const a of ATTRIBUTES) if (attrs[a.key] > newLvl.cap) attrs[a.key] = newLvl.cap
    const resources = maxResources(attrs, key)
    patch({ level: key, attributes: attrs, resources })
  }
  const onAttr = (k, v) => patch({ attributes: { ...char.attributes, [k]: Math.max(0, Math.min(cap, v)) } })

  const applyAIAbilities = (res) => {
    const map = (a, kind) => a && ({
      id: 'ab_' + Math.random().toString(36).slice(2, 9), kind,
      name: a.nome || '', descricao: a.descricao || '',
      energia: kind === 'passiva' ? 0 : Math.max(0, Math.round(Number(a.energia) || 0)),
      tags: (a.tags || []).filter(t => t?.label).map(t => ({ label: String(t.label), color: t.color || '#e0ad33' }))
    })
    patch({ abilities: {
      passiva: map(res.passiva, 'passiva'),
      ativa1: map(res.ativas?.[0], 'ativa'),
      ativa2: map(res.ativas?.[1], 'ativa'),
      ativa3: map(res.ativas?.[2], 'ativa'),
      ultimate: map(res.ultimate, 'ultimate')
    } })
  }

  const finalize = async () => {
    if (!char.name.trim()) { toast.warn('Dê um nome ao personagem.'); setStep(0); return }
    const finalChar = { ...char, name: char.name.trim(), resources: maxResources(char.attributes, char.level) }
    await saveCharacter(finalChar)
    toast.success('Ficha salva na biblioteca.')
    navigate(`ficha/${finalChar.id}`)
  }

  return (
    <div className="container py-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h2 className="m-0 gold-text" style={{ fontSize: '1.7rem' }}>Forja Lendária</h2>
          <p className="text-muted-drako m-0" style={{ fontSize: '0.92rem' }}>Forje uma ficha, passo a passo.</p>
        </div>
        <Button variant="ghost" onClick={() => navigate('biblioteca')}><i className="bi bi-arrow-left me-2" />Cancelar</Button>
      </div>

      <div className="glass p-3 mb-4 overflow-auto"><Stepper steps={STEPS} current={step} onJump={setStep} /></div>

      {/* STEP 0 — Identidade */}
      {step === 0 && (
        <div className="glass p-4">
          <div className="d-flex flex-wrap align-items-center gap-4">
            <button onClick={() => setShowIcon(true)} className="card-sheen" style={{ width: 150, height: 150, borderRadius: 22, overflow: 'hidden', position: 'relative', cursor: 'pointer', border: '2px solid rgba(224,173,51,0.5)', background: 'radial-gradient(circle at 50% 30%, #1c1812, #0a0806)' }} title="Definir ícone">
              {char.icon?.dataUrl
                ? <img src={char.icon.dataUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${char.icon.x || 50}% ${char.icon.y || 50}%`, transform: `scale(${char.icon.scale || 1})` }} />
                : <div className="d-flex flex-column align-items-center justify-content-center h-100"><i className="bi bi-person-plus text-gold" style={{ fontSize: '2rem' }} /><span className="text-muted-drako mt-1" style={{ fontSize: '0.8rem' }}>Definir ícone</span></div>}
            </button>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div className="mb-3">
                <label className="label-drako">Nome</label>
                <input className="input-drako" style={{ fontSize: '1.15rem' }} value={char.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Ex: Kael, o Cinzento" />
              </div>
              <div className="mb-3">
                <label className="label-drako">Raça</label>
                <input className="input-drako" value={char.raca} onChange={(e) => patch({ raca: e.target.value })} placeholder="Ex: Humano, Elfo, Orc" />
              </div>
              <div className="row g-2">
                <div className="col-sm-6">
                  <label className="label-drako">Tipo</label>
                  <select className="select-drako" value={char.isNPC ? 'npc' : 'pc'} onChange={(e) => patch({ isNPC: e.target.value === 'npc' })}>
                    <option value="npc">NPC (Mestre)</option>
                    <option value="pc">Personagem (Jogador)</option>
                  </select>
                </div>
                <div className="col-sm-6">
                  <label className="label-drako">Pasta</label>
                  <select className="select-drako" value={char.folderId || ''} onChange={(e) => patch({ folderId: e.target.value || null })}>
                    <option value="">— Sem pasta —</option>
                    {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1 — Nível */}
      {step === 1 && (
        <div>
          <p className="text-muted-drako text-center mb-3" style={{ fontSize: '0.95rem' }}>Escolha o ponto de partida — cada nível define pontos para distribuir e o máximo por atributo.</p>
          <div className="row g-3">
            {STARTING_LEVELS.map(l => (
              <div className="col-md-6 col-xl-4" key={l.key}>
                <LevelCard level={l} active={char.level === l.key} onSelect={() => onLevel(l.key)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2 — Atributos */}
      {step === 2 && (
        <AttributesStep char={char} cap={cap} budget={budget} left={left} valid={valid} onAttr={onAttr} />
      )}

      {/* STEP 3 — Habilidades */}
      {step === 3 && (
        <AbilityEditor abilities={char.abilities} onChange={(ab) => patch({ abilities: ab })} onAIGenerate={() => setShowAI(true)} />
      )}

      {/* STEP 4 — Revisão = ficha final */}
      {step === 4 && (
        <div>
          <div className="d-flex align-items-center justify-content-between mb-3">
            <div>
              <h3 className="font-display gold-text m-0" style={{ fontSize: '1.3rem' }}>Prévia da ficha</h3>
              <p className="text-muted-drako m-0" style={{ fontSize: '0.85rem' }}>É exatamente assim que a ficha aparecerá. Ajuste nos passos anteriores se precisar.</p>
            </div>
            {valid.ok
              ? <span className="tag-chip text-life" style={{ fontSize: '0.78rem' }}><i className="bi bi-check-circle me-1" />pronta</span>
              : <span className="tag-chip" style={{ color: '#f1c40f', fontSize: '0.78rem' }}><i className="bi bi-exclamation-triangle me-1" />atributos: {valid.errors[0]}</span>}
          </div>
          <CharacterSheet character={char} editable={false} onOpenIcon={() => setShowIcon(true)} />
        </div>
      )}

      {/* Nav */}
      <div className="d-flex align-items-center justify-content-between mt-4">
        <Button variant="ghost" disabled={step === 0} onClick={() => setStep(s => Math.max(0, s - 1))}><i className="bi bi-arrow-left me-2" />Anterior</Button>
        {step < STEPS.length - 1
          ? <Button onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}>Próximo<i className="bi bi-arrow-right ms-2" /></Button>
          : <Button onClick={finalize}><i className="bi bi-check-lg me-2" />Salvar ficha</Button>}
      </div>

      <IconPickerModal open={showIcon} onClose={() => setShowIcon(false)} value={char.icon} onConfirm={(icon) => patch({ icon })} />
      <AIAbilityModal open={showAI} onClose={() => setShowAI(false)} character={char} onApply={applyAIAbilities} />
    </div>
  )
}

function LevelCard({ level: l, active, onSelect }) {
  const color = LEVEL_COLORS[l.key] || '#e0ad33'
  const [pressing, setPressing] = useState(false)
  const [burst, setBurst] = useState(0)
  const timer = useRef(null)

  const choose = () => {
    if (active) { setBurst(b => b + 1); return }
    setPressing(true)
    timer.current = setTimeout(() => {
      setBurst(b => b + 1)
      onSelect()
      setPressing(false)
    }, 160)
  }
  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <button
      className={`lvl-card glass text-start w-100 h-100 ${active ? 'lvl-card--selected' : ''} ${pressing ? 'lvl-card--press' : ''}`}
      style={{ '--tier': color }}
      onClick={choose}
    >
      <SparkBurst trigger={burst} color={color} />
      <div className="d-flex align-items-center justify-content-between">
        <h4 className="m-0 font-display" style={{ fontSize: '1.3rem', color }}>{l.name}</h4>
        <i className="bi bi-hammer" style={{ color, fontSize: '1.3rem', opacity: active ? 1 : 0.55 }} />
      </div>
      <p className="mt-2 mb-3" style={{ fontSize: '0.96rem', color: '#cdc1a6' }}>{l.tagline}</p>
      <div className="d-flex flex-wrap gap-2 mb-2">
        <span className="tag-chip" style={{ color: '#e0ad33', fontSize: '0.74rem' }}><i className="bi bi-plus-circle me-1" />Distribuir {l.points}</span>
        <span className="tag-chip" style={{ color: '#9bb0c4', fontSize: '0.74rem' }}><i className="bi bi-arrow-bar-up me-1" />Máx {l.cap}/atributo</span>
      </div>
      <div className="d-flex gap-3 font-mono" style={{ fontSize: '0.85rem' }}>
        <span style={{ color: 'var(--life)' }}><i className="bi bi-heart-pulse me-1" />{l.max.vida}</span>
        <span style={{ color: 'var(--energy)' }}><i className="bi bi-lightning-charge me-1" />{l.max.energia}</span>
        <span style={{ color: 'var(--pe)' }}><i className="bi bi-bullseye me-1" />{l.max.pe}</span>
      </div>
    </button>
  )
}

function SparkBurst({ trigger, color }) {
  const [parts, setParts] = useState([])
  useEffect(() => {
    if (!trigger) return
    const N = 24
    const arr = Array.from({ length: N }, (_, i) => {
      const edge = i % 4
      const along = 6 + Math.random() * 88
      const reach = 16 + Math.random() * 30
      const jitter = (Math.random() - 0.5) * 18
      let sx, sy, ox, oy
      if (edge === 0) { sx = along; sy = 0; ox = jitter; oy = -reach }
      else if (edge === 1) { sx = 100; sy = along; ox = reach; oy = jitter }
      else if (edge === 2) { sx = along; sy = 100; ox = jitter; oy = reach }
      else { sx = 0; sy = along; ox = -reach; oy = jitter }
      return { id: `${trigger}-${i}`, sx: `${sx}%`, sy: `${sy}%`, ox, oy, size: 3 + Math.random() * 3, delay: Math.random() * 0.05 }
    })
    setParts(arr)
    const t = setTimeout(() => setParts([]), 720)
    return () => clearTimeout(t)
  }, [trigger])
  if (!parts.length) return null
  return (
    <div className="lvl-sparks" aria-hidden="true">
      {parts.map(p => (
        <span key={p.id} className="lvl-spark" style={{
          left: p.sx, top: p.sy,
          '--ox': `${p.ox}px`, '--oy': `${p.oy}px`,
          width: p.size, height: p.size,
          background: color,
          boxShadow: `0 0 6px ${color}, 0 0 12px ${color}aa`,
          animationDelay: `${p.delay}s`
        }} />
      ))}
    </div>
  )
}

function AttributesStep({ char, cap, budget, left, valid, onAttr }) {
  return (
    <div>
      <div className="glass p-4 mb-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div className="d-flex align-items-center gap-3">
          <div className="hex d-flex align-items-center justify-content-center" style={{ width: 76, height: 84, background: 'linear-gradient(135deg,#f6d98c,#7c570e)' }}>
            <span className="font-display" style={{ color: '#1a1408', fontSize: '2rem', fontWeight: 700 }}>{left}</span>
          </div>
          <div>
            <div className="font-display text-gold" style={{ fontSize: '1.15rem' }}>pontos restantes</div>
            <div className="text-muted-drako" style={{ fontSize: '0.88rem' }}>distribua entre os 7 atributos · máx {cap} cada</div>
          </div>
        </div>
        {!valid.ok && <span className="text-muted-drako" style={{ fontSize: '0.85rem' }}><i className="bi bi-info-circle me-1" />{valid.errors[0]}</span>}
      </div>
      <div className="row g-2">
        {ATTRIBUTES.map(a => {
          const v = char.attributes[a.key]
          const pct = (v / cap) * 100
          return (
            <div className="col-md-6" key={a.key}>
              <div className="glass glass-tight p-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <span style={{ width: 12, height: 12, borderRadius: 4, background: a.color, boxShadow: `0 0 10px ${a.color}88`, display: 'inline-block' }} />
                    <span className="font-display" style={{ fontSize: '1.05rem', color: 'var(--drako-gold-soft)' }}>{a.name}</span>
                    <span className="font-mono text-muted-drako" style={{ fontSize: '0.72rem' }}>{a.short}</span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <button className="btn-ghost" style={{ width: 30, height: 30, padding: 0 }} disabled={v <= 0} onClick={() => onAttr(a.key, v - 1)}><i className="bi bi-dash" /></button>
                    <span className="font-display gold-text" style={{ fontSize: '1.6rem', minWidth: 36, textAlign: 'center' }}>{v}</span>
                    <button className="btn-ghost" style={{ width: 30, height: 30, padding: 0 }} disabled={left <= 0 || v >= cap} onClick={() => onAttr(a.key, v + 1)}><i className="bi bi-plus" /></button>
                  </div>
                </div>
                <div style={{ height: 10, borderRadius: 6, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${a.color}, ${a.color}aa)`, transition: 'width .4s', boxShadow: `0 0 10px ${a.color}77` }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
