import { useState } from 'react'
import { TRIAGES, getAllTriagesForClass, getAllTriages } from '../../data/triages'
import { calcTriagemPrincipalLevel, calcSubTriagemLevel } from '../../utils/calculator'
import { getTriagemImage } from '../../data/triageImages'

const PRINCIPAL_LEVELS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6]
const SUB_LEVELS = [0.1, 0.2, 0.3]

const CLASS_COLORS = {
  GUERREIRO: { bg: 'bg-rose-500/5', border: 'border-rose-500/30', selected: 'border-rose-400', text: 'text-rose-400', glow: 'rgba(248,113,113,0.25)', gradient: 'from-rose-500/10 to-transparent' },
  OPERATIVO: { bg: 'bg-sky-500/5', border: 'border-sky-500/30', selected: 'border-sky-400', text: 'text-sky-400', glow: 'rgba(96,165,250,0.25)', gradient: 'from-sky-500/10 to-transparent' },
  MISTICO: { bg: 'bg-purple-500/5', border: 'border-purple-500/30', selected: 'border-purple-400', text: 'text-purple-400', glow: 'rgba(192,132,252,0.25)', gradient: 'from-purple-500/10 to-transparent' },
}

export default function Step8Triages({ char, update, updateNested }) {
  const classe = char.classe
  const nivel = char.nivel || 1
  const choices = char.choices || {}
  const [subFilter, setSubFilter] = useState(null)

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

  function getUnlockedLevels(maxLevel) {
    return PRINCIPAL_LEVELS.filter(l => l <= maxLevel)
  }

  function getUnlockedSubLevels(maxLevel) {
    return SUB_LEVELS.filter(l => l <= maxLevel)
  }

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
            <div className="triage-main-grid grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(classTriages).map(([key, triage]) => {
                const isSelected = triagemPrincipal === key
                const unlocked = getUnlockedLevels(principalLevel)
                const triageImage = getTriagemImage(classe, key)

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
                      '--triage-img': triageImage ? `url("${triageImage}")` : 'none',
                    }}
                  >
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
                      {PRINCIPAL_LEVELS.map(lvl => {
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
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-cinzel text-primary text-lg tracking-wider">Sub-Triagem</h3>
            {subLevel >= 0.1 && (
              <span className="text-txt-dim text-sm">
                Nível: <span className="text-gold font-mono">{subLevel}</span>
              </span>
            )}
          </div>
          {subLevel < 0.1 ? (
            <p className="text-txt-dim text-sm">Nenhuma sub-triagem desbloqueada no nível atual.</p>
          ) : (
            <>
              <div className="flex gap-2 mb-5">
                <button onClick={() => setSubFilter(null)}
                  className={`px-3 py-1.5 rounded text-xs font-cinzel tracking-wider transition-all ${!subFilter ? 'bg-gold/10 border border-gold/40 text-gold' : 'border border-sep text-txt-dim hover:border-gold/30'}`}>
                  Todas
                </button>
                {Object.entries(CLASS_COLORS).map(([ck, cc]) => (
                  <button key={ck} onClick={() => setSubFilter(subFilter === ck ? null : ck)}
                    className={`px-3 py-1.5 rounded text-xs font-cinzel tracking-wider transition-all ${subFilter === ck ? `${cc.bg} border ${cc.selected} ${cc.text}` : `border border-sep text-txt-dim hover:${cc.selected}`}`}>
                    {ck}
                  </button>
                ))}
              </div>

              <div className="space-y-5">
                {Object.entries(allTriages)
                  .filter(([classKey]) => !subFilter || classKey === subFilter)
                  .map(([classKey, triages]) => {
                  const cColor = CLASS_COLORS[classKey] || CLASS_COLORS.GUERREIRO
                  const unlockedSub = getUnlockedSubLevels(subLevel)

                  return (
                    <div key={classKey}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-8 h-8 rounded-lg ${cColor.bg} border ${cColor.border} flex items-center justify-center`}>
                          <span className={`material-symbols-outlined text-sm ${cColor.text}`} style={{ fontVariationSettings: "'FILL' 1, 'wght' 400" }}>
                            {classKey === 'GUERREIRO' ? 'shield' : classKey === 'OPERATIVO' ? 'gps_fixed' : 'auto_awesome'}
                          </span>
                        </div>
                        <span className={`font-cinzel text-sm tracking-widest uppercase ${cColor.text}`}>{classKey}</span>
                        <div className={`flex-1 h-px bg-gradient-to-r ${cColor.border} to-transparent`} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(triages).map(([triageKey, triage]) => {
                          const isSameAsPrincipal = triagemPrincipal === triageKey && classe === classKey
                          const isSelected = char.subTriagem === triageKey && char.subTriagemClass === classKey

                          return (
                            <div
                              key={`${classKey}-${triageKey}`}
                              onClick={() => !isSameAsPrincipal && selectSub(classKey, triageKey)}
                              role="button"
                              aria-pressed={isSelected}
                              className={`rounded-xl border transition-all overflow-hidden ${
                                isSameAsPrincipal
                                  ? 'border-sep/20 opacity-30 cursor-not-allowed'
                                  : isSelected
                                    ? `${cColor.selected} cursor-pointer`
                                    : `border-sep/50 hover:border-white/20 cursor-pointer`
                              }`}
                              style={{
                                ...(isSelected ? { boxShadow: `0 0 16px ${cColor.glow}`, background: `linear-gradient(135deg, var(--color-deep), ${cColor.glow})` } : {}),
                              }}
                            >
                              <div className={`px-4 py-2.5 border-b ${isSelected ? cColor.border : 'border-sep/30'} ${isSelected ? `bg-gradient-to-r ${cColor.gradient}` : 'bg-deep'}`}>
                                <div className="flex items-center justify-between">
                                  <h4 className={`font-cinzel text-sm ${isSelected ? cColor.text : isSameAsPrincipal ? 'text-txt-dim' : 'text-txt-main'}`}>
                                    {triage.name}
                                  </h4>
                                  <div className="flex items-center gap-2">
                                    {isSameAsPrincipal && (
                                      <span className="text-[10px] text-txt-dim/50 font-mono">= Principal</span>
                                    )}
                                    {isSelected && (
                                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${cColor.bg} ${cColor.text} border ${cColor.border}`}>Ativa</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="px-3 py-2 space-y-0.5">
                                {SUB_LEVELS.map(lvl => {
                                  const isUnlocked = unlockedSub.includes(lvl)
                                  const desc = triage.levels[lvl]
                                  if (!desc) return null

                                  return (
                                    <div
                                      key={lvl}
                                      className={`flex gap-2 text-xs rounded-lg px-2 py-1 ${
                                        !isUnlocked
                                          ? 'text-txt-dim/30'
                                          : isSelected
                                            ? `${cColor.bg} text-txt-main`
                                            : 'bg-panel/30 text-txt-main'
                                      }`}
                                    >
                                      <span className={`font-mono w-7 shrink-0 text-[11px] ${isUnlocked && isSelected ? cColor.text : ''}`}>
                                        {lvl}
                                      </span>
                                      <span className="leading-relaxed">{desc}</span>
                                    </div>
                                  )
                                })}
                              </div>
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
      )}

      {triagemPrincipal && principalLevel >= 0.1 && (
        <div className="codex-card p-5">
          <h3 className="font-cinzel text-primary text-lg mb-2 tracking-wider">Efeitos Acumulados</h3>
          <div className="space-y-1">
            {PRINCIPAL_LEVELS
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
