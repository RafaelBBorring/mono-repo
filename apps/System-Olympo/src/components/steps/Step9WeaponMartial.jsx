import { useState } from 'react'
import { WEAPONS, WEAPON_RANKS, WEAPON_ABILITY_COST } from '../../data/weapons'
import { MARTIAL_ARTS, GRAU_LABELS } from '../../data/martialArts'
import { generateWeaponAbilities } from '../../services/aiService'

const SLOT_OPTIONS = Object.entries(WEAPON_ABILITY_COST)

export default function Step9WeaponMartial({ char, update, updateNested }) {
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [aiDesc, setAiDesc] = useState('')
  const [genLoading, setGenLoading] = useState(false)
  const [genError, setGenError] = useState('')
  const selectedWeapon = WEAPONS.find(w => w.id === char.arma)
  const selectedRank = WEAPON_RANKS.find(r => r.rank === char.armaRank) || WEAPON_RANKS[0]
  const availableSlots = selectedRank.slots
  const usedSlots = (char.armaHabilidades || []).reduce((sum, h) => sum + (WEAPON_ABILITY_COST[h.potencia] || 0), 0)

  const selectedArt = MARTIAL_ARTS.find(a => a.id === char.arteMarcial)
  const selectedGrau = char.arteMarcialGrau || 0

  function handleRankChange(rank) {
    update({ armaRank: rank, armaHabilidades: [] })
    setShowAIPanel(false)
    setAiDesc('')
    setGenError('')
  }

  function handleWeaponChange(armaId) {
    update({ arma: armaId || null, armaRank: 'Comum', armaEquipada: true, armaHabilidades: [] })
    setShowAIPanel(false)
    setAiDesc('')
    setGenError('')
  }

  function addHabilidade(potencia) {
    const cost = WEAPON_ABILITY_COST[potencia] || 0
    if (usedSlots + cost > availableSlots) return
    const arr = [...(char.armaHabilidades || []), { nome: '', potencia, descricao: '', tipo: 'Ativa', custo: '' }]
    update({ armaHabilidades: arr })
  }

  function removeHabilidade(i) {
    const arr = (char.armaHabilidades || []).filter((_, j) => j !== i)
    update({ armaHabilidades: arr })
  }

  async function handleAIGenerate() {
    if (!char.arma) return
    setGenLoading(true)
    setGenError('')
    try {
      const count = char.armaHabilidades?.length || 1
      const data = await generateWeaponAbilities(char, char.arma, char.armaRank || 'Comum', availableSlots, aiDesc, count)
      if (data.habilidades?.length) {
        let totalSlots = 0
        const fitting = []
        for (const h of data.habilidades) {
          const cost = WEAPON_ABILITY_COST[h.potencia] || 1
          if (totalSlots + cost <= availableSlots) {
            fitting.push({ ...h, potencia: h.potencia || 'Fraca', tipo: h.tipo || 'Ativa', custo: h.custo || '' })
            totalSlots += cost
          }
        }
        update({ armaHabilidades: fitting })
        setShowAIPanel(false)
        setAiDesc('')
      }
    } catch (err) {
      setGenError(err.message)
    } finally {
      setGenLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-cinzel text-gold text-2xl mb-1">Etapa 9: Arte Marcial</h2>
        <p className="text-txt-dim text-sm mb-6">Escolha a tecnica de combate do personagem. Armas e equipamentos ficam na Bolsa da ficha.</p>
      </div>

      {false && <section className="bg-deep border border-sep rounded-lg p-5 space-y-5">
        <h3 className="font-cinzel text-gold-light text-lg">Arma</h3>

        <div>
          <label className="block text-txt-dim text-sm mb-1">Tipo de Arma</label>
          <select
            value={char.arma || ''}
            onChange={e => handleWeaponChange(e.target.value)}
            className="w-full bg-void border border-sep rounded px-3 py-2 text-txt-main"
          >
            <option value="">— Nenhuma —</option>
            {WEAPONS.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>

        {selectedWeapon && (
          <div className="bg-void rounded-lg p-4 space-y-2 border border-sep">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-txt-dim">Dano Base</span>
                <p className="font-mono text-txt-main">{selectedWeapon.dano}</p>
              </div>
              <div>
                <span className="text-txt-dim">Atributo</span>
                <p className="font-mono text-txt-main">{selectedWeapon.attr}</p>
              </div>
              <div>
                <span className="text-txt-dim">Mecânica Única</span>
                <p className="text-txt-main text-xs">{selectedWeapon.mec}</p>
              </div>
            </div>
          </div>
        )}

        {selectedWeapon && (
          <div>
            <label className="block text-txt-dim text-sm mb-1">Rank da Arma</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {WEAPON_RANKS.map(r => (
                <button
                  key={r.rank}
                  onClick={() => handleRankChange(r.rank)}
                  className={`rounded px-3 py-2 text-sm border transition-colors ${
                    char.armaRank === r.rank
                      ? 'bg-gold text-void border-gold font-bold'
                      : 'bg-void text-txt-main border-sep hover:border-gold/50'
                  }`}
                >
                  <div className="font-semibold">{r.rank}</div>
                  <div className="text-xs mt-1 space-y-0.5">
                    <div>Dano: {r.danoBonus || '—'}</div>
                    <div>+CA: {r.caBonus}</div>
                    <div>Slots: {r.slots}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedWeapon && availableSlots > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-txt-dim text-sm">Habilidades da Arma</label>
              <span className={`text-xs font-mono ${usedSlots > availableSlots ? 'text-err' : usedSlots === availableSlots ? 'text-ok' : 'text-txt-main'}`}>
                Slots: {usedSlots}/{availableSlots}
              </span>
            </div>

            {(char.armaHabilidades || []).map((hab, i) => (
              <div key={i} className="bg-void border border-sep/60 rounded-lg p-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={hab.nome || ''}
                    onChange={e => {
                      const arr = [...char.armaHabilidades]
                      arr[i] = { ...arr[i], nome: e.target.value }
                      update({ armaHabilidades: arr })
                    }}
                    placeholder="Nome da habilidade"
                    className="flex-1 bg-deep border border-sep rounded px-3 py-1.5 text-sm text-txt-main"
                  />
                  <select
                    value={hab.potencia || 'Fraca'}
                    onChange={e => {
                      const newPotencia = e.target.value
                      const newCost = WEAPON_ABILITY_COST[newPotencia] || 0
                      const otherSlots = (char.armaHabilidades || []).reduce((sum, h, j) => j === i ? sum : sum + (WEAPON_ABILITY_COST[h.potencia] || 0), 0)
                      if (otherSlots + newCost > availableSlots) return
                      const arr = [...char.armaHabilidades]
                      arr[i] = { ...arr[i], potencia: newPotencia }
                      update({ armaHabilidades: arr })
                    }}
                    className="bg-deep border border-sep rounded px-3 py-1.5 text-sm text-txt-main"
                  >
                    {SLOT_OPTIONS.map(([label, cost]) => {
                      const otherSlots = (char.armaHabilidades || []).reduce((sum, h, j) => j === i ? sum : sum + (WEAPON_ABILITY_COST[h.potencia] || 0), 0)
                      const disabled = otherSlots + cost > availableSlots
                      return (
                        <option key={label} value={label} disabled={disabled}>
                          {label} ({cost} slot{cost > 1 ? 's' : ''}){disabled ? ' — sem espaço' : ''}
                        </option>
                      )
                    })}
                  </select>
                  <select
                    value={hab.tipo || 'Ativa'}
                    onChange={e => {
                      const arr = [...char.armaHabilidades]
                      arr[i] = { ...arr[i], tipo: e.target.value }
                      update({ armaHabilidades: arr })
                    }}
                    className="bg-deep border border-sep rounded px-3 py-1.5 text-sm text-txt-main"
                  >
                    <option value="Ativa">Ativa</option>
                    <option value="Passiva">Passiva</option>
                  </select>
                  <button onClick={() => removeHabilidade(i)} className="px-3 py-1.5 bg-err/20 text-err rounded text-sm hover:bg-err/30">
                    ✕
                  </button>
                </div>
                <textarea
                  value={hab.descricao || ''}
                  onChange={e => {
                    const arr = [...char.armaHabilidades]
                    arr[i] = { ...arr[i], descricao: e.target.value }
                    update({ armaHabilidades: arr })
                  }}
                  placeholder="Descrição da habilidade..."
                  rows={2}
                  className="w-full bg-deep border border-sep rounded px-3 py-1.5 text-xs text-txt-main resize-none"
                />
                <input
                  type="text"
                  value={hab.custo || ''}
                  onChange={e => {
                    const arr = [...char.armaHabilidades]
                    arr[i] = { ...arr[i], custo: e.target.value }
                    update({ armaHabilidades: arr })
                  }}
                  placeholder="Custo (ex: 2 PA, 1 Ação...)"
                  className="w-full bg-deep border border-sep rounded px-3 py-1.5 text-xs text-txt-main"
                />
              </div>
            ))}

            {usedSlots < availableSlots && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-txt-dim text-xs">Adicionar:</span>
                {SLOT_OPTIONS.map(([label, cost]) => {
                  const canAdd = usedSlots + cost <= availableSlots
                  return (
                    <button
                      key={label}
                      onClick={() => canAdd && addHabilidade(label)}
                      disabled={!canAdd}
                      className={`text-xs px-3 py-1 rounded border transition-colors ${
                        canAdd
                          ? 'bg-void border-gold/30 text-gold hover:bg-gold/10'
                          : 'bg-void/30 border-sep/20 text-txt-dim/30 cursor-not-allowed'
                      }`}
                    >
                      + {label} ({cost})
                    </button>
                  )
                })}
              </div>
            )}

            {usedSlots > 0 && (
              <div className="pt-2 border-t border-sep/20">
                {!showAIPanel ? (
                  <button
                    onClick={() => setShowAIPanel(true)}
                    className="bg-purple-500/10 border border-purple-400/30 text-purple-400 text-xs px-4 py-2 rounded hover:bg-purple-500/20 transition-colors"
                  >
                    ✦ Gerar com IA
                  </button>
                ) : (
                  <div className="bg-void/50 border border-purple-400/20 rounded-lg p-3 space-y-2">
                    <p className="text-txt-dim text-[10px]">Descreva o estilo de combate para a IA criar as habilidades:</p>
                    <textarea
                      value={aiDesc}
                      onChange={e => setAiDesc(e.target.value)}
                      placeholder="Ex: Uma espada que canaliza chamas. Golpes rápidos com explosões de fogo..."
                      rows={3}
                      className="w-full bg-void/60 border border-sep/40 rounded px-3 py-2 text-xs text-txt-main resize-none focus:border-purple-400/40 focus:outline-none"
                    />
                    {genError && <p className="text-err text-[10px]">{genError}</p>}
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setShowAIPanel(false)} className="text-txt-dim text-xs px-3 py-1.5 hover:text-txt-main transition-colors">
                        Cancelar
                      </button>
                      <button
                        onClick={handleAIGenerate}
                        disabled={genLoading}
                        className="bg-purple-500 text-white text-xs px-4 py-1.5 rounded font-semibold hover:bg-purple-400 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {genLoading && <span className="animate-spin inline-block w-3 h-3 border border-gold/30 border-t-gold rounded-full" />}
                        {genLoading ? 'Gerando...' : 'Gerar Habilidades'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>}

      <section className="bg-deep border border-sep rounded-lg p-5 space-y-5">
        <h3 className="font-cinzel text-gold-light text-lg">Arte Marcial</h3>

        <div>
          <label className="block text-txt-dim text-sm mb-1">Estilo de Arte Marcial</label>
          <select
            value={char.arteMarcial || ''}
            onChange={e => update({ arteMarcial: e.target.value || null, arteMarcialGrau: 0 })}
            className="w-full bg-void border border-sep rounded px-3 py-2 text-txt-main"
          >
            <option value="">— Nenhuma —</option>
            {MARTIAL_ARTS.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        {selectedArt && (
          <>
            <div>
              <label className="block text-txt-dim text-sm mb-1">Grau</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {GRAU_LABELS.map((label, gi) => (
                  <button
                    key={gi}
                    onClick={() => update({ arteMarcialGrau: gi })}
                    className={`rounded px-3 py-2 text-sm border transition-colors ${
                      selectedGrau === gi
                        ? 'bg-gold text-void border-gold font-bold'
                        : 'bg-void text-txt-main border-sep hover:border-gold/50'
                    }`}
                  >
                    <div className="font-semibold">{label}</div>
                    <div className="text-xs mt-1 text-left">{selectedArt.graus[gi].desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-void rounded-lg p-4 border border-gold/30">
              <p className="text-gold text-sm font-semibold mb-1">
                {selectedArt.name} — {selectedArt.graus[selectedGrau].nome}
              </p>
              <p className="text-txt-main text-sm">{selectedArt.graus[selectedGrau].desc}</p>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
