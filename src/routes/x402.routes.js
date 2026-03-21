const express = require('express');
const router = express.Router();
const x402PaymentService = require('../services/x402-payment.service');

/**
 * x402 Info Routes
 *
 * The actual 402 payment flow is handled by paymentMiddleware in server.js.
 * These routes provide metadata about x402-protected endpoints.
 */

// GET /api/x402/info — List x402-protected endpoints and their prices
router.get('/info', (req, res) => {
  const config = x402PaymentService.getConfig();
  const endpoints = x402PaymentService.getProtectedEndpoints();

  res.json({
    protocol: 'x402',
    facilitator: config.facilitatorUrl,
    network: config.network,
    scheme: config.scheme,
    protectedEndpoints: endpoints,
  });
});

module.exports = router;
