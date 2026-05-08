"use client";

import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger";
  colorRgb?: string;
  size?: "sm" | "md" | "lg";
}

export default function Button({
  variant = "primary",
  colorRgb = "196,181,253",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  const sizeClasses = {
    sm: "px-3 py-2 text-sm",
    md: "px-5 py-3 text-base",
    lg: "px-7 py-4 text-lg",
  };

  if (variant === "ghost") {
    return (
      <button
        className={cn(
          "rounded-xl border border-[var(--border-light)] bg-transparent",
          "text-[var(--text-muted)] font-body cursor-pointer",
          "transition-all duration-200 hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]",
          "inline-flex items-center justify-center gap-2",
          sizeClasses[size],
          className
        )}
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
          "rounded-xl border border-[rgba(253,164,175,0.3)] bg-[rgba(253,164,175,0.07)]",
          "text-[#fda4af] font-body cursor-pointer",
          "transition-all duration-200 hover:bg-[rgba(253,164,175,0.18)]",
          "inline-flex items-center justify-center gap-2",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      className={cn(
        "rounded-xl font-body cursor-pointer text-[var(--text-primary)] font-medium",
        "transition-all duration-200",
        "inline-flex items-center justify-center gap-2",
        sizeClasses[size],
        className
      )}
      style={{
        border: `1px solid rgba(${colorRgb},0.32)`,
        background: `rgba(${colorRgb},0.09)`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = `rgba(${colorRgb},0.2)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = `rgba(${colorRgb},0.09)`;
      }}
      {...props}
    >
      {children}
    </button>
  );
}
