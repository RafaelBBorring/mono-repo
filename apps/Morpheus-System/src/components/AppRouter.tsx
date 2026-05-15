"use client";

import { useApp } from "@/context/AppContext";
import SplashScreen from "@/components/screens/SplashScreen";
import PsychDashboard from "@/components/screens/PsychDashboard";
import AdminDashboard from "@/components/screens/AdminDashboard";
import BillingGate from "@/components/screens/BillingGate";
import LoginScreen from "@/components/screens/LoginScreen";

export default function AppRouter() {
  const { view, billingRequired, billingActive, loading, authUser } = useApp();

  if (loading) return null;

  if (!authUser) return <LoginScreen />;

  if (billingRequired && !billingActive) return <BillingGate />;

  if (view === "admin") return <AdminDashboard />;
  if (view === "psych") return <PsychDashboard />;
  return <SplashScreen />;
}
