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

const AGENT_REGISTRY_ABI = [
  'function register(string calldata agentURI) external returns (uint256)',
  'function setAgentURI(uint256 agentId, string calldata newURI) external',
  'function getMetadata(uint256 agentId, string memory key) view returns (bytes)',
  'function setMetadata(uint256 agentId, string memory key, bytes memory value) external',
  'function getAgentWallet(uint256 agentId) view returns (address)',
  'function setAgentWallet(uint256 agentId, address newWallet) external',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function totalAgents() view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'event Registered(uint256 indexed agentId, string agentURI, address indexed owner)',
];

const REPUTATION_REGISTRY_ABI = [
  'function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash) external',
  'function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external',
  'function getSummary(uint256 agentId, address[] clientAddresses, string tag1, string tag2) view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)',
  'function readFeedback(uint256 agentId, address clientAddress, uint64 feedbackIndex) view returns (int128 value, uint8 valueDecimals, string tag1, string tag2, bool isRevoked)',
  'function getClients(uint256 agentId) view returns (address[])',
  'event NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, int128 value, uint8 valueDecimals, string indexed indexedTag1, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)',
];

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
];

const VOUCHER_TOKEN_ABI = [
  'function mintVoucher(address to, string calldata code, address association, uint256 amount, string calldata tokenURI_) external returns (uint256)',
  'function burnVoucher(uint256 tokenId) external',
  'function getVoucher(uint256 tokenId) view returns (string code, address association, uint256 amount, uint64 issuedAt, bool burned)',
  'function getTokenByCode(string calldata code) view returns (uint256)',
  'function totalVouchers() view returns (uint256)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'event VoucherMinted(uint256 indexed tokenId, string code, address indexed association, uint256 amount)',
  'event VoucherBurned(uint256 indexed tokenId, string code, address indexed burnedBy)',
];

