import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

function ModalWithControlledInput() {
  const [value, setValue] = useState('')
  return (
    <Modal open onClose={() => undefined} title="Conectar fonte">
      <label>
        Nome do board
        <input value={value} onChange={(event) => setValue(event.target.value)} />
      </label>
    </Modal>
  )
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Modal', () => {
  it('preserva o foco enquanto um campo controlado atualiza o conteúdo', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback()
      return 1
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
    const user = userEvent.setup()

    render(<ModalWithControlledInput />)
    const input = screen.getByRole('textbox', { name: 'Nome do board' })
    await user.click(input)
    await user.type(input, 'Linha do Tempo')

    expect(input).toHaveValue('Linha do Tempo')
    expect(input).toHaveFocus()
  })

  it('mantém a navegação por Tab dentro do diálogo', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback()
      return 1
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
    const user = userEvent.setup()

    render(
      <Modal open onClose={() => undefined} title="Conectar fonte">
        <input aria-label="Nome do board" />
        <button type="button">Autorizar</button>
      </Modal>,
    )

    const close = screen.getByRole('button', { name: 'Fechar' })
    const authorize = screen.getByRole('button', { name: 'Autorizar' })
    authorize.focus()
    await user.tab()
    expect(close).toHaveFocus()
    await user.tab({ shift: true })
    expect(authorize).toHaveFocus()
  })

  it('usa o callback de fechamento mais recente sem reiniciar o modal', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback()
      return 1
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
    const firstClose = vi.fn()
    const latestClose = vi.fn()
    const { rerender } = render(<Modal open onClose={firstClose} title="Conectar fonte">Conteúdo</Modal>)

    rerender(<Modal open onClose={latestClose} title="Conectar fonte">Conteúdo</Modal>)
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(firstClose).not.toHaveBeenCalled()
    expect(latestClose).toHaveBeenCalledOnce()
  })
})
