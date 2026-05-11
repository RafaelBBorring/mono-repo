import { CLASSES } from '../../data/classes'
import { calcVidaTotal, calcEnergiaTotal, calcPeTotal, calcDanoBase } from '../../utils/calculator'
import { getModifier } from '../../data/attributes'
import { getRaceAdjustedAttrs } from '../../utils/raceCalculator'

export default function Step3Class({ char, update }) {
  const sk = char.skeletonPoints || {}
  const adjustedAttrs = getRaceAdjustedAttrs(char.atributos, sk, char)
  const totalAttr = (a) => adjustedAttrs[a] || 0

  function getBaseStats(cls) {
    const def = CLASSES[cls]
    const con = totalAttr('CON')
    const am = totalAttr('AM')
    const modCon = getModifier(con)
    const modAm = getModifier(am)
    return {
      vidaBase: def.vidaBase(con),
      energiaBase: def.energiaBase(am),
      peBase: def.peBase,
      danoBase: def.danoBase,
      periciasIniciais: def.periciasIniciais,
      vidaPorNivel: def.vidaPorNivel(modCon),
      energiaPorNivel: def.energiaPorNivel(modAm),
      pePorNivel: def.pePorNivel,
    }
  }

  function getProjectedTotals(cls) {
    return {
      vida: calcVidaTotal(cls, char.nivel, char.atributos, sk, char.choices, char.triagemPrincipal, char.triagemPrincipalNivel, char, char.subTriagem, char.subTriagemNivel),
      energia: calcEnergiaTotal(cls, char.nivel, char.atributos, sk, char.choices, char.triagemPrincipal, char.triagemPrincipalNivel, char.subTriagem, char.subTriagemNivel, char),
      pe: calcPeTotal(cls, char.nivel, char.choices, char),
      dano: calcDanoBase(cls, char.atributos, sk, char.nivel, char.subTriagem, char.subTriagemNivel, char.triagemPrincipal, char.triagemPrincipalNivel, char),
    }
  }

  const CLASS_ACCENT = {
    Guerreiro: { border: 'border-rose-500/40', bg: 'from-rose-500/5', bgSolid: 'bg-rose-500/5', icon: 'swords', accent: 'text-rose-400', glow: 'rgba(248,113,113,0.15)' },
    Operativo: { border: 'border-sky-500/40', bg: 'from-sky-500/5', bgSolid: 'bg-sky-500/5', icon: 'precision_manufacturing', accent: 'text-sky-400', glow: 'rgba(96,165,250,0.15)' },
    Místico: { border: 'border-purple-500/40', bg: 'from-purple-500/5', bgSolid: 'bg-purple-500/5', icon: 'auto_awesome', accent: 'text-purple-400', glow: 'rgba(192,132,252,0.15)' },
  }

  return (
    <div className="space-y-6">
      <div className="section-header text-primary mb-8">
        <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 0, 'wght' 400" }}>shield</span>
        Classe do Personagem
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {Object.keys(CLASSES).map((cls) => {
          const def = CLASSES[cls]
          const base = getBaseStats(cls)
          const isSelected = char.classe === cls
          const accent = CLASS_ACCENT[cls] || { border: 'border-primary/40', bg: 'from-primary/5', bgSolid: 'bg-primary/5', icon: 'shield', accent: 'text-primary', glow: 'rgba(247,189,72,0.1)' }

          return (
            <button key={cls} onClick={() => update({ classe: cls })}
              className={`text-left transition-all duration-300 group border-b-4 ${
                isSelected
                  ? `${accent.bgSolid} !border-b-primary ${accent.border}`
                  : `glass-card hover:-translate-y-1 ${accent.border}`
              }`}
              style={isSelected ? { boxShadow: `0 0 20px ${accent.glow}` } : undefined}
            >
              <div className={`h-16 bg-gradient-to-br ${accent.bg} to-transparent flex items-center justify-center`}>
                <span className={`material-symbols-outlined ${accent.accent} scale-[2] opacity-20 group-hover:opacity-60 transition-opacity`}>
                  {accent.icon}
                </span>
              </div>
              <div className="p-5 -mt-6">
                <h3 className="font-cinzel text-on-surface text-lg uppercase tracking-wider mb-1 group-hover:text-primary transition-colors">{def.name}</h3>
                <p className="text-on-surface-variant text-sm mb-4 leading-relaxed">{def.desc}</p>

                <div className="space-y-2 text-sm">
                  <StatLine label="Vida Base" value={base.vidaBase} />
                  <StatLine label="Energia Base" value={base.energiaBase} />
                  <StatLine label="PE Base" value={base.peBase} />
                  <StatLine label="Dano Base" value={base.danoBase} />
                  <StatLine label="Perícias Iniciais" value={base.periciasIniciais} />
                  <div className="border-t border-white/5 pt-2 mt-2">
                    <p className="text-outline text-xs font-mono uppercase">Por nível:</p>
                    <StatLine label="Vida/Nv" value={`+${base.vidaPorNivel}`} />
                    <StatLine label="Energia/Nv" value={`+${base.energiaPorNivel}`} />
                    <StatLine label="PE/Nv" value={`+${base.pePorNivel}`} />
                  </div>
                </div>

                {isSelected && (
                  <div className="border-t border-primary/30 mt-4 pt-3 space-y-1">
                    <p className="text-primary text-xs font-semibold mb-2 font-mono uppercase tracking-wider">Projetado Nv. {char.nivel}</p>
                    {(() => {
                      const proj = getProjectedTotals(cls)
                      return (
                        <>
                          <StatLine label="Vida Total" value={proj.vida} highlight />
                          <StatLine label="Energia Total" value={proj.energia} highlight />
                          <StatLine label="PE Total" value={proj.pe} highlight />
                          <StatLine label="Dano" value={proj.dano} highlight />
                        </>
                      )
                    })()}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function StatLine({ label, value, highlight }) {
  const tone = /Vida/.test(label) ? 'text-resource-vida' : /Energia/.test(label) ? 'text-resource-energia' : /^PE/.test(label) ? 'text-resource-pe' : ''
  return (
    <div className="flex justify-between">
      <span className="text-on-surface-variant">{label}</span>
      <span className={`font-mono ${highlight ? 'text-primary' : tone || 'text-on-surface'}`}>{value}</span>
    </div>
  )
}
