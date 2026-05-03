"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import clsx from "clsx";
import Link from "next/link";

interface SidebarUser {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
}

interface SidebarProps {
  user?: SidebarUser;
}

const navLinks = [
  { href: "/", label: "Dashboard", icon: "\uD83D\uDCCA" },
  { href: "/dashboard/rooms", label: "Salas", icon: "\uD83D\uDCC5" },
  { href: "/dashboard/psychologists", label: "Psicologas", icon: "\uD83D\uDC69\u200D\u2695\uFE0F" },
  { href: "/dashboard/clients", label: "Clientes", icon: "\uD83D\uDC65" },
  { href: "/dashboard/appointments", label: "Consultas", icon: "\uD83D\uDCDD" },
  { href: "/dashboard/settings", label: "Configuracoes", icon: "\u2699\uFE0F" },
];

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-morpheus-900 text-white flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold">Morpheus</h1>
      </div>

      <nav className="flex-1 px-3">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-colors",
                isActive
                  ? "bg-morpheus-700 text-white"
                  : "text-morpheus-200 hover:bg-morpheus-800"
              )}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-morpheus-700">
        <p className="text-sm text-morpheus-200 truncate mb-3">
          {user?.email}
        </p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full px-3 py-2 text-sm bg-morpheus-700 hover:bg-morpheus-600 rounded-lg transition-colors"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}
