import { Provider, ProviderResult } from '../lib/types'
import { SlipVerifyError } from '../lib/error'

export interface EasySlipProviderConfig {
  accessToken: string
}

export function easyslip(config: EasySlipProviderConfig): Provider {
  const { accessToken } = config

  return {
    name: 'easyslip',
    inquiry: async (payload: string): Promise<ProviderResult> => {
      const url = `https://developer.easyslip.com/api/v1/verify?payload=${encodeURIComponent(payload)}`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await response.json()

      if (!response.ok) {
        if (data?.message === 'slip_not_found') {
          return {
            valid: false,
            data: data,
          }
        }
        throw new SlipVerifyError({
          provider: 'easyslip',
          response,
          body: data,
        })
      }

      return {
        valid: data?.status === 200,
        data: data.data,
      }
    },
  }
}
