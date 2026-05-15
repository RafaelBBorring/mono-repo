"use client";

import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, Info } from "lucide-react";

export default function ToastContainer() {
  const { toasts, removeToast } = useApp();

  const colorMap = {
    success: { bg: "rgba(107,170,117,0.13)", border: "rgba(107,170,117,0.42)", text: "var(--state-success)", Icon: CheckCircle },
    error: { bg: "rgba(201,106,91,0.13)", border: "rgba(201,106,91,0.42)", text: "var(--state-error)", Icon: XCircle },
    info: { bg: "rgba(79,143,165,0.13)", border: "rgba(79,143,165,0.42)", text: "var(--accent-sky)", Icon: Info },
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => {
        const c = colorMap[t.type];
        return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl",
              "font-body text-sm text-[var(--text-primary)] min-w-[220px]",
              "animate-slide-in-right"
            )}
            style={{
              background: c.bg,
              border: `1px solid ${c.border}`,
            }}
            onClick={() => removeToast(t.id)}
          >
            <c.Icon size={16} style={{ color: c.text }} />
            <span>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
