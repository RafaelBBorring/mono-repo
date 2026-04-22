import { WEAPONS, WEAPON_RANKS, WEAPON_ABILITY_COST } from '../../data/weapons'
import { MARTIAL_ARTS, GRAU_LABELS } from '../../data/martialArts'

const SLOT_OPTIONS = Object.entries(WEAPON_ABILITY_COST)

export default function Step9WeaponMartial({ char, update, updateNested }) {
  const selectedWeapon = WEAPONS.find(w => w.id === char.arma)
  const selectedRank = WEAPON_RANKS.find(r => r.rank === char.armaRank) || WEAPON_RANKS[0]
  const usedSlots = (char.armaHabilidades || []).reduce((sum, h) => sum + (WEAPON_ABILITY_COST[h.potencia] || 0), 0)
  const availableSlots = selectedRank.slots

  const selectedArt = MARTIAL_ARTS.find(a => a.id === char.arteMarcial)
  const selectedGrau = char.arteMarcialGrau || 0

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-cinzel text-gold text-2xl mb-1">Etapa 9: Arma e Arte Marcial</h2>
        <p className="text-txt-dim text-sm mb-6">Escolha o equipamento e a técnica de combate do personagem.</p>
      </div>

      <section className="bg-deep border border-sep rounded-lg p-5 space-y-5">
        <h3 className="font-cinzel text-gold-light text-lg">Arma</h3>

        <div>
          <label className="block text-txt-dim text-sm mb-1">Tipo de Arma</label>
          <select
            value={char.arma || ''}
            onChange={e => update({
              arma: e.target.value || null,
              armaRank: 'Comum',
              armaHabilidades: [],
            })}
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
                  onClick={() => update({ armaRank: r.rank, armaHabilidades: [] })}
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
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-txt-dim text-sm">Habilidades da Arma</label>
              <span className={`text-xs font-mono ${usedSlots > availableSlots ? 'text-err' : 'text-ok'}`}>
                Slots: {usedSlots}/{availableSlots}
              </span>
            </div>

            {(char.armaHabilidades || []).map((hab, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={hab.nome || ''}
                  onChange={e => {
                    const arr = [...char.armaHabilidades]
                    arr[i] = { ...arr[i], nome: e.target.value }
                    update({ armaHabilidades: arr })
                  }}
                  placeholder="Nome da habilidade"
                  className="flex-1 bg-void border border-sep rounded px-3 py-2 text-sm text-txt-main"
                />
                <select
                  value={hab.potencia || 'Fraca'}
                  onChange={e => {
                    const arr = [...char.armaHabilidades]
                    arr[i] = { ...arr[i], potencia: e.target.value }
                    update({ armaHabilidades: arr })
                  }}
                  className="bg-void border border-sep rounded px-3 py-2 text-sm text-txt-main"
                >
                  {SLOT_OPTIONS.map(([label, cost]) => (
                    <option key={label} value={label}>{label} ({cost} slot)</option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    const arr = char.armaHabilidades.filter((_, j) => j !== i)
                    update({ armaHabilidades: arr })
                  }}
                  className="px-3 py-2 bg-err/20 text-err rounded text-sm hover:bg-err/30"
                >
                  ✕
                </button>
              </div>
            ))}

            {usedSlots < availableSlots && (
              <button
                onClick={() => {
                  const arr = [...(char.armaHabilidades || []), { nome: '', potencia: 'Fraca' }]
                  update({ armaHabilidades: arr })
                }}
                className="text-gold text-sm hover:text-gold-light transition-colors"
              >
                + Adicionar Habilidade
              </button>
            )}

            {usedSlots > availableSlots && (
              <p className="text-err text-xs mt-2">Custo total de slots excede o disponível!</p>
            )}
          </div>
        )}
      </section>

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
