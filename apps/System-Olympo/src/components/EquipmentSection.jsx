import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { WEAPONS, WEAPON_RANKS, WEAPON_ABILITY_COST, LEGENDARY_WEAPONS, WEAPON_POWER_LEVELS } from '../data/weapons'
import { RANK_COLORS } from '../data/colors'
import { generateWeaponAbilities, generateEquipmentAbilities, analyzeBalance } from '../services/aiService'
import { getAttrValue } from '../utils/calculator'
import { getModifier } from '../data/attributes'
import { useAuth } from '../contexts/AuthContext'
import { fetchMysticWeapons } from '../services/alchemyService'
import { EQUIPMENT_TYPES, EQUIPMENT_RARITIES, SIMPLE_ITEMS, SET_BONUSES } from '../data/equipment'

function tagValue(tags = [], key) {
  const found = tags.find(t => t.startsWith(`${key}:`))
  return found ? found.slice(key.length + 1) : ''
}

function getWeaponTriagemBonus(char) {
  const tp = char.triagemPrincipal || ''
  const tn = char.triagemPrincipalNivel || 0
  const st = char.subTriagem || ''
  const sn = char.subTriagemNivel || 0
  const sk = char.skeletonPoints || {}
  const attrs = char.atributos || {}
  const bonuses = []

  if ((tp === 'ATIRADOR' && tn >= 0.2) || (st === 'ATIRADOR' && sn >= 0.2)) {
    const int = getAttrValue(attrs, 'INT', sk, char)
    bonuses.push({ label: `+${int} (INT) — Atirador`, value: int, color: 'text-sky-400' })
  }
  if ((tp === 'TÉCNICO' && tn >= 0.1) || (st === 'TÉCNICO' && sn >= 0.1)) {
    const allVals = ['FOR','DES','CON','INT','APA','AM'].map(a => getAttrValue(attrs, a, sk, char))
    const maior = Math.max(...allVals)
    bonuses.push({ label: `+${maior} (maior attr) — Técnico`, value: maior, color: 'text-amber-400' })
  }
  return bonuses
}

function getAssassinReactionBonus(char) {
  const tp = char.triagemPrincipal || ''
  const tn = char.triagemPrincipalNivel || 0
  const st = char.subTriagem || ''
  const sn = char.subTriagemNivel || 0
  const sk = char.skeletonPoints || {}
  const attrs = char.atributos || {}
  const des = getAttrValue(attrs, 'DES', sk, char)
  let bonus = 0
  if ((tp === 'ASSASSINO' && tn >= 0.2) || (st === 'ASSASSINO' && sn >= 0.2)) {
    bonus = Math.floor(des / 15)
  }
  return bonus
}

