"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Check,
  CreditCard,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { billingStatusLabel } from "@/lib/billing";
import { PLANS, getPlanById, type PlanId } from "@/lib/plans";
import { useApp } from "@/context/AppContext";
import Button from "@/components/ui/Button";
import ThemeToggle from "@/components/ThemeToggle";

export default function BillingGate() {
  const { clinic, refreshBilling, startCheckout, openBillingPortal, theme, checkoutEnabled } =
    useApp();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    refreshBilling();
  }, [refreshBilling]);

  async function handleCheckout(planId: PlanId) {
    const key = `${planId}-${interval}`;
    setLoadingPlan(key);
    await startCheckout(planId, interval, email);
    setLoadingPlan(null);
  }

  async function handlePortal() {
    setLoadingPlan("portal");
    await openBillingPortal();
    setLoadingPlan(null);
  }

  const currentPlan = clinic?.stripePriceId ? getPlanByPriceIdFromEnv(clinic.stripePriceId) : null;

  function getPlanByPriceIdFromEnv(priceId: string): PlanId | undefined {
    const allPrices: Record<string, PlanId> = {};
    for (const plan of PLANS) {
      const m = process.env[`NEXT_PUBLIC_STRIPE_PRICE_${plan.id.toUpperCase()}_MONTHLY`];
      const y = process.env[`NEXT_PUBLIC_STRIPE_PRICE_${plan.id.toUpperCase()}_YEARLY`];
      if (m) allPrices[m] = plan.id;
      if (y) allPrices[y] = plan.id;
    }
    return allPrices[priceId];
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--bg-primary)] px-4 py-16 text-[var(--text-primary)] sm:px-5">
      <div className="soft-grid absolute inset-0 opacity-30" />
      <div className="morpheus-screen-wash absolute inset-0" />

      <div className="absolute right-4 top-4 z-20 flex items-center gap-2 sm:right-5 sm:top-5">
        <Link
          href="/landing"
          className="rounded-xl border border-[var(--border-medium)] bg-[var(--glass-soft)] px-3 py-2 font-body text-sm font-extrabold text-[var(--text-primary)] transition hover:border-[var(--accent-lavender)] sm:rounded-2xl sm:px-4 sm:py-3"
        >
          Página de vendas
        </Link>
        <ThemeToggle />
      </div>

      <main className="relative z-10 w-full max-w-5xl">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--action-primary),var(--action-secondary))] text-[var(--action-foreground)] shadow-2xl">
            <ShieldCheck size={26} />
          </div>
          <p className="font-body text-sm font-extrabold uppercase tracking-[0.28em] text-[var(--accent-mint)]">
            Acesso protegido
          </p>
          <h1 className="mt-4 font-brand text-4xl font-semibold leading-tight sm:text-5xl">
            Escolha o plano ideal para sua clínica
          </h1>
          <p className="mx-auto mt-4 max-w-2xl font-body text-base leading-8 text-[var(--text-muted)] sm:text-lg">
            Todos os planos incluem <strong>7 dias grátis</strong> para testar. Cancele quando quiser
            durante o trial.
          </p>

          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => setInterval("monthly")}
              className={`rounded-xl px-4 py-2 font-body text-sm font-extrabold transition ${
                interval === "monthly"
                  ? "bg-[var(--action-primary)] text-[var(--action-foreground)]"
                  : "border border-[var(--border-medium)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setInterval("yearly")}
              className={`rounded-xl px-4 py-2 font-body text-sm font-extrabold transition ${
                interval === "yearly"
                  ? "bg-[var(--action-primary)] text-[var(--action-foreground)]"
                  : "border border-[var(--border-medium)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              Anual <span className="text-[var(--accent-mint)]">(economia de 20%)</span>
            </button>
          </div>
        </div>

        <div className="mb-8 grid gap-5 sm:grid-cols-3">
          {PLANS.map((plan) => {
            const isLoading = loadingPlan === `${plan.id}-${interval}`;
            const price = interval === "monthly" ? plan.monthlyLabel : plan.yearlyLabel;
            const isCurrent = currentPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border p-6 transition sm:rounded-3xl ${
                  plan.highlight
                    ? "border-[var(--accent-lavender)] bg-[var(--bg-elevated)] shadow-2xl ring-2 ring-[var(--accent-lavender)]"
                    : "border-[var(--border-light)] bg-[var(--bg-elevated)] shadow-lg"
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[linear-gradient(135deg,var(--action-primary),var(--action-secondary))] px-4 py-1 font-body text-xs font-extrabold text-[var(--action-foreground)] shadow-lg">
                    {plan.badge}
                  </span>
                )}

                <div className="mb-4">
                  <h3 className="font-brand text-2xl font-semibold">{plan.name}</h3>
                  <p className="mt-1 font-body text-sm text-[var(--text-muted)]">
                    {plan.description}
                  </p>
                </div>

                <div className="mb-5">
                  <span className="font-brand text-4xl font-bold">{price}</span>
                  {interval === "yearly" && (
                    <p className="mt-1 font-body text-sm font-bold text-[var(--accent-mint)]">
                      {plan.yearlyMonthlyEquiv}
                    </p>
                  )}
                </div>

                <ul className="mb-6 flex-1 space-y-3">
                  <li className="flex items-center gap-2 font-body text-sm">
                    <Building2 size={16} className="shrink-0 text-[var(--accent-sky)]" />
                    <span>
                      Até <strong>{plan.maxRooms} salas</strong>
                    </span>
                  </li>
                  <li className="flex items-center gap-2 font-body text-sm">
                    <Users size={16} className="shrink-0 text-[var(--accent-lavender)]" />
                    <span>
                      Até <strong>{plan.maxDoctors} profissionais</strong>
                    </span>
                  </li>
                  <li className="flex items-center gap-2 font-body text-sm">
                    <Sparkles size={16} className="shrink-0 text-[var(--accent-mint)]" />
                    <span>
                      <strong>7 dias grátis</strong> para testar
                    </span>
                  </li>
                  <li className="flex items-center gap-2 font-body text-sm">
                    <Check size={16} className="shrink-0 text-[var(--accent-mint)]" />
                    <span>Agenda completa</span>
                  </li>
                  <li className="flex items-center gap-2 font-body text-sm">
                    <Check size={16} className="shrink-0 text-[var(--accent-mint)]" />
                    <span>Reservas e salas</span>
                  </li>
                  <li className="flex items-center gap-2 font-body text-sm">
                    <Check size={16} className="shrink-0 text-[var(--accent-mint)]" />
                    <span>Suporte por e-mail</span>
                  </li>
                </ul>

                <Button
                  variant={plan.highlight ? "gradient" : "ghost"}
                  size="xl"
                  fullWidth
                  onClick={() => handleCheckout(plan.id)}
                  disabled={isLoading || !checkoutEnabled || isCurrent}
                >
                  <ArrowRight size={22} />
                  {isLoading
                    ? "Abrindo..."
                    : isCurrent
                      ? "Plano atual"
                      : `Assinar ${plan.name}`}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="mx-auto max-w-md space-y-3 text-center">
          <label className="block text-left">
            <span className="font-body text-sm font-bold text-[var(--text-soft)]">
              E-mail de cobrança (opcional)
            </span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="financeiro@sua-clinica.com"
              type="email"
              className="mt-2 min-h-[52px] w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-4 font-body text-base font-semibold text-[var(--text-primary)]"
            />
          </label>

          {clinic && (
            <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--glass-soft)] p-4 text-left">
              <p className="font-body text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Clínica: {clinic.name || "—"}
              </p>
              <p className="mt-2 font-brand text-2xl font-semibold">
                {billingStatusLabel(clinic.stripeStatus)}
              </p>
              {clinic.currentPeriodEnd && (
                <p className="mt-2 font-body text-sm font-bold text-[var(--text-muted)]">
                  Vigência até {new Date(clinic.currentPeriodEnd).toLocaleDateString("pt-BR")}
                </p>
              )}
            </div>
          )}

          {clinic?.stripeCustomerId && (
            <button
              onClick={handlePortal}
              disabled={loadingPlan === "portal" || !checkoutEnabled}
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-medium)] bg-[var(--glass-soft)] px-4 py-3 font-body text-base font-extrabold text-[var(--text-primary)] transition hover:border-[var(--accent-lavender)] disabled:opacity-60"
            >
              <CreditCard size={20} />
              {loadingPlan === "portal" ? "Abrindo..." : "Gerenciar cobrança"}
            </button>
          )}

          <button
            onClick={refreshBilling}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2 font-body text-sm font-bold text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
          >
            <RefreshCw
              size={16}
              className={theme === "dark" ? "text-[var(--accent-sky)]" : "text-[var(--accent-lavender)]"}
            />
            Revalidar status
          </button>
        </div>
      </main>
    </div>
  );
}
