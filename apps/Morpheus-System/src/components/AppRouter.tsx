"use client";

import { useApp } from "@/context/AppContext";
import SplashScreen from "@/components/screens/SplashScreen";
import PsychDashboard from "@/components/screens/PsychDashboard";
import AdminDashboard from "@/components/screens/AdminDashboard";
import BillingGate from "@/components/screens/BillingGate";

export default function AppRouter() {
  const { view, billingRequired, billingActive, loading } = useApp();

  if (billingRequired && !billingActive && !loading) return <BillingGate />;

  if (view === "admin") return <AdminDashboard />;
  if (view === "psych") return <PsychDashboard />;
  return <SplashScreen />;
}
