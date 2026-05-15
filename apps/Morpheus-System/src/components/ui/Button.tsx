"use client";

import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger" | "gradient";
  colorRgb?: string;
  size?: "sm" | "md" | "lg" | "xl";
  fullWidth?: boolean;
}

export default function Button({
  variant = "primary",
  colorRgb = "143,174,155",
  size = "md",
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const sizeClasses = {
    sm: "px-5 py-3 text-base min-h-[44px]",
    md: "px-7 py-4 text-lg min-h-[52px]",
    lg: "px-9 py-5 text-xl min-h-[60px]",
    xl: "px-12 py-6 text-2xl min-h-[68px]",
  };

  const widthClass = fullWidth ? "w-full" : "";

  const baseClasses = cn(
    "rounded-2xl font-body cursor-pointer font-semibold",
    "transition-all duration-[150ms] ease-[var(--ease-premium)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--accent-lavender)]/30",
    "inline-flex items-center justify-center gap-3",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    sizeClasses[size],
    widthClass,
    className
  );

  if (variant === "gradient") {
    return (
      <button
        className={cn(
          baseClasses,
          "text-[var(--action-foreground)] font-bold border border-white/10 shadow-xl shadow-black/20 magnetic-button",
          "hover:shadow-2xl hover:shadow-[var(--accent-lavender)]/25 hover:translate-y-[-1px]"
        )}
        style={{
          background: "linear-gradient(135deg, var(--action-primary), var(--action-secondary))",
        }}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }

  if (variant === "ghost") {
    return (
      <button
        className={cn(
          baseClasses,
          "rounded-2xl border-2 border-[var(--border-medium)] bg-[var(--glass-soft)]",
          "text-[var(--text-primary)] font-medium",
          "hover:bg-[var(--bg-elevated)] hover:border-[var(--accent-lavender)]"
        )}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }

  if (variant === "danger") {
    return (
      <button
        className={cn(
          baseClasses,
          "border-2 border-[var(--state-error)] bg-[rgba(201,106,91,0.12)]",
          "text-[var(--state-error)] font-semibold",
          "hover:bg-[rgba(201,106,91,0.18)] hover:border-[var(--state-error)]"
        )}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      className={cn(
        baseClasses,
        "border-2 font-semibold",
        "hover:border-[var(--accent-lavender)] hover:scale-[1.02]"
      )}
      style={{
        borderColor: `rgba(${colorRgb},0.35)`,
        background: `linear-gradient(135deg, rgba(${colorRgb},0.2), rgba(${colorRgb},0.08))`,
        color: "var(--text-primary)",
      }}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
