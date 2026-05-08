import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Morpheus - Gestão de Salas",
  description: "Sistema de gestão de salas para clínica de psicologia",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-[var(--bg-primary)] text-[var(--text-primary)] font-body antialiased">
        {children}
      </body>
    </html>
  );
}
