import React, { useState } from 'react'
import { useHashRoute } from '../../hooks/useHashRoute.js'
import Reveal from '../ui/Reveal.jsx'
import { Button } from '../ui/Button.jsx'
import {
  SYSTEM_META, ATTRIBUTES, SCALE, DIFFICULTIES, COMBINED_EXAMPLES,
  STARTING_LEVELS, MELEE_WEAPONS, RANGED_WEAPONS, MAGIC_WEAPONS, ENVIRONMENTAL,
  WEAPON_PROPS, ALT_ACTIONS, CONDITIONS, RECOVERY, DEATH_RULES,
  ABSORPTION_TABLE, MAGIC_TYPES, MAGIC_RANGES
} from '../../data/index.js'
import { VIDA_BASE_FLAT } from '../../lib/calculator.js'
import { LEVEL_COLORS } from '../sheet/CharacterSheet.jsx'

const SECTIONS = [
  { id: 'visao', label: 'Visão', icon: 'bi-stars' },
  { id: 'atributos', label: 'Atributos', icon: 'bi-gem' },
  { id: 'recursos', label: 'Recursos', icon: 'bi-heart-pulse' },
  { id: 'niveis', label: 'Níveis', icon: 'bi-bar-chart-steps' },
  { id: 'combate', label: 'Combate', icon: 'bi-sword' },
  { id: 'armas', label: 'Armas', icon: 'bi-shield-shaded' },
  { id: 'defesa', label: 'Defesa', icon: 'bi-shield-check' },
  { id: 'acoes', label: 'Ações', icon: 'bi-arrow-left-right' },
  { id: 'morte', label: 'Morte', icon: 'bi-skull' },
  { id: 'magia', label: 'Magia', icon: 'bi-magic' }
]

const ATTR_LABEL = { for: 'Força', agi: 'Agilidade', am: 'Aura Mágica' }

