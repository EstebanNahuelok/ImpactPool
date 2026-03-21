const express = require('express');
const router = express.Router();
const x402PaymentService = require('../services/x402-payment.service');
const authMiddleware = require('../middleware/auth.middleware');

// POST /api/pay - Procesar pago x402
// Flujo: cliente envía pago on-chain, luego POST con proof para acceder al recurso
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { paymentHash, amount, resource } = req.body;

    if (!paymentHash) {
      // No hay proof de pago → responder 402 Payment Required
      const requiredAmount = amount || '1.00';
      const headers = x402PaymentService.generatePaymentRequired(
        requiredAmount,
        resource || '/api/pay'
      );

      return res.status(402).set(headers).json({
        error: 'Payment Required',
        message: 'Pago on-chain requerido para acceder a este recurso',
        payment: headers,
      });
    }

    // Verificar pago on-chain
    const verified = await x402PaymentService.verifyPayment(paymentHash);
    if (!verified) {
      return res.status(402).json({ error: 'Pago no verificado on-chain' });
    }

    res.json({
      success: true,
      message: 'Pago verificado exitosamente',
      paymentHash,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/pay/status/:hash - Verificar estado de un pago
router.get('/status/:hash', async (req, res) => {
  try {
    const verified = await x402PaymentService.verifyPayment(req.params.hash);
    res.json({ paymentHash: req.params.hash, verified });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
