import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();

  const tenantId = (session?.user as Record<string, unknown> | undefined)
    ?.tenantId as string | undefined;

  const [rooms, psychologists, clients, appointments] = await Promise.all([
    prisma.room.count({ where: { tenantId, active: true } }),
    prisma.psychologist.count({ where: { tenantId, active: true } }),
    prisma.client.count({ where: { tenantId, active: true } }),
    prisma.appointment.count({ where: { tenantId, active: true } }),
  ]);

  const stats = [
    { label: "Salas", count: rooms, icon: "\uD83D\uDCC5", color: "bg-blue-50 text-blue-700" },
    { label: "Psicologas", count: psychologists, icon: "\uD83D\uDC69\u200D\u2695\uFE0F", color: "bg-purple-50 text-purple-700" },
    { label: "Clientes", count: clients, icon: "\uD83D\uDC65", color: "bg-green-50 text-green-700" },
    { label: "Consultas", count: appointments, icon: "\uD83D\uDCDD", color: "bg-orange-50 text-orange-700" },
  ];

  const quickStart = [
    { label: "Criar Sala", href: "/dashboard/rooms", icon: "\uD83D\uDCC5" },
    { label: "Cadastrar Psicologa", href: "/dashboard/psychologists", icon: "\uD83D\uDC69\u200D\u2695\uFE0F" },
    { label: "Cadastrar Cliente", href: "/dashboard/clients", icon: "\uD83D\uDC65" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Bem-vindo(a), {session?.user?.name}
      </h1>
      <p className="text-gray-500 mb-8">
        Aqui esta um resumo da sua clinica.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-gray-200 p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{stat.icon}</span>
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${stat.color}`}>
                {stat.label}
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stat.count}</p>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Inicio Rapido
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickStart.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-morpheus-300 hover:shadow-sm transition-all group"
          >
            <span className="text-2xl block mb-2">{item.icon}</span>
            <p className="font-medium text-gray-900 group-hover:text-morpheus-600 transition-colors">
              {item.label}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