export default function EquipmentSection({ char, canEdit, onUpdate, onCharacterUpdate, onDrawerToggle }) {
  const { isAdmin } = useAuth()
  const weapon = WEAPONS.find(w => w.id === char.arma)
  const weaponRank = WEAPON_RANKS.find(r => r.rank === char.armaRank) || WEAPON_RANKS[0]
  const equipamentos = char.equipamentos || []
  const legendaryAssigned = char.armasLendarias || []
  const [showCreate, setShowCreate] = useState(false)
  const [showLegendaryCatalog, setShowLegendaryCatalog] = useState(false)
  const [legendaryForgeItems, setLegendaryForgeItems] = useState([])
  const [viewIdx, setViewIdx] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [showWeaponDrawer, setShowWeaponDrawer] = useState(false)
  const editImgRef = useRef(null)

  useEffect(() => {
    let alive = true
    fetchMysticWeapons().then((res) => {
      if (alive) setLegendaryForgeItems(res.data || [])
    })
    return () => { alive = false }
  }, [])

  function openDrawer(idx) { setViewIdx(idx); setEditMode(false); onDrawerToggle?.(true) }
  function closeDrawer() { setViewIdx(null); setEditMode(false); onDrawerToggle?.(false) }

  function addEquip(item) {
    onUpdate([...equipamentos, item])
    setShowCreate(false)
  }

  function updateEquip(idx, patch) {
    const next = [...equipamentos]
    next[idx] = { ...next[idx], ...patch }
    onUpdate(next)
  }

  function removeEquip(idx) {
    onUpdate(equipamentos.filter((_, i) => i !== idx))
    closeDrawer()
  }

  function updatePrimaryWeapon(patch) {
    onCharacterUpdate?.(patch)
  }

  function removePrimaryWeapon() {
    onCharacterUpdate?.({
      arma: null,
      armaRank: 'Comum',
      armaHabilidades: [],
      armaNome: '',
      armaImagem: null,
    })
    setShowWeaponDrawer(false)
  }

  const legendaryCatalog = [
    ...LEGENDARY_WEAPONS.map(item => ({
      id: `static_${item.id}`,
      sourceId: item.id,
      name: item.name,
      rank: 'Lendária',
      tipo: item.tipo,
      image: item.image || item.imagem || '',
      descricao: item.descricao || '',
    })),
    ...legendaryForgeItems.map(item => ({
      id: `forge_${item.id}`,
      sourceId: item.id,
      name: item.name,
      rank: 'Lendária',
      tipo: item.range || item.law_name || 'Forja Lendária',
      image: tagValue(item.tags || [], 'image'),
      descricao: item.short_description || '',
      power_level: tagValue(item.tags || [], 'power_level') || 'notavel',
    })),
  ]

  function assignLegendary(item) {
    if (!isAdmin || !onCharacterUpdate) return
    const exists = (char.armasLendarias || []).some(lw => lw.id === item.id || lw.sourceId === item.sourceId)
    if (exists) return
    onCharacterUpdate({
      armasLendarias: [...(char.armasLendarias || []), {
        id: item.id,
        sourceId: item.sourceId,
        name: item.name,
        rank: 'Lendária',
        tipo: item.tipo,
        image: item.image || '',
      }],
    })
  }

  function removeLegendary(idx) {
    if (!isAdmin || !onCharacterUpdate) return
    onCharacterUpdate({
      armasLendarias: (char.armasLendarias || []).filter((_, i) => i !== idx),
    })
  }

  function handleDrawerImage(e) {
    const file = e.target.files?.[0]
    if (!file || viewIdx === null) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const size = 128
        const canvas = document.createElement('canvas')
        canvas.width = size; canvas.height = size
        const ctx = canvas.getContext('2d')
        const scale = Math.max(size / img.width, size / img.height)
        const w = img.width * scale; const h = img.height * scale
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
        updateEquip(viewIdx, { imagem: canvas.toDataURL('image/webp', 0.7) })
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const viewing = viewIdx !== null ? equipamentos[viewIdx] : null

  return (
    <>
      <section>
        <div className="flex items-center gap-2 mb-3">
          <div className="section-header text-primary mb-0 flex-1">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>swords</span>
            Armas e Equipamentos
          </div>
          <button onClick={() => setShowLegendaryCatalog(true)}
            className="text-[9px] border border-lime-300/30 text-lime-300/80 px-2 py-0.5 rounded hover:bg-lime-300/10 hover:text-lime-300 transition-colors shrink-0">
            Armas Lendárias
          </button>
          {canEdit && (
            <button onClick={() => setShowCreate(true)}
              className="text-[9px] border border-primary/30 text-primary/70 px-2 py-0.5 rounded hover:bg-primary/10 hover:text-primary transition-colors shrink-0">
              + Arma/Equip
            </button>
          )}
        </div>

        <div className="space-y-2">
          {(weapon || equipamentos.length > 0 || legendaryAssigned.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {weapon && (
                <WeaponCard
                  weapon={weapon}
                  rank={weaponRank}
                  habilidades={char.armaHabilidades || []}
                  triagemBonus={getWeaponTriagemBonus(char)}
                  image={char.armaImagem}
                  displayName={char.armaNome || weapon.name}
                  onClick={() => setShowWeaponDrawer(true)}
                />
              )}
              {equipamentos.map((item, idx) => (
                <EquipCard key={item.id || idx} item={item} onClick={() => openDrawer(idx)} />
              ))}
              {legendaryAssigned.map((item, idx) => (
                <LegendaryAssignedCard key={item.id || idx} item={item} canRemove={canEdit && isAdmin} onRemove={() => removeLegendary(idx)} />
              ))}
            </div>
          )}

          {!weapon && equipamentos.length === 0 && legendaryAssigned.length === 0 && (
            <p className="text-txt-dim/50 text-[11px] italic">Nenhum equipamento</p>
          )}
        </div>
      </section>

      {showCreate && createPortal(
        <EquipCreateModal char={char} onSave={addEquip} onClose={() => setShowCreate(false)} />,
        document.body
      )}

      {showLegendaryCatalog && createPortal(
        <LegendaryCatalogModal
          items={legendaryCatalog}
          assigned={legendaryAssigned}
          isAdmin={isAdmin}
          onAssign={assignLegendary}
          onClose={() => setShowLegendaryCatalog(false)}
        />,
        document.body
      )}

      {viewing && createPortal(
        <EquipDrawer
          item={viewing}
          canEdit={canEdit}
          editMode={editMode}
          onEdit={() => setEditMode(true)}
          onCancelEdit={() => setEditMode(false)}
          onSaveEdit={(patch) => updateEquip(viewIdx, patch)}
          onDelete={() => removeEquip(viewIdx)}
          onClose={closeDrawer}
          onImageChange={handleDrawerImage}
          imgRef={editImgRef}
        />,
        document.body
      )}

      {showWeaponDrawer && weapon && createPortal(
        <WeaponDrawer
          weapon={weapon}
          rank={weaponRank}
          habilidades={char.armaHabilidades || []}
          char={char}
          canEdit={canEdit}
          onUpdate={updatePrimaryWeapon}
          onDelete={removePrimaryWeapon}
          onClose={() => setShowWeaponDrawer(false)}
        />,
        document.body
      )}
    </>
  )
}

function WeaponCard({ weapon, rank, habilidades, triagemBonus = [], image, displayName, onClick }) {
  const rc = RANK_COLORS[rank.rank] || RANK_COLORS.Comum
  return (
    <button type="button" onClick={onClick}
      className={`armory-card armory-card-weapon w-full rounded-lg border ${rc.border} ${rc.bg} ${rc.text} ${rc.glow} p-3 text-left`}>
      <div className="armory-rank-rail" />
      <div className={`armory-icon ${rc.badge}`}>
        {image ? <img src={image} alt="" className="w-full h-full object-cover" /> : <span>ARM</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-txt-main text-sm font-semibold truncate">{displayName || weapon.name}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${rc.badge} shrink-0`}>{rank.rank}</span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs">
          <span className="text-red-400/90 font-mono">Dano {weapon.dano}{rank.danoBonus ? `+${rank.danoBonus}` : ''}</span>
          <span className="text-txt-dim/60">{weapon.attr}</span>
          {habilidades.length > 0 && <span className="text-gold/60">{habilidades.length} hab.</span>}
        </div>
        {triagemBonus.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {triagemBonus.map((b, i) => (
              <span key={i} className={`text-[9px] ${b.color} bg-void/60 px-1.5 py-0.5 rounded border border-current/20 font-mono`}>
                {b.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <span className="armory-open">ver</span>
    </button>
  )
  return (
    <div onClick={onClick} className={`rounded-lg border ${rc.border} ${rc.bg} p-3 ${rc.glow} transition-all hover:brightness-110 cursor-pointer`}>
      <div className="relative mb-2">
        {image ? (
          <img src={image} alt="" className={`w-full aspect-[4/3] rounded-lg object-cover border ${rc.border}`} />
        ) : (
          <div className={`w-full aspect-[4/3] rounded-lg ${rc.badge} border flex items-center justify-center text-3xl`}>
            IMG
          </div>
        )}
        {rank.rank && <span className={`absolute left-2 top-2 text-[8px] px-1 py-0.5 rounded border ${rc.badge}`}>{rank.rank}</span>}
      </div>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${rc.badge} border flex items-center justify-center text-lg shrink-0`}>
          ⚔
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-txt-main text-sm font-semibold">{displayName || weapon.name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${rc.badge}`}>{rank.rank}</span>
          </div>
          <div className="flex items-center gap-4 mt-0.5 text-xs">
            <span className="text-red-400/90 font-mono">Dano {weapon.dano}{rank.danoBonus ? `+${rank.danoBonus}` : ''}</span>
            <span className="text-txt-dim/60">{weapon.attr}</span>
          </div>
          {triagemBonus.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {triagemBonus.map((b, i) => (
                <span key={i} className={`text-[9px] ${b.color} bg-void/60 px-1.5 py-0.5 rounded border border-current/20 font-mono`}>
                  {b.label}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <span className="text-txt-dim/30 text-xs">▶ detalhes</span>
          {habilidades.length > 0 && (
            <p className="text-gold/60 text-[10px] mt-0.5">{habilidades.length} hab.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function WeaponDrawer({ weapon, rank, habilidades, char, canEdit, onUpdate, onDelete, onClose }) {
  const rc = RANK_COLORS[rank.rank] || RANK_COLORS.Comum
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState(char.armaNome || weapon.name)
  const [editRank, setEditRank] = useState(rank.rank)
  const imageRef = useRef(null)
  const triagemBonus = getWeaponTriagemBonus(char)
  const assassinBonus = getAssassinReactionBonus(char)

  async function handleAnalyze() {
    setAnalyzing(true)
    setError('')
    try {
      const data = await analyzeBalance(char)
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  function handlePrimaryImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const size = 256
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        const scale = Math.max(size / img.width, size / img.height)
        const w = img.width * scale
        const h = img.height * scale
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
        onUpdate?.({ armaImagem: canvas.toDataURL('image/webp', 0.78) })
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function saveEdit() {
    onUpdate?.({ armaNome: editName, armaRank: editRank })
    setEditMode(false)
  }

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-[420px] bg-deep border-l border-primary/15 shadow-2xl shadow-black/60 flex flex-col">
        <div className="px-5 py-4 border-b border-sep/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg ${rc.badge} border flex items-center justify-center text-base`}>⚔</div>
            <div>
              <h3 className="text-on-surface text-sm font-semibold">{char.armaNome || weapon.name}</h3>
              <span className={`text-[9px] px-1.5 py-0.5 rounded border ${rc.badge}`}>{rank.rank}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-txt-dim hover:text-err text-sm transition-colors">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {canEdit && (
            <div className="flex gap-2">
              <button onClick={() => setEditMode(!editMode)}
                className="text-[10px] border border-gold/30 text-gold px-3 py-1.5 rounded-lg hover:bg-gold/10 transition-colors">
                {editMode ? 'Cancelar edicao' : 'Editar arma'}
              </button>
              <button onClick={onDelete}
                className="text-[10px] border border-err/30 text-err px-3 py-1.5 rounded-lg hover:bg-err/10 transition-colors">
                Remover arma
              </button>
            </div>
          )}

          {editMode && canEdit && (
            <div className="bg-void/50 border border-gold/20 rounded-lg p-3 space-y-3">
              <div className="flex items-center gap-3">
                <button onClick={() => imageRef.current?.click()}
                  className="w-20 h-20 rounded-lg border border-sep/40 flex items-center justify-center hover:border-gold/40 transition-colors overflow-hidden bg-void/50 shrink-0">
                  {char.armaImagem ? <img src={char.armaImagem} alt="" className="w-full h-full object-cover" /> : <span className="text-txt-dim/40 text-xs">IMG</span>}
                </button>
                <input ref={imageRef} type="file" accept="image/*" onChange={handlePrimaryImage} className="hidden" />
                <div className="flex-1 space-y-2">
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nome da arma"
                    className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-xs text-txt-main focus:border-gold/40 focus:outline-none" />
                  <div className="flex flex-wrap gap-1">
                    {WEAPON_RANKS.map(r => {
                      const c = RANK_COLORS[r.rank]
                      return (
                        <button key={r.rank} onClick={() => setEditRank(r.rank)}
                          className={`text-[9px] px-2 py-0.5 rounded border transition-colors ${editRank === r.rank ? `${c.badge}` : 'border-sep/30 text-txt-dim/50 hover:border-sep/60'}`}>
                          {r.rank}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
              <button onClick={saveEdit} className="text-[10px] bg-gold text-void px-3 py-1.5 rounded-lg hover:bg-gold-light transition-colors font-semibold">
                Salvar
              </button>
            </div>
          )}

          {char.armaImagem && !editMode && (
            <img src={char.armaImagem} alt="" className={`w-full aspect-[16/9] rounded-lg object-cover border ${rc.border}`} />
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className={`bg-void/50 border rounded-lg px-3 py-2 ${rc.border}`}>
              <span className="text-txt-dim/50 text-[9px] uppercase">Dano</span>
              <p className="text-red-400/90 text-sm font-mono mt-0.5">{weapon.dano}{rank.danoBonus ? ` ${rank.danoBonus}` : ''}</p>
            </div>
            <div className="bg-void/50 border border-sep/30 rounded-lg px-3 py-2">
              <span className="text-txt-dim/50 text-[9px] uppercase">Atributo</span>
              <p className="text-txt-main text-sm font-mono mt-0.5">{weapon.attr}</p>
            </div>
            <div className="bg-void/50 border border-sep/30 rounded-lg px-3 py-2">
              <span className="text-txt-dim/50 text-[9px] uppercase">+CA</span>
              <p className="text-txt-main text-sm font-mono mt-0.5">{rank.caBonus}</p>
            </div>
            <div className="bg-void/50 border border-sep/30 rounded-lg px-3 py-2">
              <span className="text-txt-dim/50 text-[9px] uppercase">Slots</span>
              <p className="text-gold text-sm font-mono mt-0.5">{rank.slots}</p>
            </div>
          </div>

          {triagemBonus.length > 0 && (
            <div className="bg-void/40 border border-gold/20 rounded-lg px-3 py-2.5">
              <span className="text-gold/70 text-[9px] uppercase tracking-wider">Bônus de Triagem no Dano</span>
              <div className="space-y-1 mt-1.5">
                {triagemBonus.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`text-sm font-mono font-semibold ${b.color}`}>+{b.value}</span>
                    <span className="text-txt-dim/70 text-[10px]">{b.label.split(' — ')[1] || ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {assassinBonus > 0 && (
            <div className="bg-void/40 border border-purple-400/20 rounded-lg px-3 py-2.5">
              <span className="text-purple-400/70 text-[9px] uppercase tracking-wider">Bônus de Reações (Assassino)</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-purple-400 text-sm font-mono font-semibold">+{assassinBonus}</span>
                <span className="text-txt-dim/70 text-[10px]">reações extras (a cada 15 DES)</span>
              </div>
            </div>
          )}

          {weapon.mec && (
            <div className="bg-void/50 border border-sep/30 rounded-lg px-3 py-2">
              <span className="text-txt-dim/50 text-[9px] uppercase">Mecânica Única</span>
              <p className="text-txt-dim/80 text-xs mt-0.5 leading-relaxed">{weapon.mec}</p>
            </div>
          )}

          {habilidades.length > 0 && (
            <div>
              <span className="text-txt-dim/50 text-[9px] uppercase tracking-wider">Habilidades da Arma</span>
              <div className="space-y-2 mt-2">
                {habilidades.map((h, i) => (
                  <div key={i} className={`bg-void/50 border rounded-lg px-3 py-2.5 ${rc.border}`}>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-txt-main text-xs font-semibold">{h.nome || 'Hab'}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-sep/20 text-txt-dim/70 border border-sep/30">{h.potencia}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border ${h.tipo === 'Passiva' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                        {h.tipo || 'Ativa'}
                      </span>
                      {h.custo && <span className="text-[9px] text-gold/80 ml-auto font-mono">{h.custo}</span>}
                    </div>
                    {h.descricao && <p className="text-txt-dim/70 text-[11px] leading-relaxed">{h.descricao}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-sep/20 pt-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-indigo-400 text-xs">✦</span>
              <span className="text-txt-dim text-[10px] uppercase tracking-wider">Análise de Balanceamento</span>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="w-full bg-indigo-500/10 border border-indigo-400/30 text-indigo-400 text-[10px] px-3 py-2 rounded hover:bg-indigo-500/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {analyzing && <span className="animate-spin inline-block w-3 h-3 border border-indigo-400/40 border-t-indigo-400 rounded-full" />}
              {analyzing ? 'Analisando...' : '✦ Analisar Habilidades com IA'}
            </button>
            {error && <p className="text-err text-[10px] mt-2">{error}</p>}
            {result && (
              <div className="mt-3 space-y-2">
                {result.habilidades?.map((h, i) => (
                  <div key={i} className="bg-void/50 border border-sep/30 rounded-lg px-2.5 py-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-txt-main text-[11px] font-semibold">{h.nome}</span>
                      <span className="text-[9px] bg-indigo-400/10 text-indigo-400 px-1.5 py-0.5 rounded">{char.habilidades?.[i]?.tipo || '?'}</span>
                    </div>
                    <p className="text-txt-dim text-[10px]">{h.descricao}</p>
                    {h.feedback && <p className="text-gold/60 text-[9px] mt-0.5 italic">💡 {h.feedback}</p>}
                  </div>
                ))}
                {result.armaHabilidades?.map((h, i) => (
                  <div key={`w${i}`} className="bg-void/50 border border-orange-400/20 rounded-lg px-2.5 py-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-txt-main text-[11px] font-semibold">{h.nome}</span>
                      <span className="text-[9px] bg-orange-400/10 text-orange-400 px-1.5 py-0.5 rounded">{h.tipo || 'Ativa'}</span>
                      {h.custo && <span className="text-gold/60 text-[9px] ml-auto font-mono">{h.custo}</span>}
                    </div>
                    <p className="text-txt-dim text-[10px]">{h.descricao}</p>
                    {h.feedback && <p className="text-gold/60 text-[9px] mt-0.5 italic">💡 {h.feedback}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function EquipCard({ item, onClick }) {
  const rc = RANK_COLORS[item.rank] || RANK_COLORS.Comum
  const isLegendaryItem = item.categoria === 'Arma Lendaria' || item.categoria === 'Arma Lendária' || item.categoria === 'Arma Mistica'
  const isWeapon = item.categoria === 'Arma' || isLegendaryItem
  return (
    <button type="button" onClick={onClick}
      className={`armory-card w-full rounded-lg border ${isLegendaryItem ? 'border-lime-300/45 bg-lime-300/8 text-lime-300 shadow-lg shadow-lime-300/10' : `${rc.border} ${rc.bg} ${rc.text} ${rc.glow}`} p-3 text-left`}>
      <div className="armory-rank-rail" />
      <div className={`armory-icon ${isLegendaryItem ? 'bg-lime-300/10 text-lime-300 border-lime-300/25' : rc.badge}`}>
        {item.imagem ? <img src={item.imagem} alt="" className="w-full h-full object-cover" /> : <span>{isWeapon ? 'ARM' : 'EQP'}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-txt-main text-sm font-semibold truncate">{item.nome || 'Equipamento'}</span>
          {item.rank && <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 ${isLegendaryItem ? 'bg-lime-300/10 text-lime-300 border-lime-300/25' : rc.badge}`}>{isLegendaryItem ? 'Lendária' : item.rank}</span>}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs">
          <span className={isLegendaryItem ? 'text-lime-300/80' : 'text-txt-dim/60'}>{isLegendaryItem ? 'Arma Lendária' : item.categoria || 'Equipamento'}</span>
          {item.dano && <span className="text-red-400/80 font-mono">{item.dano}</span>}
          {(item.habilidades || []).length > 0 && <span className="text-gold/60">{item.habilidades.length} hab.</span>}
        </div>
        {item.efeitos && <p className="text-txt-dim/55 text-[10px] mt-1 truncate">{item.efeitos}</p>}
      </div>
      <span className="armory-open">abrir</span>
    </button>
  )
  return (
    <button type="button" onClick={onClick}
      className={`rounded-lg border ${rc.border} ${rc.bg} p-2.5 text-left hover:brightness-110 transition-all ${rc.glow} overflow-hidden`}>
      <div className="relative mb-2">
        {item.imagem ? (
          <img src={item.imagem} alt="" className={`w-full aspect-[4/3] rounded-lg object-cover border ${rc.border}`} />
        ) : (
          <div className={`w-full aspect-[4/3] rounded-lg ${rc.badge} border flex items-center justify-center text-2xl`}>
            {item.categoria === 'Arma' ? '⚔' : '🛡'}
          </div>
        )}
      </div>
      <div className="flex items-center justify-center gap-1">
        <span className="text-txt-main text-[10px] font-semibold leading-tight line-clamp-2">{item.nome || 'Equip'}</span>
      </div>
      {item.rank && <span className={`text-[8px] mt-0.5 inline-block px-1 py-0.5 rounded border ${rc.badge}`}>{item.rank}</span>}
      {item.dano && <p className="text-red-400/60 text-[9px] font-mono mt-0.5">{item.dano}</p>}
    </button>
  )
}

function LegendaryAssignedCard({ item, canRemove, onRemove }) {
  const rc = RANK_COLORS['Lendária']
  return (
    <div className={`armory-card w-full rounded-lg border ${rc.border} ${rc.bg} ${rc.text} ${rc.glow} p-3 text-left`}>
      <div className="armory-rank-rail" />
      <div className={`armory-icon ${rc.badge}`}>
        {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <span>LEN</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-txt-main text-sm font-semibold truncate">{item.name || 'Arma Lendária'}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${rc.badge} shrink-0`}>Lendária</span>
        </div>
        <div className="text-lime-300/70 text-xs mt-1">{item.tipo || 'Forja Lendária'}</div>
      </div>
      {canRemove && (
        <button type="button" onClick={onRemove}
          className="text-err/50 hover:text-err text-xs border border-err/20 hover:bg-err/10 rounded px-2 py-1 transition-colors">
          Remover
        </button>
      )}
    </div>
  )
}

function LegendaryCatalogModal({ items, assigned, isAdmin, onAssign, onClose }) {
  const assignedIds = new Set((assigned || []).flatMap(item => [item.id, item.sourceId, item.sourceId ? `static_${item.sourceId}` : null, item.sourceId ? `forge_${item.sourceId}` : null]).filter(Boolean))
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm modal-bg" onClick={onClose}>
      <div className="bg-deep border border-lime-300/25 rounded-xl w-full max-w-3xl shadow-2xl shadow-black/50 max-h-[86vh] flex flex-col modal-content" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-sep/30 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-cinzel text-lime-300 text-sm">Catálogo de Armas Lendárias</h3>
            <p className="text-txt-dim/60 text-[10px] mt-1">Visualização breve. Somente o Mestre pode atribuir uma arma lendária.</p>
          </div>
          <button onClick={onClose} className="text-txt-dim hover:text-err text-sm transition-colors">×</button>
        </div>
        <div className="p-5 overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-txt-dim/50 text-xs italic">Nenhuma arma lendária disponível na forja.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map(item => {
                const already = assignedIds.has(item.id)
                return (
                  <div key={item.id} className="legendary-catalog-card rounded-lg border border-lime-300/25 bg-lime-300/5 overflow-hidden">
                    <div className="aspect-[4/3] bg-void/70 grid place-items-center border-b border-lime-300/15 overflow-hidden">
                      {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <span className="font-cinzel text-lime-300/55 text-sm">Lendária</span>}
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="font-cinzel text-lime-200 text-sm leading-tight truncate">{item.name}</div>
                      <div className="text-txt-dim/50 text-[10px] truncate">{item.tipo || 'Forja Lendária'}</div>
                      {item.power_level && (
                        <span className="text-[9px] bg-amber-300/10 text-amber-200 px-1.5 py-0.5 rounded border border-amber-300/20">
                          {WEAPON_POWER_LEVELS.find(p => p.value === item.power_level)?.label || 'Notável'}
                        </span>
                      )}
                      {isAdmin ? (
                        <button onClick={() => onAssign(item)} disabled={already}
                          className={`w-full text-[10px] px-3 py-1.5 rounded border transition-colors ${already ? 'border-sep/30 text-txt-dim/35 cursor-not-allowed' : 'border-lime-300/35 text-lime-300 hover:bg-lime-300/10'}`}>
                          {already ? 'Já atribuída' : 'Atribuir'}
                        </button>
                      ) : (
                        <div className="text-[10px] text-txt-dim/40 border border-sep/25 rounded px-2 py-1.5 text-center">Restrita ao Mestre</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EquipCreateModal({ char, onSave, onClose }) {
  const [step, setStep] = useState(0)
  const [itemCategory, setItemCategory] = useState('Arma')
  const [equipType, setEquipType] = useState(null)
  const [selectedType, setSelectedType] = useState('')
  const [selectedRank, setSelectedRank] = useState('Comum')
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [dano, setDano] = useState('')
  const [efeitos, setEfeitos] = useState('')
  const [habilidades, setHabilidades] = useState([])
  const [passivas, setPassivas] = useState([])
  const [imagem, setImagem] = useState(null)
  const [preview, setPreview] = useState(null)
  const [setId, setSetId] = useState(null)
  const [equipado, setEquipado] = useState(false)
  const fileRef = useRef(null)
  const modalRef = useRef(null)
  const [genLoading, setGenLoading] = useState(false)
  const [genError, setGenError] = useState('')

  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [])

  const weaponDef = WEAPONS.find(w => w.id === selectedType)
  const rankDef = WEAPON_RANKS.find(r => r.rank === selectedRank) || WEAPON_RANKS[0]
  const equipRarity = EQUIPMENT_RARITIES.find(r => r.rank === selectedRank)
  const passiveSlotsAvail = itemCategory === 'Equipamento' ? (equipRarity?.passiveSlots || 0) : 0
  const usedSlots = habilidades.reduce((s, h) => s + (WEAPON_ABILITY_COST[h.potencia] || 0), 0)

  async function handleAIEquip() {
    if (!equipType) return
    setGenLoading(true); setGenError('')
    try {
      const data = await generateEquipmentAbilities(char || {}, equipType, selectedRank, passiveSlotsAvail, nome)
      if (data.passivas?.length) {
        setPassivas(data.passivas)
      }
    } catch (err) {
      setGenError(err.message)
    } finally {
      setGenLoading(false)
    }
  }

  function handleImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const size = 128
        const canvas = document.createElement('canvas')
        canvas.width = size; canvas.height = size
        const ctx = canvas.getContext('2d')
        const scale = Math.max(size / img.width, size / img.height)
        const w = img.width * scale; const h = img.height * scale
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
        const dataUrl = canvas.toDataURL('image/webp', 0.7)
        setImagem(dataUrl); setPreview(dataUrl)
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function selectType(id) {
    const w = WEAPONS.find(x => x.id === id)
    setSelectedType(id)
    if (w) {
      setDano(w.dano)
      setNome(w.name)
      setEfeitos(w.mec)
    } else {
      setDano('')
      setNome('')
      setEfeitos('')
    }
    setStep(1)
  }

  function addHabilidade() {
    if (usedSlots >= rankDef.slots) return
    setHabilidades([...habilidades, { nome: '', potencia: 'Fraca', descricao: '', tipo: 'Ativa', custo: '' }])
  }

  function updateHab(i, patch) {
    const arr = [...habilidades]
    arr[i] = { ...arr[i], ...patch }
    setHabilidades(arr)
  }

  function removeHab(i) { setHabilidades(habilidades.filter((_, j) => j !== i)) }

  async function handleAIGenerate() {
    if (!selectedType) return
    setGenLoading(true)
    setGenError('')
    try {
      const data = await generateWeaponAbilities(char || {}, selectedType, selectedRank, rankDef.slots)
      if (data.habilidades?.length) {
        const valid = data.habilidades.filter(h => {
          const cost = WEAPON_ABILITY_COST[h.potencia] || 1
          return cost <= rankDef.slots
        })
        let totalSlots = 0
        const fitting = []
        for (const h of valid) {
          const cost = WEAPON_ABILITY_COST[h.potencia] || 1
          if (totalSlots + cost <= rankDef.slots) {
            fitting.push({ ...h, potencia: h.potencia || 'Fraca', tipo: h.tipo || 'Ativa', custo: h.custo || '' })
            totalSlots += cost
          }
        }
        setHabilidades(fitting)
      }
    } catch (err) {
      setGenError(err.message)
    } finally {
      setGenLoading(false)
    }
  }

  function handleSave() {
    onSave({
      id: Date.now(), nome, descricao, imagem, dano, efeitos,
      categoria: itemCategory,
      armaId: itemCategory === 'Arma' ? (selectedType === 'custom' ? null : selectedType) : null,
      tipoEquip: itemCategory === 'Equipamento' ? equipType : (itemCategory === 'Utilidade' ? 'utilidade' : null),
      rank: selectedRank,
      habilidades: itemCategory === 'Arma' ? habilidades.filter(h => h.nome.trim()) : [],
      passivas: itemCategory === 'Equipamento' ? passivas : [],
      setId: itemCategory === 'Equipamento' ? setId : null,
      equipado: itemCategory === 'Equipamento' ? equipado : false,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm modal-bg" onClick={onClose}>
      <div ref={modalRef} className="codex-card !bg-deep border-primary/25 rounded-xl w-full max-w-lg shadow-2xl shadow-black/50 max-h-[90vh] flex flex-col modal-content" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-sep/30 flex items-center justify-between shrink-0">
          <h3 className="font-cinzel text-primary text-sm">Novo Equipamento</h3>
          <div className="flex items-center gap-2">
            {[0, 1, 2].map(s => (
              <div key={s} className={`w-2 h-2 rounded-full transition-colors ${step >= s ? 'bg-gold' : 'bg-sep/50'}`} />
            ))}
          </div>
          <button onClick={onClose} className="text-txt-dim hover:text-err text-sm transition-colors">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 0 && (
            <div className="space-y-3">
              <h4 className="text-txt-dim text-xs uppercase tracking-wider">Categoria</h4>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { cat: 'Arma', icon: '⚔', desc: 'Espadas, armas de fogo' },
                  { cat: 'Equipamento', icon: '🛡', desc: 'Armaduras, coletes' },
                  { cat: 'Utilidade', icon: '🔧', desc: 'Escutas, kits, tasers' },
                ].map(c => (
                  <button key={c.cat} onClick={() => { setItemCategory(c.cat); setSelectedType(''); setEquipType(null) }}
                    className={`border rounded-lg px-2 py-2.5 text-center transition-all ${itemCategory === c.cat ? 'border-gold/60 bg-gold/10 text-gold' : 'border-sep/40 bg-void/40 text-txt-dim hover:border-gold/30'}`}>
                    <span className="text-lg block mb-1">{c.icon}</span>
                    <span className="text-[10px] font-semibold block">{c.cat}</span>
                    <span className="text-[8px] text-txt-dim/50 block mt-0.5">{c.desc}</span>
                  </button>
                ))}
              </div>

              {itemCategory === 'Arma' && (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => selectType('custom')}
                    className={`text-left border rounded-lg p-2.5 transition-all hover:border-gold/40 ${selectedType === 'custom' ? 'border-gold/50 bg-gold/5' : 'border-sep/40 bg-void/40'}`}>
                    <span className="text-txt-main text-[11px] font-semibold">Personalizada</span>
                    <div className="text-[10px] mt-0.5 text-txt-dim/50">Nome, dano e imagem livres</div>
                  </button>
                  {WEAPONS.map(w => (
                    <button key={w.id} onClick={() => selectType(w.id)}
                      className={`text-left border rounded-lg p-2.5 transition-all hover:border-gold/40 ${selectedType === w.id ? 'border-gold/50 bg-gold/5' : 'border-sep/40 bg-void/40'}`}>
                      <span className="text-txt-main text-[11px] font-semibold">{w.name}</span>
                      <div className="flex gap-3 mt-0.5 text-[10px]">
                        <span className="text-red-400/70 font-mono">{w.dano}</span>
                        <span className="text-txt-dim/50">{w.attr}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {itemCategory === 'Equipamento' && (
                <div className="grid grid-cols-2 gap-2">
                  {EQUIPMENT_TYPES.filter(t => t.id !== 'utilidade').map(et => (
                    <button key={et.id} onClick={() => { setEquipType(et.id); setSelectedType(et.id); setNome(et.label); setEfeitos(et.desc); setDano(''); setStep(1) }}
                      className={`text-left border rounded-lg p-2.5 transition-all hover:border-gold/40 ${equipType === et.id ? 'border-primary/50 bg-primary/5' : 'border-sep/40 bg-void/40'}`}>
                      <span className="text-txt-main text-[11px] font-semibold">{et.label}</span>
                      <div className="text-[10px] mt-0.5 text-txt-dim/50">{et.desc}</div>
                      <div className="text-[9px] mt-1 text-primary/60 font-mono">CA base: +{et.caBase}{et.penalty ? ` | DES ${et.penalty}` : ''}</div>
                    </button>
                  ))}
                  <div className="col-span-2 mt-2">
                    <h5 className="text-txt-dim text-[10px] uppercase tracking-wider mb-1">Set (opcional)</h5>
                    <div className="flex flex-wrap gap-1">
                      {SET_BONUSES.map(s => (
                        <button key={s.id} onClick={() => setSetId(setId === s.id ? null : s.id)}
                          className={`text-[9px] px-2 py-1 rounded border transition-colors ${setId === s.id ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-400' : 'border-sep/30 text-txt-dim/50 hover:border-sep/50'}`}>
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {itemCategory === 'Utilidade' && (
                <div className="grid grid-cols-2 gap-2">
                  {SIMPLE_ITEMS.map(si => (
                    <button key={si.id} onClick={() => { setEquipType('utilidade'); setSelectedType(si.id); setNome(si.nome); setDescricao(si.desc); setEfeitos(si.efeito); setDano(''); setStep(1) }}
                      className={`text-left border rounded-lg p-2.5 transition-all hover:border-gold/40 ${selectedType === si.id ? 'border-sky-400/50 bg-sky-400/5' : 'border-sep/40 bg-void/40'}`}>
                      <span className="text-txt-main text-[11px] font-semibold">{si.nome}</span>
                      <div className="text-[10px] mt-0.5 text-txt-dim/50 leading-snug">{si.efeito}</div>
                      <div className="text-[9px] mt-1 text-sky-400/60 font-mono">{si.peso} kg</div>
                    </button>
                  ))}
                  <button onClick={() => { setEquipType('utilidade'); setSelectedType('custom_util'); setNome(''); setDescricao(''); setEfeitos(''); setDano(''); setStep(1) }}
                    className={`text-left border rounded-lg p-2.5 transition-all hover:border-gold/40 border-dashed border-sep/30 bg-void/20`}>
                    <span className="text-txt-dim/60 text-[11px] font-semibold">Personalizado</span>
                    <div className="text-[10px] mt-0.5 text-txt-dim/40">Item customizado</div>
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <h4 className="text-txt-dim text-xs uppercase tracking-wider">
                {itemCategory === 'Arma' ? 'Rank da arma' : itemCategory === 'Equipamento' ? 'Rank do equipamento' : 'Detalhes do item'}
              </h4>
              {itemCategory === 'Utilidade' ? (
                <div className="space-y-3">
                  <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do item"
                    className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-xs text-txt-main focus:border-gold/40 focus:outline-none" />
                  <textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descrição" rows={2}
                    className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-[11px] text-txt-main resize-none focus:border-gold/40 focus:outline-none" />
                  <input type="text" value={efeitos} onChange={e => setEfeitos(e.target.value)} placeholder="Efeito mecânico"
                    className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-xs text-txt-main focus:border-gold/40 focus:outline-none" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {WEAPON_RANKS.map(r => {
                    const rc = RANK_COLORS[r.rank]
                    const rarity = EQUIPMENT_RARITIES.find(er => er.rank === r.rank)
                    return (
                      <button key={r.rank} onClick={() => setSelectedRank(r.rank)}
                        className={`text-left border rounded-lg p-2.5 transition-all ${selectedRank === r.rank ? `${rc.border} ${rc.bg} ${rc.glow}` : 'border-sep/40 bg-void/40 hover:border-sep/70'}`}>
                        <span className={`text-xs font-semibold ${rc.text}`}>{r.rank}</span>
                        <div className="text-[10px] mt-0.5 text-txt-dim/60 space-y-0.5">
                          {itemCategory === 'Arma' && (
                            <>
                              <div>Dano: <span className="text-red-400/70 font-mono">{r.danoBonus || '—'}</span></div>
                              <div>+CA: <span className="font-mono">{r.caBonus}</span> · Slots: <span className="font-mono">{r.slots}</span></div>
                            </>
                          )}
                          {itemCategory === 'Equipamento' && rarity && (
                            <>
                              <div>+CA bônus: <span className="text-primary font-mono">{rarity.caBonus}</span></div>
                              <div>Passivas: <span className="font-mono">{rarity.passiveSlots}</span></div>
                            </>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <button onClick={() => fileRef.current?.click()}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-sep/50 flex flex-col items-center justify-center hover:border-gold/40 transition-colors shrink-0 bg-void/50 overflow-hidden group">
                  {preview ? (
                    <img src={preview} alt="" className="w-full h-full rounded-lg object-cover" />
                  ) : (
                    <>
                      <span className="text-txt-dim/40 text-lg group-hover:text-gold/50 transition-colors">📷</span>
                      <span className="text-txt-dim/30 text-[8px] mt-0.5">Imagem</span>
                    </>
                  )}
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
                <div className="flex-1 space-y-2">
                  <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome"
                    className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-xs text-txt-main focus:border-gold/40 focus:outline-none" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" value={dano} onChange={e => setDano(e.target.value)} placeholder="Dano"
                      className="bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-xs text-txt-main font-mono focus:border-gold/40 focus:outline-none" />
                    <input type="text" value={efeitos} onChange={e => setEfeitos(e.target.value)} placeholder="Efeitos"
                      className="bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-xs text-txt-main focus:border-gold/40 focus:outline-none" />
                  </div>
                  {itemCategory === 'Equipamento' && (
                    <label className="flex items-center gap-2 text-[10px] text-txt-dim cursor-pointer">
                      <input type="checkbox" checked={equipado} onChange={e => setEquipado(e.target.checked)} className="accent-gold" />
                      Equipado
                    </label>
                  )}
                </div>
              </div>
              <textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descrição (opcional)" rows={2}
                className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-[11px] text-txt-main resize-none focus:border-gold/40 focus:outline-none" />

              {itemCategory === 'Arma' && rankDef.slots > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-txt-dim text-[10px] uppercase tracking-wider">Habilidades ({rankDef.rank})</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono ${usedSlots > rankDef.slots ? 'text-err' : 'text-txt-dim'}`}>
                        Slots: {usedSlots}/{rankDef.slots}
                      </span>
                      {selectedType && (
                        <button
                          onClick={handleAIGenerate}
                          disabled={genLoading}
                          className="text-[9px] bg-purple-500/10 border border-purple-400/30 text-purple-400 px-2 py-0.5 rounded hover:bg-purple-500/20 transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          {genLoading && <span className="animate-spin inline-block w-2.5 h-2.5 border border-purple-400/40 border-t-purple-400 rounded-full" />}
                          {genLoading ? '...' : '✦ IA'}
                        </button>
                      )}
                    </div>
                  </div>
                  {genError && <p className="text-err text-[9px] mb-1.5">{genError}</p>}
                  {habilidades.map((h, i) => (
                    <div key={i} className="bg-void/40 border border-sep/30 rounded-lg p-2 mb-1.5 space-y-1.5">
                      <div className="flex gap-1.5">
                        <input type="text" value={h.nome} onChange={e => updateHab(i, { nome: e.target.value })} placeholder="Nome"
                          className="flex-1 bg-void/60 border border-sep/40 rounded px-2 py-1 text-[10px] text-txt-main focus:border-gold/40 focus:outline-none" />
                        <select value={h.potencia} onChange={e => updateHab(i, { potencia: e.target.value })}
                          className="bg-void/60 border border-sep/40 rounded px-2 py-1 text-[10px] text-txt-main">
                          {Object.entries(WEAPON_ABILITY_COST).map(([l, c]) => <option key={l} value={l}>{l} ({c})</option>)}
                        </select>
                        <select value={h.tipo || 'Ativa'} onChange={e => updateHab(i, { tipo: e.target.value })}
                          className="bg-void/60 border border-sep/40 rounded px-2 py-1 text-[10px] text-txt-main">
                          <option value="Ativa">Ativa</option>
                          <option value="Passiva">Passiva</option>
                        </select>
                        <button onClick={() => removeHab(i)} className="text-err/50 hover:text-err text-xs px-1 shrink-0">✕</button>
                      </div>
                      <textarea value={h.descricao || ''} onChange={e => updateHab(i, { descricao: e.target.value })} placeholder="Descrição da habilidade..." rows={2}
                        className="w-full bg-void/60 border border-sep/40 rounded px-2 py-1 text-[9px] text-txt-main resize-none focus:border-gold/40 focus:outline-none leading-relaxed" />
                      <input type="text" value={h.custo || ''} onChange={e => updateHab(i, { custo: e.target.value })} placeholder="Custo (ex: 2 PA, 1 Ação...)"
                        className="w-full bg-void/60 border border-sep/40 rounded px-2 py-1 text-[10px] text-txt-main focus:border-gold/40 focus:outline-none" />
                    </div>
                  ))}
                  {usedSlots < rankDef.slots && (
                    <button onClick={addHabilidade} className="text-gold/60 hover:text-gold text-[10px]">+ Habilidade</button>
                  )}
                </div>
              )}

              {itemCategory === 'Equipamento' && passiveSlotsAvail > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-txt-dim text-[10px] uppercase tracking-wider">Passivas ({selectedRank})</span>
                    <button
                      onClick={handleAIEquip}
                      disabled={genLoading}
                      className="text-[9px] bg-emerald-500/10 border border-emerald-400/30 text-emerald-400 px-2 py-0.5 rounded hover:bg-emerald-500/20 transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {genLoading && <span className="animate-spin inline-block w-2.5 h-2.5 border border-emerald-400/40 border-t-emerald-400 rounded-full" />}
                      {genLoading ? '...' : '✦ IA Equipe'}
                    </button>
                  </div>
                  {genError && <p className="text-err text-[9px] mb-1.5">{genError}</p>}
                  {passivas.map((p, i) => (
                    <div key={i} className="bg-void/40 border border-emerald-400/15 rounded-lg p-2.5 mb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-emerald-400 text-[10px] font-semibold">{p.nome}</span>
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">{p.tipo || 'Passiva'}</span>
                      </div>
                      <p className="text-txt-dim/70 text-[10px] leading-relaxed">{p.descricao}</p>
                      <p className="text-primary/60 text-[9px] font-mono mt-1">{p.efeito}</p>
                    </div>
                  ))}
                  {passivas.length === 0 && !genLoading && (
                    <p className="text-txt-dim/40 text-[10px] italic">Clique em "IA Equipe" para gerar passivas, ou deixe sem passivas.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-sep/30 flex justify-between shrink-0">
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)} className="text-txt-dim text-xs hover:text-txt-main px-3 py-1.5 transition-colors">← Voltar</button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={onClose} className="text-txt-dim text-xs hover:text-txt-main px-3 py-1.5 transition-colors">Cancelar</button>
            {step < 2 ? (
              <button onClick={() => setStep(step + 1)} disabled={step === 0 && !selectedType}
                className={`text-xs px-4 py-1.5 rounded-lg font-semibold transition-colors ${(step === 0 && !selectedType) ? 'bg-gold/20 text-void/40 cursor-not-allowed' : 'bg-gold text-void hover:bg-gold-light'}`}>
                Próximo →
              </button>
            ) : (
              <button onClick={handleSave} disabled={!nome.trim()}
                className={`text-xs px-4 py-1.5 rounded-lg font-semibold transition-colors ${nome.trim() ? 'bg-gold text-void hover:bg-gold-light' : 'bg-gold/20 text-void/40 cursor-not-allowed'}`}>
                Criar Equipamento
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function EquipDrawer({ item, canEdit, editMode, onEdit, onCancelEdit, onSaveEdit, onDelete, onClose, onImageChange, imgRef }) {
  const rc = RANK_COLORS[item.rank] || RANK_COLORS.Comum
  const [editNome, setEditNome] = useState(item.nome || '')
  const [editDesc, setEditDesc] = useState(item.descricao || '')
  const [editDano, setEditDano] = useState(item.dano || '')
  const [editEfeitos, setEditEfeitos] = useState(item.efeitos || '')
  const [editRank, setEditRank] = useState(item.rank || 'Comum')

  function handleSave() {
    onSaveEdit({ nome: editNome, descricao: editDesc, dano: editDano, efeitos: editEfeitos, rank: editRank })
    onCancelEdit()
  }

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/40 drawer-overlay" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-[360px] bg-deep border-l border-primary/15 shadow-2xl shadow-black/60 flex flex-col drawer-panel">
        <div className="px-4 py-3 border-b border-sep/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="font-cinzel text-primary text-xs uppercase tracking-wider">Equipamento</h3>
            {item.rank && <span className={`text-[8px] px-1.5 py-0.5 rounded border ${rc.badge}`}>{item.rank}</span>}
          </div>
          <button onClick={onClose} className="text-txt-dim hover:text-err text-sm transition-colors">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {editMode && canEdit ? (
            <>
              <div className="flex justify-center">
                <button onClick={() => imgRef.current?.click()}
                  className="w-24 h-24 rounded-lg border border-sep/40 flex items-center justify-center hover:border-gold/40 transition-colors overflow-hidden bg-void/50">
                  {item.imagem ? <img src={item.imagem} alt="" className="w-full h-full object-cover" /> : <span className="text-txt-dim/40 text-xl">📷</span>}
                </button>
                <input ref={imgRef} type="file" accept="image/*" onChange={onImageChange} className="hidden" />
              </div>
              <input type="text" value={editNome} onChange={e => setEditNome(e.target.value)} placeholder="Nome"
                className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-sm text-txt-main focus:border-gold/40 focus:outline-none" />
              <div>
                <label className="text-txt-dim/50 text-[9px] uppercase">Rank</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {WEAPON_RANKS.map(r => {
                    const c = RANK_COLORS[r.rank]
                    return (
                      <button key={r.rank} onClick={() => setEditRank(r.rank)}
                        className={`text-[9px] px-2 py-0.5 rounded border transition-colors ${editRank === r.rank ? `${c.badge}` : 'border-sep/30 text-txt-dim/50 hover:border-sep/60'}`}>
                        {r.rank}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-txt-dim/50 text-[9px] uppercase">Dano</label>
                  <input type="text" value={editDano} onChange={e => setEditDano(e.target.value)} placeholder="2d10+3"
                    className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-1.5 text-xs text-txt-main font-mono focus:border-gold/40 focus:outline-none" />
                </div>
                <div>
                  <label className="text-txt-dim/50 text-[9px] uppercase">Efeitos</label>
                  <input type="text" value={editEfeitos} onChange={e => setEditEfeitos(e.target.value)} placeholder="Efeitos"
                    className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-1.5 text-xs text-txt-main focus:border-gold/40 focus:outline-none" />
                </div>
              </div>
              <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Descrição" rows={3}
                className="w-full bg-void/60 border border-sep/40 rounded-lg px-3 py-2 text-xs text-txt-main resize-none focus:border-gold/40 focus:outline-none leading-relaxed" />
            </>
          ) : (
            <>
              {item.imagem && (
                <div className="flex justify-center">
                  <img src={item.imagem} alt="" className="w-28 h-28 rounded-lg object-cover border border-sep/30" />
                </div>
              )}
              <div>
                <h4 className="text-txt-main text-sm font-semibold">{item.nome || 'Equipamento'}</h4>
              </div>
              {item.dano && (
                <div className={`bg-void/50 border rounded-lg px-3 py-2 ${rc.border}`}>
                  <span className="text-txt-dim/50 text-[9px] uppercase">Dano</span>
                  <p className="text-red-400/90 text-sm font-mono mt-0.5">{item.dano}</p>
                </div>
              )}
              {item.efeitos && (
                <div className="bg-void/50 border border-sep/30 rounded-lg px-3 py-2">
                  <span className="text-txt-dim/50 text-[9px] uppercase">Efeitos</span>
                  <p className="text-txt-dim/80 text-xs mt-0.5 leading-relaxed">{item.efeitos}</p>
                </div>
              )}
              {(item.habilidades || []).length > 0 && (
                <div>
                  <span className="text-txt-dim/50 text-[9px] uppercase">Habilidades</span>
                  <div className="space-y-1.5 mt-1">
                    {(item.habilidades || []).map((h, i) => (
                      <div key={i} className={`bg-void/50 border rounded-lg px-2.5 py-2 ${rc.border}`}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-txt-main text-[11px] font-semibold">{h.nome || 'Hab'}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-sep/20 text-txt-dim/70 border border-sep/30">{h.potencia}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border ${h.tipo === 'Passiva' ? 'bg-blue-500/10 text-blue-400/80 border-blue-500/20' : 'bg-amber-500/10 text-amber-400/80 border-amber-500/20'}`}>
                            {h.tipo || 'Ativa'}
                          </span>
                          {h.custo && <span className="text-[9px] text-gold/70 ml-auto font-mono">{h.custo}</span>}
                        </div>
                        {h.descricao && <p className="text-txt-dim/60 text-[10px] mt-1 leading-relaxed">{h.descricao}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {item.descricao ? (
                <p className="text-txt-dim/80 text-xs leading-relaxed">{item.descricao}</p>
              ) : (
                <p className="text-txt-dim/30 text-xs italic">Sem descrição</p>
              )}
            </>
          )}
        </div>

        <div className="px-4 py-3 border-t border-sep/30 flex gap-2 shrink-0">
          {canEdit && !editMode && (
            <>
              <button onClick={onEdit} className="text-[10px] border border-gold/30 text-gold px-3 py-1.5 rounded-lg hover:bg-gold/10 transition-colors">Editar</button>
              <button onClick={onDelete} className="text-[10px] border border-err/30 text-err px-3 py-1.5 rounded-lg hover:bg-err/10 transition-colors">Excluir</button>
            </>
          )}
          {editMode && (
            <>
              <button onClick={handleSave} className="text-[10px] bg-gold text-void px-3 py-1.5 rounded-lg hover:bg-gold-light transition-colors font-semibold">Salvar</button>
              <button onClick={onCancelEdit} className="text-[10px] text-txt-dim hover:text-txt-main px-3 py-1.5 transition-colors">Cancelar</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
