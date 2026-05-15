export type PlanId = "essential" | "pro" | "elite";

export interface PlanConfig {
  id: PlanId;
  name: string;
  description: string;
  maxRooms: number;
  maxDoctors: number;
  trialDays: number;
  monthlyPriceBRL: number;
  yearlyPriceBRL: number;
  monthlyLabel: string;
  yearlyLabel: string;
  yearlyMonthlyEquiv: string;
  highlight?: boolean;
  badge?: string;
}

export const PLANS: PlanConfig[] = [
  {
    id: "essential",
    name: "Essential",
    description: "Para clínicas que estão começando",
    maxRooms: 3,
    maxDoctors: 10,
    trialDays: 7,
    monthlyPriceBRL: 97,
    yearlyPriceBRL: 929,
    monthlyLabel: "R$ 97/mês",
    yearlyLabel: "R$ 929/ano",
    yearlyMonthlyEquiv: "~R$ 77/mês",
  },
  {
    id: "pro",
    name: "Pro",
    description: "Para clínicas em crescimento",
    maxRooms: 6,
    maxDoctors: 15,
    trialDays: 7,
    monthlyPriceBRL: 147,
    yearlyPriceBRL: 1409,
    monthlyLabel: "R$ 147/mês",
    yearlyLabel: "R$ 1.409/ano",
    yearlyMonthlyEquiv: "~R$ 117/mês",
    highlight: true,
    badge: "Mais popular",
  },
  {
    id: "elite",
    name: "Elite",
    description: "Para clínicas consolidadas",
    maxRooms: 10,
    maxDoctors: 20,
    trialDays: 7,
    monthlyPriceBRL: 227,
    yearlyPriceBRL: 2189,
    monthlyLabel: "R$ 227/mês",
    yearlyLabel: "R$ 2.189/ano",
    yearlyMonthlyEquiv: "~R$ 182/mês",
  },
];

export function getPlanByPriceId(priceId: string): PlanConfig | undefined {
  const envMap: Record<string, PlanId> = {};

  if (typeof window !== "undefined") {
    const essential = process.env.NEXT_PUBLIC_STRIPE_PRICE_ESSENTIAL_MONTHLY;
    const pro = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY;
    const elite = process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE_MONTHLY;
    const essentialY = process.env.NEXT_PUBLIC_STRIPE_PRICE_ESSENTIAL_YEARLY;
    const proY = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY;
    const eliteY = process.env.NEXT_PUBLIC_STRIPE_PRICE_ELITE_YEARLY;

    if (essential) { envMap[essential] = "essential"; envMap[essentialY || ""] = "essential"; }
    if (pro) { envMap[pro] = "pro"; envMap[proY || ""] = "pro"; }
    if (elite) { envMap[elite] = "elite"; envMap[eliteY || ""] = "elite"; }
  }

  const planId = envMap[priceId];
  return planId ? PLANS.find((p) => p.id === planId) : undefined;
}

export function getPlanById(id: PlanId): PlanConfig {
  return PLANS.find((p) => p.id === id)!;
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
