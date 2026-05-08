"use client";

import { useApp } from "@/context/AppContext";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, Info } from "lucide-react";

export default function ToastContainer() {
  const { toasts, removeToast } = useApp();

  const colorMap = {
    success: { bg: "rgba(110,231,183,0.13)", border: "rgba(110,231,183,0.42)", text: "#6ee7b7", Icon: CheckCircle },
    error: { bg: "rgba(253,164,175,0.13)", border: "rgba(253,164,175,0.42)", text: "#fda4af", Icon: XCircle },
    info: { bg: "rgba(196,181,253,0.13)", border: "rgba(196,181,253,0.42)", text: "#c4b5fd", Icon: Info },
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
