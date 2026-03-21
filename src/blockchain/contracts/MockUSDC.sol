// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice Mock ERC-20 token for testing on Fuji testnet.
 *         Anyone can mint tokens for testing purposes.
 *         6 decimals like real USDC.
 */
contract MockUSDC is ERC20 {

    constructor() ERC20("Mock USDC", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /**
     * @notice Mint tokens to any address (for testing only)
     * @param to Address to receive tokens
     * @param amount Amount in smallest unit (6 decimals)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @notice Mint tokens to the caller
     * @param amount Amount in smallest unit (6 decimals)
     */
    function faucet(uint256 amount) external {
        _mint(msg.sender, amount);
    }
}
