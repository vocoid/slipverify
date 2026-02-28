import { Provider, ProviderResult } from '../lib/types'
import { SlipVerifyError } from '../lib/error'

export interface RdcwProviderConfig {
  clientId: string
  clientSecret: string
}

export function rdcw(config: RdcwProviderConfig): Provider {
  const { clientId, clientSecret } = config

  return {
    name: 'rdcw',
    inquiry: async (payload: string): Promise<ProviderResult> => {
      const credentials = btoa(`${clientId}:${clientSecret}`)

      const response = await fetch('https://suba.rdcw.co.th/v2/inquiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${credentials}`,
        },
        body: JSON.stringify({ payload }),
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await response.json()

      if (!response.ok) {
        throw new SlipVerifyError({ provider: 'rdcw', response, body: data })
      }

      return {
        valid: data.valid,
        data: data.data || data,
      }
    },
  }
}
