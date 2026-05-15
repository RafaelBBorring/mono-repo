"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/context/AppContext";
import SplashScreen from "@/components/screens/SplashScreen";
import PsychDashboard from "@/components/screens/PsychDashboard";
import AdminDashboard from "@/components/screens/AdminDashboard";
import BillingGate from "@/components/screens/BillingGate";
import LoginScreen from "@/components/screens/LoginScreen";
import SignupScreen from "@/components/screens/SignupScreen";
import type { PlanId } from "@/lib/plans";

const VALID_PLANS: PlanId[] = ["essential", "pro", "elite"];

export default function AppRouter() {
  const { view, billingRequired, billingActive, loading, authUser, setView } = useApp();
  const searchParams = useSearchParams();

  useEffect(() => {
    const action = searchParams.get("action");
    const plan = searchParams.get("plan") as PlanId | null;

    if (action === "signup" || (plan && VALID_PLANS.includes(plan))) {
      if (!authUser) {
        setView("signup");
      } else {
        setView("billing");
      }
    }
  }, [searchParams, authUser, setView]);

  if (loading) return null;

  if (!authUser) {
    if (view === "signup") return <SignupScreen />;
    return <LoginScreen />;
  }

  if (view === "billing" || (billingRequired && !billingActive)) return <BillingGate />;

  if (view === "admin") return <AdminDashboard />;
  if (view === "psych") return <PsychDashboard />;
  return <SplashScreen />;
}
