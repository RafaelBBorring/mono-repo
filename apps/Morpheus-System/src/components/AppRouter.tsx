"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/context/AppContext";
import PsychDashboard from "@/components/screens/PsychDashboard";
import AdminDashboard from "@/components/screens/AdminDashboard";
import BillingGate from "@/components/screens/BillingGate";
import LoginScreen from "@/components/screens/LoginScreen";
import SignupScreen from "@/components/screens/SignupScreen";
import WorkspaceScreen from "@/components/screens/WorkspaceScreen";
import SubscriptionScreen from "@/components/screens/SubscriptionScreen";
import type { PlanId } from "@/lib/plans";

const VALID_PLANS: PlanId[] = ["essential", "pro", "elite"];

export default function AppRouter() {
  const {
    view,
    billingRequired,
    billingActive,
    loading,
    authUser,
    setView,
    acceptInvitation,
    user,
    workspaces,
  } = useApp();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (loading) return;

    const action = searchParams.get("action");
    const plan = searchParams.get("plan") as PlanId | null;
    const inviteToken = searchParams.get("invite");

    if (inviteToken && user) {
      acceptInvitation(inviteToken);
    }

    const wantsPlan = Boolean(plan && VALID_PLANS.includes(plan));

    if (action === "login") {
      if (!authUser) {
        setView("login");
      } else if (wantsPlan && authUser.role === "admin") {
        setView("subscription");
      } else {
        setView("workspace");
      }
      return;
    }

    if (action === "signup") {
      if (!authUser) {
        setView("signup");
      } else if (authUser.role === "admin") {
        setView("subscription");
      }
      return;
    }

    if (wantsPlan) {
      if (!authUser) {
        setView("login");
      } else if (authUser.role === "admin") {
        setView("subscription");
      } else {
        setView("workspace");
      }
      return;
    }

    if (action === "workspace") {
      if (authUser) {
        setView("workspace");
      } else {
        setView("login");
      }
    }

    if (action === "subscription") {
      if (!authUser) {
        setView("login");
      } else if (authUser.role === "admin") {
        setView("subscription");
      } else {
        setView("workspace");
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
  }, [searchParams, authUser, setView, user, workspaces.length, acceptInvitation, loading]);

  useEffect(() => {
    if (loading || !authUser) return;
    if (view !== "splash") return;

    if (workspaces.length > 1 && !localStorage.getItem("morpheus_workspace")) {
      setView("workspace");
    } else if (authUser.role === "admin") {
      if (billingRequired && !billingActive) {
        setView("billing");
      } else {
        setView("admin");
      }
    } else {
      setView("psych");
    }
  }, [loading, authUser, view, workspaces.length, billingRequired, billingActive, setView]);

  if (loading) return null;

  if (!authUser) {
    if (view === "signup") return <SignupScreen />;
    return <LoginScreen />;
  }

  if (view === "workspace") return <WorkspaceScreen />;

  if (authUser.role === "admin") {
    if (view === "subscription") return <SubscriptionScreen />;
    if (view === "billing" || (billingRequired && !billingActive)) return <BillingGate />;
    return <AdminDashboard />;
  }

  return <PsychDashboard />;
}
