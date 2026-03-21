/**
 * ImpactoPool - Blockchain Integration
 * Interacción con contratos via Web3 (ethers.js desde CDN o wallet del navegador)
 */

const BlockchainIntegration = (() => {
  const AVALANCHE_FUJI = {
    chainId: '0xA869',
    chainName: 'Avalanche Fuji Testnet',
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
    rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
    blockExplorerUrls: ['https://testnet.snowtrace.io/'],
  };

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

    // Usar ethers si está disponible (como global del CDN o bundled)
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

    const usdcAbi = ['function approve(address spender, uint256 amount) external returns (bool)'];
    const usdcAddress = '0x5425890298aed601595a70AB815c96711a31Bc65'; // Fuji USDC
    const usdc = new ethers.Contract(usdcAddress, usdcAbi, signer);

    const amountWei = ethers.parseUnits(amount.toString(), 6);
    const tx = await usdc.approve(spenderAddress, amountWei);
    return tx.wait();
  }

  /**
   * Donar directamente via smart contract
   */
  async function donateOnChain(poolAddress, associationAddress, amount) {
    if (!signer) throw new Error('Wallet no conectada');

    const poolAbi = ['function donate(address association, uint256 amount) external'];
    const pool = new ethers.Contract(poolAddress, poolAbi, signer);

    const amountWei = ethers.parseUnits(amount.toString(), 6);
    const tx = await pool.donate(associationAddress, amountWei);
    return tx.wait();
  }

  function getWalletAddress() {
    return walletAddress;
  }

  function isConnected() {
    return !!walletAddress;
  }

  return { connectWallet, approveUSDC, donateOnChain, getWalletAddress, isConnected };
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
