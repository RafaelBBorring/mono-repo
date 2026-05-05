import { TRIAGES, getAllTriagesForClass, getAllTriages } from '../../data/triages'
import { calcTriagemPrincipalLevel, calcSubTriagemLevel } from '../../utils/calculator'
import { getTriagemImage } from '../../data/triageImages'

export default function Step8Triages({ char, update, updateNested }) {
  const classe = char.classe
  const nivel = char.nivel || 1
  const choices = char.choices || {}

  if (!classe) {
    return (
      <div className="text-txt-dim text-center py-8">
        Selecione uma classe na Etapa 2 para ver as triagens.
      </div>
    )
  }

  const principalLevel = calcTriagemPrincipalLevel(classe, nivel, choices)
  const subLevel = calcSubTriagemLevel(classe, nivel, choices)
  const showSubTriagem = nivel >= 16

  const classTriages = getAllTriagesForClass(classe)
  const allTriages = getAllTriages()
  const triagemPrincipal = char.triagemPrincipal || null

  const CLASS_COLORS = {
    GUERREIRO: { bg: 'bg-rose-500/5', border: 'border-rose-500/30', selected: 'border-rose-400', text: 'text-rose-400', glow: 'rgba(248,113,113,0.25)' },
    OPERATIVO: { bg: 'bg-sky-500/5', border: 'border-sky-500/30', selected: 'border-sky-400', text: 'text-sky-400', glow: 'rgba(96,165,250,0.25)' },
    MISTICO: { bg: 'bg-purple-500/5', border: 'border-purple-500/30', selected: 'border-purple-400', text: 'text-purple-400', glow: 'rgba(192,132,252,0.25)' },
  }
  const classColor = CLASS_COLORS[classe] || CLASS_COLORS.GUERREIRO

  function selectPrincipal(key) {
    update({
      triagemPrincipal: key,
      triagemPrincipalNivel: principalLevel,
    })
  }

  function selectSub(classKey, triageKey) {
    if (triagemPrincipal === triageKey && classe === classKey) return
    update({
      subTriagem: triageKey,
      subTriagemClass: classKey,
      subTriagemNivel: subLevel,
    })
  }

  function getUnlockedLevels(triageData, maxLevel) {
    const allLevels = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6]
    return allLevels.filter(l => l <= maxLevel)
  }

  function getSubUnlockedLevels(maxLevel) {
    const allLevels = [0.1, 0.2, 0.3]
    return allLevels.filter(l => l <= maxLevel)
  }

  const principalLevels = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6]

  return (
    <div className={`triage-stage triage-${String(classe).toLowerCase()} space-y-8`}>
      <div className="section-header text-primary mb-8">
        <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>account_tree</span>
        Triagens
      </div>

      <div>
        <h3 className="font-cinzel text-primary text-lg mb-2 tracking-wider">Triagem Principal</h3>
        {principalLevel < 0.1 ? (
          <p className="text-txt-dim text-sm">Nenhuma triagem principal desbloqueada no nível atual.</p>
        ) : (
          <>
            <p className="text-txt-dim text-sm mb-4">
              Nível desbloqueado: <span className="text-gold font-mono">{principalLevel}</span>
              {!triagemPrincipal && (
                <span className="text-warn ml-2">— Selecione uma triagem principal</span>
              )}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(classTriages).map(([key, triage]) => {
                const isSelected = triagemPrincipal === key
                const unlocked = getUnlockedLevels(triage, principalLevel)

                return (
                  <div
                    key={key}
                    onClick={() => selectPrincipal(key)}
                    className={`triage-main-card ${classColor.bg} border rounded p-4 cursor-pointer transition-all ${
                      isSelected
                        ? `${classColor.selected}`
                        : `${classColor.border} hover:${classColor.selected}`
                    }`}
                    style={{
                      ...(isSelected ? { boxShadow: `0 0 16px ${classColor.glow}` } : {}),
                      '--triage-img': getTriagemImage(classe, key) ? `url(${getTriagemImage(classe, key)})` : undefined,
                    }}
                  >
                    {getTriagemImage(classe, key) && (
                      <div className="relative h-32 -mx-4 -mt-4 mb-3 overflow-hidden rounded-t">
                        <img src={getTriagemImage(classe, key)} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1c1b1c] via-[#1c1b1c]/60 to-transparent" />
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-1">
                      <h4 className={`font-cinzel text-lg ${isSelected ? classColor.text : 'text-txt-main'}`}>
                        {triage.name}
                      </h4>
                      {isSelected && (
                        <span className={`text-xs ${classColor.bg} ${classColor.text} px-2 py-0.5 rounded border ${classColor.border}`}>Ativa</span>
                      )}
                    </div>
                    <p className="text-txt-dim text-xs mb-3">{triage.desc}</p>

                    <div className="space-y-1.5">
                      {principalLevels.map(lvl => {
                        const isUnlocked = unlocked.includes(lvl)
                        const desc = triage.levels[lvl]
                        if (!desc) return null

                        return (
                          <div
                            key={lvl}
                            className={`flex gap-2 text-xs rounded px-2 py-1.5 ${
                              isUnlocked
                                ? isSelected ? `${classColor.bg} text-txt-main` : 'bg-panel/50 text-txt-main'
                                : 'text-txt-dim/40'
                            }`}
                          >
                            <span className={`font-mono w-8 shrink-0 ${isUnlocked && isSelected ? classColor.text : ''}`}>
                              {lvl}
                            </span>
                            <span>{desc}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {showSubTriagem && (
        <div>
          <h3 className="font-cinzel text-primary text-lg mb-2 tracking-wider">Sub-Triagem</h3>
          {subLevel < 0.1 ? (
            <p className="text-txt-dim text-sm">Nenhuma sub-triagem desbloqueada no nível atual.</p>
          ) : (
            <>
              <p className="text-txt-dim text-sm mb-4">
                Nível desbloqueado: <span className="text-gold font-mono">{subLevel}</span>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {Object.entries(allTriages).map(([classKey, triages]) =>
                  Object.entries(triages).map(([triageKey, triage]) => {
                    const isSameAsPrincipal = triagemPrincipal === triageKey && classe === classKey
                    const isSelected = char.subTriagem === triageKey && char.subTriagemClass === classKey
                    const subLevels = [0.1, 0.2, 0.3]
                    const unlockedSub = getSubUnlockedLevels(subLevel)

                    return (
                      <div
                        key={`${classKey}-${triageKey}`}
                        onClick={() => !isSameAsPrincipal && selectSub(classKey, triageKey)}
                        className={`triage-sub-card is-${String(classKey).toLowerCase()} bg-deep border rounded p-3 transition-all ${
                          isSameAsPrincipal
                            ? 'border-sep/20 opacity-30 cursor-not-allowed'
                            : isSelected
                              ? 'border-gray-400/40 shadow-[0_0_8px_rgba(160,160,180,0.2)] cursor-pointer'
                              : 'border-sep hover:border-white/20 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`font-body text-sm font-semibold ${isSelected ? 'text-gray-300' : isSameAsPrincipal ? 'text-txt-dim' : 'text-txt-main'}`}>
                            {triage.name}
                          </h4>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${CLASS_COLORS[classKey]?.bg || ''} ${CLASS_COLORS[classKey]?.text || 'text-txt-dim'}`}>{classKey}</span>
                        </div>
                        <p className="text-txt-dim text-xs mb-2">{triage.desc}</p>
                        <div className="space-y-1">
                          {subLevels.map(lvl => {
                            const isUnlocked = unlockedSub.includes(lvl)
                            const desc = triage.levels[lvl]
                            if (!desc) return null

                            return (
                              <div
                                key={lvl}
                                className={`flex gap-2 text-xs rounded px-2 py-1 ${
                                  isUnlocked
                                    ? isSelected ? 'bg-gray-500/10 text-txt-main' : 'bg-panel/50 text-txt-main'
                                    : 'text-txt-dim/40'
                                }`}
                              >
                                <span className={`font-mono w-8 shrink-0 ${isUnlocked && isSelected ? 'text-gray-300' : ''}`}>
                                  {lvl}
                                </span>
                                <span>{desc}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </>
          )}
        </div>
      )}

      {triagemPrincipal && principalLevel >= 0.1 && (
        <div className="codex-card p-5">
          <h3 className="font-cinzel text-primary text-lg mb-2 tracking-wider">Efeitos Acumulados</h3>
          <div className="space-y-1">
            {principalLevels
              .filter(lvl => lvl <= principalLevel)
              .map(lvl => {
                const triage = classTriages[triagemPrincipal]
                if (!triage) return null
                const desc = triage.levels[lvl]
                if (!desc) return null
                return (
                  <div key={lvl} className="flex gap-2 text-sm">
                    <span className={`${classColor.text} font-mono w-8`}>{lvl}</span>
                    <span className="text-txt-main">{desc}</span>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
