import { useMemo, useRef, useState } from 'react'
import { ATTR_ICONS } from '../data/attributes'
import { MODULES_ACTIVE, MODULES_PASSIVE, MODULES_SPECIAL } from '../data/modules'
import { PERICIAS, GRAU_NAMES } from '../data/pericias'
import { RACES } from '../data/races'
import { TRIAGES } from '../data/triages'
import { getRaceAdjustedAttrs, getRaceLabel } from '../utils/raceCalculator'

function makeCardId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

const SECTION_LIBRARY = [
  { type: 'identity', title: 'Identidade', desc: 'Nome, classe, nivel e linhagem.' },
  { type: 'attributes', title: 'Esqueleto', desc: 'Atributos ajustados por raca e pontos.' },
  { type: 'race', title: 'Raca', desc: 'Heranca, passivas e marcos raciais.' },
  { type: 'modules', title: 'Modulos', desc: 'Modulos passivos, ativos e especiais.' },
  { type: 'abilities', title: 'Habilidades', desc: 'Passivas, ativas, ultimate e extras.' },
  { type: 'mystic', title: 'Grimorio', desc: 'Feiticos, magias, rituais e runas.' },
  { type: 'skills', title: 'Pericias', desc: 'Treinos e graus selecionados.' },
  { type: 'triages', title: 'Triagens', desc: 'Caminhos principais e secundarios.' },
]

function buildGrimoirePages(char) {
  const sources = [
    { key: 'spells', label: 'Feitico', tone: 'emerald', items: char.spells || [] },
    { key: 'runes', label: 'Runa', tone: 'sky', items: char.runes || [] },
    { key: 'magics', label: 'Magia', tone: 'purple', items: char.magics || [] },
    { key: 'alchemyRituals', label: 'Ritual', tone: 'amber', items: char.alchemyRituals || [] },
  ]

  return sources.flatMap((source) =>
    source.items.slice(0, 10).map((item, index) => ({
      id: `${source.key}_${item.id || index}`,
      title: item.name || item.nome || source.label,
      subtitle: `${source.label}${item.circle ? ` de ${item.circle}o circulo` : ''}`,
      body: item.effect || item.descricao || item.short_description || 'Registro sem efeito descrito.',
      tone: source.tone,
    }))
  )
}

function DraggableBoardCard({ item, className = '', onMove, children }) {
  const dragRef = useRef(null)
  const [draft, setDraft] = useState(null)
  const position = draft || { x: item.x || 80, y: item.y || 80 }

  function startDrag(event) {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: item.x || 80,
      originY: item.y || 80,
    }
  }

  function moveDrag(event) {
    if (!dragRef.current) return
    const next = {
      x: Math.max(12, dragRef.current.originX + event.clientX - dragRef.current.startX),
      y: Math.max(12, dragRef.current.originY + event.clientY - dragRef.current.startY),
    }
    setDraft(next)
  }

  function endDrag(event) {
    if (!dragRef.current) return
    const next = draft || { x: item.x || 80, y: item.y || 80 }
    event.currentTarget.releasePointerCapture(dragRef.current.pointerId)
    dragRef.current = null
    setDraft(null)
    onMove(item.id, next)
  }

  return (
    <article className={`player-board-card ${className}`} style={{ left: position.x, top: position.y, width: item.width || undefined }}>
      <div
        className="board-drag-handle"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <span />
        <span />
        <span />
      </div>
      {children}
    </article>
  )
}

function getTriagemName(char, key, fallbackClass) {
  if (!key) return '-'
  const direct = TRIAGES[fallbackClass]?.[key]
  if (direct?.name) return direct.name
  for (const cls of Object.keys(TRIAGES)) {
    if (TRIAGES[cls]?.[key]?.name) return TRIAGES[cls][key].name
  }
  return key
}

