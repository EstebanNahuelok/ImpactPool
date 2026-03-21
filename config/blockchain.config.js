const blockchainConfig = {
  rpcUrl: process.env.AVALANCHE_RPC_URL,
  chainId: parseInt(process.env.AVALANCHE_CHAIN_ID || '43113'),
  contracts: {
    impactoPool: process.env.IMPACTOPOOL_CONTRACT_ADDRESS,
    donationVault: process.env.DONATION_VAULT_CONTRACT_ADDRESS,
    agentRegistry: process.env.AGENT_REGISTRY_CONTRACT_ADDRESS,
    reputationRegistry: process.env.REPUTATION_REGISTRY_CONTRACT_ADDRESS,
  },
  usdcToken: process.env.USDC_TOKEN_ADDRESS,
  deployerPrivateKey: process.env.DEPLOYER_PRIVATE_KEY,
};

module.exports = blockchainConfig;
