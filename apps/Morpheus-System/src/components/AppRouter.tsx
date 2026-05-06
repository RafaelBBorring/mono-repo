"use client";

import { useApp } from "@/context/AppContext";
import SplashScreen from "@/components/screens/SplashScreen";
import PsychDashboard from "@/components/screens/PsychDashboard";
import AdminDashboard from "@/components/screens/AdminDashboard";

export default function AppRouter() {
  const { view } = useApp();

  if (view === "admin") return <AdminDashboard />;
  if (view === "psych") return <PsychDashboard />;
  return <SplashScreen />;
}
