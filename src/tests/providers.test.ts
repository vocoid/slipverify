import { describe, it, expect, vi, beforeEach } from 'vitest'
import { rdcw } from '../providers/rdcw'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch as unknown as typeof fetch

vi.mock('promptparse/validate', () => ({
  slipVerify: vi.fn((payload: string) => {
    if (payload === 'VALID_MOCK_PAYLOAD') {
      return { transRef: 'mockTransRef123', sendingBank: '014' }
    }
    if (payload === 'VALID_MOCK_PAYLOAD_KBANK') {
      return { transRef: 'mockTransRefKBANK', sendingBank: '004' }
    }
    return null
  }),
  trueMoneySlipVerify: vi.fn((payload: string) => {
    return payload.startsWith('0049000201') // Simple mock logic for valid TrueMoney prefix
  }),
}))

beforeEach(() => {
  mockFetch.mockClear()
  vi.clearAllMocks()
})

import { truemoney } from '../providers/truemoney'

describe('truemoney provider', () => {
  it('calls TrueMoney API correctly and processes success response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          status: 'ok',
          data: { amount: '20025', message: 'ค่าอาหาร' },
        }),
    })

    const provider = truemoney({ accessToken: 'fake_tm_token' })
    const result = await provider.inquiry('0049000201...')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://apis.truemoneyservices.com/utils/v1/trans-qr-info',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer fake_tm_token',
        },
        body: JSON.stringify({ qr_value: '0049000201...' }),
      },
    )

    expect(result.valid).toBe(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result.data as any).amount).toBe('20025')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result.data as any).message).toBe('ค่าอาหาร')
  })

  it('returns valid: true when API responds with 200 OK', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          status: 'ok',
          data: { amount: '100' },
        }),
    })

    const provider = truemoney({ accessToken: 'fake_tm_token' })
    const result = await provider.inquiry('0049000201...')

    expect(result.valid).toBe(true)
  })

  it('throws on HTTP error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: new Headers(),
      json: () =>
        Promise.resolve({
          err: 'Invalid qr_value format',
        }),
    })

    const provider = truemoney({ accessToken: 'fake_tm_token' })

    await expect(provider.inquiry('0049000201...')).rejects.toThrow(
      'truemoney API error (HTTP 400)',
    )
  })

  it('rejects invalid TrueMoney payload format before fetching API', async () => {
    const provider = truemoney({ accessToken: 'fake_tm_token' })

    await expect(provider.inquiry('invalid_payload')).rejects.toThrow(
      'Invalid TrueMoney payload provided.',
    )
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('throws on rate limit error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: new Headers(),
      json: () => Promise.resolve({}),
    })

    const provider = truemoney({ accessToken: 'fake_tm_token' })

    await expect(provider.inquiry('0049000201_limited_hit')).rejects.toThrow(
      'truemoney API error (HTTP 429)',
    )
  })
})

describe('rdcw provider', () => {
  it('calls RDCW API correctly with Basic Auth', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ valid: true, data: { sender: 'John' } }),
    })

    const provider = rdcw({ clientId: 'id', clientSecret: 'sec' })
    const result = await provider.inquiry('123456')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://suba.rdcw.co.th/v2/inquiry',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic aWQ6c2Vj', // base64(id:sec)
        },
        body: JSON.stringify({ payload: '123456' }),
      },
    )

    expect(result.valid).toBe(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result.data as any).sender).toBe('John')
  })

  it('throws on RDCW error responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: new Headers(),
      json: () => Promise.resolve({ code: 1004, message: 'Invalid payload' }),
    })

    const provider = rdcw({ clientId: 'id', clientSecret: 'sec' })

    await expect(provider.inquiry('invalid')).rejects.toThrow(
      'rdcw API error (HTTP 400)',
    )
  })
})

import { scb } from '../providers/scb'

describe('scb provider', () => {
  it('rejects invalid payload', async () => {
    const provider = scb({ apiKey: 'key', apiSecret: 'sec', env: 'sandbox' })

    await expect(provider.inquiry('000201010211...')).rejects.toThrow(
      'Invalid payload provided to SCB provider.',
    )
  })

  it('calls SCB sandbox API correctly with parsed transRef and sendingBank', async () => {
    const validPayload = 'VALID_MOCK_PAYLOAD'

    // Mock token response from SCB
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          status: { code: 1000, description: 'Success' },
          data: { accessToken: 'scb_fake_token', expiresIn: 1800 },
        }),
    })

    // Mock verify response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          status: { code: 1000, description: 'Success' },
          data: { transRef: '201904227kAylzNUdnJ1z0w', amount: '500' },
        }),
    })

    const provider = scb({
      apiKey: 'key123',
      apiSecret: 'sec456',
      env: 'sandbox',
    })
    const result = await provider.inquiry(validPayload)

    // First call should be token
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      'https://api-sandbox.partners.scb/partners/sandbox/v1/oauth/token',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          resourceOwnerId: 'key123',
        }),
      }),
    )

    // Second call should be verslip
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      'https://api-sandbox.partners.scb/partners/sandbox/v1/payment/billpayment/transactions/mockTransRef123?sendingBank=014',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          authorization: 'Bearer scb_fake_token',
          resourceOwnerId: 'key123',
          'accept-language': 'EN',
        }),
      }),
    )

    expect(result.valid).toBe(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result.data as any).amount).toBe('500')
  })
})

import { kbank } from '../providers/kbank'

