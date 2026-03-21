/**
 * ImpactoPool - x402 Client
 * Official Coinbase x402 HTTP Payment Protocol client.
 *
 * Flow:
 *   1. Client makes normal request to x402-protected endpoint
 *   2. Server responds 402 with PAYMENT-REQUIRED header (base64 JSON)
 *   3. Client parses payment requirements, signs via wallet (permit2)
 *   4. Client retries request with PAYMENT-SIGNATURE header (base64 JSON)
 *   5. Server verifies + settles via facilitator, returns 200
 *
 * Headers used:
 *   - PAYMENT-REQUIRED: base64-encoded payment requirements from server
 *   - PAYMENT-SIGNATURE: base64-encoded signed payment payload from client
 *   - PAYMENT-RESPONSE: base64-encoded settlement receipt from server
 */

const X402Client = (() => {

  /**
   * Make a request to an x402-protected endpoint.
   * Automatically handles the 402 → pay → retry flow.
   */
  async function fetchWithPayment(url, options = {}) {
    // Step 1: Initial request
    const res = await fetch(url, options);

    if (res.status !== 402) {
      return res;
    }

    // Step 2: Parse the PAYMENT-REQUIRED header
    const paymentRequiredHeader = res.headers.get('payment-required');
    if (!paymentRequiredHeader) {
      throw new Error('Server returned 402 but no PAYMENT-REQUIRED header found');
    }

    let paymentRequired;
    try {
      paymentRequired = JSON.parse(atob(paymentRequiredHeader));
    } catch {
      throw new Error('Failed to parse PAYMENT-REQUIRED header');
    }

    // Step 3: Ensure wallet is connected
    if (!BlockchainIntegration.isConnected()) {
      throw new Error('Conectá tu wallet para realizar el pago x402');
    }

    // Step 4: Sign the payment using the connected wallet
    const paymentSignature = await signX402Payment(paymentRequired);

    // Step 5: Retry request with PAYMENT-SIGNATURE header
    const retryRes = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'payment-signature': btoa(JSON.stringify(paymentSignature)),
      },
    });

    return retryRes;
  }

  /**
   * Sign an x402 payment using the connected wallet.
   * The middleware expects a permit2-compatible signature for EVM chains.
   */
  async function signX402Payment(paymentRequired) {
    if (!window.ethereum) {
      throw new Error('No wallet found');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    // Build the payment payload per x402 protocol
    const payload = {
      x402Version: 1,
      scheme: paymentRequired.scheme || 'exact',
      network: paymentRequired.network,
      payload: {
        signature: '',
        authorization: {
          from: address,
          to: paymentRequired.payTo,
          value: paymentRequired.maxAmountRequired || '0',
          validAfter: '0',
          validBefore: Math.floor(Date.now() / 1000 + 3600).toString(),
          nonce: ethers.hexlify(ethers.randomBytes(32)),
        },
      },
    };

    // Sign using EIP-712 typed data for permit2
    const domain = {
      name: 'x402',
      version: '1',
      chainId: parseInt(paymentRequired.network?.split(':')[1] || '43113'),
    };

    const types = {
      Payment: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'string' },
        { name: 'validBefore', type: 'string' },
        { name: 'nonce', type: 'bytes32' },
      ],
    };

    const message = payload.payload.authorization;

    try {
      const signature = await signer.signTypedData(domain, types, message);
      payload.payload.signature = signature;
    } catch (err) {
      throw new Error('Payment signature rejected: ' + err.message);
    }

    return payload;
  }

  /**
   * Get info about x402-protected endpoints
   */
  async function getX402Info() {
    const res = await fetch(`${window.location.origin}/api/x402/info`);
    return res.json();
  }

  return { fetchWithPayment, getX402Info };
})();

