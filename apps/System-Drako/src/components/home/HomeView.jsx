import React, { useEffect, useRef, useState } from 'react'
import { useHashRoute } from '../../hooks/useHashRoute.js'
import Reveal from '../ui/Reveal.jsx'
import { Button } from '../ui/Button.jsx'
import { ATTRIBUTES, STARTING_LEVELS, SYSTEM_META } from '../../data/index.js'
import { LEVEL_COLORS } from '../sheet/CharacterSheet.jsx'
import { exportDatabaseDrako, importDrakoFile } from '../../lib/storage.js'
import { useToast } from '../../contexts/ToastContext.jsx'
import AIAutoCharacterModal from '../ai/AIAutoCharacterModal.jsx'
import Modal from '../ui/Modal.jsx'

export default function HomeView() {
  const { navigate } = useHashRoute()
  const toast = useToast()
  const heroRef = useRef(null)
  const fileRef = useRef(null)
  const [showOracle, setShowOracle] = useState(false)
  const [showImport, setShowImport] = useState(false)

  useEffect(() => {
    let raf
    const onScroll = () => {
      const y = window.scrollY
      if (heroRef.current) heroRef.current.style.transform = `translateY(${y * 0.22}px)`
      raf = null
    }
    window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(onScroll) }, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const go = (to) => {
    const target = to.startsWith('#') ? to : `#/${to}`
    window.location.hash = target
  }

  return (
    <div className="page-enter">
      {/* HERO */}
      <section className="position-relative" style={{ minHeight: '92vh', overflow: 'hidden' }}>
        <div ref={heroRef} className="position-absolute inset-0 d-flex flex-column align-items-center justify-content-center text-center px-3" style={{ willChange: 'transform' }}>
          <Reveal>
            <div className="d-inline-flex align-items-center gap-2 px-3 py-1 mb-4" style={{ border: '1px solid rgba(224,173,51,0.3)', borderRadius: 999, background: 'rgba(0,0,0,0.3)' }}>
              <i className="bi bi-stars text-gold" />
              <span className="font-mono text-muted-drako" style={{ fontSize: '0.74rem', letterSpacing: '0.16em' }}>D6 PURO · ATRIBUTOS · SEM PERÍCIAS</span>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="font-display gold-text mb-3" style={{ fontSize: 'clamp(2.8rem,8vw,5.8rem)', lineHeight: 1.02, fontWeight: 700 }}>
              Forje fichas que<br />carregam peso.
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="text-muted-drako mx-auto" style={{ maxWidth: 660, fontSize: '1.12rem' }}>
              {SYSTEM_META.tagline} Feito para o Mestre que precisa gerar dezenas de NPCs em minutos — com ou sem o Oráculo.
            </p>
          </Reveal>

          {/* Hexagon CTAs */}
          <Reveal delay={320}>
            <div className="d-flex align-items-end justify-content-center gap-5 mt-5 flex-wrap">
              <HexagonCTA
                label="Forja Lendária"
                sub="Criar ficha"
                icon="bi-hammer"
                filled
                onClick={() => go('novo')}
              />
              <HexagonCTA
                label="Biblioteca"
                sub="Seus personagens"
                icon="bi-collection"
                onClick={() => go('biblioteca')}
              />
            </div>
          </Reveal>

          {/* Discrete secondary actions */}
          <Reveal delay={440}>
            <div className="d-flex gap-2 mt-4">
              <button className="btn-ghost" style={{ fontSize: '0.88rem', padding: '0.4rem 0.9rem' }} onClick={() => go('quadros')}><i className="bi bi-grid-3x3-gap me-2" />Quadros</button>
              <button className="btn-ghost" style={{ fontSize: '0.88rem', padding: '0.4rem 0.9rem' }} onClick={() => setShowOracle(true)}><i className="bi bi-stars me-2" />Invocar Oráculo</button>
            </div>
          </Reveal>
        </div>
        <div className="position-absolute" style={{ bottom: 24, left: '50%', transform: 'translateX(-50%)', color: 'var(--drako-muted)' }}>
          <i className="bi bi-chevron-double-down" style={{ animation: 'fadeUp 1.6s ease-in-out infinite' }} />
        </div>
      </section>

      {/* ATTRIBUTES */}
      <section className="container py-5">
        <Reveal><h3 className="font-display text-gold text-center mb-1" style={{ fontSize: '1.5rem' }}>Os Sete Atributos</h3></Reveal>
        <Reveal><p className="text-center text-muted-drako mx-auto mb-4" style={{ maxWidth: 640 }}>Toda ação passa por eles. Sem perícias, sem ruído.</p></Reveal>
        <div className="row g-3">
          {ATTRIBUTES.map((a, i) => (
            <div className="col-md-6 col-lg-4" key={a.key}>
              <Reveal delay={i * 50}>
                <div className="glass glass-static card-sheen p-4 h-100">
                  <div className="d-flex align-items-center gap-3 mb-2">
                    <span style={{ width: 44, height: 44, borderRadius: 12, background: `${a.color}1f`, border: `1px solid ${a.color}66`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="bi bi-gem" style={{ color: a.color, fontSize: '1.2rem' }} />
                    </span>
                    <div>
                      <div className="font-display" style={{ color: a.color, fontSize: '1.15rem' }}>{a.name}</div>
                      <div className="font-mono text-muted-drako" style={{ fontSize: '0.72rem', letterSpacing: '0.1em' }}>{a.short}</div>
                    </div>
                  </div>
                  <p className="m-0" style={{ fontSize: '0.98rem', color: '#cdc1a6', lineHeight: 1.5 }}>{a.blurb}</p>
                </div>
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      {/* LEVELS */}
      <section className="container py-5">
        <Reveal><h3 className="font-display text-gold text-center mb-1" style={{ fontSize: '1.5rem' }}>Níveis de Início</h3></Reveal>
        <Reveal><p className="text-center text-muted-drako mx-auto mb-4" style={{ maxWidth: 640 }}>Da juventude à lenda — escolha o ponto de partida.</p></Reveal>
        <div className="row g-3">
          {STARTING_LEVELS.map((l, i) => {
            const color = LEVEL_COLORS[l.key] || '#e0ad33'
            return (
            <div className="col-md-6 col-xl-4" key={l.key}>
              <Reveal delay={i * 60}>
                <div className="glass glass-static card-sheen p-4 h-100" style={{ border: `1px solid ${color}66`, boxShadow: `0 0 24px -10px ${color}88` }}>
                  <div className="d-flex align-items-center justify-content-between">
                    <h4 className="m-0 font-display" style={{ fontSize: '1.25rem', color }}>{l.name}</h4>
                    <span className="font-mono" style={{ fontSize: '0.8rem', color }}>{l.points} pts</span>
                  </div>
                  <p className="mt-2 mb-3" style={{ fontSize: '0.96rem', color: '#cdc1a6' }}>{l.tagline}</p>
                  <div className="d-flex gap-3 font-mono" style={{ fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--life)' }}><i className="bi bi-heart-pulse me-1" />{l.max.vida}</span>
                    <span style={{ color: 'var(--energy)' }}><i className="bi bi-lightning-charge me-1" />{l.max.energia}</span>
                    <span style={{ color: 'var(--pe)' }}><i className="bi bi-bullseye me-1" />{l.max.pe}</span>
                  </div>
                </div>
              </Reveal>
            </div>
            )
          })}
        </div>
      </section>

      {/* FEATURES */}
      <section className="container py-5">
        <Reveal><h3 className="font-display text-gold text-center mb-1" style={{ fontSize: '1.5rem' }}>O que o Drako faz por você</h3></Reveal>
        <Reveal><p className="text-center text-muted-drako mx-auto mb-4" style={{ maxWidth: 640 }}>Do rascunho ao combate — tudo em um só lugar.</p></Reveal>
        <div className="row g-3">
          {FEATURES.map((f, i) => (
            <div className="col-md-6 col-lg-4" key={f.title}>
              <Reveal delay={i * 50}>
                <div className="glass glass-static card-sheen p-4 h-100">
                  <i className={`bi ${f.icon} text-gold`} style={{ fontSize: '1.8rem' }} />
                  <h5 className="font-display mt-3 mb-1" style={{ fontSize: '1.2rem' }}>{f.title}</h5>
                  <p className="m-0" style={{ fontSize: '0.96rem', color: '#cdc1a6', lineHeight: 1.5 }}>{f.desc}</p>
                </div>
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      {/* DATA */}
      <section className="container py-5">
        <Reveal>
          <div className="glass p-4 p-lg-5 text-center">
            <h3 className="font-display gold-text mb-2">Seu universo, no seu bolso</h3>
            <p className="text-muted-drako mx-auto" style={{ maxWidth: 640 }}>
              Tudo guardado localmente. Exporte em <span className="kbd">.drako</span>, PDF ou imagem — ou faça backup do banco inteiro.
            </p>
            <div className="d-flex flex-wrap justify-content-center gap-2 mt-3">
              <Button variant="ghost" onClick={() => exportDatabaseDrako().then(() => toast.success('Banco exportado.'))}><i className="bi bi-download me-2" />Backup do banco</Button>
              <Button variant="ghost" onClick={() => setShowImport(true)}><i className="bi bi-upload me-2" />Importar .drako</Button>
            </div>
          </div>
        </Reveal>
      </section>

      <input ref={fileRef} type="file" accept=".drako,application/json" hidden onChange={async (e) => {
        const f = e.target.files?.[0]; if (!f) return
        try {
          const res = await importDrakoFile(f)
          if (res.type === 'database') toast.success(`Importado: ${res.characters} fichas, ${res.boards} quadros.`)
          else toast.success('Ficha importada.')
          setShowImport(false)
        } catch (err) { toast.error(err.message) }
        e.target.value = ''
      }} />

      <AIAutoCharacterModal open={showOracle} onClose={() => setShowOracle(false)} onCreated={(id) => { setShowOracle(false); navigate(`ficha/${id}`) }} />

      <Modal open={showImport} onClose={() => setShowImport(false)} title="Importar .drako" size="sm"
        footer={<><Button variant="ghost" onClick={() => setShowImport(false)}>Cancelar</Button><Button onClick={() => fileRef.current?.click()}><i className="bi bi-folder2-open me-2" />Escolher arquivo</Button></>}>
        <p className="text-muted-drako" style={{ fontSize: '0.98rem' }}>
          Selecione um arquivo <span className="kbd">.drako</span> — pode ser uma ficha ou um backup completo. A importação mescla com o que já existe.
        </p>
      </Modal>
    </div>
  )
}

function HexagonCTA({ label, sub, icon, filled = false, onClick }) {
  const [phase, setPhase] = useState('init')   // 'init' | 'in' | 'out'
  const [hover, setHover] = useState(false)
  const [hit, setHit] = useState(false)
  const SIZE = 180
  const spinClass = phase === 'in' ? 'spin-in' : phase === 'out' ? 'spin-out' : ''
  const glow = hover
    ? 'drop-shadow(0 0 22px rgba(246,217,140,0.75))'
    : filled ? 'drop-shadow(0 0 16px rgba(224,173,51,0.35))' : 'drop-shadow(0 0 8px rgba(224,173,51,0.15))'

  return (
    <button
      onClick={() => { setHit(true); setTimeout(onClick, 200) }}
      onMouseEnter={() => { setHover(true); setPhase('in') }}
      onMouseLeave={() => { setHover(false); setPhase('out') }}
      className="d-flex flex-column align-items-center"
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
    >
      <div className={`hex-graphic ${spinClass}`} style={{ position: 'relative', width: SIZE, height: SIZE, filter: glow, transition: 'filter .4s' }}>
        <div className={hit ? 'hammer-hit' : ''} style={{ position: 'absolute', inset: 0 }}>
          {/* outer hex (gold edge) */}
          <div className="hex" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#f6d98c,#c8921b 55%,#7c570e)', opacity: filled ? 1 : 0.55 }} />
          {/* dark face inset to form the edge ring */}
          <div className="hex" style={{ position: 'absolute', inset: filled ? 8 : 4, background: 'radial-gradient(circle at 50% 35%, #1c1812, #0a0806)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className={`bi ${icon}`} style={{ fontSize: '3rem', color: '#fff8e6', filter: 'drop-shadow(0 0 10px rgba(224,173,51,0.55))' }} />
          </div>
        </div>
      </div>
      <div className="font-display mt-3" style={{ fontSize: '1.35rem', color: 'var(--drako-gold-soft)', transition: 'color .3s', ...(hover ? { color: '#fff8e6' } : {}) }}>{label}</div>
      <div className="text-muted-drako" style={{ fontSize: '0.88rem' }}>{sub}</div>
    </button>
  )
}

const FEATURES = [
  { icon: 'bi-hammer', title: 'Forja concisa', desc: 'Fluxo enxuto: identidade, nível, atributos, anotações e habilidades.' },
  { icon: 'bi-stars', title: 'Oráculo (IA)', desc: 'Cria fichas completas, gera kits de habilidades e audita balanceamento.' },
  { icon: 'bi-collection', title: 'Biblioteca viva', desc: 'Ícones em evidência, pastas e busca rápida — tudo local.' },
  { icon: 'bi-grid-3x3-gap', title: 'Quadro Infinito', desc: 'Arena de combate: solte fichas, edite vida e energia em tempo real.' },
  { icon: 'bi-image', title: 'Ícone ajustável', desc: 'Arraste, cole ou importe — ajuste posição e zoom na máscara.' },
  { icon: 'bi-file-earmark-arrow-down', title: 'Exportação total', desc: '.drako (com tudo), PDF e imagem para levar à mesa.' }
]
