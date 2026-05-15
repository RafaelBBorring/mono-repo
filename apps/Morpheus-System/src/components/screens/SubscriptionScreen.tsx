"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { billingStatusLabel } from "@/lib/billing";
import { getPlanById, PLANS, type PlanId } from "@/lib/plans";
import { useApp } from "@/context/AppContext";
import Button from "@/components/ui/Button";
import ThemeToggle from "@/components/ThemeToggle";

function getDaysRemaining(date?: string) {
  if (!date) return null;
  const end = new Date(date).getTime();
  if (Number.isNaN(end)) return null;
  const now = Date.now();
  return Math.max(0, Math.ceil((end - now) / 86_400_000));
}

function goBack(fallback: () => void) {
  if (typeof window !== "undefined" && window.history.length > 1) {
    window.history.back();
    return;
  }
  fallback();
}

export default function SubscriptionScreen() {
  const {
    clinic,
    checkoutEnabled,
    openBillingPortal,
    refreshBilling,
    startCheckout,
    startTrial,
    setView,
    theme,
  } = useApp();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("pro");
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const selected = getPlanById(selectedPlan);
  const selectedPrice = interval === "monthly" ? selected.monthlyLabel : selected.yearlyLabel;
  const daysRemaining = getDaysRemaining(clinic?.currentPeriodEnd);
  const status = clinic ? billingStatusLabel(clinic.stripeStatus) : "Sem clinica selecionada";
  const statusTone =
    clinic?.stripeStatus === "active" || clinic?.stripeStatus === "trialing"
      ? "var(--accent-mint)"
      : clinic?.stripeStatus === "past_due"
        ? "var(--state-error)"
        : "var(--text-muted)";

  const periodText = useMemo(() => {
    if (!clinic?.currentPeriodEnd) return "Periodo ainda nao sincronizado pelo Stripe.";
    const date = new Date(clinic.currentPeriodEnd).toLocaleDateString("pt-BR");
    if (daysRemaining === null) return `Vigencia ate ${date}.`;
    if (daysRemaining === 0) return `Vigencia termina hoje (${date}).`;
    return `${daysRemaining} dia${daysRemaining === 1 ? "" : "s"} restante${daysRemaining === 1 ? "" : "s"} - ate ${date}.`;
  }, [clinic?.currentPeriodEnd, daysRemaining]);

  async function handlePortal() {
    setLoadingAction("portal");
    await openBillingPortal();
    setLoadingAction(null);
  }

  async function handleRefresh() {
    setLoadingAction("refresh");
    await refreshBilling();
    setLoadingAction(null);
  }

  async function handleCheckout() {
    setLoadingAction("checkout");
    await startCheckout(selectedPlan, interval);
    setLoadingAction(null);
  }

  async function handleTrial() {
    setLoadingAction("trial");
    await startTrial();
    setLoadingAction(null);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg-primary)] px-4 py-16 text-[var(--text-primary)] sm:px-5">
      <div className="soft-grid absolute inset-0 opacity-30" />
      <div className="morpheus-screen-wash absolute inset-0" />

      <div className="absolute left-4 top-4 z-20 sm:left-5 sm:top-5">
        <button
          onClick={() => goBack(() => setView("admin"))}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-medium)] bg-[var(--glass-soft)] px-3 py-2 font-body text-sm font-extrabold text-[var(--text-primary)] transition hover:border-[var(--accent-lavender)] sm:rounded-2xl sm:px-4 sm:py-3"
        >
          <ArrowLeft size={17} />
          Voltar
        </button>
      </div>

      <div className="absolute right-4 top-4 z-20 flex items-center gap-2 sm:right-5 sm:top-5">
        <Link
          href="/landing"
          className="rounded-xl border border-[var(--border-medium)] bg-[var(--glass-soft)] px-3 py-2 font-body text-sm font-extrabold text-[var(--text-primary)] transition hover:border-[var(--accent-lavender)] sm:rounded-2xl sm:px-4 sm:py-3"
        >
          Site
        </Link>
        <ThemeToggle />
      </div>

      <main className="relative z-10 mx-auto w-full max-w-6xl">
        <div className="mb-8 pt-10 text-center sm:pt-8">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--action-primary),var(--action-secondary))] text-[var(--action-foreground)] shadow-2xl">
            <CreditCard size={26} />
          </div>
          <p className="font-body text-sm font-extrabold uppercase tracking-[0.28em] text-[var(--accent-mint)]">
            Assinatura
          </p>
          <h1 className="mt-4 font-brand text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
            Plano, cobranca e acesso da clinica.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl font-body text-base leading-8 text-[var(--text-muted)] sm:text-lg">
            Veja o status, troque de plano ou abra o Stripe Portal para cancelar a assinatura e gerenciar a cobranca.
          </p>
        </div>

        {!clinic ? (
          <section className="mx-auto max-w-xl rounded-3xl premium-panel p-6 text-center md:p-8">
            <ShieldCheck className="mx-auto text-[var(--accent-lavender)]" size={34} />
            <h2 className="mt-4 font-brand text-2xl font-semibold">Selecione uma clinica primeiro</h2>
            <p className="mt-3 font-body text-sm leading-7 text-[var(--text-muted)]">
              A assinatura pertence a uma clinica. Escolha uma das clinicas que voce administra para continuar.
            </p>
            <Button className="mt-5" variant="gradient" size="lg" onClick={() => setView("workspace")}>
              Escolher clinica
            </Button>
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
            <section className="rounded-3xl premium-panel p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-body text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    {clinic.name}
                  </p>
                  <h2 className="mt-2 font-brand text-3xl font-semibold" style={{ color: statusTone }}>
                    {status}
                  </h2>
                </div>
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--glass-soft)] text-[var(--accent-lavender)] ring-1 ring-[var(--border-light)]">
                  <ShieldCheck size={24} />
                </span>
              </div>

              <div className="mt-6 grid gap-3">
                <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--glass-soft)] p-4">
                  <div className="flex items-center gap-3">
                    <CalendarClock size={20} className="text-[var(--accent-sky)]" />
                    <p className="font-body text-sm font-extrabold text-[var(--text-soft)]">{periodText}</p>
                  </div>
                </div>
                {clinic.cancelAtPeriodEnd && (
                  <div className="rounded-2xl border border-[var(--state-warning)]/40 bg-[var(--glass-soft)] p-4">
                    <p className="font-body text-sm font-extrabold text-[var(--accent-amber)]">
                      Cancelamento agendado no fim do periodo atual.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 grid gap-3">
                <button
                  onClick={handlePortal}
                  disabled={loadingAction === "portal" || !checkoutEnabled || !clinic.stripeCustomerId}
                  className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl border border-[var(--border-medium)] bg-[var(--bg-elevated)] px-5 py-3 font-body text-base font-extrabold text-[var(--text-primary)] transition hover:border-[var(--accent-lavender)] disabled:opacity-55"
                >
                  <CreditCard size={20} />
                  {loadingAction === "portal" ? "Abrindo..." : "Cancelar ou gerenciar no Stripe"}
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={loadingAction === "refresh"}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-5 py-3 font-body text-sm font-bold text-[var(--text-muted)] transition hover:text-[var(--text-primary)] disabled:opacity-55"
                >
                  <RefreshCw
                    size={17}
                    className={theme === "dark" ? "text-[var(--accent-sky)]" : "text-[var(--accent-lavender)]"}
                  />
                  {loadingAction === "refresh" ? "Atualizando..." : "Atualizar status"}
                </button>
              </div>

              {!checkoutEnabled && (
                <p className="mt-4 rounded-2xl border border-[var(--border-light)] bg-[var(--glass-soft)] p-4 font-body text-sm font-bold leading-6 text-[var(--text-muted)]">
                  No GitHub Pages, use Stripe Payment Links publicos ou um backend separado. Chaves secretas continuam fora
                  do navegador.
                </p>
              )}
            </section>

            <section className="rounded-3xl premium-panel p-6 md:p-8">
              <p className="font-body text-sm font-extrabold uppercase tracking-[0.24em] text-[var(--accent-mint)]">
                Mudar plano
              </p>
              <h2 className="mt-3 font-brand text-3xl font-semibold">Escolha uma nova configuracao.</h2>

              <div className="mt-5 flex w-fit items-center gap-1 rounded-2xl border border-[var(--border-medium)] bg-[var(--bg-surface)] p-1">
                <button
                  onClick={() => setInterval("monthly")}
                  className={`rounded-xl px-4 py-2 font-body text-sm font-extrabold transition ${
                    interval === "monthly"
                      ? "bg-[var(--action-primary)] text-[var(--action-foreground)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  Mensal
                </button>
                <button
                  onClick={() => setInterval("yearly")}
                  className={`rounded-xl px-4 py-2 font-body text-sm font-extrabold transition ${
                    interval === "yearly"
                      ? "bg-[var(--action-primary)] text-[var(--action-foreground)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  Anual
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {PLANS.map((plan) => {
                  const active = selectedPlan === plan.id;
                  return (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        active
                          ? "border-[var(--accent-lavender)] bg-[var(--bg-elevated)] ring-2 ring-[var(--accent-lavender)]"
                          : "border-[var(--border-light)] bg-[var(--glass-soft)] hover:border-[var(--accent-lavender)]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-brand text-xl font-semibold">{plan.name}</p>
                        {active && <CheckCircle2 size={18} className="text-[var(--accent-mint)]" />}
                      </div>
                      <p className="mt-2 font-body text-xs font-bold leading-5 text-[var(--text-muted)]">
                        Ate {plan.maxRooms} salas e {plan.maxDoctors} profissionais.
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="gradient"
                  size="lg"
                  onClick={handleCheckout}
                  disabled={loadingAction !== null || !checkoutEnabled}
                >
                  <CreditCard size={20} />
                  {loadingAction === "checkout" ? "Abrindo..." : `Mudar para ${selected.name} - ${selectedPrice}`}
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={handleTrial}
                  disabled={loadingAction !== null || !checkoutEnabled}
                >
                  <Sparkles size={20} />
                  Teste gratis
                </Button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
