const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying con cuenta:', deployer.address);

  // 1. Deploy or use existing USDC
  let usdcAddress = process.env.USDC_TOKEN_ADDRESS;
  if (!usdcAddress) {
    console.log('\n1. Deploying MockUSDC (no USDC_TOKEN_ADDRESS configured)...');
    const MockUSDC = await hre.ethers.getContractFactory('MockUSDC');
    const mockUsdc = await MockUSDC.deploy();
    await mockUsdc.waitForDeployment();
    usdcAddress = await mockUsdc.getAddress();
    console.log('   MockUSDC:', usdcAddress);

    // Mint 10,000 USDC to deployer for testing
    const mintAmount = hre.ethers.parseUnits('10000', 6);
    await mockUsdc.mint(deployer.address, mintAmount);
    console.log('   Minted 10,000 USDC to deployer');
  } else {
    console.log('\n1. Using existing USDC:', usdcAddress);
  }

  // 2. Deploy DonationVault
  console.log('\n2. Deploying DonationVault...');
  const DonationVault = await hre.ethers.getContractFactory('DonationVault');
  const vault = await DonationVault.deploy(usdcAddress);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log('   DonationVault:', vaultAddress);

  // 3. Deploy ImpactoPool (con vault address)
  console.log('3. Deploying ImpactoPool...');
  const ImpactoPool = await hre.ethers.getContractFactory('ImpactoPool');
  const pool = await ImpactoPool.deploy(usdcAddress, vaultAddress);
  await pool.waitForDeployment();
  const poolAddress = await pool.getAddress();
  console.log('   ImpactoPool:', poolAddress);

  // 4. Deploy AgentRegistry (ERC-8004 Identity Registry)
  console.log('4. Deploying AgentRegistry (ERC-8004 Identity)...');
  const AgentRegistry = await hre.ethers.getContractFactory('AgentRegistry');
  const registry = await AgentRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log('   AgentRegistry:', registryAddress);

  // 5. Deploy ReputationRegistry (ERC-8004 Reputation)
  console.log('5. Deploying ReputationRegistry (ERC-8004 Reputation)...');
  const ReputationRegistry = await hre.ethers.getContractFactory('ReputationRegistry');
  const reputation = await ReputationRegistry.deploy(registryAddress);
  await reputation.waitForDeployment();
  const reputationAddress = await reputation.getAddress();
  console.log('   ReputationRegistry:', reputationAddress);

  // 6. Register ImpactoPool as an agent (ERC-8004)
  console.log('\n6. Registering ImpactoPool agent in AgentRegistry...');
  const agentURI = 'https://impactopool.app/agent-registration.json';
  const tx = await registry.register(agentURI);
  const receipt = await tx.wait();
  console.log('   Agent registered! TX:', receipt.hash);
  console.log('   Agent ID: 1 (first agent)');
  console.log(`   Global ID: eip155:${hre.network.config.chainId}:${registryAddress}#1`);

  // Resumen
  console.log('\n========================================');
  console.log('Deploy completado! Actualiza tu .env:');
  console.log('========================================');
  if (!process.env.USDC_TOKEN_ADDRESS) {
    console.log(`USDC_TOKEN_ADDRESS=${usdcAddress}`);
  }
  console.log(`IMPACTOPOOL_CONTRACT_ADDRESS=${poolAddress}`);
  console.log(`DONATION_VAULT_CONTRACT_ADDRESS=${vaultAddress}`);
  console.log(`AGENT_REGISTRY_CONTRACT_ADDRESS=${registryAddress}`);
  console.log(`REPUTATION_REGISTRY_CONTRACT_ADDRESS=${reputationAddress}`);
  console.log('========================================');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
