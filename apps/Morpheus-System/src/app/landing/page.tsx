"use client";

import { useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  Check,
  DoorOpen,
  LayoutGrid,
  Layers,
  Menu,
  Moon,
  Network,
  ScanLine,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
  Zap,
} from "lucide-react";
import SmoothScrollProvider from "@/components/SmoothScroll";
import LandingThemeToggle from "@/components/landing/LandingThemeToggle";
import AuroraParticles from "@/components/visuals/AuroraParticles";
import { useAnimeCount, useGsapMagnetic } from "@/components/landing/useLandingMotion";
import { supabase } from "@/lib/supabase";
import styles from "./landing.module.css";

const SpatialScene = dynamic(
  () => import("@/components/visuals/RoomSpatialMap").then((module) => module.LandingClinicShowcase),
  { ssr: false, loading: () => <div className={styles.sceneFallback} /> }
);

type ViewId = "agenda" | "mapa" | "rede";

const views: { id: ViewId; label: string; icon: typeof CalendarDays }[] = [
  { id: "agenda", label: "Agenda", icon: CalendarDays },
  { id: "mapa", label: "Mapa espacial", icon: ScanLine },
  { id: "rede", label: "Rede de clínicas", icon: Network },
];

const features = [
  { icon: Layers, title: "Multi-clínicas isoladas", text: "Cada operação vive em seu próprio espaço. Salas, profissionais e reservas nunca se atravessam.", tag: "MULTI-TENANT" },
  { icon: ShieldCheck, title: "Regras que não falham", text: "Conflitos de horário e limites de plano são validados no banco, onde os dados moram.", tag: "POSTGRES" },
  { icon: UsersRound, title: "Acessos por papel", text: "Administradores e psicólogos enxergam apenas o que lhes cabe, com permissões claras.", tag: "RBAC" },
  { icon: Zap, title: "Cobrança confirmada", text: "O plano só é liberado após o evento assinado pela Stripe — sem intervenção manual.", tag: "STRIPE LIVE" },
  { icon: DoorOpen, title: "Espaço reconhecível", text: "A sala deixa de ser uma linha abstrata e ganha um lugar visual na operação.", tag: "UX ESPACIAL" },
  { icon: Moon, title: "Calma por design", text: "Contraste, nomes evidentes e caminhos curtos para equipes de todas as idades.", tag: "ACESSÍVEL" },
];

const plans = [
  { id: "essential", name: "Essential", desc: "Para a clínica que está começando.", monthly: 30, annual: 24, trial: true, featured: false, feats: ["1 clínica", "3 salas", "10 profissionais", "Trial de 7 dias"] },
  { id: "pro", name: "Pro", desc: "Mais salas, mesma clareza.", monthly: 50, annual: 40, trial: false, featured: true, feats: ["3 clínicas", "6 salas por clínica", "15 profissionais", "Suporte prioritário"] },
  { id: "elite", name: "Elite", desc: "Infraestrutura para operações maduras.", monthly: 80, annual: 64, trial: false, featured: false, feats: ["5 clínicas", "10 salas por clínica", "20 profissionais", "Onboarding assistido"] },
] as const;

const palette = ["#7b6bff", "#5eead4", "#9d90ff", "#6e8bff", "#a5b6ff"];

