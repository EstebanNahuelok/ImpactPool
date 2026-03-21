const { ethers } = require('ethers');
const x402Config = require('../../config/x402.config');
const blockchainConfig = require('../../config/blockchain.config');

const X402_HANDLER_ABI = [
  'function processPayment(address payer, uint256 amount, bytes calldata payload) external returns (bool)',
  'function verifyPayment(bytes32 paymentHash) view returns (bool)',
  'event PaymentProcessed(address indexed payer, uint256 amount, bytes32 paymentHash)',
];

class X402PaymentService {
  constructor() {
    this.provider = null;
    this.signer = null;
  }

  _getProvider() {
    if (!this.provider) {
      this.provider = new ethers.JsonRpcProvider(blockchainConfig.rpcUrl);
    }
    return this.provider;
  }

  _getSigner() {
    if (!this.signer) {
      const provider = this._getProvider();
      this.signer = new ethers.Wallet(blockchainConfig.deployerPrivateKey, provider);
    }
    return this.signer;
  }

  /**
   * Genera un header x402 de pago requerido
   * Protocolo: el servidor responde 402 con info de pago,
   * el cliente paga on-chain y reintenta con proof
   */
  generatePaymentRequired(amount, resource) {
    return {
      'X-Payment-Required': 'true',
      'X-Payment-Amount': amount.toString(),
      'X-Payment-Token': x402Config.paymentToken,
      'X-Payment-Network': x402Config.network,
      'X-Payment-Address': blockchainConfig.contracts.x402Handler,
      'X-Payment-Resource': resource,
    };
  }

  /**
   * Verifica que un pago x402 fue realizado on-chain
   */
  async verifyPayment(paymentHash) {
    const signer = this._getSigner();
    const handler = new ethers.Contract(
      blockchainConfig.contracts.x402Handler,
      X402_HANDLER_ABI,
      signer
    );
    return handler.verifyPayment(paymentHash);
  }

  /**
   * Procesa un pago x402 on-chain
   */
  async processPayment(payerAddress, amount, payload) {
    const signer = this._getSigner();
    const handler = new ethers.Contract(
      blockchainConfig.contracts.x402Handler,
      X402_HANDLER_ABI,
      signer
    );

    const amountWei = ethers.parseUnits(amount.toString(), 6);
    const tx = await handler.processPayment(payerAddress, amountWei, payload);
    const receipt = await tx.wait();
    return receipt.hash;
  }
}

module.exports = new X402PaymentService();
