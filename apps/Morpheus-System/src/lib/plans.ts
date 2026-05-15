export type PlanId = "essential" | "pro" | "elite";

export interface PlanConfig {
  id: PlanId;
  name: string;
  description: string;
  maxRooms: number;
  maxDoctors: number;
  maxWorkspaces: number;
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
    maxWorkspaces: 1,
    trialDays: 7,
    monthlyPriceBRL: 30,
    yearlyPriceBRL: 288,
    monthlyLabel: "R$ 30/mês",
    yearlyLabel: "R$ 288/ano",
    yearlyMonthlyEquiv: "~R$ 24/mês",
  },
  {
    id: "pro",
    name: "Pro",
    description: "Para clínicas em crescimento",
    maxRooms: 6,
    maxDoctors: 15,
    maxWorkspaces: 3,
    trialDays: 7,
    monthlyPriceBRL: 50,
    yearlyPriceBRL: 480,
    monthlyLabel: "R$ 50/mês",
    yearlyLabel: "R$ 480/ano",
    yearlyMonthlyEquiv: "~R$ 40/mês",
    highlight: true,
    badge: "Mais popular",
  },
  {
    id: "elite",
    name: "Elite",
    description: "Para clínicas consolidadas",
    maxRooms: 10,
    maxDoctors: 20,
    maxWorkspaces: 5,
    trialDays: 7,
    monthlyPriceBRL: 80,
    yearlyPriceBRL: 768,
    monthlyLabel: "R$ 80/mês",
    yearlyLabel: "R$ 768/ano",
    yearlyMonthlyEquiv: "~R$ 64/mês",
  },
];

export function getPlanById(id: PlanId): PlanConfig {
  return PLANS.find((p) => p.id === id)!;
}
