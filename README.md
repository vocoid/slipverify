# Slip Verify SDK

One SDK for verifying bank slip QR payloads in Thailand.

## Features

- **Unified Interface**: Use a single `inquiry` function with various providers.
- **Payload Validation**: Uses `promptparse` internally to ensure payloads are structurally valid before hitting the provider APIs.
- **Flexible & Extensible**: Easily switch between providers, or implement your own.
- **TypeScript Support**: Fully typed out of the box.

## Requirements

- **Node.js** >= 18 (uses native `fetch`)
- **Bun** >= 1.0

> This SDK is designed for **server-side use only**. It handles sensitive credentials and should not be used in client-side environments.

## Installation

```bash
npm install slipverify
```

## Supported Providers

### Bank Slip QR

**Bank Providers:**

- `scb`: SCB Slip Verification API. Requires `apiKey`, `apiSecret` and optionally `env` ('sandbox' or 'production').
- `kbank`: KBANK Slip Verification API. Requires `clientId`, `clientSecret` and optionally `env` ('sandbox' or 'production').

**3rd Party Providers:**

- `rdcw`: RDCW Slip Verification API. Requires `clientId` and `clientSecret`.
- `slipok`: SlipOK Slip Verification API. Requires `branchId` and `apiKey`.
- `thunder`: Thunder Slip Verification API. Requires `apiKey`.
- `easyslip`: EasySlip Slip Verification API. Requires `accessToken`.

### Non-Bank Slip QR

- `truemoney`: TrueMoney Wallet Slip QR. Requires `accessToken`.

## License

This project is MIT licensed (see [LICENSE.md](LICENSE.md)).
