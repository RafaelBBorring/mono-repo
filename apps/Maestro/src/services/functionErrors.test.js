import { describe, expect, it } from 'vitest'
import { functionErrorMessage } from './functionErrors'

describe('functionErrorMessage', () => {
  it('usa a mensagem estruturada retornada pela Edge Function', async () => {
    const error = {
      message: 'Edge Function returned a non-2xx status code',
      context: new Response(JSON.stringify({ error: 'Integração do Miro ainda não configurada.' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }),
    }

    await expect(functionErrorMessage(error)).resolves.toBe('Integração do Miro ainda não configurada.')
  })

  it('preserva a mensagem original quando não há resposta JSON', async () => {
    await expect(functionErrorMessage({ message: 'Falha de rede' })).resolves.toBe('Falha de rede')
  })
})
