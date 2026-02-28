import { Provider, ProviderResult } from '../lib/types'
import { SlipVerifyError } from '../lib/error'
import { trueMoneySlipVerify } from 'promptparse/validate'

export interface TrueMoneyProviderConfig {
  accessToken: string
}

export function truemoney(config: TrueMoneyProviderConfig): Provider {
  return {
    name: 'truemoney',
    inquiry: async (payload: string): Promise<ProviderResult> => {
      const isValidTrueMoney = trueMoneySlipVerify(payload)

      if (!isValidTrueMoney) {
        throw new SlipVerifyError({
          message: 'Invalid TrueMoney payload provided.',
          provider: 'truemoney',
        })
      }

      const response = await fetch(
        'https://apis.truemoneyservices.com/utils/v1/trans-qr-info',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.accessToken}`,
          },
          body: JSON.stringify({ qr_value: payload }),
        },
      )

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await response.json()

      if (!response.ok) {
        if (data?.message === 'Transaction not found') {
          return {
            valid: false,
            data,
          }
        }

        throw new SlipVerifyError({
          provider: 'truemoney',
          response,
          body: data,
        })
      }

      return {
        valid: true,
        data: data.data,
      }
    },
  }
}
