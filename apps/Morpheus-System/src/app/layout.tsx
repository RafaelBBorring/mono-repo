import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Morpheus — Gestão de Salas",
  description: "Sistema de gestão de salas para clínica de psicologia",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-[#06040f] text-morpheus-text font-body antialiased">
        {children}
      </body>
    </html>
  );
}
