import { ARRAYS } from '../../data/attributes'
import AvatarCropper from '../AvatarCropper'

export default function Step1Identity({ char, update }) {
  const availableTypes = Object.keys(ARRAYS)
  const currentArray = ARRAYS[char.arrayTipo] || ARRAYS.Balanceado

  return (
    <div className="space-y-6">
      <h2 className="font-cinzel text-gold text-xl">Etapa 1 — Identidade</h2>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="shrink-0">
          <label className="block text-txt-dim text-sm mb-2 text-center">Avatar do Personagem</label>
          <AvatarCropper value={char.avatar} onChange={(v) => update({ avatar: v })} />
        </div>

        <div className="flex-1 bg-deep border border-sep rounded-lg p-5 space-y-4 hover:border-gold transition-colors">
          <div>
            <label className="block text-txt-dim text-sm mb-1">Nome do Personagem *</label>
            <input type="text" value={char.nome} onChange={(e) => update({ nome: e.target.value })}
              placeholder="Insira o nome..." className="w-full bg-void border border-sep text-txt-main focus:border-gold rounded px-3 py-2 outline-none transition-colors" />
          </div>
          {char.raca && (
            <div>
              <label className="block text-txt-dim text-sm mb-1">Raça</label>
              <div className="bg-void border border-gold/30 text-gold rounded px-3 py-2 text-sm">
                {char.raca} {char.racaTipo ? `(${char.racaTipo})` : ''}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-deep border border-sep rounded-lg p-5 space-y-4 hover:border-gold transition-colors">
        <label className="block text-txt-dim text-sm">Nível da Campanha</label>
        <div className="flex items-center gap-4">
          <input type="range" min={1} max={30} value={char.nivel} onChange={(e) => update({ nivel: Number(e.target.value) })} className="flex-1 accent-gold" />
          <input type="number" min={1} max={30} value={char.nivel} onChange={(e) => update({ nivel: Math.min(30, Math.max(1, Number(e.target.value) || 1)) })}
            className="w-16 bg-void border border-sep text-txt-main focus:border-gold rounded px-3 py-2 outline-none text-center font-mono transition-colors" />
        </div>
        <p className="text-txt-dim text-xs">Faixa: {char.nivel <= 7 ? '1-7 (Iniciante)' : char.nivel <= 13 ? '8-13 (Intermediário)' : char.nivel <= 22 ? '14-22 (Veterano)' : '23-30 (Lendário)'}</p>
      </div>

      <div className="bg-deep border border-sep rounded-lg p-5 space-y-4 hover:border-gold transition-colors">
        <div>
          <label className="block text-txt-dim text-sm mb-1">Tipo de Array <span className="text-txt-dim/50">(definido pelo Mestre)</span></label>
          <div className="flex gap-3 flex-wrap">
            {availableTypes.map((tipo) => (
              <button key={tipo} onClick={() => update({ arrayTipo: tipo })}
                className={`px-4 py-2 rounded font-semibold transition-colors text-sm ${char.arrayTipo === tipo ? 'bg-gold text-void' : 'border border-gold text-gold hover:bg-gold hover:text-void'}`}>
                {tipo}
              </button>
            ))}
          </div>
        </div>
        {currentArray.length > 0 && (
          <div>
            <span className="text-txt-dim text-sm">Valores para distribuir:</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {currentArray.map((val, i) => (
                <span key={i} className="bg-void border border-sep text-gold font-mono px-3 py-1 rounded-full text-sm">{val}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
