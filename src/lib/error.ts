export class SlipVerifyError extends Error {
  public provider: string
  public response?: {
    status: number
    headers: Record<string, string>
    body: unknown
  }

  constructor({
    provider,
    message,
    response,
    body,
  }: {
    provider: string
    message?: string
    response?: Response
    body?: unknown
  }) {
    const headers: Record<string, string> = {}
    response?.headers.forEach((value, key) => {
      headers[key] = value
    })

    super(
      message ||
        (response
          ? `${provider} API error (HTTP ${response.status})`
          : 'Unknown error'),
    )
    this.name = 'SlipVerifyError'
    this.provider = provider

    if (response) {
      this.response = {
        status: response.status,
        headers,
        body,
      }
    }
  }
}