function SectionCardBody({ type, char, grimoirePages }) {
  const skeleton = char.skeletonPoints || {}
  const attrs = getRaceAdjustedAttrs(char.atributos, skeleton, char)
  const allModules = [...MODULES_PASSIVE, ...MODULES_ACTIVE, ...MODULES_SPECIAL]
  const modules = (char.modulosAdquiridos || [])
    .map((entry) => {
      const found = allModules.find((item) => item.id === entry.id)
      return found ? { ...found, boughtCount: entry.boughtCount || 1 } : null
    })
    .filter(Boolean)
  const pericias = Object.entries(char.pericias || {}).filter(([, grau]) => grau > 0)
  const race = RACES[char.raca]

  if (type === 'identity') {
    return (
      <>
        <h3>{char.nome || 'Sem Nome'}</h3>
        <div className="board-chip-grid">
          <span>Classe <strong>{char.classe || '-'}</strong></span>
          <span>Nivel <strong>{char.nivel || 1}</strong></span>
          <span>Raca <strong>{getRaceLabel(char) || '-'}</strong></span>
          <span>Array <strong>{char.arrayTipo || '-'}</strong></span>
        </div>
      </>
    )
  }

  if (type === 'attributes') {
    return (
      <>
        <h3>Esqueleto</h3>
        <div className="board-attr-grid">
          {['FOR', 'DES', 'CON', 'INT', 'APA', 'AM'].map((attr) => (
            <span key={attr}>
              <small>{ATTR_ICONS[attr]} {attr}</small>
              <strong>{attrs[attr] || 0}</strong>
            </span>
          ))}
        </div>
      </>
    )
  }

  if (type === 'race') {
    return (
      <>
        <h3>{race?.name || 'Raca'}</h3>
        <p>{race?.desc || 'Nenhuma raca selecionada.'}</p>
        <div className="board-mini-list">
          {(race?.passivasRaciais || []).slice(0, 3).map((passiva) => (
            <span key={passiva.nome}>{passiva.nome}</span>
          ))}
        </div>
      </>
    )
  }

  if (type === 'modules') {
    return (
      <>
        <h3>Modulos</h3>
        <div className="board-mini-list">
          {modules.length ? modules.map((module) => (
            <span key={module.id}>{module.name}{module.boughtCount > 1 ? ` x${module.boughtCount}` : ''}</span>
          )) : <em>Nenhum modulo adquirido.</em>}
        </div>
      </>
    )
  }

  if (type === 'abilities') {
    return (
      <>
        <h3>Habilidades</h3>
        <div className="board-mini-list">
          {(char.habilidades || []).map((ability, index) => (
            <span key={`${ability.nome}-${index}`}>{ability.nome || `${ability.tipo || 'Habilidade'} ${index + 1}`}</span>
          ))}
        </div>
      </>
    )
  }

  if (type === 'mystic') {
    return (
      <>
        <h3>Grimorio</h3>
        <div className="board-mini-list">
          {grimoirePages.length ? grimoirePages.slice(0, 8).map((page) => (
            <span key={page.id}>{page.title}</span>
          )) : <em>Nenhum registro mistico selecionado.</em>}
        </div>
      </>
    )
  }

  if (type === 'skills') {
    return (
      <>
        <h3>Pericias</h3>
        <div className="board-mini-list">
          {pericias.length ? pericias.map(([name, grau]) => {
            const def = PERICIAS.find((item) => item.name === name)
            return <span key={name}>{def?.name || name} - {GRAU_NAMES[grau] || grau}</span>
          }) : <em>Nenhuma pericia treinada.</em>}
        </div>
      </>
    )
  }

  return (
    <>
      <h3>Triagens</h3>
      <div className="board-chip-grid">
        <span>Principal <strong>{getTriagemName(char, char.triagemPrincipal, char.classe)}</strong></span>
        <span>Nivel <strong>{char.triagemPrincipalNivel || 0}</strong></span>
        <span>Sub <strong>{getTriagemName(char, char.subTriagem, char.subTriagemClass || char.classe)}</strong></span>
        <span>Nivel <strong>{char.subTriagemNivel || 0}</strong></span>
      </div>
    </>
  )
}

