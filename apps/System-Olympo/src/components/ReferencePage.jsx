import { ATTRIBUTES, ATTR_LABELS, ATTR_ICONS, MODIFIER_TABLE, getModifier, ATTR_CAPS, getAttrCap } from '../data/attributes'
import { CLASSES } from '../data/classes'
import { PROGRESSION } from '../data/progression'
import { TRIAGES } from '../data/triages'
import { PERICIAS, GRAU_NAMES, GRAUS_BY_TIER } from '../data/pericias'
import { ALL_MODULES, MODULES_PASSIVE, MODULES_SPECIAL, MODULES_ACTIVE } from '../data/modules'
import { WEAPONS, WEAPON_RANKS, WEAPON_ABILITY_COST, RANK_LEVEL_BAND, WEAPON_LIMITS, MARTIAL_ARTS_LIMITS, LEGENDARY_WEAPONS } from '../data/weapons'
import { MARTIAL_ARTS, GRAU_LABELS as MA_GRAU_LABELS } from '../data/martialArts'
import { RACES, RACE_CATEGORIES, getAttrBonusText } from '../data/races'
import { ALCHEMY_FALLBACK_RITUALS } from '../data/alchemyFallbackRituals'
import { SPELL_FALLBACK_RITUALS, SPELL_TRADITIONS } from '../data/spellFallbackRituals'
import { RUNE_FALLBACK_RITUALS, RUNE_GRADES } from '../data/runeFallbackRituals'
import { ALCHEMY_TRAINING_RULES, BASE_RULES_BY_LEVEL, CLASS_AFFINITY, RACE_AFFINITY, SPACE_COST_BY_CIRCLE } from '../utils/alchemyRules'
import { SPELL_TRAINING_RULES } from '../utils/spellRules'
import { RUNE_TRAINING_RULES } from '../utils/runeRules'
import { getRuneGradeBadge, getTraditionBadge } from './MysticLibrarySection'
import { normalizeProgressionLabel } from '../utils/progressionUtils'
import { useState } from 'react'

const sections = [
  'Raças', 'Atributos', 'Classes', 'Progressão', 'Perícias',
  'Triagens', 'Módulos Passivos', 'Módulos Especiais', 'Módulos Ativos',
  'Armas', 'Ranks de Arma', 'Limites de Equipamento', 'Armas Lendárias', 'Artes Marciais', 'Alquimia', 'Feitiços', 'Runas', 'Criação de Personagem', 'Balanceamento',
]

