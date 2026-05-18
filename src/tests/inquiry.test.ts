import { describe, it, expect, vi } from 'vitest'
import { inquiry } from '../lib/inquiry'
import { Provider } from '../lib/types'

describe('isValidPayload and inquiry', () => {
  const mockProvider: Provider = {
    name: 'mock',
    inquiry: vi.fn().mockResolvedValue({ valid: true, data: { amount: 100 } }),
  }

  it('rejects short / falsy payloads without calling provider', async () => {
    await expect(
      inquiry({ provider: mockProvider, payload: '' }),
    ).rejects.toThrow()
    expect(mockProvider.inquiry).not.toHaveBeenCalled()
  })

  it('calls provider for seemingly valid generic length payloads', async () => {
    const result = await inquiry({
      provider: mockProvider,
      payload: 'some_ref_id_true_money',
    })
    expect(mockProvider.inquiry).toHaveBeenCalledWith('some_ref_id_true_money')
    expect(result.valid).toBe(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result.data as any).amount).toBe(100)
    expect(result.provider).toBe('mock')
  })

  it('calls provider for actual QR payload strings', async () => {
    const promptPayPayload =
      '00020101021129370016A000000677010111011300668900000005802TH53037646304FC7D'
    const result = await inquiry({
      provider: mockProvider,
      payload: promptPayPayload,
    })
    expect(mockProvider.inquiry).toHaveBeenCalledWith(promptPayPayload)
    expect(result.valid).toBe(true)
  })
})
