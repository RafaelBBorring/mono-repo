"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CreditCard, RefreshCw, ShieldCheck } from "lucide-react";
import { billingStatusLabel } from "@/lib/billing";
import { useApp } from "@/context/AppContext";
import Button from "@/components/ui/Button";
import ThemeToggle from "@/components/ThemeToggle";

export default function BillingGate() {
  const { clinic, refreshBilling, startCheckout, openBillingPortal, theme, checkoutEnabled } = useApp();
  const [loadingPlan, setLoadingPlan] = useState<"monthly" | "yearly" | "portal" | null>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    refreshBilling();
  }, [refreshBilling]);

  async function handleCheckout(plan: "monthly" | "yearly") {
    setLoadingPlan(plan);
    await startCheckout(plan, email);
    setLoadingPlan(null);
  }

  async function handlePortal() {
    setLoadingPlan("portal");
    await openBillingPortal();
    setLoadingPlan(null);
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

      <main className="relative z-10 grid w-full max-w-5xl gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <section>
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--action-primary),var(--action-secondary))] text-[var(--action-foreground)] shadow-2xl">
            <ShieldCheck size={26} />
          </div>
          <p className="font-body text-sm font-extrabold uppercase tracking-[0.28em] text-[var(--accent-mint)]">
            Acesso protegido
          </p>
          <h1 className="mt-4 font-brand text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
            Ative a assinatura para usar o Morpheus.
          </h1>
          <p className="mt-5 max-w-xl font-body text-base leading-8 text-[var(--text-muted)] sm:text-lg">
            O sistema só libera salas, profissionais e reservas quando o Stripe confirma uma assinatura ativa.
          </p>

          <div className="mt-6 rounded-2xl border border-[var(--border-light)] bg-[var(--glass-soft)] p-4">
            <p className="font-body text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Clínica: {clinic?.name || "—"}
            </p>
            <p className="mt-2 font-brand text-2xl font-semibold">
              {billingStatusLabel(clinic?.stripeStatus)}
            </p>
            {clinic?.currentPeriodEnd && (
              <p className="mt-2 font-body text-sm font-bold text-[var(--text-muted)]">
                Vigência até {new Date(clinic.currentPeriodEnd).toLocaleDateString("pt-BR")}
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-elevated)] p-5 shadow-2xl sm:rounded-[2rem] sm:p-7">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--glass-soft)] text-[var(--accent-lavender)] ring-1 ring-[var(--border-light)]">
              <CreditCard size={22} />
            </span>
            <div>
              <p className="font-body text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Checkout seguro
              </p>
              <h2 className="font-brand text-2xl font-semibold">Escolha o plano</h2>
            </div>
          </div>

          <label className="mb-4 block">
            <span className="font-body text-sm font-bold text-[var(--text-soft)]">E-mail de cobrança</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="financeiro@sua-clinica.com"
              type="email"
              className="mt-2 min-h-[52px] w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-4 font-body text-base font-semibold text-[var(--text-primary)]"
            />
          </label>

          <div className="grid gap-3">
            <Button
              variant="gradient"
              size="xl"
              fullWidth
              onClick={() => handleCheckout("monthly")}
              disabled={loadingPlan !== null || !checkoutEnabled}
            >
              <ArrowRight size={22} />
              {loadingPlan === "monthly" ? "Abrindo..." : "Assinar mensal por R$ 30"}
            </Button>
            <Button
              variant="ghost"
              size="lg"
              fullWidth
              onClick={() => handleCheckout("yearly")}
              disabled={loadingPlan !== null || !checkoutEnabled}
            >
              <ArrowRight size={20} />
              {loadingPlan === "yearly" ? "Abrindo..." : "Assinar anual com desconto"}
            </Button>
            {clinic?.stripeCustomerId && (
              <button
                onClick={handlePortal}
                disabled={loadingPlan !== null || !checkoutEnabled}
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-[var(--border-medium)] bg-[var(--glass-soft)] px-4 py-3 font-body text-base font-extrabold text-[var(--text-primary)] transition hover:border-[var(--accent-lavender)] disabled:opacity-60"
              >
                <CreditCard size={20} />
                {loadingPlan === "portal" ? "Abrindo..." : "Gerenciar cobrança"}
              </button>
            )}
            <button
              onClick={refreshBilling}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2 font-body text-sm font-bold text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
            >
              <RefreshCw size={16} className={theme === "dark" ? "text-[var(--accent-sky)]" : "text-[var(--accent-lavender)]"} />
              Revalidar status
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
