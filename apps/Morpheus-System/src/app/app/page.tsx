"use client";

import { AppProvider } from "@/context/AppContext";
import AppRouter from "@/components/AppRouter";
import ParticleBackground from "@/components/ParticleBackground";
import SmoothScrollProvider from "@/components/SmoothScroll";
import ToastContainer from "@/components/ToastContainer";

export default function AppPage() {
  return (
    <AppProvider>
      <SmoothScrollProvider enabled={false}>
        <ParticleBackground />
        <div
          className="fixed inset-0 z-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 20% 12%, rgba(79,127,105,0.16) 0%, transparent 52%), radial-gradient(ellipse at 80% 88%, rgba(79,143,165,0.14) 0%, transparent 52%)",
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
