import { describe, expect, it } from 'vitest'
import { findReferencedMiroBoard, getMiroBoardId, getMiroBoardUrlState } from './integrationUrls'

describe('getMiroBoardUrlState', () => {
  it.each([
    ['', 'empty'],
    ['miro.com/app/board/uXjVJty8azM=', 'incomplete'],
    ['https://example.com/app/board/uXjVJty8azM=', 'invalid'],
    ['https://miro.com:444/app/board/uXjVJty8azM=', 'invalid'],
    ['https://MIRO.com/APP/BOARD/uXjVJty8azM=', 'invalid'],
    ['https://miro.com/app/dashboard/', 'invalid'],
    ['https://miro.com/app/board/', 'incomplete'],
    ['https://www.miro.com/app/board/uXjVJty8azM=/', 'valid'],
    ['https://miro.com/app/board/uXjVJty8azM=/?share_link_id=527057938223', 'valid'],
  ])('classifica %s como %s', (value, expectedStatus) => {
    expect(getMiroBoardUrlState(value).status).toBe(expectedStatus)
  })

  it('extrai o id e prioriza o link ao localizar um board', () => {
    const url = 'https://miro.com/app/board/uXjVJty8azM=/?share_link_id=527057938223'
    const boards = [
      { id: 'outro', name: 'Linha do Tempo' },
      { id: 'uXjVJty8azM=', name: 'Outro nome' },
    ]

    expect(getMiroBoardId(url)).toBe('uXjVJty8azM=')
    expect(findReferencedMiroBoard(boards, { name: 'Linha do Tempo', boardUrl: url })).toEqual(boards[1])
  })

  it('usa o nome sem diferenciar caixa ou acento quando não há link', () => {
    const boards = [{ id: 'board-1', name: 'Campanha Primordiais' }]
    expect(findReferencedMiroBoard(boards, { name: 'campanha primordiáis' })).toEqual(boards[0])
  })
})
