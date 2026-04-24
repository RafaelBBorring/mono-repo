export default function HomeMenu({ userName, sheetsCount, onNew, onContinue, onLibrary, onReference, hasDraft }) {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-12 flex flex-col items-center gap-8">

      {/* Logotipo / Título */}
      <div className="text-center space-y-2">
        <h1 className="font-cinzel text-gold text-4xl sm:text-5xl tracking-widest drop-shadow-[0_0_30px_rgba(212,175,55,0.3)]">
          SISTEMA OLYMPO
        </h1>
        <p className="font-cinzel text-gold/40 text-sm tracking-[0.4em] uppercase">Versão 2.0</p>
        {userName && (
          <p className="text-txt-dim text-sm mt-3">
            Bem-vindo de volta, <span className="text-txt-main font-medium">{userName}</span>
          </p>
        )}
      </div>

      {/* Ações principais */}
      <div className="w-full grid gap-3 sm:grid-cols-2">

        {/* Criar novo */}
        <button
          onClick={onNew}
          className="group relative overflow-hidden rounded-2xl border border-gold/40 bg-gold/5 hover:bg-gold/10 hover:border-gold/70 transition-all duration-200 p-6 text-left"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="text-3xl mb-3">⚔️</div>
          <div className="font-cinzel text-gold text-lg mb-1">Novo Personagem</div>
          <div className="text-txt-dim text-xs">Iniciar a criação de uma nova ficha do zero</div>
        </button>

        {/* Continuar rascunho */}
        <button
          onClick={onContinue}
          disabled={!hasDraft}
          className={`group relative overflow-hidden rounded-2xl border transition-all duration-200 p-6 text-left ${
            hasDraft
              ? 'border-sky-500/40 bg-sky-500/5 hover:bg-sky-500/10 hover:border-sky-500/70'
              : 'border-sep/20 bg-void/40 opacity-40 cursor-not-allowed'
          }`}
        >
          <div className="text-3xl mb-3">📋</div>
          <div className={`font-cinzel text-lg mb-1 ${hasDraft ? 'text-sky-400' : 'text-txt-dim'}`}>
            Continuar Ficha
          </div>
          <div className="text-txt-dim text-xs">
            {hasDraft ? 'Retomar o rascunho atual em andamento' : 'Nenhum rascunho em andamento'}
          </div>
        </button>

        {/* Biblioteca */}
        <button
          onClick={onLibrary}
          className="group relative overflow-hidden rounded-2xl border border-purple-500/40 bg-purple-500/5 hover:bg-purple-500/10 hover:border-purple-500/70 transition-all duration-200 p-6 text-left"
        >
          <div className="text-3xl mb-3">📚</div>
          <div className="font-cinzel text-purple-400 text-lg mb-1">Meus Personagens</div>
          <div className="text-txt-dim text-xs">
            {sheetsCount > 0
              ? `${sheetsCount} ficha${sheetsCount > 1 ? 's' : ''} salva${sheetsCount > 1 ? 's' : ''}`
              : 'Nenhuma ficha salva ainda'}
          </div>
        </button>

        {/* Referência */}
        <button
          onClick={onReference}
          className="group relative overflow-hidden rounded-2xl border border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/70 transition-all duration-200 p-6 text-left"
        >
          <div className="text-3xl mb-3">📖</div>
          <div className="font-cinzel text-emerald-400 text-lg mb-1">Referência</div>
          <div className="text-txt-dim text-xs">Tabelas, protocolos e guias do sistema</div>
        </button>
      </div>

      {/* Separador + info */}
      <div className="w-full border-t border-sep/30 pt-4 flex flex-wrap justify-center gap-6 text-xs text-txt-dim/50">
        <span>Sistema Olympo 2.0 &copy; {new Date().getFullYear()}</span>
        <span>Nova Orleans Supernatural Universe</span>
      </div>
    </div>
  )
}
