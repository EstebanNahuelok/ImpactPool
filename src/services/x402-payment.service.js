/**
 * x402 Payment Service
 *
 * With the official Coinbase x402 protocol, payment handling is done
 * automatically by the paymentMiddleware in server.js.
 *
 * This service provides helper utilities for x402-related operations
 * that aren't covered by the middleware (e.g., checking facilitator status).
 *
 * Protocol flow (handled by middleware):
 *   1. Client sends request to x402-protected endpoint
 *   2. Server responds 402 with PAYMENT-REQUIRED header (base64)
 *   3. Client signs payment via wallet (permit2)
 *   4. Client retries with PAYMENT-SIGNATURE header (base64)
 *   5. Facilitator verifies + settles on-chain
 *   6. Server returns 200 with data
 */
const x402Config = require('../../config/x402.config');

class X402PaymentService {
  /**
   * Get the x402 configuration for the current environment
   */
  getConfig() {
    return {
      facilitatorUrl: x402Config.facilitatorUrl,
      network: x402Config.network,
      scheme: x402Config.scheme,
      payTo: x402Config.payTo,
    };
  }

  /**
   * Get the list of x402-protected endpoints and their prices
   */
  getProtectedEndpoints() {
    return [
      {
        method: 'GET',
        path: '/api/premium-data',
        price: x402Config.price,
        description: 'Platform statistics',
      },
      {
        method: 'GET',
        path: '/api/donations/transparency',
        price: x402Config.price,
        description: 'Donation transparency data',
      },
    ];
  }
}

module.exports = new X402PaymentService();
