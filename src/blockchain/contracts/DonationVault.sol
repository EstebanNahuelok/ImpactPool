// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DonationVault
 * @notice Guarda el 30% de cada donación en blockchain para inversión.
 *         Genera rewards: 5% de las ganancias vuelven al donador original.
 */
contract DonationVault is Ownable, ReentrancyGuard {
    IERC20 public usdc;

    uint256 public constant REWARD_BPS = 500; // 5%
    uint256 public constant BPS_DENOMINATOR = 10000;

    uint256 public totalDeposited;

    struct DepositInfo {
        address donor;
        address association;
        uint256 amount;
        uint256 timestamp;
    }

    uint256 public depositCount;
    mapping(uint256 => DepositInfo) public deposits;
    mapping(address => uint256) public donorBalances;

    event Deposited(address indexed donor, address indexed association, uint256 amount);
    event RewardDistributed(address indexed donor, uint256 amount);
    event FundsWithdrawn(address indexed to, uint256 amount);

    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
    }

    /**
     * @notice Registra un depósito. Los fondos llegan via transferFrom en ImpactoPool.
     *         Este contrato recibe USDC directamente.
     */
    function deposit(address _donor, address _association, uint256 _amount) external {
        require(_amount > 0, "Amount must be > 0");

        depositCount++;
        deposits[depositCount] = DepositInfo({
            donor: _donor,
            association: _association,
            amount: _amount,
            timestamp: block.timestamp
        });

        donorBalances[_donor] += _amount;
        totalDeposited += _amount;

        emit Deposited(_donor, _association, _amount);
    }

    /**
     * @notice Distribuir rewards al donador (5% de ganancias generadas).
     *         Solo el owner (plataforma) puede ejecutar distribuciones.
     */
    function distributeReward(address _donor, uint256 _gainAmount) external onlyOwner nonReentrant {
        uint256 reward = (_gainAmount * REWARD_BPS) / BPS_DENOMINATOR;
        require(usdc.balanceOf(address(this)) >= reward, "Insufficient balance for reward");
        require(usdc.transfer(_donor, reward), "Reward transfer failed");

        emit RewardDistributed(_donor, reward);
    }

    function getBalance(address _donor) external view returns (uint256) {
        return donorBalances[_donor];
    }

    function getTotalDeposited() external view returns (uint256) {
        return totalDeposited;
    }
}
