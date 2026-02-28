import { Provider, SlipInfo } from './types'
import { SlipVerifyError } from './error'

export interface InquiryOptions {
  provider: Provider
  payload: string
}

export async function inquiry(options: InquiryOptions): Promise<SlipInfo> {
  const { provider, payload } = options

  if (!payload) {
    throw new SlipVerifyError({
      message: 'Payload is required.',
      provider: provider.name,
    })
  }

  const result = await provider.inquiry(payload)
  return {
    ...result,
    provider: provider.name,
  }
}
