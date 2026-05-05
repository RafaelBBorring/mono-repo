import { PROGRESSION } from '../../data/progression'
import { CLASSES } from '../../data/classes'
import { normalizeProgressionLabel, scaleTrainedSkillsReward } from '../../utils/progressionUtils'

export default function Step5Progression({ char, update, updateNested }) {
  const classe = char.classe
  const nivel = char.nivel || 1
  const choices = char.choices || {}
  const prog = PROGRESSION[classe]
  if (!prog) {
    return (
      <div className="text-txt-dim text-center py-8">
        Selecione uma classe na Etapa 3 para ver a progressão.
      </div>
    )
  }

  const CLASS_COLORS = {
    GUERREIRO: { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
    OPERATIVO: { text: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/30' },
    MISTICO: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  }
  const classColor = CLASS_COLORS[classe] || { text: 'text-gold', bg: 'bg-gold/10', border: 'border-gold/30' }

  const REWARD_COLORS = {
    vida_fixo: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: '❤' },
    energia_fixo: { text: 'text-sky-400', bg: 'bg-sky-500/10', icon: '⚡' },
    pe_fixo: { text: 'text-amber-400', bg: 'bg-amber-500/10', icon: '✦' },
    modulo: { text: 'text-orange-400', bg: 'bg-orange-500/10', icon: '⚙' },
    triagem_principal: { ...classColor, icon: '★' },
    sub_triagem: { text: 'text-gray-400', bg: 'bg-gray-500/10', icon: '◆' },
  }

  function getRewardColor(type) {
    return REWARD_COLORS[type] || { text: 'text-txt-main', bg: '', icon: '' }
  }

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
    <div className={`progression-stage progression-${String(classe).toLowerCase()} space-y-6`}>
      <div className="section-header text-primary mb-8">
        <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>trending_up</span>
        Progressão Nível a Nível
      </div>

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
                <tr key={n} className={`progression-row ${entry.rewards.map(r => `has-${r.type}`).join(' ')} border-b border-sep/50 hover:bg-panel/30`}>
                  <td className="py-2 pr-3 font-mono text-txt-main">{n}</td>
                  <td className="py-2 pr-3">
                    <div className="flex flex-wrap gap-1.5">
                      {entry.rewards.filter(r => r.type !== 'escolha').map((r, ri) => {
                        const rc = getRewardColor(r.type)
                        return (
                          <span key={ri} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono ${rc.text} ${rc.bg}`}>
                            {rc.icon && <span className="text-[10px]">{rc.icon}</span>}
                            {r.type === 'vida_fixo' ? `+${r.value} Vida`
                              : r.type === 'energia_fixo' ? `+${r.value} Energia`
                              : r.type === 'pe_fixo' ? `+${r.value} PE`
                              : r.type === 'pontos_esqueleto' ? `+${r.value} Esqueleto`
                              : r.type === 'modulo' ? `+${r.value} Módulo`
                              : r.type === 'pericias_treinadas' ? `+${scaleTrainedSkillsReward(r.value)} Perícias`
                              : r.type === 'peh' ? `+${r.value} PEH`
                              : r.type === 'triagem_principal' ? 'Triagem Principal'
                              : r.type === 'sub_triagem' ? 'Sub-Triagem'
                              : normalizeProgressionLabel(r.type)}
                          </span>
                        )
                      })}
                    </div>
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

      <div className="codex-card p-5">
        <h3 className="font-cinzel text-primary text-lg mb-3 tracking-wider">Bônus Totais da Progressão</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <TotalBadge label="Vida Fixo" value={totals.vida} color="text-emerald-400" />
          <TotalBadge label="Energia Fixo" value={totals.energia} color="text-sky-400" />
          <TotalBadge label="PE Fixo" value={totals.pe} color="text-amber-400" />
          <TotalBadge label="Pontos Esqueleto" value={totals.esqueleto} color="text-cyan-400" />
          <TotalBadge label="Módulos" value={totals.modulo} color="text-orange-400" />
          <TotalBadge label="Perícias Treinadas" value={totals.pericias} color="text-violet-400" />
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

function TotalBadge({ label, value, color = 'text-on-surface' }) {
  return (
    <div className="codex-card !bg-surface-container border border-primary/10 px-3 py-2 rounded">
      <div className="text-outline text-xs font-mono uppercase tracking-wider" style={{ fontSize: '10px' }}>{label}</div>
      <div className={`font-mono text-lg ${color}`}>{value > 0 ? `+${value}` : value}</div>
    </div>
  )
}