function Reveal({ children, className = "", delay = 0, y = 28 }: { children: ReactNode; className?: string; delay?: number; y?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Magnetic({ children, strength = 0.3 }: { children: ReactNode; strength?: number }) {
  const ref = useGsapMagnetic<HTMLSpanElement>(strength);
  return (
    <span ref={ref} style={{ display: "inline-flex", willChange: "transform" }}>
      {children}
    </span>
  );
}

function CountUp({ value }: { value: string }) {
  const ref = useAnimeCount(Number(value) || 0);
  return <strong ref={ref}>0</strong>;
}

function AuroraField() {
  return (
    <div className={styles.auroraField} aria-hidden="true">
      <div className={`${styles.auroraBlob} ${styles.a}`} />
      <div className={`${styles.auroraBlob} ${styles.b}`} />
      <div className={`${styles.auroraBlob} ${styles.c}`} />
      <div className={styles.grain} />
    </div>
  );
}

function DemoSurface({ view }: { view: ViewId }) {
  if (view === "agenda") {
    const blocks = [[1, 3], [0, 4], [2, 5], [1, 6], [3, 7]];
    return (
      <div className={styles.agenda}>
        <div className={styles.agendaHead}>
          <span />
          {["08", "09", "10", "11", "12", "13", "14", "15"].map((t) => <span key={t}>{t}:00</span>)}
        </div>
        {["Névoa", "Íris", "Lótus", "Aurora", "Cedro"].map((room, row) => (
          <div className={styles.agendaRow} key={room}>
            <span className={styles.agendaRoom}><i style={{ background: palette[row] }} />{room}</span>
            {Array.from({ length: 8 }, (_, col) => {
              const on = blocks[row].includes(col);
              return <span key={col} className={on ? styles.slotOn : styles.slot} />;
            })}
          </div>
        ))}
      </div>
    );
  }
  if (view === "mapa") {
    return (
      <div className={styles.mapGrid}>
        {["NÉVOA", "ÍRIS", "LÓTUS", "AURORA", "CEDRO", "LIVRE"].map((room, i) => (
          <div className={styles.mapRoom} key={room}>
            <span className={styles.mapRoomIdx}>0{i + 1}</span>
            <DoorOpen size={18} />
            <span className={styles.mapRoomName}>{room}</span>
            <span className={styles.mapRoomMeta}>{i === 5 ? "Configurar sala" : i % 2 ? "3 janelas livres" : "Disponível às 14:00"}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className={styles.network}>
      <div className={styles.networkHub}>
        <Network size={26} />
        <span className={styles.networkHubLabel}>PORTFÓLIO</span>
        <span className={styles.networkHubName}>Grupo Horizonte</span>
      </div>
      <div className={styles.networkBranches}>
        {[["Centro", "06 salas · 12 profissionais"], ["Jardins", "04 salas · 08 profissionais"], ["Vila Nova", "03 salas · 05 profissionais"]].map(([n, m], i) => (
          <div className={styles.branch} key={n}>
            <span className={styles.branchIdx}>CLÍNICA 0{i + 1}</span>
            <span className={styles.branchName}>{n}</span>
            <span className={styles.branchMeta}>{m}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [view, setView] = useState<ViewId>("agenda");
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (alive) setLoggedIn(Boolean(data.session));
    }).catch(() => alive && setLoggedIn(false));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const signupHref = (plan: string, trial = false) =>
    `/app?action=signup&plan=${plan}${trial ? "&trial=1" : ""}&interval=${annual ? "yearly" : "monthly"}`;

  return (
    <SmoothScrollProvider>
      <main className={styles.root}>
        <AuroraField />

        <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ""}`}>
          <Link href="/landing" className={styles.logo} aria-label="Morpheus — início">
            <span className={styles.logoMark}><i /><i /><i /></span>
            <span className={styles.logoType}>MORPHEUS<small>SPACE OS</small></span>
          </Link>
          <div className={styles.navCenter}>
            <a href="#produto">Produto</a>
            <a href="#recursos">Recursos</a>
            <a href="#planos">Planos</a>
          </div>
          <div className={styles.navActions}>
            <LandingThemeToggle className={styles.themeToggle} />
            <Link href={loggedIn ? "/app?action=workspace" : "/app?action=login"} className={styles.loginLink}>
              {loggedIn ? "Abrir sistema" : "Entrar"}
            </Link>
            <Link href={signupHref("essential", true)} className={styles.navCta}>
              Testar grátis <ArrowRight size={15} />
            </Link>
            <button className={styles.menuButton} onClick={() => setMenuOpen((o) => !o)} aria-label="Alternar menu">
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
          {menuOpen && (
            <div className={styles.mobileMenu}>
              <a href="#produto" onClick={() => setMenuOpen(false)}>Produto</a>
              <a href="#recursos" onClick={() => setMenuOpen(false)}>Recursos</a>
              <a href="#planos" onClick={() => setMenuOpen(false)}>Planos</a>
              <Link href={loggedIn ? "/app?action=workspace" : "/app?action=login"} onClick={() => setMenuOpen(false)}>
                {loggedIn ? "Abrir sistema" : "Entrar"}
              </Link>
            </div>
          )}
        </nav>

        {/* HERO ------------------------------------------------- */}
        <section className={`${styles.hero} ${styles.layer}`}>
          <div className={styles.heroInner}>
            <motion.div className={styles.heroKicker} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <i /><span>Sistema operacional para clínicas que compartilham espaço</span>
            </motion.div>

            <motion.h1 className={styles.wordmark} initial={{ opacity: 0, y: 24, filter: "blur(14px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}>
              Morpheus
            </motion.h1>

            <motion.p className={styles.tagline} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.35 }}>
              Transforme salas, agendas e profissionais em <em>uma operação que qualquer pessoa entende em segundos.</em>
            </motion.p>

            <motion.p className={styles.heroSub} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.5 }}>
              O caos das planilhas e mensagens vira uma única fonte de verdade — clara, bonita e sem conflitos.
            </motion.p>

            <motion.div className={styles.heroActions} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.6 }}>
              <Magnetic strength={0.35}>
                <Link href={signupHref("essential", true)} className={styles.primaryCta}>
                  Criar minha clínica <ArrowRight size={18} />
                </Link>
              </Magnetic>
              <Magnetic strength={0.2}>
                <a href="#produto" className={styles.secondaryCta}>
                  <LayoutGrid size={17} /> Ver demonstração
                </a>
              </Magnetic>
            </motion.div>

            <motion.div className={styles.heroNotes} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.75 }}>
              <span><Check size={14} /> 7 dias grátis no Essential</span>
              <span><Check size={14} /> Sem instalação</span>
              <span><Check size={14} /> Cancele quando quiser</span>
            </motion.div>

            <motion.div className={styles.heroStage} initial={{ opacity: 0, y: 40, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 1, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}>
              <SpatialScene className={styles.sceneCanvas} />
              <div className={styles.stageBar}>
                <span className={styles.stageDots}><i /><i /><i /></span>
                <span><strong>VISÃO ESPACIAL</strong> · 06 SALAS</span>
                <span>M — 01</span>
              </div>
            </motion.div>

            <div className={styles.scrollCue}>
              <i />
              <span>ROLE PARA EXPLORAR</span>
            </div>
          </div>
        </section>

        {/* TRUST ------------------------------------------------ */}
        <section className={`${styles.trust} ${styles.layer}`}>
          {[
            ["1", "painel para governar tudo"],
            ["3", "leituras: agenda, mapa e rede"],
            ["0", "conflitos de reserva"],
          ].map(([v, l]) => (
            <div className={styles.trustItem} key={l}>
              <CountUp value={v} />
              <span>{l}</span>
            </div>
          ))}
        </section>

        {/* PROBLEM / SOLUTION ---------------------------------- */}
        <section className={`${styles.section} ${styles.layer}`}>
          <Reveal className={styles.sectionHead}>
            <span className={styles.eyebrow}><i />DO CAOS À CLAREZA</span>
            <h2 className={styles.h2}>Uma operação que <em>respira.</em></h2>
            <p className={styles.sectionSub}>Sem planilha perdida, sem &ldquo;essa sala está livre?&rdquo;. O Morpheus unifica tudo em uma regra só.</p>
          </Reveal>
          <div className={styles.split}>
            <Reveal className={`${styles.splitCard} ${styles.chaos}`}>
              <span className={styles.splitTag}>ANTES · FRAGMENTADO</span>
              <h3 className={styles.splitTitle}>Planilha.<br />Mensagem.<br />Conflito.<br />Retrabalho.</h3>
              <div className={styles.chaosList}>
                <i>agenda_final_03.xlsx</i>
                <i>&ldquo;essa sala está livre?&rdquo;</i>
                <i>acesso compartilhado</i>
              </div>
            </Reveal>
            <Reveal className={`${styles.splitCard} ${styles.calm}`} delay={0.12}>
              <span className={styles.splitTag}>DEPOIS · MORPHEUS</span>
              <h3 className={styles.splitTitle}>Uma fonte.<br />Uma regra.<br />Uma leitura.</h3>
              <div className={styles.calmMark}>
                <Layers size={30} />
                <div>
                  <small>OPERAÇÃO</small>
                  <span>MORPHEUS</span>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* PRODUCT ---------------------------------------------- */}
        <section id="produto" className={`${styles.section} ${styles.layer}`}>
          <Reveal className={styles.sectionHead}>
            <span className={styles.eyebrow}><i />O PRODUTO</span>
            <h2 className={styles.h2}>Uma operação. <em>Três leituras.</em></h2>
            <p className={styles.sectionSub}>Alterne entre tempo, espaço e portfólio sem perder o contexto — a informação não deveria exigir treinamento.</p>
          </Reveal>

          <div className={styles.viewTabs}>
            {views.map((v) => {
              const Icon = v.icon;
              return (
                <button key={v.id} className={`${styles.viewTab} ${view === v.id ? styles.active : ""}`} onClick={() => setView(v.id)}>
                  <Icon size={16} /> {v.label}
                </button>
              );
            })}
          </div>

          <Reveal className={styles.demoWrap} key={view}>
            <div className={styles.demo}>
              <div className={styles.demoTop}>
                <span className={styles.demoBrand}><Sparkles size={14} /> MORPHEUS / DEMONSTRAÇÃO</span>
                <span className={styles.demoStatus}><i /> SISTEMA OPERACIONAL</span>
              </div>
              <div className={styles.demoBody}>
                <div>
                  <span className={styles.demoHint}>ESPAÇO CLÍNICO · LEITURA {view.toUpperCase()}</span>
                  <h3 className={styles.demoTitle}>
                    {view === "agenda" ? "A semana sem ruído." : view === "mapa" ? "O espaço como interface." : "Cada clínica no seu lugar."}
                  </h3>
                </div>
                <DemoSurface view={view} />
              </div>
            </div>
          </Reveal>
        </section>

        {/* FEATURES --------------------------------------------- */}
        <section id="recursos" className={`${styles.section} ${styles.layer}`}>
          <Reveal className={styles.sectionHead}>
            <span className={styles.eyebrow}><i />INFRAESTRUTURA</span>
            <h2 className={styles.h2}>Simples na tela. <em>Sério por baixo.</em></h2>
            <p className={styles.sectionSub}>Cada decisão técnica existe para que a sua equipe nunca precise pensar nela.</p>
          </Reveal>
          <div className={styles.features}>
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <Reveal className={styles.feature} delay={(i % 3) * 0.08} key={f.title}>
                  <div className={styles.featureIcon}><Icon size={24} /></div>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                  <span className={styles.featureTag}>{f.tag}</span>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* AUDIENCE --------------------------------------------- */}
        <section className={`${styles.section} ${styles.layer}`}>
          <Reveal className={styles.audience}>
            <div className={styles.audienceIcon}><Sparkles size={28} /></div>
            <h2 className={styles.audienceQuote}>Feito para quem administra uma clínica — <em>não para quem quer aprender software.</em></h2>
          </Reveal>
          <div className={styles.audienceGrid}>
            {[
              [UsersRound, "Legibilidade primeiro", "Contraste, nomes evidentes e caminhos curtos para equipes de todas as idades."],
              [DoorOpen, "Espaço reconhecível", "A sala deixa de ser uma linha abstrata e ganha uma posição visual na operação."],
              [CalendarDays, "Resposta em segundos", "Abra, localize o dia, confirme a sala e siga o atendimento sem atrito."],
            ].map(([Icon, title, text], i) => {
              const I = Icon as typeof UsersRound;
              return (
                <Reveal className={styles.audienceCard} delay={(i % 3) * 0.08} key={title as string}>
                  <I size={26} />
                  <h3>{title as string}</h3>
                  <p>{text as string}</p>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* PRICING ---------------------------------------------- */}
        <section id="planos" className={`${styles.section} ${styles.layer}`}>
          <Reveal className={styles.sectionHead}>
            <span className={styles.eyebrow}><i />PLANOS</span>
            <h2 className={styles.h2}>Capacidade sem <em>complexidade.</em></h2>
            <p className={styles.sectionSub}>Comece pequeno, cresça quando fizer sentido. Sem contrato de permanência.</p>
            <div className={styles.pricingToggle}>
              <button className={!annual ? styles.active : ""} onClick={() => setAnnual(false)}>Mensal</button>
              <button className={annual ? styles.active : ""} onClick={() => setAnnual(true)}>
                Anual <span>−20%</span>
              </button>
            </div>
          </Reveal>

          <div className={styles.plans}>
            {plans.map((p) => (
              <Reveal className={`${styles.plan} ${p.featured ? styles.featured : ""}`} key={p.id}>
                {p.featured && <span className={styles.planBadge}>Mais popular</span>}
                <span className={styles.planName}>{p.name}</span>
                <span className={styles.planDesc}>{p.desc}</span>
                <div className={styles.planPrice}>
                  <small>R$</small>
                  <strong>{annual ? p.annual : p.monthly}</strong>
                  <span>/mês</span>
                </div>
                <span className={styles.planPer}>{annual ? "cobrança anual à vista" : "cobrado por mês"}</span>
                <Link href={signupHref(p.id, p.trial)} className={`${styles.planCta} ${p.featured ? styles.solid : styles.ghost}`}>
                  {p.trial ? "Testar grátis" : "Escolher"} <ArrowRight size={16} />
                </Link>
                <ul className={styles.planFeats}>
                  {p.feats.map((f) => <li key={f}><Check size={15} /> {f}</li>)}
                </ul>
              </Reveal>
            ))}
          </div>
          <p className={styles.pricingNote}>Pagamento processado pela Stripe em ambiente de produção. O teste de 7 dias está disponível no plano Essential.</p>
        </section>

        {/* FINAL CTA -------------------------------------------- */}
        <section className={`${styles.final} ${styles.layer}`}>
          <div className={styles.finalField} aria-hidden="true">
            <AuroraParticles className={styles.finalFieldCanvas} />
          </div>
          <Reveal>
            <h2 className={styles.finalWord}>Morpheus</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className={styles.finalSub}>O próximo andar da sua clínica já pode nascer organizado.</p>
          </Reveal>
          <Reveal delay={0.2}>
            <Magnetic strength={0.4}>
              <Link href={signupHref("essential", true)} className={styles.finalCta}>
                Experimentar por 7 dias <ArrowRight size={18} />
              </Link>
            </Magnetic>
          </Reveal>
          <p className={styles.finalNote}>Sem instalação. Sem cartão para testar. Sem contrato de permanência.</p>
        </section>

        {/* FOOTER ----------------------------------------------- */}
        <footer className={styles.footer}>
          <Link href="/landing" className={styles.footerBrand}>
            <span className={styles.logoMark}><i /><i /><i /></span>
            MORPHEUS
          </Link>
          <span>Infraestrutura digital para clínicas que compartilham espaço.</span>
          <div className={styles.footerLinks}>
            <a href="#produto">Produto</a>
            <a href="#recursos">Recursos</a>
            <a href="#planos">Planos</a>
            <Link href="/app?action=login">Entrar</Link>
          </div>
          <span>© 2026 · Brasil</span>
        </footer>
      </main>
    </SmoothScrollProvider>
  );
}
