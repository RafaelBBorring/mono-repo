import Link from 'next/link';
import Navbar from '@/components/Navbar';
import HermesMark from '@/components/HermesMark';

export default function NotFound() {
  return (
    <main className="relative min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-40 pb-20 text-center">
        <div className="flex justify-center mb-6"><HermesMark size={56} /></div>
        <div className="text-[0.6rem] tracking-[0.3em] uppercase text-dusk mb-2">Erro 404</div>
        <h1 className="font-display text-3xl font-bold text-ivory mb-3">Página fora do radar</h1>
        <p className="text-dusk text-sm mb-8 max-w-md mx-auto">
          O endereço não existe. O mensageiro pode ter seguido para outra rota.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/" className="btn-primary text-sm">Voltar ao radar</Link>
          <Link href="/#radar" className="btn-secondary text-sm">Ver oportunidades</Link>
        </div>
      </div>
    </main>
  );
}
