"use client";

import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  colorRgb?: string;
  wide?: boolean;
}

export default function Modal({
  open,
  onClose,
  children,
  colorRgb = "196,181,253",
  wide = false,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, handleKey]);

  if (!open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-[var(--bg-primary)]"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="absolute inset-0 bg-[rgba(4,3,12,0.92)] backdrop-blur-lg dark:bg-[rgba(0,0,0,0.85)]" />
      <div
        className={`relative bg-[var(--bg-surface)] rounded-2xl p-6 md:p-8 max-h-[88vh] overflow-y-auto animate-slide-up ${
          wide ? "w-full max-w-[600px]" : "w-full max-w-[480px]"
        }`}
        style={{
          border: `1px solid rgba(${colorRgb},0.22)`,
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.09] flex items-center justify-center text-white/40 hover:text-white/70 transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
}
