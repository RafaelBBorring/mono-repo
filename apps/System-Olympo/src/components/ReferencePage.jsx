import { ATTRIBUTES, ATTR_LABELS, ATTR_ICONS, MODIFIER_TABLE, getModifier, ATTR_CAPS, getAttrCap } from '../data/attributes'
import { CLASSES } from '../data/classes'
import { PROGRESSION } from '../data/progression'
import { TRIAGES } from '../data/triages'
import { PERICIAS, GRAU_NAMES, GRAUS_BY_TIER } from '../data/pericias'
import { ALL_MODULES, MODULES_PASSIVE, MODULES_SPECIAL, MODULES_ACTIVE } from '../data/modules'
import { WEAPONS, WEAPON_RANKS, WEAPON_ABILITY_COST } from '../data/weapons'
import { MARTIAL_ARTS, GRAU_LABELS as MA_GRAU_LABELS } from '../data/martialArts'
import { useState } from 'react'

const sections = [
  'Atributos', 'Classes', 'Progressão', 'Perícias',
  'Triagens', 'Módulos Passivos', 'Módulos Especiais', 'Módulos Ativos',
  'Armas', 'Ranks de Arma', 'Artes Marciais', 'Criação de Personagem',
]

export default function ReferencePage() {
  const [section, setSection] = useState('Atributos')

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="font-cinzel text-gold text-3xl mb-6 text-center">Referência do Sistema Olympo 2.0</h1>
      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        {sections.map(s => (
          <button key={s} onClick={() => setSection(s)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${section === s ? 'bg-gold text-void' : 'border border-sep text-txt-dim hover:border-gold hover:text-gold'}`}>
            {s}
          </button>
        ))}
      </div>
      <div className="bg-deep border border-sep rounded-lg p-6">
        {section === 'Atributos' && <AttributesSection />}
        {section === 'Classes' && <ClassesSection />}
        {section === 'Progressão' && <ProgressionSection />}
        {section === 'Perícias' && <PericiasSection />}
        {section === 'Triagens' && <TriagesSection />}
        {section === 'Módulos Passivos' && <ModulesSection items={MODULES_PASSIVE} title="Módulos Passivos" />}
        {section === 'Módulos Especiais' && <ModulesSection items={MODULES_SPECIAL} title="Módulos Especiais" special />}
        {section === 'Módulos Ativos' && <ModulesSection items={MODULES_ACTIVE} title="Módulos Ativos" active />}
        {section === 'Armas' && <WeaponsSection />}
        {section === 'Ranks de Arma' && <RanksSection />}
        {section === 'Artes Marciais' && <MartialArtsSection />}
        {section === 'Criação de Personagem' && <CreationGuideSection />}
      </div>
    </div>
  )
}

function SectionTitle({ children }) {
  return <h2 className="font-cinzel text-gold text-2xl mb-4">{children}</h2>
}

function AttributesSection() {
  return (
    <div>
      <SectionTitle>Atributos (Esqueleto)</SectionTitle>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
        {ATTRIBUTES.map(a => (
          <div key={a} className="bg-void rounded-lg p-3 text-center border border-sep">
            <div className="text-2xl">{ATTR_ICONS[a]}</div>
            <div className="text-gold font-cinzel text-sm mt-1">{a}</div>
            <div className="text-txt-dim text-xs">{ATTR_LABELS[a]}</div>
          </div>
        ))}
      </div>
      <h3 className="text-gold-light text-lg mb-2">Tabela de Modificadores</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sep text-txt-dim">
              <th className="py-2 px-3 text-left">Valor</th>
              <th className="py-2 px-3 text-left">Modificador</th>
            </tr>
          </thead>
          <tbody>
            {MODIFIER_TABLE.map((row, i) => (
              <tr key={i} className="border-b border-sep/50">
                <td className="py-1.5 px-3 font-mono text-txt-main">{row.min}–{row.max}</td>
                <td className="py-1.5 px-3 font-mono text-txt-main">{row.mod >= 0 ? '+' : ''}{row.mod}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-txt-dim text-sm mt-3">Fórmula: Math.floor((valor - 10) / 2), limitado pela tabela canônica acima.</p>

      <h3 className="text-gold-light text-lg mb-2 mt-6">Limites de Atributos por Faixa de Nível</h3>
      <p className="text-txt-dim text-sm mb-3">Após distribuir o Array + Pontos de Esqueleto, nenhum atributo pode exceder o limite da faixa.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sep text-txt-dim">
              <th className="py-2 px-3 text-left">Faixa de Nível</th>
              <th className="py-2 px-3 text-left">Limite Máx por Atributo</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(ATTR_CAPS).map(([tier, cap]) => (
              <tr key={tier} className="border-b border-sep/50">
                <td className="py-1.5 px-3 font-mono text-txt-main">N{tier}</td>
                <td className="py-1.5 px-3 font-mono text-gold">{cap}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ClassesSection() {
  return (
    <div>
      <SectionTitle>Classes</SectionTitle>
      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(CLASSES).map(([key, cls]) => (
          <div key={key} className="bg-void rounded-lg p-4 border border-sep">
            <h3 className="text-gold font-cinzel text-xl mb-1">{cls.name}</h3>
            <p className="text-txt-dim text-sm mb-3">{cls.desc}</p>
            <div className="space-y-1 text-sm">
              <div><span className="text-txt-dim">Vida Base:</span> <span className="text-txt-main font-mono">{key === 'GUERREIRO' ? '100+(CON×5)' : key === 'OPERATIVO' ? '70+(CON×5)' : '50+(CON×5)'}</span></div>
              <div><span className="text-txt-dim">Vida/Nível:</span> <span className="text-txt-main font-mono">{key === 'GUERREIRO' ? '8+Mod.CON' : key === 'OPERATIVO' ? '6+Mod.CON' : '4+Mod.CON'}</span></div>
              <div><span className="text-txt-dim">Energia Base:</span> <span className="text-txt-main font-mono">{key === 'GUERREIRO' ? '25+(AM×2)' : key === 'OPERATIVO' ? '35+(AM×2)' : '50+(AM×2)'}</span></div>
              <div><span className="text-txt-dim">Energia/Nível:</span> <span className="text-txt-main font-mono">{key === 'GUERREIRO' ? '2+Mod.AM' : key === 'OPERATIVO' ? '4+Mod.AM' : '6+Mod.AM'}</span></div>
              <div><span className="text-txt-dim">PE Base:</span> <span className="text-txt-main font-mono">{cls.peBase}</span> | <span className="text-txt-dim">PE/Nível:</span> <span className="text-txt-main font-mono">{cls.pePorNivel}</span></div>
              <div><span className="text-txt-dim">Dano Base:</span> <span className="text-txt-main font-mono">{cls.danoBase} + Mod.FOR</span></div>
              <div><span className="text-txt-dim">Perícias Iniciais:</span> <span className="text-txt-main font-mono">{cls.periciasIniciais}</span></div>
              <div><span className="text-txt-dim">Triagens:</span> <span className="text-gold font-mono">{cls.triages.join(', ')}</span></div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 bg-void rounded-lg p-4 border border-sep">
        <h3 className="text-gold-light text-lg mb-2">Combate Derivado</h3>
        <div className="space-y-1 text-sm">
          <div><span className="text-txt-dim">CA:</span> <span className="text-txt-main">10 + treinamento(Reflexo ou Bloqueio) + MAX(Mod.CON, Mod.DES)</span></div>
          <div><span className="text-txt-dim">Reações:</span> <span className="text-txt-main">Math.floor(DES / 5) [mínimo 1]</span></div>
          <div><span className="text-txt-dim">Percepção Passiva:</span> <span className="text-txt-main">d10 + treinamento_Percepção + Mod.INT</span></div>
        </div>
      </div>
    </div>
  )
}

function ProgressionSection() {
  const [cls, setCls] = useState('GUERREIRO')
  const prog = PROGRESSION[cls]

  return (
    <div>
      <SectionTitle>Progressão de Nível</SectionTitle>
      <div className="flex gap-2 mb-4">
        {Object.keys(CLASSES).map(c => (
          <button key={c} onClick={() => setCls(c)}
            className={`px-4 py-2 rounded font-cinzel text-sm transition-colors ${cls === c ? 'bg-gold text-void' : 'border border-gold text-gold hover:bg-gold hover:text-void'}`}>
            {CLASSES[c].name}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sep text-txt-dim">
              <th className="py-2 px-3 text-left w-16">Nível</th>
              <th className="py-2 px-3 text-left">Recompensa</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(prog).map(([lvl, entry]) => (
              <tr key={lvl} className="border-b border-sep/50 hover:bg-void/50">
                <td className="py-2 px-3 font-mono text-gold">{lvl}</td>
                <td className="py-2 px-3 text-txt-main">{entry.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PericiasSection() {
  return (
    <div>
      <SectionTitle>Perícias (19)</SectionTitle>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        {PERICIAS.map(p => (
          <div key={p.name} className="bg-void rounded px-3 py-2 border border-sep flex justify-between items-center">
            <span className="text-txt-main">{p.name}</span>
            <span className="text-txt-dim text-xs font-mono">{p.attrs.join('/')}</span>
          </div>
        ))}
      </div>
      <h3 className="text-gold-light text-lg mb-2">Graus de Treinamento por Faixa</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sep text-txt-dim">
              <th className="py-2 px-3 text-left">Faixa</th>
              <th className="py-2 px-3 text-left">Grau Máximo</th>
              <th className="py-2 px-3 text-left">Bônus</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(GRAUS_BY_TIER).map(([tier, info]) => (
              <tr key={tier} className="border-b border-sep/50">
                <td className="py-1.5 px-3 font-mono text-txt-main">N{tier}</td>
                <td className="py-1.5 px-3 text-gold">{info.nome}</td>
                <td className="py-1.5 px-3 font-mono text-txt-main">+{info.bonus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TriagesSection() {
  const [cls, setCls] = useState('GUERREIRO')
  const triages = TRIAGES[cls]

  return (
    <div>
      <SectionTitle>Triagens</SectionTitle>
      <div className="mb-4">
        <p className="text-txt-dim text-sm mb-3">
          <strong className="text-txt-main">Triagem Principal:</strong> obrigatoriamente da mesma Classe. 6 níveis (0.1→0.6).<br />
          <strong className="text-txt-main">Sub-Triagem:</strong> qualquer Classe (inclui a própria). Máx 3 níveis (0.1→0.3). Disponível a partir de N16.
        </p>
        <div className="flex gap-2">
          {Object.keys(TRIAGES).map(c => (
            <button key={c} onClick={() => setCls(c)}
              className={`px-4 py-2 rounded font-cinzel text-sm transition-colors ${cls === c ? 'bg-gold text-void' : 'border border-gold text-gold hover:bg-gold hover:text-void'}`}>
              {CLASSES[c].name}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(triages).map(([key, t]) => (
          <div key={key} className="bg-void rounded-lg p-4 border border-sep">
            <h3 className="text-gold font-cinzel text-lg mb-1">{t.name}</h3>
            <p className="text-txt-dim text-sm mb-3">{t.desc}</p>
            <div className="space-y-2">
              {Object.entries(t.levels).map(([lvl, desc]) => (
                <div key={lvl} className="flex gap-2 items-start">
                  <span className="shrink-0 w-12 h-8 rounded-full border-2 border-gold bg-deep flex items-center justify-center text-gold font-mono text-xs">{lvl}</span>
                  <span className="text-txt-main text-sm">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ModulesSection({ items, title, active, special }) {
  return (
    <div>
      <SectionTitle>{title}</SectionTitle>
      {active && <p className="text-txt-dim text-sm mb-3">Módulos Ativos custam PE para ativar.</p>}
      {special && <p className="text-txt-dim text-sm mb-3">Módulos Especiais podem ser adquiridos múltiplas vezes até o limite indicado.</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sep text-txt-dim">
              <th className="py-2 px-3 text-left">Nome</th>
              {active && <th className="py-2 px-3 text-left">PE</th>}
              <th className="py-2 px-3 text-left">Efeito</th>
              <th className="py-2 px-3 text-left">Requisito</th>
              {special && <th className="py-2 px-3 text-left">Máx</th>}
            </tr>
          </thead>
          <tbody>
            {items.map(m => (
              <tr key={m.id} className="border-b border-sep/50 hover:bg-void/50">
                <td className="py-2 px-3 text-gold font-medium">{m.name}</td>
                {active && <td className="py-2 px-3 font-mono text-txt-main">{m.pe}</td>}
                <td className="py-2 px-3 text-txt-main">{m.desc}</td>
                <td className="py-2 px-3 text-txt-dim text-xs">{m.req}</td>
                {special && <td className="py-2 px-3 font-mono text-txt-main">{m.maxBuy}×</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function WeaponsSection() {
  return (
    <div>
      <SectionTitle>Armas</SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sep text-txt-dim">
              <th className="py-2 px-3 text-left">Nome</th>
              <th className="py-2 px-3 text-left">Dano</th>
              <th className="py-2 px-3 text-left">Attr</th>
              <th className="py-2 px-3 text-left">Mecânica Única</th>
            </tr>
          </thead>
          <tbody>
            {WEAPONS.map(w => (
              <tr key={w.id} className="border-b border-sep/50 hover:bg-void/50">
                <td className="py-2 px-3 text-gold font-medium">{w.name}</td>
                <td className="py-2 px-3 font-mono text-txt-main">{w.dano}</td>
                <td className="py-2 px-3 text-txt-main">{w.attr}</td>
                <td className="py-2 px-3 text-txt-main text-xs">{w.mec}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RanksSection() {
  return (
    <div>
      <SectionTitle>Ranks de Arma</SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sep text-txt-dim">
              <th className="py-2 px-3 text-left">Rank</th>
              <th className="py-2 px-3 text-left">Dano Bônus</th>
              <th className="py-2 px-3 text-left">CA Bônus</th>
              <th className="py-2 px-3 text-left">Slots</th>
            </tr>
          </thead>
          <tbody>
            {WEAPON_RANKS.map(r => (
              <tr key={r.rank} className="border-b border-sep/50">
                <td className="py-2 px-3 text-gold font-medium">{r.rank}</td>
                <td className="py-2 px-3 font-mono text-txt-main">{r.danoBonus || '—'}</td>
                <td className="py-2 px-3 font-mono text-txt-main">+{r.caBonus}</td>
                <td className="py-2 px-3 font-mono text-txt-main">{r.slots}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-txt-dim text-sm mt-3">Custo de slot por tipo de habilidade: Fraca=1 | Média=2 | Forte=3</p>
    </div>
  )
}

function MartialArtsSection() {
  return (
    <div>
      <SectionTitle>Artes Marciais</SectionTitle>
      <p className="text-txt-dim text-sm mb-4">Usadas desarmado. Graus: Novato → Treinado → Formado → Especialista.</p>
      <div className="grid gap-4 md:grid-cols-2">
        {MARTIAL_ARTS.map(art => (
          <div key={art.id} className="bg-void rounded-lg p-4 border border-sep">
            <h3 className="text-gold font-cinzel text-lg mb-2">{art.name}</h3>
            <div className="space-y-2">
              {[0, 1, 2, 3].map(g => {
                const grau = art.graus[g]
                return (
                  <div key={g} className="flex gap-2 items-start">
                    <span className={`shrink-0 px-2 py-1 rounded text-xs font-semibold ${g === 0 ? 'bg-sep text-txt-dim' : g === 1 ? 'bg-gold/20 text-gold' : g === 2 ? 'bg-gold/30 text-gold-light' : 'bg-gold/50 text-gold-light'}`}>
                      {grau.nome}
                    </span>
                    <span className="text-txt-main text-sm">{grau.desc}</span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CreationGuideSection() {
  const steps = [
    { n: 1, title: 'Identidade', desc: 'Defina o nome, raça e nível do personagem. O Mestre define qual tipo de Array (Balanceado, MinMax ou Extremo) está disponível para a campanha.' },
    { n: 2, title: 'Esqueleto (Atributos)', desc: 'Distribua os 6 valores do Array escolhido entre os atributos FOR, DES, CON, INT, APA e AM. Cada valor só pode ser usado uma vez.' },
    { n: 3, title: 'Classe', desc: 'Escolha entre Guerreiro, Operativo ou Místico. Cada classe define Vida, Energia, PE, Dano Base e quantidade de perícias iniciais.' },
    { n: 4, title: 'Progressão', desc: 'Consulte a tabela de N1 até o nível atual da classe. Recompensas com "OU" exigem uma escolha do jogador. Anote triagens e módulos desbloqueados.' },
    { n: 5, title: 'Pontos de Esqueleto', desc: 'Distribua os Pontos de Esqueleto ganhos na progressão entre os atributos. Cada ponto em CON afeta retroativamente a Vida por Nível. O mesmo vale para AM (Energia).' },
    { n: 6, title: 'Perícias', desc: 'Treine perícias usando os pontos disponíveis (classe + progressão). Cada grau custa 1 ponto. O grau máximo depende do nível: N1-7 Treinado, N8-13 Veterano, N14-22 Especialista, N23-30 Mestre.' },
    { n: 7, title: 'Triagens', desc: 'Escolha UMA Triagem Principal (da mesma classe). A partir de N16, pode escolher UMA Sub-Triagem de qualquer classe (máx nível 0.3). Não pode repetir a mesma triagem.' },
    { n: 8, title: 'Módulos de Evolução', desc: 'Gaste os Módulos de Evolução ganhos na progressão. Existem Passivos (sempre ativos), Especiais (aquisição múltipla) e Ativos (custam PE). Verifique os requisitos.' },
    { n: 9, title: 'Arma e Arte Marcial', desc: 'Escolha uma arma (17 disponíveis, cada uma com mecânica única) e seu Rank (Comum a Mítico). Opcionalmente escolha uma Arte Marcial (Boxe, Karatê, Muay Thai, Judô, Taekwondo, Aikido).' },
    { n: 10, title: 'Habilidades', desc: 'Crie 5 habilidades: 1 Passiva, 3 Ativas e 1 Ultimate. Defina nome, descrição, custo de energia, dano, duração, camada SCP e PP estimado. Algumas triagens concedem habilidades extras.' },
    { n: 11, title: 'Revisão e Ficha Final', desc: 'Revise todos os dados, verifique os cálculos automáticos (Vida, Energia, PE, CA, Reações, Percepção Passiva) e finalize a ficha.' },
  ]

  return (
    <div>
      <SectionTitle>Guia de Criação de Personagem</SectionTitle>
      <p className="text-txt-dim text-sm mb-6">Passo a passo para criar um personagem do Sistema Olympo 2.0. Este guia também serve para criação manual.</p>
      <div className="space-y-4">
        {steps.map(s => (
          <div key={s.n} className="bg-void rounded-lg p-4 border border-sep">
            <div className="flex items-start gap-3">
              <span className="shrink-0 w-10 h-10 rounded-full bg-gold/20 border-2 border-gold flex items-center justify-center text-gold font-cinzel font-bold text-lg">{s.n}</span>
              <div>
                <h3 className="text-gold font-cinzel text-base mb-1">{s.title}</h3>
                <p className="text-txt-main text-sm">{s.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 bg-void rounded-lg p-4 border border-gold/30">
        <h3 className="text-gold font-cinzel text-base mb-2">Regras Importantes</h3>
        <ul className="space-y-1 text-sm text-txt-main list-disc list-inside">
          <li><strong className="text-gold-light">Retroatividade:</strong> Pontos de Esqueleto em CON/AM afetam todos os níveis retroativamente.</li>
          <li><strong className="text-gold-light">CA:</strong> 10 + treinamento(Reflexo ou Bloqueio) + MAX(Mod.CON, Mod.DES)</li>
          <li><strong className="text-gold-light">Reações:</strong> Math.floor(DES / 5), mínimo 1</li>
          <li><strong className="text-gold-light">Percepção Passiva:</strong> 10 + treino_Percepção + Mod.INT</li>
          <li><strong className="text-gold-light">Triagens:</strong> Principal = mesma classe, 6 níveis. Sub-Triagem = qualquer classe, máx 3 níveis (N16+).</li>
          <li><strong className="text-gold-light">Módulos Especiais:</strong> Treino Intensivo (até 3×), Aumento de Poder (até 2×), Conhecimento Amplificado (até 4×).</li>
        </ul>
      </div>
    </div>
  )
}
