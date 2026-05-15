"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import SmoothScrollProvider from "@/components/SmoothScroll";
import LandingAgendaPreview from "@/components/landing/LandingAgendaPreview";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck2,
  ChevronRight,
  Clock3,
  CreditCard,
  DoorOpen,
  Headphones,
  Layers3,
  LockKeyhole,
  Menu,
  MessageCircle,
  MousePointerClick,
  Sparkles,
  UsersRound,
  Wand2,
  X,
  Zap,
} from "lucide-react";

const LandingShowcase = dynamic(
  () => import("@/components/visuals/MorpheusThree").then((mod) => mod.LandingShowcase),
  {
    ssr: false,
    loading: () => <div className="absolute inset-0 soft-grid opacity-30" />,
  }
);

const carouselItems = [
  {
    title: "Agenda viva",
    eyebrow: "Visão em segundos",
    text: "Veja horários livres, reservas em andamento e ocupação de cada sala sem procurar em várias telas.",
    icon: CalendarCheck2,
    accent: "var(--accent-lavender)",
  },
  {
    title: "Salas objetivas",
    eyebrow: "Sala 1, Sala 2, Sala 3",
    text: "Organize a clínica com identificadores simples de sala, sem depender de nomes decorativos que confundem a operação.",
    icon: DoorOpen,
    accent: "var(--accent-mint)",
  },
  {
    title: "Multi-doutores",
    eyebrow: "Uma clínica, vários perfis",
    text: "Vários doutores podem reservar horários na mesma clínica, cada um com sua agenda e visão de disponibilidade.",
    icon: UsersRound,
    accent: "var(--accent-amber)",
  },
  {
    title: "Reserva expressa",
    eyebrow: "Menos atrito",
    text: "O fluxo foi desenhado para que uma reserva comum aconteça em poucos cliques, com conflito bloqueado automaticamente.",
    icon: Zap,
    accent: "var(--accent-sky)",
  },
];

const benefits = [
  {
    title: "Administração completa",
    text: "Agenda geral, criação de salas, contas para profissionais e leitura rápida do dia.",
    icon: Layers3,
  },
  {
    title: "Multi-doutores por clínica",
    text: "Cadastre vários doutores na mesma clínica e mantenha reservas separadas sem perder a visão geral.",
    icon: UsersRound,
  },
  {
    title: "Salas sob demanda",
    text: "Adicione novas salas quando a clínica crescer e acompanhe ocupação, disponibilidade e conflitos.",
    icon: BadgeCheck,
  },
  {
    title: "Suporte humano",
    text: "Contato direto para onboarding, dúvidas e ajustes de implantação.",
    icon: Headphones,
  },
];

