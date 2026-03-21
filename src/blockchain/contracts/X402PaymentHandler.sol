// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title X402PaymentHandler
 * @notice Maneja pagos bajo el protocolo x402 HTTP Payment.
 *         Permite cobrar por API calls on-chain: el servidor responde 402,
 *         el cliente paga en USDC y reintenta con proof del pago.
 */
contract X402PaymentHandler is Ownable, ReentrancyGuard {
    IERC20 public usdc;

    struct Payment {
        address payer;
        uint256 amount;
        uint256 timestamp;
        bool verified;
    }

    mapping(bytes32 => Payment) public payments;

    event PaymentProcessed(address indexed payer, uint256 amount, bytes32 paymentHash);
    event PaymentVerified(bytes32 indexed paymentHash);

    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
    }

    /**
     * @notice Procesa un pago x402. El payer debe haber aprobado este contrato.
     * @param _amount Monto en USDC (6 decimales)
     * @param _payload Datos arbitrarios del recurso solicitado
     */
    function processPayment(address _payer, uint256 _amount, bytes calldata _payload) 
        external nonReentrant returns (bool) 
    {
        require(_amount > 0, "Amount must be > 0");
        require(usdc.transferFrom(_payer, address(this), _amount), "Payment transfer failed");

        bytes32 paymentHash = keccak256(abi.encodePacked(_payer, _amount, block.timestamp, _payload));

        payments[paymentHash] = Payment({
            payer: _payer,
            amount: _amount,
            timestamp: block.timestamp,
            verified: true
        });

        emit PaymentProcessed(_payer, _amount, paymentHash);
        return true;
    }

    /**
     * @notice Verifica si un pago fue realizado
     */
    function verifyPayment(bytes32 _paymentHash) external view returns (bool) {
        return payments[_paymentHash].verified;
    }

    /**
     * @notice Owner retira fondos acumulados por pagos x402
     */
    function withdraw(address _to, uint256 _amount) external onlyOwner nonReentrant {
        require(usdc.transfer(_to, _amount), "Withdraw failed");
    }
}
