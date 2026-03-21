/**
 * ImpactoPool - Blockchain Integration
 * Interacción con contratos via Web3 (ethers.js desde CDN o wallet del navegador)
 * Supports: ImpactoPool, DonationVault, AgentRegistry (ERC-8004), ReputationRegistry
 */

const BlockchainIntegration = (() => {
  const AVALANCHE_FUJI = {
    chainId: '0xA869',
    chainName: 'Avalanche Fuji Testnet',
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
    rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
    blockExplorerUrls: ['https://testnet.snowtrace.io/'],
  };

  // Contract addresses — updated after deploy via /api/health or config
  const CONTRACTS = {
    usdc: '0x5425890298aed601595a70AB815c96711a31Bc65', // Fuji USDC
    impactoPool: '',
    donationVault: '',
    agentRegistry: '',
    reputationRegistry: '',
  };

  // Minimal ABIs
  const USDC_ABI = ['function approve(address spender, uint256 amount) external returns (bool)'];

  const POOL_ABI = ['function donate(address association, uint256 amount) external'];

  const AGENT_REGISTRY_ABI = [
    'function register(string calldata agentURI) external returns (uint256)',
    'function tokenURI(uint256 tokenId) view returns (string)',
    'function totalAgents() view returns (uint256)',
    'function ownerOf(uint256 tokenId) view returns (address)',
    'function getAgentWallet(uint256 agentId) view returns (address)',
  ];

  const REPUTATION_ABI = [
    'function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash) external',
    'function getSummary(uint256 agentId, address[] clientAddresses, string tag1, string tag2) view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)',
    'function getClients(uint256 agentId) view returns (address[])',
  ];

  let provider = null;
  let signer = null;
  let walletAddress = null;

  /**
   * Conectar wallet MetaMask/Core y cambiar a Avalanche Fuji
   */
  async function connectWallet() {
    if (!window.ethereum) {
      throw new Error('Necesitás MetaMask o Core Wallet instalado');
    }

    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    walletAddress = accounts[0];

    // Cambiar a Avalanche Fuji
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: AVALANCHE_FUJI.chainId }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [AVALANCHE_FUJI],
        });
      } else {
        throw switchError;
      }
    }

    if (typeof ethers !== 'undefined') {
      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
    }

    return walletAddress;
  }

  /**
   * Aprobar USDC para que ImpactoPool.sol pueda hacer transferFrom
   */
  async function approveUSDC(spenderAddress, amount) {
    if (!signer) throw new Error('Wallet no conectada');
    const usdc = new ethers.Contract(CONTRACTS.usdc, USDC_ABI, signer);
    const amountWei = ethers.parseUnits(amount.toString(), 6);
    const tx = await usdc.approve(spenderAddress, amountWei);
    return tx.wait();
  }

  /**
   * Donar directamente via smart contract
   */
  async function donateOnChain(poolAddress, associationAddress, amount) {
    if (!signer) throw new Error('Wallet no conectada');
    const pool = new ethers.Contract(poolAddress || CONTRACTS.impactoPool, POOL_ABI, signer);
    const amountWei = ethers.parseUnits(amount.toString(), 6);
    const tx = await pool.donate(associationAddress, amountWei);
    return tx.wait();
  }

  // ================================
  // ERC-8004: Agent Registry
  // ================================

  /**
   * Get agent info from the registry (read-only, no wallet needed)
   */
  async function getAgentInfo(agentId) {
    const rpcProvider = new ethers.JsonRpcProvider(AVALANCHE_FUJI.rpcUrls[0]);
    const registry = new ethers.Contract(CONTRACTS.agentRegistry, AGENT_REGISTRY_ABI, rpcProvider);
    const [uri, owner, totalAgents] = await Promise.all([
      registry.tokenURI(agentId),
      registry.ownerOf(agentId),
      registry.totalAgents(),
    ]);
    return { agentId, uri, owner, totalAgents: totalAgents.toString() };
  }

  // ================================
  // ERC-8004: Reputation Registry
  // ================================

  /**
   * Give feedback to an agent (requires connected wallet)
   */
  async function giveFeedback(agentId, value) {
    if (!signer) throw new Error('Wallet no conectada');
    const reputation = new ethers.Contract(CONTRACTS.reputationRegistry, REPUTATION_ABI, signer);
    const tx = await reputation.giveFeedback(
      agentId,
      value,    // int128 value
      0,        // valueDecimals
      'donation', // tag1
      '',       // tag2
      '',       // endpoint
      '',       // feedbackURI
      ethers.ZeroHash // feedbackHash
    );
    return tx.wait();
  }

  /**
   * Get reputation summary for an agent (read-only)
   */
  async function getReputationSummary(agentId) {
    const rpcProvider = new ethers.JsonRpcProvider(AVALANCHE_FUJI.rpcUrls[0]);
    const reputation = new ethers.Contract(CONTRACTS.reputationRegistry, REPUTATION_ABI, rpcProvider);
    const [count, summaryValue, summaryValueDecimals] = await reputation.getSummary(
      agentId, [], '', ''
    );
    return {
      count: count.toString(),
      summaryValue: summaryValue.toString(),
      summaryValueDecimals: summaryValueDecimals.toString(),
    };
  }

  /**
   * Update contract addresses (called after loading config from server)
   */
  function setContracts(contracts) {
    Object.assign(CONTRACTS, contracts);
  }

  function getWalletAddress() { return walletAddress; }
  function isConnected() { return !!walletAddress; }

  return {
    connectWallet,
    approveUSDC,
    donateOnChain,
    getAgentInfo,
    giveFeedback,
    getReputationSummary,
    setContracts,
    getWalletAddress,
    isConnected,
  };
})();

// Conectar botón de wallet
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btn-connect-wallet');
  if (btn) {
    btn.addEventListener('click', async () => {
      try {
        const address = await BlockchainIntegration.connectWallet();
        btn.textContent = address.slice(0, 6) + '...' + address.slice(-4);
        btn.disabled = true;
        showNotification('Wallet conectada a Avalanche Fuji');
      } catch (err) {
        showNotification(err.message, 'error');
      }
    });
  }
});
