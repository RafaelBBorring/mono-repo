"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import ThemeToggle from "@/components/ThemeToggle";
import Button from "@/components/ui/Button";
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  LogOut,
  Plus,
  Shield,
  User,
  Wand2,
} from "lucide-react";

export default function WorkspaceScreen() {
  const { user, workspaces, selectWorkspace, createClinic, logout, addToast, setView } = useApp();
  const [showNewClinic, setShowNewClinic] = useState(false);
  const [newClinicName, setNewClinicName] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, { rooms: number; doctors: number }>>({});

  useEffect(() => {
    if (!isSupabaseConfigured || workspaces.length === 0) return;

    let alive = true;
    supabase.rpc("get_morpheus_workspace_counts").then(({ data }) => {
      if (!alive) return;
      setCounts(
        ((data ?? []) as Array<{ clinic_id: string; room_count: number; doctor_count: number }>).reduce((acc: Record<string, { rooms: number; doctors: number }>, item) => {
          acc[item.clinic_id] = { rooms: Number(item.room_count), doctors: Number(item.doctor_count) };
          return acc;
        }, {})
      );
    });

    return () => {
      alive = false;
    };
  }, [workspaces]);

  async function handleSelect(clinicId: string) {
    setLoading(clinicId);
    await selectWorkspace(clinicId);
    setLoading(null);
  }

  async function handleCreateClinic(e: React.FormEvent) {
    e.preventDefault();
    const name = newClinicName.trim();
    if (!name) {
      addToast("Informe o nome da clínica.", "error");
      return;
    }
    setLoading("create");
    const ok = await createClinic(name);
    if (ok) {
      setNewClinicName("");
      setShowNewClinic(false);
    }
    setLoading(null);
  }

  function handleLogout() {
    logout();
    setView("login");
  }

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }
    setView("splash");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--bg-primary)] px-4 py-16 text-[var(--text-primary)] sm:px-5">
      <div className="soft-grid absolute inset-0 opacity-30" />
      <div className="morpheus-screen-wash absolute inset-0" />

      <div className="absolute left-4 top-4 z-20 sm:left-5 sm:top-5">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-medium)] bg-[var(--glass-soft)] px-3 py-2 font-body text-sm font-extrabold text-[var(--text-primary)] transition hover:border-[var(--accent-lavender)] sm:rounded-2xl sm:px-4 sm:py-3"
        >
          <ArrowLeft size={17} />
          Voltar
        </button>
      </div>

      <div className="absolute right-4 top-4 z-20 flex items-center gap-2 sm:right-5 sm:top-5">
        <button
          onClick={handleLogout}
          className="rounded-xl border border-[var(--border-medium)] bg-[var(--glass-soft)] px-3 py-2 font-body text-sm font-extrabold text-[var(--text-primary)] transition hover:border-red-400 hover:text-red-400 sm:rounded-2xl sm:px-4 sm:py-3"
        >
          <LogOut size={16} className="inline mr-1" />
          Sair
        </button>
        <ThemeToggle />
      </div>

      <main className="relative z-10 w-full max-w-5xl">
        <div className="mb-8 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--action-primary),var(--action-secondary))] text-[var(--action-foreground)] shadow-2xl">
            <Wand2 size={28} />
          </div>
        </div>

        <h1 className="mb-2 text-center font-brand text-3xl font-semibold sm:text-4xl">
          Olá, {user?.displayName || "Usuário"}
        </h1>
        <p className="mb-8 text-center font-body text-sm text-[var(--text-muted)]">
          Selecione uma clínica para continuar
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((ws) => (
            <button
              key={ws.clinicId}
              onClick={() => handleSelect(ws.clinicId)}
              disabled={loading !== null}
              className="group flex aspect-square min-h-[230px] flex-col justify-between rounded-2xl border border-[var(--border-light)] bg-[var(--bg-elevated)] p-5 text-left transition hover:-translate-y-1 hover:border-[var(--accent-lavender)] hover:shadow-xl sm:rounded-3xl sm:p-6 disabled:opacity-60"
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl sm:h-14 sm:w-14 sm:rounded-2xl"
                  style={{
                    background: ws.role === "admin"
                      ? "linear-gradient(135deg, var(--action-primary), var(--action-secondary))"
                      : "var(--glass-soft)",
                    color: ws.role === "admin" ? "var(--action-foreground)" : "var(--accent-lavender)",
                  }}
                >
                  {ws.role === "admin" ? <Shield size={22} /> : <User size={22} />}
                </div>
                <div className="flex items-center gap-2">
                  {loading === ws.clinicId && (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent-lavender)] border-t-transparent" />
                  )}
                  <ChevronRight size={20} className="text-[var(--text-muted)] transition group-hover:translate-x-1 group-hover:text-[var(--accent-lavender)]" />
                </div>
              </div>

              <div className="min-w-0">
                <p className="line-clamp-2 font-brand text-2xl font-semibold sm:text-3xl">
                  {ws.clinicName}
                </p>
                <p className="mt-1 font-body text-sm font-bold text-[var(--text-muted)]">
                  {ws.role === "admin" ? "Administrador" : "Profissional"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-[var(--border-light)] bg-[var(--glass-soft)] p-3">
                  <p className="font-brand text-2xl font-semibold text-[var(--accent-mint)]">
                    {counts[ws.clinicId]?.rooms ?? "-"}
                  </p>
                  <p className="mt-1 font-body text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    salas
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border-light)] bg-[var(--glass-soft)] p-3">
                  <p className="font-brand text-2xl font-semibold text-[var(--accent-lavender)]">
                    {counts[ws.clinicId]?.doctors ?? "-"}
                  </p>
                  <p className="mt-1 font-body text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                    drs
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {workspaces.length === 0 && (
          <div className="mt-4 rounded-2xl border border-dashed border-[var(--border-medium)] p-8 text-center">
            <p className="font-brand text-xl font-semibold">Nenhuma clínica encontrada</p>
            <p className="mt-2 font-body text-sm text-[var(--text-muted)]">
              Crie uma nova clínica para começar.
            </p>
          </div>
        )}

        <div className="mt-6">
          {showNewClinic ? (
            <form onSubmit={handleCreateClinic} className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-elevated)] p-5 sm:rounded-3xl sm:p-6">
              <div className="mb-4 flex items-center gap-3">
                <Building2 size={22} className="text-[var(--accent-mint)]" />
                <h3 className="font-brand text-xl font-semibold">Nova clínica</h3>
              </div>
              <input
                value={newClinicName}
                onChange={(e) => setNewClinicName(e.target.value)}
                placeholder="Nome da clínica"
                className="min-h-[52px] w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-4 font-body text-base font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lavender)] focus:outline-none"
              />
              <div className="mt-4 flex gap-3">
                <Button type="submit" variant="gradient" size="md" disabled={loading === "create"}>
                  <Plus size={20} />
                  {loading === "create" ? "Criando..." : "Criar clínica"}
                </Button>
                <Button type="button" variant="ghost" size="md" onClick={() => setShowNewClinic(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowNewClinic(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border-medium)] p-5 font-body text-base font-bold text-[var(--text-muted)] transition hover:border-[var(--accent-lavender)] hover:text-[var(--text-primary)] sm:p-6"
            >
              <Plus size={20} />
              Criar nova clínica
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
