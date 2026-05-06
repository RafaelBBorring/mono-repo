"use client";

import { AppProvider } from "@/context/AppContext";
import AppRouter from "@/components/AppRouter";
import ParticleBackground from "@/components/ParticleBackground";
import SmoothScrollProvider from "@/components/SmoothScroll";
import ToastContainer from "@/components/ToastContainer";

export default function Home() {
  return (
    <AppProvider>
      <SmoothScrollProvider>
        <ParticleBackground />
        <div
          className="fixed inset-0 z-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 20% 12%, rgba(48,14,95,0.28) 0%, transparent 52%), radial-gradient(ellipse at 80% 88%, rgba(12,42,80,0.22) 0%, transparent 52%)",
          }}
        />
        <main className="relative z-[1] w-full min-h-screen">
          <AppRouter />
        </main>
        <ToastContainer />
      </SmoothScrollProvider>
    </AppProvider>
  );
}
