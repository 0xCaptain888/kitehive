import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * KiteHive Deployment Script
 * Supports: kite-testnet (2368) and kite-mainnet (2366)
 *
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network kite-testnet
 *   npx hardhat run scripts/deploy.ts --network kite-mainnet
 */

// ─── Token Addresses ────────────────────────────────────────────────────────
const TOKEN_ADDRESSES: Record<string, { usdc: string; pyusd: string }> = {
  "kite-testnet": {
    usdc:  "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63", // verified from README
    pyusd: "0x0000000000000000000000000000000000000000", // update when Kite testnet PYUSD available
  },
  "kite-mainnet": {
    usdc:  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base USDC (update to Kite mainnet addr)
    pyusd: "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8", // PayPal USD
  },
};

async function main() {
  const networkName = network.name;
  console.log(`\n🚀 Deploying KiteHiveAttestation to: ${networkName}`);
  console.log(`   Chain ID: ${network.config.chainId}`);

  const [deployer] = await ethers.getSigners();
  console.log(`   Deployer: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`   Balance:  ${ethers.formatEther(balance)} ETH\n`);

  const tokens = TOKEN_ADDRESSES[networkName];
  if (!tokens) {
    throw new Error(`No token config for network: ${networkName}. Add it to TOKEN_ADDRESSES.`);
  }

  // Treasury = deployer by default; replace with multisig for production
  const treasury = deployer.address;

  console.log("📝 Deployment parameters:");
  console.log(`   USDC:     ${tokens.usdc}`);
  console.log(`   PYUSD:    ${tokens.pyusd}`);
  console.log(`   Treasury: ${treasury}\n`);

  // ─── Deploy ───────────────────────────────────────────────────────────────
  const Factory = await ethers.getContractFactory("KiteHiveAttestation");
  const contract = await Factory.deploy(tokens.usdc, tokens.pyusd, treasury);

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log(`✅ KiteHiveAttestation deployed: ${address}`);

  // ─── Register Coordinator(s) ─────────────────────────────────────────────
  const coordinatorA = process.env.COORDINATOR_WALLET_KEY
    ? new ethers.Wallet(process.env.COORDINATOR_WALLET_KEY).address
    : deployer.address;

  const coordinatorB = process.env.COORDINATOR_B_WALLET_KEY
    ? new ethers.Wallet(process.env.COORDINATOR_B_WALLET_KEY).address
    : null;

  console.log(`\n🤝 Registering Coordinator A: ${coordinatorA}`);
  await contract.registerCoordinator(coordinatorA);

  if (coordinatorB) {
    console.log(`🤝 Registering Coordinator B: ${coordinatorB}`);
    await contract.registerCoordinator(coordinatorB);
  }

  // ─── Save Deployment Record ──────────────────────────────────────────────
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir, { recursive: true });

  const record = {
    network: networkName,
    chainId: network.config.chainId,
    contract: "KiteHiveAttestation",
    address,
    deployer:  deployer.address,
    usdc:      tokens.usdc,
    pyusd:     tokens.pyusd,
    treasury,
    coordinators: [coordinatorA, coordinatorB].filter(Boolean),
    deployedAt: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
  };

  const filePath = path.join(deploymentsDir, `${networkName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
  console.log(`\n📄 Deployment record saved: ${filePath}`);

  // ─── Update .env hint ────────────────────────────────────────────────────
  const envKey = networkName === "kite-mainnet"
    ? "ATTESTATION_CONTRACT_MAINNET"
    : "ATTESTATION_CONTRACT_TESTNET";

  console.log(`\n📋 Update your .env:`);
  console.log(`   ${envKey}=${address}`);
  if (networkName === "kite-mainnet") {
    console.log(`   NEXT_PUBLIC_ATTESTATION_CONTRACT=${address}`);
    console.log(`   NEXT_PUBLIC_KITE_EXPLORER=https://kitescan.ai`);
    console.log(`   NEXT_PUBLIC_CHAIN_ID=2366`);
  }

  const explorer = networkName === "kite-mainnet"
    ? "https://kitescan.ai"
    : "https://testnet.kitescan.ai";
  console.log(`\n🔍 Verify on explorer: ${explorer}/address/${address}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
