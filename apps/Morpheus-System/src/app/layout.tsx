import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Morpheus — Sistema operacional para clínicas",
  description: "Morpheus transforma salas, agendas e profissionais em uma operação clara para clínicas que compartilham espaço.",
};

const themeBootstrap = `(function(){try{var k='theme';var s=localStorage.getItem(k);var t=s?s:(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');var d=document.documentElement;d.classList.remove('light','dark');d.classList.add(t);d.style.colorScheme=t;}catch(e){var d=document.documentElement;d.classList.add('light');}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="bg-[var(--bg-primary)] text-[var(--text-primary)] font-body antialiased">
        {children}
      </body>
    </html>
  );
}
