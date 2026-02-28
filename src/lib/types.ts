export interface ProviderResult {
  valid: boolean
  data?: unknown
}

export interface SlipInfo extends ProviderResult {
  provider: string
}

export interface Provider {
  name: string
  inquiry: (payload: string) => Promise<ProviderResult>
}
