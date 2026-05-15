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
import WorkspaceScreen from "@/components/screens/WorkspaceScreen";
import type { PlanId } from "@/lib/plans";

const VALID_PLANS: PlanId[] = ["essential", "pro", "elite"];

export default function AppRouter() {
  const { view, billingRequired, billingActive, loading, authUser, setView, acceptInvitation, user, workspaces } = useApp();
  const searchParams = useSearchParams();

  useEffect(() => {
    const action = searchParams.get("action");
    const plan = searchParams.get("plan") as PlanId | null;
    const inviteToken = searchParams.get("invite");

    if (inviteToken && user) {
      acceptInvitation(inviteToken);
    }

    if (action === "signup" || (plan && VALID_PLANS.includes(plan))) {
      if (!authUser) {
        setView("signup");
      } else if (authUser.role === "admin") {
        setView("billing");
      }
    }

    if (action === "accept_invite" && inviteToken && user) {
      acceptInvitation(inviteToken).then((ok) => {
        if (ok && workspaces.length === 1) {
          setView("admin");
        } else if (ok) {
          setView("workspace");
        }
      });
    }
  }, [searchParams, authUser, setView, user, workspaces.length, acceptInvitation]);

  if (loading) return null;

  if (!authUser) {
    if (view === "signup") return <SignupScreen />;
    return <LoginScreen />;
  }

  if (view === "workspace") return <WorkspaceScreen />;

  if (authUser.role === "doctor") {
    if (view === "admin") return <AdminDashboard />;
    if (view === "psych") return <PsychDashboard />;
    return <PsychDashboard />;
  }

  if (view === "billing" || (billingRequired && !billingActive)) return <BillingGate />;

  if (view === "admin") return <AdminDashboard />;
  if (view === "psych") return <PsychDashboard />;
  return <SplashScreen />;
}
