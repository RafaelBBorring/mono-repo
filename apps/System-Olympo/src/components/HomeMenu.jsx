export default function HomeMenu({ userName, sheetsCount, onNew, onContinue, onLibrary, onReference, hasDraft }) {
  const actions = [
    {
      label: 'Forjar',
      title: 'Novo Personagem',
      detail: 'Entre no templo de criacao e monte a ficha do zero.',
      onClick: onNew,
      tone: 'bronze',
      disabled: false,
    },
    {
      label: 'Retomar',
      title: 'Continuar Ficha',
      detail: hasDraft ? 'Voltar ao rascunho aberto no altar.' : 'Nenhum rascunho em andamento.',
      onClick: onContinue,
      tone: 'aegean',
      disabled: !hasDraft,
    },
    {
      label: 'Arquivo',
      title: 'Meus Personagens',
      detail: sheetsCount > 0 ? `${sheetsCount} ficha${sheetsCount > 1 ? 's' : ''} salva${sheetsCount > 1 ? 's' : ''}.` : 'O arquivo ainda esta vazio.',
      onClick: onLibrary,
      tone: 'olive',
      disabled: false,
    },
    {
      label: 'Oraculo',
      title: 'Referencia',
      detail: 'Regras, grimorios, runas, protocolos e guias.',
      onClick: onReference,
      tone: 'marble',
      disabled: false,
    },
  ]

  return (
    <div className="home-stage greek-stage">
      <section className="greek-hero">
        <div className="greek-column left" aria-hidden="true" />
        <div className="greek-column right" aria-hidden="true" />
        <div className="greek-orbit" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <div className="home-copy greek-copy">
          <p className="text-gold/70 text-xs uppercase tracking-[0.28em] font-semibold mb-3">Olympo 2.0</p>
          <h1 className="font-cinzel text-gold text-4xl sm:text-6xl leading-tight">Sistema Olympo</h1>
          <p className="greek-subtitle">
            Um painel de personagens com alma de templo antigo e precisao de sistema moderno.
          </p>
          {userName && (
            <p className="text-txt-dim text-sm mt-4">
              Bem-vindo de volta, <span className="text-txt-main font-semibold">{userName}</span>.
            </p>
          )}
        </div>
      </section>

      <section className="home-actions greek-actions">
        {actions.map((action) => (
          <button
            key={action.title}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            className={`home-action greek-action is-${action.tone}`}
          >
            <span className="home-action-kicker">{action.label}</span>
            <strong>{action.title}</strong>
            <small>{action.detail}</small>
          </button>
        ))}
      </section>
    </div>
  )
}
