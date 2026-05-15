"use client";

import { useState } from "react";
import { sha256 } from "@/lib/auth";
import { useApp } from "@/context/AppContext";
import ThemeToggle from "@/components/ThemeToggle";
import Button from "@/components/ui/Button";
import { ArrowLeft, ArrowRight, Building2, Eye, EyeOff, LockKeyhole, Mail, Wand2 } from "lucide-react";

type SignupMode = "admin" | "doctor";

export default function SignupScreen() {
  const { signup, addToast, setView } = useApp();
  const [mode, setMode] = useState<SignupMode>("admin");
  const [clinicName, setClinicName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }
    setView("login");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (mode === "admin") {
      const trimmedName = clinicName.trim();
      if (!trimmedName) {
        addToast("Informe o nome da clínica.", "error");
        return;
      }
      if (!trimmedEmail || !trimmedPassword) {
        addToast("Preencha e-mail e senha.", "error");
        return;
      }
      if (trimmedPassword.length < 6) {
        addToast("A senha deve ter pelo menos 6 caracteres.", "error");
        return;
      }

      setLoading(true);
      const hash = await sha256(trimmedPassword);
      const ok = await signup({ clinicName: trimmedName, email: trimmedEmail, passwordHash: hash, role: "admin" });
      if (!ok) {
        setLoading(false);
      }
    } else {
      if (!trimmedEmail || !trimmedPassword) {
        addToast("Preencha e-mail e senha.", "error");
        return;
      }
      if (trimmedPassword.length < 6) {
        addToast("A senha deve ter pelo menos 6 caracteres.", "error");
        return;
      }

      setLoading(true);
      const hash = await sha256(trimmedPassword);
      const ok = await signup({ email: trimmedEmail, passwordHash: hash, role: "doctor" });
      if (!ok) {
        setLoading(false);
      }
    }
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
          onClick={() => setView("login")}
          className="rounded-xl border border-[var(--border-medium)] bg-[var(--glass-soft)] px-3 py-2 font-body text-sm font-extrabold text-[var(--text-primary)] transition hover:border-[var(--accent-lavender)] sm:rounded-2xl sm:px-4 sm:py-3"
        >
          Já tenho conta
        </button>
        <ThemeToggle />
      </div>

      <main className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--action-primary),var(--action-secondary))] text-[var(--action-foreground)] shadow-2xl">
            <Wand2 size={28} />
          </div>
        </div>

        <div className="mb-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setMode("admin")}
            className={`rounded-xl px-4 py-2 font-body text-sm font-extrabold transition ${
              mode === "admin"
                ? "bg-[var(--action-primary)] text-[var(--action-foreground)]"
                : "border border-[var(--border-medium)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Sou administrador
          </button>
          <button
            onClick={() => setMode("doctor")}
            className={`rounded-xl px-4 py-2 font-body text-sm font-extrabold transition ${
              mode === "doctor"
                ? "bg-[var(--action-primary)] text-[var(--action-foreground)]"
                : "border border-[var(--border-medium)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Sou profissional
          </button>
        </div>

        <h1 className="mb-2 text-center font-brand text-3xl font-semibold sm:text-4xl">
          {mode === "admin" ? "Criar clínica" : "Criar conta"}
        </h1>
        <p className="mb-8 text-center font-body text-sm text-[var(--text-muted)]">
          {mode === "admin"
            ? "Cadastre sua clínica e comece o teste grátis de 7 dias"
            : "Crie sua conta para acessar clínicas que te convidaram"}
        </p>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-elevated)] p-6 shadow-2xl sm:rounded-[2rem] sm:p-7"
        >
          {mode === "admin" && (
            <div className="mb-4">
              <label className="mb-2 block font-body text-sm font-bold text-[var(--text-soft)]">Nome da clínica</label>
              <div className="relative">
                <Building2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  placeholder="Clínica Exemplo"
                  className="min-h-[52px] w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] py-3 pl-10 pr-4 font-body text-base font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lavender)] focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="mb-2 block font-body text-sm font-bold text-[var(--text-soft)]">Seu e-mail</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={mode === "admin" ? "voce@sua-clinica.com" : "seu-email@example.com"}
                autoComplete="email"
                className="min-h-[52px] w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] py-3 pl-10 pr-4 font-body text-base font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lavender)] focus:outline-none"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="mb-2 block font-body text-sm font-bold text-[var(--text-soft)]">Senha</label>
            <div className="relative">
              <LockKeyhole size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                className="min-h-[52px] w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] py-3 pl-10 pr-12 font-body text-base font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-lavender)] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <Button variant="gradient" size="xl" fullWidth disabled={loading} type="submit">
            <ArrowRight size={22} />
            {loading
              ? "Criando..."
              : mode === "admin"
                ? "Criar clínica e testar grátis"
                : "Criar minha conta"}
          </Button>
        </form>

        <p className="mt-6 text-center font-body text-xs text-[var(--text-muted)]">
          {mode === "admin"
            ? "Ao criar a conta, você recebe 7 dias grátis do Essential."
            : "Após criar sua conta, peça ao administrador para convidar seu e-mail."}
        </p>
      </main>
    </div>
  );
}
