import { useEffect, useState } from 'react'
import { ArrowRight, Check, MessageSquareText, Settings2, Sparkles, TreePine, X } from 'lucide-react'

const steps = [
  {
    icon: Sparkles,
    title: 'Bem-vindo ao Maestro',
    copy: 'Vamos transformar seu material disperso em um universo vivo, pesquisável e conectado.',
    cta: 'Começar tour',
  },
  {
    icon: MessageSquareText,
    title: 'Converse com o universo',
    copy: 'Consulte fatos, investigue lacunas ou crie novas possibilidades sem misturar proposta com cânone.',
    cta: 'Continuar',
  },
  {
    icon: TreePine,
    title: 'Explore a Árvore da Vida',
    copy: 'Passe por um nó para uma prévia e clique quando quiser abrir relações, fontes e detalhes.',
    cta: 'Continuar',
  },
  {
    icon: Settings2,
    title: 'Configure sem complicação',
    copy: 'Veja seu plano e conecte o Miro. Notion, Obsidian e Drive aparecem claramente como próximos vínculos.',
    cta: 'Vamos lá',
  },
]

export function OnboardingTutorial({ open, onClose, onComplete }) {
  const [index, setIndex] = useState(0)
  useEffect(() => { if (open) setIndex(0) }, [open])
  if (!open) return null
  const step = steps[index]
  const isLast = index === steps.length - 1
  const next = () => {
    if (isLast) {
      onComplete?.()
      onClose()
    } else setIndex((current) => current + 1)
  }
  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <button className="onboarding-skip" type="button" onClick={onClose}><X size={14} /> Pular tour</button>
        <span className="onboarding-icon"><step.icon size={26} /></span>
        <h2 id="onboarding-title">{step.title}</h2>
        <p>{step.copy}</p>
        <div className="onboarding-progress">
          {steps.map((_, i) => <i key={i} className={i === index ? 'active' : i < index ? 'done' : ''}>{i < index ? <Check size={9} /> : null}</i>)}
        </div>
        <button className="button button--primary button--full" type="button" onClick={next}>
          {isLast ? 'Explorar workspace' : step.cta} <ArrowRight size={15} />
        </button>
      </div>
    </div>
  )
}
