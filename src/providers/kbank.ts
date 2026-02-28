import { Provider, ProviderResult } from '../lib/types'
import { SlipVerifyError } from '../lib/error'
import { slipVerify } from 'promptparse/validate'

export interface KbankProviderConfig {
  clientId: string
  clientSecret: string
  env?: 'sandbox' | 'production'
}

export function kbank(config: KbankProviderConfig): Provider {
  const { clientId, clientSecret, env = 'production' } = config
  const baseUrl =
    env === 'sandbox'
      ? 'https://openapi-sandbox.kasikornbank.com'
      : 'https://openapi.kasikornbank.com'

  let cachedToken: string | null = null
  let tokenExpiry: number = 0

  const getToken = async (): Promise<string | null> => {
    if (cachedToken && Date.now() < tokenExpiry) {
      return cachedToken
    }

    try {
      const credentials = btoa(`${clientId}:${clientSecret}`)
      const response = await fetch(`${baseUrl}/v2/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${credentials}`,
        },
        body: new URLSearchParams({ grant_type: 'client_credentials' }),
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await response.json()
      if (response.ok && data.access_token) {
        cachedToken = data.access_token
        const expiresIn = data.expires_in || 3600
        tokenExpiry = Date.now() + (expiresIn - 60) * 1000
        return cachedToken
      }
      return null
    } catch {
      return null
    }
  }

  return {
    name: 'kbank',
    inquiry: async (payload: string): Promise<ProviderResult> => {
      const slipData = slipVerify(payload)
      if (!slipData) {
        throw new SlipVerifyError({
          message: 'Invalid payload provided to KBANK provider.',
          provider: 'kbank',
        })
      }

      const transRef = slipData.transRef
      const sendingBank = slipData.sendingBank

      const token = await getToken()

      if (!token) {
        throw new SlipVerifyError({
          message:
            'Failed to authenticate with KBANK (OAuth token retrieval failed).',
          provider: 'kbank',
        })
      }

      const rqUID = crypto.randomUUID()
      const rqDt = new Date().toISOString()

      const requestData = {
        rqUID,
        rqDt,
        data: {
          sendingBank,
          transRef,
        },
      }

      const response = await fetch(`${baseUrl}/v1/verslip/kbank/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestData),
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await response.json()

      if (!response.ok) {
        throw new SlipVerifyError({ provider: 'kbank', response, body: data })
      }

      return {
        valid: data.statusCode === '0000',
        data: data.data || data,
      }
    },
  }
}