describe('kbank provider', () => {
  it('rejects invalid payload', async () => {
    const provider = kbank({
      clientId: 'id',
      clientSecret: 'sec',
      env: 'sandbox',
    })

    await expect(provider.inquiry('000201010211...')).rejects.toThrow(
      'Invalid payload provided to KBANK provider.',
    )
  })

  it('fetches OAuth token and calls KBANK verslip verify API correctly', async () => {
    const validPayload = 'VALID_MOCK_PAYLOAD_KBANK'

    // Mock token response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ access_token: 'fake_token', expires_in: 3600 }),
    })

    // Mock verify response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          statusCode: '0000',
          data: { transRef: 'refkbank123', amount: '100' },
        }),
    })

    const provider = kbank({
      clientId: 'client123',
      clientSecret: 'secret456',
      env: 'sandbox',
    })
    const result = await provider.inquiry(validPayload)

    // First call should be token
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      'https://openapi-sandbox.kasikornbank.com/v2/oauth/token',
      expect.objectContaining({ method: 'POST' }),
    )

    // Second call should be verslip
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      'https://openapi-sandbox.kasikornbank.com/v1/verslip/kbank/verify',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer fake_token',
        }),
      }),
    )

    expect(result.valid).toBe(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result.data as any).amount).toBe('100')
  })
})

import { slipok } from '../providers/slipok'

describe('slipok provider', () => {
  it('calls SlipOK API correctly and processes success response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            success: true,
            message: '✅',
            transRef: '010092101507665143',
            amount: 50,
            sender: { displayName: 'นาย กสิกร ร' },
            receiver: { displayName: 'ธนาทร ร' },
          },
        }),
    })

    const provider = slipok({ branchId: 'branch1', apiKey: 'key123' })
    const result = await provider.inquiry('qr_payload_data')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.slipok.com/api/line/apikey/branch1',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-authorization': 'key123',
        },
        body: JSON.stringify({ data: 'qr_payload_data' }),
      },
    )

    expect(result.valid).toBe(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result.data as any).amount).toBe(50)
  })

  it('throws on HTTP error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: new Headers(),
      json: () => Promise.resolve({ success: false, message: 'Unauthorized' }),
    })

    const provider = slipok({ branchId: 'branch1', apiKey: 'bad_key' })

    await expect(provider.inquiry('qr_payload')).rejects.toThrow(
      'slipok API error (HTTP 401)',
    )
  })
})

import { thunder } from '../providers/thunder'

describe('thunder provider', () => {
  it('calls Thunder API correctly and processes success response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            isDuplicate: false,
            rawSlip: {
              transRef: '68370160657749I376388B35',
              amount: { amount: 1500 },
              sender: { bank: { short: 'KBANK' } },
              receiver: { bank: { short: 'SCB' } },
            },
          },
          message: 'Bank slip verified successfully',
        }),
    })

    const provider = thunder({ apiKey: 'thunder_key' })
    const result = await provider.inquiry('qr_payload_data')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.thunder.in.th/v2/verify/bank',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer thunder_key',
        },
        body: JSON.stringify({ payload: 'qr_payload_data' }),
      },
    )

    expect(result.valid).toBe(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result.data as any).rawSlip.transRef).toBe(
      '68370160657749I376388B35',
    )
  })

  it('throws on HTTP error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: new Headers(),
      json: () => Promise.resolve({ success: false, message: 'Unauthorized' }),
    })

    const provider = thunder({ apiKey: 'bad_key' })

    await expect(provider.inquiry('qr_payload')).rejects.toThrow(
      'thunder API error (HTTP 401)',
    )
  })

  it('returns valid false for SLIP_NOT_FOUND (404)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: new Headers(),
      json: () =>
        Promise.resolve({
          success: false,
          error: {
            code: 'SLIP_NOT_FOUND',
            message: 'The slip could not be found or is invalid',
          },
        }),
    })

    const provider = thunder({ apiKey: 'thunder_key' })
    const result = await provider.inquiry('qr_payload')

    expect(result.valid).toBe(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result.data as any).code).toBe('SLIP_NOT_FOUND')
  })
})

import { easyslip } from '../providers/easyslip'

describe('easyslip provider', () => {
  it('calls EasySlip v2 API correctly and processes success response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          success: true,
          data: {
            isDuplicate: false,
            rawSlip: {
              transRef: '68370160657749I376388B35',
              amount: { amount: 1000 },
            },
          },
          message: 'Bank slip verified successfully',
        }),
    })

    const provider = easyslip({ accessToken: 'easy_key' })
    const result = await provider.inquiry('qr_payload_data')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.easyslip.com/v2/verify/bank',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer easy_key',
        },
        body: JSON.stringify({ payload: 'qr_payload_data' }),
      },
    )

    expect(result.valid).toBe(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result.data as any).rawSlip.transRef).toBe(
      '68370160657749I376388B35',
    )
  })

  it('returns valid false for SLIP_NOT_FOUND (404)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: new Headers(),
      json: () =>
        Promise.resolve({
          success: false,
          error: {
            code: 'SLIP_NOT_FOUND',
            message: 'The slip could not be found or is invalid',
          },
        }),
    })

    const provider = easyslip({ accessToken: 'easy_key' })
    const result = await provider.inquiry('qr_payload')

    expect(result.valid).toBe(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((result.data as any).code).toBe('SLIP_NOT_FOUND')
  })

  it('throws on HTTP error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: new Headers(),
      json: () =>
        Promise.resolve({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Unauthorized' },
        }),
    })

    const provider = easyslip({ accessToken: 'bad_key' })

    await expect(provider.inquiry('qr_payload')).rejects.toThrow(
      'easyslip API error (HTTP 401)',
    )
  })
})
