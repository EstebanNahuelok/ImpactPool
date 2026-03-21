require('dotenv').config();
require('@nomicfoundation/hardhat-toolbox');

// Only include private key in network config if it's a valid 64-char hex string
const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
const hasValidKey = deployerKey && /^(0x)?[0-9a-fA-F]{64}$/.test(deployerKey);
const accounts = hasValidKey
  ? [deployerKey.startsWith('0x') ? deployerKey : `0x${deployerKey}`]
  : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.27',
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: 'cancun',
      viaIR: true,
    },
  },
  paths: {
    sources: './src/blockchain/contracts',
    scripts: './src/blockchain/scripts',
    cache: './cache',
    artifacts: './artifacts',
  },
  networks: {
    hardhat: {},
    fuji: {
      url: process.env.AVALANCHE_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc',
      chainId: 43113,
      accounts,
    },
    avalanche: {
      url: 'https://api.avax.network/ext/bc/C/rpc',
      chainId: 43114,
      accounts,
    },
  },
};
