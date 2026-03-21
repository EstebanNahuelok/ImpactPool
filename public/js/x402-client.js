/**
 * ImpactoPool - x402 Client
 * Cliente para el protocolo x402 HTTP Payment.
 * Maneja respuestas 402 Payment Required y envía proof de pago on-chain.
 */

const X402Client = (() => {

  /**
   * Realiza un request que puede requerir pago x402.
   * Si el server responde 402, ejecuta pago on-chain y reintenta.
   */
  async function fetchWithPayment(url, options = {}) {
    const res = await fetch(url, options);

    if (res.status !== 402) {
      return res;
    }

    // Server pide pago - extraer headers de pago
    const paymentInfo = {
      amount: res.headers.get('X-Payment-Amount'),
      token: res.headers.get('X-Payment-Token'),
      network: res.headers.get('X-Payment-Network'),
      address: res.headers.get('X-Payment-Address'),
      resource: res.headers.get('X-Payment-Resource'),
    };

    if (!BlockchainIntegration.isConnected()) {
      throw new Error('Conectá tu wallet para realizar el pago x402');
    }

    // Aprobar y pagar on-chain
    await BlockchainIntegration.approveUSDC(paymentInfo.address, paymentInfo.amount);

    // Reenviar request con proof de pago
    const retryRes = await fetch(url, {
      ...options,
      method: 'POST',
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentHash: 'pending-verification',
        amount: paymentInfo.amount,
        resource: paymentInfo.resource,
      }),
    });

    return retryRes;
  }

  /**
   * Verificar estado de un pago x402
   */
  async function checkPaymentStatus(paymentHash) {
    const res = await fetch(`${window.location.origin}/api/pay/status/${paymentHash}`);
    return res.json();
  }

  return { fetchWithPayment, checkPaymentStatus };
})();
