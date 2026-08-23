import { describe, expect, it } from 'vitest'
import { answerDemoQuestion } from './demoOracle'

describe('demoOracle', () => {
  it('separa fatos sobre Silas da inferência visual', () => {
    const answer = answerDemoQuestion('Quem é o feiticeiro Silas?')
    expect(answer.content).toContain('não foi registrado')
    expect(answer.content).toContain('inferência')
    expect(answer.citations.some((citation) => citation.confidence === 'inferência visual')).toBe(true)
  })

  it('não preenche regras genéricas de fantasia quando não há fonte', () => {
    const answer = answerDemoQuestion('Como se mata um vampiro?')
    expect(answer.content).toContain('Não encontrei informação suficiente')
    expect(answer.content.toLocaleLowerCase('pt-BR')).not.toContain('estaca')
    expect(answer.followUp).toBeTruthy()
  })

  it('mantém a cena do cemitério como lacuna', () => {
    const answer = answerDemoQuestion('Resuma o último episódio de Nova Orleans')
    expect(answer.content).toContain('Não encontrei registro do objetivo')
    expect(answer.followUp).toContain('Cemitério Lafayette')
  })

  it('cria um arco editável sem incorporar sugestões ao cânone', () => {
    const answer = answerDemoQuestion('Me ajude a estruturar os próximos 3 episódios em Nova Orleans', 'create')
    expect(answer.presentation.type).toBe('story-plan')
    expect(answer.presentation.episodes).toHaveLength(3)
    expect(answer.content).toContain('sem transformar as sugestões em cânone')
    expect(answer.presentation.episodes[0].gap).toContain('não foi registrado')
  })

  it('respeita o modo cânone mesmo quando a pergunta pede próximos episódios', () => {
    const answer = answerDemoQuestion('Quais são os próximos 3 episódios?', 'canon')
    expect(answer.presentation.type).not.toBe('story-plan')
    expect(answer.answerState).not.toBe('creative')
  })

  it('encontra pontas soltas no modo investigar', () => {
    const answer = answerDemoQuestion('Quais mistérios e conflitos ainda estão em aberto?', 'investigate')
    expect(answer.content).toContain('três pontos')
    expect(answer.presentation.title).toBe('Pontas soltas')
  })
})
