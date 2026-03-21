const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying con cuenta:', deployer.address);

  const usdcAddress = process.env.USDC_TOKEN_ADDRESS;
  if (!usdcAddress) {
    throw new Error('USDC_TOKEN_ADDRESS no configurado en .env');
  }

  // 1. Deploy DonationVault
  console.log('\n1. Deploying DonationVault...');
  const DonationVault = await hre.ethers.getContractFactory('DonationVault');
  const vault = await DonationVault.deploy(usdcAddress);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log('   DonationVault:', vaultAddress);

  // 2. Deploy ImpactoPool (con vault address)
  console.log('2. Deploying ImpactoPool...');
  const ImpactoPool = await hre.ethers.getContractFactory('ImpactoPool');
  const pool = await ImpactoPool.deploy(usdcAddress, vaultAddress);
  await pool.waitForDeployment();
  const poolAddress = await pool.getAddress();
  console.log('   ImpactoPool:', poolAddress);

  // 3. Deploy AutonomousAgent (ERC-8004)
  console.log('3. Deploying AutonomousAgent (ERC-8004)...');
  const AutonomousAgent = await hre.ethers.getContractFactory('AutonomousAgent');
  const agent = await AutonomousAgent.deploy('ImpactoPool Agent', '1.0.0');
  await agent.waitForDeployment();
  const agentAddress = await agent.getAddress();
  console.log('   AutonomousAgent:', agentAddress);

  // 4. Deploy X402PaymentHandler
  console.log('4. Deploying X402PaymentHandler...');
  const X402Handler = await hre.ethers.getContractFactory('X402PaymentHandler');
  const handler = await X402Handler.deploy(usdcAddress);
  await handler.waitForDeployment();
  const handlerAddress = await handler.getAddress();
  console.log('   X402PaymentHandler:', handlerAddress);

  // Resumen
  console.log('\n========================================');
  console.log('Deploy completado! Actualiza tu .env:');
  console.log('========================================');
  console.log(`IMPACTOPOOL_CONTRACT_ADDRESS=${poolAddress}`);
  console.log(`DONATION_VAULT_CONTRACT_ADDRESS=${vaultAddress}`);
  console.log(`AUTONOMOUS_AGENT_CONTRACT_ADDRESS=${agentAddress}`);
  console.log(`X402_HANDLER_CONTRACT_ADDRESS=${handlerAddress}`);
  console.log('========================================');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
