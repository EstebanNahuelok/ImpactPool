// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ImpactoPool
 * @notice Contrato principal: recibe donaciones USDC y hace el split 70/30
 *   - 70% → asociación (inmediato)
 *   - 30% → DonationVault (inversión blockchain)
 */
contract ImpactoPool is Ownable, ReentrancyGuard {
    IERC20 public usdc;
    address public vault;

    uint256 public constant ASSOCIATION_BPS = 7000; // 70%
    uint256 public constant VAULT_BPS = 3000;       // 30%
    uint256 public constant BPS_DENOMINATOR = 10000;

    uint256 public donationCount;

    struct Donation {
        address donor;
        address association;
        uint256 totalAmount;
        uint256 associationAmount;
        uint256 vaultAmount;
        uint256 timestamp;
    }

    mapping(uint256 => Donation) public donations;
    mapping(address => bool) public verifiedAssociations;

    event DonationMade(
        uint256 indexed id,
        address indexed donor,
        address indexed association,
        uint256 totalAmount,
        uint256 associationAmount,
        uint256 vaultAmount
    );
    event AssociationVerified(address indexed association);
    event AssociationRemoved(address indexed association);

    constructor(address _usdc, address _vault) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        vault = _vault;
    }

    /**
     * @notice Donar USDC a una asociación verificada.
     *         El donador debe haber aprobado este contrato para gastar USDC.
     */
    function donate(address _association, uint256 _amount) external nonReentrant {
        require(_amount > 0, "Amount must be > 0");
        require(verifiedAssociations[_association], "Association not verified");

        uint256 associationAmount = (_amount * ASSOCIATION_BPS) / BPS_DENOMINATOR;
        uint256 vaultAmount = _amount - associationAmount;

        // Transferir desde el donador
        require(usdc.transferFrom(msg.sender, _association, associationAmount), "Transfer to association failed");
        require(usdc.transferFrom(msg.sender, vault, vaultAmount), "Transfer to vault failed");

        donationCount++;
        donations[donationCount] = Donation({
            donor: msg.sender,
            association: _association,
            totalAmount: _amount,
            associationAmount: associationAmount,
            vaultAmount: vaultAmount,
            timestamp: block.timestamp
        });

        emit DonationMade(donationCount, msg.sender, _association, _amount, associationAmount, vaultAmount);
    }

    function verifyAssociation(address _association) external onlyOwner {
        verifiedAssociations[_association] = true;
        emit AssociationVerified(_association);
    }

    function removeAssociation(address _association) external onlyOwner {
        verifiedAssociations[_association] = false;
        emit AssociationRemoved(_association);
    }

    function getDonation(uint256 _id) external view returns (
        address donor,
        address association,
        uint256 totalAmount,
        uint256 associationAmount,
        uint256 vaultAmount
    ) {
        Donation memory d = donations[_id];
        return (d.donor, d.association, d.totalAmount, d.associationAmount, d.vaultAmount);
    }
}
