/**
 * x402 Payment Protocol Configuration
 * Uses Coinbase's official x402 implementation.
 * Facilitator handles verify/settle on-chain via permit2.
 */
const x402Config = {
  facilitatorUrl: process.env.X402_FACILITATOR_URL || 'https://facilitator.x402.org',
  network: 'eip155:43113', // Avalanche Fuji C-Chain (EIP-155 format)
  scheme: 'exact',
  payTo: process.env.DEPLOYER_ADDRESS || process.env.X402_PAY_TO_ADDRESS,
  price: '$0.01', // Default micro-payment for x402-protected endpoints
};

module.exports = x402Config;