export default function ReferencePage() {
  const [section, setSection] = useState('Atributos')

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="font-cinzel text-gold text-3xl mb-6 text-center">Referência do Sistema Olympo 2.0</h1>
      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        {sections.map(s => (
          <button key={s} onClick={() => setSection(s)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${section === s ? 'bg-gold text-void' : 'border border-sep text-txt-dim hover:border-gold hover:text-gold'}`}>
            {s}
          </button>
        ))}
      </div>
      <div className="bg-deep border border-sep rounded-lg p-6">
        {section === 'Raças' && <RacasSection />}
        {section === 'Atributos' && <AttributesSection />}
        {section === 'Classes' && <ClassesSection />}
        {section === 'Progressão' && <ProgressionSection />}
        {section === 'Perícias' && <PericiasSection />}
        {section === 'Triagens' && <TriagesSection />}
        {section === 'Módulos Passivos' && <ModulesSection items={MODULES_PASSIVE} title="Módulos Passivos" />}
        {section === 'Módulos Especiais' && <ModulesSection items={MODULES_SPECIAL} title="Módulos Especiais" special />}
        {section === 'Módulos Ativos' && <ModulesSection items={MODULES_ACTIVE} title="Módulos Ativos" active />}
        {section === 'Armas' && <WeaponsSection />}
        {section === 'Ranks de Arma' && <RanksSection />}
        {section === 'Limites de Equipamento' && <EquipLimitsSection />}
        {section === 'Armas Lendárias' && <LegendaryWeaponsSection />}
        {section === 'Artes Marciais' && <MartialArtsSection />}
        {section === 'Alquimia' && <AlchemySection />}
        {section === 'Feitiços' && <SpellsSection />}
        {section === 'Runas' && <RunesSection />}
        {section === 'Criação de Personagem' && <CreationGuideSection />}
        {section === 'Balanceamento' && <BalanceProtocolSection />}
      </div>
    </div>
  )
}

function RacasSection() {
  const [cat, setCat] = useState('all')
  const [expanded, setExpanded] = useState(null)

  const filtered = cat === 'all'
    ? Object.values(RACES)
    : Object.values(RACES).filter(r => r.category === cat)

  return (
    <div>
      <SectionTitle>Raças</SectionTitle>
      <p className="text-txt-dim text-sm mb-4">
        Cada raça oferece bônus de Camada 0, passivas raciais com valores mecânicos concretos, vantagens e desvantagens. A evolução separa poder (nível) de experiência (marcos narrativos).
      </p>

      <div className="mb-4 bg-void rounded-lg border border-sep p-4">
        <p className="text-gold text-xs font-semibold mb-2">Camada 0 — Bônus Raciais Inatos</p>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="bg-deep rounded-lg border border-sep/50 p-3">
            <span className="text-txt-dim">Bônus de Atributos</span>
            <div className="text-sky-400 font-mono mt-1">+/- direto em atributos base</div>
          </div>
          <div className="bg-deep rounded-lg border border-sep/50 p-3">
            <span className="text-txt-dim">Modificador de Vida</span>
            <div className="text-emerald-400 font-mono mt-1">+/- HP fixo na criação</div>
          </div>
          <div className="bg-deep rounded-lg border border-sep/50 p-3">
            <span className="text-txt-dim">Passivas Raciais</span>
            <div className="text-amber-300 font-mono mt-1">Habilidades com custo, dano e duração</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setCat('all')}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${cat === 'all' ? 'bg-gold text-void' : 'border border-sep text-txt-dim hover:border-gold hover:text-gold'}`}>
          Todas ({Object.keys(RACES).length})
        </button>
        {RACE_CATEGORIES.map(c => {
          const count = Object.values(RACES).filter(r => r.category === c.id).length
          return (
            <button key={c.id} onClick={() => setCat(c.id)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${cat === c.id ? `${c.title} ${c.color} border ${c.color.split(' ')[0]}` : 'border border-sep text-txt-dim hover:border-gold hover:text-gold'}`}>
              {c.label} ({count})
            </button>
          )
        })}
      </div>

      <div className="space-y-3">
        {filtered.map(race => {
          const isExpanded = expanded === race.id
          const catMeta = RACE_CATEGORIES.find(c => c.id === race.category) || RACE_CATEGORIES[0]
          return (
            <div key={race.id} className={`rounded-xl border ${catMeta.color} overflow-hidden`}>
              <button type="button" onClick={() => setExpanded(isExpanded ? null : race.id)}
                className="w-full px-5 py-3 flex items-center gap-4 text-left hover:bg-gold/[0.035] transition-colors">
                <span className="text-2xl shrink-0">{race.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-cinzel text-lg ${catMeta.title}`}>{race.name}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded border ${catMeta.badge}`}>{catMeta.label}</span>
                    <span className="text-txt-dim text-[11px] ml-1">{'⭐'.repeat(race.dificuldade || 1)}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-0.5 text-xs">
                    <span className="text-txt-dim">HP: <span className={race.layer0.hpMod >= 0 ? 'text-emerald-400' : 'text-red-400'}>{race.layer0.hpLabel || `${race.layer0.hpMod >= 0 ? '+' : ''}${race.layer0.hpMod}`}</span></span>
                    <span className="text-txt-dim">Atr: <span className="text-sky-400">{getAttrBonusText(race)}</span></span>
                    <span className="text-txt-dim">Passivas: <span className="text-amber-300">{race.passivasRaciais?.length || 0}</span></span>
                  </div>
                </div>
                <span className="text-txt-dim/40 text-sm shrink-0">{isExpanded ? '▲' : '▼'}</span>
              </button>

              {isExpanded && (
                <div className="px-5 pb-4 border-t border-sep/30 space-y-4">
                  <div className="pt-3">
                    <p className="text-txt-dim text-xs italic">{race.quote}</p>
                    <p className="text-txt-dim text-xs mt-2">{race.desc}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-void/60 rounded-lg p-3 border border-sep/30">
                      <div className="text-gold text-[11px] font-semibold mb-2 uppercase tracking-wider">Camada 0</div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-txt-dim">Atributos</span>
                          <span className="text-sky-400 font-mono">{getAttrBonusText(race)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-txt-dim">Vida</span>
                          <span className={`font-mono ${race.layer0.hpMod >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{race.layer0.hpLabel || `${race.layer0.hpMod >= 0 ? '+' : ''}${race.layer0.hpMod}`}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-void/60 rounded-lg p-3 border border-sep/30">
                      <div className="text-emerald-400 text-[11px] font-semibold mb-2 uppercase tracking-wider">Vantagens ({race.vantagens.length})</div>
                      <ul className="space-y-1">
                        {race.vantagens.map((v, i) => (
                          <li key={i} className="text-[11px] text-txt-dim flex gap-1.5">
                            <span className="text-emerald-400/60 shrink-0">+</span>
                            <span>{v}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-void/60 rounded-lg p-3 border border-red-400/15">
                      <div className="text-red-400 text-[11px] font-semibold mb-2 uppercase tracking-wider">Desvantagens ({race.desvantagens.length})</div>
                      <ul className="space-y-1">
                        {race.desvantagens.map((d, i) => (
                          <li key={i} className="text-[11px] text-txt-dim flex gap-1.5">
                            <span className="text-red-400/60 shrink-0">-</span>
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {race.passivasRaciais?.length > 0 && (
                    <div className="bg-void/60 rounded-lg p-4 border border-amber-300/15">
                      <div className="text-amber-300 text-[11px] font-semibold mb-3 uppercase tracking-wider">Passivas Raciais — Habilidades Inatas com Valores Mecânicos</div>
                      <div className="space-y-3">
                        {race.passivasRaciais.map((pr, i) => (
                          <div key={i} className="bg-deep rounded-lg p-3 border border-sep/40">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${pr.tipo === 'Ativa' ? 'bg-amber-300/15 text-amber-300 border border-amber-300/20' : 'bg-emerald-400/15 text-emerald-400 border border-emerald-400/20'}`}>
                                {pr.tipo}
                              </span>
                              <span className="text-txt-main font-semibold">{pr.nome}</span>
                            </div>
                            <p className="text-txt-main text-xs leading-relaxed">{pr.efeito}</p>
                            <div className="flex gap-4 mt-1.5 text-[11px]">
                              {pr.custo && <span className="text-txt-dim">Custo: <span className="text-amber-300">{pr.custo}</span></span>}
                              {pr.duracao && <span className="text-txt-dim">Duração: <span className="text-sky-400">{pr.duracao}</span></span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {race.layer0.requiresDeus && race.deuses && (
                    <div className="bg-void/60 rounded-lg p-4 border border-amber-300/20">
                      <div className="text-amber-300 text-[11px] font-semibold mb-3 uppercase tracking-wider">Deuses Possíveis — Linhagem do Semideus</div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-sep/40">
                              <th className="py-2 px-3 text-left text-txt-dim font-medium">Deus</th>
                              <th className="py-2 px-3 text-left text-txt-dim font-medium">Atributos</th>
                              <th className="py-2 px-3 text-left text-txt-dim font-medium">Traço Inato</th>
                              <th className="py-2 px-3 text-left text-txt-dim font-medium">Bônus Especial</th>
                            </tr>
                          </thead>
                          <tbody>
                            {race.deuses.map(d => (
                              <tr key={d.id} className="border-b border-sep/20 hover:bg-void/40">
                                <td className="py-2 px-3 font-cinzel text-amber-300 font-bold">{d.name}</td>
                                <td className="py-2 px-3 font-mono text-sky-400 text-[11px]">{Object.entries(d.attr).map(([a, v]) => `${v >= 0 ? '+' : ''}${v}${a}`).join(' ')}</td>
                                <td className="py-2 px-3 text-txt-main text-[11px]">{d.traco}</td>
                                <td className="py-2 px-3 text-txt-dim text-[11px]">{d.especial}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {race.formas && (
                    <div className="bg-void/60 rounded-lg p-4 border border-amber-300/20">
                      <div className="text-amber-300 text-[11px] font-semibold mb-3 uppercase tracking-wider">Formas Disponíveis (Dasariano)</div>
                      <div className="grid grid-cols-3 gap-3">
                        {race.formas.map((f, i) => (
                          <div key={i} className="bg-deep rounded-lg p-3 border border-sep/40">
                            <span className="font-semibold text-amber-300 text-sm">{f.nome}</span>
                            {Object.keys(f.attrBonus).length > 0 && (
                              <div className="text-sky-400 font-mono text-[11px] mt-1">{Object.entries(f.attrBonus).map(([a, v]) => `${v >= 0 ? '+' : ''}${v}${a}`).join(' ')}</div>
                            )}
                            {f.hpExtra > 0 && <span className="text-emerald-400 font-mono text-[11px] ml-2">+{f.hpExtra} HP</span>}
                            {f.garras && <span className="text-red-400 font-mono text-[11px] ml-2">Garras {f.garras}</span>}
                            <p className="text-txt-dim text-[11px] mt-1">{f.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-void/60 rounded-lg p-4 border border-sep/30">
                      <div className="text-gold text-[11px] font-semibold mb-3 uppercase tracking-wider">Evolução de Poder (por Nível)</div>
                      <div className="space-y-1.5">
                        {race.progressaoPoder.map((p, i) => (
                          <div key={i} className="flex gap-3 items-start text-xs py-1">
                            <span className="shrink-0 w-12 text-center font-mono font-bold rounded px-1.5 py-0.5 text-[10px] bg-gold/10 text-gold border border-gold/20">N{p.nivel}</span>
                            <div className="flex-1">
                              <span className="text-txt-main font-semibold">{p.ganho}</span>
                              <span className="text-txt-dim ml-1">— {p.desc}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {race.marcosExperiencia?.length > 0 && (
                      <div className="bg-void/60 rounded-lg p-4 border border-purple-400/15">
                        <div className="text-purple-400 text-[11px] font-semibold mb-3 uppercase tracking-wider">Marcos de Experiência (conquistas narrativas)</div>
                        <div className="space-y-1.5">
                          {race.marcosExperiencia.map((item, i) =>
                            item.marcos ? (
                              <div key={i} className="space-y-1.5">
                                <div className="flex items-center gap-2 text-xs py-1">
                                  <span className="shrink-0 w-4 text-center text-purple-400 text-sm">◆</span>
                                  <span className="text-purple-300 font-cinzel font-bold">{item.titulo}</span>
                                  <span className="text-txt-dim text-[10px]">— {item.desc}</span>
                                </div>
                                {item.marcos.map((m, j) => (
                                  <div key={j} className="flex gap-3 items-start text-xs py-1 pl-5">
                                    <span className="shrink-0 w-4 text-center text-purple-400/60 text-xs">◇</span>
                                    <div className="flex-1">
                                      <span className="text-txt-main font-semibold">{m.marco}</span>
                                      <span className="text-emerald-400 ml-1">→ {m.ganho}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div key={i} className="flex gap-3 items-start text-xs py-1">
                                <span className="shrink-0 w-4 text-center text-purple-400 text-sm">◆</span>
                                <div className="flex-1">
                                  <span className="text-txt-main font-semibold">{item.marco}</span>
                                  <span className="text-emerald-400 ml-1">→ {item.ganho}</span>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getDiffStars(n) {
  return '⭐'.repeat(n || 1)
}

function SectionTitle({ children }) {
  return <h2 className="font-cinzel text-gold text-2xl mb-4">{children}</h2>
}

function AttributesSection() {
  return (
    <div>
      <SectionTitle>Atributos (Esqueleto)</SectionTitle>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
        {ATTRIBUTES.map(a => (
          <div key={a} className="bg-void rounded-lg p-3 text-center border border-sep">
            <div className="text-2xl">{ATTR_ICONS[a]}</div>
            <div className="text-gold font-cinzel text-sm mt-1">{a}</div>
            <div className="text-txt-dim text-xs">{ATTR_LABELS[a]}</div>
          </div>
        ))}
      </div>
      <h3 className="text-gold-light text-lg mb-2">Tabela de Modificadores</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sep text-txt-dim">
              <th className="py-2 px-3 text-left">Valor</th>
              <th className="py-2 px-3 text-left">Modificador</th>
            </tr>
          </thead>
          <tbody>
            {MODIFIER_TABLE.map((row, i) => (
              <tr key={i} className="border-b border-sep/50">
                <td className="py-1.5 px-3 font-mono text-txt-main">{row.min}–{row.max}</td>
                <td className="py-1.5 px-3 font-mono text-txt-main">{row.mod >= 0 ? '+' : ''}{row.mod}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-txt-dim text-sm mt-3">Fórmula: Math.floor((valor - 10) / 2), limitado pela tabela canônica acima.</p>

      <h3 className="text-gold-light text-lg mb-2 mt-6">Limites de Atributos por Faixa de Nível</h3>
      <p className="text-txt-dim text-sm mb-3">Após distribuir o Array + Pontos de Esqueleto, nenhum atributo pode exceder o limite da faixa.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sep text-txt-dim">
              <th className="py-2 px-3 text-left">Faixa de Nível</th>
              <th className="py-2 px-3 text-left">Limite Máx por Atributo</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(ATTR_CAPS).map(([tier, cap]) => (
              <tr key={tier} className="border-b border-sep/50">
                <td className="py-1.5 px-3 font-mono text-txt-main">N{tier}</td>
                <td className="py-1.5 px-3 font-mono text-gold">{cap}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const CLASS_META = {
  GUERREIRO: { border: 'border-red-500/40', bg: 'bg-red-500/5', title: 'text-red-400', stat: 'text-red-300', vida: '100+(CON×5)', vidaN: '8+Mod.CON', energia: '25+(AM×2)', energiaN: '2+Mod.AM', icon: '⚔️' },
  OPERATIVO:  { border: 'border-sky-500/40', bg: 'bg-sky-500/5', title: 'text-sky-400', stat: 'text-sky-300', vida: '70+(CON×5)', vidaN: '6+Mod.CON', energia: '35+(AM×2)', energiaN: '4+Mod.AM', icon: '🎯' },
  MISTICO:    { border: 'border-purple-500/40', bg: 'bg-purple-500/5', title: 'text-purple-400', stat: 'text-purple-300', vida: '50+(CON×5)', vidaN: '4+Mod.CON', energia: '50+(AM×2)', energiaN: '6+Mod.AM', icon: '✨' },
}

function StatRow({ label, value, color = 'text-txt-main' }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-sep/20 last:border-0">
      <span className="text-txt-dim text-xs">{label}</span>
      <span className={`font-mono text-xs font-medium ${color}`}>{value}</span>
    </div>
  )
}

function ClassesSection() {
  return (
    <div className="space-y-6">
      <SectionTitle>Classes</SectionTitle>
      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(CLASSES).map(([key, cls]) => {
          const meta = CLASS_META[key] || CLASS_META.GUERREIRO
          return (
            <div key={key} className={`rounded-xl border ${meta.border} ${meta.bg} overflow-hidden`}>
              <div className={`px-4 py-3 border-b ${meta.border}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{meta.icon}</span>
                  <h3 className={`font-cinzel text-xl ${meta.title}`}>{cls.name}</h3>
                </div>
                <p className="text-txt-dim text-xs">{cls.desc}</p>
              </div>
              <div className="px-4 py-3 space-y-0.5">
                <StatRow label="Vida Base" value={meta.vida} color="text-emerald-400" />
                <StatRow label="Vida / Nível" value={meta.vidaN} color="text-emerald-300" />
                <StatRow label="Energia Base" value={meta.energia} color="text-sky-400" />
                <StatRow label="Energia / Nível" value={meta.energiaN} color="text-sky-300" />
                <StatRow label="PE Base" value={String(cls.peBase)} color="text-blue-400" />
                <StatRow label="PE / Nível" value={String(cls.pePorNivel)} color="text-blue-300" />
                <StatRow label="Dano Base" value={`${cls.danoBase} + Mod.FOR`} color="text-red-400" />
                <StatRow label="Perícias Iniciais" value={String(cls.periciasIniciais)} color="text-teal-400" />
              </div>
              <div className={`px-4 pb-3`}>
                <p className="text-txt-dim text-[10px] mb-1">Triagens disponíveis:</p>
                <div className="flex flex-wrap gap-1">
                  {cls.triages.map(t => (
                    <span key={t} className={`text-[10px] px-2 py-0.5 rounded font-mono border ${meta.border} ${meta.title}`}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="bg-void rounded-xl border border-gold/20 p-4">
        <h3 className="text-gold-light font-cinzel text-base mb-3">Combate Derivado</h3>
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          <div className="bg-deep rounded-lg p-3 border border-sep/40">
            <div className="text-txt-dim text-xs mb-1">CA</div>
            <div className="text-txt-main font-mono text-xs">10 + treino(Reflexo/Bloqueio) + MAX(Mod.CON, Mod.DES)</div>
          </div>
          <div className="bg-deep rounded-lg p-3 border border-sep/40">
            <div className="text-txt-dim text-xs mb-1">Reações</div>
            <div className="text-txt-main font-mono text-xs">⌊DES ÷ 5⌋ (mínimo 1)</div>
          </div>
          <div className="bg-deep rounded-lg p-3 border border-sep/40">
            <div className="text-txt-dim text-xs mb-1">Percepção Passiva</div>
            <div className="text-txt-main font-mono text-xs">d10 + treino(Percepção) + Mod.INT</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function colorizeLabel(label) {
  // Tokenizes a label string and wraps keywords in colored spans
  const parts = []
  let remaining = label
  const rules = [
    { re: /\+\d+ PEH/g,                 cls: 'text-amber-300 font-semibold' },
    { re: /Triagem Principal[^&|,]*/g,     cls: 'text-purple-400' },
    { re: /Sub-Triagem[^&|,]*/g,           cls: 'text-pink-400' },
    { re: /\+\d+ Módulo[^&|,]*/g,         cls: 'text-orange-400' },
    { re: /ESCOLHA:[^$]*/g,               cls: 'text-yellow-300' },
    { re: /\+[\d]+ Vida[^&|,]*/g,         cls: 'text-emerald-400' },
    { re: /\+[\d]+ Energia[^&|,]*/g,      cls: 'text-sky-400' },
    { re: /\+[\d]+ PE[^&|,]*/g,           cls: 'text-blue-400' },
    { re: /\+[\d]+ Pontos de Esqueleto[^&|,]*/g, cls: 'text-txt-main' },
    { re: /\+[\d]+ Perícias[^&|,]*/g,     cls: 'text-teal-400' },
  ]
  // Simple approach: split on && and OU, color each chunk
  const tokens = label.split(/(&&|\bOU\b)/)
  return tokens.map((tok, i) => {
    tok = tok.trim()
    if (tok === '&&') return <span key={i} className="text-sep mx-1">&&</span>
    if (tok === 'OU')  return <span key={i} className="text-yellow-300 font-bold mx-1">OU</span>
    // Match one of the rules
    if (/PEH/.test(tok))                               return <span key={i} className="text-amber-300 font-semibold">{tok}</span>
    if (/Triagem Principal/.test(tok))                 return <span key={i} className="text-purple-400">{tok}</span>
    if (/Sub-Triagem/.test(tok))                       return <span key={i} className="text-pink-400">{tok}</span>
    if (/Módulo de Evolução/.test(tok))                return <span key={i} className="text-orange-400">{tok}</span>
    if (/ESCOLHA/.test(tok))                           return <span key={i} className="text-yellow-300">{tok}</span>
    if (/Vida/.test(tok))                              return <span key={i} className="text-emerald-400">{tok}</span>
    if (/Energia/.test(tok))                           return <span key={i} className="text-sky-400">{tok}</span>
    if (/\bPE\b/.test(tok))                           return <span key={i} className="text-blue-400">{tok}</span>
    if (/Perícias/.test(tok))                          return <span key={i} className="text-teal-400">{tok}</span>
    if (/Pontos de Esqueleto/.test(tok))               return <span key={i} className="text-txt-main">{tok}</span>
    return <span key={i} className="text-txt-main">{tok}</span>
  })
}

function rowBg(label) {
  if (/PEH/.test(label))               return 'bg-amber-300/5 border-b border-amber-300/10'
  if (/Sub-Triagem/.test(label))       return 'bg-pink-400/5 border-b border-sep/50'
  if (/Triagem Principal/.test(label)) return 'bg-purple-400/5 border-b border-sep/50'
  if (/Módulo de Evolução/.test(label))return 'bg-orange-400/5 border-b border-sep/50'
  return 'border-b border-sep/50'
}

function ProgressionSection() {
  const [cls, setCls] = useState('GUERREIRO')
  const prog = PROGRESSION[cls]

  const legend = [
    { color: 'bg-amber-300', label: 'PEH — Pontos de Evolução de Habilidade' },
    { color: 'bg-purple-400', label: 'Triagem Principal' },
    { color: 'bg-pink-400',   label: 'Sub-Triagem' },
    { color: 'bg-orange-400', label: 'Módulo de Evolução' },
    { color: 'bg-emerald-400',label: 'Vida' },
    { color: 'bg-sky-400',    label: 'Energia' },
    { color: 'bg-blue-400',   label: 'PE (Pontos de Esqueleto de classe)' },
    { color: 'bg-teal-400',   label: 'Perícias Treinadas' },
    { color: 'bg-yellow-300', label: 'Escolha do jogador' },
  ]

  return (
    <div>
      <SectionTitle>Progressão de Nível</SectionTitle>
      <div className="flex gap-2 mb-4">
        {Object.keys(CLASSES).map(c => (
          <button key={c} onClick={() => setCls(c)}
            className={`px-4 py-2 rounded font-cinzel text-sm transition-colors ${cls === c ? 'bg-gold text-void' : 'border border-gold text-gold hover:bg-gold hover:text-void'}`}>
            {CLASSES[c].name}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-5 p-3 bg-void rounded-lg border border-sep">
        {legend.map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${l.color}`} />
            <span className="text-xs text-txt-dim">{l.label}</span>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sep text-txt-dim">
              <th className="py-2 px-3 text-left w-16">Nível</th>
              <th className="py-2 px-3 text-left">Habilidades</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(prog).map(([lvl, entry]) => (
              <tr key={lvl} className={`hover:brightness-125 transition-all ${rowBg(entry.label)}`}>
                <td className="py-2 px-3 font-mono text-gold font-bold">{lvl}</td>
                <td className="py-2 px-3">{colorizeLabel(normalizeProgressionLabel(entry.label))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PericiasSection() {
  return (
    <div>
      <SectionTitle>Perícias (19)</SectionTitle>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        {PERICIAS.map(p => (
          <div key={p.name} className="bg-void rounded px-3 py-2 border border-sep flex justify-between items-center">
            <span className="text-txt-main">{p.name}</span>
            <span className="text-txt-dim text-xs font-mono">{p.attrs.join('/')}</span>
          </div>
        ))}
      </div>
      <h3 className="text-gold-light text-lg mb-2">Graus de Treinamento por Faixa</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sep text-txt-dim">
              <th className="py-2 px-3 text-left">Faixa</th>
              <th className="py-2 px-3 text-left">Grau Máximo</th>
              <th className="py-2 px-3 text-left">Bônus</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(GRAUS_BY_TIER).map(([tier, info]) => (
              <tr key={tier} className="border-b border-sep/50">
                <td className="py-1.5 px-3 font-mono text-txt-main">N{tier}</td>
                <td className="py-1.5 px-3 text-gold">{info.nome}</td>
                <td className="py-1.5 px-3 font-mono text-txt-main">+{info.bonus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TriagesSection() {
  const [cls, setCls] = useState('GUERREIRO')
  const triages = TRIAGES[cls]

  return (
    <div>
      <SectionTitle>Triagens</SectionTitle>
      <div className="mb-4">
        <p className="text-txt-dim text-sm mb-3">
          <strong className="text-txt-main">Triagem Principal:</strong> obrigatoriamente da mesma Classe. 6 níveis (0.1→0.6).<br />
          <strong className="text-txt-main">Sub-Triagem:</strong> qualquer Classe (inclui a própria). Máx 3 níveis (0.1→0.3). Disponível a partir de N16.
        </p>
        <div className="flex gap-2">
          {Object.keys(TRIAGES).map(cc => {
            const meta = CLASS_META[cc] || CLASS_META.GUERREIRO
            return (
              <button key={cc} onClick={() => setCls(cc)}
                className={`px-4 py-2 rounded font-cinzel text-sm transition-colors ${cls === cc ? `${meta.bg} border ${meta.border} ${meta.title}` : 'border border-sep text-txt-dim hover:border-gold hover:text-gold'}`}>
                {CLASSES[cc].name}
              </button>
            )
          })}
        </div>
      </div>
      {(() => {
        const meta = CLASS_META[cls] || CLASS_META.GUERREIRO
        return (
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(triages).map(([key, t]) => (
              <div key={key} className={`rounded-xl border ${meta.border} ${meta.bg} overflow-hidden`}>
                <div className={`px-4 py-3 border-b ${meta.border}`}>
                  <h3 className={`font-cinzel text-lg ${meta.title}`}>{t.name}</h3>
                  <p className="text-txt-dim text-xs mt-0.5">{t.desc}</p>
                </div>
                <div className="px-4 py-3 space-y-2">
                  {Object.entries(t.levels).map(([lvl, desc]) => (
                    <div key={lvl} className="flex gap-3 items-start">
                      <span className={`shrink-0 w-10 h-7 rounded border ${meta.border} ${meta.bg} flex items-center justify-center ${meta.title} font-mono text-xs font-bold`}>{lvl}</span>
                      <span className="text-txt-main text-xs leading-relaxed">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      })()}
    </div>
  )
}

function ModulesSection({ items, title, active, special }) {
  const accentColor = active ? 'text-blue-400 border-blue-400/30 bg-blue-400/5' : special ? 'text-orange-400 border-orange-400/30 bg-orange-400/5' : 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5'
  const nameColor   = active ? 'text-blue-300' : special ? 'text-orange-300' : 'text-emerald-300'
  return (
    <div>
      <SectionTitle>{title}</SectionTitle>
      {active  && <p className="text-blue-400/80 text-sm mb-3 bg-blue-400/5 border border-blue-400/20 rounded px-3 py-2">⚡ Módulos Ativos custam PE para ativar. São acionados como uma ação no combate.</p>}
      {special && <p className="text-orange-400/80 text-sm mb-3 bg-orange-400/5 border border-orange-400/20 rounded px-3 py-2">★ Módulos Especiais podem ser adquiridos múltiplas vezes até o limite indicado.</p>}
      <div className="space-y-2">
        {items.map(m => (
          <div key={m.id} className={`rounded-lg border p-3 ${accentColor} bg-void/40`}>
            <div className="flex items-start justify-between gap-3 mb-1">
              <div className="flex items-center gap-2">
                <span className={`font-cinzel text-sm font-bold ${nameColor}`}>{m.name}</span>
                {active  && <span className="text-[10px] font-mono bg-blue-400/20 text-blue-300 px-1.5 py-0.5 rounded">{m.pe} PE</span>}
                {special && m.maxBuy && <span className="text-[10px] font-mono bg-orange-400/20 text-orange-300 px-1.5 py-0.5 rounded">até {m.maxBuy}×</span>}
              </div>
              {m.req && <span className="text-[10px] text-txt-dim shrink-0 text-right">{m.req}</span>}
            </div>
            <p className="text-txt-main text-xs leading-relaxed">{m.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function WeaponsSection() {
  return (
    <div>
      <SectionTitle>Armas</SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sep text-txt-dim">
              <th className="py-2 px-3 text-left">Nome</th>
              <th className="py-2 px-3 text-left">Dano</th>
              <th className="py-2 px-3 text-left">Attr</th>
              <th className="py-2 px-3 text-left">Mecânica Única</th>
            </tr>
          </thead>
          <tbody>
            {WEAPONS.map(w => (
              <tr key={w.id} className="border-b border-sep/50 hover:bg-void/50">
                <td className="py-2 px-3 text-gold font-medium">{w.name}</td>
                <td className="py-2 px-3 font-mono text-red-400 font-medium">{w.dano}</td>
                <td className="py-2 px-3 text-sky-400 font-mono text-xs">{w.attr}</td>
                <td className="py-2 px-3 text-txt-main text-xs">{w.mec}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RanksSection() {
  const rankColorMap = ['text-txt-dim','text-emerald-400','text-sky-400','text-purple-400','text-rose-400','text-amber-300','text-fuchsia-400','text-cyan-300']
  return (
    <div>
      <SectionTitle>Ranks de Arma (8 Patentes)</SectionTitle>
      <p className="text-txt-dim text-sm mb-4">Cada rank define o poder da arma e mapeia para uma faixa de nível equivalente usada pela IA para balancear habilidades.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sep text-txt-dim">
              <th className="py-2 px-3 text-left">Rank</th>
              <th className="py-2 px-3 text-left">Faixa Equiv.</th>
              <th className="py-2 px-3 text-left">Dano Bônus</th>
              <th className="py-2 px-3 text-left">CA Bônus</th>
              <th className="py-2 px-3 text-left">Slots</th>
            </tr>
          </thead>
          <tbody>
            {WEAPON_RANKS.map((r, i) => (
              <tr key={r.rank} className="border-b border-sep/50 hover:bg-void/60">
                <td className={`py-2 px-3 font-cinzel font-bold ${rankColorMap[i] || 'text-gold'}`}>{r.rank}</td>
                <td className="py-2 px-3 font-mono text-gold/70 text-xs">{RANK_LEVEL_BAND[r.rank]}</td>
                <td className="py-2 px-3 font-mono text-red-400">{r.danoBonus || '—'}</td>
                <td className="py-2 px-3 font-mono text-sky-400">+{r.caBonus}</td>
                <td className="py-2 px-3 font-mono text-orange-400">{r.slots}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-txt-dim text-sm mt-3">Custo de slot por tipo de habilidade: Fraca=1 | Média=2 | Forte=3</p>
    </div>
  )
}

function EquipLimitsSection() {
  return (
    <div className="space-y-6">
      <SectionTitle>Limites de Equipamento por Nível</SectionTitle>
      <p className="text-txt-dim text-sm mb-4">O nível do personagem define quantas armas ele pode equipar, qual o rank máximo permitido, quantas artes marciais pode praticar e qual grau pode alcançar.</p>

      <div className="bg-void rounded-xl border border-gold/20 p-4">
        <h3 className="text-gold text-sm font-semibold mb-3">Armas por Faixa de Nível</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sep/40">
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Nível Mínimo</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Máx Armas</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Rank Máximo</th>
              </tr>
            </thead>
            <tbody>
              {WEAPON_LIMITS.map((l, i) => (
                <tr key={i} className="border-b border-sep/20 hover:bg-void/40">
                  <td className="py-2 px-3 font-mono text-gold">N{l.minLevel}+</td>
                  <td className="py-2 px-3 font-mono text-orange-400">{l.maxWeapons}</td>
                  <td className="py-2 px-3 font-cinzel text-amber-300">{l.maxRank}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-void rounded-xl border border-orange-400/20 p-4">
        <h3 className="text-orange-400 text-sm font-semibold mb-3">Artes Marciais por Faixa de Nível</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sep/40">
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Nível Mínimo</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Máx Artes Marciais</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Grau Máximo</th>
              </tr>
            </thead>
            <tbody>
              {MARTIAL_ARTS_LIMITS.map((l, i) => (
                <tr key={i} className="border-b border-sep/20 hover:bg-void/40">
                  <td className="py-2 px-3 font-mono text-orange-400">N{l.minLevel}+</td>
                  <td className="py-2 px-3 font-mono text-txt-main">{l.maxArts}</td>
                  <td className="py-2 px-3 text-orange-300">{MA_GRAU_LABELS[l.maxGrau]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-void/40 border border-sep/30 rounded-lg p-3 text-xs text-txt-dim space-y-1">
        <p className="text-gold font-semibold text-sm mb-1">Observações</p>
        <p>• Personagens começam com 1 arma no rank Comum (Nível 1).</p>
        <p>• O rank da arma limita as habilidades disponíveis e o poder máximo que a IA atribui.</p>
        <p>• Artes Marciais seguem progressão de grau: Novato → Treinado → Formado → Especialista.</p>
        <p>• Apenas a partir de N23 um personagem pode ter 2 artes marciais simultâneas.</p>
      </div>
    </div>
  )
}

function LegendaryWeaponsSection() {
  return (
    <div className="space-y-6">
      <SectionTitle>Armas Lendárias</SectionTitle>
      <p className="text-txt-dim text-sm mb-4">
        Armas Lendárias são itens únicos e exclusivos da narrativa. Qualquer jogador pode <span className="text-amber-300">visualizar</span> as armas lendárias existentes,
        mas <span className="text-amber-300 font-semibold">apenas o Mestre (Admin)</span> pode atribuí-las a personagens específicos.
      </p>

      <div className="bg-void rounded-xl border border-amber-400/20 p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-amber-400 text-lg">★</span>
          <h3 className="text-amber-400 font-cinzel text-base">Como Funciona</h3>
        </div>
        <ul className="space-y-1.5 text-xs text-txt-dim">
          <li>• Armas Lendárias possuem habilidades fixas e balanceadas para o rank Lendário ou superior.</li>
          <li>• Elas são <span className="text-amber-300">atributos narrativos</span> — não podem ser compradas, apenas concedidas pelo Mestre.</li>
          <li>• Uma vez atribuída, a arma substitui ou complementa o arsenal do personagem.</li>
          <li>• O Mestre define quando e como a arma entra na campanha.</li>
        </ul>
      </div>

      <div className="space-y-4">
        {LEGENDARY_WEAPONS.map(lw => (
          <div key={lw.id} className="bg-void/60 border border-amber-400/20 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-2xl">⚔</div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-300 font-cinzel text-lg font-bold">{lw.name}</span>
                  <span className="text-[10px] bg-amber-400/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-400/20">{lw.rank}</span>
                  <span className="text-[10px] text-txt-dim">{lw.tipo}</span>
                </div>
                <p className="text-txt-dim text-xs mt-0.5">{lw.descricao}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="bg-deep rounded-lg border border-sep/30 p-2 text-center">
                <span className="text-txt-dim text-[9px] uppercase">Dano</span>
                <p className="text-red-400 font-mono text-sm">{lw.dano}</p>
              </div>
              <div className="bg-deep rounded-lg border border-sep/30 p-2 text-center">
                <span className="text-txt-dim text-[9px] uppercase">Atributo</span>
                <p className="text-txt-main font-mono text-sm">{lw.attr}</p>
              </div>
              <div className="bg-deep rounded-lg border border-sep/30 p-2 text-center">
                <span className="text-txt-dim text-[9px] uppercase">Rank</span>
                <p className="text-amber-400 font-mono text-sm">{lw.rank}</p>
              </div>
            </div>

            <div className="bg-deep rounded-lg border border-sep/30 p-2.5 mb-3">
              <span className="text-txt-dim text-[9px] uppercase">Mecânica Única</span>
              <p className="text-gold/80 text-xs mt-0.5 leading-relaxed">{lw.mec}</p>
            </div>

            {(lw.habilidades || []).length > 0 && (
              <div>
                <span className="text-amber-400 text-[10px] uppercase tracking-wider font-semibold">Habilidades</span>
                <div className="space-y-1.5 mt-2">
                  {(lw.habilidades || []).map((h, i) => (
                    <div key={i} className="bg-amber-400/5 border border-amber-400/15 rounded-lg p-2.5">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-amber-300 text-xs font-semibold">{h.nome}</span>
                        <span className="text-[9px] bg-amber-400/10 text-amber-400 px-1.5 py-0.5 rounded">{h.potencia}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${h.tipo === 'Passiva' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-sky-400/10 text-sky-400'}`}>{h.tipo}</span>
                        {h.custo && <span className="text-[9px] text-gold/60 font-mono ml-auto">{h.custo}</span>}
                      </div>
                      <p className="text-txt-dim text-[11px] leading-relaxed">{h.descricao}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function MartialArtsSection() {
  return (
    <div>
      <SectionTitle>Artes Marciais</SectionTitle>
      <p className="text-txt-dim text-sm mb-4">Usadas desarmado. Graus: Novato → Treinado → Formado → Especialista.</p>
      <div className="grid gap-4 md:grid-cols-2">
        {MARTIAL_ARTS.map(art => (
          <div key={art.id} className="bg-void rounded-lg p-4 border border-sep">
            <h3 className="text-gold font-cinzel text-lg mb-2">{art.name}</h3>
            <div className="space-y-2">
              {[0, 1, 2, 3].map(g => {
                const grau = art.graus[g]
                return (
                  <div key={g} className="flex gap-2 items-start">
                    <span className={`shrink-0 px-2 py-1 rounded text-xs font-semibold ${g === 0 ? 'bg-sep text-txt-dim' : g === 1 ? 'bg-gold/20 text-gold' : g === 2 ? 'bg-gold/30 text-gold-light' : 'bg-gold/50 text-gold-light'}`}>
                      {grau.nome}
                    </span>
                    <span className="text-txt-main text-sm">{grau.desc}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AlchemySection() {
  const [expanded, setExpanded] = useState(null)
  const circleGuides = [
    { circle: 1, label: '1o Circulo', focus: 'Uso frequente, baixo risco, efeitos curtos.', examples: 'Mobilidade, pequenos debuffs, empurroes, buffs basicos.' },
    { circle: 2, label: '2o Circulo', focus: 'Ferramentas de combate consistentes.', examples: 'Defesas reativas, zonas pequenas, dano medio, mutacoes pontuais.' },
    { circle: 3, label: '3o Circulo', focus: 'Rituais de pressao alta e custo real.', examples: 'Cura forte, colapsos localizados, perda parcial de acao, controle reativo.' },
    { circle: 4, label: '4o Circulo', focus: 'Fenomenos catastroficos e risco severo ao Veu.', examples: 'Areas devastadoras, estase ampla, colapso energetico, picos corporais.' },
  ]

  const classRows = Object.entries(CLASS_AFFINITY).map(([key, value]) => ({
    name: key,
    budget: value.budget,
    circle: value.circle,
    notes: value.notes.join(' '),
  }))

  const raceRows = Object.entries(RACE_AFFINITY)
    .filter(([, value]) => value.budget !== 0 || value.circle !== 0 || value.notes.length > 0)
    .map(([key, value]) => ({
      name: key,
      budget: value.budget,
      circle: value.circle,
      notes: value.notes.join(' '),
    }))
    .sort((a, b) => (b.budget + b.circle) - (a.budget + a.circle) || a.name.localeCompare(b.name))

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle>Alquimia</SectionTitle>
        <p className="text-txt-dim text-sm">
          Alquimia e o estudo ritual do Abismo, dos Regentes e das Entidades do Limiar. Qualquer personagem pode aprender, mas nivel, grau de treinamento em Alquimia, classe e raca definem quantos espacos ritualisticos consegue sustentar sem quebrar o Veu cedo demais.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-void/60 rounded-xl border border-teal-400/20 p-4">
          <div className="text-teal-300 text-xs font-semibold uppercase tracking-wider mb-2">Como funciona</div>
          <p className="text-txt-dim text-sm leading-relaxed">
            Cada ritual consome PE, pertence a um circulo e nasce de uma origem. O personagem escolhe rituais na finalizacao da ficha, respeitando espacos disponiveis, limite por circulo e nivel minimo.
          </p>
        </div>
        <div className="bg-void/60 rounded-xl border border-purple-400/20 p-4">
          <div className="text-purple-300 text-xs font-semibold uppercase tracking-wider mb-2">Origem do ritual</div>
          <p className="text-txt-dim text-sm leading-relaxed">
            Alem da categoria, cada ritual mostra seu <span className="text-purple-300">Regente Original</span> ou entidade-fonte. Isso ajuda a identificar a escola metafisica da formula e o tipo de risco narrativo envolvido.
          </p>
        </div>
        <div className="bg-void/60 rounded-xl border border-amber-300/20 p-4">
          <div className="text-amber-300 text-xs font-semibold uppercase tracking-wider mb-2">Risco ao Veu</div>
          <p className="text-txt-dim text-sm leading-relaxed">
            Quanto maior o circulo, maior a tensao no Veu. Rituais de 4o circulo costumam tocar a Camada 3 do protocolo e exigem custos, contrapesos e rupturas mais severas.
          </p>
        </div>
      </div>

      <div className="bg-void rounded-xl border border-sep p-4">
        <div className="text-gold text-sm font-semibold mb-3">Base por nivel</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sep/40">
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Faixa</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Espacos base</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Circulo maximo</th>
                <th className="py-2 px-3 text-left text-txt-dim font-medium">Limites</th>
              </tr>
            </thead>
            <tbody>
              {BASE_RULES_BY_LEVEL.map((rule) => (
                <tr key={rule.maxLevel} className="border-b border-sep/20 hover:bg-void/40">
                  <td className="py-2 px-3 text-txt-main">Nivel 1-{rule.maxLevel}</td>
                  <td className="py-2 px-3 font-mono text-teal-300">{rule.spaceBudget}</td>
                  <td className="py-2 px-3 font-mono text-gold">{rule.maxCircle}o circulo</td>
                  <td className="py-2 px-3 text-txt-dim text-xs">1o:{rule.maxByCircle[1]} | 2o:{rule.maxByCircle[2]} | 3o:{rule.maxByCircle[3]} | 4o:{rule.maxByCircle[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-void rounded-xl border border-sep p-4">
        <div className="text-gold text-sm font-semibold mb-3">Treinamento em Alquimia</div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          {Object.entries(ALCHEMY_TRAINING_RULES).map(([level, info]) => (
            <div key={level} className="bg-deep rounded-lg border border-sep/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-cinzel text-teal-300">{info.label}</span>
                <span className="text-[10px] bg-sep/20 text-txt-dim px-1.5 py-0.5 rounded">Grau {level}</span>
              </div>
              <div className="mt-2 space-y-1 text-xs">
                <div className="text-txt-dim">Espacos: <span className="text-gold font-mono">{info.budget >= 0 ? '+' : ''}{info.budget}</span></div>
                <div className="text-txt-dim">Teto de circulo: <span className="text-sky-300 font-mono">{info.maxCircle}o</span></div>
                <p className="text-txt-dim leading-relaxed">{info.notes.join(' ')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-void rounded-xl border border-sep p-4">
          <div className="text-gold text-sm font-semibold mb-3">O que a classe te concede</div>
          <div className="space-y-2">
            {classRows.map((row) => (
              <div key={row.name} className="bg-deep rounded-lg border border-sep/30 p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-txt-main font-semibold">{row.name}</span>
                  <span className="text-[10px] bg-teal-400/10 text-teal-300 px-1.5 py-0.5 rounded border border-teal-400/20">
                    {row.budget >= 0 ? '+' : ''}{row.budget} espacos
                  </span>
                  <span className="text-[10px] bg-gold/10 text-gold px-1.5 py-0.5 rounded border border-gold/20">
                    {row.circle >= 0 ? '+' : ''}{row.circle} circulo
                  </span>
                </div>
                <p className="text-txt-dim text-xs mt-2">{row.notes}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-void rounded-xl border border-sep p-4">
          <div className="text-gold text-sm font-semibold mb-3">O que a raça te concede ou limita</div>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {raceRows.map((row) => (
              <div key={row.name} className="bg-deep rounded-lg border border-sep/30 p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-txt-main font-semibold">{row.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${row.budget >= 0 ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' : 'bg-red-400/10 text-red-400 border-red-400/20'}`}>
                    {row.budget >= 0 ? '+' : ''}{row.budget} espacos
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${row.circle >= 0 ? 'bg-gold/10 text-gold border-gold/20' : 'bg-red-400/10 text-red-400 border-red-400/20'}`}>
                    {row.circle >= 0 ? '+' : ''}{row.circle} circulo
                  </span>
                </div>
                <p className="text-txt-dim text-xs mt-2">{row.notes}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-void rounded-xl border border-sep p-4">
        <div className="text-gold text-sm font-semibold mb-3">Leitura dos circulos</div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {circleGuides.map((guide) => (
            <div key={guide.circle} className="bg-deep rounded-lg border border-sep/30 p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-cinzel text-teal-300">{guide.label}</span>
                <span className="text-[10px] bg-sep/20 text-txt-dim px-1.5 py-0.5 rounded">{SPACE_COST_BY_CIRCLE[guide.circle]} espacos</span>
              </div>
              <p className="text-txt-main text-xs leading-relaxed">{guide.focus}</p>
              <p className="text-txt-dim text-xs leading-relaxed mt-2">{guide.examples}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-void rounded-xl border border-sep p-4">
        <div className="text-gold text-sm font-semibold mb-3">Exemplos da biblioteca</div>
        <div className="space-y-3">
          {ALCHEMY_FALLBACK_RITUALS.slice(0, 6).map((ritual) => {
            const isExpanded = expanded === ritual.id
            return (
              <div key={ritual.id} className="rounded-lg border border-sep/30 bg-deep/80 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpanded(isExpanded ? null : ritual.id)}
                  className="w-full px-4 py-3 text-left hover:bg-void/30 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-txt-main font-semibold">{ritual.name}</span>
                    <span className="text-[10px] bg-teal-400/10 text-teal-300 px-1.5 py-0.5 rounded border border-teal-400/20">{ritual.circle}o circulo</span>
                    <span className="text-[10px] bg-sep/20 text-txt-dim px-1.5 py-0.5 rounded">{ritual.category}</span>
                    <span className="text-[10px] bg-purple-400/10 text-purple-300 px-1.5 py-0.5 rounded border border-purple-400/20">{ritual.source_name}</span>
                  </div>
                  <p className="text-txt-dim text-xs mt-1">{ritual.short_description}</p>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-sep/20 space-y-2">
                    <div className="pt-3 flex flex-wrap gap-2 text-[11px] font-mono">
                      <span className="text-amber-300">{ritual.pe_cost} PE</span>
                      <span className="text-gold">{SPACE_COST_BY_CIRCLE[ritual.circle]} espacos</span>
                      <span className="text-sky-300">{ritual.action_cost}</span>
                      <span className="text-txt-dim">{ritual.range}</span>
                      <span className="text-red-300">Ruptura {ritual.rupture_risk}/4</span>
                    </div>
                    <p className="text-txt-main text-xs leading-relaxed">{ritual.effect}</p>
                    <p className="text-txt-dim text-xs"><span className="text-purple-300">Lei:</span> {ritual.law_name}</p>
                    <p className="text-txt-dim text-xs"><span className="text-amber-300">Contrapeso:</span> {ritual.price}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SpellsSection() {
  const [expanded, setExpanded] = useState(null)

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle>Feitiços</SectionTitle>
        <p className="text-txt-dim text-sm">
          Feitiços são repertórios opcionais de conjuração. Na prática, o sistema diferencia <span className="text-emerald-300">Bruxaria</span> e <span className="text-sky-300">Arcana</span>, mantendo a mesma economia de espaços por círculo usada na Alquimia para evitar explosão de complexidade.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-void rounded-xl border border-sep p-4">
          <div className="text-gold text-sm font-semibold mb-3">Quem realmente acessa Feitiços</div>
          <ul className="space-y-2 text-xs text-txt-dim">
            <li><span className="text-emerald-300 font-semibold">Bruxas</span>, <span className="text-emerald-300 font-semibold">Elfos</span>, <span className="text-sky-300 font-semibold">Magos</span> e <span className="text-gold font-semibold">Humanos Místicos</span> sustentam repertórios melhores.</li>
            <li><span className="text-purple-300 font-semibold">Místicos</span> de outras raças também podem estudar, mas com orçamento menor.</li>
            <li>Se a ficha não gira em torno do arcano, o ideal é deixar o sistema desligado e manter só habilidades base, arma e módulos.</li>
          </ul>
        </div>

        <div className="bg-void rounded-xl border border-sep p-4">
          <div className="text-gold text-sm font-semibold mb-3">Treino usado no cálculo</div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            {Object.entries(SPELL_TRAINING_RULES).map(([level, info]) => (
              <div key={level} className="bg-deep rounded-lg border border-sep/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-cinzel text-emerald-300">{info.label}</span>
                  <span className="text-[10px] bg-sep/20 text-txt-dim px-1.5 py-0.5 rounded">Poder {level}</span>
                </div>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="text-txt-dim">Espaços: <span className="text-gold font-mono">{info.budget >= 0 ? '+' : ''}{info.budget}</span></div>
                  <div className="text-txt-dim">Teto: <span className="text-sky-300 font-mono">{info.maxCircle}o</span></div>
                  <p className="text-txt-dim leading-relaxed">{info.notes.join(' ')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-void rounded-xl border border-sep p-4">
        <div className="text-gold text-sm font-semibold mb-3">Tradições de Feitiço</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SPELL_TRADITIONS.map((tradition) => (
            <div key={tradition} className="bg-deep rounded-lg border border-sep/30 p-3">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${tradition === 'arcana' ? 'bg-sky-400/12 text-sky-300 border-sky-400/25' : 'bg-emerald-400/12 text-emerald-300 border-emerald-400/25'}`}>
                  {tradition === 'arcana' ? 'Arcana' : 'Bruxaria'}
                </span>
                <span className="text-txt-main font-semibold">{tradition === 'arcana' ? 'Magia Instantânea' : 'Conjuração de Bruxaria'}</span>
              </div>
              <p className="text-txt-dim text-xs mt-2 leading-relaxed">
                {tradition === 'arcana'
                  ? 'Foco em resposta rápida, rajadas, teleporte, barreiras e leitura estrutural. Magos e Humanos Místicos costumam liderar essa linha.'
                  : 'Foco em vínculo, maldição, cura, sacrifício, palavra proibida e interferência narrativa. Bruxas e linhagens mais ritualistas brilham aqui.'}
              </p>
            </div>
          ))}
        </div>
      </div>

      <MysticExamples
        title="Exemplos de Feitiços"
        items={SPELL_FALLBACK_RITUALS.slice(0, 6)}
        expanded={expanded}
        setExpanded={setExpanded}
        badgeGetter={getTraditionBadge}
      />
    </div>
  )
}

function RunesSection() {
  const [expanded, setExpanded] = useState(null)

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle>Runas</SectionTitle>
        <p className="text-txt-dim text-sm">
          Runas são fragmentos jogáveis derivados das Runas Primordiais. O sistema formaliza três graus de uso prático: <span className="text-emerald-300">Menores</span>, <span className="text-sky-300">Comuns</span> e <span className="text-amber-300">Maiores</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-void rounded-xl border border-sep p-4">
          <div className="text-gold text-sm font-semibold mb-3">Leitura rápida</div>
          <ul className="space-y-2 text-xs text-txt-dim">
            <li>Qualquer personagem pode optar por usar runas.</li>
            <li>O treino em <span className="text-sky-300 font-semibold">Poder</span> define quantas runas, quais círculos e quantas ficam <span className="text-gold font-semibold">ativas ao mesmo tempo</span>.</li>
            <li><span className="text-purple-300 font-semibold">Humano Aprimorado Rúnico</span> recebe uma folga extra de ativação e espaço.</li>
          </ul>
        </div>

        <div className="bg-void rounded-xl border border-sep p-4">
          <div className="text-gold text-sm font-semibold mb-3">Treino de vínculo rúnico</div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            {Object.entries(RUNE_TRAINING_RULES).map(([level, info]) => (
              <div key={level} className="bg-deep rounded-lg border border-sep/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-cinzel text-sky-300">{info.label}</span>
                  <span className="text-[10px] bg-sep/20 text-txt-dim px-1.5 py-0.5 rounded">Poder {level}</span>
                </div>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="text-txt-dim">Espaços: <span className="text-gold font-mono">{info.budget >= 0 ? '+' : ''}{info.budget}</span></div>
                  <div className="text-txt-dim">Ativas: <span className="text-purple-300 font-mono">{info.active}</span></div>
                  <div className="text-txt-dim">Teto: <span className="text-sky-300 font-mono">{info.maxCircle}o</span></div>
                  <p className="text-txt-dim leading-relaxed">{info.notes.join(' ')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-void rounded-xl border border-sep p-4">
        <div className="text-gold text-sm font-semibold mb-3">Graus de Runas</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {RUNE_GRADES.map((grade) => {
            const badge = getRuneGradeBadge({ tags: [`grade:${grade}`] })
            return (
              <div key={grade} className="bg-deep rounded-lg border border-sep/30 p-3">
                <div className={`inline-flex text-[10px] px-1.5 py-0.5 rounded border ${badge.className}`}>{badge.label}</div>
                <p className="text-txt-dim text-xs mt-2 leading-relaxed">
                  {grade === 'menor' && 'Ferramentas rápidas e legíveis para defesa curta, leitura e impacto simples.'}
                  {grade === 'comum' && 'Selos táticos robustos para zona, suporte, vínculo e mobilidade real.'}
                  {grade === 'maior' && 'Fragmentos muito mais próximos da origem, com custo alto e presença épica.'}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      <MysticExamples
        title="Exemplos de Runas"
        items={RUNE_FALLBACK_RITUALS.slice(0, 9)}
        expanded={expanded}
        setExpanded={setExpanded}
        badgeGetter={getRuneGradeBadge}
      />
    </div>
  )
}

function MysticExamples({ title, items, expanded, setExpanded, badgeGetter }) {
  return (
    <div className="bg-void rounded-xl border border-sep p-4">
      <div className="text-gold text-sm font-semibold mb-3">{title}</div>
      <div className="space-y-3">
        {items.map((item) => {
          const isExpanded = expanded === item.id
          const badge = badgeGetter(item)
          return (
            <div key={item.id} className="rounded-lg border border-sep/30 bg-deep/80 overflow-hidden">
              <button
                type="button"
                onClick={() => setExpanded(isExpanded ? null : item.id)}
                className="w-full px-4 py-3 text-left hover:bg-void/30 transition-colors"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-txt-main font-semibold">{item.name}</span>
                  <span className="text-[10px] bg-teal-400/10 text-teal-300 px-1.5 py-0.5 rounded border border-teal-400/20">{item.circle}o circulo</span>
                  <span className="text-[10px] bg-sep/20 text-txt-dim px-1.5 py-0.5 rounded">{item.category}</span>
                  {badge && <span className={`text-[10px] px-1.5 py-0.5 rounded border ${badge.className}`}>{badge.label}</span>}
                  <span className="text-[10px] bg-purple-400/10 text-purple-300 px-1.5 py-0.5 rounded border border-purple-400/20">{item.source_name}</span>
                </div>
                <p className="text-txt-dim text-xs mt-1">{item.short_description}</p>
              </button>
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-sep/20 space-y-2">
                  <div className="pt-3 flex flex-wrap gap-2 text-[11px] font-mono">
                    <span className="text-amber-300">{item.pe_cost} PE</span>
                    <span className="text-gold">{SPACE_COST_BY_CIRCLE[item.circle]} espacos</span>
                    <span className="text-sky-300">{item.action_cost}</span>
                    <span className="text-txt-dim">{item.range}</span>
                    <span className="text-red-300">Risco {item.rupture_risk}/4</span>
                  </div>
                  <p className="text-txt-main text-xs leading-relaxed">{item.effect}</p>
                  <p className="text-txt-dim text-xs"><span className="text-purple-300">Lei:</span> {item.law_name}</p>
                  <p className="text-txt-dim text-xs"><span className="text-amber-300">Contrapeso:</span> {item.price}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CreationGuideSection() {
  const steps = [
    { n: 1, title: 'Identidade', desc: 'Defina o nome e nível do personagem. O Mestre define qual tipo de Array (Balanceado, MinMax ou Extremo) está disponível para a campanha.' },
    { n: 2, title: 'Raça', desc: 'Escolha entre 13 raças divididas em 4 categorias (Humanoides, Sobrenaturais, Predatórias, Lendárias). Cada raça oferece bônus de atributos, modificadores de vida, traços inatos ativos/passivos, vantagens e desvantagens únicos.' },
    { n: 3, title: 'Esqueleto (Atributos)', desc: 'Distribua os 6 valores do Array escolhido entre os atributos FOR, DES, CON, INT, APA e AM. Cada valor só pode ser usado uma vez.' },
    { n: 4, title: 'Classe', desc: 'Escolha entre Guerreiro, Operativo ou Místico. Cada classe define Vida, Energia, PE, Dano Base e quantidade de perícias iniciais.' },
    { n: 5, title: 'Progressão', desc: 'Consulte a tabela de N1 até o nível atual da classe. Recompensas com "OU" exigem uma escolha do jogador. Anote triagens e módulos desbloqueados.' },
    { n: 6, title: 'Pontos de Esqueleto', desc: 'Distribua os Pontos de Esqueleto ganhos na progressão entre os atributos. Cada ponto em CON afeta retroativamente a Vida por Nível. O mesmo vale para AM (Energia).' },
    { n: 7, title: 'Triagens', desc: 'Escolha UMA Triagem Principal (da mesma classe). A partir de N16, pode escolher UMA Sub-Triagem de qualquer classe (máx nível 0.3). Não pode repetir a mesma triagem.' },
    { n: 8, title: 'Módulos de Evolução', desc: 'Gaste os Módulos de Evolução ganhos na progressão. Existem Passivos (sempre ativos), Especiais (aquisição múltipla) e Ativos (custam PE). Verifique os requisitos.' },
    { n: 9, title: 'Perícias', desc: 'Treine perícias usando os pontos disponíveis (classe + progressão). Cada grau custa 1 ponto. O grau máximo depende do nível: N1-7 Treinado, N8-13 Veterano, N14-22 Especialista, N23-30 Mestre.' },
    { n: 10, title: 'Habilidades', desc: 'Crie 5 habilidades: 1 Passiva, 3 Ativas e 1 Ultimate. Defina nome, descrição, custo de energia, dano, duração, camada SCP e PP estimado. Algumas triagens concedem habilidades extras.' },
    { n: 11, title: 'Revisão — Arma, Arte Marcial e Ficha Final', desc: 'Na tela de revisão, escolha sua Arma (19 disponíveis com mecânicas únicas) e seu Rank (Comum a Transcendente, 8 patentes). Opcionalmente escolha uma Arte Marcial (Boxe, Karatê, Muay Thai, Judô, Taekwondo, Aikido) com grau limitado pelo nível. Revise cálculos, use a IA para balancear, e finalize a ficha.' },
  ]

  return (
    <div>
      <SectionTitle>Guia de Criação de Personagem</SectionTitle>
      <p className="text-txt-dim text-sm mb-6">Passo a passo para criar um personagem do Sistema Olympo 2.0. Este guia também serve para criação manual.</p>
      <div className="space-y-4">
        {steps.map((s, idx) => {
          const stepColors = [
            'border-txt-dim/30 bg-txt-dim/5',
            'border-teal-400/30 bg-teal-400/5',
            'border-blue-400/30 bg-blue-400/5',
            'border-red-400/30 bg-red-400/5',
            'border-orange-400/30 bg-orange-400/5',
            'border-teal-400/30 bg-teal-400/5',
            'border-teal-400/30 bg-teal-400/5',
            'border-purple-400/30 bg-purple-400/5',
            'border-orange-400/30 bg-orange-400/5',
            'border-indigo-400/30 bg-indigo-400/5',
            'border-gold/30 bg-gold/5',
          ]
          const numColors = [
            'border-txt-dim text-txt-dim bg-txt-dim/10',
            'border-teal-400 text-teal-400 bg-teal-400/10',
            'border-blue-400 text-blue-400 bg-blue-400/10',
            'border-red-400 text-red-400 bg-red-400/10',
            'border-orange-400 text-orange-400 bg-orange-400/10',
            'border-teal-400 text-teal-400 bg-teal-400/10',
            'border-teal-400 text-teal-400 bg-teal-400/10',
            'border-purple-400 text-purple-400 bg-purple-400/10',
            'border-orange-400 text-orange-400 bg-orange-400/10',
            'border-indigo-400 text-indigo-400 bg-indigo-400/10',
            'border-gold text-gold bg-gold/10',
          ]
          return (
          <div key={s.n} className={`rounded-xl p-4 border ${stepColors[idx] || 'border-sep bg-void'}`}>
            <div className="flex items-start gap-3">
              <span className={`shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center font-cinzel font-bold text-base ${numColors[idx] || 'border-gold text-gold'}`}>{s.n}</span>
              <div>
                <h3 className="text-txt-main font-cinzel text-base mb-1">{s.title}</h3>
                <p className="text-txt-dim text-sm">{s.desc}</p>
              </div>
            </div>
          </div>
        )})}
      </div>
      <div className="mt-6 bg-void rounded-lg p-4 border border-gold/30">
        <h3 className="text-gold font-cinzel text-base mb-2">Regras Importantes</h3>
        <ul className="space-y-1 text-sm text-txt-main list-disc list-inside">
          <li><strong className="text-gold-light">Retroatividade:</strong> Pontos de Esqueleto em CON/AM afetam todos os níveis retroativamente.</li>
          <li><strong className="text-gold-light">CA:</strong> 10 + treinamento(Reflexo ou Bloqueio) + MAX(Mod.CON, Mod.DES)</li>
          <li><strong className="text-gold-light">Reações:</strong> Math.floor(DES / 5), mínimo 1</li>
          <li><strong className="text-gold-light">Percepção Passiva:</strong> 10 + treino_Percepção + Mod.INT</li>
          <li><strong className="text-gold-light">Triagens:</strong> Principal = mesma classe, 6 níveis. Sub-Triagem = qualquer classe, máx 3 níveis (N16+).</li>
          <li><strong className="text-gold-light">Módulos Especiais:</strong> Treino Intensivo (até 3×), Aumento de Poder (até 2×), Conhecimento Amplificado (até 4×).</li>
        </ul>
      </div>
    </div>
  )
}

// ─── SEÇÃO: PROTOCOLO DE BALANCEAMENTO ───────────────────────────────────────

function TableCard({ title, color = 'gold', children }) {
  const borderMap = { gold: 'border-gold/30', purple: 'border-purple-400/30', sky: 'border-sky-400/30', emerald: 'border-emerald-400/30', amber: 'border-amber-300/30' }
  const titleMap  = { gold: 'text-gold', purple: 'text-purple-400', sky: 'text-sky-400', emerald: 'text-emerald-400', amber: 'text-amber-300' }
  return (
    <div className={`bg-void rounded-xl border ${borderMap[color] || 'border-gold/30'} overflow-hidden`}>
      <div className={`px-4 py-2.5 border-b ${borderMap[color] || 'border-gold/30'} bg-void/80`}>
        <h3 className={`font-cinzel text-sm font-bold tracking-wider ${titleMap[color] || 'text-gold'}`}>{title}</h3>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}

function ProtoTable({ headers, rows, highlight }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-sep/60">
          {headers.map((h, i) => <th key={i} className="py-2 px-3 text-left text-txt-dim font-medium whitespace-nowrap">{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className={`border-b border-sep/30 ${highlight && highlight(row) ? 'bg-gold/5' : 'hover:bg-void/60'}`}>
            {row.map((cell, j) => (
              <td key={j} className={`py-2 px-3 font-mono whitespace-nowrap ${j === 0 ? 'text-gold font-bold' : 'text-txt-main'}`}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function BalanceProtocolSection() {
  const scpRows = [
    ['Camada 1 — Base', 'Treino de Perícia + Mod. Atributo', 'Sem limite', 'Sempre ativa, não consome slot'],
    ['Camada 2 — Tático', 'Habilidades, Triagens, Módulos', 'N1-7: +8 | N8-15: +12 | N16-22: +16 | N23-30: +20', 'Slot de habilidade / triagem'],
    ['Camada 3 — Épico',  'Armas, Runas, Artefatos',          'N1-7: +5 | N8-15: +8  | N16-22: +12 | N23-30: +16', 'Rank de arma / item mágico'],
  ]

  const tdhRows = [
    ['N1-7',   '3d8+12',  '4d10+18', '6d10+24',  '8d12+30'],
    ['N8-15',  '4d10+18', '6d10+25', '9d12+32',  '13d12+45'],
    ['N16-22', '6d12+25', '8d12+38', '12d12+50', '17d12+65'],
    ['N23-30', '8d12+32', '10d12+45','14d12+60', '20d12+80'],
  ]

  const iplRows = [
    ['Passiva (slot)',   '5', '6', '7',  '8'],
    ['Ativa Fraca',      '4', '5', '6',  '7'],
    ['Ativa Média',      '6', '7', '8',  '10'],
    ['Ativa Forte',      '8', '10','12', '14'],
    ['Ultimate',         '10','13','16', '20'],
  ]

  const ppPesoRows = [
    ['+5 Ataque/Defesa (temp)',       '3 PP'],
    ['+10 Ataque/Defesa (temp)',      '5 PP'],
    ['+15 Ataque/Defesa (temp, N16+)','7 PP'],
    ['Vantagem no dado',              '4 PP'],
    ['+1 Ataque Extra',               '5 PP'],
    ['Dano ≤ 4d12 (ativa)',           '2 PP'],
    ['Dano 4d12–12d12 (ativa)',       '4 PP'],
    ['Dano 13d12+ (ultimate)',        '6 PP'],
    ['+50% HP temp (≤3 rod.)',        '3 PP'],
    ['+100% HP temp (≤2 rod.)',       '5 PP'],
    ['Ignorar armadura total',        '5 PP'],
    ['Efeito em área',                '+3 PP ao custo base'],
    ['Imunidade a dano (≤1 rod.)',    '6 PP'],
  ]

  const calibRows = [
    ['N5',  '140–210',   'd20 +8 a +12',   'd20 +21'],
    ['N10', '250–380',   'd20 +12 a +16',  'd20 +28'],
    ['N15', '380–560',   'd20 +15 a +20',  'd20 +36'],
    ['N20', '520–760',   'd20 +18 a +23',  'd20 +43'],
    ['N25', '700–980',   'd20 +22 a +26',  'd20 +50'],
    ['N30', '950–1350',  'd20 +26 a +30',  'd20 +58'],
  ]

  const pehRows = [
    ['Guerreiro',  'N6, N10, N13, N17, N20, N24, N27*', '8 PEH (+1 no N27)'],
    ['Operativo',  'N5, N9, N13, N16, N19, N22, N25, N27, N30', '9 PEH'],
    ['Místico',    'N4, N8, N12, N16, N19, N22, N24, N27**, N30', '10 PEH (+2 no N27)'],
  ]

  const evoRules = [
    { tipo: 'Passiva',   max: 3,  custo: 'Automática', restricao: 'Evolui sozinha nos N10, N20 e N30. Sem custo de PEH.' },
    { tipo: 'Ativa',     max: 5,  custo: '1 PEH / nível', restricao: 'Custo de Energia sobe proporcionalmente com a evolução.' },
    { tipo: 'Ultimate',  max: 3,  custo: '1 PEH / nível', restricao: '1º ponto: N15+ | 2º ponto: N25+ | 3º ponto: N30' },
    { tipo: 'Aum. Poder', max: 2, custo: 'Módulo (até 2×)', restricao: 'Cada compra concede 1 PEH bônus, marcado separadamente.' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <SectionTitle>Protocolo de Expansão Épica Olympo</SectionTitle>
        <p className="text-txt-dim text-sm mb-6">
          Este protocolo define os limites matemáticos de todas as habilidades do sistema. A IA de análise usa estas tabelas para calibrar automaticamente valores de dano, PP e camadas SCP ao revisar uma ficha.
        </p>
      </div>

      {/* SCP */}
      <TableCard title="SCP — Sistema de Camadas de Poder (Seção 14.1)" color="purple">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-sep/60">
              {['Camada', 'Fontes', 'Bônus Máximo por Faixa', 'Observação'].map((h, i) => (
                <th key={i} className="py-2 px-3 text-left text-txt-dim font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scpRows.map((row, i) => (
              <tr key={i} className="border-b border-sep/30 hover:bg-void/60">
                <td className="py-2 px-3 font-mono text-purple-400 font-bold whitespace-nowrap">{row[0]}</td>
                <td className="py-2 px-3 text-txt-main">{row[1]}</td>
                <td className="py-2 px-3 font-mono text-gold text-[10px] whitespace-nowrap">{row[2]}</td>
                <td className="py-2 px-3 text-txt-dim text-[10px]">{row[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2 bg-purple-400/5 text-xs text-purple-300">
          Bônus Total Máximo = Camada 1 (ilimitada) + Camada 2 + Camada 3
        </div>
      </TableCard>

      {/* TDH */}
      <TableCard title="TDH — Teto de Dano por Habilidade (Seção 14.4)" color="sky">
        <div className="px-4 py-2 bg-sky-400/5 text-xs text-sky-300 border-b border-sep/30">
          ⚠ Estes valores são para o dano <strong>gerado pela habilidade isoladamente</strong>. O total do ataque ainda inclui: Dano Base de Classe + Bônus de Arma + Modificadores de Atributo.
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-sep/60">
              {['Faixa', 'Ativa Fraca (<20E)', 'Ativa Média (20–50E)', 'Ativa Forte (>50E)', 'Ultimate'].map((h, i) => (
                <th key={i} className="py-2 px-3 text-left text-txt-dim font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tdhRows.map((row, i) => (
              <tr key={i} className="border-b border-sep/30 hover:bg-void/60">
                <td className="py-2 px-3 font-mono text-gold font-bold">{row[0]}</td>
                {row.slice(1).map((cell, j) => (
                  <td key={j} className={`py-2 px-3 font-mono ${j === 3 ? 'text-amber-300' : 'text-sky-300'}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>

      {/* IPL PP */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TableCard title="IPL — Limite de PP por Tipo e Faixa (Seção 14.5)" color="emerald">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-sep/60">
                {['Tipo', 'N1-7', 'N8-15', 'N16-22', 'N23-30'].map((h, i) => (
                  <th key={i} className="py-2 px-3 text-left text-txt-dim font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {iplRows.map((row, i) => (
                <tr key={i} className={`border-b border-sep/30 hover:bg-void/60 ${row[0] === 'Ultimate' ? 'bg-amber-300/5' : ''}`}>
                  <td className={`py-2 px-3 font-mono ${row[0] === 'Ultimate' ? 'text-amber-300 font-bold' : 'text-emerald-400'}`}>{row[0]}</td>
                  {row.slice(1).map((cell, j) => (
                    <td key={j} className="py-2 px-3 font-mono text-txt-main text-center">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>

        <TableCard title="Peso de Efeitos em PP" color="emerald">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-sep/60">
                {['Efeito', 'Custo PP'].map((h, i) => (
                  <th key={i} className="py-2 px-3 text-left text-txt-dim font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ppPesoRows.map((row, i) => (
                <tr key={i} className="border-b border-sep/30 hover:bg-void/60">
                  <td className="py-1.5 px-3 text-txt-main">{row[0]}</td>
                  <td className="py-1.5 px-3 font-mono text-emerald-400 font-bold whitespace-nowrap">{row[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      </div>

      {/* Calibração */}
      <TableCard title="Calibração de Poder por Nível (Seção 14.7)" color="gold">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-sep/60">
              {['Nível', 'HP Esperado', 'Ataque Base (C1)', 'Máx com SCP (C1+C2+C3)'].map((h, i) => (
                <th key={i} className="py-2 px-3 text-left text-txt-dim font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {calibRows.map((row, i) => (
              <tr key={i} className="border-b border-sep/30 hover:bg-void/60">
                <td className="py-2 px-3 font-mono text-gold font-bold">{row[0]}</td>
                <td className="py-2 px-3 font-mono text-emerald-400">{row[1]}</td>
                <td className="py-2 px-3 font-mono text-txt-main">{row[2]}</td>
                <td className="py-2 px-3 font-mono text-amber-300">{row[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>

      {/* PEH */}
      <TableCard title="PEH — Pontos de Evolução de Habilidade" color="amber">
        <div className="px-4 py-3 space-y-3">
          <p className="text-xs text-txt-dim">
            PEH são distribuídos pela progressão de classe e pelo módulo <strong className="text-amber-300">Aumento de Poder</strong>. Investir pontos em uma habilidade escala todos os seus efeitos (dano, duração, bônus, CDs) proporcionalmente ao bracket de custo de Energia.
          </p>
          <table className="w-full text-xs mt-2">
            <thead>
              <tr className="border-b border-sep/60">
                {['Classe', 'Níveis com PEH', 'Total N30'].map((h, i) => (
                  <th key={i} className="py-2 px-3 text-left text-txt-dim font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pehRows.map((row, i) => (
                <tr key={i} className="border-b border-sep/30">
                  <td className="py-2 px-3 font-mono text-gold font-bold">{row[0]}</td>
                  <td className="py-2 px-3 text-txt-dim text-[10px]">{row[1]}</td>
                  <td className="py-2 px-3 font-mono text-amber-300 font-bold">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-sep/30 p-4 space-y-3">
          <p className="text-xs text-amber-300 font-semibold mb-2">Regras de Evolução por Tipo</p>
          {evoRules.map((r, i) => (
            <div key={i} className="flex items-start gap-3 bg-void/60 rounded-lg p-3 border border-sep/20">
              <span className={`shrink-0 font-cinzel text-xs font-bold px-2 py-1 rounded ${r.tipo === 'Ultimate' ? 'bg-amber-300/20 text-amber-300' : r.tipo === 'Passiva' ? 'bg-ok/20 text-ok' : r.tipo === 'Aum. Poder' ? 'bg-orange-400/20 text-orange-400' : 'bg-sep text-txt-main'}`}>
                {r.tipo}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-0.5">
                  <span className="text-xs text-txt-dim">Máx: <span className="text-gold font-mono">{r.max} nível{r.max > 1 ? 'is' : ''}</span></span>
                  <span className="text-xs text-txt-dim">Custo: <span className="text-amber-300 font-mono">{r.custo}</span></span>
                </div>
                <p className="text-xs text-txt-dim">{r.restricao}</p>
              </div>
            </div>
          ))}
        </div>
      </TableCard>

      <div className="bg-void rounded-xl border border-sep p-4 text-xs text-txt-dim space-y-1.5">
        <p className="text-gold font-cinzel font-bold text-sm mb-2">Notas de Design</p>
        <p>• CDs de resistência recomendados: <span className="text-txt-main">N1-10 → 14-16 | N11-20 → 18-22 | N21-30 → 22-28</span></p>
        <p>• Cura via habilidade: <span className="text-txt-main">máx 30% da vida máxima por uso individual; máx 20% em área</span></p>
        <p>• Habilidades de controle sem dano: calculadas puramente em PP — evite ultrapassar o teto de PP da faixa</p>
        <p>• Amplificadores de Triagem e Módulo contam para o poder real do personagem, não para o dano da habilidade isolada</p>
        <p>• Um personagem N30 com dano base alto <em>pode</em> ter uma habilidade com 14d12+60 de dano extra — os valores são cumulativos, não substitutos</p>
      </div>
    </div>
  )
}
