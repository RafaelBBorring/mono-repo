import type { BillingAccount } from "@/types";

export const DEFAULT_BILLING_ACCOUNT_ID = "default";

export const ACTIVE_BILLING_STATUSES = new Set(["active", "trialing"]);

export function isBillingActive(account: BillingAccount | null) {
  if (!account?.billingEnforced) return true;
  return ACTIVE_BILLING_STATUSES.has(account.stripeStatus);
}

export function billingStatusLabel(status?: string) {
  const labels: Record<string, string> = {
    active: "Assinatura ativa",
    trialing: "Período de teste ativo",
    past_due: "Pagamento pendente",
    unpaid: "Pagamento em atraso",
    canceled: "Assinatura cancelada",
    incomplete: "Pagamento incompleto",
    incomplete_expired: "Pagamento expirado",
    paused: "Assinatura pausada",
    inactive: "Assinatura inativa",
  };

  return labels[status || "inactive"] || "Assinatura não confirmada";
}
