"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, LogOut, ShieldCheck, User, Wand2 } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { themeHex, themeRgb } from "@/lib/utils";
import Button from "@/components/ui/Button";
import ThemeToggle from "@/components/ThemeToggle";

const LibraryVinesScene = dynamic(
  () => import("@/components/visuals/MorpheusThree").then((mod) => mod.LibraryVinesScene),
  { ssr: false, loading: () => <div className="absolute inset-0 soft-grid opacity-20" /> }
);

export default function SplashPage() {
  const { setView, setActivePsych, addToast, theme, psychologists, loading, authUser, logout } = useApp();
  const [selectingPsych, setSelectingPsych] = useState(false);

  const isDark = theme === "dark";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[var(--accent-lavender)] border-t-transparent" />
          <p className="font-body text-lg text-[var(--text-muted)]">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <LibraryVinesScene className="absolute inset-0 z-0 opacity-55" />
      <div className="morpheus-screen-wash absolute inset-0 z-0" />

      <div className="absolute right-4 top-4 z-20 flex items-center gap-2 sm:right-5 sm:top-5 sm:gap-3">
        <button
          onClick={logout}
          className="rounded-xl border border-[var(--border-medium)] bg-[var(--glass-soft)] px-3 py-2 font-body text-sm font-extrabold text-[var(--text-primary)] transition hover:border-red-400 hover:text-red-400 sm:rounded-2xl sm:px-4 sm:py-3"
        >
          <LogOut size={16} className="inline mr-1" />
          Sair
        </button>
        <ThemeToggle />
      </div>

      {selectingPsych && (
        <button
          onClick={() => setSelectingPsych(false)}
          className="absolute left-4 top-4 z-20 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-elevated)] px-3 py-2 font-body text-sm font-extrabold text-[var(--text-primary)] transition hover:border-[var(--accent-lavender)] sm:left-5 sm:top-5 sm:rounded-2xl sm:px-4 sm:py-3"
        >
          <ArrowLeft size={18} />
          Voltar
        </button>
      )}

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-16 sm:px-5 sm:py-20">
        {selectingPsych && authUser?.role === "admin" ? (
          <section className="w-full max-w-3xl text-center sm:max-w-4xl">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-[var(--border-light)] bg-[var(--bg-elevated)] text-[var(--accent-sky)] sm:mb-7 sm:h-16 sm:w-16 sm:rounded-2xl">
              <User size={28} />
            </div>
            <h2 className="font-brand text-3xl font-semibold sm:text-4xl">Quem está entrando?</h2>
            <p className="mt-3 font-body text-base text-[var(--text-muted)] sm:text-lg">
              Selecione um profissional para abrir sua agenda.
            </p>

            <div className="mt-8 grid gap-4 sm:mt-9 sm:grid-cols-2">
              {psychologists.map((psych) => {
                const color = themeHex(psych, isDark);
                const rgb = themeRgb(psych, isDark);

                return (
                  <button
                    key={psych.id}
                    onClick={() => {
                      setActivePsych(psych);
                      setView("psych");
                      const suffix = psych.name.includes("Dra") ? "a" : "o";
                      addToast(`Bem-vind${suffix}, ${psych.shortName}!`, "success");
                    }}
                    className="rounded-2xl border p-5 text-left transition hover:-translate-y-1 sm:rounded-3xl sm:p-7"
                    style={{
                      borderColor: `rgba(${rgb},${isDark ? 0.32 : 0.24})`,
                      background: `linear-gradient(135deg, rgba(${rgb},${isDark ? 0.12 : 0.07}), var(--glass-soft))`,
                    }}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <span
                        className="flex h-12 w-12 items-center justify-center rounded-xl border font-brand text-lg font-semibold sm:h-16 sm:w-16 sm:rounded-2xl sm:text-xl"
                        style={{ color, borderColor: color }}
                      >
                        {psych.initials}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-brand text-xl font-semibold text-[var(--text-primary)] sm:text-2xl">
                          {psych.name}
                        </span>
                        <span className="mt-1 block truncate font-body text-sm font-bold text-[var(--text-muted)]">
                          {psych.email || "Acesso profissional"}
                        </span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="w-full max-w-3xl text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--action-primary),var(--action-secondary))] text-[var(--action-foreground)] shadow-2xl sm:mb-8 sm:h-20 sm:w-20 sm:rounded-3xl">
              <Wand2 size={30} />
            </div>
            <p className="font-body text-sm font-extrabold uppercase tracking-[0.28em] text-[var(--accent-mint)]">
              Bem-vindo, {authUser?.displayName || "Usuário"}
            </p>
            <h1 className="mt-4 font-brand text-[clamp(3rem,12vw,7.5rem)] font-semibold leading-none aurora-text">
              Morpheus
            </h1>
            <p className="mx-auto mt-5 max-w-xl font-body text-lg leading-8 text-[var(--text-muted)] sm:mt-6 sm:text-xl">
              Acesse a agenda da clínica, crie reservas e acompanhe salas com clareza.
            </p>

            <div className="mx-auto mt-8 grid max-w-md gap-4 sm:mt-10">
              {authUser?.role === "admin" && (
                <>
                  <Button variant="gradient" size="xl" onClick={() => setView("admin")} fullWidth>
                    <ShieldCheck size={24} />
                    Painel administrativo
                  </Button>
                  <Button variant="ghost" size="lg" onClick={() => setSelectingPsych(true)} fullWidth>
                    <User size={22} />
                    Acessar como psicóloga
                  </Button>
                </>
              )}
              {authUser?.role === "doctor" && (
                <Button variant="gradient" size="xl" onClick={() => setView("psych")} fullWidth>
                  <User size={24} />
                  Abrir minha agenda
                </Button>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