const plans = [
  {
    id: "essential",
    name: "Essential",
    price: "R$ 30",
    cadence: "/mês",
    note: "Para clínicas que estão começando",
    cta: "Assinar Essential",
    highlight: false,
    bullets: ["Até 3 salas", "Até 10 profissionais", "Agenda completa", "Suporte por e-mail"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "R$ 50",
    cadence: "/mês",
    note: "Para clínicas em crescimento",
    cta: "Assinar Pro",
    highlight: true,
    bullets: ["Até 6 salas", "Até 15 profissionais", "Tudo do Essential", "Prioridade no suporte"],
  },
  {
    id: "elite",
    name: "Elite",
    price: "R$ 80",
    cadence: "/mês",
    note: "Para clínicas consolidadas",
    cta: "Assinar Elite",
    highlight: false,
    bullets: ["Até 10 salas", "Até 20 profissionais", "Tudo do Pro", "Onboarding assistido"],
  },
];

export default function LandingPage() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loggedRole, setLoggedRole] = useState<string | null>(null);
  const active = carouselItems[activeSlide];
  const ActiveIcon = active.icon;

  useEffect(() => {
    try {
      const raw = localStorage.getItem("morpheus_auth");
      setLoggedIn(!!raw);
      setLoggedRole(raw ? JSON.parse(raw)?.role ?? null : null);
    } catch {
      setLoggedIn(false);
      setLoggedRole(null);
    }
  }, []);

  function handleLogout() {
    try {
      localStorage.removeItem("morpheus_auth");
      localStorage.removeItem("morpheus_workspace");
    } catch {}
    setLoggedIn(false);
    setLoggedRole(null);
  }

  return (
    <SmoothScrollProvider>
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] noise-mask">
      <nav className="fixed left-0 right-0 top-0 z-50 px-3 py-3 sm:px-4 sm:py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl premium-glass px-3 py-2.5 sm:rounded-3xl sm:px-4 sm:py-3 md:px-6">
          <Link href="/" className="flex items-center gap-2 sm:gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--action-primary)] text-[var(--action-foreground)] shadow-lg sm:h-11 sm:w-11 sm:rounded-2xl">
              <Wand2 size={18} />
            </span>
            <span className="font-brand text-base font-semibold tracking-[0.18em] sm:text-xl">MORPHEUS</span>
          </Link>
          <div className="hidden items-center gap-7 font-body text-sm font-semibold text-[var(--text-soft)] md:flex">
            <a href="#funcionalidades" className="hover:text-[var(--text-primary)]">Funcionalidades</a>
            <a href="#planos" className="hover:text-[var(--text-primary)]">Planos</a>
            <a href="#contato" className="hover:text-[var(--text-primary)]">Contato</a>
          </div>
          <div className="flex items-center gap-2">
            {loggedIn ? (
              <>
                <Link
                  href="/app?action=workspace"
                  className="hidden rounded-xl border border-[var(--border-light)] px-3 py-2 font-body text-sm font-bold text-[var(--text-primary)] transition hover:border-[var(--accent-lavender)] hover:bg-[var(--bg-elevated)] sm:inline-flex sm:rounded-2xl sm:px-4 sm:py-3"
                >
                  Minhas clinicas
                </Link>
                {loggedRole === "admin" && (
                  <Link
                    href="/app?action=subscription"
                    className="hidden rounded-xl border border-[var(--border-light)] px-3 py-2 font-body text-sm font-bold text-[var(--text-primary)] transition hover:border-[var(--accent-mint)] hover:bg-[var(--bg-elevated)] lg:inline-flex lg:rounded-2xl lg:px-4 lg:py-3"
                  >
                    Assinatura
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="hidden rounded-xl border border-[var(--border-light)] px-3 py-2 font-body text-sm font-bold text-[var(--text-muted)] transition hover:border-red-400 hover:text-red-400 sm:inline-flex sm:rounded-2xl sm:px-4 sm:py-3"
                >
                  Sair
                </button>
              </>
            ) : (
              <Link
                href="/app"
                className="hidden rounded-xl border border-[var(--border-light)] px-3 py-2 font-body text-sm font-bold text-[var(--text-primary)] transition hover:border-[var(--accent-lavender)] hover:bg-[var(--bg-elevated)] sm:inline-flex sm:rounded-2xl sm:px-4 sm:py-3"
              >
                Entrar
              </Link>
            )}

            <a
              href="#planos"
              className="magnetic-button inline-flex items-center gap-1.5 rounded-xl bg-[linear-gradient(135deg,var(--action-primary),var(--action-secondary))] px-3 py-2 font-body text-sm font-bold text-[var(--action-foreground)] shadow-xl shadow-black/20 sm:gap-2 sm:rounded-2xl sm:px-5 sm:py-3"
            >
              Ver planos
              <ArrowRight size={16} />
            </a>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-soft)] md:hidden"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="mx-auto mt-2 max-w-7xl rounded-2xl premium-glass p-4 md:hidden">
            <div className="flex flex-col gap-4">
              <a href="#funcionalidades" onClick={() => setMobileMenuOpen(false)} className="font-body text-base font-semibold text-[var(--text-soft)] hover:text-[var(--text-primary)]">Funcionalidades</a>
              <a href="#planos" onClick={() => setMobileMenuOpen(false)} className="font-body text-base font-semibold text-[var(--text-soft)] hover:text-[var(--text-primary)]">Planos</a>
              <a href="#contato" onClick={() => setMobileMenuOpen(false)} className="font-body text-base font-semibold text-[var(--text-soft)] hover:text-[var(--text-primary)]">Contato</a>
              {loggedIn ? (
                <>
                  <Link
                    href="/app?action=workspace"
                    className="inline-flex items-center justify-center rounded-xl border border-[var(--border-light)] px-4 py-3 font-body text-base font-bold text-[var(--text-primary)] transition hover:border-[var(--accent-lavender)]"
                  >
                    Minhas clinicas
                  </Link>
                  {loggedRole === "admin" && (
                    <Link
                      href="/app?action=subscription"
                      className="inline-flex items-center justify-center rounded-xl border border-[var(--border-light)] px-4 py-3 font-body text-base font-bold text-[var(--text-primary)] transition hover:border-[var(--accent-mint)]"
                    >
                      Assinatura
                    </Link>
                  )}
                  <button
                    onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                    className="inline-flex items-center justify-center rounded-xl border border-[var(--border-light)] px-4 py-3 font-body text-base font-bold text-[var(--text-muted)] transition hover:border-red-400 hover:text-red-400"
                  >
                    Sair
                  </button>
                </>
              ) : (
                <Link
                  href="/app"
                  className="inline-flex items-center justify-center rounded-xl border border-[var(--border-light)] px-4 py-3 font-body text-base font-bold text-[var(--text-primary)] transition hover:border-[var(--accent-lavender)]"
                >
                  Entrar no sistema
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      <header className="relative isolate flex min-h-[85vh] items-center overflow-hidden px-4 pb-12 pt-28 sm:min-h-[92vh] sm:px-5 sm:pb-16 sm:pt-32 md:px-8">
        <LandingShowcase className="absolute inset-0 z-0" />
        <div className="landing-hero-wash absolute inset-0 z-0" />
        <div className="absolute inset-x-0 bottom-0 z-0 h-32 bg-[linear-gradient(180deg,transparent,var(--bg-primary))] sm:h-44" />

        <div className="relative z-10 mx-auto grid w-full max-w-7xl gap-8 sm:gap-12">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-4xl"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--border-light)] bg-[var(--glass-strong)] px-3 py-1.5 font-body text-xs font-bold text-[var(--text-soft)] backdrop-blur-xl sm:mb-7 sm:px-4 sm:py-2 sm:text-sm">
              <Sparkles size={14} className="text-[var(--accent-amber)]" />
              Clínica virtual para gestão de salas, reservas e profissionais
            </div>

            <h1 className="font-brand text-[clamp(3.5rem,13vw,10.5rem)] font-semibold leading-[0.84] tracking-[0.02em] aurora-text">
              Morpheus
            </h1>
            <p className="mt-5 max-w-2xl font-body text-lg leading-8 text-[var(--text-soft)] sm:mt-8 md:text-xl md:leading-9 lg:text-2xl lg:leading-10">
              Uma plataforma simples e profissional para clínicas que precisam organizar salas,
              conectar vários doutores e reservar horários sem fricção.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:gap-4">
              <Link
                href="/app?action=signup&plan=essential"
                className="magnetic-button inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--action-primary),var(--action-secondary))] px-6 py-3 font-body text-base font-extrabold text-[var(--action-foreground)] shadow-2xl shadow-black/25 sm:min-h-[58px] sm:gap-3 sm:rounded-2xl sm:px-8 sm:py-4 sm:text-lg"
              >
                Testar grátis por 7 dias
                <Sparkles size={20} />
              </Link>
              <a
                href="#planos"
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-[var(--border-medium)] bg-[var(--glass-soft)] px-6 py-3 font-body text-base font-bold text-[var(--text-primary)] backdrop-blur transition hover:border-[var(--accent-lavender)] hover:bg-[var(--bg-elevated)] sm:min-h-[58px] sm:gap-3 sm:rounded-2xl sm:px-8 sm:py-4 sm:text-lg"
              >
                Ver planos
                <ArrowRight size={20} />
              </a>
            </div>

            {loggedIn && (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/app?action=workspace"
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[var(--accent-mint)] bg-[var(--glass-strong)] px-5 py-3 font-body text-sm font-extrabold text-[var(--accent-mint)] backdrop-blur transition hover:bg-[var(--accent-mint)] hover:text-[#062019] sm:rounded-2xl"
                >
                  Minhas clinicas
                  <ArrowRight size={18} />
                </Link>
                {loggedRole === "admin" && (
                  <Link
                    href="/app?action=subscription"
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[var(--border-medium)] bg-[var(--glass-soft)] px-5 py-3 font-body text-sm font-extrabold text-[var(--text-primary)] backdrop-blur transition hover:border-[var(--accent-lavender)] sm:rounded-2xl"
                  >
                    Minha assinatura
                    <CreditCard size={18} />
                  </Link>
                )}
              </div>
            )}
          </motion.div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["5s", "para encontrar um horário livre"],
              ["7 dias", "de teste grátis sem cartão"],
              ["R$ 30", "por mês, plano mais acessível"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-[var(--border-light)] bg-[var(--glass-strong)] p-4 backdrop-blur-xl sm:rounded-3xl sm:p-5">
                <p className="font-brand text-3xl font-semibold text-[var(--accent-lavender)] sm:text-4xl">{value}</p>
                <p className="mt-1.5 font-body text-xs font-semibold text-[var(--text-muted)] sm:mt-2 sm:text-sm">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main>
        <section id="funcionalidades" className="px-4 py-16 sm:px-5 sm:py-20 md:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 flex flex-col justify-between gap-6 md:mb-12 md:flex-row md:items-end">
              <div>
                <p className="font-body text-sm font-extrabold uppercase tracking-[0.28em] text-[var(--accent-mint)]">
                  Operação sem improviso
                </p>
                <h2 className="mt-4 max-w-3xl font-brand text-3xl font-semibold leading-tight md:text-4xl lg:text-6xl">
                  Sua clínica cresce sem ficar presa a uma agenda engessada.
                </h2>
              </div>
              <p className="max-w-xl font-body text-base leading-8 text-[var(--text-muted)] md:text-lg">
                O Morpheus foi pensado como uma clínica virtual: você cria salas, organiza
                profissionais, acompanha o dia e abre reservas em uma interface visual.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <motion.div
                    key={benefit.title}
                    initial={{ opacity: 0, y: 22 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.06 }}
                    className="group min-h-[220px] rounded-2xl premium-panel p-6 transition hover:-translate-y-1 hover:border-[var(--accent-lavender)] sm:min-h-[250px] sm:p-7 sm:rounded-3xl"
                  >
                    <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--glass-soft)] text-[var(--accent-lavender)] ring-1 ring-[var(--border-light)] sm:mb-7 sm:h-14 sm:w-14 sm:rounded-2xl">
                      <Icon size={24} />
                    </div>
                    <h3 className="font-brand text-xl font-semibold sm:text-2xl">{benefit.title}</h3>
                    <p className="mt-3 font-body text-sm leading-7 text-[var(--text-muted)] sm:mt-4 sm:text-base">{benefit.text}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="experiencia" className="px-4 py-16 sm:px-5 sm:py-20 md:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col justify-between gap-6 md:mb-10 md:flex-row md:items-end">
              <div>
                <p className="font-body text-sm font-extrabold uppercase tracking-[0.28em] text-[var(--accent-sky)]">
                  Agenda real da clinica
                </p>
                <h2 className="mt-4 max-w-4xl font-brand text-3xl font-semibold leading-tight md:text-4xl lg:text-6xl">
                  Veja datas, salas dinamicas e reservas de doutores em uma unica leitura.
                </h2>
              </div>
              <p className="max-w-xl font-body text-base leading-8 text-[var(--text-muted)] md:text-lg">
                A agenda mostra a semana, abre cada sala cadastrada como coluna interna e posiciona as reservas por
                horario, doutor e sala. E a visao que reduz duvida antes dela virar retrabalho.
              </p>
            </div>
            <LandingAgendaPreview />
          </div>
        </section>

        <section id="experiencia-legacy" className="hidden px-4 py-16 sm:px-5 sm:py-20 md:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:gap-10">
            <div>
              <p className="font-body text-sm font-extrabold uppercase tracking-[0.28em] text-[var(--accent-sky)]">
                Reserva em ritmo de pensamento
              </p>
              <h2 className="mt-4 font-brand text-3xl font-semibold leading-tight md:text-4xl lg:text-5xl">
                Uma agenda que responde antes da dúvida virar trabalho.
              </h2>
              <p className="mt-5 font-body text-base leading-8 text-[var(--text-muted)] md:text-lg">
                Troque o carrossel abaixo e veja como o sistema comunica salas,
                disponibilidade e profissionais com uma hierarquia visual direta.
              </p>

              <div className="mt-6 grid gap-3 sm:mt-8">
                {carouselItems.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = activeSlide === index;
                  return (
                    <button
                      key={item.title}
                      onClick={() => setActiveSlide(index)}
                      className="group flex items-center gap-3 rounded-2xl border p-3 text-left transition sm:gap-4 sm:p-4 sm:rounded-3xl"
                      style={{
                        borderColor: isActive ? item.accent : "var(--border-light)",
                        background: isActive ? "var(--bg-elevated)" : "var(--glass-soft)",
                      }}
                    >
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl"
                        style={{ color: item.accent, background: "var(--bg-primary)" }}
                      >
                        <Icon size={20} />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-body text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                          {item.eyebrow}
                        </span>
                        <span className="mt-1 block font-brand text-lg font-semibold text-[var(--text-primary)] sm:text-xl">
                          {item.title}
                        </span>
                      </span>
                      <ChevronRight
                        size={18}
                        className="ml-auto hidden text-[var(--text-muted)] transition group-hover:translate-x-1 sm:block"
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <motion.div
              key={active.title}
              initial={{ opacity: 0, scale: 0.98, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.36 }}
              className="relative hidden min-h-[480px] overflow-hidden rounded-2xl border border-[var(--border-light)] bg-[linear-gradient(160deg,var(--bg-elevated),var(--bg-surface))] p-4 shadow-2xl md:block md:min-h-[580px] md:rounded-[2rem] md:p-5"
            >
              <div className="absolute inset-0 soft-grid opacity-30" />
              <div className="relative flex h-full flex-col">
                <div className="mb-4 flex items-center justify-between rounded-2xl border border-[var(--border-light)] bg-[var(--glass-strong)] p-3 sm:mb-5 sm:p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl" style={{ color: active.accent, background: "var(--bg-primary)" }}>
                      <ActiveIcon size={22} />
                    </span>
                    <div>
                      <p className="font-body text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                        {active.eyebrow}
                      </p>
                      <h3 className="font-brand text-xl font-semibold sm:text-2xl">{active.title}</h3>
                    </div>
                  </div>
                  <Clock3 size={22} style={{ color: active.accent }} />
                </div>

                <div className="grid flex-1 grid-cols-[60px_repeat(4,minmax(0,1fr))] gap-1.5 sm:grid-cols-[74px_repeat(4,minmax(0,1fr))] sm:gap-2">
                  {["Hora", "Sala 1", "Sala 2", "Sala 3", "Sala 4"].map((label) => (
                    <div key={label} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--glass-soft)] p-2 text-center font-body text-[10px] font-extrabold uppercase tracking-[0.12em] text-[var(--text-muted)] sm:rounded-2xl sm:p-3 sm:text-xs">
                      {label}
                    </div>
                  ))}
                  {["08:00", "09:00", "10:00", "11:00", "13:00", "14:00"].map((hour, row) => (
                    <div key={hour} className="contents">
                      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--glass-soft)] p-2 font-brand text-xs text-[var(--text-soft)] sm:rounded-2xl sm:p-3 sm:text-sm">
                        {hour}
                      </div>
                      {[0, 1, 2, 3].map((col) => {
                        const busy = (row + col + activeSlide) % 4 === 0;
                        const hot = (row * 2 + col + activeSlide) % 7 === 0;
                        const doctor = ["Dra. Ana", "Dr. Caio", "Dra. Lia", "Dr. Theo"][
                          (row + col + activeSlide) % 4
                        ];
                        return (
                          <div
                            key={`${hour}-${col}`}
                            className="relative min-h-[60px] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-1.5 sm:min-h-[72px] sm:rounded-2xl sm:p-2"
                          >
                            {busy ? (
                              <motion.div
                                layout
                                className="flex h-full items-center justify-center rounded-lg border px-1 text-center font-brand text-[10px] font-bold leading-tight sm:rounded-xl sm:text-xs"
                                style={{
                                  color: hot ? "var(--accent-amber)" : active.accent,
                                  borderColor: hot ? "rgba(255,209,102,0.38)" : active.accent,
                                  background: hot ? "rgba(255,209,102,0.1)" : "var(--glass-soft)",
                                }}
                              >
                                {doctor}
                              </motion.div>
                            ) : (
                              <motion.div
                                layout
                                className="flex h-full items-center justify-center rounded-lg border border-dashed border-[var(--border-light)] font-body text-[10px] font-bold text-[var(--accent-mint)] sm:rounded-xl sm:text-xs"
                              >
                                Livre
                              </motion.div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-4 border-t border-[var(--border-light)] pt-4 sm:mt-5 sm:grid-cols-[1fr_0.95fr] sm:pt-5">
                  <p className="font-body text-base leading-8 text-[var(--text-soft)] sm:text-lg">
                    {active.text}
                  </p>
                  <div className="flex items-start gap-3">
                    <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--glass-soft)] text-[var(--accent-amber)] ring-1 ring-[var(--border-light)]">
                      <UsersRound size={20} />
                    </span>
                    <div>
                      <p className="font-body text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        Multi-doutores
                      </p>
                      <p className="mt-1 font-body text-sm leading-6 text-[var(--text-soft)] sm:text-base">
                        Vários doutores reservam salas na mesma clínica, com conflitos bloqueados e agenda individual.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="planos" className="px-4 py-16 sm:px-5 sm:py-20 md:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 text-center md:mb-12">
              <p className="font-body text-sm font-extrabold uppercase tracking-[0.28em] text-[var(--accent-amber)]">
                Planos
              </p>
              <h2 className="mt-4 font-brand text-3xl font-semibold md:text-4xl lg:text-5xl">
                Preço simples para uma clínica inteira.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl font-body text-base leading-8 text-[var(--text-muted)] md:text-lg">
                Escolha o plano ideal. Todos incluem <strong>7 dias grátis</strong> para testar sem compromisso.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative overflow-hidden rounded-2xl p-6 sm:rounded-[2rem] sm:p-7 ${
                    plan.highlight ? "border-2 border-[var(--accent-mint)] bg-[var(--bg-elevated)]" : "premium-panel"
                  }`}
                >
                  {plan.highlight && (
                    <span className="absolute right-4 top-4 rounded-full bg-[var(--accent-mint)] px-3 py-1.5 font-body text-xs font-extrabold uppercase tracking-[0.16em] text-[#062019] sm:right-5 sm:top-5 sm:px-4 sm:py-2">
                      mais popular
                    </span>
                  )}
                  <h3 className="font-brand text-2xl font-semibold md:text-3xl">{plan.name}</h3>
                  <p className="mt-2 font-body text-sm text-[var(--text-muted)] md:text-base">{plan.note}</p>
                  <div className="mt-6 flex items-end gap-2 sm:mt-8">
                    <span className="font-brand text-4xl font-semibold sm:text-5xl md:text-6xl">{plan.price}</span>
                    <span className="pb-1 font-body text-lg font-bold text-[var(--text-muted)] sm:pb-2 sm:text-xl">{plan.cadence}</span>
                  </div>
                  <div className="mt-6 grid gap-3 sm:mt-8">
                    {plan.bullets.map((bullet) => (
                      <div key={bullet} className="flex items-center gap-3 font-body text-sm font-semibold text-[var(--text-soft)] sm:text-base">
                        <BadgeCheck size={18} className="text-[var(--accent-mint)] sm:size-5" />
                        {bullet}
                      </div>
                    ))}
                  </div>
                  <Link
                    href={`/app?action=signup&plan=${plan.id}`}
                    className="magnetic-button mt-6 inline-flex w-full items-center justify-center gap-3 rounded-xl bg-[linear-gradient(135deg,var(--action-primary),var(--action-secondary))] px-6 py-3 font-body text-base font-extrabold text-[var(--action-foreground)] shadow-xl sm:mt-8 sm:rounded-2xl sm:px-8 sm:py-4 sm:text-lg"
                  >
                    {plan.cta}
                    <ArrowRight size={20} />
                  </Link>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Link
                href="/app?action=signup&plan=essential"
                className="magnetic-button inline-flex items-center gap-3 rounded-2xl border-2 border-[var(--accent-mint)] px-8 py-4 font-body text-lg font-extrabold text-[var(--accent-mint)] transition hover:bg-[var(--accent-mint)] hover:text-[#062019] sm:px-10 sm:py-5 sm:text-xl"
              >
                <Sparkles size={22} />
                Testar grátis por 7 dias
              </Link>
              <p className="mt-3 font-body text-sm text-[var(--text-muted)]">
                Sem cartão de crédito. Plano Essential durante o trial.
              </p>
            </div>
          </div>
        </section>

        <section id="contato" className="px-4 py-16 sm:px-5 sm:py-20 md:px-8">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-elevated)] p-6 md:flex-row md:items-center md:rounded-[2rem] md:p-8 lg:p-12">
            <div>
              <p className="font-body text-sm font-extrabold uppercase tracking-[0.28em] text-[var(--accent-lavender)]">
                Implantação assistida
              </p>
              <h2 className="mt-4 max-w-3xl font-brand text-3xl font-semibold leading-tight md:text-4xl lg:text-5xl">
                Vamos colocar a sua clínica dentro do Morpheus.
              </h2>
            </div>
            <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
              <Link
                href="/app"
                className="inline-flex min-h-[52px] items-center justify-center gap-3 rounded-xl border border-[var(--border-medium)] px-6 py-3 font-body text-base font-bold text-[var(--text-primary)] transition hover:border-[var(--accent-lavender)] sm:min-h-[58px] sm:rounded-2xl sm:px-7 sm:py-4 sm:text-lg"
              >
                Acessar sistema
                <LockKeyhole size={20} />
              </Link>
              <a
                href="mailto:contato@morpheus.local?subject=Quero%20assinar%20o%20Morpheus"
                className="magnetic-button inline-flex min-h-[52px] items-center justify-center gap-3 rounded-xl bg-[linear-gradient(135deg,var(--action-primary),var(--action-secondary))] px-6 py-3 font-body text-base font-extrabold text-[var(--action-foreground)] shadow-xl sm:min-h-[58px] sm:rounded-2xl sm:px-7 sm:py-4 sm:text-lg"
              >
                Falar com especialista
                <MessageCircle size={20} />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border-subtle)] px-4 py-8 sm:px-5 sm:py-10 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 font-body text-sm text-[var(--text-muted)] md:flex-row">
          <span className="font-brand tracking-[0.18em] text-[var(--text-primary)]">MORPHEUS</span>
          <span>&copy; 2026 Morpheus. Gestão visual para clínicas de psicologia.</span>
        </div>
      </footer>
    </div>
    </SmoothScrollProvider>
  );
}
