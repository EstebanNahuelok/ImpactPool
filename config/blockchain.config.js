const blockchainConfig = {
  rpcUrl: process.env.AVALANCHE_RPC_URL,
  chainId: parseInt(process.env.AVALANCHE_CHAIN_ID || '43113'),
  contracts: {
    impactoPool: process.env.IMPACTOPOOL_CONTRACT_ADDRESS,
    donationVault: process.env.DONATION_VAULT_CONTRACT_ADDRESS,
    autonomousAgent: process.env.AUTONOMOUS_AGENT_CONTRACT_ADDRESS,
    x402Handler: process.env.X402_HANDLER_CONTRACT_ADDRESS,
  },
  usdcToken: process.env.USDC_TOKEN_ADDRESS,
  deployerPrivateKey: process.env.DEPLOYER_PRIVATE_KEY,
};

module.exports = blockchainConfig;
