import { Provider, ProviderResult } from '../lib/types'
import { SlipVerifyError } from '../lib/error'
import { slipVerify, trueMoneySlipVerify } from 'promptparse/validate'

export interface RdcwProviderConfig {
  clientId: string
  clientSecret: string
}

type RdcwSlipType = 'bank' | 'truemoney'

const ENDPOINTS: Record<RdcwSlipType, string> = {
  bank: 'https://suba.rdcw.co.th/v2/inquiry',
  truemoney: 'https://suba.rdcw.co.th/v2/truemoney',
}

/**
 * detect slip locally to avoid hammering the api
 */
function detectSlipType(payload: string): RdcwSlipType {
  if (slipVerify(payload)) return 'bank'
  if (trueMoneySlipVerify(payload)) return 'truemoney'

  throw new SlipVerifyError({
    message: 'Invalid payload provided to RDCW provider.',
    provider: 'rdcw',
  })
}

export function rdcw(config: RdcwProviderConfig): Provider {
  const { clientId, clientSecret } = config

  return {
    name: 'rdcw',
    inquiry: async (payload: string): Promise<ProviderResult> => {
      const type = detectSlipType(payload)

      const credentials = btoa(`${clientId}:${clientSecret}`)

      const response = await fetch(ENDPOINTS[type], {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${credentials}`,
        },
        body: JSON.stringify(
          type === 'truemoney' ? { qr: payload } : { payload },
        ),
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await response.json()

      if (!response.ok) {
        throw new SlipVerifyError({ provider: 'rdcw', response, body: data })
      }

      return {
        // truemoney endpoint returns code 0 as valid
        valid: type === 'truemoney' ? data?.code === 0 : data?.valid === true,
        data: data?.data ?? data,
      }
    },
  }
}
