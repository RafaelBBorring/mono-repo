import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-morpheus-950 to-morpheus-900 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">Morpheus</h1>
          <p className="text-xl text-morpheus-200 max-w-lg mx-auto">
            Plataforma SaaS de Gestao Clinica para Consultorios de Psicologia
          </p>
        </div>

        <div className="flex gap-4">
          <Link
            href="/login"
            className="px-8 py-3 bg-morpheus-500 text-white rounded-lg font-medium hover:bg-morpheus-600 transition-colors"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="px-8 py-3 border border-morpheus-400 text-morpheus-200 rounded-lg font-medium hover:bg-morpheus-900 transition-colors"
          >
            Criar Conta
          </Link>
        </div>
      </div>

      <footer className="py-8 text-center text-morpheus-400">
        <p>&copy; 2026 Morpheus. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
