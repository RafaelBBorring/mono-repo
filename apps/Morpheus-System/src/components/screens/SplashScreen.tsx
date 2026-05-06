"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { PSYCHOLOGISTS, ROOMS } from "@/lib/data";
import Button from "@/components/ui/Button";
import { useGsapFadeIn, useGsapStagger } from "@/lib/gsap";

type SplashStep = "home" | "pin" | "select-psych";

export default function SplashPage() {
  const { setView, setActivePsych, validateAdminPin, addToast } = useApp();
  const [step, setStep] = useState<SplashStep>("home");
  const [pinVal, setPinVal] = useState("");
  const [shake, setShake] = useState(false);

  const mainRef = useGsapFadeIn();
  const cardsRef = useGsapStagger("[data-psych-card]");

  useEffect(() => {
    if (step === "select-psych") {
      cardsRef.current?.querySelectorAll("[data-psych-card]");
    }
  }, [step, cardsRef]);

  function pressDigit(d: string) {
    if (pinVal.length >= 4) return;
    const newPin = pinVal + d;
    setPinVal(newPin);

    if (newPin.length === 4) {
      setTimeout(() => {
        if (validateAdminPin(newPin)) {
          setView("admin");
          addToast("Bem-vindo, Administrador!", "success");
        } else {
          setShake(true);
          setTimeout(() => {
            setShake(false);
            setPinVal("");
          }, 480);
        }
      }, 120);
    }
  }

  function handleBackspace() {
    setPinVal((prev) => prev.slice(0, -1));
  }

  if (step === "pin") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div
          ref={mainRef}
          className={`text-center ${shake ? "animate-[shake_0.45s_ease]" : ""}`}
        >
          <p className="font-body text-xs tracking-[0.25em] text-[rgba(196,181,253,0.56)] mb-6 uppercase">
            Código de Acesso Admin
          </p>

          <div className="flex gap-4 justify-center mb-8">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full transition-all duration-200"
                style={{
                  background:
                    i < pinVal.length ? "#c4b5fd" : "transparent",
                  border:
                    "1.5px solid rgba(196,181,253,0.35)",
                  boxShadow:
                    i < pinVal.length
                      ? "0 0 12px rgba(196,181,253,0.88)"
                      : "none",
                }}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 max-w-[210px] mx-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "⌫"].map((digit, idx) => (
              <button
                key={idx}
                disabled={digit === null}
                onClick={() => {
                  if (digit === null) return;
                  if (digit === "⌫") handleBackspace();
                  else pressDigit(String(digit));
                }}
                className="h-14 rounded-xl font-body text-xl text-morpheus-text transition-all duration-150 cursor-pointer"
                style={{
                  border:
                    digit === null
                      ? "none"
                      : "1px solid rgba(196,181,253,0.12)",
                  background:
                    digit === null
                      ? "transparent"
                      : "rgba(196,181,253,0.07)",
                  cursor: digit === null ? "default" : "pointer",
                }}
                onMouseEnter={(e) => {
                  if (digit !== null)
                    e.currentTarget.style.background =
                      "rgba(196,181,253,0.19)";
                }}
                onMouseLeave={(e) => {
                  if (digit !== null)
                    e.currentTarget.style.background =
                      "rgba(196,181,253,0.07)";
                }}
              >
                {digit}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setStep("home");
              setPinVal("");
            }}
            className="mt-5 bg-transparent border-none text-[rgba(196,181,253,0.32)] cursor-pointer font-body text-sm hover:text-[rgba(196,181,253,0.6)] transition-colors"
          >
            ← Voltar
          </button>
        </div>
      </div>
    );
  }

  if (step === "select-psych") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div ref={mainRef} className="text-center">
          <p className="font-body text-sm tracking-[0.25em] text-[rgba(196,181,253,0.55)] mb-6 uppercase">
            Selecione seu Perfil
          </p>

          <div
            ref={cardsRef}
            className="grid grid-cols-2 gap-3 w-full max-w-[400px]"
          >
            {PSYCHOLOGISTS.map((p) => (
              <button
                key={p.id}
                data-psych-card
                onClick={() => {
                  setActivePsych(p);
                  setView("psych");
                  const prefix = p.name.includes("Dra") ? "a" : "o";
                  addToast(
                    `Bem-vind${prefix}, ${p.shortName}!`,
                    "success"
                  );
                }}
                className="group p-5 rounded-2xl text-center transition-all duration-300 cursor-pointer"
                style={{
                  border: `1px solid rgba(${p.rgb},0.2)`,
                  background: `rgba(${p.rgb},0.06)`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = `rgba(${p.rgb},0.17)`;
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.borderColor = `rgba(${p.rgb},0.4)`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = `rgba(${p.rgb},0.06)`;
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = `rgba(${p.rgb},0.2)`;
                }}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 font-body text-base font-bold"
                  style={{
                    background: `rgba(${p.rgb},0.2)`,
                    border: `1px solid rgba(${p.rgb},0.36)`,
                    color: p.hex,
                  }}
                >
                  {p.initials}
                </div>
                <span className="font-body text-base text-morpheus-text font-medium leading-tight block">
                  {p.name}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setStep("home")}
            className="mt-5 bg-transparent border-none text-[rgba(196,181,253,0.32)] cursor-pointer font-body text-sm hover:text-[rgba(196,181,253,0.6)] transition-colors"
          >
            ← Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center flex-col p-6">
      <div ref={mainRef} className="text-center">
        <svg
          width="60"
          height="60"
          viewBox="0 0 64 64"
          fill="none"
          className="mx-auto mb-3"
        >
          <circle
            cx="32"
            cy="32"
            r="29"
            stroke="rgba(196,181,253,0.2)"
            strokeWidth="1"
          />
          <circle
            cx="32"
            cy="32"
            r="18"
            stroke="rgba(196,181,253,0.35)"
            strokeWidth="1"
          />
          <circle cx="32" cy="32" r="5" fill="rgba(196,181,253,0.6)" />
          <circle cx="32" cy="14" r="2.5" fill="rgba(125,211,252,0.58)" />
          <circle cx="50" cy="41" r="2.5" fill="rgba(253,164,175,0.58)" />
          <circle cx="14" cy="41" r="2.5" fill="rgba(110,231,183,0.58)" />
          <line
            x1="32"
            y1="16.5"
            x2="32"
            y2="27"
            stroke="rgba(196,181,253,0.18)"
            strokeWidth="1"
          />
          <line
            x1="47.5"
            y1="39"
            x2="38.5"
            y2="33.5"
            stroke="rgba(125,211,252,0.18)"
            strokeWidth="1"
          />
          <line
            x1="16.5"
            y1="39"
            x2="25.5"
            y2="33.5"
            stroke="rgba(253,164,175,0.18)"
            strokeWidth="1"
          />
        </svg>

        <h1
          className="font-display font-light tracking-[0.15em] text-morpheus-text leading-none"
          style={{ fontSize: "clamp(40px, 8vw, 64px)" }}
        >
          MORPHEUS
        </h1>
        <p className="font-body text-xs tracking-[0.35em] text-[rgba(196,181,253,0.5)] mt-2">
          GESTÃO DE SALAS & CONSULTAS
        </p>
        <div className="w-12 h-px bg-gradient-to-r from-transparent via-[rgba(196,181,253,0.3)] to-transparent mx-auto mt-3 mb-10" />

        <div className="flex flex-col gap-3 w-full max-w-[300px] mx-auto">
          <Button
            size="lg"
            onClick={() => setStep("select-psych")}
            className="w-full"
          >
            Acessar como Psicólogo(a)
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={() => setStep("pin")}
            className="w-full"
          >
            Acesso Administrativo
          </Button>
        </div>

        <p className="font-body text-xs text-morpheus-muted mt-4 opacity-60">
          PIN admin: 1234
        </p>
      </div>
    </div>
  );
}
