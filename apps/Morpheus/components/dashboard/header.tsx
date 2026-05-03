"use client";

interface HeaderUser {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
}

interface HeaderProps {
  user?: HeaderUser;
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  RECEPTIONIST: "Recepcionista",
  PSYCHOLOGIST: "Psicologa",
};

export function Header({ user }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">
          Bem-vindo(a), <span className="font-medium text-gray-900">{user?.name}</span>
        </p>
      </div>
      <div className="flex items-center gap-3">
        {user?.role && (
          <span className="px-2.5 py-1 text-xs font-medium bg-morpheus-100 text-morpheus-700 rounded-full">
            {roleLabels[user.role] ?? user.role}
          </span>
        )}
      </div>
    </header>
  );
}
