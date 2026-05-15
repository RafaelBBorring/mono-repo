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
  title?: string;
}

export default function Modal({
  open,
  onClose,
  children,
  colorRgb = "143,174,155",
  wide = false,
  title,
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
      className="fixed inset-0 z-[500] flex items-center justify-center p-4 md:p-6 bg-[var(--bg-primary)]"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <div
        className="absolute inset-0 backdrop-blur-lg"
        style={{
          background: "color-mix(in srgb, var(--bg-primary) 88%, rgba(36,49,45,0.18))",
        }}
      />
      <div
        className={`relative bg-[var(--bg-elevated)] rounded-3xl p-6 md:p-8 max-h-[90vh] overflow-y-auto animate-slide-up shadow-2xl ${
          wide ? "w-full max-w-[700px]" : "w-full max-w-[540px]"
        }`}
        style={{
          border: `2px solid rgba(${colorRgb},0.25)`,
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-12 h-12 min-w-[48px] min-h-[48px] rounded-2xl bg-[var(--bg-surface)] border-2 border-[var(--border-medium)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-lavender)] transition-all cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-lavender)]/30"
          aria-label="Fechar"
        >
          <X size={24} />
        </button>
        {title && (
          <h2
            id="modal-title"
            className="font-display text-2xl md:text-3xl font-light text-[var(--text-primary)] mb-6 pr-16"
          >
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}
