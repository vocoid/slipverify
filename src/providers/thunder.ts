import { Provider, ProviderResult } from '../lib/types'
import { SlipVerifyError } from '../lib/error'

export interface ThunderProviderConfig {
  apiKey: string
}

export function thunder(config: ThunderProviderConfig): Provider {
  const { apiKey } = config

  return {
    name: 'thunder',
    inquiry: async (payload: string): Promise<ProviderResult> => {
      const response = await fetch('https://api.thunder.in.th/v2/verify/bank', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ payload }),
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await response.json()

      if (!response.ok) {
        if (data?.error?.code === 'SLIP_NOT_FOUND') {
          return {
            valid: false,
            data: data.error,
          }
        }
        throw new SlipVerifyError({ provider: 'thunder', response, body: data })
      }

      return {
        valid: data?.success === true,
        data: data.data,
      }
    },
  }
}
