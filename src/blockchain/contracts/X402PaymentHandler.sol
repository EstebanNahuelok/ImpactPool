// DEPRECATED — x402 payment handling is now done via the official Coinbase x402 protocol
// (paymentMiddleware in server.js) instead of a custom on-chain contract.
// The official x402 facilitator handles verify/settle on-chain via permit2.
// This file is kept empty to avoid compilation issues with any remaining references.
// See: server.js (paymentMiddleware), config/x402.config.js
