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
      const response = await fetch('https://api.easyslip.com/v2/verify/bank', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
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
        throw new SlipVerifyError({
          provider: 'easyslip',
          response,
          body: data,
        })
      }

      return {
        valid: data?.success === true,
        data: data.data,
      }
    },
  }
}
