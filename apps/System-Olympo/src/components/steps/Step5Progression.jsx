import { PROGRESSION } from '../../data/progression'
import { CLASSES } from '../../data/classes'
import { normalizeProgressionLabel, scaleTrainedSkillsReward } from '../../utils/progressionUtils'

export default function Step5Progression({ char, update, updateNested }) {
  const classe = char.classe
  const nivel = char.nivel || 1
  const prog = PROGRESSION[classe]
  if (!prog) {
    return (
      <div className="text-txt-dim text-center py-8">
        Selecione uma classe na Etapa 2 para ver a progressão.
      </div>
    )
  }

  const choices = char.choices || {}

  const totals = { vida: 0, energia: 0, pe: 0, esqueleto: 0, modulo: 0, pericias: 0 }

  for (let n = 1; n <= nivel; n++) {
    const entry = prog[n]
    if (!entry) continue
    for (const r of entry.rewards) {
      if (r.type === 'escolha') {
        const chosen = choices[r.key]
        if (chosen) {
          const opt = r.options.find(o => o.key === chosen)
          if (opt) {
            for (const sr of opt.rewards) {
              accumulate(totals, sr)
            }
          }
        }
      } else {
        accumulate(totals, r)
      }
    }
  }

  function handleChoice(key, optionKey) {
    updateNested('choices', { [key]: optionKey })
  }

  return (
    <div className="space-y-6">
      <h2 className="font-cinzel text-gold text-xl">Etapa 5: Progressão Nível a Nível</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sep text-txt-dim text-left">
              <th className="py-2 pr-3 font-body w-16">Nível</th>
              <th className="py-2 pr-3 font-body">Recompensa</th>
              <th className="py-2 font-body w-48">Escolha</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: nivel }, (_, i) => i + 1).map(n => {
              const entry = prog[n]
              if (!entry) return null
              const hasChoice = entry.rewards.some(r => r.type === 'escolha')
              const choiceReward = entry.rewards.find(r => r.type === 'escolha')
              const hasTriagem = entry.rewards.some(r => r.type === 'triagem_principal')
              const hasSubTriagem = entry.rewards.some(r => r.type === 'sub_triagem')

              return (
                <tr key={n} className="border-b border-sep/50 hover:bg-panel/30">
                  <td className="py-2 pr-3 font-mono text-txt-main">{n}</td>
                  <td className="py-2 pr-3 text-txt-main">
                    <span>{normalizeProgressionLabel(entry.label)}</span>
                    {hasTriagem && (
                      <span className="ml-2 text-gold text-xs">
                        (Triagem Principal desbloqueada)
                      </span>
                    )}
                    {hasSubTriagem && (
                      <span className="ml-2 text-warn text-xs">
                        (Sub-Triagem desbloqueada)
                      </span>
                    )}
                  </td>
                  <td className="py-2">
                    {hasChoice && choiceReward && (
                      <div className="flex flex-col gap-1">
                        {choiceReward.options.map(opt => (
                          <label
                            key={opt.key}
                            className={`flex items-center gap-2 cursor-pointer px-2 py-1 rounded text-xs transition-colors ${
                              choices[choiceReward.key] === opt.key
                                ? 'bg-gold/20 text-gold border border-gold/40'
                                : 'text-txt-dim hover:text-txt-main'
                            }`}
                          >
                            <input
                              type="radio"
                              name={choiceReward.key}
                              checked={choices[choiceReward.key] === opt.key}
                              onChange={() => handleChoice(choiceReward.key, opt.key)}
                              className="accent-gold"
                            />
                            {opt.label}
                          </label>
                        ))}
                        {!choices[choiceReward.key] && (
                          <span className="text-err text-xs">Selecione uma opção</span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-deep border border-sep rounded p-4">
        <h3 className="font-cinzel text-gold text-lg mb-3">Bônus Totais da Progressão</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <TotalBadge label="Vida Fixo" value={totals.vida} />
          <TotalBadge label="Energia Fixo" value={totals.energia} />
          <TotalBadge label="PE Fixo" value={totals.pe} />
          <TotalBadge label="Pontos Esqueleto" value={totals.esqueleto} />
          <TotalBadge label="Módulos" value={totals.modulo} />
          <TotalBadge label="Perícias Treinadas" value={totals.pericias} />
        </div>
      </div>
    </div>
  )
}

function accumulate(totals, r) {
  switch (r.type) {
    case 'vida_fixo': totals.vida += r.value; break
    case 'energia_fixo': totals.energia += r.value; break
    case 'pe_fixo': totals.pe += r.value; break
    case 'pontos_esqueleto': totals.esqueleto += r.value; break
    case 'modulo': totals.modulo += r.value; break
    case 'pericias_treinadas': totals.pericias += scaleTrainedSkillsReward(r.value); break
  }
}

function TotalBadge({ label, value }) {
  return (
    <div className="bg-void border border-sep rounded px-3 py-2">
      <div className="text-txt-dim text-xs">{label}</div>
      <div className="font-mono text-txt-main text-lg">{value > 0 ? `+${value}` : value}</div>
    </div>
  )
}
