const { ethers } = require('ethers');
const blockchainConfig = require('../../config/blockchain.config');

// ABIs mínimos para interacción con contratos
const IMPACTO_POOL_ABI = [
  'function donate(address association, uint256 amount) external',
  'function getDonation(uint256 id) view returns (address donor, address association, uint256 total, uint256 associationAmount, uint256 vaultAmount)',
  'event DonationMade(uint256 indexed id, address indexed donor, address indexed association, uint256 amount)',
];

const DONATION_VAULT_ABI = [
  'function deposit(address donor, address association, uint256 amount) external',
  'function getBalance(address donor) view returns (uint256)',
  'event Deposited(address indexed donor, address indexed association, uint256 amount)',
];

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
];

class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contracts = {};
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

  _getContract(name, address, abi) {
    if (!this.contracts[name]) {
      const signer = this._getSigner();
      this.contracts[name] = new ethers.Contract(address, abi, signer);
    }
    return this.contracts[name];
  }

  /**
   * Transfiere el 70% a la wallet de la asociación
   */
  async transferToAssociation(associationWallet, amount) {
    const signer = this._getSigner();
    const usdc = new ethers.Contract(blockchainConfig.usdcToken, ERC20_ABI, signer);

    const amountWei = ethers.parseUnits(amount.toString(), 6); // USDC = 6 decimales
    const tx = await usdc.transfer(associationWallet, amountWei);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  /**
   * Deposita el 30% en el DonationVault
   */
  async depositToVault(donorId, associationId, amount) {
    const vault = this._getContract(
      'vault',
      blockchainConfig.contracts.donationVault,
      DONATION_VAULT_ABI
    );

    const amountWei = ethers.parseUnits(amount.toString(), 6);
    const tx = await vault.deposit(donorId, associationId, amountWei);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  /**
   * Consulta balance del vault para un donador
   */
  async getVaultBalance(donorAddress) {
    const vault = this._getContract(
      'vault',
      blockchainConfig.contracts.donationVault,
      DONATION_VAULT_ABI
    );
    const balance = await vault.getBalance(donorAddress);
    return ethers.formatUnits(balance, 6);
  }

  /**
   * Verifica conexión con la red Avalanche
   */
  async checkConnection() {
    const provider = this._getProvider();
    const network = await provider.getNetwork();
    return {
      chainId: network.chainId.toString(),
      name: network.name,
    };
  }
}

module.exports = new BlockchainService();