class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contracts = {};
    this.MAX_RETRIES = 3;
    this.RETRY_DELAY_MS = 2000;
  }

  /**
   * Retry helper: ejecuta fn hasta MAX_RETRIES veces con delay exponencial
   */
  async _withRetry(fn, label = 'blockchain call') {
    let lastError;
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        console.warn(`[${label}] intento ${attempt}/${this.MAX_RETRIES} falló: ${error.message}`);
        if (attempt < this.MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, this.RETRY_DELAY_MS * attempt));
          // Reset provider/signer en caso de fallo de conexión
          this.provider = null;
          this.signer = null;
          this.contracts = {};
        }
      }
    }
    throw lastError;
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

  // ================================
  // Donation Operations
  // ================================

  /**
   * Transfiere el 70% a la wallet de la asociación (con retry)
   */
  async transferToAssociation(associationWallet, amount) {
    return this._withRetry(async () => {
      const signer = this._getSigner();
      const usdc = new ethers.Contract(blockchainConfig.usdcToken, ERC20_ABI, signer);

      const amountWei = ethers.parseUnits(amount.toString(), 6);
      const tx = await usdc.transfer(associationWallet, amountWei);
      const receipt = await tx.wait();
      return receipt.hash;
    }, 'transferToAssociation');
  }

  /**
   * Deposita el 30% en el DonationVault (con retry)
   * @param donorWallet Wallet address of the donor
   * @param associationWallet Wallet address of the association
   * @param amount Amount in USDC (human readable)
   */
  async depositToVault(donorWallet, associationWallet, amount) {
    return this._withRetry(async () => {
      const vault = this._getContract(
        'vault',
        blockchainConfig.contracts.donationVault,
        DONATION_VAULT_ABI
      );

      const amountWei = ethers.parseUnits(amount.toString(), 6);
      const tx = await vault.deposit(donorWallet, associationWallet, amountWei);
      const receipt = await tx.wait();
      return receipt.hash;
    }, 'depositToVault');
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

  // ================================
  // ERC-8004: Agent Registry
  // ================================

  /**
   * Register a new agent in the AgentRegistry (mints an NFT)
   */
  async registerAgent(agentURI) {
    const registry = this._getContract(
      'agentRegistry',
      blockchainConfig.contracts.agentRegistry,
      AGENT_REGISTRY_ABI
    );
    const tx = await registry.register(agentURI);
    const receipt = await tx.wait();

    // Parse the Registered event to get the agentId
    const iface = new ethers.Interface(AGENT_REGISTRY_ABI);
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed && parsed.name === 'Registered') {
          return {
            txHash: receipt.hash,
            agentId: parsed.args.agentId.toString(),
            agentURI: parsed.args.agentURI,
          };
        }
      } catch {
        // skip non-matching logs
      }
    }
    return { txHash: receipt.hash };
  }

  /**
   * Get agent URI (the JSON registration file URL)
   */
  async getAgentURI(agentId) {
    const registry = this._getContract(
      'agentRegistry',
      blockchainConfig.contracts.agentRegistry,
      AGENT_REGISTRY_ABI
    );
    return registry.tokenURI(agentId);
  }

  /**
   * Get total number of registered agents
   */
  async getTotalAgents() {
    const registry = this._getContract(
      'agentRegistry',
      blockchainConfig.contracts.agentRegistry,
      AGENT_REGISTRY_ABI
    );
    const total = await registry.totalAgents();
    return total.toString();
  }

  // ================================
  // ERC-8004: Reputation Registry
  // ================================

  /**
   * Give feedback to an agent
   */
  async giveFeedback(agentId, value, tag1 = '', tag2 = '') {
    const reputation = this._getContract(
      'reputationRegistry',
      blockchainConfig.contracts.reputationRegistry,
      REPUTATION_REGISTRY_ABI
    );
    const tx = await reputation.giveFeedback(
      agentId,
      value,
      0,       // valueDecimals
      tag1,
      tag2,
      '',      // endpoint
      '',      // feedbackURI
      ethers.ZeroHash // feedbackHash
    );
    const receipt = await tx.wait();
    return receipt.hash;
  }

  /**
   * Get reputation summary for an agent
   */
  async getReputationSummary(agentId, tag1 = '', tag2 = '') {
    const reputation = this._getContract(
      'reputationRegistry',
      blockchainConfig.contracts.reputationRegistry,
      REPUTATION_REGISTRY_ABI
    );
    const [count, summaryValue, summaryValueDecimals] = await reputation.getSummary(
      agentId,
      [], // all clients
      tag1,
      tag2
    );
    return {
      count: count.toString(),
      summaryValue: summaryValue.toString(),
      summaryValueDecimals: summaryValueDecimals.toString(),
    };
  }

  // ================================
  // Network
  // ================================

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

  // ================================
  // Voucher Token Operations
  // ================================

  /**
   * Mint a new VoucherToken NFT on-chain
   * @param {string} code Off-chain voucher code (e.g., IP-1234-AB)
   * @param {string} associationWallet Wallet of the issuing association
   * @param {number} amount Voucher value in USDC (human readable)
   * @returns {{ txHash: string, tokenId: string }}
   */
  async mintVoucherToken(code, associationWallet, amount) {
    return this._withRetry(async () => {
      const voucherToken = this._getContract(
        'voucherToken',
        blockchainConfig.contracts.voucherToken,
        VOUCHER_TOKEN_ABI
      );

      const amountWei = ethers.parseUnits(amount.toString(), 6);
      const signer = this._getSigner();
      const signerAddress = await signer.getAddress();

      // tokenURI: simple JSON metadata URI based on code
      const tokenURI = `https://impactopool.app/voucher/${code}.json`;

      const tx = await voucherToken.mintVoucher(
        signerAddress, // mint to deployer (platform custody)
        code,
        associationWallet,
        amountWei,
        tokenURI
      );
      const receipt = await tx.wait();

      // Parse VoucherMinted event to get tokenId
      const iface = new ethers.Interface(VOUCHER_TOKEN_ABI);
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog(log);
          if (parsed && parsed.name === 'VoucherMinted') {
            return {
              txHash: receipt.hash,
              tokenId: parsed.args.tokenId.toString(),
            };
          }
        } catch {
          // skip non-matching logs
        }
      }
      return { txHash: receipt.hash, tokenId: null };
    }, 'mintVoucherToken');
  }

  /**
   * Burn (destroy) a VoucherToken NFT on-chain
   * @param {number|string} tokenId The on-chain token ID to burn
   * @returns {string} Transaction hash
   */
  async burnVoucherToken(tokenId) {
    return this._withRetry(async () => {
      const voucherToken = this._getContract(
        'voucherToken',
        blockchainConfig.contracts.voucherToken,
        VOUCHER_TOKEN_ABI
      );

      const tx = await voucherToken.burnVoucher(tokenId);
      const receipt = await tx.wait();
      return receipt.hash;
    }, 'burnVoucherToken');
  }
}

module.exports = new BlockchainService();
