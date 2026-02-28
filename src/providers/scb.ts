import { Provider, ProviderResult } from '../lib/types'
import { SlipVerifyError } from '../lib/error'
import { slipVerify } from 'promptparse/validate'

export interface ScbProviderConfig {
  apiKey: string
  apiSecret: string
  env?: 'sandbox' | 'production'
}

export function scb(config: ScbProviderConfig): Provider {
  const { apiKey, apiSecret, env = 'production' } = config
  const baseUrl =
    env === 'sandbox'
      ? 'https://api-sandbox.partners.scb/partners/sandbox'
      : 'https://api.partners.scb/partners'

  let cachedToken: string | null = null
  let tokenExpiry: number = 0

  const getToken = async (): Promise<string | null> => {
    if (cachedToken && Date.now() < tokenExpiry) {
      return cachedToken
    }

    try {
      const requestUId = crypto.randomUUID()
      const response = await fetch(`${baseUrl}/v1/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept-language': 'EN',
          requestUId: requestUId,
          resourceOwnerId: apiKey,
        },
        body: JSON.stringify({
          applicationKey: apiKey,
          applicationSecret: apiSecret,
        }),
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await response.json()
      if (response.ok && data?.data?.accessToken) {
        cachedToken = data.data.accessToken
        const expiresIn = data.data.expiresIn || 1800
        tokenExpiry = Date.now() + (expiresIn - 60) * 1000
        return cachedToken
      }
      return null
    } catch {
      return null
    }
  }

  return {
    name: 'scb',
    inquiry: async (payload: string): Promise<ProviderResult> => {
      const slipData = slipVerify(payload)
      if (!slipData) {
        throw new SlipVerifyError({
          message: 'Invalid payload provided to SCB provider.',
          provider: 'scb',
        })
      }

      const transRef = slipData.transRef
      const sendingBank = slipData.sendingBank

      const token = await getToken()

      if (!token) {
        throw new SlipVerifyError({
          message:
            'Failed to authenticate with SCB (OAuth token retrieval failed).',
          provider: 'scb',
        })
      }

      const url = `${baseUrl}/v1/payment/billpayment/transactions/${transRef}?sendingBank=${sendingBank}`

      const requestUId = crypto.randomUUID()

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'accept-language': 'EN',
          authorization: `Bearer ${token}`,
          requestUId: requestUId,
          resourceOwnerId: apiKey,
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await response.json()

      if (!response.ok) {
        throw new SlipVerifyError({ provider: 'scb', response, body: data })
      }

      return {
        valid: data?.status?.code === 1000,
        data: data.data,
      }
    },
  }
}
