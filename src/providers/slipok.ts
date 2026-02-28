import { Provider, ProviderResult } from '../lib/types'
import { SlipVerifyError } from '../lib/error'

export interface SlipOkProviderConfig {
  branchId: string
  apiKey: string
}

export function slipok(config: SlipOkProviderConfig): Provider {
  const { branchId, apiKey } = config

  return {
    name: 'slipok',
    inquiry: async (payload: string): Promise<ProviderResult> => {
      const response = await fetch(
        `https://api.slipok.com/api/line/apikey/${branchId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-authorization': apiKey,
          },
          body: JSON.stringify({ data: payload }),
        },
      )

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await response.json()

      if (!response.ok) {
        throw new SlipVerifyError({ provider: 'slipok', response, body: data })
      }

      return {
        valid: data?.data?.success === true,
        data: data.data,
      }
    },
  }
}