export default function RegrasView() {
  const { navigate } = useHashRoute()
  const [active, setActive] = useState('visao')

  const scrollTo = (id) => {
    const el = document.getElementById(id)
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 86
      window.scrollTo({ top: y, behavior: 'smooth' })
      setActive(id)
    }
  }

  return (
    <div className="page-enter">
      {/* Hero */}
      <section className="container pt-4 pb-2">
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
          <div>
            <div className="d-inline-flex align-items-center gap-2 px-3 py-1 mb-2" style={{ border: '1px solid rgba(224,173,51,0.3)', borderRadius: 999, background: 'rgba(0,0,0,0.3)' }}>
              <i className="bi bi-journal-text text-gold" />
              <span className="font-mono text-muted-drako" style={{ fontSize: '0.72rem', letterSpacing: '0.16em' }}>CÓDEX DE REGRAS · {SYSTEM_META.version}</span>
            </div>
            <h1 className="font-display gold-text m-0" style={{ fontSize: 'clamp(2rem,5vw,3.2rem)', lineHeight: 1.05 }}>Regras do Sistema</h1>
            <p className="text-muted-drako m-0 mt-1" style={{ maxWidth: 620 }}>{SYSTEM_META.tagline} Todos os valores e tabelas em um só lugar.</p>
          </div>
          <Button variant="ghost" onClick={() => navigate('')}><i className="bi bi-arrow-left me-2" />Início</Button>
        </div>
      </section>

      {/* Sticky section nav */}
      <div className="sticky-top glass" style={{ borderRadius: 0, borderTop: '1px solid var(--drako-border)', borderBottom: '1px solid var(--drako-border)', zIndex: 30, background: 'rgba(7,5,4,0.86)', backdropFilter: 'blur(12px)' }}>
        <div className="container d-flex overflow-auto py-2 gap-1">
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => scrollTo(s.id)} className="btn-ghost d-flex align-items-center gap-1 flex-shrink-0"
              style={active === s.id ? { borderColor: 'rgba(224,173,51,0.7)', background: 'rgba(224,173,51,0.12)', color: '#fff8e6' } : { fontSize: '0.8rem' }}>
              <i className={`bi ${s.icon}`} /><span style={{ fontSize: '0.8rem' }}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="container py-4 d-flex flex-column gap-4">

        {/* VISÃO GERAL */}
        <Section id="visao" title="Visão Geral & Resolução" icon="bi-stars">
          <div className="row g-3">
            <div className="col-lg-7">
              <Card>
                <h4 className="font-display text-gold mb-3" style={{ fontSize: '1.1rem' }}>O dado e o sucesso</h4>
                <p style={{ color: '#cdc1a6' }}>O sistema usa <b className="text-gold">apenas dados de 6 lados (d6)</b>. Toda ação rola uma quantidade de d6 igual ao atributo relevante. Cada dado mostrando <b className="text-gold">4, 5 ou 6</b> é um <b>sucesso</b>.</p>
                <div className="d-flex flex-wrap gap-2 mt-3">
                  <Pill tone="#27ae60"><b>4 · 5 · 6</b> = sucesso</Pill>
                  <Pill tone="#7f8c8d">1 · 2 · 3 = falha</Pill>
                </div>
                <hr className="my-3" style={{ borderColor: 'var(--drako-border)' }} />
                <p className="mb-2" style={{ color: '#cdc1a6' }}>O Narrador define a <b className="text-gold">dificuldade</b> = número mínimo de sucessos necessários:</p>
                <Table head={['Sucessos', 'Dificuldade', 'Exemplo']}>
                  {DIFFICULTIES.map(d => (
                    <tr key={d.succ}>
                      <td className="font-mono text-gold">{d.succ}</td>
                      <td className="font-display">{d.label}</td>
                      <td className="text-muted-drako">{d.note}</td>
                    </tr>
                  ))}
                </Table>
              </Card>
            </div>
            <div className="col-lg-5 d-flex flex-column gap-3">
              <Card>
                <h4 className="font-display text-gold mb-2" style={{ fontSize: '1.1rem' }}>Ação Combinada</h4>
                <p className="m-0" style={{ color: '#cdc1a6', fontSize: '0.95rem' }}>Dois atributos: rola o <b>menor</b> dos dois. Bônus pelo <b>maior</b>:</p>
                <div className="d-flex flex-column gap-2 mt-3">
                  <RuleRow label="Maior ≥ 6" value="+2d6" tone="#2ecc71" />
                  <RuleRow label="Maior 4–5" value="+1d6" tone="#f39c12" />
                  <RuleRow label="Maior ≤ 3" value="+0d6" tone="#7f8c8d" />
                </div>
              </Card>
              <Card>
                <h4 className="font-display text-gold mb-2" style={{ fontSize: '1.1rem' }}>Esforço & Condições</h4>
                <RuleRow label="Gastar 1 PE (antes da rolagem)" value="+2d6" tone="#9b59b6" />
                <RuleRow label="Condição positiva" value="+1d6" tone="#2ecc71" />
                <RuleRow label="Condição negativa" value="−1d6" tone="#e05252" />
                <p className="font-mono text-muted-drako mt-2 mb-0" style={{ fontSize: '0.72rem' }}>Máx. uma condição de cada tipo por vez.</p>
              </Card>
            </div>
          </div>
          <Card className="mt-3">
            <h4 className="font-display text-gold mb-3" style={{ fontSize: '1.05rem' }}>Exemplos de ações combinadas</h4>
            <div className="d-flex flex-wrap gap-2">
              {COMBINED_EXAMPLES.map(ex => {
                const a = ATTRIBUTES.find(x => x.key === ex.a), b = ATTRIBUTES.find(x => x.key === ex.b)
                return (
                  <span key={ex.name} className="tag-chip" style={{ fontSize: '0.78rem', color: '#cdc1a6' }}>
                    <span style={{ color: a.color }}>{a.short}</span>+<span style={{ color: b.color }}>{b.short}</span>
                    <span className="text-muted-drako mx-1">·</span>{ex.name}
                  </span>
                )
              })}
            </div>
          </Card>
        </Section>

        {/* ATRIBUTOS */}
        <Section id="atributos" title="Os Sete Atributos" icon="bi-gem" subtitle="1 a 10 · 3 = comum · 6 = pico humano · 7 = sobre-humano · 10 = absoluto">
          <div className="row g-3">
            {ATTRIBUTES.map(a => (
              <div className="col-md-6" key={a.key}>
                <div className="glass glass-static p-3 h-100" style={{ borderLeft: `3px solid ${a.color}` }}>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <span style={{ width: 14, height: 14, borderRadius: 4, background: a.color, boxShadow: `0 0 10px ${a.color}88` }} />
                    <span className="font-display" style={{ color: a.color, fontSize: '1.1rem' }}>{a.name}</span>
                    <span className="font-mono text-muted-drako" style={{ fontSize: '0.72rem' }}>{a.short}</span>
                  </div>
                  <p className="m-0" style={{ fontSize: '0.9rem', color: '#cdc1a6', lineHeight: 1.5 }}>{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <Card className="mt-3">
            <h4 className="font-display text-gold mb-3" style={{ fontSize: '1.05rem' }}>Escala de poder</h4>
            <Table head={['Valor', 'Nível', 'Nota']}>
              {SCALE.map(s => (
                <tr key={s.v}>
                  <td className="font-mono text-gold" style={{ width: 56 }}>{s.v}</td>
                  <td className="font-display">{s.label}</td>
                  <td className="text-muted-drako">{s.note}</td>
                </tr>
              ))}
            </Table>
          </Card>
        </Section>

        {/* RECURSOS */}
        <Section id="recursos" title="Recursos" icon="bi-heart-pulse" subtitle="Derivados dos atributos e do nível.">
          <div className="row g-3">
            <FormulaCard kind="vida" label="Vida" icon="bi-heart-pulse" formula={`FOR × 2  +  VON  +  ${VIDA_BASE_FLAT}`} bonus="bônus do nível" desc="Integridade física total. Não se recupera sozinha." />
            <FormulaCard kind="energia" label="Energia" icon="bi-lightning-charge" formula="AM × 5" desc="Aura externalizada com intenção. A 0, magia custa Vida." />
            <FormulaCard kind="pe" label="Esforço (PE)" icon="bi-bullseye" formula="VON × 2  +  AGI" desc="Superação momentânea. 1 PE = +2d6 antes da rolagem." />
          </div>
        </Section>

        {/* NÍVEIS */}
        <Section id="niveis" title="Níveis de Início" icon="bi-bar-chart-steps" subtitle="Pontos para distribuir, limite por atributo e bônus de recursos.">
          <Card>
            <Table head={['Nível', 'Pontos', 'Cap', 'Vida', 'Energia', 'PE']}>
              {STARTING_LEVELS.map(l => {
                const color = LEVEL_COLORS[l.key] || '#e0ad33'
                return (
                  <tr key={l.key}>
                    <td><span className="tag-chip" style={{ color, fontSize: '0.78rem', borderColor: color + '88' }}>{l.name}</span></td>
                    <td className="font-mono">{l.points}</td>
                    <td className="font-mono">{l.cap}</td>
                    <td className="font-mono text-life">+{l.bonus.vida} <span className="text-muted-drako">(máx {l.max.vida})</span></td>
                    <td className="font-mono text-energy">+{l.bonus.energia} <span className="text-muted-drako">(máx {l.max.energia})</span></td>
                    <td className="font-mono text-pe">+{l.bonus.pe} <span className="text-muted-drako">(máx {l.max.pe})</span></td>
                  </tr>
                )
              })}
            </Table>
            <p className="font-mono text-muted-drako mt-3 mb-0" style={{ fontSize: '0.74rem' }}>Mínimo obrigatório de 1 em cada um dos sete atributos. Máximos exibidos assumem FOR/VON (ou AM/AGI) no cap do nível.</p>
          </Card>
        </Section>

        {/* COMBATE */}
        <Section id="combate" title="Combate — Duas Rolagens" icon="bi-sword" subtitle="Acerto e dano são rolagens separadas.">
          <div className="row g-3">
            <div className="col-lg-6">
              <Card>
                <StepBadge n="1" title="Rolagem de Acerto" tone="#e0ad33" />
                <p style={{ color: '#cdc1a6' }}>O atacante rola seu <b className="text-gold">atributo relevante</b> em d6 e conta sucessos (4,5,6). Precisa atingir <b className="text-gold">dificuldade 2</b> para acertar.</p>
                <p className="m-0" style={{ color: '#cdc1a6' }}>O defensor rola <b style={{ color: '#27ae60' }}>Agilidade</b> — sucessos <b>iguais ou maiores</b> que o atacante = <b>esquiva total</b> (sem dano). Se o atacante tiver mais sucessos, o golpe passou.</p>
              </Card>
            </div>
            <div className="col-lg-6">
              <Card>
                <StepBadge n="2" title="Rolagem de Dano" tone="#f2661b" />
                <p style={{ color: '#cdc1a6' }}>Se o golpe passou, o atacante rola os <b className="text-gold">dados de dano da arma</b> e <b>soma os valores diretamente</b>.</p>
                <p className="m-0" style={{ color: '#cdc1a6' }}>Sem contar sucessos, sem multiplicar. O resultado bruto <b>menos a Absorção</b> do defensor é o <b className="text-gold">dano final</b>.</p>
              </Card>
            </div>
          </div>
          <Card className="mt-3">
            <div className="d-flex flex-wrap gap-3 align-items-center">
              <span className="font-display text-gold" style={{ fontSize: '1.05rem' }}>Fluxo:</span>
              <FlowChip icon="bi-dice-6" label="Acerto (atr.)" tone="#e0ad33" />
              <i className="bi bi-arrow-right-short text-muted-drako" style={{ fontSize: '1.3rem' }} />
              <FlowChip icon="bi-shield" label="Esquiva (AGI)" tone="#27ae60" />
              <i className="bi bi-arrow-right-short text-muted-drako" style={{ fontSize: '1.3rem' }} />
              <FlowChip icon="bi-dice-6-fill" label="Dano (soma)" tone="#f2661b" />
              <i className="bi bi-arrow-right-short text-muted-drako" style={{ fontSize: '1.3rem' }} />
              <FlowChip icon="bi-shield-check" label="− Absorção" tone="#c0392b" />
              <i className="bi bi-arrow-right-short text-muted-drako" style={{ fontSize: '1.3rem' }} />
              <FlowChip icon="bi-droplet-half" label="Dano final" tone="#9b59b6" />
            </div>
          </Card>
        </Section>

        {/* ARMAS */}
        <Section id="armas" title="Tabela de Armas" icon="bi-shield-shaded" subtitle="Dano em d6 somados. Magia ignora Absorção.">
          <WeaponTable title="Corpo a Corpo" hitAttr="Força" rows={MELEE_WEAPONS} />
          <WeaponTable title="À Distância" hitAttr="Agilidade" rows={RANGED_WEAPONS} />
          <WeaponTable title="Magia" hitAttr="Aura Mágica" rows={MAGIC_WEAPONS} magic />
          <Card className="mt-3">
            <h4 className="font-display text-gold mb-3" style={{ fontSize: '1.05rem' }}>Dano Ambiental <span className="text-muted-drako" style={{ fontSize: '0.85rem' }}>(sem rolagem de acerto — o Narrador soma direto)</span></h4>
            <div className="d-flex flex-wrap gap-2">
              {ENVIRONMENTAL.map(e => (
                <span key={e.key} className="tag-chip font-mono" style={{ fontSize: '0.82rem' }}><b className="text-gold">{e.dice}d6</b> <span className="text-muted-drako">{e.name}</span></span>
              ))}
            </div>
          </Card>
          <Card className="mt-3">
            <h4 className="font-display text-gold mb-3" style={{ fontSize: '1.05rem' }}>Propriedades das Armas</h4>
            <div className="row g-2">
              {Object.entries(WEAPON_PROPS).map(([k, v]) => (
                <div className="col-md-6" key={k}>
                  <div className="d-flex gap-2" style={{ fontSize: '0.88rem' }}>
                    <PropBadge prop={k} />
                    <span style={{ color: '#cdc1a6', lineHeight: 1.45 }}>{v}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        {/* DEFESA */}
        <Section id="defesa" title="Defesa" icon="bi-shield-check" subtitle="Duas camadas: Esquiva e Absorção.">
          <div className="row g-3">
            <div className="col-lg-6">
              <Card>
                <h4 className="font-display mb-2" style={{ fontSize: '1.1rem', color: '#27ae60' }}><i className="bi bi-wind me-2" />Esquiva</h4>
                <p className="m-0" style={{ color: '#cdc1a6' }}>Rolagem contrária de <b>Agilidade</b>. Sucessos do defensor <b>iguais ou maiores</b> que os do atacante cancelam o golpe. Não funciona contra dano ambiental. Penalidade de arma aplicada antes de rolar — a pool <b>nunca cai abaixo de 1d6</b>.</p>
              </Card>
            </div>
            <div className="col-lg-6">
              <Card>
                <h4 className="font-display mb-2" style={{ fontSize: '1.1rem', color: '#c0392b' }}><i className="bi bi-shield me-2" />Absorção (Força)</h4>
                <p style={{ color: '#cdc1a6' }}>Valor fixo que reduz o dano restante. <b className="text-gold">Dano mágico ignora Absorção</b>.</p>
                <Table head={['Força', 'Absorção']} compact>
                  {ABSORPTION_TABLE.map(r => (
                    <tr key={r.min}>
                      <td className="font-mono">{r.min}–{r.max}</td>
                      <td className="font-mono text-gold"><b>{r.absorb}</b></td>
                    </tr>
                  ))}
                </Table>
              </Card>
            </div>
          </div>
        </Section>

        {/* AÇÕES ALTERNATIVAS */}
        <Section id="acoes" title="Ações Alternativas" icon="bi-arrow-left-right" subtitle="Substituem o ataque da rodada. Quem tem 2 ataques pode atacar + usar uma ação.">
          <div className="row g-3">
            {ALT_ACTIONS.map(a => (
              <div className="col-md-6" key={a.key}>
                <div className="glass glass-static p-3 h-100" style={{ borderTop: `3px solid #e0ad33` }}>
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <h5 className="font-display m-0" style={{ fontSize: '1.1rem' }}>{a.name}</h5>
                    {a.difficulty ? <span className="tag-chip font-mono" style={{ fontSize: '0.72rem' }}>dif {a.difficulty}</span> : <span className="tag-chip font-mono" style={{ fontSize: '0.72rem', color: '#9b59b6' }}>atributo vs atributo</span>}
                  </div>
                  <div className="d-flex flex-wrap gap-1 mb-2">
                    {a.attrs.map(k => {
                      const at = ATTRIBUTES.find(x => x.key === k)
                      return <span key={k} className="tag-chip" style={{ fontSize: '0.68rem', color: at.color }}>{at.short}</span>
                    })}
                    {a.versus && <span className="font-mono text-muted-drako" style={{ fontSize: '0.7rem', alignSelf: 'center' }}>vs</span>}
                    {a.versus?.map(k => {
                      const at = ATTRIBUTES.find(x => x.key === k)
                      return <span key={k} className="tag-chip" style={{ fontSize: '0.68rem', color: at.color }}>{at.short}</span>
                    })}
                  </div>
                  <p className="m-0" style={{ fontSize: '0.88rem', color: '#cdc1a6', lineHeight: 1.5 }}>{a.note}</p>
                </div>
              </div>
            ))}
          </div>
          <Card className="mt-3">
            <h4 className="font-display text-gold mb-3" style={{ fontSize: '1.05rem' }}>Condições aplicadas</h4>
            <div className="row g-2">
              {Object.entries(CONDITIONS).map(([k, c]) => (
                <div className="col-md-4" key={k}>
                  <div className="p-2" style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, border: '1px solid rgba(222,102,27,0.3)' }}>
                    <div className="font-display" style={{ color: '#f2661b', fontSize: '0.95rem' }}>{c.name}</div>
                    <div style={{ fontSize: '0.82rem', color: '#cdc1a6', lineHeight: 1.4 }}>{c.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        {/* MORTE & RECUPERAÇÃO */}
        <Section id="morte" title="Morte & Recuperação" icon="bi-skull">
          <div className="row g-3">
            <div className="col-lg-7">
              <Card>
                <Row label="Estado crítico" value={DEATH_RULES.critico} />
                <Row label="Por rodada" value={DEATH_RULES.porRodada} />
                <Row label="Salvamento" value={DEATH_RULES.salvamento} />
                <Row label="Morte" value={DEATH_RULES.morte} last />
              </Card>
            </div>
            <div className="col-lg-5">
              <Card>
                <h4 className="font-display text-gold mb-3" style={{ fontSize: '1.05rem' }}>Recuperação</h4>
                <Row label={<span className="text-life">Vida</span>} value={RECOVERY.vida} />
                <Row label={<span className="text-energy">Energia · descanso longo</span>} value={RECOVERY.energia.longo} />
                <Row label={<span className="text-energy">Energia · descanso curto</span>} value={RECOVERY.energia.curto} />
                <Row label={<span className="text-pe">PE · descanso longo</span>} value={RECOVERY.pe.longo} />
                <Row label={<span className="text-pe">PE · descanso curto</span>} value={RECOVERY.pe.curto} last />
              </Card>
            </div>
          </div>
        </Section>

        {/* MAGIA */}
        <Section id="magia" title="Magia" icon="bi-magic" subtitle="Sem lista universal. Cada personagem com AM desenvolvida tem poderes próprios.">
          <div className="row g-3">
            <div className="col-lg-7">
              <Card>
                <h4 className="font-display text-gold mb-3" style={{ fontSize: '1.05rem' }}>Tipos & custo de energia (referência)</h4>
                <Table head={['Tipo', 'Energia', 'Nota']}>
                  {MAGIC_TYPES.map(t => (
                    <tr key={t.key}>
                      <td className="font-display">{t.name}</td>
                      <td className="font-mono text-energy"><b>{t.energia}</b></td>
                      <td className="text-muted-drako">{t.note}</td>
                    </tr>
                  ))}
                </Table>
              </Card>
            </div>
            <div className="col-lg-5">
              <Card>
                <h4 className="font-display text-gold mb-3" style={{ fontSize: '1.05rem' }}>Alcance (multiplicador)</h4>
                <Table head={['Alcance', 'Mult', 'Nota']} compact>
                  {MAGIC_RANGES.map(r => (
                    <tr key={r.key}>
                      <td className="font-display">{r.name}</td>
                      <td className="font-mono text-gold">×{r.mult}</td>
                      <td className="text-muted-drako">{r.note}</td>
                    </tr>
                  ))}
                </Table>
                <p className="font-mono text-muted-drako mt-3 mb-0" style={{ fontSize: '0.74rem' }}>Tipo duplo = dobro do custo. A 0 energia, cada uso custa Vida na mesma proporção.</p>
              </Card>
            </div>
          </div>
        </Section>

        <div className="text-center text-muted-drako py-3" style={{ fontSize: '0.78rem' }}>
          <i className="bi bi-dragon-fill text-gold me-2" />System-Drako · {SYSTEM_META.dice} · v{SYSTEM_META.version}
        </div>
      </div>
    </div>
  )
}

/* ---------- helpers ---------- */

function Section({ id, title, subtitle, icon, children }) {
  return (
    <Reveal>
      <section id={id} style={{ scrollMarginTop: 90 }}>
        <div className="mb-3">
          <h2 className="font-display gold-text d-inline-flex align-items-center gap-2 m-0" style={{ fontSize: '1.55rem' }}>
            <i className={`bi ${icon}`} style={{ color: 'var(--drako-gold)' }} />{title}
          </h2>
          {subtitle && <p className="text-muted-drako m-0 mt-1" style={{ fontSize: '0.92rem' }}>{subtitle}</p>}
        </div>
        {children}
      </section>
    </Reveal>
  )
}

function Card({ children, className = '' }) {
  return <div className={`glass p-4 ${className}`}>{children}</div>
}

function Pill({ children, tone = '#e0ad33' }) {
  return <span className="tag-chip" style={{ color: tone, fontSize: '0.8rem', borderColor: tone + '66' }}>{children}</span>
}

function RuleRow({ label, value, tone = '#e0ad33' }) {
  return (
    <div className="d-flex align-items-center justify-content-between" style={{ padding: '0.35rem 0.6rem', background: 'rgba(0,0,0,0.28)', borderRadius: 8 }}>
      <span style={{ fontSize: '0.88rem', color: '#cdc1a6' }}>{label}</span>
      <span className="font-mono" style={{ color: tone, fontWeight: 700 }}>{value}</span>
    </div>
  )
}

function Table({ head, children, compact = false }) {
  return (
    <div className="table-responsive">
      <table className="w-100" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>{head.map((h, i) => <th key={i} className="font-mono text-muted-drako text-start" style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', padding: compact ? '0.35rem 0.5rem' : '0.5rem 0.6rem', borderBottom: '1px solid var(--drako-border)' }}>{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

function FormulaCard({ kind, label, icon, formula, bonus, desc }) {
  const tone = kind === 'vida' ? 'var(--life)' : kind === 'energia' ? 'var(--energy)' : 'var(--pe)'
  return (
    <div className="col-md-4">
      <div className="glass glass-static p-4 h-100" style={{ borderTop: `3px solid ${tone}` }}>
        <div className="d-flex align-items-center gap-2 mb-2">
          <i className={`bi ${icon}`} style={{ color: tone, fontSize: '1.3rem' }} />
          <span className="font-display" style={{ color: tone, fontSize: '1.2rem' }}>{label}</span>
        </div>
        <div className="font-mono my-3 p-3 text-center" style={{ background: 'rgba(0,0,0,0.35)', borderRadius: 10, border: '1px solid var(--drako-border)', fontSize: '1.05rem', color: '#fff8e6', letterSpacing: '0.02em' }}>
          {formula}
          {bonus && <div className="text-muted-drako mt-1" style={{ fontSize: '0.78rem' }}>+ {bonus}</div>}
        </div>
        <p className="m-0" style={{ fontSize: '0.88rem', color: '#cdc1a6', lineHeight: 1.5 }}>{desc}</p>
      </div>
    </div>
  )
}

function StepBadge({ n, title, tone }) {
  return (
    <div className="d-flex align-items-center gap-2 mb-2">
      <span style={{ width: 30, height: 30, borderRadius: 8, background: `${tone}22`, border: `1px solid ${tone}88`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: tone, fontWeight: 700 }}>{n}</span>
      <h4 className="font-display m-0" style={{ fontSize: '1.1rem', color: tone }}>{title}</h4>
    </div>
  )
}

function FlowChip({ icon, label, tone }) {
  return (
    <span className="d-inline-flex align-items-center gap-1 px-2 py-1" style={{ background: `${tone}1a`, border: `1px solid ${tone}55`, borderRadius: 8, fontSize: '0.78rem', color: tone }}>
      <i className={`bi ${icon}`} />{label}
    </span>
  )
}

function PropBadge({ prop }) {
  const map = {
    attacks: { icon: 'bi-arrow-repeat', label: 'Ataques', tone: '#3fb0b5' },
    peCost: { icon: 'bi-bullseye', label: 'PE', tone: '#9b59b6' },
    dodgePenalty: { icon: 'bi-wind', label: 'Esquiva', tone: '#e05252' },
    ocultavel: { icon: 'bi-eye-slash', label: 'Ocultável', tone: '#27ae60' },
    socialReach: { icon: 'bi-people', label: 'Alcance social', tone: '#e0ad33' },
    reload: { icon: 'bi-arrow-clockwise', label: 'Recarga', tone: '#f39c12' }
  }
  const m = map[prop] || { icon: 'bi-dot', label: prop, tone: '#a99e84' }
  return <span className="tag-chip flex-shrink-0" style={{ color: m.tone, fontSize: '0.68rem', height: 'fit-content' }}><i className={`bi ${m.icon} me-1`} />{m.label}</span>
}

function WeaponRow({ w, magic = false }) {
  return (
    <tr>
      <td className="font-display" style={{ fontSize: '0.92rem' }}>{w.name}</td>
      <td className="font-mono text-gold"><b>{w.damage}d6</b></td>
      <td className="font-mono text-muted-drako">{w.attacks === 2 ? '2 ataques' : '1 ataque'}</td>
      <td>
        <div className="d-flex flex-wrap gap-1">
          {magic && w.energia != null && <PropBadgeKey icon="bi-lightning-charge-fill" label={`${w.energia}E`} tone="#f39c12" />}
          {w.peCost > 0 && <PropBadgeKey icon="bi-bullseye" label={`${w.peCost} PE`} tone="#9b59b6" />}
          {w.dodgePenalty > 0 && <PropBadgeKey icon="bi-wind" label={`−${w.dodgePenalty}d6`} tone="#e05252" />}
          {w.reload > 0 && <PropBadgeKey icon="bi-arrow-clockwise" label={`rec ${w.reload}`} tone="#f39c12" />}
          {w.ignoresArmor && <PropBadgeKey icon="bi-magic" label="ignora absorção" tone="#16a085" />}
          {w.ocultavel && <PropBadgeKey icon="bi-eye-slash" label="ocultável" tone="#27ae60" />}
          {w.socialReach && <PropBadgeKey icon="bi-people" label="social" tone="#e0ad33" />}
        </div>
      </td>
    </tr>
  )
}

function PropBadgeKey({ icon, label, tone }) {
  return <span className="tag-chip" style={{ color: tone, fontSize: '0.64rem', padding: '0.1rem 0.4rem' }}><i className={`bi ${icon} me-1`} />{label}</span>
}

function WeaponTable({ title, hitAttr, rows, magic = false }) {
  return (
    <Card className="mb-3">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="font-display text-gold m-0" style={{ fontSize: '1.1rem' }}>{title}</h4>
        <span className="font-mono text-muted-drako" style={{ fontSize: '0.74rem' }}>acerto: <b style={{ color: '#cdc1a6' }}>{hitAttr}</b></span>
      </div>
      <Table head={['Arma', 'Dano', 'Ataques', 'Propriedades']}>
        {rows.map(w => <WeaponRow key={w.key} w={w} magic={magic} />)}
      </Table>
    </Card>
  )
}

function Row({ label, value, last = false }) {
  return (
    <div className="d-flex gap-3" style={{ padding: '0.55rem 0', borderBottom: last ? 'none' : '1px solid var(--drako-border)' }}>
      <div style={{ width: 150, flexShrink: 0 }} className="font-mono text-muted-drako" >{label}</div>
      <div style={{ fontSize: '0.9rem', color: '#cdc1a6', lineHeight: 1.45 }}>{value}</div>
    </div>
  )
}
