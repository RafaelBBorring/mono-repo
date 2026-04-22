import { CLASSES } from '../../data/classes'
import { calcVidaTotal, calcEnergiaTotal, calcPeTotal, calcDanoBase } from '../../utils/calculator'
import { getModifier } from '../../data/attributes'

export default function Step3Class({ char, update }) {
  const sk = char.skeletonPoints || {}
  const totalAttr = (a) => (char.atributos[a] || 0) + (sk[a] || 0)

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
      vida: calcVidaTotal(cls, char.nivel, char.atributos, sk, char.choices),
      energia: calcEnergiaTotal(cls, char.nivel, char.atributos, sk, char.choices),
      pe: calcPeTotal(cls, char.nivel, char.choices),
      dano: calcDanoBase(cls, char.atributos, sk),
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="font-cinzel text-gold text-xl">Etapa 3 — Classe</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.keys(CLASSES).map((cls) => {
          const def = CLASSES[cls]
          const base = getBaseStats(cls)
          const isSelected = char.classe === cls

          return (
            <button
              key={cls}
              onClick={() => update({ classe: cls })}
              className={`bg-deep border rounded-lg p-5 text-left transition-all ${
                isSelected
                  ? 'border-gold shadow-[0_0_15px_rgba(201,168,76,0.3)]'
                  : 'border-sep hover:border-gold'
              }`}
            >
              <h3 className="font-cinzel text-gold text-lg mb-1">{def.name}</h3>
              <p className="text-txt-dim text-sm mb-4">{def.desc}</p>

              <div className="space-y-2 text-sm">
                <StatLine label="Vida Base" value={base.vidaBase} />
                <StatLine label="Energia Base" value={base.energiaBase} />
                <StatLine label="PE Base" value={base.peBase} />
                <StatLine label="Dano Base" value={base.danoBase} />
                <StatLine label="Perícias Iniciais" value={base.periciasIniciais} />
                <div className="border-t border-sep pt-2 mt-2">
                  <p className="text-txt-dim text-xs">Por nível:</p>
                  <StatLine label="Vida/Nv" value={`+${base.vidaPorNivel}`} />
                  <StatLine label="Energia/Nv" value={`+${base.energiaPorNivel}`} />
                  <StatLine label="PE/Nv" value={`+${base.pePorNivel}`} />
                </div>
              </div>

              {isSelected && (
                <div className="border-t border-gold mt-4 pt-3 space-y-1">
                  <p className="text-gold text-xs font-semibold mb-2">Projetado Nv. {char.nivel}</p>
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
            </button>
          )
        })}
      </div>
    </div>
  )
}

function StatLine({ label, value, highlight }) {
  return (
    <div className="flex justify-between">
      <span className="text-txt-dim">{label}</span>
      <span className={`font-mono ${highlight ? 'text-gold' : 'text-txt-main'}`}>{value}</span>
    </div>
  )
}