export default function CharacterWorkspace({ char, update }) {
  const [editingId, setEditingId] = useState(null)
  const customCards = char.boardCards || []
  const sectionCards = char.boardSections || []
  const grimoirePages = useMemo(() => buildGrimoirePages(char), [char])

  function addCard() {
    const next = [
      ...customCards,
      {
        id: makeCardId('combo'),
        title: 'Novo combo',
        body: 'Descreva a ordem, custos, gatilhos, duracao e supervisao do combo.',
        x: 140 + customCards.length * 38,
        y: 460 + customCards.length * 32,
        width: 330,
      },
    ]
    update({ boardCards: next })
  }

  function addSection(type) {
    const meta = SECTION_LIBRARY.find((item) => item.type === type)
    const next = [
      ...sectionCards,
      {
        id: makeCardId(type),
        type,
        title: meta?.title || 'Secao',
        x: 520 + sectionCards.length * 42,
        y: 120 + sectionCards.length * 36,
        width: type === 'mystic' ? 410 : 340,
      },
    ]
    update({ boardSections: next })
  }

  function updateCard(id, patch) {
    update({ boardCards: customCards.map((card) => card.id === id ? { ...card, ...patch } : card) })
  }

  function updateSection(id, patch) {
    update({ boardSections: sectionCards.map((card) => card.id === id ? { ...card, ...patch } : card) })
  }

  function removeCard(id) {
    update({ boardCards: customCards.filter((card) => card.id !== id) })
  }

  function removeSection(id) {
    update({ boardSections: sectionCards.filter((card) => card.id !== id) })
  }

  return (
    <div className="player-board olympo-board">
      <div className="player-board-toolbar">
        <div>
          <p className="board-kicker">Atelier do Herói</p>
          <h2 className="font-cinzel text-gold text-2xl mb-1">Quadro do Jogador</h2>
          <p className="text-txt-dim text-sm">Arraste livremente combos, paginas e secoes da ficha para montar seu painel.</p>
        </div>
        <button type="button" onClick={addCard} className="olympo-command">
          Criar card
        </button>
      </div>

      <div className="board-section-shelf">
        {SECTION_LIBRARY.map((section) => (
          <button key={section.type} type="button" onClick={() => addSection(section.type)}>
            <strong>{section.title}</strong>
            <span>{section.desc}</span>
          </button>
        ))}
      </div>

      <div className="player-board-canvas">
        <DraggableBoardCard
          item={{ id: 'profile_seed', x: 72, y: 76, width: 360 }}
          className="board-section-card is-fixed"
          onMove={() => {}}
        >
          <div className="board-card-label">Nucleo</div>
          <SectionCardBody type="identity" char={char} grimoirePages={grimoirePages} />
        </DraggableBoardCard>

        {sectionCards.map((section) => (
          <DraggableBoardCard
            key={section.id}
            item={section}
            className="board-section-card"
            onMove={(id, position) => updateSection(id, position)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="board-card-label">Secao da ficha</div>
              <button type="button" onClick={() => removeSection(section.id)} className="board-remove-button">Remover</button>
            </div>
            <SectionCardBody type={section.type} char={char} grimoirePages={grimoirePages} />
          </DraggableBoardCard>
        ))}

        {customCards.map((card) => (
          <DraggableBoardCard
            key={card.id}
            item={card}
            className="player-board-combo"
            onMove={(id, position) => updateCard(id, position)}
          >
            <div className="flex items-start justify-between gap-2">
              {editingId === card.id ? (
                <input
                  value={card.title}
                  onChange={(event) => updateCard(card.id, { title: event.target.value })}
                  className="board-input font-cinzel"
                />
              ) : (
                <div>
                  <div className="board-card-label">Combo</div>
                  <h3 className="font-cinzel text-gold text-lg">{card.title}</h3>
                </div>
              )}
              <button type="button" onClick={() => removeCard(card.id)} className="board-remove-button">Remover</button>
            </div>
            {editingId === card.id ? (
              <textarea
                value={card.body}
                onChange={(event) => updateCard(card.id, { body: event.target.value })}
                className="board-input mt-3 min-h-[150px]"
              />
            ) : (
              <p className="text-txt-dim text-sm leading-relaxed whitespace-pre-wrap mt-3">{card.body}</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingId(editingId === card.id ? null : card.id)}
                className="board-mini-button is-primary"
              >
                {editingId === card.id ? 'Concluir' : 'Editar'}
              </button>
            </div>
          </DraggableBoardCard>
        ))}
      </div>
    </div>
  )
}
