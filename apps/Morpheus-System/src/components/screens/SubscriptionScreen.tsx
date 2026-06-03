"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Tag,
  XCircle,
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
  const searchParams = useSearchParams();
  const {
    clinic,
    checkoutEnabled,
    serverApiAvailable,
    openBillingPortal,
    cancelSubscription,
    refreshBilling,
    startCheckout,
    startTrial,
    setView,
    theme,
    validateCoupon,
  } = useApp();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("pro");
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; label: string; discountPct: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const selected = getPlanById(selectedPlan);
  const selectedPrice = interval === "monthly" ? selected.monthlyLabel : selected.yearlyLabel;
  const daysRemaining = getDaysRemaining(clinic?.currentPeriodEnd);
  const isActive = clinic?.stripeStatus === "active" || clinic?.stripeStatus === "trialing";
  const isTrialing = clinic?.stripeStatus === "trialing";
  const hasSubscription = !!clinic?.stripeSubscriptionId && clinic.stripeStatus !== "canceled" && clinic.stripeStatus !== "inactive";
  const status = clinic ? billingStatusLabel(clinic.stripeStatus) : "Sem clinica selecionada";
  const statusTone =
    isActive
      ? "var(--accent-mint)"
      : clinic?.stripeStatus === "past_due"
        ? "var(--state-error)"
        : "var(--text-muted)";

  useEffect(() => {
    const plan = searchParams.get("plan") as PlanId | null;
    if (plan && PLANS.some((item) => item.id === plan)) {
      setSelectedPlan(plan);
    }
  }, [searchParams]);

  const periodText = useMemo(() => {
    if (!clinic?.currentPeriodEnd) return null;
    const date = new Date(clinic.currentPeriodEnd).toLocaleDateString("pt-BR");
    if (isTrialing) {
      if (daysRemaining === 0) return `Teste gratis encerra hoje (${date}).`;
      return `Teste gratis: ${daysRemaining} dia${daysRemaining === 1 ? "" : "s"} restante${daysRemaining === 1 ? "" : "s"} (ate ${date}).`;
    }
    if (daysRemaining === null) return `Vigencia ate ${date}.`;
    if (daysRemaining === 0) return `Vigencia encerra hoje (${date}).`;
    return `${daysRemaining} dia${daysRemaining === 1 ? "" : "s"} restante${daysRemaining === 1 ? "" : "s"} (ate ${date}).`;
  }, [clinic?.currentPeriodEnd, daysRemaining, isTrialing]);

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
    await startCheckout(selectedPlan, interval, undefined, false, appliedCoupon?.code);
    setLoadingAction(null);
  }

  async function handleApplyCoupon() {
    setCouponError(null);
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    const result = await validateCoupon(couponInput);
    setCouponLoading(false);
    if (result.valid && result.coupon) {
      setAppliedCoupon(result.coupon);
      setCouponInput("");
    } else {
      setAppliedCoupon(null);
      setCouponError(result.error || "Cupom invalido.");
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponError(null);
  }

  async function handleTrial() {
    setLoadingAction("trial");
    await startTrial();
    setLoadingAction(null);
  }

  async function handleCancel() {
    if (!window.confirm("Deseja cancelar sua assinatura? O acesso sera encerrado ao fim do periodo atual.")) {
      return;
    }
    setLoadingAction("cancel");
    await cancelSubscription();
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
            Plano e cobranca
          </h1>
          <p className="mx-auto mt-4 max-w-2xl font-body text-base leading-8 text-[var(--text-muted)] sm:text-lg">
            Gerencie seu plano, forma de pagamento e assinatura.
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

              {isTrialing && (
                <div className="mt-4 rounded-2xl border border-[var(--accent-mint)]/30 bg-[var(--accent-mint)]/5 p-4">
                  <div className="flex items-center gap-3">
                    <Sparkles size={20} className="text-[var(--accent-mint)]" />
                    <p className="font-body text-sm font-extrabold text-[var(--accent-mint)]">
                      Voce esta no periodo de teste gratuito de 7 dias
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-4 grid gap-3">
                {periodText && (
                  <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--glass-soft)] p-4">
                    <div className="flex items-center gap-3">
                      <CalendarClock size={20} className="text-[var(--accent-sky)]" />
                      <p className="font-body text-sm font-extrabold text-[var(--text-soft)]">{periodText}</p>
                    </div>
                  </div>
                )}
                {clinic.cancelAtPeriodEnd && (
                  <div className="rounded-2xl border border-[var(--state-warning)]/40 bg-[var(--glass-soft)] p-4">
                    <p className="font-body text-sm font-extrabold text-[var(--accent-amber)]">
                      Cancelamento agendado para o fim do periodo atual.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 grid gap-3">
                {hasSubscription && clinic.stripeCustomerId && (
                  <button
                    onClick={handlePortal}
                    disabled={loadingAction === "portal" || !checkoutEnabled}
                    className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl border border-[var(--border-medium)] bg-[var(--bg-elevated)] px-5 py-3 font-body text-base font-extrabold text-[var(--text-primary)] transition hover:border-[var(--accent-lavender)] disabled:opacity-55"
                  >
                    <CreditCard size={20} />
                    {loadingAction === "portal" ? "Abrindo..." : "Alterar forma de pagamento"}
                  </button>
                )}
                {hasSubscription && (
                  <button
                    onClick={handleCancel}
                    disabled={
                      loadingAction === "cancel" ||
                      !serverApiAvailable ||
                      clinic.stripeStatus === "canceled"
                    }
                    className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-2xl border border-red-400/50 bg-red-500/10 px-5 py-3 font-body text-base font-extrabold text-red-500 transition hover:bg-red-500 hover:text-white disabled:opacity-55"
                  >
                    <XCircle size={20} />
                    {loadingAction === "cancel" ? "Cancelando..." : "Cancelar assinatura"}
                  </button>
                )}
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

              <div className="mt-5">
                <span className="font-body text-sm font-bold text-[var(--text-soft)]">
                  Tem um cupom?
                </span>
                <div className="mt-2 flex gap-2">
                  <input
                    value={couponInput}
                    onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(null); }}
                    onKeyDown={(e) => { if (e.key === "Enter") handleApplyCoupon(); }}
                    placeholder="CODIGO DO CUPOM"
                    className="min-h-[44px] flex-1 rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-3 font-body text-sm font-semibold tracking-wider text-[var(--text-primary)] uppercase"
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponInput.trim()}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[var(--accent-lavender)] bg-[var(--accent-lavender)]/10 px-3 font-body text-sm font-extrabold text-[var(--accent-lavender)] transition hover:bg-[var(--accent-lavender)]/20 disabled:opacity-50"
                  >
                    <Tag size={15} />
                    {couponLoading ? "..." : "Aplicar"}
                  </button>
                </div>
                {couponError && (
                  <p className="mt-2 font-body text-sm font-bold text-red-400">{couponError}</p>
                )}
                {appliedCoupon && (
                  <div className="mt-3 flex items-center justify-between rounded-xl border border-[var(--accent-mint)]/40 bg-[var(--accent-mint)]/5 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Tag size={16} className="text-[var(--accent-mint)]" />
                      <span className="font-body text-sm font-extrabold text-[var(--accent-mint)]">
                        {appliedCoupon.label} — {appliedCoupon.discountPct}% OFF
                      </span>
                    </div>
                    <button onClick={handleRemoveCoupon} className="font-body text-xs font-bold text-red-400 hover:text-red-300">
                      Remover
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="gradient"
                  size="lg"
                  onClick={handleCheckout}
                  disabled={loadingAction !== null || !checkoutEnabled}
                >
                  <CreditCard size={20} />
                  {loadingAction === "checkout" ? "Abrindo..." : `Assinar ${selected.name} — ${selectedPrice}`}
                </Button>
                {selectedPlan === "essential" && (
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={handleTrial}
                    disabled={loadingAction !== null || !checkoutEnabled}
                  >
                    <Sparkles size={20} />
                    Teste gratis 7 dias
                  </Button>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
