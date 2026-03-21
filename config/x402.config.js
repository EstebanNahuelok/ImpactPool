const x402Config = {
  facilitatorUrl: process.env.X402_FACILITATOR_URL,
  paymentToken: process.env.X402_PAYMENT_TOKEN || 'USDC',
  network: process.env.X402_NETWORK || 'avalanche-fuji',
  usdcAddress: process.env.USDC_TOKEN_ADDRESS,
};

module.exports = x402Config;
